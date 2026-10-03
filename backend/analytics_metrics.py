"""
Analytics Metrics Module — Task T06a
MATRIX Platform Trading Performance Analytics

Pure functions computing performance metrics from a list of closed trades.
Each trade is a dict with keys:
    symbol    (str)   trade symbol, defaults to "UNKNOWN"
    timeframe (str)   time-frame label, defaults to "UNKNOWN"
    pnl       (float) realised profit/loss for the trade
    closed_at (str)   ISO 8601 close timestamp (used for ordering)

Computes:
1. Equity curve (cumulative PnL over time)
2. Win rate
3. Profit factor
4. Sharpe ratio (non-annualised)
5. Maximum drawdown (absolute and percent)
"""

from __future__ import annotations

import statistics


def _sorted_trades(trades: list[dict]) -> list[dict]:
    """Return a copy of trades stably sorted by closed_at (ISO 8601)."""
    return sorted(trades, key=lambda t: t.get("closed_at", ""))


def _pnls(trades: list[dict]) -> list[float]:
    """Return the pnl values of trades, in closed_at order."""
    return [float(t.get("pnl", 0.0)) for t in _sorted_trades(trades)]


def equity_curve(trades: list[dict], starting_equity: float = 0.0) -> list[float]:
    """
    Calculate the cumulative equity after each trade, in closed_at order.

    Args:
        trades: List of closed-trade dicts
        starting_equity: Equity before the first trade (default: 0.0)

    Returns:
        List of equity values, one per trade. Empty list for empty input.
    """
    if not trades:
        return []

    curve: list[float] = []
    equity = starting_equity
    for pnl in _pnls(trades):
        equity += pnl
        curve.append(equity)
    return curve


def win_rate(trades: list[dict]) -> float:
    """
    Calculate the percentage of trades with positive PnL.

    Args:
        trades: List of closed-trade dicts

    Returns:
        Win rate percentage from 0 to 100. 0.0 for empty input.
    """
    if not trades:
        return 0.0

    pnls = _pnls(trades)
    wins = sum(1 for pnl in pnls if pnl > 0)
    return wins / len(pnls) * 100.0


def profit_factor(trades: list[dict]) -> float:
    """
    Calculate the profit factor: gross profit divided by gross loss.

    Args:
        trades: List of closed-trade dicts

    Returns:
        Gross profit / abs(gross loss).
        float("inf") if there are no losses but there is profit.
        0.0 if there are no trades or all pnl is 0.
    """
    if not trades:
        return 0.0

    gross_profit = sum(pnl for pnl in _pnls(trades) if pnl > 0)
    gross_loss = abs(sum(pnl for pnl in _pnls(trades) if pnl < 0))

    if gross_loss == 0:
        return float("inf") if gross_profit > 0 else 0.0

    return gross_profit / gross_loss


def sharpe_ratio(trades: list[dict], risk_free: float = 0.0) -> float:
    """
    Calculate the Sharpe ratio (non-annualised) from trade PnL.

    Args:
        trades: List of closed-trade dicts
        risk_free: Risk-free return per trade (default: 0.0)

    Returns:
        (mean(pnl) - risk_free) / stdev(pnl), using the sample
        standard deviation. 0.0 for fewer than 2 trades or zero stdev.
    """
    pnls = _pnls(trades)
    if len(pnls) < 2:
        return 0.0

    stdev = statistics.stdev(pnls)
    if stdev == 0:
        return 0.0

    return (statistics.mean(pnls) - risk_free) / stdev


def max_drawdown(trades: list[dict], starting_equity: float = 0.0) -> dict:
    """
    Calculate the largest peak-to-trough drop of the equity curve.

    The peak starts at starting_equity, so an initial loss counts as a
    drawdown.

    Args:
        trades: List of closed-trade dicts
        starting_equity: Equity before the first trade (default: 0.0)

    Returns:
        {"max_drawdown": float, "max_drawdown_pct": float}
        max_drawdown is the largest drop as a positive number.
        max_drawdown_pct is the drop divided by the peak times 100;
        0.0 if the peak is <= 0. Zeros for empty input.
    """
    result = {"max_drawdown": 0.0, "max_drawdown_pct": 0.0}
    if not trades:
        return result

    peak = starting_equity
    for value in equity_curve(trades, starting_equity):
        if value > peak:
            peak = value
        drop = peak - value
        if drop > result["max_drawdown"]:
            result["max_drawdown"] = drop
            result["max_drawdown_pct"] = drop / peak * 100.0 if peak > 0 else 0.0
    return result


def summary(trades: list[dict], starting_equity: float = 0.0) -> dict:
    """
    Calculate the full performance summary for a list of closed trades.

    Args:
        trades: List of closed-trade dicts
        starting_equity: Equity before the first trade (default: 0.0)

    Returns:
        Dict with keys: total_trades, total_pnl, win_rate, profit_factor,
        sharpe, max_drawdown, max_drawdown_pct, equity_curve, estimated.
        An infinite profit_factor is replaced with None so the result
        stays JSON-safe.
    """
    pnls = _pnls(trades)
    total_pnl = sum(pnls) if pnls else 0.0

    p_factor = profit_factor(trades)
    dd = max_drawdown(trades, starting_equity)

    return {
        "total_trades": len(trades),
        "total_pnl": total_pnl,
        "win_rate": win_rate(trades),
        "profit_factor": None if p_factor == float("inf") else p_factor,
        "sharpe": sharpe_ratio(trades),
        "max_drawdown": dd["max_drawdown"],
        "max_drawdown_pct": dd["max_drawdown_pct"],
        "equity_curve": equity_curve(trades, starting_equity),
        "estimated": False,
    }
