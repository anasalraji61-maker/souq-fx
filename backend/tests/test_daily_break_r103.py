"""run 103: الكسر اليومي مغلق كالتطبيق (`marketHours.ts` `inMetalsDailyBreak`/`inIceDailyBreak`) — المعادن وWTI
17:00–18:00 نيويورك، وبرنت 23:00–01:00 لندن، ليالي الاثنين–الخميس. كان الخادم يعدّه جلسة: شمعة/اقتباس يملأ به
المزوّد الساعة يُعرض سعراً حيّاً ويُطلق التنبيهات، و`market_open: true` والتطبيق يقول «مغلق»."""
from __future__ import annotations

from datetime import datetime, timezone

import pytest

import twelve_data as market


@pytest.fixture(autouse=True)
def _filter_on(monkeypatch):
    monkeypatch.setattr(market, "WEEKEND_CLOSE_FILTER", True)


def _ts(s: str) -> float:
    return datetime.fromisoformat(s).replace(tzinfo=timezone.utc).timestamp()


@pytest.mark.parametrize("sym,when,step,dropped", [
    # الثلاثاء 29-09-2026 صيفاً: 17:00 نيويورك = 21:00 UTC
    ("XAUUSD", "2026-09-29 20:59", 60, False),
    ("XAUUSD", "2026-09-29 21:00", 60, True),
    ("XAUUSD", "2026-09-29 21:59", 60, True),
    ("XAUUSD", "2026-09-29 22:00", 60, False),
    ("XAUUSD", "2026-09-29 21:45", 900, True),
    ("XAUUSD", "2026-09-29 21:00", 3600, True),
    ("XAUUSD", "2026-09-29 20:30", 3600, False),   # تعبر بداية الكسر — تبقى
    ("XAUUSD", "2026-09-29 21:00", 14400, False),  # 4H تبدأ بالكسر وتتجاوزه — تبقى
    ("XAGUSD", "2026-12-01 22:30", 60, True),      # شتاءً 22:00 UTC
    ("XAGUSD", "2026-12-01 21:30", 60, False),
    ("USOIL", "2026-09-28 21:30", 60, True),       # الاثنين
    ("XAUEUR", "2026-09-30 21:10", 60, True),      # زوج ISO بالذهب
    ("EURUSD", "2026-09-29 21:30", 60, False),     # الفوركس بلا كسر
    ("BTCUSD", "2026-09-29 21:30", 60, False),
    # برنت: 23:00–01:00 لندن = 22:00–00:00 UTC صيفاً، 23:00–01:00 شتاءً
    ("UKOIL", "2026-09-29 21:59", 60, False),
    ("UKOIL", "2026-09-29 22:00", 60, True),
    ("UKOIL", "2026-09-29 23:59", 60, True),
    ("UKOIL", "2026-09-30 00:00", 60, False),
    ("UKOIL", "2026-09-29 22:00", 7200, True),
    ("UKOIL", "2026-12-02 00:30", 60, True),       # كسر ليلة الثلاثاء شتاءً يعبر منتصف ليل UTC
    ("UKOIL", "2026-12-02 01:00", 60, False),
    ("UKOIL", "2026-09-27 22:30", 60, False),      # الأحد: افتتاح الأسبوع لا كسر
    ("USOIL", "2026-09-29 21:30", 60, True),
])
def test_daily_break_is_closed(sym, when, step, dropped):
    assert market.in_weekend_close(sym, _ts(when), step) is dropped


def test_market_open_false_in_break(monkeypatch):
    monkeypatch.setattr(market, "_session_now", lambda: _ts("2026-09-29 21:30"))
    assert market._market_open("XAUUSD", True) is False
    assert market._market_open("EURUSD", True) is True
    monkeypatch.setattr(market, "_session_now", lambda: _ts("2026-09-29 22:30"))
    assert market._market_open("XAUUSD", True) is True


def test_break_candles_are_dropped_from_series(monkeypatch):
    rows = [{"datetime": datetime.fromtimestamp(_ts("2026-09-29 20:00") + i * 900, tz=timezone.utc)
             .strftime("%Y-%m-%d %H:%M:%S"), "open": "2650", "high": "2651", "low": "2649", "close": "2650.5"}
            for i in range(12)]  # 20:00 … 22:45

    class _R:
        status_code = 200

        def raise_for_status(self):
            pass

        def json(self):
            return {"status": "ok", "values": rows}

    class _C:
        def __init__(self, *a, **k):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def get(self, *a, **k):
            return _R()

    monkeypatch.setattr(market, "CANDLE_DISK", None)
    monkeypatch.setattr(market, "_api_key", lambda: "k")
    monkeypatch.setattr(market.httpx, "Client", _C)
    market._cache.clear()
    try:
        candles = market.fetch_time_series("XAUUSD", "15m", 12)
    finally:
        market._cache.clear()
    hours = sorted({datetime.fromtimestamp(c["time"], tz=timezone.utc).hour for c in candles})
    assert hours == [20, 22]
    assert len(candles) == 8


def test_allowance_covers_break():
    # 1m × 120 للذهب يمتدّ عبر كسر ساعة ⇒ 60 شمعة إضافية على الأقل فوق عطلة الأسبوع
    assert market._weekend_allowance("XAUUSD", "1m", 120) >= market._weekend_allowance("EURUSD", "1m", 120) + 60
    assert market._weekend_allowance("EURUSD", "D", 50) == market._weekend_allowance("XAUUSD", "D", 50)


def _iso(t: float) -> str:
    return datetime.fromtimestamp(t, tz=timezone.utc).strftime("%Y-%m-%d %H:%M")


@pytest.mark.parametrize("sym,opened,step,end", [
    # run 106: شمعة تنتهي داخل كسر برنت أو عند نهايته تُغلق ببدايته — كالتطبيق `iceBreakStartForCloseSec`
    ("UKOIL", "2026-12-01 20:00", 14400, "2026-12-01 23:00"),  # شتاءً: الكسر 23:00–01:00 UTC
    ("UKOIL", "2026-12-01 21:00", 14400, "2026-12-01 23:00"),  # تنتهي عند نهاية الكسر
    ("UKOIL", "2026-09-29 20:00", 14400, "2026-09-29 22:00"),  # صيفاً: 22:00–00:00 UTC
    ("UKOIL", "2026-09-29 21:00", 3600, "2026-09-29 22:00"),   # تنتهي عند بدايته — كما هي
    ("UKOIL", "2026-09-29 23:00", 14400, "2026-09-30 03:00"),  # تبدأ داخله وتتجاوزه — كما هي
    ("UKOIL", "2026-09-30 00:00", 14400, "2026-09-30 04:00"),
    ("XAUUSD", "2026-09-29 20:00", 14400, "2026-09-30 00:00"),  # تعبر كسر المعادن ولا تنتهي فيه
    ("EURUSD", "2026-12-01 20:00", 14400, "2026-12-02 00:00"),
])
def test_bar_ending_in_daily_break_closes_at_break_start(sym, opened, step, end):
    assert _iso(market.bar_end(sym, _ts(opened), step)) == end
