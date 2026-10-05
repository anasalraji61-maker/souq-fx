"""
Trading Mode API — Task T34b

Read-only endpoint exposing the trading mode.
Backend is paper-only; real-money trading is permanently disabled.
"""
from __future__ import annotations

from fastapi import APIRouter, Body, HTTPException

from risk_controls import is_live_trading_allowed

router = APIRouter(prefix="/api/trading", tags=["trading"])


def get_trading_mode() -> dict:
    """Return the current trading mode configuration.

    Returns:
        dict with mode, live_trading_enabled, real_orders.

    Raises:
        RuntimeError: If live trading is somehow enabled (forbidden).
    """
    live_enabled = is_live_trading_allowed()
    if live_enabled:
        raise RuntimeError("live trading is forbidden")
    return {
        "mode": "PAPER",
        "live_trading_enabled": False,
        "real_orders": False,
    }


@router.get("/mode")
def get_mode():
    """GET /api/trading/mode — Returns the trading mode (always PAPER)."""
    return get_trading_mode()


@router.put("/mode")
def put_mode(body: dict = Body(default={})):
    """PUT /api/trading/mode — Accepts any JSON, rejects non-PAPER modes."""
    mode_value = body.get("mode") or body.get("tradingMode")
    if mode_value is not None and str(mode_value).strip().upper() != "PAPER":
        raise HTTPException(
            status_code=403,
            detail="التداول الحقيقي معطّل: الوضع الورقي فقط",
        )
    return get_trading_mode()


@router.post("/mode")
def post_mode(body: dict = Body(default={})):
    """POST /api/trading/mode — Accepts any JSON, rejects non-PAPER modes."""
    mode_value = body.get("mode") or body.get("tradingMode")
    if mode_value is not None and str(mode_value).strip().upper() != "PAPER":
        raise HTTPException(
            status_code=403,
            detail="التداول الحقيقي معطّل: الوضع الورقي فقط",
        )
    return get_trading_mode()