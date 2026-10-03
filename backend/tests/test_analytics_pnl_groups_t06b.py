"""
Tests for P&L grouped by symbol / timeframe — Task T06b
"""

import json

import pytest

from backend.analytics_metrics import (
    pnl_by_symbol,
    pnl_by_timeframe,
    summary,
    profit_factor,
)


# --- pnl_by_symbol ----------------------------------------------------------


def test_pnl_by_symbol_basic_totals_and_counts():
    """EURUSD: +10 and -4 (total 6.0, 2 trades, win_rate 50.0).
    XAUUSD: +5 (total 5.0, 1 trade, win_rate 100.0)."""
    trades = [
        {"symbol": "EURUSD", "timeframe": "M5", "pnl": 10.0, "closed_at": "2026-01-01T00:00:00Z"},
        {"symbol": "EURUSD", "timeframe": "M5", "pnl": -4.0, "closed_at": "2026-01-02T00:00:00Z"},
        {"symbol": "XAUUSD", "timeframe": "H1", "pnl": 5.0, "closed_at": "2026-01-03T00:00:00Z"},
    ]
    result = pnl_by_symbol(trades)
    assert result["EURUSD"]["total_pnl"] == 6.0
    assert result["EURUSD"]["trades"] == 2
    # win_rate returns a percentage (0-100)
    assert result["EURUSD"]["win_rate"] == 50.0
    assert result["XAUUSD"]["total_pnl"] == 5.0
    assert result["XAUUSD"]["trades"] == 1
    assert result["XAUUSD"]["win_rate"] == 100.0


def test_pnl_by_symbol_profit_factor():
    """EURUSD (+10, -4): profit_factor = 10 / 4 = 2.5."""
    trades = [
        {"symbol": "EURUSD", "timeframe": "M5", "pnl": 10.0, "closed_at": "2026-01-01T00:00:00Z"},
        {"symbol": "EURUSD", "timeframe": "M5", "pnl": -4.0, "closed_at": "2026-01-02T00:00:00Z"},
        {"symbol": "XAUUSD", "timeframe": "H1", "pnl": 5.0, "closed_at": "2026-01-03T00:00:00Z"},
    ]
    result = pnl_by_symbol(trades)
    assert result["EURUSD"]["profit_factor"] == 2.5
    assert result["XAUUSD"]["profit_factor"] is None  # only winners => inf => None


def test_pnl_by_symbol_only_winners_profit_factor_none():
    """A group with only winners gives profit_factor None (not inf)."""
    trades = [
        {"symbol": "XAUUSD", "timeframe": "H1", "pnl": 5.0, "closed_at": "2026-01-01T00:00:00Z"},
        {"symbol": "XAUUSD", "timeframe": "H1", "pnl": 3.0, "closed_at": "2026-01-02T00:00:00Z"},
    ]
    result = pnl_by_symbol(trades)
    assert result["XAUUSD"]["profit_factor"] is None
    # raw function still returns inf
    assert profit_factor(trades) == float("inf")


def test_pnl_by_symbol_only_losers():
    """A group with only losers gives win_rate 0 and profit_factor 0."""
    trades = [
        {"symbol": "EURUSD", "timeframe": "M5", "pnl": -5.0, "closed_at": "2026-01-01T00:00:00Z"},
        {"symbol": "EURUSD", "timeframe": "M5", "pnl": -10.0, "closed_at": "2026-01-02T00:00:00Z"},
    ]
    result = pnl_by_symbol(trades)
    assert result["EURUSD"]["win_rate"] == 0.0
    assert result["EURUSD"]["profit_factor"] == 0.0
    assert result["EURUSD"]["total_pnl"] == -15.0


# --- pnl_by_timeframe -------------------------------------------------------


def test_pnl_by_timeframe_basic():
    """M5 and H1 groups are correct."""
    trades = [
        {"symbol": "EURUSD", "timeframe": "H1", "pnl": 10.0, "closed_at": "2026-01-01T00:00:00Z"},
        {"symbol": "EURUSD", "timeframe": "H1", "pnl": -4.0, "closed_at": "2026-01-02T00:00:00Z"},
        {"symbol": "XAUUSD", "timeframe": "M5", "pnl": 5.0, "closed_at": "2026-01-03T00:00:00Z"},
    ]
    result = pnl_by_timeframe(trades)
    assert result["H1"]["total_pnl"] == 6.0
    assert result["H1"]["trades"] == 2
    assert result["H1"]["win_rate"] == 50.0
    assert result["M5"]["total_pnl"] == 5.0
    assert result["M5"]["trades"] == 1
    assert result["M5"]["win_rate"] == 100.0


# --- unknown defaults -------------------------------------------------------


def test_pnl_by_symbol_unknown_default():
    """A missing symbol key goes to the 'UNKNOWN' group."""
    trades = [
        {"timeframe": "M5", "pnl": 5.0, "closed_at": "2026-01-01T00:00:00Z"},
        {"symbol": "EURUSD", "timeframe": "M5", "pnl": 10.0, "closed_at": "2026-01-02T00:00:00Z"},
    ]
    result = pnl_by_symbol(trades)
    assert "UNKNOWN" in result
    assert result["UNKNOWN"]["total_pnl"] == 5.0
    assert result["EURUSD"]["total_pnl"] == 10.0


def test_pnl_by_timeframe_unknown_default():
    """A missing timeframe key goes to the 'UNKNOWN' group."""
    trades = [
        {"symbol": "EURUSD", "pnl": 3.0, "closed_at": "2026-01-01T00:00:00Z"},
        {"symbol": "XAUUSD", "timeframe": "M5", "pnl": 7.0, "closed_at": "2026-01-02T00:00:00Z"},
    ]
    result = pnl_by_timeframe(trades)
    assert "UNKNOWN" in result
    assert result["UNKNOWN"]["total_pnl"] == 3.0
    assert result["M5"]["total_pnl"] == 7.0


# --- empty / sorting --------------------------------------------------------


def test_pnl_by_symbol_empty():
    """Empty list returns {}."""
    assert pnl_by_symbol([]) == {}


def test_pnl_by_timeframe_empty():
    """Empty list returns {}."""
    assert pnl_by_timeframe([]) == {}


def test_pnl_by_symbol_keys_sorted_alphabetically():
    """Keys are sorted alphabetically."""
    trades = [
        {"symbol": "ZEB USD", "timeframe": "H1", "pnl": 1.0, "closed_at": "2026-01-01T00:00:00Z"},
        {"symbol": "AAA USD", "timeframe": "H1", "pnl": 2.0, "closed_at": "2026-01-02T00:00:00Z"},
        {"symbol": "MID USD", "timeframe": "H1", "pnl": 3.0, "closed_at": "2026-01-03T00:00:00Z"},
    ]
    result = pnl_by_symbol(trades)
    assert list(result.keys()) == ["AAA USD", "MID USD", "ZEB USD"]


# --- summary integration ----------------------------------------------------


def test_summary_contains_by_symbol_and_by_timeframe():
    """summary(trades) contains by_symbol and by_timeframe keys."""
    trades = [
        {"symbol": "EURUSD", "timeframe": "M5", "pnl": 10.0, "closed_at": "2026-01-01T00:00:00Z"},
        {"symbol": "EURUSD", "timeframe": "M5", "pnl": -5.0, "closed_at": "2026-01-02T00:00:00Z"},
        {"symbol": "XAUUSD", "timeframe": "H1", "pnl": 20.0, "closed_at": "2026-01-03T00:00:00Z"},
    ]
    s = summary(trades, 100)
    assert "by_symbol" in s
    assert "by_timeframe" in s
    assert s["by_symbol"] == pnl_by_symbol(trades)
    assert s["by_timeframe"] == pnl_by_timeframe(trades)


def test_summary_existing_keys_unchanged():
    """Existing summary keys are unchanged."""
    trades = [
        {"symbol": "EURUSD", "timeframe": "M5", "pnl": 10.0, "closed_at": "2026-01-01T00:00:00Z"},
        {"symbol": "EURUSD", "timeframe": "M5", "pnl": -5.0, "closed_at": "2026-01-02T00:00:00Z"},
    ]
    s = summary(trades, 100)
    for key in (
        "total_trades",
        "total_pnl",
        "win_rate",
        "profit_factor",
        "sharpe",
        "max_drawdown",
        "max_drawdown_pct",
        "equity_curve",
        "estimated",
    ):
        assert key in s
    assert s["total_trades"] == 2
    assert s["total_pnl"] == 5.0
    assert s["estimated"] is False


def test_summary_json_serializable():
    """json.dumps(summary(...)) works (no inf/nan)."""
    trades = [
        {"symbol": "EURUSD", "timeframe": "M5", "pnl": 10.0, "closed_at": "2026-01-01T00:00:00Z"},
        {"symbol": "XAUUSD", "timeframe": "H1", "pnl": 5.0, "closed_at": "2026-01-02T00:00:00Z"},
        {"symbol": "XAUUSD", "timeframe": "H1", "pnl": 3.0, "closed_at": "2026-01-03T00:00:00Z"},
    ]
    s = summary(trades, 100)
    encoded = json.dumps(s)
    decoded = json.loads(encoded)
    # by_symbol's XAUUSD group (only winners) must be None, not inf
    assert decoded["by_symbol"]["XAUUSD"]["profit_factor"] is None
    assert decoded["by_symbol"]["EURUSD"]["profit_factor"] is None
    assert decoded["by_timeframe"]["H1"]["profit_factor"] is None
    assert decoded["by_timeframe"]["M5"]["profit_factor"] is None
