"""
Unit and Integration Tests for Task 17 — Volume Profile & Order Flow Engine
Covers:
- Volume Profile Histogram & Binning
- POC (Point of Control) mathematical validation
- Value Area (70% Volume) bounds (VAH / VAL)
- High Volume Nodes (HVN) & Low Volume Nodes (LVN)
- Order Flow Delta & Cumulative Volume Delta (CVD)
- Bid/Ask Imbalance Detection
- Database schema migration & CRUD operations
- Caching & End-to-End API helpers
"""

import json
import os
import sqlite3
import sys
import time
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import db
import volume_profile


class TestVolumeProfileTask17(unittest.TestCase):
    def setUp(self):
        # Sample synthetic candles
        self.candles = [
            {"timestamp": 1000, "open": 1.0800, "high": 1.0850, "low": 1.0790, "close": 1.0840, "volume": 500.0},
            {"timestamp": 2000, "open": 1.0840, "high": 1.0890, "low": 1.0830, "close": 1.0880, "volume": 1200.0},  # Heavy volume here
            {"timestamp": 3000, "open": 1.0880, "high": 1.0910, "low": 1.0870, "close": 1.0875, "volume": 400.0},
            {"timestamp": 4000, "open": 1.0875, "high": 1.0900, "low": 1.0850, "close": 1.0860, "volume": 350.0},
            {"timestamp": 5000, "open": 1.0860, "high": 1.0885, "low": 1.0820, "close": 1.0830, "volume": 600.0},
        ]

    def test_01_empty_candles_fallback(self):
        res = volume_profile.calculate_volume_profile([], symbol="EURUSD")
        self.assertIsNotNone(res)
        self.assertEqual(res.symbol, "EURUSD")
        self.assertEqual(res.total_volume, 0.0)
        self.assertEqual(res.market_sentiment, "BALANCED")
        self.assertEqual(len(res.bins), 0)

    def test_02_basic_calculation_structure(self):
        res = volume_profile.calculate_volume_profile(self.candles, symbol="EURUSD", num_bins=20)
        self.assertEqual(res.symbol, "EURUSD")
        self.assertGreater(res.total_volume, 0.0)
        self.assertEqual(len(res.bins), 20)
        self.assertTrue(res.vah_price >= res.val_price)
        self.assertTrue(res.poc_price >= res.val_price)
        self.assertTrue(res.poc_price <= res.vah_price)

    def test_03_poc_is_maximum_volume_bin(self):
        res = volume_profile.calculate_volume_profile(self.candles, symbol="EURUSD", num_bins=25)
        poc_bin = next((b for b in res.bins if b["is_poc"]), None)
        self.assertIsNotNone(poc_bin)
        
        # Verify no other bin has strictly greater volume than POC bin
        max_vol = max(b["volume"] for b in res.bins)
        self.assertAlmostEqual(poc_bin["volume"], max_vol, places=2)

    def test_04_value_area_contains_at_least_70_percent(self):
        res = volume_profile.calculate_volume_profile(self.candles, symbol="EURUSD", value_area_pct=0.70)
        va_volume = sum(b["volume"] for b in res.bins if b["in_value_area"])
        ratio = va_volume / res.total_volume
        self.assertGreaterEqual(ratio, 0.69)  # 70% threshold

    def test_05_vah_and_val_boundaries(self):
        res = volume_profile.calculate_volume_profile(self.candles, symbol="EURUSD")
        self.assertGreater(res.vah_price, res.val_price)
        self.assertTrue(res.val_price <= res.poc_price <= res.vah_price)

    def test_06_order_flow_delta_computation(self):
        res = volume_profile.calculate_volume_profile(self.candles, symbol="EURUSD")
        summary = res.order_flow_summary
        self.assertIn("net_delta", summary)
        self.assertIn("cvd", summary)
        self.assertIn("buy_ratio_pct", summary)
        self.assertTrue(0 <= summary["buy_ratio_pct"] <= 100)
        self.assertAlmostEqual(summary["total_buy_volume"] + summary["total_sell_volume"], res.total_volume, delta=1.0)

    def test_07_order_flow_imbalance_detection(self):
        # Candle with massive buy spike
        skewed_candles = [
            {"timestamp": 1000, "open": 1.0800, "high": 1.0900, "low": 1.0800, "close": 1.0899, "volume": 1000.0},
        ]
        res = volume_profile.calculate_volume_profile(skewed_candles, symbol="EURUSD", imbalance_threshold=2.0)
        summary = res.order_flow_summary
        self.assertGreater(summary["buy_ratio_pct"], 80)
        self.assertEqual(summary["order_flow_sentiment"], "BUYING_DOMINANT")

    def test_08_bullish_value_area_breakout_signal(self):
        # Current price breaking above VAH
        breakout_candles = [
            {"timestamp": 1000, "open": 1.0800, "high": 1.0850, "low": 1.0790, "close": 1.0840, "volume": 1000.0},
            {"timestamp": 2000, "open": 1.0840, "high": 1.0850, "low": 1.0830, "close": 1.0845, "volume": 1000.0},
            {"timestamp": 3000, "open": 1.0850, "high": 1.0950, "low": 1.0850, "close": 1.0940, "volume": 1500.0},
        ]
        res = volume_profile.calculate_volume_profile(breakout_candles, symbol="EURUSD")
        self.assertIn(res.market_sentiment, ["BULLISH", "STRONG_BULLISH"])
        breakout_sig = next((s for s in res.trading_signals if s["direction"] == "BUY"), None)
        self.assertIsNotNone(breakout_sig)

    def test_09_bearish_value_area_breakdown_signal(self):
        # Current price breaking below VAL
        breakdown_candles = [
            {"timestamp": 1000, "open": 1.0850, "high": 1.0890, "low": 1.0840, "close": 1.0880, "volume": 1000.0},
            {"timestamp": 2000, "open": 1.0880, "high": 1.0890, "low": 1.0870, "close": 1.0875, "volume": 1000.0},
            {"timestamp": 3000, "open": 1.0870, "high": 1.0870, "low": 1.0750, "close": 1.0760, "volume": 1500.0},
        ]
        res = volume_profile.calculate_volume_profile(breakdown_candles, symbol="EURUSD")
        self.assertIn(res.market_sentiment, ["BEARISH", "STRONG_BEARISH"])
        breakdown_sig = next((s for s in res.trading_signals if s["direction"] == "SELL"), None)
        self.assertIsNotNone(breakdown_sig)

    def test_10_hvn_and_lvn_structure(self):
        res = volume_profile.calculate_volume_profile(self.candles, symbol="EURUSD", num_bins=30)
        self.assertIsInstance(res.hvn_levels, list)
        self.assertIsInstance(res.lvn_levels, list)
        for h in res.hvn_levels:
            self.assertTrue(res.val_price * 0.9 <= h <= res.vah_price * 1.1)

    def test_11_db_migration_creates_tables(self):
        with db.get_db() as c:
            db._migrate_volume_profile(c)
            # Verify tables exist
            cur = c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='volume_profile_analysis'")
            self.assertIsNotNone(cur.fetchone())
            cur = c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='order_flow_imbalances'")
            self.assertIsNotNone(cur.fetchone())

    def test_12_db_log_and_fetch_volume_profile(self):
        row_id = db.log_volume_profile_analysis(
            symbol="GBPUSD",
            timeframe="1h",
            current_price=1.2950,
            poc_price=1.2940,
            vah_price=1.2970,
            val_price=1.2920,
            total_volume=45000.0,
            sentiment="BULLISH",
            bins_json=json.dumps([{"price": 1.2940, "vol": 10000}]),
            signals_json=json.dumps([{"type": "BUY"}]),
        )
        self.assertGreater(row_id, 0)

        record = db.get_latest_volume_profile("GBPUSD", "1h")
        self.assertIsNotNone(record)
        self.assertEqual(record["symbol"], "GBPUSD")
        self.assertEqual(record["current_price"], 1.2950)
        self.assertEqual(record["poc_price"], 1.2940)
        self.assertEqual(record["sentiment"], "BULLISH")
        self.assertEqual(len(record["bins"]), 1)

    def test_13_db_log_order_flow_imbalance(self):
        imb_id = db.log_order_flow_imbalance(
            symbol="XAUUSD",
            timeframe="5m",
            imbalance_type="BUY_IMBALANCE",
            delta=450.0,
            ratio=3.2,
            price=2654.50,
        )
        self.assertGreater(imb_id, 0)

    def test_14_synthetic_candle_generation_multi_symbol(self):
        symbols = ["EURUSD", "USDJPY", "XAUUSD", "BTCUSD", "GBPUSD"]
        for sym in symbols:
            candles = volume_profile.generate_volume_profile_candles(sym, count=50)
            self.assertEqual(len(candles), 50)
            self.assertTrue(candles[0]["high"] >= candles[0]["low"])
            self.assertGreater(candles[0]["volume"], 0)

    def test_15_analyze_symbol_end_to_end(self):
        res = volume_profile.analyze_symbol("XAUUSD", timeframe="15m", num_bins=24)
        self.assertEqual(res.symbol, "XAUUSD")
        self.assertEqual(res.timeframe, "15m")
        self.assertEqual(len(res.bins), 24)
        self.assertGreater(res.poc_price, 2000.0)  # Gold price range

    def test_16_cache_hit_consistency(self):
        res1 = volume_profile.calculate_volume_profile(self.candles, symbol="EURUSD", num_bins=20)
        res2 = volume_profile.calculate_volume_profile(self.candles, symbol="EURUSD", num_bins=20)
        self.assertEqual(res1.poc_price, res2.poc_price)
        self.assertEqual(res1.total_volume, res2.total_volume)

    def test_17_distance_to_poc_pct_calculation(self):
        res = volume_profile.calculate_volume_profile(self.candles, symbol="EURUSD")
        expected_dist = ((res.current_price - res.poc_price) / res.poc_price) * 100.0
        self.assertAlmostEqual(res.price_to_poc_distance_pct, expected_dist, places=1)

    def test_18_bin_delta_equality(self):
        res = volume_profile.calculate_volume_profile(self.candles, symbol="EURUSD")
        for b in res.bins:
            self.assertAlmostEqual(b["delta"], round(b["buy_volume"] - b["sell_volume"], 2), places=1)

    def test_19_market_sentiment_states(self):
        allowed_sentiments = {"STRONG_BULLISH", "BULLISH", "BALANCED", "BEARISH", "STRONG_BEARISH"}
        res = volume_profile.calculate_volume_profile(self.candles, symbol="EURUSD")
        self.assertIn(res.market_sentiment, allowed_sentiments)

    def test_20_trading_signals_contain_required_fields(self):
        res = volume_profile.analyze_symbol("EURUSD", timeframe="1h")
        for sig in res.trading_signals:
            self.assertIn("type", sig)
            self.assertIn("direction", sig)
            self.assertIn("strength", sig)
            self.assertIn("message", sig)
            self.assertIn(sig["direction"], ["BUY", "SELL"])


if __name__ == "__main__":
    unittest.main()
