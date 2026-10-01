"""run 129: لا عملات رقمية إطلاقاً — قرار أنس (`fa3fe80`، README، `.agents/agent-4-backend.md`)، امتثالاً
لتنظيمات العراق المالية. كان BTCUSD/ETHUSD بالخريطة والماسح، والشارت/الاقتباس/التنبيه تطلبهما من المزوّد.
الآن: لا طلب للمزوّد، والسبب `crypto_not_supported` صريحاً (لا سعر ولا شموع)."""
from __future__ import annotations

import pytest

import twelve_data as market
from tests.test_main_routes import _auth, _register, client  # noqa: F401


@pytest.mark.parametrize("sym", ["BTCUSD", "ethusd", "BTC/USD", "BTC/EUR", "ETHBTC", "BTCUSDT", " XRPUSD",
                                 "ＢＴＣＵＳＤ", "SOLUSD", "DOGE/USDT"])
def test_crypto_pairs_are_unavailable_with_their_reason(sym):
    assert market.is_crypto(sym)
    assert market.unavailable_reason(sym) == market.CRYPTO_NOT_SUPPORTED


@pytest.mark.parametrize("sym", ["EURUSD", "XAUUSD", "UKOIL", "USOIL", "USDTRY", "AAPL", "SOL", "OP", "DXY",
                                 "BRK/A", "ETSY"])
def test_non_crypto_symbols_are_not_flagged(sym):
    assert not market.is_crypto(sym)


def test_crypto_is_gone_from_the_symbol_map_and_screener_list():
    assert not any(market.is_crypto(s) for s in market.SYMBOL_MAP)
    assert not any(market.is_crypto(s) for s in market.SYMBOL_MAP.values())


def test_no_provider_request_for_crypto_candles_or_quote(monkeypatch):
    monkeypatch.setattr(market, "_api_key", lambda: "test-key")

    def _boom(**_kw):
        raise AssertionError("provider must not be called for crypto")

    monkeypatch.setattr(market.httpx, "Client", _boom)
    with pytest.raises(market.SymbolUnavailable) as exc:
        market._fetch_bucket("BTCUSD", "1h", 100)
    assert exc.value.reason == market.CRYPTO_NOT_SUPPORTED
    assert market.fetch_quote_book("ETHUSD") is None


def test_quote_route_says_crypto_not_supported(client):  # noqa: F811
    body = client.get("/api/market/quote/BTCUSD").json()
    assert body["price"] is None and body["bid"] is None
    assert body["unavailable_reason"] == "crypto_not_supported"


def test_crypto_alert_and_watchlist_are_rejected(client):  # noqa: F811
    h = _auth(_register(client, "nocrypto"))
    r = client.post("/api/alerts", json={"symbol": "BTCUSD", "condition": "above", "price": 70000}, headers=h)
    assert r.status_code == 422
    assert client.post("/api/watchlist/custom", json={"symbol": "ETH/USD"}, headers=h).status_code == 422
    assert client.post("/api/watchlist/custom", json={"symbol": "EURUSD"}, headers=h).status_code == 200
