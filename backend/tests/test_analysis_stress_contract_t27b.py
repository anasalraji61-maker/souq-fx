"""
T27b contract tests for /api/analysis/stress-test.

The frontend POSTs `{trades, equity}` and expects a bare JSON list of
StressScenarioResult items (name, shock_pct, estimated_pnl, projected_equity,
equity_impact_pct, status).

Legacy `{positions, shocks}` bodies must keep returning the old dict.
"""
from __future__ import annotations

import math
import pytest
from fastapi.testclient import TestClient

import main

client = TestClient(main.app, raise_server_exceptions=False)

RESULT_KEYS = {
    "name", "shock_pct", "estimated_pnl",
    "projected_equity", "equity_impact_pct", "status",
}

BUY_TRADE = {
    "symbol": "EURUSD",
    "direction": "buy",
    "lots": 1,
    "entry_price": 1.1,
    "pnl": 0.0,
    "closed_at": "",
}


# ─── Frontend trades path ─────────────────────────────────────────────────────

def test_stress_test_buy_trade_returns_list_of_four():
    """A buy trade with equity=10000 returns 4 scenarios in default order."""
    r = client.post("/api/analysis/stress-test", json={"trades": [BUY_TRADE], "equity": 10000})
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 4
    assert set(data[0].keys()) == RESULT_KEYS
    # default shocks -5%, -2%, +2%, +5%
    assert data[0]["shock_pct"] == -5.0
    assert data[1]["shock_pct"] == -2.0
    assert data[2]["shock_pct"] == 2.0
    assert data[3]["shock_pct"] == 5.0


def test_stress_test_buy_trade_negative_five_impact():
    """Buy trade: -5% shock -> pnl -5500, impact -55, status DANGER."""
    r = client.post("/api/analysis/stress-test", json={"trades": [BUY_TRADE], "equity": 10000})
    assert r.status_code == 200, r.text
    item = r.json()[0]  # -5% shock
    assert item["shock_pct"] == -5.0
    assert item["estimated_pnl"] == -5500.0
    assert item["projected_equity"] == 4500.0
    assert item["equity_impact_pct"] == -55.0
    assert item["status"] == "DANGER"
    assert item["name"] == "Shock -5.0%"


def test_stress_test_sell_trade_positive_on_negative_shock():
    """Sell trade same numbers: -5% shock -> pnl +5500."""
    trade = dict(BUY_TRADE, direction="sell")
    r = client.post("/api/analysis/stress-test", json={"trades": [trade], "equity": 10000})
    assert r.status_code == 200, r.text
    item = r.json()[0]  # -5% shock
    assert item["estimated_pnl"] == 5500.0
    assert item["projected_equity"] == 15500.0
    assert item["equity_impact_pct"] == 55.0
    assert item["status"] == "STABLE"


def test_stress_test_plus_two_impact_buy():
    """Buy trade: +2% shock -> pnl 2200, impact 22, status STABLE."""
    r = client.post("/api/analysis/stress-test", json={"trades": [BUY_TRADE], "equity": 10000})
    assert r.status_code == 200, r.text
    item = r.json()[2]  # +2% shock
    assert item["shock_pct"] == 2.0
    assert item["estimated_pnl"] == 2200.0
    assert item["equity_impact_pct"] == 22.0
    assert item["status"] == "STABLE"


def test_stress_test_status_warning_boundary():
    """Impact between -15 and -5 is WARNING.

    equity=1000, notional=110000 (buy). For -5% shock, pnl=-5500,
    impact = -5500/1000*100 = -550 -> DANGER.
    Use a tiny trade so impact lands between -15 and -5.
    """
    # lots=0.01 -> units=1000, price=1.1 -> notional=1100
    trade = dict(BUY_TRADE, lots=0.01)
    r = client.post("/api/analysis/stress-test", json={"trades": [trade], "equity": 1000})
    assert r.status_code == 200, r.text
    item = r.json()[0]  # -5% shock
    # pnl = 1100 * -0.05 = -55 ; impact = -55/1000*100 = -5.5
    assert item["estimated_pnl"] == -55.0
    assert item["equity_impact_pct"] == -5.5
    assert item["status"] == "WARNING"


def test_stress_test_projected_equity_never_negative():
    """projected_equity is floored at 0."""
    # Huge buy trade so pnl wipes out equity: lots=10 -> units=1e6, price=1.1
    trade = dict(BUY_TRADE, lots=10)
    r = client.post("/api/analysis/stress-test", json={"trades": [trade], "equity": 100})
    assert r.status_code == 200, r.text
    item = r.json()[0]  # -5% shock
    assert item["projected_equity"] >= 0.0
    assert item["projected_equity"] == 0.0


def test_stress_test_invalid_trades_skipped():
    """Lots 0 or entry_price 0 skipped; no valid positions -> 4 scenarios, pnl 0."""
    trades = [
        dict(BUY_TRADE, lots=0),
        dict(BUY_TRADE, entry_price=0),
        dict(BUY_TRADE, lots=-1),
    ]
    r = client.post("/api/analysis/stress-test", json={"trades": trades, "equity": 10000})
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 4
    for item in data:
        assert item["estimated_pnl"] == 0.0
        assert item["equity_impact_pct"] == 0.0


def test_stress_test_equity_zero_no_crash():
    """equity=0 gives equity_impact_pct 0.0 and no crash."""
    r = client.post("/api/analysis/stress-test", json={"trades": [BUY_TRADE], "equity": 0})
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 4
    for item in data:
        assert item["equity_impact_pct"] == 0.0


def test_stress_test_no_trades_no_positions_legacy():
    """Body with neither trades nor positions returns old dict."""
    r = client.post("/api/analysis/stress-test", json={})
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, dict)
    assert data["estimated"] is True
    assert "scenarios" in data
    assert len(data["scenarios"]) == 4


def test_stress_test_legacy_positions_body_still_dict():
    """Legacy {positions:[...]} body returns old dict with 'scenarios'."""
    positions = [{"symbol": "EURUSD", "side": "buy", "units": 1000, "price": 1.10}]
    r = client.post("/api/analysis/stress-test", json={"positions": positions})
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, dict)
    assert "scenarios" in data
    assert "total_notional" in data
    assert "estimated" in data


def test_stress_test_default_equity():
    """Missing equity defaults to 10000."""
    r = client.post("/api/analysis/stress-test", json={"trades": [BUY_TRADE]})
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 4


def test_stress_test_empty_trades_legacy():
    """Empty trades list -> legacy dict path (positions empty)."""
    r = client.post("/api/analysis/stress-test", json={"trades": []})
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, dict)
    assert data["estimated"] is True
    assert "scenarios" in data


def test_stress_test_custom_shocks_with_trades():
    """Custom shocks respected when trades supplied."""
    custom = [-0.10, -0.05, 0.0, 0.05, 0.10]
    r = client.post(
        "/api/analysis/stress-test",
        json={"trades": [BUY_TRADE], "equity": 10000, "shocks": custom},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 5
    assert data[0]["shock_pct"] == -10.0
    assert data[-1]["shock_pct"] == 10.0


def test_stress_test_unknown_direction_defaults_buy():
    """direction not buy/sell -> defaults to buy."""
    trade = dict(BUY_TRADE, direction="long")
    r = client.post("/api/analysis/stress-test", json={"trades": [trade], "equity": 10000})
    assert r.status_code == 200, r.text
    item = r.json()[0]  # -5% shock
    assert item["estimated_pnl"] == -5500.0  # same as a buy
