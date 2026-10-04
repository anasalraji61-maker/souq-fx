"""
T08f split test: verify the SMC db block moved to db_analysis.py and re-exported from db.
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
    db_path = tmp_path / "t08f_test.db"
    monkeypatch.setattr(db_conn, "DB_PATH", db_path)
    db.init_db()
    yield db_path


def test_empty_table_returns_none(temp_db):
    """get_latest_smc_analysis returns None when the smc_analysis_log table is empty."""
    record = db.get_latest_smc_analysis("SMCT1", "1h")
    assert record is None


def test_log_and_read_back(temp_db):
    """After log_smc_analysis, the latest row has correct symbol (upper-cased), market_bias and counts."""
    row_id = db.log_smc_analysis(
        symbol="smct1",
        timeframe="4h",
        current_price=1.0842,
        market_bias="BULLISH",
        active_fvg_count=2,
        active_ob_count=1,
        sweeps_count=3,
        payload_json='{"fvg": 1}',
    )
    assert row_id > 0

    record = db.get_latest_smc_analysis("SMCT1", "4h")
    assert record is not None
    assert record["symbol"] == "SMCT1"
    assert record["timeframe"] == "4h"
    assert record["current_price"] == 1.0842
    assert record["market_bias"] == "BULLISH"
    assert record["active_fvg_count"] == 2
    assert record["active_ob_count"] == 1
    assert record["sweeps_count"] == 3
    assert record["payload_json"] == '{"fvg": 1}'


def test_latest_per_timeframe_and_timeframe_separation(temp_db):
    """Two logs for the same symbol/timeframe return the newest; a different timeframe stays separate."""
    db.log_smc_analysis(
        symbol="SMCT1",
        timeframe="1h",
        current_price=1.0800,
        market_bias="BEARISH",
        active_fvg_count=0,
        active_ob_count=1,
        sweeps_count=0,
    )
    db.log_smc_analysis(
        symbol="SMCT1",
        timeframe="1h",
        current_price=1.0900,
        market_bias="BULLISH",
        active_fvg_count=1,
        active_ob_count=0,
        sweeps_count=2,
    )

    record = db.get_latest_smc_analysis("SMCT1", "1h")
    assert record is not None
    assert record["current_price"] == 1.0900
    assert record["market_bias"] == "BULLISH"

    # Different timeframe has no rows
    assert db.get_latest_smc_analysis("SMCT1", "4h") is None

    # Logging into the other timeframe does not affect the 1h result
    db.log_smc_analysis(
        symbol="SMCT1",
        timeframe="4h",
        current_price=1.1000,
        market_bias="NEUTRAL",
        active_fvg_count=0,
        active_ob_count=0,
        sweeps_count=0,
    )
    record_1h = db.get_latest_smc_analysis("SMCT1", "1h")
    assert record_1h is not None
    assert record_1h["current_price"] == 1.0900
    record_4h = db.get_latest_smc_analysis("SMCT1", "4h")
    assert record_4h is not None
    assert record_4h["current_price"] == 1.1000
    assert record_4h["market_bias"] == "NEUTRAL"


def test_reexport_identity():
    """db re-exports the SMC functions from db_analysis (same objects)."""
    assert db.log_smc_analysis is db_analysis.log_smc_analysis
    assert db.get_latest_smc_analysis is db_analysis.get_latest_smc_analysis
    assert db._migrate_smc is db_analysis._migrate_smc


def test_smc_analysis_log_table_created(temp_db):
    """db.init_db() creates the smc_analysis_log table via _migrate_smc."""
    with db.get_db() as c:
        rows = c.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'smc_analysis_log'"
        ).fetchall()
    assert {r[0] for r in rows} == {"smc_analysis_log"}
