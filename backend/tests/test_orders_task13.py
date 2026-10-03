"""
backend/tests/test_orders_task13.py — Test Suite for Task 13 (Claude Spec)
Tests: Validation, Stop Loss, Trailing Stop, Risk-Reward, Position Sizing, Creation, Triggers, Cancellation.
"""
import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Use dedicated test database
TEST_DB = "/tmp/matrix_task13_test_orders.db"
if os.path.exists(TEST_DB):
    try:
        os.remove(TEST_DB)
    except OSError:
        pass

import core.db_conn
core.db_conn.DB_PATH = core.db_conn.Path(TEST_DB)
os.environ["MATRIX_DB_PATH"] = TEST_DB

import db
import orders
from orders import (
    Order, OrderType, OrderStatus,
    validate_order, validate_stop_loss,
    calculate_trailing_stop, create_order,
    calculate_risk_reward_ratio, calculate_position_size,
    check_order_triggers, get_user_orders, cancel_order
)


class TestOrderTask13(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        core.db_conn.DB_PATH = core.db_conn.Path(TEST_DB)
        os.environ["MATRIX_DB_PATH"] = TEST_DB
        db.init_db()

    def setUp(self):
        with db._conn() as conn:
            conn.execute("DELETE FROM orders")
            conn.commit()

    @classmethod
    def tearDownClass(cls):
        if os.path.exists(TEST_DB):
            try:
                os.remove(TEST_DB)
            except OSError:
                pass

    # 1. Validation tests
    def test_valid_order_parameters(self):
        is_valid, error = validate_order("EURUSD", OrderType.MARKET, 1.1000, 100, 1.0900, 1.1100)
        self.assertTrue(is_valid)
        self.assertEqual(error, "")

    def test_invalid_qty(self):
        is_valid, error = validate_order("EURUSD", OrderType.MARKET, 1.1000, 0, None, None)
        self.assertFalse(is_valid)
        self.assertIn("Quantity", error)

    def test_invalid_stop_loss_above_entry(self):
        is_valid, error = validate_order("EURUSD", OrderType.MARKET, 1.1000, 100, 1.1100, None)
        self.assertFalse(is_valid)
        self.assertIn("Stop loss", error)

    def test_invalid_take_profit_below_entry(self):
        is_valid, error = validate_order("EURUSD", OrderType.MARKET, 1.1000, 100, None, 1.0900)
        self.assertFalse(is_valid)
        self.assertIn("Take profit", error)

    def test_poor_risk_reward_ratio(self):
        is_valid, error = validate_order("EURUSD", OrderType.MARKET, 1.1000, 100, 1.0950, 1.1025)
        self.assertFalse(is_valid)
        self.assertIn("Risk-Reward", error)

    # 2. Stop loss validation
    def test_valid_stop_loss(self):
        is_valid, error = validate_stop_loss(1.1000, 1.0900, max_risk_pct=5.0)
        self.assertTrue(is_valid)

    def test_stop_loss_too_far(self):
        is_valid, error = validate_stop_loss(1.1000, 1.0400, max_risk_pct=5.0)
        self.assertFalse(is_valid)
        self.assertIn("5.0%", error)

    # 3. Trailing stop
    def test_trailing_stop_calculation(self):
        current = 1.1100
        entry = 1.1000
        trail_pct = 2.5
        expected = 1.1100 * (1 - 0.025)  # 1.08225
        actual = calculate_trailing_stop(current, entry, trail_pct)
        self.assertAlmostEqual(actual, expected, places=4)

    def test_trailing_stop_tracks_price(self):
        stop1 = calculate_trailing_stop(1.1100, 1.1000, 2.5)
        stop2 = calculate_trailing_stop(1.1200, 1.1000, 2.5)
        self.assertGreater(stop2, stop1)

    # 4. Risk reward
    def test_risk_reward_calculation(self):
        rr = calculate_risk_reward_ratio(1.1000, 1.0900, 1.1100)
        expected = 1.0
        self.assertAlmostEqual(rr, expected, places=2)

    def test_risk_reward_2_to_1(self):
        rr = calculate_risk_reward_ratio(1.1000, 1.0900, 1.1200)
        expected = 2.0
        self.assertAlmostEqual(rr, expected, places=2)

    # 5. Position sizing (Kelly criterion)
    def test_kelly_position_size(self):
        # Account: $10,000, Risk: 2%, Entry: 1.1000, SL: 1.0900
        size = calculate_position_size(10000, 2, 1.1000, 1.0900)
        expected = 20000
        self.assertEqual(size, expected)

    def test_position_size_respects_risk_limit(self):
        size_1pct = calculate_position_size(10000, 1, 1.1000, 1.0900)
        size_2pct = calculate_position_size(10000, 2, 1.1000, 1.0900)
        self.assertGreater(size_2pct, size_1pct)

    # 6. Order creation
    def test_create_market_order(self):
        result = create_order("user_123", "EURUSD", "market", "buy", 100, 1.1000)
        self.assertTrue(result['success'])
        self.assertIn('order_id', result)

    def test_create_order_with_sl_tp(self):
        result = create_order("user_123", "EURUSD", "limit", "buy", 100, 1.1000,
                              stop_loss=1.0900, take_profit=1.1200)
        self.assertTrue(result['success'])

    def test_create_trailing_stop_order(self):
        result = create_order("user_123", "EURUSD", "trailing_stop", "sell", 50, 1.1000,
                              trailing_stop_pct=2.5)
        self.assertTrue(result['success'])

    # 7. Order triggers
    def test_take_profit_trigger(self):
        create_order("user_123", "EURUSD", "limit", "buy", 100, 1.1000,
                     take_profit=1.1100)
        triggered = check_order_triggers("EURUSD", 1.1100)
        self.assertGreater(len(triggered), 0)
        self.assertEqual(triggered[0]['type'], 'TAKE_PROFIT')

    def test_stop_loss_trigger(self):
        create_order("user_123", "EURUSD", "limit", "buy", 100, 1.1000,
                     stop_loss=1.0900)
        triggered = check_order_triggers("EURUSD", 1.0899)
        self.assertGreater(len(triggered), 0)
        self.assertEqual(triggered[0]['type'], 'STOP_LOSS')

    # 8. Order cancellation
    def test_cancel_active_order(self):
        create_result = create_order("user_123", "EURUSD", "limit", "buy", 100, 1.1000)
        order_id = create_result['order_id']
        result = cancel_order("user_123", order_id)
        self.assertTrue(result['success'])


if __name__ == "__main__":
    unittest.main()
