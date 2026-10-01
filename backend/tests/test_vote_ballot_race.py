"""`db.ballot` تحت طلبات متزامنة: ضغطتان على «أعارض» (أو جهازان) كانتا تقرآن الخيار السابق
«أوافق» قبل أي كتابة فتنقلان الصوت مرتين (موافقة −2، معارضة +2 ⇒ صوت متداول آخر يُمحى)،
وأول صوتين متزامنين كان ثانيهما يصطدم بالمفتاح الأساسي ⇒ 500."""
from __future__ import annotations

import threading

import pytest
from fastapi.testclient import TestClient

import db
import main
from core import db_conn

BODY = {"symbol": "EURUSD", "direction": "buy", "entry": 1.1, "sl": 1.0, "tp": 1.2, "note": "فكرة"}
THREADS = 12
ROUNDS = 5


@pytest.fixture()
def client(tmp_path, monkeypatch):
    path = tmp_path / "test_vote_race.db"
    monkeypatch.setattr(db_conn, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    monkeypatch.setattr(db, "_PBKDF2_ITERATIONS", 1_000)
    db.init_db()
    return TestClient(main.app, raise_server_exceptions=False)


def _register(client, username: str) -> tuple[dict, int]:
    r = client.post(
        "/api/auth/register",
        json={"username": username, "email": f"{username}@example.com", "password": "pass1234"},
    )
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}"}, int(r.json()["user_id"])


def _concurrently(fn) -> list[BaseException]:
    barrier = threading.Barrier(THREADS)
    errors: list[BaseException] = []

    def run():
        barrier.wait()
        try:
            fn()
        except BaseException as e:  # noqa: BLE001 — نجمعها لنفشل الاختبار بها
            errors.append(e)

    ts = [threading.Thread(target=run) for _ in range(THREADS)]
    for t in ts:
        t.start()
    for t in ts:
        t.join()
    return errors


def _counts(vid: str) -> tuple[int, int]:
    with db_conn._conn() as c:
        row = c.execute("SELECT agree, disagree FROM votes WHERE id=?", (vid,)).fetchone()
    return int(row["agree"]), int(row["disagree"])


def test_concurrent_switches_move_the_vote_once(client):
    ali, _ = _register(client, "ali")
    _, sara_id = _register(client, "sara")
    _, omar_id = _register(client, "omar")
    for _ in range(ROUNDS):
        vid = client.post("/api/votes", json=BODY, headers=ali).json()["vote"]["id"]
        db.ballot(vid, "agree", omar_id)  # صوت متداول آخر — يجب ألا يُمحى
        db.ballot(vid, "agree", sara_id)
        assert _counts(vid) == (2, 0)
        errors = _concurrently(lambda: db.ballot(vid, "disagree", sara_id))
        assert not errors, errors
        assert _counts(vid) == (1, 1)


def test_concurrent_first_votes_count_once_without_error(client):
    ali, _ = _register(client, "ali")
    _, sara_id = _register(client, "sara")
    for _ in range(ROUNDS):
        vid = client.post("/api/votes", json=BODY, headers=ali).json()["vote"]["id"]
        errors = _concurrently(lambda: db.ballot(vid, "agree", sara_id))
        assert not errors, errors
        assert _counts(vid) == (1, 0)
