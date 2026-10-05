"""Frontend-shaped compat mappers for price alerts.

The web client (``src/api/alerts.ts``) expects GET ``/api/alerts`` to return a bare
array of ``PriceAlertItem`` with keys ``id, symbol, targetPrice, condition, note,
active, triggered, triggeredAt?, createdAt?``.

The legacy backend schema returns rows with ``price`` / ``ts`` and
``{"alerts": [...]}`` envelope, and ``mobile/src/api.ts`` depends on that exact
shape — so ``/api/alerts*`` behaviour is left untouched.

These pure functions (no DB access) translate between the two shapes for the
new ``/api/alerts-compat`` routes.
"""
from __future__ import annotations

import math
from typing import Any

# AlertCondition union from src/types/market.ts — only these map cleanly.
_FRONTEND_CONDITIONS: set[str] = {
    "crosses",
    "crosses_up",
    "crosses_down",
    "greater_than",
    "less_than",
    "above",
    "below",
}

# Backend → frontend condition mapping.
_BACKEND_TO_FRONTEND: dict[str, str] = {
    "above": "greater_than",
    "below": "less_than",
}

# Frontend → backend condition mapping.
_FRONTEND_TO_BACKEND: dict[str, str] = {
    "greater_than": "above",
    "crosses_up": "above",
    "crosses": "above",
    "less_than": "below",
    "crosses_down": "below",
}


def to_frontend(alert: dict) -> dict[str, Any]:
    """Map a backend alert row to a frontend ``PriceAlertItem``.

    ``price``→``targetPrice``, ``ts``→``createdAt``, ``condition``
    ``above``→``greater_than`` / ``below``→``less_than``.
    ``triggeredAt`` is copied only when the backend row has a
    ``triggered_at`` or ``triggeredAt`` key.
    Missing optional keys do not crash; ``note`` defaults to ``""``.
    """
    frontend: dict[str, Any] = {
        "id": alert.get("id"),
        "symbol": alert.get("symbol"),
        "targetPrice": alert.get("price"),
        "condition": _BACKEND_TO_FRONTEND.get(
            alert.get("condition"), alert.get("condition")
        ),
        "note": alert.get("note", "") or "",
        "active": bool(alert.get("active")),
        "triggered": bool(alert.get("triggered")),
        "createdAt": alert.get("ts"),
    }
    # Only copy triggeredAt if the backend row explicitly has it.
    if "triggered_at" in alert:
        frontend["triggeredAt"] = alert["triggered_at"]
    elif "triggeredAt" in alert:
        frontend["triggeredAt"] = alert["triggeredAt"]
    return frontend


def from_frontend(item: dict) -> dict | None:
    """Map a frontend ``PriceAlertItem`` to a backend ``AlertCreate``-style dict.

    Returns ``{symbol, condition, price, note}`` or ``None`` when
    ``targetPrice`` is not a finite number > 0, or when the condition is
    unknown.
    """
    target_price = item.get("targetPrice")

    # targetPrice must be a finite number > 0.
    if not isinstance(target_price, (int, float)) or isinstance(target_price, bool):
        return None
    if not math.isfinite(target_price) or target_price <= 0:
        return None

    condition = item.get("condition")
    if condition not in _FRONTEND_CONDITIONS:
        return None

    backend_condition = _FRONTEND_TO_BACKEND.get(condition)
    if backend_condition is None:
        return None

    symbol = item.get("symbol")
    if not isinstance(symbol, str) or not symbol.strip():
        return None

    note = item.get("note", "")
    if note is None:
        note = ""

    return {
        "symbol": symbol,
        "condition": backend_condition,
        "price": float(target_price),
        "note": str(note),
    }