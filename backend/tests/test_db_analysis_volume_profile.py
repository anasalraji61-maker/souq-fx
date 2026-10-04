"""
T08e split test: verify the volume-profile db block moved to db_analysis.py and re-exported from db.
"""
import json
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
    db_path = tmp_path / "t08e_test.db"
    monkeypatch.setattr(db_conn, "DB_PATH", db_path)
    db.init_db()
    yield db_path


def test_migrate_volume_profile_exists_and_tables_created(temp_db):
    """db_analysis._migrate_volume_profile exists and db.init_db() creates the volume_profile_analysis and order_flow_imbalances tables."""
    assert hasattr(db_analysis, "_migrate_volume_profile")
    assert callable(db_analysis._migrate_volume_profile)
    assert hasattr(db, "_migrate_volume_profile")
    with db.get_db() as c:
        rows = c.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('volume_profile_analysis', 'order_flow_imbalances')"
        ).fetchall()
    table_names = {r[0] for r in rows}
    assert "volume_profile_analysis" in table_names
    assert "order_flow_imbalances" in table_names


def test_reexport_identity_log_and_get():
    """db.log_volume_profile_analysis / db.get_latest_volume_profile are the same objects as db_analysis versions."""
    assert db.log_volume_profile_analysis is db_analysis.log_volume_profile_analysis
    assert db.get_latest_volume_profile is db_analysis.get_latest_volume_profile
    assert db._migrate_volume_profile is db_analysis._migrate_volume_profile


def test_log_one_analysis_and_read_back(temp_db):
    """Log one analysis for a unique symbol and read it back with matching values."""
    bins = [{"price": 1.2500, "volume": 1000}]
    signals = [{"type": "BUY", "strength": "HIGH"}]
    
    row_id = db.log_volume_profile_analysis(
        symbol="VPTEST1",
        timeframe="1h",
        current_price=1.2550,
        poc_price=1.2500,
        vah_price=1.2600,
        val_price=1.2400,
        total_volume=5000.0,
        sentiment="BULLISH",
        bins_json=json.dumps(bins),
        signals_json=json.dumps(signals),
    )
    assert row_id > 0

    record = db.get_latest_volume_profile("VPTEST1", "1h")
    assert record is not None
    assert record["symbol"] == "VPTEST1"
    assert record["timeframe"] == "1h"
    assert record["current_price"] == 1.2550
    assert record["poc_price"] == 1.2500
    assert record["vah_price"] == 1.2600
    assert record["val_price"] == 1.2400
    assert record["total_volume"] == 5000.0
    assert record["sentiment"] == "BULLISH"
    assert record["bins"] == bins
    assert record["signals"] == signals


def test_two_logs_same_symbol_timeframe_latest_returned(temp_db):
    """Two logs for the same symbol and timeframe: the latest one is returned."""
    db.log_volume_profile_analysis(
        symbol="VPTEST1",
        timeframe="1h",
        current_price=1.2500,
        poc_price=1.2480,
        vah_price=1.2550,
        val_price=1.2420,
        total_volume=4000.0,
        sentiment="BEARISH",
        bins_json=json.dumps([]),
        signals_json=json.dumps([]),
    )
    db.log_volume_profile_analysis(
        symbol="VPTEST1",
        timeframe="1h",
        current_price=1.2600,
        poc_price=1.2580,
        vah_price=1.2650,
        val_price=1.2520,
        total_volume=6000.0,
        sentiment="BULLISH",
        bins_json=json.dumps([{"price": 1.2580, "volume": 2000}]),
        signals_json=json.dumps([{"type": "SELL"}]),
    )

    record = db.get_latest_volume_profile("VPTEST1", "1h")
    assert record is not None
    assert record["current_price"] == 1.2600
    assert record["poc_price"] == 1.2580
    assert record["total_volume"] == 6000.0
    assert record["sentiment"] == "BULLISH"
    assert len(record["bins"]) == 1
    assert record["bins"][0]["price"] == 1.2580
    assert record["signals"][0]["type"] == "SELL"


def test_unknown_symbol_returns_none_and_symbol_uppercased(temp_db):
    """An unknown symbol returns None, and the symbol is upper-cased on lookup."""
    # Log with lowercase symbol
    db.log_volume_profile_analysis(
        symbol="vptest1",
        timeframe="1h",
        current_price=1.2500,
        poc_price=1.2480,
        vah_price=1.2550,
        val_price=1.2420,
        total_volume=4000.0,
        sentiment="NEUTRAL",
        bins_json=json.dumps([]),
        signals_json=json.dumps([]),
    )
    
    # Query with uppercase - should find it
    record = db.get_latest_volume_profile("VPTEST1", "1h")
    assert record is not None
    assert record["symbol"] == "VPTEST1"
    
    # Query with different symbol - should return None
    record = db.get_latest_volume_profile("UNKNOWN", "1h")
    assert record is None
    
    # Query with different timeframe - should return None
    record = db.get_latest_volume_profile("VPTEST1", "4h")
    assert record is None


def test_order_flow_imbalances_table_exists(temp_db):
    """After init, the table order_flow_imbalances exists (query sqlite_master)."""
    with db.get_db() as c:
        rows = c.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'order_flow_imbalances'"
        ).fetchall()
    table_names = {r[0] for r in rows}
    assert "order_flow_imbalances" in table_names