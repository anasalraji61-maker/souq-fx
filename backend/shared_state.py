"""State shared between server processes when the API runs with several workers (`MATRIX_WORKERS` > 1).

With one worker (the default, and the tests) nothing here is used and every caller keeps its old in-memory
behaviour. With several workers:

- one process (the *leader*, chosen by an exclusive file lock) runs the background jobs: the live-price
  WebSocket, the alert checker and the daily backup. It publishes the live ticks to a small SQLite file that
  the other workers read (at most once a second).
- rate limits (sign-up, login lockout, forgot-password, waitlist, client errors) and the market-data request
  budget are counted in that same file, so N workers do not multiply the limits by N.
- database migrations at start-up run one worker at a time (`init_lock`).

The file lives next to the main database (`runtime_state.db`). It holds nothing that must survive: deleting it
is harmless.
"""
from __future__ import annotations

import contextlib
import os
import sqlite3
import threading
import time
from pathlib import Path
from typing import Iterator

from core import db_conn

_local = threading.local()
_leader_fd: int | None = None
_is_leader = False


def workers() -> int:
    try:
        return max(1, int(os.getenv("MATRIX_WORKERS", "1") or 1))
    except ValueError:
        return 1


def multi() -> bool:
    return workers() > 1


def _dir() -> Path:
    d = Path(db_conn.DB_PATH).parent
    d.mkdir(parents=True, exist_ok=True)
    return d


def _conn() -> sqlite3.Connection:
    path = str(_dir() / "runtime_state.db")
    c = getattr(_local, "conn", None)
    if c is not None and getattr(_local, "path", None) == path:
        return c
    c = sqlite3.connect(path, timeout=10, isolation_level=None, check_same_thread=False)
    c.execute("PRAGMA journal_mode=WAL")
    c.execute("PRAGMA synchronous=OFF")
    c.execute("CREATE TABLE IF NOT EXISTS hits (bucket TEXT NOT NULL, key TEXT NOT NULL, ts REAL NOT NULL)")
    c.execute("CREATE INDEX IF NOT EXISTS hits_bk ON hits(bucket, key, ts)")
    c.execute(
        "CREATE TABLE IF NOT EXISTS ticks (sym TEXT PRIMARY KEY, price REAL NOT NULL, at REAL NOT NULL, "
        "provider_ts REAL)"
    )
    _local.conn, _local.path = c, path
    return c


# ---------------------------------------------------------------- leader / start-up
def acquire_leader() -> bool:
    """True in exactly one process (non-blocking exclusive lock held for the life of the process)."""
    global _leader_fd, _is_leader
    if not multi():
        _is_leader = True
        return True
    if _leader_fd is not None:
        return _is_leader
    import fcntl

    fd = os.open(str(_dir() / "matrix-leader.lock"), os.O_RDWR | os.O_CREAT, 0o600)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        _is_leader = True
    except OSError:
        _is_leader = False
    _leader_fd = fd
    return _is_leader


def is_leader() -> bool:
    return _is_leader or not multi()


@contextlib.contextmanager
def init_lock() -> Iterator[None]:
    """Run start-up migrations one worker at a time."""
    if not multi():
        yield
        return
    import fcntl

    fd = os.open(str(_dir() / "matrix-init.lock"), os.O_RDWR | os.O_CREAT, 0o600)
    try:
        fcntl.flock(fd, fcntl.LOCK_EX)
        yield
    finally:
        try:
            fcntl.flock(fd, fcntl.LOCK_UN)
        finally:
            os.close(fd)


# ---------------------------------------------------------------- counters (sliding window)
def allow(bucket: str, key: str, limit: int, window: float) -> bool:
    """Count one hit for (bucket, key) unless `limit` hits already happened in the last `window` seconds."""
    now = time.time()
    c = _conn()
    try:
        c.execute("BEGIN IMMEDIATE")
        c.execute("DELETE FROM hits WHERE bucket=? AND key=? AND ts<?", (bucket, key, now - window))
        n = c.execute("SELECT COUNT(*) FROM hits WHERE bucket=? AND key=?", (bucket, key)).fetchone()[0]
        ok = n < limit
        if ok:
            c.execute("INSERT INTO hits(bucket, key, ts) VALUES(?,?,?)", (bucket, key, now))
        c.execute("COMMIT")
    except sqlite3.Error:
        with contextlib.suppress(sqlite3.Error):
            c.execute("ROLLBACK")
        return True  # never lock users out because the counter file failed
    _maybe_prune(now)
    return ok


def record(bucket: str, key: str) -> None:
    with contextlib.suppress(sqlite3.Error):
        _conn().execute("INSERT INTO hits(bucket, key, ts) VALUES(?,?,?)", (bucket, key, time.time()))


def recent(bucket: str, key: str, window: float) -> list[float]:
    """Timestamps of the hits in the last `window` seconds, oldest first."""
    try:
        rows = _conn().execute(
            "SELECT ts FROM hits WHERE bucket=? AND key=? AND ts>=? ORDER BY ts", (bucket, key, time.time() - window)
        ).fetchall()
    except sqlite3.Error:
        return []
    return [r[0] for r in rows]


def clear(bucket: str, key: str) -> None:
    with contextlib.suppress(sqlite3.Error):
        _conn().execute("DELETE FROM hits WHERE bucket=? AND key=?", (bucket, key))


_last_prune = 0.0


def _maybe_prune(now: float) -> None:
    global _last_prune
    if now - _last_prune < 600:
        return
    _last_prune = now
    with contextlib.suppress(sqlite3.Error):
        _conn().execute("DELETE FROM hits WHERE ts<?", (now - 86400,))


# ---------------------------------------------------------------- live ticks
def publish_ticks(latest: dict[str, float], latest_at: dict[str, float], provider_ts: dict[str, float]) -> None:
    rows = [(s, float(p), float(latest_at.get(s, 0.0)), provider_ts.get(s)) for s, p in list(latest.items())]
    if not rows:
        return
    c = _conn()
    try:
        c.execute("BEGIN IMMEDIATE")
        c.executemany(
            "INSERT INTO ticks(sym, price, at, provider_ts) VALUES(?,?,?,?) "
            "ON CONFLICT(sym) DO UPDATE SET price=excluded.price, at=excluded.at, provider_ts=excluded.provider_ts "
            "WHERE excluded.at >= ticks.at",
            rows,
        )
        c.execute("COMMIT")
    except sqlite3.Error:
        with contextlib.suppress(sqlite3.Error):
            c.execute("ROLLBACK")


def load_ticks() -> list[tuple[str, float, float, float | None]]:
    try:
        return [tuple(r) for r in _conn().execute("SELECT sym, price, at, provider_ts FROM ticks").fetchall()]
    except sqlite3.Error:
        return []
