"""W1 بين الفريمات (التشغيل 89): كل فريم بكاشه وعمره (D ‏600ث، 15m ‏90ث) ⇒ لرمز بلا تيك حيّ كانت قائمة
المتابعة (D) تعرض إغلاقاً أقدم بدقائق من رأس الشارت (15m) في اللحظة نفسها. شمعة مخزّنة جارية تأخذ الآن
إغلاق أحدث جلب للرمز نفسه (بأيّ فريم) إن وقع قبل نهايتها. AAPL (بلا جلسة أسبوعية معروفة) كي لا تتأثّر بساعة العطلة."""
from __future__ import annotations

from datetime import datetime, timezone

import pytest

import main
import twelve_data as market


def _ts(s: str) -> float:
    return datetime.fromisoformat(s).replace(tzinfo=timezone.utc).timestamp()


def _c(t: str, o: float, h: float, l: float, c: float) -> dict:
    return {"time": int(_ts(t)), "open": o, "high": h, "low": l, "close": c, "volume": 5.0}


T0 = _ts("2026-09-24 10:00:00")
DAYS = [_c("2026-09-23 00:00:00", 90, 99, 89, 95), _c("2026-09-24 00:00:00", 95, 100, 94, 99)]
QUARTERS = [_c("2026-09-24 09:45:00", 99, 99.5, 98.8, 99.2), _c("2026-09-24 10:00:00", 99.2, 101.5, 99.1, 101.2)]


@pytest.fixture()
def cache(monkeypatch):
    box: dict = {"now": T0 + 350}
    monkeypatch.setattr(market, "_api_key", lambda: "test-key")
    monkeypatch.setattr(market, "_cache", {})
    monkeypatch.setattr(market.time, "time", lambda: box["now"])

    def no_network(**_kw):
        raise AssertionError("cache hit expected — no provider call")

    monkeypatch.setattr(market.httpx, "Client", no_network)
    return box


def test_cached_daily_takes_the_newer_15m_close(cache):
    market._cache["AAPL|D|50"] = (T0, [dict(c) for c in DAYS])
    market._cache["AAPL|15m|180"] = (T0 + 300, [dict(c) for c in QUARTERS])
    days, meta = market.fetch_time_series_with_meta("AAPL", "D", 50)
    quarters, _ = market.fetch_time_series_with_meta("AAPL", "15m", 180)
    assert days[-1]["close"] == quarters[-1]["close"] == 101.2, "one price for the symbol"
    assert days[-1]["high"] == 101.2 and days[-1]["low"] == 94, "the bar's range widens to the price"
    assert days[-1]["open"] == 95 and days[-2] == DAYS[0]
    assert meta == {"kind": "cache", "as_of": T0 + 300, "channel": "twelvedata"}, "as_of = the real newer fetch"
    assert market._cache["AAPL|D|50"][1][-1]["close"] == 99, "the cache itself is not rewritten"


def test_watchlist_and_chart_header_agree(cache):
    market._cache["AAPL|D|50"] = (T0, [dict(c) for c in DAYS])
    market._cache["AAPL|15m|180"] = (T0 + 300, [dict(c) for c in QUARTERS])
    assert main.build_series("AAPL", "D", 50).last == main.build_series("AAPL", "15m", 180).last == 101.2


def test_older_other_timeframe_is_ignored(cache):
    market._cache["AAPL|D|50"] = (T0 + 300, [dict(c) for c in DAYS])
    market._cache["AAPL|15m|180"] = (T0, [dict(c) for c in QUARTERS])
    days, meta = market.fetch_time_series_with_meta("AAPL", "D", 50)
    assert days[-1]["close"] == 99 and meta["as_of"] == T0 + 300


def test_fetch_after_the_bar_ended_is_not_applied(cache):
    # D of 09-23 cached at 23:58; 15m fetched 00:02 on 09-24 belongs to the next day's bar
    end = _ts("2026-09-24 00:00:00")
    market._cache["AAPL|D|50"] = (end - 120, [dict(DAYS[0])])
    market._cache["AAPL|15m|180"] = (end + 120, [_c("2026-09-24 00:00:00", 95, 95.4, 94.9, 95.3)])
    cache["now"] = end + 180
    days, meta = market.fetch_time_series_with_meta("AAPL", "D", 50)
    assert days[-1]["close"] == 95 and meta["as_of"] == end - 120


def test_lagging_newer_fetch_is_not_applied(cache):
    # the 15m series fetched later ends on a bar that closed before the D fetch — its close is not "now"
    market._cache["AAPL|D|50"] = (T0, [dict(c) for c in DAYS])
    market._cache["AAPL|15m|180"] = (T0 + 300, [_c("2026-09-24 09:30:00", 98, 98.5, 97.9, 98.1)])
    days, _ = market.fetch_time_series_with_meta("AAPL", "D", 50)
    assert days[-1]["close"] == 99


def test_other_symbol_is_ignored(cache):
    market._cache["AAPL|D|50"] = (T0, [dict(c) for c in DAYS])
    market._cache["MSFT|15m|180"] = (T0 + 300, [dict(c) for c in QUARTERS])
    days, _ = market.fetch_time_series_with_meta("AAPL", "D", 50)
    assert days[-1]["close"] == 99
