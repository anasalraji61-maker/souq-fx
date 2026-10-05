"""Chart drawings routes."""
from __future__ import annotations

import drawings
from core import db_conn
from core.auth import _auth_user
from fastapi import APIRouter, Depends, HTTPException, Query

router = APIRouter(prefix="/api/drawings", tags=["drawings"])

_DRAWING_LIMIT = 200


def _db_path() -> str:
    """Return the database path. Read at call time for test monkeypatching."""
    return str(db_conn.DB_PATH)


def _require(user: dict | None) -> None:
    """Raise 401 if user is not authenticated."""
    if not user:
        raise HTTPException(status_code=401, detail="not authenticated")


def _map_row(row: dict) -> dict:
    """Map a stored DrawingStore record to the frontend DrawingItem shape."""
    style = row.get("style") or {}
    client_id = style.get("id", row["id"])
    rest = {k: v for k, v in style.items() if k != "id"}
    return {"id": client_id, "type": row["dtype"], "points": row["points"], **rest}


@router.get("")
def list_drawings(
    symbol: str = Query(...),
    timeframe: str = Query(...),
    user: dict | None = Depends(_auth_user),
):
    """List drawings for the user, symbol and timeframe (lowercase tf)."""
    _require(user)
    store = drawings.DrawingStore(_db_path())
    rows = store.list(str(user["user_id"]), symbol.strip().upper(), timeframe.strip().lower())
    return [_map_row(row) for row in rows]


@router.post("")
def save_drawings(
    body: list[dict],
    symbol: str = Query(...),
    timeframe: str = Query(...),
    user: dict | None = Depends(_auth_user),
):
    """Replace all drawings for the user, symbol and timeframe."""
    _require(user)
    sym = symbol.strip().upper()
    tf = timeframe.strip().lower()
    user_id = str(user["user_id"])

    allowed: list[tuple[str, list, dict]] = []
    skipped = 0
    for item in body:
        if not isinstance(item, dict):
            skipped += 1
            continue
        dtype = item.get("type")
        if dtype not in drawings.ALLOWED_TYPES:
            skipped += 1
            continue
        points = item.get("points")
        style = {k: v for k, v in item.items() if k not in ("type", "points")}
        allowed.append((dtype, points, style))

    if len(allowed) > _DRAWING_LIMIT:
        raise HTTPException(status_code=422, detail="too many drawings")

    # Validate everything before touching existing drawings.
    for dtype, points, style in allowed:
        try:
            drawings.validate_drawing(dtype, points, style)
        except drawings.DrawingError as e:
            raise HTTPException(status_code=422, detail=str(e))

    store = drawings.DrawingStore(_db_path())
    store.clear(user_id, sym, tf)
    for dtype, points, style in allowed:
        try:
            store.add(user_id, sym, tf, dtype, points, style)
        except drawings.DrawingError as e:
            raise HTTPException(status_code=422, detail=str(e))

    return {"ok": True, "saved": len(allowed), "skipped": skipped}
