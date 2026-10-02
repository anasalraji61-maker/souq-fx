"""
Comprehensive Unit and Integration Tests for Task 18: Harmonic Pattern Recognition Engine
Tested via standard python unittest module.
"""

import unittest
import math
import json
from datetime import datetime, timezone

from backend.harmonic_engine import (
    find_pivots,
    calculate_ratios,
    evaluate_pattern_match,
    calculate_prz_and_targets,
    detect_harmonic_patterns,
    PATTERN_RULES,
    PivotPoint,
    HarmonicPattern
)
import backend.db as db


def generate_synthetic_gartley(direction: str = "BULLISH") -> list[dict]:
    if direction == "BULLISH":
        swings = [
            (5, 1.0000),   # X
            (15, 1.1000),  # A
            (25, 1.0382),  # B
            (35, 1.0764),  # C
            (45, 1.0214)   # D
        ]
    else:
        swings = [
            (5, 1.1000),   # X
            (15, 1.0000),  # A
            (25, 1.0618),  # B
            (35, 1.0236),  # C
            (45, 1.0786)   # D
        ]

    candles = []
    total_bars = 55
    for b in range(total_bars):
        price = 1.0000
        for s_idx in range(len(swings) - 1):
            i1, p1 = swings[s_idx]
            i2, p2 = swings[s_idx + 1]
            if i1 <= b <= i2:
                pct = (b - i1) / (i2 - i1)
                price = p1 + pct * (p2 - p1)
                break
        else:
            if b < swings[0][0]:
                price = swings[0][1]
            else:
                price = swings[-1][1]

        candles.append({
            "timestamp": f"2026-10-02T{b:02d}:00:00Z",
            "open": round(price, 5),
            "high": round(price + 0.0008, 5) if any(b == s[0] and (direction == "BULLISH" and s_idx % 2 == 1 or direction == "BEARISH" and s_idx % 2 == 0) for s_idx, s in enumerate(swings)) else round(price + 0.0002, 5),
            "low": round(price - 0.0008, 5) if any(b == s[0] and (direction == "BULLISH" and s_idx % 2 == 0 or direction == "BEARISH" and s_idx % 2 == 1) for s_idx, s in enumerate(swings)) else round(price - 0.0002, 5),
            "close": round(price, 5),
            "volume": 1500
        })
    return candles


class TestHarmonicCalculations(unittest.TestCase):
    def test_find_pivots_empty(self):
        pivots = find_pivots([])
        self.assertEqual(pivots, [])

    def test_find_pivots_simple_peaks_and_troughs(self):
        candles = [{"high": 10.0, "low": 9.0, "timestamp": "t0"} for _ in range(11)]
        candles[5] = {"high": 15.0, "low": 12.0, "timestamp": "t5"}
        pivots = find_pivots(candles, order=2)
        self.assertTrue(len(pivots) >= 1)
        self.assertTrue(any(p.index == 5 and p.is_high for p in pivots))

    def test_calculate_ratios_exact_values(self):
        ratios = calculate_ratios(x=0.0, a=10.0, b=3.82, c=6.18, d=2.14)
        self.assertAlmostEqual(ratios["XB"], 0.618, delta=0.01)
        self.assertAlmostEqual(ratios["XD"], 0.214, delta=0.01)

    def test_calculate_ratios_zero_division_guard(self):
        ratios = calculate_ratios(x=10.0, a=10.0, b=10.0, c=10.0, d=10.0)
        self.assertEqual(ratios["XB"], 0.0)
        self.assertEqual(ratios["XD"], 0.0)

    def test_evaluate_pattern_match_gartley_ideal(self):
        ratios = {"XB": 0.618, "AC": 0.618, "BD": 1.272, "XD": 0.786}
        matched, score = evaluate_pattern_match(ratios, PATTERN_RULES["Gartley"], tolerance=0.05)
        self.assertTrue(matched)
        self.assertGreaterEqual(score, 85.0)

    def test_evaluate_pattern_match_bat_ideal(self):
        ratios = {"XB": 0.450, "AC": 0.618, "BD": 2.000, "XD": 0.886}
        matched, score = evaluate_pattern_match(ratios, PATTERN_RULES["Bat"], tolerance=0.05)
        self.assertTrue(matched)
        self.assertGreaterEqual(score, 85.0)

    def test_evaluate_pattern_match_butterfly_ideal(self):
        ratios = {"XB": 0.786, "AC": 0.618, "BD": 2.000, "XD": 1.272}
        matched, score = evaluate_pattern_match(ratios, PATTERN_RULES["Butterfly"], tolerance=0.05)
        self.assertTrue(matched)
        self.assertGreaterEqual(score, 85.0)

    def test_evaluate_pattern_match_crab_ideal(self):
        ratios = {"XB": 0.500, "AC": 0.618, "BD": 2.618, "XD": 1.618}
        matched, score = evaluate_pattern_match(ratios, PATTERN_RULES["Crab"], tolerance=0.05)
        self.assertTrue(matched)
        self.assertGreaterEqual(score, 85.0)

    def test_evaluate_pattern_match_deep_crab_ideal(self):
        ratios = {"XB": 0.886, "AC": 0.618, "BD": 2.618, "XD": 1.618}
        matched, score = evaluate_pattern_match(ratios, PATTERN_RULES["Deep Crab"], tolerance=0.05)
        self.assertTrue(matched)
        self.assertGreaterEqual(score, 85.0)

    def test_evaluate_pattern_match_cypher_ideal(self):
        ratios = {"XB": 0.500, "AC": 1.272, "BD": 0.786, "XD": 0.786}
        matched, score = evaluate_pattern_match(ratios, PATTERN_RULES["Cypher"], tolerance=0.05)
        self.assertTrue(matched)
        self.assertGreaterEqual(score, 85.0)

    def test_evaluate_pattern_match_shark_ideal(self):
        ratios = {"XB": 1.300, "AC": 1.800, "BD": 1.000, "XD": 0.886}
        matched, score = evaluate_pattern_match(ratios, PATTERN_RULES["Shark"], tolerance=0.05)
        self.assertTrue(matched)
        self.assertGreaterEqual(score, 85.0)

    def test_evaluate_pattern_match_rejection(self):
        ratios = {"XB": 0.100, "AC": 0.100, "BD": 0.500, "XD": 0.300}
        matched, score = evaluate_pattern_match(ratios, PATTERN_RULES["Gartley"], tolerance=0.05)
        self.assertFalse(matched)
        self.assertEqual(score, 0.0)

    def test_calculate_prz_and_targets_bullish(self):
        targets = calculate_prz_and_targets(
            direction="BULLISH",
            x=1.0000,
            a=1.1000,
            b=1.0382,
            c=1.0764,
            d=1.0214,
            xd_ratio=0.786,
            pattern_name="Gartley"
        )
        self.assertLessEqual(targets["prz_min"], 1.0214)
        self.assertGreaterEqual(targets["prz_max"], 1.0214)
        self.assertLess(targets["stop_loss"], 1.0214)
        self.assertGreater(targets["tp1"], 1.0214)
        self.assertGreater(targets["tp2"], targets["tp1"])
        self.assertGreater(targets["tp3"], targets["tp2"])

    def test_calculate_prz_and_targets_bearish(self):
        targets = calculate_prz_and_targets(
            direction="BEARISH",
            x=1.1000,
            a=1.0000,
            b=1.0618,
            c=1.0236,
            d=1.0786,
            xd_ratio=0.786,
            pattern_name="Gartley"
        )
        self.assertLessEqual(targets["prz_min"], 1.0786)
        self.assertGreaterEqual(targets["prz_max"], 1.0786)
        self.assertGreater(targets["stop_loss"], 1.0786)
        self.assertLess(targets["tp1"], 1.0786)
        self.assertLess(targets["tp2"], targets["tp1"])
        self.assertLess(targets["tp3"], targets["tp2"])

    def test_prz_and_targets_extension_pattern_butterfly(self):
        targets = calculate_prz_and_targets(
            direction="BULLISH",
            x=1.0000,
            a=1.1000,
            b=1.0214,
            c=1.0600,
            d=0.9728,
            xd_ratio=1.272,
            pattern_name="Butterfly"
        )
        self.assertLess(targets["stop_loss"], 0.9728)


class TestHarmonicDetectionEngine(unittest.TestCase):
    def test_all_pattern_rules_configured(self):
        expected_patterns = ["Gartley", "Bat", "Butterfly", "Crab", "Deep Crab", "Cypher", "Shark"]
        for p in expected_patterns:
            self.assertIn(p, PATTERN_RULES)
            self.assertIn("XB", PATTERN_RULES[p])
            self.assertIn("XD", PATTERN_RULES[p])

    def test_detect_harmonic_patterns_output_structure(self):
        candles = generate_synthetic_gartley(direction="BULLISH")
        patterns = detect_harmonic_patterns(
            candles=candles,
            symbol="EURUSD",
            timeframe="1h",
            pivot_order=2,
            tolerance=0.15
        )
        self.assertIsInstance(patterns, list)

    def test_detect_harmonic_patterns_short_series(self):
        candles = [{"open": 1.0, "high": 1.1, "low": 0.9, "close": 1.0} for _ in range(3)]
        patterns = detect_harmonic_patterns(candles=candles, symbol="EURUSD")
        self.assertEqual(patterns, [])


class TestHarmonicDatabaseAndAPI(unittest.TestCase):
    def test_harmonic_db_migration_and_insert(self):
        db.init_db()
        pat_id = db.log_harmonic_pattern(
            symbol="GBPUSD",
            timeframe="1h",
            pattern_type="Bat",
            direction="BULLISH",
            x_price=1.2500,
            a_price=1.2700,
            b_price=1.2590,
            c_price=1.2660,
            d_price=1.2520,
            prz_min=1.2515,
            prz_max=1.2525,
            stop_loss=1.2480,
            tp1=1.2580,
            tp2=1.2630,
            tp3=1.2700,
            confidence_score=92.5,
            status="COMPLETED"
        )
        self.assertGreater(pat_id, 0)

        records = db.get_harmonic_patterns("GBPUSD", timeframe="1h", limit=5)
        self.assertGreaterEqual(len(records), 1)
        latest = records[0]
        self.assertEqual(latest["symbol"], "GBPUSD")
        self.assertEqual(latest["pattern_type"], "Bat")
        self.assertEqual(latest["direction"], "BULLISH")
        self.assertAlmostEqual(latest["confidence_score"], 92.5, delta=0.1)

    def test_harmonic_db_multiple_symbols(self):
        db.init_db()
        db.log_harmonic_pattern(
            symbol="USDJPY",
            timeframe="4h",
            pattern_type="Gartley",
            direction="BEARISH",
            x_price=150.0,
            a_price=145.0,
            b_price=148.0,
            c_price=146.0,
            d_price=149.0,
            prz_min=148.8,
            prz_max=149.2,
            stop_loss=150.5,
            tp1=147.5,
            tp2=146.5,
            tp3=145.0,
            confidence_score=88.0
        )
        jpy_records = db.get_harmonic_patterns("USDJPY", timeframe="4h", limit=5)
        self.assertTrue(len(jpy_records) >= 1)
        self.assertEqual(jpy_records[0]["symbol"], "USDJPY")
        self.assertEqual(jpy_records[0]["direction"], "BEARISH")


if __name__ == "__main__":
    unittest.main()
