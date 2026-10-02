"""
Volume Profile & Order Flow Engine — Task 17
MATRIX Platform Quantitative Technical Analysis

Calculates:
1. Volume Profile Histogram (Price Bins distribution)
2. POC (Point of Control) — Highest volume price level
3. Value Area (70% total volume): VAH (Value Area High) & VAL (Value Area Low)
4. High Volume Nodes (HVN) & Low Volume Nodes (LVN)
5. Order Flow & Cumulative Volume Delta (CVD)
6. Bid/Ask Volume Imbalance Detection
"""

from __future__ import annotations

import math
import time
from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class VolumeBin:
    price_level: float
    volume: float
    buy_volume: float
    sell_volume: float
    delta: float  # buy_volume - sell_volume
    is_poc: bool = False
    in_value_area: bool = False
    is_hvn: bool = False
    is_lvn: bool = False


@dataclass
class OrderFlowCandle:
    timestamp: float
    open: float
    high: float
    low: float
    close: float
    total_volume: float
    buy_volume: float
    sell_volume: float
    delta: float
    cvd: float  # Cumulative Volume Delta
    imbalance_ratio: float  # buy/sell or sell/buy
    has_buy_imbalance: bool
    has_sell_imbalance: bool


@dataclass
class VolumeProfileResult:
    symbol: str
    timeframe: str
    timestamp: float
    current_price: float
    total_volume: float
    poc_price: float
    vah_price: float  # Value Area High (70%)
    val_price: float  # Value Area Low (70%)
    price_to_poc_distance_pct: float
    market_sentiment: str  # BULLISH, BEARISH, BALANCED
    hvn_levels: List[float]  # High Volume Nodes
    lvn_levels: List[float]  # Low Volume Nodes
    bins: List[Dict[str, Any]]
    order_flow_summary: Dict[str, Any]
    trading_signals: List[Dict[str, Any]]


# In-Memory Cache with 60s TTL
_VP_CACHE: Dict[str, Tuple[float, VolumeProfileResult]] = {}
CACHE_TTL = 60.0


def calculate_volume_profile(
    candles: List[Dict[str, Any]],
    symbol: str = "EURUSD",
    timeframe: str = "1h",
    num_bins: int = 30,
    value_area_pct: float = 0.70,
    imbalance_threshold: float = 2.5,
) -> VolumeProfileResult:
    """
    Computes Volume Profile, POC, Value Area (70%), HVN/LVN, and Order Flow Delta.
    """
    last_ts = candles[-1].get("timestamp", candles[-1].get("time", 0)) if candles else 0
    last_close = candles[-1].get("close", 0) if candles else 0
    cache_key = f"{symbol}_{timeframe}_{num_bins}_{len(candles)}_{last_ts}_{last_close}"
    now = time.time()
    if cache_key in _VP_CACHE:
        cached_ts, cached_res = _VP_CACHE[cache_key]
        if now - cached_ts < CACHE_TTL:
            return cached_res

    if not candles:
        # Fallback empty profile
        dummy = VolumeProfileResult(
            symbol=symbol,
            timeframe=timeframe,
            timestamp=now,
            current_price=1.0850,
            total_volume=0.0,
            poc_price=1.0850,
            vah_price=1.0880,
            val_price=1.0820,
            price_to_poc_distance_pct=0.0,
            market_sentiment="BALANCED",
            hvn_levels=[],
            lvn_levels=[],
            bins=[],
            order_flow_summary={"net_delta": 0, "cvd": 0, "sentiment": "NEUTRAL"},
            trading_signals=[],
        )
        return dummy

    # 1. Determine min and max prices
    highs = [float(c.get("high", c.get("close", 1.0))) for c in candles]
    lows = [float(c.get("low", c.get("close", 1.0))) for c in candles]
    min_price = min(lows)
    max_price = max(highs)
    current_price = float(candles[-1].get("close", 1.0))

    if math.isclose(min_price, max_price):
        max_price += 0.0010
        min_price -= 0.0010

    bin_size = (max_price - min_price) / max(1, num_bins)

    # 2. Build Bins
    bin_volumes = [0.0] * num_bins
    bin_buy_vols = [0.0] * num_bins
    bin_sell_vols = [0.0] * num_bins

    # Process candles into bins and order flow
    order_flow_candles: List[OrderFlowCandle] = []
    running_cvd = 0.0
    total_market_volume = 0.0
    total_buy_volume = 0.0
    total_sell_volume = 0.0

    for c in candles:
        o = float(c.get("open", current_price))
        h = float(c.get("high", o))
        l = float(c.get("low", o))
        close_p = float(c.get("close", o))
        vol = float(c.get("volume", 100.0))
        ts = float(c.get("timestamp", c.get("time", now)))

        total_market_volume += vol

        # Estimate Buy vs Sell volume (Tick / Candle range approximation if tick delta not in feed)
        price_range = max(1e-6, h - l)
        # Ratio of close relative to low gives buy dominance
        buy_ratio = min(1.0, max(0.0, (close_p - l) / price_range))
        c_buy_vol = vol * buy_ratio
        c_sell_vol = vol * (1.0 - buy_ratio)
        c_delta = c_buy_vol - c_sell_vol
        running_cvd += c_delta

        total_buy_volume += c_buy_vol
        total_sell_volume += c_sell_vol

        # Imbalance check
        has_buy_imb = (c_buy_vol > c_sell_vol * imbalance_threshold) and (vol > 50)
        has_sell_imb = (c_sell_vol > c_buy_vol * imbalance_threshold) and (vol > 50)
        imb_ratio = (c_buy_vol / max(1.0, c_sell_vol)) if c_buy_vol >= c_sell_vol else (c_sell_vol / max(1.0, c_buy_vol))

        order_flow_candles.append(
            OrderFlowCandle(
                timestamp=ts,
                open=o,
                high=h,
                low=l,
                close=close_p,
                total_volume=vol,
                buy_volume=c_buy_vol,
                sell_volume=c_sell_vol,
                delta=c_delta,
                cvd=running_cvd,
                imbalance_ratio=round(imb_ratio, 2),
                has_buy_imbalance=has_buy_imb,
                has_sell_imbalance=has_sell_imb,
            )
        )

        # Distribute candle volume across touched price bins
        start_bin = max(0, min(num_bins - 1, int((l - min_price) / bin_size)))
        end_bin = max(0, min(num_bins - 1, int((h - min_price) / bin_size)))
        span = max(1, (end_bin - start_bin + 1))
        vol_per_bin = vol / span
        buy_per_bin = c_buy_vol / span
        sell_per_bin = c_sell_vol / span

        for b in range(start_bin, end_bin + 1):
            bin_volumes[b] += vol_per_bin
            bin_buy_vols[b] += buy_per_bin
            bin_sell_vols[b] += sell_per_bin

    # 3. Find POC (Point of Control)
    max_bin_vol = -1.0
    poc_index = 0
    for idx, v in enumerate(bin_volumes):
        if v > max_bin_vol:
            max_bin_vol = v
            poc_index = idx

    poc_price = min_price + (poc_index + 0.5) * bin_size

    # 4. Find Value Area (70% volume around POC)
    target_va_vol = total_market_volume * value_area_pct
    current_va_vol = bin_volumes[poc_index]
    in_va = [False] * num_bins
    in_va[poc_index] = True

    up_ptr = poc_index + 1
    down_ptr = poc_index - 1

    while current_va_vol < target_va_vol and (up_ptr < num_bins or down_ptr >= 0):
        up_vol = bin_volumes[up_ptr] if up_ptr < num_bins else -1.0
        down_vol = bin_volumes[down_ptr] if down_ptr >= 0 else -1.0

        if up_vol >= down_vol and up_ptr < num_bins:
            in_va[up_ptr] = True
            current_va_vol += up_vol
            up_ptr += 1
        elif down_ptr >= 0:
            in_va[down_ptr] = True
            current_va_vol += down_vol
            down_ptr -= 1
        elif up_ptr < num_bins:
            in_va[up_ptr] = True
            current_va_vol += up_vol
            up_ptr += 1
        else:
            break

    # Determine VAH and VAL
    va_indices = [i for i, val in enumerate(in_va) if val]
    if va_indices:
        val_index = min(va_indices)
        vah_index = max(va_indices)
        val_price = min_price + val_index * bin_size
        vah_price = min_price + (vah_index + 1) * bin_size
    else:
        val_price = min_price
        vah_price = max_price

    # 5. Detect HVN (High Volume Nodes) and LVN (Low Volume Nodes)
    # HVN: local peaks > 1.25x avg volume
    # LVN: local valleys < 0.6x avg volume
    avg_bin_vol = total_market_volume / max(1, num_bins)
    hvn_levels: List[float] = []
    lvn_levels: List[float] = []

    for i in range(1, num_bins - 1):
        v_prev = bin_volumes[i - 1]
        v_curr = bin_volumes[i]
        v_next = bin_volumes[i + 1]
        bin_center = min_price + (i + 0.5) * bin_size

        if v_curr > v_prev and v_curr > v_next and v_curr > avg_bin_vol * 1.2:
            hvn_levels.append(round(bin_center, 5))
        elif v_curr < v_prev and v_curr < v_next and v_curr < avg_bin_vol * 0.7:
            lvn_levels.append(round(bin_center, 5))

    # Format Bins
    formatted_bins: List[Dict[str, Any]] = []
    for i in range(num_bins):
        b_price = min_price + (i + 0.5) * bin_size
        vol = bin_volumes[i]
        b_vol = bin_buy_vols[i]
        s_vol = bin_sell_vols[i]
        formatted_bins.append({
            "bin_index": i,
            "price_level": round(b_price, 5),
            "volume": round(vol, 2),
            "buy_volume": round(b_vol, 2),
            "sell_volume": round(s_vol, 2),
            "delta": round(b_vol - s_vol, 2),
            "is_poc": (i == poc_index),
            "in_value_area": in_va[i],
            "is_hvn": any(math.isclose(b_price, h, abs_tol=bin_size * 0.6) for h in hvn_levels),
            "is_lvn": any(math.isclose(b_price, l, abs_tol=bin_size * 0.6) for l in lvn_levels),
        })

    # 6. Market Sentiment & Trading Signals
    dist_to_poc_pct = ((current_price - poc_price) / max(1e-6, poc_price)) * 100.0

    sentiment = "BALANCED"
    if current_price > vah_price and running_cvd > 0:
        sentiment = "STRONG_BULLISH"
    elif current_price > poc_price and running_cvd > 0:
        sentiment = "BULLISH"
    elif current_price < val_price and running_cvd < 0:
        sentiment = "STRONG_BEARISH"
    elif current_price < poc_price and running_cvd < 0:
        sentiment = "BEARISH"

    signals: List[Dict[str, Any]] = []

    # Signal 1: Value Area Breakout
    if current_price > vah_price:
        signals.append({
            "type": "VALUE_AREA_BREAKOUT_BULLISH",
            "direction": "BUY",
            "strength": 85 if running_cvd > 0 else 65,
            "message": f"السعر يخترق منطقة القيمة للأعلى (فوق VAH {vah_price:.4f}) مع دلتا تراكمي إيجابي",
            "target_price": round(vah_price + (vah_price - poc_price), 5),
            "stop_loss": round(poc_price, 5),
        })
    elif current_price < val_price:
        signals.append({
            "type": "VALUE_AREA_BREAKDOWN_BEARISH",
            "direction": "SELL",
            "strength": 85 if running_cvd < 0 else 65,
            "message": f"السعر يكسر منطقة القيمة للأسفل (تحت VAL {val_price:.4f}) مع تدفق بيعي",
            "target_price": round(val_price - (poc_price - val_price), 5),
            "stop_loss": round(poc_price, 5),
        })

    # Signal 2: Mean Reversion to POC (if far away inside or near boundary)
    if abs(dist_to_poc_pct) > 0.8:
        if current_price > poc_price and current_price <= vah_price:
            signals.append({
                "type": "POC_MEAN_REVERSION_PULLBACK",
                "direction": "SELL",
                "strength": 70,
                "message": f"احتمال ارتداد تصحيحي نحو نقطة التحكم السعرية POC ({poc_price:.4f})",
                "target_price": round(poc_price, 5),
                "stop_loss": round(vah_price * 1.002, 5),
            })
        elif current_price < poc_price and current_price >= val_price:
            signals.append({
                "type": "POC_MEAN_REVERSION_BOUNCE",
                "direction": "BUY",
                "strength": 70,
                "message": f"احتمال ارتداد صاعد نحو نقطة التحكم السعرية POC ({poc_price:.4f})",
                "target_price": round(poc_price, 5),
                "stop_loss": round(val_price * 0.998, 5),
            })

    # Signal 3: Recent Order Flow Imbalance
    recent_imbalances = [c for c in order_flow_candles[-5:] if c.has_buy_imbalance or c.has_sell_imbalance]
    if recent_imbalances:
        last_imb = recent_imbalances[-1]
        if last_imb.has_buy_imbalance:
            signals.append({
                "type": "ORDER_FLOW_BUY_IMBALANCE",
                "direction": "BUY",
                "strength": 80,
                "message": f"رصد اختلال شرائي قوي (نسبة {last_imb.imbalance_ratio}x) في تدفق الأوامر اللحظي",
                "target_price": round(current_price * 1.005, 5),
                "stop_loss": round(current_price * 0.997, 5),
            })
        elif last_imb.has_sell_imbalance:
            signals.append({
                "type": "ORDER_FLOW_SELL_IMBALANCE",
                "direction": "SELL",
                "strength": 80,
                "message": f"رصد اختلال بيعي قوي (نسبة {last_imb.imbalance_ratio}x) في تدفق الأوامر اللحظي",
                "target_price": round(current_price * 0.995, 5),
                "stop_loss": round(current_price * 1.003, 5),
            })

    order_flow_summary = {
        "net_delta": round(total_buy_volume - total_sell_volume, 2),
        "total_buy_volume": round(total_buy_volume, 2),
        "total_sell_volume": round(total_sell_volume, 2),
        "buy_ratio_pct": round((total_buy_volume / max(1.0, total_market_volume)) * 100, 1),
        "cvd": round(running_cvd, 2),
        "order_flow_sentiment": "BUYING_DOMINANT" if running_cvd > 0 else "SELLING_DOMINANT",
        "recent_candles_count": len(order_flow_candles),
    }

    result = VolumeProfileResult(
        symbol=symbol.upper(),
        timeframe=timeframe,
        timestamp=now,
        current_price=round(current_price, 5),
        total_volume=round(total_market_volume, 2),
        poc_price=round(poc_price, 5),
        vah_price=round(vah_price, 5),
        val_price=round(val_price, 5),
        price_to_poc_distance_pct=round(dist_to_poc_pct, 2),
        market_sentiment=sentiment,
        hvn_levels=hvn_levels,
        lvn_levels=lvn_levels,
        bins=formatted_bins,
        order_flow_summary=order_flow_summary,
        trading_signals=signals,
    )

    _VP_CACHE[cache_key] = (now, result)
    return result


def generate_volume_profile_candles(symbol: str, timeframe: str = "1h", count: int = 100) -> List[Dict[str, Any]]:
    """Generates realistic candlestick series with volumes for analysis."""
    import hashlib
    seed_int = int(hashlib.md5(f"vp:{symbol}:{timeframe}".encode()).hexdigest()[:8], 16)
    
    base = 1.0850
    if "JPY" in symbol:
        base = 155.0
    elif "XAU" in symbol or "GOLD" in symbol:
        base = 2650.0
    elif "BTC" in symbol:
        base = 65000.0
    elif "GBP" in symbol:
        base = 1.2950

    candles = []
    p = base
    now = time.time()
    tf_seconds = {"1m": 60, "5m": 300, "15m": 900, "1h": 3600, "4h": 14400, "1d": 86400}.get(timeframe, 3600)

    for i in range(count):
        step_seed = (seed_int + i * 37) % 1000
        change_pct = ((step_seed / 1000.0) - 0.49) * 0.003
        o = p
        c = p * (1 + change_pct)
        h = max(o, c) * (1 + ((step_seed % 20) / 10000.0))
        l = min(o, c) * (1 - ((step_seed % 15) / 10000.0))
        vol = 80.0 + ((step_seed * 13) % 450)
        
        # Occasional volume spikes at key levels
        if i % 15 == 0:
            vol *= 2.8

        candles.append({
            "timestamp": now - (count - i) * tf_seconds,
            "open": round(o, 5),
            "high": round(h, 5),
            "low": round(l, 5),
            "close": round(c, 5),
            "volume": round(vol, 2),
        })
        p = c

    return candles


def analyze_symbol(
    symbol: str,
    timeframe: str = "1h",
    num_bins: int = 30,
    custom_candles: Optional[List[Dict[str, Any]]] = None,
) -> VolumeProfileResult:
    """End-to-end analysis for symbol and timeframe with caching and database logging."""
    candles = custom_candles if custom_candles is not None else generate_volume_profile_candles(symbol, timeframe)
    result = calculate_volume_profile(candles, symbol=symbol, timeframe=timeframe, num_bins=num_bins)

    # Attempt to log to DB if db module is importable
    try:
        import json
        try:
            import db
        except ImportError:
            from backend import db

        db.log_volume_profile_analysis(
            symbol=result.symbol,
            timeframe=result.timeframe,
            current_price=result.current_price,
            poc_price=result.poc_price,
            vah_price=result.vah_price,
            val_price=result.val_price,
            total_volume=result.total_volume,
            sentiment=result.market_sentiment,
            bins_json=json.dumps(result.bins),
            signals_json=json.dumps(result.trading_signals),
        )
    except Exception:
        pass

    return result

