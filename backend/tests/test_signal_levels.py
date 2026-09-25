"""مستويات الإشارة (دخول/وقف/هدف) من تذبذب الفريم الحقيقي — أو لا مستويات.

كان الوقف 0.18% من السعر **ثابتاً لكل فريم** (~29 نقطة على EURUSD سواء 1د أو يومي)، وحين يغيب
السعر الحقيقي تُبنى المستويات على `_fallback_price` (سعر مكتوب باليد: EURUSD 1.0854، ذهب 2348.6).
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import indicators as ind
import main
import signal_hub


def _candles(n: int, rng: float, base: float = 1.1000) -> list[dict]:
    """شموع مدى كل منها `rng` بلا فجوات ⇒ ATR = rng بالضبط."""
    return [
        {"time": 1_700_000_000 + i * 60, "open": base, "high": base + rng / 2,
         "low": base - rng / 2, "close": base, "volume": 0}
        for i in range(n)
    ]


def test_atr_equals_the_constant_range_and_is_none_during_warmup():
    out = ind.atr(_candles(30, 0.0020), 14)
    assert all(v is None for v in out[:14])
    assert out[14] == pytest.approx(0.0020) and out[-1] == pytest.approx(0.0020)


def test_atr_uses_the_gap_from_the_previous_close():
    c = _candles(16, 0.0010)
    c[15] = {**c[15], "high": 1.1030, "low": 1.1020, "close": 1.1025}  # فجوة صعود
    out = ind.atr(c, 14)
    tr_last = 1.1030 - 1.1000  # |high - prev close|
    assert out[15] == pytest.approx((0.0010 * 13 + tr_last) / 14)


@pytest.mark.parametrize("rng", [0.0002, 0.0100])  # دقيقة ~2 نقطة، يومي ~100 نقطة
def test_stop_distance_follows_the_timeframe_volatility(rng):
    levels, basis = signal_hub._trade_levels(1.1, "buy", _candles(40, rng))
    assert levels["sl"] == pytest.approx(1.1 - 1.4 * rng)
    assert levels["tp"] == pytest.approx(1.1 + 2.2 * rng)
    assert basis["method"] == "atr14" and basis["atr"] == pytest.approx(rng)


def test_sell_levels_are_mirrored():
    levels, _ = signal_hub._trade_levels(1.1, "sell", _candles(40, 0.001))
    assert levels["sl"] > 1.1 > levels["tp"]


@pytest.mark.parametrize(
    "last, direction, candles, reason",
    [
        (None, "buy", _candles(40, 0.001), "no_live_price"),
        (1.1, "buy", _candles(10, 0.001), "not_enough_candles"),
        (1.1, "buy", None, "not_enough_candles"),
        (1.1, "neutral", _candles(40, 0.001), "neutral"),
    ],
)
def test_no_levels_rather_than_invented_ones(last, direction, candles, reason):
    levels, basis = signal_hub._trade_levels(last, direction, candles)
    assert levels is None and basis["unavailable"] == reason


def test_no_hand_written_fallback_price_remains():
    assert not hasattr(signal_hub, "_fallback_price")


# ─── المسارات: شموع demo لا تصنع مستويات ─────────────────────────────────────

@pytest.fixture()
def client():
    return TestClient(main.app)


def test_demo_series_gives_no_levels_on_every_signal_route(client, monkeypatch):
    monkeypatch.setattr(main.market, "configured", lambda: False)
    f = client.post("/api/signals/indicators/forecast", json={"symbol": "EURUSD", "timeframe": "4H"}).json()
    assert f["data_kind"] == "demo"
    assert f["levels"] is None
    assert f["timeframe"] == "4H"


def _provider_series(rng: float, symbol: str = "EURUSD", base: float = 1.1):
    def build(sym, timeframe="15m", outputsize=180):
        cs = [main.Candle(**c) for c in _candles(60, rng, base)]
        return main.ChartSeries(
            symbol=sym.upper(), timeframe=timeframe, candles=cs, change_pct=0.3, last=base,
            data_source=main.DataProvenance(kind="provider", as_of=1.0, channel="twelvedata"),
        )
    return build


def test_real_series_levels_use_its_atr(client, monkeypatch):
    monkeypatch.setattr(main, "build_series", _provider_series(0.0030))
    out = client.post("/api/signals/indicators/forecast", json={"symbol": "EURUSD", "timeframe": "D"}).json()
    assert out["data_kind"] == "provider"
    assert out["levels_basis"]["atr"] == pytest.approx(0.0030)
    if out["levels"] is not None:
        assert abs(out["levels"]["entry"] - out["levels"]["sl"]) == pytest.approx(1.4 * 0.0030)


def test_ai_scenario_stop_is_one_atr_and_keeps_jpy_precision(client, monkeypatch):
    monkeypatch.setattr(main, "build_series", _provider_series(0.137, "USDJPY", 157.25))
    monkeypatch.setattr(main.openrouter_ai, "configured", lambda: False)
    setup = client.post("/api/ai/ask", json={"question": "ما رأيك؟", "symbol": "USDJPY"}).json()["setup"]
    assert setup["entry"] == pytest.approx(157.25)
    assert setup["sl"] == pytest.approx(157.25 - 0.137)
    assert setup["tp"] == pytest.approx(157.25 + 2 * 0.137)
    assert setup["sl"] == round(setup["sl"], 3) and round(setup["sl"], 2) != setup["sl"], "خانة الين الثالثة باقية"


def test_indicator_snapshot_route_says_timeframe_and_window(client, monkeypatch):
    monkeypatch.setattr(main, "build_series", _provider_series(0.0030))
    out = client.get("/api/indicators/snapshot/EURUSD?timeframe=1H").json()
    assert out["timeframe"] == "1H" and out["change_bars"] == 60
    assert out["data_kind"] == "provider"
