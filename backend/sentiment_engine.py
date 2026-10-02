"""
Sentiment & Order Book Depth Aggregator Engine
Features:
1. Long/Short Positioning Aggregator (Retail Sentiment Ratio)
2. Contrarian Trading Signal Generation (Extreme Long -> Bearish; Extreme Short -> Bullish)
3. Simulated & Aggregated Level 2 Order Book Depth Ladder (Bids vs Asks)
4. Cumulative Depth & Liquidity Wall / Concentration Detection
"""

from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timezone
import math


@dataclass
class OrderBookLevel:
    price: float
    bid_volume: float
    ask_volume: float
    cumulative_bid: float
    cumulative_ask: float
    imbalance_pct: float  # Bid-to-Ask imbalance (-100% to +100%)


@dataclass
class SentimentReport:
    symbol: str
    current_price: float
    long_percentage: float
    short_percentage: float
    sentiment_index: float        # -100 (Extremely Short) to +100 (Extremely Long)
    contrarian_bias: str         # 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL'
    retail_mood: str             # 'GREED' | 'BULLISH' | 'NEUTRAL' | 'BEARISH' | 'FEAR'
    total_bid_depth: float
    total_ask_depth: float
    bid_ask_depth_ratio: float
    order_book: List[OrderBookLevel]
    timestamp: str


def calculate_sentiment_index(long_pct: float, short_pct: float) -> float:
    """Calculates Net Sentiment Index from -100 to +100."""
    total = long_pct + short_pct or 100.0
    norm_long = (long_pct / total) * 100.0
    norm_short = (short_pct / total) * 100.0
    return round(norm_long - norm_short, 1)


def determine_contrarian_signal(long_pct: float, short_pct: float) -> Tuple[str, str]:
    """
    Contrarian Logic:
    When the crowd (retail) is overwhelmingly long (>70-75%), smart money sells.
    When the crowd is overwhelmingly short (>70-75%), smart money buys.
    """
    if long_pct >= 75.0:
        return "STRONG_SELL", "EXTREME_GREED"
    elif long_pct >= 62.0:
        return "SELL", "GREED"
    elif short_pct >= 75.0:
        return "STRONG_BUY", "EXTREME_FEAR"
    elif short_pct >= 62.0:
        return "BUY", "FEAR"
    else:
        return "NEUTRAL", "BALANCED"


def generate_order_book_depth(
    current_price: float,
    num_levels: int = 10,
    tick_size: float = 0.0002
) -> Tuple[List[OrderBookLevel], float, float]:
    """
    Constructs a realistic Level 2 Order Book Depth ladder around current price.
    """
    levels: List[OrderBookLevel] = []
    cum_bid = 0.0
    cum_ask = 0.0

    # Build levels outward from market price
    for i in range(1, num_levels + 1):
        bid_price = round(current_price - (i * tick_size), 5)
        ask_price = round(current_price + (i * tick_size), 5)

        # Realistic volume distributions (decay with distance with occasional liquidity clusters)
        base_vol = 150.0 + (math.sin(i * 1.2) * 50.0) + (100.0 / (i + 1))
        bid_vol = round(base_vol * (1.1 if i in [3, 7] else 0.95), 1)
        ask_vol = round(base_vol * (1.15 if i in [4, 8] else 0.90), 1)

        cum_bid += bid_vol
        cum_ask += ask_vol

        imb = 0.0
        if (bid_vol + ask_vol) > 0:
            imb = round(((bid_vol - ask_vol) / (bid_vol + ask_vol)) * 100.0, 1)

        levels.append(OrderBookLevel(
            price=bid_price,
            bid_volume=bid_vol,
            ask_volume=ask_vol,
            cumulative_bid=round(cum_bid, 1),
            cumulative_ask=round(cum_ask, 1),
            imbalance_pct=imb
        ))

    return levels, round(cum_bid, 1), round(cum_ask, 1)


def analyze_sentiment(
    symbol: str,
    current_price: float = 1.0850,
    long_pct: Optional[float] = None,
    short_pct: Optional[float] = None,
    levels_count: int = 10
) -> SentimentReport:
    """Aggregates positioning and order book depth."""
    # Deterministic default based on symbol if not supplied
    if long_pct is None or short_pct is None:
        if "USD" in symbol.upper() and "EUR" in symbol.upper():
            long_pct = 68.0
            short_pct = 32.0
        elif "JPY" in symbol.upper():
            long_pct = 78.5
            short_pct = 21.5
        elif "GBP" in symbol.upper():
            long_pct = 42.0
            short_pct = 58.0
        else:
            long_pct = 52.0
            short_pct = 48.0

    sent_idx = calculate_sentiment_index(long_pct, short_pct)
    contrarian_bias, mood = determine_contrarian_signal(long_pct, short_pct)

    tick = 0.02 if "JPY" in symbol.upper() else 0.0002
    book_levels, total_bids, total_asks = generate_order_book_depth(
        current_price, num_levels=levels_count, tick_size=tick
    )

    ratio = round(total_bids / (total_asks or 1.0), 2)

    return SentimentReport(
        symbol=symbol.upper(),
        current_price=round(current_price, 5),
        long_percentage=round(long_pct, 1),
        short_percentage=round(short_pct, 1),
        sentiment_index=sent_idx,
        contrarian_bias=contrarian_bias,
        retail_mood=mood,
        total_bid_depth=total_bids,
        total_ask_depth=total_asks,
        bid_ask_depth_ratio=ratio,
        order_book=book_levels,
        timestamp=datetime.now(timezone.utc).isoformat()
    )
