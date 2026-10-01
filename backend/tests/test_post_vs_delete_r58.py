"""نشر يسابق حذف الحساب: المسار قرأ الاسم عند المصادقة، والحذف التُزم قبل الإدراج ⇒ لا رسالة/فكرة باسم المحذوف."""
from __future__ import annotations

import pytest

import db
import main
from core import db_conn


@pytest.fixture()
def alice(tmp_path, monkeypatch):
    path = tmp_path / "test_race.db"
    monkeypatch.setattr(db_conn, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    monkeypatch.setattr(db, "_PBKDF2_ITERATIONS", 1_000)
    db.init_db()
    u = db.register_user("alice", "pass1234", email="a@example.com")
    user = db.user_from_token(u["token"])
    db.delete_user_account(user["user_id"])
    return user


def test_group_post_after_delete_not_stored(alice):
    r = main.post_group(main.ChatMessage(text="hello"), alice)
    assert r == {"ok": False, "error": "login_required"}
    assert db.group_messages() == []


def test_vote_after_delete_not_stored(alice):
    body = main.VoteCreate(symbol="EURUSD", direction="buy", entry=1.1, sl=1.0, tp=1.2, note="")
    assert main.create_vote(body, alice) == {"ok": False, "error": "login_required"}
    assert db.list_votes() == []


def test_live_account_still_posts(tmp_path, monkeypatch):
    path = tmp_path / "live.db"
    monkeypatch.setattr(db_conn, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    monkeypatch.setattr(db, "_PBKDF2_ITERATIONS", 1_000)
    db.init_db()
    u = db.register_user("bob", "pass1234", email="b@example.com")
    user = db.user_from_token(u["token"])
    assert main.post_group(main.ChatMessage(text="hi"), user)["ok"] is True
    assert [m["user"] for m in db.group_messages()] == ["bob"]
