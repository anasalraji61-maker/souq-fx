"""بايتات غير صالحة من العميل ⇒ 422/403 لا 500: بديل منفرد خام بالجسم، ورأس توكن الإشراف غير ASCII."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import db
import main
from core import db_conn


@pytest.fixture()
def client(tmp_path, monkeypatch):
    path = tmp_path / "test_bad_bytes.db"
    monkeypatch.setattr(db_conn, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    monkeypatch.setattr(db, "_PBKDF2_ITERATIONS", 1_000)
    monkeypatch.setenv("MATRIX_MODERATION_TOKEN", "modtok")
    db.init_db()
    return TestClient(main.app, raise_server_exceptions=False)


def _auth(client) -> dict:
    r = client.post("/api/auth/register",
                    json={"username": "alice", "email": "a@example.com", "password": "pass1234"})
    return {"Authorization": "Bearer " + r.json()["token"]}


@pytest.mark.parametrize("path,body", [
    ("/api/chat/group", b'{"text":"hi \xed\xa0\x80 there"}'),
    ("/api/votes", b'{"symbol":"EURUSD","direction":"buy","entry":1.1,"sl":1.0,"tp":1.2,"note":"x\xed\xa0\x80"}'),
    ("/api/auth/register", b'{"username":"bob\xed\xa0\x80x","email":"b@example.com","password":"pass1234"}'),
    ("/api/chat/group", '{"text": "hi X"}'.encode("utf-16-le").replace("X".encode("utf-16-le"), b"\x00\xd8")),
])
def test_raw_lone_surrogate_bytes_are_422(client, path, body):
    h = _auth(client)
    r = client.post(path, content=body, headers={**h, "Content-Type": "application/json"})
    assert r.status_code == 422, r.text
    assert client.get("/api/chat/group").json()["messages"] == []


def test_non_ascii_moderation_token_is_403(client):
    r = client.get("/api/moderation/reports", headers={"X-Moderation-Token": "\xe9".encode("latin-1")})
    assert r.status_code == 403
    assert client.get("/api/moderation/reports", headers={"X-Moderation-Token": "modtok"}).status_code == 200
