"""
T27e contract tests for /api/analysis/pnl-groups.

When the body carries ``initialBalance``, /pnl-groups must return the
frontend-shaped groups: each by_symbol / by_timeframe entry is
``{trades, pnl, win_rate}``, identical to the values /performance returns.
Legacy bodies (no ``initialBalance``) keep the old ``total_pnl`` shape.
"""
from __future__ import annotations

from fastapi.testclient import TestClient

import main

client = TestClient(main.app, raise_server_exceptions=False)


def _trade(date, symbol, pnl, tags=None, **extra):
    t = {
        "id": extra.pop("id", "t"),
        "date": date,
        "symbol": symbol,
        "direction": extra.pop("direction", "buy"),
        "entry_price": extra.pop("entry_price", 1.1),
        "exit_price": extra.pop("exit_price", 1.11),
        "lots": extra.pop("lots", 0.1),
        "pnl": pnl,
        "tags": tags or [],
        "emotion": "calm",
    }
    t.update(extra)
    return t


def _body(trades, initial_balance=10000):
    return {"trades": trades, "initialBalance": initial_balance}


def _post(trades, initial_balance=10000):
    return client.post("/api/analysis/pnl-groups", json=_body(trades, initial_balance))


def _post_performance(trades, initial_balance=10000):
    return client.post(
        "/api/analysis/performance", json=_body(trades, initial_balance)
    )


def test_three_trades_frontend_shaped_groups():
    """2x T27EAAA (+100, -40), 1x T27EBBB (+50) -> trades/pnl correct."""
    trades = [
        _trade("2024-01-01", "T27EAAA", 100),
        _trade("2024-01-02", "T27EAAA", -40),
        _trade("2024-01-03", "T27EBBB", 50),
    ]
    r = _post(trades, 10000)
    assert r.status_code == 200, r.text
    by_symbol = r.json()["by_symbol"]
    assert by_symbol["T27EAAA"]["trades"] == 2
    assert by_symbol["T27EAAA"]["pnl"] == 60.0
    assert by_symbol["T27EBBB"]["trades"] == 1
    assert by_symbol["T27EBBB"]["pnl"] == 50.0
    # win_rate scale must match /performance
    perf = _post_performance(trades, 10000)
    assert perf.status_code == 200, perf.text
    assert by_symbol["T27EAAA"]["win_rate"] == perf.json()["by_symbol"]["T27EAAA"]["win_rate"]


def test_by_symbol_entries_have_exact_keys():
    """Each by_symbol entry has exactly trades, pnl and win_rate."""
    trades = [
        _trade("2024-01-01", "T27EAAA", 100),
        _trade("2024-01-02", "T27EAAA", -40),
        _trade("2024-01-03", "T27EBBB", 50),
    ]
    r = _post(trades, 10000)
    assert r.status_code == 200, r.text
    for group in r.json()["by_symbol"].values():
        assert set(group.keys()) == {"trades", "pnl", "win_rate"}


def test_by_timeframe_matches_performance():
    """by_timeframe present and both endpoints agree on both groupings."""
    trades = [
        _trade("2024-01-01", "T27EAAA", 100, tags=["4h"]),
        _trade("2024-01-02", "T27EAAA", -40),
        _trade("2024-01-03", "T27EBBB", 50, tags=["15m"]),
    ]
    r = _post(trades, 10000)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "by_timeframe" in data
    perf = _post_performance(trades, 10000)
    assert perf.status_code == 200, perf.text
    assert data["by_symbol"] == perf.json()["by_symbol"]
    assert data["by_timeframe"] == perf.json()["by_timeframe"]
    # trades without a timeframe tag land in the same '1h' bucket as /performance
    assert data["by_timeframe"]["1h"]["trades"] == 1
    assert data["by_timeframe"]["1h"]["pnl"] == -40.0


def test_initial_balance_empty_trades_returns_empty_groups():
    """initialBalance with trades: [] -> 200 with empty groupings."""
    r = _post([], 10000)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["by_symbol"] == {}
    assert data["by_timeframe"] == {}


def test_legacy_body_keeps_total_pnl_shape():
    """No initialBalance -> legacy entries still contain total_pnl."""
    trades = [
        {"symbol": "T27EAAA", "timeframe": "1H", "pnl": 10.0, "closed_at": "2024-01-01T10:00:00Z"},
        {"symbol": "T27EAAA", "timeframe": "1H", "pnl": -3.0, "closed_at": "2024-01-01T11:00:00Z"},
        {"symbol": "T27EBBB", "timeframe": "4H", "pnl": 20.0, "closed_at": "2024-01-01T12:00:00Z"},
    ]
    r = client.post(
        "/api/analysis/pnl-groups",
        json={"trades": trades, "starting_equity": 0},
    )
    assert r.status_code == 200, r.text
    by_symbol = r.json()["by_symbol"]
    assert "total_pnl" in by_symbol["T27EAAA"]
    assert by_symbol["T27EAAA"]["total_pnl"] == 7.0
    assert "total_pnl" in by_symbol["T27EBBB"]


def test_legacy_empty_trades_returns_empty_groups():
    """Legacy empty trades -> 200 with empty groupings."""
    r = client.post(
        "/api/analysis/pnl-groups",
        json={"trades": [], "starting_equity": 0},
    )
    assert r.status_code == 200, r.text
    assert r.json() == {"by_symbol": {}, "by_timeframe": {}}


def test_missing_pnl_returns_422():
    """A trade without pnl is a validation error."""
    trades = [
        {"id": "a", "date": "2024-01-01", "symbol": "T27EAAA", "direction": "buy"},
    ]
    r = client.post("/api/analysis/pnl-groups", json=_body(trades, 10000))
    assert r.status_code == 422, r.text
