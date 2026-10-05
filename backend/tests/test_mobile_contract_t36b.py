"""T36b mobile contract: layouts + custom watchlist field names.

Tests verify request/response field names match mobile/src/api.ts expectations.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import db
import main
from core import db_conn


@pytest.fixture()
def client(tmp_path, monkeypatch):
    path = tmp_path / "test_mobile_contract_t36b.db"
    monkeypatch.setattr(db_conn, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    monkeypatch.setattr(db, "_PBKDF2_ITERATIONS", 1_000)
    db.init_db()
    return TestClient(main.app, raise_server_exceptions=False)


def _register(client, username: str) -> dict:
    r = client.post(
        "/api/auth/register",
        json={"username": username, "email": f"{username}@example.com", "password": "pass1234"},
    )
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


# ===== Layouts =====

def test_get_layouts_empty(client):
    """GET /api/layouts on a fresh user returns 200 and {"layouts": []}."""
    headers = _register(client, "t36b_user")
    r = client.get("/api/layouts", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert "layouts" in data
    assert data["layouts"] == []


def test_post_layout_with_id(client):
    """POST /api/layouts with id returns 200, ok=True, layout is dict."""
    headers = _register(client, "t36b_user")
    r = client.post(
        "/api/layouts",
        json={"id": "lay1", "name": "A", "payload": {"x": 1}},
        headers=headers,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is True
    assert isinstance(data["layout"], dict)
    assert data["layout"]["id"] == "lay1"
    assert data["layout"]["name"] == "A"
    assert data["layout"]["payload"] == {"x": 1}


def test_get_layouts_after_save(client):
    """After save, GET /api/layouts has one item with id, name, payload keys."""
    headers = _register(client, "t36b_user")
    client.post(
        "/api/layouts",
        json={"id": "lay1", "name": "A", "payload": {"x": 1}},
        headers=headers,
    )
    r = client.get("/api/layouts", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert "layouts" in data
    layouts = data["layouts"]
    assert len(layouts) == 1
    item = layouts[0]
    assert "id" in item
    assert "name" in item
    assert "payload" in item
    assert item["id"] == "lay1"
    assert item["name"] == "A"
    assert item["payload"] == {"x": 1}


def test_post_layout_without_id(client):
    """POST /api/layouts without id succeeds and saved layout gets non-empty id."""
    headers = _register(client, "t36b_user")
    r = client.post(
        "/api/layouts",
        json={"name": "B", "payload": {"y": 2}},
        headers=headers,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is True
    assert isinstance(data["layout"], dict)
    layout_id = data["layout"].get("id")
    assert layout_id and isinstance(layout_id, str) and len(layout_id) > 0


def test_delete_layout(client):
    """DELETE /api/layouts/lay1 returns ok=True, deleted=1. Second delete returns deleted=0."""
    headers = _register(client, "t36b_user")
    # First save
    client.post(
        "/api/layouts",
        json={"id": "lay1", "name": "A", "payload": {"x": 1}},
        headers=headers,
    )
    # First delete
    r = client.delete("/api/layouts/lay1", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is True
    assert data["deleted"] == 1
    # Second delete
    r2 = client.delete("/api/layouts/lay1", headers=headers)
    assert r2.status_code == 200
    data2 = r2.json()
    assert data2["ok"] is True
    assert data2["deleted"] == 0


# ===== Custom Watchlist =====

def test_get_custom_watchlist_empty(client):
    """GET /api/watchlist/custom returns 200 and symbols is a list."""
    headers = _register(client, "t36b_user")
    r = client.get("/api/watchlist/custom", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert "symbols" in data
    assert isinstance(data["symbols"], list)
    assert data["symbols"] == []


def test_post_custom_watchlist(client):
    """POST /api/watchlist/custom with symbol returns ok=True and EURUSD in symbols."""
    headers = _register(client, "t36b_user")
    r = client.post(
        "/api/watchlist/custom",
        json={"symbol": "eurusd"},
        headers=headers,
    )
    assert r.status_code == 200
    data = r.json()
    assert data["ok"] is True
    assert "symbols" in data
    assert isinstance(data["symbols"], list)
    assert "EURUSD" in data["symbols"]
    # Following GET contains EURUSD
    r2 = client.get("/api/watchlist/custom", headers=headers)
    assert r2.status_code == 200
    data2 = r2.json()
    assert "EURUSD" in data2["symbols"]


def test_post_custom_watchlist_no_duplicate(client):
    """Adding the same symbol twice does not duplicate it."""
    headers = _register(client, "t36b_user")
    client.post("/api/watchlist/custom", json={"symbol": "eurusd"}, headers=headers)
    client.post("/api/watchlist/custom", json={"symbol": "eurusd"}, headers=headers)
    r = client.get("/api/watchlist/custom", headers=headers)
    assert r.status_code == 200
    data = r.json()
    assert "symbols" in data
    assert isinstance(data["symbols"], list)
    assert data["symbols"].count("EURUSD") == 1


def test_post_custom_watchlist_empty_body_returns_422(client):
    """POST /api/watchlist/custom with empty body returns 422, not 500."""
    headers = _register(client, "t36b_user")
    r = client.post("/api/watchlist/custom", json={}, headers=headers)
    assert r.status_code == 422


def test_post_custom_watchlist_missing_symbol_returns_422(client):
    """POST /api/watchlist/custom with missing symbol returns 422, not 500."""
    headers = _register(client, "t36b_user")
    r = client.post("/api/watchlist/custom", json={"other": "value"}, headers=headers)
    assert r.status_code == 422