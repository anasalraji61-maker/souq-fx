"""
backend/tests/test_mta_task15.py — Comprehensive Test Suite for Task 15
Multi-Timeframe Analysis (MTA) Consensus Engine.
22 Tests covering Signal Collection, Indicators, Direction, Weighted Consensus,
Whipsaw Risk, Macro Conflict, Caching, and DB Logging.
"""
import os
import sys
import unittest
import asyncio
from unittest.mock import Mock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from mta_engine import (
    calc_rsi,
    calc_macd,
    calc_bollinger_bands,
    calc_stochastic,
    calc_adx,
    generate_candles_for_timeframe,
    MTASignalCollector,
    MTAConsensusEngine,
    TimeframeSignal,
    TIMEFRAMES,
)
import db


class TestMTAEngine(unittest.TestCase):
    def setUp(self):
        db.init_db()
        self.collector = MTASignalCollector()
        self.engine = MTAConsensusEngine(self.collector)

    # ==================== INDICATOR TESTS ====================

    def test_rsi_calculation_standard(self):
        """RSI should calculate values between 0 and 100"""
        closes = [1.0800 + i * 0.0010 for i in range(25)]
        rsi_val = calc_rsi(closes)
        self.assertGreater(rsi_val, 70.0)
        self.assertLessEqual(rsi_val, 100.0)

    def test_rsi_flat_line_returns_50(self):
        """Flat closes should return 50.0 without divide by zero"""
        closes = [1.0850] * 30
        rsi_val = calc_rsi(closes)
        self.assertEqual(rsi_val, 50.0)

    def test_macd_calculation(self):
        """MACD returns (macd_line, signal_line, hist)"""
        closes = [1.0800 + (i % 5) * 0.0005 for i in range(50)]
        l, s, h = calc_macd(closes)
        self.assertIsInstance(l, float)
        self.assertIsInstance(s, float)
        self.assertIsInstance(h, float)

    def test_bollinger_bands_calculation(self):
        """Bollinger upper should be > middle > lower"""
        closes = [1.0800 + (i % 10) * 0.0010 for i in range(30)]
        upper, middle, lower = calc_bollinger_bands(closes)
        self.assertGreater(upper, middle)
        self.assertGreater(middle, lower)

    def test_stochastic_calculation(self):
        """Stochastic %K and %D should be between 0 and 100"""
        highs = [1.0900 + i * 0.0005 for i in range(20)]
        lows = [1.0800 + i * 0.0005 for i in range(20)]
        closes = [1.0850 + i * 0.0005 for i in range(20)]
        k, d = calc_stochastic(highs, lows, closes)
        self.assertGreaterEqual(k, 0.0)
        self.assertLessEqual(k, 100.0)
        self.assertGreaterEqual(d, 0.0)
        self.assertLessEqual(d, 100.0)

    def test_adx_calculation(self):
        """ADX returns valid non-negative trend strength"""
        highs = [1.0900 + i * 0.0010 for i in range(30)]
        lows = [1.0800 + i * 0.0010 for i in range(30)]
        closes = [1.0850 + i * 0.0010 for i in range(30)]
        adx_val = calc_adx(highs, lows, closes)
        self.assertGreater(adx_val, 0.0)

    # ==================== DIRECTION EVALUATION TESTS ====================

    def test_evaluate_direction_strong_bullish(self):
        """High RSI, positive MACD, and fast EMA > slow EMA yields BUY"""
        indicators = {
            "rsi": 68.0,
            "macd": 0.0020,
            "macd_signal": 0.0010,
            "macd_hist": 0.0010,
            "bb_upper": 1.0920,
            "bb_middle": 1.0850,
            "bb_lower": 1.0780,
            "ema_fast": 1.0890,
            "ema_slow": 1.0830,
            "stoch_k": 75.0,
            "stoch_d": 65.0,
            "adx": 35.0,
        }
        direction, strength = self.collector.evaluate_direction(indicators, close=1.0900)
        self.assertEqual(direction, "BUY")
        self.assertGreater(strength, 50.0)

    def test_evaluate_direction_strong_bearish(self):
        """Low RSI, negative MACD, and fast EMA < slow EMA yields SELL"""
        indicators = {
            "rsi": 32.0,
            "macd": -0.0020,
            "macd_signal": -0.0010,
            "macd_hist": -0.0010,
            "bb_upper": 1.0920,
            "bb_middle": 1.0850,
            "bb_lower": 1.0780,
            "ema_fast": 1.0800,
            "ema_slow": 1.0870,
            "stoch_k": 25.0,
            "stoch_d": 35.0,
            "adx": 30.0,
        }
        direction, strength = self.collector.evaluate_direction(indicators, close=1.0790)
        self.assertEqual(direction, "SELL")
        self.assertGreater(strength, 50.0)

    def test_evaluate_direction_neutral(self):
        """Evenly balanced indicators should produce NEUTRAL"""
        indicators = {
            "rsi": 50.0,
            "macd": 0.0,
            "macd_signal": 0.0,
            "macd_hist": 0.0,
            "bb_upper": 1.0900,
            "bb_middle": 1.0850,
            "bb_lower": 1.0800,
            "ema_fast": 1.0850,
            "ema_slow": 1.0850,
            "stoch_k": 50.0,
            "stoch_d": 50.0,
            "adx": 15.0,
        }
        direction, strength = self.collector.evaluate_direction(indicators, close=1.0850)
        self.assertEqual(direction, "NEUTRAL")

    # ==================== SIGNAL COLLECTION TESTS ====================

    def test_timeframe_signal_collection(self):
        """Single timeframe collection produces full TimeframeSignal"""
        sig = asyncio.run(self.collector.collect_timeframe_signal("EURUSD", "15m"))
        self.assertEqual(sig.timeframe, "15m")
        self.assertIn(sig.direction, ["BUY", "SELL", "NEUTRAL"])
        self.assertGreaterEqual(sig.strength, 0.0)
        self.assertIn("rsi", sig.indicators)

    def test_parallel_timeframe_collection_all_6(self):
        """Async gathering across all 6 timeframes concurrently"""
        signals = asyncio.run(self.collector.collect_all("GBPUSD"))
        self.assertEqual(len(signals), 6)
        for tf in TIMEFRAMES:
            self.assertIn(tf, signals)

    def test_caching_timeframe_signal_30s(self):
        """Second call should return cached signal with fast retrieval"""
        sig1 = asyncio.run(self.collector.collect_timeframe_signal("USDJPY", "1h"))
        sig2 = asyncio.run(self.collector.collect_timeframe_signal("USDJPY", "1h"))
        self.assertEqual(sig1.direction, sig2.direction)
        self.assertTrue(sig2.cached)

    def test_custom_candles_input(self):
        """Custom candles should bypass synthetic generation"""
        custom = {
            "closes": [1.1000 + i * 0.0010 for i in range(40)],
            "highs": [1.1005 + i * 0.0010 for i in range(40)],
            "lows": [1.0995 + i * 0.0010 for i in range(40)],
        }
        sig = asyncio.run(self.collector.collect_timeframe_signal("EURUSD", "5m", custom_candles=custom))
        self.assertEqual(sig.direction, "BUY")

    # ==================== CONSENSUS CALCULATION TESTS ====================

    def test_weighted_consensus_calculation_buy(self):
        """Majority BUY signals should yield BUY consensus"""
        signals = {
            tf: TimeframeSignal(tf, "BUY", 80.0, {"adx": 30.0}) for tf in TIMEFRAMES
        }
        res = self.engine.calculate_consensus("EURUSD", signals)
        self.assertEqual(res.consensus_direction, "BUY")
        self.assertGreater(res.confidence_score, 70.0)

    def test_weighted_consensus_calculation_sell(self):
        """Majority SELL signals should yield SELL consensus"""
        signals = {
            tf: TimeframeSignal(tf, "SELL", 85.0, {"adx": 32.0}) for tf in TIMEFRAMES
        }
        res = self.engine.calculate_consensus("EURUSD", signals)
        self.assertEqual(res.consensus_direction, "SELL")
        self.assertGreater(res.confidence_score, 70.0)

    def test_weighted_consensus_calculation_neutral(self):
        """Equally split signals should yield NEUTRAL consensus"""
        signals = {
            "1m": TimeframeSignal("1m", "BUY", 60.0, {"adx": 20.0}),
            "5m": TimeframeSignal("5m", "BUY", 60.0, {"adx": 20.0}),
            "15m": TimeframeSignal("15m", "NEUTRAL", 20.0, {"adx": 20.0}),
            "1h": TimeframeSignal("1h", "SELL", 60.0, {"adx": 20.0}),
            "4h": TimeframeSignal("4h", "SELL", 60.0, {"adx": 20.0}),
            "daily": TimeframeSignal("daily", "NEUTRAL", 20.0, {"adx": 20.0}),
        }
        res = self.engine.calculate_consensus("EURUSD", signals)
        self.assertEqual(res.consensus_direction, "NEUTRAL")

    # ==================== RISK & CONFLICT DETECTION TESTS ====================

    def test_whipsaw_risk_detection(self):
        """1m/5m BUY vs 4h/Daily SELL must trigger Whipsaw Risk"""
        signals = {
            "1m": TimeframeSignal("1m", "BUY", 80.0, {"adx": 30.0}),
            "5m": TimeframeSignal("5m", "BUY", 80.0, {"adx": 30.0}),
            "15m": TimeframeSignal("15m", "NEUTRAL", 30.0, {"adx": 25.0}),
            "1h": TimeframeSignal("1h", "SELL", 70.0, {"adx": 28.0}),
            "4h": TimeframeSignal("4h", "SELL", 80.0, {"adx": 35.0}),
            "daily": TimeframeSignal("daily", "SELL", 85.0, {"adx": 40.0}),
        }
        res = self.engine.calculate_consensus("EURUSD", signals)
        self.assertTrue(res.has_whipsaw_risk)
        self.assertTrue(any("Whipsaw" in w for w in res.warnings))

    def test_no_whipsaw_when_aligned(self):
        """When timeframes are aligned in direction, no Whipsaw risk"""
        signals = {
            tf: TimeframeSignal(tf, "BUY", 75.0, {"adx": 28.0}) for tf in TIMEFRAMES
        }
        res = self.engine.calculate_consensus("EURUSD", signals)
        self.assertFalse(res.has_whipsaw_risk)

    def test_macro_conflict_detection(self):
        """Consensus BUY while Daily is SELL triggers Macro Conflict"""
        signals = {
            "1m": TimeframeSignal("1m", "BUY", 90.0, {"adx": 30.0}),
            "5m": TimeframeSignal("5m", "BUY", 90.0, {"adx": 30.0}),
            "15m": TimeframeSignal("15m", "BUY", 80.0, {"adx": 30.0}),
            "1h": TimeframeSignal("1h", "BUY", 80.0, {"adx": 30.0}),
            "4h": TimeframeSignal("4h", "NEUTRAL", 30.0, {"adx": 20.0}),
            "daily": TimeframeSignal("daily", "SELL", 70.0, {"adx": 30.0}),
        }
        res = self.engine.calculate_consensus("EURUSD", signals)
        self.assertEqual(res.consensus_direction, "BUY")
        self.assertTrue(res.has_macro_conflict)
        self.assertTrue(any("تعارض هيكلي ماكرو" in w for w in res.warnings))

    def test_choppy_market_warning(self):
        """Low ADX across timeframes flags Choppy Market"""
        signals = {
            tf: TimeframeSignal(tf, "NEUTRAL", 20.0, {"adx": 12.0}) for tf in TIMEFRAMES
        }
        res = self.engine.calculate_consensus("EURUSD", signals)
        self.assertTrue(any("Choppy" in w for w in res.warnings))

    # ==================== DATABASE INTEGRATION TESTS ====================

    def test_database_logging_integration(self):
        """Engine should log analysis into SQLite database"""
        row_id = db.log_mta_analysis(
            symbol="EURUSD",
            consensus_direction="BUY",
            confidence_score=85.5,
            timeframes_data='{"1m": {"direction": "BUY"}}',
            warnings='["test warning"]'
        )
        self.assertIsInstance(row_id, int)
        self.assertGreater(row_id, 0)

    def test_database_backtest_query(self):
        """Backtest query should return structured dict or None"""
        result = db.get_mta_backtest("NONEXISTENT_PAIR")
        self.assertIsNone(result)

        # Seed backtest row
        with db.get_db() as c:
            c.execute("""
                INSERT INTO mta_backtest_results 
                (symbol, start_date, end_date, win_rate, total_trades, profit_factor, max_drawdown, metrics_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, ("EURUSD", "2026-01-01", "2026-09-30", 68.5, 142, 1.85, 4.2, '{"sharpe": 1.9}'))

        record = db.get_mta_backtest("EURUSD")
        self.assertIsNotNone(record)
        self.assertEqual(record["win_rate"], 68.5)
        self.assertEqual(record["total_trades"], 142)


if __name__ == "__main__":
    unittest.main()
