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


def test_bb_bounce_mid_band_exit_only_closes_the_trade():
    """QA55 (e): the mid-band exit used to fire the opposite signal, so the stop-and-reverse engine
    opened a short at the middle band without the upper band ever being touched."""
    c = _candles(300)
    closes = [x["close"] for x in c]
    res = backtest.run_backtest(c, "bb_bounce")
    assert res["trades"]
    by_time = {x["time"]: i for i, x in enumerate(c)}
    for t in res["trades"]:
        i = by_time[t["entry_time"]]
        w = closes[i - 19 : i + 1]
        mean = sum(w) / 20
        std = (sum((v - mean) ** 2 for v in w) / 20) ** 0.5
        if t["side"] == "short":
            assert c[i]["high"] >= mean + 2 * std, t
        else:
            assert c[i]["low"] <= mean - 2 * std, t


def test_max_drawdown_counts_the_trough_inside_each_trade():
    """كان الهبوط يُقاس على الإغلاقات وحدها: صفقات نزلت 8% ثم أُغلقت رابحة ⇒ «أقصى هبوط 0%»."""
    trades = [{"pnl_pct": 1.0, "mae_pct": -8.0, "entry": 1.0} for _ in range(5)]
    st = backtest._stats(trades)[0]
    assert st["max_drawdown_pct"] == 8.0
    # الثانية تنزل 8% من قمّة 101 (بعد الأولى)
    st = backtest._stats([{"pnl_pct": 1.0, "mae_pct": 0.0, "entry": 1.0},
                          {"pnl_pct": 1.0, "mae_pct": -8.0, "entry": 1.0}])[0]
    assert st["max_drawdown_pct"] == 8.0
    # بلا `mae_pct` = الإغلاقات وحدها كما كان
    assert backtest._stats([_t(10.0), _t(-10.0)])[0]["max_drawdown_pct"] == 10.0


def test_run_backtest_trade_mae_uses_lows_between_entry_and_exit():
    c = _candles()
    res = backtest.run_backtest(c, "ma_cross")
    idx = {x["time"]: k for k, x in enumerate(c)}
    for t in res["trades"]:
        assert t["mae_pct"] <= t["pnl_pct"]
        span = c[idx[t["entry_time"]] + 1: idx[t["exit_time"]] + 1]
        if t["side"] == "long":
            worst = min(x["low"] for x in span)
            exp = (worst - t["entry"]) / t["entry"] * 100
        else:
            worst = max(x["high"] for x in span)
            exp = (t["entry"] - worst) / t["entry"] * 100
        assert abs(t["mae_pct"] - round(min(exp, t["pnl_pct"]), 3)) < 1e-9
    assert res["stats"]["trade_count"] <= 40  # كل الصفقات بالردّ ⇒ المقارنة التالية على نفس المجموعة
    # هبوط داخل الصفقات ≥ هبوط الإغلاقات وحدها
    closes_only = backtest._stats([{k: v for k, v in t.items() if k != "mae_pct"} for t in res["trades"]
                                   if not t.get("open")])[0]["max_drawdown_pct"]
    assert res["stats"]["max_drawdown_pct"] > closes_only


def test_spread_also_deepens_the_trade_trough():
    c = _candles()
    free = backtest.run_backtest(c, "ma_cross")["trades"]
    cost = backtest.run_backtest(c, "ma_cross", spread=0.0001)["trades"]
    for a, b in zip(free, cost):
        assert abs((a["mae_pct"] - b["mae_pct"]) - 0.0001 / a["entry"] * 100) < 2e-3
