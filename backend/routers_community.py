"""
Community chat routes.
"""
from __future__ import annotations

import sqlite3
import time

import community_chat
from core import db_conn
from core.auth import _auth_user
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

router = APIRouter(prefix="/api/community", tags=["community"])


def _db_path() -> str:
    """Return the database path. Read at call time for test monkeypatching."""
    return str(db_conn.DB_PATH)


def _conn() -> sqlite3.Connection:
    """Open a connection and ensure the community tables exist."""
    conn = sqlite3.connect(_db_path())
    community_chat.init_db(conn)
    return conn


def _require(user: dict | None) -> None:
    """Raise 401 if user is not authenticated."""
    if not user:
        raise HTTPException(status_code=401, detail="not authenticated")


class PostBody(BaseModel):
    content: str | None = None
    text: str | None = None
    sentiment: str | None = None
    symbol_tag: str | None = None
    sender_name: str | None = None

    def resolved_content(self) -> str:
        """Return `content`, falling back to the legacy `text` field."""
        if self.content is not None:
            return self.content
        if self.text is not None:
            return self.text
        return ""


@router.get("/channels")
def channels(user: dict | None = Depends(_auth_user)):
    """List channels."""
    _require(user)
    return community_chat.list_channels()


@router.get("/channels/{channel}/messages")
def get_messages(
    channel: str,
    limit: int = Query(50),
    before_id: int | None = None,
    user: dict | None = Depends(_auth_user),
):
    """List messages in a channel, newest first."""
    _require(user)
    conn = _conn()
    try:
        try:
            messages = community_chat.list_messages(conn, channel, limit, before_id)
        except ValueError:
            raise HTTPException(status_code=404, detail="unknown channel")
        return [community_chat.to_frontend_message(m) for m in messages]
    finally:
        conn.close()


@router.post("/channels/{channel}/messages", status_code=200)
def post_message(channel: str, body: PostBody, user: dict | None = Depends(_auth_user)):
    """Post a message to a channel."""
    _require(user)
    conn = _conn()
    try:
        try:
            rec = community_chat.post_message(
                conn,
                channel,
                str(user["user_id"]),
                body.resolved_content(),
                time.time(),
                sentiment=body.sentiment,
                symbol_tag=body.symbol_tag,
            )
        except ValueError as e:
            if "unknown channel" in str(e):
                raise HTTPException(status_code=404, detail="unknown channel")
            raise HTTPException(status_code=400, detail=str(e))
        except community_chat.RateLimitError as e:
            raise HTTPException(
                status_code=429,
                detail="rate_limited",
                headers={"Retry-After": str(int(e.retry_after) + 1)},
            )
        rec = {
            **rec,
            "sentiment": body.sentiment,
            "symbol_tag": body.symbol_tag,
        }
        return community_chat.to_frontend_message(
            rec, sender_name=body.sender_name
        )
    finally:
        conn.close()
