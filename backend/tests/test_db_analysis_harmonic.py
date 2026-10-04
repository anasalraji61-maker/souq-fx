"""
T08d split test: verify the harmonic-patterns db block moved to db_analysis.py and re-exported from db.
"""
import os
import sys

import pytest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import db
import db_analysis
from core import db_conn


@pytest.fixture()
def temp_db(tmp_path, monkeypatch):
    """Point the DB connection at a fresh temp SQLite file."""
    db_path = tmp_path / "t08d_test.db"
    monkeypatch.setattr(db_conn, "DB_PATH", db_path)
    db.init_db()
    yield db_path


def test_migrate_harmonic_patterns_exists_and_table_created(temp_db):
    """db_analysis._migrate_harmonic_patterns exists and db.init_db() creates the harmonic_patterns table."""
    assert hasattr(db_analysis, "_migrate_harmonic_patterns")
    assert callable(db_analysis._migrate_harmonic_patterns)
    assert hasattr(db, "_migrate_harmonic_patterns")
    with db.get_db() as c:
        rows = c.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'harmonic_patterns'"
        ).fetchall()
    table_names = {r[0] for r in rows}
    assert "harmonic_patterns" in table_names


def test_reexport_identity_log_and_get():
    """db.log_harmonic_pattern / db.get_harmonic_patterns are the same objects as db_analysis versions."""
    assert db.log_harmonic_pattern is db_analysis.log_harmonic_pattern
    assert db.get_harmonic_patterns is db_analysis.get_harmonic_patterns
    assert db._migrate_harmonic_patterns is db_analysis._migrate_harmonic_patterns


def test_log_one_pattern_and_read_back(temp_db):
    """Log one pattern for a unique symbol and read it back with matching values."""
    pat_id = db.log_harmonic_pattern(
        symbol="T08DXYZ",
        timeframe="1h",
        pattern_type="Bat",
        direction="BULLISH",
        x_price=1.2500,
        a_price=1.2700,
        b_price=1.2590,
        c_price=1.2660,
        d_price=1.2520,
        prz_min=1.2515,
        prz_max=1.2525,
        stop_loss=1.2480,
        tp1=1.2580,
        tp2=1.2630,
        tp3=1.2700,
        confidence_score=92.5,
        status="COMPLETED",
    )
    assert pat_id > 0

    records = db.get_harmonic_patterns("T08DXYZ", timeframe="1h", limit=10)
    assert len(records) == 1
    rec = records[0]
    assert rec["symbol"] == "T08DXYZ"
    assert rec["timeframe"] == "1h"
    assert rec["pattern_type"] == "Bat"
    assert rec["direction"] == "BULLISH"
    assert rec["x_price"] == 1.2500
    assert rec["a_price"] == 1.2700
    assert rec["b_price"] == 1.2590
    assert rec["c_price"] == 1.2660
    assert rec["d_price"] == 1.2520
    assert rec["prz_min"] == 1.2515
    assert rec["prz_max"] == 1.2525
    assert rec["stop_loss"] == 1.2480
    assert rec["tp1"] == 1.2580
    assert rec["tp2"] == 1.2630
    assert rec["tp3"] == 1.2700
    assert rec["confidence_score"] == 92.5
    assert rec["status"] == "COMPLETED"
    assert rec["id"] == pat_id


def test_get_patterns_missing_symbol_returns_empty(temp_db):
    """db.get_harmonic_patterns('NOSUCH_T08D') returns []."""
    assert db.get_harmonic_patterns("NOSUCH_T08D", timeframe="1h", limit=10) == []
    assert db.get_harmonic_patterns("NOSUCH_T08D") == []
