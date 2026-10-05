"""
Tests for trade journal routes (T22b).
"""
import pytest
from fastapi.testclient import TestClient

import db
import main
from core import db_conn


@pytest.fixture()
def client(tmp_path, monkeypatch):
    """Test client with temporary database."""
    path = tmp_path / "test_journal.db"
    assert "souq-fx" not in str(path), f"Test DB must be outside repo: {path}"
    monkeypatch.setattr(db_conn, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    monkeypatch.setattr(db, "_PBKDF2_ITERATIONS", 1_000)
    db.init_db()
    return TestClient(main.app, raise_server_exceptions=False)


def _register(client, username="jr_u1"):
    """Register a user and return auth headers."""
    r = client.post(
        "/api/auth/register",
        json={"username": username, "email": f"{username}@x.co", "password": "pass1234"},
    )
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def test_create_unauthenticated(client):
    r = client.post("/api/journal/entries", json={"trade_id": "T1"})
    assert r.status_code == 401


def test_list_unauthenticated(client):
    r = client.get("/api/journal/entries")
    assert r.status_code == 401


def test_get_unauthenticated(client):
    r = client.get("/api/journal/entries/1")
    assert r.status_code == 401


def test_patch_unauthenticated(client):
    r = client.patch("/api/journal/entries/1", json={"notes": "hi"})
    assert r.status_code == 401


def test_delete_unauthenticated(client):
    r = client.delete("/api/journal/entries/1")
    assert r.status_code == 401


def test_stats_unauthenticated(client):
    r = client.get("/api/journal/stats")
    assert r.status_code == 401


def test_create_valid(client):
    headers = _register(client, "jr_u1")
    r = client.post(
        "/api/journal/entries",
        json={"trade_id": "T123", "notes": "my notes", "tags": ["a", "b"], "emotion": "confident", "screenshot_url": "https://example.com/img.png", "pnl": 12.5},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    entry = r.json()
    assert isinstance(entry, dict)
    assert entry["notes"] == "my notes"
    assert entry["tags"] == ["a", "b"]
    assert entry["emotion"] == "confident"
    assert entry["screenshot_url"] == "https://example.com/img.png"
    assert entry["pnl"] == 12.5
    assert isinstance(entry["id"], str)
    assert entry["date"]
    assert "trade_id" not in entry
    r_by_trade = client.get("/api/journal/entries?trade_id=T123", headers=headers)
    assert len(r_by_trade.json()) == 1


def test_create_empty_trade_id_returns_400(client):
    headers = _register(client, "jr_u1")
    r = client.post("/api/journal/entries", json={"trade_id": ""}, headers=headers)
    assert r.status_code == 400


def test_create_invalid_emotion_returns_400(client):
    headers = _register(client, "jr_u1")
    r = client.post("/api/journal/entries", json={"trade_id": "T1", "emotion": "ecstatic"}, headers=headers)
    assert r.status_code == 400


def test_get_returns_created_entry(client):
    headers = _register(client, "jr_u1")
    r = client.post("/api/journal/entries", json={"trade_id": "T1", "notes": "hi"}, headers=headers)
    assert r.status_code == 200
    entry_id = r.json()["id"]
    r2 = client.get(f"/api/journal/entries/{entry_id}", headers=headers)
    assert r2.status_code == 200
    assert r2.json()["id"] == entry_id
    assert r2.json()["notes"] == "hi"


def test_get_missing_id_returns_404(client):
    headers = _register(client, "jr_u1")
    r = client.get("/api/journal/entries/99999", headers=headers)
    assert r.status_code == 404


def test_list_filters_by_tag_and_trade_id(client):
    headers = _register(client, "jr_u1")
    client.post("/api/journal/entries", json={"trade_id": "T1", "tags": ["alpha"]}, headers=headers)
    client.post("/api/journal/entries", json={"trade_id": "T2", "tags": ["beta"]}, headers=headers)
    client.post("/api/journal/entries", json={"trade_id": "T3", "tags": ["alpha", "beta"]}, headers=headers)
    r_tag = client.get("/api/journal/entries?tag=alpha", headers=headers)
    assert r_tag.status_code == 200
    assert len(r_tag.json()) == 2
    r_trade = client.get("/api/journal/entries?trade_id=T2", headers=headers)
    assert r_trade.status_code == 200
    assert len(r_trade.json()) == 1
    r_none = client.get("/api/journal/entries?trade_id=NOPE", headers=headers)
    assert len(r_none.json()) == 0


def test_limit_and_offset_paginate(client):
    headers = _register(client, "jr_u1")
    for i in range(5):
        client.post("/api/journal/entries", json={"trade_id": f"T{i}", "notes": f"n{i}"}, headers=headers)
    r = client.get("/api/journal/entries?limit=2&offset=1", headers=headers)
    assert r.status_code == 200
    entries = r.json()
    assert len(entries) == 2
    assert entries[0]["notes"] == "n3"
    assert entries[1]["notes"] == "n2"


def test_patch_updates_notes_leaves_other_fields_unchanged(client):
    headers = _register(client, "jr_u1")
    r = client.post("/api/journal/entries", json={"trade_id": "T1", "notes": "old", "emotion": "neutral", "tags": ["x"], "pnl": 5.0}, headers=headers)
    entry_id = r.json()["id"]
    r2 = client.patch(f"/api/journal/entries/{entry_id}", json={"notes": "new"}, headers=headers)
    assert r2.status_code == 200
    entry = r2.json()
    assert entry["notes"] == "new"
    assert entry["emotion"] == "neutral"
    assert entry["tags"] == ["x"]
    assert entry["pnl"] == 5.0


def test_patch_missing_id_returns_404(client):
    headers = _register(client, "jr_u1")
    r = client.patch("/api/journal/entries/99999", json={"notes": "hi"}, headers=headers)
    assert r.status_code == 404


def test_patch_invalid_emotion_returns_400(client):
    headers = _register(client, "jr_u1")
    r = client.post("/api/journal/entries", json={"trade_id": "T1"}, headers=headers)
    entry_id = r.json()["id"]
    r2 = client.patch(f"/api/journal/entries/{entry_id}", json={"emotion": "ecstatic"}, headers=headers)
    assert r2.status_code == 400


def test_delete_returns_200_then_get_404_then_delete_404(client):
    headers = _register(client, "jr_u1")
    r = client.post("/api/journal/entries", json={"trade_id": "T1"}, headers=headers)
    entry_id = r.json()["id"]
    r2 = client.delete(f"/api/journal/entries/{entry_id}", headers=headers)
    assert r2.status_code == 200
    assert r2.json()["deleted"] is True
    r3 = client.get(f"/api/journal/entries/{entry_id}", headers=headers)
    assert r3.status_code == 404
    r4 = client.delete(f"/api/journal/entries/{entry_id}", headers=headers)
    assert r4.status_code == 404


def test_user_isolation(client):
    headers1 = _register(client, "jr_u1")
    headers2 = _register(client, "jr_u2")
    r = client.post("/api/journal/entries", json={"trade_id": "T1", "notes": "u1 note"}, headers=headers1)
    entry_id = r.json()["id"]
    r2 = client.get(f"/api/journal/entries/{entry_id}", headers=headers2)
    assert r2.status_code == 404
    r3 = client.patch(f"/api/journal/entries/{entry_id}", json={"notes": "hack"}, headers=headers2)
    assert r3.status_code == 404
    r4 = client.delete(f"/api/journal/entries/{entry_id}", headers=headers2)
    assert r4.status_code == 404
    r5 = client.get("/api/journal/entries", headers=headers2)
    assert r5.status_code == 200
    assert r5.json() == []


def test_stats_by_tag_known_numbers(client):
    headers = _register(client, "jr_u1")
    client.post("/api/journal/entries", json={"trade_id": "T1", "tags": ["a", "b"], "pnl": 10.0}, headers=headers)
    client.post("/api/journal/entries", json={"trade_id": "T2", "tags": ["a"], "pnl": -5.0}, headers=headers)
    client.post("/api/journal/entries", json={"trade_id": "T3", "tags": ["b"], "pnl": 20.0}, headers=headers)
    r = client.get("/api/journal/stats", headers=headers)
    assert r.status_code == 200
    stats = r.json()
    a = next(s for s in stats["by_tag"] if s["tag"] == "a")
    b = next(s for s in stats["by_tag"] if s["tag"] == "b")
    assert a == {"tag": "a", "count": 2, "win_rate": 50, "total_pnl": 5.0}
    assert b == {"tag": "b", "count": 2, "win_rate": 100, "total_pnl": 30.0}


def test_stats_empty_user_returns_empty(client):
    headers = _register(client, "jr_u1")
    r = client.get("/api/journal/stats", headers=headers)
    assert r.status_code == 200
    assert r.json() == {
        "total_trades": 0,
        "winning_trades": 0,
        "losing_trades": 0,
        "win_rate": 0.0,
        "total_pnl": 0.0,
        "profit_factor": 0.0,
        "by_tag": [],
    }