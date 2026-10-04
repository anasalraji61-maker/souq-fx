"""
Tests for /api/analysis/pnl-groups endpoint — Task T07b
Exposes analytics_metrics.pnl_by_symbol and pnl_by_timeframe.
"""
from __future__ import annotations

import main
from fastapi.testclient import TestClient


# No DB is used, so no temp DB fixture is needed
client = TestClient(main.app, raise_server_exceptions=False)


def test_pnl_groups_three_trades():
    """Mixed-symbol trades aggregate by symbol and by timeframe."""
    trades = [
        {"symbol": "EURUSD", "timeframe": "M15", "pnl": 10.0},
        {"symbol": "EURUSD", "timeframe": "M15", "pnl": -5.0},
        {"symbol": "XAUUSD", "timeframe": "H1", "pnl": 20.0},
    ]
    r = client.post("/api/analysis/pnl-groups", json={"trades": trades})
    assert r.status_code == 200, r.text
    data = r.json()

    assert data["by_symbol"]["EURUSD"]["trades"] == 2
    assert data["by_symbol"]["EURUSD"]["total_pnl"] == 5.0
    assert data["by_symbol"]["EURUSD"]["win_rate"] == 50.0
    assert data["by_symbol"]["XAUUSD"]["profit_factor"] is None
    assert set(data["by_timeframe"]) == {"M15", "H1"}


def test_pnl_groups_empty_trades():
    """Empty trades list returns 200 with empty groupings."""
    r = client.post("/api/analysis/pnl-groups", json={"trades": []})
    assert r.status_code == 200, r.text
    assert r.json() == {"by_symbol": {}, "by_timeframe": {}}


def test_pnl_groups_missing_symbol_uses_default():
    """A trade without symbol/timeframe falls back to UNKNOWN in both dicts."""
    r = client.post("/api/analysis/pnl-groups", json={"trades": [{"pnl": 3.0}]})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["by_symbol"]["UNKNOWN"]["total_pnl"] == 3.0
    assert data["by_timeframe"]["UNKNOWN"]["total_pnl"] == 3.0


def test_pnl_groups_missing_pnl_returns_422():
    """A trade without the required pnl field fails validation."""
    r = client.post(
        "/api/analysis/pnl-groups",
        json={"trades": [{"symbol": "EURUSD", "timeframe": "M15"}]},
    )
    assert r.status_code == 422


def test_pnl_groups_get_returns_405():
    """GET is not an allowed method on the endpoint."""
    r = client.get("/api/analysis/pnl-groups")
    assert r.status_code == 405


def test_pnl_groups_too_many_trades_returns_422():
    """More than 10000 trades exceeds the max_length limit."""
    trades = [{"symbol": "EURUSD", "timeframe": "M15", "pnl": 1.0} for _ in range(10001)]
    r = client.post("/api/analysis/pnl-groups", json={"trades": trades})
    assert r.status_code == 422
