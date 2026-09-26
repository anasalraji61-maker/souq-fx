"""run 65: نقل صفوف الجهاز المجهولة إلى الحساب (`db.claim_device_rows`) وتصويت فكرة صفقة يسابقان حذف الحساب،
والرمز المكرَّر بقائمة المتابعة كان يبقى صفّاً مجهولاً فيعود بعد حذفه من هاتف آخر."""
from __future__ import annotations

import pytest

import db
from core import db_conn

K1 = "install-key-device-one-0001"
K2 = "install-key-device-two-0002"


@pytest.fixture()
def fresh(tmp_path, monkeypatch):
    path = tmp_path / "test_claim.db"
    monkeypatch.setattr(db_conn, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    monkeypatch.setattr(db, "_PBKDF2_ITERATIONS", 1_000)
    db.init_db()


def _uid(name: str) -> int:
    u = db.register_user(name, "pass1234", email=f"{name}@example.com")
    return int(db.user_from_token(u["token"])["user_id"])


def test_symbol_removed_on_other_device_does_not_come_back(fresh):
    db.add_watchlist_symbol("EURUSD", None, K1)          # K1 قبل الدخول
    uid = _uid("alice")
    db.add_watchlist_symbol("EURUSD", uid, K2)           # الحساب على K2
    db.claim_device_rows(uid, K1)                        # K1 يدخل
    assert db.get_watchlist(uid, K1) == ["EURUSD"]
    removed, left = db.remove_watchlist_symbol("EURUSD", uid, K2)
    assert removed == 1 and left == []
    assert db.get_watchlist(uid, K1) == []               # كان ["EURUSD"]
    assert db.get_watchlist(None, K1) == []              # ولا يبقى للمجهول بعد الخروج


def test_claim_keeps_other_device_symbols(fresh):
    db.add_watchlist_symbol("GBPUSD", None, K1)
    uid = _uid("alice")
    db.add_watchlist_symbol("EURUSD", uid, K2)
    assert db.claim_device_rows(uid, K1) == 1
    assert sorted(db.get_watchlist(uid, K2)) == ["EURUSD", "GBPUSD"]


def test_claim_for_deleted_account_leaves_device_rows_on_device(fresh):
    db.add_trade({"symbol": "EURUSD", "side": "buy", "entry": 1.1, "size": 0.1}, None, K1)
    db.add_watchlist_symbol("EURUSD", None, K1)
    uid = _uid("alice")
    db.delete_user_account(uid)
    assert db.claim_device_rows(uid, K1) == 0
    assert len(db.list_trades(None, K1)) == 1            # كانت تنتقل للحساب المحذوف وتختفي
    assert db.get_watchlist(None, K1) == ["EURUSD"]


def test_ballot_after_account_deletion_is_refused(fresh):
    author = _uid("bob")
    db.create_vote({"id": "v1", "symbol": "EURUSD", "direction": "buy", "entry": 1.1, "sl": 1.09,
                    "tp": 1.12, "note": "", "agree": 0, "disagree": 0, "author": "bob", "ts": 1.0}, author)
    voter = _uid("carol")
    db.delete_user_account(voter)
    with pytest.raises(PermissionError):
        db.ballot("v1", "agree", voter)
    with db._conn() as c:
        assert c.execute("SELECT COUNT(*) FROM vote_ballots").fetchone()[0] == 0
        assert c.execute("SELECT agree FROM votes WHERE id='v1'").fetchone()[0] == 0
