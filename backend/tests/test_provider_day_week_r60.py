"""run 60: شمعة D للفوركس عند المزوّد تنتهي 17:00 نيويورك لا 00:00 UTC، وشمعة W منه تضمّ السبت والأحد
(قاعها/قمّتها/إغلاقها من تداول العطلة) ⇒ W تُبنى من شموع D للاثنين–الجمعة. البيانات أدناه حقيقية
(Twelve Data، EUR/USD ‏1day، timezone=UTC، جُلبت 2026-09-26)."""
from __future__ import annotations

from datetime import datetime, timezone

import pytest

import twelve_data as market
from tests.test_twelve_data_candles import provider  # noqa: F401 — fixture


@pytest.fixture(autouse=True)
def _filter_on(monkeypatch):
    monkeypatch.setattr(market, "WEEKEND_CLOSE_FILTER", True)


def _ts(y, m, d, h=0) -> float:
    return datetime(y, m, d, h, tzinfo=timezone.utc).timestamp()


DAYS = [
    ("2026-08-20", 1.1678, 1.17109, 1.16699, 1.16791),
    ("2026-08-21", 1.1679, 1.17108, 1.16694, 1.16764),
    ("2026-08-22", 1.16764, 1.16933, 1.16715, 1.16788),
    ("2026-08-23", 1.16788, 1.16928, 1.16584, 1.16761),
    ("2026-08-24", 1.16763, 1.16872, 1.1655, 1.16643),
    ("2026-08-25", 1.16643, 1.16796, 1.16515, 1.16747),
    ("2026-08-26", 1.16752, 1.16783, 1.16421, 1.1654),
    ("2026-08-27", 1.16539, 1.16599, 1.1637, 1.16522),
    ("2026-08-28", 1.16519, 1.16558, 1.15781, 1.15831),
    ("2026-08-29", 1.15829, 1.15926, 1.15675, 1.15836),
    ("2026-08-30", 1.15834, 1.16112, 1.14898, 1.15827),  # الأحد: قاع 1.14898 — المزوّد وضعه قاعاً لأسبوع 24-08
    ("2026-08-31", 1.15814, 1.16206, 1.15781, 1.16174),
    ("2026-09-01", 1.1617, 1.16245, 1.15853, 1.1593),
    ("2026-09-02", 1.15929, 1.16067, 1.15667, 1.15884),
    ("2026-09-03", 1.15882, 1.16412, 1.15841, 1.16258),
    ("2026-09-04", 1.1626, 1.16336, 1.15848, 1.16144),
    ("2026-09-05", 1.16142, 1.16226, 1.1612, 1.16168),
    ("2026-09-06", 1.16163, 1.16423, 1.15985, 1.16138),  # الأحد: قمّة 1.16423 = قمّة W ‏31-08 عند المزوّد
]


def _rows():
    return [{"datetime": d, "open": str(o), "high": str(h), "low": str(lo), "close": str(c)} for d, o, h, lo, c in DAYS]


def test_forex_week_is_built_from_monday_to_friday_days(provider):  # noqa: F811
    provider["payload"] = {"values": _rows()}
    weeks, _ = market.fetch_time_series_with_meta("EURUSD", "W", 2)
    assert provider["sink"]["params"]["interval"] == "1day"
    assert [w["time"] for w in weeks] == [_ts(2026, 8, 24), _ts(2026, 8, 31)]
    w1, w2 = weeks
    # المزوّد: W ‏24-08 = 1.16763 / 1.16872 / 1.14898 / 1.15827 (قاع وإغلاق الأحد 30-08)
    assert (w1["open"], w1["high"], w1["low"], w1["close"]) == (1.16763, 1.16872, 1.15781, 1.15831)
    # المزوّد: W ‏31-08 قمّته 1.16423 (الأحد 06-09) وإغلاقه 1.16138
    assert (w2["open"], w2["high"], w2["low"], w2["close"]) == (1.15814, 1.16412, 1.15667, 1.16144)
    assert w1["volume"] is None


def test_week_request_covers_seven_provider_days_per_week(provider):  # noqa: F811
    provider["payload"] = {"values": _rows()}
    market.fetch_time_series_with_meta("EURUSD", "W", 50)
    assert provider["sink"]["params"]["outputsize"] == str((50 + 1) * 7)
    market._cache.clear()
    market.fetch_time_series_with_meta("EURUSD", "W", 5000)
    assert provider["sink"]["params"]["outputsize"] == "5000"


def test_full_window_drops_the_partial_oldest_week():
    days = [{"time": _ts(*map(int, d.split("-"))), "open": o, "high": h, "low": lo, "close": c, "volume": None}
            for d, o, h, lo, c in DAYS if datetime.fromisoformat(d).weekday() < 5]
    assert len(market._weeks_from_days(days, drop_first=False)) == 3  # 17-08 (الخميس والجمعة فقط)، 24-08، 31-08
    assert [w["time"] for w in market._weeks_from_days(days, drop_first=True)] == [_ts(2026, 8, 24), _ts(2026, 8, 31)]


def test_week_volume_is_summed_when_present():
    days = [{"time": _ts(2026, 8, 24 + i), "open": 1.0, "high": 1.0, "low": 1.0, "close": 1.0, "volume": 10.0}
            for i in range(5)]
    assert market._weeks_from_days(days, drop_first=False)[0]["volume"] == 50.0


def test_crypto_week_still_from_provider_week(provider):  # noqa: F811
    provider["payload"] = {"values": [{"datetime": "2026-08-24", "open": "1", "high": "2", "low": "0.5", "close": "1.5"}]}
    weeks, _ = market.fetch_time_series_with_meta("BTCUSD", "W", 2)
    assert provider["sink"]["params"]["interval"] == "1week"
    assert len(weeks) == 1


@pytest.mark.parametrize("day,end", [
    ((2026, 9, 21), (2026, 9, 21, 21)),   # الاثنين صيفاً: 17:00 نيويورك = 21:00 UTC
    ((2026, 9, 24), (2026, 9, 24, 21)),
    ((2026, 12, 8), (2026, 12, 8, 22)),   # شتاءً 22:00 UTC
    ((2026, 9, 25), (2026, 9, 25, 21)),   # الجمعة كما كانت
])
def test_daily_bar_ends_at_new_york_five_pm(day, end):
    assert market.bar_end("EURUSD", _ts(*day), 86400) == _ts(*end)
    assert market.bar_end("XAUUSD", _ts(*day), 86400) == _ts(*end)


def test_crypto_daily_bar_end_unchanged():
    assert market.bar_end("BTCUSD", _ts(2026, 9, 24), 86400) == _ts(2026, 9, 25)
