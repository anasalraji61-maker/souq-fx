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


def _consistent(candles: list[dict], change_pct: float) -> list[dict]:
    """إغلاق أول شمعة = ما يعطي `change_pct` حتى الأخيرة — كالمسار الحقيقي بـ`build_series`. المساعد يقيس
    الحركة من الإغلاقين لا من النسبة المقرَّبة؛ سلسلة مسطّحة بنسبة +0.3% كانت تناقض نفسها."""
    first = dict(candles[0])
    first["close"] = candles[-1]["close"] / (1 + change_pct / 100)
    first["low"] = min(first["low"], first["close"])
    first["high"] = max(first["high"], first["close"])
    return [first, *candles[1:]]


def _provider_series(rng: float, symbol: str = "EURUSD", base: float = 1.1, change_pct: float = 0.3):
    def build(sym, timeframe="15m", outputsize=180):
        cs = [main.Candle(**c) for c in _consistent(_candles(60, rng, base), change_pct)]
        return main.ChartSeries(
            symbol=sym.upper(), timeframe=timeframe, candles=cs, change_pct=change_pct, last=base,
            data_source=main.DataProvenance(kind="provider", as_of=1.0, channel="twelvedata"),
        )
    return build


def test_real_series_levels_use_its_atr(client, monkeypatch):
    monkeypatch.setattr(main, "build_series", _provider_series(0.0030, change_pct=0.0))
    out = client.post("/api/signals/indicators/forecast", json={"symbol": "EURUSD", "timeframe": "D"}).json()
    assert out["data_kind"] == "provider"
    assert out["levels_basis"]["atr"] == pytest.approx(0.0030)
    if out["levels"] is not None:
        assert abs(out["levels"]["entry"] - out["levels"]["sl"]) == pytest.approx(1.4 * 0.0030)


def test_ai_template_gives_no_scenario_levels(client, monkeypatch):
    """قرار أنس ٤: كان القالب «سيناريو مقترح» بدخول ووقف 1×ATR وهدف 2×ATR."""
    monkeypatch.setattr(main, "build_series", _provider_series(0.137, "USDJPY", 157.25))
    monkeypatch.setattr(main.openrouter_ai, "configured", lambda: False)
    body = client.post("/api/ai/ask", json={"question": "ما رأيك؟", "symbol": "USDJPY"}).json()
    assert body["setup"] == {"direction": None, "entry": None, "sl": None, "tp": None, "win_probability": None}
    assert not main.openrouter_ai.has_trade_call(body["answer"])


def test_indicator_snapshot_route_says_timeframe_and_window(client, monkeypatch):
    monkeypatch.setattr(main, "build_series", _provider_series(0.0030))
    out = client.get("/api/indicators/snapshot/EURUSD?timeframe=1H").json()
    assert out["timeframe"] == "1H" and out["change_bars"] == 59
    assert out["data_kind"] == "provider"


def test_forecast_and_snapshot_say_when_the_entry_price_is_from(client, monkeypatch):
    """مستويات التوقّع بلا وقت: السبت إغلاق الجمعة يُعرض دخولاً بلا ما يقول إنه ليس السعر الحالي."""
    monkeypatch.setattr(main, "build_series", _provider_series(0.0030))
    series = main.build_series("EURUSD", "D")
    f = client.post("/api/signals/indicators/forecast", json={"symbol": "EURUSD", "timeframe": "D"}).json()
    assert f["price_as_of"] == main._series_price_at(series) == 1.0  # وقت الجلب يسبق نهاية الشمعة
    s = client.get("/api/indicators/snapshot/EURUSD?timeframe=D").json()
    assert s["price_as_of"] == 1.0


def test_forecast_snapshot_says_how_many_candles_its_change_covers(client, monkeypatch):
    """`snapshot.change_pct` بالتوقّع = تغيّر كامل السلسلة (60 إغلاقاً = 59 شمعة) — كان بلا عدد شموعه."""
    monkeypatch.setattr(main, "build_series", _provider_series(0.0030))
    f = client.post("/api/signals/indicators/forecast", json={"symbol": "EURUSD", "timeframe": "D"}).json()
    assert f["snapshot"]["change_bars"] == 59


def test_levels_keep_precision_below_one_hundred_thousandth():
    """SHIB ‏0.0000123: `round(x, 5)` جعل الدخول والوقف والهدف كلها 0.00001."""
    levels, _ = signal_hub._trade_levels(0.0000123, "buy", _candles(40, 0.0000004, base=0.0000123))
    assert levels["entry"] == pytest.approx(0.0000123)
    assert levels["sl"] == pytest.approx(0.0000123 - 1.4 * 0.0000004)
    assert levels["tp"] == pytest.approx(0.0000123 + 2.2 * 0.0000004)
    assert len({levels["entry"], levels["sl"], levels["tp"]}) == 3


def test_normal_prices_keep_five_decimals():
    assert signal_hub.level_round(1.084234567, 1.08) == 1.08423


@pytest.mark.parametrize("x,ref,want", [
    (157.4234567, 157.4, 157.423),   # USDJPY: 3 منازل لا 157.42346
    (2651.432187, 2650.0, 2651.43),  # الذهب
    (42123.4567, 42000.0, 42123.46),  # مؤشر/BTC: منزلتان حدّاً أدنى (run 92)
])
def test_levels_above_ten_use_the_price_decimals_not_five(x, ref, want):
    """كانت 5 منازل فوق 10 ⇒ وقف USDJPY «157.88916» مع `price_decimals: 3` — دقّة دون تسعيرة المزوّد."""
    assert signal_hub.level_round(x, ref) == want
    assert signal_hub.level_round(x, ref) == round(x, signal_hub.price_decimals(ref))


@pytest.mark.parametrize("ref", [0.6512, 0.1, 0.9999])
def test_prices_between_a_tenth_and_one_get_the_five_decimals_the_app_shows(ref):
    """AUDUSD/NZDUSD/USDCHF/EURGBP: كانت 6 منازل (0.651235) بينما `price_decimals` = 5 — دقّة دون تسعيرة المزوّد."""
    assert signal_hub.level_round(0.6512345, ref) == 0.65123
    assert signal_hub.price_decimals(ref) == 5


def test_no_levels_when_the_target_would_be_a_negative_price():
    """سعر 0.05 وATR 0.06 ⇒ هدف البيع 0.05 − 2.2×0.06 = −0.082: سعر مستحيل."""
    levels, basis = signal_hub._trade_levels(0.05, "sell", _candles(40, 0.06, base=0.05))
    assert levels is None and basis["unavailable"] == "atr_exceeds_price"


def test_no_levels_when_atr_is_below_half_a_tick():
    """run 55: USDSAR ‏3.75 وATR ‏2.5e-6 ⇒ الوقف يُقرَّب على الدخول (5 منازل) — صفقة «بلا مخاطرة»."""
    levels, basis = signal_hub._trade_levels(3.75006, "sell", _candles(40, 0.0000025, base=3.75006))
    assert levels is None and basis["unavailable"] == "atr_below_tick"
    levels, _ = signal_hub._trade_levels(3.75006, "sell", _candles(40, 0.0002, base=3.75006))
    assert levels["sl"] != levels["entry"] != levels["tp"]
