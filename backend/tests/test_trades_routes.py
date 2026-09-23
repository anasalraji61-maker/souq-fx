"""اختبارات دفتر الصفقات (`/api/trades`) — المُصادِق ودلالات PATCH والنتيجة والإحصاءات.

**لماذا ملف مستقلّ**: `test_main_routes.py` بلغ 640 سطراً ويغطّي المصادقة وعزل الملكية بكل
المسارات؛ والدفتر سطحٌ له عقدُه الخاصّ (حقل غائب ≠ null صريح، ونتيجةٌ تُعاد حسابها، وإحصاءات
تُبنى على الصفقات المغلقة وحدها) يستحقّ ملفّه كما أُفرد الإشراف بملفّه.

**بلا شبكة**: كل ما هنا SQLite عبر `TestClient` بلا دورة حياة — لا مزوّد أسعار ولا مهام خلفية.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import db
import main
from core import db_conn

_FAST_ITERATIONS = 1_000

_DEV1 = {"X-Install-Id": "install-aaaaaaaaaaaaaaaa"}
_DEV2 = {"X-Install-Id": "install-bbbbbbbbbbbbbbbb"}

_TRADE = {
    "symbol": "eurusd",
    "side": "buy",
    "entry": 1.1000,
    "size": 0.5,
    "note": "خطة الافتتاح",
    "sl": 1.0950,
    "tp": 1.1100,
}


@pytest.fixture()
def client(tmp_path, monkeypatch):
    """قاعدة نظيفة لكل اختبار + عميل بلا دورة حياة (بلا مهام خلفية)."""
    path = tmp_path / "test_trades.db"
    assert "souq-fx" not in str(path), f"قاعدة الاختبار يجب أن تكون خارج المستودع: {path}"
    monkeypatch.setattr(db_conn, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    monkeypatch.setattr(db, "_PBKDF2_ITERATIONS", _FAST_ITERATIONS)
    db.init_db()
    return TestClient(main.app, raise_server_exceptions=False)


def _open_trade(client, headers=None, **over) -> dict:
    body = {**_TRADE, **over}
    r = client.post("/api/trades", json=body, headers=headers or _DEV1)
    assert r.status_code == 200, r.text
    return r.json()["trade"]


# ─── المُصادِق: صفقة لا يمكن إغلاقها أبداً تُرفض بدل حفظها ────────────────────

@pytest.mark.parametrize(
    "over, why",
    [
        ({"entry": 0}, "دخول صفر: كل إغلاق لاحق قسمة على صفر = 500 دائم"),
        ({"entry": -1.1}, "دخول سالب: النتيجة تنقلب إشارتها فتُعرض الخاسرة رابحة"),
        ({"entry": 1.1, "exit": 0}, "خروج صفر يُحفظ بـ-100% نتيجةً حقيقية"),
        ({"entry": 1.1, "exit": -1.1}, "خروج سالب: نتيجة بمئات النسب المئوية"),
        ({"size": 0}, "حجم صفر كان يصير 1 صامتاً فيرى المتداول حجماً لم يكتبه"),
        ({"size": -2}, "حجم سالب"),
        ({"sl": 0}, "وقف غير موجب كان يُبدَّل بـnull: وقفٌ كتبه المتداول ثم اختفى"),
        ({"tp": -1.11}, "هدف غير موجب — نفس الاختفاء الصامت"),
    ],
)
def test_a_trade_that_could_never_be_closed_is_rejected(client, over, why):
    r = client.post("/api/trades", json={**_TRADE, **over}, headers=_DEV1)
    assert r.status_code == 422, f"{why} — الردّ {r.status_code}"
    assert client.get("/api/trades", headers=_DEV1).json()["trades"] == [], "لا يُحفظ صفّ مرفوض"


@pytest.mark.parametrize("over", [{"entry": 0.00001}, {"size": 0.01}, {"sl": 0.5, "tp": 9999.0}])
def test_small_but_real_values_are_still_accepted(client, over):
    """الحدّ يرصد المستحيل لا الصغير: حساب سنتي بحجم 0.01 وأسعار كسرية تمرّ كما هي."""
    trade = _open_trade(client, **over)
    for k, v in over.items():
        assert trade[k] == v


def test_closing_at_a_non_positive_price_is_rejected(client):
    trade = _open_trade(client)
    for bad in (0, -1.1):
        r = client.post(f"/api/trades/{trade['id']}/close", json={"exit": bad}, headers=_DEV1)
        assert r.status_code == 422, f"إغلاق بـ{bad} — الردّ {r.status_code}"
    still = client.get("/api/trades", headers=_DEV1).json()["trades"][0]
    assert still["status"] == "open" and still["exit"] is None, "الصفقة تبقى مفتوحة بعد الرفض"


def test_patching_to_a_non_positive_price_is_rejected(client):
    """نفس القاعدة بمسار التعديل — وكانت هي وحدها تطبّقها قبل هذا التشغيل."""
    trade = _open_trade(client)
    for bad in ({"entry": 0}, {"exit": -2}, {"size": 0}, {"sl": -1}, {"tp": 0}):
        r = client.patch(f"/api/trades/{trade['id']}", json=bad, headers=_DEV1)
        assert r.status_code == 422, f"{bad} — الردّ {r.status_code}"


def test_a_note_longer_than_the_field_allows_is_rejected(client):
    """`TradeUpdate.note` محدودة بـ500 حرف؛ الإنشاء كان بلا حدّ أصلاً."""
    assert client.post(
        "/api/trades", json={**_TRADE, "note": "ط" * 501}, headers=_DEV1
    ).status_code == 422
    assert client.post(
        "/api/trades", json={**_TRADE, "note": "ط" * 500}, headers=_DEV1
    ).status_code == 200


# ─── الصفّ القديم بدخول غير موجب: يُغلق بنتيجة غير محسوبة لا بـ500 ───────────

def test_a_legacy_row_with_a_zero_entry_closes_instead_of_erroring_forever(client):
    """صفّ حُفظ قبل أن يرفضه المُصادِق (يُكتب هنا بالقاعدة مباشرةً كما كان يُحفظ):
    الإغلاق كان 500 لكل محاولة — صفقة عالقة مفتوحة للأبد بدفتر المتداول."""
    db.add_trade({"symbol": "EURUSD", "side": "buy", "entry": 0, "id": "legacy1"}, None, owner_key=_DEV1["X-Install-Id"])
    r = client.post("/api/trades/legacy1/close", json={"exit": 1.2}, headers=_DEV1)
    assert r.status_code == 200, r.text
    row = r.json()["trade"]
    assert row["status"] == "closed" and row["pnl"] is None, "تُغلق بنتيجة غير محسوبة لا برقم مختلَق"
    assert r.json()["stats"]["trade_count"] == 0, "النتيجة غير المحسوبة لا تدخل الإحصاءات"


def test_fixing_the_entry_of_such_a_row_restores_its_result(client):
    """ومخرج الاسترجاع موجود: تصحيح سعر الدخول بـPATCH يعيد حساب النتيجة."""
    db.add_trade({"symbol": "EURUSD", "side": "buy", "entry": 0, "id": "legacy2"}, None, owner_key=_DEV1["X-Install-Id"])
    client.post("/api/trades/legacy2/close", json={"exit": 1.21}, headers=_DEV1)
    row = client.patch("/api/trades/legacy2", json={"entry": 1.1}, headers=_DEV1).json()["trade"]
    assert row["pnl"] == pytest.approx((1.21 - 1.1) / 1.1 * 100)
