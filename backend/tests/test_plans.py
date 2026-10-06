"""Subscription plans: manual activation, expiry, enforcement switch, alert and AI limits, admin stats."""
import time
import uuid

import pytest
from fastapi.testclient import TestClient

import main
import plans

TOKEN = "admin-" + "p" * 30
A = {"X-Admin-Token": TOKEN}


@pytest.fixture()
def client(monkeypatch):
    monkeypatch.setenv("MATRIX_ADMIN_TOKEN", TOKEN)
    with TestClient(main.app) as c:
        plans.set_setting("plan_enforcement", "0")
        yield c
        plans.set_setting("plan_enforcement", "0")


def _register(c):
    name = "pl" + uuid.uuid4().hex[:10]
    dev = uuid.uuid4().hex
    r = c.post(
        "/api/auth/register",
        json={"username": name, "email": f"{name}@example.com", "password": "secret1234", "role": "trader"},
        headers={"X-Install-Id": dev},
    )
    assert r.status_code == 200, r.text
    d = r.json()
    return d["user_id"], {"Authorization": "Bearer " + d["token"], "X-Install-Id": dev}


def _alert(c, h, price):
    return c.post("/api/alerts", json={"symbol": "EURUSD", "condition": "above", "price": price, "note": ""}, headers=h)


def test_guest_and_new_user_are_free_and_unlimited_while_enforcement_off(client):
    p = client.get("/api/plan").json()
    assert p["plan"] == "free" and p["enforcement"] is False
    assert all(v is None for v in p["limits"].values())
    assert p["plan_limits"]["free"]["charts"] == 1 and p["prices_usd"]["pro"] == 15


def test_activate_extend_cancel_and_expiry(client, monkeypatch):
    uid, h = _register(client)
    r = client.post(f"/api/admin/users/{uid}/plan", json={"plan": "pro", "days": 30, "amount_iqd": 22800, "method": "zaincash", "reference": "TX1"}, headers=A)
    assert r.status_code == 200, r.text
    first_end = r.json()["expires_at"]
    me = client.get("/api/plan", headers=h).json()
    assert me["plan"] == "pro" and 29 <= me["days_left"] <= 30
    # renewing the same plan extends from the current end
    r2 = client.post(f"/api/admin/users/{uid}/plan", json={"plan": "pro", "days": 30}, headers=A).json()
    assert abs(r2["expires_at"] - (first_end + 30 * 86400)) < 2
    pays = client.get(f"/api/admin/payments?user_id={uid}", headers=A).json()["payments"]
    assert len(pays) == 2 and pays[-1]["amount_iqd"] == 22800 and pays[-1]["method"] == "zaincash"
    # expired -> free
    real = time.time
    monkeypatch.setattr(plans.time, "time", lambda: real() + 61 * 86400)
    assert client.get("/api/plan", headers=h).json()["plan"] == "free"
    monkeypatch.setattr(plans.time, "time", real)
    assert client.post(f"/api/admin/users/{uid}/plan/cancel", headers=A).status_code == 200
    assert client.get("/api/plan", headers=h).json()["plan"] == "free"


def test_validation(client):
    uid, h = _register(client)
    assert client.post(f"/api/admin/users/{uid}/plan", json={"plan": "free", "days": 30}, headers=A).status_code == 422
    assert client.post(f"/api/admin/users/{uid}/plan", json={"plan": "pro", "days": 0}, headers=A).status_code == 422
    assert client.post(f"/api/admin/users/{uid}/plan", json={"plan": "pro", "days": 30, "method": "bitcoin"}, headers=A).status_code == 422
    assert client.post("/api/admin/users/99999999/plan", json={"plan": "pro", "days": 30}, headers=A).status_code == 404
    assert client.post(f"/api/admin/users/{uid}/plan", json={"plan": "pro", "days": 30}).status_code == 403


def test_alert_limit_only_when_enforced(client):
    uid, h = _register(client)
    for i in range(4):
        assert _alert(client, h, 1.10 + i / 100).status_code == 200  # off: free user may exceed 3
    client.post("/api/admin/settings", json={"plan_enforcement": True}, headers=A)
    r = _alert(client, h, 1.2)
    assert r.status_code == 403 and r.json()["detail"]["limit"] == "alerts" and r.json()["detail"]["max"] == 3
    client.post(f"/api/admin/users/{uid}/plan", json={"plan": "basic", "days": 30}, headers=A)
    assert _alert(client, h, 1.21).status_code == 200  # basic allows 20
    assert client.get("/api/plan", headers=h).json()["limits"]["alerts"] == 20


def test_ai_daily_limit(client):
    uid, h = _register(client)
    client.post("/api/admin/settings", json={"plan_enforcement": True}, headers=A)
    codes = [client.post("/api/ai/ask", json={"question": "ما هو RSI؟", "symbol": "EURUSD"}, headers=h).status_code for _ in range(6)]
    assert codes.count(429) >= 1 and codes[:5].count(429) == 0


def test_settings_and_stats(client):
    s = client.post("/api/admin/settings", json={"payment_instructions": "حوّل على زين كاش 0780"}, headers=A).json()
    assert s["payment_instructions"].startswith("حوّل") and s["plan_enforcement"] is False
    assert client.get("/api/plan").json()["payment_instructions"].startswith("حوّل")
    uid, h = _register(client)
    client.post(f"/api/admin/users/{uid}/plan", json={"plan": "vip", "days": 30, "amount_iqd": 30400}, headers=A)
    ov = client.get("/api/admin/overview", headers=A).json()
    assert ov["subscriptions"]["active"]["vip"] >= 1 and ov["subscriptions"]["mrr_usd"] >= 20
    paying = client.get("/api/admin/users?status=paying", headers=A).json()["users"]
    assert any(u["id"] == uid and u["plan"] == "vip" for u in paying)
