"""Admin API (token-protected), account suspension, launch waitlist, mailer config validation."""
import uuid

import pytest
from fastapi.testclient import TestClient

import mailer
import main
import routers_admin

TOKEN = "admin-" + "x" * 30


@pytest.fixture()
def admin(monkeypatch):
    monkeypatch.setenv("MATRIX_ADMIN_TOKEN", TOKEN)
    routers_admin._WAITLIST_HITS.clear()
    return {"X-Admin-Token": TOKEN}


def _register(c):
    name = "ad" + uuid.uuid4().hex[:10]
    r = c.post(
        "/api/auth/register",
        json={"username": name, "email": f"{name}@example.com", "password": "secret1234", "role": "trader"},
        headers={"X-Install-Id": uuid.uuid4().hex},
    )
    assert r.status_code == 200, r.text
    return name, r.json()


def test_hidden_without_token(monkeypatch):
    monkeypatch.delenv("MATRIX_ADMIN_TOKEN", raising=False)
    with TestClient(main.app) as c:
        assert c.get("/api/admin/overview").status_code == 404


def test_wrong_token_forbidden(admin):
    with TestClient(main.app) as c:
        assert c.get("/api/admin/overview", headers={"X-Admin-Token": "nope"}).status_code == 403
        assert c.get("/api/admin/overview").status_code == 403


def test_overview_and_users(admin):
    with TestClient(main.app) as c:
        name, reg = _register(c)
        ov = c.get("/api/admin/overview", headers=admin).json()
        assert ov["users"]["total"] >= 1 and ov["signups"]["today"] >= 1
        assert len(ov["signups_per_day"]["counts"]) == 30 and ov["signups_per_day"]["counts"][-1] >= 1
        res = c.get(f"/api/admin/users?q={name}", headers=admin).json()
        assert res["total"] == 1 and res["users"][0]["username"] == name
        assert res["users"][0]["email"] == f"{name}@example.com"


def test_suspend_blocks_session_and_login(admin):
    with TestClient(main.app) as c:
        name, reg = _register(c)
        h = {"Authorization": "Bearer " + reg["token"]}
        assert c.get("/api/auth/me", headers=h).status_code == 200
        uid = reg["user_id"]
        assert c.post(f"/api/admin/users/{uid}/suspend", json={"suspended": True, "reason": "spam"}, headers=admin).status_code == 200
        assert c.get("/api/auth/me", headers=h).status_code == 401
        r = c.post("/api/auth/login", json={"username": name, "password": "secret1234"})
        assert r.status_code == 401 and r.json()["detail"] == "account suspended"
        listed = c.get("/api/admin/users?status=suspended", headers=admin).json()["users"]
        assert any(u["id"] == uid and u["suspend_reason"] == "spam" for u in listed)
        c.post(f"/api/admin/users/{uid}/suspend", json={"suspended": False}, headers=admin)
        assert c.post("/api/auth/login", json={"username": name, "password": "secret1234"}).status_code == 200
        assert c.post("/api/admin/users/99999999/suspend", json={"suspended": True}, headers=admin).status_code == 404


def test_waitlist_public_join_and_admin_export(admin):
    with TestClient(main.app) as c:
        em = f"wl-{uuid.uuid4().hex[:8]}@Example.com"
        r = c.post("/api/waitlist", json={"email": em, "plan": "pro", "lang": "ar", "source": "pricing"})
        assert r.status_code == 200 and r.json()["new"] is True
        r = c.post("/api/waitlist", json={"email": em.upper(), "plan": "vip"})
        assert r.json()["new"] is False
        assert c.post("/api/waitlist", json={"email": "not-an-email"}).status_code == 422
        data = c.get("/api/admin/waitlist", headers=admin).json()
        row = next(i for i in data["items"] if i["email"] == em.lower())
        assert row["plan"] == "vip" and row["lang"] == "ar"
        csv = c.get("/api/admin/waitlist.csv", headers=admin)
        assert csv.status_code == 200 and csv.content.startswith("﻿".encode("utf-8"))
        assert em.lower() in csv.content.decode("utf-8")


def test_waitlist_rate_limit(admin):
    with TestClient(main.app) as c:
        codes = [c.post("/api/waitlist", json={"email": f"rl{i}@example.com"}).status_code for i in range(12)]
        assert codes[:10] == [200] * 10 and 429 in codes[10:]


def test_moderation_accepts_admin_token(admin, monkeypatch):
    monkeypatch.delenv("MATRIX_MODERATION_TOKEN", raising=False)
    with TestClient(main.app) as c:
        assert c.get("/api/moderation/reports", headers={"X-Moderation-Token": TOKEN}).status_code == 200
        assert c.get("/api/moderation/reports", headers={"X-Moderation-Token": "bad"}).status_code == 403


def test_system(admin):
    with TestClient(main.app) as c:
        s = c.get("/api/admin/system", headers=admin).json()
        assert "uptime_s" in s and "email" in s and s["live_trading_enabled"] is False


@pytest.mark.parametrize(
    "host,port,user,pw,ok",
    [
        ("smtp.gmail.com", "587", "a@b.co", "x", True),
        ("Aa19931993@@", "587", "a@b.co", "x", False),
        ("smtp.gmail.com", "Aa19931993@@", "a@b.co", "x", False),
        ("smtp.gmail.com", "587", "", "x", False),
    ],
)
def test_mailer_rejects_mistyped_settings(monkeypatch, host, port, user, pw, ok):
    monkeypatch.setenv("SMTP_HOST", host)
    monkeypatch.setenv("SMTP_PORT", port)
    monkeypatch.setenv("SMTP_USER", user)
    monkeypatch.setenv("SMTP_PASSWORD", pw)
    assert mailer.configured() is ok
