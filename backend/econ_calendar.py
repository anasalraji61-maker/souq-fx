"""Economic calendar — ForexFactory JSON/XML only; source down ⇒ empty list + status unavailable (no sample events)."""
from __future__ import annotations

import hashlib
import json
import re
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
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

# هل آخر جلب نجح؟ `ok` = أحداث ForexFactory، `unavailable` = المصدر متعذّر/فارغ.
_STATUS = "unavailable"


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
            # `[:22]` كان **يقصّ الإزاحة الزمنية**: «Tue, 23 Sep 2026 14:30:00 -0400» تصير
            # «Tue, 23 Sep 2026 14:30» — الوقت بلا منطقته، يقرؤه متداول ببغداد وآخر بلندن سواءً
            # وهو في الحقيقة 18:30 UTC. نفس عيب `news_feed` المصحَّح بتشغيل سابق، وبقاعدته
            # نفسها حرفياً فلا تنحرف نسختان — ومعه `ts` فيُعرض بتوقيت الجهاز ويُرتَّب كمسار JSON.
            when, ts = when_and_ts(_text(item.find("pubDate")), default="هذا الأسبوع")
            out.append(
                {
                    "id": _stable_id(title, desc or ""),
                    "title": title[:160],
                    "currency": cur,
                    "impact": _impact(_text(item.find("category"))),
                    "when": when,
                    "ts": ts,
                    "forecast": "—",
                }
            )
        return out

    for ev in events:
        title = _text(ev.find("title"))
        if not title:
            continue
        country = _text(ev.find("country"))
        date = _text(ev.find("date"))
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
                "impact": _impact(_text(ev.find("impact"))),
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
_UNANNOUNCED_TIMES = frozenset({"", "all day", "tentative", "day 1", "day 2", "day 3"})


def _json_time_unannounced(dt: datetime) -> bool:
    """نسخة JSON لا تحمل حقل وقت: «All Day» و«Tentative» تأتي **منتصف ليل نيويورك** (`T00:00:00-04:00`)،
    فكانت تُحوَّل `ts` عادياً و`when` «04:00 UTC» — ساعة مخترَعة يعدّ إليها شريط «خبر قوي بعد 2س» وقرار
    الفائدة يصدر بعد ساعة، أو بعد صدوره فعلاً. منتصف الليل بتوقيت المصدر = بلا ساعة معلنة (لا خبر قويّ
    موقوت عندها عملياً؛ وإن وُجد فقول «اليوم، الساعة غير معلنة» أحذر من ساعة خاطئة)."""
    return (dt.hour, dt.minute, dt.second, dt.microsecond) == (0, 0, 0, 0)


def _parse_ff_json(text: str) -> list[dict[str, Any]]:
    """كل حدث يحمل `ts` (ثوانٍ UTC) ليعرضه التطبيق بتوقيت المستخدم ويحسب "بعد كم ساعة".

    `time_tbd: true` ⇒ **الساعة غير معلنة**: `ts` بداية اليوم بتوقيت المصدر (للتاريخ والترتيب فقط، لا
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
                    time_tbd = _json_time_unannounced(dt)
                    # بلا ساعة معلنة: التاريخ وحده (بتقويم المصدر) — «04:00 UTC» كان ساعة لم يعلنها أحد
                    when = (
                        dt.strftime("%Y-%m-%d")
                        if time_tbd
                        else dt.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
                    )
            except ValueError:
                pass
        country = str(ev.get("country") or "").strip()
        fc_raw = str(ev.get("forecast") or "").strip()
        prev_raw = str(ev.get("previous") or "").strip()
        forecast = fc_raw or "—"  # لا يسقط للسابق — راجع `_parse_ff`
        out.append(
            {
                "id": _stable_id(country, title, raw_date),
                "title": title[:160],
                "currency": _currency(country),
                "impact": _impact(str(ev.get("impact") or "")),
                "when": when[:32],
                "forecast": forecast[:40],
                **_figures(fc_raw, prev_raw, str(ev.get("actual") or "").strip()),
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


def fetch_calendar(
    currency: str | None = None,
    impact: str | None = None,
) -> list[dict]:
    global _CACHE, _CACHE_TS, _STATUS
    # فشلٌ يُعاد فحصه بعد دقيقتين لا نصف ساعة، ولا بكل طلب (كي لا يُقصف المصدر وهو معطّل)
    ttl = TTL if _CACHE else FAILURE_TTL
    if (not _CACHE and _CACHE_TS == 0.0) or time.time() - _CACHE_TS >= ttl:
        merged: list[dict] = []
        try:
            with httpx.Client(timeout=14.0, follow_redirects=True) as client:
                r = client.get(FF_JSON_URL, headers={"User-Agent": "MATRIX/1.0"})
                if r.status_code == 200 and r.text.strip():
                    merged = _parse_ff_json(r.text)
                if not merged:
                    r = client.get(FF_URL, headers={"User-Agent": "MATRIX/1.0"})
                    if r.status_code == 200 and r.text.strip():
                        merged = _parse_ff(r.text)
        except Exception:
            merged = []
        # لا أحداث مخترَعة عند التعذّر: قائمة فارغة + `_STATUS` (يقرؤه المسار ويعيده للعميل)
        _CACHE = merged
        _STATUS = "ok" if merged else "unavailable"
        _CACHE_TS = time.time()

    events = list(_CACHE)
    curs = _wanted(currency)
    if curs:
        events = [e for e in events if str(e.get("currency", "")).lower() in curs]
    imps = _wanted(impact)
    if imps:
        events = [e for e in events if str(e.get("impact", "")).lower() in imps]
    return _unique_ids(events[:MAX_EVENTS])


def calendar_status() -> dict[str, Any]:
    """حالة آخر جلب: `status` ok/unavailable و`as_of` (epoch) وقت الجلب — None قبل أي جلب."""
    return {"status": "ok" if _CACHE else _STATUS, "as_of": _CACHE_TS or None}
