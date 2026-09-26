"""التشغيل 114: رمز بحرف تنسيق غير مرئي (RLM منسوخ من نصّ عربي) أو بعرض كامل كان يُحفظ تنبيهاً/متابعةً
يبدو EURUSD ولا يعرفه المزوّد ⇒ «يراقب» ولا يُطلق أبداً."""
from __future__ import annotations

import pytest

import twelve_data
from tests.test_price_alert_check import _DEVICE, client  # noqa: F401


@pytest.mark.parametrize("raw", ["‏EURUSD", "EUR​USD", "﻿EURUSD‎", "ＥＵＲＵＳＤ", "eur/usd⁩"])
def test_canonical_symbol_drops_invisible_and_fullwidth(raw):
    assert twelve_data.canonical_symbol(raw) == "EURUSD"


def test_canonical_symbol_keeps_provider_notation():
    assert twelve_data.canonical_symbol("aapl:bmv") == "AAPL:BMV"
    assert twelve_data.canonical_symbol("BRK.A") == "BRK.A"


def test_alert_with_rlm_is_saved_as_plain_symbol(client):
    r = client.post("/api/alerts", json={"symbol": "‏EURUSD", "condition": "above", "price": 1.1},
                    headers=_DEVICE)
    assert r.status_code == 200 and r.json()["alert"]["symbol"] == "EURUSD"


@pytest.mark.parametrize("bad", ["EURUSD\x00", "x\ny\nz", "😀😀😀", "يورودولار", "EUR USD"])
def test_alert_and_watchlist_reject_non_symbol_text(client, bad):
    assert client.post("/api/alerts", json={"symbol": bad, "condition": "above", "price": 1.1},
                       headers=_DEVICE).status_code == 422
    assert client.post("/api/watchlist/custom", json={"symbol": bad}, headers=_DEVICE).status_code == 422


def test_watchlist_rlm_symbol_is_plain(client):
    r = client.post("/api/watchlist/custom", json={"symbol": "‏GBPUSD"}, headers=_DEVICE)
    assert r.status_code == 200
    assert "GBPUSD" in str(client.get("/api/watchlist/custom", headers=_DEVICE).json())
