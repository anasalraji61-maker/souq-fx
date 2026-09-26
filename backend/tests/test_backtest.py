import math
import pytest

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
    # ناشئة/مجهول: لا تقدير (كان 15×0.0001 ثابتاً = 0.004% على USDTRY و0.00015% على البلاتين)
    for s in ("USDTRY", "USDHUF", "XPTUSD", "USDZAR", "EURPLN", "USD/HUF"):
        assert backtest.typical_spread(s) is None, s
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


def test_oil_gets_a_spread_estimate():
    # كانت None ⇒ الاختبار الخلفي على النفط بلا أي تكلفة (QA30)
    for s in ("USOIL", "UKOIL", "XBR/USD", "WTI/USD", " ukoil "):
        assert backtest.typical_spread(s) == (4.0, 0.01), s


@pytest.mark.parametrize("sym", ["GOLD", "silver", "WTI", "BRENT", "XTIUSD", "WTIUSD", "XBRUSD"])
def test_broker_alias_gets_no_spread_of_another_instrument(sym):
    """الشموع تُطلب بالاسم العاري («WTI» = سهم W&T Offshore) ⇒ سبريد النفط/الذهب عليها تكلفة مختلَقة."""
    from twelve_data import td_symbol
    assert td_symbol(sym) == sym.upper()  # فعلاً غير مُسنَد لسلسلة معدن/نفط
    assert backtest.typical_spread(sym) is None


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
        "final_equity": 100.0, "avg_win_pct": None, "avg_loss_pct": None, "max_drawdown_pct": 0.0,
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


def test_no_winners_means_no_average_win():
    """كان 0 ⇒ اللوحة «متوسّط الربح 0%» لاستراتيجية لم تربح صفقة واحدة."""
    st = backtest._stats([_t(-1.0), _t(-3.0)])[0]
    assert st["avg_win_pct"] is None and st["avg_loss_pct"] == -2.0
    st = backtest._stats([_t(2.0)])[0]
    assert st["avg_win_pct"] == 2.0 and st["avg_loss_pct"] is None


def test_closed_candles_drops_only_an_unfinished_last_bar():
    cs = [{"time": 0}, {"time": 900}, {"time": 1800}]
    assert backtest.closed_candles(cs, 900, 2000) == cs[:2]   # الأخيرة تنتهي 2700
    assert backtest.closed_candles(cs, 900, 2700) == cs       # انتهت بالضبط
    assert backtest.closed_candles([], 900, 0) == []


def test_max_drawdown_measures_from_the_peak_inside_a_trade():
    # صعدت +10% (إغلاق شمعة) ثم أُغلقت +1% بلا نزول تحت الدخول: كانت «أقصى هبوط 0%»
    t = {"pnl_pct": 1.0, "mae_pct": 0.0, "entry": 1.0, "_path": [(0.0, 5.0), (4.0, 10.0), (1.0, 1.0)]}
    st = backtest._stats([t])[0]
    assert st["max_drawdown_pct"] == round((110 - 101) / 110 * 100, 2)  # 8.18
    assert st["total_return_pct"] == 1.0


def test_max_drawdown_includes_the_open_position():
    # صفقتان رابحتان مغلقتان ثم مركز مفتوح −20%: كانت «أقصى هبوط 0%»
    closed = [_t(1.0), _t(1.0)]
    open_t = {**_t(-20.0), "open": True, "mae_pct": -20.0}
    st = backtest._stats(closed + [open_t])[0]
    assert st["max_drawdown_pct"] == 20.0
    assert st["total_return_pct"] == round(101 * 1.01 - 100, 2)  # المفتوح خارج العائد كما كان
    assert st["open_pnl_pct"] == -20.0


def test_run_backtest_drawdown_is_bar_by_bar_and_path_is_not_returned():
    c = _candles()
    res = backtest.run_backtest(c, "ma_cross", spread=0.0001)
    assert all("_path" not in t for t in res["trades"])
    # على المنحنى المقوَّم شمعةً شمعة ≥ القاع/الإغلاق وحدهما
    trades = [{k: v for k, v in t.items()} for t in res["trades"]]
    assert res["stats"]["max_drawdown_pct"] >= backtest._stats(trades)[0]["max_drawdown_pct"]


def test_bb_bounce_same_side_touch_does_not_block_the_mid_band_exit():
    """شمعة بذيل يلمس السفلي وتُغلق فوق الوسط والمركز شراءٌ أصلاً: كانت تُقرأ «شراء» فيُتخطّى الخروج ⇒
    ربح +0.33% عند الوسط يُعرض صفقةً مفتوحة بـ−0.97% (وعدد الصفقات 0)."""
    def bar(i, o, h, lo, c):
        return {"time": 1_700_000_000 + i * 900, "open": o, "high": h, "low": lo, "close": c}

    def calm(i):
        x = 1.0002 if i % 2 else 0.9998
        return bar(i, x, x + 1e-5, x - 1e-5, x)

    c = [calm(i) for i in range(40)]
    c += [bar(40, 0.9998, 0.9998, 0.990, 0.9997),  # يلمس السفلي ويُغلق فوقه ⇒ شراء
          bar(41, 0.9997, 0.9998, 0.9990, 0.9994),
          bar(42, 0.9994, 1.0035, 0.980, 1.0030),  # يلمس السفلي مجدداً ويُغلق فوق الوسط ⇒ خروج
          bar(43, 1.003, 1.003, 0.9895, 0.9900)]
    c += [bar(44 + k, 0.99, 0.99, 0.99, 0.99) for k in range(3)]
    res = backtest.run_backtest(c, "bb_bounce")
    assert [t for t in res["trades"] if t.get("open")] == []
    (t,) = res["trades"]
    assert t["side"] == "long" and t["entry"] == 0.9997
    assert t["exit"] == 1.0030 and t["exit_time"] == c[42]["time"]
    assert t["pnl_pct"] == 0.33
    assert res["stats"]["trade_count"] == 1 and res["stats"]["open_pnl_pct"] is None


def test_flat_short_trade_is_zero_not_negative_zero():
    """بيع خرج بسعر دخوله: كان `pnl_pct` ‏−0.0 فيعرضه العميل «−0.00%»."""
    assert str(backtest._round(-0.0, 3)) == "0.0"
    assert str(backtest._round(-0.0004, 3)) == "0.0"
    assert backtest._round(-0.0006, 3) == -0.001


def test_closed_candles_keeps_completed_week_over_the_weekend():
    """QA79: شمعة W مؤرّخة الاثنين كانت «تنتهي» الاثنين التالي ⇒ السبت يُسقَط الأسبوع المكتمل كأنه جارٍ.
    الآن النهاية إغلاق الجمعة 17:00 نيويورك (كالإشارات)؛ الكريبتو يتداول بالعطلة فيبقى أسبوعه جارياً."""
    from datetime import datetime, timezone

    week = 7 * 86400
    monday = datetime(2026, 9, 14, tzinfo=timezone.utc).timestamp()
    saturday = datetime(2026, 9, 19, 12, tzinfo=timezone.utc).timestamp()
    thursday = datetime(2026, 9, 17, 12, tzinfo=timezone.utc).timestamp()
    cs = [{"time": monday - week}, {"time": monday}]
    assert backtest.closed_candles(cs, week, saturday, "EURUSD") == cs
    assert backtest.closed_candles(cs, week, thursday, "EURUSD") == cs[:1]
    assert backtest.closed_candles(cs, week, saturday, "BTCUSD") == cs[:1]


def test_a_fast_period_longer_than_the_series_is_not_enough_candles_not_zero_trades():
    """سريع 178 على 179 شمعة لا يعطي قيمتين للتقاطع: كان «0 صفقات، تراجع 0%» كأن الاستراتيجية
    لا تُشير؛ والفترتان مقلوبتين (10/178) كانتا «شموع غير كافية» بصدق."""
    out = backtest.run_backtest(_candles(179), "ma_cross", fast=178, slow=10)
    assert out.get("error") == "not enough candles"
    assert backtest.run_backtest(_candles(179), "ma_cross", fast=10, slow=178).get("error") == "not enough candles"


@pytest.mark.parametrize("sym", ["XAUJPY", "XAUCHF", "XAUEUR", "XAGJPY", "JPYUSD", "JPYEUR", "JPYGBP"])
def test_no_usd_spread_for_non_usd_metals_or_jpy_base(sym):
    """XAUJPY ≈ 520000 أخذ 0.30 «ين» (تكلفة ~0) وJPYUSD ≈ 0.0067 أخذ 2.5×0.0001 (3.7% لكل صفقة) — كلاهما
    موسوم `costs_included: true`. بلا تقدير صادق ⇒ None («قبل التكاليف»)."""
    assert backtest.typical_spread(sym) is None


def test_usd_metals_keep_their_spread():
    assert backtest.typical_spread("XAUUSD") == (3.0, 0.1)
    assert backtest.typical_spread("XAG/USD") == (3.0, 0.01)
    assert backtest.typical_spread("USDJPY") == (1.0, 0.01)


def test_a_loss_over_100_percent_wipes_the_account_to_zero_not_below():
    """كان 100 ⇒ ‎-50 ⇒ ‎-60: رصيد سالب، ثم صفقة +20% تُنزله أكثر، وأقصى هبوط فوق 100%."""
    stats, curve = backtest._stats([_t(-150.0), _t(20.0)])
    assert [p["equity"] for p in curve] == [100.0, 0.0, 0.0]
    assert stats["final_equity"] == 0.0 and stats["total_return_pct"] == -100.0
    assert stats["max_drawdown_pct"] == 100.0


def test_slow_ma_period_does_not_shift_non_ma_strategies():
    """كان `start_i = max(slow, 26) + 1` لكل استراتيجية ⇒ slow=150 يُسقط أول 150 شمعة من اختبار RSI."""
    cs = _candles()
    for strat in ("rsi_reversal", "macd_cross", "bb_bounce"):
        a = backtest.run_backtest(cs, strat, slow=21)
        b = backtest.run_backtest(cs, strat, slow=150)
        assert a["trades"] == b["trades"] and a["stats"] == b["stats"], strat


def test_ma_cross_trades_the_first_cross_when_slow_is_long():
    # fast=5/slow=30: أول قيمتين للبطيء عند الشمعتين 29 و30 ⇒ التقاطع الصاعد عند 30 أول صفقة (كان يُتخطّى)
    closes = [1.10] * 29 + [1.09] + [1.12] * 41 + [1.08] * 40 + [1.13] * 40
    candles = [{"time": 1_700_000_000 + i * 900, "open": x, "high": x + 0.0005, "low": x - 0.0005, "close": x}
               for i, x in enumerate(closes)]
    trades = backtest.run_backtest(candles, "ma_cross", 5, 30)["trades"]
    assert [(t["side"], (t["entry_time"] - 1_700_000_000) // 900) for t in trades] == [
        ("long", 30), ("short", 71), ("long", 111)]


def _series(closes):
    return [{"time": 1_700_000_000 + i * 900, "open": x, "high": x + 0.0005, "low": x - 0.0005, "close": x}
            for i, x in enumerate(closes)]


def test_signals_before_bar_27_are_traded():
    """r64: `start_i` كان 27 لكل استراتيجية ⇒ تشبّع RSI على الشمعات 15–21 (ثم صعود 3%) = 0 صفقات، وتقاطع
    5/10 عند الشمعة 25 يُسقط. كل إشارة تفحص جاهزية مؤشّرها بنفسها."""
    closes = [1.10 - 0.004 * i for i in range(22)] + [1.012 + 0.0015 * i for i in range(60)] + [1.10] * 40
    trades = backtest.run_backtest(_series(closes), "rsi_reversal")["trades"]
    first = (trades[0]["entry_time"] - 1_700_000_000) // 900
    assert trades[0]["side"] == "long" and 14 <= first < 22, trades[0]
    closes = [1.10 + 0.001 * i for i in range(20)] + [1.12 - 0.002 * i for i in range(40)] + [1.04] * 60
    trades = backtest.run_backtest(_series(closes), "ma_cross", 5, 10)["trades"]
    assert trades and trades[0]["side"] == "short"
    assert (trades[0]["entry_time"] - 1_700_000_000) // 900 < 27


def test_slow_period_does_not_block_non_ma_strategies_on_short_series():
    cs = _candles(179)
    assert "error" not in backtest.run_backtest(cs, "rsi_reversal", slow=176)
    assert backtest.run_backtest(cs, "ma_cross", slow=176)["error"] == "not enough candles"
