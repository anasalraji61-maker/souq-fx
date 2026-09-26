"""التسجيل كان يفحص الاسم بلا قفل ثم يُدرج ⇒ اسمان شبيهان متزامنان يُقبلان معاً."""
from __future__ import annotations

import threading

import pytest

import db
from core import db_conn


@pytest.fixture()
def fresh(tmp_path, monkeypatch):
    path = tmp_path / "reg_race.db"
    monkeypatch.setattr(db_conn, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    monkeypatch.setattr(db, "_PBKDF2_ITERATIONS", 1_000)
    db.init_db()


def _reg(name, out, **kw):
    try:
        out.append(db.register_user(name, "pw123456", email=f"{abs(hash(name))}@example.com", **kw)["user_id"])
    except ValueError as exc:
        out.append(str(exc))


def _race(monkeypatch, second):
    """يشغّل `second` بخيط آخر بعد أن يجتاز التسجيل الأول فحص الاسم وقبل أن يُدرج."""
    real = db._username_taken
    t: list[threading.Thread] = []

    def wrapped(c, username, exclude_id=None):
        res = real(c, username, exclude_id)
        if not t:
            monkeypatch.setattr(db, "_username_taken", real)
            t.append(threading.Thread(target=second))
            t[0].start()
            t[0].join(1.5)  # بلا قفل: ينتهي الثاني هنا ويُدرج قبل الأول
        return res

    monkeypatch.setattr(db, "_username_taken", wrapped)
    return t


def test_concurrent_lookalike_usernames_only_one_registers(fresh, monkeypatch):
    first: list = []
    second: list = []
    t = _race(monkeypatch, lambda: _reg("аlice", second))  # а سيريلية
    _reg("alice", first)
    t[0].join(10)
    results = first + second
    assert sum(isinstance(r, int) for r in results) == 1, results
    with db._conn() as c:
        assert c.execute("SELECT COUNT(*) FROM users").fetchone()[0] == 1

