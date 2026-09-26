"""اختبارات دفتر الصفقات (`/api/trades`) — المُصادِق ودلالات PATCH والنتيجة والإحصاءات.

**لماذا ملف مستقلّ**: `test_main_routes.py` بلغ 640 سطراً ويغطّي المصادقة وعزل الملكية بكل
المسارات؛ والدفتر سطحٌ له عقدُه الخاصّ (حقل غائب ≠ null صريح، ونتيجةٌ تُعاد حسابها، وإحصاءات
تُبنى على الصفقات المغلقة وحدها) يستحقّ ملفّه كما أُفرد الإشراف بملفّه.

**بلا شبكة**: كل ما هنا SQLite عبر `TestClient` بلا دورة حياة — لا مزوّد أسعار ولا مهام خلفية.
"""
from __future__ import annotations

import math

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


def test_an_infinite_price_is_rejected(client):
    """`inf` يجتاز `gt=0` ويعطي `pnl=nan` لا يقبله JSON قياسياً — ومحلّل JSON ببايثون يقبل
    `Infinity` حرفياً بالجسم الوارد، فالطريق مفتوح بلا `allow_inf_nan=False`."""
    r = client.post(
        "/api/trades",
        content=b'{"symbol":"EURUSD","side":"buy","entry":Infinity}',
        headers={**_DEV1, "Content-Type": "application/json"},
    )
    assert r.status_code == 422, r.text
    assert client.get("/api/trades", headers=_DEV1).json()["trades"] == []


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


# ─── دلالات PATCH: حقل غائب ≠ null صريح ──────────────────────────────────────

def test_an_absent_field_changes_nothing_while_an_explicit_null_clears(client):
    """العقد المعلن بـ`TradeUpdate`: ما لم يُرسَل لا يتغيّر، و`null` الصريح يمسح. وهما
    شيئان لا يميّزهما JSON وحده — `model_fields_set` هو ما يميّزهما."""
    trade = _open_trade(client)
    only_note = client.patch(
        f"/api/trades/{trade['id']}", json={"note": "معدّلة"}, headers=_DEV1
    ).json()["trade"]
    assert only_note["sl"] == 1.0950 and only_note["tp"] == 1.1100, "الغائب لم يُمسح"
    assert only_note["symbol"] == "EURUSD" and only_note["size"] == 0.5
    cleared = client.patch(f"/api/trades/{trade['id']}", json={"sl": None}, headers=_DEV1).json()["trade"]
    assert cleared["sl"] is None and cleared["tp"] == 1.1100, "المسح يطال المُرسَل وحده"


def test_clearing_the_exit_reopens_the_trade(client):
    """«أغلقتُ الصفقة بالخطأ» — مسح `exit` يعيدها مفتوحة بلا نتيجة ولا تاريخ إغلاق،
    وتخرج من الإحصاءات لأنها لم تُغلق."""
    trade = _open_trade(client, exit=1.1100)
    assert trade["status"] == "closed"
    r = client.patch(f"/api/trades/{trade['id']}", json={"exit": None}, headers=_DEV1).json()
    assert r["trade"]["status"] == "open"
    assert r["trade"]["exit"] is None and r["trade"]["pnl"] is None and r["trade"]["closed_at"] is None
    assert r["stats"]["trade_count"] == 0


def test_a_null_on_a_required_field_is_ignored_not_written(client):
    """أعمدة إلزامية بالجدول: `null` لها يُتجاهل بدل أن يكسر الصفّ بـ500."""
    trade = _open_trade(client)
    r = client.patch(
        f"/api/trades/{trade['id']}",
        json={"symbol": None, "side": None, "entry": None, "note": None},
        headers=_DEV1,
    )
    assert r.status_code == 200, r.text
    row = r.json()["trade"]
    assert (row["symbol"], row["side"], row["entry"], row["size"]) == ("EURUSD", "buy", 1.1000, 0.5)
    assert row["note"] == "خطة الافتتاح"


def test_correcting_a_typo_in_the_entry_recomputes_the_result(client):
    """خطأ كتابة بسعر الدخول كان يُفسد نسبة النجاح وصافي الدفتر للأبد (الحلّ الوحيد
    كان الحذف وإعادة الكتابة)."""
    trade = _open_trade(client, exit=1.1100)
    row = client.patch(f"/api/trades/{trade['id']}", json={"entry": 1.1050}, headers=_DEV1).json()["trade"]
    assert row["pnl"] == pytest.approx((1.1100 - 1.1050) / 1.1050 * 100)
    assert row["status"] == "closed", "التصحيح لا يفتح صفقة مغلقة"


def test_patching_an_unknown_trade_is_404(client):
    assert client.patch("/api/trades/nope", json={"note": "x"}, headers=_DEV1).status_code == 404


# ─── النتيجة والإحصاءات ──────────────────────────────────────────────────────

@pytest.mark.parametrize(
    "side, exit_price, sign",
    [("buy", 1.1100, 1), ("buy", 1.0900, -1), ("sell", 1.0900, 1), ("sell", 1.1100, -1)],
)
def test_the_sign_of_the_result_follows_the_direction(client, side, exit_price, sign):
    """البيع يربح بالهبوط — وانقلاب الإشارة هنا يقلب دفتر المتداول كلّه."""
    trade = _open_trade(client, side=side, sl=None, tp=None)
    row = client.post(f"/api/trades/{trade['id']}/close", json={"exit": exit_price}, headers=_DEV1).json()["trade"]
    assert row["pnl"] * sign > 0, f"{side} @ {exit_price}"
    assert row["status"] == "closed" and row["closed_at"]


def test_statistics_count_closed_trades_only(client):
    """صفقة مفتوحة ليست نتيجةً بعد: إدخالها بنسبة النجاح يجعلها تهبط بكل صفقة تُفتح."""
    _open_trade(client)
    won = _open_trade(client, exit=1.1100)
    lost = _open_trade(client, exit=1.0900)
    stats = client.get("/api/trades", headers=_DEV1).json()["stats"]
    assert stats["trade_count"] == 2, "المفتوحة خارج العدّ"
    assert stats["win_rate"] == 50.0
    assert stats["best"] == pytest.approx(round(won["pnl"], 2))
    assert stats["worst"] == pytest.approx(round(lost["pnl"], 2))
    assert stats["total_pnl_pct"] == pytest.approx(round(won["pnl"] + lost["pnl"], 2), abs=0.01)


def test_an_average_with_no_trades_behind_it_is_null_not_zero(client):
    """كل الصفقات رابحة ⇒ لا متوسّط خسارة: 0 كان يُقرأ «خسرتُ صفقات بلا شيء»."""
    _open_trade(client, exit=1.1100)
    stats = client.get("/api/trades", headers=_DEV1).json()["stats"]
    assert stats["avg_win"] is not None and stats["avg_win"] > 0
    assert stats["avg_loss"] is None


def test_an_empty_journal_has_zeroed_statistics_not_an_error(client):
    """أول ما يراه متداول جديد — لا قسمة على صفر ولا 500."""
    stats = client.get("/api/trades", headers=_DEV1).json()["stats"]
    assert stats == {
        "trade_count": 0,
        "win_rate": None,
        "total_pnl_pct": 0,
        "avg_win": None,
        "avg_loss": None,
        "best": None,
        "worst": None,
        "win_count": 0,
        "loss_count": 0,
        "breakeven_count": 0,
    }


# ─── الملكية: لا أحد يمسّ دفتر غيره ───────────────────────────────────────────

def test_another_device_can_neither_see_nor_touch_the_journal(client):
    """وكل محاولة يُتحقَّق بعدها أن صفّ المالك **بقي سليماً** — فلا يمرّ حذف صامت
    باختبار «404 وكفى»."""
    trade = _open_trade(client, headers=_DEV1)
    assert client.get("/api/trades", headers=_DEV2).json()["trades"] == []
    assert client.patch(f"/api/trades/{trade['id']}", json={"note": "غريب"}, headers=_DEV2).status_code == 404
    assert client.post(f"/api/trades/{trade['id']}/close", json={"exit": 9.9}, headers=_DEV2).status_code == 404
    assert client.delete(f"/api/trades/{trade['id']}", headers=_DEV2).status_code == 404
    mine = client.get("/api/trades", headers=_DEV1).json()["trades"]
    assert len(mine) == 1
    assert (mine[0]["note"], mine[0]["status"], mine[0]["exit"]) == ("خطة الافتتاح", "open", None)


def test_the_owner_deletes_their_own_trade(client):
    trade = _open_trade(client)
    assert client.delete(f"/api/trades/{trade['id']}", headers=_DEV1).status_code == 200
    assert client.get("/api/trades", headers=_DEV1).json()["trades"] == []
    assert client.delete(f"/api/trades/{trade['id']}", headers=_DEV1).status_code == 404, "والحذف مرّتين 404"


# ─── إغلاق صفقة مغلقة: الخروج الأول لا يُمحى ──────────────────────────────────

def test_closing_an_already_closed_trade_is_409_and_keeps_the_first_exit(client):
    """جهازان يُغلقان الصفقة نفسها: كان الثاني يستبدل خروج الأول ونتيجته بصمت."""
    trade = _open_trade(client, sl=None, tp=None)
    first = client.post(f"/api/trades/{trade['id']}/close", json={"exit": 1.1100}, headers=_DEV1)
    assert first.status_code == 200
    second = client.post(f"/api/trades/{trade['id']}/close", json={"exit": 1.0900}, headers=_DEV1)
    assert second.status_code == 409
    detail = second.json()["detail"]
    assert detail["error"] == "trade_already_closed"
    assert detail["trade"]["exit"] == pytest.approx(1.1100), "الردّ يحمل الخروج المسجَّل"
    assert "owner_key" not in detail["trade"]
    row = client.get("/api/trades", headers=_DEV1).json()["trades"][0]
    assert row["exit"] == pytest.approx(1.1100)
    assert row["pnl"] > 0


def test_the_close_update_itself_requires_an_open_trade(client, monkeypatch):
    """السباق بين القراءة والتحديث: جهاز آخر يُغلق الصفقة **بعد** قراءتنا وقبل تحديثنا ⇒
    الشرط داخل `UPDATE` نفسه يمنع المحو، لا الفحص الذي سبقه."""
    trade = _open_trade(client, sl=None, tp=None)
    real_conn = db._conn

    class _Proxy:
        def __init__(self, inner):
            self._i = inner

        def __enter__(self):
            self._i.__enter__()
            return self

        def __exit__(self, *a):
            return self._i.__exit__(*a)

        def execute(self, sql, args=()):
            if sql.lstrip().startswith("UPDATE trades SET exit"):
                other = real_conn()
                with other:
                    other.execute(
                        "UPDATE trades SET exit=1.2, pnl=9.09, status='closed' WHERE id=?", (trade["id"],)
                    )
                other.close()
            return self._i.execute(sql, args)

    monkeypatch.setattr(db, "_conn", lambda: _Proxy(real_conn()))
    with pytest.raises(db.TradeAlreadyClosed) as e:
        db.close_trade(trade["id"], 1.05, owner_key=_DEV1["X-Install-Id"])
    assert e.value.trade["exit"] == pytest.approx(1.2)
    monkeypatch.setattr(db, "_conn", real_conn)
    row = client.get("/api/trades", headers=_DEV1).json()["trades"][0]
    assert row["exit"] == pytest.approx(1.2), "خروج الجهاز الأول باقٍ"


def _race_on_update(monkeypatch, trade_id, times=1):
    """جهاز آخر يُغلق الصفقة (خروج 1.2001) بعد قراءة PATCH وقبل كتابته — `times` مرّات."""
    real_conn = db._conn
    left = {"n": times}

    class _Proxy:
        def __init__(self, inner):
            self._i = inner

        def __enter__(self):
            self._i.__enter__()
            return self

        def __exit__(self, *a):
            return self._i.__exit__(*a)

        def execute(self, sql, args=()):
            if sql.lstrip().startswith("UPDATE trades SET symbol") and left["n"] > 0:
                left["n"] -= 1
                other = real_conn()
                with other:
                    other.execute(
                        # كل سباق يغيّر الخروج (تصحيح من الجهاز الآخر) فلا تطابق لقطةٌ قديمة
                        "UPDATE trades SET exit=COALESCE(exit, 1.2) + 0.0001, pnl=9.09, "
                        "status='closed', closed_at='x' WHERE id=?",
                        (trade_id,),
                    )
                other.close()
            return self._i.execute(sql, args)

    monkeypatch.setattr(db, "_conn", lambda: _Proxy(real_conn()))
    return real_conn


def test_a_patch_racing_a_close_does_not_erase_the_exit(client, monkeypatch):
    """PATCH (ملاحظة/وقف) يقرأ الصفّ مفتوحاً، جهاز آخر يُغلقه، ثم كان PATCH يكتب الصفّ المقروء كلّه
    فيعود exit=NULL وstatus='open' — الخروج المسجَّل يُمحى. الآن يُعاد التعديل على الصفّ الجديد."""
    trade = _open_trade(client, sl=None, tp=None)
    real_conn = _race_on_update(monkeypatch, trade["id"])
    r = client.patch(f"/api/trades/{trade['id']}", json={"note": "بعد الخبر"}, headers=_DEV1)
    monkeypatch.setattr(db, "_conn", real_conn)
    assert r.status_code == 200, r.text
    row = client.get("/api/trades", headers=_DEV1).json()["trades"][0]
    assert row["status"] == "closed" and row["exit"] == pytest.approx(1.2001), "الخروج باقٍ"
    assert row["note"] == "بعد الخبر", "والتعديل طُبِّق على الصفّ الجديد"


def test_a_patch_that_keeps_losing_the_race_is_409_not_a_blind_write(client, monkeypatch):
    trade = _open_trade(client, sl=None, tp=None)
    real_conn = _race_on_update(monkeypatch, trade["id"], times=99)
    r = client.patch(f"/api/trades/{trade['id']}", json={"note": "x"}, headers=_DEV1)
    monkeypatch.setattr(db, "_conn", real_conn)
    assert r.status_code == 409
    assert r.json()["detail"]["error"] == "trade_changed_concurrently"
    row = client.get("/api/trades", headers=_DEV1).json()["trades"][0]
    assert row["status"] == "closed" and row["exit"] is not None


def test_a_closed_trade_can_still_be_corrected_on_purpose_via_patch(client):
    trade = _open_trade(client, exit=1.1100)
    r = client.patch(f"/api/trades/{trade['id']}", json={"exit": 1.1050}, headers=_DEV1)
    assert r.status_code == 200 and r.json()["trade"]["exit"] == pytest.approx(1.1050)


# ─── حجم غير مُرسَل = غير معروف، لا لوت واحد ─────────────────────────────────

def test_a_trade_saved_without_a_size_has_no_size_not_one_lot(client):
    body = {k: v for k, v in _TRADE.items() if k != "size"}
    r = client.post("/api/trades", json=body, headers=_DEV1)
    assert r.status_code == 200
    assert r.json()["trade"]["size"] is None
    row = client.get("/api/trades", headers=_DEV1).json()["trades"][0]
    assert row["size"] is None, "لا «1.00 لوت» لم يكتبه المتداول"


def test_an_explicit_size_is_kept_exactly(client):
    assert _open_trade(client, size=1)["size"] == 1
    assert _open_trade(client, size=0.03)["size"] == pytest.approx(0.03)


def test_a_sizeless_trade_can_be_given_a_size_later(client):
    body = {k: v for k, v in _TRADE.items() if k != "size"}
    trade = client.post("/api/trades", json=body, headers=_DEV1).json()["trade"]
    r = client.patch(f"/api/trades/{trade['id']}", json={"size": 0.2}, headers=_DEV1)
    assert r.json()["trade"]["size"] == pytest.approx(0.2)


def test_an_explicit_null_size_clears_it_to_unknown(client):
    """صفوف ما قبل a078946 حُفظت «1 لوت» لم يكتبه المتداول؛ null كان يُتجاهل فلا يُمحى أبداً."""
    trade = _open_trade(client, size=1)
    r = client.patch(f"/api/trades/{trade['id']}", json={"size": None}, headers=_DEV1)
    assert r.status_code == 200, r.text
    assert r.json()["trade"]["size"] is None
    row = client.get("/api/trades", headers=_DEV1).json()["trades"][0]
    assert row["size"] is None


def test_an_absent_size_still_changes_nothing(client):
    trade = _open_trade(client)
    r = client.patch(f"/api/trades/{trade['id']}", json={"note": "x"}, headers=_DEV1)
    assert r.json()["trade"]["size"] == 0.5


# ─── الإحصاءات على كل الصفقات، والتعادل ليس خسارة ───────────────────────────

def test_a_breakeven_trade_is_not_a_loss(client):
    """متداول نقل وقفه للدخول: الصفقة أُغلقت على الدخول بالضبط."""
    _open_trade(client, exit=1.1100)
    _open_trade(client, exit=1.0900)
    _open_trade(client, exit=1.1000)  # تعادل
    stats = client.get("/api/trades", headers=_DEV1).json()["stats"]
    assert stats["trade_count"] == 3
    assert (stats["win_count"], stats["loss_count"], stats["breakeven_count"]) == (1, 1, 1)
    assert stats["win_rate"] == 50.0, "كانت 33.3 — التعادل محسوب خسارة"
    assert stats["avg_loss"] < 0, "متوسط الخسارة لا يخفّفه صفر التعادل"


def test_only_breakevens_give_no_win_rate_not_zero_percent_losses(client):
    _open_trade(client, exit=1.1000)
    stats = client.get("/api/trades", headers=_DEV1).json()["stats"]
    assert stats["breakeven_count"] == 1 and stats["loss_count"] == 0
    assert stats["win_rate"] is None, "0 تُعرض «نسبة نجاح 0%» = خسر كل صفقاته (backend-r6 (5))"


def test_trades_that_net_to_zero_total_zero_not_minus_zero(client):
    """بيعان خاسران 11 و22 نقطة + شراء رابح 33 نقطة = صافٍ صفر؛ المجموع العائم −5.5e-17 كان يُقرَّب `-0.0`
    فيعرض التطبيق «صافي −0.00%» — خسارة لم تحدث (نفس عيب الاختبار الخلفي `ce2dce6`)."""
    _open_trade(client, side="sell", exit=1.1011)
    _open_trade(client, side="sell", exit=1.1022)
    _open_trade(client, side="buy", exit=1.1033)
    r = client.get("/api/trades", headers=_DEV1)
    assert '"total_pnl_pct":-0.0' not in r.text.replace(" ", "")
    stats = r.json()["stats"]
    assert stats["total_pnl_pct"] == 0.0 and math.copysign(1, stats["total_pnl_pct"]) == 1


def test_a_sub_rounding_best_or_worst_is_not_minus_zero(client):
    _open_trade(client, side="sell", exit=1.10001)  # −0.0009%: خسارة حقيقية لكنها تُقرَّب صفراً
    stats = client.get("/api/trades", headers=_DEV1).json()["stats"]
    assert stats["loss_count"] == 1
    for k in ("best", "worst", "total_pnl_pct"):
        assert math.copysign(1, stats[k]) == 1, k


def _bulk_insert(n_open: int, n_won: int, key: str) -> None:
    rows = []
    for i in range(n_won):
        rows.append((f"w{i}", key, 1.1, 1.11, 0.909, f"2020-01-01 00:{i // 60:02d}", "closed"))
    for i in range(n_open):
        rows.append((f"o{i}", key, 1.1, None, None, f"2026-01-01 00:{i // 60:02d}", "open"))
    with db._conn() as c:
        c.executemany(
            "INSERT INTO trades(id,user_id,owner_key,symbol,side,entry,exit,size,pnl,note,opened_at,status) "
            "VALUES(?,NULL,?,'EURUSD','buy',?,?,NULL,?,'',?,?)",
            rows,
        )


def test_statistics_cover_every_closed_trade_not_the_latest_200(client):
    """250 صفقة رابحة قديمة ثم 200 مفتوحة أحدث: كانت الإحصاءات تُحسب من أحدث 200 = صفر مغلقة."""
    _bulk_insert(n_open=200, n_won=250, key=_DEV1["X-Install-Id"])
    body = client.get("/api/trades", headers=_DEV1).json()
    assert body["stats"]["trade_count"] == 250
    assert body["stats"]["win_rate"] == 100.0
    assert body["total"] == 450
    assert len(body["trades"]) == 200


def test_older_trades_are_reachable_by_paging(client):
    _bulk_insert(n_open=10, n_won=5, key=_DEV1["X-Install-Id"])
    first = client.get("/api/trades?limit=10", headers=_DEV1).json()
    rest = client.get("/api/trades?limit=10&offset=10", headers=_DEV1).json()
    ids = [t["id"] for t in first["trades"]] + [t["id"] for t in rest["trades"]]
    assert len(ids) == 15 and len(set(ids)) == 15
    assert first["total"] == rest["total"] == 15


@pytest.mark.parametrize("q", ["limit=0", "limit=501", "offset=-1"])
def test_page_bounds_are_enforced(client, q):
    assert client.get(f"/api/trades?{q}", headers=_DEV1).status_code == 422


def test_logged_in_client_without_install_id_sees_only_its_own_trades(client):
    """مسجّل بلا `X-Install-Id` كان يرى دلو المجهولين القديم (صفقات **كل** متداول مجهول قبل معرّف
    التثبيت) فيعدّلها ويحذفها، وتدخل نسبة فوز حسابه."""
    r = client.post("/api/trades", json={**_TRADE, "exit": 1.0900})  # صفّ مجهول قديم: خسارة لغريب
    assert r.status_code == 200, r.text
    stranger = r.json()["trade"]
    r = client.post(
        "/api/auth/register",
        json={"username": "hana", "email": "hana@example.com", "password": "pass1234"},
    )
    assert r.status_code == 200, r.text
    me = {"Authorization": f"Bearer {r.json()['token']}"}
    mine = _open_trade(client, headers=me, exit=1.1100)

    body = client.get("/api/trades", headers=me).json()
    assert [t["id"] for t in body["trades"]] == [mine["id"]]
    assert body["stats"]["trade_count"] == 1
    assert body["stats"]["win_rate"] == 100.0
    assert client.delete(f"/api/trades/{stranger['id']}", headers=me).status_code == 404
    assert client.patch(f"/api/trades/{stranger['id']}", json={"note": "x"}, headers=me).status_code == 404
    # والعميل القديم المجهول ما زال يرى صفّه
    assert [t["id"] for t in client.get("/api/trades").json()["trades"]] == [stranger["id"]]


def _signup(client, name: str) -> dict:
    r = client.post(
        "/api/auth/register",
        json={"username": name, "email": f"{name}@example.com", "password": "pass1234"},
    )
    assert r.status_code == 200, r.text
    return {"Authorization": f"Bearer {r.json()['token']}", **_DEV1}


def test_pre_signup_trades_leave_with_the_deleted_account_not_to_the_next_one(client):
    """صفقة كُتبت مجهولةً ثم سُجّل الدخول كانت تبقى `user_id=NULL` (توسيع قراءة فقط) ⇒ حذف الحساب
    يُبقيها، والحساب التالي على الهاتف نفسه يراها ويعدّلها وتدخل في نسبة فوزه."""
    _open_trade(client, exit=1.0900)
    alice = _signup(client, "alice")
    assert client.get("/api/trades", headers=alice).json()["stats"]["trade_count"] == 1
    assert client.delete("/api/auth/account", headers=alice).status_code == 200

    assert client.get("/api/trades", headers=_DEV1).json()["trades"] == []
    bob = _signup(client, "bob")
    body = client.get("/api/trades", headers=bob).json()
    assert body["trades"] == [] and body["stats"]["trade_count"] == 0


def test_pre_signup_rows_follow_the_account_to_a_second_phone(client):
    _open_trade(client)
    alice = _signup(client, "alice")
    client.get("/api/trades", headers=alice)
    other_phone = {"Authorization": alice["Authorization"], **_DEV2}
    assert len(client.get("/api/trades", headers=other_phone).json()["trades"]) == 1
    # وبعد الخروج لا يراها من يستعمل الهاتف مجهولاً
    client.post("/api/auth/logout", headers=alice)
    assert client.get("/api/trades", headers=_DEV1).json()["trades"] == []


def test_rows_written_under_an_expired_session_are_claimed_on_the_next_login(client):
    alice = _signup(client, "alice")
    client.get("/api/trades", headers=alice)
    _open_trade(client, headers={"Authorization": "Bearer expired", **_DEV1})  # يُحفظ مجهولاً
    r = client.post("/api/auth/login", json={"username": "alice", "password": "pass1234"})
    again = {"Authorization": f"Bearer {r.json()['token']}", **_DEV2}
    client.get("/api/trades", headers={**again, **_DEV1})
    assert len(client.get("/api/trades", headers=again).json()["trades"]) == 1


# ─── `opened_at` من العميل: بصيغة الدفتر أو 422 ─────────────────────────────

@pytest.fixture()
def utc_server(monkeypatch):
    import time as _time

    monkeypatch.setenv("TZ", "UTC")
    _time.tzset()
    yield
    monkeypatch.undo()
    _time.tzset()


def test_client_opened_at_is_stored_in_the_journal_format(client, utc_server):
    t = _open_trade(client, opened_at="2026-09-25T08:00:00Z")
    assert t["opened_at"] == "2026-09-25 08:00"
    assert _open_trade(client, opened_at="2026-09-25T11:30:00+03:00")["opened_at"] == "2026-09-25 08:30"
    assert _open_trade(client, opened_at="2026-09-25 10:00")["opened_at"] == "2026-09-25 10:00"


def test_iso_opened_at_sorts_by_time_not_by_text(client):
    early = _open_trade(client, opened_at="2026-09-25T08:00:00")["id"]
    late = _open_trade(client, opened_at="2026-09-25 10:00")["id"]
    ids = [t["id"] for t in client.get("/api/trades", headers=_DEV1).json()["trades"]]
    assert ids.index(late) < ids.index(early)


@pytest.mark.parametrize("bad", ["yesterday", "25/09/2026", "2026-13-01"])
def test_unreadable_opened_at_is_rejected(client, bad):
    r = client.post("/api/trades", json={**_TRADE, "opened_at": bad}, headers=_DEV1)
    assert r.status_code == 422, r.text


def test_future_opened_at_is_rejected(client):
    """صفقة «فُتحت» غداً كانت تُحفظ — ومع `exit` تُغلق (الآن) قبل أن تُفتح وتتصدّر الدفتر."""
    from datetime import datetime, timedelta

    tomorrow = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d %H:%M")
    for extra in ({}, {"exit": 1.1}):
        r = client.post("/api/trades", json={**_TRADE, "opened_at": tomorrow, **extra}, headers=_DEV1)
        assert r.status_code == 422, r.text
    assert client.get("/api/trades", headers=_DEV1).json()["trades"] == []
    # فرق ساعة الجهاز بدقيقة واحدة ما زال مقبولاً
    soon = (datetime.now() + timedelta(minutes=1)).strftime("%Y-%m-%d %H:%M")
    assert _open_trade(client, opened_at=soon)["opened_at"] == soon


# ─── إغلاق/تعديل متزامنان: النتيجة من الدخول القائم لا المقروء قبل التصحيح ───────────

def _race_before(monkeypatch, prefix: str, other_sql: str, trade_id: str, times: int = 1):
    """جهاز آخر ينفّذ `other_sql` بعد قراءتنا وقبل `UPDATE` يبدأ بـ`prefix` — `times` مرّات."""
    real_conn = db._conn
    left = {"n": times}

    class _Proxy:
        def __init__(self, inner):
            self._i = inner

        def __enter__(self):
            self._i.__enter__()
            return self

        def __exit__(self, *a):
            return self._i.__exit__(*a)

        def execute(self, sql, args=()):
            if sql.lstrip().startswith(prefix) and left["n"] > 0:
                left["n"] -= 1
                other = real_conn()
                with other:
                    other.execute(other_sql, (trade_id,))
                other.close()
            return self._i.execute(sql, args)

    monkeypatch.setattr(db, "_conn", lambda: _Proxy(real_conn()))
    return real_conn


def test_a_close_racing_an_entry_fix_scores_against_the_fixed_entry(client, monkeypatch):
    """شراء 1.2 صُحّح لـ1.1 من جهاز آخر أثناء الإغلاق عند 1.15: كان يُخزَّن −4.17% (من 1.2) بجانب
    دخول 1.1 — رابحة تُعدّ خاسرة بنسبة الفوز."""
    trade = _open_trade(client, entry=1.2, sl=None, tp=None)
    real_conn = _race_before(
        monkeypatch, "UPDATE trades SET exit", "UPDATE trades SET entry=1.1 WHERE id=?", trade["id"]
    )
    r = client.post(f"/api/trades/{trade['id']}/close", json={"exit": 1.15}, headers=_DEV1)
    monkeypatch.setattr(db, "_conn", real_conn)
    assert r.status_code == 200, r.text
    row = client.get("/api/trades", headers=_DEV1).json()["trades"][0]
    assert row["entry"] == pytest.approx(1.1)
    assert row["pnl"] == pytest.approx((1.15 - 1.1) / 1.1 * 100, abs=0.01)
    assert r.json()["trade"]["pnl"] == pytest.approx(row["pnl"])
    assert r.json()["stats"]["win_rate"] == 100


def test_a_close_that_keeps_losing_to_entry_edits_is_409(client, monkeypatch):
    trade = _open_trade(client, entry=1.2, sl=None, tp=None)
    real_conn = _race_before(
        monkeypatch, "UPDATE trades SET exit", "UPDATE trades SET entry=entry+0.0001 WHERE id=?",
        trade["id"], times=99,
    )
    r = client.post(f"/api/trades/{trade['id']}/close", json={"exit": 1.15}, headers=_DEV1)
    monkeypatch.setattr(db, "_conn", real_conn)
    assert r.status_code == 409 and r.json()["detail"]["error"] == "trade_changed_concurrently"
    row = client.get("/api/trades", headers=_DEV1).json()["trades"][0]
    assert row["status"] == "open" and row["pnl"] is None


def test_two_concurrent_patches_do_not_erase_each_other(client, monkeypatch):
    """PATCH الاتجاه يقرأ الصفّ، ثم PATCH الدخول من جهاز آخر يُكتب: كان الأول يعيد كتابة الدخول القديم
    فيُمحى التصحيح بصمت. الآن يُعاد على الصفّ الجديد فيبقى التعديلان."""
    trade = _open_trade(client, entry=1.2, exit=1.15, sl=None, tp=None)
    real_conn = _race_before(
        monkeypatch, "UPDATE trades SET symbol", "UPDATE trades SET entry=1.1 WHERE id=?", trade["id"]
    )
    r = client.patch(f"/api/trades/{trade['id']}", json={"side": "sell"}, headers=_DEV1)
    monkeypatch.setattr(db, "_conn", real_conn)
    assert r.status_code == 200, r.text
    row = client.get("/api/trades", headers=_DEV1).json()["trades"][0]
    assert row["side"] == "sell" and row["entry"] == pytest.approx(1.1)
    assert row["pnl"] == pytest.approx((1.1 - 1.15) / 1.1 * 100, abs=0.01)


# ─── نتيجة خارج المدى: None بدل inf يكسر الدفتر كله ─────────────────────────

def test_an_overflowing_pnl_is_not_scored_and_the_journal_stays_readable(client):
    """دخول 1e-300 وخروج 1e308 مقبولان بالمُصادِق لكن `pnl=inf` ⇒ كان الإنشاء 500 وكل طلب دفتر بعده 500."""
    r = client.post("/api/trades", json={**_TRADE, "entry": 1e-300, "exit": 1e308}, headers=_DEV1)
    assert r.status_code == 200, r.text
    assert r.json()["trade"]["pnl"] is None
    r = client.get("/api/trades", headers=_DEV1)
    assert r.status_code == 200, r.text
    assert r.json()["stats"]["trade_count"] == 0


def test_two_huge_but_finite_pnls_do_not_sum_to_infinity(client):
    """1e306% لكل صفقة منتهٍ، ومجموعهما inf — السقف يخرجهما من الإحصاء بدل 500."""
    for _ in range(2):
        _open_trade(client, entry=1.0, exit=1e306)
    r = client.get("/api/trades", headers=_DEV1)
    assert r.status_code == 200, r.text
    assert math.isfinite(r.json()["stats"]["total_pnl_pct"])


def test_a_large_real_typo_move_is_still_scored(client):
    """خطأ كتابة واقعي (دخول 0.00001 بدل 1.1) يبقى محسوباً — السقف للعبث العددي فقط."""
    t = _open_trade(client, entry=0.00001, exit=1.1)
    assert t["pnl"] == pytest.approx((1.1 - 0.00001) / 0.00001 * 100)


@pytest.mark.parametrize("sym", ["   ", " \t a "])
def test_a_blank_trade_symbol_is_refused_after_stripping(client, sym):
    """«   » كان يجتاز `min_length=3` ثم يُحفظ رمزاً فارغاً."""
    assert client.post("/api/trades", json={**_TRADE, "symbol": sym}, headers=_DEV1).status_code == 422
    t = _open_trade(client)
    assert client.patch(f"/api/trades/{t['id']}", json={"symbol": sym}, headers=_DEV1).status_code == 422


def test_a_padded_symbol_is_stored_stripped(client):
    assert _open_trade(client, symbol="  gbpusd ")["symbol"] == "GBPUSD"


@pytest.mark.parametrize("when", ["0999-01-01", "0001-01-01T00:00:00+05:00", "1969-12-31 23:59"])
def test_an_ancient_opened_at_is_refused_not_sorted_as_newest(client, when):
    """«0999-01-01» كان يُحفظ «999-01-01 00:00» فيتصدّر الدفتر نصّياً؛ سنة 1 بإزاحة كانت 500."""
    r = client.post("/api/trades", json={**_TRADE, "opened_at": when}, headers=_DEV1)
    assert r.status_code == 422


def test_old_rows_with_pnl_multiplied_by_size_are_recomputed_on_startup(client):
    """قبل d2417d6 كان `pnl = نسبة × الحجم`: ربح 1% بـ10 لوت مخزَّن «10» يتصدّر أفضل صفقة ومتوسط الربح."""
    big = _open_trade(client, side="buy", entry=1.0, size=10)
    small = _open_trade(client, side="sell", entry=1.0, size=0.1)
    for t, ex in ((big, 1.01), (small, 1.01)):
        assert client.post(f"/api/trades/{t['id']}/close", json={"exit": ex}, headers=_DEV1).status_code == 200
    with db._conn() as c:
        c.execute("UPDATE trades SET pnl=10.0 WHERE id=?", (big["id"],))
        c.execute("UPDATE trades SET pnl=-0.1 WHERE id=?", (small["id"],))
    db.init_db()
    rows = {t["id"]: t for t in client.get("/api/trades", headers=_DEV1).json()["trades"]}
    assert rows[big["id"]]["pnl"] == pytest.approx(1.0)
    assert rows[small["id"]]["pnl"] == pytest.approx(-1.0)


# ─── وقت الإغلاق لا يُخترع لصفقة تُسجَّل بعد حدوثها (run 54) ─────────────────────


def test_backdated_closed_trade_has_unknown_close_time(client):
    t = _open_trade(client, exit=1.105, opened_at="2026-08-01T10:00:00")
    assert t["status"] == "closed" and t["opened_at"] == "2026-08-01 10:00"
    assert t["closed_at"] is None, "كان «الآن» — تاريخ إغلاق لم يحدث"


def test_backdated_closed_trade_keeps_supplied_close_time(client):
    t = _open_trade(client, exit=1.105, opened_at="2026-08-01T10:00:00", closed_at="2026-08-02T15:30:00")
    assert t["closed_at"] == "2026-08-02 15:30"


def test_trade_logged_now_with_exit_still_closes_now(client):
    t = _open_trade(client, exit=1.105)
    assert t["closed_at"] and t["closed_at"] >= t["opened_at"]


@pytest.mark.parametrize("over", [
    {"exit": 1.105, "opened_at": "2026-08-02T10:00:00", "closed_at": "2026-08-01T10:00:00"},  # قبل الفتح
    {"opened_at": "2026-08-01T10:00:00", "closed_at": "2026-08-02T10:00:00"},  # بلا سعر خروج
    {"exit": 1.105, "closed_at": "2026-08-02T10:00:00"},  # الفتح يصير «الآن» ⇒ بعد الإغلاق
    {"exit": 1.105, "opened_at": "2026-08-01T10:00:00", "closed_at": "2999-01-01T00:00:00"},
])
def test_inconsistent_close_time_is_422(client, over):
    r = client.post("/api/trades", json={**_TRADE, **over}, headers=_DEV1)
    assert r.status_code == 422, r.text


def test_correcting_exit_of_backdated_trade_keeps_close_time_unknown(client):
    """run 55: PATCH `exit` (تصحيح خطأ كتابة) كان يملأ `closed_at` = الآن لصفقة إغلاقها غير معروف."""
    t = _open_trade(client, exit=1.105, opened_at="2026-08-01T10:00:00")
    r = client.patch(f"/api/trades/{t['id']}", json={"exit": 1.107}, headers=_DEV1)
    assert r.status_code == 200, r.text
    row = r.json()["trade"]
    assert row["exit"] == 1.107 and row["status"] == "closed"
    assert row["closed_at"] is None


def test_closing_open_trade_by_patch_still_stamps_now(client):
    t = _open_trade(client)
    row = client.patch(f"/api/trades/{t['id']}", json={"exit": 1.107}, headers=_DEV1).json()["trade"]
    assert row["status"] == "closed" and row["closed_at"]


def test_journal_averages_are_never_negative_zero(client):
    """run 55: خسارة 0.3 نقطة ⇒ avg_loss «-0.0» (best/worst كانا مصحَّحين، المتوسّطان لا)."""
    _open_trade(client, entry=1.08, exit=1.07997)
    _open_trade(client, entry=1.08, exit=1.08004)
    st = client.get("/api/trades", headers=_DEV1).json()["stats"]
    assert st["win_count"] == 1 and st["loss_count"] == 1
    assert repr(st["avg_loss"]) == "0.0" and repr(st["avg_win"]) == "0.0"
