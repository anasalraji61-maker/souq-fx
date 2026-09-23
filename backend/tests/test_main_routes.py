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

from types import SimpleNamespace

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


# ─── عزل الملكية بين حسابين ─────────────────────────────────────────────────

_ALERT = {"symbol": "EURUSD", "condition": "above", "price": 1.1, "note": "n"}
_TRADE = {"symbol": "EURUSD", "side": "buy", "entry": 1.1, "size": 1.0}


def test_alerts_of_one_account_are_invisible_to_another(client):
    a, b = _register(client, "alice"), _register(client, "bob")
    created = client.post("/api/alerts", json=_ALERT, headers=_auth(a)).json()["alert"]
    assert [x["id"] for x in client.get("/api/alerts", headers=_auth(a)).json()["alerts"]] == [created["id"]]
    assert client.get("/api/alerts", headers=_auth(b)).json()["alerts"] == []


def test_another_account_cannot_edit_or_delete_an_alert(client):
    a, b = _register(client, "carol"), _register(client, "dave")
    aid = client.post("/api/alerts", json=_ALERT, headers=_auth(a)).json()["alert"]["id"]
    assert client.patch(f"/api/alerts/{aid}", json=_ALERT, headers=_auth(b)).status_code == 404
    assert client.delete(f"/api/alerts/{aid}", headers=_auth(b)).json()["ok"] is False
    # وبقي التنبيه سليماً عند مالكه — لا حذف صامت
    assert len(client.get("/api/alerts", headers=_auth(a)).json()["alerts"]) == 1


def test_trades_of_one_account_are_invisible_to_another(client):
    a, b = _register(client, "erin"), _register(client, "frank")
    tid = client.post("/api/trades", json=_TRADE, headers=_auth(a)).json()["trade"]["id"]
    assert client.get("/api/trades", headers=_auth(b)).json()["trades"] == []
    assert client.delete(f"/api/trades/{tid}", headers=_auth(b)).status_code == 404
    assert client.patch(f"/api/trades/{tid}", json={"note": "x"}, headers=_auth(b)).status_code == 404
    assert client.post(f"/api/trades/{tid}/close", json={"exit": 1.2}, headers=_auth(b)).status_code == 404


def test_layout_of_one_account_is_not_overwritten_by_another(client):
    a, b = _register(client, "gina"), _register(client, "hank")
    mine = client.post(
        "/api/layouts", json={"id": "L1", "name": "mine", "payload": {"k": 1}}, headers=_auth(a)
    ).json()["layout"]
    client.post(
        "/api/layouts", json={"id": "L1", "name": "theirs", "payload": {"k": 2}}, headers=_auth(b)
    )
    names = {x["name"] for x in client.get("/api/layouts", headers=_auth(a)).json()["layouts"]}
    assert names == {"mine"}, f"تخطيط حساب آخر كُتب فوقه: {mine}"


def test_custom_watchlist_is_per_account(client):
    a, b = _register(client, "iris"), _register(client, "jack")
    client.post("/api/watchlist/custom", json={"symbol": "xauusd"}, headers=_auth(a))
    assert "XAUUSD" in client.get("/api/watchlist/custom", headers=_auth(a)).json()["symbols"]
    assert client.get("/api/watchlist/custom", headers=_auth(b)).json()["symbols"] == []


def test_academy_progress_is_per_account(client):
    a, b = _register(client, "kim"), _register(client, "liam")
    client.post("/api/academy/progress", json=_PROGRESS_BODY, headers=_auth(a))
    assert len(client.get("/api/academy/progress", headers=_auth(a)).json()["progress"]) == 1
    assert client.get("/api/academy/progress", headers=_auth(b)).json()["progress"] == []


# ─── عزل الأجهزة المجهولة بـ`X-Install-Id` ──────────────────────────────────

_DEV1 = {"X-Install-Id": "install-aaaaaaaaaaaaaaaa"}
_DEV2 = {"X-Install-Id": "install-bbbbbbbbbbbbbbbb"}


def test_anonymous_devices_do_not_share_alerts(client):
    """جهاز مجهول يرى تنبيهات جهازه فقط — كان كل المجهولين دلواً واحداً."""
    client.post("/api/alerts", json=_ALERT, headers=_DEV1)
    assert len(client.get("/api/alerts", headers=_DEV1).json()["alerts"]) == 1
    assert client.get("/api/alerts", headers=_DEV2).json()["alerts"] == []
    # وعميل قديم بلا ترويسة لا يرى صفوف الأجهزة الجديدة
    assert client.get("/api/alerts").json()["alerts"] == []


def test_signing_in_adopts_the_rows_made_on_that_device_before_login(client):
    """الصفوف التي أنشأها المتداول قبل إنشاء حسابه على نفس الجهاز تتبعه بعد الدخول —
    وإلا اختفت تنبيهاته لحظة التسجيل."""
    client.post("/api/alerts", json=_ALERT, headers=_DEV1)
    token = _register(client, "newbie")
    seen = client.get("/api/alerts", headers={**_auth(token), **_DEV1}).json()["alerts"]
    assert len(seen) == 1
    assert client.get("/api/alerts", headers={**_auth(token), **_DEV2}).json()["alerts"] == []


# ─── فلتر الروابط (شرط أبل 1.2) ─────────────────────────────────────────────

def test_group_chat_needs_an_account_and_rejects_links(client):
    assert client.post("/api/chat/group", json={"text": "مرحبا"}).json()["error"] == "login_required"
    token = _register(client, "chatter")
    ok = client.post("/api/chat/group", json={"text": "الذهب يصحّح"}, headers=_auth(token)).json()
    assert ok["ok"] is True and ok["message"]["user"] == "chatter"
    for bad in ("تعال t.me/signals", "https://scam.example", "زُر fx-signals.xyz الآن"):
        r = client.post("/api/chat/group", json={"text": bad}, headers=_auth(token)).json()
        assert r["error"] == "links_not_allowed", bad


def test_vote_needs_an_account_and_counts_one_ballot_per_account(client):
    _VOTE = {"symbol": "EURUSD", "direction": "buy", "entry": 1.1, "sl": 1.0, "tp": 1.2, "note": ""}
    assert client.post("/api/votes", json=_VOTE).json()["error"] == "login_required"
    token = _register(client, "voter")
    vid = client.post("/api/votes", json=_VOTE, headers=_auth(token)).json()["vote"]["id"]
    first = client.post("/api/votes/ballot", json={"vote_id": vid, "choice": "agree"}, headers=_auth(token))
    second = client.post("/api/votes/ballot", json={"vote_id": vid, "choice": "agree"}, headers=_auth(token))
    assert first.json()["ok"] is True and second.json()["ok"] is True
    assert second.json()["vote"]["agree"] == 1, "صوت واحد لكل حساب"


# ─── حذف الحساب (شرط أبل 5.1.1(v)) ──────────────────────────────────────────

def test_deleting_the_account_kills_the_token_and_its_rows(client):
    token = _register(client, "leaver")
    client.post("/api/alerts", json=_ALERT, headers=_auth(token))
    client.post("/api/academy/progress", json=_PROGRESS_BODY, headers=_auth(token))
    assert client.delete("/api/auth/account", headers=_auth(token)).status_code == 200
    assert client.get("/api/auth/me", headers=_auth(token)).status_code == 401, "التوكن بطل فوراً"
    assert client.post("/api/auth/login", json={"username": "leaver", "password": "pass1234"}).status_code == 401


# ─── تثبيت «أنهى المحاضرة» ──────────────────────────────────────────────────

def test_finishing_a_lecture_survives_rewatching_it(client):
    """كان `INSERT OR REPLACE` يكتب الصفّ كاملاً: محاضرة أنهاها المتداول ثم أعاد
    فتحها لمراجعة المقدّمة تُكتب `completed=0` فوراً — إعادة المشاهدة تمحو الإنجاز.
    الموضع يتبع آخر مكان فعلاً (يصحّ رجوعه للخلف)، أما «أنهاها» فلا يُلغى."""
    token = _register(client, "finisher")
    done = {"school_id": "s1", "lecture_id": "l1", "segment_index": 9, "completed": True}
    assert client.post("/api/academy/progress", json=done, headers=_auth(token)).status_code == 200
    again = {"school_id": "s1", "lecture_id": "l1", "segment_index": 0, "completed": False}
    saved = client.post("/api/academy/progress", json=again, headers=_auth(token)).json()["progress"]
    assert saved["segment_index"] == 0, "الموضع يتبع إعادة المشاهدة"
    assert saved["completed"] is True, "«أنهاها» لا يُلغى بإعادة فتحها"
    rows = client.get("/api/academy/progress", headers=_auth(token)).json()["progress"]
    assert rows == [{"school_id": "s1", "lecture_id": "l1", "segment_index": 0, "completed": True}]


def test_progress_response_reports_what_the_database_holds(client):
    """الردّ يعيد الصفّ كما استقرّ بالقاعدة لا كما وصل بالطلب — العميل يبني عليه."""
    token = _register(client, "reporter")
    client.post(
        "/api/academy/progress",
        json={"school_id": "s2", "lecture_id": "l2", "segment_index": 4, "completed": True},
        headers=_auth(token),
    )
    r = client.post(
        "/api/academy/progress",
        json={"school_id": "s2", "lecture_id": "l2", "segment_index": 1, "completed": False},
        headers=_auth(token),
    ).json()["progress"]
    got = client.get("/api/academy/progress", headers=_auth(token)).json()["progress"][0]
    assert r == got


# ─── تنبيهات المؤشرات: دورة الحياة والملكية ─────────────────────────────────

_IND_RSI = {
    "symbol": "eurusd",
    "timeframe": "1H",
    "alert_type": "rsi",
    "condition": "above",
    "value": 70,
}


def _fake_series(kind: str, closes: list[float]):
    """بديل `build_series` بالاختبار — الحقول التي يقرأها المسار وحدها.

    المسار الحقيقي يطلب سلسلة شموع من المزوّد عبر الشبكة؛ هنا تُحقَن سلسلة معلومة
    الاتجاه فيصير «هل أُطلق التنبيه؟» سؤالاً حتمياً لا رهاناً على السوق.
    """
    candles = [
        SimpleNamespace(model_dump=lambda v=v: {"close": v, "open": v, "high": v, "low": v})
        for v in closes
    ]
    return SimpleNamespace(data_source=SimpleNamespace(kind=kind), candles=candles)


_RISING = [1.0 + i * 0.01 for i in range(60)]   # صعود خالص → RSI = 100
_FALLING = [2.0 - i * 0.01 for i in range(60)]  # هبوط خالص → RSI = 0


@pytest.fixture()
def series_calls(monkeypatch):
    """يلتقط كل نداء لـ`build_series` ويعيد سلسلة صاعدة من مزوّد حقيقي."""
    calls: list[tuple[str, str]] = []

    def fake(symbol: str, timeframe: str = "15m", outputsize: int = 180):
        calls.append((symbol, timeframe))
        return _fake_series("twelvedata", _RISING)

    monkeypatch.setattr(main, "build_series", fake)
    return calls


def test_indicator_alert_is_created_armed_and_uppercased(client):
    token = _register(client, "indmaker")
    alert = client.post("/api/indicator-alerts", json=_IND_RSI, headers=_auth(token)).json()["alert"]
    assert alert["symbol"] == "EURUSD", "الرمز يُوحَّد كما بمسار تنبيهات السعر"
    assert alert["active"] is True and alert["triggered"] is False, "يُنشأ مُسلَّحاً"
    assert alert["timeframe"] == "1H"


def test_indicator_alerts_of_one_account_are_invisible_to_another(client):
    a, b = _register(client, "indalice"), _register(client, "indbob")
    created = client.post("/api/indicator-alerts", json=_IND_RSI, headers=_auth(a)).json()["alert"]
    mine = client.get("/api/indicator-alerts", headers=_auth(a)).json()["alerts"]
    assert [x["id"] for x in mine] == [created["id"]]
    assert client.get("/api/indicator-alerts", headers=_auth(b)).json()["alerts"] == []


def test_another_account_cannot_delete_or_rearm_an_indicator_alert(client):
    """نفس حراسة تنبيهات السعر — ومع كل محاولة يُتحقَّق أن صفّ المالك **بقي سليماً**،
    فلا يمرّ حذفٌ صامت باختبار «404 وكفى»."""
    a, b = _register(client, "indcarol"), _register(client, "inddave")
    aid = client.post("/api/indicator-alerts", json=_IND_RSI, headers=_auth(a)).json()["alert"]["id"]
    assert client.delete(f"/api/indicator-alerts/{aid}", headers=_auth(b)).json()["ok"] is False
    assert client.post(f"/api/indicator-alerts/{aid}/rearm", headers=_auth(b)).status_code == 404
    still = client.get("/api/indicator-alerts", headers=_auth(a)).json()["alerts"]
    assert len(still) == 1 and still[0]["active"] is True


def test_rearming_an_unknown_indicator_alert_is_404(client):
    token = _register(client, "indghost")
    assert client.post("/api/indicator-alerts/ia-nope/rearm", headers=_auth(token)).status_code == 404


def test_owner_deletes_their_own_indicator_alert(client):
    token = _register(client, "indowner")
    aid = client.post("/api/indicator-alerts", json=_IND_RSI, headers=_auth(token)).json()["alert"]["id"]
    assert client.delete(f"/api/indicator-alerts/{aid}", headers=_auth(token)).json()["ok"] is True
    assert client.get("/api/indicator-alerts", headers=_auth(token)).json()["alerts"] == []


def test_anonymous_devices_do_not_share_indicator_alerts(client):
    client.post("/api/indicator-alerts", json=_IND_RSI, headers=_DEV1)
    assert len(client.get("/api/indicator-alerts", headers=_DEV1).json()["alerts"]) == 1
    assert client.get("/api/indicator-alerts", headers=_DEV2).json()["alerts"] == []
    assert client.get("/api/indicator-alerts").json()["alerts"] == []


# ─── تنبيهات المؤشرات: الفحص ────────────────────────────────────────────────

def test_a_fired_indicator_alert_is_returned_once_only(client, series_calls):
    """`mark_indicator_alert_triggered` ذرّي: التنبيه لمرة واحدة، فلا إشعار مكرّر
    لمن يفحص كل دقيقة ولا سباق بين جهازين للمتداول نفسه."""
    token = _register(client, "indfire")
    client.post("/api/indicator-alerts", json=_IND_RSI, headers=_auth(token))
    first = client.post("/api/indicator-alerts/check", headers=_auth(token)).json()
    assert len(first["triggered"]) == 1, "سلسلة صاعدة خالصة → RSI = 100 فوق العتبة 70"
    assert [a["triggered"] for a in first["alerts"]] == [True]
    second = client.post("/api/indicator-alerts/check", headers=_auth(token)).json()
    assert second["triggered"] == [], "لا يُعاد تسليمه مرّة ثانية"


def test_rearming_a_fired_indicator_alert_puts_it_back_to_watching(client, series_calls):
    """كان الحلّ الوحيد لإعادة تنبيه أُطلق هو حذفه وإعادة إنشائه بكل حقوله."""
    token = _register(client, "indrearm")
    aid = client.post("/api/indicator-alerts", json=_IND_RSI, headers=_auth(token)).json()["alert"]["id"]
    client.post("/api/indicator-alerts/check", headers=_auth(token))
    back = client.post(f"/api/indicator-alerts/{aid}/rearm", headers=_auth(token)).json()["alert"]
    assert back["triggered"] is False and back["active"] is True
    again = client.post("/api/indicator-alerts/check", headers=_auth(token)).json()
    assert len(again["triggered"]) == 1, "بعد إعادة التسليح يُطلق ثانيةً"


def test_a_seeded_demo_series_never_fires_an_indicator_alert(client, monkeypatch):
    """حين يتعذّر المزوّد يبني الخادم شموعاً بذرية. كان تقاطع/RSI عليها **يُطلق**
    التنبيه ويعلّمه «مُطلَق» نهائياً بلا حدث سوقي حقيقي — أي أن انقطاع المزوّد كان
    يحرق تنبيهات المتداول بإشعارات كاذبة."""
    token = _register(client, "inddemo")
    client.post("/api/indicator-alerts", json=_IND_RSI, headers=_auth(token))
    monkeypatch.setattr(
        main, "build_series", lambda s, timeframe="15m", outputsize=180: _fake_series("demo", _RISING)
    )
    res = client.post("/api/indicator-alerts/check", headers=_auth(token)).json()
    assert res["triggered"] == []
    assert res["alerts"][0]["triggered"] is False, "ويبقى مُسلَّحاً — لم يُحرق"


def test_a_failing_provider_leaves_the_alert_armed(client, monkeypatch):
    """استثناء من المزوّد يُتخطّى بهدوء ويُعاد الفحص بالطلب التالي."""
    token = _register(client, "indfail")
    client.post("/api/indicator-alerts", json=_IND_RSI, headers=_auth(token))

    def boom(symbol, timeframe="15m", outputsize=180):
        raise RuntimeError("provider down")

    monkeypatch.setattr(main, "build_series", boom)
    res = client.post("/api/indicator-alerts/check", headers=_auth(token))
    assert res.status_code == 200, "عطل المزوّد لا يصير 500 بوجه المتداول"
    assert res.json()["triggered"] == []
    assert res.json()["alerts"][0]["triggered"] is False


def test_one_series_is_fetched_per_symbol_and_timeframe_not_per_alert(client, series_calls):
    """أثقل استطلاع بالتطبيق: كانت السلسلة تُبنى لكل تنبيه — ثلاثة تنبيهات EURUSD 1H
    = ثلاثة طلبات للمزوّد من كل جهاز مفتوح، كل دقيقة. الآن طلب واحد لكل (رمز، فريم)."""
    token = _register(client, "indcache")
    for value in (10, 20, 30):
        client.post("/api/indicator-alerts", json={**_IND_RSI, "value": value}, headers=_auth(token))
    client.post("/api/indicator-alerts", json={**_IND_RSI, "symbol": "XAUUSD"}, headers=_auth(token))
    client.post("/api/indicator-alerts/check", headers=_auth(token))
    assert sorted(series_calls) == [("EURUSD", "1H"), ("XAUUSD", "1H")], series_calls


def test_an_unmet_condition_does_not_fire(client, monkeypatch):
    """الحارس المعاكس: بلا هذا الاختبار يمرّ «كل شيء يُطلق دائماً»."""
    token = _register(client, "indquiet")
    client.post("/api/indicator-alerts", json=_IND_RSI, headers=_auth(token))
    monkeypatch.setattr(
        main,
        "build_series",
        lambda s, timeframe="15m", outputsize=180: _fake_series("twelvedata", _FALLING),
    )
    res = client.post("/api/indicator-alerts/check", headers=_auth(token)).json()
    assert res["triggered"] == [], "سلسلة هابطة خالصة → RSI = 0، لا شيء فوق 70"


def test_the_check_only_ever_sees_the_callers_own_alerts(client, series_calls):
    a, b = _register(client, "indmine"), _register(client, "indyours")
    client.post("/api/indicator-alerts", json=_IND_RSI, headers=_auth(a))
    res = client.post("/api/indicator-alerts/check", headers=_auth(b)).json()
    assert res == {"triggered": [], "alerts": []}
    assert series_calls == [], "ولا يُستهلك حدّ المزوّد على تنبيهات غيره"


# ─── تنبيه لا يمكن أن يُطلق يُرفض بـ422 بدل حفظه بصمت ───────────────────────

@pytest.mark.parametrize(
    "body, why",
    [
        ({**_IND_RSI, "alert_type": "ma_cross", "condition": "above"}, "تقاطع بشرط above"),
        ({**_IND_RSI, "alert_type": "macd_cross", "condition": "below"}, "تقاطع بشرط below"),
        ({**_IND_RSI, "value": None}, "RSI بلا عتبة (NaN من العميل يصل null)"),
        ({**_IND_RSI, "value": 150}, "عتبة خارج 0–100"),
        ({**_IND_RSI, "value": 0}, "عتبة عند الحدّ"),
        ({**_IND_RSI, "timeframe": "1h"}, "فريم غير معروف (الحروف الكبيرة هي المعجم)"),
        ({**_IND_RSI, "timeframe": "3y"}, "فريم غير موجود"),
        ({**_IND_RSI, "alert_type": "stoch"}, "نوع غير مدعوم"),
    ],
)
def test_an_alert_that_could_never_fire_is_rejected(client, body, why):
    token = _register(client, "indvalid")
    assert client.post("/api/indicator-alerts", json=body, headers=_auth(token)).status_code == 422, why
