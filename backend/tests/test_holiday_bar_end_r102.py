"""run 102: حدود جلسة العطلة وسط الأسبوع وبعد عطلة الأسبوع.
(1) شمعة 4H ‏20:00 UTC يوم 24 ديسمبر تعبر بداية العطلة (22:00) — كانت «جارية» حتى 00:00 فإغلاقها تيك عطلة
يُنسخ لـW بوقت الجلب داخل العطلة؛ الآن تنتهي 22:00 كإغلاق الجمعة (`forexNextCloseSec` بالتطبيق).
(2) اثنين عطلة (25-12-2028): الأحد قبل جلسة العطلة كان يُعدّ مفتوحاً والكاش يُجلب من جديد الأحد."""
from __future__ import annotations

from datetime import datetime, timezone

import pytest

import twelve_data as market


@pytest.fixture(autouse=True)
def _filter_on(monkeypatch):
    monkeypatch.setattr(market, "WEEKEND_CLOSE_FILTER", True)
    monkeypatch.setattr(market, "CANDLE_DISK", None)
    monkeypatch.setattr(market, "_load_symbol_from_disk", lambda s: None)
    market._cache.clear()
    market._quote_marks.clear()
    yield
    market._cache.clear()
    market._quote_marks.clear()


def _ts(s: str) -> float:
    return datetime.fromisoformat(s).replace(tzinfo=timezone.utc).timestamp()


@pytest.mark.parametrize("sym,opened,step,end", [
    ("EURUSD", "2025-12-24 20:00", 14400, "2025-12-24 22:00"),  # تعبر بداية عطلة الخميس ⇒ تُقصّ
    ("EURUSD", "2025-12-31 21:00", 3600, "2025-12-31 22:00"),
    ("EURUSD", "2025-12-24 16:00", 14400, "2025-12-24 20:00"),  # قبلها — كما هي
    ("EURUSD", "2025-12-25 20:00", 14400, "2025-12-26 00:00"),  # تعبر نهاية العطلة — كما هي
    ("EURUSD", "2025-12-23 20:00", 14400, "2025-12-24 00:00"),  # يوم عادي
    ("BTCUSD", "2025-12-24 20:00", 14400, "2025-12-25 00:00"),  # الرقمية تتداول
    ("EURUSD", "2025-12-22 00:00", 604800, "2025-12-26 22:00"),  # W لا تنتهي بعطلة وسط الأسبوع
])
def test_bar_crossing_holiday_start_ends_there(sym, opened, step, end):
    assert market.bar_end(sym, _ts(opened), step) == _ts(end)


def test_holiday_tick_not_copied_into_week():
    four_h = int(_ts("2025-12-24 20:00"))
    market._cache["EURUSD|4H|180"] = (_ts("2025-12-24 23:30"), [
        {"time": four_h, "open": 1.1, "high": 1.2, "low": 1.0, "close": 1.1777, "volume": None}])
    week = [{"time": int(_ts("2025-12-22 00:00")), "open": 1.1, "high": 1.2, "low": 1.0, "close": 1.15,
             "volume": None}]
    rows, meta = market._with_newest_close("EURUSD", "W", week, {"as_of": _ts("2025-12-24 22:30")})
    assert rows[-1]["close"] == 1.15 and meta["as_of"] == _ts("2025-12-24 22:30")


def test_monday_holiday_extends_weekend():
    # الأحد 24-12-2028 20:00 UTC: عطلة أسبوع ثم جلسة عطلة الاثنين — كلّها مغلقة
    assert market.in_weekend_close("EURUSD", _ts("2028-12-24 20:00"), 14400) is True
    assert market.in_weekend_close("EURUSD", _ts("2028-12-25 22:00"), 60) is False
    assert market._closed_until("EURUSD", _ts("2028-12-23 12:00")) == _ts("2028-12-25 22:00")
    assert market._closed_until("EURUSD", _ts("2028-12-25 12:00")) == _ts("2028-12-25 22:00")
    # أسبوع عادي كما هو
    assert market._closed_until("EURUSD", _ts("2026-10-03 12:00")) == _ts("2026-10-04 21:00")
