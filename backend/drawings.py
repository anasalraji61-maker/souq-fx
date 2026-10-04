"""Self-contained SQLite store for chart drawings.

Key per user, symbol and timeframe. Validates input. No imports from db.py.
"""

import json
import math
import sqlite3
import time
import uuid

ALLOWED_TYPES = ("trendline", "hline", "fibonacci", "rectangle")

_REQUIRED_POINTS = {
    "trendline": 2,
    "hline": 1,
    "fibonacci": 2,
    "rectangle": 2,
}

_MAX_STYLE_CHARS = 2000
_MAX_TIME = 4102444800  # year 2100-01-01T00:00:00Z-ish boundary
_DRAWING_LIMIT = 200


class DrawingError(ValueError):
    """Raised for invalid drawings or store operations."""


def _is_real_int(value):
    """True only for genuine integers (bool rejected)."""
    return isinstance(value, int) and not isinstance(value, bool)


def _is_real_number(value):
    """True only for real int/float (bool rejected)."""
    return isinstance(value, (int, float)) and not isinstance(value, bool)


def validate_drawing(dtype, points, style=None):
    """Validate a drawing and return normalized points.

    Returns a list of `{"time": int, "price": float}`.
    Raises DrawingError on any invalid input.
    """
    if dtype not in ALLOWED_TYPES:
        raise DrawingError(f"unknown drawing type: {dtype!r}")

    if not isinstance(points, list):
        raise DrawingError("points must be a list")

    required = _REQUIRED_POINTS[dtype]
    if len(points) != required:
        raise DrawingError(
            f"{dtype} requires {required} points, got {len(points)}"
        )

    normalized = []
    for idx, point in enumerate(points):
        if not isinstance(point, dict):
            raise DrawingError(f"point {idx} must be a dict")

        if "time" not in point or "price" not in point:
            raise DrawingError(f"point {idx} must have time and price")

        raw_time = point["time"]
        if not _is_real_int(raw_time):
            raise DrawingError(
                f"point {idx} time must be an integer, not {type(raw_time).__name__}"
            )
        if raw_time <= 0:
            raise DrawingError(f"point {idx} time must be > 0")
        if raw_time > _MAX_TIME:
            raise DrawingError(f"point {idx} time exceeds maximum allowed")

        raw_price = point["price"]
        if not _is_real_number(raw_price):
            raise DrawingError(
                f"point {idx} price must be a number, not {type(raw_price).__name__}"
            )
        if not math.isfinite(raw_price):
            raise DrawingError(f"point {idx} price must be finite")
        if raw_price <= 0:
            raise DrawingError(f"point {idx} price must be > 0")

        normalized.append({"time": int(raw_time), "price": float(raw_price)})

    if style is not None:
        if not isinstance(style, dict):
            raise DrawingError("style must be a dict or None")
        if len(json.dumps(style)) > _MAX_STYLE_CHARS:
            raise DrawingError("style payload too large")

    return normalized


class DrawingStore:
    """SQLite-backed chart drawings store."""

    def __init__(self, db_path):
        self.db_path = str(db_path)
        conn = sqlite3.connect(self.db_path)
        try:
            conn.execute(
                "CREATE TABLE IF NOT EXISTS chart_drawings ("
                "id TEXT PRIMARY KEY,"
                "user_id TEXT,"
                "symbol TEXT,"
                "timeframe TEXT,"
                "dtype TEXT,"
                "points_json TEXT,"
                "style_json TEXT,"
                "created_at REAL"
                ")"
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS idx_drawings_user_symbol_tf "
                "ON chart_drawings (user_id, symbol, timeframe)"
            )
            conn.commit()
        finally:
            conn.close()

    def _open(self):
        conn = sqlite3.connect(self.db_path)
        return conn

    def add(self, user_id, symbol, timeframe, dtype, points, style=None, now=None):
        """Validate and insert a drawing. Returns the stored record dict."""
        if not user_id or not isinstance(user_id, str) or not user_id.strip():
            raise DrawingError("user_id is required")
        if not symbol or not isinstance(symbol, str) or not symbol.strip():
            raise DrawingError("symbol is required")
        if not timeframe or not isinstance(timeframe, str) or not timeframe.strip():
            raise DrawingError("timeframe is required")

        symbol = symbol.strip().upper()

        if now is None:
            now = time.time()

        normalized_points = validate_drawing(dtype, points, style)

        conn = self._open()
        try:
            cur = conn.execute(
                "SELECT COUNT(*) FROM chart_drawings "
                "WHERE user_id = ? AND symbol = ? AND timeframe = ?",
                (user_id, symbol, timeframe),
            )
            (count,) = cur.fetchone()
            if count >= _DRAWING_LIMIT:
                raise DrawingError("limit")

            drawing_id = uuid.uuid4().hex
            style_json = json.dumps(style) if style is not None else None

            conn.execute(
                "INSERT INTO chart_drawings "
                "(id, user_id, symbol, timeframe, dtype, points_json, style_json, created_at) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (
                    drawing_id,
                    user_id,
                    symbol,
                    timeframe,
                    dtype,
                    json.dumps(normalized_points),
                    style_json,
                    now,
                ),
            )
            conn.commit()
        finally:
            conn.close()

        return {
            "id": drawing_id,
            "user_id": user_id,
            "symbol": symbol,
            "timeframe": timeframe,
            "dtype": dtype,
            "points": normalized_points,
            "style": style if style is not None else None,
            "created_at": now,
        }

    def list(self, user_id, symbol, timeframe):
        """Return drawings for user/symbol/timeframe ordered by created_at, rowid."""
        symbol = symbol.strip().upper()
        conn = self._open()
        try:
            cur = conn.execute(
                "SELECT id, user_id, symbol, timeframe, dtype, "
                "points_json, style_json, created_at "
                "FROM chart_drawings "
                "WHERE user_id = ? AND symbol = ? AND timeframe = ? "
                "ORDER BY created_at ASC, rowid ASC",
                (user_id, symbol, timeframe),
            )
            rows = cur.fetchall()
        finally:
            conn.close()

        results = []
        for row in rows:
            (
                drawing_id,
                db_user_id,
                db_symbol,
                db_timeframe,
                db_dtype,
                points_json,
                style_json,
                created_at,
            ) = row
            style = json.loads(style_json) if style_json is not None else None
            results.append(
                {
                    "id": drawing_id,
                    "user_id": db_user_id,
                    "symbol": db_symbol,
                    "timeframe": db_timeframe,
                    "dtype": db_dtype,
                    "points": json.loads(points_json),
                    "style": style,
                    "created_at": created_at,
                }
            )
        return results

    def delete(self, user_id, drawing_id):
        """Delete a drawing belonging to user_id. Returns True if deleted."""
        conn = self._open()
        try:
            cur = conn.execute(
                "DELETE FROM chart_drawings WHERE id = ? AND user_id = ?",
                (drawing_id, user_id),
            )
            conn.commit()
            return cur.rowcount > 0
        finally:
            conn.close()

    def clear(self, user_id, symbol, timeframe):
        """Delete all drawings for the given user/symbol/timeframe. Returns count."""
        symbol = symbol.strip().upper()
        conn = self._open()
        try:
            cur = conn.execute(
                "DELETE FROM chart_drawings "
                "WHERE user_id = ? AND symbol = ? AND timeframe = ?",
                (user_id, symbol, timeframe),
            )
            conn.commit()
            return cur.rowcount
        finally:
            conn.close()
