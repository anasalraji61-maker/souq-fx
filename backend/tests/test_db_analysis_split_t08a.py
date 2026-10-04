"""
T08a split test: verify MTA db block moved to db_analysis.py and re-exported from db.
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
    db_path = tmp_path / "t08a_test.db"
    monkeypatch.setattr(db_conn, "DB_PATH", db_path)
    db.init_db()
    yield db_path


def test_reexport_mta_functions():
    """db.log_mta_analysis / get_mta_backtest / _migrate_mta are re-exported from db_analysis."""
    assert db.log_mta_analysis is db_analysis.log_mta_analysis
    assert db.get_mta_backtest is db_analysis.get_mta_backtest
    assert db._migrate_mta is db_analysis._migrate_mta


def test_log_mta_analysis_returns_int_and_symbol_uppercased(temp_db):
    """log_mta_analysis returns an int id > 0 and the row symbol is uppercased."""
    row_id = db.log_mta_analysis(
        symbol="t08ausd",
        consensus_direction="BUY",
        confidence_score=91.2,
        timeframes_data='{"1m": {"direction": "BUY"}}',
        warnings='["warning text"]',
    )
    assert isinstance(row_id, int)
    assert row_id > 0

    with db.get_db() as c:
        cur = c.execute("SELECT symbol FROM mta_analysis_log WHERE id = ?", (row_id,))
        row = cur.fetchone()
    assert row is not None
    assert row[0] == "T08AUSD"


def test_get_mta_backtest_none_for_missing_symbol(temp_db):
    """get_mta_backtest returns None for a symbol with no rows."""
    result = db.get_mta_backtest("NOPE_T08A")
    assert result is None


def test_get_mta_backtest_returns_parsed_row(temp_db):
    """Insert a backtest row directly and read it back with typed parsing."""
    with db.get_db() as c:
        c.execute(
            """
            INSERT INTO mta_backtest_results
                (symbol, start_date, end_date, win_rate, total_trades,
                 profit_factor, max_drawdown, metrics_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            ("T08AUSD", "2026-01-01", "2026-09-30", 72.5, 200, 2.10, 5.0, '{"sharpe": 2.5}'),
        )
        c.commit()

    record = db.get_mta_backtest("t08ausd")
    assert record is not None
    assert record["symbol"] == "T08AUSD"
    assert record["win_rate"] == 72.5
    assert isinstance(record["win_rate"], float)
    assert record["total_trades"] == 200
    assert record["metrics_json"] == {"sharpe": 2.5}
