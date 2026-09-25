"""رموز المزوّد: برنت باسمه الصحيح، وDXY «غير متاح» صراحةً بدل سعر مختلَق."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import main
import twelve_data as market
import twelve_data_ws as td_ws


def test_brent_is_requested_as_xbr_usd():
    assert market.td_symbol("UKOIL") == "XBR/USD"
    assert "BRENT/USD" not in market.SYMBOL_MAP.values()


def test_dxy_is_not_mapped_to_a_yahoo_symbol_nor_streamed():
    assert "DXY" not in market.SYMBOL_MAP
    assert "DX-Y.NYB" not in td_ws.DEFAULT_WS_SYMBOLS
    assert market.unavailable_reason("dxy") == "not_offered_by_provider"


def test_dxy_never_spends_a_provider_request(monkeypatch):
    calls: list = []
    monkeypatch.setattr(market, "_api_key", lambda: "k")
    monkeypatch.setattr(market.httpx, "Client", lambda **kw: calls.append(kw) or (_ for _ in ()).throw(AssertionError))
    with pytest.raises(market.SymbolUnavailable):
        market.fetch_time_series_with_meta("DXY", "15m", 100)
    assert market.fetch_quote_book("DXY") is None
    assert calls == []


def test_dxy_quote_has_no_price_and_says_why(monkeypatch):
    monkeypatch.setattr(market, "_api_key", lambda: "k")
    body = TestClient(main.app).get("/api/market/quote/DXY").json()
    assert body["price"] is None and body["bid"] is None
    assert body["data_kind"] == "unavailable"
    assert body["unavailable_reason"] == "not_offered_by_provider"


def test_dxy_chart_is_labelled_demo_with_the_reason(monkeypatch):
    monkeypatch.setattr(market, "_api_key", lambda: "k")
    series = main.build_series("DXY", "15m")
    assert series.data_source.kind == "demo"
    assert series.data_source.unavailable_reason == "not_offered_by_provider"


@pytest.mark.parametrize("configured", [True, False])
def test_dxy_chart_has_no_candles_and_no_price(monkeypatch, configured):
    """backend-r19: كانت بذرة عشوائية حول 104.25 (رقم مكتوب باليد) تُرسَل شموعاً وسعراً ونسبة — الآن لا شيء."""
    monkeypatch.setattr(market, "_api_key", lambda: "k" if configured else None)
    body = TestClient(main.app).get("/api/charts/DXY?timeframe=1H").json()
    assert body["candles"] == []
    assert body["last"] is None and body["change_pct"] is None
    assert body["data_source"]["unavailable_reason"] == "not_offered_by_provider"
    assert body["data_source"]["channel"] is None  # لا «seed»


def test_terminal_dxy_slot_is_empty_but_frames_are_untouched(monkeypatch):
    monkeypatch.setattr(market, "_api_key", lambda: None)
    body = TestClient(main.app).get("/api/terminal").json()
    assert body["dxy"]["candles"] == [] and body["dxy"]["last"] is None
    # الرموز المعروفة ما زالت ترسل سلسلتها (demo موسومة حين المزوّد غير مهيّأ — قرار سابق، لم يتغيّر)
    assert all(f["candles"] and f["last"] is not None for f in body["frames"])


def test_ai_ask_on_dxy_still_answers_without_levels(monkeypatch):
    monkeypatch.setattr(market, "_api_key", lambda: "k")
    monkeypatch.setattr(main.openrouter_ai, "configured", lambda: False)
    res = TestClient(main.app).post("/api/ai/ask", json={"question": "DXY?", "symbol": "DXY"})
    assert res.status_code == 200, res.text
    body = res.json()
    assert body["live_price"] is False and body["price_as_of"] is None


def test_watchlist_still_lists_dxy_as_unavailable():
    rows = TestClient(main.app).get("/api/watchlist").json()["symbols"]
    dxy = [r for r in rows if r["symbol"] == "DXY"]
    assert dxy and dxy[0]["td_symbol"] is None and dxy[0]["unavailable_reason"]


@pytest.mark.parametrize("bad", ["NaN", "nan", "inf", "-inf", 0, "0", -1.2, "abc", None])
def test_ws_price_rejects_non_finite_and_non_positive(bad):
    """سعر NaN من الـWS كان يُخزَّن ويُبثّ بـ`/ws/ticks` كـ`NaN` حرفي = JSON غير صالح ⇒ التطبيق يفقد كل التيكات؛
    والصفر/السالب يصل تنبيهات السعر كسعر حالي."""
    assert td_ws._parse_price({"event": "price", "symbol": "EUR/USD", "price": bad}) is None


def test_ws_price_keeps_a_real_price():
    assert td_ws._parse_price({"event": "price", "symbol": "EUR/USD", "price": "1.1734"}) == ("EURUSD", 1.1734)
