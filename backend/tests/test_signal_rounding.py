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


def test_flat_series_with_default_indicators_is_no_movement_not_neutral():
    """run 55: RSI ‏50 على سلسلة مسطّحة (اصطلاح لا قراءة) كان الصوت الوحيد ⇒ «إجماع: محايد» بكل المؤشّرات."""
    out = signal_hub.indicator_forecast("EURUSD", _flat(1.1), lang="en")
    assert out["votes"] == [] and out["direction"] is None
    assert out["disclaimer_code"] == "no_movement"


def test_flat_closes_with_intrabar_range_is_no_movement():
    c = [{"open": 1.1, "high": 1.1003, "low": 1.0997, "close": 1.1} for _ in range(180)]
    out = signal_hub.indicator_forecast("EURUSD", c, lang="en")
    # Stoch (الإغلاق وسط المدى) والميل 0% قراءتان حقيقيتان؛ RSI ‏50 ليس قراءة
    assert sorted(v["id"] for v in out["votes"]) == ["stoch", "trend"]
    assert all(str(v["score"]) == "0.0" for v in out["votes"])


def test_rsi_still_votes_on_moving_series():
    c = [{"open": 1.1 + i * 1e-4, "high": 1.1 + i * 1e-4 + 5e-5, "low": 1.1 + i * 1e-4 - 5e-5,
          "close": 1.1 + i * 1e-4} for i in range(60)]
    out = signal_hub.indicator_forecast("EURUSD", c, enabled=["rsi"])
    assert [v["id"] for v in out["votes"]] == ["rsi"]


def test_stochastic_vote_matches_the_displayed_k():
    """run 55: %K 79.6 يُعرض «≈80» فيُصوّت كـ80 (تشبّع −0.6) لا −0.37."""
    def series(last):
        c = [{"open": 1.1, "high": 1.2, "low": 1.0, "close": 1.1} for _ in range(20)]
        c[-1] = {"open": 1.1, "high": 1.2, "low": 1.0, "close": last}
        return c
    a = signal_hub.indicator_forecast("EURUSD", series(1.0 + 0.2 * 0.796), enabled=["stoch"])["votes"][0]
    b = signal_hub.indicator_forecast("EURUSD", series(1.0 + 0.2 * 0.80), enabled=["stoch"])["votes"][0]
    assert a["detail_values"]["k"] == b["detail_values"]["k"] == 80
    assert a["score"] == b["score"] == -0.6


def _walk(seed: int, n: int = 180):
    r = __import__("random").Random(seed)
    p, out = 1.1, []
    for i in range(n):
        o = p
        p = p * (1 + r.gauss(0, 0.0008))
        h = max(o, p) * (1 + abs(r.gauss(0, 0.0003)))
        lo = min(o, p) * (1 - abs(r.gauss(0, 0.0003)))
        out.append({"time": 1700000000 + 900 * i, "open": o, "high": h, "low": lo, "close": p})
    return out


@pytest.mark.parametrize("seed", [5, 87, 758])
def test_direction_is_classified_on_the_score_that_is_sent(seed):
    """الإجماع −0.11967 كان يُرسَل `avg_score: -0.12` بعنوان «محايد» (العتبة ±0.12)، وصوت بولنجر
    0.1197 كذلك ⇒ الدرجة المعروضة تناقض الاتجاه بجانبها. يُقرَّب أولاً ثم يُصنَّف."""
    out = signal_hub.indicator_forecast("EURUSD", _walk(seed), lang="en")
    for v in out["votes"]:
        assert v["direction"] == signal_hub._direction(v["score"]), v
    assert out["direction"] == signal_hub._direction(out["avg_score"])
    assert out["avg_score"] == round(sum(v["score"] for v in out["votes"]) / len(out["votes"]), 3)


@pytest.mark.parametrize("rsi,cond,value,fires", [
    (69.963, "above", 70, True), (30.04, "below", 30, True), (69.94, "above", 70, False),
])
def test_rsi_alert_fires_on_the_displayed_rsi(monkeypatch, rsi, cond, value, fires):
    """RSI 69.963: الماسح والتوقّع يعرضانه «70.0 تشبّع شرائي» وتنبيه «فوق 70» كان صامتاً (خام)."""
    import alert_worker
    import main

    a = {"symbol": "EURUSD", "alert_type": "rsi", "condition": cond, "value": value}
    monkeypatch.setattr(alert_worker, "_indicator_series", lambda a, cache=None: _wave())
    monkeypatch.setattr(alert_worker, "cross_is_stale", lambda a, raw: False)
    monkeypatch.setattr(alert_worker.ind_engine, "snapshot", lambda *a, **k: {"rsi": rsi})
    monkeypatch.setattr(main.ind_engine, "snapshot", lambda *a, **k: {"rsi": rsi})
    assert alert_worker._check_indicator(a) is fires
    assert main._check_indicator_alert(a, _wave()) is fires


def test_ma_lines_equal_at_the_apps_max_decimals_are_the_same_level():
    """SHIB 0.0000123: خطّان يفترقان بـ2e-13 كانا «0.0000123000 فوق 0.0000123000» (صوت على فرق لا يُعرض)."""
    a, b = 1.23e-5 + 2e-13, 1.23e-5
    assert signal_hub._same_level(a, b, b)
    # فرق يظهر بمنازل ≤12 ما يزال مستويين، ويُعرض بمنازل كافية
    c = 1.23e-5 + 3e-11
    assert not signal_hub._same_level(c, b, b)
    d = signal_hub._distinct_decimals(c, b, signal_hub.price_decimals(b))
    assert round(c, d) != round(b, d) and d <= 12
