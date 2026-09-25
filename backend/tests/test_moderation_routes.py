"""اختبارات مسارات البلاغ والإشراف — شرط أبل 1.2 وسياسة Google Play للمحتوى الاجتماعي.

**لماذا ملف مستقلّ**: هذا السطح يُقاس بشرط متجر لا بذوق منتج. أبل تشترط آلية إبلاغ
وإخفاء للمحتوى المسيء وتصرّفاً خلال 24 ساعة، فما يُختبر هنا هو الوعد المقدَّم للمتجر
حرفاً بحرف: من يُخفى عنه المحتوى ومتى، وهل باب الإشراف مغلق فعلاً بلا توكن. ويحتاج
إعداداً لا تحتاجه بقيّة المسارات (`MATRIX_MODERATION_TOKEN` بمتغيّر بيئة).

بلا شبكة وبلا دورة `lifespan`، وقاعدة مؤقتة خارج المستودع بحارس صريح — نفس قالب
`test_main_routes.py`.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import db
import main
from core import db_conn

_FAST_ITERATIONS = 1_000
_TOKEN = "moderation-token-for-tests"


@pytest.fixture()
def client(tmp_path, monkeypatch):
    path = tmp_path / "test_moderation.db"
    assert "souq-fx" not in str(path), f"قاعدة الاختبار يجب أن تكون خارج المستودع: {path}"
    monkeypatch.setattr(db_conn, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    monkeypatch.setattr(db, "_PBKDF2_ITERATIONS", _FAST_ITERATIONS)
    db.init_db()
    return TestClient(main.app, raise_server_exceptions=False)


@pytest.fixture()
def moderator(monkeypatch) -> dict:
    """توكن إشراف مضبوط + ترويسته الصحيحة."""
    monkeypatch.setenv("MATRIX_MODERATION_TOKEN", _TOKEN)
    return {"X-Moderation-Token": _TOKEN}


def _register(client, username: str) -> str:
    r = client.post(
        "/api/auth/register",
        json={"username": username, "email": f"{username}@example.com", "password": "pass1234"},
    )
    assert r.status_code == 200, r.text
    return r.json()["token"]


def _auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


def _post_message(client, token: str, text: str = "محتوى للاختبار") -> str:
    return client.post("/api/chat/group", json={"text": text}, headers=_auth(token)).json()["message"]["id"]


def _post_vote(client, token: str) -> str:
    body = {"symbol": "EURUSD", "direction": "buy", "entry": 1.1, "sl": 1.0, "tp": 1.2, "note": "فكرة"}
    return client.post("/api/votes", json=body, headers=_auth(token)).json()["vote"]["id"]


def _report(client, token: str, kind: str, target_id: str, reason: str = "spam"):
    return client.post(
        "/api/reports", json={"kind": kind, "target_id": target_id, "reason": reason}, headers=_auth(token)
    ).json()


def _message_ids(client, token: str) -> list[str]:
    return [m["id"] for m in client.get("/api/chat/group", headers=_auth(token)).json()["messages"]]


def _vote_ids(client, token: str) -> list[str]:
    return [v["id"] for v in client.get("/api/votes", headers=_auth(token)).json()["votes"]]


# ─── باب الإشراف ────────────────────────────────────────────────────────────

def test_without_a_configured_token_the_moderation_routes_do_not_exist(client, monkeypatch):
    """بلا توكن مضبوط = 404 لا 403: المسار غير موجود أصلاً، لا **باب مفتوح** ولا
    باب يعلن عن نفسه لمن يجسّ الخادم."""
    monkeypatch.delenv("MATRIX_MODERATION_TOKEN", raising=False)
    assert client.get("/api/moderation/reports").status_code == 404
    action = {"kind": "group_message", "target_id": "x", "action": "dismiss"}
    assert client.post("/api/moderation/action", json=action).status_code == 404


def test_a_configured_token_is_required_on_every_moderation_call(client, moderator):
    assert client.get("/api/moderation/reports").status_code == 403, "بلا ترويسة"
    wrong = {"X-Moderation-Token": "not-the-token"}
    assert client.get("/api/moderation/reports", headers=wrong).status_code == 403
    assert client.get("/api/moderation/reports", headers=moderator).status_code == 200


def test_an_ordinary_account_token_is_not_a_moderation_token(client, moderator):
    """توكن حساب عادي لا يفتح الإشراف — سطحان منفصلان تماماً."""
    user = _register(client, "justauser")
    assert client.get("/api/moderation/reports", headers=_auth(user)).status_code == 403
    mixed = {"X-Moderation-Token": user}
    assert client.get("/api/moderation/reports", headers=mixed).status_code == 403


# ─── من يقدر يُبلّغ ─────────────────────────────────────────────────────────

def test_anonymous_cannot_report(client):
    """وإلا أخفى أيُّ أحد أيَّ شيء بلا حدّ (المجهول يقدر يحظر المرسل محلياً بالواجهة)."""
    author = _register(client, "author01")
    mid = _post_message(client, author)
    r = client.post("/api/reports", json={"kind": "group_message", "target_id": mid, "reason": "spam"})
    assert r.json() == {"ok": False, "error": "login_required"}


def test_reporting_something_that_does_not_exist_is_not_found(client):
    reporter = _register(client, "reporter1")
    assert _report(client, reporter, "group_message", "no-such-id")["error"] == "not_found"
    assert _report(client, reporter, "vote", "no-such-id")["error"] == "not_found"


def test_one_report_per_account_per_item(client):
    """حساب واحد لا يُخفي محتوى غيره وحده بتكرار البلاغ — المفتاح الأساسي يمنع ذلك."""
    author, reporter = _register(client, "author02"), _register(client, "reporter2")
    mid = _post_message(client, author)
    assert _report(client, reporter, "group_message", mid)["new"] is True
    assert _report(client, reporter, "group_message", mid, reason="abuse")["new"] is False
    reports = db.list_reports()
    assert len(reports) == 1 and reports[0]["reports"] == 1


# ─── من يُخفى عنه المحتوى ومتى ──────────────────────────────────────────────

def test_a_reported_message_disappears_for_its_reporter_at_once(client):
    """الوعد المباشر للمتداول: «أبلغتُ عنه فاختفى» — فوراً، لا بعد مراجعة."""
    author, reporter, other = (
        _register(client, "author03"),
        _register(client, "reporter3"),
        _register(client, "bystand3"),
    )
    mid = _post_message(client, author)
    _report(client, reporter, "group_message", mid)
    assert mid not in _message_ids(client, reporter)
    assert mid in _message_ids(client, other), "ولا يختفي عن بقيّة المتداولين ببلاغ واحد"


def test_the_threshold_hides_a_message_for_everyone(client):
    """حساب واحد غاضب لا يُسكت أحداً، وثلاثة بلاغات مستقلّة تكفي لإزالة الاحتيال
    الظاهر قبل أن يراه مبتدئ."""
    author = _register(client, "author04")
    mid = _post_message(client, author)
    reporters = [_register(client, f"rep4{i}") for i in range(db.REPORT_HIDE_THRESHOLD)]
    for i, token in enumerate(reporters, start=1):
        _report(client, token, "group_message", mid)
        fresh = _register(client, f"fresh4{i}")
        hidden = mid not in _message_ids(client, fresh)
        assert hidden is (i >= db.REPORT_HIDE_THRESHOLD), f"عند {i} بلاغاً: الإخفاء العام {hidden}"


def test_the_threshold_hides_a_trade_idea_for_everyone_too(client):
    """أفكار الصفقات محتوى ينشئه المستخدم مثل الرسائل تماماً — نفس الحراسة."""
    author = _register(client, "author05")
    vid = _post_vote(client, author)
    for i in range(db.REPORT_HIDE_THRESHOLD):
        _report(client, _register(client, f"rep5{i}"), "vote", vid, reason="scam")
    assert vid not in _vote_ids(client, _register(client, "fresh5"))


def test_a_hidden_trade_idea_cannot_be_voted_on_or_read_through_the_ballot(client):
    """الإخفاء كان للقائمة فقط: التصويت على المعرّف يعيد نصّ الفكرة كاملاً ويزيد «الموافقة»."""
    author = _register(client, "author06")
    vid = _post_vote(client, author)
    for i in range(db.REPORT_HIDE_THRESHOLD):
        _report(client, _register(client, f"rep6{i}"), "vote", vid, reason="scam")
    r = client.post("/api/votes/ballot", json={"vote_id": vid, "choice": "agree"},
                    headers=_auth(_register(client, "fresh6"))).json()
    assert r == {"ok": False, "error": "vote not found"}
    with db._conn() as c:
        assert c.execute("SELECT agree FROM votes WHERE id=?", (vid,)).fetchone()[0] == 0


def test_an_invisible_only_chat_message_is_empty(client):
    tok = _register(client, "author07")
    for text in ["\u200b\u200b", "\ufeff", "\u200e \u200f"]:
        assert client.post("/api/chat/group", json={"text": text}, headers=_auth(tok)).json() == {
            "ok": False, "error": "empty"}


@pytest.mark.parametrize("name", ["t.me/forexvip", "forexvip.com", "a@b.co", "www.signals"])
def test_a_username_cannot_carry_a_link_or_at_sign(client, name):
    """الاسم يظهر مؤلّفاً على كل رسالة — كان يتخطّى فلتر الروابط؛ و«@» يجعله لا يُدخَل بالاسم أبداً."""
    r = client.post("/api/auth/register", json={"username": name, "email": "x@example.com", "password": "pass1234"})
    assert r.status_code == 400 and r.json()["detail"] == "username has a link or @"


# ─── قائمة المراجعة ─────────────────────────────────────────────────────────

def test_the_review_list_shows_the_content_itself_not_just_an_id(client, moderator):
    """المشرف يقرّر بالنصّ لا بمعرّف: بلا النصّ والكاتب لا يُتخذ قرار خلال 24 ساعة."""
    author = _register(client, "author06")
    mid = _post_message(client, author, "تعال قناتي للتوصيات")
    _report(client, _register(client, "rep60"), "group_message", mid, reason="spam")
    _report(client, _register(client, "rep61"), "group_message", mid, reason="scam")
    body = client.get("/api/moderation/reports", headers=moderator).json()
    assert body["hide_threshold"] == db.REPORT_HIDE_THRESHOLD
    item = body["reports"][0]
    assert item["target_id"] == mid and item["reports"] == 2
    assert item["author"] == "author06" and item["text"] == "تعال قناتي للتوصيات"
    assert sorted(item["reasons"]) == ["scam", "spam"]
    assert item["exists"] is True and item["hidden_for_all"] is False


# ─── قرارا المشرف ───────────────────────────────────────────────────────────

def test_dismiss_brings_the_content_back_for_everyone(client, moderator):
    """بلاغ كيديّ: تُسقَط البلاغات فيعود المحتوى ظاهراً — **حتى لمن أبلغ عنه**،
    وإلا بقي الحكم قائماً عند من تسبّب به رغم إبطاله."""
    author, reporter = _register(client, "author07"), _register(client, "reporter7")
    mid = _post_message(client, author)
    _report(client, reporter, "group_message", mid)
    assert mid not in _message_ids(client, reporter)
    action = {"kind": "group_message", "target_id": mid, "action": "dismiss"}
    assert client.post("/api/moderation/action", json=action, headers=moderator).json()["ok"] is True
    assert mid in _message_ids(client, reporter)
    assert client.get("/api/moderation/reports", headers=moderator).json()["reports"] == []


def test_remove_deletes_the_message_and_its_reports(client, moderator):
    author, reporter = _register(client, "author08"), _register(client, "reporter8")
    mid = _post_message(client, author)
    _report(client, reporter, "group_message", mid)
    action = {"kind": "group_message", "target_id": mid, "action": "remove"}
    assert client.post("/api/moderation/action", json=action, headers=moderator).json()["ok"] is True
    assert mid not in _message_ids(client, _register(client, "fresh8"))
    assert client.get("/api/moderation/reports", headers=moderator).json()["reports"] == []


def test_removing_a_trade_idea_takes_its_ballots_with_it(client, moderator):
    """وإلا بقيت أصوات فكرة محذوفة بالجدول: صفوف يتيمة تعود لو أُعيد استعمال المعرّف."""
    author, voter = _register(client, "author09"), _register(client, "voter9")
    vid = _post_vote(client, author)
    client.post("/api/votes/ballot", json={"vote_id": vid, "choice": "agree"}, headers=_auth(voter))
    _report(client, voter, "vote", vid)
    action = {"kind": "vote", "target_id": vid, "action": "remove"}
    assert client.post("/api/moderation/action", json=action, headers=moderator).json()["ok"] is True
    assert vid not in _vote_ids(client, _register(client, "fresh9"))
    with db._conn() as c:
        left = c.execute("SELECT COUNT(*) AS n FROM vote_ballots WHERE vote_id=?", (vid,)).fetchone()["n"]
    assert left == 0
