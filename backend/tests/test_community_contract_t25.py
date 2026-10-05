"""
Community frontend contract tests (T25).

The frontend (src/api/community.ts) expects bare JSON arrays and the
message fields: id (str), channel_id, sender_name, badge, avatar_bg,
content, created_at (ISO-8601 UTC str), sentiment, symbol_tag,
likes (int), is_flagged (bool).
"""
from datetime import datetime

import pytest
from fastapi.testclient import TestClient

import community_chat
import db
import main
from core import db_conn

USER = "t25_contract_u1"
CHANNEL_KEYS = {"id", "name", "name_ar", "description", "online_count"}
MESSAGE_KEYS = {
    "id",
    "channel_id",
    "sender_name",
    "badge",
    "avatar_bg",
    "content",
    "created_at",
    "sentiment",
    "symbol_tag",
    "likes",
    "is_flagged",
}


@pytest.fixture()
def client(tmp_path, monkeypatch):
    """Test client with temporary database."""
    path = tmp_path / "test_community_t25.db"
    assert "souq-fx" not in str(path), f"Test DB must be outside repo: {path}"
    monkeypatch.setattr(db_conn, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    monkeypatch.setattr(db, "_PBKDF2_ITERATIONS", 1_000)
    db.init_db()
    return TestClient(main.app, raise_server_exceptions=False)


def _register(client, username=USER):
    """Register a user and return auth headers."""
    r = client.post(
        "/api/auth/register",
        json={"username": username, "email": f"{username}@x.co", "password": "pass1234"},
    )
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


# --- channels shape ---


def test_channels_bare_list_with_five_keys(client):
    headers = _register(client)
    r = client.get("/api/community/channels", headers=headers)
    assert r.status_code == 200
    body = r.json()
    assert isinstance(body, list)
    assert len(body) > 0
    for c in body:
        assert CHANNEL_KEYS <= set(c), c
        assert isinstance(c["online_count"], int)


def test_channels_include_frontend_ids(client):
    headers = _register(client)
    r = client.get("/api/community/channels", headers=headers)
    ids = [c["id"] for c in r.json()]
    for expected in ("forex", "metals", "indices", "energy"):
        assert expected in ids, ids


# --- empty channel ---


def test_messages_empty_channel_is_empty_list(client):
    headers = _register(client)
    r = client.get("/api/community/channels/forex/messages", headers=headers)
    assert r.status_code == 200
    assert r.json() == []


# --- post returns bare message with right types ---


def test_post_returns_bare_message_with_types(client):
    headers = _register(client)
    r = client.post(
        "/api/community/channels/forex/messages",
        json={
            "content": "EURUSD looking strong",
            "sentiment": "bullish",
            "symbol_tag": "EURUSD",
            "sender_name": "Tarek",
        },
        headers=headers,
    )
    assert r.status_code == 200, r.text
    msg = r.json()
    assert MESSAGE_KEYS <= set(msg), msg
    assert isinstance(msg["id"], str)
    assert msg["channel_id"] == "forex"
    assert msg["sender_name"] == "Tarek"
    assert msg["content"] == "EURUSD looking strong"
    assert msg["sentiment"] == "bullish"
    assert msg["symbol_tag"] == "EURUSD"
    assert msg["badge"] == "Community"
    assert msg["avatar_bg"] == "bg-slate-600"
    assert isinstance(msg["likes"], int)
    assert msg["is_flagged"] is False
    assert isinstance(msg["created_at"], str)


def test_created_at_parses_as_iso(client):
    headers = _register(client)
    r = client.post(
        "/api/community/channels/forex/messages",
        json={"content": "check the timestamp"},
        headers=headers,
    )
    assert r.status_code == 200
    parsed = datetime.fromisoformat(r.json()["created_at"])
    assert parsed is not None


def test_post_then_get_roundtrip(client):
    headers = _register(client)
    r = client.post(
        "/api/community/channels/metals/messages",
        json={"content": "XAU at key level", "sentiment": "bearish", "symbol_tag": "XAUUSD"},
        headers=headers,
    )
    assert r.status_code == 200
    r2 = client.get("/api/community/channels/metals/messages", headers=headers)
    assert r2.status_code == 200
    msgs = r2.json()
    assert len(msgs) == 1
    m = msgs[0]
    assert m["content"] == "XAU at key level"
    assert m["sentiment"] == "bearish"
    assert m["symbol_tag"] == "XAUUSD"


# --- rate limit ---


def test_sixth_post_within_10s_is_429_with_retry_after(client):
    headers = _register(client)
    for i in range(5):
        r = client.post(
            "/api/community/channels/forex/messages",
            json={"content": f"msg {i}"},
            headers=headers,
        )
        assert r.status_code == 200, r.text
    r = client.post(
        "/api/community/channels/forex/messages",
        json={"content": "one more"},
        headers=headers,
    )
    assert r.status_code == 429
    assert r.headers.get("Retry-After") is not None


# --- banned word flagging ---


def test_banned_word_is_flagged(client):
    headers = _register(client)
    r = client.post(
        "/api/community/channels/forex/messages",
        json={"content": "this is a scam"},
        headers=headers,
    )
    assert r.status_code == 200
    assert r.json()["is_flagged"] is True


# --- validation errors ---


def test_empty_content_is_400(client):
    headers = _register(client)
    r = client.post(
        "/api/community/channels/forex/messages",
        json={"content": "   "},
        headers=headers,
    )
    assert r.status_code == 400


def test_content_over_1000_chars_is_400(client):
    headers = _register(client)
    r = client.post(
        "/api/community/channels/forex/messages",
        json={"content": "x" * 1001},
        headers=headers,
    )
    assert r.status_code == 400


def test_unknown_channel_404_get_and_post(client):
    headers = _register(client)
    r = client.get("/api/community/channels/nope/messages", headers=headers)
    assert r.status_code == 404
    r2 = client.post(
        "/api/community/channels/nope/messages", json={"content": "hi"}, headers=headers
    )
    assert r2.status_code == 404


def test_no_auth_is_401(client):
    assert client.get("/api/community/channels").status_code == 401
    assert (
        client.get("/api/community/channels/forex/messages").status_code == 401
    )
    assert (
        client.post(
            "/api/community/channels/forex/messages", json={"content": "hi"}
        ).status_code
        == 401
    )


# --- to_frontend_message unit test ---


def test_to_frontend_message_epoch_zero_maps_to_1970_utc():
    rec = {
        "id": 7,
        "channel": "forex",
        "user_id": "u9",
        "text": "hello",
        "mentions": [],
        "flagged": 0,
        "created_at": 0,
        "sentiment": None,
        "symbol_tag": None,
    }
    out = community_chat.to_frontend_message(rec)
    assert out["id"] == "7"
    assert out["channel_id"] == "forex"
    assert out["sender_name"] == "user-u9"
    assert out["content"] == "hello"
    assert out["created_at"] == "1970-01-01T00:00:00+00:00"
    assert out["sentiment"] == "neutral"
    assert out["symbol_tag"] is None
    assert out["badge"] == "Community"
    assert out["avatar_bg"] == "bg-slate-600"
    assert out["likes"] == 0
    assert out["is_flagged"] is False


# --- legacy body ---


def test_legacy_text_body_still_accepted(client):
    headers = _register(client)
    r = client.post(
        "/api/community/channels/forex/messages",
        json={"text": "legacy caller"},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    msg = r.json()
    assert msg["content"] == "legacy caller"
    assert msg["channel_id"] == "forex"
