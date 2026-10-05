"""
Adapter functions that translate between the frontend (src/api/analysis.ts)
request/response shapes and the legacy backend shapes.

This module keeps routers_analysis.py thin: the router delegates the
frontend-facing translation work here. Each adapter returns a value that can
be returned directly as a JSON response.

Contract rules (T27a):
* /order-flow: the frontend sends `symbol` and `timeframe` plus numeric candle
  `time` values, and expects a *bare JSON list* of bars. The legacy tests only
  send `candles` (no symbol/timeframe, with string/absent time) and expect the
  old dict shape. To keep both sides happy, order_flow_response returns the
  list form only when the request looks like a frontend call, i.e. it contains
  `symbol` or `timeframe` OR any candle has a numeric `time`. Otherwise it
  returns the legacy dict.
* /var: the frontend sends `trades` + `equity`; the legacy API sends `returns`.
  We accept both. When `trades` is supplied we derive returns = pnl/equity.
  The response is augmented with `confidence_95`/`confidence_99` blocks while
  keeping all legacy keys.
* /correlation: the frontend expects `symbols` (list) and `matrix` as a
  dict-of-dicts with 1.0 on the diagonal. The legacy call returns `matrix` as a
  nested list. We add the dict-of-dicts version under `matrix_dict` and keep the
  nested-list `matrix` for old tests, while still exposing `symbols`.
* /stress-test: the frontend POSTs `{trades, equity}` and expects a *bare JSON
  list* of `StressScenarioResult` (name, shock_pct, estimated_pnl,
  projected_equity, equity_impact_pct, status). The legacy API accepts
  `{positions, shocks}` and returns `{scenarios, total_notional, estimated}`.
  When `trades` is non-empty we translate trades -> positions, run the legacy
  stress_test, and reshape the result into the frontend list; otherwise the
  legacy dict path is unchanged.
"""
from __future__ import annotations

from typing import Any

import analytics_metrics

ESTIMATED_LABEL = "تقديري"


# ─── Order Flow ──────────────────────────────────────────────────────────────

def order_flow_response(
    candles: list[dict],
    raw: dict,
    symbol: str | None,
    timeframe: str | None,
) -> Any:
    """Build the response for POST /order-flow.

    If the request carries the frontend fields (`symbol`, `timeframe`) or any
    candle has a numeric `time`, return a bare JSON list of bars matching the
    frontend `OrderFlowBar` interface. Otherwise return the legacy dict so the
    existing tests (which assert `estimated`, `bars`, `divergence`) stay green.
    """
    frontend_request = bool(symbol) or bool(timeframe)
    if not frontend_request:
        # numeric time => frontend call (the legacy tests send no/None time)
        for c in candles:
            t = c.get("time")
            if isinstance(t, (int, float)) and not isinstance(t, bool):
                frontend_request = True
                break

    if not frontend_request:
        # Legacy path — return the dict that existing tests expect.
        return raw

    bars: list[dict] = []
    cvd = 0.0
    raw_bars = raw.get("bars", [])
    for i, c in enumerate(candles):
        src = raw_bars[i] if i < len(raw_bars) else {}
        cvd += src.get("delta", 0.0)
        buy = src.get("buy_volume", 0.0)
        sell = src.get("sell_volume", 0.0)
        delta = src.get("delta", buy - sell)
        volume = c.get("volume", 0.0) or 0.0
        if volume > 0:
            imbalance = round((buy - sell) / volume * 100, 6)
        else:
            imbalance = 0.0
        bars.append({
            "time": c.get("time"),
            "close": c.get("close"),
            "delta": delta,
            "cumulative_delta": round(cvd, 6),
            "buy_volume": buy,
            "sell_volume": sell,
            "imbalance_pct": imbalance,
            "label": ESTIMATED_LABEL,
        })
    return bars


# ─── VaR ─────────────────────────────────────────────────────────────────────

def var_trade_returns(trades: list[dict], equity: float) -> list[float]:
    """Derive per-trade returns from `pnl`/`equity`."""
    out: list[float] = []
    denom = equity if equity else 10000.0
    for t in trades:
        pnl = t.get("pnl", 0.0)
        try:
            out.append(float(pnl) / denom)
        except (TypeError, ZeroDivisionError):
            out.append(0.0)
    return out


def var_response(equity: float, returns: list[float], raw: dict) -> dict:
    """Merge the legacy ``var_report`` dict with the frontend-shaped blocks.

    The frontend expects:
        equity, confidence_95{var_pct,var_amount,cvar_pct,cvar_amount},
        confidence_99{...}, sample_size

    The legacy dict has keys: var_95, var_99, cvar_95, cvar_99, n, etc.
    We keep all of them and add the new blocks.
    """
    var_95 = float(raw.get("var_95", 0.0))
    var_99 = float(raw.get("var_99", 0.0))
    cvar_95 = float(raw.get("cvar_95", 0.0))
    cvar_99 = float(raw.get("cvar_99", 0.0))

    result = dict(raw)
    result["equity"] = equity
    result["sample_size"] = int(raw.get("n", len(returns)))

    result["confidence_95"] = {
        "var_pct": round(var_95 * 100, 6),
        "var_amount": round(var_95 * equity, 6),
        "cvar_pct": round(cvar_95 * 100, 6),
        "cvar_amount": round(cvar_95 * equity, 6),
    }
    result["confidence_99"] = {
        "var_pct": round(var_99 * 100, 6),
        "var_amount": round(var_99 * equity, 6),
        "cvar_pct": round(cvar_99 * 100, 6),
        "cvar_amount": round(cvar_99 * equity, 6),
    }
    return result


# ─── Stress Test ───────────────────────────────────────────────────────────────

def trades_to_positions(trades: list[dict]) -> list[dict]:
    """Translate frontend trade dicts into legacy ``position`` dicts.

    Each trade contributes a position:
        symbol  <- trade.symbol
        side    <- direction if it is "buy" or "sell", else "buy"
        units   <- lots * 100000
        price   <- entry_price

    Trades with units <= 0 or price <= 0 are skipped.
    """
    positions: list[dict] = []
    for t in trades:
        symbol = t.get("symbol")
        direction = t.get("direction", "")
        side = direction if direction in ("buy", "sell") else "buy"
        lots = t.get("lots", 0)
        try:
            units = float(lots) * 100000
            price = float(t.get("entry_price", 0))
        except (TypeError, ValueError):
            units = 0.0
            price = 0.0
        if units <= 0 or price <= 0 or not symbol:
            continue
        positions.append({
            "symbol": symbol,
            "side": side,
            "units": units,
            "price": price,
        })
    return positions


def stress_test_response(equity: float, raw: dict) -> list[dict]:
    """Reshape a legacy stress_test dict into the frontend list.

    The frontend expects one item per scenario:
        name, shock_pct, estimated_pnl, projected_equity,
        equity_impact_pct, status

    where ``shock_pct = shock * 100`` and ``status`` follows the impact level.
    """
    scenarios = raw.get("scenarios", [])
    out: list[dict] = []
    for sc in scenarios:
        shock = float(sc.get("shock", 0.0))
        pnl = float(sc.get("pnl", 0.0))

        shock_pct = round(shock * 100, 6)
        sign = "+" if shock_pct >= 0 else ""
        name = f"Shock {sign}{shock_pct}%"

        estimated_pnl = round(pnl, 2)
        projected_equity = round(max(0.0, equity + pnl), 2)
        if equity <= 0:
            equity_impact_pct = 0.0
        else:
            equity_impact_pct = round(pnl / equity * 100, 2)

        if equity_impact_pct < -15:
            status = "DANGER"
        elif equity_impact_pct < -5:
            status = "WARNING"
        else:
            status = "STABLE"

        out.append({
            "name": name,
            "shock_pct": shock_pct,
            "estimated_pnl": estimated_pnl,
            "projected_equity": projected_equity,
            "equity_impact_pct": equity_impact_pct,
            "status": status,
        })
    return out


# ─── Performance ─────────────────────────────────────────────────────────────

_TIMEFRAME_TAGS = ("1m", "5m", "15m", "1h", "4h", "1D")


def _timeframe_of(trade: dict) -> str:
    """First tag in the known timeframe list, else the default '1h'."""
    tags = trade.get("tags") or []
    for tag in tags:
        if tag in _TIMEFRAME_TAGS:
            return tag
    return "1h"


def performance_response(trades: list[dict], initial_balance: float) -> dict:
    """Build the frontend ``PerformanceResult`` from journal-shaped trades.

    Trades are dicts with ``pnl`` required and optional ``date`` / ``tags`` /
    ``symbol`` (default "UNKNOWN"). Trades are sorted by ``date`` ascending
    (stable) before building the equity curve.
    """
    sorted_trades = sorted(trades, key=lambda t: t.get("date") or "")
    pnls = [float(t.get("pnl", 0.0)) for t in sorted_trades]

    current_equity = initial_balance + sum(pnls)
    winning = sum(1 for p in pnls if p > 0)
    losing = sum(1 for p in pnls if p < 0)
    total = len(pnls)

    if total == 0:
        win_rate = 0.0
        profit_factor = 99.9
        sharpe = 0.0
    else:
        win_rate = round(winning / total * 100, 1)
        gross_profit = sum(p for p in pnls if p > 0)
        gross_loss = abs(sum(p for p in pnls if p < 0))
        profit_factor = round(gross_profit / gross_loss, 2) if gross_loss > 0 else 99.9

    if len(pnls) >= 2:
        mean_pnl = sum(pnls) / len(pnls)
        variance = sum((p - mean_pnl) ** 2 for p in pnls) / len(pnls)
        pstdev = variance ** 0.5
        divisor = pstdev if pstdev > 0 else 1.0
        sharpe = round(mean_pnl / divisor * (252 ** 0.5), 2)
    else:
        sharpe = 0.0

    # max_drawdown: reuse the legacy peak-to-trough computation, but feed it
    # the ``date`` field so the curve follows the frontend sort order.
    dd_input = [{**t, "closed_at": t.get("date") or ""} for t in sorted_trades]
    dd = analytics_metrics.max_drawdown(dd_input, initial_balance)
    max_drawdown_usd = round(float(dd.get("max_drawdown", 0.0)), 2)
    max_drawdown_pct = round(float(dd.get("max_drawdown_pct", 0.0)), 2)

    first_date = sorted_trades[0].get("date") or "" if sorted_trades else ""
    equity_curve: list[dict] = [
        {"trade_num": 0, "equity": round(initial_balance, 2), "pnl": 0, "date": first_date}
    ]
    equity = initial_balance
    for i, (t, pnl) in enumerate(zip(sorted_trades, pnls), start=1):
        equity += pnl
        equity_curve.append({
            "trade_num": i,
            "equity": round(equity, 2),
            "pnl": pnl,
            "date": t.get("date") or "",
        })

    def group_by(key_fn):
        groups: dict[str, dict] = {}
        for t in sorted_trades:
            key = key_fn(t)
            g = groups.setdefault(key, {"trades": 0, "pnl": 0.0, "wins": 0})
            g["trades"] += 1
            g["pnl"] += float(t.get("pnl", 0.0))
            if float(t.get("pnl", 0.0)) > 0:
                g["wins"] += 1
        result: dict[str, dict] = {}
        for key in sorted(groups):
            g = groups[key]
            result[key] = {
                "trades": g["trades"],
                "pnl": round(g["pnl"], 2),
                "win_rate": round(g["wins"] / g["trades"] * 100) if g["trades"] else 0,
            }
        return result

    return {
        "initial_balance": initial_balance,
        "current_equity": round(current_equity, 2),
        "total_trades": total,
        "winning_trades": winning,
        "losing_trades": losing,
        "win_rate": win_rate,
        "profit_factor": profit_factor,
        "sharpe_ratio": sharpe,
        "max_drawdown_pct": max_drawdown_pct,
        "max_drawdown_usd": max_drawdown_usd,
        "equity_curve": equity_curve,
        "by_symbol": group_by(lambda t: t.get("symbol") or "UNKNOWN"),
        "by_timeframe": group_by(_timeframe_of),
    }


# ─── Correlation ─────────────────────────────────────────────────────────────

def correlation_response(raw: dict) -> dict:
    """Return the correlation response with a dict-of-dicts matrix.

    The legacy ``correlation_matrix`` returns:
        {symbols: [...], matrix: [[...]], estimated: True}

    The frontend expects `matrix` as a dict-of-dicts (record of records) with
    1.0 on the diagonal. To avoid breaking the existing tests (which assert
    `matrix[0][0]`), we keep the nested-list `matrix` AND add `matrix_dict`.
    """
    symbols: list[str] = list(raw.get("symbols", []))
    nested = raw.get("matrix", [])

    # Build dict-of-dicts, forcing the diagonal to 1.0.
    matrix_dict: dict[str, dict[str, float]] = {}
    for i, s in enumerate(symbols):
        matrix_dict[s] = {}
        row = nested[i] if i < len(nested) else []
        for j, t in enumerate(symbols):
            if i == j:
                matrix_dict[s][t] = 1.0
            else:
                val = row[j] if j < len(row) else 0.0
                matrix_dict[s][t] = float(val)

    result = dict(raw)
    result["matrix_dict"] = matrix_dict
    return result
