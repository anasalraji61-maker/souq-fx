"""Simple strategy backtest on historical candles."""
from __future__ import annotations

from typing import Any, Literal

import indicators as ind

StrategyId = Literal["ma_cross", "rsi_reversal", "macd_cross", "bb_bounce"]

_MAJORS = {"EUR", "GBP", "AUD", "NZD", "USD", "CAD", "CHF", "JPY"}
_TIGHTEST = {"EURUSD", "USDJPY"}
_MAJOR_USD = {"GBPUSD", "AUDUSD", "NZDUSD", "USDCAD", "USDCHF"}


def typical_spread(symbol: str) -> tuple[float, float] | None:
    """سبريد تقديري لحساب تجزئة عادي: (عدد الـpip، حجم الـpip). None = ليس زوج فوركس/معدن (DXY مؤشر لا يُتداول).

    تقدير محافظ لا سعر وسيط بعينه — الغرض ألا يُعرض عائد استراتيجية تنقلب كل بضع شموع بلا أي تكلفة،
    فتبدو رابحة على 15m وهي خاسرة فعلياً بعد السبريد.
    """
    s = "".join(ch for ch in symbol.upper() if ch.isalpha())
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
    entry_time = 0
    start_i = max(slow, 26) + 1

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
            elif m is not None and position == "long" and price >= m:
                signal = "sell"
            elif m is not None and position == "short" and price <= m:
                signal = "buy"

        if signal == "buy" and position != "long":
            if position == "short":
                pnl = (entry_price - price) / entry_price * 100
                trades.append(
                    {
                        "side": "short",
                        "entry": entry_price,
                        "exit": price,
                        "pnl_pct": round(pnl, 3),
                        "entry_time": entry_time,
                        "exit_time": times[i],
                    }
                )
            position = "long"
            entry_price = price
            entry_time = times[i]
        elif signal == "sell" and position != "short":
            if position == "long":
                pnl = (price - entry_price) / entry_price * 100
                trades.append(
                    {
                        "side": "long",
                        "entry": entry_price,
                        "exit": price,
                        "pnl_pct": round(pnl, 3),
                        "entry_time": entry_time,
                        "exit_time": times[i],
                    }
                )
            position = "short"
            entry_price = price
            entry_time = times[i]

    if position == "long":
        pnl = (closes[-1] - entry_price) / entry_price * 100
        trades.append(
            {
                "side": "long",
                "entry": entry_price,
                "exit": closes[-1],
                "pnl_pct": round(pnl, 3),
                "entry_time": entry_time,
                "exit_time": times[-1],
                "open": True,
            }
        )
    elif position == "short":
        pnl = (entry_price - closes[-1]) / entry_price * 100
        trades.append(
            {
                "side": "short",
                "entry": entry_price,
                "exit": closes[-1],
                "pnl_pct": round(pnl, 3),
                "entry_time": entry_time,
                "exit_time": times[-1],
                "open": True,
            }
        )

    if spread > 0:
        for t in trades:
            t["pnl_pct"] = round(t["pnl_pct"] - spread / t["entry"] * 100, 3)

    wins = [t for t in trades if t["pnl_pct"] > 0]
    total_pnl = sum(t["pnl_pct"] for t in trades)
    win_rate = (len(wins) / len(trades) * 100) if trades else 0
    avg_win = (sum(t["pnl_pct"] for t in wins) / len(wins)) if wins else 0
    losses = [t for t in trades if t["pnl_pct"] <= 0]
    avg_loss = (sum(t["pnl_pct"] for t in losses) / len(losses)) if losses else 0

    equity = 100.0
    curve = [{"i": 0, "equity": equity}]
    peak = equity
    max_dd = 0.0
    for j, t in enumerate(trades):
        equity *= 1 + t["pnl_pct"] / 100
        peak = max(peak, equity)
        dd = (peak - equity) / peak * 100 if peak else 0
        max_dd = max(max_dd, dd)
        curve.append({"i": j + 1, "equity": round(equity, 2)})

    return {
        "strategy": strategy,
        "trades": trades[-40:],
        "stats": {
            "trade_count": len(trades),
            "win_rate": round(win_rate, 1),
            "total_return_pct": round(total_pnl, 2),
            "final_equity": round(equity, 2),
            "avg_win_pct": round(avg_win, 2),
            "avg_loss_pct": round(avg_loss, 2),
            "max_drawdown_pct": round(max_dd, 2),
        },
        "equity_curve": curve,
    }
