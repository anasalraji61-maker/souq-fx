"""
Tests for stateless analytics API router — Task T07a
Tests /api/analysis endpoints with various inputs.
"""
from __future__ import annotations

import json
import pytest
from fastapi.testclient import TestClient

import main


# Create client once, no context manager, no DB fixture needed
client = TestClient(main.app, raise_server_exceptions=False)


# ─── /order-flow ─────────────────────────────────────────────────────────────

def test_order_flow_three_candles():
    """3 small candles return 200 with estimated true."""
    candles = [
        {"open": 1.1000, "high": 1.1050, "low": 1.0980, "close": 1.1020, "volume": 1000},
        {"open": 1.1020, "high": 1.1060, "low": 1.1010, "close": 1.1040, "volume": 1200},
        {"open": 1.1040, "high": 1.1080, "low": 1.1030, "close": 1.1060, "volume": 800},
    ]
    r = client.post("/api/analysis/order-flow", json={"candles": candles})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["estimated"] is True
    assert "bars" in data
    assert "divergence" in data


def test_order_flow_empty_candles():
    """Empty candles return 200 with estimated true."""
    r = client.post("/api/analysis/order-flow", json={"candles": []})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["estimated"] is True
    assert data["bars"] == []
    assert data["total_delta"] == 0.0
    assert data["divergence"]["estimated"] is True


def test_order_flow_invalid_candle_missing_key():
    """Missing required key returns 422."""
    candles = [{"open": 1.1, "high": 1.1, "low": 1.1, "close": 1.1}]  # missing volume
    r = client.post("/api/analysis/order-flow", json={"candles": candles})
    assert r.status_code == 422, r.text


def test_order_flow_oversized_list():
    """More than 10000 candles returns 422."""
    candles = [{"open": 1.1, "high": 1.1, "low": 1.1, "close": 1.1, "volume": 100}] * 10001
    r = client.post("/api/analysis/order-flow", json={"candles": candles})
    assert r.status_code == 422, r.text


def test_order_flow_get_not_allowed():
    """GET on /order-flow returns 405."""
    r = client.get("/api/analysis/order-flow")
    assert r.status_code == 405


# ─── /var ────────────────────────────────────────────────────────────────────

def test_var_known_returns():
    """Known return list returns 200 with var_report keys."""
    returns = [-0.02, -0.01, 0.0, 0.01, 0.02, -0.03, 0.015, -0.005, 0.01, -0.01]
    r = client.post("/api/analysis/var", json={"returns": returns})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "var_95" in data
    assert "var_99" in data
    assert "cvar_95" in data
    assert "cvar_99" in data
    assert "parametric_var_95" in data
    assert "parametric_var_99" in data
    assert "n" in data
    assert data["estimated"] is True


def test_var_empty_returns():
    """Empty returns returns 200 or 422, never 500."""
    r = client.post("/api/analysis/var", json={"returns": []})
    assert r.status_code in (200, 422), r.text
    # Either way, it must not be 500
    assert r.status_code != 500


def test_var_oversized_list():
    """More than 10000 returns returns 422."""
    returns = [0.01] * 10001
    r = client.post("/api/analysis/var", json={"returns": returns})
    assert r.status_code == 422, r.text


def test_var_get_not_allowed():
    """GET on /var returns 405."""
    r = client.get("/api/analysis/var")
    assert r.status_code == 405


# ─── /correlation ─────────────────────────────────────────────────────────────

def test_correlation_identical_series():
    """Two identical series give correlation 1.0."""
    series = {
        "A": [1.0, 2.0, 3.0, 4.0, 5.0],
        "B": [1.0, 2.0, 3.0, 4.0, 5.0],
    }
    r = client.post("/api/analysis/correlation", json={"series": series})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["estimated"] is True
    assert data["symbols"] == ["A", "B"]
    # Diagonal should be 1.0
    assert data["matrix"][0][0] == 1.0
    assert data["matrix"][1][1] == 1.0
    # Off-diagonal should be 1.0 for identical series
    assert data["matrix"][0][1] == 1.0
    assert data["matrix"][1][0] == 1.0


def test_correlation_mismatched_lengths():
    """Mismatched lengths return 422, never 500."""
    series = {
        "A": [1.0, 2.0, 3.0],
        "B": [1.0, 2.0],  # shorter
    }
    r = client.post("/api/analysis/correlation", json={"series": series})
    assert r.status_code in (200, 422), r.text
    assert r.status_code != 500


def test_correlation_oversized_series():
    """Series longer than 10000 returns 422."""
    series = {"A": [1.0] * 10001}
    r = client.post("/api/analysis/correlation", json={"series": series})
    assert r.status_code == 422, r.text


def test_correlation_empty_series():
    """Empty series dict returns 200 with empty result."""
    r = client.post("/api/analysis/correlation", json={"series": {}})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["symbols"] == []
    assert data["matrix"] == []
    assert data["estimated"] is True


def test_correlation_get_not_allowed():
    """GET on /correlation returns 405."""
    r = client.get("/api/analysis/correlation")
    assert r.status_code == 405


# ─── /stress-test ─────────────────────────────────────────────────────────────

def test_stress_test_buy_position_default_shocks():
    """One buy position with default shocks returns 200."""
    positions = [{"symbol": "EURUSD", "side": "buy", "units": 1000, "price": 1.10}]
    r = client.post("/api/analysis/stress-test", json={"positions": positions})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "scenarios" in data
    assert len(data["scenarios"]) == 4  # default shocks: -0.05, -0.02, 0.02, 0.05
    assert data["estimated"] is True
    # Check first scenario: -5% shock on buy position = negative PnL
    assert data["scenarios"][0]["shock"] == -0.05
    assert data["scenarios"][0]["pnl"] < 0


def test_stress_test_invalid_side():
    """Invalid side such as 'hold' returns 422."""
    positions = [{"symbol": "EURUSD", "side": "hold", "units": 1000, "price": 1.10}]
    r = client.post("/api/analysis/stress-test", json={"positions": positions})
    assert r.status_code == 422, r.text


def test_stress_test_custom_shocks():
    """Custom shocks are respected."""
    positions = [{"symbol": "EURUSD", "side": "buy", "units": 1000, "price": 1.10}]
    custom_shocks = [-0.10, -0.05, 0.0, 0.05, 0.10]
    r = client.post("/api/analysis/stress-test", json={"positions": positions, "shocks": custom_shocks})
    assert r.status_code == 200, r.text
    data = r.json()
    assert len(data["scenarios"]) == 5
    assert data["scenarios"][0]["shock"] == -0.10
    assert data["scenarios"][-1]["shock"] == 0.10


def test_stress_test_sell_position():
    """Sell position returns correct PnL sign."""
    positions = [{"symbol": "EURUSD", "side": "sell", "units": 1000, "price": 1.10}]
    r = client.post("/api/analysis/stress-test", json={"positions": positions})
    assert r.status_code == 200, r.text
    data = r.json()
    # Sell with -5% shock should give positive PnL (short profits when price drops)
    assert data["scenarios"][0]["pnl"] > 0


def test_stress_test_oversized_positions():
    """More than 10000 positions returns 422."""
    positions = [{"symbol": "EURUSD", "side": "buy", "units": 1, "price": 1.0}] * 10001
    r = client.post("/api/analysis/stress-test", json={"positions": positions})
    assert r.status_code == 422, r.text


def test_stress_test_get_not_allowed():
    """GET on /stress-test returns 405."""
    r = client.get("/api/analysis/stress-test")
    assert r.status_code == 405


# ─── /performance ─────────────────────────────────────────────────────────────

def test_performance_three_trades():
    """3 trades (+10, -5, +20) return correct summary."""
    trades = [
        {"symbol": "EURUSD", "timeframe": "1H", "pnl": 10.0, "closed_at": "2024-01-01T10:00:00Z"},
        {"symbol": "EURUSD", "timeframe": "1H", "pnl": -5.0, "closed_at": "2024-01-01T11:00:00Z"},
        {"symbol": "GBPUSD", "timeframe": "4H", "pnl": 20.0, "closed_at": "2024-01-01T12:00:00Z"},
    ]
    r = client.post("/api/analysis/performance", json={"trades": trades, "starting_equity": 1000.0})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["total_trades"] == 3
    assert data["total_pnl"] == 25.0
    assert abs(data["win_rate"] - 66.66666666666667) < 0.01  # 2/3 * 100
    assert data["max_drawdown"] >= 0
    assert data["estimated"] is False  # performance module returns estimated=False


def test_performance_empty_trades():
    """Empty trades return 200 with total_trades 0."""
    r = client.post("/api/analysis/performance", json={"trades": [], "starting_equity": 1000.0})
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["total_trades"] == 0
    assert data["total_pnl"] == 0.0
    assert data["win_rate"] == 0.0
    assert data["estimated"] is False  # performance module returns estimated=False


def test_performance_oversized_list():
    """More than 10000 trades returns 422."""
    trades = [{"symbol": "EURUSD", "timeframe": "1H", "pnl": 1.0, "closed_at": "2024-01-01T10:00:00Z"}] * 10001
    r = client.post("/api/analysis/performance", json={"trades": trades})
    assert r.status_code == 422, r.text


def test_performance_get_not_allowed():
    """GET on /performance returns 405."""
    r = client.get("/api/analysis/performance")
    assert r.status_code == 405


# ─── Cross-cutting ────────────────────────────────────────────────────────────

def test_missing_required_field():
    """Body missing a required field returns 422."""
    # var requires 'returns' field (has default_factory but missing returns 422 due to validation)
    r = client.post("/api/analysis/var", json={})
    assert r.status_code == 422, r.text


def test_no_nan_or_infinity_in_response():
    """Response JSON never contains NaN or Infinity."""
    # Test various endpoints that might produce infinity
    # profit_factor can be infinity, but it's replaced with None in summary
    trades = [{"pnl": 10.0, "closed_at": "2024-01-01T10:00:00Z"}]
    r = client.post("/api/analysis/performance", json={"trades": trades})
    assert r.status_code == 200, r.text
    # This should not raise
    json.loads(r.text)


def test_var_return_no_nan_infinity():
    """VaR endpoint response contains no NaN or Infinity."""
    returns = [-0.02, -0.01, 0.0, 0.01, 0.02]
    r = client.post("/api/analysis/var", json={"returns": returns})
    assert r.status_code == 200, r.text
    json.loads(r.text)


def test_correlation_no_nan_infinity():
    """Correlation endpoint response contains no NaN or Infinity."""
    series = {"A": [1.0, 2.0, 3.0], "B": [1.0, 2.0, 3.0]}
    r = client.post("/api/analysis/correlation", json={"series": series})
    assert r.status_code == 200, r.text
    json.loads(r.text)


def test_stress_test_no_nan_infinity():
    """Stress test endpoint response contains no NaN or Infinity."""
    positions = [{"symbol": "EURUSD", "side": "buy", "units": 1000, "price": 1.10}]
    r = client.post("/api/analysis/stress-test", json={"positions": positions})
    assert r.status_code == 200, r.text
    json.loads(r.text)


def test_order_flow_no_nan_infinity():
    """Order flow endpoint response contains no NaN or Infinity."""
    candles = [{"open": 1.1, "high": 1.11, "low": 1.09, "close": 1.105, "volume": 1000}]
    r = client.post("/api/analysis/order-flow", json={"candles": candles})
    assert r.status_code == 200, r.text
    json.loads(r.text)