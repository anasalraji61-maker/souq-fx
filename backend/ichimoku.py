"""
backend/ichimoku.py — Ichimoku Cloud (Kinko Hyo) Calculation & Signal Engine (Task 16)
Chief Architect: Claude Haiku 4.5
Lead Builder: Google AI Studio

Calculates the 5 core Ichimoku lines:
1. Tenkan-sen (Conversion Line, 9 periods)
2. Kijun-sen (Base Line, 26 periods)
3. Senkou Span A (Leading Span A, displaced +26)
4. Senkou Span B (Leading Span B, 52 periods, displaced +26)
5. Chikou Span (Lagging Span, lagged -26)

Detects 4 Primary Signal Types:
- TK Cross (Golden/Death Cross with Strong/Neutral/Weak ranking)
- Cloud Breakout (Above/Inside/Below Kumo)
- Cloud Color & Kumo Twist (Senkou A vs Senkou B)
- Chikou Confirmation (Chikou vs Price 26 bars ago)
"""
from __future__ import annotations

import time
import json
import logging
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, asdict

try:
    import cache as cache_engine
except ImportError:
    from backend import cache as cache_engine

try:
    import db
except ImportError:
    from backend import db

logger = logging.getLogger(__name__)


@dataclass
class IchimokuValues:
    tenkan_sen: float
    kijun_sen: float
    senkou_span_a: float
    senkou_span_b: float
    chikou_span: float
    cloud_top: float
    cloud_bottom: float
    cloud_thickness: float
    cloud_color: str  # GREEN | RED
    cloud_state: str  # ABOVE_CLOUD | BELOW_CLOUD | INSIDE_CLOUD


@dataclass
class IchimokuSignals:
    tk_cross: str  # STRONG_BULLISH | NEUTRAL_BULLISH | WEAK_BULLISH | STRONG_BEARISH | NEUTRAL_BEARISH | WEAK_BEARISH | NO_CROSS
    tk_state: str  # BULLISH (Tenkan > Kijun) | BEARISH (Tenkan < Kijun) | NEUTRAL
    cloud_breakout: str  # BULLISH_BREAKOUT | BEARISH_BREAKOUT | CONSOLIDATION
    cloud_color: str  # GREEN (Bullish) | RED (Bearish)
    cloud_twist: bool  # True if Kumo twist just occurred
    chikou_confirmation: str  # BULLISH | BEARISH | NEUTRAL
    overall_trend: str  # BULLISH | BEARISH | NEUTRAL
    strength: float  # 0 to 100


@dataclass
class IchimokuAnalysisResult:
    symbol: str
    timeframe: str
    timestamp: str
    current_price: float
    values: Dict[str, Any]
    signals: Dict[str, Any]
    support_resistance: Dict[str, float]
    chart_series: Dict[str, List[Any]]
    cached: bool = False


# ------------------------------------------------------------------------------
# Core Pure Calculation Functions
# ------------------------------------------------------------------------------

def calc_midpoint(highs: List[float], lows: List[float], period: int, index: int) -> Optional[float]:
    """Calculates (highest_high + lowest_low) / 2 for the window ending at index."""
    if index < period - 1 or len(highs) < period or len(lows) < period:
        return None
    start = max(0, index - period + 1)
    h_window = highs[start : index + 1]
    l_window = lows[start : index + 1]
    if not h_window or not l_window:
        return None
    return round((max(h_window) + min(l_window)) / 2.0, 5)


def calculate_ichimoku_series(
    highs: List[float],
    lows: List[float],
    closes: List[float],
    tenkan_period: int = 9,
    kijun_period: int = 26,
    senkou_b_period: int = 52,
    displacement: int = 26,
) -> Dict[str, List[Optional[float]]]:
    """
    Computes full series for Tenkan, Kijun, Senkou A, Senkou B, and Chikou.
    Handles displacement (+26 periods ahead for spans) and lag (-26 periods for Chikou).
    """
    n = len(closes)
    tenkan_series: List[Optional[float]] = [None] * n
    kijun_series: List[Optional[float]] = [None] * n
    senkou_a_series: List[Optional[float]] = [None] * (n + displacement)
    senkou_b_series: List[Optional[float]] = [None] * (n + displacement)
    chikou_series: List[Optional[float]] = [None] * n

    for i in range(n):
        # Tenkan-sen (9)
        tenkan_series[i] = calc_midpoint(highs, lows, tenkan_period, i)
        # Kijun-sen (26)
        kijun_series[i] = calc_midpoint(highs, lows, kijun_period, i)

        # Senkou Span A: (Tenkan + Kijun) / 2 shifted forward by displacement (26)
        t_val = tenkan_series[i]
        k_val = kijun_series[i]
        if t_val is not None and k_val is not None:
            span_a = round((t_val + k_val) / 2.0, 5)
            senkou_a_series[i + displacement] = span_a

        # Senkou Span B: Midpoint(52) shifted forward by displacement (26)
        span_b = calc_midpoint(highs, lows, senkou_b_period, i)
        if span_b is not None:
            senkou_b_series[i + displacement] = span_b

        # Chikou Span: Current close plotted 26 periods behind
        if i >= displacement:
            chikou_series[i - displacement] = closes[i]

    return {
        "tenkan": tenkan_series,
        "kijun": kijun_series,
        "senkou_a": senkou_a_series[:n],  # aligned to current candles
        "senkou_b": senkou_b_series[:n],  # aligned to current candles
        "senkou_a_future": senkou_a_series[n:],  # projected into the future
        "senkou_b_future": senkou_b_series[n:],  # projected into the future
        "chikou": chikou_series,
    }


def evaluate_cloud_state(price: float, senkou_a: float, senkou_b: float) -> str:
    """Evaluates whether current price is ABOVE_CLOUD, BELOW_CLOUD, or INSIDE_CLOUD"""
    top = max(senkou_a, senkou_b)
    bottom = min(senkou_a, senkou_b)

    if price > top + 1e-5:
        return "ABOVE_CLOUD"
    elif price < bottom - 1e-5:
        return "BELOW_CLOUD"
    else:
        return "INSIDE_CLOUD"


def evaluate_tk_cross(
    tenkan_now: float,
    kijun_now: float,
    tenkan_prev: float,
    kijun_prev: float,
    cloud_state: str,
) -> str:
    """
    Classifies TK Crossover into Strong / Neutral / Weak categories based on Kumo location.
    - Golden Cross:
      - Above cloud = STRONG_BULLISH
      - Inside cloud = NEUTRAL_BULLISH
      - Below cloud = WEAK_BULLISH
    - Death Cross:
      - Below cloud = STRONG_BEARISH
      - Inside cloud = NEUTRAL_BEARISH
      - Above cloud = WEAK_BEARISH
    """
    is_bullish_cross = (tenkan_prev <= kijun_prev) and (tenkan_now > kijun_now)
    is_bearish_cross = (tenkan_prev >= kijun_prev) and (tenkan_now < kijun_now)

    if is_bullish_cross:
        if cloud_state == "ABOVE_CLOUD":
            return "STRONG_BULLISH"
        elif cloud_state == "INSIDE_CLOUD":
            return "NEUTRAL_BULLISH"
        else:
            return "WEAK_BULLISH"

    if is_bearish_cross:
        if cloud_state == "BELOW_CLOUD":
            return "STRONG_BEARISH"
        elif cloud_state == "INSIDE_CLOUD":
            return "NEUTRAL_BEARISH"
        else:
            return "WEAK_BEARISH"

    return "NO_CROSS"


def evaluate_chikou(chikou_val: float, past_price: float) -> str:
    if chikou_val > past_price + 1e-5:
        return "BULLISH"
    elif chikou_val < past_price - 1e-5:
        return "BEARISH"
    return "NEUTRAL"


# ------------------------------------------------------------------------------
# Synthetic Seeded Data Generator
# ------------------------------------------------------------------------------

def generate_ichimoku_candles(symbol: str, timeframe: str = "1h", count: int = 120) -> Dict[str, List[float]]:
    import hashlib
    seed_int = int(hashlib.md5(f"ichimoku:{symbol}:{timeframe}".encode()).hexdigest()[:8], 16)
    
    base = 1.0850
    if "JPY" in symbol:
        base = 154.50
    elif "XAU" in symbol or "GOLD" in symbol:
        base = 2735.00
    elif "BTC" in symbol:
        base = 65000.00

    closes = []
    highs = []
    lows = []
    opens = []
    curr = base

    for i in range(count):
        step = ((seed_int * (i + 1) * 37) % 1000 - 480) / 80000.0 * base
        o = curr
        curr += step
        c = curr
        h = max(o, c) + abs(step) * 1.2 + (base * 0.0004)
        l = min(o, c) - abs(step) * 1.2 - (base * 0.0004)
        opens.append(round(o, 5))
        closes.append(round(c, 5))
        highs.append(round(h, 5))
        lows.append(round(l, 5))

    return {"opens": opens, "highs": highs, "lows": lows, "closes": closes}


# ------------------------------------------------------------------------------
# Ichimoku Engine Class
# ------------------------------------------------------------------------------

class IchimokuEngine:
    CACHE_TTL = 60  # 60s Redis TTL

    def __init__(self, cache_mgr=None):
        self.cache = cache_mgr or cache_engine.get_cache()

    def analyze_candles(
        self,
        symbol: str,
        timeframe: str,
        highs: List[float],
        lows: List[float],
        closes: List[float],
    ) -> IchimokuAnalysisResult:
        n = len(closes)
        if n < 52:
            raise ValueError(f"Need at least 52 candles for full Ichimoku calculations, got {n}")

        series = calculate_ichimoku_series(highs, lows, closes)

        # Snapshot current values (latest available)
        curr_price = closes[-1]
        tenkan_now = series["tenkan"][-1] or curr_price
        kijun_now = series["kijun"][-1] or curr_price
        tenkan_prev = series["tenkan"][-2] if len(series["tenkan"]) > 1 and series["tenkan"][-2] is not None else tenkan_now
        kijun_prev = series["kijun"][-2] if len(series["kijun"]) > 1 and series["kijun"][-2] is not None else kijun_now

        # Current cloud span (at bar -1)
        senkou_a_now = series["senkou_a"][-1] or curr_price
        senkou_b_now = series["senkou_b"][-1] or curr_price

        cloud_top = round(max(senkou_a_now, senkou_b_now), 5)
        cloud_bottom = round(min(senkou_a_now, senkou_b_now), 5)
        cloud_thickness = round(cloud_top - cloud_bottom, 5)
        cloud_color = "GREEN" if senkou_a_now >= senkou_b_now else "RED"

        cloud_state = evaluate_cloud_state(curr_price, senkou_a_now, senkou_b_now)

        # Signal 1: TK Cross & TK State
        tk_cross_signal = evaluate_tk_cross(tenkan_now, kijun_now, tenkan_prev, kijun_prev, cloud_state)
        tk_state = "BULLISH" if tenkan_now > kijun_now + 1e-5 else ("BEARISH" if tenkan_now < kijun_now - 1e-5 else "NEUTRAL")

        # Signal 2: Cloud Breakout
        if cloud_state == "ABOVE_CLOUD":
            cloud_breakout = "BULLISH_BREAKOUT"
        elif cloud_state == "BELOW_CLOUD":
            cloud_breakout = "BEARISH_BREAKOUT"
        else:
            cloud_breakout = "CONSOLIDATION"

        # Signal 3: Cloud Twist
        senkou_a_prev = series["senkou_a"][-2] if len(series["senkou_a"]) > 1 and series["senkou_a"][-2] is not None else senkou_a_now
        senkou_b_prev = series["senkou_b"][-2] if len(series["senkou_b"]) > 1 and series["senkou_b"][-2] is not None else senkou_b_now
        cloud_twist = (senkou_a_prev < senkou_b_prev and senkou_a_now >= senkou_b_now) or (senkou_a_prev > senkou_b_prev and senkou_a_now <= senkou_b_now)

        # Signal 4: Chikou Confirmation (Current price vs close 26 periods ago)
        past_idx = max(0, n - 1 - 26)
        past_close = closes[past_idx]
        chikou_confirmation = evaluate_chikou(curr_price, past_close)

        # Overall Trend & Strength Scoring
        bullish_score = 0.0
        bearish_score = 0.0

        # Cloud Position (30 pts)
        if cloud_state == "ABOVE_CLOUD":
            bullish_score += 30.0
        elif cloud_state == "BELOW_CLOUD":
            bearish_score += 30.0
        else:
            bullish_score += 10.0
            bearish_score += 10.0

        # TK Cross / State (30 pts)
        if tk_state == "BULLISH":
            bullish_score += 30.0
        elif tk_state == "BEARISH":
            bearish_score += 30.0
        else:
            bullish_score += 10.0
            bearish_score += 10.0

        # Cloud Color (20 pts)
        if cloud_color == "GREEN":
            bullish_score += 20.0
        else:
            bearish_score += 20.0

        # Chikou Confirmation (20 pts)
        if chikou_confirmation == "BULLISH":
            bullish_score += 20.0
        elif chikou_confirmation == "BEARISH":
            bearish_score += 20.0

        net = bullish_score - bearish_score
        if net >= 25.0:
            overall_trend = "BULLISH"
            strength = round(bullish_score, 1)
        elif net <= -25.0:
            overall_trend = "BEARISH"
            strength = round(bearish_score, 1)
        else:
            overall_trend = "NEUTRAL"
            strength = 40.0

        values_dict = {
            "tenkan_sen": round(tenkan_now, 5),
            "kijun_sen": round(kijun_now, 5),
            "senkou_span_a": round(senkou_a_now, 5),
            "senkou_span_b": round(senkou_b_now, 5),
            "chikou_span": round(curr_price, 5),
            "cloud_top": cloud_top,
            "cloud_bottom": cloud_bottom,
            "cloud_thickness": cloud_thickness,
            "cloud_color": cloud_color,
            "cloud_state": cloud_state,
        }

        signals_dict = {
            "tk_cross": tk_cross_signal,
            "tk_state": tk_state,
            "cloud_breakout": cloud_breakout,
            "cloud_color": cloud_color,
            "cloud_twist": cloud_twist,
            "chikou_confirmation": chikou_confirmation,
            "overall_trend": overall_trend,
            "strength": strength,
        }

        support_resistance = {
            "tenkan_level": round(tenkan_now, 5),
            "kijun_level": round(kijun_now, 5),
            "cloud_top_level": cloud_top,
            "cloud_bottom_level": cloud_bottom,
        }

        # Pack chart series (last 40 candles for clean rendering)
        slice_start = max(0, n - 40)
        chart_series = {
            "closes": closes[slice_start:],
            "tenkan": series["tenkan"][slice_start:],
            "kijun": series["kijun"][slice_start:],
            "senkou_a": series["senkou_a"][slice_start:],
            "senkou_b": series["senkou_b"][slice_start:],
            "chikou": series["chikou"][slice_start:],
        }

        result = IchimokuAnalysisResult(
            symbol=symbol.upper(),
            timeframe=timeframe,
            timestamp=time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
            current_price=curr_price,
            values=values_dict,
            signals=signals_dict,
            support_resistance=support_resistance,
            chart_series=chart_series,
            cached=False,
        )

        # Log into SQLite DB
        try:
            db.log_ichimoku_analysis(
                symbol=symbol,
                timeframe=timeframe,
                current_price=curr_price,
                tenkan=tenkan_now,
                kijun=kijun_now,
                senkou_a=senkou_a_now,
                senkou_b=senkou_b_now,
                chikou=curr_price,
                cloud_state=cloud_state,
                tk_cross_signal=tk_cross_signal,
                overall_trend=overall_trend,
                strength=strength,
                signals_json=json.dumps(signals_dict),
            )
        except Exception as e:
            logger.debug(f"DB log Ichimoku failed: {e}")

        return result

    def analyze(self, symbol: str, timeframe: str = "1h", custom_candles: Optional[Dict] = None) -> IchimokuAnalysisResult:
        cache_key = f"ichimoku:{symbol.upper()}:{timeframe}"
        if self.cache and self.cache.is_available() and custom_candles is None:
            cached_data = self.cache.redis.get(cache_key)
            if cached_data:
                try:
                    payload = json.loads(cached_data)
                    payload["cached"] = True
                    return IchimokuAnalysisResult(**payload)
                except Exception:
                    pass

        candles = custom_candles or generate_ichimoku_candles(symbol, timeframe, count=120)
        result = self.analyze_candles(
            symbol=symbol,
            timeframe=timeframe,
            highs=candles["highs"],
            lows=candles["lows"],
            closes=candles["closes"],
        )

        # Store in Redis/Memory Cache
        if self.cache and self.cache.is_available() and custom_candles is None:
            try:
                self.cache.redis.setex(
                    cache_key,
                    self.CACHE_TTL,
                    json.dumps(asdict(result)),
                )
            except Exception as e:
                logger.debug(f"Ichimoku cache set error: {e}")

        return result


# Singleton
_ichimoku_instance = IchimokuEngine()

def get_ichimoku_engine() -> IchimokuEngine:
    return _ichimoku_instance
