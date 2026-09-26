"""سعر واحد بين الاقتباس والشارت: `/api/market/quote` 1.1010 (المزوّد، الآن) والشارت/القائمة من كاش 15m قبل
دقيقة 1.1000 في اللحظة نفسها. شمعة مخزّنة جارية تأخذ الآن سعر أحدث اقتباس حقيقي داخلها بوقته عند المزوّد."""
from __future__ import annotations

import main
import twelve_data as market
from tests.test_one_price_tf_r89 import DAYS, QUARTERS, T0, _ts, cache  # noqa: F401 — fixture


def _cached():
    market._cache["BTCUSD|D|50"] = (T0, [dict(c) for c in DAYS])
    market._cache["BTCUSD|15m|180"] = (T0 + 300, [dict(c) for c in QUARTERS])


def test_chart_and_watchlist_take_the_newer_quote_price(cache):
    _cached()
    market.note_quote("BTCUSD", 101.7, T0 + 340)
    assert main.build_series("BTCUSD", "15m", 180).last == main.build_series("BTCUSD", "D", 50).last == 101.7
    quarters, meta = market.fetch_time_series_with_meta("BTCUSD", "15m", 180)
    assert quarters[-1]["high"] == 101.7 and meta["as_of"] == T0 + 340, "as_of = the quote's provider time"


def test_quote_older_than_the_cached_fetch_is_ignored(cache):
    _cached()
    market.note_quote("BTCUSD", 100.0, T0 + 200)
    assert main.build_series("BTCUSD", "15m", 180).last == 101.2


def test_quote_after_the_bar_ended_is_not_applied(cache):
    market._quote_marks["BTCUSD"] = (_ts("2026-09-24 10:15:00") + 5, 103.0)  # the next 15m bar
    rows, meta = market._with_newest_close("BTCUSD", "15m", [dict(c) for c in QUARTERS], {"as_of": T0 + 300})
    assert rows[-1]["close"] == 101.2 and meta["as_of"] == T0 + 300


def test_bad_or_future_quotes_are_not_recorded(cache):
    market.note_quote("BTCUSD", None, T0)
    market.note_quote("BTCUSD", float("nan"), T0)
    market.note_quote("BTCUSD", -1, T0)
    market.note_quote("BTCUSD", 100, cache["now"] + 3600)
    assert market._quote_marks == {}


def test_quote_route_records_the_provider_price(cache, monkeypatch):
    _cached()
    monkeypatch.setattr(market, "fetch_quote_book", lambda s: {
        "symbol": s, "price": 101.9, "bid": None, "ask": None, "spread_source": None, "quoted_at": T0 + 345})
    q = main.market_quote("BTCUSD")
    assert q["price"] == 101.9 and q["data_kind"] == "provider"
    assert main.build_series("BTCUSD", "D", 50).last == 101.9
