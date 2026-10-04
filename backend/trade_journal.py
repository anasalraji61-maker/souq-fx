"""Self-contained SQLite store for the trade journal.

Journal entries linked to closed trades, plus per-tag stats.
Caller passes its own sqlite3 connection and an explicit `now`.
No routes; no imports from db.py or main.py.
"""

import json
import math
import sqlite3

EMOTIONS = ("calm", "confident", "fearful", "greedy", "anxious", "neutral")

_MAX_NOTES_CHARS = 2000
_MAX_TAGS = 10
_PAGE_LIMIT_MIN = 1
_PAGE_LIMIT_MAX = 200


def init_db(conn):
    """Create the journal_entries table and index if missing. Idempotent."""
    conn.execute(
        "CREATE TABLE IF NOT EXISTS journal_entries ("
        "id INTEGER PRIMARY KEY AUTOINCREMENT,"
        "user_id INTEGER,"
        "trade_id TEXT,"
        "notes TEXT,"
        "tags TEXT,"
        "emotion TEXT,"
        "screenshot_url TEXT,"
        "pnl REAL,"
        "created_at REAL,"
        "updated_at REAL"
        ")"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_journal_user_trade "
        "ON journal_entries (user_id, trade_id)"
    )
    conn.commit()


def _validate_trade_id(trade_id):
    if not isinstance(trade_id, str) or not trade_id:
        raise ValueError("trade_id must be a non-empty string")


def _validate_notes(notes):
    if not isinstance(notes, str):
        raise ValueError("notes must be a string")
    if len(notes) > _MAX_NOTES_CHARS:
        raise ValueError("notes too long")


def _validate_tags(tags):
    if tags is None:
        return []
    if not isinstance(tags, list):
        raise ValueError("tags must be a list")
    normalized = []
    for tag in tags:
        if not isinstance(tag, str):
            raise ValueError("tags must be strings")
        tag = tag.strip().lower()
        if tag and tag not in normalized:
            normalized.append(tag)
    if len(normalized) > _MAX_TAGS:
        raise ValueError("too many tags")
    return normalized


def _validate_emotion(emotion):
    if emotion not in EMOTIONS:
        raise ValueError(f"invalid emotion: {emotion!r}")


def _validate_screenshot_url(screenshot_url):
    if screenshot_url is None:
        return
    if not isinstance(screenshot_url, str):
        raise ValueError("screenshot_url must be a string or None")
    if not (screenshot_url.startswith("http://") or screenshot_url.startswith("https://")):
        raise ValueError("screenshot_url must start with http:// or https://")


def _validate_pnl(pnl):
    if isinstance(pnl, bool):
        raise ValueError("pnl must not be a bool")
    if not isinstance(pnl, (int, float)):
        raise ValueError("pnl must be a number")
    if not math.isfinite(pnl):
        raise ValueError("pnl must be finite")


def _row_to_dict(row):
    (
        eid,
        user_id,
        trade_id,
        notes,
        tags_json,
        emotion,
        screenshot_url,
        pnl,
        created_at,
        updated_at,
    ) = row
    return {
        "id": eid,
        "user_id": user_id,
        "trade_id": trade_id,
        "notes": notes,
        "tags": json.loads(tags_json) if tags_json else [],
        "emotion": emotion,
        "screenshot_url": screenshot_url,
        "pnl": pnl,
        "created_at": created_at,
        "updated_at": updated_at,
    }


def create_entry(
    conn,
    user_id,
    trade_id,
    notes="",
    tags=None,
    emotion="neutral",
    screenshot_url=None,
    pnl=0.0,
    now=0.0,
):
    """Validate and store a journal entry. Returns the stored record dict."""
    _validate_trade_id(trade_id)
    _validate_notes(notes)
    tags_norm = _validate_tags(tags)
    _validate_emotion(emotion)
    _validate_screenshot_url(screenshot_url)
    _validate_pnl(pnl)

    cur = conn.execute(
        "INSERT INTO journal_entries "
        "(user_id, trade_id, notes, tags, emotion, screenshot_url, pnl, created_at, updated_at) "
        "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            user_id,
            trade_id,
            notes,
            json.dumps(tags_norm),
            emotion,
            screenshot_url,
            float(pnl),
            now,
            now,
        ),
    )
    conn.commit()

    return {
        "id": cur.lastrowid,
        "user_id": user_id,
        "trade_id": trade_id,
        "notes": notes,
        "tags": tags_norm,
        "emotion": emotion,
        "screenshot_url": screenshot_url,
        "pnl": float(pnl),
        "created_at": now,
        "updated_at": now,
    }


def get_entry(conn, user_id, entry_id):
    """Return a single entry dict for this user, or None."""
    cur = conn.execute(
        "SELECT id, user_id, trade_id, notes, tags, emotion, screenshot_url, pnl, created_at, updated_at "
        "FROM journal_entries "
        "WHERE id = ? AND user_id = ?",
        (entry_id, user_id),
    )
    row = cur.fetchone()
    if row is None:
        return None
    return _row_to_dict(row)


def list_entries(conn, user_id, tag=None, trade_id=None, limit=50, offset=0):
    """Return entries for the user, newest first. Clamps limit to 1..200."""
    limit = max(_PAGE_LIMIT_MIN, min(_PAGE_LIMIT_MAX, int(limit)))
    offset = max(0, int(offset))

    sql = (
        "SELECT id, user_id, trade_id, notes, tags, emotion, screenshot_url, pnl, created_at, updated_at "
        "FROM journal_entries "
        "WHERE user_id = ?"
    )
    args = [user_id]

    if tag is not None:
        sql += (
            " AND EXISTS (SELECT 1 FROM json_each(tags) WHERE json_each.value = ?)"
        )
        args.append(tag)
    if trade_id is not None:
        sql += " AND trade_id = ?"
        args.append(trade_id)

    sql += " ORDER BY id DESC LIMIT ? OFFSET ?"
    args.extend([limit, offset])

    cur = conn.execute(sql, args)
    return [_row_to_dict(row) for row in cur.fetchall()]


def update_entry(conn, user_id, entry_id, now=0.0, **fields):
    """Update allowed fields on an entry. Returns the updated dict or None."""
    allowed = {"notes", "tags", "emotion", "screenshot_url", "pnl"}
    unknown = set(fields) - allowed
    if unknown:
        raise ValueError(f"unknown field(s): {', '.join(sorted(unknown))}")

    entry = get_entry(conn, user_id, entry_id)
    if entry is None:
        return None

    if "notes" in fields:
        _validate_notes(fields["notes"])
        entry["notes"] = fields["notes"]
    if "tags" in fields:
        entry["tags"] = _validate_tags(fields["tags"])
    if "emotion" in fields:
        _validate_emotion(fields["emotion"])
        entry["emotion"] = fields["emotion"]
    if "screenshot_url" in fields:
        _validate_screenshot_url(fields["screenshot_url"])
        entry["screenshot_url"] = fields["screenshot_url"]
    if "pnl" in fields:
        _validate_pnl(fields["pnl"])
        entry["pnl"] = float(fields["pnl"])

    entry["updated_at"] = now

    conn.execute(
        "UPDATE journal_entries SET "
        "notes = ?, tags = ?, emotion = ?, screenshot_url = ?, pnl = ?, updated_at = ? "
        "WHERE id = ? AND user_id = ?",
        (
            entry["notes"],
            json.dumps(entry["tags"]),
            entry["emotion"],
            entry["screenshot_url"],
            entry["pnl"],
            now,
            entry_id,
            user_id,
        ),
    )
    conn.commit()

    return {
        "id": entry["id"],
        "user_id": entry["user_id"],
        "trade_id": entry["trade_id"],
        "notes": entry["notes"],
        "tags": entry["tags"],
        "emotion": entry["emotion"],
        "screenshot_url": entry["screenshot_url"],
        "pnl": entry["pnl"],
        "created_at": entry["created_at"],
        "updated_at": entry["updated_at"],
    }


def delete_entry(conn, user_id, entry_id):
    """Delete an entry. Returns True if deleted, False if not found."""
    cur = conn.execute(
        "DELETE FROM journal_entries WHERE id = ? AND user_id = ?",
        (entry_id, user_id),
    )
    conn.commit()
    return cur.rowcount > 0


def stats_by_tag(conn, user_id):
    """Return per-tag stats: count, wins, win_rate, total_pnl."""
    cur = conn.execute(
        "SELECT tags, pnl FROM journal_entries WHERE user_id = ?",
        (user_id,),
    )
    tag_data = {}
    for row in cur.fetchall():
        tags_json, pnl = row
        tags = json.loads(tags_json) if tags_json else []
        for tag in tags:
            if tag not in tag_data:
                tag_data[tag] = {"count": 0, "wins": 0, "total_pnl": 0.0}
            tag_data[tag]["count"] += 1
            tag_data[tag]["total_pnl"] += pnl
            if pnl > 0:
                tag_data[tag]["wins"] += 1

    result = []
    for tag in sorted(tag_data, key=lambda t: (-tag_data[t]["count"], t)):
        data = tag_data[tag]
        result.append(
            {
                "tag": tag,
                "count": data["count"],
                "wins": data["wins"],
                "win_rate": round(data["wins"] / data["count"], 4),
                "total_pnl": data["total_pnl"],
            }
        )
    return result
