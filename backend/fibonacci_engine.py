"""
Auto-Fibonacci Retracement & Extension Zones Engine
Features:
1. Automatic Major Swing High / Major Swing Low Extrema Identification
2. Standard Retracement Levels: 0.0, 0.236, 0.382, 0.500, 0.618, 0.650 (Golden Pocket), 0.786, 0.886, 1.000
3. Standard Extension Levels: 1.272, 1.414, 1.618, 2.000, 2.618
4. Golden Pocket (0.618 - 0.650) Confluence Highlighting
5. Nearest Level Proximity & Reversal Reaction Detection
"""

from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
import math

FIB_RETRACEMENT_RATIOS = [0.0, 0.236, 0.382, 0.500, 0.618, 0.650, 0.786, 0.886, 1.000]
FIB_EXTENSION_RATIOS = [1.272, 1.414, 1.618, 2.000, 2.618]


@dataclass
class FibLevel:
    ratio: float
    level_type: str       # 'RETRACEMENT' | 'EXTENSION' | 'GOLDEN_POCKET'
    price: float
    label: str            # '0.618 (Golden Pocket)', '0.500 (Equilibrium)', etc.
    is_golden_pocket: bool
    distance_pct: float   # Distance of current price to this level in %


@dataclass
class FibonacciResult:
    symbol: str
    timeframe: str
    trend: str            # 'UPTREND' | 'DOWNTREND'
    current_price: float
    swing_low: float
    swing_high: float
    golden_pocket_min: float
    golden_pocket_max: float
    is_in_golden_pocket: bool
    nearest_level: FibLevel
    retracement_levels: List[FibLevel]
    extension_levels: List[FibLevel]
    reaction_signal: Optional[str]  # 'BOUNCE_EXPECTED' | 'BREAKOUT' | 'NEUTRAL'
    analyzed_at: str


def find_major_swings(candles: List[Dict[str, Any]], lookback: int = 60) -> Tuple[float, float, str]:
    """
    Finds the major swing low and high in the specified lookback window,
    and determines the prevailing swing trend direction.
    """
    if not candles:
        return 1.0, 1.0, "UPTREND"

    recent = candles[-lookback:] if len(candles) >= lookback else candles
    highs = [(i, float(c["high"])) for i, c in enumerate(recent)]
    lows = [(i, float(c["low"])) for i, c in enumerate(recent)]

    max_high_tuple = max(highs, key=lambda x: x[1])
    min_low_tuple = min(lows, key=lambda x: x[1])

    swing_high = round(max_high_tuple[1], 5)
    swing_low = round(min_low_tuple[1], 5)

    # If the low came before the high -> Uptrend (Low to High), retracement is downward
    # If the high came before the low -> Downtrend (High to Low), retracement is upward
    if min_low_tuple[0] < max_high_tuple[0]:
        trend = "UPTREND"
    else:
        trend = "DOWNTREND"

    return swing_low, swing_high, trend


def calculate_fib_levels(
    swing_low: float,
    swing_high: float,
    trend: str,
    current_price: float
) -> Tuple[List[FibLevel], List[FibLevel], FibLevel, float, float]:
    """
    Calculates Fibonacci Retracements & Extensions based on trend direction.
    Uptrend: 0.0 is High, 1.0 is Low. Retracements retrace downward from High.
    Downtrend: 0.0 is Low, 1.0 is High. Retracements retrace upward from Low.
    """
    span = swing_high - swing_low
    if span <= 0:
        span = 0.0001

    retrace_levels: List[FibLevel] = []
    extension_levels: List[FibLevel] = []

    # Calculate Retracements
    for r in FIB_RETRACEMENT_RATIOS:
        if trend == "UPTREND":
            price = swing_high - (span * r)
        else:
            price = swing_low + (span * r)

        is_gp = (abs(r - 0.618) < 0.001 or abs(r - 0.650) < 0.001)
        dist = abs(current_price - price) / (current_price or 1.0) * 100.0

        label = f"{r:.3f}"
        if abs(r - 0.618) < 0.001:
            label += " (Golden Pocket)"
        elif abs(r - 0.500) < 0.001:
            label += " (Halfway / EQ)"

        retrace_levels.append(FibLevel(
            ratio=r,
            level_type="GOLDEN_POCKET" if is_gp else "RETRACEMENT",
            price=round(price, 5),
            label=label,
            is_golden_pocket=is_gp,
            distance_pct=round(dist, 3)
        ))

    # Calculate Extensions
    for ext in FIB_EXTENSION_RATIOS:
        if trend == "UPTREND":
            price = swing_high + (span * (ext - 1.0))
        else:
            price = swing_low - (span * (ext - 1.0))

        dist = abs(current_price - price) / (current_price or 1.0) * 100.0
        extension_levels.append(FibLevel(
            ratio=ext,
            level_type="EXTENSION",
            price=round(price, 5),
            label=f"Ext {ext:.3f}",
            is_golden_pocket=False,
            distance_pct=round(dist, 3)
        ))

    # Golden Pocket boundary prices
    gp_prices = [l.price for l in retrace_levels if l.is_golden_pocket]
    gp_min = min(gp_prices) if gp_prices else swing_low
    gp_max = max(gp_prices) if gp_prices else swing_high

    # Find nearest level overall
    all_levels = retrace_levels + extension_levels
    nearest = min(all_levels, key=lambda l: l.distance_pct)

    return retrace_levels, extension_levels, nearest, round(gp_min, 5), round(gp_max, 5)


def analyze_fibonacci(
    symbol: str,
    timeframe: str,
    candles: List[Dict[str, Any]],
    lookback: int = 60
) -> FibonacciResult:
    """Comprehensive Auto-Fibonacci Analyzer."""
    if not candles:
        now_str = datetime.now(timezone.utc).isoformat()
        dummy_level = FibLevel(0.618, "GOLDEN_POCKET", 1.0850, "0.618 (Golden Pocket)", True, 0.0)
        return FibonacciResult(
            symbol=symbol,
            timeframe=timeframe,
            trend="UPTREND",
            current_price=1.0850,
            swing_low=1.0800,
            swing_high=1.0900,
            golden_pocket_min=1.0835,
            golden_pocket_max=1.0838,
            is_in_golden_pocket=False,
            nearest_level=dummy_level,
            retracement_levels=[dummy_level],
            extension_levels=[],
            reaction_signal="NEUTRAL",
            analyzed_at=now_str
        )

    current_price = float(candles[-1]["close"])
    swing_low, swing_high, trend = find_major_swings(candles, lookback=lookback)
    retracements, extensions, nearest, gp_min, gp_max = calculate_fib_levels(
        swing_low, swing_high, trend, current_price
    )

    is_in_gp = (gp_min <= current_price <= gp_max)

    # Determine potential reaction
    if is_in_gp:
        reaction = "BOUNCE_EXPECTED" if trend == "UPTREND" else "REJECTION_EXPECTED"
    elif nearest.distance_pct < 0.15:
        reaction = "KEY_LEVEL_TEST"
    else:
        reaction = "NEUTRAL"

    return FibonacciResult(
        symbol=symbol.upper(),
        timeframe=timeframe,
        trend=trend,
        current_price=round(current_price, 5),
        swing_low=swing_low,
        swing_high=swing_high,
        golden_pocket_min=gp_min,
        golden_pocket_max=gp_max,
        is_in_golden_pocket=is_in_gp,
        nearest_level=nearest,
        retracement_levels=retracements,
        extension_levels=extensions,
        reaction_signal=reaction,
        analyzed_at=datetime.now(timezone.utc).isoformat()
    )
