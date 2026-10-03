"""
Order Flow Analysis Engine — Task T03
MATRIX Platform Quantitative Technical Analysis

Calculates:
1. Buy/Sell Volume estimation from OHLCV candles
2. Volume Delta (buy - sell volume)
3. Cumulative Volume Delta (CVD)
4. Volume Imbalance detection
5. Delta Divergence signals
"""

from __future__ import annotations

from typing import Dict, List, Union


def estimate_buy_sell_volume(candle: dict) -> tuple[float, float]:
    """
    Estimate buy and sell volume from a single OHLCV candle.
    
    Args:
        candle: Dictionary with keys 'open', 'high', 'low', 'close', 'volume'
        
    Returns:
        Tuple of (buy_volume, sell_volume)
    """
    open_price = candle.get('open')
    high = candle.get('high')
    low = candle.get('low')
    close = candle.get('close')
    volume = candle.get('volume', 0.0)
    
    # Validate required keys exist and are numeric
    if any(v is None for v in [open_price, high, low, close]) or volume is None:
        raise ValueError("Missing required candle keys")
    
    # Check if all values are numeric
    try:
        open_price = float(open_price)
        high = float(high)
        low = float(low)
        close = float(close)
        volume = float(volume)
    except (ValueError, TypeError):
        raise ValueError("Non-numeric candle values")
    
    rng = high - low
    
    # Handle edge cases
    if rng <= 0 or volume <= 0:
        if volume > 0:
            # Split 50/50 for doji or zero range candles with volume
            return volume / 2.0, volume / 2.0
        else:
            # Zero volume
            return 0.0, 0.0
    
    # Calculate buy volume based on close position in range
    buy = volume * (close - low) / rng
    # Clamp buy volume to valid range
    buy = max(0.0, min(volume, buy))
    sell = volume - buy
    
    return buy, sell


def candle_delta(candle: dict) -> dict:
    """
    Calculate volume delta for a single candle.
    
    Args:
        candle: Dictionary with keys 'open', 'high', 'low', 'close', 'volume'
        
    Returns:
        Dictionary with keys: 'time', 'buy_volume', 'sell_volume', 'delta', 'volume', 'estimated', 'imbalance'
    """
    buy_volume, sell_volume = estimate_buy_sell_volume(candle)
    
    # Round to 6 decimal places
    buy_volume = round(buy_volume, 6)
    sell_volume = round(sell_volume, 6)
    delta = round(buy_volume - sell_volume, 6)
    volume = round(candle.get('volume', 0.0), 6)
    
    # Calculate imbalance (-1 to 1 range)
    if volume > 0:
        imbalance = delta / volume
        # Clamp to [-1, 1] range
        imbalance = max(-1.0, min(1.0, imbalance))
    else:
        imbalance = 0.0
    imbalance = round(imbalance, 6)
    
    result = {
        "buy_volume": buy_volume,
        "sell_volume": sell_volume,
        "delta": delta,
        "volume": volume,
        "imbalance": imbalance,
        "estimated": True
    }
    
    # Include time if present in candle
    if 'time' in candle:
        result['time'] = candle['time']
    else:
        result['time'] = None
        
    return result


def compute_order_flow(candles: list[dict]) -> dict:
    """
    Compute order flow metrics for a list of candles.
    
    Args:
        candles: List of candle dictionaries
        
    Returns:
        Dictionary with order flow metrics
    """
    if not candles:
        return {
            "estimated": True,
            "bars": [],
            "total_delta": 0.0,
            "total_buy": 0.0,
            "total_sell": 0.0,
            "cvd_last": 0.0,
            "imbalance_ratio": 0.0
        }
    
    bars = []
    total_buy = 0.0
    total_sell = 0.0
    cvd = 0.0
    
    for i, candle in enumerate(candles):
        # Validate required keys exist
        required_keys = ['open', 'high', 'low', 'close', 'volume']
        for key in required_keys:
            if key not in candle:
                raise ValueError(f"invalid candle at index {i}")
        
        # Validate values are numeric
        for key in required_keys:
            try:
                float(candle[key])
            except (ValueError, TypeError):
                raise ValueError(f"invalid candle at index {i}")
        
        # Calculate delta for this candle
        delta_info = candle_delta(candle)
        
        # Update cumulative values
        buy_vol = delta_info['buy_volume']
        sell_vol = delta_info['sell_volume']
        delta = delta_info['delta']
        
        total_buy += buy_vol
        total_sell += sell_vol
        cvd += delta
        
        # Add CVD to the bar data
        bar = delta_info.copy()
        bar['cvd'] = round(cvd, 6)
        
        bars.append(bar)
    
    # Calculate total volume and imbalance ratio
    total_volume = total_buy + total_sell
    if total_volume > 0:
        imbalance_ratio = (total_buy - total_sell) / total_volume
    else:
        imbalance_ratio = 0.0
    
    return {
        "estimated": True,
        "bars": bars,
        "total_delta": round(total_buy - total_sell, 6),
        "total_buy": round(total_buy, 6),
        "total_sell": round(total_sell, 6),
        "cvd_last": round(cvd, 6),
        "imbalance_ratio": round(imbalance_ratio, 6)
    }


def detect_delta_divergence(candles: list[dict], lookback: int = 10) -> dict:
    """
    Detect delta divergence between price and cumulative volume delta.
    
    Args:
        candles: List of candle dictionaries
        lookback: Number of candles to look back (default: 10)
        
    Returns:
        Dictionary with divergence analysis
    """
    # Need at least 2 candles for comparison
    if len(candles) < 2:
        return {
            "estimated": True,
            "divergence": "none",
            "price_change": 0.0,
            "cvd_change": 0.0
        }
    
    # Use minimum of lookback and available candles, but at least 2
    actual_lookback = min(lookback, len(candles))
    if actual_lookback < 2:
        return {
            "estimated": True,
            "divergence": "none",
            "price_change": 0.0,
            "cvd_change": 0.0
        }
    
    # Get the relevant candles for analysis
    analysis_candles = candles[-actual_lookback:]
    
    # Get first and last close prices
    first_close = float(analysis_candles[0]['close'])
    last_close = float(analysis_candles[-1]['close'])
    price_change = last_close - first_close
    
    # Calculate CVD for all candles to get running values
    order_flow = compute_order_flow(analysis_candles)
    bars = order_flow['bars']
    
    # Get first and last CVD values
    first_cvd = bars[0]['cvd']
    last_cvd = bars[-1]['cvd']
    cvd_change = last_cvd - first_cvd
    
    # Determine divergence type
    divergence = "none"
    if price_change > 0 and cvd_change < 0:
        divergence = "bearish"  # Price up but buying pressure down
    elif price_change < 0 and cvd_change > 0:
        divergence = "bullish"  # Price down but buying pressure up
    
    return {
        "estimated": True,
        "divergence": divergence,
        "price_change": round(price_change, 6),
        "cvd_change": round(cvd_change, 6)
    }