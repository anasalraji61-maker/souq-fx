"""التشغيل 114: `/api/push/register` صادق ثم انتظر القفل، وخروج هذا الجهاز (أو تغيير كلمة المرور الذي يُلغي
جلسته) التُزم بينهما ⇒ كان يعيد ربط رمز الهاتف بالحساب بعد الفكّ، لأن `_lock_owner` يكفيه أيّ جلسة للحساب."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import db
import main
from core import auth, db_conn

PHONE = "sharedphone-0000000001"
LAPTOP = "laptopdev-00000000002"
PTOK = "ExponentPushToken[PHONE]"


@pytest.fixture()
def client(tmp_path, monkeypatch):
    path = tmp_path / "test_push_race.db"
    monkeypatch.setattr(db_conn, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    monkeypatch.setattr(db, "_PBKDF2_ITERATIONS", 1_000)
    db.init_db()
    return TestClient(main.app, raise_server_exceptions=False)


def _setup(client):
    reg = client.post("/api/auth/register",
                      json={"username": "alice", "email": "a@example.com", "password": "pass12345"}).json()
    laptop = client.post("/api/auth/login", json={"username": "alice", "password": "pass12345"},
                         headers={"X-Install-Id": LAPTOP}).json()["token"]
    phone = {"Authorization": f"Bearer {reg['token']}", "X-Install-Id": PHONE}
    assert client.post("/api/push/register", json={"token": PTOK}, headers=phone).status_code == 200
    return reg, laptop, phone


def _register_after(client, monkeypatch, phone, action):
    """يحاكي الترتيب: المصادقة تمرّ، ثم يُلتزم `action` (خروج/تغيير كلمة)، ثم الكتابة."""
    real = db.user_from_token

    def auth_then_race(token):
        u = real(token)
        action()
        return u

    monkeypatch.setattr(auth.db, "user_from_token", auth_then_race)
    r = client.post("/api/push/register", json={"token": PTOK}, headers=phone)
    monkeypatch.setattr(auth.db, "user_from_token", real)
    return r


def test_register_in_flight_during_logout_does_not_rebind(client, monkeypatch):
    reg, laptop, phone = _setup(client)
    r = _register_after(client, monkeypatch, phone, lambda: db.logout_session(
        reg["token"], reg["user_id"], owner_key=None, push_token=PTOK))
    assert r.status_code == 401
    assert db.push_tokens_for(reg["user_id"]) == []
    # الحساب ما زال داخلاً على الحاسوب — الفحص بجلسة الطلب لا بأيّ جلسة
    assert client.get("/api/auth/me", headers={"Authorization": f"Bearer {laptop}"}).status_code == 200


def test_register_in_flight_during_password_change_does_not_rebind(client, monkeypatch):
    reg, laptop, phone = _setup(client)
    r = _register_after(client, monkeypatch, phone, lambda: db.change_password(
        reg["user_id"], laptop, "pass12345", "newpass999", owner_key=LAPTOP))
    assert r.status_code == 401
    assert db.push_tokens_for(reg["user_id"]) == []


def test_register_with_live_session_still_binds(client):
    reg, _, phone = _setup(client)
    assert db.push_tokens_for(reg["user_id"]) == [PTOK]
    anon = client.post("/api/push/register", json={"token": "ExponentPushToken[ANON]"},
                       headers={"X-Install-Id": "anondevice-00000000003"})
    assert anon.status_code == 200
