"""
Unit and Integration Tests for Task 23: Sentiment & Order Book Depth Aggregator Engine
Tested via standard python unittest module.
"""

import unittest
import json

from backend.sentiment_engine import (
    calculate_sentiment_index,
    determine_contrarian_signal,
    generate_order_book_depth,
    analyze_sentiment,
    SentimentReport,
    OrderBookLevel
)
import backend.db as db


class TestSentimentMath(unittest.TestCase):
    def test_calculate_sentiment_index(self):
        # 50/50 is neutral 0.0
        self.assertEqual(calculate_sentiment_index(50.0, 50.0), 0.0)
        # 75/25 is +50.0 (net long)
        self.assertEqual(calculate_sentiment_index(75.0, 25.0), 50.0)
        # 20/80 is -60.0 (net short)
        self.assertEqual(calculate_sentiment_index(20.0, 80.0), -60.0)

    def test_determine_contrarian_signal_extreme_long(self):
        bias, mood = determine_contrarian_signal(78.0, 22.0)
        self.assertEqual(bias, "STRONG_SELL")
        self.assertEqual(mood, "EXTREME_GREED")

    def test_determine_contrarian_signal_moderate_long(self):
        bias, mood = determine_contrarian_signal(65.0, 35.0)
        self.assertEqual(bias, "SELL")
        self.assertEqual(mood, "GREED")

    def test_determine_contrarian_signal_extreme_short(self):
        bias, mood = determine_contrarian_signal(20.0, 80.0)
        self.assertEqual(bias, "STRONG_BUY")
        self.assertEqual(mood, "EXTREME_FEAR")

    def test_determine_contrarian_signal_moderate_short(self):
        bias, mood = determine_contrarian_signal(35.0, 65.0)
        self.assertEqual(bias, "BUY")
        self.assertEqual(mood, "FEAR")

    def test_determine_contrarian_signal_balanced(self):
        bias, mood = determine_contrarian_signal(52.0, 48.0)
        self.assertEqual(bias, "NEUTRAL")
        self.assertEqual(mood, "BALANCED")


class TestOrderBookDepth(unittest.TestCase):
    def test_generate_order_book_depth_structure(self):
        levels, total_bids, total_asks = generate_order_book_depth(1.0850, num_levels=8, tick_size=0.0002)
        self.assertEqual(len(levels), 8)
        self.assertGreater(total_bids, 0.0)
        self.assertGreater(total_asks, 0.0)

        # Check ladder progression
        prev_cum_bid = 0.0
        for lvl in levels:
            self.assertLess(lvl.price, 1.0850)
            self.assertGreater(lvl.cumulative_bid, prev_cum_bid)
            prev_cum_bid = lvl.cumulative_bid

    def test_analyze_sentiment_full_report(self):
        report = analyze_sentiment("EURUSD", current_price=1.0850, long_pct=72.0, short_pct=28.0, levels_count=5)
        self.assertIsInstance(report, SentimentReport)
        self.assertEqual(report.symbol, "EURUSD")
        self.assertEqual(report.contrarian_bias, "SELL")
        self.assertEqual(len(report.order_book), 5)
        self.assertGreater(report.bid_ask_depth_ratio, 0.0)


class TestSentimentDatabase(unittest.TestCase):
    def test_sentiment_db_logging_and_query(self):
        db.init_db()
        log_id = db.log_sentiment_depth(
            symbol="EURUSD",
            current_price=1.0850,
            long_pct=76.0,
            short_pct=24.0,
            sentiment_index=52.0,
            contrarian_bias="STRONG_SELL",
            retail_mood="EXTREME_GREED",
            total_bid_depth=1250.0,
            total_ask_depth=1180.0,
            depth_json=json.dumps([{"price": 1.0848, "volume": 150.0}])
        )
        self.assertGreater(log_id, 0)

        record = db.get_latest_sentiment("EURUSD")
        self.assertIsNotNone(record)
        self.assertEqual(record["symbol"], "EURUSD")
        self.assertEqual(record["contrarian_bias"], "STRONG_SELL")
        self.assertEqual(record["retail_mood"], "EXTREME_GREED")
        self.assertAlmostEqual(record["sentiment_index"], 52.0, delta=0.1)

    def test_sentiment_db_missing_symbol(self):
        record = db.get_latest_sentiment("NONEXISTENT_PAIR_XYZ")
        self.assertIsNone(record)


if __name__ == "__main__":
    unittest.main()
