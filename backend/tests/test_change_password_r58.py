"""POST /api/auth/password: العضو يغيّر كلمة وضعها راعيه فيُخرج الراعي من حسابه."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import db
import main
from core import db_conn

DEV_A = "memberphone-0000000001"
DEV_B = "sponsorphone-000000002"


@pytest.fixture()
def client(tmp_path, monkeypatch):
    path = tmp_path / "test_pw.db"
    monkeypatch.setattr(db_conn, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    monkeypatch.setattr(db, "_PBKDF2_ITERATIONS", 1_000)
    db.init_db()
    return TestClient(main.app, raise_server_exceptions=False)


def _login(client, u, p, dev):
    r = client.post("/api/auth/login", json={"username": u, "password": p}, headers={"X-Install-Id": dev})
    return r.status_code, (r.json().get("token") if r.status_code == 200 else None)


def test_member_locks_out_sponsor(client):
    tok = client.post("/api/auth/register",
                      json={"username": "alice", "email": "a@example.com", "password": "pass1234"}).json()["token"]
    client.post("/api/commissions/place", json={"username": "bobby", "side": "left", "password": "known123"},
                headers={"Authorization": f"Bearer {tok}"})
    _, sponsor_tok = _login(client, "bobby", "known123", DEV_B)
    _, member_tok = _login(client, "bobby", "known123", DEV_A)
    for dev, t in ((DEV_A, member_tok), (DEV_B, sponsor_tok)):
        assert client.post("/api/push/register", json={"token": f"ExponentPushToken[{dev}]"},
                           headers={"Authorization": f"Bearer {t}", "X-Install-Id": dev}).status_code == 200
    h = {"Authorization": f"Bearer {member_tok}", "X-Install-Id": DEV_A}
    r = client.post("/api/auth/password", json={"current_password": "wrong", "new_password": "mine5678"}, headers=h)
    assert r.status_code == 400
    r = client.post("/api/auth/password", json={"current_password": "known123", "new_password": "abc"}, headers=h)
    assert r.status_code == 400
    r = client.post("/api/auth/password", json={"current_password": "known123", "new_password": "mine5678"}, headers=h)
    assert r.status_code == 200
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {sponsor_tok}"}).status_code == 401
    assert client.get("/api/auth/me", headers=h).status_code == 200
    assert _login(client, "bobby", "known123", DEV_B)[0] == 401
    assert _login(client, "bobby", "mine5678", DEV_A)[0] == 200
    uid = client.get("/api/auth/me", headers=h).json()["user_id"]
    assert db.push_tokens_for(uid) == [f"ExponentPushToken[{DEV_A}]"]


def test_password_change_needs_login(client):
    r = client.post("/api/auth/password", json={"current_password": "a", "new_password": "bbbb"})
    assert r.status_code == 401


def test_login_blank_email_falls_back_to_username(client):
    client.post("/api/auth/register", json={"username": "carol", "email": "c@example.com", "password": "pass1234"})
    r = client.post("/api/auth/login", json={"username": "carol", "email": "  ", "password": "pass1234"})
    assert r.status_code == 200
