"""الدخول يتحقّق من كلمة المرور بلا قفل (PBKDF2 بطيء): تغيير كلمة المرور أو حذف الحساب داخل تلك
النافذة كان يُلغى — الترقية الكسولة تكتب تجزئة الكلمة القديمة، والجلسة تُنشأ بعد إلغاء الجلسات."""
from __future__ import annotations

import time

import pytest
from fastapi.testclient import TestClient

import db
import main
from core import db_conn


@pytest.fixture()
def client(tmp_path, monkeypatch):
    path = tmp_path / "test_race.db"
    monkeypatch.setattr(db_conn, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    monkeypatch.setattr(db, "_PBKDF2_ITERATIONS", 1_000)
    db.init_db()
    return TestClient(main.app, raise_server_exceptions=False)


def _register(client, name="alice", pw="old1234"):
    r = client.post("/api/auth/register", json={"username": name, "email": f"{name}@example.com", "password": pw})
    return r.json()["token"], r.json()["user_id"]


def _during_login_verify(monkeypatch, action):
    """يشغّل `action` مرة واحدة بعد أن يتحقّق الدخول من كلمة المرور وقبل أن يكمل."""
    real = db._verify_password
    fired = []

    def wrapped(pw, stored):
        res = real(pw, stored)
        if not fired:
            fired.append(1)
            monkeypatch.setattr(db, "_verify_password", real)
            action()
        return res

    monkeypatch.setattr(db, "_verify_password", wrapped)


def _login(client, u, p):
    return client.post("/api/auth/login", json={"username": u, "password": p})


def test_legacy_rehash_does_not_revert_password_change(client, monkeypatch):
    tok, uid = _register(client)
    with db._conn() as c:
        c.execute("UPDATE users SET password_hash=? WHERE id=?",
                  (f"pbkdf2_sha256$500$abcd${db._hash_password_pbkdf2('old1234', 'abcd', 500)}", uid))
    _during_login_verify(monkeypatch, lambda: db.change_password(uid, tok, "old1234", "new5678", None))
    assert _login(client, "alice", "old1234").status_code == 401
    assert _login(client, "alice", "old1234").status_code == 401
    assert _login(client, "alice", "new5678").status_code == 200


def test_login_racing_password_change_gets_no_session(client, monkeypatch):
    tok, uid = _register(client)
    _during_login_verify(monkeypatch, lambda: db.change_password(uid, tok, "old1234", "new5678", None))
    r = _login(client, "alice", "old1234")
    assert r.status_code == 401
    with db._conn() as c:
        assert [x[0] for x in c.execute("SELECT token FROM sessions WHERE user_id=?", (uid,))] == [tok]


def test_login_racing_account_deletion_gets_no_session(client, monkeypatch):
    tok, uid = _register(client)
    h = {"Authorization": f"Bearer {tok}"}
    _during_login_verify(monkeypatch, lambda: client.request("DELETE", "/api/auth/account", headers=h))
    assert _login(client, "alice", "old1234").status_code == 401
    with db._conn() as c:
        assert c.execute("SELECT COUNT(*) FROM sessions WHERE user_id=?", (uid,)).fetchone()[0] == 0


def test_legacy_rehash_still_upgrades(client):
    _, uid = _register(client)
    with db._conn() as c:
        c.execute("UPDATE users SET password_hash=? WHERE id=?",
                  (f"pbkdf2_sha256$500$abcd${db._hash_password_pbkdf2('old1234', 'abcd', 500)}", uid))
    assert _login(client, "alice", "old1234").status_code == 200
    with db._conn() as c:
        assert c.execute("SELECT password_hash FROM users WHERE id=?", (uid,)).fetchone()[0].startswith(
            "pbkdf2_sha256$1000$")


def test_unknown_username_costs_a_hash(client, monkeypatch):
    _register(client)
    calls = []
    real = db._hash_password_pbkdf2
    monkeypatch.setattr(db, "_hash_password_pbkdf2", lambda *a: calls.append(a[2]) or real(*a))
    assert _login(client, "nobody", "x1234").status_code == 401
    assert calls == [1_000]
