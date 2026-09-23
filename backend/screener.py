"""Symbol screener — scan MATRIX watchlist with indicator filters."""
from __future__ import annotations

from typing import Any, Literal, get_args

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


def run_scan(
    timeframe: str = "15m",
    filters: list[str] | None = None,
    symbols: list[str] | None = None,
    rsi_low: float = 30,
    rsi_high: float = 70,
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
    rsi_low: float = 30,
    rsi_high: float = 70,
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

    for sym in syms:
        try:
            # نفس طول الشارت/التنبيهات → نفس مفتاح الكاش: رمز شوهد شارته أو يراقبه تنبيه لا يستهلك طلباً،
            # وإعادة الفحص بعد حدّ المزوّد تجلب الفاشلة فقط.
            raw = market.fetch_time_series(sym, timeframe, outputsize=market.CHART_BARS)
        except Exception:
            failed.append(sym.upper())
            continue
        if not raw:
            failed.append(sym.upper())
            continue
        snap = ind.snapshot(raw, fast=fast, slow=slow)
        if snap.get("rsi") is None:
            failed.append(sym.upper())
            continue
        scanned += 1

        matched: list[str] = []
        rsi_v = float(snap["rsi"])
        window = raw[-CHANGE_WINDOW:]
        first_close = float(window[0]["close"]) if window else 0.0
        chg = ((float(snap["last"]) - first_close) / first_close * 100) if first_close else 0.0

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
            elif f == "bullish" and chg > 0 and rsi_v < 65:
                matched.append(f)
            elif f == "bearish" and chg < 0 and rsi_v > 35:
                matched.append(f)

        if matched:
            hits.append(
                {
                    "symbol": sym.upper(),
                    "timeframe": timeframe,
                    "last": snap["last"],
                    "change_pct": round(chg, 2),
                    "rsi": round(rsi_v, 1),
                    "filters_matched": matched,
                }
            )

    hits.sort(key=lambda x: abs(x["change_pct"]), reverse=True)
    return {
        "results": hits,
        "scanned": scanned,
        "failed": failed,
        "total": len(syms),
    }
