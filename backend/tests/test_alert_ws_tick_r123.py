"""run 123: سعر الـWS ووقته متّسقان — تيك يصل بين قراءة السعر وقراءة الوقت كان يلصق وقت التيك الجديد
(بعد التسليح) بالسعر القديم (قبله) ⇒ «فوق 1.1000» يُطلق على 1.1003 لم يوجد بعد التسليح."""
from __future__ import annotations

import time
from datetime import datetime, timezone

import alert_worker
import twelve_data as market
import twelve_data_ws as td_ws


class _TickBetweenReads(dict):
    """`LATEST` تُحفظ فيه قراءة السعر الأولى ثم يصل تيك جديد (كحلقة الـWS بخيط آخر)."""

    def __init__(self, price, at_dict, new_price, new_at):
        super().__init__(EURUSD=price)
        self._at, self._new, self._fired = at_dict, (new_price, new_at), False

    def get(self, key, default=None):
        v = super().get(key, default)
        if not self._fired:
            self._fired = True
            self["EURUSD"], self._at["EURUSD"] = self._new
        return v


def test_tick_between_price_and_time_reads_is_not_paired(monkeypatch):
    monkeypatch.setattr(market, "WEEKEND_CLOSE_FILTER", False)
    monkeypatch.setattr(market, "fetch_quote_book", lambda s: None)
    armed = time.time() - 1.0
    at = {"EURUSD": armed - 1.0}
    monkeypatch.setattr(td_ws, "LATEST_AT", at)
    monkeypatch.setattr(td_ws, "LATEST", _TickBetweenReads(1.1003, at, 1.0995, armed + 0.5))
    q, q_at = alert_worker._price_at("EURUSD")
    assert (q, q_at) == (1.0995, armed + 0.5)
    a = {"price": 1.1000, "condition": "above", "ts": datetime.fromtimestamp(armed, timezone.utc).isoformat()}
    assert alert_worker._price_hit(a, q, [], q_at) is False


def test_tick_returns_price_with_its_own_time(monkeypatch):
    now = time.time()
    monkeypatch.setattr(td_ws, "LATEST", {"EURUSD": 1.1, "GBPUSD": 1.3})
    monkeypatch.setattr(td_ws, "LATEST_AT", {"EURUSD": now - 10, "GBPUSD": now - 500})
    assert td_ws.tick("EURUSD", max_age=180) == (1.1, now - 10)
    assert td_ws.tick("GBPUSD", max_age=180) is None  # أقدم من 3 دقائق
    assert td_ws.tick("USDJPY", max_age=180) is None


def test_dead_token_delete_failure_does_not_drop_other_devices(monkeypatch):
    """حذف رمز ميت يفشل (قاعدة مقفلة) ⇒ جهاز المالك الآخر (لغة أخرى) يُرسَل له، ورموز الإعادة لا تُسقط."""
    import sqlite3

    import db
    import expo_push

    monkeypatch.setattr(alert_worker, "_pending_pushes", [])
    monkeypatch.setattr(alert_worker, "_pending_events", [])
    monkeypatch.setattr(db, "push_targets_for", lambda *a, **k: [
        ("ExponentPushToken[old-ar]", "ar"), ("ExponentPushToken[busy-ar]", "ar"), ("ExponentPushToken[new-en]", "en"),
    ])
    sent = []

    def fake_send(tokens, title, body, data):
        sent.append(list(tokens))
        return {"ok": True, "invalid_tokens": [t for t in tokens if "old" in t],
                "retry_tokens": [t for t in tokens if "busy" in t]}

    def locked(tok):
        raise sqlite3.OperationalError("database is locked")

    monkeypatch.setattr(expo_push, "send_push", fake_send)
    monkeypatch.setattr(db, "delete_push_token", locked)
    ev = alert_worker.price_event({"user_id": 7, "owner_key": None, "symbol": "EURUSD", "condition": "above", "price": 1.1})
    alert_worker.dispatch([ev])
    assert ["ExponentPushToken[new-en]"] in sent
    assert [p[0] for p in alert_worker._pending_pushes] == [["ExponentPushToken[busy-ar]"]]
