"""run 125: الين أساساً (JPYUSD ≈ 0.0067) كان يأخذ 5 منازل ثابتة كزوج عملات عادي ⇒ خطوة 0.15% من السعر
تبتلع ATR الساعة: دخول فوق آخر إغلاق، ووقف وهدف بنسبة 1:1.00 لا 1:1.57 المعلنة بـ`levels_basis`."""
import random

import pytest

import signal_hub as s


@pytest.mark.parametrize("sym", ["JPYUSD", "JPYEUR", "JPYGBP", "JPY/USD"])
def test_jpy_base_decimals_follow_price_size(sym):
    assert s.price_decimals(0.0067, sym) == s.price_decimals(0.0067) == 8


def test_other_pairs_keep_fixed_decimals():
    assert s.price_decimals(1.1, "EURUSD") == 5
    assert s.price_decimals(150.1, "USDJPY") == 3
    assert s.price_decimals(97.0, "AUDJPY") == 3


def _series():
    random.seed(3)
    for _ in range(2000):
        c, p = [], 0.0066
        for i in range(180):
            o = p
            p = p + random.gauss(0.0000006, 0.000006)
            w = abs(random.gauss(0, 0.000004))
            c.append({"time": i * 3600, "open": o, "high": max(o, p) + w, "low": min(o, p) - w, "close": p})
        out = s.indicator_forecast("JPYUSD", c, lang="en")
        if out["levels"]:
            return out
    pytest.skip("no directional series")


def test_jpy_base_levels_keep_entry_and_advertised_reward_risk():
    out = _series()
    lv, b = out["levels"], out["levels_basis"]
    last = out["snapshot"]["last"]
    assert lv["entry"] == pytest.approx(last, rel=1e-5)
    rr = abs(lv["tp"] - lv["entry"]) / abs(lv["entry"] - lv["sl"])
    assert rr == pytest.approx(b["tp_mult"] / b["sl_mult"], rel=0.01)
