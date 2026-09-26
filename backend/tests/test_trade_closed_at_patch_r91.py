"""Run 91: PATCH can carry the real close time; reopen + re-close no longer has to invent 'now'."""
from tests.test_trades_routes import _DEV1, client  # noqa: F401  (fixture)


def _backdated(client):
    r = client.post("/api/trades", headers=_DEV1, json={
        "symbol": "EURUSD", "side": "buy", "entry": 1.10, "exit": 1.11,
        "opened_at": "2026-08-01 10:00", "closed_at": "2026-08-02 10:00"})
    assert r.status_code == 200, r.text
    return r.json()["trade"]["id"]


def _patch(client, tid, body):
    return client.patch(f"/api/trades/{tid}", headers=_DEV1, json=body)


def test_reclose_with_real_closed_at(client):
    tid = _backdated(client)
    assert _patch(client, tid, {"exit": None}).json()["trade"]["closed_at"] is None
    r = _patch(client, tid, {"exit": 1.11, "closed_at": "2026-08-02 10:00"})
    assert r.status_code == 200
    t = r.json()["trade"]
    assert t["closed_at"] == "2026-08-02 10:00" and t["status"] == "closed"


def test_closed_at_null_means_unknown(client):
    tid = _backdated(client)
    t = _patch(client, tid, {"closed_at": None}).json()["trade"]
    assert t["closed_at"] is None and t["status"] == "closed"


def test_correct_closed_at_of_closed_trade(client):
    tid = _backdated(client)
    t = _patch(client, tid, {"closed_at": "2026-08-03T09:15"}).json()["trade"]
    assert t["closed_at"] == "2026-08-03 09:15"


def test_closed_at_on_open_trade_is_422(client):
    tid = _backdated(client)
    r = _patch(client, tid, {"exit": None, "closed_at": "2026-08-02 10:00"})
    assert r.status_code == 422


def test_closed_at_before_opened_is_422(client):
    tid = _backdated(client)
    assert _patch(client, tid, {"closed_at": "2026-07-01 10:00"}).status_code == 422


def test_closed_at_in_future_is_422(client):
    tid = _backdated(client)
    assert _patch(client, tid, {"closed_at": "2099-01-01 10:00"}).status_code == 422
