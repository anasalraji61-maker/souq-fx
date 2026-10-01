"""run 127: اقتباس بوقت الافتتاح الأسبوعي نفسه، وصفّ مزوّد بتاريخ خارج المعقول."""
from datetime import datetime, timezone

import pytest

import twelve_data as market


def _ts(s: str) -> float:
    return datetime.strptime(s, "%Y-%m-%d %H:%M:%S").replace(tzinfo=timezone.utc).timestamp()


@pytest.fixture(autouse=True)
def _filter_on(monkeypatch):
    monkeypatch.setattr(market, "WEEKEND_CLOSE_FILTER", True)


@pytest.mark.parametrize("sym, reopen", [("EURUSD", "2026-09-27 21:00:00"), ("XAUUSD", "2026-09-27 22:00:00")])
def test_instant_at_the_weekly_reopen_is_open(sym, reopen):
    """`last_quote_at` = بداية شمعة 1m ⇒ يساوي الافتتاح طوال الدقيقة الأولى؛ كان يُرفض اقتباساً «من العطلة»."""
    t = _ts(reopen)
    assert market.in_weekend_close(sym, t, 0) is False
    assert market.in_weekend_close(sym, t - 1, 0) is True
    # شمعة 1m تنتهي عند الافتتاح ما زالت عطلة، والتي تبدأ عنده ليست كذلك
    assert market.in_weekend_close(sym, t - 60, 60) is True
    assert market.in_weekend_close(sym, t, 60) is False


@pytest.mark.parametrize("raw", ["9999-12-31 23:59:59", "0001-01-01 00:00:00", "1969-12-31"])
def test_out_of_range_provider_dates_are_dropped(raw):
    """كان يُقبل ثم يرمي `bar_end` (`fromtimestamp`) ⇒ 500 من اللقطة والاقتباس."""
    assert market._parse_ts(raw) is None
    assert market._candle({"datetime": raw, "open": "1", "high": "1", "low": "1", "close": "1"}) is None


def test_normal_provider_date_still_parses():
    assert market._parse_ts("2026-09-25 20:45:00") == int(_ts("2026-09-25 20:45:00"))
