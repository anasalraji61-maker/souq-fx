"""أصوات توقّع المؤشّرات: الرقم المعروض يطابق الصوت (run 54).

- RSI يُصنَّف على الرقم المعروض: 69.96 كان «زخم إيجابي (70.0)» وصوت شراء بينما 70 «تشبّع شرائي».
- حركة 10 شموع صوّتت شراء على 1m بينما النص «0.0%» (و«-0.0%» للهابطة).
- 20 إغلاقاً متطابقة بسعر الذهب: std≈1e-13 من ضجيج الجمع ⇒ صوت «موقع 25%» من لا حركة.
- سلسلة كاملة بلا مدى كانت «لا بيانات كافية / شموع قليلة».
"""
from __future__ import annotations

import math

import pytest

import screener
import signal_hub


def _flat(p: float, n: int = 180):
    return [{"open": p, "high": p, "low": p, "close": p} for _ in range(n)]


def _wave(base: float = 1.1, n: int = 80):
    out = []
    for i in range(n):
        c = base * (1 + 0.0004 * math.sin(i / 3))
        out.append({"open": c, "high": c * 1.0003, "low": c * 0.9997, "close": c})
    return out


def _with_rsi(monkeypatch, rsi):
    real = signal_hub.ind_engine.snapshot
    monkeypatch.setattr(signal_hub.ind_engine, "snapshot", lambda c: {**real(c), "rsi": rsi})


@pytest.mark.parametrize("rsi,code,score", [
    (69.96, "rsi_overbought", -0.7), (54.96, "rsi_bullish", 0.25), (45.04, "rsi_bearish", -0.25),
    (30.04, "rsi_oversold", 0.7), (69.94, "rsi_bullish", 0.25),
])
def test_rsi_vote_matches_the_displayed_value(monkeypatch, rsi, code, score):
    _with_rsi(monkeypatch, rsi)
    out = signal_hub.indicator_forecast("EURUSD", _wave(), enabled=["rsi"], lang="en")
    v = out["votes"][0]
    assert v["detail_code"] == code and v["score"] == pytest.approx(score)


def test_screener_rsi_threshold_uses_displayed_value(monkeypatch):
    candles = _wave(n=120)
    monkeypatch.setattr(screener.market, "fetch_time_series_with_meta",
                        lambda *a, **k: (candles, {"kind": "live", "as_of": None}))
    monkeypatch.setattr(screener.alert_worker, "series_fresh_enough", lambda *a, **k: True)
    real = screener.ind.snapshot
    monkeypatch.setattr(screener.ind, "snapshot", lambda c, **k: {**real(c, **k), "rsi": 69.96})
    hits = screener.run_scan(filters=["rsi_overbought"], symbols=["EURUSD"])
    assert [h["rsi"] for h in hits] == [70.0]


def test_tiny_trend_move_shows_enough_decimals_and_no_negative_zero():
    base = 1.1
    closes = [base + 0.000033 * math.sin(i) for i in range(40)] + [base + 0.000045]
    candles = [{"open": c, "high": c + 0.00002, "low": c - 0.00002, "close": c} for c in closes]
    candles[-11] = {"open": base, "high": base + 0.00002, "low": base - 0.00002, "close": base}
    out = signal_hub.indicator_forecast("EURUSD", candles, enabled=["trend"], lang="en")
    v = out["votes"][0]
    assert v["score"] > 0
    assert v["detail_values"]["pct"] > 0, v["detail"]
    down = [{**c, "close": 2 * base - c["close"], "high": 2 * base - c["low"], "low": 2 * base - c["high"]}
            for c in candles]
    d = signal_hub.indicator_forecast("EURUSD", down, enabled=["trend"], lang="en")["votes"][0]
    assert d["detail_values"]["pct"] < 0 and "-0.0%" not in d["detail"]


def test_flat_gold_window_casts_no_bollinger_vote():
    p = 1773.66
    assert sum([p] * 20) / 20 != p  # ضجيج الجمع: المتوسط ليس السعر نفسه
    out = signal_hub.indicator_forecast("XAUUSD", _flat(p, 30), enabled=["bb"])
    assert out["votes"] == []


def test_flat_full_series_is_no_movement_not_missing_data():
    out = signal_hub.indicator_forecast("EURUSD", _flat(1.1), enabled=["bb", "stoch", "trend", "ma", "macd"],
                                        lang="en")
    assert out["disclaimer_code"] == "no_movement"
    assert out["levels_basis"]["unavailable"] == "no_range"


def test_short_series_is_still_not_enough_data():
    out = signal_hub.indicator_forecast("EURUSD", _flat(1.1, 5), enabled=["bb", "trend"])
    assert out["disclaimer_code"] == "not_enough_data"
    assert out["levels_basis"]["unavailable"] == "not_enough_candles"
