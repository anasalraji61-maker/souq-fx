"""
Unit and Integration Tests for Task 20: Divergence Detection Engine (RSI, MACD, Stochastic)
Tested via standard python unittest module.
"""

import unittest
import math
import json
from datetime import datetime, timezone

from backend.divergence_engine import (
    compute_rsi,
    compute_ema,
    compute_macd,
    compute_stochastic,
    find_swings,
    detect_divergences,
    scan_multi_indicator_divergences,
    DivergenceSignal, IndicatorSwing
)
import backend.db as db


class TestOscillatorMath(unittest.TestCase):
    def test_compute_rsi_bounds(self):
        prices = [1.0 + (i * 0.01) for i in range(30)]
        rsi = compute_rsi(prices, period=14)
        self.assertEqual(len(rsi), len(prices))
        for val in rsi:
            self.assertGreaterEqual(val, 0.0)
            self.assertLessEqual(val, 100.0)
        # In a purely rising series, RSI should be high (> 70)
        self.assertGreater(rsi[-1], 70.0)

    def test_compute_rsi_falling_series(self):
        prices = [2.0 - (i * 0.02) for i in range(30)]
        rsi = compute_rsi(prices, period=14)
        # In a purely falling series, RSI should be low (< 30)
        self.assertLess(rsi[-1], 30.0)

    def test_compute_ema(self):
        vals = [10.0] * 20
        ema = compute_ema(vals, period=5)
        self.assertEqual(len(ema), 20)
        self.assertAlmostEqual(ema[-1], 10.0, places=4)

    def test_compute_macd(self):
        prices = [100.0 + math.sin(i / 3.0) * 5.0 for i in range(60)]
        macd_line, sig_line, hist = compute_macd(prices, 12, 26, 9)
        self.assertEqual(len(macd_line), 60)
        self.assertEqual(len(sig_line), 60)
        self.assertEqual(len(hist), 60)
        # Histogram should equal macd_line - sig_line
        for m, s, h in zip(macd_line, sig_line, hist):
            self.assertAlmostEqual(h, m - s, places=4)

    def test_compute_stochastic_bounds(self):
        highs = [1.10 + (i * 0.001) for i in range(25)]
        lows = [1.05 + (i * 0.001) for i in range(25)]
        closes = [1.08 + (i * 0.001) for i in range(25)]
        k, d = compute_stochastic(highs, lows, closes, 14, 3)
        self.assertEqual(len(k), 25)
        for val in k:
            self.assertGreaterEqual(val, 0.0)
            self.assertLessEqual(val, 100.0)


class TestDivergenceLogic(unittest.TestCase):
    def test_find_swings(self):
        prices = [10.0, 12.0, 15.0, 11.0, 9.0, 7.0, 8.0, 14.0, 10.0]
        osc = [50.0] * len(prices)
        ts = [f"t{i}" for i in range(len(prices))]
        highs, lows = find_swings(prices, osc, ts, order=1)
        self.assertTrue(any(h.index == 2 and h.price == 15.0 for h in highs))
        self.assertTrue(any(l.index == 5 and l.price == 7.0 for l in lows))

    def test_detect_divergences_short_series(self):
        candles = [{"close": 1.0, "high": 1.1, "low": 0.9} for _ in range(10)]
        signals = detect_divergences(candles, "EURUSD", "1h", "RSI")
        self.assertEqual(signals, [])

    def test_scan_multi_indicator_structure(self):
        candles = []
        for i in range(50):
            p = 1.0800 + math.sin(i / 4.0) * 0.0050
            candles.append({
                "timestamp": f"2026-10-02T{i:02d}:00:00Z",
                "open": round(p, 5),
                "high": round(p + 0.0005, 5),
                "low": round(p - 0.0005, 5),
                "close": round(p + 0.0001, 5)
            })
        report = scan_multi_indicator_divergences(candles, "EURUSD", "1h")
        self.assertEqual(report["symbol"], "EURUSD")
        self.assertIn("consensus", report)
        self.assertIn("signals", report)
        self.assertIn("rsi_signals", report)
        self.assertIn("macd_signals", report)
        self.assertIn("stoch_signals", report)


class TestDivergenceDatabase(unittest.TestCase):
    def test_divergence_db_logging_and_query(self):
        db.init_db()
        sig_id = db.log_divergence_signal(
            symbol="EURUSD",
            timeframe="1h",
            indicator="RSI",
            divergence_type="REGULAR_BULLISH",
            direction="BUY",
            price_point1=1.0820,
            price_point2=1.0790,
            osc_point1=28.5,
            osc_point2=34.2,
            current_price=1.0800,
            target_price=1.0860,
            stop_loss=1.0770,
            confidence_score=92.0
        )
        self.assertGreater(sig_id, 0)

        records = db.get_divergence_signals("EURUSD", "1h", limit=5)
        self.assertGreaterEqual(len(records), 1)
        r = records[0]
        self.assertEqual(r["symbol"], "EURUSD")
        self.assertEqual(r["indicator"], "RSI")
        self.assertEqual(r["divergence_type"], "REGULAR_BULLISH")
        self.assertEqual(r["direction"], "BUY")
        self.assertAlmostEqual(r["confidence_score"], 92.0, delta=0.1)

    def test_divergence_db_empty_result(self):
        db.init_db()
        records = db.get_divergence_signals("UNKNOWN_PAIR_99", "1h")
        self.assertEqual(records, [])


if __name__ == "__main__":
    unittest.main()


class TestExtendedDivergences(unittest.TestCase):
    def test_divergence_bearish_rules(self):
        # High 1 at 1.0800, High 2 at 1.0850 (HH)
        # Osc 1 at 75.0, Osc 2 at 68.0 (LH) -> Regular Bearish
        swings_h = [
            IndicatorSwing(index=10, price=1.0800, osc_value=75.0, is_high=True, timestamp="t10"),
            IndicatorSwing(index=25, price=1.0850, osc_value=68.0, is_high=True, timestamp="t25")
        ]
        self.assertTrue(swings_h[1].price > swings_h[0].price)
        self.assertTrue(swings_h[1].osc_value < swings_h[0].osc_value)

    def test_divergence_hidden_bullish_rules(self):
        # Low 1 at 1.0700, Low 2 at 1.0730 (HL)
        # Osc 1 at 35.0, Osc 2 at 28.0 (LL) -> Hidden Bullish
        swings_l = [
            IndicatorSwing(index=10, price=1.0700, osc_value=35.0, is_high=False, timestamp="t10"),
            IndicatorSwing(index=25, price=1.0730, osc_value=28.0, is_high=False, timestamp="t25")
        ]
        self.assertTrue(swings_l[1].price > swings_l[0].price)
        self.assertTrue(swings_l[1].osc_value < swings_l[0].osc_value)

    def test_divergence_hidden_bearish_rules(self):
        # High 1 at 1.0900, High 2 at 1.0870 (LH)
        # Osc 1 at 65.0, Osc 2 at 72.0 (HH) -> Hidden Bearish
        swings_h = [
            IndicatorSwing(index=10, price=1.0900, osc_value=65.0, is_high=True, timestamp="t10"),
            IndicatorSwing(index=25, price=1.0870, osc_value=72.0, is_high=True, timestamp="t25")
        ]
        self.assertTrue(swings_h[1].price < swings_h[0].price)
        self.assertTrue(swings_h[1].osc_value > swings_h[0].osc_value)

    def test_db_multi_indicator_logging(self):
        db.init_db()
        db.log_divergence_signal("USDJPY", "15m", "MACD", "REGULAR_BEARISH", "SELL", 152.5, 153.0, 0.45, 0.20, 152.9, 151.5, 153.4, 88.0)
        db.log_divergence_signal("USDJPY", "15m", "STOCHASTIC", "HIDDEN_BEARISH", "SELL", 153.0, 152.8, 80.0, 88.0, 152.9, 151.8, 153.3, 85.0)
        signals = db.get_divergence_signals("USDJPY", "15m")
        self.assertGreaterEqual(len(signals), 2)
        indicators = [s["indicator"] for s in signals]
        self.assertIn("MACD", indicators)
        self.assertIn("STOCHASTIC", indicators)
