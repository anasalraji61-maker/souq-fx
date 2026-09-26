"""قرار أنس ١٤: مكافأة التوازن 5% عند مستوى مؤهل فقط (2، 4، 8…)، والتسجيل برمز إحالة يكتب سطر عمولة،
والشهر بتوقيت UTC. قاعدة SQLite مؤقتة (`tmp_path`) — لا يُلمس `backend/matrix.db`."""
from __future__ import annotations

import calendar
import os
import time

import pytest

import commissions as comm
import db
from core import db_conn


@pytest.fixture()
def _db(tmp_path, monkeypatch):
    monkeypatch.setattr(db_conn, "DB_PATH", tmp_path / "test_matrix.db")
    monkeypatch.setattr(db, "_PBKDF2_ITERATIONS", 1_000)
    db.init_db()


def _ledger(earner_id: int) -> list[tuple[str, str]]:
    with db._conn() as c:
        return [(r["source_username"], r["kind"]) for r in c.execute(
            "SELECT source_username, kind FROM commission_ledger WHERE earner_id=? ORDER BY id", (earner_id,)
        )]


@pytest.mark.parametrize("left, right, role, pays", [
    (1, 1, "trader", False), (2, 2, "trader", True), (3, 3, "trader", False), (4, 4, "trader", True),
    (16, 16, "trader", True), (32, 32, "trader", False), (32, 32, "company", True), (2, 3, "trader", False),
    (0, 0, "trader", False),
])
def test_balance_bonus_only_at_a_qualifying_level(left, right, role, pays):
    assert comm.pays_balance_bonus(left, right, role) is pays
    out = comm.rate_summary(left, right, role)
    assert out["balance_bonus_rate"] == (0.05 if pays else 0.0)
    assert out["effective_rate"] == (0.15 if pays else 0.10)
    assert out["balance_bonus_qualifies"] is pays


def test_ledger_pays_the_bonus_at_2_2_not_at_1_1_or_3_3(_db):
    sp = db.register_user("sponsor1", "password1", email="s@example.com")["user_id"]
    a = db.place_under_sponsor(sp, "leftone", "password1", "left")["user_id"]
    b = db.place_under_sponsor(sp, "rightone", "password1", "right")["user_id"]
    assert _ledger(sp) == [("leftone", "direct"), ("rightone", "direct")]  # 1=1: لا مكافأة
    db.place_under_sponsor(sp, "lefttwo", "password1", "left", under_user_id=a)
    db.place_under_sponsor(sp, "righttwo", "password1", "left", under_user_id=b)
    assert _ledger(sp)[-2:] == [("righttwo", "direct"), ("righttwo", "balance_bonus")]  # 2=2
    c = db.get_network_member(sp)
    assert (c["left_count"], c["right_count"]) == (2, 2)


def test_register_with_sponsor_code_writes_a_commission_line(_db):
    s = db.register_user("sponsor1", "password1", email="s@example.com")
    db.register_user("newbie", "password1", email="n@example.com", sponsor_code=s["referral_code"], side="left")
    assert _ledger(s["user_id"]) == [("newbie", "direct")]
    report = db.get_commission_report(s["user_id"])
    assert report["monthly"][0]["direct_points"] == 10.0


def test_commission_month_is_utc(_db, monkeypatch):
    uid = db.register_user("sponsor1", "password1", email="s@example.com")["user_id"]
    monkeypatch.setenv("TZ", "Asia/Baghdad")  # UTC+3: 23:30 UTC آخر سبتمبر = أكتوبر محلياً
    time.tzset()
    try:
        now = calendar.timegm((2026, 9, 30, 23, 30, 0))
        with db._conn() as c:
            db._log_commission_on_place(c, uid, uid, "x", now)
            mk = c.execute("SELECT month_key FROM commission_ledger WHERE earner_id=?", (uid,)).fetchone()[0]
    finally:
        monkeypatch.delenv("TZ")
        time.tzset()
    assert mk == "2026-09"
