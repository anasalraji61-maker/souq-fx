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
    return {
        "entry": round(last, 5),
        "sl": round(last - sgn * SL_ATR_MULT * atr_v, 5),
        "tp": round(last + sgn * TP_ATR_MULT * atr_v, 5),
    }, basis


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


def indicator_forecast(
    symbol: str,
    candles: list[dict[str, Any]],
    enabled: list[str] | None = None,
) -> dict[str, Any]:
    sym = symbol.upper()
    snap = ind_engine.snapshot(candles) if candles else {}
    closes = [float(c["close"]) for c in candles] if candles else []
    last = float(snap.get("last") or closes[-1]) if closes else None

    want = set(enabled or FORECAST_INDICATOR_IDS)
    votes: list[dict[str, Any]] = []

    def add(key: str, label: str, score: float, detail: str) -> None:
        if key not in want:
            return
        score = max(-1.0, min(1.0, score))
        votes.append(
            {
                "id": key,
                "name": label,
                "direction": _direction(score),
                "score": round(score, 3),
                "detail": detail,
            }
        )

    rsi_v = snap.get("rsi")
    if rsi_v is not None:
        if rsi_v >= 70:
            add("rsi", "RSI 14", -0.7, f"تشبع شراء ({rsi_v:.1f})")
        elif rsi_v <= 30:
            add("rsi", "RSI 14", 0.7, f"تشبع بيع ({rsi_v:.1f})")
        elif rsi_v >= 55:
            add("rsi", "RSI 14", 0.25, f"زخم إيجابي ({rsi_v:.1f})")
        elif rsi_v <= 45:
            add("rsi", "RSI 14", -0.25, f"زخم سلبي ({rsi_v:.1f})")
        else:
            add("rsi", "RSI 14", 0.0, f"محايد ({rsi_v:.1f})")

    if snap.get("ma_cross_up"):
        add("ma", "تقاطع MA", 0.8, "تقاطع صاعد SMA سريع/بطيء")
    elif snap.get("ma_cross_down"):
        add("ma", "تقاطع MA", -0.8, "تقاطع هابط SMA سريع/بطيء")
    else:
        sf, ss = snap.get("sma_fast"), snap.get("sma_slow")
        if sf is not None and ss is not None:
            add(
                "ma",
                "اتجاه MA",
                0.45 if sf > ss else -0.45,
                f"سريع {sf:.5f} vs بطيء {ss:.5f}",
            )

    if snap.get("macd_cross_up"):
        add("macd", "MACD", 0.75, "تقاطع صاعد مع الإشارة")
    elif snap.get("macd_cross_down"):
        add("macd", "MACD", -0.75, "تقاطع هابط مع الإشارة")
    else:
        m, ms = snap.get("macd"), snap.get("macd_signal")
        if m is not None and ms is not None:
            add("macd", "MACD", 0.35 if m > ms else -0.35, f"خط {m:.5f} / إشارة {ms:.5f}")

    # Bollinger-ish from recent std
    if len(closes) >= 20:
        window = closes[-20:]
        mid = sum(window) / 20
        var = sum((x - mid) ** 2 for x in window) / 20
        std = math.sqrt(var) or 1e-9
        upper, lower = mid + 2 * std, mid - 2 * std
        if last >= upper:
            add("bb", "بولنجر", -0.55, "قرب الحد العلوي")
        elif last <= lower:
            add("bb", "بولنجر", 0.55, "قرب الحد السفلي")
        else:
            pos = (last - lower) / (upper - lower)
            add("bb", "بولنجر", (0.5 - pos) * 0.6, f"موقع النطاق {pos:.0%}")

    # Stochastic approx from last 14 highs/lows if available
    if len(candles) >= 15:
        recent = candles[-14:]
        hi = max(float(c["high"]) for c in recent)
        lo = min(float(c["low"]) for c in recent)
        den = (hi - lo) or 1e-9
        k = (last - lo) / den * 100
        if k >= 80:
            add("stoch", "Stochastic", -0.6, f"%K≈{k:.0f}")
        elif k <= 20:
            add("stoch", "Stochastic", 0.6, f"%K≈{k:.0f}")
        else:
            add("stoch", "Stochastic", (50 - k) / 80, f"%K≈{k:.0f}")

    # Multi-bar trend
    if len(closes) >= 10:
        slope = (closes[-1] - closes[-10]) / (abs(closes[-10]) or 1)
        add("trend", "ميل السعر", max(-1.0, min(1.0, slope * 40)), f"10 شموع · {slope * 100:.2f}%")

    if not votes:
        return {
            "symbol": sym,
            "mode": "indicators",
            "direction": "neutral",
            "avg_score": 0.0,
            "levels": None,
            "levels_basis": _trade_levels(last, "neutral", candles)[1],
            "votes": [],
            "snapshot": snap,
            "disclaimer": "لا بيانات كافية للمؤشرات.",
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
            "last": last,
        },
        "disclaimer": "إجماع مؤشرات فنية داخل MATRIX — ليس ضماناً للربح.",
    }
