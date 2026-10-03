"""Tests for the _mismatch_threshold guard in _with_newest_close."""
from __future__ import annotations

from datetime import datetime, timezone

import pytest

import twelve_data as market


@pytest.fixture(autouse=True)
def _iso(monkeypatch):
    monkeypatch.setattr(market, "WEEKEND_CLOSE_FILTER", True)
    monkeypatch.setattr(market, "CANDLE_DISK", None)
    monkeypatch.setattr(market, "_cache", {})
    monkeypatch.setattr(market, "_quote_marks", {})
    monkeypatch.setattr(market, "_load_symbol_from_disk", lambda s: None)


def _ts(s: str) -> float:
    return datetime.fromisoformat(s).replace(tzinfo=timezone.utc).timestamp()


def _bar(t: str, c: float) -> dict:
    return {"time": int(_ts(t)), "open": c, "high": c, "low": c, "close": c, "volume": None}


def test_small_change_is_patched():
    """A small change (0.05%) is still patched: close, high, low updated, no stale_mismatch."""
    # Last candle close at 1.0975, quote at 1.0980 (0.045% diff)
    market._quote_marks["EURUSD"] = (_ts("2026-01-15 10:10:00"), 1.0980)
    candles = [
        _bar("2026-01-15 09:45:00", 1.0970),
        _bar("2026-01-15 10:00:00", 1.0975),
    ]
    rows, meta = market._with_newest_close("EURUSD", "15m", candles, {"as_of": _ts("2026-01-15 10:05:00")})
    assert rows[-1]["close"] == 1.0980
    assert rows[-1]["high"] == 1.0980
    assert rows[-1]["low"] == 1.0975
    assert "stale_mismatch" not in meta


def test_big_mismatch_leaves_candles_unchanged():
    """A big mismatch leaves candles unchanged with stale_mismatch=True and mismatch_price."""
    # Last candle close at ~1.0975, quote at 1.0850 (big jump ~1.1%)
    market._quote_marks["EURUSD"] = (_ts("2026-01-15 10:10:00"), 1.0850)
    candles = [
        _bar("2026-01-15 09:45:00", 1.0970),
        _bar("2026-01-15 10:00:00", 1.0975),
    ]
    rows, meta = market._with_newest_close("EURUSD", "15m", candles, {"as_of": _ts("2026-01-15 10:05:00")})
    assert rows[-1]["close"] == 1.0975  # unchanged
    assert meta["stale_mismatch"] is True
    assert meta["mismatch_price"] == 1.0850


def test_no_newer_price_unchanged():
    """With no newer price, candles unchanged and flag absent."""
    candles = [
        _bar("2026-01-15 09:45:00", 1.0970),
        _bar("2026-01-15 10:00:00", 1.0975),
    ]
    rows, meta = market._with_newest_close("EURUSD", "15m", candles, {"as_of": _ts("2026-01-15 10:05:00")})
    assert rows[-1]["close"] == 1.0975
    assert "stale_mismatch" not in meta


def test_mismatch_threshold_calculation():
    """Test _mismatch_threshold helper with various ranges."""
    # 20 candles with range 0.001 and close 1.0
    candles_20_range_001 = [
        {"time": int(_ts("2026-01-15 09:00:00")) + i * 900, "open": 1.0, "high": 1.001, "low": 0.999, "close": 1.0, "volume": None}
        for i in range(20)
    ]
    threshold = market._mismatch_threshold(candles_20_range_001)
    # avg_range = 0.002, 3 * avg_range = 0.006, 0.003 * 1.0 = 0.003 -> max = 0.006
    assert abs(threshold - 0.006) < 1e-10

    # With range 0.01
    candles_20_range_01 = [
        {"time": int(_ts("2026-01-15 09:00:00")) + i * 900, "open": 1.0, "high": 1.01, "low": 0.99, "close": 1.0, "volume": None}
        for i in range(20)
    ]
    threshold = market._mismatch_threshold(candles_20_range_01)
    # avg_range = 0.02, 3 * avg_range = 0.06, 0.003 * 1.0 = 0.003 -> max = 0.06
    assert abs(threshold - 0.06) < 1e-10


def test_single_candle_range_zero():
    """A single candle with high == low (range 0) gives threshold of 0.003 * close."""
    candles = [_bar("2026-01-15 10:00:00", 1.0)]
    threshold = market._mismatch_threshold(candles)
    # avg_range = 0, 3 * 0 = 0, 0.003 * 1.0 = 0.003 -> max = 0.003
    assert threshold == 0.003