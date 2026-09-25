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


def _t(pnl: float) -> dict:
    return {"pnl_pct": pnl, "entry": 1.0}


def test_total_return_is_compounded_and_matches_final_equity():
    """كان مجموع النسب: +50% ثم −50% ⇒ «العائد 0%» بجانب «رأس المال 75» باللوحة نفسها."""
    stats, curve = backtest._stats([_t(50.0), _t(-50.0)])
    assert stats["final_equity"] == 75.0
    assert stats["total_return_pct"] == -25.0
    assert curve[-1]["equity"] == 75.0


def test_breakeven_backtest_trade_is_not_a_loss():
    """كدفتر الصفقات: `pnl <= 0` كان يعدّ التعادل خسارةً فيُسقط نسبة الفوز ويخفّف متوسّط الخسارة."""
    stats, _ = backtest._stats([_t(2.0), _t(0.0), _t(-1.0)])
    assert stats["trade_count"] == 3
    assert stats["breakeven_count"] == 1
    assert stats["win_rate"] == 50.0
    assert stats["avg_loss_pct"] == -1.0


def test_all_breakeven_or_no_trades_have_no_win_rate():
    """backend-r7: بلا صفقة حاسمة لا نسبة فوز — 0 تُقرأ «خسرت كل صفقاتها»."""
    st = backtest._stats([_t(0.0), _t(0.0)])[0]
    assert st["win_rate"] is None
    assert st["breakeven_count"] == 2
    assert backtest._stats([])[0] == {
        "trade_count": 0, "win_rate": None, "breakeven_count": 0, "total_return_pct": 0.0,
        "final_equity": 100.0, "avg_win_pct": 0, "avg_loss_pct": 0, "max_drawdown_pct": 0.0,
        "open_pnl_pct": None,
    }


def test_run_backtest_reports_the_compounded_return():
    res = backtest.run_backtest(_candles(), "ma_cross", spread=0.0001)
    st = res["stats"]
    assert st["trade_count"] > 0
    assert st["total_return_pct"] == round(st["final_equity"] - 100, 2)


def test_position_open_at_the_last_candle_is_not_a_finished_trade():
    """كان المركز المفتوح يُقوَّم بآخر إغلاق ويدخل نسبة الفوز والعائد كأنه أُغلق (ربح غير محقَّق)."""
    st = backtest._stats([_t(1.0), _t(-0.5), {**_t(3.0), "open": True}])[0]
    assert st["trade_count"] == 2
    assert st["win_rate"] == 50.0
    assert st["final_equity"] == round(100 * 1.01 * 0.995, 2)
    assert st["open_pnl_pct"] == 3.0


def test_run_backtest_keeps_the_open_position_out_of_the_stats():
    res = backtest.run_backtest(_candles(), "ma_cross", spread=0.0001)
    open_trades = [t for t in res["trades"] if t.get("open")]
    assert len(open_trades) == 1, "المسار الجيبي ينتهي بمركز مفتوح دائماً (ma_cross يقلب ولا يُسطّح)"
    closed = [t for t in res["trades"] if not t.get("open")]
    assert res["stats"]["trade_count"] == len(closed)
    assert res["stats"]["open_pnl_pct"] == open_trades[0]["pnl_pct"]
    assert len(res["equity_curve"]) == len(closed) + 1
