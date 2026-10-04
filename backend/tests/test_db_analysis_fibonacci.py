"""
T08g split test: verify the Fibonacci db block moved to db_analysis.py and re-exported from db.
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
    db_path = tmp_path / "t08g_test.db"
    monkeypatch.setattr(db_conn, "DB_PATH", db_path)
    db.init_db()
    yield db_path


def test_empty_table_returns_none(temp_db):
    """get_latest_fibonacci returns None when the fibonacci_analysis table is empty."""
    record = db.get_latest_fibonacci("FIBT1", "1h")
    assert record is None


def test_log_and_read_back(temp_db):
    """After log_fibonacci_analysis, the latest row has correct symbol/trend upper-casing and floats."""
    row_id = db.log_fibonacci_analysis(
        symbol="fibt1",
        timeframe="1h",
        trend="up",
        swing_low=1.0800,
        swing_high=1.0950,
        current_price=1.0890,
        golden_pocket_min=1.0852,
        golden_pocket_max=1.0857,
        nearest_level_ratio=0.786,
        nearest_level_price=1.0893,
    )
    assert row_id > 0

    record = db.get_latest_fibonacci("FIBT1", "1h")
    assert record is not None
    assert record["symbol"] == "FIBT1"
    assert record["trend"] == "UP"
    assert record["timeframe"] == "1h"
    assert record["swing_low"] == 1.0800
    assert record["swing_high"] == 1.0950
    assert record["current_price"] == 1.0890
    assert record["golden_pocket_min"] == 1.0852
    assert record["golden_pocket_max"] == 1.0857
    assert record["nearest_level_ratio"] == 0.786
    assert record["nearest_level_price"] == 1.0893
    assert record["levels_json"] == "{}"


def test_latest_wins_and_separations(temp_db):
    """Latest per symbol/timeframe wins; different timeframes and symbols stay separate."""
    # Log two rows for FIBT1 / 1h; latest should win
    db.log_fibonacci_analysis(
        symbol="FIBT1",
        timeframe="1h",
        trend="up",
        swing_low=1.0800,
        swing_high=1.0950,
        current_price=1.0890,
        golden_pocket_min=1.0852,
        golden_pocket_max=1.0857,
        nearest_level_ratio=0.786,
        nearest_level_price=1.0892,
    )
    db.log_fibonacci_analysis(
        symbol="FIBT1",
        timeframe="1h",
        trend="down",
        swing_low=1.1000,
        swing_high=1.1150,
        current_price=1.1090,
        golden_pocket_min=1.1052,
        golden_pocket_max=1.1057,
        nearest_level_ratio=0.236,
        nearest_level_price=1.1093,
    )

    record = db.get_latest_fibonacci("FIBT1", "1h")
    assert record is not None
    assert record["trend"] == "DOWN"
    assert record["current_price"] == 1.1090

    # Different timeframe (4h) for FIBT1 stays empty
    assert db.get_latest_fibonacci("FIBT1", "4h") is None

    # Log into 4h for FIBT1; 1h result should be unchanged
    db.log_fibonacci_analysis(
        symbol="FIBT1",
        timeframe="4h",
        trend="up",
        swing_low=1.1200,
        swing_high=1.1350,
        current_price=1.1290,
        golden_pocket_min=1.1252,
        golden_pocket_max=1.1257,
        nearest_level_ratio=0.500,
        nearest_level_price=1.1293,
    )
    record_1h = db.get_latest_fibonacci("FIBT1", "1h")
    assert record_1h is not None
    assert record_1h["current_price"] == 1.1090

    record_4h = db.get_latest_fibonacci("FIBT1", "4h")
    assert record_4h is not None
    assert record_4h["current_price"] == 1.1290

    # FIBT2 stays separate from FIBT1
    assert db.get_latest_fibonacci("FIBT2", "1h") is None

    db.log_fibonacci_analysis(
        symbol="FIBT2",
        timeframe="1h",
        trend="up",
        swing_low=2.0800,
        swing_high=2.0950,
        current_price=2.0890,
        golden_pocket_min=2.0852,
        golden_pocket_max=2.0857,
        nearest_level_ratio=0.618,
        nearest_level_price=2.0893,
    )
    record_fibt2 = db.get_latest_fibonacci("FIBT2", "1h")
    assert record_fibt2 is not None
    assert record_fibt2["swing_high"] == 2.0950

    # FIBT1 / 1h still returns its own row, not FIBT2
    record_fibt1_1h = db.get_latest_fibonacci("FIBT1", "1h")
    assert record_fibt1_1h is not None
    assert record_fibt1_1h["swing_high"] == 1.1150


def test_reexport_identity():
    """db re-exports the Fibonacci functions from db_analysis (same objects)."""
    assert db.log_fibonacci_analysis is db_analysis.log_fibonacci_analysis
    assert db.get_latest_fibonacci is db_analysis.get_latest_fibonacci
    assert db._migrate_fibonacci is db_analysis._migrate_fibonacci


def test_fibonacci_analysis_table_created(temp_db):
    """db.init_db() creates the fibonacci_analysis table via _migrate_fibonacci."""
    with db.get_db() as c:
        rows = c.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'fibonacci_analysis'"
        ).fetchall()
    assert {r[0] for r in rows} == {"fibonacci_analysis"}