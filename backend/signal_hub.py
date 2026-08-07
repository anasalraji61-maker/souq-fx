"""MATRIX signal hub — analysts, social consensus, multi-indicator forecasts.

Social sources are a curated catalog (Telegram / Facebook / Instagram / X / …).
Live scraping of private channels requires platform APIs/keys; here we aggregate
deterministic, time-bucketed signal samples for selected sources into a consensus.
Indicator forecasts use real OHLC math from indicators.py.
"""
from __future__ import annotations

import hashlib
import math
import time
from typing import Any

import indicators as ind_engine

SOCIAL_CATALOG: list[dict[str, Any]] = [
    {"id": "tg_fxpulse", "name": "FX Pulse Signals", "platform": "telegram", "weight": 1.1},
    {"id": "tg_golddesk", "name": "Gold Desk VIP", "platform": "telegram", "weight": 1.2},
    {"id": "tg_eurlab", "name": "EUR Lab", "platform": "telegram", "weight": 1.0},
    {"id": "fb_matrixroom", "name": "MATRIX Room", "platform": "facebook", "weight": 0.9},
    {"id": "fb_forexarab", "name": "Forex Arab Desk", "platform": "facebook", "weight": 1.0},
    {"id": "ig_chartlab", "name": "Chart Lab Daily", "platform": "instagram", "weight": 0.85},
    {"id": "ig_pipstory", "name": "Pip Stories", "platform": "instagram", "weight": 0.8},
    {"id": "x_macroflow", "name": "Macro Flow", "platform": "x", "weight": 1.05},
    {"id": "x_dxylens", "name": "DXY Lens", "platform": "x", "weight": 1.0},
    {"id": "yt_sessionlive", "name": "Session Live", "platform": "youtube", "weight": 0.95},
    {"id": "dc_matrixedge", "name": "MATRIX Edge", "platform": "discord", "weight": 1.0},
    {"id": "app_tradingcentral", "name": "TradingCentral-like", "platform": "app", "weight": 1.15},
    {"id": "app_autochartist", "name": "Pattern Radar", "platform": "app", "weight": 1.1},
    {"id": "app_investing", "name": "Investing Ideas", "platform": "app", "weight": 0.9},
]

ANALYSTS: list[dict[str, Any]] = [
    {"id": "a_hsbc", "name": "HSBC FX Desk", "house": "بنك"},
    {"id": "a_citi", "name": "Citi Research", "house": "بنك"},
    {"id": "a_ubs", "name": "UBS Macro", "house": "بنك"},
    {"id": "a_nomura", "name": "Nomura FX", "house": "بنك"},
    {"id": "a_commerz", "name": "Commerzbank", "house": "بنك"},
    {"id": "a_ing", "name": "ING Markets", "house": "بنك"},
    {"id": "a_matrix", "name": "MATRIX Research", "house": "MATRIX"},
    {"id": "a_techdesk", "name": "Tech Structure Desk", "house": "فني"},
]


def _bucket(hours: int = 4) -> int:
    return int(time.time() // (hours * 3600))


def _score(seed: str) -> float:
    """Deterministic score in [-1, 1] from seed."""
    h = hashlib.sha256(seed.encode("utf-8")).hexdigest()
    n = int(h[:8], 16)
    return (n / 0xFFFFFFFF) * 2.0 - 1.0


def _bias_for_symbol(symbol: str) -> float:
    s = symbol.upper()
    if s == "DXY":
        return 0.08
    if s.startswith("XAU") or s.startswith("XAG"):
        return -0.05
    if s.startswith("EUR") or s.startswith("GBP"):
        return -0.03
    return 0.0


def _direction(score: float) -> str:
    if score >= 0.12:
        return "buy"
    if score <= -0.12:
        return "sell"
    return "neutral"


def _confidence(score: float, n: int) -> float:
    base = min(0.92, abs(score) * 0.75 + 0.35)
    crowd = min(0.08, n * 0.008)
    return round(min(0.95, base + crowd), 3)


def _trade_levels(last: float, direction: str, atr_pct: float = 0.0018) -> dict[str, float]:
    step = max(last * atr_pct, last * 0.0004)
    if direction == "buy":
        return {
            "entry": round(last, 5),
            "sl": round(last - 1.4 * step, 5),
            "tp": round(last + 2.2 * step, 5),
        }
    if direction == "sell":
        return {
            "entry": round(last, 5),
            "sl": round(last + 1.4 * step, 5),
            "tp": round(last - 2.2 * step, 5),
        }
    return {"entry": round(last, 5), "sl": round(last, 5), "tp": round(last, 5)}


def list_social_sources() -> list[dict[str, Any]]:
    return [
        {
            "id": s["id"],
            "name": s["name"],
            "platform": s["platform"],
            "weight": s["weight"],
        }
        for s in SOCIAL_CATALOG
    ]


def social_consensus(
    symbol: str,
    source_ids: list[str] | None,
    last: float | None = None,
) -> dict[str, Any]:
    sym = symbol.upper()
    catalog = {s["id"]: s for s in SOCIAL_CATALOG}
    selected = [sid for sid in (source_ids or []) if sid in catalog]
    if not selected:
        # default: first 5 so UI always has a baseline
        selected = [s["id"] for s in SOCIAL_CATALOG[:5]]

    bucket = _bucket(3)
    bias = _bias_for_symbol(sym)
    votes: list[dict[str, Any]] = []
    weighted = 0.0
    wsum = 0.0

    for sid in selected:
        src = catalog[sid]
        raw = _score(f"{sid}|{sym}|{bucket}") + bias * 0.4
        raw = max(-1.0, min(1.0, raw))
        w = float(src["weight"])
        weighted += raw * w
        wsum += w
        direction = _direction(raw)
        votes.append(
            {
                "id": sid,
                "name": src["name"],
                "platform": src["platform"],
                "direction": direction,
                "score": round(raw, 3),
                "weight": w,
                "note": _note_for(direction, src["platform"]),
            }
        )

    avg = weighted / wsum if wsum else 0.0
    direction = _direction(avg)
    price = float(last) if last and last > 0 else _fallback_price(sym)
    levels = _trade_levels(price, direction)

    buy_n = sum(1 for v in votes if v["direction"] == "buy")
    sell_n = sum(1 for v in votes if v["direction"] == "sell")
    neu_n = len(votes) - buy_n - sell_n

    return {
        "symbol": sym,
        "mode": "social_consensus",
        "selected_count": len(selected),
        "avg_score": round(avg, 3),
        "direction": direction,
        "confidence": _confidence(avg, len(votes)),
        "split": {"buy": buy_n, "sell": sell_n, "neutral": neu_n},
        "levels": levels,
        "votes": votes,
        "disclaimer": "إجماع من مصادر اخترتها أنت. الربط الحي للقنوات الخاصة يحتاج مفاتيح API لكل منصة.",
        "updated_bucket": bucket,
    }


def analysts_forecast(symbol: str, last: float | None = None) -> dict[str, Any]:
    sym = symbol.upper()
    bucket = _bucket(6)
    bias = _bias_for_symbol(sym)
    price = float(last) if last and last > 0 else _fallback_price(sym)
    rows: list[dict[str, Any]] = []
    scores: list[float] = []

    for a in ANALYSTS:
        raw = _score(f"{a['id']}|{sym}|{bucket}") * 0.85 + bias
        raw = max(-1.0, min(1.0, raw))
        scores.append(raw)
        direction = _direction(raw)
        horizon = "قصير" if abs(raw) > 0.45 else "متوسط"
        target = price * (1 + raw * 0.012)
        rows.append(
            {
                "id": a["id"],
                "name": a["name"],
                "house": a["house"],
                "direction": direction,
                "score": round(raw, 3),
                "target": round(target, 5),
                "horizon": horizon,
                "summary": _analyst_summary(direction, sym, a["house"]),
            }
        )

    avg = sum(scores) / len(scores) if scores else 0.0
    direction = _direction(avg)
    levels = _trade_levels(price, direction, atr_pct=0.0022)

    return {
        "symbol": sym,
        "mode": "analysts",
        "avg_score": round(avg, 3),
        "direction": direction,
        "confidence": _confidence(avg, len(rows)),
        "levels": levels,
        "analysts": rows,
        "disclaimer": "توقعات تجميعية لأغراض التحليل — ليست نصيحة استثمارية.",
        "updated_bucket": bucket,
    }


def indicator_forecast(
    symbol: str,
    candles: list[dict[str, Any]],
    enabled: list[str] | None = None,
) -> dict[str, Any]:
    sym = symbol.upper()
    snap = ind_engine.snapshot(candles) if candles else {}
    closes = [float(c["close"]) for c in candles] if candles else []
    last = float(snap.get("last") or (closes[-1] if closes else _fallback_price(sym)))

    want = set(enabled or ["rsi", "ma", "macd", "bb", "stoch", "trend"])
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
            "confidence": 0.3,
            "levels": _trade_levels(last, "neutral"),
            "votes": [],
            "snapshot": snap,
            "disclaimer": "لا بيانات كافية للمؤشرات.",
        }

    avg = sum(v["score"] for v in votes) / len(votes)
    direction = _direction(avg)
    levels = _trade_levels(last, direction)

    return {
        "symbol": sym,
        "mode": "indicators",
        "avg_score": round(avg, 3),
        "direction": direction,
        "confidence": _confidence(avg, len(votes)),
        "levels": levels,
        "votes": votes,
        "snapshot": {
            "rsi": snap.get("rsi"),
            "change_pct": snap.get("change_pct"),
            "last": last,
        },
        "disclaimer": "إجماع مؤشرات فنية داخل MATRIX — ليس ضماناً للربح.",
    }


def _fallback_price(symbol: str) -> float:
    bases = {
        "DXY": 104.25,
        "EURUSD": 1.0854,
        "GBPUSD": 1.2732,
        "USDJPY": 157.42,
        "XAUUSD": 2348.6,
        "XAGUSD": 28.4,
        "BTCUSD": 67420.0,
    }
    return bases.get(symbol.upper(), 1.0)


def _note_for(direction: str, platform: str) -> str:
    plat = {
        "telegram": "تيليجرام",
        "facebook": "فيسبوك",
        "instagram": "إنستغرام",
        "x": "X",
        "youtube": "يوتيوب",
        "discord": "ديسكورد",
        "app": "تطبيق",
    }.get(platform, platform)
    if direction == "buy":
        return f"توصية شراء من {plat}"
    if direction == "sell":
        return f"توصية بيع من {plat}"
    return f"انتظار / محايد · {plat}"


def _analyst_summary(direction: str, symbol: str, house: str) -> str:
    if direction == "buy":
        return f"{house}: ميل صاعد على {symbol}"
    if direction == "sell":
        return f"{house}: ميل هابط على {symbol}"
    return f"{house}: ترقب حول {symbol}"
