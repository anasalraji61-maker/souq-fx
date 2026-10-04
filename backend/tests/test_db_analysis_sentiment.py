"""
T08i split test: verify the Sentiment db block moved to db_analysis.py and re-exported from db.
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
    db_path = tmp_path / "t08i_test.db"
    monkeypatch.setattr(db_conn, "DB_PATH", db_path)
    db.init_db()
    yield db_path


def test_reexport_identity():
    """db re-exports the sentiment functions from db_analysis (same objects)."""
    assert db._migrate_sentiment is db_analysis._migrate_sentiment
    assert db.log_sentiment_depth is db_analysis.log_sentiment_depth
    assert db.get_latest_sentiment is db_analysis.get_latest_sentiment


def test_log_then_read_back(temp_db):
    """log_sentiment_depth then get_latest_sentiment returns the logged fields."""
    depth = {"bids": [[1.0800, 100]], "asks": [[1.0810, 90]]}
    row_id = db.log_sentiment_depth(
        symbol="zzsent1",
        current_price=1.0805,
        long_pct=62.5,
        short_pct=37.5,
        sentiment_index=0.42,
        contrarian_bias="FAVOR_SELL",
        retail_mood="Greed",
        total_bid_depth=12000.0,
        total_ask_depth=9500.0,
        depth_json=json.dumps(depth)
    )
    assert row_id > 0

    rec = db.get_latest_sentiment("ZZSENT1")
    assert rec is not None
    assert rec["id"] == row_id
    assert rec["symbol"] == "ZZSENT1"
    assert rec["current_price"] == 1.0805
    assert rec["long_pct"] == 62.5
    assert rec["short_pct"] == 37.5
    assert rec["sentiment_index"] == 0.42
    assert rec["contrarian_bias"] == "FAVOR_SELL"
    assert rec["retail_mood"] == "Greed"
    assert rec["total_bid_depth"] == 12000.0
    assert rec["total_ask_depth"] == 9500.0
    assert json.loads(rec["depth_json"]) == depth
    assert rec["created_at"]


def test_latest_row_wins(temp_db):
    """When two rows are logged for a symbol, get_latest_sentiment returns the newest."""
    db.log_sentiment_depth(
        symbol="ZZSENT1",
        current_price=1.0800,
        long_pct=50.0,
        short_pct=50.0,
        sentiment_index=0.0,
        contrarian_bias="BALANCED",
        retail_mood="Neutral",
        total_bid_depth=1000.0,
        total_ask_depth=1000.0,
        depth_json="{}"
    )
    db.log_sentiment_depth(
        symbol="ZZSENT1",
        current_price=1.0900,
        long_pct=71.0,
        short_pct=29.0,
        sentiment_index=0.8,
        contrarian_bias="FAVOR_SELL",
        retail_mood="Extreme Greed",
        total_bid_depth=2000.0,
        total_ask_depth=800.0,
        depth_json='{"v": 2}'
    )

    rec = db.get_latest_sentiment("zzsent1")
    assert rec is not None
    assert rec["current_price"] == 1.0900
    assert rec["long_pct"] == 71.0
    assert rec["short_pct"] == 29.0
    assert rec["contrarian_bias"] == "FAVOR_SELL"
    assert json.loads(rec["depth_json"]) == {"v": 2}


def test_unknown_symbol_returns_none(temp_db):
    """get_latest_sentiment returns None for a symbol with no logged rows."""
    assert db.get_latest_sentiment("ZZNODATA") is None


def test_sentiment_tables_created(temp_db):
    """db.init_db() creates sentiment_depth_log and its index via _migrate_sentiment."""
    with db.get_db() as c:
        tables = c.execute(
            "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'sentiment_depth_log'"
        ).fetchall()
        indexes = c.execute(
            "SELECT name FROM sqlite_master WHERE type = 'index' AND name = 'idx_sentiment_sym'"
        ).fetchall()
    assert {r[0] for r in tables} == {"sentiment_depth_log"}
    assert {r[0] for r in indexes} == {"idx_sentiment_sym"}
