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
    monkeypatch.setattr(alert_worker, "_recent_minutes", lambda sym: (1.2000, []))
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
        return 1.2000, []

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
        return 1.2000, []

    monkeypatch.setattr(alert_worker, "_recent_minutes", fetch_while_user_edits)
    alert_worker._check_once()
    row = [a for a in db.list_alerts(all_users=True) if a["id"] == aid][0]
    assert row["triggered"] is False and row["price"] == 1.3000
    assert pushed == []
