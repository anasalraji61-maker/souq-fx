"""
T08h split test: verify the Divergence db block moved to db_analysis.py and re-exported from db.
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
    db_path = tmp_path / "t08h_test.db"
    monkeypatch.setattr(db_conn, "DB_PATH", db_path)
    db.init_db()
    yield db_path


def test_empty_table_returns_empty_list(temp_db):
    """get_divergence_signals returns [] when the divergence_signals table is empty."""
    records = db.get_divergence_signals("DIVT1", "1h")
    assert records == []


def test_log_and_read_back(temp_db):
    """After log_divergence_signal, the row has correct symbol/indicator/divergence_type upper-casing and floats."""
    row_id = db.log_divergence_signal(
        symbol="divt1",
        timeframe="1h",
        indicator="rsi",
        divergence_type="regular_bullish",
        direction="buy",
        price_point1=1.0800,
        price_point2=1.0790,
        osc_point1=28.5,
        osc_point2=34.2,
        current_price=1.0800,
        target_price=1.0860,
        stop_loss=1.0770,
        confidence_score=92.0
    )
    assert row_id > 0

    records = db.get_divergence_signals("DIVT1", "1h")
    assert len(records) == 1
    r = records[0]
    assert r["symbol"] == "DIVT1"
    assert r["timeframe"] == "1h"
    assert r["indicator"] == "RSI"
    assert r["divergence_type"] == "REGULAR_BULLISH"
    assert r["direction"] == "BUY"
    assert r["price_point1"] == 1.0800
    assert r["price_point2"] == 1.0790
    assert r["osc_point1"] == 28.5
    assert r["osc_point2"] == 34.2
    assert r["current_price"] == 1.0800
    assert r["target_price"] == 1.0860
    assert r["stop_loss"] == 1.0770
    assert r["confidence_score"] == 92.0
    assert r["status"] == "ACTIVE"
    assert "created_at" in r


def test_limit_and_order(temp_db):
    """With 3 signals logged and limit=2, only 2 are returned, newest first."""
    # Log 3 signals
    db.log_divergence_signal("DIVT1", "1h", "RSI", "REGULAR_BULLISH", "BUY",
        1.0800, 1.0790, 28.5, 34.2, 1.0800, 1.0860, 1.0770, 92.0)
    db.log_divergence_signal("DIVT1", "1h", "MACD", "REGULAR_BEARISH", "SELL",
        1.0900, 1.0920, 0.45, 0.30, 1.0910, 1.0850, 1.0950, 88.0)
    db.log_divergence_signal("DIVT1", "1h", "STOCH", "HIDDEN_BULLISH", "BUY",
        1.0700, 1.0720, 35.0, 28.0, 1.0710, 1.0780, 1.0670, 85.0)

    # limit=2 should return only 2, newest first (by id DESC)
    records = db.get_divergence_signals("DIVT1", "1h", limit=2)
    assert len(records) == 2
    # Newest has highest id - should be the 3rd one logged (STOCH)
    assert records[0]["indicator"] == "STOCH"
    assert records[1]["indicator"] == "MACD"


def test_symbol_and_timeframe_isolation(temp_db):
    """Signals for another symbol or timeframe are not returned."""
    db.log_divergence_signal("DIVT1", "1h", "RSI", "REGULAR_BULLISH", "BUY",
        1.0800, 1.0790, 28.5, 34.2, 1.0800, 1.0860, 1.0770, 92.0)
    db.log_divergence_signal("DIVT2", "1h", "RSI", "REGULAR_BULLISH", "BUY",
        2.0800, 2.0790, 28.5, 34.2, 2.0800, 2.0860, 2.0770, 92.0)
    db.log_divergence_signal("DIVT1", "4h", "RSI", "REGULAR_BULLISH", "BUY",
        1.0800, 1.0790, 28.5, 34.2, 1.0800, 1.0860, 1.0770, 92.0)

    # DIVT1 1h should have 1
    recs_1h = db.get_divergence_signals("DIVT1", "1h")
    assert len(recs_1h) == 1
    assert recs_1h[0]["indicator"] == "RSI"

    # DIVT1 4h should have 1
    recs_4h = db.get_divergence_signals("DIVT1", "4h")
    assert len(recs_4h) == 1

    # DIVT2 1h should have 1
    recs_divt2 = db.get_divergence_signals("DIVT2", "1h")
    assert len(recs_divt2) == 1

    # DIVT1 15m should be empty
    assert db.get_divergence_signals("DIVT1", "15m") == []


def test_reexport_identity():
    """db re-exports the divergence functions from db_analysis (same objects)."""
    assert db._migrate_divergence is db_analysis._migrate_divergence
    assert db.log_divergence_signal is db_analysis.log_divergence_signal
    assert db.get_divergence_signals is db_analysis.get_divergence_signals


def test_divergence_signals_table_created(temp_db):
    """db.init_db() creates the divergence_signals table and index via _migrate_divergence."""
    with db.get_db() as c:
        tables = c.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'divergence_signals'"
        ).fetchall()
    assert {r[0] for r in tables} == {"divergence_signals"}

    with db.get_db() as c:
        indexes = c.execute(
            "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_div_status'"
        ).fetchall()
    assert {r[0] for r in indexes} == {"idx_div_status"}