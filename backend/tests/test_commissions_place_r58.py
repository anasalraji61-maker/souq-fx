"""`/api/commissions/place`: جانب واحد لكل ابن حتى مع طلبين متزامنين، ولا وضع تحت حساب محذوف."""
from __future__ import annotations

import threading

import pytest
from fastapi.testclient import TestClient

import db
import main
from core import db_conn


@pytest.fixture()
def client(tmp_path, monkeypatch):
    path = tmp_path / "test_place.db"
    monkeypatch.setattr(db_conn, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    monkeypatch.setattr(db, "_PBKDF2_ITERATIONS", 1_000)
    db.init_db()
    return TestClient(main.app, raise_server_exceptions=False)


def _auth(client, username: str) -> dict:
    r = client.post("/api/auth/register",
                    json={"username": username, "email": f"{username}@example.com", "password": "pass1234"})
    assert r.status_code == 200, r.text
    return {"Authorization": "Bearer " + r.json()["token"]}


def test_concurrent_place_same_side_only_one_wins(client, monkeypatch):
    h = _auth(client, "alice")
    orig = db._username_taken
    bar = threading.Barrier(2)

    def slow(c, u, *a):
        # يوسّع النافذة بين فحص الساق والإدراج: بلا قفل مسبق يجتاز الطلبان الفحص معاً
        if u in ("bobby", "carol"):
            try:
                bar.wait(timeout=1)
            except threading.BrokenBarrierError:
                pass
        return orig(c, u, *a)

    monkeypatch.setattr(db, "_username_taken", slow)
    codes = []

    def go(u):
        codes.append(client.post("/api/commissions/place",
                                 json={"username": u, "side": "left"}, headers=h).status_code)

    ts = [threading.Thread(target=go, args=(u,)) for u in ("bobby", "carol")]
    for t in ts:
        t.start()
    for t in ts:
        t.join()
    assert sorted(codes) == [200, 400]
    net = client.get("/api/commissions/me", headers=h).json()["network"]
    assert [d["side"] for d in net["directs"]] == ["left"]
    assert net["left_count"] == 1


def test_place_under_deleted_downline_rejected(client):
    h = _auth(client, "alice")
    r = client.post("/api/commissions/place",
                    json={"username": "bobby", "side": "left", "password": "pass1234"}, headers=h)
    bid = r.json()["user_id"]
    tok = client.post("/api/auth/login", json={"username": "bobby", "password": "pass1234"}).json()["token"]
    assert client.delete("/api/auth/account", headers={"Authorization": "Bearer " + tok}).status_code == 200
    before = client.get("/api/commissions/me", headers=h).json()["network"]["left_count"]
    r = client.post("/api/commissions/place",
                    json={"username": "danny", "side": "left", "under_user_id": bid}, headers=h)
    assert r.status_code == 400
    assert client.get("/api/commissions/me", headers=h).json()["network"]["left_count"] == before
    assert client.post("/api/auth/login", json={"username": "danny", "password": "x"}).status_code == 401
