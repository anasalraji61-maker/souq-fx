"""
Harmonic Pattern Recognition Engine
Implements identification of classical and advanced harmonic patterns:
- Gartley
- Bat
- Butterfly
- Crab
- Deep Crab
- Cypher
- Shark

Features:
- Local Extrema / ZigZag pivot point detection (X, A, B, C, D)
- Strict Fibonacci ratio verification with configurable tolerance (default 5%)
- PRZ (Potential Reversal Zone) calculation
- SL and multi-tier TP (TP1: 0.382, TP2: 0.618, TP3: 1.000)
- Pattern Quality / Confidence scoring (0-100%)
- Bullish and Bearish classifications
"""

import math
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime


@dataclass
class PivotPoint:
    index: int
    price: float
    timestamp: str
    is_high: bool  # True for peak/swing high, False for trough/swing low


@dataclass
class HarmonicPattern:
    symbol: str
    timeframe: str
    pattern_type: str  # Gartley, Bat, Butterfly, Crab, Deep Crab, Cypher, Shark
    direction: str     # BULLISH, BEARISH
    points: Dict[str, Dict[str, Any]]  # {'X': {...}, 'A': {...}, 'B': {...}, 'C': {...}, 'D': {...}}
    ratios: Dict[str, float]           # {'XB': ..., 'AC': ..., 'BD': ..., 'XD': ...}
    ideal_ratios: Dict[str, float]
    prz_min: float
    prz_max: float
    stop_loss: float
    tp1: float
    tp2: float
    tp3: float
    confidence_score: float            # 0.0 - 100.0%
    status: str                        # COMPLETED, FORMING, TARGET_HIT, INVALIDATED
    created_at: str


# Ideal Fibonacci Ratios for Harmonic Patterns
# XB: Retracement of XA
# AC: Retracement/Extension of AB
# BD: Extension of BC
# XD: Retracement/Extension of XA
PATTERN_RULES = {
    "Gartley": {
        "XB": {"target": 0.618, "min": 0.580, "max": 0.660},
        "AC": {"target": 0.618, "min": 0.382, "max": 0.886},
        "BD": {"target": 1.272, "min": 1.128, "max": 1.618},
        "XD": {"target": 0.786, "min": 0.750, "max": 0.820},
    },
    "Bat": {
        "XB": {"target": 0.450, "min": 0.382, "max": 0.520},
        "AC": {"target": 0.618, "min": 0.382, "max": 0.886},
        "BD": {"target": 2.000, "min": 1.618, "max": 2.618},
        "XD": {"target": 0.886, "min": 0.850, "max": 0.920},
    },
    "Butterfly": {
        "XB": {"target": 0.786, "min": 0.750, "max": 0.830},
        "AC": {"target": 0.618, "min": 0.382, "max": 0.886},
        "BD": {"target": 2.000, "min": 1.618, "max": 2.618},
        "XD": {"target": 1.272, "min": 1.220, "max": 1.350},
    },
    "Crab": {
        "XB": {"target": 0.500, "min": 0.382, "max": 0.618},
        "AC": {"target": 0.618, "min": 0.382, "max": 0.886},
        "BD": {"target": 2.618, "min": 2.240, "max": 3.618},
        "XD": {"target": 1.618, "min": 1.550, "max": 1.700},
    },
    "Deep Crab": {
        "XB": {"target": 0.886, "min": 0.850, "max": 0.920},
        "AC": {"target": 0.618, "min": 0.382, "max": 0.886},
        "BD": {"target": 2.618, "min": 2.000, "max": 3.618},
        "XD": {"target": 1.618, "min": 1.550, "max": 1.700},
    },
    "Cypher": {
        "XB": {"target": 0.500, "min": 0.382, "max": 0.618},
        "AC": {"target": 1.272, "min": 1.130, "max": 1.414},
        "BD": {"target": 0.786, "min": 0.700, "max": 0.900},
        "XD": {"target": 0.786, "min": 0.750, "max": 0.820},
    },
    "Shark": {
        "XB": {"target": 1.300, "min": 1.130, "max": 1.618},
        "AC": {"target": 1.800, "min": 1.618, "max": 2.240},
        "BD": {"target": 1.000, "min": 0.886, "max": 1.130},
        "XD": {"target": 0.886, "min": 0.850, "max": 1.130},
    }
}


def find_pivots(candles: List[Dict[str, Any]], order: int = 5) -> List[PivotPoint]:
    """
    Finds swing highs and swing lows using a local extrema window.
    An index i is a swing high if high[i] > high[i±k] for k in 1..order.
    An index i is a swing low if low[i] < low[i±k] for k in 1..order.
    """
    if len(candles) < (order * 2 + 1):
        return []

    pivots: List[PivotPoint] = []
    n = len(candles)

    for i in range(order, n - order):
        current_high = float(candles[i]["high"])
        current_low = float(candles[i]["low"])
        current_time = str(candles[i].get("timestamp") or candles[i].get("time", ""))

        is_high = True
        is_low = True

        for j in range(i - order, i + order + 1):
            if i == j:
                continue
            if float(candles[j]["high"]) >= current_high:
                is_high = False
            if float(candles[j]["low"]) <= current_low:
                is_low = False

        if is_high:
            pivots.append(PivotPoint(index=i, price=current_high, timestamp=current_time, is_high=True))
        elif is_low:
            pivots.append(PivotPoint(index=i, price=current_low, timestamp=current_time, is_high=False))

    # Filter consecutive highs or lows to keep the highest high and lowest low
    filtered: List[PivotPoint] = []
    for p in pivots:
        if not filtered:
            filtered.append(p)
            continue
        last = filtered[-1]
        if last.is_high == p.is_high:
            if p.is_high and p.price > last.price:
                filtered[-1] = p
            elif not p.is_high and p.price < last.price:
                filtered[-1] = p
        else:
            filtered.append(p)

    return filtered


def calculate_ratios(
    x: float, a: float, b: float, c: float, d: float
) -> Dict[str, float]:
    """Calculates Fibonacci retracement/extension ratios for a 5-point leg."""
    xa = abs(a - x)
    ab = abs(b - a)
    bc = abs(c - b)
    cd = abs(d - c)

    if xa == 0 or ab == 0 or bc == 0:
        return {"XB": 0.0, "AC": 0.0, "BD": 0.0, "XD": 0.0}

    xb_ratio = round(ab / xa, 4)
    ac_ratio = round(bc / ab, 4)
    bd_ratio = round(cd / bc, 4)
    xd_ratio = round(abs(d - x) / xa, 4)

    return {
        "XB": xb_ratio,
        "AC": ac_ratio,
        "BD": bd_ratio,
        "XD": xd_ratio
    }


def evaluate_pattern_match(
    ratios: Dict[str, float],
    rules: Dict[str, Dict[str, float]],
    tolerance: float = 0.06
) -> Tuple[bool, float]:
    """
    Evaluates whether observed ratios fit pattern rules within tolerance.
    Returns (is_match, confidence_score_0_to_100).
    """
    total_deviation = 0.0
    num_metrics = 0

    for key, rule in rules.items():
        val = ratios.get(key, 0.0)
        min_val = rule["min"] * (1.0 - tolerance)
        max_val = rule["max"] * (1.0 + tolerance)

        if not (min_val <= val <= max_val):
            return False, 0.0

        target = rule["target"]
        dev = abs(val - target) / target
        total_deviation += dev
        num_metrics += 1

    if num_metrics == 0:
        return False, 0.0

    avg_dev = total_deviation / num_metrics
    # 0 deviation -> 100% confidence, 10% dev -> 80% confidence, etc.
    score = max(50.0, min(100.0, (1.0 - (avg_dev * 1.5)) * 100.0))
    return True, round(score, 1)


def calculate_prz_and_targets(
    direction: str,
    x: float,
    a: float,
    b: float,
    c: float,
    d: float,
    xd_ratio: float,
    pattern_name: str
) -> Dict[str, float]:
    """
    Computes PRZ (Potential Reversal Zone), Stop Loss, and 3 Take-Profit levels.
    Bullish: D is bottom, buys at D, targets are above D towards A/C.
    Bearish: D is top, sells at D, targets are below D towards A/C.
    """
    ad_span = abs(d - a)
    cd_span = abs(d - c)
    reference_span = max(ad_span, cd_span) if max(ad_span, cd_span) > 0 else abs(d * 0.01)

    prz_tolerance = reference_span * 0.04
    prz_min = min(d - prz_tolerance, d)
    prz_max = max(d + prz_tolerance, d)

    if direction == "BULLISH":
        # Stop Loss placed below X (or below D if extension pattern)
        if xd_ratio > 1.0:
            stop_loss = round(d - (reference_span * 0.15), 5)
        else:
            stop_loss = round(min(x, d) - (reference_span * 0.10), 5)

        tp1 = round(d + (reference_span * 0.382), 5)
        tp2 = round(d + (reference_span * 0.618), 5)
        tp3 = round(d + (reference_span * 1.000), 5)
    else:  # BEARISH
        # Stop Loss placed above X (or above D if extension pattern)
        if xd_ratio > 1.0:
            stop_loss = round(d + (reference_span * 0.15), 5)
        else:
            stop_loss = round(max(x, d) + (reference_span * 0.10), 5)

        tp1 = round(d - (reference_span * 0.382), 5)
        tp2 = round(d - (reference_span * 0.618), 5)
        tp3 = round(d - (reference_span * 1.000), 5)

    return {
        "prz_min": round(prz_min, 5),
        "prz_max": round(prz_max, 5),
        "stop_loss": stop_loss,
        "tp1": tp1,
        "tp2": tp2,
        "tp3": tp3
    }


def detect_harmonic_patterns(
    candles: List[Dict[str, Any]],
    symbol: str = "EURUSD",
    timeframe: str = "1h",
    pivot_order: int = 4,
    tolerance: float = 0.07
) -> List[HarmonicPattern]:
    """
    Scans candle data for 5-point harmonic patterns.
    Evaluates all consecutive alternating 5-point pivot sequences (X -> A -> B -> C -> D).
    """
    pivots = find_pivots(candles, order=pivot_order)
    if len(pivots) < 5:
        # Fallback to order=2 if not enough pivots
        pivots = find_pivots(candles, order=2)

    if len(pivots) < 5:
        return []

    patterns: List[HarmonicPattern] = []

    # Slide window of 5 pivots
    for i in range(len(pivots) - 4):
        pX, pA, pB, pC, pD = pivots[i:i+5]

        # Check alternating sequence: High-Low-High-Low-High or Low-High-Low-High-Low
        is_bullish_sequence = (not pX.is_high) and pA.is_high and (not pB.is_high) and pC.is_high and (not pD.is_high)
        is_bearish_sequence = pX.is_high and (not pA.is_high) and pB.is_high and (not pC.is_high) and pD.is_high

        if not (is_bullish_sequence or is_bearish_sequence):
            continue

        direction = "BULLISH" if is_bullish_sequence else "BEARISH"
        ratios = calculate_ratios(pX.price, pA.price, pB.price, pC.price, pD.price)

        # Match against all known patterns
        for p_name, rules in PATTERN_RULES.items():
            matched, confidence = evaluate_pattern_match(ratios, rules, tolerance=tolerance)
            if matched:
                targets = calculate_prz_and_targets(
                    direction=direction,
                    x=pX.price,
                    a=pA.price,
                    b=pB.price,
                    c=pC.price,
                    d=pD.price,
                    xd_ratio=ratios["XD"],
                    pattern_name=p_name
                )

                pattern = HarmonicPattern(
                    symbol=symbol,
                    timeframe=timeframe,
                    pattern_type=p_name,
                    direction=direction,
                    points={
                        "X": {"price": pX.price, "time": pX.timestamp, "index": pX.index},
                        "A": {"price": pA.price, "time": pA.timestamp, "index": pA.index},
                        "B": {"price": pB.price, "time": pB.timestamp, "index": pB.index},
                        "C": {"price": pC.price, "time": pC.timestamp, "index": pC.index},
                        "D": {"price": pD.price, "time": pD.timestamp, "index": pD.index},
                    },
                    ratios=ratios,
                    ideal_ratios={k: v["target"] for k, v in rules.items()},
                    prz_min=targets["prz_min"],
                    prz_max=targets["prz_max"],
                    stop_loss=targets["stop_loss"],
                    tp1=targets["tp1"],
                    tp2=targets["tp2"],
                    tp3=targets["tp3"],
                    confidence_score=confidence,
                    status="COMPLETED",
                    created_at=datetime.utcnow().isoformat()
                )
                patterns.append(pattern)

    # Sort patterns by recency of D point then confidence score
    patterns.sort(key=lambda p: (p.points["D"]["index"], p.confidence_score), reverse=True)
    return patterns
