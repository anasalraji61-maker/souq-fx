"""Economic calendar — ForexFactory JSON/XML only; source down ⇒ empty list + status unavailable (no sample events)."""
from __future__ import annotations

import hashlib
import json
import re
import threading
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from news_feed import when_and_ts

_CACHE: list[dict] = []
_CACHE_TS = 0.0
TTL = 1800
# المصدر المتعذّر يُعاد فحصه بعد دقيقتين: كان الاحتياطي يُخزَّن 30 دقيقة كالحقيقي، فعطل عابر لـForexFactory
# يُبقي المتداول على أمثلة توضيحية بدل التقويم الفعلي نصف ساعة (وقد يفوته خبر عالي التأثير).
FAILURE_TTL = 120
# حدّ الأحداث المُعادة **بعد** فلترة العملة/التأثير (أسبوع ForexFactory نادراً ما يتجاوز ~200 حدث).
# القصّ بـ`fetch_calendar` وحده: كان `_parse_ff` يقصّ هنا أيضاً **قبل** الفلاتر — نفس ما أُزيل من
# `_parse_ff_json` بتشغيل سابق (راجع تعليقه) وبقي شقيقه خارجه: بأسبوع مزدحم يُسقط أحداث آخره
# (NFP يوم الجمعة) حتى عمّن طلب `impact=high` وحده، وهو الفلتر الذي يعتمد عليه شريط «خبر قوي قريب».
MAX_EVENTS = 250

FF_URL = "https://www.forexfactory.com/ffcal_week_this.xml"
# نسخة JSON من نفس مصدر ForexFactory — تواريخها ISO مع إزاحة زمنية صريحة، فتُحوَّل لـUTC بلا تخمين
# منطقة زمنية (XML أعلاه يعطي تاريخاً ووقتاً بلا منطقة، فيبقى احتياطياً بلا `ts`).
FF_JSON_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"

# (كان هنا `FALLBACK`: خمسة أحداث مكتوبة باليد — «قرار الفائدة الفيدرالي اليوم 21:00 UTC، 5.25%»،
# «CPI غداً 15:30» — تُعرض كلّما تعذّر المصدر. أوقاتها نسبية بلا تاريخ فهي خاطئة كل يوم تقريباً،
# وتوقّعها قديم؛ متداول يرى «خبر فائدة الليلة» يغلق مراكزه أو ينتظره وهو غير موجود. أُزيلت:
# المصدر المتعذّر يُعاد «غير متاح» بقائمة فارغة، والتطبيق يقول ذلك.)

# لحظة آخر محاولة **فاشلة** (0 = لا فشل منذ آخر نجاح). `_CACHE_TS` صار وقت آخر جلب **ناجح** وحده:
# كان الفشل يكتب `_CACHE = []` فوق أسبوع حقيقي جُلب قبل 30 دقيقة ⇒ 429 عابر من ForexFactory (يحدّ
# الطلبات بشدّة) يُفرغ التقويم وشريط «خبر قوي قريب» ساعتها — والمتداول يفتح التطبيق فلا يرى قرار
# الفائدة بعد 20 دقيقة. الأحداث المحفوظة حقيقية بأوقات مطلقة (`ts`) فتُخدَم حتى `STALE_MAX` بوقت جلبها
# الحقيقي (`as_of`) و`stale: true`، ويُعاد المحاولة كل `FAILURE_TTL`.
_FAIL_TS = 0.0
# أقصى عمر لأسبوع محفوظ يُخدَم والمصدر متعذّر — بعده «غير متاح» (قد تنقصه أحداث أُضيفت أو نتائج صدرت).
STALE_MAX = 6 * 3600


def _impact(raw: str | None) -> str:
    """كل قيمة غير معروفة كانت «low»: عطلة البنوك (ForexFactory «Holiday» — سيولة رقيقة وفجوات، لا
    خبر ضعيف) تُعرض «تأثير منخفض» وتدخل فلتر «منخفض»، وحدث بلا تصنيف يُدّعى له تصنيف."""
    t = (raw or "").strip().lower()
    if t in ("3", "high", "red"):
        return "high"
    if t in ("2", "medium", "orange"):
        return "medium"
    if t in ("1", "low", "yellow"):
        return "low"
    if t == "holiday":
        return "holiday"
    if t in ("non-economic", "none", "gray", "grey"):
        return "none"
    return "unknown"


# tools147a: الخلاصة الحيّة تضع «Daylight Saving Time Shift» (NZD ‏`2026-09-26T10:00:00-04:00` = 14:00 UTC، لحظة
# تقديم ساعة نيوزيلندا فعلاً) بتأثير `Holiday` ⇒ كانت تُعرض «عطلة» بلا ساعتها. تغيير الساعة ليس عطلة بنوك (الأسواق
# تعمل) ولا خبراً اقتصادياً ⇒ «none» بوقته الحقيقي.
_DST_TITLE = re.compile(r"\bdaylight\s+sav(?:ing|ings)\b|\bDST\b|\bclocks?\s+(?:change|shift|go)", re.IGNORECASE)


def _event_impact(raw: str | None, title: str) -> str:
    imp = _impact(raw)
    return "none" if imp == "holiday" and _DST_TITLE.search(title or "") else imp


# عملات ForexFactory (و`ALL` لأحداث عالمية كاجتماعات G20). رمز خارجها ليس عملة: فرع RSS كان يأخذ
# أوّل كلمة من 3 أحرف كبيرة ⇒ «CPI m/m» عملتها «CPI» و«ECB President Speaks» عملتها «ECB»؛ وحدث
# بلا بلد كان يُوسَم «USD» فيظهر بفلتر الدولار كخبر أمريكي. المجهول الآن فارغ — لا عملة مخترَعة.
CURRENCIES = frozenset({"USD", "EUR", "GBP", "JPY", "AUD", "NZD", "CAD", "CHF", "CNY", "ALL"})


def _currency(raw: str | None) -> str:
    code = (raw or "").strip()[:3].upper()
    return code if code in CURRENCIES else ""


def _rss_currency(desc: str, title: str) -> str:
    for text in (desc, title):
        for m in re.finditer(r"\b([A-Z]{3})\b", text or ""):
            if m.group(1) in CURRENCIES and m.group(1) != "ALL":
                return m.group(1)
    return ""


def _text(el: ET.Element | None) -> str:
    if el is None or el.text is None:
        return ""
    return re.sub(r"\s+", " ", el.text.strip())


def _parse_ff(xml_text: str) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return out

    events = list(root.iter("event"))
    if not events:
        for item in root.iter("item"):
            title = _text(item.find("title"))
            if not title:
                continue
            desc = _text(item.find("description"))
            cur = _rss_currency(desc, title)
            # `pubDate` = **وقت نشر** عنصر RSS لا موعد الخبر (tools81): كان يُرسَل `ts` فيعدّ التطبيق
            # تنازلياً (`nextHighImpact`) لوقت النشر ⇒ «خبر قوي بعد 20 د» خاطئ، أو صمت قبل الخبر
            # الحقيقي. العنصر لا يحمل حقل موعد ⇒ `ts` None والساعة غير معلنة؛ وقت النشر بحقله المسمّى
            # `published` (بقاعدة `news_feed` نفسها، مع الإزاحة الزمنية) لا بخانة الموعد.
            published, pub_ts = when_and_ts(_text(item.find("pubDate")), default="")
            out.append(
                {
                    "id": _stable_id(title, desc or ""),
                    "title": title[:160],
                    "currency": cur,
                    "impact": _impact(_text(item.find("category"))),
                    "when": "هذا الأسبوع",
                    "ts": None,
                    "time_tbd": True,
                    "published": published if pub_ts is not None else None,
                    "forecast": "—",
                }
            )
        return out

    for ev in events:
        title = _text(ev.find("title"))
        if not title:
            continue
        country = _text(ev.find("country"))
        date = _iso_date(_text(ev.find("date")))
        tm = _text(ev.find("time"))
        when = f"{date} {tm}".strip() or "هذا الأسبوع"
        fc_raw = _text(ev.find("forecast"))
        prev_raw = _text(ev.find("previous"))
        # «السابق» ليس توقّعاً: كان `fc_raw or prev_raw` فيُعرض رقم الإصدار الماضي بخانة «التوقّع» للعملاء
        # القدامى (يقرؤون `forecast` وحده). بلا توقّع ⇒ «—»، والسابق بحقله `previous`.
        forecast = fc_raw or "—"
        out.append(
            {
                "id": _stable_id(country, title, when),
                "title": title[:160],
                "currency": _currency(country),
                "impact": _event_impact(_text(ev.find("impact")), title),
                "when": when[:32],
                "forecast": forecast[:40],
                **_figures(fc_raw, prev_raw, _text(ev.find("actual"))),
                # XML الأسبوعي يعطي تاريخاً ووقتاً **بلا منطقة زمنية** (راجع تعليق `FF_URL`): لا
                # يُخمَّن له `ts`، لكنه كان يُعرض خاماً بلوحة التقويم بجانب أوقاتٍ محوَّلة لتوقيت
                # الجهاز — فيقرؤه المتداول توقيتَه وهو ليس كذلك. العلامة صريحة كـ`sample`.
                "ts": None,
                "tz_unknown": True,
                "time_tbd": tm.lower() in _UNANNOUNCED_TIMES,
            }
        )
    return out


def _stable_id(*parts: str) -> str:
    """معرّف ثابت بين إعادات تشغيل الخادم (`hash()` لنصوص بايثون عشوائي لكل عملية) ويشمل العملة: «Bank Holiday»
    لـCNY وJPY بنفس اليوم كان يأخذ المعرّف نفسه — وهو مفتاح React بقائمة التقويم فيختفي أحد الصفّين."""
    return "ff-" + hashlib.md5("|".join(parts).encode("utf-8")).hexdigest()[:12]


def _unique_ids(events: list[dict]) -> list[dict]:
    """حدثان متطابقان تماماً من المصدر (نادر) → لاحقة رقمية بدل معرّف مكرّر."""
    seen: dict[str, int] = {}
    out: list[dict] = []
    for e in events:
        eid = str(e.get("id", ""))
        n = seen.get(eid, 0)
        seen[eid] = n + 1
        out.append({**e, "id": f"{eid}-{n}"} if n else e)
    return out


def _figures(forecast: str, previous: str, actual: str) -> dict[str, str]:
    """أرقام الحدث منفصلة ومسمّاة (العميل الجديد يقرأ هذه الحقول؛ `forecast` القديم = التوقّع أو «—»)."""
    return {
        "forecast_value": forecast[:40],
        "previous": previous[:40],
        "actual": actual[:40],
    }


# `<time>` بفرع XML لحدثٍ بلا ساعة: «All Day» (عطلة، قمّة) و«Tentative» (قرار بنك اليابان عادةً) — وفارغ.
_FF_DATE_RE = re.compile(r"(\d{1,2})-(\d{1,2})-(\d{4})")


def _iso_date(date: str) -> str:
    """تاريخ XML الأسبوعي «09-10-2026» شهرٌ أولاً (أمريكي): يُقرأ بالعربية والأوروبية 9 أكتوبر وهو 10 سبتمبر.
    يُحوَّل إلى «2026-09-10» (لا لبس)؛ تاريخ بصيغة أخرى أو غير صالح يبقى كما ورد."""
    m = _FF_DATE_RE.fullmatch(date.strip())
    if not m:
        return date
    month, day, year = (int(g) for g in m.groups())
    try:
        return datetime(year, month, day).strftime("%Y-%m-%d")
    except ValueError:
        return date


_UNANNOUNCED_TIMES = frozenset({"", "all day", "tentative", "day 1", "day 2", "day 3"})


def _json_time_unannounced(dt: datetime) -> bool:
    """نسخة JSON لا تحمل حقل وقت: «All Day» و«Tentative» تأتي **منتصف ليل نيويورك** (`T00:00:00-04:00`)،
    فكانت تُحوَّل `ts` عادياً و`when` «04:00 UTC» — ساعة مخترَعة يعدّ إليها شريط «خبر قوي بعد 2س» وقرار
    الفائدة يصدر بعد ساعة، أو بعد صدوره فعلاً. منتصف الليل بتوقيت المصدر = بلا ساعة معلنة (لا خبر قويّ
    موقوت عندها عملياً؛ وإن وُجد فقول «اليوم، الساعة غير معلنة» أحذر من ساعة خاطئة)."""
    return (dt.hour, dt.minute, dt.second, dt.microsecond) == (0, 0, 0, 0)


def _figure_text(v: object) -> str:
    """رقم الحدث نصّاً كما جاء: `or ""` كان يُسقط الرقم 0 (توقّع 0 حقيقي ⇒ «—» بلا توقّع)."""
    return "" if v is None or isinstance(v, bool) else str(v).strip()


def _parse_ff_json(text: str) -> list[dict[str, Any]]:
    """كل حدث يحمل `ts` (ثوانٍ UTC) ليعرضه التطبيق بتوقيت المستخدم ويحسب "بعد كم ساعة".

    `time_tbd: true` ⇒ **الساعة غير معلنة**: `ts` كما بالخلاصة، قرب بداية اليوم (للتاريخ والترتيب فقط، لا
    للعدّ التنازلي ولا لعرض ساعة)، و`when` التاريخ وحده."""
    out: list[dict[str, Any]] = []
    try:
        data = json.loads(text)
    except (ValueError, TypeError):
        return out
    if not isinstance(data, list):
        return out
    for ev in data:
        if not isinstance(ev, dict):
            continue
        title = re.sub(r"\s+", " ", str(ev.get("title") or "").strip())
        if not title:
            continue
        ts: int | None = None
        when = "هذا الأسبوع"
        time_tbd = False
        raw_date = str(ev.get("date") or "").strip()
        if raw_date:
            try:
                dt = datetime.fromisoformat(raw_date.replace("Z", "+00:00"))
                if dt.tzinfo is not None:
                    ts = int(dt.timestamp())
                    # العطلة يوم كامل بلا ساعة مهما كان وقت الخلاصة: الخلاصة الحيّة تؤرّخها `T19:00:00-04:00`
                    # (عطلة اليابان 21/9 ⇒ «2026-09-20 23:00 UTC» بعدّ تنازلي لساعة لا وجود لها، واليوم السابق)
                    time_tbd = _json_time_unannounced(dt) or _event_impact(str(ev.get("impact") or ""), title) == "holiday"
                    # بلا ساعة معلنة: التاريخ وحده — «04:00 UTC» كان ساعة لم يعلنها أحد. اليوم = تاريخ UTC لـ`ts`+12س
                    # (قاعدة `CalendarPanel.fmtTbd` نفسها): منتصف ليل نيويورك ⇒ اليوم نفسه، و19:00 نيويورك ⇒ التالي
                    when = (
                        (dt.astimezone(timezone.utc) + timedelta(hours=12)).strftime("%Y-%m-%d")
                        if time_tbd
                        else dt.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
                    )
            except (ValueError, OverflowError):
                # «0001-01-01T00:00+05:00» يفيض بـ`timestamp()`/+12س (OverflowError) — كان يُسقط الأسبوع كلّه
                ts, time_tbd, when = None, False, "هذا الأسبوع"
        country = str(ev.get("country") or "").strip()
        fc_raw = _figure_text(ev.get("forecast"))
        prev_raw = _figure_text(ev.get("previous"))
        forecast = fc_raw or "—"  # لا يسقط للسابق — راجع `_parse_ff`
        out.append(
            {
                "id": _stable_id(country, title, raw_date),
                "title": title[:160],
                "currency": _currency(country),
                "impact": _event_impact(str(ev.get("impact") or ""), title),
                "when": when[:32],
                "forecast": forecast[:40],
                **_figures(fc_raw, prev_raw, _figure_text(ev.get("actual"))),
                "ts": ts,
                "time_tbd": time_tbd,
            }
        )
    out.sort(key=lambda e: (e["ts"] is None, e["ts"] or 0))
    # لا قصّ هنا: كان `[:120]` قبل فلاتر العملة/التأثير يُسقط أحداث آخر الأسبوع (NFP يوم الجمعة) بالأسابيع
    # المزدحمة — حتى من طلب `impact=high` الذي يعتمد عليه شريط «خبر قوي قريب». القصّ بعد الفلترة بـfetch_calendar.
    return out


def _wanted(raw: str | None) -> set[str]:
    """قيم فلتر مفصولة بفواصل → مجموعة بحروف صغيرة موحّدة. الفارغ (أو «,» و«ALL» وحدها) = بلا فلترة.

    **الفلتر كان قيمة واحدة فقط**، والمتداول على زوج واحد يهمّه عملتاه معاً (EURUSD = EUR وUSD)
    و«متوسط فما فوق» تعني `high` و`medium` — فكانت اللوحة تجلب **الأسبوع كلّه** ثم تصفّي بالجهاز
    (موثّق صراحةً بـ`CalendarPanel`: «فلترا الزوج ومتوسط+ محليان: نجلب الكل ثم نصفّي»). ومن يرسل
    `currency=EUR,USD` على النسخة القديمة كان يُقابَل بمطابقة نصّية فاشلة = **تقويم فارغ صامت**
    لا رسالة خطأ."""
    if not raw:
        return set()
    vals = {v.strip().lower() for v in raw.split(",")}
    vals.discard("")
    vals.discard("all")
    return vals


_REFRESH_LOCK = threading.Lock()


def _needs_refresh(now: float) -> bool:
    fresh = bool(_CACHE) and now - _CACHE_TS < TTL
    # فشلٌ يُعاد فحصه بعد دقيقتين لا نصف ساعة، ولا بكل طلب (كي لا يُقصف المصدر وهو معطّل)
    backing_off = _FAIL_TS > 0 and now - _FAIL_TS < FAILURE_TTL
    return not fresh and not backing_off


def _refresh(now: float) -> None:
    global _CACHE, _CACHE_TS, _FAIL_TS
    merged: list[dict] = []
    try:
        with httpx.Client(timeout=14.0, follow_redirects=True) as client:
            # كلّ مصدر بمحاولته: كانا بـ`try` واحد ⇒ مهلة/انقطاع JSON يقفز إلى `except` ولا يُجرَّب XML
            # الاحتياطي أصلاً (كان يُجرَّب فقط لردّ غير 200 أو غير قابل للتحليل)
            for url, parse in ((FF_JSON_URL, _parse_ff_json), (FF_URL, _parse_ff)):
                try:
                    r = client.get(url, headers={"User-Agent": "MATRIX/1.0"})
                    if r.status_code == 200 and r.text.strip():
                        merged = parse(r.text)
                except Exception:
                    merged = []
                if merged:
                    break
    except Exception:
        merged = []
    if merged:
        _CACHE, _CACHE_TS, _FAIL_TS = merged, now, 0.0
    else:
        # لا أحداث مخترَعة عند التعذّر، ولا مسح لأسبوع حقيقي محفوظ (يُخدَم حتى `STALE_MAX`)
        _FAIL_TS = now


def fetch_calendar(
    currency: str | None = None,
    impact: str | None = None,
) -> list[dict]:
    global _CACHE
    now = time.time()
    if _needs_refresh(now):
        # الطريق متزامن ⇒ خيوط متوازية: عند انتهاء الكاش كان كل طلب يصل أثناء الجلب (حتى 2×14ث) يجلب
        # المصدر بنفسه (20 طلباً متزامناً = 20 GET) ⇒ 429 من المصدر المحدود ⇒ «قديم/غير متاح» أبكر.
        # جلب واحد تحت القفل، والمنتظرون يعيدون الفحص فيخدمهم ما جلبه.
        with _REFRESH_LOCK:
            now = time.time()
            if _needs_refresh(now):
                _refresh(now)
    if _CACHE and now - _CACHE_TS > STALE_MAX:
        _CACHE = []

    events = list(_CACHE)
    curs = _wanted(currency)
    if curs:
        # حدث `ALL` (G20، قمّة…) يخصّ كل العملات: الشريط يحذّر منه لكل زوج، فإسقاطه من فلتر
        # «USD» كان يُخفي من القائمة الخبر نفسه الذي يحذّر منه الشريط (طلب ui run 27)
        events = [e for e in events if str(e.get("currency", "")).lower() in curs | {"all"}]
    imps = _wanted(impact)
    if imps:
        events = [e for e in events if str(e.get("impact", "")).lower() in imps]
    return _unique_ids(events[:MAX_EVENTS])


def calendar_status() -> dict[str, Any]:
    """`status` ok/unavailable؛ `as_of` (epoch) = وقت جلب الأحداث المُعادة، أو وقت المحاولة الفاشلة حين لا
    أحداث — None قبل أي جلب؛ `stale` = آخر محاولة فشلت والأحداث من جلب ناجح سابق (`as_of`)."""
    if _CACHE:
        return {"status": "ok", "as_of": _CACHE_TS, "stale": _FAIL_TS > _CACHE_TS}
    return {"status": "unavailable", "as_of": _FAIL_TS or _CACHE_TS or None, "stale": False}
