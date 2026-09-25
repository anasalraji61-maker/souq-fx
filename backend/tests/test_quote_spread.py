"""Bid/Ask يأتي من المزوّد أو لا يأتي أبداً.

كان `fetch_quote_book` يخترع سبريداً (السعر × 0.00008) حين لا يرسل Twelve Data دفتراً،
و`/api/market/quote` يسمه `data_kind: provider` ⇒ رقم مختلَق يُعرض على أنه سعر سوق.
"""
from __future__ import annotations

import time

import pytest
from fastapi.testclient import TestClient

import main
import twelve_data as market


class _Resp:
    def __init__(self, payload: dict, status: int = 200):
        self._p, self.status_code = payload, status

    def json(self) -> dict:
        return self._p


class _Client:
    def __init__(self, routes: dict):
        self._routes = routes

    def __enter__(self):
        return self

    def __exit__(self, *_):
        return False

    def get(self, url, params=None, **_kw):
        for suffix, resp in self._routes.items():
            if url.endswith(suffix):
                return resp
        return _Resp({}, 404)


@pytest.fixture()
def routes(monkeypatch):
    box: dict = {}
    monkeypatch.setattr(market, "_api_key", lambda: "test-key")
    monkeypatch.setattr(market.httpx, "Client", lambda **_kw: _Client(box))
    return box


def test_no_bid_ask_from_provider_means_none_not_an_invented_spread(routes):
    routes["/quote"] = _Resp({"close": "1.10000"})
    book = market.fetch_quote_book("EURUSD")
    assert book["price"] == pytest.approx(1.1)
    assert book["bid"] is None and book["ask"] is None
    assert book["spread_source"] is None


def test_real_bid_ask_passes_through_untouched(routes):
    routes["/quote"] = _Resp({"close": "1.10000", "bid": "1.09995", "ask": "1.10005"})
    book = market.fetch_quote_book("EURUSD")
    assert book["bid"] == pytest.approx(1.09995)
    assert book["ask"] == pytest.approx(1.10005)
    assert book["spread_source"] == "provider"


@pytest.mark.parametrize(
    "bid,ask",
    [("1.09995", None), (None, "1.10005"), ("1.10010", "1.10000"), ("0", "1.1"), ("x", "1.1")],
)
def test_half_or_crossed_book_is_not_completed_with_a_guess(routes, bid, ask):
    payload = {"close": "1.10000"}
    if bid is not None:
        payload["bid"] = bid
    if ask is not None:
        payload["ask"] = ask
    routes["/quote"] = _Resp(payload)
    book = market.fetch_quote_book("EURUSD")
    assert book["bid"] is None and book["ask"] is None
    assert book["spread_source"] is None


def test_rate_limited_fallback_has_no_spread(routes):
    routes["/quote"] = _Resp({}, 429)
    routes["/price"] = _Resp({"price": "1.1"})
    book = market.fetch_quote_book("EURUSD")
    assert book["bid"] is None and book["spread_source"] is None


def test_quote_route_never_labels_an_invented_spread_as_provider(routes):
    routes["/quote"] = _Resp({"close": "157.250", "last_quote_at": time.time() - 5})
    body = TestClient(main.app).get("/api/market/quote/USDJPY").json()
    assert body["data_kind"] == "provider"
    assert body["bid"] is None and body["ask"] is None
    assert body["spread_source"] is None


# ─── كاش الاقتباس و`as_of` ───────────────────────────────────────────────────

def test_second_quote_within_ttl_is_served_from_cache_with_its_real_time(routes, monkeypatch):
    calls = {"n": 0}
    real = market.fetch_quote_book

    def counting(sym):
        calls["n"] += 1
        return real(sym)

    monkeypatch.setattr(main.market, "fetch_quote_book", counting)
    routes["/quote"] = _Resp({"close": "1.10000", "last_quote_at": time.time() - 5})
    client = TestClient(main.app)
    first = client.get("/api/market/quote/EURUSD").json()
    second = client.get("/api/market/quote/EURUSD").json()
    assert calls["n"] == 1, "الطلب الثاني لا يصرف من حدّ المزوّد"
    assert first["data_kind"] == "provider" and second["data_kind"] == "cache"
    assert second["as_of"] == first["as_of"], "وقت الجلب الحقيقي لا «الآن»"
    assert second["price"] == first["price"]


def test_expired_cache_fetches_again(routes, monkeypatch):
    routes["/quote"] = _Resp({"close": "1.10000", "last_quote_at": time.time() - 5})
    client = TestClient(main.app)
    client.get("/api/market/quote/EURUSD")
    ts, book = main._QUOTE_CACHE["EURUSD"]
    main._QUOTE_CACHE["EURUSD"] = (ts - main.QUOTE_TTL - 1, book)
    routes["/quote"] = _Resp({"close": "1.20000", "last_quote_at": time.time() - 5})
    body = client.get("/api/market/quote/EURUSD").json()
    assert body["data_kind"] == "provider" and body["price"] == pytest.approx(1.2)


def test_candle_fallback_carries_the_candle_time(monkeypatch):
    monkeypatch.setattr(main.market, "fetch_quote_book", lambda s: None)

    def build(sym, timeframe="15m", outputsize=180):
        c = main.Candle(time=1, open=1.1, high=1.1, low=1.1, close=1.1)
        return main.ChartSeries(
            symbol=sym, timeframe=timeframe, candles=[c], change_pct=0, last=1.1,
            data_source=main.DataProvenance(kind="cache", as_of=1234.0, channel="twelvedata"),
        )

    monkeypatch.setattr(main, "build_series", build)
    body = TestClient(main.app).get("/api/market/quote/EURUSD").json()
    # الشمعة فُتحت عند 1 وأُغلقت 901 — قبل لحظة الجلب 1234: السعر وقته 901
    assert body["data_kind"] == "cache" and body["as_of"] == 901.0
    assert body["fetched_at"] == 1234.0


def _fallback_series(monkeypatch, candle_time: int, fetched: float):
    monkeypatch.setattr(main.market, "fetch_quote_book", lambda s: None)

    def build(sym, timeframe="15m", outputsize=180):
        c = main.Candle(time=candle_time, open=1.1, high=1.1, low=1.1, close=1.1)
        return main.ChartSeries(
            symbol=sym, timeframe=timeframe, candles=[c], change_pct=0, last=1.1,
            data_source=main.DataProvenance(kind="provider", as_of=fetched, channel="twelvedata"),
        )

    monkeypatch.setattr(main, "build_series", build)
    return TestClient(main.app).get("/api/market/quote/GBPUSD").json()


def test_weekend_candle_fallback_is_dated_friday_not_now(monkeypatch):
    """السبت، /quote متعذّر: آخر شمعة 15د = الجمعة 21:45. كان `as_of` = لحظة الجلب ⇒ «سعر الآن»."""
    now = time.time()
    friday_bar = int(now) - 86_400
    body = _fallback_series(monkeypatch, friday_bar, now)
    assert body["as_of"] == friday_bar + 900
    assert body["fetched_at"] == now


def test_live_candle_fallback_is_dated_at_fetch(monkeypatch):
    """شمعة جارية (لم تُغلق بعد): إغلاقها = آخر سعر لحظة الجلب."""
    now = time.time()
    body = _fallback_series(monkeypatch, int(now) - 120, now)
    assert body["as_of"] == now


# ─── `as_of` = وقت السعر لا لحظة الجلب ──────────────────────────────────────

def test_weekend_quote_carries_the_provider_price_time_not_now(routes):
    """السبت: المزوّد يعيد إغلاق الجمعة و`last_quote_at` الجمعة. كان `as_of` = لحظة الجلب ⇒ «سعر الآن»."""
    friday = float(int(time.time()) - 86_400)
    routes["/quote"] = _Resp({"close": "1.10000", "last_quote_at": friday, "is_market_open": False})
    client = TestClient(main.app)
    body = client.get("/api/market/quote/EURUSD").json()
    assert body["as_of"] == friday
    assert body["market_open"] is False
    assert body["fetched_at"] > friday
    assert "quoted_at" not in body
    cached = client.get("/api/market/quote/EURUSD").json()
    assert cached["data_kind"] == "cache" and cached["as_of"] == friday


def test_quote_without_provider_time_is_not_dated_now(routes, monkeypatch):
    """`/quote` بلا `last_quote_at`: كان `as_of` = لحظة الجلب موسوماً `provider` (إغلاق الجمعة «الآن»).
    الآن فرع الشموع بوقت آخر شمعة الحقيقي، كـ`/price` بلا وقت."""
    routes["/quote"] = _Resp({"close": "1.10000"})
    friday_close = 1_758_920_400

    def build(sym, timeframe="15m", outputsize=180):
        c = main.Candle(time=friday_close, open=1.1, high=1.1, low=1.1, close=1.1)
        return main.ChartSeries(
            symbol=sym, timeframe=timeframe, candles=[c], change_pct=0, last=1.1,
            data_source=main.DataProvenance(kind="provider", as_of=time.time(), channel="twelvedata"),
        )

    monkeypatch.setattr(main, "build_series", build)
    body = TestClient(main.app).get("/api/market/quote/EURUSD").json()
    assert body["source"] == "ohlc_fallback"
    assert body["as_of"] == friday_close + 900


@pytest.mark.parametrize("bad", ["x", -5, 0, 9e12, "1.5"])
def test_invalid_provider_time_is_ignored(routes, bad):
    routes["/quote"] = _Resp({"close": "1.10000", "last_quote_at": bad, "is_market_open": "yes"})
    book = market.fetch_quote_book("EURUSD")
    assert book["quoted_at"] is None
    assert book["market_open"] is None


def test_untimed_price_fallback_is_not_sent_as_a_live_quote(routes, monkeypatch):
    # `/quote` 429 ⇒ `/price` بلا وقت. كان يُعاد `as_of` = «الآن» — يوم السبت إغلاق الجمعة سعر «حيّ».
    routes["/quote"] = _Resp({}, 429)
    routes["/price"] = _Resp({"price": "1.1"})
    friday_close = 1_758_920_400  # شمعة 15د فُتحت الجمعة 21:00 UTC

    def build(sym, timeframe="15m", outputsize=180):
        c = main.Candle(time=friday_close, open=1.1, high=1.1, low=1.1, close=1.1)
        return main.ChartSeries(
            symbol=sym, timeframe=timeframe, candles=[c], change_pct=0, last=1.1,
            data_source=main.DataProvenance(kind="cache", as_of=time.time(), channel="twelvedata"),
        )

    monkeypatch.setattr(main, "build_series", build)
    body = TestClient(main.app).get("/api/market/quote/EURUSD").json()
    assert body["source"] == "ohlc_fallback" and body["data_kind"] == "cache"
    assert body["as_of"] == friday_close + 900, "وقت الشمعة الحقيقي لا لحظة الطلب"
    assert "price_only" not in body


def test_untimed_price_fallback_still_serves_the_alert_worker(routes):
    routes["/quote"] = _Resp({}, 429)
    routes["/price"] = _Resp({"price": "1.1"})
    assert market.fetch_quote("EURUSD") == pytest.approx(1.1)


@pytest.mark.parametrize("bid,ask", [("NaN", "1.10005"), ("1.09995", "NaN"), ("inf", "inf"), ("1.09995", "-inf")])
def test_non_finite_book_is_no_book(routes, bid, ask):
    """bid/ask «NaN» كان يجتاز `<= 0` و`bid > ask` (كلاهما False مع NaN) فيُرسَل سبريد NaN موسوماً provider."""
    routes["/quote"] = _Resp({"close": "1.10000", "bid": bid, "ask": ask})
    book = market.fetch_quote_book("EURUSD")
    assert book["bid"] is None and book["ask"] is None and book["spread_source"] is None


@pytest.mark.parametrize("bad", ["NaN", "inf", "-1.1", "0"])
def test_non_finite_or_non_positive_price_is_no_quote(routes, bad):
    routes["/quote"] = _Resp({"close": bad})
    routes["/price"] = _Resp({"price": bad})
    assert market.fetch_quote_book("EURUSD") is None


@pytest.mark.parametrize("status", [429, 500])
def test_non_finite_price_fallback_is_no_quote(routes, status):
    routes["/quote"] = _Resp({}, status)
    routes["/price"] = _Resp({"price": "NaN"})
    assert market.fetch_quote_book("EURUSD") is None


def test_non_finite_ohlc_fields_become_none(routes):
    routes["/quote"] = _Resp({"close": "1.1", "open": "NaN", "high": "inf", "percent_change": "-0.12"})
    book = market.fetch_quote_book("EURUSD")
    assert book["open"] is None and book["high"] is None and book["percent_change"] == pytest.approx(-0.12)


def test_quote_network_error_falls_back_to_the_real_candle_not_500(monkeypatch):
    """`/quote` يرمي (مهلة/انقطاع/ردّ غير JSON): كان المسار يخرج 500 بدل آخر إغلاق حقيقي بوقته."""
    import httpx

    def boom(sym):
        raise httpx.ConnectTimeout("provider down")

    monkeypatch.setattr(main.market, "fetch_quote_book", boom)
    now = time.time()

    def build(sym, timeframe="15m", outputsize=180):
        c = main.Candle(time=int(now) - 600, open=1.1, high=1.1, low=1.1, close=1.1)
        return main.ChartSeries(
            symbol=sym, timeframe=timeframe, candles=[c], change_pct=0, last=1.1,
            data_source=main.DataProvenance(kind="cache", as_of=now - 60, channel="twelvedata"),
        )

    monkeypatch.setattr(main, "build_series", build)
    r = TestClient(main.app).get("/api/market/quote/EURUSD")
    assert r.status_code == 200
    body = r.json()
    assert body["price"] == pytest.approx(1.1) and body["data_kind"] == "cache"
    assert body["bid"] is None and body["spread_source"] is None
    assert body["as_of"] == now - 60
