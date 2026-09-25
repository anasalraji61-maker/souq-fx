import math

import backtest


def _candles(n: int = 200, base: float = 1.1):
    out = []
    for i in range(n):
        c = base * (1 + 0.004 * math.sin(i / 6))
        out.append({"time": 1_700_000_000 + i * 900, "open": c, "high": c * 1.0005, "low": c * 0.9995, "close": c})
    return out


def test_typical_spread():
    assert backtest.typical_spread("EURUSD") == (1.0, 0.0001)
    assert backtest.typical_spread("usdjpy") == (1.0, 0.01)
    assert backtest.typical_spread("GBPUSD") == (1.5, 0.0001)
    assert backtest.typical_spread("EURJPY") == (2.5, 0.01)
    assert backtest.typical_spread("XAUUSD") == (3.0, 0.1)
    assert backtest.typical_spread("USDTRY") == (15.0, 0.0001)
    assert backtest.typical_spread("DXY") is None
    assert backtest.typical_spread("BTCUSD") is None


def test_spread_reduces_every_trade():
    c = _candles()
    free = backtest.run_backtest(c, "ma_cross")
    cost = backtest.run_backtest(c, "ma_cross", spread=0.0001)
    assert free["stats"]["trade_count"] == cost["stats"]["trade_count"] > 0
    for a, b in zip(free["trades"], cost["trades"]):
        assert b["pnl_pct"] < a["pnl_pct"]
        assert abs((a["pnl_pct"] - b["pnl_pct"]) - 0.0001 / a["entry"] * 100) < 2e-3
    assert cost["stats"]["total_return_pct"] < free["stats"]["total_return_pct"]


def test_broker_aliases_and_oil_get_a_spread_estimate():
    # كانت None ⇒ الاختبار الخلفي على الذهب/النفط بلا أي تكلفة (QA30)
    assert backtest.typical_spread("GOLD") == backtest.typical_spread("XAUUSD")
    assert backtest.typical_spread("silver") == backtest.typical_spread("XAGUSD")
    for s in ("USOIL", "UKOIL", "XTIUSD", "XBR/USD"):
        assert backtest.typical_spread(s) == (4.0, 0.01), s
