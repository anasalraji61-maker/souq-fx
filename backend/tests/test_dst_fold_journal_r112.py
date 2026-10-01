"""run 112: الساعة المكرَّرة عند نهاية التوقيت الصيفي (خادم بتوقيت أوروبي). 2025-10-26: 03:00 CEST ⇒ 02:00 CET.
صفقة فُتحت 00:40Z (02:40 صيفي) وأُغلقت 01:10Z (02:10 شتوي) = 30 دقيقة حقيقية، والنصّ المحلّي «02:10 < 02:40»."""
import time

import pytest

import db
from tests.test_trades_routes import _DEV1, client  # noqa: F401  (fixture)


@pytest.fixture
def berlin(monkeypatch):
    monkeypatch.setenv("TZ", "Europe/Berlin")
    time.tzset()
    yield
    monkeypatch.undo()
    time.tzset()


def _open(client, **extra):
    body = {"symbol": "BTCUSD", "side": "buy", "entry": 60000, "opened_at": "2025-10-26T00:40:00Z", **extra}
    r = client.post("/api/trades", headers=_DEV1, json=body)
    assert r.status_code == 200, r.text
    return r.json()["trade"]


def test_create_closed_across_fold_is_accepted(client, berlin):
    t = _open(client, exit=60600, closed_at="2025-10-26T01:10:00Z")
    assert (t["opened_at"], t["closed_at"]) == ("2025-10-26 02:40", "2025-10-26 02:10")


def test_close_and_patch_across_fold_are_accepted(client, berlin):
    tid = _open(client)["id"]
    r = client.post(f"/api/trades/{tid}/close", headers=_DEV1,
                    json={"exit": 60600, "closed_at": "2025-10-26T01:10:00Z"})
    assert r.status_code == 200, r.text
    r = client.patch(f"/api/trades/{tid}", headers=_DEV1, json={"closed_at": "2025-10-26T01:05:00Z"})
    assert r.status_code == 200, r.text
    assert r.json()["trade"]["closed_at"] == "2025-10-26 02:05"


def test_close_now_inside_fold_is_not_pushed_to_open_time(berlin, monkeypatch):
    # «الآن» = 02:10 الشتوي، الفتح 02:40 الصيفي ⇒ الختم 02:10 لا 02:40 المختلَق
    monkeypatch.setattr(db.time, "strftime", lambda fmt, *a: "2025-10-26 02:10")
    assert db._close_stamp("2025-10-26 02:40") == "2025-10-26 02:10"


def test_outside_fold_order_still_enforced(client, berlin):
    assert db.journal_time_before("2025-10-26 01:50", "2025-10-26 02:40")  # 01:50 ليست مكرَّرة
    assert db.journal_time_before("2025-10-25 02:10", "2025-10-25 02:40")  # اليوم السابق
    assert db._close_stamp("2099-01-01 10:00") == "2099-01-01 10:00"
    r = client.post("/api/trades", headers=_DEV1, json={
        "symbol": "BTCUSD", "side": "buy", "entry": 60000, "exit": 60600,
        "opened_at": "2025-10-26T01:40:00Z", "closed_at": "2025-10-26T00:10:00Z"})  # 02:40 شتوي ثم 02:10 صيفي
    assert r.status_code == 200  # غامض نصّياً (كلاهما بالساعة المكرَّرة) — لا يُحكم بالسبق
    r = client.post("/api/trades", headers=_DEV1, json={
        "symbol": "BTCUSD", "side": "buy", "entry": 60000, "exit": 60600,
        "opened_at": "2025-10-26T03:00:00Z", "closed_at": "2025-10-26T02:00:00Z"})
    assert r.status_code == 422



def test_iso_times_across_fold_keep_the_real_order(client, berlin):
    # run 113: كان closed_at_iso = 02:10+02:00 (00:10Z) — قبل الفتح وساعة قبل ما أرسله العميل (01:10Z)
    t = _open(client, exit=60600, closed_at="2025-10-26T01:10:00Z")
    assert t["opened_at_iso"] == "2025-10-26T02:40:00+02:00"
    assert t["closed_at_iso"] == "2025-10-26T02:10:00+01:00"


def test_iso_single_fold_time_keeps_first_pass(client, berlin):
    t = _open(client, exit=60600, closed_at="2025-10-26T00:50:00Z")
    assert (t["opened_at_iso"], t["closed_at_iso"]) == ("2025-10-26T02:40:00+02:00", "2025-10-26T02:50:00+02:00")
