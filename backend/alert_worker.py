"""Check price + indicator alerts and push notifications."""
from __future__ import annotations

import asyncio
import logging
import time
from datetime import datetime

import db
import expo_push
import indicators as ind_engine
import twelve_data as market
import twelve_data_ws as td_ws

log = logging.getLogger("matrix.alerts")


async def run_alert_loop(interval: float = 60.0) -> None:
    while True:
        try:
            # الفحص يستدعي مزوّد الأسعار وExpo Push عبر HTTP متزامن (مهلة حتى 15 ثانية لكل طلب) — تشغيله على
            # حلقة الأحداث مباشرة كان يجمّد كل طلبات الـAPI والـWebSocket طوال الدورة. خيط منفصل بدلاً من ذلك.
            await asyncio.to_thread(_check_once)
        except Exception:
            log.exception("unexpected error in alert check cycle")
        await asyncio.sleep(interval)


_QUOTE_MAX_AGE = 180


def _price(symbol: str) -> float | None:
    return _price_at(symbol)[0]


def _price_at(symbol: str) -> tuple[float | None, float | None]:
    """(السعر، وقته عند المزوّد أو None) — الوقت يُمرَّر `q_at` لـ`_price_hit`: كان يُفحص عمره (3د) ثم يُرمى،
    فاقتباس 1.1003 بوقت 09:59 يُطلق «فوق 1.1000» سُلِّح 10:00:30 والسعر 1.0995 — سعر قبل التسليح (كإغلاق
    1m المخزَّن، run 47). `/price` بلا وقت ⇒ None كما كان (مقبول).

    آخر سعر للتنبيه: الاقتباس إن لم يكن أقدم من 3 دقائق بوقته المعلن، وإلا تيك الـWS الحديث.

    هذا المسار يُستدعى حين سلسلة 1m **قديمة** (429/انقطاع) — وكان يقبل `/quote` دون `quoted_at`:
    اقتباس بوقت قبل ساعة (السعر 1.1050 ثم هبط لـ1.0950 وسلّح المتداول «فوق 1.1000») يُطلق التنبيه
    فوراً على سعر لم يعد قائماً. `/price` الاحتياطي بلا وقت أصلاً (`price_only`) يبقى مقبولاً كما كان."""
    try:
        book = market.fetch_quote_book(symbol)
        q = book.get("price") if book else None
        at = book.get("quoted_at") if book else None
        if q is not None and (at is None or time.time() - float(at) <= _QUOTE_MAX_AGE):
            return float(q), (float(at) if at is not None else None)
        if q is not None:
            log.info("quote for %s is %.0fs old — not used for alerts", symbol, time.time() - float(at))
    except Exception:
        log.warning("price quote fetch failed for %s", symbol, exc_info=True)
    # سعر الـWS فقط إن وصل خلال 3 دقائق (نفس حدّ حداثة شموع 1m) — سعر مجمَّد من انقطاع قديم كان يُطلق
    # تنبيهاً سُلِّح بعده على سعر لم يعد قائماً.
    snap = td_ws.snapshot(max_age=180)
    p = snap.get(symbol.upper())
    if p is None:
        return None, None
    return float(p), td_ws.received_at([symbol.upper()]).get(symbol.upper())


# شموع 1m التي تُفحص ذيولها: كانت 5 ⇒ بعد 429 (كاش قديم حتى `STALE_MAX_SEC` = 15د) أو دورة أطول من 5د،
# أول جلب حيّ يعيد آخر 5 دقائق فقط وذيل لمس المستوى قبلها لا يُرى أبداً. تغطّي الآن مدّة الكاش القديم كاملة
# (+1 للشمعة الجارية) بنفس الطلب الواحد؛ ما قبل دقيقة التسليح يُستبعد بـ`_price_hit` كما كان.
_WICK_BARS = market.STALE_MAX_SEC // 60 + 1


def _recent_minutes(symbol: str) -> tuple[float | None, list[dict], float | None]:
    """(آخر سعر، شموع الدقيقة الأخيرة، لحظة جلب السعر أو None) بطلب واحد للمزوّد — نفس كلفة `fetch_quote` السابقة.

    الفحص كل 60 ثانية بآخر سعر فقط كان يفوّت ذيل شمعة يلمس المستوى ثم يرتدّ بين فحصين — بالضبط
    ما يضعه متداول التجزئة تنبيهاً عليه (قمة/قاع سابق). شموع 1m تعطي high/low ما بين الفحصين.
    فشل السلسلة → الاقتباس/التيك (`_price_at`) بوقته عند المزوّد، بلا شموع."""
    if not market.configured():  # بلا مفتاح: لا سجلّ تحذير كل دقيقة — السعر من الـWebSocket كما كان
        q, q_at = _price_at(symbol)
        return q, [], q_at
    try:
        candles, meta = market.fetch_time_series_with_meta(symbol, "1m", outputsize=_WICK_BARS)
        if candles:
            last = float(candles[-1]["close"])
            # عند 429 قد تُخدَم سلسلة قديمة (حتى 15 دقيقة): إغلاقها ليس «السعر الحالي» — قد يسبق التسليح
            # فيُطلق تنبيهاً على سعر لم يعد قائماً. الذيول تبقى صالحة (تُفلتر بلحظة التسليح).
            if last > 0 and time.time() - int(candles[-1]["time"]) <= 180:
                at = meta.get("as_of") if isinstance(meta, dict) else None
                return last, candles, float(at) if at is not None else None
            q, q_at = _price_at(symbol)
            return q, candles, q_at
    except Exception:
        log.warning("1m series fetch failed for %s — falling back to quote", symbol, exc_info=True)
    q, q_at = _price_at(symbol)
    return q, [], q_at


def _armed_at(ts: object) -> float | None:
    """لحظة تسليح التنبيه (إنشاء/تعديل يعيد `ts`) بثواني UTC؛ None إن لم تُقرأ."""
    try:
        return datetime.fromisoformat(str(ts).replace("Z", "+00:00")).timestamp()
    except (TypeError, ValueError):
        return None


def _price_hit(a: dict, q: float, candles: list[dict], q_at: float | None = None) -> bool:
    """السعر الحالي عبر المستوى، أو ذيل شمعة 1m بدأت **بعد** دقيقة التسليح لمسه.

    دقيقة التسليح نفسها مستبعدة: قمّتها قد تسبق لحظة إنشاء التنبيه (تنبيه «فوق» يُطلق فوراً
    على حركة حدثت قبله). تنبيه بلا `ts` مقروء → السعر الحالي فقط (السلوك القديم).
    `q_at` = لحظة جلب `q`: إغلاق 1m من كاش (45ث، وحتى 3د) جُلب **قبل** التسليح ليس سعراً بعده — كان
    1.1005 مخزّناً يُطلق «فوق 1.1000» سُلِّح والسعر 1.0995، فوراً عبر `/api/alerts/check` بعد الإنشاء."""
    level = float(a["price"])
    above = a["condition"] == "above"
    armed = _armed_at(a.get("ts"))
    q_current = q_at is None or armed is None or q_at >= armed
    if q_current and ((above and q >= level) or (not above and q <= level)):
        return True
    if armed is None:
        return False
    first_ok = (int(armed) // 60) * 60 + 60
    for c in candles:
        try:
            if int(c["time"]) < first_ok:
                continue
            if above and float(c["high"]) >= level:
                return True
            if not above and float(c["low"]) <= level:
                return True
        except (KeyError, TypeError, ValueError):
            continue
    return False


_BAR_SECONDS = {"1m": 60, "5m": 300, "15m": 900, "30m": 1800, "1H": 3600, "4H": 14400, "D": 86400, "W": 604800}
# أقلّ عمر مقبول لسلسلة تنبيه المؤشر مهما قصر الفريم — دورة الـworker 60ث وكاش 1m قد يقاربها.
_MIN_SERIES_AGE_OK = 180


def series_fresh_enough(as_of: float | None, timeframe: str, now: float | None = None) -> bool:
    """سلسلة تنبيه المؤشر أحدث من شمعة واحدة من فريمها (وأقلّه 3 دقائق)؟

    عند 429 يُخدَم كاش حتى 15 دقيقة (`STALE_MAX_SEC`) موسوماً `cache`: تقاطع MA/MACD على 1m بتلك
    السلسلة حدث قبل ربع ساعة — كان يُطلق التنبيه الآن ويُعلَّم «مُطلَق» نهائياً ويُدفع كأنه للتوّ،
    والسعر قد عاد. تنبيه السعر يرفض أصلاً إغلاق 1m أقدم من 3 دقائق؛ هذا شقيقه للمؤشر. القديمة
    تُتخطّى (لا تُطلق ولا تُعلَّم) ويُعاد الفحص بالدورة التالية."""
    if as_of is None:
        return False
    limit = max(_BAR_SECONDS.get(timeframe, 900), _MIN_SERIES_AGE_OK)
    return (time.time() if now is None else now) - float(as_of) <= limit


def cross_predates_arming(a: dict, candles: list[dict]) -> bool:
    """تقاطع MA/MACD على آخر شمعة **انتهت قبل تسليح التنبيه** = حدث قديم لا يُطلق.

    تقاطع شمعة الجمعة اليومية كان يُطلق تنبيه «تقاطع صاعد · D» أُنشئ السبت فوراً (والسوق مغلق) كأنه
    حدث للتوّ — `series_fresh_enough` يقيس عمر الجلب لا عمر الشمعة. الشمعة الجارية وقت التسليح تبقى
    مؤهّلة (تقاطع يتكوّن بعد الظهر على شمعة D فُتحت صباحاً حدثٌ بعد التسليح). RSI شرط مستوى لا حدث
    (كتنبيه السعر ≥/≤) فلا يخصّه. بلا `ts` مقروء أو فريم مجهول ⇒ السلوك القديم."""
    if a.get("alert_type") not in ("ma_cross", "macd_cross") or not candles:
        return False
    armed = _armed_at(a.get("ts"))
    step = _BAR_SECONDS.get(str(a.get("timeframe")))
    if armed is None or not step:
        return False
    try:
        # نهاية الشمعة لا تتجاوز إغلاق الجمعة: شمعة W الاثنين كانت «جارية» طوال العطلة ⇒ تقاطعها يُطلق السبت
        return market.bar_end(str(a.get("symbol") or ""), int(candles[-1]["time"]), step) <= armed
    except (KeyError, TypeError, ValueError):
        return False


def cross_already_fired(a: dict, candles: list[dict]) -> bool:
    """تقاطع MA/MACD على الشمعة نفسها التي أُطلق عليها التنبيه قبل إعادة تسليحه = الحدث نفسه.

    `cross_up`/`cross_down` تقرأ آخر قيمتين فقط والشمعة الجارية مؤهّلة ⇒ تنبيه «تقاطع صاعد · 1h» أُطلق
    10:20 وأُعيد تسليحه 10:25 كان يُطلق ثانيةً بالفحص التالي على تقاطع شمعة 10:00 نفسه (إشعار ثانٍ
    لحدث سبق إعادة التسليح)، وعلى D/W طوال اليوم/الأسبوع. الشمعة التالية مؤهّلة كالمعتاد."""
    if a.get("alert_type") not in ("ma_cross", "macd_cross") or not candles:
        return False
    fired = a.get("fired_bar")
    if fired is None:
        return False
    try:
        return int(candles[-1]["time"]) <= int(fired)
    except (KeyError, TypeError, ValueError):
        return False


def cross_is_stale(a: dict, candles: list[dict]) -> bool:
    """تقاطع لا يُطلق: شمعته انتهت قبل التسليح، أو أُطلق عليها التنبيه من قبل."""
    return cross_predates_arming(a, candles) or cross_already_fired(a, candles)


def last_bar_time(candles: list[dict] | None) -> int | None:
    """وقت فتح آخر شمعة (يُحفظ `fired_bar` عند الإطلاق)؛ None إن لم يُقرأ."""
    try:
        return int(candles[-1]["time"]) if candles else None
    except (KeyError, TypeError, ValueError):
        return None


def _indicator_series(a: dict, cache: dict | None = None) -> list[dict] | None:
    """سلسلة `CHART_BARS` شمعة (نفس طول الشارت و/api/indicator-alerts/check — نفس الكاش ونفس القيم) لرمز/فريم التنبيه — **طلب واحد لكل (رمز، فريم) بالدورة** عبر `cache`.
    كانت كل تنبيهات المؤشر تجلب سلسلتها منفردة (5 تنبيهات RSI/تقاطع على EURUSD 1h = 5 طلبات للمزوّد
    كل دقيقة — تستنزف حد Twelve Data كما كانت تنبيهات السعر). الفشل يُخزَّن أيضاً (None) فلا يُعاد
    الطلب لنفس المفتاح بنفس الدورة بعد 429."""
    key = (str(a["symbol"]).upper(), str(a["timeframe"]))
    if cache is not None and key in cache:
        return cache[key]
    raw: list[dict] | None
    try:
        raw, meta = market.fetch_time_series_with_meta(a["symbol"], a["timeframe"], outputsize=market.CHART_BARS)
        if raw and not series_fresh_enough(meta.get("as_of"), str(a["timeframe"])):
            log.info("indicator series for %s (%s) is stale cache — skipped this cycle",
                     a.get("symbol"), a.get("timeframe"))
            raw = None
    except Exception:
        log.warning(
            "indicator series fetch failed for %s (%s)",
            a.get("symbol"),
            a.get("timeframe"),
            exc_info=True,
        )
        raw = None
    if cache is not None:
        cache[key] = raw
    return raw


def _check_indicator(a: dict, cache: dict | None = None) -> bool:
    raw = _indicator_series(a, cache)
    if raw is None:
        return False  # فشل الجلب سُجّل مرة واحدة بـ_indicator_series
    if not raw:
        log.warning(
            "indicator series empty for %s (%s)",
            a.get("symbol"),
            a.get("alert_type"),
        )
        return False
    if cross_is_stale(a, raw):
        return False
    snap = ind_engine.snapshot(raw, int(a.get("fast_period") or 9), int(a.get("slow_period") or 21))
    at = a["alert_type"]
    cond = a["condition"]
    if at == "rsi":
        rv = snap.get("rsi")
        if rv is None or a.get("value") is None:
            return False
        return rv >= float(a["value"]) if cond == "above" else rv <= float(a["value"])
    if at == "ma_cross":
        return bool(snap.get("ma_cross_up" if cond == "cross_up" else "ma_cross_down"))
    if at == "macd_cross":
        return bool(snap.get("macd_cross_up" if cond == "cross_up" else "macd_cross_down"))
    return False


def _push_lang(lang: str | None) -> str:
    """لغة نص الإشعار: الإنجليزية لـen-US/en-GB، والعربية لغيرها (ar، ku بنفس الخط، أو توكن قديم بلا لغة
    — العربية لغة الواجهة الافتراضية)."""
    return "en" if (lang or "").lower().startswith("en") else "ar"


def _fmt_price(v) -> str:
    try:
        return f"{float(v):.10g}"
    except (TypeError, ValueError):
        return str(v)


_IND_NAMES = {
    "ar": {"rsi": "RSI", "ma_cross": "تقاطع المتوسطات", "macd_cross": "تقاطع MACD"},
    "en": {"rsi": "RSI", "ma_cross": "MA cross", "macd_cross": "MACD cross"},
}
_COND_WORDS = {
    "ar": {"above": "فوق", "below": "تحت", "cross_up": "صاعد ▲", "cross_down": "هابط ▼"},
    "en": {"above": "above", "below": "below", "cross_up": "up ▲", "cross_down": "down ▼"},
}


def _compose(ev: dict, lang: str) -> tuple[str, str]:
    """(عنوان، نص) الإشعار بلغة الجهاز. كان النص خاماً إنجليزياً للجميع («EURUSD price above 1.1»)
    تحت عنوان عربي — نص مختلط لا يقرؤه نصف الجمهور."""
    sym = ev["symbol"]
    if ev["kind"] == "price":
        up = ev["condition"] == "above"
        p = _fmt_price(ev["price"])
        # الشرط ≥/≤ لا «عبور» (التطبيق يسلّح «≥» ويحذّر حين يكون محقّقاً عند الإنشاء): تنبيه «فوق 1.1000»
        # يُسلَّح والسعر 1.1050 يُطلق بالدورة التالية — كان النصّ «rose above/تجاوز» يروي حركة لم تحدث.
        if lang == "en":
            return "MATRIX · Price alert", f"{sym} {'▲ at or above' if up else '▼ at or below'} {p}"
        # «عند 1.1000 أو فوقه» لا «عند أو فوق 1.1000» (حرفا جرّ على اسم واحد تركيب مترجَم — launch126).
        return "MATRIX · تنبيه سعر", (f"{sym} ▲ عند {p} أو فوقه" if up else f"{sym} ▼ عند {p} أو تحته")
    name = _IND_NAMES[lang].get(ev["alert_type"], str(ev["alert_type"]).upper())
    cond = _COND_WORDS[lang].get(ev["condition"], ev["condition"])
    val = f" {_fmt_price(ev['value'])}" if ev.get("value") is not None and ev["alert_type"] == "rsi" else ""
    tf = f" · {ev['timeframe']}" if ev.get("timeframe") else ""
    title = "MATRIX · Indicator alert" if lang == "en" else "MATRIX · تنبيه مؤشر"
    return title, f"{sym} · {name} {cond}{val}{tf}"


def _check_once() -> None:
    # (owner user_id, owner install key, event) — each push goes only to the alert owner's devices
    # (it used to go to every registered device, leaking one trader's alerts to all the others).
    triggered_msgs: list[tuple[int | None, str | None, dict]] = []
    # طلب واحد لكل رمز بالدورة: 30 تنبيهاً على EURUSD كانت 30 طلباً للمزوّد (تستنزف حد Twelve Data).
    prices: dict[str, tuple[float | None, list[dict], float | None]] = {}

    for a in db.list_alerts(all_users=True):
        try:
            if not a.get("active") or a.get("triggered"):
                continue
            key = str(a["symbol"]).upper()
            if key not in prices:
                prices[key] = _recent_minutes(a["symbol"])
            q, candles, q_at = prices[key]
            if q is None:
                log.warning("no price available for alert id=%s symbol=%s", a.get("id"), a.get("symbol"))
                continue
            if _price_hit(a, q, candles, q_at) and db.mark_alert_triggered(a["id"], a):
                triggered_msgs.append((
                    a.get("user_id"),
                    a.get("owner_key"),
                    {"kind": "price", "symbol": a["symbol"], "condition": a["condition"], "price": a["price"]},
                ))
        except Exception:
            log.exception(
                "price alert processing failed id=%s symbol=%s",
                a.get("id"),
                a.get("symbol"),
            )

    series: dict[tuple[str, str], list[dict] | None] = {}  # (رمز، فريم) → سلسلة، مرة واحدة بالدورة
    for a in db.list_indicator_alerts(all_users=True):
        try:
            if not a.get("active") or a.get("triggered"):
                continue
            if _check_indicator(a, series) and db.mark_indicator_alert_triggered(
                a["id"], last_bar_time(series.get((str(a["symbol"]).upper(), str(a["timeframe"])))), seen=a
            ):
                triggered_msgs.append((
                    a.get("user_id"),
                    a.get("owner_key"),
                    {
                        "kind": "indicator",
                        "symbol": a["symbol"],
                        "alert_type": a["alert_type"],
                        "condition": a["condition"],
                        "value": a.get("value"),
                        "timeframe": a.get("timeframe"),
                    },
                ))
        except Exception:
            log.exception(
                "indicator alert processing failed id=%s symbol=%s",
                a.get("id"),
                a.get("symbol"),
            )

    _retry_pending_pushes()
    for owner, owner_key, ev in triggered_msgs:
        # كل رسالة بمعزل: قراءة الرموز كانت خارج أي try ⇒ «database is locked» عند مالك واحد يُسقط
        # إشعارات كل من بعده بالدورة، وتنبيهاتهم موسومة مُطلَقة فلا تُعاد أبداً.
        try:
            targets = db.push_targets_for(owner, owner_key)
            by_lang: dict[str, list[str]] = {}
            for tok, lang in targets:
                by_lang.setdefault(_push_lang(lang), []).append(tok)
            for lang, tokens in by_lang.items():
                title, body = _compose(ev, lang)
                if not _deliver(tokens, title, body):
                    _pending_pushes.append((tokens, title, body, time.time()))
        except Exception:
            log.exception("push dispatch failed for owner=%s event=%s", owner, ev)


# دفعات فشل إرسالها لـExpo بخطأ عابر (انقطاع/مهلة/5xx/429). التنبيه يُوسَم مُطلَقاً **قبل** الإرسال
# (هذا ما يمنع الإشعار المكرّر بين الـworker وفحص التطبيق)، فكان فشل الإرسال الواحد يُفقد الإشعار
# نهائياً: لا يُعاد التنبيه ولا الدفعة، والمتداول لا يعلم أن السعر بلغ مستواه. تُعاد بكل دورة
# حتى `_PUSH_RETRY_MAX_AGE` — بعدها يُسقَط (إشعار سعر بعد ربع ساعة يضلّل أكثر مما يفيد، والتنبيه
# نفسه ظاهر «مُطلَق» بالتطبيق). بالذاكرة فقط: إعادة تشغيل الخادم تُسقطها (أفضل من لا شيء قبلها).
_PUSH_RETRY_MAX_AGE = 15 * 60
_PUSH_RETRY_MAX_PENDING = 1000
_pending_pushes: list[tuple[list[str], str, str, float]] = []


def _retryable(exc: Exception) -> bool:
    if isinstance(exc, expo_push.httpx.HTTPStatusError):
        code = exc.response.status_code
        return code >= 500 or code == 429
    return isinstance(exc, expo_push.httpx.TransportError)


def _deliver(tokens: list[str], title: str, body: str) -> bool:
    """يرسل دفعة واحدة. False = فشل عابر يستحق الإعادة؛ True = أُرسلت أو فشل دائم (لا إعادة)."""
    try:
        result = expo_push.send_push(tokens, title, body, {})
    except Exception as exc:
        log.exception("push send failed for message: %s", body)
        return not _retryable(exc)
    for tok in result.get("invalid_tokens") or []:
        db.delete_push_token(tok)
        log.info("removed invalid push token (%s…)", tok[:24])
    return True


def _retry_pending_pushes() -> None:
    if not _pending_pushes:
        return
    now = time.time()
    due = _pending_pushes[-_PUSH_RETRY_MAX_PENDING:]
    _pending_pushes.clear()
    for tokens, title, body, first_at in due:
        if now - first_at > _PUSH_RETRY_MAX_AGE:
            log.warning("dropping push after %.0fs of failed retries: %s", now - first_at, body)
            continue
        # رمز حُذف أثناء الانتظار (خروج/حذف حساب/DeviceNotRegistered) لا يُرسل إليه
        try:
            live = db.existing_push_tokens(tokens)
            if live and not _deliver(live, title, body):
                _pending_pushes.append((live, title, body, first_at))
        except Exception:
            log.exception("push retry failed: %s", body)
            _pending_pushes.append((tokens, title, body, first_at))
