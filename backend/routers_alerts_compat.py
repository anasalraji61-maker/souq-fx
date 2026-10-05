"""Frontend-shaped compat alerts routes.

GET  /api/alerts-compat returns a bare list of ``PriceAlertItem``
(frontend-shaped). POST /api/alerts-compat accepts a JSON list of
``PriceAlertItem`` and creates missing alerts (sync semantics).

The legacy ``/api/alerts`` routes are left untouched for the mobile client.
"""
from __future__ import annotations

from datetime import datetime, timezone

import db
from core.auth import _auth_user, _owner_key
from fastapi import APIRouter, Depends, HTTPException, Request

router = APIRouter(prefix="/api/alerts-compat", tags=["alerts-compat"])


def _get_main_helpers():
    """Deferred import to avoid circular import at module load time.

    ``main`` imports this router (at the ``include_router`` line), so
    importing ``main`` at module level would re-trigger that import
    before ``main`` has defined ``_alert_level`` / ``_alertable_symbol``.
    By the time any route handler runs, ``main`` is fully loaded.
    """
    from alerts_compat import from_frontend, to_frontend
    from main import _alert_level, _alertable_symbol
    return to_frontend, from_frontend, _alert_level, _alertable_symbol


def _existing_ids(uid: int | None, key: str | None) -> set[str]:
    """Return the set of alert IDs already stored for this owner."""
    rows = db.list_alerts(uid, owner_key=key)
    return {r["id"] for r in rows}


@router.get("", response_model=list)
def list_compat_alerts(
    user: dict | None = Depends(_auth_user),
    key: str | None = Depends(_owner_key),
) -> list[dict]:
    """Return alerts as a bare list of frontend-shaped ``PriceAlertItem``."""
    to_frontend, _, _, _ = _get_main_helpers()
    uid = user["user_id"] if user else None
    rows = db.list_alerts(uid, owner_key=key)
    return [to_frontend(r) for r in rows]


@router.post("")
async def sync_compat_alerts(
    request: Request,
    user: dict | None = Depends(_auth_user),
    key: str | None = Depends(_owner_key),
) -> dict:
    """Sync a list of ``PriceAlertItem`` to the backend.

    Accepts a JSON **list** of PriceAlertItem dicts. Non-list bodies receive
    422. For each valid item whose ``id`` is not already stored, create it.
    Skip invalid items. Enforce the 50-alert cap by skipping extras.

    Returns ``{"ok": True, "created": n, "skipped": m}``.
    """
    _, from_frontend, _alert_level, _alertable_symbol = _get_main_helpers()

    body = await request.json()
    if not isinstance(body, list):
        raise HTTPException(status_code=422, detail="expected a JSON list")

    uid = user["user_id"] if user else None
    existing = _existing_ids(uid, key)

    # Enforce the 50-alert cap on the combined total.
    cap = 50
    created = 0
    skipped = 0

    for item in body:
        if not isinstance(item, dict):
            skipped += 1
            continue

        mapped = from_frontend(item)
        if mapped is None:
            skipped += 1
            continue

        alert_id = item.get("id")
        if alert_id is None or alert_id in existing:
            skipped += 1
            continue

        # Validate symbol through the same path as create_alert.
        try:
            symbol = _alertable_symbol(mapped["symbol"])
        except ValueError:
            skipped += 1
            continue

        if len(existing) + created >= cap:
            skipped += 1
            continue

        now = datetime.now(timezone.utc).isoformat()
        alert = {
            "id": str(alert_id),
            "symbol": symbol.upper(),
            "condition": mapped["condition"],
            "price": _alert_level(mapped["price"]),
            "note": (mapped.get("note") or "").strip(),
            "active": bool(item.get("active", True)),
            "triggered": bool(item.get("triggered", False)),
            "ts": now,
        }
        db.create_alert(alert, uid, owner_key=key)
        existing.add(alert["id"])
        created += 1

    return {"ok": True, "created": created, "skipped": skipped}
