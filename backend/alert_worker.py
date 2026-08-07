"""Check price + indicator alerts and push notifications."""
from __future__ import annotations

import asyncio

import db
import expo_push
import indicators as ind_engine
import twelve_data as market
import twelve_data_ws as td_ws


async def run_alert_loop(interval: float = 60.0) -> None:
    while True:
        try:
            _check_once()
        except Exception:
            pass
        await asyncio.sleep(interval)


def _price(symbol: str) -> float | None:
    try:
        q = market.fetch_quote(symbol)
        if q is not None:
            return float(q)
    except Exception:
        pass
    snap = td_ws.snapshot()
    p = snap.get(symbol.upper())
    return float(p) if p is not None else None


def _check_indicator(a: dict) -> bool:
    try:
        raw = market.fetch_time_series(a["symbol"], a["timeframe"], outputsize=80)
    except Exception:
        return False
    if not raw:
        return False
    snap = ind_engine.snapshot(raw, int(a.get("fast_period") or 9), int(a.get("slow_period") or 21))
    at = a["alert_type"]
    cond = a["condition"]
    if at == "rsi":
        rv = snap.get("rsi")
        if rv is None or a.get("value") is None:
            return False
        return rv >= float(a["value"]) if cond == "above" else rv <= float(a["value"])
    if at == "ma_cross":
        return bool(snap.get("ma_cross_up" if cond == "cross_up" else "ma_cross_down"))
    if at == "macd_cross":
        return bool(snap.get("macd_cross_up" if cond == "cross_up" else "macd_cross_down"))
    return False


def _check_once() -> None:
    triggered_msgs: list[str] = []

    for a in db.list_alerts():
        if not a.get("active") or a.get("triggered"):
            continue
        q = _price(a["symbol"])
        if q is None:
            continue
        hit = (a["condition"] == "above" and q >= a["price"]) or (
            a["condition"] == "below" and q <= a["price"]
        )
        if hit:
            db.mark_alert_triggered(a["id"])
            triggered_msgs.append(f"{a['symbol']} price {a['condition']} {a['price']}")

    for a in db.list_indicator_alerts():
        if not a.get("active") or a.get("triggered"):
            continue
        if _check_indicator(a):
            db.mark_indicator_alert_triggered(a["id"])
            triggered_msgs.append(
                f"{a['symbol']} {a['alert_type']} {a['condition']}"
            )

    if not triggered_msgs:
        return
    tokens = db.all_push_tokens()
    if not tokens:
        return
    for msg in triggered_msgs:
        expo_push.send_push(tokens, "MATRIX · تنبيه", msg, {})
