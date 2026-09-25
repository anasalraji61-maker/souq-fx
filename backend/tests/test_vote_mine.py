"""`mine` على فكرة التصويت (ui2): الواجهة تُخفي أفكار أسماء محظورة، وحظر اسم مطابق لاسم المتداول
كان يُخفي فكرته هو — `my_choice` صوتُه لا ملكيّته، فلم يكن لها ما تستثني به."""
from __future__ import annotations

import sqlite3

import pytest
from fastapi.testclient import TestClient

import db
import main
from core import db_conn

BODY = {"symbol": "EURUSD", "direction": "buy", "entry": 1.1, "sl": 1.0, "tp": 1.2, "note": "فكرة"}


@pytest.fixture()
def client(tmp_path, monkeypatch):
    path = tmp_path / "test_vote_mine.db"
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


def _mine(client, headers: dict | None = None) -> dict[str, bool]:
    return {v["id"]: v["mine"] for v in client.get("/api/votes", headers=headers or {}).json()["votes"]}


def test_own_idea_is_mine_and_others_are_not(client):
    ali, sara = _register(client, "ali"), _register(client, "sara")
    r = client.post("/api/votes", json=BODY, headers=ali).json()
    assert r["vote"]["mine"] is True and r["vote"]["my_choice"] is None
    vid = r["vote"]["id"]
    assert _mine(client, ali) == {vid: True}
    assert _mine(client, sara) == {vid: False}
    assert _mine(client) == {vid: False}  # المجهول لا يملك شيئاً


def test_voting_on_an_idea_does_not_make_it_mine(client):
    ali, sara = _register(client, "ali"), _register(client, "sara")
    vid = client.post("/api/votes", json=BODY, headers=ali).json()["vote"]["id"]
    v = client.post("/api/votes/ballot", json={"vote_id": vid, "choice": "agree"}, headers=sara).json()["vote"]
    assert v["my_choice"] == "agree" and v["mine"] is False
    v = client.post("/api/votes/ballot", json={"vote_id": vid, "choice": "agree"}, headers=ali).json()["vote"]
    assert v["mine"] is True


def test_legacy_ideas_are_backfilled_from_the_author_name(client):
    ali = _register(client, "Ali")
    with sqlite3.connect(db.DB_PATH) as c:
        c.execute("ALTER TABLE votes RENAME TO votes_new")
        c.execute(
            """CREATE TABLE votes (id TEXT PRIMARY KEY, symbol TEXT NOT NULL, direction TEXT NOT NULL,
               entry REAL, sl REAL, tp REAL, note TEXT, agree INTEGER DEFAULT 0,
               disagree INTEGER DEFAULT 0, author TEXT, ts TEXT NOT NULL)"""
        )
        c.execute("DROP TABLE votes_new")
        for vid, author in (("v_old", "ali"), ("v_legacy", db._LEGACY_VOTE_AUTHOR), ("v_anon", None)):
            c.execute(
                "INSERT INTO votes(id,symbol,direction,author,ts) VALUES(?,?,?,?,?)",
                (vid, "EURUSD", "buy", author, "10:00"),
            )
    db.init_db()
    assert _mine(client, ali) == {"v_old": True, "v_legacy": False, "v_anon": False}
