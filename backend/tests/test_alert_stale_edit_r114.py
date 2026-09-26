"""التشغيل 114: PATCH تنبيه من جهاز بقائمة قديمة — `seen_*` (كالصفقة) ⇒ 409 بدل إرجاع المستوى بصمت
وإعادة تسليح تنبيه أُطلق بعد القراءة (إشعار ثانٍ فوري). غائبة = بلا فحص (عملاء قدامى)."""
from __future__ import annotations

from tests.test_price_alert_check import _DEVICE, _OTHER_DEVICE, _create, client  # noqa: F401

import db


def _get(client, aid):
    return [a for a in client.get("/api/alerts", headers=_DEVICE).json()["alerts"] if a["id"] == aid][0]


def _edit(client, aid, price, note="", headers=_DEVICE, **seen):
    return client.patch(f"/api/alerts/{aid}", json={"symbol": "EURUSD", "condition": "above", "price": price,
                                                     "note": note, **seen}, headers=headers)


def test_stale_note_edit_does_not_revert_the_level(client):
    aid = _create(client, 1.1000)
    tablet = _get(client, aid)
    assert _edit(client, aid, 1.2000, seen_price=1.1000, seen_ts=tablet["ts"]).status_code == 200
    r = _edit(client, aid, 1.1000, note="watch NFP", seen_price=tablet["price"], seen_ts=tablet["ts"])
    assert r.status_code == 409
    assert r.json()["detail"]["error"] == "alert_changed" and r.json()["detail"]["alert"]["price"] == 1.2
    assert _get(client, aid)["price"] == 1.2 and _get(client, aid)["note"] == ""


def test_stale_edit_does_not_rearm_an_alert_that_fired_since(client):
    aid = _create(client, 1.1000)
    seen = _get(client, aid)
    assert db.mark_alert_triggered(aid)
    r = _edit(client, aid, 1.1000, note="x", seen_triggered=False, seen_ts=seen["ts"])
    assert r.status_code == 409 and r.json()["detail"]["alert"]["triggered"] is True
    assert _get(client, aid)["triggered"] is True


def test_edit_matching_seen_row_succeeds_and_rearms(client):
    aid = _create(client, 1.1000)
    assert db.mark_alert_triggered(aid)
    seen = _get(client, aid)
    r = _edit(client, aid, 1.3000, seen_symbol="eurusd", seen_condition="above", seen_price=1.1,
              seen_triggered=True, seen_ts=seen["ts"])
    assert r.status_code == 200 and r.json()["alert"]["triggered"] is False and r.json()["alert"]["price"] == 1.3


def test_without_seen_fields_edit_is_unchanged_and_foreign_is_404(client):
    aid = _create(client, 1.1000)
    assert _edit(client, aid, 1.2000).status_code == 200
    # مالك آخر بـ`seen_*` خاطئة: 404 لا 409 (لا يكشف الصفّ)
    assert _edit(client, aid, 1.5, headers=_OTHER_DEVICE, seen_price=9.9).status_code == 404
    assert _get(client, aid)["price"] == 1.2


def _legacy(aid, **cols):
    with db._conn() as c:
        for k, v in cols.items():
            c.execute(f"UPDATE alerts SET {k}=? WHERE id=?", (v, aid))


import pytest  # noqa: E402


@pytest.mark.parametrize("cols", [
    {"symbol": "‏EURUSD"},  # RLM محفوظ قبل c4ecd74
    {"symbol": "EUR/USD"},
    {"price": round(100000.123456, 5)},  # `round(x, 5)` القديم: 11 رقماً معنوياً ≠ `_alert_level`
])
def test_legacy_row_echoed_back_as_seen_can_be_edited(client, cols):
    """التطبيق يعيد الصفّ المخزَّن حرفياً في `seen_*`؛ كان يُطبَّع قبل المقارنة بالعمود الخام ⇒ 409 للأبد
    (وإعادة المحاولة بالصفّ المُعاد 409 أيضاً) فلا يُنقل تنبيه قديم ولا تُعدَّل ملاحظته."""
    aid = _create(client, 1.1000)
    _legacy(aid, **cols)
    a = _get(client, aid)
    r = _edit(client, aid, 1.2000, note="n", seen_symbol=a["symbol"], seen_condition=a["condition"],
              seen_price=a["price"], seen_triggered=a["triggered"], seen_ts=a["ts"])
    assert r.status_code == 200 and r.json()["alert"]["price"] == 1.2


def test_normalised_seen_still_detects_a_real_change(client):
    aid = _create(client, 1.1000)
    a = _get(client, aid)
    assert _edit(client, aid, 1.2000, seen_symbol="GBPUSD", seen_ts=a["ts"]).status_code == 409
    assert _edit(client, aid, 1.2000, seen_price=1.1000000001, seen_ts=a["ts"]).status_code == 200  # ضجيج عائم
    assert _edit(client, aid, 1.3000, seen_price=1.1, seen_ts=a["ts"]).status_code == 409
