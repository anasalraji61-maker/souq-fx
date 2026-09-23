"""اختبارات مسارات API الفعلية عبر `TestClient` — بوّابات المصادقة وعزل الملكية.

**لماذا هذا الملف**: كل ما بـ`backend/tests/` قبله كان يختبر دوالّ وحدات بمعزل
(`indicators`، `commissions`، `backtest`، `db`). لكن أخطر ما بهذا الخادم لا يظهر
بدالّة واحدة بل **بتركيب المسار**: من يُسمح له بالكتابة، وهل يرى متداولٌ صفوف غيره،
وهل يعيد المسار 401 أم يسقط بـ500 حين ينتهي التوكن. أول تشغيل لهذا الملف كشف فعلاً
`POST /api/academy/progress` يعيد **500** لكل طلب بلا توكن صالح (راجع
`test_progress_save_without_token_is_401`).

**بلا شبكة وبلا خلفية**: `TestClient(app)` بلا `with` فلا تعمل دورة `lifespan`
(لا عامل تنبيهات ولا WebSocket)، والمسارات المختبَرة كلها تقرأ/تكتب SQLite فقط —
لا `/api/news` ولا `/api/calendar` ولا أي مسار يستدعي مزوّد الأسعار.

القاعدة مؤقتة خارج المستودع دائماً (`tmp_path`) بحارس صريح، وجولات PBKDF2 تُخفَّض
للاختبارات وحدها (210,000 جولة × عشرات التسجيلات = دقائق بلا قيمة؛ العدد الحقيقي
يحرسه `test_db_auth.py`).
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import db
import main
from core import db_conn

_FAST_ITERATIONS = 1_000


@pytest.fixture()
def client(tmp_path, monkeypatch):
    """قاعدة نظيفة لكل اختبار + عميل بلا دورة حياة (بلا مهام خلفية)."""
    path = tmp_path / "test_routes.db"
    assert "souq-fx" not in str(path), f"قاعدة الاختبار يجب أن تكون خارج المستودع: {path}"
    monkeypatch.setattr(db_conn, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    monkeypatch.setattr(db, "_PBKDF2_ITERATIONS", _FAST_ITERATIONS)
    db.init_db()
    # raise_server_exceptions=False: خطأ غير مُعالَج يصل كـ500 حقيقي بدل أن يُرمى
    # بالاختبار — وهو بالضبط ما يجب أن يُرصد هنا لا أن يتحوّل لانهيار بالاختبار.
    return TestClient(main.app, raise_server_exceptions=False)


def _register(client, username: str, password: str = "pass1234") -> str:
    r = client.post(
        "/api/auth/register",
        json={"username": username, "email": f"{username}@example.com", "password": password},
    )
    assert r.status_code == 200, r.text
    return r.json()["token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


# ─── بوّابات المصادقة ────────────────────────────────────────────────────────

@pytest.mark.parametrize(
    "path",
    ["/api/auth/me", "/api/commissions/me", "/api/commissions/tree", "/api/commissions/report"],
)
def test_authed_get_routes_return_401_without_token(client, path):
    assert client.get(path).status_code == 401


def test_delete_account_requires_token(client):
    assert client.delete("/api/auth/account").status_code == 401


_PROGRESS_BODY = {
    "school_id": "s1",
    "lecture_id": "l1",
    "segment_index": 3,
    "completed": False,
}


def test_progress_save_without_token_is_401(client):
    """كان **500**: النوع المعلَن `dict` بينما `_auth_user` يعيد `None` بلا توكن،
    فـ`user["user_id"]` يرمي TypeError. ويُستدعى مع كل انتقال مقطع بقاعة المحاضرة —
    أي جلسة منتهية = خطأ خادم متكرّر بلا ما يدلّ العميل أن المطلوب إعادة دخول."""
    r = client.post("/api/academy/progress", json=_PROGRESS_BODY)
    assert r.status_code == 401, r.text


def test_progress_save_with_expired_or_bogus_token_is_401(client):
    r = client.post("/api/academy/progress", json=_PROGRESS_BODY, headers=_auth("not-a-real-token"))
    assert r.status_code == 401, r.text


def test_progress_get_for_anonymous_stays_an_empty_list(client):
    """عقد الشقيق GET لم يتغيّر: المجهول يقرأ قائمة فارغة لا 401 (الأكاديمية تُتصفَّح
    بلا حساب)، والكتابة وحدها هي ما يلزمها حساب."""
    r = client.get("/api/academy/progress")
    assert r.status_code == 200
    assert r.json() == {"progress": []}


def test_progress_round_trip_and_no_duplicate_rows(client):
    token = _register(client, "learner")
    assert client.post("/api/academy/progress", json=_PROGRESS_BODY, headers=_auth(token)).status_code == 200
    body2 = {**_PROGRESS_BODY, "segment_index": 7}
    assert client.post("/api/academy/progress", json=body2, headers=_auth(token)).status_code == 200
    rows = client.get("/api/academy/progress", headers=_auth(token)).json()["progress"]
    assert len(rows) == 1, "المفتاح الأساسي (user, school, lecture) يمنع تكرار الصف"
    assert rows[0]["segment_index"] == 7


# ─── التسجيل والدخول ────────────────────────────────────────────────────────

def test_register_then_login_by_username_and_email(client):
    _register(client, "trader1")
    by_name = client.post("/api/auth/login", json={"username": "trader1", "password": "pass1234"})
    assert by_name.status_code == 200 and by_name.json()["token"]
    by_mail = client.post(
        "/api/auth/login", json={"email": "TRADER1@EXAMPLE.COM", "password": "pass1234"}
    )
    assert by_mail.status_code == 200, "البريد بلا حساسية حالة"


def test_login_with_wrong_password_is_401_not_500(client):
    _register(client, "trader2")
    r = client.post("/api/auth/login", json={"username": "trader2", "password": "wrong"})
    assert r.status_code == 401


def test_login_without_identifier_is_400(client):
    r = client.post("/api/auth/login", json={"username": "", "password": "x"})
    assert r.status_code == 400


def test_duplicate_email_is_400_not_500(client):
    _register(client, "dup1")
    r = client.post(
        "/api/auth/register",
        json={"username": "dup2", "email": "dup1@example.com", "password": "pass1234"},
    )
    assert r.status_code == 400


def test_me_returns_the_account_of_the_token(client):
    token = _register(client, "whoami")
    me = client.get("/api/auth/me", headers=_auth(token))
    assert me.status_code == 200
    assert me.json()["username"] == "whoami"


# ─── الرسائل الخاصة معطّلة على مستوى الـAPI ─────────────────────────────────

def test_direct_messages_are_gone_410(client):
    """عُطّلت للإطلاق العام لأنها كانت بلا مصادقة ولا عزل. 410 لا 404: المسار كان
    موجوداً وأُزيل عمداً."""
    assert client.get("/api/dm").status_code == 410
    assert client.get("/api/dm/someone").status_code == 410
    assert client.post("/api/dm", json={"to_user": "x", "text": "y"}).status_code == 410
