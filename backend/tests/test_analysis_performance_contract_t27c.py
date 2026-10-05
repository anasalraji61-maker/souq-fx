"""
T27c contract tests for /api/analysis/performance.

The frontend (src/api/analysis.ts fetchPerformanceAnalysis) POSTs
``{trades, initialBalance}`` with journal-shaped trades and expects the
``PerformanceResult`` shape (equity_curve, by_symbol, by_timeframe, ...).

Legacy ``{trades, starting_equity}`` bodies without ``initialBalance`` must
keep returning the old ``analytics_metrics.summary`` shape.
"""
from __future__ import annotations

import math
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


def _post(trades, initial_balance=10000, **extra):
    body = {"trades": trades, "initialBalance": initial_balance}
    body.update(extra)
    return client.post("/api/analysis/performance", json=body)


def test_three_trades_core_metrics():
    """pnl [100, -50, 200] with initialBalance 10000 -> equity 10250 etc."""
    trades = [
        _trade("2024-01-01", "EURUSD", 100),
        _trade("2024-01-02", "EURUSD", -50),
        _trade("2024-01-03", "GBPUSD", 200),
    ]
    r = _post(trades, 10000)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["initial_balance"] == 10000
    assert data["current_equity"] == 10250
    assert data["total_trades"] == 3
    assert data["winning_trades"] == 2
    assert data["losing_trades"] == 1
    assert data["win_rate"] == 66.7
    assert data["profit_factor"] == 6.0


def test_equity_curve_shape_and_values():
    """equity_curve has 4 entries (0..3) with last equity 10250."""
    trades = [
        _trade("2024-01-01", "EURUSD", 100),
        _trade("2024-01-02", "EURUSD", -50),
        _trade("2024-01-03", "GBPUSD", 200),
    ]
    r = _post(trades, 10000)
    assert r.status_code == 200, r.text
    curve = r.json()["equity_curve"]
    assert len(curve) == 4
    assert curve[0] == {"trade_num": 0, "equity": 10000.0, "pnl": 0, "date": "2024-01-01"}
    assert curve[1] == {"trade_num": 1, "equity": 10100.0, "pnl": 100.0, "date": "2024-01-01"}
    assert curve[2] == {"trade_num": 2, "equity": 10050.0, "pnl": -50.0, "date": "2024-01-02"}
    assert curve[3] == {"trade_num": 3, "equity": 10250.0, "pnl": 200.0, "date": "2024-01-03"}
    assert curve[-1]["equity"] == 10250


def test_max_drawdown():
    """Peak 10100 -> trough 10050: dd_usd 50, dd_pct = 50/10100*100."""
    trades = [
        _trade("2024-01-01", "EURUSD", 100),
        _trade("2024-01-02", "EURUSD", -50),
        _trade("2024-01-03", "GBPUSD", 200),
    ]
    r = _post(trades, 10000)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["max_drawdown_usd"] == 50.0
    # rounded to 2 decimals by the implementation
    assert math.isclose(data["max_drawdown_pct"], round(50 / 10100 * 100, 2), abs_tol=1e-9)


def test_unsorted_trades_coming_back_date_sorted():
    """Trades sent unsorted produce a date-ascending equity curve."""
    trades = [
        _trade("2024-01-03", "EURUSD", -50),
        _trade("2024-01-01", "EURUSD", 100),
        _trade("2024-01-02", "GBPUSD", 200),
    ]
    r = _post(trades, 10000)
    assert r.status_code == 200, r.text
    curve = r.json()["equity_curve"]
    # entry 0 carries the first sorted trade's date
    assert [e["date"] for e in curve] == [
        "2024-01-01", "2024-01-01", "2024-01-02", "2024-01-03",
    ]
    assert [e["equity"] for e in curve] == [10000.0, 10100.0, 10300.0, 10250.0]
    assert [e["trade_num"] for e in curve] == [0, 1, 2, 3]


def test_timeframe_tag_mapping():
    """tags ['4h','x'] map to by_timeframe['4h']; no timeframe tag -> '1h'."""
    trades = [
        _trade("2024-01-01", "EURUSD", 100, tags=["4h", "x"]),
        _trade("2024-01-02", "EURUSD", -50, tags=["news"]),
    ]
    r = _post(trades, 10000)
    assert r.status_code == 200, r.text
    tf = r.json()["by_timeframe"]
    assert set(tf.keys()) == {"4h", "1h"}
    assert tf["4h"] == {"trades": 1, "pnl": 100.0, "win_rate": 100}
    assert tf["1h"] == {"trades": 1, "pnl": -50.0, "win_rate": 0}


def test_by_symbol_win_rate_is_integer():
    """by_symbol win_rate is an integer percent."""
    trades = [
        _trade("2024-01-01", "EURUSD", 100),
        _trade("2024-01-02", "EURUSD", -50),
        _trade("2024-01-03", "GBPUSD", 200),
    ]
    r = _post(trades, 10000)
    assert r.status_code == 200, r.text
    by_symbol = r.json()["by_symbol"]
    assert by_symbol["EURUSD"]["win_rate"] == 50
    assert by_symbol["GBPUSD"]["win_rate"] == 100
    for group in by_symbol.values():
        assert isinstance(group["win_rate"], int)
        assert group["trades"] >= 1
    assert by_symbol["EURUSD"] == {"trades": 2, "pnl": 50.0, "win_rate": 50}
    assert by_symbol["GBPUSD"] == {"trades": 1, "pnl": 200.0, "win_rate": 100}


def test_all_wins_profit_factor_99_9():
    """No gross loss -> profit_factor 99.9."""
    trades = [
        _trade("2024-01-01", "EURUSD", 100),
        _trade("2024-01-02", "EURUSD", 300),
    ]
    r = _post(trades, 10000)
    assert r.status_code == 200, r.text
    assert r.json()["profit_factor"] == 99.9


def test_equal_pnl_sharpe_uses_stdev_one():
    """All pnl equal -> pstdev 0 -> sharpe = mean/1*sqrt(252) rounded 2dp."""
    trades = [_trade(f"2024-01-0{i}", "EURUSD", 100.0) for i in range(1, 4)]
    r = _post(trades, 10000)
    assert r.status_code == 200, r.text
    expected = round(100.0 / 1.0 * math.sqrt(252), 2)
    assert r.json()["sharpe_ratio"] == expected


def test_sharpe_normal_case():
    """Normal sharpe = mean(pnl)/pstdev(pnl)*sqrt(252) rounded to 2dp."""
    pnls = [100.0, -50.0, 200.0]
    trades = [_trade(f"2024-01-0{i}", "EURUSD", p) for i, p in enumerate(pnls, 1)]
    mean = sum(pnls) / len(pnls)
    variance = sum((p - mean) ** 2 for p in pnls) / len(pnls)
    expected = round(mean / math.sqrt(variance) * math.sqrt(252), 2)
    r = _post(trades, 10000)
    assert r.status_code == 200, r.text
    assert r.json()["sharpe_ratio"] == expected


def test_empty_trades_zeroed_result():
    """Empty trades with initialBalance -> zeroed result, 1-entry curve."""
    r = _post([], 10000)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["initial_balance"] == 10000
    assert data["current_equity"] == 10000
    assert data["total_trades"] == 0
    assert data["winning_trades"] == 0
    assert data["losing_trades"] == 0
    assert data["win_rate"] == 0.0
    assert data["max_drawdown_usd"] == 0.0
    assert data["max_drawdown_pct"] == 0.0
    assert data["by_symbol"] == {}
    assert data["by_timeframe"] == {}
    assert data["equity_curve"] == [
        {"trade_num": 0, "equity": 10000.0, "pnl": 0, "date": ""}
    ]


def test_extra_frontend_fields_accepted():
    """Journal fields (emotion, notes, id) must not break validation."""
    trades = [
        _trade("2024-01-01", "EURUSD", 100, notes="funding breakout"),
    ]
    r = _post(trades, 10000)
    assert r.status_code == 200, r.text
    assert r.json()["total_trades"] == 1


def test_missing_symbol_defaults_unknown():
    """Missing symbol groups under UNKNOWN."""
    trades = [{"date": "2024-01-01", "pnl": 100, "tags": []}]
    r = _post(trades, 10000)
    assert r.status_code == 200, r.text
    assert "UNKNOWN" in r.json()["by_symbol"]


def test_legacy_call_without_initial_balance_keeps_old_shape():
    """No initialBalance -> legacy analytics_metrics.summary keys."""
    trades = [
        {"symbol": "EURUSD", "timeframe": "1H", "pnl": 10.0, "closed_at": "2024-01-01T10:00:00Z"},
        {"symbol": "EURUSD", "timeframe": "1H", "pnl": -5.0, "closed_at": "2024-01-01T11:00:00Z"},
        {"symbol": "GBPUSD", "timeframe": "4H", "pnl": 20.0, "closed_at": "2024-01-01T12:00:00Z"},
    ]
    r = client.post(
        "/api/analysis/performance",
        json={"trades": trades, "starting_equity": 1000.0},
    )
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["total_pnl"] == 25.0
    assert "sharpe" in data
    assert data["total_trades"] == 3


def test_missing_pnl_returns_422():
    """A trade without pnl is a validation error."""
    trades = [
        {"id": "a", "date": "2024-01-01", "symbol": "EURUSD", "direction": "buy"},
    ]
    r = client.post("/api/analysis/performance", json={"trades": trades, "initialBalance": 10000})
    assert r.status_code == 422, r.text


def test_pnl_groups_legacy_with_frontend_shaped_trades():
    """/pnl-groups stays legacy and works with frontend-shaped trades."""
    trades = [
        _trade("2024-01-01", "EURUSD", 100, tags=["4h"]),
        _trade("2024-01-02", "GBPUSD", -50, tags=["15m"]),
    ]
    r = client.post("/api/analysis/pnl-groups", json={"trades": trades})
    assert r.status_code == 200, r.text
    data = r.json()
    assert "by_symbol" in data
    assert "by_timeframe" in data
    assert data["by_symbol"]["EURUSD"]["total_pnl"] == 100.0
    assert data["by_symbol"]["GBPUSD"]["total_pnl"] == -50.0
