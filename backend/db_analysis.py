"""Analysis tables migrated from db.py — Task 15 (MTA) and later blocks."""
from __future__ import annotations

import json
import sqlite3
from typing import Any

from core.db_conn import _conn


def get_db():
    """الحصول على اتصال بقاعدة البيانات (متوافق مع مواصفات المهام والمعماري)."""
    return _conn()


# ==============================================================================
# Task 15: Multi-Timeframe Analysis (MTA) Consensus Engine
# ==============================================================================

def _migrate_mta(c: sqlite3.Connection) -> None:
    """إنشاء جداول سجل التحليل متعدد الأطر الزمنية ونتائج الاختباز الخلفي."""
    c.execute(
        """CREATE TABLE IF NOT EXISTS mta_analysis_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            consensus_direction TEXT NOT NULL,
            confidence_score REAL NOT NULL,
            timeframes_data TEXT NOT NULL,
            warnings TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )"""
    )
    c.execute("CREATE INDEX IF NOT EXISTS idx_mta_log_symbol_time ON mta_analysis_log(symbol, timestamp DESC)")

    c.execute(
        """CREATE TABLE IF NOT EXISTS mta_backtest_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            start_date TEXT,
            end_date TEXT,
            win_rate REAL DEFAULT 0.0,
            total_trades INTEGER DEFAULT 0,
            profit_factor REAL DEFAULT 0.0,
            max_drawdown REAL DEFAULT 0.0,
            metrics_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )"""
    )
    c.execute("CREATE INDEX IF NOT EXISTS idx_mta_backtest_symbol ON mta_backtest_results(symbol)")


def log_mta_analysis(
    symbol: str,
    consensus_direction: str,
    confidence_score: float,
    timeframes_data: str,
    warnings: str = "[]",
) -> int:
    with get_db() as c:
        cur = c.execute(
            """INSERT INTO mta_analysis_log
               (symbol, consensus_direction, confidence_score, timeframes_data, warnings)
               VALUES (?, ?, ?, ?, ?)""",
            (symbol.upper(), consensus_direction, float(confidence_score), timeframes_data, warnings),
        )
        return int(cur.lastrowid)


def get_mta_backtest(symbol: str) -> dict[str, Any] | None:
    with get_db() as c:
        row = c.execute(
            """SELECT symbol, start_date, end_date, win_rate, total_trades, profit_factor, max_drawdown, metrics_json, created_at
               FROM mta_backtest_results WHERE symbol = ? ORDER BY id DESC LIMIT 1""",
            (symbol.upper(),),
        ).fetchone()
        if not row:
            return None
        return {
            "symbol": row[0],
            "start_date": row[1],
            "end_date": row[2],
            "win_rate": float(row[3]),
            "total_trades": int(row[4]),
            "profit_factor": float(row[5]),
            "max_drawdown": float(row[6]),
            "metrics_json": json.loads(row[7]) if row[7] else {},
            "created_at": row[8],
        }
