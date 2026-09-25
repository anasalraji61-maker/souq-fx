"""Simple strategy backtest on historical candles."""
from __future__ import annotations

from typing import Any, Literal

import indicators as ind

StrategyId = Literal["ma_cross", "rsi_reversal", "macd_cross", "bb_bounce"]

_MAJORS = {"EUR", "GBP", "AUD", "NZD", "USD", "CAD", "CHF", "JPY"}
_TIGHTEST = {"EURUSD", "USDJPY"}
_MAJOR_USD = {"GBPUSD", "AUDUSD", "NZDUSD", "USDCAD", "USDCHF"}
_ALIASES = {"GOLD": "XAUUSD", "SILVER": "XAGUSD"}
_OIL = {"USOIL", "UKOIL", "WTI", "BRENT", "XTIUSD", "XBRUSD", "WTIUSD"}


def typical_spread(symbol: str) -> tuple[float, float] | None:
    """سبريد تقديري لحساب تجزئة عادي: (عدد الـpip، حجم الـpip). None = ليس زوج فوركس/معدن (DXY مؤشر لا يُتداول).

    تقدير محافظ لا سعر وسيط بعينه — الغرض ألا يُعرض عائد استراتيجية تنقلب كل بضع شموع بلا أي تكلفة،
    فتبدو رابحة على 15m وهي خاسرة فعلياً بعد السبريد.
    """
    s = "".join(ch for ch in symbol.upper() if ch.isalpha())
    # أسماء الوسطاء للمعادن والنفط (كانت None ⇒ الاختبار الخلفي بلا أي تكلفة على الذهب والنفط).
    s = _ALIASES.get(s, s)
    if s in _OIL:
        return (4.0, 0.01)  # ~4 سنت للبرميل بحساب تجزئة عادي
    if len(s) != 6:
        return None
    base, quote = s[:3], s[3:]
    if base == "XAU":
        return (3.0, 0.1)
    if base == "XAG":
        return (3.0, 0.01)
    if not (base.isalpha() and quote.isalpha()) or base == quote:
        return None
    pip = 0.01 if quote == "JPY" else 0.0001
    if s in _TIGHTEST:
        return (1.0, pip)
    if s in _MAJOR_USD:
        return (1.5, pip)
    if base in _MAJORS and quote in _MAJORS:
        return (2.5, pip)
    if base in {"BTC", "ETH", "XRP", "SOL", "LTC"} or quote in {"BTC", "ETH"}:
        return None
    return (15.0, pip)  # عملة ناشئة (TRY/ZAR/MXN…): سبريد واسع


def _stats(trades: list[dict[str, Any]]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """إحصاء الصفقات ومنحنى رأس المال (يبدأ 100 ويتراكب).

    - `total_return_pct` = العائد **المركّب** (`final_equity − 100`). كان مجموع نسب الصفقات، واللوحة تعرضه
      بجانب `final_equity`: +50% ثم −50% ⇒ «العائد 0%» بجانب «رأس المال 75» — رقمان متناقضان.
    - **التعادل ليس خسارة** (كدفتر الصفقات، `db.trade_stats`): `win_rate` = رابحة ÷ (رابحة + خاسرة)،
      والتعادل يُعدّ وحده `breakeven_count` ويبقى ضمن `trade_count`، ولا يدخل `avg_loss_pct`.
    - **بلا صفقة حاسمة `win_rate` = None** (لا صفقات، أو كلّها تعادل): 0 كانت تُعرض «نسبة نجاح 0%» = «خسرت
      الاستراتيجية كل صفقاتها» (backend-r7، كالدفتر `2d0fb58`). `BacktestPanel` يعرض «—».
    - **المركز المفتوح بآخر شمعة ليس صفقة منتهية**: كان يُقوَّم بآخر إغلاق ويدخل نسبة الفوز والعائد ورأس
      المال كأنه أُغلق — ربح/خسارة غير محقّقة بشكل نتيجة. الآن الإحصاء على المغلقة وحدها، والمفتوح
      بـ`open_pnl_pct` (None إن لا مركز) كـ«الربح المفتوح» بمختبر استراتيجيات TradingView.
    - **`max_drawdown_pct` يشمل القاع داخل كل صفقة مغلقة** (`mae_pct`)، لا نقاط الإغلاق وحدها."""
    open_pnl = next((t["pnl_pct"] for t in trades if t.get("open")), None)
    trades = [t for t in trades if not t.get("open")]
    wins = [t["pnl_pct"] for t in trades if t["pnl_pct"] > 0]
    losses = [t["pnl_pct"] for t in trades if t["pnl_pct"] < 0]
    decided = len(wins) + len(losses)

    equity = 100.0
    curve = [{"i": 0, "equity": equity}]
    peak = equity
    max_dd = 0.0
    for j, t in enumerate(trades):
        # القاع **داخل** الصفقة قبل إغلاقها: كان الهبوط يُقاس على الإغلاقات وحدها ⇒ خمس صفقات كلّ منها
        # نزلت 8% ثم أُغلقت +1% تُعرض «أقصى هبوط 0%» — مخاطرة لم يرها المتداول. كـ«أقصى هبوط» بمختبر
        # TradingView. صفقة بلا `mae_pct` (نداء قديم) = الإغلاق وحده.
        trough = equity * (1 + min(t.get("mae_pct", t["pnl_pct"]), t["pnl_pct"]) / 100)
        equity *= 1 + t["pnl_pct"] / 100
        max_dd = max(max_dd, (peak - trough) / peak * 100 if peak else 0)
        peak = max(peak, equity)
        dd = (peak - equity) / peak * 100 if peak else 0
        max_dd = max(max_dd, dd)
        curve.append({"i": j + 1, "equity": round(equity, 2)})

    stats = {
        "trade_count": len(trades),
        "win_rate": round(len(wins) / decided * 100, 1) if decided else None,
        "breakeven_count": len(trades) - decided,
        "total_return_pct": round(equity - 100.0, 2),
        "final_equity": round(equity, 2),
        # بلا رابحة لا متوسّط ربح (None لا 0): «متوسّط الربح 0%» يُقرأ «ربحت صفقات بلا شيء». والخسارة كذلك.
        "avg_win_pct": round(sum(wins) / len(wins), 2) if wins else None,
        "avg_loss_pct": round(sum(losses) / len(losses), 2) if losses else None,
        "max_drawdown_pct": round(max_dd, 2),
        "open_pnl_pct": open_pnl,
    }
    return stats, curve


def run_backtest(
    candles: list[dict[str, Any]],
    strategy: StrategyId = "ma_cross",
    fast: int = 9,
    slow: int = 21,
    rsi_low: float = 30,
    rsi_high: float = 70,
    spread: float = 0.0,
) -> dict[str, Any]:
    """`spread`: تكلفة السبريد بوحدات السعر، تُخصم مرة لكل صفقة (دخول+خروج بسعري bid/ask)."""
    if len(candles) < max(slow, 30) + 5:
        return {"error": "not enough candles", "trades": [], "stats": {}}

    closes = [float(c["close"]) for c in candles]
    highs = [float(c["high"]) for c in candles]
    lows = [float(c["low"]) for c in candles]
    times = [int(c["time"]) for c in candles]
    f_sma = ind.sma(closes, fast)
    s_sma = ind.sma(closes, slow)
    r = ind.rsi(closes)
    m_line, m_sig = ind.macd(closes)
    mid = ind.sma(closes, 20)
    # BB bands from mid ± 2 * rolling std approx via ATR-like range
    bb_upper: list[float | None] = [None] * len(closes)
    bb_lower: list[float | None] = [None] * len(closes)
    for i in range(19, len(closes)):
        window = closes[i - 19 : i + 1]
        mean = sum(window) / 20
        var = sum((x - mean) ** 2 for x in window) / 20
        std = var**0.5
        bb_upper[i] = mean + 2 * std
        bb_lower[i] = mean - 2 * std

    trades: list[dict[str, Any]] = []
    position: Literal["long", "short", "flat"] = "flat"
    entry_price = 0.0
    entry_i = 0
    start_i = max(slow, 26) + 1

    def close_trade(exit_i: int, still_open: bool = False) -> None:
        """يسجّل صفقة المركز الحالي مغلقةً عند إغلاق الشمعة `exit_i`.

        `mae_pct` = أسوأ ربح/خسارة **أثناء** الصفقة (أدنى قاع للشراء / أعلى قمّة للبيع) من الشمعة
        التالية للدخول (الدخول عند إغلاق شمعته) حتى شمعة الخروج ضمناً — يغذّي أقصى هبوط بـ`_stats`."""
        exit_price = closes[exit_i]
        sgn = 1 if position == "long" else -1
        span = range(entry_i + 1, exit_i + 1)
        worst = min((lows[k] for k in span), default=exit_price) if sgn > 0 else max(
            (highs[k] for k in span), default=exit_price)
        pnl = sgn * (exit_price - entry_price) / entry_price * 100
        mae = min(pnl, sgn * (worst - entry_price) / entry_price * 100)
        t: dict[str, Any] = {
            "side": position,
            "entry": entry_price,
            "exit": exit_price,
            "pnl_pct": round(pnl, 3),
            "mae_pct": round(mae, 3),
            "entry_time": times[entry_i],
            "exit_time": times[exit_i],
        }
        if still_open:
            t["open"] = True
        trades.append(t)

    for i in range(start_i, len(closes)):
        price = closes[i]
        signal: Literal["buy", "sell", "flat"] | None = None

        if strategy == "ma_cross":
            if ind.cross_up(f_sma[: i + 1], s_sma[: i + 1]):
                signal = "buy"
            elif ind.cross_down(f_sma[: i + 1], s_sma[: i + 1]):
                signal = "sell"
        elif strategy == "rsi_reversal":
            rv = r[i]
            if rv is not None:
                if rv <= rsi_low:
                    signal = "buy"
                elif rv >= rsi_high:
                    signal = "sell"
        elif strategy == "macd_cross":
            if ind.cross_up(m_line[: i + 1], m_sig[: i + 1]):
                signal = "buy"
            elif ind.cross_down(m_line[: i + 1], m_sig[: i + 1]):
                signal = "sell"
        elif strategy == "bb_bounce":
            lo = bb_lower[i]
            hi = bb_upper[i]
            m = mid[i]
            if lo is not None and lows[i] <= lo and price > lo:
                signal = "buy"
            elif hi is not None and highs[i] >= hi and price < hi:
                signal = "sell"
            # الخروج عند الخط الأوسط **إغلاق فقط** (QA55 (e)): كان يُطلق الإشارة المعاكسة فيفتح المحرّك
            # (إيقاف-وعكس) بيعاً عند الوسط بلا لمس النطاق العلوي — صفقات لا تقولها قواعد الاستراتيجية.
            elif m is not None and position == "long" and price >= m:
                signal = "flat"
            elif m is not None and position == "short" and price <= m:
                signal = "flat"

        if signal == "flat" and position != "flat":
            close_trade(i)
            position = "flat"
        elif signal == "buy" and position != "long":
            if position == "short":
                close_trade(i)
            position = "long"
            entry_price = price
            entry_i = i
        elif signal == "sell" and position != "short":
            if position == "long":
                close_trade(i)
            position = "short"
            entry_price = price
            entry_i = i

    if position != "flat":
        close_trade(len(closes) - 1, still_open=True)

    if spread > 0:
        for t in trades:
            cost = spread / t["entry"] * 100
            t["pnl_pct"] = round(t["pnl_pct"] - cost, 3)
            t["mae_pct"] = round(t["mae_pct"] - cost, 3)

    stats, curve = _stats(trades)
    return {
        "strategy": strategy,
        "trades": trades[-40:],
        "stats": stats,
        "equity_curve": curve,
    }
