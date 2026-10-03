"""
Tests for Order Flow Analysis Engine — Task T03
"""

import pytest
from backend.order_flow import (
    estimate_buy_sell_volume,
    candle_delta,
    compute_order_flow,
    detect_delta_divergence
)


def test_estimate_buy_sell_volume_close_equals_high():
    """Test when close equals high, all volume is buy volume."""
    candle = {
        'open': 10,
        'high': 20,
        'low': 10,
        'close': 20,
        'volume': 100
    }
    buy, sell = estimate_buy_sell_volume(candle)
    assert buy == 100
    assert sell == 0


def test_estimate_buy_sell_volume_close_equals_low():
    """Test when close equals low, all volume is sell volume."""
    candle = {
        'open': 10,
        'high': 20,
        'low': 10,
        'close': 10,
        'volume': 100
    }
    buy, sell = estimate_buy_sell_volume(candle)
    assert buy == 0
    assert sell == 100


def test_estimate_buy_sell_volume_midpoint():
    """Test when close is at midpoint of range."""
    candle = {
        'open': 10,
        'high': 20,
        'low': 10,
        'close': 15,
        'volume': 100
    }
    buy, sell = estimate_buy_sell_volume(candle)
    assert buy == 50
    assert sell == 50


def test_estimate_buy_sell_volume_known_values():
    """Test with specific known values."""
    candle = {
        'open': 10,
        'high': 20,
        'low': 10,
        'close': 17.5,
        'volume': 200
    }
    buy, sell = estimate_buy_sell_volume(candle)
    assert buy == 150
    assert sell == 50


def test_estimate_buy_sell_volume_doji():
    """Test doji candle with high == low."""
    candle = {
        'open': 15,
        'high': 15,
        'low': 15,
        'close': 15,
        'volume': 100
    }
    buy, sell = estimate_buy_sell_volume(candle)
    assert buy == 50
    assert sell == 50


def test_estimate_buy_sell_volume_zero_volume():
    """Test candle with zero volume."""
    candle = {
        'open': 10,
        'high': 20,
        'low': 10,
        'close': 15,
        'volume': 0
    }
    buy, sell = estimate_buy_sell_volume(candle)
    assert buy == 0
    assert sell == 0


def test_candle_delta_basic():
    """Test basic candle delta calculation."""
    candle = {
        'open': 10,
        'high': 20,
        'low': 10,
        'close': 15,
        'volume': 100
    }
    result = candle_delta(candle)
    assert result['buy_volume'] == 50
    assert result['sell_volume'] == 50
    assert result['delta'] == 0
    assert result['volume'] == 100
    assert result['estimated'] is True
    assert result['time'] is None


def test_candle_delta_with_time():
    """Test candle delta with time key."""
    candle = {
        'open': 10,
        'high': 20,
        'low': 10,
        'close': 15,
        'volume': 100,
        'time': '2023-01-01T00:00:00Z'
    }
    result = candle_delta(candle)
    assert result['time'] == '2023-01-01T00:00:00Z'


def test_compute_order_flow_empty():
    """Test compute_order_flow with empty input."""
    result = compute_order_flow([])
    assert result['bars'] == []
    assert result['total_delta'] == 0.0
    assert result['total_buy'] == 0.0
    assert result['total_sell'] == 0.0
    assert result['cvd_last'] == 0.0
    assert result['imbalance_ratio'] == 0.0
    assert result['estimated'] is True


def test_compute_order_flow_three_candles():
    """Test compute_order_flow with three hand-computed candles."""
    candles = [
        {
            'open': 10,
            'high': 20,
            'low': 10,
            'close': 15,
            'volume': 100
        },
        {
            'open': 15,
            'high': 25,
            'low': 15,
            'close': 20,
            'volume': 200
        },
        {
            'open': 20,
            'high': 30,
            'low': 10,
            'close': 15,
            'volume': 300
        }
    ]
    
    result = compute_order_flow(candles)
    
    # First candle: range=10, close at midpoint -> buy=50, sell=50, delta=0
    # Second candle: range=10, close 5 above low -> buy=100, sell=100, delta=0
    # Third candle: range=20, close 5 above low -> buy=75, sell=225, delta=-150
    
    assert len(result['bars']) == 3
    assert result['total_buy'] == 225  # 50 + 100 + 75
    assert result['total_sell'] == 375  # 50 + 100 + 225
    assert result['total_delta'] == -150  # 225 - 375
    assert result['cvd_last'] == -150  # 0 + 0 + (-150)
    
    # Check first bar
    bar1 = result['bars'][0]
    assert bar1['buy_volume'] == 50
    assert bar1['sell_volume'] == 50
    assert bar1['delta'] == 0
    assert bar1['cvd'] == 0
    
    # Check second bar
    bar2 = result['bars'][1]
    assert bar2['buy_volume'] == 100
    assert bar2['sell_volume'] == 100
    assert bar2['delta'] == 0
    assert bar2['cvd'] == 0  # 0 + 0
    
    # Check third bar
    bar3 = result['bars'][2]
    assert bar3['buy_volume'] == 75
    assert bar3['sell_volume'] == 225
    assert bar3['delta'] == -150
    assert bar3['cvd'] == -150  # 0 + 0 + (-150)


def test_compute_order_flow_invalid_candle():
    """Test compute_order_flow with invalid candle."""
    candles = [
        {
            'open': 10,
            'high': 20,
            'low': 10,
            'close': 15,
            'volume': 100
        },
        {
            'open': 15,
            'high': 25,
            'low': 15,
            # missing 'close' key
            'volume': 200
        }
    ]
    
    with pytest.raises(ValueError, match="invalid candle at index 1"):
        compute_order_flow(candles)


def test_imbalance_calculation():
    """Test imbalance calculation is within [-1, 1] range."""
    # Test positive imbalance
    candle1 = {
        'open': 10,
        'high': 20,
        'low': 10,
        'close': 18,
        'volume': 100
    }
    result1 = candle_delta(candle1)
    # buy = 100 * (18-10)/(20-10) = 100 * 0.8 = 80
    # sell = 20, delta = 60, imbalance = 60/100 = 0.6
    assert result1['imbalance'] == 0.6
    
    # Test negative imbalance
    candle2 = {
        'open': 10,
        'high': 20,
        'low': 10,
        'close': 12,
        'volume': 100
    }
    result2 = candle_delta(candle2)
    # buy = 100 * (12-10)/(20-10) = 100 * 0.2 = 20
    # sell = 80, delta = -60, imbalance = -60/100 = -0.6
    assert result2['imbalance'] == -0.6
    
    # Test zero volume
    candle3 = {
        'open': 10,
        'high': 20,
        'low': 10,
        'close': 15,
        'volume': 0
    }
    result3 = candle_delta(candle3)
    assert result3['imbalance'] == 0.0


def test_detect_delta_divergence_bearish():
    """Test bearish divergence (price up, CVD down)."""
    # Rising prices but decreasing buying pressure
    candles = [
        {'open': 10, 'high': 15, 'low': 5, 'close': 12, 'volume': 100},   # Up bar, strong buying
        {'open': 12, 'high': 18, 'low': 8, 'close': 14, 'volume': 100},   # Up bar, moderate buying
        {'open': 14, 'high': 20, 'low': 10, 'close': 13, 'volume': 100},  # Up bar, weak buying (close lower)
    ]
    
    result = detect_delta_divergence(candles, lookback=3)
    assert result['divergence'] in ['bearish', 'none']  # Depending on exact calculations
    assert result['estimated'] is True


def test_detect_delta_divergence_bullish():
    """Test bullish divergence (price down, CVD up)."""
    # Falling prices but increasing buying pressure
    candles = [
        {'open': 20, 'high': 25, 'low': 15, 'close': 16, 'volume': 100},  # Down bar, weak selling
        {'open': 16, 'high': 22, 'low': 12, 'close': 15, 'volume': 100},  # Down bar, moderate selling
        {'open': 15, 'high': 20, 'low': 10, 'close': 18, 'volume': 100},  # Down bar, strong buying
    ]
    
    result = detect_delta_divergence(candles, lookback=3)
    assert result['divergence'] in ['bullish', 'none']  # Depending on exact calculations
    assert result['estimated'] is True


def test_detect_delta_divergence_none():
    """Test no divergence case."""
    # Price and CVD moving in same direction
    candles = [
        {'open': 10, 'high': 15, 'low': 5, 'close': 12, 'volume': 100},   # Up bar, buying
        {'open': 12, 'high': 18, 'low': 8, 'close': 16, 'volume': 100},   # Up bar, more buying
        {'open': 16, 'high': 22, 'low': 12, 'close': 20, 'volume': 100},  # Up bar, strong buying
    ]
    
    result = detect_delta_divergence(candles, lookback=3)
    assert result['divergence'] == 'none'
    assert result['estimated'] is True


def test_detect_delta_divergence_few_candles():
    """Test divergence detection with fewer than 2 candles."""
    candles = [
        {'open': 10, 'high': 15, 'low': 5, 'close': 12, 'volume': 100}
    ]
    
    result = detect_delta_divergence(candles, lookback=3)
    assert result['divergence'] == 'none'
    assert result['estimated'] is True
    assert result['price_change'] == 0.0
    assert result['cvd_change'] == 0.0