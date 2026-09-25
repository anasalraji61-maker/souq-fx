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


# ─── لا أصوات من لا حركة، ونافذة «10 شموع» صحيحة ─────────────────────────────

def _flat(n: int, px: float = 1.1) -> list[dict]:
    return [{"time": i, "open": px, "high": px, "low": px, "close": px} for i in range(n)]


def test_flat_candles_cast_no_stochastic_or_band_vote():
    """مدى صفري كان %K=0 ⇒ «تشبّع بيعي» وصوت شراء +0.6؛ ونطاق بولنجر بعرض 1e-9 حول السعر."""
    out = signal_hub.indicator_forecast("EURUSD", _flat(60))
    ids = {v["id"] for v in out["votes"]}
    assert "stoch" not in ids and "bb" not in ids


def test_trend_vote_spans_ten_candle_moves():
    """«آخر 10 شموع» = من الإغلاق قبلها (1.0) إلى الأخير (1.2) = +20%. كان من `closes[-10]` (1.1) ⇒ 9.09%."""
    closes = [1.0] * 50 + [1.1] * 9 + [1.2]
    candles = [{"time": i, "open": c, "high": c, "low": c, "close": c} for i, c in enumerate(closes)]
    out = signal_hub.indicator_forecast("EURUSD", candles, enabled=["trend"])
    (v,) = out["votes"]
    assert v["detail_values"]["pct"] == pytest.approx(20.0)


def test_flat_candles_give_no_ma_or_macd_vote_and_no_direction():
    """خطّان متساويان كانا «تحت» (`else`) ⇒ MA ‏−0.45 وMACD ‏−0.35 ⇒ توقّع «بيع» من سوق بلا حركة."""
    out = signal_hub.indicator_forecast("EURUSD", _flat(60))
    ids = {v["id"] for v in out["votes"]}
    assert "ma" not in ids and "macd" not in ids
    assert out["direction"] != "sell"


def test_distinct_lines_never_display_as_equal_numbers():
    """«الخط 0.00001 فوق الإشارة 0.00001»: منازل إضافية حتى يظهر الفرق."""
    assert signal_hub._distinct_decimals(0.0000123, 0.0000081, 5) == 6
    assert signal_hub._distinct_decimals(1.0842, 1.0831, 5) == 5
    assert signal_hub._same_level(1.1, 1.1 + 2e-16, 1.1)
    assert not signal_hub._same_level(1.1, 1.10001, 1.1)
