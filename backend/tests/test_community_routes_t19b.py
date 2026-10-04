"""
Tests for community chat routes (T19b).
"""
import pytest
from fastapi.testclient import TestClient

import db
import main
from core import db_conn


@pytest.fixture()
def client(tmp_path, monkeypatch):
    """Test client with temporary database."""
    path = tmp_path / "test_community.db"
    assert "souq-fx" not in str(path), f"Test DB must be outside repo: {path}"
    monkeypatch.setattr(db_conn, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    monkeypatch.setattr(db, "_PBKDF2_ITERATIONS", 1_000)
    db.init_db()
    return TestClient(main.app, raise_server_exceptions=False)


def _register(client, username="chat_u1"):
    """Register a user and return auth headers."""
    r = client.post(
        "/api/auth/register",
        json={"username": username, "email": f"{username}@x.co", "password": "pass1234"},
    )
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def _channel_id(client, headers):
    """Fetch the first channel id via the API."""
    r = client.get("/api/community/channels", headers=headers)
    assert r.status_code == 200, r.text
    channels = r.json()["channels"]
    assert channels
    return channels[0]["id"]


def test_channels_unauthenticated(client):
    r = client.get("/api/community/channels")
    assert r.status_code == 401


def test_channels_authenticated(client):
    headers = _register(client, "chat_u1")
    r = client.get("/api/community/channels", headers=headers)
    assert r.status_code == 200
    channels = r.json()["channels"]
    assert len(channels) > 0
    assert all("id" in c for c in channels)


def test_messages_unauthenticated(client):
    headers = _register(client, "chat_u1")
    ch = _channel_id(client, headers)
    r = client.get(f"/api/community/channels/{ch}/messages")
    assert r.status_code == 401


def test_post_unauthenticated(client):
    headers = _register(client, "chat_u1")
    ch = _channel_id(client, headers)
    r = client.post(f"/api/community/channels/{ch}/messages", json={"text": "hi"})
    assert r.status_code == 401


def test_messages_empty_channel(client):
    headers = _register(client, "chat_u1")
    ch = _channel_id(client, headers)
    r = client.get(f"/api/community/channels/{ch}/messages", headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert body["channel"] == ch
    assert body["messages"] == []


def test_messages_unknown_channel(client):
    headers = _register(client, "chat_u1")
    r = client.get("/api/community/channels/nope/messages", headers=headers)
    assert r.status_code == 404


def test_post_unknown_channel(client):
    headers = _register(client, "chat_u1")
    r = client.post("/api/community/channels/nope/messages", json={"text": "hi"}, headers=headers)
    assert r.status_code == 404


def test_post_empty_text(client):
    headers = _register(client, "chat_u1")
    ch = _channel_id(client, headers)
    r = client.post(f"/api/community/channels/{ch}/messages", json={"text": "   "}, headers=headers)
    assert r.status_code == 400


def test_post_text_too_long(client):
    headers = _register(client, "chat_u1")
    ch = _channel_id(client, headers)
    r = client.post(
        f"/api/community/channels/{ch}/messages", json={"text": "x" * 1001}, headers=headers
    )
    assert r.status_code == 400


def test_post_valid_message(client):
    headers = _register(client, "chat_u1")
    ch = _channel_id(client, headers)
    r = client.post(
        f"/api/community/channels/{ch}/messages", json={"text": "hello"}, headers=headers
    )
    assert r.status_code == 200
    msg = r.json()["message"]
    assert msg["text"] == "hello"
    assert msg["channel"] == ch
    assert msg["mentions"] == []
    assert msg["flagged"] is False


def test_post_mentions_normalized(client):
    headers = _register(client, "chat_u1")
    ch = _channel_id(client, headers)
    r = client.post(
        f"/api/community/channels/{ch}/messages",
        json={"text": "hi @Bob and @bob"},
        headers=headers,
    )
    assert r.status_code == 200
    assert r.json()["message"]["mentions"] == ["bob"]


def test_post_banned_word_flagged(client):
    headers = _register(client, "chat_u1")
    ch = _channel_id(client, headers)
    r = client.post(
        f"/api/community/channels/{ch}/messages",
        json={"text": "this is a scam"},
        headers=headers,
    )
    assert r.status_code == 200
    assert r.json()["message"]["flagged"] is True
    r2 = client.get(f"/api/community/channels/{ch}/messages", headers=headers)
    assert r2.status_code == 200
    texts = [m["text"] for m in r2.json()["messages"]]
    assert "this is a scam" in texts


def test_rate_limit_fifth_post_ok_sixth_429(client):
    headers = _register(client, "chat_u1")
    ch = _channel_id(client, headers)
    for i in range(5):
        r = client.post(
            f"/api/community/channels/{ch}/messages", json={"text": f"msg {i}"}, headers=headers
        )
        assert r.status_code == 200, r.text
    r = client.post(
        f"/api/community/channels/{ch}/messages", json={"text": "one more"}, headers=headers
    )
    assert r.status_code == 429
    assert r.json()["detail"] == "rate_limited"
    assert r.headers.get("Retry-After") is not None


def test_rate_limit_is_per_user(client):
    headers1 = _register(client, "chat_u1")
    headers2 = _register(client, "chat_u2")
    ch = _channel_id(client, headers1)
    for i in range(5):
        r = client.post(
            f"/api/community/channels/{ch}/messages", json={"text": f"u1 {i}"}, headers=headers1
        )
        assert r.status_code == 200, r.text
    r = client.post(
        f"/api/community/channels/{ch}/messages", json={"text": "u2 hello"}, headers=headers2
    )
    assert r.status_code == 200


def test_limit_and_before_id(client):
    headers = _register(client, "chat_u1")
    ch = _channel_id(client, headers)
    for text in ("first", "second", "third"):
        r = client.post(
            f"/api/community/channels/{ch}/messages", json={"text": text}, headers=headers
        )
        assert r.status_code == 200, r.text
    r = client.get(
        f"/api/community/channels/{ch}/messages", params={"limit": 2}, headers=headers
    )
    assert r.status_code == 200
    msgs = r.json()["messages"]
    assert [m["text"] for m in msgs] == ["third", "second"]
    newest_id = msgs[0]["id"]
    r2 = client.get(
        f"/api/community/channels/{ch}/messages",
        params={"before_id": newest_id},
        headers=headers,
    )
    assert r2.status_code == 200
    assert [m["text"] for m in r2.json()["messages"]] == ["second", "first"]
