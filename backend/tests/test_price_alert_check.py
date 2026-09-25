"""`/api/alerts/check` — التنبيه المُطلَق للتوّ يُعاد موسوماً «مُطلَق»، ولمرة واحدة.

**بلا شبكة**: `alert_worker._recent_minutes` مُستبدَل بسعر ثابت، فلا مزوّد ولا WebSocket.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import alert_worker
import db
import main
from core import db_conn


@pytest.fixture()
def client(tmp_path, monkeypatch):
    path = tmp_path / "test_alert_check.db"
    assert "souq-fx" not in str(path), f"قاعدة الاختبار يجب أن تكون خارج المستودع: {path}"
    monkeypatch.setattr(db_conn, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    monkeypatch.setattr(db, "_PBKDF2_ITERATIONS", 1_000)
    db.init_db()
    monkeypatch.setattr(alert_worker, "_recent_minutes", lambda sym: (1.2000, [], None))
    return TestClient(main.app, raise_server_exceptions=False)


# 16 حرفاً على الأقل وإلا رفضه `_install_key` وصار الصفّ بلا مالك (يراه كل جهاز قديم).
_DEVICE = {"X-Install-Id": "install-check-device-1"}
_OTHER_DEVICE = {"X-Install-Id": "install-check-device-2"}


def _create(client, price: float, condition: str = "above"):
    r = client.post(
        "/api/alerts",
        json={"symbol": "EURUSD", "condition": condition, "price": price},
        headers=_DEVICE,
    )
    assert r.status_code == 200, r.text
    return r.json()["alert"]["id"]


def test_just_fired_alert_is_returned_marked_triggered(client):
    """كان الصفّ يُلقَّط **قبل** القلب فيُسلَّم تنبيهٌ أُطلق للتوّ موسوماً «يراقب»."""
    aid = _create(client, 1.1000)
    res = client.post("/api/alerts/check", headers=_DEVICE).json()
    fired = [a for a in res["triggered"] if a["id"] == aid]
    assert len(fired) == 1, res
    assert fired[0]["triggered"] is True
    assert fired[0]["current"] == 1.2000
    # والقائمة الكاملة تقول الشيء نفسه — المصدران لا يتناقضان
    assert [a for a in res["alerts"] if a["id"] == aid][0]["triggered"] is True


def test_alert_fires_once_only(client):
    """الفحص الثاني لا يُعيد إشعاراً — `mark_alert_triggered` ذرّي وهو ما يمنع التكرار."""
    _create(client, 1.1000)
    assert len(client.post("/api/alerts/check", headers=_DEVICE).json()["triggered"]) == 1
    assert client.post("/api/alerts/check", headers=_DEVICE).json()["triggered"] == []


def test_unmet_condition_does_not_fire(client):
    """الحارس المعاكس: بلا هذا الاختبار يمرّ «كل تنبيه يُطلق دائماً»."""
    aid = _create(client, 1.3000)
    res = client.post("/api/alerts/check", headers=_DEVICE).json()
    assert res["triggered"] == []
    assert [a for a in res["alerts"] if a["id"] == aid][0]["triggered"] is False


def test_another_device_alert_is_not_checked_or_returned(client):
    """عزل الجهاز المجهول: تنبيه جهازٍ آخر لا يُطلق ولا يُسلَّم — ويبقى سليماً بعد المحاولة.

    ومعرّف التثبيت هنا 16 حرفاً فأكثر عمداً: `_install_key` يرفض الأقصر فيصير الصفّ بلا
    مالك، وهو ما يجعل اختباراً بمعرّف قصير يبدو كأنه كشف تسريب ملكية وهو لم يُرسل معرّفاً.
    """
    other = _create(client, 1.1000)
    res = client.post("/api/alerts/check", headers=_OTHER_DEVICE).json()
    assert res["triggered"] == [] and res["alerts"] == []
    mine = client.get("/api/alerts", headers=_DEVICE).json()["alerts"]
    assert [a for a in mine if a["id"] == other][0]["triggered"] is False


def test_alert_edited_during_the_price_fetch_is_not_fired_at_the_old_level(client, monkeypatch):
    """القائمة تُقرأ قبل طلب المزوّد؛ تعديل بينهما (1.1000 ⇒ 1.3000) كان يُوسِم التنبيه **الجديد**
    مُطلَقاً بالمستوى القديم — فلا يُطلق عند 1.3000 أبداً."""
    aid = _create(client, 1.1000)

    def fetch_while_user_edits(sym):
        r = client.patch(f"/api/alerts/{aid}", json={"symbol": "EURUSD", "condition": "above",
                                                      "price": 1.3000}, headers=_DEVICE)
        assert r.status_code == 200, r.text
        return 1.2000, [], None

    monkeypatch.setattr(alert_worker, "_recent_minutes", fetch_while_user_edits)
    res = client.post("/api/alerts/check", headers=_DEVICE).json()
    assert res["triggered"] == []
    row = [a for a in res["alerts"] if a["id"] == aid][0]
    assert row["price"] == 1.3000 and row["triggered"] is False


def test_worker_does_not_fire_an_alert_edited_during_its_fetch(client, monkeypatch):
    aid = _create(client, 1.1000)
    pushed: list = []
    monkeypatch.setattr(alert_worker.expo_push, "send_push", lambda t, ti, b, d: pushed.append(b) or {})

    def fetch_while_user_edits(sym):
        client.patch(f"/api/alerts/{aid}", json={"symbol": "EURUSD", "condition": "above",
                                                  "price": 1.3000}, headers=_DEVICE)
        return 1.2000, [], None

    monkeypatch.setattr(alert_worker, "_recent_minutes", fetch_while_user_edits)
    alert_worker._check_once()
    row = [a for a in db.list_alerts(all_users=True) if a["id"] == aid][0]
    assert row["triggered"] is False and row["price"] == 1.3000
    assert pushed == []


# ------------------------- اقتباس قديم بوقته لا يُطلق تنبيهاً

def _book(price: float, age: float | None):
    import time as _time

    return {"price": price, "quoted_at": None if age is None else _time.time() - age}


def test_worker_quote_older_than_three_minutes_is_not_the_price(monkeypatch):
    """1m قديمة ⇒ `_price`: اقتباس بوقت قبل ساعة كان يُعاد سعراً حالياً فيُطلق «فوق» سُلِّح بعد الهبوط."""
    monkeypatch.setattr(alert_worker.market, "fetch_quote_book", lambda s: _book(1.1050, 3600))
    monkeypatch.setattr(alert_worker.td_ws, "snapshot", lambda max_age=180: {})
    assert alert_worker._price("EURUSD") is None


def test_worker_old_quote_falls_back_to_a_recent_ws_tick(monkeypatch):
    monkeypatch.setattr(alert_worker.market, "fetch_quote_book", lambda s: _book(1.1050, 3600))
    monkeypatch.setattr(alert_worker.td_ws, "snapshot", lambda max_age=180: {"EURUSD": 1.0950})
    assert alert_worker._price("EURUSD") == pytest.approx(1.0950)


@pytest.mark.parametrize("age", [5, None])
def test_worker_fresh_or_untimed_quote_is_still_used(monkeypatch, age):
    monkeypatch.setattr(alert_worker.market, "fetch_quote_book", lambda s: _book(1.1050, age))
    monkeypatch.setattr(alert_worker.td_ws, "snapshot", lambda max_age=180: {})
    assert alert_worker._price("EURUSD") == pytest.approx(1.1050)


@pytest.mark.parametrize("lang, cond, words", [
    ("en", "above", "▲ at or above 1.1"), ("en", "below", "▼ at or below 1.1"),
    ("ar", "above", "▲ عند 1.1 أو فوقه"), ("ar", "below", "▼ عند 1.1 أو تحته"),
])
def test_price_push_states_the_condition_not_a_crossing(lang, cond, words):
    """الشرط ≥/≤: تنبيه يُسلَّح والسعر وراء مستواه يُطلق فوراً — «rose above/تجاوز» كانت تروي حركة لم تحدث."""
    _, body = alert_worker._compose({"kind": "price", "symbol": "EURUSD", "condition": cond, "price": 1.1}, lang)
    assert body == f"EURUSD {words}"
    assert "rose" not in body and "fell" not in body and "تجاوز" not in body and "نزل" not in body


def test_a_cached_close_fetched_before_arming_does_not_fire(client, monkeypatch):
    """إغلاق 1m مخزّن (1.2000) جُلب قبل إنشاء «فوق 1.1000» ليس سعراً بعده: كان يُطلقه فوراً."""
    import time as _time

    fetched = _time.time() - 30
    monkeypatch.setattr(alert_worker, "_recent_minutes", lambda sym: (1.2000, [], fetched))
    aid = _create(client, 1.1000)
    res = client.post("/api/alerts/check", headers=_DEVICE).json()
    assert res["triggered"] == []
    # الجلب التالي بعد التسليح يُطلقه كالمعتاد
    monkeypatch.setattr(alert_worker, "_recent_minutes", lambda sym: (1.2000, [], _time.time() + 1))
    res = client.post("/api/alerts/check", headers=_DEVICE).json()
    assert [a["id"] for a in res["triggered"]] == [aid]


def test_recent_minutes_reports_when_its_close_was_fetched(monkeypatch):
    import time as _time

    now = int(_time.time())
    candles = [{"time": now - 60, "open": 1.1, "high": 1.1, "low": 1.1, "close": 1.1}]
    monkeypatch.setattr(alert_worker.market, "configured", lambda: True)
    monkeypatch.setattr(alert_worker.market, "fetch_time_series_with_meta",
                        lambda *a, **k: (candles, {"kind": "cache", "as_of": now - 40}))
    assert alert_worker._recent_minutes("BTCUSD") == (1.1, candles, now - 40)
