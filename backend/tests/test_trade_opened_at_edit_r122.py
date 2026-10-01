"""tools150c: `opened_at` قابل للتعديل بـPATCH بقواعد `_journal_time`، والإغلاق لا يسبق الفتح بعد الدمج."""
from __future__ import annotations

import pytest

from tests.test_trades_routes import _DEV1, _open_trade, client  # noqa: F401 (fixture)


def _patch(client, tid, body):
    return client.patch(f"/api/trades/{tid}", json=body, headers=_DEV1)


def _row(client):
    return client.get("/api/trades", headers=_DEV1).json()["trades"][0]


def test_opened_at_now_by_mistake_can_be_corrected_and_then_closed_in_the_past(client):
    """سُجّلت «الآن» خطأً والإغلاق الحقيقي أمس ⇒ كان 422 للأبد (الإغلاق يسبق الفتح)."""
    t = _open_trade(client)
    r = _patch(client, t["id"], {"opened_at": "2026-08-01T10:00:00"})
    assert r.status_code == 200, r.text
    assert r.json()["trade"]["opened_at"] == "2026-08-01 10:00"
    r = _patch(client, t["id"], {"exit": 1.105, "closed_at": "2026-08-02T15:30:00"})
    assert r.status_code == 200, r.text
    assert _row(client)["closed_at"] == "2026-08-02 15:30"


def test_opened_at_and_closed_at_in_one_patch(client):
    t = _open_trade(client)
    r = _patch(client, t["id"], {"opened_at": "2026-08-01T10:00", "exit": 1.105, "closed_at": "2026-08-02T10:00"})
    assert r.status_code == 200, r.text
    assert (r.json()["trade"]["opened_at"], r.json()["trade"]["closed_at"]) == ("2026-08-01 10:00", "2026-08-02 10:00")


def test_opened_at_after_stored_close_is_422_and_row_unchanged(client):
    t = _open_trade(client, exit=1.105, opened_at="2026-08-01T10:00:00", closed_at="2026-08-02T10:00:00")
    r = _patch(client, t["id"], {"opened_at": "2026-08-03T10:00:00"})
    assert r.status_code == 422 and r.json()["detail"]["error"] == "invalid_opened_at"
    assert _row(client)["opened_at"] == "2026-08-01 10:00"


def test_closed_at_before_new_opened_at_in_same_patch_is_422(client):
    t = _open_trade(client)
    r = _patch(client, t["id"], {"opened_at": "2026-08-03T10:00", "exit": 1.105, "closed_at": "2026-08-02T10:00"})
    assert r.status_code == 422
    assert _row(client)["status"] == "open"


def test_closing_by_patch_stamps_now_not_before_new_opened_at(client):
    t = _open_trade(client)
    r = _patch(client, t["id"], {"opened_at": "2026-08-01T10:00", "exit": 1.105})
    assert r.status_code == 200
    tr = r.json()["trade"]
    assert tr["opened_at"] == "2026-08-01 10:00" and tr["closed_at"] >= tr["opened_at"]


@pytest.mark.parametrize("bad", ["2999-01-01T00:00", "1960-01-01T00:00", "yesterday"])
def test_opened_at_uses_journal_time_rules(client, bad):
    t = _open_trade(client)
    assert _patch(client, t["id"], {"opened_at": bad}).status_code == 422


def test_null_opened_at_is_ignored(client):
    t = _open_trade(client)
    r = _patch(client, t["id"], {"opened_at": None, "note": "x"})
    assert r.status_code == 200 and r.json()["trade"]["opened_at"] == t["opened_at"]


def test_seen_opened_at_mismatch_is_409(client):
    t = _open_trade(client)
    assert _patch(client, t["id"], {"opened_at": "2026-08-01T10:00"}).status_code == 200
    r = _patch(client, t["id"], {"note": "z", "seen_opened_at": t["opened_at"]})
    assert r.status_code == 409
    r = _patch(client, t["id"], {"note": "z", "seen_opened_at": "2026-08-01 10:00"})
    assert r.status_code == 200


def test_legacy_inverted_row_still_accepts_note_edit(client):
    """صفّ قديم إغلاقه قبل فتحه: فحص الترتيب يجري حين يُعدَّل الفتح فقط."""
    import db
    t = _open_trade(client, exit=1.105, opened_at="2026-08-01T10:00:00", closed_at="2026-08-02T10:00:00")
    with db._conn() as c:
        c.execute("UPDATE trades SET opened_at='2026-08-05 10:00' WHERE id=?", (t["id"],))
    assert _patch(client, t["id"], {"note": "fix later"}).status_code == 200
