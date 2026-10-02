"""
Unit and Integration Tests for Task 19: Liquidity Sweep & Smart Money Concepts (SMC Engine)
Tested via standard python unittest module.
"""

import unittest
import json
from datetime import datetime, timezone

from backend.smc_engine import (
    detect_fvgs,
    detect_order_blocks,
    detect_structure_and_breaks,
    detect_liquidity_sweeps,
    calculate_premium_discount,
    analyze_smc,
    FairValueGap,
    OrderBlock,
    StructureBreak,
    LiquiditySweep,
    SMCAnalysisResult
)
import backend.db as db


class TestSMCComponents(unittest.TestCase):
    def test_detect_fvgs_empty_and_short(self):
        self.assertEqual(detect_fvgs([]), [])
        self.assertEqual(detect_fvgs([{"high": 1.1, "low": 1.0}]), [])
        self.assertEqual(detect_fvgs([{"high": 1.1, "low": 1.0}, {"high": 1.2, "low": 1.1}]), [])

    def test_detect_fvgs_bullish(self):
        candles = [
            {"high": 1.0800, "low": 1.0780, "timestamp": "t0"},
            {"high": 1.0850, "low": 1.0790, "timestamp": "t1"},  # Big expansion candle
            {"high": 1.0870, "low": 1.0820, "timestamp": "t2"},  # Low (1.0820) > c0 High (1.0800)
        ]
        fvgs = detect_fvgs(candles)
        self.assertEqual(len(fvgs), 1)
        fvg = fvgs[0]
        self.assertEqual(fvg.gap_type, "BULLISH_FVG")
        self.assertEqual(fvg.bottom_price, 1.0800)
        self.assertEqual(fvg.top_price, 1.0820)
        self.assertAlmostEqual(fvg.gap_size, 0.0020, delta=0.0001)
        self.assertFalse(fvg.is_mitigated)

    def test_detect_fvgs_bearish(self):
        candles = [
            {"high": 1.0900, "low": 1.0880, "timestamp": "t0"},
            {"high": 1.0885, "low": 1.0820, "timestamp": "t1"},  # Big dump candle
            {"high": 1.0830, "low": 1.0810, "timestamp": "t2"},  # High (1.0830) < c0 Low (1.0880)
        ]
        fvgs = detect_fvgs(candles)
        self.assertEqual(len(fvgs), 1)
        fvg = fvgs[0]
        self.assertEqual(fvg.gap_type, "BEARISH_FVG")
        self.assertEqual(fvg.top_price, 1.0880)
        self.assertEqual(fvg.bottom_price, 1.0830)
        self.assertFalse(fvg.is_mitigated)

    def test_detect_fvgs_mitigation(self):
        candles = [
            {"high": 1.0800, "low": 1.0780, "timestamp": "t0"},
            {"high": 1.0850, "low": 1.0790, "timestamp": "t1"},
            {"high": 1.0870, "low": 1.0820, "timestamp": "t2"},
            {"high": 1.0860, "low": 1.0810, "timestamp": "t3"},  # Low (1.0810) fills gap <= top_p (1.0820)
        ]
        fvgs = detect_fvgs(candles)
        self.assertEqual(len(fvgs), 1)
        self.assertTrue(fvgs[0].is_mitigated)

    def test_detect_order_blocks_bullish(self):
        # Bearish candle at i=1 followed by sharp upward surge
        candles = [
            {"open": 1.0800, "close": 1.0805, "high": 1.0810, "low": 1.0795},
            {"open": 1.0805, "close": 1.0790, "high": 1.0810, "low": 1.0785, "volume": 1200},  # Bearish OB
            {"open": 1.0790, "close": 1.0840, "high": 1.0850, "low": 1.0790},                  # Displacement up
            {"open": 1.0840, "close": 1.0880, "high": 1.0890, "low": 1.0835},                  # Follow through
            {"open": 1.0880, "close": 1.0875, "high": 1.0890, "low": 1.0865},
        ]
        obs = detect_order_blocks(candles, min_displacement_pct=0.001)
        self.assertTrue(len(obs) >= 1)
        ob = obs[0]
        self.assertEqual(ob.block_type, "BULLISH_OB")
        self.assertEqual(ob.top_price, 1.0810)
        self.assertEqual(ob.bottom_price, 1.0785)
        self.assertGreaterEqual(ob.strength, 50.0)

    def test_detect_order_blocks_bearish(self):
        # Bullish candle at i=1 followed by sharp downward surge
        candles = [
            {"open": 1.0850, "close": 1.0845, "high": 1.0855, "low": 1.0840},
            {"open": 1.0845, "close": 1.0860, "high": 1.0865, "low": 1.0840, "volume": 1500},  # Bullish OB before drop
            {"open": 1.0860, "close": 1.0810, "high": 1.0860, "low": 1.0800},                  # Displacement down
            {"open": 1.0810, "close": 1.0770, "high": 1.0815, "low": 1.0760},                  # Follow through
            {"open": 1.0770, "close": 1.0780, "high": 1.0790, "low": 1.0765},
        ]
        obs = detect_order_blocks(candles, min_displacement_pct=0.001)
        self.assertTrue(len(obs) >= 1)
        ob = obs[0]
        self.assertEqual(ob.block_type, "BEARISH_OB")
        self.assertEqual(ob.top_price, 1.0865)
        self.assertEqual(ob.bottom_price, 1.0840)

    def test_detect_order_blocks_mitigation(self):
        candles = [
            {"open": 1.0800, "close": 1.0805, "high": 1.0810, "low": 1.0795},
            {"open": 1.0805, "close": 1.0790, "high": 1.0810, "low": 1.0785, "volume": 1200},
            {"open": 1.0790, "close": 1.0840, "high": 1.0850, "low": 1.0790},
            {"open": 1.0840, "close": 1.0880, "high": 1.0890, "low": 1.0835},
            {"open": 1.0880, "close": 1.0800, "high": 1.0880, "low": 1.0800},  # Retest/Mitigation <= 1.0810
        ]
        obs = detect_order_blocks(candles, min_displacement_pct=0.001)
        self.assertTrue(len(obs) >= 1)
        self.assertTrue(obs[0].is_mitigated)

    def test_detect_structure_breaks_empty(self):
        self.assertEqual(detect_structure_and_breaks([]), [])
        self.assertEqual(detect_structure_and_breaks([{"high": 1.0, "low": 0.9, "close": 0.95}] * 5), [])

    def test_detect_liquidity_sweeps_bsl(self):
        # 22 candles with high watermark at 1.0850, then candle 21 wicks to 1.0870 and closes at 1.0840
        candles = [{"high": 1.0830, "low": 1.0800, "close": 1.0810} for _ in range(20)]
        candles[10] = {"high": 1.0850, "low": 1.0810, "close": 1.0820}
        candles.append({"high": 1.0870, "low": 1.0830, "close": 1.0840, "timestamp": "t_sweep"})  # Wicks above 1.0850, closes below
        sweeps = detect_liquidity_sweeps(candles, lookback=15)
        self.assertTrue(len(sweeps) >= 1)
        sweep = sweeps[0]
        self.assertEqual(sweep.sweep_type, "BSL_SWEEP")
        self.assertEqual(sweep.direction, "BEARISH_REVERSAL")
        self.assertEqual(sweep.wick_extreme, 1.0870)
        self.assertLess(sweep.close_price, sweep.swept_level)

    def test_detect_liquidity_sweeps_ssl(self):
        # Low watermark at 1.0800, candle wicks to 1.0780 and closes at 1.0815
        candles = [{"high": 1.0850, "low": 1.0820, "close": 1.0830} for _ in range(20)]
        candles[10] = {"high": 1.0840, "low": 1.0800, "close": 1.0810}
        candles.append({"high": 1.0830, "low": 1.0780, "close": 1.0815, "timestamp": "t_sweep"})
        sweeps = detect_liquidity_sweeps(candles, lookback=15)
        self.assertTrue(len(sweeps) >= 1)
        sweep = sweeps[0]
        self.assertEqual(sweep.sweep_type, "SSL_SWEEP")
        self.assertEqual(sweep.direction, "BULLISH_REVERSAL")
        self.assertEqual(sweep.wick_extreme, 1.0780)
        self.assertGreater(sweep.close_price, sweep.swept_level)

    def test_calculate_premium_discount_equilibrium(self):
        candles = [
            {"high": 1.1000, "low": 1.0800},
            {"high": 1.0900, "low": 1.0000}
        ]
        pd_result = calculate_premium_discount(candles)
        self.assertEqual(pd_result["range_high"], 1.1000)
        self.assertEqual(pd_result["range_low"], 1.0000)
        self.assertEqual(pd_result["equilibrium"], 1.0500)
        self.assertAlmostEqual(pd_result["premium_zone_start"], 1.0618, delta=0.001)
        self.assertAlmostEqual(pd_result["discount_zone_end"], 1.0382, delta=0.001)


class TestSMCFullPipeline(unittest.TestCase):
    def test_analyze_smc_empty_candles(self):
        res = analyze_smc("EURUSD", "1h", [])
        self.assertEqual(res.symbol, "EURUSD")
        self.assertEqual(res.market_bias, "NEUTRAL")
        self.assertEqual(res.fvgs, [])

    def test_analyze_smc_full_pipeline(self):
        # Generate synthetic series with FVG, OB and sweep
        candles = []
        for i in range(40):
            p = 1.0800 + (i * 0.0002)
            candles.append({
                "timestamp": f"2026-10-02T{i:02d}:00:00Z",
                "open": round(p, 5),
                "high": round(p + 0.0004, 5),
                "low": round(p - 0.0004, 5),
                "close": round(p + 0.0001, 5),
                "volume": 2000
            })
        res = analyze_smc("EURUSD", "1h", candles)
        self.assertIsInstance(res, SMCAnalysisResult)
        self.assertEqual(res.symbol, "EURUSD")
        self.assertIn(res.market_bias, ["STRONG_BULLISH", "BULLISH", "NEUTRAL", "BEARISH", "STRONG_BEARISH"])
        self.assertIn("equilibrium", res.premium_discount)

    def test_smc_db_logging_and_retrieval(self):
        db.init_db()
        log_id = db.log_smc_analysis(
            symbol="GBPUSD",
            timeframe="1h",
            current_price=1.2650,
            market_bias="BULLISH",
            active_fvg_count=2,
            active_ob_count=1,
            sweeps_count=1,
            payload_json=json.dumps({"test": "ok"})
        )
        self.assertGreater(log_id, 0)

        record = db.get_latest_smc_analysis("GBPUSD", timeframe="1h")
        self.assertIsNotNone(record)
        self.assertEqual(record["symbol"], "GBPUSD")
        self.assertEqual(record["market_bias"], "BULLISH")
        self.assertEqual(record["active_fvg_count"], 2)
        self.assertEqual(record["active_ob_count"], 1)
        self.assertEqual(record["sweeps_count"], 1)

    def test_smc_db_missing_symbol(self):
        record = db.get_latest_smc_analysis("NONEXISTENT_XYZ", timeframe="1h")
        self.assertIsNone(record)

    def test_smc_db_multiple_timeframes(self):
        db.init_db()
        db.log_smc_analysis("USDJPY", "15m", 152.10, "STRONG_BEARISH", 3, 2, 2)
        db.log_smc_analysis("USDJPY", "4h", 152.80, "STRONG_BULLISH", 1, 3, 0)

        m15 = db.get_latest_smc_analysis("USDJPY", "15m")
        h4 = db.get_latest_smc_analysis("USDJPY", "4h")

        self.assertEqual(m15["market_bias"], "STRONG_BEARISH")
        self.assertEqual(h4["market_bias"], "STRONG_BULLISH")


if __name__ == "__main__":
    unittest.main()
