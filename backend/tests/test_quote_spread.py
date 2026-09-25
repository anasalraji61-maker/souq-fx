"""Bid/Ask يأتي من المزوّد أو لا يأتي أبداً.

كان `fetch_quote_book` يخترع سبريداً (السعر × 0.00008) حين لا يرسل Twelve Data دفتراً،
و`/api/market/quote` يسمه `data_kind: provider` ⇒ رقم مختلَق يُعرض على أنه سعر سوق.
"""
from __future__ import annotations

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
    routes["/quote"] = _Resp({"close": "157.250"})
    body = TestClient(main.app).get("/api/market/quote/USDJPY").json()
    assert body["data_kind"] == "provider"
    assert body["bid"] is None and body["ask"] is None
    assert body["spread_source"] is None
