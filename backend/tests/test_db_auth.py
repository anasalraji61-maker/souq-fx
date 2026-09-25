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


# ─── «Ali» و«ali» حساب واحد ────────────────────────────────────────────────

def test_a_username_differing_only_in_case_is_taken(_db):
    _register("Ali", email="a@example.com")
    with pytest.raises(ValueError, match="taken"):
        _register("ali", email="b@example.com")
    with pytest.raises(ValueError, match="taken"):
        _register("ALI", email="c@example.com")


def test_the_database_itself_refuses_a_case_twin(_db):
    """الفهرس لا فحص التطبيق وحده: أي مسار إدراج مستقبلي يصطدم به."""
    import sqlite3

    _register("Ali", email="a@example.com")
    with db._conn() as c, pytest.raises(sqlite3.IntegrityError):
        c.execute("INSERT INTO users(username,password_hash,created_at) VALUES('aLi','x',0)")


def test_login_is_case_insensitive_on_the_username(_db):
    _register("Ali", password="hunter2", email="a@example.com")
    session = db.login_user("ali", "hunter2")
    assert session["username"] == "Ali"


def test_an_existing_case_collision_does_not_break_startup_or_guess_on_login(tmp_path, monkeypatch):
    """قاعدة قديمة فيها «Ali» و«ali» فعلاً: الترحيل لا يسقط، والدخول بصيغة ثالثة لا يختار أحدهما."""
    import sqlite3

    path = tmp_path / "legacy.db"
    monkeypatch.setattr(db_conn, "DB_PATH", path)
    monkeypatch.setattr(db, "_PBKDF2_ITERATIONS", _FAST_ITERATIONS)
    with sqlite3.connect(path) as c:
        c.execute("CREATE TABLE users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, "
                  "password_hash TEXT NOT NULL, created_at REAL NOT NULL)")
        pw = db._encode_password("hunter2")
        c.execute("INSERT INTO users(username,password_hash,created_at) VALUES('Ali',?,0)", (pw,))
        c.execute("INSERT INTO users(username,password_hash,created_at) VALUES('ali',?,0)", (pw,))
    db.init_db()  # لا يسقط
    assert db.login_user("Ali", "hunter2")["username"] == "Ali", "المطابقة الحرفية أولاً"
    with pytest.raises(ValueError):
        db.login_user("ALI", "hunter2")
    with pytest.raises(ValueError, match="taken"):
        _register("aLI", email="z@example.com")


# ── وضع عضو تحت راعٍ: كلمة مرور قصيرة ─────────────────────────────────────────────
def _sponsor() -> int:
    return db.register_user("sponsor1", "pass1234", email="s1@example.com")["user_id"]


def test_place_member_short_password_is_rejected_not_silently_replaced(_db):
    """«abc» كانت تُستبدل بعشوائية لا تُعاد (`temp_password` None) ⇒ حساب لا يدخله أحد أبداً."""
    sid = _sponsor()
    with pytest.raises(ValueError, match="password too short"):
        db.place_under_sponsor(sid, "dave", "abc", "left")
    # لم يُنشأ العضو ولم تُحجز الساق
    assert db.place_under_sponsor(sid, "dave", "abcd", "left")["ok"]
    assert db.login_user("dave", "abcd")


def test_place_member_blank_password_returns_the_generated_one(_db):
    sid = _sponsor()
    out = db.place_under_sponsor(sid, "erin", "", "right")
    assert out["temp_password"]
    assert db.login_user("erin", out["temp_password"])


# ─── أسماء محجوزة ومحارف لا تُرى (backend-r47) ─────────────────────────────

@pytest.mark.parametrize("name", ["deleted_user_2", "Deleted_User_2", "DELETED_USER_x", "أنت"])
def test_reserved_names_cannot_be_registered(_db, name):
    with pytest.raises(ValueError, match="reserved"):
        db.register_user(name, "hunter2", email="r@example.com")


@pytest.mark.parametrize("name", ["alice​", "al‍ice", "ａｌｉｃｅ", "ali ce", "ali\tce", "‮ecila"])
def test_invisible_or_look_alike_characters_are_rejected(_db, name):
    with pytest.raises(ValueError, match="invisible"):
        db.register_user(name, "hunter2", email="r@example.com")


@pytest.mark.parametrize("name", ["ali ahmed", "علي_الفوركس", "Trader-7"])
def test_ordinary_names_still_register(_db, name):
    assert db.register_user(name, "hunter2", email="ok@example.com")["username"] == name


def test_a_squatted_placeholder_no_longer_blocks_account_deletion(_db):
    """اسم «deleted_user_N» مسجَّل قبل الحجز كان يجعل حذف الحساب N يفشل (UNIQUE) فتبقى بياناته وجلسته."""
    victim = _register()
    with sqlite3.connect(_db) as c:  # قبل الحجز: إدراج مباشر
        c.execute(
            "INSERT INTO users(username,password_hash,created_at) VALUES(?,?,0)",
            (f"Deleted_User_{victim['user_id']}", "x$y"),
        )
    db.delete_user_account(victim["user_id"])
    assert db.user_from_token(victim["token"]) is None
    with sqlite3.connect(_db) as c:
        name, email = c.execute(
            "SELECT username, email FROM users WHERE id=?", (victim["user_id"],)
        ).fetchone()
    assert name.startswith(f"deleted_user_{victim['user_id']}_") and email is None


def test_direction_marks_pasted_around_an_arabic_name_are_trimmed_not_rejected(_db):
    """نسخ اسم عربي ولصقه يجلب LRM/RLM/ALM بالطرفين — كان يُرفض «محارف مخفية» (launch142b)."""
    out = db.register_user("‏علي_الفوركس‎ ", "hunter2", email="a@example.com")
    assert out["username"] == "علي_الفوركس"
    assert db.login_user("؜علي_الفوركس", "hunter2")["username"] == "علي_الفوركس"


def test_a_direction_mark_inside_the_name_is_still_rejected(_db):
    with pytest.raises(ValueError, match="invisible"):
        db.register_user("ali‏ce", "hunter2", email="a@example.com")


def test_zwnj_between_arabic_letters_is_a_real_name(_db):
    assert db.register_user("می‌خواهم", "hunter2", email="z@example.com")["username"] == "می‌خواهم"


@pytest.mark.parametrize("name", ["alice‌", "ali‌ce", "‌علي", "علي‌"])
def test_zwnj_elsewhere_is_still_invisible(_db, name):
    with pytest.raises(ValueError, match="invisible"):
        db.register_user(name, "hunter2", email="z@example.com")


def test_a_deleted_accounts_referral_code_no_longer_carries_the_name_or_sponsors(_db):
    """رمز «ALICE0001» كان يبقى بشجرة الآخرين (جزء من الاسم المحذوف) ويقبل تسجيلات تحت حساب لا يملكه أحد."""
    alice = db.register_user("alice", "hunter2", email="alice@example.com")
    old_code = alice["referral_code"]
    db.delete_user_account(alice["user_id"])
    with sqlite3.connect(_db) as c:
        (code,) = c.execute(
            "SELECT referral_code FROM network_members WHERE user_id=?", (alice["user_id"],)
        ).fetchone()
    assert "ALICE" not in code
    for attempt in (old_code, code, code.lower()):
        with pytest.raises(ValueError, match="sponsor code not found"):
            db.register_user("bob", "hunter2", email="bob@example.com", sponsor_code=attempt, side="right")


def test_a_live_referral_code_still_sponsors(_db):
    alice = db.register_user("alice", "hunter2", email="alice@example.com")
    bob = db.register_user(
        "bob", "hunter2", email="bob@example.com", sponsor_code=alice["referral_code"], side="left"
    )
    assert bob["user_id"]
