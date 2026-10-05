"""Trade journal routes."""
from __future__ import annotations

import sqlite3
import time

import journal_contract
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
    journal_contract.init_extra(conn)
    return conn


def _require(user: dict | None) -> None:
    """Raise 401 if user is not authenticated."""
    if not user:
        raise HTTPException(status_code=401, detail="not authenticated")


class CreateBody(BaseModel):
    trade_id: str | None = None
    date: str | None = None
    symbol: str | None = None
    direction: str | None = None
    entry_price: float | None = None
    exit_price: float | None = None
    lots: float | None = None
    notes: str = ""
    tags: list[str] | None = None
    emotion: str = "neutral"
    screenshot_url: str | None = None
    pnl: float = 0.0


class UpdateBody(BaseModel):
    date: str | None = None
    symbol: str | None = None
    direction: str | None = None
    entry_price: float | None = None
    exit_price: float | None = None
    lots: float | None = None
    notes: str | None = None
    tags: list[str] | None = None
    emotion: str | None = None
    screenshot_url: str | None = None
    pnl: float | None = None


def _user_id(user) -> str:
    return str(user["user_id"])


def _frontend(conn, rec) -> dict:
    extra = journal_contract.get_extra(conn, rec["id"])
    try:
        return journal_contract.to_frontend_entry(rec, extra)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/entries", status_code=200)
def create_entry(body: CreateBody, user: dict | None = Depends(_auth_user)):
    """Create a journal entry."""
    _require(user)
    conn = _conn()
    try:
        trade_id = body.trade_id
        if trade_id is None:
            symbol = body.symbol or ""
            trade_id = f"{symbol}-{int(time.time())}" if symbol else f"tr-{int(time.time())}"
        now = time.time()
        extra_data = {
            k: v
            for k, v in {
                "date": body.date,
                "symbol": body.symbol,
                "direction": body.direction,
                "entry_price": body.entry_price,
                "exit_price": body.exit_price,
                "lots": body.lots,
            }.items()
            if v is not None
        }
        try:
            rec = trade_journal.create_entry(
                conn,
                _user_id(user),
                trade_id,
                body.notes,
                body.tags,
                body.emotion,
                body.screenshot_url,
                body.pnl,
                now,
            )
            journal_contract.save_extra(conn, rec["id"], extra_data)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        return _frontend(conn, rec)
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
            conn, _user_id(user), tag, trade_id, limit, offset
        )
        return [_frontend(conn, rec) for rec in entries]
    finally:
        conn.close()


@router.get("/entries/{entry_id}")
def get_entry(entry_id: int, user: dict | None = Depends(_auth_user)):
    """Get a single journal entry by ID."""
    _require(user)
    conn = _conn()
    try:
        entry = trade_journal.get_entry(conn, _user_id(user), entry_id)
        if entry is None:
            raise HTTPException(status_code=404, detail="not found")
        return _frontend(conn, entry)
    finally:
        conn.close()


@router.patch("/entries/{entry_id}")
def update_entry(entry_id: int, body: UpdateBody, user: dict | None = Depends(_auth_user)):
    """Update a journal entry."""
    _require(user)
    conn = _conn()
    try:
        fields = body.model_dump(exclude_unset=True)
        core_fields = {k: v for k, v in fields.items() if k in ("notes", "tags", "emotion", "screenshot_url", "pnl")}
        extra_fields = {k: v for k, v in fields.items() if k in ("date", "symbol", "direction", "entry_price", "exit_price", "lots")}
        if extra_fields:
            existing = trade_journal.get_entry(conn, _user_id(user), entry_id)
            if existing is None:
                raise HTTPException(status_code=404, detail="not found")
            try:
                journal_contract.save_extra(conn, entry_id, extra_fields)
            except ValueError as e:
                raise HTTPException(status_code=400, detail=str(e))
        try:
            entry = trade_journal.update_entry(
                conn, _user_id(user), entry_id, time.time(), **core_fields
            )
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        if entry is None:
            raise HTTPException(status_code=404, detail="not found")
        return _frontend(conn, entry)
    finally:
        conn.close()


@router.delete("/entries/{entry_id}")
def delete_entry(entry_id: int, user: dict | None = Depends(_auth_user)):
    """Delete a journal entry."""
    _require(user)
    conn = _conn()
    try:
        deleted = trade_journal.delete_entry(conn, _user_id(user), entry_id)
        if not deleted:
            raise HTTPException(status_code=404, detail="not found")
        journal_contract.delete_extra(conn, entry_id)
        return {"deleted": True}
    finally:
        conn.close()


@router.get("/stats")
def stats(user: dict | None = Depends(_auth_user)):
    """Get journal stats for the user in the frontend shape."""
    _require(user)
    conn = _conn()
    try:
        entries = trade_journal.list_entries(conn, _user_id(user), limit=200, offset=0)
        frontend_entries = [journal_contract.to_frontend_entry(rec, journal_contract.get_extra(conn, rec["id"])) for rec in entries]
        return journal_contract.compute_stats(frontend_entries)
    finally:
        conn.close()
