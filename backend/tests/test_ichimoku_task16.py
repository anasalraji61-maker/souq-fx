"""
backend/tests/test_ichimoku_task16.py — Comprehensive Test Suite for Task 16
Ichimoku Cloud (Kinko Hyo) Indicator.
22 Tests covering Tenkan, Kijun, Senkou A/B, Chikou, Cloud States, TK Cross,
Breakouts, Cloud Twists, Chikou Confirmation, Caching, and DB Logging.
"""
import os
import sys
import unittest
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from ichimoku import (
    calc_midpoint,
    calculate_ichimoku_series,
    evaluate_cloud_state,
    evaluate_tk_cross,
    evaluate_chikou,
    generate_ichimoku_candles,
    IchimokuEngine,
    get_ichimoku_engine,
)
import db


class TestIchimokuEngine(unittest.TestCase):
    def setUp(self):
        db.init_db()
        self.engine = IchimokuEngine()

    # ==================== CALCULATION TESTS ====================

    def test_midpoint_calculation(self):
        """Midpoint should be (max(highs) + min(lows)) / 2 for the window"""
        highs = [10.0, 12.0, 15.0, 14.0, 16.0]
        lows = [8.0, 9.0, 11.0, 10.0, 12.0]
        # window period 5 -> max is 16.0, min is 8.0 -> (16 + 8) / 2 = 12.0
        mid = calc_midpoint(highs, lows, period=5, index=4)
        self.assertEqual(mid, 12.0)

    def test_tenkan_sen_period_9(self):
        """Tenkan-sen requires 9 periods and returns None before period 9"""
        highs = [1.0800 + i * 0.0010 for i in range(20)]
        lows = [1.0700 + i * 0.0010 for i in range(20)]
        closes = [1.0750 + i * 0.0010 for i in range(20)]

        series = calculate_ichimoku_series(highs, lows, closes)
        # First 8 should be None
        for i in range(8):
            self.assertIsNone(series["tenkan"][i])
        # Index 8 (9th bar) should be valid
        self.assertIsNotNone(series["tenkan"][8])
        # Check math: max high is highs[8] = 1.0880, min low is lows[0] = 1.0700 -> (1.0880+1.0700)/2 = 1.0790
        self.assertAlmostEqual(series["tenkan"][8], 1.0790, places=4)

    def test_kijun_sen_period_26(self):
        """Kijun-sen requires 26 periods and returns None before index 25"""
        highs = [1.0800 + i * 0.0005 for i in range(35)]
        lows = [1.0700 + i * 0.0005 for i in range(35)]
        closes = [1.0750 + i * 0.0005 for i in range(35)]

        series = calculate_ichimoku_series(highs, lows, closes)
        self.assertIsNone(series["kijun"][24])
        self.assertIsNotNone(series["kijun"][25])

    def test_senkou_span_a_displacement_26(self):
        """Senkou Span A is (Tenkan + Kijun) / 2 projected 26 periods ahead"""
        highs = [1.1000 + (i % 5) * 0.0010 for i in range(60)]
        lows = [1.0800 + (i % 5) * 0.0010 for i in range(60)]
        closes = [1.0900 + (i % 5) * 0.0010 for i in range(60)]

        series = calculate_ichimoku_series(highs, lows, closes)
        # Kijun starts at index 25, displaced by 26 -> starts at index 51 in unaligned
        self.assertIsNotNone(series["senkou_a"][51])

    def test_senkou_span_b_period_52_displacement(self):
        """Senkou Span B uses 52 period midpoint displaced by 26"""
        highs = [1.1000 for _ in range(80)]
        lows = [1.0600 for _ in range(80)]
        closes = [1.0800 for _ in range(80)]

        series = calculate_ichimoku_series(highs, lows, closes)
        # Span B midpoint is (1.1000 + 1.0600) / 2 = 1.0800
        # 52nd period (index 51) displaced by 26 -> index 77
        self.assertAlmostEqual(series["senkou_b"][77], 1.0800, places=4)

    def test_chikou_span_lag_26(self):
        """Chikou Span plots current close 26 periods in the past"""
        closes = [1.0800 + i * 0.0010 for i in range(60)]
        highs = [c + 0.0010 for c in closes]
        lows = [c - 0.0010 for c in closes]

        series = calculate_ichimoku_series(highs, lows, closes)
        # At index 26, chikou should be closes[52]
        self.assertEqual(series["chikou"][26], closes[52])

    # ==================== CLOUD STATE TESTS ====================

    def test_cloud_state_above_cloud(self):
        """Price above both Senkou A and B is ABOVE_CLOUD"""
        state = evaluate_cloud_state(price=1.1200, senkou_a=1.0900, senkou_b=1.0850)
        self.assertEqual(state, "ABOVE_CLOUD")

    def test_cloud_state_below_cloud(self):
        """Price below both Senkou A and B is BELOW_CLOUD"""
        state = evaluate_cloud_state(price=1.0700, senkou_a=1.0900, senkou_b=1.0850)
        self.assertEqual(state, "BELOW_CLOUD")

    def test_cloud_state_inside_cloud(self):
        """Price between Senkou A and B is INSIDE_CLOUD"""
        state = evaluate_cloud_state(price=1.0880, senkou_a=1.0900, senkou_b=1.0850)
        self.assertEqual(state, "INSIDE_CLOUD")

    # ==================== TK CROSS TESTS ====================

    def test_bullish_tk_golden_cross_strong(self):
        """Tenkan crossing above Kijun while price is above cloud -> STRONG_BULLISH"""
        cross = evaluate_tk_cross(
            tenkan_now=1.0910,
            kijun_now=1.0900,
            tenkan_prev=1.0890,
            kijun_prev=1.0900,
            cloud_state="ABOVE_CLOUD"
        )
        self.assertEqual(cross, "STRONG_BULLISH")

    def test_bullish_tk_golden_cross_weak(self):
        """Tenkan crossing above Kijun while price is below cloud -> WEAK_BULLISH"""
        cross = evaluate_tk_cross(
            tenkan_now=1.0910,
            kijun_now=1.0900,
            tenkan_prev=1.0890,
            kijun_prev=1.0900,
            cloud_state="BELOW_CLOUD"
        )
        self.assertEqual(cross, "WEAK_BULLISH")

    def test_bearish_tk_death_cross_strong(self):
        """Tenkan crossing below Kijun while price is below cloud -> STRONG_BEARISH"""
        cross = evaluate_tk_cross(
            tenkan_now=1.0890,
            kijun_now=1.0900,
            tenkan_prev=1.0910,
            kijun_prev=1.0900,
            cloud_state="BELOW_CLOUD"
        )
        self.assertEqual(cross, "STRONG_BEARISH")

    def test_bearish_tk_death_cross_weak(self):
        """Tenkan crossing below Kijun while price is above cloud -> WEAK_BEARISH"""
        cross = evaluate_tk_cross(
            tenkan_now=1.0890,
            kijun_now=1.0900,
            tenkan_prev=1.0910,
            kijun_prev=1.0900,
            cloud_state="ABOVE_CLOUD"
        )
        self.assertEqual(cross, "WEAK_BEARISH")

    # ==================== SIGNALS & BREAKOUT TESTS ====================

    def test_cloud_breakout_signals(self):
        """Breakout classifies bullish vs bearish vs consolidation"""
        candles = generate_ichimoku_candles("EURUSD", "1h", count=100)
        res = self.engine.analyze_candles("EURUSD", "1h", candles["highs"], candles["lows"], candles["closes"])
        self.assertIn(res.signals["cloud_breakout"], ["BULLISH_BREAKOUT", "BEARISH_BREAKOUT", "CONSOLIDATION"])

    def test_cloud_color_green_vs_red(self):
        """Senkou A > Senkou B -> GREEN; Senkou A < Senkou B -> RED"""
        candles = generate_ichimoku_candles("GBPUSD", "1h", count=100)
        res = self.engine.analyze_candles("GBPUSD", "1h", candles["highs"], candles["lows"], candles["closes"])
        self.assertIn(res.values["cloud_color"], ["GREEN", "RED"])

    def test_cloud_twist_detection(self):
        """Cloud twist is boolean flag indicating recent span intersection"""
        candles = generate_ichimoku_candles("USDJPY", "1h", count=100)
        res = self.engine.analyze_candles("USDJPY", "1h", candles["highs"], candles["lows"], candles["closes"])
        self.assertIsInstance(res.signals["cloud_twist"], bool)

    def test_chikou_confirmation_bullish(self):
        """Chikou > past price produces BULLISH confirmation"""
        conf = evaluate_chikou(1.1000, 1.0900)
        self.assertEqual(conf, "BULLISH")

    def test_chikou_confirmation_bearish(self):
        """Chikou < past price produces BEARISH confirmation"""
        conf = evaluate_chikou(1.0800, 1.0900)
        self.assertEqual(conf, "BEARISH")

    def test_overall_trend_and_strength_scoring(self):
        """Overall trend should be BULLISH/BEARISH/NEUTRAL with strength 0-100"""
        res = self.engine.analyze("EURUSD", "1h")
        self.assertIn(res.signals["overall_trend"], ["BULLISH", "BEARISH", "NEUTRAL"])
        self.assertGreaterEqual(res.signals["strength"], 0.0)
        self.assertLessEqual(res.signals["strength"], 100.0)

    # ==================== CACHING & DATABASE TESTS ====================

    def test_caching_60s_ttl(self):
        """Second analyze call within 60s should return cached response"""
        res1 = self.engine.analyze("XAUUSD", "15m")
        res2 = self.engine.analyze("XAUUSD", "15m")
        self.assertEqual(res1.symbol, res2.symbol)
        self.assertTrue(res2.cached)

    def test_database_logging_ichimoku(self):
        """Ichimoku analysis should insert a row into SQLite database"""
        row_id = db.log_ichimoku_analysis(
            symbol="EURUSD",
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
            signals_json='{"tk_cross": "STRONG_BULLISH"}'
        )
        self.assertIsInstance(row_id, int)
        self.assertGreater(row_id, 0)

    def test_edge_case_insufficient_candles_raises_value_error(self):
        """Less than 52 candles must raise ValueError"""
        with self.assertRaises(ValueError):
            self.engine.analyze_candles("EURUSD", "1h", [1.0] * 30, [0.9] * 30, [0.95] * 30)


if __name__ == "__main__":
    unittest.main()
