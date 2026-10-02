"""
Smart Money Concepts (SMC) & Liquidity Sweep Engine
Implements:
1. Fair Value Gaps (FVG) Detection & Mitigation Tracking
2. Order Blocks (OB) Detection with Displacement & Volume Validation
3. Market Structure Analysis: Break of Structure (BOS) & Change of Character (CHoCH)
4. Liquidity Pools & Liquidity Sweeps (BSL/SSL Sweeps, Turtle Soup / Hunt)
"""

from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
import math


@dataclass
class FairValueGap:
    index: int
    gap_type: str         # 'BULLISH_FVG' | 'BEARISH_FVG'
    top_price: float
    bottom_price: float
    gap_size: float
    timestamp: str
    is_mitigated: bool
    mitigated_price: Optional[float] = None


@dataclass
class OrderBlock:
    index: int
    block_type: str        # 'BULLISH_OB' | 'BEARISH_OB'
    top_price: float
    bottom_price: float
    open_price: float
    close_price: float
    volume: float
    timestamp: str
    strength: float        # 0.0 - 100.0 score based on subsequent displacement
    is_mitigated: bool


@dataclass
class StructureBreak:
    index: int
    break_type: str        # 'BOS' | 'CHOCH'
    direction: str         # 'BULLISH' | 'BEARISH'
    break_price: float
    broken_pivot_index: int
    timestamp: str


@dataclass
class LiquiditySweep:
    index: int
    sweep_type: str        # 'BSL_SWEEP' (Buy-side) | 'SSL_SWEEP' (Sell-side)
    direction: str         # 'BEARISH_REVERSAL' (swept high and closed below) | 'BULLISH_REVERSAL' (swept low and closed above)
    swept_level: float
    wick_extreme: float
    close_price: float
    timestamp: str
    target_price: float    # Opposite liquidity pool target


@dataclass
class SMCAnalysisResult:
    symbol: str
    timeframe: str
    current_price: float
    market_bias: str       # 'STRONG_BULLISH' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'STRONG_BEARISH'
    fvgs: List[FairValueGap]
    active_fvgs: List[FairValueGap]
    order_blocks: List[OrderBlock]
    active_order_blocks: List[OrderBlock]
    structure_breaks: List[StructureBreak]
    liquidity_sweeps: List[LiquiditySweep]
    premium_discount: Dict[str, float]  # {'equilibrium': ..., 'premium_zone': ..., 'discount_zone': ...}
    analyzed_at: str


def detect_fvgs(candles: List[Dict[str, Any]]) -> List[FairValueGap]:
    """
    Identifies Fair Value Gaps across 3-candle sequences:
    Bullish FVG: Candle 0 High < Candle 2 Low (Unfilled upward price imbalance)
    Bearish FVG: Candle 0 Low > Candle 2 High (Unfilled downward price imbalance)
    """
    if len(candles) < 3:
        return []

    fvgs: List[FairValueGap] = []
    n = len(candles)

    for i in range(n - 2):
        c0 = candles[i]
        c1 = candles[i + 1]
        c2 = candles[i + 2]

        c0_high = float(c0["high"])
        c0_low = float(c0["low"])
        c2_high = float(c2["high"])
        c2_low = float(c2["low"])

        # Bullish FVG
        if c2_low > c0_high:
            top_p = round(c2_low, 5)
            bot_p = round(c0_high, 5)
            gap_size = round(top_p - bot_p, 5)

            # Check if subsequent candles mitigated the gap
            is_mitigated = False
            mitigated_p = None
            for j in range(i + 3, n):
                fut_low = float(candles[j]["low"])
                if fut_low <= top_p:
                    is_mitigated = True
                    mitigated_p = fut_low
                    break

            fvgs.append(FairValueGap(
                index=i + 1,
                gap_type="BULLISH_FVG",
                top_price=top_p,
                bottom_price=bot_p,
                gap_size=gap_size,
                timestamp=str(c1.get("timestamp") or c1.get("time", "")),
                is_mitigated=is_mitigated,
                mitigated_price=mitigated_p
            ))

        # Bearish FVG
        elif c2_high < c0_low:
            top_p = round(c0_low, 5)
            bot_p = round(c2_high, 5)
            gap_size = round(top_p - bot_p, 5)

            # Check mitigation
            is_mitigated = False
            mitigated_p = None
            for j in range(i + 3, n):
                fut_high = float(candles[j]["high"])
                if fut_high >= bot_p:
                    is_mitigated = True
                    mitigated_p = fut_high
                    break

            fvgs.append(FairValueGap(
                index=i + 1,
                gap_type="BEARISH_FVG",
                top_price=top_p,
                bottom_price=bot_p,
                gap_size=gap_size,
                timestamp=str(c1.get("timestamp") or c1.get("time", "")),
                is_mitigated=is_mitigated,
                mitigated_price=mitigated_p
            ))

    return fvgs


def detect_order_blocks(candles: List[Dict[str, Any]], min_displacement_pct: float = 0.0015) -> List[OrderBlock]:
    """
    Identifies institutional Order Blocks:
    Bullish OB: The last bearish candle before an aggressive expansion upward that moves >= min_displacement_pct.
    Bearish OB: The last bullish candle before an aggressive expansion downward that moves >= min_displacement_pct.
    """
    if len(candles) < 4:
        return []

    order_blocks: List[OrderBlock] = []
    n = len(candles)

    for i in range(1, n - 2):
        c = candles[i]
        c_open = float(c["open"])
        c_close = float(c["close"])
        c_high = float(c["high"])
        c_low = float(c["low"])
        c_vol = float(c.get("volume", 1000.0))

        # Check subsequent 2 candles for displacement
        next1 = candles[i + 1]
        next2 = candles[i + 2]

        disp_up = float(next2["high"]) - c_high
        disp_down = c_low - float(next2["low"])

        # Bullish OB (Bearish candle followed by strong upward burst)
        if c_close < c_open and disp_up > (c_open * min_displacement_pct):
            # Check if mitigated later
            is_mit = False
            for j in range(i + 3, n):
                if float(candles[j]["low"]) <= c_high:
                    is_mit = True
                    break

            strength = min(100.0, max(50.0, (disp_up / (c_open * min_displacement_pct)) * 60.0))
            order_blocks.append(OrderBlock(
                index=i,
                block_type="BULLISH_OB",
                top_price=round(c_high, 5),
                bottom_price=round(c_low, 5),
                open_price=round(c_open, 5),
                close_price=round(c_close, 5),
                volume=c_vol,
                timestamp=str(c.get("timestamp") or c.get("time", "")),
                strength=round(strength, 1),
                is_mitigated=is_mit
            ))

        # Bearish OB (Bullish candle followed by strong downward drop)
        elif c_close > c_open and disp_down > (c_open * min_displacement_pct):
            is_mit = False
            for j in range(i + 3, n):
                if float(candles[j]["high"]) >= c_low:
                    is_mit = True
                    break

            strength = min(100.0, max(50.0, (disp_down / (c_open * min_displacement_pct)) * 60.0))
            order_blocks.append(OrderBlock(
                index=i,
                block_type="BEARISH_OB",
                top_price=round(c_high, 5),
                bottom_price=round(c_low, 5),
                open_price=round(c_open, 5),
                close_price=round(c_close, 5),
                volume=c_vol,
                timestamp=str(c.get("timestamp") or c.get("time", "")),
                strength=round(strength, 1),
                is_mitigated=is_mit
            ))

    return order_blocks


def detect_structure_and_breaks(candles: List[Dict[str, Any]], order: int = 3) -> List[StructureBreak]:
    """
    Tracks swing highs and lows, detecting Break of Structure (BOS) and Change of Character (CHoCH).
    """
    if len(candles) < (order * 2 + 3):
        return []

    n = len(candles)
    swing_highs = []
    swing_lows = []

    for i in range(order, n - order):
        h = float(candles[i]["high"])
        l = float(candles[i]["low"])

        is_h = all(h > float(candles[j]["high"]) for j in range(i - order, i + order + 1) if j != i)
        is_l = all(l < float(candles[j]["low"]) for j in range(i - order, i + order + 1) if j != i)

        if is_h:
            swing_highs.append((i, h, str(candles[i].get("timestamp") or "")))
        if is_l:
            swing_lows.append((i, l, str(candles[i].get("timestamp") or "")))

    breaks: List[StructureBreak] = []
    current_trend = "NEUTRAL"

    for i in range(order * 2, n):
        c_close = float(candles[i]["close"])
        t = str(candles[i].get("timestamp") or "")

        # Check break of recent swing highs
        prior_highs = [sh for sh in swing_highs if sh[0] < i]
        if prior_highs:
            last_sh = prior_highs[-1]
            if c_close > last_sh[1]:
                # If was downtrend/neutral -> CHoCH, if already uptrend -> BOS
                b_type = "CHOCH" if current_trend in ["BEARISH", "NEUTRAL"] else "BOS"
                current_trend = "BULLISH"
                breaks.append(StructureBreak(
                    index=i,
                    break_type=b_type,
                    direction="BULLISH",
                    break_price=round(c_close, 5),
                    broken_pivot_index=last_sh[0],
                    timestamp=t
                ))

        # Check break of recent swing lows
        prior_lows = [sl for sl in swing_lows if sl[0] < i]
        if prior_lows:
            last_sl = prior_lows[-1]
            if c_close < last_sl[1]:
                b_type = "CHOCH" if current_trend in ["BULLISH", "NEUTRAL"] else "BOS"
                current_trend = "BEARISH"
                breaks.append(StructureBreak(
                    index=i,
                    break_type=b_type,
                    direction="BEARISH",
                    break_price=round(c_close, 5),
                    broken_pivot_index=last_sl[0],
                    timestamp=t
                ))

    # Return unique events per candle
    return breaks[-15:]


def detect_liquidity_sweeps(candles: List[Dict[str, Any]], lookback: int = 20) -> List[LiquiditySweep]:
    """
    Detects Liquidity Hunts / Sweeps:
    - BSL Sweep: High wicks above previous swing high, but candle closes back BELOW it (Bull Trap).
    - SSL Sweep: Low wicks below previous swing low, but candle closes back ABOVE it (Bear Trap).
    """
    if len(candles) < lookback + 2:
        return []

    sweeps: List[LiquiditySweep] = []
    n = len(candles)

    for i in range(lookback, n):
        c = candles[i]
        c_high = float(c["high"])
        c_low = float(c["low"])
        c_close = float(c["close"])
        t = str(c.get("timestamp") or "")

        # Prior lookback window extrema
        window_high = max(float(candles[j]["high"]) for j in range(i - lookback, i))
        window_low = min(float(candles[j]["low"]) for j in range(i - lookback, i))

        # BSL Sweep (Buy-Side Liquidity Grab above resistance then close back down)
        if c_high > window_high and c_close < window_high:
            sweeps.append(LiquiditySweep(
                index=i,
                sweep_type="BSL_SWEEP",
                direction="BEARISH_REVERSAL",
                swept_level=round(window_high, 5),
                wick_extreme=round(c_high, 5),
                close_price=round(c_close, 5),
                timestamp=t,
                target_price=round(window_low, 5)
            ))

        # SSL Sweep (Sell-Side Liquidity Grab below support then close back up)
        elif c_low < window_low and c_close > window_low:
            sweeps.append(LiquiditySweep(
                index=i,
                sweep_type="SSL_SWEEP",
                direction="BULLISH_REVERSAL",
                swept_level=round(window_low, 5),
                wick_extreme=round(c_low, 5),
                close_price=round(c_close, 5),
                timestamp=t,
                target_price=round(window_high, 5)
            ))

    return sweeps[-10:]


def calculate_premium_discount(candles: List[Dict[str, Any]], lookback: int = 50) -> Dict[str, float]:
    """Calculates Institutional Premium & Discount zones based on recent dealing range."""
    recent = candles[-lookback:] if len(candles) >= lookback else candles
    highs = [float(c["high"]) for c in recent]
    lows = [float(c["low"]) for c in recent]

    highest = max(highs) if highs else 1.0
    lowest = min(lows) if lows else 1.0
    range_span = highest - lowest
    eq = lowest + (range_span * 0.5)

    return {
        "range_high": round(highest, 5),
        "range_low": round(lowest, 5),
        "equilibrium": round(eq, 5),
        "premium_zone_start": round(lowest + (range_span * 0.618), 5),
        "discount_zone_end": round(lowest + (range_span * 0.382), 5)
    }


def analyze_smc(symbol: str, timeframe: str, candles: List[Dict[str, Any]]) -> SMCAnalysisResult:
    """Comprehensive SMC Analysis Orchestrator."""
    if not candles:
        now_str = datetime.now(timezone.utc).isoformat()
        return SMCAnalysisResult(
            symbol=symbol,
            timeframe=timeframe,
            current_price=1.0850,
            market_bias="NEUTRAL",
            fvgs=[],
            active_fvgs=[],
            order_blocks=[],
            active_order_blocks=[],
            structure_breaks=[],
            liquidity_sweeps=[],
            premium_discount={"range_high": 1.09, "range_low": 1.08, "equilibrium": 1.085},
            analyzed_at=now_str
        )

    current_price = float(candles[-1]["close"])
    fvgs = detect_fvgs(candles)
    active_fvgs = [f for f in fvgs if not f.is_mitigated]

    obs = detect_order_blocks(candles)
    active_obs = [ob for ob in obs if not ob.is_mitigated]

    struct_breaks = detect_structure_and_breaks(candles)
    sweeps = detect_liquidity_sweeps(candles)
    prem_disc = calculate_premium_discount(candles)

    # Determine institutional bias
    bullish_signals = sum([
        1 for f in active_fvgs if f.gap_type == "BULLISH_FVG"
    ]) + sum([
        1 for ob in active_obs if ob.block_type == "BULLISH_OB"
    ]) + sum([
        1 for b in struct_breaks if b.direction == "BULLISH"
    ]) + sum([
        1 for s in sweeps if s.direction == "BULLISH_REVERSAL"
    ])

    bearish_signals = sum([
        1 for f in active_fvgs if f.gap_type == "BEARISH_FVG"
    ]) + sum([
        1 for ob in active_obs if ob.block_type == "BEARISH_OB"
    ]) + sum([
        1 for b in struct_breaks if b.direction == "BEARISH"
    ]) + sum([
        1 for s in sweeps if s.direction == "BEARISH_REVERSAL"
    ])

    diff = bullish_signals - bearish_signals
    if diff >= 3:
        bias = "STRONG_BULLISH"
    elif diff >= 1:
        bias = "BULLISH"
    elif diff <= -3:
        bias = "STRONG_BEARISH"
    elif diff <= -1:
        bias = "BEARISH"
    else:
        bias = "NEUTRAL"

    return SMCAnalysisResult(
        symbol=symbol.upper(),
        timeframe=timeframe,
        current_price=round(current_price, 5),
        market_bias=bias,
        fvgs=fvgs[-20:],
        active_fvgs=active_fvgs[-10:],
        order_blocks=obs[-15:],
        active_order_blocks=active_obs[-8:],
        structure_breaks=struct_breaks,
        liquidity_sweeps=sweeps,
        premium_discount=prem_disc,
        analyzed_at=datetime.now(timezone.utc).isoformat()
    )
