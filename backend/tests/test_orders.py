"""
Unit tests for MATRIX Advanced Order Types & Risk Management (Task 13)
Tests: Market, Limit, Stop, Trailing Stop, OCO, and Risk-Reward math.
Uses standard Python unittest for zero-dependency execution.
"""

import os
import sys
import unittest

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

TEST_DB = "/tmp/matrix_test_orders.db"
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
from orders import OrderType, OrderSide, OrderStatus


class TestAdvancedOrders(unittest.TestCase):
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

    def test_validate_stop_loss_buy(self):
        """وقف الخسارة للشراء يجب أن يكون أقل من سعر الدخول وأكبر من 0."""
        self.assertTrue(orders.validate_stop_loss("buy", 1.1000, 1.0950))
        self.assertFalse(orders.validate_stop_loss("buy", 1.1000, 1.1050))
        self.assertFalse(orders.validate_stop_loss("buy", 1.1000, 0.0))
        self.assertFalse(orders.validate_stop_loss("buy", 1.1000, -1.0))

    def test_validate_stop_loss_sell(self):
        """وقف الخسارة للبيع يجب أن يكون أعلى من سعر الدخول."""
        self.assertTrue(orders.validate_stop_loss("sell", 1.1000, 1.1050))
        self.assertFalse(orders.validate_stop_loss("sell", 1.1000, 1.0950))
        self.assertFalse(orders.validate_stop_loss("sell", 1.1000, -1.1050))

    def test_validate_take_profit_buy(self):
        """الهدف للشراء يجب أن يكون أعلى من سعر الدخول."""
        self.assertTrue(orders.validate_take_profit("buy", 1.1000, 1.1100))
        self.assertFalse(orders.validate_take_profit("buy", 1.1000, 1.0900))

    def test_validate_take_profit_sell(self):
        """الهدف للبيع يجب أن يكون أقل من سعر الدخول وأكبر من 0."""
        self.assertTrue(orders.validate_take_profit("sell", 1.1000, 1.0900))
        self.assertFalse(orders.validate_take_profit("sell", 1.1000, 1.1100))
        self.assertFalse(orders.validate_take_profit("sell", 1.1000, 0.0))

    def test_calculate_risk_reward_math(self):
        """فحص معادلة نسبة العائد للمخاطرة ومعدل التعادل."""
        # Entry 100, SL 90 (Risk 10), TP 130 (Reward 30) -> Ratio 1:3, Breakeven 25%
        rr = orders.calculate_risk_reward(100.0, 90.0, 130.0, "buy")
        self.assertTrue(rr["valid"])
        self.assertEqual(rr["ratio"], 3.0)
        self.assertEqual(rr["ratio_str"], "1:3.00")
        self.assertEqual(rr["risk_distance"], 10.0)
        self.assertEqual(rr["reward_distance"], 30.0)
        self.assertEqual(rr["breakeven_winrate"], 25.0)

    def test_calculate_trailing_stop_buy(self):
        """تتبع القمة ورفع الوقف للأعلى عند صعود السعر في الشراء."""
        res1 = orders.calculate_trailing_stop(current_price=105.0, extreme_price=100.0, trail_pct=2.0, side="buy")
        self.assertEqual(res1["extreme_price"], 105.0)
        self.assertEqual(res1["trailing_stop_price"], round(105.0 * 0.98, 5))

        # إذا هبط السعر، القمة لا تنزل والوقف لا ينزل
        res2 = orders.calculate_trailing_stop(current_price=103.0, extreme_price=105.0, trail_pct=2.0, side="buy")
        self.assertEqual(res2["extreme_price"], 105.0)
        self.assertEqual(res2["trailing_stop_price"], round(105.0 * 0.98, 5))

    def test_calculate_trailing_stop_sell(self):
        """تتبع القاع وخفض الوقف للأسفل عند هبوط السعر في البيع."""
        res1 = orders.calculate_trailing_stop(current_price=95.0, extreme_price=100.0, trail_pct=2.0, side="sell")
        self.assertEqual(res1["extreme_price"], 95.0)
        self.assertEqual(res1["trailing_stop_price"], round(95.0 * 1.02, 5))

    def test_create_order_persistence(self):
        """إنشاء وحفظ أمر في قاعدة البيانات واسترجاعه."""
        order = orders.create_order(
            symbol="EURUSD",
            side="buy",
            order_type="limit",
            price=1.0850,
            qty=2.5,
            stop_loss=1.0800,
            take_profit=1.0950,
            note="Key support test",
        )
        self.assertTrue(order["id"].startswith("ord_"))
        self.assertEqual(order["symbol"], "EURUSD")
        self.assertEqual(order["side"], "buy")
        self.assertEqual(order["order_type"], "limit")
        self.assertEqual(order["price"], 1.0850)
        self.assertEqual(order["qty"], 2.5)
        self.assertEqual(order["status"], "pending")

    def test_cancel_order(self):
        """إلغاء أمر معلق وتحديث حالته."""
        order = orders.create_order(
            symbol="GBPUSD",
            side="sell",
            order_type="limit",
            price=1.3000,
        )
        oid = order["id"]
        success = orders.cancel_order(oid)
        self.assertTrue(success)

        fetched = db.get_order(oid)
        self.assertEqual(fetched["status"], "cancelled")

    def test_buy_limit_trigger(self):
        """أمر الشراء بالحد يتفعل عندما يهبط السعر إلى أو تحت سعر الأمر."""
        order = orders.create_order(
            symbol="USDJPY",
            side="buy",
            order_type="limit",
            price=150.00,
        )
        # Market still higher: no trigger
        events1 = orders.check_order_triggers({"USDJPY": 150.50})
        self.assertEqual(len(events1), 0)

        # Market drops to limit: triggers!
        events2 = orders.check_order_triggers({"USDJPY": 149.95})
        self.assertEqual(len(events2), 1)
        self.assertEqual(events2[0]["order_id"], order["id"])
        self.assertEqual(events2[0]["order_type"], "limit")

        fetched = db.get_order(order["id"])
        self.assertEqual(fetched["status"], "filled")

    def test_oco_cancellation(self):
        """تفعيل أحد أوامر OCO يلغي الطرف الآخر تلقائياً."""
        oco_id = "oco_breakout_123"
        
        # 1. Buy Stop above resistance
        ord_buy = orders.create_order(
            symbol="XAUUSD",
            side="buy",
            order_type="stop",
            price=2650.00,
            is_oco_group=oco_id,
        )
        # 2. Sell Stop below support
        ord_sell = orders.create_order(
            symbol="XAUUSD",
            side="sell",
            order_type="stop",
            price=2620.00,
            is_oco_group=oco_id,
        )

        # Gold spikes up to 2655 (Buy Stop triggered)
        events = orders.check_order_triggers({"XAUUSD": 2655.00})
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["order_id"], ord_buy["id"])
        self.assertIn(ord_sell["id"], events[0]["oco_cancelled"])

        # Check database statuses
        buy_db = db.get_order(ord_buy["id"])
        sell_db = db.get_order(ord_sell["id"])
        self.assertEqual(buy_db["status"], "filled")
        self.assertEqual(sell_db["status"], "cancelled")

    def test_trailing_stop_reversal_trigger(self):
        """الأمر المتحرك يحدث وقفه للأعلى ثم يضرب الوقف عند الانعكاس."""
        ord_trail = orders.create_order(
            symbol="EURUSD",
            side="buy",
            order_type="trailing_stop",
            price=1.1000,
            trailing_stop_pct=1.0,  # 1% trail
        )
        oid = ord_trail["id"]

        # Price moves up from 1.1000 to 1.1200
        # Stop loss should ratchet up to 1.1200 * 0.99 = 1.1088
        orders.check_order_triggers({"EURUSD": 1.1200})
        updated = db.get_order(oid)
        self.assertEqual(updated["highest_price"], 1.1200)
        self.assertEqual(updated["stop_loss_price"], round(1.1200 * 0.99, 5))

        # Now price crashes to 1.1050 (below 1.1088) -> Triggers stop loss!
        events = orders.check_order_triggers({"EURUSD": 1.1050})
        self.assertEqual(len(events), 1)
        self.assertEqual(events[0]["order_id"], oid)
        self.assertIn("Trailing Stop hit", events[0]["reason"])


if __name__ == "__main__":
    unittest.main()
