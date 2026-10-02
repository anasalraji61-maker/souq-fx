"""
Multi-Indicator Divergence Detection Engine
Implements Regular & Hidden Divergence Detection for:
1. RSI (Relative Strength Index)
2. MACD (Moving Average Convergence Divergence) & MACD Histogram
3. Stochastic Oscillator (%K, %D)

Divergence Classifications:
- Regular Bullish: Price Lower Low (LL) vs Indicator Higher Low (HL) -> Strong Bullish Reversal
- Regular Bearish: Price Higher High (HH) vs Indicator Lower High (LH) -> Strong Bearish Reversal
- Hidden Bullish:  Price Higher Low (HL) vs Indicator Lower Low (LL) -> Bullish Continuation
- Hidden Bearish:  Price Lower High (LH) vs Indicator Higher High (HH) -> Bearish Continuation
"""

from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
import math


@dataclass
class IndicatorSwing:
    index: int
    price: float
    osc_value: float
    is_high: bool
    timestamp: str


@dataclass
class DivergenceSignal:
    symbol: str
    timeframe: str
    indicator: str        # 'RSI' | 'MACD' | 'STOCHASTIC'
    divergence_type: str  # 'REGULAR_BULLISH' | 'REGULAR_BEARISH' | 'HIDDEN_BULLISH' | 'HIDDEN_BEARISH'
    direction: str        # 'BUY' | 'SELL'
    price_point1: float
    price_point2: float
    osc_point1: float
    osc_point2: float
    current_price: float
    target_price: float
    stop_loss: float
    confidence_score: float  # 0 - 100%
    timestamp: str


def compute_rsi(prices: List[float], period: int = 14) -> List[float]:
    """Computes Wilders RSI series."""
    if len(prices) < period + 1:
        return [50.0] * len(prices)

    deltas = [prices[i] - prices[i - 1] for i in range(1, len(prices))]
    gains = [max(d, 0.0) for d in deltas]
    losses = [abs(min(d, 0.0)) for d in deltas]

    avg_gain = sum(gains[:period]) / period
    avg_loss = sum(losses[:period]) / period

    rsi = [50.0] * (period)
    if avg_loss == 0:
        rsi.append(100.0)
    else:
        rs = avg_gain / avg_loss
        rsi.append(100.0 - (100.0 / (1.0 + rs)))

    for i in range(period, len(deltas)):
        avg_gain = ((avg_gain * (period - 1)) + gains[i]) / period
        avg_loss = ((avg_loss * (period - 1)) + losses[i]) / period
        if avg_loss == 0:
            rsi.append(100.0)
        else:
            rs = avg_gain / avg_loss
            rsi.append(100.0 - (100.0 / (1.0 + rs)))

    return rsi


def compute_ema(values: List[float], period: int) -> List[float]:
    """Calculates Exponential Moving Average."""
    if not values:
        return []
    k = 2.0 / (period + 1.0)
    ema = [values[0]]
    for v in values[1:]:
        ema.append(v * k + ema[-1] * (1.0 - k))
    return ema


def compute_macd(prices: List[float], fast: int = 12, slow: int = 26, signal: int = 9) -> Tuple[List[float], List[float], List[float]]:
    """Calculates MACD Line, Signal Line, and MACD Histogram."""
    if len(prices) < slow + signal:
        zeros = [0.0] * len(prices)
        return zeros, zeros, zeros

    fast_ema = compute_ema(prices, fast)
    slow_ema = compute_ema(prices, slow)
    macd_line = [f - s for f, s in zip(fast_ema, slow_ema)]
    signal_line = compute_ema(macd_line, signal)
    histogram = [m - s for m, s in zip(macd_line, signal_line)]
    return macd_line, signal_line, histogram


def compute_stochastic(highs: List[float], lows: List[float], closes: List[float], k_period: int = 14, d_period: int = 3) -> Tuple[List[float], List[float]]:
    """Calculates Fast %K and Smoothed %D."""
    n = len(closes)
    if n < k_period:
        zeros = [50.0] * n
        return zeros, zeros

    k_values = []
    for i in range(n):
        if i < k_period - 1:
            k_values.append(50.0)
            continue
        h_win = max(highs[i - k_period + 1 : i + 1])
        l_win = min(lows[i - k_period + 1 : i + 1])
        denom = h_win - l_win
        if denom == 0:
            k_values.append(50.0)
        else:
            k = ((closes[i] - l_win) / denom) * 100.0
            k_values.append(max(0.0, min(100.0, k)))

    d_values = compute_ema(k_values, d_period)
    return k_values, d_values


def find_swings(
    prices: List[float],
    osc_values: List[float],
    timestamps: List[str],
    order: int = 3
) -> Tuple[List[IndicatorSwing], List[IndicatorSwing]]:
    """Identifies swing highs and swing lows across price and oscillator."""
    n = len(prices)
    highs: List[IndicatorSwing] = []
    lows: List[IndicatorSwing] = []

    for i in range(order, n - order):
        p = prices[i]
        o = osc_values[i]
        t = timestamps[i] if i < len(timestamps) else ""

        is_p_high = all(p >= prices[j] for j in range(i - order, i + order + 1) if j != i)
        is_p_low = all(p <= prices[j] for j in range(i - order, i + order + 1) if j != i)

        if is_p_high:
            highs.append(IndicatorSwing(index=i, price=p, osc_value=o, is_high=True, timestamp=t))
        if is_p_low:
            lows.append(IndicatorSwing(index=i, price=p, osc_value=o, is_high=False, timestamp=t))

    return highs, lows


def detect_divergences(
    candles: List[Dict[str, Any]],
    symbol: str = "EURUSD",
    timeframe: str = "1h",
    indicator_name: str = "RSI",
    swing_order: int = 3
) -> List[DivergenceSignal]:
    """
    Scans candle data for all 4 types of divergences across the requested indicator.
    """
    if len(candles) < 30:
        return []

    closes = [float(c["close"]) for c in candles]
    highs = [float(c["high"]) for c in candles]
    lows = [float(c["low"]) for c in candles]
    timestamps = [str(c.get("timestamp") or c.get("time", "")) for c in candles]
    current_price = closes[-1]

    # Calculate oscillator values
    if indicator_name.upper() == "RSI":
        osc = compute_rsi(closes, period=14)
    elif indicator_name.upper() == "MACD":
        _, _, osc = compute_macd(closes, fast=12, slow=26, signal=9)
    elif indicator_name.upper() == "STOCHASTIC":
        osc, _ = compute_stochastic(highs, lows, closes, k_period=14, d_period=3)
    else:
        osc = compute_rsi(closes, period=14)

    swing_highs, swing_lows = find_swings(closes, osc, timestamps, order=swing_order)
    signals: List[DivergenceSignal] = []

    # 1. Bullish Divergences (Compare adjacent Swing Lows)
    for i in range(len(swing_lows) - 1):
        p1 = swing_lows[i]
        p2 = swing_lows[i + 1]

        # Ignore swings too far apart (> 40 bars) or too close (< 4 bars)
        bar_dist = p2.index - p1.index
        if bar_dist < 4 or bar_dist > 40:
            continue

        # Regular Bullish: Price LL, Oscillator HL
        if p2.price < p1.price and p2.osc_value > p1.osc_value:
            # Indicator confirmation (e.g. oversold condition bonus)
            score = 80.0
            if indicator_name.upper() == "RSI" and p1.osc_value < 35.0:
                score += 15.0
            elif indicator_name.upper() == "STOCHASTIC" and p1.osc_value < 25.0:
                score += 15.0

            stop_loss = round(p2.price - abs(p2.price * 0.0030), 5)
            target = round(current_price + (abs(current_price - stop_loss) * 2.0), 5)

            signals.append(DivergenceSignal(
                symbol=symbol.upper(),
                timeframe=timeframe,
                indicator=indicator_name.upper(),
                divergence_type="REGULAR_BULLISH",
                direction="BUY",
                price_point1=round(p1.price, 5),
                price_point2=round(p2.price, 5),
                osc_point1=round(p1.osc_value, 2),
                osc_point2=round(p2.osc_value, 2),
                current_price=round(current_price, 5),
                target_price=target,
                stop_loss=stop_loss,
                confidence_score=min(98.0, round(score, 1)),
                timestamp=p2.timestamp
            ))

        # Hidden Bullish: Price HL, Oscillator LL
        elif p2.price > p1.price and p2.osc_value < p1.osc_value:
            score = 75.0
            stop_loss = round(p1.price - abs(p1.price * 0.0020), 5)
            target = round(current_price + (abs(current_price - stop_loss) * 1.8), 5)

            signals.append(DivergenceSignal(
                symbol=symbol.upper(),
                timeframe=timeframe,
                indicator=indicator_name.upper(),
                divergence_type="HIDDEN_BULLISH",
                direction="BUY",
                price_point1=round(p1.price, 5),
                price_point2=round(p2.price, 5),
                osc_point1=round(p1.osc_value, 2),
                osc_point2=round(p2.osc_value, 2),
                current_price=round(current_price, 5),
                target_price=target,
                stop_loss=stop_loss,
                confidence_score=min(95.0, round(score, 1)),
                timestamp=p2.timestamp
            ))

    # 2. Bearish Divergences (Compare adjacent Swing Highs)
    for i in range(len(swing_highs) - 1):
        p1 = swing_highs[i]
        p2 = swing_highs[i + 1]

        bar_dist = p2.index - p1.index
        if bar_dist < 4 or bar_dist > 40:
            continue

        # Regular Bearish: Price HH, Oscillator LH
        if p2.price > p1.price and p2.osc_value < p1.osc_value:
            score = 80.0
            if indicator_name.upper() == "RSI" and p1.osc_value > 65.0:
                score += 15.0
            elif indicator_name.upper() == "STOCHASTIC" and p1.osc_value > 75.0:
                score += 15.0

            stop_loss = round(p2.price + abs(p2.price * 0.0030), 5)
            target = round(current_price - (abs(stop_loss - current_price) * 2.0), 5)

            signals.append(DivergenceSignal(
                symbol=symbol.upper(),
                timeframe=timeframe,
                indicator=indicator_name.upper(),
                divergence_type="REGULAR_BEARISH",
                direction="SELL",
                price_point1=round(p1.price, 5),
                price_point2=round(p2.price, 5),
                osc_point1=round(p1.osc_value, 2),
                osc_point2=round(p2.osc_value, 2),
                current_price=round(current_price, 5),
                target_price=target,
                stop_loss=stop_loss,
                confidence_score=min(98.0, round(score, 1)),
                timestamp=p2.timestamp
            ))

        # Hidden Bearish: Price LH, Oscillator HH
        elif p2.price < p1.price and p2.osc_value > p1.osc_value:
            score = 75.0
            stop_loss = round(p1.price + abs(p1.price * 0.0020), 5)
            target = round(current_price - (abs(stop_loss - current_price) * 1.8), 5)

            signals.append(DivergenceSignal(
                symbol=symbol.upper(),
                timeframe=timeframe,
                indicator=indicator_name.upper(),
                divergence_type="HIDDEN_BEARISH",
                direction="SELL",
                price_point1=round(p1.price, 5),
                price_point2=round(p2.price, 5),
                osc_point1=round(p1.osc_value, 2),
                osc_point2=round(p2.osc_value, 2),
                current_price=round(current_price, 5),
                target_price=target,
                stop_loss=stop_loss,
                confidence_score=min(95.0, round(score, 1)),
                timestamp=p2.timestamp
            ))

    # Sort newest signals first
    signals.sort(key=lambda s: s.confidence_score, reverse=True)
    return signals


def scan_multi_indicator_divergences(
    candles: List[Dict[str, Any]],
    symbol: str = "EURUSD",
    timeframe: str = "1h"
) -> Dict[str, Any]:
    """Scans RSI, MACD, and Stochastic concurrently and returns consolidated report."""
    rsi_divs = detect_divergences(candles, symbol, timeframe, "RSI")
    macd_divs = detect_divergences(candles, symbol, timeframe, "MACD")
    stoch_divs = detect_divergences(candles, symbol, timeframe, "STOCHASTIC")

    all_signals = rsi_divs + macd_divs + stoch_divs
    all_signals.sort(key=lambda s: s.confidence_score, reverse=True)

    bull_count = sum(1 for s in all_signals if s.direction == "BUY")
    bear_count = sum(1 for s in all_signals if s.direction == "SELL")

    if bull_count > bear_count:
        consensus = "BULLISH_REVERSAL" if any("REGULAR" in s.divergence_type for s in all_signals) else "BULLISH_CONTINUATION"
    elif bear_count > bull_count:
        consensus = "BEARISH_REVERSAL" if any("REGULAR" in s.divergence_type for s in all_signals) else "BEARISH_CONTINUATION"
    else:
        consensus = "NEUTRAL"

    return {
        "symbol": symbol.upper(),
        "timeframe": timeframe,
        "consensus": consensus,
        "total_signals": len(all_signals),
        "signals": [asdict(s) for s in all_signals],
        "rsi_signals": [asdict(s) for s in rsi_divs],
        "macd_signals": [asdict(s) for s in macd_divs],
        "stoch_signals": [asdict(s) for s in stoch_divs],
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
