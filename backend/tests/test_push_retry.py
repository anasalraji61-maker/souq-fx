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
    assert alert_worker._deliver(["ExponentPushToken[aaa]"], "t", "b") is False
    _queue()
    sent: list = []
    worker.setattr(alert_worker.expo_push, "send_push", _ok(sent))
    alert_worker._check_once()
    assert sent == [(["ExponentPushToken[aaa]"], "EURUSD above")]
    assert alert_worker._pending_pushes == []


def test_permanent_failure_is_not_retried(worker):
    worker.setattr(alert_worker.expo_push, "send_push", _fail(400))
    assert alert_worker._deliver(["ExponentPushToken[aaa]"], "t", "b") is True


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

    def targets(owner, key):
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
