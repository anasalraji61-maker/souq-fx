"""Journal contract helpers: side-table storage and frontend shape mapping.

Mirrors the frontend contract in src/api/journal.ts (JournalEntry / JournalStats).
"""
from __future__ import annotations

import math
import sqlite3
from datetime import datetime, timezone

_NUMERIC_EXTRA = ("entry_price", "exit_price", "lots")


def _finite_number(value):
    if isinstance(value, bool):
        raise ValueError("value must not be a bool")
    if not isinstance(value, (int, float)):
        raise ValueError("value must be a number")
    if not math.isfinite(value):
        raise ValueError("value must be finite")
    return float(value)


def init_extra(conn: sqlite3.Connection) -> None:
    """Create the journal_extra side table if missing. Idempotent."""
    conn.execute(
        "CREATE TABLE IF NOT EXISTS journal_extra ("
        "entry_id INTEGER PRIMARY KEY,"
        "date TEXT,"
        "symbol TEXT,"
        "direction TEXT,"
        "entry_price REAL,"
        "exit_price REAL,"
        "lots REAL"
        ")"
    )
    conn.commit()


def save_extra(conn: sqlite3.Connection, entry_id, data: dict) -> None:
    """Upsert the side-table row for an entry. Missing keys keep old values."""
    if not isinstance(data, dict):
        raise ValueError("data must be a dict")
    if "direction" in data:
        _validate_direction(data["direction"])
    for field in _NUMERIC_EXTRA:
        if field in data:
            _finite_number(data[field])

    current = get_extra(conn, entry_id) or {}
    merged = dict(current)
    for key in ("date", "symbol", "direction", "entry_price", "exit_price", "lots"):
        if key in data:
            merged[key] = data[key]

    conn.execute(
        "INSERT INTO journal_extra (entry_id, date, symbol, direction, entry_price, exit_price, lots) "
        "VALUES (?, ?, ?, ?, ?, ?, ?) "
        "ON CONFLICT(entry_id) DO UPDATE SET "
        "date = excluded.date, symbol = excluded.symbol, direction = excluded.direction, "
        "entry_price = excluded.entry_price, exit_price = excluded.exit_price, lots = excluded.lots",
        (
            entry_id,
            merged.get("date"),
            merged.get("symbol"),
            merged.get("direction"),
            merged.get("entry_price"),
            merged.get("exit_price"),
            merged.get("lots"),
        ),
    )
    conn.commit()


def get_extra(conn: sqlite3.Connection, entry_id):
    """Return the side-table row as a dict, or None."""
    row = conn.execute(
        "SELECT entry_id, date, symbol, direction, entry_price, exit_price, lots "
        "FROM journal_extra WHERE entry_id = ?",
        (entry_id,),
    ).fetchone()
    if row is None:
        return None
    return dict(zip(
        ("entry_id", "date", "symbol", "direction", "entry_price", "exit_price", "lots"), row
    ))


def delete_extra(conn: sqlite3.Connection, entry_id) -> None:
    """Remove the side-table row for an entry (no error if absent)."""
    conn.execute("DELETE FROM journal_extra WHERE entry_id = ?", (entry_id,))
    conn.commit()


def _validate_direction(direction):
    if direction not in ("buy", "sell"):
        raise ValueError("direction must be 'buy' or 'sell'")


def _iso_utc(ts) -> str:
    if isinstance(ts, (int, float)) and not isinstance(ts, bool) and math.isfinite(float(ts)):
        return datetime.fromtimestamp(float(ts), tz=timezone.utc).isoformat()
    return ""


def to_frontend_entry(rec: dict, extra: dict | None) -> dict:
    """Map a stored entry dict (+ optional extra row) to the frontend shape.

    Raises ValueError when direction or numeric fields are not valid.
    """
    extra = extra or {}
    symbol = extra.get("symbol") or ""
    direction = extra.get("direction") or "buy"
    _validate_direction(direction)
    entry_price = _finite_number(extra.get("entry_price") if extra.get("entry_price") is not None else 0.0)
    exit_price = _finite_number(extra.get("exit_price") if extra.get("exit_price") is not None else 0.0)
    lots = _finite_number(extra.get("lots") if extra.get("lots") is not None else 0.0)

    date = extra.get("date")
    if not isinstance(date, str) or not date:
        date = _iso_utc(rec.get("created_at"))

    pnl = rec.get("pnl")
    if pnl is None:
        pnl = 0.0
    pnl = _finite_number(pnl)

    return {
        "id": str(rec["id"]),
        "date": date,
        "symbol": symbol,
        "direction": direction,
        "entry_price": entry_price,
        "exit_price": exit_price,
        "lots": lots,
        "pnl": pnl,
        "tags": list(rec.get("tags") or []),
        "emotion": rec.get("emotion"),
        "notes": rec.get("notes"),
        "screenshot_url": rec.get("screenshot_url"),
    }


def compute_stats(entries: list[dict]) -> dict:
    """Compute the frontend stats shape from frontend entries.

    Replicates computeStatsLocally in src/api/journal.ts.
    """
    total = len(entries)
    wins = [e for e in entries if e["pnl"] > 0]
    losses = [e for e in entries if e["pnl"] < 0]
    win_rate = round((len(wins) / total * 100), 1) if total > 0 else 0.0
    total_pnl = round(sum(e["pnl"] for e in entries), 2)

    gross_profit = sum(e["pnl"] for e in wins)
    gross_loss = abs(sum(e["pnl"] for e in losses))
    if gross_loss > 0:
        profit_factor = gross_profit / gross_loss
    else:
        profit_factor = 99.9 if gross_profit > 0 else 0.0

    tag_data: dict[str, dict] = {}
    for entry in entries:
        for tag in entry.get("tags") or []:
            cur = tag_data.setdefault(tag, {"count": 0, "wins": 0, "pnl": 0.0})
            cur["count"] += 1
            if entry["pnl"] > 0:
                cur["wins"] += 1
            cur["pnl"] += entry["pnl"]

    by_tag = [
        {
            "tag": tag,
            "count": data["count"],
            "win_rate": round(data["wins"] / data["count"] * 100),
            "total_pnl": round(data["pnl"], 2),
        }
        for tag, data in tag_data.items()
    ]
    by_tag.sort(key=lambda t: -t["count"])

    return {
        "total_trades": total,
        "winning_trades": len(wins),
        "losing_trades": len(losses),
        "win_rate": win_rate,
        "total_pnl": total_pnl,
        "profit_factor": round(profit_factor, 2),
        "by_tag": by_tag,
    }
