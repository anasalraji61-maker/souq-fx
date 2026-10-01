"""«EUR/USD» و« EURUSD» يُطبَّعان إلى اسم MATRIX (`market.canonical_symbol`) — run 55.

كان «EUR/USD» يجلب شموعاً حقيقية لكن `bar_end` لا يعرفه ⇒ لا قصّ عند إغلاق الجمعة: تنبيه تقاطع W يُسلَّح
السبت يُطلق على تقاطع الأسبوع الماضي، و`price_as_of` بالماسح/التوقّع = وقت الجلب.
"""
from __future__ import annotations

from datetime import datetime, timezone

import pytest

import main
import twelve_data as market


def _ts(*a) -> int:
    return int(datetime(*a, tzinfo=timezone.utc).timestamp())


@pytest.mark.parametrize("raw,want", [
    ("EUR/USD", "EURUSD"), (" eurusd ", "EURUSD"), ("usd/mxn", "USDMXN"), ("XBR/USD", "UKOIL"),
    ("WTI/USD", "USOIL"), ("ETH/USD", "ETH/USD"), ("BRK/A", "BRK/A"), ("AAPL", "AAPL"),
])
def test_canonical_symbol(raw, want):
    assert market.canonical_symbol(raw) == want


@pytest.mark.parametrize("sym", ["EUR/USD", "USD/MXN", "EURUSD ", "xbr/usd"])
def test_slashed_symbol_weekly_bar_is_clamped_at_friday_close(sym):
    assert market.bar_end(sym, _ts(2026, 9, 21), 604800) == _ts(2026, 9, 25, 21)


def test_td_symbol_of_slashed_or_padded_input():
    assert market.td_symbol(" EUR/USD ") == "EUR/USD"
    assert market.td_symbol("usd/mxn") == "USD/MXN"
    assert market.td_symbol("UKOIL") == "XBR/USD"


def test_request_bodies_store_matrix_name():
    assert main.AlertCreate(symbol="EUR/USD", condition="above", price=1.1).symbol == "EURUSD"
    ia = main.IndicatorAlertCreate(symbol="eur/usd", timeframe="W", alert_type="ma_cross", condition="cross_up")
    assert ia.symbol == "EURUSD"
    assert main.ScreenerRun(symbols=[" EURUSD", "GBP/USD"]).symbols == ["EURUSD", "GBPUSD"]
    assert main.IndicatorForecastBody(symbol="EUR/USD").symbol == "EURUSD"
    with pytest.raises(ValueError):
        main.IndicatorForecastBody(symbol="  x  ")
