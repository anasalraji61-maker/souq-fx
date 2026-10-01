"""tools130a: journal times carry the server's UTC offset (per row, DST-correct) so the app can show device time."""
import os
import time

import pytest

import main
from tests.test_trades_routes import _DEV1, client  # noqa: F401  (fixture)


@pytest.fixture
def ny_tz():
    old = os.environ.get("TZ")
    os.environ["TZ"] = "America/New_York"
    time.tzset()
    yield
    if old is None:
        os.environ.pop("TZ", None)
    else:
        os.environ["TZ"] = old
    time.tzset()


def test_journal_iso_offset_follows_dst(ny_tz):
    assert main._journal_iso("2026-01-15 10:00") == "2026-01-15T10:00:00-05:00"
    assert main._journal_iso("2026-07-15 10:00") == "2026-07-15T10:00:00-04:00"


def test_journal_iso_unreadable_is_none():
    for v in (None, "", "yesterday", "2026-13-01 10:00", 5):
        assert main._journal_iso(v) is None


def test_trades_list_carries_iso_and_offset(client, ny_tz):
    r = client.post("/api/trades", headers=_DEV1, json={
        "symbol": "EURUSD", "side": "buy", "entry": 1.10, "exit": 1.11,
        "opened_at": "2026-08-01T14:00:00Z", "closed_at": "2026-08-02T14:30:00Z"})
    assert r.status_code == 200, r.text
    t = r.json()["trade"]
    assert t["opened_at"] == "2026-08-01 10:00"  # stored in server time, as before
    assert t["opened_at_iso"] == "2026-08-01T10:00:00-04:00"
    assert t["closed_at_iso"] == "2026-08-02T10:30:00-04:00"
    body = client.get("/api/trades", headers=_DEV1).json()
    assert body["server_utc_offset_min"] in (-240, -300)
    row = next(x for x in body["trades"] if x["id"] == t["id"])
    assert row["opened_at_iso"] == t["opened_at_iso"]


def test_iso_round_trips_through_patch(client, ny_tz):
    r = client.post("/api/trades", headers=_DEV1, json={
        "symbol": "EURUSD", "side": "buy", "entry": 1.10, "exit": 1.11,
        "opened_at": "2026-08-01 10:00", "closed_at": "2026-08-02 10:00"})
    t = r.json()["trade"]
    back = client.patch(f"/api/trades/{t['id']}", headers=_DEV1, json={"closed_at": t["closed_at_iso"]})
    assert back.json()["trade"]["closed_at"] == "2026-08-02 10:00"


def test_open_trade_has_null_closed_at_iso(client):
    t = client.post("/api/trades", headers=_DEV1, json={
        "symbol": "EURUSD", "side": "sell", "entry": 1.10}).json()["trade"]
    assert t["closed_at_iso"] is None and t["opened_at_iso"]
