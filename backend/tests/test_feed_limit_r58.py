"""رسائل المجموعة والأفكار: الحدّ (200) يُطبَّق بعد إخفاء المُبلَّغ عنه، لا قبله."""
from __future__ import annotations

import pytest

import db
from core import db_conn


@pytest.fixture()
def fresh(tmp_path, monkeypatch):
    path = tmp_path / "test_feed.db"
    monkeypatch.setattr(db_conn, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    db.init_db()


def test_group_limit_counts_visible_only(fresh):
    for i in range(6):
        db.add_group_message({"id": f"ok{i}", "user": "a", "text": "hi", "ts": "t", "created_at": i})
    for i in range(4):
        db.add_group_message({"id": f"spam{i}", "user": "s", "text": "x", "ts": "t", "created_at": 10 + i})
        db.report_content("group_message", f"spam{i}", 7, "spam")
    got = [m["id"] for m in db.group_messages(viewer_id=7, limit=5)]
    assert got == ["ok1", "ok2", "ok3", "ok4", "ok5"]


def test_votes_limit_counts_visible_only(fresh):
    base = {"symbol": "EURUSD", "direction": "buy", "entry": 1.1, "sl": 1.0, "tp": 1.2, "note": "",
            "agree": 0, "disagree": 0, "author": "a", "ts": "t"}
    for i in range(4):
        db.create_vote({**base, "id": f"ok{i}", "created_at": i})
    for i in range(3):
        db.create_vote({**base, "id": f"bad{i}", "created_at": 10 + i})
        db.report_content("vote", f"bad{i}", 7, "spam")
    assert [v["id"] for v in db.list_votes(user_id=7, limit=3)] == ["ok3", "ok2", "ok1"]


def test_moderation_queue_oldest_first_and_total(fresh, monkeypatch):
    clock = iter(range(1000, 2000))
    monkeypatch.setattr(db.time, "time", lambda: float(next(clock)))
    for i in range(3):
        db.add_group_message({"id": f"m{i}", "user": "a", "text": "x", "ts": "t", "created_at": i})
        db.report_content("group_message", f"m{i}", 5, "spam")
    # بلاغ جديد على الأقدم لا يُخرجه من رأس القائمة
    db.report_content("group_message", "m0", 6, "spam")
    assert [r["target_id"] for r in db.list_reports(limit=2)] == ["m0", "m1"]
    assert db.count_reported_items() == 3
