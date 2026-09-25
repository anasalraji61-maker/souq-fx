"""تفاصيل أصوات توقّع المؤشّرات (QA5): كانت عربية فقط وتصل الواجهة الإنجليزية/الكردية، والأسعار
بـ`:.5f` خام (USDJPY «157.42312»)، و«لا أصوات» كان يُعاد «محايد» بدرجة 0.0."""
from __future__ import annotations

import math
import re

import pytest

import signal_hub


def _candles(base: float, n: int = 80, step: float = 0.0004):
    out = []
    for i in range(n):
        c = base * (1 + step * math.sin(i / 3) + step * i / 10)
        out.append({"open": c, "high": c * 1.0003, "low": c * 0.9997, "close": c})
    return out


ARABIC = re.compile(r"[؀-ۿ]")


@pytest.mark.parametrize("price,dp", [(1.0842, 5), (0.6512, 5), (157.42, 3), (2650.0, 2), (61000.0, 1)])
def test_price_decimals_follow_market_convention(price, dp):
    assert signal_hub.price_decimals(price) == dp


def test_english_request_gets_no_arabic_text():
    out = signal_hub.indicator_forecast("EURUSD", _candles(1.08), lang="en")
    assert out["votes"]
    for v in out["votes"]:
        assert not ARABIC.search(v["name"] + v["detail"]), v
    assert not ARABIC.search(out["disclaimer"])


def test_default_stays_arabic_and_every_vote_has_a_code():
    out = signal_hub.indicator_forecast("EURUSD", _candles(1.08))
    assert ARABIC.search(out["disclaimer"])
    for v in out["votes"]:
        assert v["detail_code"] in signal_hub._DETAIL_TEXT["en"]
        assert isinstance(v["detail_values"], dict)


def test_jpy_values_rounded_to_three_decimals_not_five():
    out = signal_hub.indicator_forecast("USDJPY", _candles(157.42), enabled=["ma", "macd"], lang="en")
    assert out["price_decimals"] == 3
    for v in out["votes"]:
        for x in v["detail_values"].values():
            assert round(x, 3) == x, v
        assert not re.search(r"\d+\.\d{4,}", v["detail"]), v["detail"]


def test_no_votes_is_null_direction_not_neutral():
    out = signal_hub.indicator_forecast("EURUSD", [], lang="en")
    assert out["votes"] == []
    assert out["direction"] is None
    assert out["avg_score"] is None


def test_route_returns_english_detail_for_lang_en(monkeypatch):
    from fastapi.testclient import TestClient
    import main

    cs = [dict(c, time=1_700_000_000 + i * 900) for i, c in enumerate(_candles(157.42))]
    series = main.ChartSeries(
        symbol="USDJPY", timeframe="15m", candles=[main.Candle(**c) for c in cs],
        change_pct=0.1, last=cs[-1]["close"], data_source=main.DataProvenance(kind="provider"),
    )
    monkeypatch.setattr(main, "build_series", lambda *a, **k: series)
    out = TestClient(main.app).post(
        "/api/signals/indicators/forecast", json={"symbol": "USDJPY", "lang": "en"}
    ).json()
    assert out["votes"] and out["price_decimals"] == 3
    assert not any(ARABIC.search(v["detail"]) for v in out["votes"])


def test_disclaimer_has_a_code_for_the_app_to_translate():
    # chart-r35: الكردي لا نصّ له بالخادم ⇒ الرمز يكفي التطبيق
    assert signal_hub.indicator_forecast("EURUSD", _candles(1.08))["disclaimer_code"] == "indicator_consensus"
    assert signal_hub.indicator_forecast("EURUSD", [])["disclaimer_code"] == "not_enough_data"
