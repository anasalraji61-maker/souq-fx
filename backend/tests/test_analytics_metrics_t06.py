"""
Tests for Analytics Metrics Module — Task T06a
"""

import pytest

from backend.analytics_metrics import (
    equity_curve,
    win_rate,
    profit_factor,
    sharpe_ratio,
    max_drawdown,
    summary,
)


def _trades(pnls, start="2026-01-01T00:00:00Z"):
    """Build trade dicts with sequential closed_at timestamps."""
    return [
        {
            "symbol": "EURUSD",
            "timeframe": "1H",
            "pnl": pnl,
            "closed_at": f"2026-01-0{1 + i}T00:00:00Z",
        }
        for i, pnl in enumerate(pnls)
    ]


# --- equity_curve -----------------------------------------------------------


def test_equity_curve_basic():
    """pnls [10, -5, 20] with start 100 give [110, 105, 125]."""
    trades = _trades([10, -5, 20])
    assert equity_curve(trades, 100) == [110.0, 105.0, 125.0]


def test_equity_curve_unsorted_input_ordering():
    """Unsorted closed_at input is ordered by closed_at before cumulation."""
    trades = [
        {"symbol": "EURUSD", "timeframe": "1H", "pnl": 20.0, "closed_at": "2026-01-03T00:00:00Z"},
        {"symbol": "EURUSD", "timeframe": "1H", "pnl": -5.0, "closed_at": "2026-01-01T00:00:00Z"},
        {"symbol": "EURUSD", "timeframe": "1H", "pnl": 10.0, "closed_at": "2026-01-02T00:00:00Z"},
    ]
    # closed_at order: -5, +10, +20 => 95, 105, 125
    assert equity_curve(trades, 100) == [95.0, 105.0, 125.0]


def test_equity_curve_empty():
    """Empty input gives []."""
    assert equity_curve([], 100) == []


def test_equity_curve_defaults_start_zero():
    """Default starting_equity is 0.0."""
    trades = _trades([10, -5, 20])
    assert equity_curve(trades) == [10.0, 5.0, 25.0]


def test_equity_curve_input_not_mutated():
    """Sorting a copy must not mutate the input list."""
    original = [
        {"pnl": 20.0, "closed_at": "2026-01-03T00:00:00Z"},
        {"pnl": 10.0, "closed_at": "2026-01-01T00:00:00Z"},
    ]
    original_copy = list(original)
    equity_curve(original)
    assert original == original_copy


def test_equity_curve_missing_symbol_timeframe_ignored():
    """Missing symbol/timeframe keys are tolerated (defaults only affect
    other consumers; equity_curve only needs pnl and closed_at)."""
    trades = [
        {"pnl": 5.0, "closed_at": "2026-01-01T00:00:00Z"},
        {"pnl": 5.0, "closed_at": "2026-01-02T00:00:00Z"},
    ]
    assert equity_curve(trades, 0.0) == [5.0, 10.0]


# --- win_rate ---------------------------------------------------------------


def test_win_rate_basic():
    """[10, -5, 20, 0] gives 50.0 (zero pnl is not a win)."""
    assert win_rate(_trades([10, -5, 20, 0])) == 50.0


def test_win_rate_empty():
    """Empty input gives 0.0."""
    assert win_rate([]) == 0.0


def test_win_rate_all_wins():
    assert win_rate(_trades([1, 2, 3])) == 100.0


# --- profit_factor ----------------------------------------------------------


def test_profit_factor_basic():
    """[10, -5, 20, -5] gives 30 / 10 = 3.0."""
    assert profit_factor(_trades([10, -5, 20, -5])) == 3.0


def test_profit_factor_all_wins_inf():
    """All wins gives float('inf')."""
    assert profit_factor(_trades([10, 20])) == float("inf")


def test_profit_factor_all_losses():
    """All losses gives 0.0."""
    assert profit_factor(_trades([-5, -10])) == 0.0


def test_profit_factor_empty():
    """Empty input gives 0.0."""
    assert profit_factor([]) == 0.0


def test_profit_factor_all_zero_pnl():
    """All pnl == 0 gives 0.0."""
    assert profit_factor(_trades([0, 0, 0])) == 0.0


# --- sharpe_ratio -----------------------------------------------------------


def test_sharpe_ratio_basic():
    """[1, 2, 3]: mean 2, sample stdev 1 => 2.0."""
    assert sharpe_ratio(_trades([1, 2, 3])) == pytest.approx(2.0)


def test_sharpe_ratio_single_trade():
    """A single trade gives 0.0."""
    assert sharpe_ratio(_trades([5])) == 0.0


def test_sharpe_ratio_all_equal_pnls():
    """All equal pnls have stdev 0 => 0.0."""
    assert sharpe_ratio(_trades([7, 7, 7])) == 0.0


def test_sharpe_ratio_empty():
    """Empty input gives 0.0."""
    assert sharpe_ratio([]) == 0.0


def test_sharpe_ratio_risk_free_offset():
    """risk_free shifts the mean: [1,2,3] with risk_free=1 => 1.0."""
    assert sharpe_ratio(_trades([1, 2, 3]), risk_free=1.0) == pytest.approx(1.0)


# --- max_drawdown -----------------------------------------------------------


def test_max_drawdown_basic():
    """[10, -30, 5, -5, 40] with start 100: peak 110, trough 80.
    max_drawdown == 30, pct ~ 27.27."""
    dd = max_drawdown(_trades([10, -30, 5, -5, 40]), 100)
    assert dd["max_drawdown"] == 30.0
    assert dd["max_drawdown_pct"] == pytest.approx(30.0 / 110.0 * 100.0)


def test_max_drawdown_no_losses():
    """Monotonic equity gains give 0 drawdown."""
    dd = max_drawdown(_trades([10, 20, 30]), 100)
    assert dd == {"max_drawdown": 0.0, "max_drawdown_pct": 0.0}


def test_max_drawdown_initial_loss():
    """Initial loss [-10] with start 100: peak starts at 100, so the
    drawdown is 10 and the pct is 10.0."""
    dd = max_drawdown(_trades([-10]), 100)
    assert dd["max_drawdown"] == 10.0
    assert dd["max_drawdown_pct"] == 10.0


def test_max_drawdown_empty():
    """Empty input gives zeros."""
    assert max_drawdown([], 100) == {"max_drawdown": 0.0, "max_drawdown_pct": 0.0}


def test_max_drawdown_pct_zero_when_peak_not_positive():
    """With start 0 and a loss, the peak never goes positive, so the
    percentage must be 0.0."""
    dd = max_drawdown(_trades([-5]), 0.0)
    assert dd["max_drawdown_pct"] == 0.0


# --- summary ----------------------------------------------------------------


def test_summary_has_all_keys():
    s = summary(_trades([10, -5, 20, -5]))
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
    assert s["estimated"] is False


def test_summary_profit_factor_none_when_no_losses():
    """Infinite profit_factor is replaced with None in summary only."""
    trades = _trades([10, 20])
    s = summary(trades, 100)
    assert s["profit_factor"] is None
    # The raw function still returns inf
    assert profit_factor(trades) == float("inf")


def test_summary_total_trades_correct():
    s = summary(_trades([1, 2, 3, 4, 5]), 100)
    assert s["total_trades"] == 5
    assert s["total_pnl"] == pytest.approx(15.0)


def test_summary_empty():
    s = summary([], 100)
    assert s["total_trades"] == 0
    assert s["total_pnl"] == 0.0
    assert s["win_rate"] == 0.0
    assert s["profit_factor"] == 0.0
    assert s["sharpe"] == 0.0
    assert s["max_drawdown"] == 0.0
    assert s["max_drawdown_pct"] == 0.0
    assert s["equity_curve"] == []
    assert s["estimated"] is False
