"""
T27a contract tests for /api/analysis endpoints.

These verify the frontend-facing shapes described in the task:
* /order-flow returns a bare JSON list of bars with the frontend field set when
  the request carries `symbol`/`timeframe` or numeric candle times.
* /var returns confidence_95 / confidence_99 blocks when trades are supplied.
* /correlation returns `symbols` plus a dict-of-dicts `matrix_dict`.

They also re-check the "keep old tests passing" rules: legacy bodies still work
and empty/bad input never yields HTTP 500.
"""
from __future__ import annotations

import math
import pytest
from fastapi.testclient import TestClient

import main

client = TestClient(main.app, raise_server_exceptions=False)

EST_LABEL = "تقديري"

BAR_KEYS = {
    "time", "close", "delta", "cumulative_delta",
    "buy_volume", "sell_volume", "imbalance_pct", "label",
}

CANDLES = [
    {"time": 1700000000.0, "open": 1.1000, "high": 1.1050, "low": 1.0980,
     "close": 1.1020, "volume": 1000},
    {"time": 1700000060.0, "open": 1.1020, "high": 1.1060, "low": 1.1010,
     "close": 1.1040, "volume": 1200},
    {"time": 1700000120.0, "open": 1.1040, "high": 1.1080, "low": 1.1030,
     "close": 1.1060, "volume": 800},
]


# ─── /order-flow ─────────────────────────────────────────────────────────────

def test_order_flow_numeric_times_returns_list():
    """Frontend call (numeric times) returns 200 and a JSON list, not a dict."""
    r = client.post("/api/analysis/order-flow", json={"candles": CANDLES})
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == len(CANDLES)


def test_order_flow_bar_keys_and_label():
    """Each returned bar has the frontend key set and label == تقديري."""
    r = client.post(
        "/api/analysis/order-flow",
        json={"candles": CANDLES, "symbol": "EURUSD", "timeframe": "1m"},
    )
    assert r.status_code == 200, r.text
    bars = r.json()
    assert isinstance(bars, list) and bars
    assert set(bars[0].keys()) == BAR_KEYS
    assert all(b["label"] == EST_LABEL for b in bars)


def test_order_flow_list_length_matches_candles():
    """List length equals the number of input candles."""
    r = client.post("/api/analysis/order-flow", json={"candles": CANDLES})
    assert r.status_code == 200, r.text
    assert len(r.json()) == len(CANDLES)


def test_order_flow_empty_candles_no_500():
    """Empty candles with frontend fields returns 200 with an empty list."""
    r = client.post(
        "/api/analysis/order-flow",
        json={"candles": [], "symbol": "EURUSD", "timeframe": "1m"},
    )
    assert r.status_code == 200, r.text
    assert r.json() == []


def test_order_flow_legacy_body_still_dict():
    """Without symbol/timeframe/numeric-time, the legacy dict shape is returned."""
    legacy = [
        {"open": 1.10, "high": 1.11, "low": 1.09, "close": 1.105, "volume": 1000},
    ]
    r = client.post("/api/analysis/order-flow", json={"candles": legacy})
    assert r.status_code == 200, r.text
    data = r.json()
    assert isinstance(data, dict)
    assert data["estimated"] is True
    assert "bars" in data
    assert "divergence" in data


# ─── /var ────────────────────────────────────────────────────────────────────

def _trades(n: int = 10):
    base = -0.02
    return [{"symbol": "EURUSD", "timeframe": "1H", "pnl": base, "closed_at": ""} for _ in range(n)]


def test_var_trades_returns_confidence_blocks():
    """10 trades returns confidence_95/99 with var_amount ≈ var_pct/100*equity."""
    trades = _trades(10)
    equity = 10000.0
    r = client.post("/api/analysis/var", json={"trades": trades, "equity": equity})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "confidence_95" in data
    assert "confidence_99" in data
    c95 = data["confidence_95"]
    assert math.isclose(c95["var_amount"], c95["var_pct"] / 100 * equity, rel_tol=1e-6)
    assert math.isclose(c95["cvar_amount"], c95["cvar_pct"] / 100 * equity, rel_tol=1e-6)
    c99 = data["confidence_99"]
    assert math.isclose(c99["var_amount"], c99["var_pct"] / 100 * equity, rel_tol=1e-6)


def test_var_sample_size_equals_trades():
    """sample_size equals the number of trades."""
    trades = _trades(10)
    r = client.post("/api/analysis/var", json={"trades": trades, "equity": 5000})
    assert r.status_code == 200, r.text
    assert r.json()["sample_size"] == len(trades)


def test_var_old_returns_body_still_works():
    """Legacy `returns` body still works and keeps old keys."""
    r = client.post("/api/analysis/var", json={"returns": [-0.02, 0.01, -0.01, 0.005]})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "var_95" in data and "var_99" in data and "cvar_95" in data
    assert "confidence_95" in data and "confidence_99" in data
    assert data["sample_size"] == 4


def test_var_empty_trades_no_500():
    """Empty trades list returns 200 or 422, never 500."""
    r = client.post("/api/analysis/var", json={"trades": [], "equity": 10000})
    assert r.status_code in (200, 422), r.text
    assert r.status_code != 500


# ─── /correlation ────────────────────────────────────────────────────────────

def test_correlation_two_series_keys():
    """2 series returns symbols and matrix_dict; matrix[A][A]==1.0."""
    series = {"A": [1.0, 2.0, 3.0, 4.0, 5.0], "B": [2.0, 4.0, 6.0, 8.0, 10.0]}
    r = client.post("/api/analysis/correlation", json={"series": series})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "symbols" in data
    assert data["symbols"] == ["A", "B"]
    assert "matrix_dict" in data
    md = data["matrix_dict"]
    assert md["A"]["A"] == 1.0
    assert md["B"]["B"] == 1.0


def test_correlation_perfect_is_one_and_symmetric():
    """Perfectly correlated series: matrix[A][B]≈1, symmetric, diagonal 1."""
    series = {"A": [1.0, 2.0, 3.0, 4.0, 5.0], "B": [1.0, 2.0, 3.0, 4.0, 5.0]}
    r = client.post("/api/analysis/correlation", json={"series": series})
    assert r.status_code == 200, r.text
    md = r.json()["matrix_dict"]
    assert math.isclose(md["A"]["B"], 1.0, abs_tol=1e-6)
    assert math.isclose(md["B"]["A"], md["A"]["B"], abs_tol=1e-9)
    assert md["A"]["A"] == 1.0
    assert md["B"]["B"] == 1.0
