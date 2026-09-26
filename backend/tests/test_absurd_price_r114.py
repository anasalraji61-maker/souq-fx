"""التشغيل 114: قيمة منتهية عبثية من المزوّد (1e200/1e308) كانت تمرّ ⇒ 500 للشارت والطرفية والماسح
والاختبار الخلفي (OverflowError، change_pct لا نهائية). تُسقَط كالصفّ المعطوب."""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import main
import twelve_data as market
import twelve_data_ws as td_ws
from tests.test_twelve_data_candles import _rows, provider  # noqa: F401


@pytest.mark.parametrize("val", ["1e200", "1e308", "1e13"])
def test_absurd_candle_row_is_dropped(val):
    row = {**_rows(1)[0], "close": val, "high": val}
    assert market._candle(row) is None
    assert market._candle(_rows(1)[0]) is not None


def test_quote_and_ws_price_reject_absurd():
    assert market._pos("1e200") is None and market._pos("65000.5") == 65000.5
    assert td_ws._parse_price({"event": "price", "symbol": "EUR/USD", "price": "1e300"}) is None


@pytest.mark.parametrize("method, url, body", [
    ("GET", "/api/charts/EURUSD", None),
    ("GET", "/api/indicators/snapshot/EURUSD", None),
    ("POST", "/api/backtest", {"symbol": "EURUSD", "strategy": "bb_bounce"}),
    ("POST", "/api/signals/indicators/forecast", {"symbol": "EURUSD"}),
    ("POST", "/api/screener/run", {"symbols": ["EURUSD"]}),
])
def test_one_absurd_row_does_not_500_the_routes(provider, method, url, body):  # noqa: F811
    rows = [{**r, "datetime": f"2026-09-23 {10 + i // 60:02d}:{i % 60:02d}:00"} for i, r in enumerate(_rows(200))]
    rows[-1] = {**rows[-1], "close": "1e200", "high": "1e200"}
    provider["payload"] = {"values": rows}
    r = TestClient(main.app, raise_server_exceptions=False).request(method, url, json=body)
    assert r.status_code == 200, r.text[:200]
    assert "1e+200" not in r.text
