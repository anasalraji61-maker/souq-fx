"""Self-contained SQLite store for the community chat.

Channels, messages, @mention extraction, per-user rate limit and
banned-word flagging. Caller passes its own sqlite3 connection and an
explicit `now` timestamp. No routes; no imports from db.py.
"""

import json
import re
import sqlite3

DEFAULT_CHANNELS = [
    {"id": "general", "name": "General"},
    {"id": "forex", "name": "Forex"},
    {"id": "metals", "name": "Metals"},
    {"id": "signals", "name": "Signals"},
]

BANNED_WORDS = ("scam", "fraud", "spamlink")

_MAX_TEXT_CHARS = 1000
_PAGE_LIMIT_MIN = 1
_PAGE_LIMIT_MAX = 200

# `@` must be at start of text or follow whitespace / punctuation,
# never a word char (so "a@b.com" is not a mention).
_MENTION_RE = re.compile(r"(?<!\w)@([A-Za-z0-9_]{2,32})(?!\w)")


class RateLimitError(Exception):
    """Raised when a user exceeds the per-user post rate limit."""

    def __init__(self, retry_after):
        self.retry_after = float(retry_after)
        super().__init__(f"rate limit exceeded, retry after {self.retry_after}s")


def _channel_ids():
    return [c["id"] for c in DEFAULT_CHANNELS]


def extract_mentions(text):
    """Lowercased, de-duplicated @mentions in first-seen order."""
    seen = []
    for match in _MENTION_RE.finditer(text):
        name = match.group(1).lower()
        if name not in seen:
            seen.append(name)
    return seen


def find_banned(text):
    """True if any banned word appears as a whole word, case-insensitive."""
    lowered = text.lower()
    for word in BANNED_WORDS:
        pattern = r"\b" + re.escape(word) + r"\b"
        if re.search(pattern, lowered):
            return True
    return False


def init_db(conn):
    """Create the community_messages table if missing."""
    conn.execute(
        "CREATE TABLE IF NOT EXISTS community_messages ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT,"
        "channel TEXT,"
        "user_id TEXT,"
        "text TEXT,"
        "mentions TEXT,"
        "flagged INTEGER,"
        "created_at REAL"
        ")"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_community_messages_channel "
        "ON community_messages (channel, id)"
    )
    conn.commit()


def list_channels():
    """Return the default channel list."""
    return [dict(c) for c in DEFAULT_CHANNELS]


def post_message(conn, channel, user_id, text, now, limit=5, window=10.0):
    """Validate and store a message. Returns the stored record dict.

    Raises ValueError for unknown channel, empty/whitespace-only text,
    or text longer than 1000 chars. Raises RateLimitError when the user
    already has `limit` messages with created_at > now - window, counted
    across all channels.
    """
    if channel not in _channel_ids():
        raise ValueError(f"unknown channel: {channel!r}")
    if not isinstance(text, str) or not text.strip():
        raise ValueError("text must be a non-empty string")
    if len(text) > _MAX_TEXT_CHARS:
        raise ValueError("text too long")

    cur = conn.execute(
        "SELECT MIN(created_at) FROM community_messages "
        "WHERE user_id = ? AND created_at > ?",
        (user_id, now - window),
    )
    row = cur.fetchone()
    oldest = row[0] if row else None

    cur = conn.execute(
        "SELECT COUNT(*) FROM community_messages "
        "WHERE user_id = ? AND created_at > ?",
        (user_id, now - window),
    )
    (count,) = cur.fetchone()
    if count >= limit:
        if oldest is not None:
            retry_after = max(oldest + window - now, 0.001)
        else:
            retry_after = window
        raise RateLimitError(retry_after)

    mentions = extract_mentions(text)
    flagged = 1 if find_banned(text) else 0

    cur = conn.execute(
        "INSERT INTO community_messages "
        "(channel, user_id, text, mentions, flagged, created_at) "
        "VALUES (?, ?, ?, ?, ?, ?)",
        (channel, user_id, text, json.dumps(mentions), flagged, now),
    )
    conn.commit()

    return {
        "id": cur.lastrowid,
        "channel": channel,
        "user_id": user_id,
        "text": text,
        "mentions": mentions,
        "flagged": bool(flagged),
        "created_at": now,
    }


def _row_to_dict(row):
    (msg_id, channel, user_id, text, mentions_json, flagged, created_at) = row
    return {
        "id": msg_id,
        "channel": channel,
        "user_id": user_id,
        "text": text,
        "mentions": json.loads(mentions_json) if mentions_json else [],
        "flagged": bool(flagged),
        "created_at": created_at,
    }


def list_messages(conn, channel, limit=50, before_id=None):
    """Return messages for a channel, newest first, limit clamped to 1..200.

    If before_id is given, only messages with id < before_id are returned.
    Raises ValueError for an unknown channel.
    """
    if channel not in _channel_ids():
        raise ValueError(f"unknown channel: {channel!r}")
    limit = max(_PAGE_LIMIT_MIN, min(_PAGE_LIMIT_MAX, int(limit)))

    if before_id is None:
        cur = conn.execute(
            "SELECT id, channel, user_id, text, mentions, flagged, created_at "
            "FROM community_messages "
            "WHERE channel = ? "
            "ORDER BY id DESC LIMIT ?",
            (channel, limit),
        )
    else:
        cur = conn.execute(
            "SELECT id, channel, user_id, text, mentions, flagged, created_at "
            "FROM community_messages "
            "WHERE channel = ? AND id < ? "
            "ORDER BY id DESC LIMIT ?",
            (channel, before_id, limit),
        )
    return [_row_to_dict(row) for row in cur.fetchall()]
