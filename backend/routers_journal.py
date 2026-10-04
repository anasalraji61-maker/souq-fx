"""Trade journal routes."""
from __future__ import annotations

import sqlite3
import time

import trade_journal
from core import db_conn
from core.auth import _auth_user
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/api/journal", tags=["journal"])


def _db_path() -> str:
    """Return the database path. Read at call time for test monkeypatching."""
    return str(db_conn.DB_PATH)


def _conn() -> sqlite3.Connection:
    """Open a connection and ensure the journal tables exist."""
    conn = sqlite3.connect(_db_path())
    trade_journal.init_db(conn)
    return conn


def _require(user: dict | None) -> None:
    """Raise 401 if user is not authenticated."""
    if not user:
        raise HTTPException(status_code=401, detail="not authenticated")


class CreateBody(BaseModel):
    trade_id: str
    notes: str = ""
    tags: list[str] | None = None
    emotion: str = "neutral"
    screenshot_url: str | None = None
    pnl: float = 0.0


class UpdateBody(BaseModel):
    notes: str | None = None
    tags: list[str] | None = None
    emotion: str | None = None
    screenshot_url: str | None = None
    pnl: float | None = None


@router.post("/entries", status_code=200)
def create_entry(body: CreateBody, user: dict | None = Depends(_auth_user)):
    """Create a journal entry."""
    _require(user)
    conn = _conn()
    try:
        try:
            rec = trade_journal.create_entry(
                conn,
                str(user["user_id"]),
                body.trade_id,
                body.notes,
                body.tags,
                body.emotion,
                body.screenshot_url,
                body.pnl,
                time.time(),
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        return {"entry": rec}
    finally:
        conn.close()


@router.get("/entries")
def list_entries(
    tag: str | None = None,
    trade_id: str | None = None,
    limit: int = Query(50),
    offset: int = Query(0),
    user: dict | None = Depends(_auth_user),
):
    """List journal entries for the user, newest first."""
    _require(user)
    conn = _conn()
    try:
        entries = trade_journal.list_entries(
            conn, str(user["user_id"]), tag, trade_id, limit, offset
        )
        return {"entries": entries}
    finally:
        conn.close()


@router.get("/entries/{entry_id}")
def get_entry(entry_id: int, user: dict | None = Depends(_auth_user)):
    """Get a single journal entry by ID."""
    _require(user)
    conn = _conn()
    try:
        entry = trade_journal.get_entry(conn, str(user["user_id"]), entry_id)
        if entry is None:
            raise HTTPException(status_code=404, detail="not found")
        return {"entry": entry}
    finally:
        conn.close()


@router.patch("/entries/{entry_id}")
def update_entry(entry_id: int, body: UpdateBody, user: dict | None = Depends(_auth_user)):
    """Update a journal entry."""
    _require(user)
    conn = _conn()
    try:
        fields = body.model_dump(exclude_unset=True)
        try:
            entry = trade_journal.update_entry(
                conn, str(user["user_id"]), entry_id, time.time(), **fields
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        if entry is None:
            raise HTTPException(status_code=404, detail="not found")
        return {"entry": entry}
    finally:
        conn.close()


@router.delete("/entries/{entry_id}")
def delete_entry(entry_id: int, user: dict | None = Depends(_auth_user)):
    """Delete a journal entry."""
    _require(user)
    conn = _conn()
    try:
        deleted = trade_journal.delete_entry(conn, str(user["user_id"]), entry_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="not found")
        return {"deleted": True}
    finally:
        conn.close()


@router.get("/stats")
def stats(user: dict | None = Depends(_auth_user)):
    """Get per-tag stats for the user."""
    _require(user)
    conn = _conn()
    try:
        stats_data = trade_journal.stats_by_tag(conn, str(user["user_id"]))
        return {"stats": stats_data}
    finally:
        conn.close()