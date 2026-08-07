"""Symbol screener — scan MATRIX watchlist with indicator filters."""
from __future__ import annotations

from typing import Any, Literal

import indicators as ind
import twelve_data as market

FilterId = Literal[
    "rsi_oversold",
    "rsi_overbought",
    "ma_cross_up",
    "ma_cross_down",
    "macd_cross_up",
    "bullish",
    "bearish",
]

DEFAULT_SYMBOLS = list(market.SYMBOL_MAP.keys())


def run_scan(
    timeframe: str = "15m",
    filters: list[str] | None = None,
    symbols: list[str] | None = None,
    rsi_low: float = 30,
    rsi_high: float = 70,
    fast: int = 9,
    slow: int = 21,
) -> list[dict[str, Any]]:
    flt = filters or ["ma_cross_up"]
    syms = symbols or DEFAULT_SYMBOLS[:12]
    hits: list[dict[str, Any]] = []

    for sym in syms:
        try:
            raw = market.fetch_time_series(sym, timeframe, outputsize=80)
        except Exception:
            continue
        if not raw:
            continue
        snap = ind.snapshot(raw, fast=fast, slow=slow)
        if snap.get("rsi") is None:
            continue

        matched: list[str] = []
        rsi_v = float(snap["rsi"])
        chg = float(snap.get("change_pct") or 0)

        for f in flt:
            if f == "rsi_oversold" and rsi_v <= rsi_low:
                matched.append(f)
            elif f == "rsi_overbought" and rsi_v >= rsi_high:
                matched.append(f)
            elif f == "ma_cross_up" and snap.get("ma_cross_up"):
                matched.append(f)
            elif f == "ma_cross_down" and snap.get("ma_cross_down"):
                matched.append(f)
            elif f == "macd_cross_up" and snap.get("macd_cross_up"):
                matched.append(f)
            elif f == "bullish" and chg > 0 and rsi_v < 65:
                matched.append(f)
            elif f == "bearish" and chg < 0 and rsi_v > 35:
                matched.append(f)

        if matched:
            hits.append(
                {
                    "symbol": sym.upper(),
                    "timeframe": timeframe,
                    "last": snap["last"],
                    "change_pct": round(chg, 2),
                    "rsi": round(rsi_v, 1),
                    "filters_matched": matched,
                }
            )

    hits.sort(key=lambda x: abs(x["change_pct"]), reverse=True)
    return hits
