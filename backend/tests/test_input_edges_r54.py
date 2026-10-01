"""حوافّ الإدخال بمسارات المجتمع والحساب (run 54).

- `"\\ud800"` وحيد: JSON صالح ومحلّل بايثون يقبله، لكن SQLite/ترميز الردّ يرفضانه ⇒ 500 (و400/401 بخطأ الترميز الخام).
- كلمة مرور العضو الموضوع كانت تُقصّ فلا يدخل بما كتبه الراعي.
- «remove» لمعرّف غير موجود كان `ok: true`.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import db
import main
from core import db_conn

_TOKEN = "moderation-token-for-tests"


@pytest.fixture()
def client(tmp_path, monkeypatch):
    path = tmp_path / "test_edges.db"
    monkeypatch.setattr(db_conn, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    monkeypatch.setattr(db, "_PBKDF2_ITERATIONS", 1_000)
    db.init_db()
    return TestClient(main.app, raise_server_exceptions=False)


def _register(client, username: str) -> str:
    r = client.post("/api/auth/register",
                    json={"username": username, "email": f"{username}@example.com", "password": "pass1234"})
    assert r.status_code == 200, r.text
    return r.json()["token"]


def _raw(client, path, body: str, token: str | None = None):
    h = {"Content-Type": "application/json"}
    if token:
        h["Authorization"] = f"Bearer {token}"
    return client.post(path, content=body.encode(), headers=h)


@pytest.mark.parametrize("path,body", [
    ("/api/chat/group", '{"text":"x\\ud800y"}'),
    ("/api/auth/register", '{"username":"bob\\udc00","email":"b@example.com","password":"pass1234"}'),
    ("/api/auth/login", '{"username":"a\\ud800","password":"pass1234"}'),
    ("/api/reports", '{"kind":"group_message","target_id":"x","reason":"spam\\udfff"}'),
])
def test_lone_surrogate_is_422_not_500(client, path, body):
    tok = _register(client, "alice")
    r = _raw(client, path, body, tok)
    assert r.status_code == 422, r.text
    assert "codec" not in r.text


def test_valid_surrogate_pair_emoji_still_posts(client):
    tok = _register(client, "alice")
    r = _raw(client, "/api/chat/group", '{"text":"hi \\ud83d\\ude00"}', tok)
    assert r.status_code == 200, r.text
    assert r.json()["message"]["text"] == "hi \U0001F600"


def test_literal_backslash_u_text_is_not_rejected(client):
    tok = _register(client, "alice")
    r = _raw(client, "/api/chat/group", '{"text":"path \\\\ud800 literal"}', tok)
    assert r.status_code == 200, r.text


def test_placed_member_password_is_stored_as_typed(client):
    tok = _register(client, "sponsor")
    r = client.post("/api/commissions/place", headers={"Authorization": f"Bearer {tok}"},
                    json={"username": "placed2", "side": "right", "password": "  abcd  "})
    assert r.status_code == 200, r.text
    assert r.json().get("temp_password") is None
    assert client.post("/api/auth/login", json={"username": "placed2", "password": "  abcd  "}).status_code == 200


def test_blank_placed_password_still_returns_generated_one(client):
    tok = _register(client, "sponsor")
    r = client.post("/api/commissions/place", headers={"Authorization": f"Bearer {tok}"},
                    json={"username": "placed3", "side": "left", "password": "   "})
    temp = r.json()["temp_password"]
    assert temp and client.post("/api/auth/login", json={"username": "placed3", "password": temp}).status_code == 200


def test_remove_of_unknown_item_is_not_ok(client, monkeypatch):
    monkeypatch.setenv("MATRIX_MODERATION_TOKEN", _TOKEN)
    r = client.post("/api/moderation/action", headers={"X-Moderation-Token": _TOKEN},
                    json={"kind": "vote", "target_id": "nope", "action": "remove"})
    assert r.json() == {"ok": False}
