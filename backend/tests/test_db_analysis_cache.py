"""
T08c split test: verify the cache db block (_migrate_cache) moved to db_analysis.py and re-exported from db.
"""
import os
import sqlite3
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import db
import db_analysis
from core import db_conn


@pytest.fixture()
def temp_db(tmp_path, monkeypatch):
    """Point the DB connection at a fresh temp SQLite file."""
    db_path = tmp_path / "t08c_test.db"
    monkeypatch.setattr(db_conn, "DB_PATH", db_path)
    db.init_db()
    yield db_path


def test_reexport_migrate_cache():
    """db._migrate_cache is re-exported from db_analysis."""
    assert db._migrate_cache is db_analysis._migrate_cache


def test_cache_tables_exist_after_init(temp_db):
    """cache_stats and cache_invalidation_log exist after db.init_db()."""
    with db.get_db() as c:
        rows = c.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('cache_stats', 'cache_invalidation_log')"
        ).fetchall()
    table_names = {r[0] for r in rows}
    assert "cache_stats" in table_names
    assert "cache_invalidation_log" in table_names


def test_cache_rows_roundtrip_and_unique_constraint(temp_db):
    """Insert cache_stats + cache_invalidation_log rows for T08CUSD, read back, and check the UNIQUE(date, symbol) constraint."""
    with db.get_db() as c:
        c.execute(
            """
            INSERT INTO cache_stats (date, symbol, hits, misses)
            VALUES (?, ?, ?, ?)
            """,
            ("2026-10-04", "T08CUSD", 12, 3),
        )
        c.execute(
            """
            INSERT INTO cache_invalidation_log (symbol, timeframe, reason)
            VALUES (?, ?, ?)
            """,
            ("T08CUSD", "1h", "T08C test invalidation"),
        )
        c.commit()

    with db.get_db() as c:
        stats = c.execute(
            "SELECT date, symbol, hits, misses FROM cache_stats WHERE symbol = ?", ("T08CUSD",)
        ).fetchone()
        log = c.execute(
            "SELECT symbol, timeframe, reason FROM cache_invalidation_log WHERE symbol = ?", ("T08CUSD",)
        ).fetchone()
    assert stats is not None
    assert tuple(stats) == ("2026-10-04", "T08CUSD", 12, 3)
    assert log is not None
    assert tuple(log) == ("T08CUSD", "1h", "T08C test invalidation")

    with db.get_db() as c:
        with pytest.raises(sqlite3.IntegrityError):
            c.execute(
                """
                INSERT INTO cache_stats (date, symbol, hits, misses)
                VALUES (?, ?, ?, ?)
                """,
                ("2026-10-04", "T08CUSD", 1, 1),
            )
