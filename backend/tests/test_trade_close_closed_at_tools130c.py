"""tools130c: POST /close carries the real close time (reopened-by-edit trade closed from the exit field)."""
import time

from tests.test_trades_routes import _DEV1, client  # noqa: F401  (fixture)
from tests.test_trade_closed_at_patch_r91 import _backdated, _patch


def _close(client, tid, body):
    return client.post(f"/api/trades/{tid}/close", headers=_DEV1, json=body)


def test_close_keeps_real_closed_at(client):
    tid = _backdated(client)
    _patch(client, tid, {"exit": None})
    r = _close(client, tid, {"exit": 1.11, "closed_at": "2026-08-02T10:00"})
    assert r.status_code == 200, r.text
    t = r.json()["trade"]
    assert t["closed_at"] == "2026-08-02 10:00" and t["status"] == "closed"
    assert r.json()["trade"]["pnl"] > 0


def test_close_without_closed_at_is_now(client):
    tid = _backdated(client)
    _patch(client, tid, {"exit": None})
    for body in ({"exit": 1.11}, {"exit": 1.11, "closed_at": None}):
        before = time.strftime("%Y-%m-%d %H:%M")
        t = _close(client, tid, body).json()["trade"]
        assert t["closed_at"] >= before
        _patch(client, tid, {"exit": None})


def test_close_before_opened_is_422_and_trade_stays_open(client):
    tid = _backdated(client)
    _patch(client, tid, {"exit": None})
    r = _close(client, tid, {"exit": 1.11, "closed_at": "2026-07-01 10:00"})
    assert r.status_code == 422
    assert r.json()["detail"]["error"] == "invalid_closed_at"
    rows = client.get("/api/trades", headers=_DEV1).json()["trades"]
    assert next(t for t in rows if t["id"] == tid)["status"] == "open"


def test_close_future_or_garbage_closed_at_is_422(client):
    tid = _backdated(client)
    _patch(client, tid, {"exit": None})
    assert _close(client, tid, {"exit": 1.11, "closed_at": "2099-01-01 10:00"}).status_code == 422
    assert _close(client, tid, {"exit": 1.11, "closed_at": "yesterday"}).status_code == 422


def test_already_closed_still_409_with_closed_at(client):
    tid = _backdated(client)
    r = _close(client, tid, {"exit": 1.2, "closed_at": "2026-07-01 10:00"})
    assert r.status_code == 409
    assert r.json()["detail"]["trade"]["exit"] == 1.11
