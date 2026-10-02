"""
Unit and Integration Tests for Task 21: Auto-Fibonacci Retracement & Extension Zones Engine
Tested via standard python unittest module.
"""

import unittest
import math
import json
from datetime import datetime, timezone

from backend.fibonacci_engine import (
    find_major_swings,
    calculate_fib_levels,
    analyze_fibonacci,
    FibLevel,
    FibonacciResult,
    FIB_RETRACEMENT_RATIOS,
    FIB_EXTENSION_RATIOS
)
import backend.db as db


class TestFibonacciMath(unittest.TestCase):
    def test_find_major_swings_uptrend(self):
        # Low at index 5 (1.0000), High at index 25 (1.1000)
        candles = [{"high": 1.0500, "low": 1.0400} for _ in range(30)]
        candles[5] = {"high": 1.0200, "low": 1.0000}
        candles[25] = {"high": 1.1000, "low": 1.0800}
        s_low, s_high, trend = find_major_swings(candles)
        self.assertEqual(s_low, 1.0000)
        self.assertEqual(s_high, 1.1000)
        self.assertEqual(trend, "UPTREND")

    def test_find_major_swings_downtrend(self):
        # High at index 5 (1.1000), Low at index 25 (1.0000)
        candles = [{"high": 1.0500, "low": 1.0400} for _ in range(30)]
        candles[5] = {"high": 1.1000, "low": 1.0800}
        candles[25] = {"high": 1.0200, "low": 1.0000}
        s_low, s_high, trend = find_major_swings(candles)
        self.assertEqual(s_low, 1.0000)
        self.assertEqual(s_high, 1.1000)
        self.assertEqual(trend, "DOWNTREND")

    def test_calculate_fib_levels_uptrend(self):
        # High: 1.1000, Low: 1.0000 (Span = 0.1000)
        # Retracement 0.500 = 1.1000 - 0.0500 = 1.0500
        # Golden Pocket 0.618 = 1.1000 - 0.0618 = 1.0382
        retracements, extensions, nearest, gp_min, gp_max = calculate_fib_levels(
            swing_low=1.0000, swing_high=1.1000, trend="UPTREND", current_price=1.0500
        )
        self.assertEqual(len(retracements), len(FIB_RETRACEMENT_RATIOS))
        self.assertEqual(len(extensions), len(FIB_EXTENSION_RATIOS))

        level_50 = next(l for l in retracements if abs(l.ratio - 0.500) < 0.001)
        self.assertAlmostEqual(level_50.price, 1.0500, places=4)

        level_618 = next(l for l in retracements if abs(l.ratio - 0.618) < 0.001)
        self.assertAlmostEqual(level_618.price, 1.0382, places=4)
        self.assertTrue(level_618.is_golden_pocket)

        # Nearest level should be 0.500 because current_price is 1.0500
        self.assertEqual(nearest.ratio, 0.500)

    def test_calculate_fib_levels_downtrend(self):
        # Low: 1.0000, High: 1.1000 (Span = 0.1000)
        # In downtrend, retracement retraces upward from Low (1.0000 + 0.1000 * ratio)
        retracements, extensions, nearest, gp_min, gp_max = calculate_fib_levels(
            swing_low=1.0000, swing_high=1.1000, trend="DOWNTREND", current_price=1.0382
        )
        level_618 = next(l for l in retracements if abs(l.ratio - 0.618) < 0.001)
        self.assertAlmostEqual(level_618.price, 1.0618, places=4)

    def test_golden_pocket_range(self):
        retracements, extensions, nearest, gp_min, gp_max = calculate_fib_levels(
            swing_low=1.0000, swing_high=1.1000, trend="UPTREND", current_price=1.0400
        )
        self.assertLess(gp_min, gp_max)
        self.assertAlmostEqual(gp_min, 1.0350, delta=0.001)  # 0.650 retrace: 1.1000 - 0.0650
        self.assertAlmostEqual(gp_max, 1.0382, delta=0.001)  # 0.618 retrace: 1.1000 - 0.0618

    def test_extensions_values(self):
        retracements, extensions, nearest, gp_min, gp_max = calculate_fib_levels(
            swing_low=1.0000, swing_high=1.1000, trend="UPTREND", current_price=1.1272
        )
        ext_127 = next(l for l in extensions if abs(l.ratio - 1.272) < 0.001)
        # High (1.1000) + span(0.1000) * 0.272 = 1.1272
        self.assertAlmostEqual(ext_127.price, 1.1272, places=4)


class TestFibonacciFullPipeline(unittest.TestCase):
    def test_analyze_fibonacci_empty_candles(self):
        res = analyze_fibonacci("EURUSD", "1h", [])
        self.assertEqual(res.symbol, "EURUSD")
        self.assertEqual(res.trend, "UPTREND")
        self.assertGreater(len(res.retracement_levels), 0)

    def test_analyze_fibonacci_live_data(self):
        candles = []
        for i in range(50):
            p = 1.0800 + math.sin(i / 5.0) * 0.0080
            candles.append({
                "timestamp": f"2026-10-02T{i:02d}:00:00Z",
                "open": round(p, 5),
                "high": round(p + 0.0005, 5),
                "low": round(p - 0.0005, 5),
                "close": round(p + 0.0001, 5)
            })
        res = analyze_fibonacci("EURUSD", "1h", candles)
        self.assertEqual(res.symbol, "EURUSD")
        self.assertIn(res.trend, ["UPTREND", "DOWNTREND"])
        self.assertEqual(len(res.retracement_levels), 9)
        self.assertEqual(len(res.extension_levels), 5)
        self.assertIsNotNone(res.nearest_level)


class TestFibonacciDatabase(unittest.TestCase):
    def test_fibonacci_db_logging_and_query(self):
        db.init_db()
        log_id = db.log_fibonacci_analysis(
            symbol="EURUSD",
            timeframe="1h",
            trend="UPTREND",
            swing_low=1.0800,
            swing_high=1.0950,
            current_price=1.0890,
            golden_pocket_min=1.0852,
            golden_pocket_max=1.0857,
            nearest_level_ratio=0.382,
            nearest_level_price=1.0893,
            levels_json=json.dumps({"test": True})
        )
        self.assertGreater(log_id, 0)

        record = db.get_latest_fibonacci("EURUSD", "1h")
        self.assertIsNotNone(record)
        self.assertEqual(record["symbol"], "EURUSD")
        self.assertEqual(record["trend"], "UPTREND")
        self.assertAlmostEqual(record["golden_pocket_min"], 1.0852, delta=0.001)

    def test_fibonacci_db_missing_symbol(self):
        record = db.get_latest_fibonacci("XYZ_NONEXISTENT_PAIR", "1h")
        self.assertIsNone(record)


if __name__ == "__main__":
    unittest.main()
