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
