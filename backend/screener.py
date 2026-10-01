"""Symbol screener — scan MATRIX watchlist with indicator filters."""
from __future__ import annotations

from typing import Any, Literal, get_args

import alert_worker
import indicators as ind
import twelve_data as market

FilterId = Literal[
    "rsi_oversold",
    "rsi_overbought",
    "ma_cross_up",
    "ma_cross_down",
    "macd_cross_up",
    "bullish",
    "bearish",
]

# نفس القائمة التي تفهمها حلقة المطابقة أدناه، مشتقّة من `FilterId` لا مكتوبة ثانيةً: معرّف فلتر
# لا تعرفه الحلقة كان **يُقابَل بقائمة فارغة صامتة** — يقرؤها المتداول «لا تطابق» وهي «لم يُفهم
# الفلتر»، وهو نفس الالتباس الذي أُضيف `scanned`/`failed` لإزالته. المسار يرفضه بـ422 الآن.
FILTER_IDS: tuple[str, ...] = get_args(FilterId)

# سقف رموز الفحص بالطلب الواحد. كل رمز **طلبٌ متسلسل للمزوّد** داخل طلب HTTP واحد، والمفتاح
# مشترك بين كل مستخدمي الخادم (الخطة المجانية ~8 طلبات/دقيقة): طلبٌ بـ400 رمز كان يُقبل كما هو
# فيحجز عاملاً دقائق ويستنزف حدّ المزوّد على الجميع. الخريطة 21 رمزاً والافتراضي 12، والسقف
# يترك مساحةً لرموز قائمة متابعة مخصّصة خارج الخريطة.
MAX_SCAN_SYMBOLS = 30

DEFAULT_SYMBOLS = list(market.SYMBOL_MAP.keys())
# نسبة التغيّر بالنتيجة تبقى «آخر 80 شمعة» كما تعرضها الواجهة (`screenerChangeSpan`)، بينما المؤشرات
# تُحسب على السلسلة الموحَّدة كاملة (تقارب EMA/RSI أفضل، ونفس قيم تنبيهات المؤشر والشارت).
CHANGE_WINDOW = 80

# عتبات الفلاتر بمكان واحد: حلقة المطابقة ووصف `/api/screener/filters` يقرآنها معاً — الوصف كان
# نصّاً يدوياً «RSI oversold (<30)» والفحص `<=` (أي 30 تطابق)، ونصفه عربي ونصفه إنجليزي.
RSI_OVERSOLD = 30.0
RSI_OVERBOUGHT = 70.0
# «زخم صاعد» = تغيّر موجب على آخر `CHANGE_WINDOW` شمعة و RSI دون هذا الحدّ (لم يتشبّع بعد)، والهابط عكسه.
MOMENTUM_RSI_CAP = 65.0
MOMENTUM_RSI_FLOOR = 35.0


def _price_as_of(
    raw: list[dict[str, Any]], timeframe: str, fetched: float | None, symbol: str = ""
) -> float | None:
    """إغلاق آخر شمعة (`market.bar_end`: فتحها + طول الفريم، لا بعد إغلاق الجمعة) ولا يتجاوز لحظة الجلب
    — نفس `main._series_price_at`."""
    step = alert_worker._BAR_SECONDS.get(timeframe)
    try:
        candle_end = market.bar_end(symbol, float(raw[-1]["time"]), step) if raw and step else None
    except (KeyError, TypeError, ValueError):
        candle_end = None
    known = [t for t in (fetched, candle_end) if t is not None]
    return min(known) if known else None


def _evaluable(f: str, closes: list[float], fast: int, slow: int, chg: float | None) -> bool:
    """هل في السلسلة ما يكفي لتقييم الفلتر؟ التقاطع يحتاج قيمتين للخطّين (`indicators._last_two`)، وإلا
    `cross_up` يعيد False صامتاً — كان الرمز يُعدّ «مفحوصاً بلا تطابق» (100 شمعة و`slow` 150، أو 30 شمعة
    لتقاطع MACD الذي يحتاج 35) وهو لم يُفحص. RSI يُفحص قبل هذا (`snap["rsi"]`)."""
    if f in ("ma_cross_up", "ma_cross_down"):
        return ind._last_two(ind.sma(closes, fast), ind.sma(closes, slow)) is not None
    if f == "macd_cross_up":
        return ind._last_two(*ind.macd(closes)) is not None
    if f in ("bullish", "bearish"):
        return chg is not None
    return True


def filter_rules(fast: int = 9, slow: int = 21) -> list[dict[str, Any]]:
    """قاعدة كل فلتر بصيغة آلية مشتقّة من الثوابت نفسها التي يطابق بها الفحص — بلا نصّ بشري:
    التطبيق له نصوصه المترجمة (`locales.ts`)، والخادم لا يرسل لغةً واحدة لكل المستخدمين."""
    rules: dict[str, dict[str, Any]] = {
        "rsi_oversold": {"indicator": "rsi", "period": 14, "op": "<=", "value": RSI_OVERSOLD},
        "rsi_overbought": {"indicator": "rsi", "period": 14, "op": ">=", "value": RSI_OVERBOUGHT},
        "ma_cross_up": {"indicator": "sma_cross", "fast": fast, "slow": slow, "direction": "up"},
        "ma_cross_down": {"indicator": "sma_cross", "fast": fast, "slow": slow, "direction": "down"},
        "macd_cross_up": {"indicator": "macd_cross", "fast": 12, "slow": 26, "signal": 9, "direction": "up"},
        "bullish": {"change_bars": CHANGE_WINDOW, "change_op": ">", "rsi_op": "<", "rsi_value": MOMENTUM_RSI_CAP},
        "bearish": {"change_bars": CHANGE_WINDOW, "change_op": "<", "rsi_op": ">", "rsi_value": MOMENTUM_RSI_FLOOR},
    }
    return [{"id": fid, "rule": rules[fid]} for fid in FILTER_IDS]


def run_scan(
    timeframe: str = "15m",
    filters: list[str] | None = None,
    symbols: list[str] | None = None,
    rsi_low: float = RSI_OVERSOLD,
    rsi_high: float = RSI_OVERBOUGHT,
    fast: int = 9,
    slow: int = 21,
) -> list[dict[str, Any]]:
    return run_scan_detailed(
        timeframe, filters, symbols, rsi_low, rsi_high, fast, slow
    )["results"]


def run_scan_detailed(
    timeframe: str = "15m",
    filters: list[str] | None = None,
    symbols: list[str] | None = None,
    rsi_low: float = RSI_OVERSOLD,
    rsi_high: float = RSI_OVERBOUGHT,
    fast: int = 9,
    slow: int = 21,
) -> dict[str, Any]:
    """نتائج الفحص + عدد الرموز المفحوصة فعلاً والتي تعذّرت قراءتها.

    الرمز الذي يفشل جلبه (حدّ طلبات المزوّد غالباً — الخطة المجانية ~8 طلبات/دقيقة و12 رمزاً
    بالفحص) كان يُتخطّى بصمت، فـ«لا نتائج» تُقرأ «لا تطابق» وهي «لم يُفحص». العميل يميّز الآن.
    """
    flt = filters or ["ma_cross_up"]
    syms = symbols or DEFAULT_SYMBOLS[:12]
    hits: list[dict[str, Any]] = []
    scanned = 0
    failed: list[str] = []
    insufficient: dict[str, list[str]] = {}

    for sym in syms:
        try:
            # نفس طول الشارت/التنبيهات → نفس مفتاح الكاش: رمز شوهد شارته أو يراقبه تنبيه لا يستهلك طلباً،
            # وإعادة الفحص بعد حدّ المزوّد تجلب الفاشلة فقط.
            raw, meta = market.fetch_time_series_with_meta(sym, timeframe, outputsize=market.CHART_BARS)
        except Exception:
            failed.append(sym.upper())
            continue
        if not raw:
            failed.append(sym.upper())
            continue
        if not alert_worker.series_fresh_enough(meta.get("as_of"), timeframe, symbol=sym):
            # كاش أقدم من شمعة من الفريم (يُخدَم حتى 15د عند 429): تقاطع MA/MACD على 1m «الآن» حدث قبل
            # ربع ساعة، وRSI «تشبّع» قد زال — كانت النتيجة تُعرض كأنها الحالية. يُعدّ «لم يُفحص» كما
            # تُتخطّى تنبيهات المؤشر على السلسلة نفسها (`211a419`)، والتطبيق يسمّي الرموز غير المقروءة.
            failed.append(sym.upper())
            continue
        snap = ind.snapshot(raw, fast=fast, slow=slow)
        if snap.get("rsi") is None:
            failed.append(sym.upper())
            continue

        # يُطابَق على الرقم المعروض (منزلة واحدة): 69.96 كان يُعرض 70.0 ولا يطابق «تشبّع شرائي ≥ 70»
        rsi_v = round(float(snap["rsi"]), 1) + 0.0
        # «آخر 80 شمعة» = من إغلاق ما **قبلها** (80 حركة، كـ`signal_hub` «آخر 10 شموع»): كان `raw[-80:]`
        # يقيس من إغلاق أولاها ⇒ 79 حركة تحت وصف 80.
        # أقلّ من 81 شمعة (رمز جديد، فجوة بالمزوّد) ⇒ لا تغيّر «80 شمعة»: كانت النافذة الأقصر تُرسَل تحت
        # الوصف نفسه، وإغلاق أول غير مقروء يصير 0.0% «ثابت». الآن None ⇒ فلترا الزخم لا يطابقان والتطبيق
        # يعرض «—» (`ScreenerMini` يقبل غير الرقم).
        window = raw[-(CHANGE_WINDOW + 1):]
        first_close = float(window[0]["close"]) if len(window) == CHANGE_WINDOW + 1 else 0.0
        chg = ((float(snap["last"]) - first_close) / first_close * 100) if first_close > 0 else None
        # على المعروض (منزلتان) كـRSI: +0.0004% كان «صاعد» بجانب «0.00%» (و«-0.00%» هابط)
        chg = round(chg, 2) + 0.0 if chg is not None else None

        closes = ind._closes(raw)
        short = [f for f in flt if not _evaluable(f, closes, fast, slow, chg)]
        if short:
            insufficient[sym.upper()] = short
        if len(short) == len(flt):
            # لا فلتر مطلوب أمكن تقييمه ⇒ «لم يُفحص» كرمز تعذّر جلبه، لا «فُحص ولا تطابق»
            failed.append(sym.upper())
            continue
        scanned += 1

        matched: list[str] = []
        for f in flt:
            if f == "rsi_oversold" and rsi_v <= rsi_low:
                matched.append(f)
            elif f == "rsi_overbought" and rsi_v >= rsi_high:
                matched.append(f)
            elif f == "ma_cross_up" and snap.get("ma_cross_up"):
                matched.append(f)
            elif f == "ma_cross_down" and snap.get("ma_cross_down"):
                matched.append(f)
            elif f == "macd_cross_up" and snap.get("macd_cross_up"):
                matched.append(f)
            elif f == "bullish" and chg is not None and chg > 0 and rsi_v < MOMENTUM_RSI_CAP:
                matched.append(f)
            elif f == "bearish" and chg is not None and chg < 0 and rsi_v > MOMENTUM_RSI_FLOOR:
                matched.append(f)

        if matched:
            hits.append(
                {
                    "symbol": sym.upper(),
                    "timeframe": timeframe,
                    "last": snap["last"],
                    "change_pct": chg,
                    "rsi": round(rsi_v, 1),
                    "filters_matched": matched,
                    # عند حدّ المزوّد (429) تُخدَم سلسلة مخزَّنة حتى 15د — كانت النتيجة لا تقول ذلك فيُقرأ
                    # RSI/التقاطع «الآن». `cache` + وقت جلبها الحقيقي كما بمصدر الشارت (`DataProvenance`).
                    "data_kind": meta.get("kind"),
                    "as_of": meta.get("as_of"),
                    # وقت إغلاق آخر شمعة (كـ`price_as_of` بالتوقّع والمساعد): `as_of` وقت **الجلب**، فالسبت
                    # يُجلب طازجاً ويجتاز فحص القِدم وتقاطعه من إغلاق الجمعة — كان يُقرأ «الآن».
                    "price_as_of": _price_as_of(raw, timeframe, meta.get("as_of"), sym),
                }
            )

    hits.sort(key=lambda x: abs(x["change_pct"] or 0.0), reverse=True)
    return {
        "results": hits,
        "scanned": scanned,
        "failed": failed,
        # رمز → الفلاتر التي لم تكفِ شموعه لتقييمها (لا تطابق عليها ليس «لا تقاطع»). رمز كل فلاتره هنا
        # يُعدّ أيضاً في `failed`.
        "insufficient_data": insufficient,
        "total": len(syms),
    }
