"""تنبيه تقاطع MA/MACD لا يُطلق على تقاطع شمعةٍ **انتهت قبل تسليحه**.

كان تقاطع شمعة الجمعة اليومية يُطلق تنبيه «تقاطع صاعد · D» أُنشئ السبت فوراً — والسوق مغلق — كأنه
حدث للتوّ (`series_fresh_enough` يقيس عمر الجلب لا عمر الشمعة). الشمعة الجارية وقت التسليح مؤهّلة.
"""
from __future__ import annotations

from datetime import datetime, timezone

import pytest

import alert_worker
import main

FRI = int(datetime(2026, 9, 25, tzinfo=timezone.utc).timestamp())  # فتح شمعة D الجمعة
CLOSES = [5, 4, 3, 2, 1, 1, 5]  # SMA2 يقطع SMA3 صعوداً على آخر شمعة


def _candles(last_open: int, step: int = 86400) -> list[dict]:
    n = len(CLOSES)
    return [
        {"time": last_open - (n - 1 - i) * step, "open": c, "high": c, "low": c, "close": c}
        for i, c in enumerate(CLOSES)
    ]


def _alert(armed: datetime, **kw) -> dict:
    return {
        "id": "ia-1", "symbol": "EURUSD", "timeframe": "D", "alert_type": "ma_cross",
        "condition": "cross_up", "fast_period": 2, "slow_period": 3, "value": None,
        "ts": armed.isoformat(), **kw,
    }


SAT = datetime(2026, 9, 26, 10, tzinfo=timezone.utc)
FRI_AFTERNOON = datetime(2026, 9, 25, 9, tzinfo=timezone.utc)


def _worker_fires(monkeypatch, a, candles) -> bool:
    monkeypatch.setattr(alert_worker, "_indicator_series", lambda a, cache=None: candles)
    return alert_worker._check_indicator(a)


def test_cross_on_a_bar_closed_before_arming_does_not_fire(monkeypatch):
    c = _candles(FRI)
    assert _worker_fires(monkeypatch, _alert(SAT), c) is False
    assert main._check_indicator_alert(_alert(SAT), c) is False


def test_cross_on_the_bar_that_was_forming_at_arming_still_fires(monkeypatch):
    """تنبيه D أُنشئ صباح الجمعة والتقاطع تكوّن بعده على شمعة الجمعة نفسها — حدث بعد التسليح."""
    c = _candles(FRI)
    assert _worker_fires(monkeypatch, _alert(FRI_AFTERNOON), c) is True
    assert main._check_indicator_alert(_alert(FRI_AFTERNOON), c) is True


def test_macd_cross_uses_the_same_rule():
    a = _alert(SAT, alert_type="macd_cross")
    assert alert_worker.cross_predates_arming(a, _candles(FRI)) is True


@pytest.mark.parametrize("a", [
    _alert(SAT, alert_type="rsi", condition="above", value=50),  # شرط مستوى لا حدث
    _alert(SAT, ts="not-a-date"),  # بلا لحظة تسليح مقروءة ⇒ السلوك القديم
    _alert(SAT, timeframe="3D"),  # فريم مجهول
])
def test_rule_is_skipped_where_it_does_not_apply(a):
    assert alert_worker.cross_predates_arming(a, _candles(FRI)) is False


def test_candles_without_time_keep_the_old_behaviour():
    assert alert_worker.cross_predates_arming(_alert(SAT), [{"close": 1.0}]) is False


# ─── إعادة التسليح: الشمعة التي أُطلق عليها لا تُطلقه ثانيةً ───────────────────

def test_cross_on_the_bar_it_already_fired_on_is_stale():
    """أُطلق 10:20 على شمعة 1h فُتحت 10:00، وأُعيد تسليحه 10:25: التقاطع نفسه ما يزال على آخر شمعة."""
    c = _candles(FRI, step=3600)
    a = _alert(FRI_AFTERNOON, timeframe="1h", fired_bar=FRI)
    assert alert_worker.cross_already_fired(a, c) is True
    assert alert_worker.cross_is_stale(a, c) is True
    assert main._check_indicator_alert(a, c) is False


def test_the_next_bar_after_the_fired_one_is_eligible():
    c = _candles(FRI + 3600, step=3600)
    a = _alert(FRI_AFTERNOON, timeframe="1h", fired_bar=FRI)
    assert alert_worker.cross_already_fired(a, c) is False
    assert main._check_indicator_alert(a, c) is True


@pytest.mark.parametrize("a", [
    _alert(FRI_AFTERNOON, fired_bar=None),  # لم يُطلق قط (أو صفّ قبل العمود)
    _alert(FRI_AFTERNOON, alert_type="rsi", condition="above", value=50, fired_bar=FRI),  # شرط مستوى
])
def test_fired_bar_rule_is_skipped_where_it_does_not_apply(a):
    assert alert_worker.cross_already_fired(a, _candles(FRI)) is False


def test_last_bar_time():
    assert alert_worker.last_bar_time(_candles(FRI)) == FRI
    assert alert_worker.last_bar_time([]) is None
    assert alert_worker.last_bar_time([{"close": 1.0}]) is None


@pytest.fixture()
def fresh_db(tmp_path, monkeypatch):
    import db
    from core import db_conn

    path = tmp_path / "rearm.db"
    monkeypatch.setattr(db_conn, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    db.init_db()
    return db


def test_rearm_resets_arming_time_and_keeps_the_fired_bar(fresh_db):
    """كان `rearm` يُبقي `ts` وقت الإنشاء ⇒ تقاطع شمعة انتهت قبل إعادة التسليح يُطلق ثانيةً."""
    db = fresh_db
    old = "2026-09-20T09:00:00+00:00"
    db.create_indicator_alert(
        {"id": "ia-r", "symbol": "EURUSD", "timeframe": "1h", "alert_type": "ma_cross",
         "condition": "cross_up", "ts": old}, owner_key="dev-1")
    assert db.mark_indicator_alert_triggered("ia-r", FRI) is True
    row = db.rearm_indicator_alert("ia-r", owner_key="dev-1")
    assert row["triggered"] is False and row["fired_bar"] == FRI
    assert row["ts"] != old
    assert alert_worker._armed_at(row["ts"]) > alert_worker._armed_at(old)
    # الحدث الذي أُطلق عليه لا يُطلقه مرّة ثانية؛ الشمعة التالية تُطلقه
    assert alert_worker.cross_is_stale(row, _candles(FRI, step=3600)) is True


def test_worker_fire_rearm_same_bar_then_next_bar(monkeypatch, fresh_db):
    """الدورة كاملة بـ`_check_once`: يُطلق، يُعاد تسليحه، لا يُطلق على الشمعة نفسها، يُطلق على التالية."""
    db = fresh_db
    now = datetime.now(timezone.utc)
    bar = int(now.timestamp()) // 3600 * 3600
    db.create_indicator_alert(
        {"id": "ia-w", "symbol": "EURUSD", "timeframe": "1h", "alert_type": "ma_cross",
         "condition": "cross_up", "fast_period": 2, "slow_period": 3,
         "ts": datetime.fromtimestamp(bar, timezone.utc).isoformat()}, owner_key="dev-1")
    series = {"c": _candles(bar, step=3600)}

    def fake_series(a, cache=None):
        if cache is not None:
            cache[(str(a["symbol"]).upper(), str(a["timeframe"]))] = series["c"]
        return series["c"]

    monkeypatch.setattr(alert_worker, "_indicator_series", fake_series)

    def state():
        return db.list_indicator_alerts(owner_key="dev-1")[0]

    alert_worker._check_once()
    assert state()["triggered"] is True and state()["fired_bar"] == bar
    db.rearm_indicator_alert("ia-w", owner_key="dev-1")
    alert_worker._check_once()
    assert state()["triggered"] is False, "التقاطع نفسه على الشمعة نفسها كان يُطلقه ثانيةً"
    series["c"] = _candles(bar + 3600, step=3600)
    alert_worker._check_once()
    assert state()["triggered"] is True and state()["fired_bar"] == bar + 3600
