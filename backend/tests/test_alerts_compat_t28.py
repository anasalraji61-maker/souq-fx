"""T28: frontend-shaped compat routes for alerts.

Tests for ``backend/alerts_compat.py`` (pure mappers) and the
``GET /api/alerts-compat`` / ``POST /api/alerts-compat`` routes.
"""
from __future__ import annotations

import math
import pytest
from fastapi.testclient import TestClient

import db
import main
from core import db_conn
from alerts_compat import from_frontend, to_frontend

_ALERTS = [
    {
        "id": "alert-1",
        "symbol": "EURUSD",
        "targetPrice": 1.0900,
        "condition": "crosses_up",
        "note": "اختراق المقاومة 1.0900",
        "active": True,
        "triggered": False,
        "createdAt": "2024-01-01T00:00:00+00:00",
    },
    {
        "id": "alert-2",
        "symbol": "XAUUSD",
        "targetPrice": 2750.0,
        "condition": "greater_than",
        "note": "الذهب فوق 2750$",
        "active": True,
        "triggered": False,
        "createdAt": "2024-01-02T00:00:00+00:00",
    },
]

_DEVICE = {"X-Install-Id": "install-t28-device-0001"}
_DEVICE2 = {"X-Install-Id": "install-t28-device-0002"}


@pytest.fixture()
def client(tmp_path, monkeypatch):
    path = tmp_path / "test_alerts_compat_t28.db"
    assert "souq-fx" not in str(path), f"قاعدة الاختبار يجب أن تكون خارج المستودع: {path}"
    monkeypatch.setattr(db_conn, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    monkeypatch.setattr(db, "_PBKDF2_ITERATIONS", 1_000)
    db.init_db()
    return TestClient(main.app, raise_server_exceptions=False)


# ---------------------------------------------------------------------------
# Pure mapper tests
# ---------------------------------------------------------------------------

class TestToFrontend:
    def test_above_maps_to_greater_than(self):
        alert = {"id": "a1", "symbol": "EURUSD", "price": 1.1, "condition": "above",
                 "note": "x", "active": True, "triggered": False, "ts": "t1"}
        fe = to_frontend(alert)
        assert fe["condition"] == "greater_than"

    def test_below_maps_to_less_than(self):
        alert = {"id": "a1", "symbol": "EURUSD", "price": 1.1, "condition": "below",
                 "note": "x", "active": True, "triggered": False, "ts": "t1"}
        fe = to_frontend(alert)
        assert fe["condition"] == "less_than"

    def test_price_maps_to_target_price(self):
        alert = {"id": "a1", "symbol": "EURUSD", "price": 2750.0, "condition": "above",
                 "note": "x", "active": True, "triggered": False, "ts": "t1"}
        fe = to_frontend(alert)
        assert fe["targetPrice"] == 2750.0
        assert "price" not in fe  # not renamed, just mapped

    def test_ts_maps_to_created_at(self):
        alert = {"id": "a1", "symbol": "EURUSD", "price": 1.0, "condition": "above",
                 "note": "x", "active": True, "triggered": False, "ts": "2024-01-01T00:00:00Z"}
        fe = to_frontend(alert)
        assert fe["createdAt"] == "2024-01-01T00:00:00Z"

    def test_missing_note_defaults_to_empty(self):
        alert = {"id": "a1", "symbol": "EURUSD", "price": 1.0, "condition": "above",
                 "active": True, "triggered": False, "ts": "t1"}
        fe = to_frontend(alert)
        assert fe["note"] == ""

    def test_triggered_at_copied_when_present(self):
        alert = {"id": "a1", "symbol": "EURUSD", "price": 1.0, "condition": "above",
                 "note": "", "active": True, "triggered": True, "ts": "t1",
                 "triggered_at": "2024-01-03T00:00:00Z"}
        fe = to_frontend(alert)
        assert fe["triggeredAt"] == "2024-01-03T00:00:00Z"

    def test_triggered_at_copied_when_triggeredAt_key(self):
        alert = {"id": "a1", "symbol": "EURUSD", "price": 1.0, "condition": "above",
                 "note": "", "active": True, "triggered": True, "ts": "t1",
                 "triggeredAt": "2024-01-03T00:00:00Z"}
        fe = to_frontend(alert)
        assert fe["triggeredAt"] == "2024-01-03T00:00:00Z"

    def test_triggered_at_absent_when_no_key(self):
        alert = {"id": "a1", "symbol": "EURUSD", "price": 1.0, "condition": "above",
                 "note": "", "active": True, "triggered": False, "ts": "t1"}
        fe = to_frontend(alert)
        assert "triggeredAt" not in fe


class TestFromFrontend:
    def test_greater_than_maps_to_above(self):
        mapped = from_frontend({"id": "a", "symbol": "EURUSD", "targetPrice": 1.1,
                                "condition": "greater_than", "note": "", "active": True, "triggered": False})
        assert mapped == {"symbol": "EURUSD", "condition": "above", "price": 1.1, "note": ""}

    def test_less_than_maps_to_below(self):
        mapped = from_frontend({"id": "a", "symbol": "EURUSD", "targetPrice": 1.1,
                                "condition": "less_than", "note": "", "active": True, "triggered": False})
        assert mapped == {"symbol": "EURUSD", "condition": "below", "price": 1.1, "note": ""}

    def test_crosses_up_maps_to_above(self):
        mapped = from_frontend({"id": "a", "symbol": "EURUSD", "targetPrice": 1.1,
                                "condition": "crosses_up", "note": "", "active": True, "triggered": False})
        assert mapped["condition"] == "above"

    def test_crosses_down_maps_to_below(self):
        mapped = from_frontend({"id": "a", "symbol": "EURUSD", "targetPrice": 1.1,
                                "condition": "crosses_down", "note": "", "active": True, "triggered": False})
        assert mapped["condition"] == "below"

    def test_crosses_maps_to_above(self):
        mapped = from_frontend({"id": "a", "symbol": "EURUSD", "targetPrice": 1.1,
                                "condition": "crosses", "note": "", "active": True, "triggered": False})
        assert mapped["condition"] == "above"

    def test_target_price_zero_returns_none(self):
        assert from_frontend({"id": "a", "symbol": "EURUSD", "targetPrice": 0,
                              "condition": "greater_than", "note": "", "active": True, "triggered": False}) is None

    def test_target_price_negative_returns_none(self):
        assert from_frontend({"id": "a", "symbol": "EURUSD", "targetPrice": -1,
                              "condition": "greater_than", "note": "", "active": True, "triggered": False}) is None

    def test_target_price_nan_returns_none(self):
        assert from_frontend({"id": "a", "symbol": "EURUSD", "targetPrice": math.nan,
                              "condition": "greater_than", "note": "", "active": True, "triggered": False}) is None

    def test_target_price_string_returns_none(self):
        assert from_frontend({"id": "a", "symbol": "EURUSD", "targetPrice": "x",
                              "condition": "greater_than", "note": "", "active": True, "triggered": False}) is None

    def test_unknown_condition_returns_none(self):
        assert from_frontend({"id": "a", "symbol": "EURUSD", "targetPrice": 1.1,
                              "condition": "weird", "note": "", "active": True, "triggered": False}) is None


# ---------------------------------------------------------------------------
# Route tests
# ---------------------------------------------------------------------------

class TestRoutes:
    def test_get_empty_returns_list(self, client):
        res = client.get("/api/alerts-compat", headers=_DEVICE)
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert data == []

    def test_post_then_get(self, client):
        res = client.post("/api/alerts-compat", json=_ALERTS, headers=_DEVICE)
        assert res.status_code == 200
        body = res.json()
        assert body["ok"] is True
        assert body["created"] == 2

        res = client.get("/api/alerts-compat", headers=_DEVICE)
        data = res.json()
        assert isinstance(data, list)
        assert len(data) == 2

        # All required keys present.
        keys = {"id", "symbol", "targetPrice", "condition", "note", "active", "triggered", "createdAt"}
        for item in data:
            assert keys.issubset(item.keys())
        assert {i["id"] for i in data} == {"alert-1", "alert-2"}

    def test_post_same_list_twice_no_duplicates(self, client):
        r1 = client.post("/api/alerts-compat", json=_ALERTS, headers=_DEVICE)
        assert r1.json()["created"] == 2

        r2 = client.post("/api/alerts-compat", json=_ALERTS, headers=_DEVICE)
        assert r2.status_code == 200
        assert r2.json()["created"] == 0

        res = client.get("/api/alerts-compat", headers=_DEVICE)
        data = res.json()
        assert len(data) == 2

    def test_post_dict_body_returns_422(self, client):
        res = client.post("/api/alerts-compat", json={"id": "x"}, headers=_DEVICE)
        assert res.status_code == 422

    def test_invalid_item_skipped_valid_created(self, client):
        alerts = _ALERTS + [
            {"id": "bad-1", "symbol": "EURUSD", "targetPrice": 0, "condition": "greater_than",
             "note": "invalid price", "active": True, "triggered": False},
            {"id": "bad-2", "symbol": "EURUSD", "targetPrice": 1.1, "condition": "weird",
             "note": "unknown condition", "active": True, "triggered": False},
        ]
        res = client.post("/api/alerts-compat", json=alerts, headers=_DEVICE)
        assert res.status_code == 200
        body = res.json()
        assert body["created"] == 2
        assert body["skipped"] == 2

        res = client.get("/api/alerts-compat", headers=_DEVICE)
        data = res.json()
        assert len(data) == 2

    def test_second_device_does_not_see_first(self, client):
        client.post("/api/alerts-compat", json=_ALERTS, headers=_DEVICE)

        res = client.get("/api/alerts-compat", headers=_DEVICE2)
        assert res.json() == []

    def test_existing_api_alerts_unchanged(self, client):
        """The legacy /api/alerts route must still return a dict with 'alerts' key."""
        # First check without seeding.
        res = client.get("/api/alerts", headers=_DEVICE)
        assert res.status_code == 200
        assert "alerts" in res.json()

        # Also seed the compat route and ensure legacy route is unaffected.
        client.post("/api/alerts-compat", json=_ALERTS, headers=_DEVICE)
        res2 = client.get("/api/alerts", headers=_DEVICE)
        assert res2.status_code == 200
        legacy = res2.json()
        assert isinstance(legacy.get("alerts"), list)
