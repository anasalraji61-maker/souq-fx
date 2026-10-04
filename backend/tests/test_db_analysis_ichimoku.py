"""
T08b split test: verify Ichimoku db block moved to db_analysis.py and re-exported from db.
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
    db_path = tmp_path / "t08b_test.db"
    monkeypatch.setattr(db_conn, "DB_PATH", db_path)
    db.init_db()
    yield db_path


def test_reexport_ichimoku_functions():
    """db.log_ichimoku_analysis / get_ichimoku_backtest / _migrate_ichimoku are re-exported from db_analysis."""
    assert db.log_ichimoku_analysis is db_analysis.log_ichimoku_analysis
    assert db.get_ichimoku_backtest is db_analysis.get_ichimoku_backtest
    assert db._migrate_ichimoku is db_analysis._migrate_ichimoku


def test_log_ichimoku_analysis_returns_int_and_symbol_uppercased(temp_db):
    """log_ichimoku_analysis returns an int id > 0 and the row symbol is uppercased."""
    row_id = db.log_ichimoku_analysis(
        symbol="t08busd",
        timeframe="1h",
        current_price=1.0850,
        tenkan=1.0860,
        kijun=1.0840,
        senkou_a=1.0855,
        senkou_b=1.0830,
        chikou=1.0850,
        cloud_state="ABOVE_CLOUD",
        tk_cross_signal="STRONG_BULLISH",
        overall_trend="BULLISH",
        strength=85.0,
        signals_json='{"tk_cross": "STRONG_BULLISH"}',
    )
    assert isinstance(row_id, int)
    assert row_id > 0

    with db.get_db() as c:
        cur = c.execute("SELECT symbol FROM ichimoku_analysis WHERE id = ?", (row_id,))
        row = cur.fetchone()
    assert row is not None
    assert row[0] == "T08BUSD"


def test_get_ichimoku_backtest_none_for_missing_symbol(temp_db):
    """get_ichimoku_backtest returns None for a symbol with no rows."""
    result = db.get_ichimoku_backtest("NONE_T08B")
    assert result is None


def test_get_ichimoku_backtest_returns_parsed_row(temp_db):
    """Insert a backtest row directly and read it back with typed parsing."""
    with db.get_db() as c:
        c.execute(
            """
            INSERT INTO ichimoku_backtest_results
                (symbol, timeframe, start_date, end_date, win_rate, total_trades,
                 profit_factor, max_drawdown, metrics_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            ("T08BTEST", "1h", "2026-01-01", "2026-09-30", 68.5, 150, 1.95, 4.2, '{"sharpe": 1.8}'),
        )
        c.commit()

    record = db.get_ichimoku_backtest("t08btest", "1h")
    assert record is not None
    assert record["symbol"] == "T08BTEST"
    assert record["timeframe"] == "1h"
    assert record["win_rate"] == 68.5
    assert isinstance(record["win_rate"], float)
    assert record["total_trades"] == 150
    assert record["profit_factor"] == 1.95
    assert isinstance(record["profit_factor"], float)
    assert record["max_drawdown"] == 4.2
    assert isinstance(record["max_drawdown"], float)
    assert record["metrics_json"] == {"sharpe": 1.8}