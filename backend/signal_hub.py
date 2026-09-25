"""MATRIX signal hub — analysts, social consensus, multi-indicator forecasts.

Analysts and social consensus have no licensed data source and report themselves
unavailable (they used to be hash-generated samples under real bank names).
Indicator forecasts use real OHLC math from indicators.py.
"""
from __future__ import annotations

import math
from typing import Any

import indicators as ind_engine

# لا مصدر حقيقي للمحلّلين ولا لقنوات التواصل. كان هنا فهرس بأسماء بنوك حقيقية (HSBC، Citi، UBS،
# Nomura، Commerzbank، ING) و14 «قناة» (منها اسم منافس «TradingCentral-like»)، واتجاه كل منها
# وهدفه = SHA-256 لـ(المعرّف|الرمز|نافذة 4–6 ساعات) + ميل ثابت لكل رمز — ضجيج مُعرَض كتوصية بنك
# حقيقي. أُزيل كلّه: الردّ يقول «غير متاح» بدل رقم مخترَع، والاسم الحقيقي لم يعد بجانب توصية
# لم يصدرها. حين يُرخَّص مصدر حقيقي يُبنى من بياناته لا من هذا.
UNAVAILABLE_REASON = "no_licensed_feed"

# حدّ طول قائمة المصادر بالطلب — العميل القديم قد يرسل معرّفات محفوظة؛ تُقبل وتُتجاهل لأن الردّ
# «غير متاح» أياً كانت، بدل 422 يعرضه التطبيق خطأً عاماً.
MAX_SOURCE_IDS = 20


def _direction(score: float) -> str:
    if score >= 0.12:
        return "buy"
    if score <= -0.12:
        return "sell"
    return "neutral"


# معرّفات مؤشّرات التوقّع ومصادر الإجماع — معلنة هنا (حيث تُستهلَك) ويقرأ منها `main` لتصديق
# الطلب، كـ`screener.FILTER_IDS`: معرّف مجهول كان يُهمَل بصمت فيُحسب التوقّع بمؤشّرات أقلّ
# ممّا تعرضه الواجهة.
FORECAST_INDICATOR_IDS: tuple[str, ...] = ("rsi", "ma", "macd", "bb", "stoch", "trend")


# مضاعِفا ATR14 للوقف والهدف — نفس نسبة العائد/المخاطرة السابقة (1:1.57)، لكن المسافة من تذبذب
# الفريم الفعلي. كانت 0.18% من السعر ثابتة لكل فريم (~29 نقطة على EURUSD سواء 1د أو يومي): ضيّقة
# بلا معنى على اليومي وواسعة جداً على الدقيقة.
SL_ATR_MULT = 1.4
TP_ATR_MULT = 2.2
ATR_PERIOD = 14


def _atr_last(candles: list[dict[str, Any]] | None) -> float | None:
    if not candles:
        return None
    try:
        v = ind_engine.atr(candles, ATR_PERIOD)[-1]
    except (KeyError, TypeError, ValueError):
        return None
    return v if v is not None and math.isfinite(v) and v > 0 else None


def _trade_levels(
    last: float | None, direction: str, candles: list[dict[str, Any]] | None
) -> tuple[dict[str, float] | None, dict[str, Any]]:
    """(المستويات، أساسها). المستويات None — لا رقم مخترَع — حين: لا سعر حقيقي، أو شموع أقلّ من
    ATR14، أو الاتجاه محايد (دخول=وقف=هدف كان يُعرض كصفقة)."""
    atr_v = _atr_last(candles)
    basis: dict[str, Any] = {"method": f"atr{ATR_PERIOD}", "atr": atr_v,
                             "sl_mult": SL_ATR_MULT, "tp_mult": TP_ATR_MULT}
    if last is None or not (last > 0):
        return None, {**basis, "unavailable": "no_live_price"}
    if atr_v is None:
        return None, {**basis, "unavailable": "not_enough_candles"}
    if direction not in ("buy", "sell"):
        return None, {**basis, "unavailable": "neutral"}
    sgn = 1 if direction == "buy" else -1
    sl = level_round(last - sgn * SL_ATR_MULT * atr_v, last)
    tp = level_round(last + sgn * TP_ATR_MULT * atr_v, last)
    # مدى أوسع من السعر (عملة منهارة على W) ⇒ هدف/وقف ≤ 0: سعر مستحيل كان يُعرض هدفاً
    if not (sl > 0 and tp > 0):
        return None, {**basis, "unavailable": "atr_exceeds_price"}
    return {"entry": level_round(last, last), "sl": sl, "tp": tp}, basis


def level_round(x: float, ref: float) -> float:
    """مستوى سعري بمنازل تكفي لسعر المرجع `ref`: 5 منازل كما كانت، وأكثر تحت 0.1 (6 أرقام معنوية).
    كان `round(x, 5)` ⇒ SHIB ‏0.0000123: دخول ووقف وهدف كلها 0.00001 (الوقف 19% تحت السعر الحقيقي)."""
    mag = math.floor(math.log10(abs(ref))) if ref and math.isfinite(ref) else 0
    return round(x, max(5, 5 - mag))


def list_social_sources() -> list[dict[str, Any]]:
    return []


def _unavailable(sym: str, mode: str, timeframe: str) -> dict[str, Any]:
    """ردّ صادق حين لا مصدر: لا اتجاه ولا درجة ولا ثقة ولا مستويات — كلّها null لا «محايد» ولا 0،
    فالمحايد نفسه ادّعاء بأن المصادر لا ترى اتجاهاً."""
    return {
        "symbol": sym,
        "mode": mode,
        "status": "unavailable",
        "unavailable_reason": UNAVAILABLE_REASON,
        "data_kind": "unavailable",
        "timeframe": timeframe,
        "direction": None,
        "avg_score": None,
        "levels": None,
        "levels_basis": {"unavailable": UNAVAILABLE_REASON},
    }


def social_consensus(symbol: str, timeframe: str = "15m") -> dict[str, Any]:
    out = _unavailable(symbol.upper(), "social_consensus", timeframe)
    out.update({"selected_count": 0, "split": {"buy": 0, "sell": 0, "neutral": 0}, "votes": []})
    return out


def analysts_forecast(symbol: str, timeframe: str = "15m") -> dict[str, Any]:
    out = _unavailable(symbol.upper(), "analysts", timeframe)
    out["analysts"] = []
    return out


# نصوص تفاصيل الأصوات. كانت عربية فقط وتصل الواجهة الإنجليزية/الكردية كما هي، والأسعار بـ`:.5f`
# خام (USDJPY «157.42312»). الآن كل صوت يحمل `detail_code` + `detail_values` (أرقام مقرَّبة بمنازل
# الرمز) ليترجمها التطبيق بأي لغة، و`detail` نصّ جاهز بالعربية أو الإنجليزية (`lang`). الكردي يأخذ
# العربية كقوالب المساعد (لا مراجعة كردية بعد — launch77)؛ الرموز تكفي التطبيق ليعرضه بالكردية.
_VOTE_NAMES: dict[str, dict[str, str]] = {
    "ar": {"rsi": "RSI 14", "ma_cross": "تقاطع MA", "ma_trend": "اتجاه MA", "macd": "MACD",
           "bb": "بولنجر", "stoch": "Stochastic", "trend": "ميل السعر"},
    "en": {"rsi": "RSI 14", "ma_cross": "MA cross", "ma_trend": "MA trend", "macd": "MACD",
           "bb": "Bollinger", "stoch": "Stochastic", "trend": "Price slope"},
}
_DETAIL_TEXT: dict[str, dict[str, str]] = {
    "ar": {
        "rsi_overbought": "تشبع شراء ({rsi})", "rsi_oversold": "تشبع بيع ({rsi})",
        "rsi_bullish": "زخم إيجابي ({rsi})", "rsi_bearish": "زخم سلبي ({rsi})",
        "rsi_neutral": "محايد ({rsi})",
        "ma_cross_up": "تقاطع صاعد SMA سريع/بطيء", "ma_cross_down": "تقاطع هابط SMA سريع/بطيء",
        "ma_above": "سريع {fast} فوق بطيء {slow}", "ma_below": "سريع {fast} تحت بطيء {slow}",
        "macd_cross_up": "تقاطع صاعد مع الإشارة", "macd_cross_down": "تقاطع هابط مع الإشارة",
        "macd_above": "الخط {macd} فوق الإشارة {signal}", "macd_below": "الخط {macd} تحت الإشارة {signal}",
        "bb_upper": "قرب الحد العلوي", "bb_lower": "قرب الحد السفلي", "bb_position": "موقع النطاق {pos}%",
        "stoch_k": "%K≈{k}", "trend_slope": "10 شموع · {pct}%",
    },
    "en": {
        "rsi_overbought": "Overbought ({rsi})", "rsi_oversold": "Oversold ({rsi})",
        "rsi_bullish": "Positive momentum ({rsi})", "rsi_bearish": "Negative momentum ({rsi})",
        "rsi_neutral": "Neutral ({rsi})",
        "ma_cross_up": "Fast SMA crossed above slow", "ma_cross_down": "Fast SMA crossed below slow",
        "ma_above": "Fast {fast} above slow {slow}", "ma_below": "Fast {fast} below slow {slow}",
        "macd_cross_up": "Crossed above signal", "macd_cross_down": "Crossed below signal",
        "macd_above": "Line {macd} above signal {signal}", "macd_below": "Line {macd} below signal {signal}",
        "bb_upper": "Near upper band", "bb_lower": "Near lower band", "bb_position": "Band position {pos}%",
        "stoch_k": "%K≈{k}", "trend_slope": "10 candles · {pct}%",
    },
}
_DISCLAIMER = {
    "ar": "إجماع مؤشرات فنية داخل MATRIX — ليس ضماناً للربح.",
    "en": "Technical-indicator consensus inside MATRIX — not a guarantee of profit.",
}
_NO_DATA = {"ar": "لا بيانات كافية للمؤشرات.", "en": "Not enough data for the indicators."}


def price_decimals(price: float | None) -> int:
    """منازل عرض السعر كما تعرضها المنصّات: ~6 أرقام معنوية (EURUSD 5، USDJPY 3، الذهب 2)."""
    if price is None or not math.isfinite(price) or price == 0:
        return 5
    return max(0, min(5, 5 - int(math.floor(math.log10(abs(price))))))


def _same_level(a: float, b: float, last: float | None) -> bool:
    """خطّان متساويان بحدود ضجيج الفاصلة العائمة (نسبةً إلى السعر): متوسّطا 1.1 المتطابقة قد يختلفان بـ1e-16."""
    scale = abs(last) if last else max(abs(a), abs(b), 1.0)
    return abs(a - b) <= scale * 1e-9


def _distinct_decimals(a: float, b: float, dp: int) -> int:
    """منازل تُظهر الفرق بين رقمين مختلفين: «الخط 0.00001 فوق الإشارة 0.00001» نصّ يناقض نفسه."""
    d = dp
    while d < 10 and round(a, d) == round(b, d):
        d += 1
    return d


def _text_lang(lang: str | None) -> str:
    return "en" if (lang or "").strip().lower().startswith("en") else "ar"


def indicator_forecast(
    symbol: str,
    candles: list[dict[str, Any]],
    enabled: list[str] | None = None,
    lang: str | None = None,
) -> dict[str, Any]:
    sym = symbol.upper()
    tl = _text_lang(lang)
    snap = ind_engine.snapshot(candles) if candles else {}
    closes = [float(c["close"]) for c in candles] if candles else []
    last = float(snap.get("last") or closes[-1]) if closes else None
    dp = price_decimals(last)

    want = set(enabled or FORECAST_INDICATOR_IDS)
    votes: list[dict[str, Any]] = []

    def add(key: str, name_key: str, score: float, code: str, **values: float) -> None:
        if key not in want:
            return
        score = max(-1.0, min(1.0, score))
        votes.append(
            {
                "id": key,
                "name": _VOTE_NAMES[tl][name_key],
                "direction": _direction(score),
                "score": round(score, 3),
                "detail": _DETAIL_TEXT[tl][code].format(**values),
                "detail_code": code,
                "detail_values": values,
            }
        )

    rsi_v = snap.get("rsi")
    if rsi_v is not None:
        r = round(rsi_v, 1)
        if rsi_v >= 70:
            add("rsi", "rsi", -0.7, "rsi_overbought", rsi=r)
        elif rsi_v <= 30:
            add("rsi", "rsi", 0.7, "rsi_oversold", rsi=r)
        elif rsi_v >= 55:
            add("rsi", "rsi", 0.25, "rsi_bullish", rsi=r)
        elif rsi_v <= 45:
            add("rsi", "rsi", -0.25, "rsi_bearish", rsi=r)
        else:
            add("rsi", "rsi", 0.0, "rsi_neutral", rsi=r)

    if snap.get("ma_cross_up"):
        add("ma", "ma_cross", 0.8, "ma_cross_up")
    elif snap.get("ma_cross_down"):
        add("ma", "ma_cross", -0.8, "ma_cross_down")
    else:
        sf, ss = snap.get("sma_fast"), snap.get("sma_slow")
        # خطّان متساويان (سوق بلا حركة) لا اتجاه لهما: كان `else` يجعل التساوي «تحت» ⇒ صوت بيع −0.45 وفرق
        # فاصلة عائمة يقرّر الصوت. التساوي بحدود ضجيج الحساب ⇒ لا صوت (كـBB/Stoch بمدى صفري).
        if sf is not None and ss is not None and not _same_level(sf, ss, last):
            fdp = _distinct_decimals(sf, ss, dp)
            add("ma", "ma_trend", 0.45 if sf > ss else -0.45,
                "ma_above" if sf > ss else "ma_below", fast=round(sf, fdp), slow=round(ss, fdp))

    if snap.get("macd_cross_up"):
        add("macd", "macd", 0.75, "macd_cross_up")
    elif snap.get("macd_cross_down"):
        add("macd", "macd", -0.75, "macd_cross_down")
    else:
        m, ms = snap.get("macd"), snap.get("macd_signal")
        if m is not None and ms is not None and not _same_level(m, ms, last):
            # MACD فرق بين سعرين ⇒ بمنازل السعر نفسها (وأكثر إن تساوى الرقمان المعروضان)
            mdp = _distinct_decimals(m, ms, dp)
            add("macd", "macd", 0.35 if m > ms else -0.35,
                "macd_above" if m > ms else "macd_below", macd=round(m, mdp), signal=round(ms, mdp))

    # Bollinger-ish from recent std
    if len(closes) >= 20:
        window = closes[-20:]
        mid = sum(window) / 20
        var = sum((x - mid) ** 2 for x in window) / 20
        std = math.sqrt(var)
        upper, lower = mid + 2 * std, mid - 2 * std
        # نطاق بعرض صفر (20 إغلاقاً متطابقة) لا موقع فيه: كان `or 1e-9` يصنع حدّين حول السعر نفسه
        if std == 0:
            pass
        elif last >= upper:
            add("bb", "bb", -0.55, "bb_upper")
        elif last <= lower:
            add("bb", "bb", 0.55, "bb_lower")
        else:
            pos = (last - lower) / (upper - lower)
            add("bb", "bb", (0.5 - pos) * 0.6, "bb_position", pos=round(pos * 100))

    # Stochastic approx from last 14 highs/lows if available
    if len(candles) >= 15:
        recent = candles[-14:]
        hi = max(float(c["high"]) for c in recent)
        lo = min(float(c["low"]) for c in recent)
        # مدى صفري (14 شمعة بلا حركة) ⇒ لا %K: كان `or 1e-9` يعطي %K=0 ⇒ «تشبّع بيعي» وصوت شراء +0.6 من لا حركة
        if hi > lo:
            k = (last - lo) / (hi - lo) * 100
            if k >= 80:
                score = -0.6
            elif k <= 20:
                score = 0.6
            else:
                score = (50 - k) / 80
            add("stoch", "stoch", score, "stoch_k", k=round(k))

    # Multi-bar trend
    # «آخر 10 شموع» = من إغلاق ما قبلها إلى الأخير (10 حركات) — كان `closes[-10]` أي 9 حركات فقط
    if len(closes) >= 11:
        slope = (closes[-1] - closes[-11]) / (abs(closes[-11]) or 1)
        add("trend", "trend", max(-1.0, min(1.0, slope * 40)), "trend_slope", pct=round(slope * 100, 2))

    if not votes:
        # لا صوت واحد ⇒ لا اتجاه ولا درجة (كان «محايد» و0.0 — ادّعاء بأن المؤشّرات لا ترى اتجاهاً)
        return {
            "symbol": sym,
            "mode": "indicators",
            "direction": None,
            "avg_score": None,
            "levels": None,
            "levels_basis": _trade_levels(last, "neutral", candles)[1],
            "votes": [],
            "snapshot": snap,
            "price_decimals": dp,
            "disclaimer": _NO_DATA[tl],
            "disclaimer_code": "not_enough_data",
        }

    avg = sum(v["score"] for v in votes) / len(votes)
    direction = _direction(avg)
    levels, levels_basis = _trade_levels(last, direction, candles)

    return {
        "symbol": sym,
        "mode": "indicators",
        "avg_score": round(avg, 3),
        "direction": direction,
        "levels": levels,
        "levels_basis": levels_basis,
        "votes": votes,
        "snapshot": {
            "rsi": snap.get("rsi"),
            "change_pct": snap.get("change_pct"),
            # عدد الشموع التي تغطّيها النسبة (~179 = شهور على D): كانت تُرسَل وحدها فتُقرأ «تغيّر اليوم»
            "change_bars": snap.get("change_bars"),
            "last": last,
        },
        "price_decimals": dp,
        "disclaimer": _DISCLAIMER[tl],
        "disclaimer_code": "indicator_consensus",
    }
