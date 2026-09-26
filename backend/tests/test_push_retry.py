"""إشعار تنبيه فشل إرساله لـExpo بخطأ عابر كان يُفقد نهائياً (التنبيه موسوم مُطلَقاً قبل الإرسال)."""
from __future__ import annotations

import httpx
import pytest

import alert_worker
import db
from core import db_conn


@pytest.fixture()
def worker(tmp_path, monkeypatch):
    path = tmp_path / "push_retry.db"
    monkeypatch.setattr(db_conn, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    db.init_db()
    monkeypatch.setattr(alert_worker, "_recent_minutes", lambda sym: (1.2000, [], None))
    monkeypatch.setattr(alert_worker, "_pending_pushes", [])
    db.save_push_token("ExponentPushToken[aaa]", "ios", owner_key="install-retry-device-1")
    return monkeypatch


def _fail(status: int | None):
    def send(tokens, title, body, data):
        if status is None:
            raise httpx.ConnectError("down")
        req = httpx.Request("POST", "https://exp.host")
        raise httpx.HTTPStatusError("x", request=req, response=httpx.Response(status, request=req))
    return send


def _ok(sent: list):
    return lambda tokens, title, body, data: sent.append((tokens, body)) or {"invalid_tokens": []}


def _queue(tokens=("ExponentPushToken[aaa]",), at=None):
    alert_worker._pending_pushes.append((list(tokens), "t", "EURUSD above", at or alert_worker.time.time()))


@pytest.mark.parametrize("status", [None, 500, 503, 429])
def test_transient_failure_is_queued_and_sent_next_cycle(worker, status):
    worker.setattr(alert_worker.expo_push, "send_push", _fail(status))
    assert alert_worker._deliver(["ExponentPushToken[aaa]"], "t", "b") == ["ExponentPushToken[aaa]"]
    _queue()
    sent: list = []
    worker.setattr(alert_worker.expo_push, "send_push", _ok(sent))
    alert_worker._check_once()
    assert sent == [(["ExponentPushToken[aaa]"], "EURUSD above")]
    assert alert_worker._pending_pushes == []


def test_permanent_failure_is_not_retried(worker):
    worker.setattr(alert_worker.expo_push, "send_push", _fail(400))
    assert alert_worker._deliver(["ExponentPushToken[aaa]"], "t", "b") == []


def test_still_failing_push_stays_queued_until_it_is_too_old(worker):
    worker.setattr(alert_worker.expo_push, "send_push", _fail(None))
    _queue()
    alert_worker._check_once()
    assert len(alert_worker._pending_pushes) == 1
    alert_worker._pending_pushes[:] = [
        (tk, ti, b, at - alert_worker._PUSH_RETRY_MAX_AGE - 1) for tk, ti, b, at in alert_worker._pending_pushes
    ]
    alert_worker._check_once()
    assert alert_worker._pending_pushes == []


def test_retry_skips_a_token_removed_while_waiting(worker):
    """خرج المتداول (أو حُذف حسابه) بين الفشل والإعادة ⇒ لا يصل إشعاره لهاتف لم يعد له."""
    _queue(tokens=("ExponentPushToken[aaa]", "ExponentPushToken[gone]"))
    sent: list = []
    worker.setattr(alert_worker.expo_push, "send_push", _ok(sent))
    db.delete_push_token("ExponentPushToken[aaa]")
    alert_worker._check_once()
    assert sent == [] and alert_worker._pending_pushes == []


def test_one_owners_db_error_does_not_drop_the_others(worker):
    """`push_targets_for` خارج أي try: «database is locked» عند مالك واحد أسقط إشعارات كل من بعده."""
    calls: list = []

    def targets(owner, key, **_):
        calls.append(owner)
        if owner == 1:
            raise RuntimeError("database is locked")
        return [("ExponentPushToken[aaa]", "en")]

    worker.setattr(db, "push_targets_for", targets)
    worker.setattr(db, "list_alerts", lambda all_users=True: [
        {"id": i, "user_id": i, "owner_key": None, "symbol": "EURUSD", "condition": "above",
         "price": 1.1, "active": True, "triggered": False} for i in (1, 2)
    ])
    worker.setattr(db, "list_indicator_alerts", lambda all_users=True: [])
    worker.setattr(db, "mark_alert_triggered", lambda aid, seen: True)
    worker.setattr(alert_worker, "_price_hit", lambda *a: True)
    sent: list = []
    worker.setattr(alert_worker.expo_push, "send_push", _ok(sent))
    alert_worker._check_once()
    assert calls == [1, 2] and len(sent) == 1


def test_push_appended_during_retry_is_not_cleared(worker, monkeypatch):
    """run 55: `dispatch` يُلحق من خيط آخر بين نسخ القائمة وتفريغها ⇒ `clear()` كان يمحوه بلا إرسال."""
    import time as _t
    late = (["ExponentPushToken[b]"], "t", "late", _t.time())

    class Racy(list):
        def __getitem__(self, k):
            out = super().__getitem__(k)
            if isinstance(k, slice) and late not in self:
                self.append(late)  # يصل مباشرةً بعد النسخ
            return out

    q = Racy([(["ExponentPushToken[a]"], "t", "old", _t.time())])
    monkeypatch.setattr(alert_worker, "_pending_pushes", q)
    monkeypatch.setattr(db, "existing_push_tokens", lambda tokens: [])
    alert_worker._retry_pending_pushes()
    assert list(q) == [late]


def test_more_than_100_tokens_are_sent_in_batches(worker):
    """`send_push` كان يقصّ لأول 100 رمز بصمت ⇒ الأجهزة بعدها لا تُبلَّغ أبداً."""
    tokens = [f"ExponentPushToken[t{i}]" for i in range(250)]
    sent: list = []
    worker.setattr(alert_worker.expo_push, "send_push", _ok(sent))
    assert alert_worker._deliver(tokens, "t", "b") == []
    assert [len(tk) for tk, _ in sent] == [100, 100, 50]
    assert [t for tk, _ in sent for t in tk] == tokens


def test_send_push_refuses_more_than_a_batch():
    with pytest.raises(ValueError):
        alert_worker.expo_push.send_push([f"ExponentPushToken[t{i}]" for i in range(101)], "t", "b")


def test_only_the_failed_batch_is_retried(worker):
    tokens = [f"ExponentPushToken[t{i}]" for i in range(150)]
    calls: list = []

    def send(chunk, title, body, data):
        calls.append(chunk)
        if len(calls) == 2:
            raise httpx.ConnectError("down")
        return {"invalid_tokens": []}

    worker.setattr(alert_worker.expo_push, "send_push", send)
    assert alert_worker._deliver(tokens, "t", "b") == tokens[100:]


def test_message_rate_exceeded_ticket_is_retried(worker, monkeypatch):
    """تذكرة `MessageRateExceeded` (رفض مؤقت لجهاز واحد) كانت تُعدّ نجاحاً ⇒ إشعار لا يصل ولا يُعاد."""
    payload = {"data": [
        {"status": "ok", "id": "1"},
        {"status": "error", "details": {"error": "MessageRateExceeded"}},
        {"status": "error", "details": {"error": "DeviceNotRegistered"}},
    ]}

    class R:
        def raise_for_status(self):
            pass

        def json(self):
            return payload

    class C:
        def __init__(self, *a, **k):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def post(self, *a, **k):
            return R()

    monkeypatch.setattr(alert_worker.expo_push.httpx, "Client", C)
    toks = ["ExponentPushToken[a]", "ExponentPushToken[b]", "ExponentPushToken[c]"]
    out = alert_worker.expo_push.send_push(toks, "t", "b")
    assert out["retry_tokens"] == ["ExponentPushToken[b]"]
    assert out["invalid_tokens"] == ["ExponentPushToken[c]"]
    assert alert_worker._deliver(toks, "t", "b") == ["ExponentPushToken[b]"]
