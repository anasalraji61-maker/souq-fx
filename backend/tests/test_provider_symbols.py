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


def test_terminal_without_provider_sends_no_candles_for_any_slot(monkeypatch):
    """backend-r22: الخانات الثلاث كانت بذرة عشوائية حول أسعار 2024 المكتوبة باليد حين المزوّد غير مهيّأ."""
    monkeypatch.setattr(market, "_api_key", lambda: None)
    body = TestClient(main.app).get("/api/terminal").json()
    assert body["dxy"]["candles"] == [] and body["dxy"]["last"] is None
    assert body["dxy"]["data_source"]["unavailable_reason"] == "not_offered_by_provider"
    for f in body["frames"]:
        assert f["candles"] == [] and f["last"] is None and f["change_pct"] is None
        assert f["data_source"]["unavailable_reason"] == "provider_unavailable"


def _provider_fails(monkeypatch, how):
    monkeypatch.setattr(market, "_api_key", lambda: "k")
    if how == "raises":
        def boom(*a, **kw):
            raise RuntimeError("429 Too Many Requests")
        monkeypatch.setattr(market, "fetch_time_series_with_meta", boom)
    else:  # "empty"
        monkeypatch.setattr(market, "fetch_time_series_with_meta", lambda *a, **kw: ([], {}))


@pytest.mark.parametrize("how", ["raises", "empty", "not_configured"])
@pytest.mark.parametrize("symbol", ["EURUSD", "XAUUSD", "USDJPY", "NOSUCH"])
def test_known_or_unknown_symbol_gets_no_seed_when_provider_fails(monkeypatch, how, symbol):
    """backend-r22: كانت بذرة حول `SYMBOL_BASES` (EURUSD 1.0854، الذهب 2348.6…؛ المجهول حول 1.0) تُرسَل
    شموعاً وإغلاقاً ونسبة عند كل 429 بلا كاش أو انقطاع أو بلا مفتاح — الشارت يرسمها."""
    if how == "not_configured":
        monkeypatch.setattr(market, "_api_key", lambda: None)
    else:
        _provider_fails(monkeypatch, how)
    body = TestClient(main.app).get(f"/api/charts/{symbol}?timeframe=1H").json()
    assert body["candles"] == []
    assert body["last"] is None and body["change_pct"] is None
    assert body["data_source"]["kind"] == "demo"  # كل مسار حسابي يرفضها كما قبل
    assert body["data_source"]["unavailable_reason"] == "provider_unavailable"
    assert body["data_source"]["channel"] is None
    assert body["timeframe"] == "1H"


def test_no_hand_typed_base_prices_remain():
    assert not hasattr(main, "SYMBOL_BASES") and not hasattr(main, "_seed_walk")


def test_real_provider_series_is_untouched(monkeypatch):
    raw = [{"time": 60 * i, "open": 1.1, "high": 1.2, "low": 1.0, "close": 1.1 + i / 100} for i in range(3)]
    monkeypatch.setattr(market, "_api_key", lambda: "k")
    monkeypatch.setattr(market, "fetch_time_series_with_meta",
                        lambda *a, **kw: (raw, {"kind": "provider", "as_of": 123.0}))
    s = main.build_series("EURUSD", "15m")
    assert s.last == 1.12 and len(s.candles) == 3 and s.data_source.kind == "provider"
    assert s.data_source.unavailable_reason is None


@pytest.mark.parametrize("how", ["raises", "not_configured"])
def test_routes_still_refuse_when_provider_fails(monkeypatch, how):
    """المسارات الحسابية تفحص `kind == demo` — السلسلة الفارغة لا تُسقطها بـ500."""
    if how == "not_configured":
        monkeypatch.setattr(market, "_api_key", lambda: None)
    else:
        _provider_fails(monkeypatch, how)
    monkeypatch.setattr(market, "fetch_quote_book", lambda *a, **kw: None)
    monkeypatch.setattr(main.openrouter_ai, "configured", lambda: False)
    c = TestClient(main.app)
    q = c.get("/api/market/quote/EURUSD")
    assert q.status_code == 200 and q.json()["price"] is None
    assert q.json()["unavailable_reason"] == "provider_unavailable"
    bt = c.post("/api/backtest", json={"symbol": "EURUSD", "timeframe": "1H", "strategy": "ma_cross"})
    assert bt.status_code == 200 and bt.json()["trades"] == [] and bt.json()["data_kind"] == "demo"
    snap = c.get("/api/indicators/snapshot/EURUSD")
    assert snap.status_code == 200 and "rsi" not in snap.json()
    fc = c.post("/api/signals/indicators/forecast", json={"symbol": "EURUSD", "timeframe": "1H"})
    assert fc.status_code == 200 and fc.json()["levels"] is None
    ai = c.post("/api/ai/ask", json={"question": "buy?", "symbol": "EURUSD"})
    assert ai.status_code == 200 and ai.json()["live_price"] is False


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


def test_ws_price_time_is_the_provider_timestamp_not_arrival(monkeypatch):
    """سعر الجمعة يُعاد إرساله السبت (اشتراك/إعادة اتصال) كان يُخزَّن بوقت الوصول ⇒ «حيّ» بـ/ws/ticks
    وسعر حالي لتنبيهات الـworker. الآن وقت المزوّد ⇒ خارج `LIVE_MAX_AGE`."""
    now = 1_790_000_000.0
    monkeypatch.setattr(td_ws.time, "time", lambda: now)
    monkeypatch.setattr(td_ws, "LATEST", {})
    monkeypatch.setattr(td_ws, "LATEST_AT", {})
    td_ws._store({"event": "price", "symbol": "EUR/USD", "price": 1.17, "timestamp": int(now - 36 * 3600)})
    assert td_ws.LATEST_AT["EURUSD"] == now - 36 * 3600
    assert td_ws.snapshot(max_age=td_ws.LIVE_MAX_AGE) == {}
    assert td_ws.status()["symbols_stale"] == ["EURUSD"]


@pytest.mark.parametrize("raw, want_offset", [
    (None, 0), ("abc", 0), (0, 0), (-5, 0), (True, 0), ("nan", 0),
    (1_790_000_000 + 600, 0),  # ساعة مزوّد متقدّمة لا تجعل السعر «أحدث» من وصوله
    ((1_790_000_000 - 30) * 1000, -30),  # ميلي ثانية
    (1_790_000_000 - 30, -30),
])
def test_ws_quoted_at_falls_back_to_arrival_when_unusable(raw, want_offset):
    assert td_ws._quoted_at({"timestamp": raw}, 1_790_000_000.0) == 1_790_000_000.0 + want_offset


@pytest.mark.parametrize(
    "url",
    [
        "/api/charts/EURUSD?timeframe=1h",
        "/api/charts/XAUUSD?timeframe=1d",
        "/api/indicators/snapshot/EURUSD?timeframe=M",
        "/api/terminal?tf1=1h",
        "/api/terminal?dxy_tf=bogus",
    ],
)
def test_unknown_timeframe_is_422_not_silent_15m(monkeypatch, url):
    """backend-r38: فريم غير معروف كان يُبدَّل بـ15m صامتاً ⇒ مؤشرات «الساعة» على شموع 15 دقيقة."""
    called = []
    monkeypatch.setattr(main, "build_series", lambda *a, **k: called.append(a))
    r = TestClient(main.app).get(url)
    assert r.status_code == 422
    assert r.json()["detail"]["error"] == "unknown_timeframe"
    assert called == []  # لا طلب للمزوّد


def test_known_timeframes_still_accepted(monkeypatch):
    monkeypatch.setattr(market, "_api_key", lambda: None)
    c = TestClient(main.app)
    for tf in main.TF_SECONDS:
        assert c.get(f"/api/charts/EURUSD?timeframe={tf}").status_code == 200
    assert c.get("/api/terminal").status_code == 200
