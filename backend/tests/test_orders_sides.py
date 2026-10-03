"""
backend/tests/test_orders_sides.py — Test Suite for Task 3 (SELL order validation)
Tests: Side-aware validation, stop loss, take profit, trailing stop, risk-reward, order creation.
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Use dedicated test database
TEST_DB = "/tmp/matrix_task3_test.db"
if os.path.exists(TEST_DB):
    try:
        os.remove(TEST_DB)
    except OSError:
        pass

os.environ["MATRIX_DB_PATH"] = TEST_DB

import core.db_conn
core.db_conn.DB_PATH = core.db_conn.Path(TEST_DB)

import db
import orders
from orders import (
    Order, OrderType, OrderStatus, OrderSide,
    validate_order, validate_stop_loss, validate_take_profit,
    calculate_trailing_stop, create_order,
    calculate_risk_reward_ratio, check_order_triggers
)


class TestOrderSides(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        db.init_db()

    @classmethod
    def tearDownClass(cls):
        if os.path.exists(TEST_DB):
            try:
                os.remove(TEST_DB)
            except OSError:
                pass

    # 1. validate_order tests
    def test_validate_order_buy_valid(self):
        is_valid, error = validate_order("EURUSD", OrderType.MARKET, 1.1000, 100, 1.0900, 1.1100, "buy")
        self.assertTrue(is_valid)
        self.assertEqual(error, "")

    def test_validate_order_sell_valid(self):
        is_valid, error = validate_order("EURUSD", OrderType.MARKET, 1.1000, 100, 1.1100, 1.0900, "sell")
        self.assertTrue(is_valid)
        self.assertEqual(error, "")

    def test_validate_order_buy_invalid_sl_above(self):
        is_valid, error = validate_order("EURUSD", OrderType.MARKET, 1.1000, 100, 1.1100, 1.1200, "buy")
        self.assertFalse(is_valid)
        self.assertIn("Stop loss", error)

    def test_validate_order_sell_invalid_sl_below(self):
        is_valid, error = validate_order("EURUSD", OrderType.MARKET, 1.1000, 100, 1.0900, 1.0800, "sell")
        self.assertFalse(is_valid)
        self.assertIn("Stop loss", error)

    def test_validate_order_buy_invalid_tp_below(self):
        is_valid, error = validate_order("EURUSD", OrderType.MARKET, 1.1000, 100, 1.0900, 1.0900, "buy")
        self.assertFalse(is_valid)
        self.assertIn("Take profit", error)

    def test_validate_order_sell_invalid_tp_above(self):
        is_valid, error = validate_order("EURUSD", OrderType.MARKET, 1.1000, 100, 1.1100, 1.1100, "sell")
        self.assertFalse(is_valid)
        self.assertIn("Take profit", error)

    def test_validate_order_sell_invalid_tp_zero(self):
        is_valid, error = validate_order("EURUSD", OrderType.MARKET, 1.1000, 100, 1.1100, 0.0, "sell")
        self.assertFalse(is_valid)
        self.assertIn("Take profit", error)

    def test_validate_order_invalid_side(self):
        is_valid, error = validate_order("EURUSD", OrderType.MARKET, 1.1000, 100, 1.0900, 1.1100, "invalid")
        self.assertFalse(is_valid)
        self.assertIn("Invalid side", error)

    def test_validate_order_case_insensitive_side_buy(self):
        is_valid, error = validate_order("EURUSD", OrderType.MARKET, 1.1000, 100, 1.0900, 1.1100, "BUY")
        self.assertTrue(is_valid)

    def test_validate_order_case_insensitive_side_sell(self):
        is_valid, error = validate_order("EURUSD", OrderType.MARKET, 1.1000, 100, 1.1100, 1.0900, "SELL")
        self.assertTrue(is_valid)

    def test_validate_order_enum_side_sell(self):
        is_valid, error = validate_order("EURUSD", OrderType.MARKET, 1.1000, 100, 1.1100, 1.0900, OrderSide.SELL)
        self.assertTrue(is_valid)

    # 2. validate_stop_loss tests
    def test_validate_stop_loss_buy_valid(self):
        is_valid, error = validate_stop_loss(1.1000, 1.0900, max_risk_pct=5.0, side="buy")
        self.assertTrue(is_valid)

    def test_validate_stop_loss_sell_valid(self):
        is_valid, error = validate_stop_loss(1.1000, 1.1100, max_risk_pct=5.0, side="sell")
        self.assertTrue(is_valid)

    def test_validate_stop_loss_buy_invalid(self):
        is_valid, error = validate_stop_loss(1.1000, 1.1100, max_risk_pct=5.0, side="buy")
        self.assertFalse(is_valid)
        self.assertIn("Stop loss must be below", error)

    def test_validate_stop_loss_sell_invalid(self):
        is_valid, error = validate_stop_loss(1.1000, 1.0900, max_risk_pct=5.0, side="sell")
        self.assertFalse(is_valid)
        self.assertIn("Stop loss must be above", error)

    def test_validate_stop_loss_case_insensitive_side(self):
        is_valid, error = validate_stop_loss(1.1000, 1.1100, max_risk_pct=5.0, side="SELL")
        self.assertTrue(is_valid)

    # 3. validate_take_profit tests
    def test_validate_take_profit_buy_valid(self):
        self.assertTrue(validate_take_profit("buy", 1.1000, 1.1100))

    def test_validate_take_profit_buy_invalid(self):
        self.assertFalse(validate_take_profit("buy", 1.1000, 1.0900))

    def test_validate_take_profit_sell_valid(self):
        self.assertTrue(validate_take_profit("sell", 1.1000, 1.0900))

    def test_validate_take_profit_sell_invalid_above(self):
        self.assertFalse(validate_take_profit("sell", 1.1000, 1.1100))

    def test_validate_take_profit_sell_invalid_zero(self):
        self.assertFalse(validate_take_profit("sell", 1.1000, 0.0))

    def test_validate_take_profit_invalid_side(self):
        self.assertFalse(validate_take_profit("invalid", 1.1000, 1.1100))

    # 4. calculate_trailing_stop tests
    def test_calculate_trailing_stop_buy(self):
        stop_price = calculate_trailing_stop(1.1100, 1.1000, 2.5, "buy")
        expected = 1.1100 * (1 - 0.025)  # 1.08225
        self.assertAlmostEqual(stop_price, expected, places=4)

    def test_calculate_trailing_stop_sell(self):
        stop_price = calculate_trailing_stop(1.0900, 1.1000, 2.5, "sell")
        expected = 1.0900 * (1 + 0.025)  # 1.11725
        self.assertAlmostEqual(stop_price, expected, places=4)

    def test_calculate_trailing_stop_case_insensitive(self):
        stop_price = calculate_trailing_stop(1.0900, 1.1000, 2.5, "SELL")
        expected = 1.0900 * (1 + 0.025)  # 1.11725
        self.assertAlmostEqual(stop_price, expected, places=4)

    # 5. calculate_risk_reward_ratio tests
    def test_calculate_risk_reward_ratio_buy(self):
        rr = calculate_risk_reward_ratio(1.1000, 1.0900, 1.1200, "buy")
        expected = 2.0  # (1.1200 - 1.1000) / (1.1000 - 1.0900) = 0.02 / 0.01 = 2.0
        self.assertAlmostEqual(rr, expected, places=2)

    def test_calculate_risk_reward_ratio_sell(self):
        rr = calculate_risk_reward_ratio(1.1000, 1.1100, 1.0800, "sell")
        expected = 2.0  # (1.1000 - 1.0800) / (1.1100 - 1.1000) = 0.02 / 0.01 = 2.0
        self.assertAlmostEqual(rr, expected, places=2)

    def test_calculate_risk_reward_ratio_buy_poor(self):
        rr = calculate_risk_reward_ratio(1.1000, 1.0900, 1.1025, "buy")
        expected = 0.25  # (1.1025 - 1.1000) / (1.1000 - 1.0900) = 0.0025 / 0.01 = 0.25
        self.assertAlmostEqual(rr, expected, places=2)

    def test_calculate_risk_reward_ratio_sell_poor(self):
        rr = calculate_risk_reward_ratio(1.1000, 1.1100, 1.0975, "sell")
        expected = 0.25  # (1.1000 - 1.0975) / (1.1100 - 1.1000) = 0.0025 / 0.01 = 0.25
        self.assertAlmostEqual(rr, expected, places=2)

    def test_calculate_risk_reward_ratio_buy_invalid_sl(self):
        rr = calculate_risk_reward_ratio(1.1000, 1.1100, 1.1200, "buy")
        self.assertEqual(rr, 0.0)

    def test_calculate_risk_reward_ratio_sell_invalid_sl(self):
        rr = calculate_risk_reward_ratio(1.1000, 1.0900, 1.0800, "sell")
        self.assertEqual(rr, 0.0)

    # 6. create_order tests
    def test_create_order_buy_with_sl_tp(self):
        result = create_order("user_123", "EURUSD", "market", "buy", 100, 1.1000,
                              stop_loss=1.0900, take_profit=1.1200)
        self.assertTrue(result['success'])

    def test_create_order_sell_with_sl_tp(self):
        result = create_order("user_123", "EURUSD", "market", "sell", 100, 1.1000,
                              stop_loss=1.1100, take_profit=1.0900)
        self.assertTrue(result['success'])

    def test_create_order_sell_case_insensitive(self):
        result = create_order("user_123", "EURUSD", "market", "SELL", 100, 1.1000,
                              stop_loss=1.1100, take_profit=1.0900)
        self.assertTrue(result['success'])

    def test_create_order_sell_enum(self):
        result = create_order("user_123", "EURUSD", "market", OrderSide.SELL, 100, 1.1000,
                              stop_loss=1.1100, take_profit=1.0900)
        self.assertTrue(result['success'])

    # 7. check_order_triggers tests
    def test_check_order_triggers_sell_sl_hit(self):
        # Create a sell order with stop loss above entry
        result = create_order("user_123", "EURUSD", "market", "sell", 100, 1.1000,
                              stop_loss=1.1100)
        self.assertTrue(result['success'])
        order_id = result['order_id']

        # Price goes above stop loss - should trigger
        triggered = check_order_triggers("EURUSD", 1.1150)
        self.assertEqual(len(triggered), 1)
        self.assertEqual(triggered[0]['type'], 'STOP_LOSS')
        self.assertEqual(triggered[0]['order_id'], order_id)

        # Check that order status was updated
        with db.get_db() as c:
            order = c.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
            self.assertEqual(order['status'], OrderStatus.FILLED.value)

    def test_check_order_triggers_sell_tp_hit(self):
        # Create a sell order with take profit below entry
        result = create_order("user_123", "EURUSD", "market", "sell", 100, 1.1000,
                              take_profit=1.0900)
        self.assertTrue(result['success'])
        order_id = result['order_id']

        # Price goes below take profit - should trigger
        triggered = check_order_triggers("EURUSD", 1.0850)
        self.assertEqual(len(triggered), 1)
        self.assertEqual(triggered[0]['type'], 'TAKE_PROFIT')
        self.assertEqual(triggered[0]['order_id'], order_id)

    def test_check_order_triggers_sell_tp_not_hit(self):
        # Create a sell order with take profit below entry
        result = create_order("user_123", "EURUSD", "market", "sell", 100, 1.1000,
                              take_profit=1.0900)
        self.assertTrue(result['success'])

        # Price is above take profit - should NOT trigger
        triggered = check_order_triggers("EURUSD", 1.0950)
        self.assertEqual(len(triggered), 0)


if __name__ == "__main__":
    unittest.main()