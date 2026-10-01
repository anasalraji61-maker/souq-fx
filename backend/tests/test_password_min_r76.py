"""قرار أنس ٧: ٨ أحرف حدّاً أدنى لكلمة المرور في الخادم (التسجيل، وضع الراعي، التغيير)؛ الحسابات القديمة تدخل."""
import pytest
from fastapi.testclient import TestClient

import db
import main
from core import db_conn


@pytest.fixture()
def client(tmp_path, monkeypatch):
    path = tmp_path / "test_pwmin.db"
    monkeypatch.setattr(db_conn, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    monkeypatch.setattr(db, "_PBKDF2_ITERATIONS", 1_000)
    db.init_db()
    return TestClient(main.app, raise_server_exceptions=False)


def test_password_min_is_eight():
    assert db.PASSWORD_MIN == 8


def test_register_rejects_seven_chars(client):
    r = client.post("/api/auth/register", json={"username": "alice", "email": "a@example.com", "password": "abcdefg"})
    assert r.status_code == 422
    r = client.post("/api/auth/register", json={"username": "alice", "email": "a@example.com", "password": "abcdefgh"})
    assert r.status_code == 200


def test_db_register_rejects_seven_chars(client):
    with pytest.raises(ValueError, match="password too short"):
        db.register_user("bob", "1234567", email="b@example.com")


def test_place_rejects_seven_chars(client):
    sid = db.register_user("carol", "carol-pass", email="c@example.com")["user_id"]
    with pytest.raises(ValueError, match="password too short"):
        db.place_under_sponsor(sid, "dave", "1234567", "left")


def test_change_password_rejects_seven_chars_with_app_matched_detail(client):
    tok = client.post("/api/auth/register",
                      json={"username": "erin", "email": "e@example.com", "password": "erin-pass"}).json()["token"]
    h = {"Authorization": f"Bearer {tok}"}
    r = client.post("/api/auth/password", json={"current_password": "erin-pass", "new_password": "1234567"}, headers=h)
    # التطبيق يطابق هذا النصّ حرفياً (`AccountScreen.tsx`)
    assert (r.status_code, r.json()["detail"]) == (400, "password too short")
    r = client.post("/api/auth/password", json={"current_password": "erin-pass", "new_password": "12345678"}, headers=h)
    assert r.status_code == 200


def test_existing_short_password_account_still_logs_in(client):
    uid = db.register_user("frank", "frank-pass", email="f@example.com")["user_id"]
    with db._conn() as c:
        c.execute("UPDATE users SET password_hash=? WHERE id=?", (db._encode_password("abcd"), uid))
    r = client.post("/api/auth/login", json={"username": "frank", "password": "abcd"})
    assert r.status_code == 200
