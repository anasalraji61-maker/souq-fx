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


# ==============================================================================
# Task 16: Ichimoku Cloud Indicator (Kinko Hyo)
# ==============================================================================

def _migrate_ichimoku(c: sqlite3.Connection) -> None:
    """إنشاء جداول تحليلات إيشيموكو كينكو هيو ونتائج الاختبار الخلفي."""
    c.execute(
        """CREATE TABLE IF NOT EXISTS ichimoku_analysis (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            timeframe TEXT NOT NULL,
            timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            current_price REAL NOT NULL,
            tenkan REAL NOT NULL,
            kijun REAL NOT NULL,
            senkou_a REAL NOT NULL,
            senkou_b REAL NOT NULL,
            chikou REAL NOT NULL,
            cloud_state TEXT NOT NULL,
            tk_cross_signal TEXT NOT NULL,
            overall_trend TEXT NOT NULL,
            strength REAL NOT NULL,
            signals_json TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )"""
    )
    c.execute("CREATE INDEX IF NOT EXISTS idx_ichimoku_sym_tf ON ichimoku_analysis(symbol, timeframe, timestamp DESC)")

    c.execute(
        """CREATE TABLE IF NOT EXISTS ichimoku_backtest_results (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            timeframe TEXT NOT NULL,
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
    c.execute("CREATE INDEX IF NOT EXISTS idx_ichimoku_bt_sym ON ichimoku_backtest_results(symbol, timeframe)")


def log_ichimoku_analysis(
    symbol: str,
    timeframe: str,
    current_price: float,
    tenkan: float,
    kijun: float,
    senkou_a: float,
    senkou_b: float,
    chikou: float,
    cloud_state: str,
    tk_cross_signal: str,
    overall_trend: str,
    strength: float,
    signals_json: str = "{}",
) -> int:
    with get_db() as c:
        cur = c.execute(
            """INSERT INTO ichimoku_analysis
               (symbol, timeframe, current_price, tenkan, kijun, senkou_a, senkou_b, chikou,
                cloud_state, tk_cross_signal, overall_trend, strength, signals_json)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
            (
                symbol.upper(),
                timeframe,
                float(current_price),
                float(tenkan),
                float(kijun),
                float(senkou_a),
                float(senkou_b),
                float(chikou),
                cloud_state,
                tk_cross_signal,
                overall_trend,
                float(strength),
                signals_json,
            ),
        )
        return int(cur.lastrowid)


def get_ichimoku_backtest(symbol: str, timeframe: str = "1h") -> dict[str, Any] | None:
    with get_db() as c:
        row = c.execute(
            """SELECT symbol, timeframe, start_date, end_date, win_rate, total_trades, profit_factor, max_drawdown, metrics_json, created_at
               FROM ichimoku_backtest_results WHERE symbol = ? AND timeframe = ? ORDER BY id DESC LIMIT 1""",
            (symbol.upper(), timeframe),
        ).fetchone()
        if not row:
            return None
        return {
            "symbol": row[0],
            "timeframe": row[1],
            "start_date": row[2],
            "end_date": row[3],
            "win_rate": float(row[4]),
            "total_trades": int(row[5]),
            "profit_factor": float(row[6]),
            "max_drawdown": float(row[7]),
            "metrics_json": json.loads(row[8]) if row[8] else {},
            "created_at": row[9],
        }


# ==============================================================================


# ==============================================================================
# Task 22: Caching Strategy Optimization (Redis/Memory LRU + Hot Spot Caching)
# ==============================================================================

def _migrate_cache(c: sqlite3.Connection) -> None:
    """إنشاء وتحديث جداول إحصائيات الكاش وسجل إبطال الشموع."""
    c.execute(
        """CREATE TABLE IF NOT EXISTS cache_stats (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            date TEXT DEFAULT (DATE('now')),
            symbol TEXT,
            hits INTEGER DEFAULT 0,
            misses INTEGER DEFAULT 0,
            avg_hit_latency_ms REAL DEFAULT 0,
            avg_miss_latency_ms REAL DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(date, symbol)
        )"""
    )
    c.execute("CREATE INDEX IF NOT EXISTS idx_cache_stats_date ON cache_stats(date)")
    c.execute("CREATE INDEX IF NOT EXISTS idx_cache_stats_symbol ON cache_stats(symbol)")

    c.execute(
        """CREATE TABLE IF NOT EXISTS cache_invalidation_log (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            symbol TEXT NOT NULL,
            timeframe TEXT,
            invalidated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            reason TEXT
        )"""
    )
    c.execute("CREATE INDEX IF NOT EXISTS idx_invalidation_symbol_time ON cache_invalidation_log(symbol, invalidated_at)")
