"""run 61: كتابة بيانات شخصية تسابق حذف الحساب — المسار صادق، ثم التُزم الحذف (جلسات وبيانات)، ثم أُدرج الصفّ
⇒ كانت الصفقة/التنبيه/التخطيط تُحفظ باسم `user_id` المحذوف ولا يمحوها شيء بعدها. الآن `db._lock_owner`."""
from __future__ import annotations

import threading

import pytest
from fastapi.testclient import TestClient

import db
import main
from core import db_conn


@pytest.fixture()
def fresh(tmp_path, monkeypatch):
    path = tmp_path / "test_write_race.db"
    monkeypatch.setattr(db_conn, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    monkeypatch.setattr(db, "_PBKDF2_ITERATIONS", 1_000)
    db.init_db()


@pytest.fixture()
def gone(fresh):
    """(المستخدم كما قرأته المصادقة، التوكن) — ثم حُذف الحساب قبل الكتابة."""
    u = db.register_user("alice", "pass1234", email="a@example.com")
    user = db.user_from_token(u["token"])
    db.delete_user_account(user["user_id"])
    return user, u["token"]


def _count(table: str) -> int:
    with db._conn() as c:
        return c.execute(f"SELECT COUNT(*) FROM {table}").fetchone()[0]


WRITES = [
    ("trades", lambda uid: db.add_trade({"symbol": "EURUSD", "side": "buy", "entry": 1.1}, uid)),
    ("alerts", lambda uid: db.create_alert(
        {"id": "a1", "symbol": "EURUSD", "condition": "above", "price": 1.2, "ts": 1.0}, uid)),
    ("indicator_alerts", lambda uid: db.create_indicator_alert(
        {"id": "i1", "symbol": "EURUSD", "timeframe": "15m", "alert_type": "rsi", "condition": "above",
         "value": 70.0, "ts": 1.0}, uid)),
    ("layouts", lambda uid: db.save_layout(None, "L", {"a": 1}, uid)),
    ("watchlist", lambda uid: db.add_watchlist_symbol("EURUSD", uid)),
    ("academy_progress", lambda uid: db.save_progress(uid, "s", "l", 1)),
    ("push_tokens", lambda uid: db.save_push_token("ExponentPushToken[x]", "ios", uid)),
]


@pytest.mark.parametrize("table, write", WRITES, ids=[w[0] for w in WRITES])
def test_write_after_account_deletion_is_refused_and_leaves_no_row(gone, table, write):
    user, _ = gone
    before = _count(table)
    with pytest.raises(PermissionError):
        write(user["user_id"])
    assert _count(table) == before


@pytest.mark.parametrize("table, write", WRITES, ids=[w[0] for w in WRITES])
def test_live_account_and_anonymous_still_write(fresh, table, write):
    u = db.register_user("bob", "pass1234", email="b@example.com")
    write(db.user_from_token(u["token"])["user_id"])
    assert _count(table) == 1


def test_route_answers_401_not_500_when_account_vanished_mid_request(gone, monkeypatch):
    user, token = gone
    monkeypatch.setattr(main.db, "user_from_token", lambda t: user)  # المصادقة سبقت الحذف
    r = TestClient(main.app, raise_server_exceptions=False).post(
        "/api/trades", json={"symbol": "EURUSD", "side": "buy", "entry": 1.1},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert r.status_code == 401 and r.json() == {"detail": "login_required"}
    assert _count("trades") == 0


def test_concurrent_anonymous_watchlist_adds_store_one_row(fresh):
    """فحص «موجود؟» ثم إدراج بلا قفل: 8 إضافات متزامنة من جهاز مجهول كانت تحفظ الرمز حتى 3 مرّات."""
    barrier = threading.Barrier(8)

    def add():
        barrier.wait()
        db.add_watchlist_symbol("EURUSD", None, owner_key="install-race-device-0001")

    ts = [threading.Thread(target=add) for _ in range(8)]
    for t in ts:
        t.start()
    for t in ts:
        t.join()
    assert _count("watchlist") == 1
