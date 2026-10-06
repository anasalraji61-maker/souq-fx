"""Ops routes: browser error reports (public, rate-limited) and admin views of errors and backups."""
from __future__ import annotations

import time

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

import ops
from routers_admin import require_admin

router = APIRouter(tags=["ops"])


class ClientError(BaseModel):
    kind: str = Field(default="Error", max_length=80)
    message: str = Field(..., min_length=1, max_length=2000)
    stack: str | None = Field(default=None, max_length=8000)
    url: str | None = Field(default=None, max_length=500)
    release: str | None = Field(default=None, max_length=40)


_HITS: dict[str, list[float]] = {}
_MAX_PER_HOUR = 30


def _ip_ok(ip: str) -> bool:
    now = time.time()
    hits = [t for t in _HITS.get(ip, []) if now - t < 3600]
    ok = len(hits) < _MAX_PER_HOUR
    if ok:
        hits.append(now)
    _HITS[ip] = hits
    if len(_HITS) > 5000:
        _HITS.clear()
    return ok


@router.post("/api/client-errors", status_code=202)
def client_error(body: ClientError, request: Request):
    ip = request.client.host if request.client else "?"
    if not _ip_ok(ip):
        return {"ok": False, "error": "rate_limited"}
    path = body.url or ""
    # keep only the path of the page (no host, no query)
    if "://" in path:
        path = "/" + path.split("://", 1)[1].split("/", 1)[-1] if "/" in path.split("://", 1)[1] else "/"
    ops.record_error("client", body.kind or "Error", body.message, path, body.stack or "", body.release or "")
    return {"ok": True}


@router.get("/api/admin/errors", dependencies=[Depends(require_admin)])
def admin_errors(source: str | None = Query(default=None, pattern="^(server|client)$"), limit: int = Query(default=200, ge=1, le=500)):
    now = time.time()
    return {
        "items": ops.list_errors(source, limit),
        "last_24h": ops.error_counts(now - 86400),
        "last_7d": ops.error_counts(now - 7 * 86400),
    }


@router.delete("/api/admin/errors", dependencies=[Depends(require_admin)])
def admin_errors_clear():
    return {"deleted": ops.clear_errors()}


@router.delete("/api/admin/errors/{error_id}", dependencies=[Depends(require_admin)])
def admin_error_delete(error_id: int):
    if not ops.clear_errors(error_id):
        raise HTTPException(status_code=404, detail="not found")
    return {"deleted": 1}


@router.get("/api/admin/backups", dependencies=[Depends(require_admin)])
def admin_backups():
    return ops.backup_status()


@router.post("/api/admin/backups", dependencies=[Depends(require_admin)])
def admin_backup_now():
    try:
        info = ops.backup_now()
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="backup_failed") from exc
    return {"ok": True, "backup": info}


@router.get("/api/admin/backups/{name}", dependencies=[Depends(require_admin)])
def admin_backup_download(name: str):
    p = ops.backup_path(name)
    if p is None:
        raise HTTPException(status_code=404, detail="not found")
    return FileResponse(p, media_type="application/gzip", filename=name)
