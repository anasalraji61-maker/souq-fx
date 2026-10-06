"""
Community chat routes.
"""
from __future__ import annotations

import sqlite3
import time

import unicodedata

import community_chat
import db
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


_LINK_DOTS = str.maketrans({"\u3002": ".", "\uff0e": ".", "\uff61": "."})


def _has_link(text: str) -> bool:
    """Same link filter as the group chat and trade ideas (main._has_link): no links in channels."""
    norm = unicodedata.normalize("NFKC", text or "").translate(_LINK_DOTS)
    norm = "".join(ch for ch in norm if unicodedata.category(ch) != "Cf")
    return bool(db.LINK_RE.search(norm))


def _blank(text: str) -> bool:
    return not "".join(ch for ch in (text or "") if not ch.isspace() and unicodedata.category(ch) != "Cf")


def _present(messages: list[dict], viewer_id) -> list[dict]:
    """Frontend shape with the sender's real username (never a client-supplied name) and `mine`."""
    names = db.usernames_by_id([str(m["user_id"]) for m in messages])
    out = []
    for m in messages:
        uid = str(m["user_id"])
        item = community_chat.to_frontend_message(m, sender_name=names.get(uid) or f"user-{uid}")
        item["mine"] = viewer_id is not None and uid == str(viewer_id)
        out.append(item)
    return out


@router.get("/channels/{channel}/messages")
def get_messages(
    channel: str,
    limit: int = Query(50),
    before_id: int | None = None,
    user: dict | None = Depends(_auth_user),
):
    """List messages in a channel, newest first. Reported messages are hidden from the reporter at once
    and from everyone once `db.REPORT_HIDE_THRESHOLD` accounts reported them."""
    _require(user)
    conn = _conn()
    try:
        try:
            hidden = db.hidden_ids("channel_message", user["user_id"])
            limit = max(1, min(200, int(limit)))
            messages = community_chat.list_messages(conn, channel, limit + len(hidden), before_id)
        except ValueError:
            raise HTTPException(status_code=404, detail="unknown channel")
        messages = [m for m in messages if str(m["id"]) not in hidden][:limit]
        return _present(messages, user["user_id"])
    finally:
        conn.close()


@router.post("/channels/{channel}/messages", status_code=200)
def post_message(channel: str, body: PostBody, user: dict | None = Depends(_auth_user)):
    """Post a message to a channel as the signed-in account."""
    _require(user)
    text = body.resolved_content()
    if _blank(text):
        raise HTTPException(status_code=400, detail="empty")
    if _has_link(text) or _has_link(body.symbol_tag or ""):
        raise HTTPException(status_code=400, detail="links_not_allowed")
    sentiment = body.sentiment if body.sentiment in ("bullish", "bearish", "neutral") else None
    symbol_tag = (body.symbol_tag or "").strip().upper()[:12] or None
    conn = _conn()
    try:
        try:
            rec = community_chat.post_message(
                conn,
                channel,
                str(user["user_id"]),
                text,
                time.time(),
                sentiment=sentiment,
                symbol_tag=symbol_tag,
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
        rec = {**rec, "sentiment": sentiment, "symbol_tag": symbol_tag}
        out = community_chat.to_frontend_message(rec, sender_name=user.get("username") or f"user-{user['user_id']}")
        out["mine"] = True
        return out
    finally:
        conn.close()
