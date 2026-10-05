"""
Tests for chart drawings routes (T23).
"""
import pytest
from fastapi.testclient import TestClient

import db
import main
from core import db_conn


@pytest.fixture()
def client(tmp_path, monkeypatch):
    """Test client with temporary database."""
    path = tmp_path / "test_drawings.db"
    assert "souq-fx" not in str(path), f"Test DB must be outside repo: {path}"
    monkeypatch.setattr(db_conn, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    monkeypatch.setattr(db, "_PBKDF2_ITERATIONS", 1_000)
    db.init_db()
    return TestClient(main.app, raise_server_exceptions=False)


def _register(client, username="dr_u1"):
    """Register a user and return auth headers."""
    r = client.post(
        "/api/auth/register",
        json={"username": username, "email": f"{username}@x.co", "password": "pass1234"},
    )
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


def _trendline(points=None, **style):
    item = {
        "id": "client-1",
        "type": "trendline",
        "points": points or [
            {"time": 1700000000, "price": 1.10},
            {"time": 1700003600, "price": 1.12},
        ],
    }
    item.update(style)
    return item


def test_get_unauthenticated(client):
    r = client.get("/api/drawings", params={"symbol": "EURUSD", "timeframe": "4h"})
    assert r.status_code == 401


def test_post_unauthenticated(client):
    r = client.post(
        "/api/drawings", json=[_trendline()], params={"symbol": "EURUSD", "timeframe": "4h"}
    )
    assert r.status_code == 401


def test_get_empty_db_returns_list(client):
    headers = _register(client, "dr_u1")
    r = client.get("/api/drawings", params={"symbol": "EURUSD", "timeframe": "4h"}, headers=headers)
    assert r.status_code == 200, r.text
    assert r.json() == []


def test_post_get_roundtrip_preserves_client_id_and_style(client):
    headers = _register(client, "dr_u2")
    r = client.post(
        "/api/drawings",
        json=[_trendline(color="#ff0000", lineWidth=3, extra={"a": 1})],
        params={"symbol": "EURUSD", "timeframe": "4h"},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    assert r.json() == {"ok": True, "saved": 1, "skipped": 0}

    r = client.get("/api/drawings", params={"symbol": "EURUSD", "timeframe": "4h"}, headers=headers)
    assert r.status_code == 200, r.text
    items = r.json()
    assert len(items) == 1
    item = items[0]
    assert item["id"] == "client-1"
    assert item["type"] == "trendline"
    assert item["color"] == "#ff0000"
    assert item["lineWidth"] == 3
    assert item["extra"] == {"a": 1}
    assert item["points"] == [
        {"time": 1700000000, "price": 1.10},
        {"time": 1700003600, "price": 1.12},
    ]


def test_post_replaces_existing(client):
    headers = _register(client, "dr_u3")
    params = {"symbol": "EURUSD", "timeframe": "4h"}
    r = client.post(
        "/api/drawings",
        json=[_trendline(), _trendline(id="client-2")],
        params=params,
        headers=headers,
    )
    assert r.json() == {"ok": True, "saved": 2, "skipped": 0}

    r = client.post("/api/drawings", json=[_trendline(id="only")], params=params, headers=headers)
    assert r.json() == {"ok": True, "saved": 1, "skipped": 0}

    r = client.get("/api/drawings", params=params, headers=headers)
    items = r.json()
    assert len(items) == 1
    assert items[0]["id"] == "only"


def test_symbol_case_insensitive(client):
    headers = _register(client, "dr_u4")
    r = client.post(
        "/api/drawings",
        json=[_trendline()],
        params={"symbol": "eurusd", "timeframe": "4h"},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    r = client.get("/api/drawings", params={"symbol": "EURUSD", "timeframe": "4h"}, headers=headers)
    assert len(r.json()) == 1


def test_timeframe_isolation(client):
    headers = _register(client, "dr_u5")
    r = client.post(
        "/api/drawings",
        json=[_trendline()],
        params={"symbol": "EURUSD", "timeframe": "1h"},
        headers=headers,
    )
    assert r.json()["saved"] == 1
    r = client.get("/api/drawings", params={"symbol": "EURUSD", "timeframe": "4h"}, headers=headers)
    assert r.json() == []
    r = client.get("/api/drawings", params={"symbol": "EURUSD", "timeframe": "1h"}, headers=headers)
    assert len(r.json()) == 1


def test_user_isolation(client):
    h1 = _register(client, "dr_u6a")
    h2 = _register(client, "dr_u6b")
    params = {"symbol": "EURUSD", "timeframe": "4h"}
    r = client.post("/api/drawings", json=[_trendline()], params=params, headers=h1)
    assert r.json()["saved"] == 1
    r = client.get("/api/drawings", params=params, headers=h2)
    assert r.json() == []


def test_unsupported_type_skipped(client):
    headers = _register(client, "dr_u7")
    params = {"symbol": "EURUSD", "timeframe": "4h"}
    r = client.post(
        "/api/drawings",
        json=[_trendline(), {"id": "x", "type": "text", "points": [], "text": "hi"}],
        params=params,
        headers=headers,
    )
    assert r.status_code == 200, r.text
    assert r.json() == {"ok": True, "saved": 1, "skipped": 1}
    r = client.get("/api/drawings", params=params, headers=headers)
    assert len(r.json()) == 1


def test_invalid_points_returns_422_and_keeps_previous(client):
    headers = _register(client, "dr_u8")
    params = {"symbol": "EURUSD", "timeframe": "4h"}
    r = client.post("/api/drawings", json=[_trendline()], params=params, headers=headers)
    assert r.json()["saved"] == 1

    bad_price = _trendline(points=[{"time": 1700000000, "price": -1}, {"time": 1700003600, "price": 1.1}])
    r = client.post("/api/drawings", json=[bad_price], params=params, headers=headers)
    assert r.status_code == 422
    assert r.json()["detail"]

    bad_trendline = _trendline(points=[{"time": 1700000000, "price": 1.1}])
    r = client.post("/api/drawings", json=[bad_trendline], params=params, headers=headers)
    assert r.status_code == 422

    r = client.get("/api/drawings", params=params, headers=headers)
    assert len(r.json()) == 1


def test_empty_array_post_clears(client):
    headers = _register(client, "dr_u9")
    params = {"symbol": "EURUSD", "timeframe": "4h"}
    r = client.post("/api/drawings", json=[_trendline(), _trendline(id="c2")], params=params, headers=headers)
    assert r.json()["saved"] == 2
    r = client.post("/api/drawings", json=[], params=params, headers=headers)
    assert r.status_code == 200, r.text
    assert r.json() == {"ok": True, "saved": 0, "skipped": 0}
    r = client.get("/api/drawings", params=params, headers=headers)
    assert r.json() == []


def test_missing_symbol_param_returns_422(client):
    headers = _register(client, "dr_u10")
    r = client.get("/api/drawings", params={"timeframe": "4h"}, headers=headers)
    assert r.status_code == 422
    r = client.post("/api/drawings", json=[_trendline()], params={"timeframe": "4h"}, headers=headers)
    assert r.status_code == 422


def test_too_many_drawings_returns_422(client):
    headers = _register(client, "dr_u11")
    params = {"symbol": "EURUSD", "timeframe": "4h"}
    items = [_trendline(id=f"c{i}") for i in range(201)]
    r = client.post("/api/drawings", json=items, params=params, headers=headers)
    assert r.status_code == 422
    r = client.get("/api/drawings", params=params, headers=headers)
    assert r.json() == []
