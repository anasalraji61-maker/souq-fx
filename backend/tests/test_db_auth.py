"""اختبارات تجزئة كلمات المرور والدخول — `db._encode_password` / `_verify_password` /
`register_user` / `login_user` بدوالّها الحقيقية على قاعدة SQLite مؤقتة.

**لماذا هذا الملف**: الانتقال من `sha256(salt:password)` بجولة واحدة إلى
PBKDF2-HMAC-SHA256 جرى التحقّق منه وقتها بسكربتات عابرة لم تبقَ بالمستودع — أي أن أي
تعديل لاحق على `db.py` لا يملك ما يكشف تراجعاً. الأخطر تحديداً ثلاثة مسارات صامتة:
**الترقية الكسولة** (صفّ قديم يدخل فيُعاد كتابته)، و**عدم الترقية عند فشل الدخول**،
و**عدم التنازل** لعدد جولات أقلّ. كلها هنا.

القاعدة المؤقتة خارج المستودع دائماً (`tmp_path` الذي يعطيه pytest)، ولا يُلمَس
`backend/matrix.db` إطلاقاً — حارس صريح بـ`_db` أدناه.
"""
from __future__ import annotations

import hashlib
import sqlite3

import pytest

import db
from core import db_conn

# عدد جولات صغير للاختبارات وحده: 210,000 جولة × عشرات الاستدعاءات = دقائق بلا أي
# قيمة إضافية (المنطق واحد أياً كان العدد). القيمة الحقيقية يحرسها
# `test_real_iteration_count_is_not_lowered` بلا تجزئة.
_FAST_ITERATIONS = 1_000


@pytest.fixture()
def _db(tmp_path, monkeypatch):
    """قاعدة نظيفة لكل اختبار + جولات سريعة."""
    path = tmp_path / "test_matrix.db"
    assert "souq-fx" not in str(path), f"قاعدة الاختبار يجب أن تكون خارج المستودع: {path}"
    monkeypatch.setattr(db_conn, "DB_PATH", path)
    monkeypatch.setattr(db, "_PBKDF2_ITERATIONS", _FAST_ITERATIONS)
    db.init_db()
    return path


def _legacy_hash(password: str, salt: str) -> str:
    """الصيغة القديمة كما كانت تُكتب حرفياً قبل الترقية — محسوبة هنا لا مستوردة."""
    return f"{salt}${hashlib.sha256(f'{salt}:{password}'.encode()).hexdigest()}"


def _stored_hash(path, username: str) -> str:
    con = sqlite3.connect(path)
    try:
        row = con.execute(
            "SELECT password_hash FROM users WHERE username=?", (username,)
        ).fetchone()
    finally:
        con.close()
    assert row is not None
    return str(row[0])


# ─── صيغة التجزئة ────────────────────────────────────────────────────────────

def test_encode_password_shape(_db):
    stored = db._encode_password("hunter2")
    algo, iters, salt, digest = stored.split("$")
    assert algo == "pbkdf2_sha256"
    assert int(iters) == _FAST_ITERATIONS
    assert len(salt) == 32 and int(salt, 16) >= 0          # token_hex(16)
    assert len(digest) == 64 and int(digest, 16) >= 0      # sha256 hex


def test_same_password_gets_a_different_salt_each_time(_db):
    a = db._encode_password("hunter2")
    b = db._encode_password("hunter2")
    assert a != b
    assert a.split("$")[2] != b.split("$")[2]


def test_real_iteration_count_is_not_lowered():
    """حارس ضد خفض الجولات بتعديل لاحق — بلا تجزئة فعلية (لا تبطئة)."""
    assert db._PBKDF2_ITERATIONS >= 210_000
    assert db._PBKDF2_ALGO == "pbkdf2_sha256"


# ─── _verify_password ────────────────────────────────────────────────────────

def test_verify_roundtrip_correct_password(_db):
    ok, needs = db._verify_password("hunter2", db._encode_password("hunter2"))
    assert (ok, needs) == (True, False)


def test_verify_rejects_wrong_password(_db):
    ok, needs = db._verify_password("wrong", db._encode_password("hunter2"))
    assert (ok, needs) == (False, False)


def test_legacy_hash_verifies_and_asks_for_rehash(_db):
    stored = _legacy_hash("hunter2", "abc123")
    assert db._verify_password("hunter2", stored) == (True, True)


def test_legacy_hash_rejects_wrong_password(_db):
    stored = _legacy_hash("hunter2", "abc123")
    assert db._verify_password("wrong", stored) == (False, False)


def test_lower_iteration_count_asks_for_rehash(_db):
    weak = db._hash_password_pbkdf2("hunter2", "abc123", 10)
    stored = f"pbkdf2_sha256$10$abc123${weak}"
    assert db._verify_password("hunter2", stored) == (True, True)


def test_higher_iteration_count_is_never_downgraded(_db):
    strong_iters = _FAST_ITERATIONS * 4
    digest = db._hash_password_pbkdf2("hunter2", "abc123", strong_iters)
    stored = f"pbkdf2_sha256${strong_iters}$abc123${digest}"
    assert db._verify_password("hunter2", stored) == (True, False)


@pytest.mark.parametrize(
    "stored",
    [
        "",
        "$",
        "pbkdf2_sha256$",
        "pbkdf2_sha256$abc$salt$hash",        # جولات ليست رقماً
        "pbkdf2_sha256$0$salt$hash",          # صفر جولات
        "pbkdf2_sha256$-5$salt$hash",         # جولات سالبة
        "pbkdf2_sha256$1000$$hash",           # بلا ملح
        "pbkdf2_sha256$1000$salt$",           # بلا تجزئة
        "pbkdf2_sha256$1000$مِلح$hash",        # ملح غير ASCII → UnicodeEncodeError مُلتقَط
        "nosalt-and-no-dollar",
        "pbkdf2_sha256$1000$salt$hash$extra", # الجزء الرابع يبتلع الزائد ثم لا يطابق
    ],
)
def test_malformed_stored_hashes_are_rejected_without_raising(_db, stored):
    assert db._verify_password("hunter2", stored) == (False, False)


def test_none_stored_hash_is_rejected(_db):
    assert db._verify_password("hunter2", None) == (False, False)  # type: ignore[arg-type]


# ─── register_user / login_user ──────────────────────────────────────────────

def _register(username="trader1", password="hunter2", email="t1@example.com"):
    return db.register_user(username, password, email=email)


def test_register_then_login_by_username(_db):
    _register()
    assert db.login_user("trader1", "hunter2")["token"]


def test_register_then_login_by_email_case_insensitively(_db):
    _register()
    assert db.login_user("T1@EXAMPLE.COM", "hunter2")["token"]


def test_login_with_wrong_password_raises(_db):
    _register()
    with pytest.raises(ValueError):
        db.login_user("trader1", "wrong")


def test_unknown_user_raises(_db):
    with pytest.raises(ValueError):
        db.login_user("nobody", "hunter2")


def test_stored_hash_is_never_the_plaintext(_db):
    _register()
    assert "hunter2" not in _stored_hash(_db, "trader1")


def test_registration_writes_the_new_format(_db):
    _register()
    assert _stored_hash(_db, "trader1").startswith("pbkdf2_sha256$")


def test_arabic_password_roundtrips(_db):
    _register(password="كلمة-سرّ-٢٠٢٦")
    assert db.login_user("trader1", "كلمة-سرّ-٢٠٢٦")["token"]
    with pytest.raises(ValueError):
        db.login_user("trader1", "كلمة-سرّ-٢٠٢٧")


# ─── الترقية الكسولة ─────────────────────────────────────────────────────────

def _downgrade_to_legacy(path, username: str, password: str, salt: str = "oldsalt") -> str:
    legacy = _legacy_hash(password, salt)
    con = sqlite3.connect(path)
    try:
        con.execute(
            "UPDATE users SET password_hash=? WHERE username=?", (legacy, username)
        )
        con.commit()
    finally:
        con.close()
    return legacy


def test_legacy_row_logs_in_and_is_upgraded_in_place(_db):
    _register()
    legacy = _downgrade_to_legacy(_db, "trader1", "hunter2")
    assert _stored_hash(_db, "trader1") == legacy

    assert db.login_user("trader1", "hunter2")["token"]

    upgraded = _stored_hash(_db, "trader1")
    assert upgraded != legacy
    assert upgraded.startswith(f"pbkdf2_sha256${_FAST_ITERATIONS}$")
    # وكلمة المرور نفسها ما زالت تعمل بعد الترقية
    assert db.login_user("trader1", "hunter2")["token"]


def test_failed_login_does_not_upgrade_the_row(_db):
    _register()
    legacy = _downgrade_to_legacy(_db, "trader1", "hunter2")
    with pytest.raises(ValueError):
        db.login_user("trader1", "wrong")
    assert _stored_hash(_db, "trader1") == legacy


def test_weak_iteration_row_is_upgraded_on_login(_db):
    _register()
    weak = f"pbkdf2_sha256$10$abc123${db._hash_password_pbkdf2('hunter2', 'abc123', 10)}"
    con = sqlite3.connect(_db)
    con.execute("UPDATE users SET password_hash=? WHERE username=?", (weak, "trader1"))
    con.commit()
    con.close()

    assert db.login_user("trader1", "hunter2")["token"]
    assert _stored_hash(_db, "trader1").startswith(f"pbkdf2_sha256${_FAST_ITERATIONS}$")


def test_two_users_with_the_same_password_get_different_hashes(_db):
    _register("trader1", "samepass", "a@example.com")
    _register("trader2", "samepass", "b@example.com")
    assert _stored_hash(_db, "trader1") != _stored_hash(_db, "trader2")
