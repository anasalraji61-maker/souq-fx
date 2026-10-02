"""
backend/tests/test_positions_task14.py — Test Suite for Task 14 (Claude Haiku Spec)
18 Tests covering Position Lifecycle, Real-Time P&L Tracking, Margin, Pyramiding, and Liquidation.
"""
import os
import sys
import unittest
from datetime import datetime

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Use dedicated test database
TEST_DB = "/tmp/matrix_task14_test.db"
if os.path.exists(TEST_DB):
    try:
        os.remove(TEST_DB)
    except OSError:
        pass

os.environ["MATRIX_DB_PATH"] = TEST_DB

import core.db_conn
core.db_conn.DB_PATH = core.db_conn.Path(TEST_DB)

import db
import positions
from positions import (
    Position, PositionStatus,
    create_position, get_open_positions, get_position_history,
    close_position, add_to_position, calculate_account_stats,
    calculate_margin_requirements, check_liquidation_triggers
)


class BasePositionTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        db.init_db()


class TestPositionCreation(BasePositionTest):
    def test_create_long_position(self):
        result = create_position(
            user_id="user_123",
            symbol="EURUSD",
            side="long",
            qty=100,
            entry_price=1.1000,
            entry_order_id="order_123"
        )
        self.assertTrue(result['success'])
        self.assertIn('position_id', result)

    def test_create_short_position(self):
        result = create_position(
            user_id="user_123",
            symbol="GBPUSD",
            side="short",
            qty=50,
            entry_price=1.2500,
            entry_order_id="order_124"
        )
        self.assertTrue(result['success'])

    def test_invalid_qty(self):
        result = create_position(
            user_id="user_123",
            symbol="EURUSD",
            side="long",
            qty=0,
            entry_price=1.1000,
            entry_order_id="order_125"
        )
        self.assertFalse(result['success'])


class TestPnLCalculation(BasePositionTest):
    def test_long_position_profit(self):
        pos = Position(
            id="pos_1",
            user_id="user_1",
            symbol="EURUSD",
            side="long",
            qty=100,
            avg_entry_price=1.1000,
            open_time=datetime.now()
        )
        unrealized = pos.unrealized_pnl(1.1100)
        self.assertEqual(unrealized, 1000)

    def test_long_position_loss(self):
        pos = Position(
            id="pos_1",
            user_id="user_1",
            symbol="EURUSD",
            side="long",
            qty=100,
            avg_entry_price=1.1000,
            open_time=datetime.now()
        )
        unrealized = pos.unrealized_pnl(1.0900)
        self.assertEqual(unrealized, -1000)

    def test_short_position_profit(self):
        pos = Position(
            id="pos_1",
            user_id="user_1",
            symbol="EURUSD",
            side="short",
            qty=100,
            avg_entry_price=1.1000,
            open_time=datetime.now()
        )
        unrealized = pos.unrealized_pnl(1.0900)
        self.assertEqual(unrealized, 1000)

    def test_short_position_loss(self):
        pos = Position(
            id="pos_2",
            user_id="user_1",
            symbol="EURUSD",
            side="short",
            qty=100,
            avg_entry_price=1.1000,
            open_time=datetime.now()
        )
        unrealized = pos.unrealized_pnl(1.1100)
        self.assertEqual(unrealized, -1000)

    def test_unrealized_pnl_pct(self):
        pos = Position(
            id="pos_3",
            user_id="user_1",
            symbol="EURUSD",
            side="long",
            qty=100,
            avg_entry_price=1.1000,
            open_time=datetime.now()
        )
        pct = pos.unrealized_pnl_pct(1.1100)
        self.assertGreater(pct, 0.9)

    def test_position_to_dict(self):
        pos = Position(
            id="pos_4",
            user_id="user_1",
            symbol="EURUSD",
            side="long",
            qty=100,
            avg_entry_price=1.1000,
            open_time=datetime.now()
        )
        d = pos.to_dict()
        self.assertEqual(d['symbol'], 'EURUSD')
        self.assertEqual(d['status'], 'open')


class TestClosePosition(BasePositionTest):
    def test_close_position_with_profit(self):
        create_result = create_position(
            user_id="user_123",
            symbol="EURUSD",
            side="long",
            qty=100,
            entry_price=1.1000,
            entry_order_id="order_126"
        )
        self.assertTrue(create_result['success'])
        pos_id = create_result['position_id']

        close_result = close_position(
            user_id="user_123",
            position_id=pos_id,
            close_price=1.1100,
            close_reason="manual"
        )

        self.assertTrue(close_result['success'])
        self.assertEqual(close_result['realized_pnl'], 1000)

    def test_close_position_with_loss(self):
        create_result = create_position(
            user_id="user_123",
            symbol="EURUSD",
            side="long",
            qty=100,
            entry_price=1.1000,
            entry_order_id="order_127"
        )
        self.assertTrue(create_result['success'])
        pos_id = create_result['position_id']

        close_result = close_position(
            user_id="user_123",
            position_id=pos_id,
            close_price=1.0900,
            close_reason="stop_loss"
        )

        self.assertTrue(close_result['success'])
        self.assertEqual(close_result['realized_pnl'], -1000)

    def test_close_nonexistent_position(self):
        close_result = close_position(
            user_id="user_123",
            position_id="non_existent_id",
            close_price=1.1000
        )
        self.assertFalse(close_result['success'])


class TestAddToPosition(BasePositionTest):
    def test_add_to_long_position(self):
        create_result = create_position(
            user_id="user_123",
            symbol="EURUSD",
            side="long",
            qty=100,
            entry_price=1.1000,
            entry_order_id="order_128"
        )
        self.assertTrue(create_result['success'])
        pos_id = create_result['position_id']

        add_result = add_to_position(
            user_id="user_123",
            position_id=pos_id,
            qty=50,
            entry_price=1.1100
        )

        self.assertTrue(add_result['success'])
        self.assertEqual(add_result['new_qty'], 150)
        self.assertAlmostEqual(add_result['new_avg_price'], 1.1033, places=3)

    def test_add_invalid_qty(self):
        create_result = create_position(
            user_id="user_123",
            symbol="EURUSD",
            side="long",
            qty=100,
            entry_price=1.1000,
            entry_order_id="order_129"
        )
        pos_id = create_result['position_id']
        add_result = add_to_position("user_123", pos_id, 0, 1.1100)
        self.assertFalse(add_result['success'])


class TestAccountStats(BasePositionTest):
    def test_calculate_account_stats(self):
        create_position("user_123", "EURUSD", "long", 100, 1.1000, "o1")
        create_position("user_123", "GBPUSD", "short", 50, 1.2500, "o2")

        current_prices = {"EURUSD": 1.1100, "GBPUSD": 1.2400}
        stats = calculate_account_stats("user_123", current_prices)

        self.assertGreaterEqual(stats['open_positions'], 2)
        self.assertGreater(stats['total_open_pnl'], 0)

    def test_empty_account_stats(self):
        stats = calculate_account_stats("empty_user", {"EURUSD": 1.1000})
        self.assertEqual(stats['open_positions'], 0)
        self.assertEqual(stats['total_open_pnl'], 0)


class TestMarginCalculation(BasePositionTest):
    def test_margin_requirements(self):
        positions_list = [
            {'id': 'pos_1', 'symbol': 'EURUSD', 'qty': 100, 'avg_entry_price': 1.1000},
            {'id': 'pos_2', 'symbol': 'GBPUSD', 'qty': 50, 'avg_entry_price': 1.2500}
        ]
        symbol_margins = {'EURUSD': 0.02, 'GBPUSD': 0.03}

        result = calculate_margin_requirements(positions_list, symbol_margins)
        self.assertEqual(result['total_margin_required'], 4075)


class TestLiquidationCheck(BasePositionTest):
    def test_liquidation_trigger(self):
        create_position("user_123", "EURUSD", "long", 1000, 1.1000, "o1")
        current_prices = {"EURUSD": 1.0615}  # 38.5% loss
        triggered = check_liquidation_triggers("user_123", 100000, current_prices)

        self.assertGreater(len(triggered), 0)
        self.assertEqual(triggered[0]['action'], 'close_at_market')

    def test_no_liquidation_when_healthy(self):
        create_position("healthy_user", "EURUSD", "long", 10, 1.1000, "o1")
        current_prices = {"EURUSD": 1.1050}
        triggered = check_liquidation_triggers("healthy_user", 10000, current_prices)
        self.assertEqual(len(triggered), 0)


if __name__ == "__main__":
    unittest.main()
