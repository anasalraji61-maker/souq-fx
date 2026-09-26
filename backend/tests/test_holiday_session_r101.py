"""run 101: جلسة عطلة الفوركس (25 ديسمبر، 1 يناير — 17:00 نيويورك عشيّتها حتى 17:00 يومها) مغلقة كالتطبيق
(`marketHours.ts` `isForexHolidaySession`). كانت جلسة عادية بالخادم: تيك العطلة «آخر سعر» ويُطلق التنبيهات،
وفي أسبوع جمعته عطلة تبقى شمعة W «جارية» حتى الجمعة فيصير اقتباس العطلة إغلاقها وقمّتها."""
from __future__ import annotations

from datetime import datetime, timezone

import pytest

import twelve_data as market


@pytest.fixture(autouse=True)
def _filter_on(monkeypatch):
    monkeypatch.setattr(market, "WEEKEND_CLOSE_FILTER", True)
    monkeypatch.setattr(market, "CANDLE_DISK", None)
    market._cache.clear()
    market._quote_marks.clear()
    yield
    market._cache.clear()
    market._quote_marks.clear()


def _ts(s: str) -> float:
    return datetime.fromisoformat(s).replace(tzinfo=timezone.utc).timestamp()


@pytest.mark.parametrize("sym,when,step,dropped", [
    ("EURUSD", "2026-12-24 21:59", 60, False),   # الخميس قبل 17:00 نيويورك (شتاءً 22:00 UTC)
    ("EURUSD", "2026-12-24 22:00", 60, True),    # بداية جلسة 25 ديسمبر (الجمعة)
    ("EURUSD", "2026-12-25 12:00", 60, True),
    ("XAUUSD", "2026-12-25 12:00", 3600, True),
    ("EURUSD", "2025-12-25 12:00", 60, True),    # الخميس — عطلة وسط الأسبوع
    ("EURUSD", "2025-12-25 22:00", 60, False),   # تعود الجلسة 17:00 نيويورك
    ("EURUSD", "2025-12-24 21:00", 14400, False),  # 4H تعبر بداية العطلة — تبقى
    ("EURUSD", "2027-01-01 03:00", 60, True),
    ("BTCUSD", "2026-12-25 12:00", 60, False),   # الرقمية تتداول
    ("EURUSD", "2026-12-23 12:00", 60, False),
])
def test_holiday_session_is_closed(sym, when, step, dropped):
    assert market.in_weekend_close(sym, _ts(when), step) is dropped


@pytest.mark.parametrize("label,dropped", [
    ("2026-12-25", True), ("2025-12-25", True), ("2027-01-01", True), ("2026-12-24", False), ("2026-01-02", False),
])
def test_holiday_daily_bar_is_dropped(label, dropped):
    assert market.in_weekend_close("EURUSD", _ts(label + " 00:00"), 86400) is dropped


def test_friday_holiday_week_closes_thursday():
    assert market.bar_end("EURUSD", _ts("2026-12-21 00:00"), 604800) == _ts("2026-12-24 22:00")
    # أسبوع عطلته الخميس يُغلق الجمعة كالمعتاد
    assert market.bar_end("EURUSD", _ts("2025-12-22 00:00"), 604800) == _ts("2025-12-26 22:00")
    assert market.bar_end("BTCUSD", _ts("2026-12-21 00:00"), 604800) == _ts("2026-12-28 00:00")


def test_holiday_quote_is_not_the_weeks_close():
    week = [{"time": int(_ts("2026-12-21 00:00")), "open": 1.10, "high": 1.11, "low": 1.09, "close": 1.105,
             "volume": None}]
    market.note_quote("EURUSD", 1.125, _ts("2026-12-25 12:00"))
    rows, meta = market._with_newest_close("EURUSD", "W", week, {"as_of": _ts("2026-12-24 21:30")})
    assert rows[-1]["close"] == 1.105 and rows[-1]["high"] == 1.11


def test_closed_until_covers_the_holiday():
    # جمعة عطلة ⇒ مغلق حتى افتتاح الأحد 27 ديسمبر 17:00 نيويورك
    assert market._closed_until("EURUSD", _ts("2026-12-24 23:00")) == _ts("2026-12-27 22:00")
    # خميس عطلة ⇒ حتى 17:00 نيويورك يوم العطلة
    assert market._closed_until("EURUSD", _ts("2025-12-24 23:00")) == _ts("2025-12-25 22:00")
    assert market._closed_until("EURUSD", _ts("2025-12-24 22:01")) is None  # قبل مهلة الاستقرار
    assert market._closed_until("BTCUSD", _ts("2025-12-24 23:00")) is None


def test_market_open_false_on_holiday(monkeypatch):
    monkeypatch.setattr(market, "_session_now", lambda: _ts("2025-12-25 12:00"))
    assert market._market_open("EURUSD", True) is False
    monkeypatch.setattr(market, "_session_now", lambda: _ts("2025-12-26 12:00"))
    assert market._market_open("EURUSD", True) is True
