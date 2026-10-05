"""
Tests for the T26 journal contract (frontend shapes from src/api/journal.ts).
"""

import sqlite3

import pytest
from fastapi.testclient import TestClient

import db
import journal_contract
import main

from core import db_conn


@pytest.fixture()
def client(tmp_path, monkeypatch):
    """Test client with temporary database."""
    path = tmp_path / "test_journal_contract.db"
    assert "souq-fx" not in str(path), f"Test DB must be outside repo: {path}"
    monkeypatch.setattr(db_conn, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    monkeypatch.setattr(db, "_PBKDF2_ITERATIONS", 1_000)
    db.init_db()
    return TestClient(main.app, raise_server_exceptions=False)


def _register(client, username):
    """Register a user and return auth headers."""
    r = client.post(
        "/api/auth/register",
        json={"username": username, "email": f"{username}@x.co", "password": "pass1234"},
    )
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}


FRONTEND_KEYS = {
    "id", "date", "symbol", "direction", "entry_price", "exit_price", "lots",
    "pnl", "tags", "emotion", "notes", "screenshot_url",
}


def _post_entry(client, headers, **overrides):
    body = {
        "date": "2024-05-01T10:00:00Z",
        "symbol": "EURUSD",
        "direction": "buy",
        "entry_price": 1.0850,
        "exit_price": 1.0900,
        "lots": 0.5,
        "pnl": 100.0,
        "tags": ["breakout"],
        "emotion": "disciplined",
        "notes": "front run",
        "screenshot_url": "https://example.com/s.png",
    }
    body.update(overrides)
    r = client.post("/api/journal/entries", json=body, headers=headers)
    assert r.status_code == 200, r.text
    return r.json()


def test_post_frontend_shape_returns_bare_entry_with_12_keys(client):
    headers = _register(client, "jc26_post")
    entry = _post_entry(client, headers)
    assert set(entry.keys()) == FRONTEND_KEYS
    assert isinstance(entry["id"], str)
    assert entry["date"] == "2024-05-01T10:00:00Z"
    assert entry["symbol"] == "EURUSD"
    assert entry["direction"] == "buy"
    assert entry["entry_price"] == 1.0850
    assert entry["exit_price"] == 1.0900
    assert entry["lots"] == 0.5
    assert entry["pnl"] == 100.0
    assert entry["tags"] == ["breakout"]
    assert entry["emotion"] == "disciplined"
    assert entry["notes"] == "front run"
    assert entry["screenshot_url"] == "https://example.com/s.png"


def test_trade_id_generated_server_side_when_absent(client):
    headers = _register(client, "jc26_gen")
    entry = _post_entry(client, headers)
    conn = sqlite3.connect(str(db_conn.DB_PATH))
    row = conn.execute(
        "SELECT trade_id FROM journal_entries WHERE id = ?", (int(entry["id"]),)
    ).fetchone()
    conn.close()
    assert row is not None
    assert row[0].startswith("EURUSD-")
    assert "trade_id" not in entry


def test_get_list_returns_list_and_empty_db_returns_empty(client):
    headers = _register(client, "jc26_list")
    r = client.get("/api/journal/entries", headers=headers)
    assert r.status_code == 200
    assert r.json() == []
    _post_entry(client, headers)
    _post_entry(client, headers, symbol="GBPUSD")
    r2 = client.get("/api/journal/entries", headers=headers)
    assert r2.status_code == 200
    assert isinstance(r2.json(), list)
    assert len(r2.json()) == 2
    for item in r2.json():
        assert set(item.keys()) == FRONTEND_KEYS


def test_roundtrip_preserves_extra_fields(client):
    headers = _register(client, "jc26_rt")
    created = _post_entry(
        client, headers,
        symbol="USDJPY", direction="sell",
        entry_price=154.2, exit_price=153.8, lots=2.0,
    )
    r = client.get(f"/api/journal/entries/{created['id']}", headers=headers)
    assert r.status_code == 200
    got = r.json()
    assert got["symbol"] == "USDJPY"
    assert got["direction"] == "sell"
    assert got["entry_price"] == 154.2
    assert got["exit_price"] == 153.8
    assert got["lots"] == 2.0


def test_patch_notes_and_exit_price_returns_bare_entry(client):
    headers = _register(client, "jc26_patch")
    created = _post_entry(client, headers, notes="old", exit_price=1.09)
    r = client.patch(
        f"/api/journal/entries/{created['id']}",
        json={"notes": "new note", "exit_price": 1.11},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    entry = r.json()
    assert set(entry.keys()) == FRONTEND_KEYS
    assert entry["id"] == created["id"]
    assert entry["notes"] == "new note"
    assert entry["exit_price"] == 1.11


def test_patch_unknown_id_returns_404(client):
    headers = _register(client, "jc26_patch404")
    r = client.patch("/api/journal/entries/99999", json={"notes": "x"}, headers=headers)
    assert r.status_code == 404


def test_delete_then_get_returns_404(client):
    headers = _register(client, "jc26_del")
    created = _post_entry(client, headers)
    r = client.delete(f"/api/journal/entries/{created['id']}", headers=headers)
    assert r.status_code == 200
    assert r.json() == {"deleted": True}
    r2 = client.get(f"/api/journal/entries/{created['id']}", headers=headers)
    assert r2.status_code == 404
    conn = sqlite3.connect(str(db_conn.DB_PATH))
    rows = conn.execute(
        "SELECT 1 FROM journal_extra WHERE entry_id = ?", (int(created["id"]),)
    ).fetchall()
    conn.close()
    assert rows == []


def test_new_emotions_accepted_and_invalid_emotion_400(client):
    headers = _register(client, "jc26_emotion")
    for emotion in ("fomo", "revenge", "disciplined"):
        r = client.post(
            "/api/journal/entries",
            json={"symbol": "EURUSD", "direction": "buy", "emotion": emotion},
            headers=headers,
        )
        assert r.status_code == 200, (emotion, r.text)
        assert r.json()["emotion"] == emotion
    r = client.post(
        "/api/journal/entries",
        json={"symbol": "EURUSD", "direction": "buy", "emotion": "ecstatic"},
        headers=headers,
    )
    assert r.status_code == 400


def test_invalid_direction_returns_400(client):
    headers = _register(client, "jc26_dir")
    r = client.post(
        "/api/journal/entries",
        json={"symbol": "EURUSD", "direction": "hold"},
        headers=headers,
    )
    assert r.status_code == 400


def test_stats_empty_db(client):
    headers = _register(client, "jc26_stats_empty")
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


def test_stats_known_numbers(client):
    headers = _register(client, "jc26_stats")
    for pnl in (100.0, 50.0, -50.0):
        client.post(
            "/api/journal/entries",
            json={"symbol": "EURUSD", "direction": "buy", "pnl": pnl, "tags": ["breakout"]},
            headers=headers,
        )
    r = client.get("/api/journal/stats", headers=headers)
    assert r.status_code == 200
    stats = r.json()
    assert stats["total_trades"] == 3
    assert stats["winning_trades"] == 2
    assert stats["losing_trades"] == 1
    assert stats["win_rate"] == 66.7
    assert stats["total_pnl"] == 100.0
    assert stats["profit_factor"] == 3.0
    assert stats["by_tag"][0] == {
        "tag": "breakout",
        "count": 3,
        "win_rate": 67,
        "total_pnl": 100.0,
    }


def test_stats_only_wins_profit_factor_99_9(client):
    headers = _register(client, "jc26_stats_wins")
    client.post(
        "/api/journal/entries",
        json={"symbol": "EURUSD", "direction": "buy", "pnl": 25.0},
        headers=headers,
    )
    r = client.get("/api/journal/stats", headers=headers)
    assert r.status_code == 200
    assert r.json()["profit_factor"] == 99.9


def test_user_isolation_between_users(client):
    headers_a = _register(client, "jc26_iso_a")
    headers_b = _register(client, "jc26_iso_b")
    created = _post_entry(client, headers_a, notes="a note")
    r = client.get("/api/journal/entries", headers=headers_b)
    assert r.status_code == 200
    assert r.json() == []
    r2 = client.get(f"/api/journal/entries/{created['id']}", headers=headers_b)
    assert r2.status_code == 404
    r3 = client.get("/api/journal/stats", headers=headers_b)
    assert r3.json()["total_trades"] == 0
    r4 = client.get("/api/journal/entries", headers=headers_a)
    assert len(r4.json()) == 1


def test_unauthenticated_returns_401(client):
    assert client.get("/api/journal/entries").status_code == 401
    assert client.post("/api/journal/entries", json={"symbol": "X"}).status_code == 401
    assert client.get("/api/journal/entries/1").status_code == 401
    assert client.patch("/api/journal/entries/1", json={}).status_code == 401
    assert client.delete("/api/journal/entries/1").status_code == 401
    assert client.get("/api/journal/stats").status_code == 401


def test_compute_stats_empty_and_known(tmp_path):
    empty = journal_contract.compute_stats([])
    assert empty["total_trades"] == 0
    assert empty["by_tag"] == []
    assert empty["profit_factor"] == 0.0

    entries = [
        {"pnl": 100.0, "tags": ["breakout"]},
        {"pnl": 50.0, "tags": ["breakout"]},
        {"pnl": -50.0, "tags": ["breakout"]},
    ]
    stats = journal_contract.compute_stats(entries)
    assert stats["total_trades"] == 3
    assert stats["winning_trades"] == 2
    assert stats["losing_trades"] == 1
    assert stats["win_rate"] == 66.7
    assert stats["total_pnl"] == 100.0
    assert stats["profit_factor"] == 3.0
    assert stats["by_tag"] == [
        {"tag": "breakout", "count": 3, "win_rate": 67, "total_pnl": 100.0}
    ]

    wins = [{"pnl": 10.0, "tags": []}]
    assert journal_contract.compute_stats(wins)["profit_factor"] == 99.9
    breakeven = [{"pnl": 0.0, "tags": []}]
    assert journal_contract.compute_stats(breakeven)["profit_factor"] == 0.0


def test_to_frontend_entry_with_and_without_extra(tmp_path):
    conn = sqlite3.connect(str(tmp_path / "t26_unit.db"))
    journal_contract.init_extra(conn)

    rec = {
        "id": 7,
        "user_id": "1",
        "trade_id": "T7",
        "notes": "n",
        "tags": ["a"],
        "emotion": "neutral",
        "screenshot_url": None,
        "pnl": 5.0,
        "created_at": 1700000000.0,
        "updated_at": 1700000000.0,
    }

    entry = journal_contract.to_frontend_entry(rec, None)
    assert entry["id"] == "7"
    assert entry["symbol"] == ""
    assert entry["direction"] == "buy"
    assert entry["entry_price"] == 0.0
    assert entry["exit_price"] == 0.0
    assert entry["lots"] == 0.0
    assert entry["pnl"] == 5.0
    assert entry["tags"] == ["a"]
    assert entry["date"].startswith("2023-11-14")

    journal_contract.save_extra(conn, 7, {"symbol": "XAUUSD", "direction": "sell",
                                          "entry_price": 2000.0, "lots": 1.0})
    extra = journal_contract.get_extra(conn, 7)
    entry2 = journal_contract.to_frontend_entry(rec, extra)
    assert entry2["symbol"] == "XAUUSD"
    assert entry2["direction"] == "sell"
    assert entry2["entry_price"] == 2000.0
    assert entry2["lots"] == 1.0
    assert entry2["exit_price"] == 0.0
    conn.close()

    with pytest.raises(ValueError):
        journal_contract.to_frontend_entry(rec, {"direction": "hold"})
    conn2 = sqlite3.connect(str(tmp_path / "t26_unit2.db"))
    journal_contract.init_extra(conn2)
    with pytest.raises(ValueError):
        journal_contract.save_extra(conn2, 8, {"lots": float("nan")})
    with pytest.raises(ValueError):
        journal_contract.save_extra(conn2, 9, {"direction": "hold"})
    conn2.close()


def test_old_caller_trade_id_still_works(client):
    headers = _register(client, "jc26_old")
    r = client.post(
        "/api/journal/entries",
        json={"trade_id": "T-OLD-1", "notes": "legacy", "pnl": 3.0},
        headers=headers,
    )
    assert r.status_code == 200, r.text
    entry = r.json()
    assert entry["id"]
    assert "trade_id" not in entry
    conn = sqlite3.connect(str(db_conn.DB_PATH))
    row = conn.execute(
        "SELECT trade_id FROM journal_entries WHERE id = ?", (int(entry["id"]),)
    ).fetchone()
    conn.close()
    assert row[0] == "T-OLD-1"
