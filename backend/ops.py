"""Operations: automatic database backups and error monitoring.

Backups
-------
SQLite online backup (consistent copy while the app keeps writing) → integrity check of the copy → gzip into
`MATRIX_BACKUP_DIR` (default: `<db folder>/backups`). The loop in `run_backup_loop` makes one backup a day
(`MATRIX_BACKUP_EVERY_H`, default 24) and keeps the newest `MATRIX_BACKUP_KEEP` files (default 14).
`MATRIX_BACKUPS=0` turns the loop off. The admin panel lists, triggers and downloads backups.

Errors
------
Unhandled server exceptions and browser errors reported by the web app go to `error_events`, grouped by a
fingerprint (same error = one row with a counter), capped at `ERROR_ROWS_MAX` rows. No request bodies, tokens
or personal data are stored: only the error type, message, route and a trimmed stack.
"""
from __future__ import annotations

import asyncio
import gzip
import hashlib
import logging
import os
import re
import shutil
import sqlite3
import time
import traceback
from pathlib import Path
from typing import Any

import db

log = logging.getLogger("matrix.ops")

# ---------------------------------------------------------------------------------------------
# Backups

BACKUP_NAME_RE = re.compile(r"^matrix-\d{8}-\d{6}\.db\.gz$")
_backup_state: dict[str, Any] = {"last_ok": None, "last_error": None, "last_error_at": None, "running": False}


def backup_dir() -> Path:
    env = (os.getenv("MATRIX_BACKUP_DIR") or "").strip()
    return Path(env).expanduser() if env else Path(db.DB_PATH).resolve().parent / "backups"


def _keep() -> int:
    try:
        return max(1, min(365, int(os.getenv("MATRIX_BACKUP_KEEP", "14"))))
    except ValueError:
        return 14


def _every_seconds() -> float:
    try:
        return max(1.0, float(os.getenv("MATRIX_BACKUP_EVERY_H", "24"))) * 3600
    except ValueError:
        return 24 * 3600


def list_backups() -> list[dict[str, Any]]:
    d = backup_dir()
    if not d.is_dir():
        return []
    out = []
    for p in d.iterdir():
        if p.is_file() and BACKUP_NAME_RE.match(p.name):
            st = p.stat()
            out.append({"name": p.name, "bytes": st.st_size, "created_at": st.st_mtime})
    out.sort(key=lambda x: x["name"], reverse=True)
    return out


def backup_path(name: str) -> Path | None:
    """Path of an existing backup file, or None (name validated: no path traversal)."""
    if not BACKUP_NAME_RE.match(name or ""):
        return None
    p = backup_dir() / name
    return p if p.is_file() else None


def backup_now() -> dict[str, Any]:
    """Make one backup. Returns the new file's info. Raises on failure (and records the error)."""
    if _backup_state["running"]:
        raise RuntimeError("backup already running")
    _backup_state["running"] = True
    d = backup_dir()
    tmp_db = None
    try:
        d.mkdir(parents=True, exist_ok=True)
        stamp = time.strftime("%Y%m%d-%H%M%S", time.gmtime())
        name = f"matrix-{stamp}.db.gz"
        tmp_db = d / f".tmp-{stamp}-{os.getpid()}.db"
        src = sqlite3.connect(str(db.DB_PATH), timeout=30)
        try:
            dst = sqlite3.connect(str(tmp_db))
            try:
                src.backup(dst)
                ok = dst.execute("PRAGMA quick_check").fetchone()
                if not ok or ok[0] != "ok":
                    raise RuntimeError(f"backup copy failed integrity check: {ok}")
            finally:
                dst.close()
        finally:
            src.close()
        final = d / name
        part = d / (name + ".part")
        with open(tmp_db, "rb") as fi, gzip.open(part, "wb", compresslevel=6) as fo:
            shutil.copyfileobj(fi, fo, 1024 * 1024)
        os.replace(part, final)
        try:
            os.chmod(final, 0o600)
        except OSError:
            pass
        # retention
        files = list_backups()
        for old in files[_keep():]:
            try:
                (d / old["name"]).unlink()
            except OSError:
                pass
        info = {"name": name, "bytes": final.stat().st_size, "created_at": final.stat().st_mtime}
        _backup_state["last_ok"] = info["created_at"]
        _backup_state["last_error"] = None
        log.info("backup written: %s (%d bytes)", name, info["bytes"])
        return info
    except Exception as exc:
        _backup_state["last_error"] = f"{type(exc).__name__}: {exc}"[:300]
        _backup_state["last_error_at"] = time.time()
        log.exception("backup failed")
        raise
    finally:
        _backup_state["running"] = False
        if tmp_db is not None:
            try:
                tmp_db.unlink()
            except OSError:
                pass


def backup_status() -> dict[str, Any]:
    files = list_backups()
    newest = files[0]["created_at"] if files else None
    return {
        "enabled": (os.getenv("MATRIX_BACKUPS", "1") or "1") != "0",
        "dir": str(backup_dir()),
        "keep": _keep(),
        "every_hours": _every_seconds() / 3600,
        "count": len(files),
        "newest_at": newest,
        "last_error": _backup_state["last_error"],
        "last_error_at": _backup_state["last_error_at"],
        "running": _backup_state["running"],
        "files": files,
    }


def backup_due(now: float | None = None) -> bool:
    files = list_backups()
    if not files:
        return True
    return (now or time.time()) - files[0]["created_at"] >= _every_seconds()


async def run_backup_loop(check_every: float = 900.0) -> None:
    """Background task: a backup when the newest one is older than the interval (checked every 15 min)."""
    if (os.getenv("MATRIX_BACKUPS", "1") or "1") == "0":
        return
    await asyncio.sleep(60)  # let the app start first
    while True:
        try:
            if backup_due():
                await asyncio.to_thread(backup_now)
        except asyncio.CancelledError:
            raise
        except Exception:
            pass  # recorded in _backup_state and the error log
        await asyncio.sleep(check_every)


# ---------------------------------------------------------------------------------------------
# Error monitoring

ERROR_ROWS_MAX = 500
_MSG_MAX = 500
_STACK_MAX = 4000
_migrated_for: str | None = None


def _ensure(c: sqlite3.Connection) -> None:
    # always (cheap): a cached "already migrated" flag broke when a database file was replaced at the same path
    c.execute(
        """CREATE TABLE IF NOT EXISTS error_events (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fingerprint TEXT NOT NULL UNIQUE,
            source TEXT NOT NULL,
            kind TEXT,
            message TEXT,
            path TEXT,
            stack TEXT,
            release TEXT,
            count INTEGER NOT NULL DEFAULT 1,
            first_at REAL NOT NULL,
            last_at REAL NOT NULL
        )"""
    )
    c.execute("CREATE INDEX IF NOT EXISTS idx_error_events_last ON error_events(last_at)")


_SECRET_RE = re.compile(r"(?i)(bearer\s+[a-z0-9._\-]+|(token|key|password|secret)=([^&\s]+)|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})")
_NUM_RE = re.compile(r"\b\d{3,}\b")


def scrub(text: str | None, limit: int) -> str:
    """Remove tokens / passwords / e-mail addresses from free text and cap its length."""
    t = (text or "")[: limit * 2]
    t = _SECRET_RE.sub("[redacted]", t)
    return t[:limit]


def _fingerprint(source: str, kind: str, message: str, path: str) -> str:
    # numbers (ids, timestamps) are normalised so the same error groups together
    norm = _NUM_RE.sub("N", f"{source}|{kind}|{message[:200]}|{path}")
    return hashlib.sha1(norm.encode("utf-8", "replace")).hexdigest()


def record_error(source: str, kind: str, message: str, path: str = "", stack: str = "", release: str = "") -> None:
    """Store (or count) one error. Never raises."""
    try:
        kind = scrub(kind, 80)
        message = scrub(message, _MSG_MAX)
        path = scrub(re.sub(r"\?.*$", "", path or ""), 200)
        stack = scrub(stack, _STACK_MAX)
        fp = _fingerprint(source, kind, message, path)
        now = time.time()
        with db._conn() as c:
            _ensure(c)
            cur = c.execute(
                "UPDATE error_events SET count=count+1, last_at=?, stack=COALESCE(NULLIF(?, ''), stack), release=COALESCE(NULLIF(?, ''), release) WHERE fingerprint=?",
                (now, stack, release[:40], fp),
            )
            if cur.rowcount == 0:
                c.execute(
                    """INSERT INTO error_events(fingerprint, source, kind, message, path, stack, release, count, first_at, last_at)
                       VALUES(?,?,?,?,?,?,?,1,?,?)""",
                    (fp, source, kind, message, path, stack, release[:40], now, now),
                )
                n = c.execute("SELECT COUNT(*) FROM error_events").fetchone()[0]
                if n > ERROR_ROWS_MAX:
                    c.execute(
                        "DELETE FROM error_events WHERE id IN (SELECT id FROM error_events ORDER BY last_at ASC LIMIT ?)",
                        (n - ERROR_ROWS_MAX,),
                    )
    except Exception:  # monitoring must never break the request
        log.exception("could not record error")


def record_exception(exc: BaseException, path: str) -> None:
    stack = "".join(traceback.format_exception(type(exc), exc, exc.__traceback__))[-_STACK_MAX:]
    record_error("server", type(exc).__name__, str(exc) or type(exc).__name__, path, stack)


def list_errors(source: str | None = None, limit: int = 200) -> list[dict[str, Any]]:
    with db._conn() as c:
        _ensure(c)
        if source:
            rows = c.execute(
                "SELECT * FROM error_events WHERE source=? ORDER BY last_at DESC LIMIT ?", (source, limit)
            ).fetchall()
        else:
            rows = c.execute("SELECT * FROM error_events ORDER BY last_at DESC LIMIT ?", (limit,)).fetchall()
    return [{k: r[k] for k in r.keys() if k != "fingerprint"} for r in rows]


def error_counts(since: float) -> dict[str, int]:
    with db._conn() as c:
        _ensure(c)
        rows = c.execute(
            "SELECT source, COUNT(*) AS groups, COALESCE(SUM(count),0) AS events FROM error_events WHERE last_at>=? GROUP BY source",
            (since,),
        ).fetchall()
    out = {"server": 0, "client": 0, "groups": 0}
    for r in rows:
        out[r["source"]] = int(r["events"])
        out["groups"] += int(r["groups"])
    return out


def clear_errors(error_id: int | None = None) -> int:
    with db._conn() as c:
        _ensure(c)
        if error_id is None:
            return c.execute("DELETE FROM error_events").rowcount
        return c.execute("DELETE FROM error_events WHERE id=?", (error_id,)).rowcount
