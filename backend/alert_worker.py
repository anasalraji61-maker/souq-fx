"""Check price + indicator alerts and push notifications."""
from __future__ import annotations

import asyncio
import logging

import db
import expo_push
import indicators as ind_engine
import twelve_data as market
import twelve_data_ws as td_ws

log = logging.getLogger("matrix.alerts")


async def run_alert_loop(interval: float = 60.0) -> None:
    while True:
        try:
            _check_once()
        except Exception:
            log.exception("unexpected error in alert check cycle")
        await asyncio.sleep(interval)


def _price(symbol: str) -> float | None:
    try:
        q = market.fetch_quote(symbol)
        if q is not None:
            return float(q)
    except Exception:
        log.warning("price quote fetch failed for %s", symbol, exc_info=True)
    snap = td_ws.snapshot()
    p = snap.get(symbol.upper())
    return float(p) if p is not None else None


def _check_indicator(a: dict) -> bool:
    try:
        raw = market.fetch_time_series(a["symbol"], a["timeframe"], outputsize=80)
    except Exception:
        log.warning(
            "indicator series fetch failed for %s (%s)",
            a.get("symbol"),
            a.get("alert_type"),
            exc_info=True,
        )
        return False
    if not raw:
        log.warning(
            "indicator series empty for %s (%s)",
            a.get("symbol"),
            a.get("alert_type"),
        )
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
    # (owner user_id, message) — each push goes only to the alert owner's devices (it used to
    # go to every registered device, leaking one trader's alerts to all the others).
    triggered_msgs: list[tuple[int | None, str]] = []

    for a in db.list_alerts(all_users=True):
        try:
            if not a.get("active") or a.get("triggered"):
                continue
            q = _price(a["symbol"])
            if q is None:
                log.warning("no price available for alert id=%s symbol=%s", a.get("id"), a.get("symbol"))
                continue
            hit = (a["condition"] == "above" and q >= a["price"]) or (
                a["condition"] == "below" and q <= a["price"]
            )
            if hit:
                db.mark_alert_triggered(a["id"])
                triggered_msgs.append((a.get("user_id"), f"{a['symbol']} price {a['condition']} {a['price']}"))
        except Exception:
            log.exception(
                "price alert processing failed id=%s symbol=%s",
                a.get("id"),
                a.get("symbol"),
            )

    for a in db.list_indicator_alerts(all_users=True):
        try:
            if not a.get("active") or a.get("triggered"):
                continue
            if _check_indicator(a):
                db.mark_indicator_alert_triggered(a["id"])
                triggered_msgs.append(
                    (a.get("user_id"), f"{a['symbol']} {a['alert_type']} {a['condition']}")
                )
        except Exception:
            log.exception(
                "indicator alert processing failed id=%s symbol=%s",
                a.get("id"),
                a.get("symbol"),
            )

    if not triggered_msgs:
        return
    for owner, msg in triggered_msgs:
        tokens = db.push_tokens_for(owner)
        if not tokens:
            continue
        try:
            result = expo_push.send_push(tokens, "MATRIX · تنبيه", msg, {})
            for tok in result.get("invalid_tokens") or []:
                db.delete_push_token(tok)
                log.info("removed invalid push token (%s…)", tok[:24])
        except Exception:
            log.exception("push send failed for message: %s", msg)
