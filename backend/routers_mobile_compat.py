"""Mobile compatibility routes.

This module provides thin routes for any /api/... paths called by the mobile
client that don't have a dedicated backend route. Currently all mobile paths
are covered by existing routes, so this module is a placeholder for future
compat needs.

Routes added here should:
- Not touch the database directly (use existing helpers)
- Return safe empty/stub JSON in the shape the mobile code expects
- Never place an order or mutate trading state
"""

from __future__ import annotations

from fastapi import APIRouter

router = APIRouter(prefix="/api", tags=["mobile-compat"])


# Example of a compat route (currently not needed):
# @router.get("/some/missing/path")
# async def compat_some_missing_path() -> dict:
#     """Stub for /api/some/missing/path."""
#     return {"ok": True, "data": []}