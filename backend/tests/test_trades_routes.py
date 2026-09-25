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
        json={"symbol": None, "side": None, "entry": None, "size": None, "note": None},
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


def test_an_empty_journal_has_zeroed_statistics_not_an_error(client):
    """أول ما يراه متداول جديد — لا قسمة على صفر ولا 500."""
    stats = client.get("/api/trades", headers=_DEV1).json()["stats"]
    assert stats == {
        "trade_count": 0,
        "win_rate": 0,
        "total_pnl_pct": 0,
        "avg_win": 0,
        "avg_loss": 0,
        "best": 0,
        "worst": 0,
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
    assert stats["breakeven_count"] == 1 and stats["win_rate"] == 0 and stats["loss_count"] == 0


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
