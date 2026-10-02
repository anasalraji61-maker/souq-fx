"""
Unit and Integration Tests for Task 24: News Impact & High-Volatility Pre-Alert Engine
Tested via standard python unittest module.
"""

import unittest
import json
from datetime import datetime, timezone, timedelta

from backend.news_impact_engine import (
    score_event_risk,
    get_affected_pairs,
    evaluate_event_alert,
    scan_upcoming_volatility,
    VolatilityPreAlert
)
import backend.db as db


class TestNewsImpactMath(unittest.TestCase):
    def test_score_event_risk_keywords(self):
        self.assertGreaterEqual(score_event_risk("US Non-Farm Payrolls", "HIGH"), 95.0)
        self.assertGreaterEqual(score_event_risk("FOMC Rate Decision", "HIGH"), 95.0)
        self.assertGreaterEqual(score_event_risk("CPI Inflation Rate YoY", "HIGH"), 90.0)
        self.assertEqual(score_event_risk("Standard Economic Release", "LOW"), 20.0)

    def test_get_affected_pairs(self):
        usd_pairs = get_affected_pairs("USD")
        self.assertIn("EURUSD", usd_pairs)
        self.assertIn("GBPUSD", usd_pairs)
        self.assertIn("USDJPY", usd_pairs)

        eur_pairs = get_affected_pairs("EUR")
        self.assertIn("EURUSD", eur_pairs)
        self.assertIn("EURGBP", eur_pairs)

    def test_evaluate_event_alert_guard_active(self):
        now = datetime.now(timezone.utc)
        event = {
            "title": "Federal Reserve FOMC Rate Decision",
            "currency": "USD",
            "impact": "HIGH",
            "scheduled_time": (now + timedelta(minutes=15)).isoformat()
        }
        alert = evaluate_event_alert(event, current_time=now)
        self.assertTrue(alert.guard_mode_active)
        self.assertEqual(alert.advisory, "WIDEN_SL")
        self.assertIn("EURUSD", alert.affected_pairs)

    def test_evaluate_event_alert_freeze_orders(self):
        now = datetime.now(timezone.utc)
        event = {
            "title": "US Non-Farm Employment Change (NFP)",
            "currency": "USD",
            "impact": "HIGH",
            "scheduled_time": (now + timedelta(minutes=5)).isoformat()
        }
        alert = evaluate_event_alert(event, current_time=now)
        self.assertTrue(alert.guard_mode_active)
        self.assertEqual(alert.advisory, "FREEZE_ORDERS")

    def test_evaluate_event_alert_far_future(self):
        now = datetime.now(timezone.utc)
        event = {
            "title": "US CPI",
            "currency": "USD",
            "impact": "HIGH",
            "scheduled_time": (now + timedelta(minutes=90)).isoformat()
        }
        alert = evaluate_event_alert(event, current_time=now)
        self.assertFalse(alert.guard_mode_active)
        self.assertEqual(alert.advisory, "NORMAL")

    def test_scan_upcoming_volatility_fallback(self):
        res = scan_upcoming_volatility([])
        self.assertIn(res["status"], ["GUARD_ACTIVE", "NORMAL"])
        self.assertGreater(len(res["alerts"]), 0)


class TestNewsImpactDatabase(unittest.TestCase):
    def test_news_impact_db_logging_and_query(self):
        db.init_db()
        log_id = db.log_volatility_alert(
            event_id="usd_fomc_test",
            event_title="FOMC Interest Rate Decision",
            currency="USD",
            impact_level="HIGH",
            scheduled_time="2026-10-02T18:00:00Z",
            minutes_remaining=25,
            risk_score=98.0,
            guard_mode_active=True,
            advisory="WIDEN_SL",
            affected_pairs_json=json.dumps(["EURUSD", "GBPUSD"])
        )
        self.assertGreater(log_id, 0)

        alerts = db.get_active_volatility_alerts(currency="USD", limit=5)
        self.assertGreaterEqual(len(alerts), 1)
        a = alerts[0]
        self.assertEqual(a["event_id"], "usd_fomc_test")
        self.assertEqual(a["currency"], "USD")
        self.assertTrue(a["guard_mode_active"])
        self.assertEqual(a["advisory"], "WIDEN_SL")

    def test_news_impact_db_empty_filter(self):
        alerts = db.get_active_volatility_alerts(currency="XYZ_NONE")
        self.assertEqual(alerts, [])


if __name__ == "__main__":
    unittest.main()
