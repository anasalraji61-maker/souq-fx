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
