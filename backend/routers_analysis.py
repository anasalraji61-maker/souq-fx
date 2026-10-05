"""
Stateless read-only analytics API router — Task T07a
MATRIX Platform Quantitative Analysis Endpoints

Exposes pure functions from order_flow, portfolio_risk, and analytics_metrics
through thin HTTP endpoints. No DB access, no order placement.
"""
from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field, field_validator
from typing import Literal

import order_flow
import portfolio_risk
import analytics_metrics
import analysis_contract


router = APIRouter(prefix="/api/analysis", tags=["analysis"])


# ─── Request Models ──────────────────────────────────────────────────────────

class Candle(BaseModel):
    open: float
    high: float
    low: float
    close: float
    volume: float
    time: float | str | None = None


class OrderFlowRequest(BaseModel):
    candles: list[Candle] = Field(default_factory=list, max_length=10000)
    symbol: str | None = None
    timeframe: str | None = None


class VaRRequest(BaseModel):
    returns: list[float] = Field(default_factory=list, max_length=10000)
    trades: list[dict] = Field(default_factory=list, max_length=10000)
    equity: float = 10000


class CorrelationRequest(BaseModel):
    series: dict[str, list[float]] = Field(default_factory=dict)

    @field_validator("series")
    @classmethod
    def check_series_lengths(cls, v: dict[str, list[float]]) -> dict[str, list[float]]:
        for name, values in v.items():
            if len(values) > 10000:
                raise ValueError(f"series '{name}' exceeds 10000 items")
        return v


class Position(BaseModel):
    symbol: str
    side: Literal["buy", "sell"]
    units: float = Field(gt=0)
    price: float = Field(gt=0)


class StressTestRequest(BaseModel):
    positions: list[Position] = Field(default_factory=list, max_length=10000)
    shocks: list[float] | None = Field(default=None, max_length=10000)


class Trade(BaseModel):
    symbol: str = "UNKNOWN"
    timeframe: str = "UNKNOWN"
    pnl: float
    closed_at: str = ""


class PerformanceRequest(BaseModel):
    trades: list[Trade] = Field(default_factory=list, max_length=10000)
    starting_equity: float = 0.0


# ─── Helper ──────────────────────────────────────────────────────────────────

from functools import wraps


def _catch_value_error(func):
    """Decorator to catch ValueError from modules and raise HTTPException(422)."""
    @wraps(func)
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except ValueError as e:
            raise HTTPException(status_code=422, detail=str(e))
    return wrapper


# ─── Endpoints ───────────────────────────────────────────────────────────────

@router.post("/order-flow")
@_catch_value_error
async def order_flow_endpoint(req: OrderFlowRequest):
    """Compute order flow metrics from OHLCV candles.

    Returns the legacy dict (with ``estimated``, ``bars``, ``divergence``) for
    backward compatibility — unless the request looks like a frontend call, in
    which case a bare JSON list of bars (see ``analysis_contract``) is returned.
    """
    candles = [c.model_dump() for c in req.candles]
    result = order_flow.compute_order_flow(candles)
    divergence = order_flow.detect_delta_divergence(candles)
    result["divergence"] = divergence
    return analysis_contract.order_flow_response(
        candles, result, req.symbol, req.timeframe
    )


@router.post("/var")
@_catch_value_error
async def var_endpoint(req: VaRRequest):
    """Generate VaR report from returns or trades.

    Accepts the legacy ``returns`` body and/or the frontend ``trades`` +
    ``equity`` body. When ``trades`` is supplied, returns are derived as
    ``pnl/equity`` for each trade. The response keeps all legacy keys and adds
    ``confidence_95``/``confidence_99`` blocks plus ``equity``/``sample_size``.
    """
    if req.trades:
        returns = analysis_contract.var_trade_returns(req.trades, req.equity)
    else:
        returns = req.returns
    raw = portfolio_risk.var_report(returns)
    return analysis_contract.var_response(req.equity, returns, raw)


@router.post("/correlation")
@_catch_value_error
async def correlation_endpoint(req: CorrelationRequest):
    """Compute correlation matrix for multiple series.

    Returns the legacy nested-list ``matrix`` (kept for backward compatibility)
    plus a dict-of-dicts ``matrix_dict`` that the frontend expects.
    """
    raw = portfolio_risk.correlation_matrix(req.series)
    return analysis_contract.correlation_response(raw)


@router.post("/stress-test")
@_catch_value_error
async def stress_test_endpoint(req: StressTestRequest):
    """Run portfolio stress test under market shocks."""
    positions = [p.model_dump() for p in req.positions]
    shocks = tuple(req.shocks) if req.shocks is not None else (-0.05, -0.02, 0.02, 0.05)
    return portfolio_risk.stress_test(positions, shocks)


@router.post("/performance")
@_catch_value_error
async def performance_endpoint(req: PerformanceRequest):
    """Calculate performance summary from closed trades."""
    trades = [t.model_dump() for t in req.trades]
    return analytics_metrics.summary(trades, req.starting_equity)


@router.post("/pnl-groups")
@_catch_value_error
async def pnl_groups_endpoint(req: PerformanceRequest):
    """P&L grouped by symbol and by timeframe."""
    trades = [t.model_dump() for t in req.trades]
    return {
        "by_symbol": analytics_metrics.pnl_by_symbol(trades),
        "by_timeframe": analytics_metrics.pnl_by_timeframe(trades),
    }