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
            # الفحص يستدعي مزوّد الأسعار وExpo Push عبر HTTP متزامن (مهلة حتى 15 ثانية لكل طلب) — تشغيله على
            # حلقة الأحداث مباشرة كان يجمّد كل طلبات الـAPI والـWebSocket طوال الدورة. خيط منفصل بدلاً من ذلك.
            await asyncio.to_thread(_check_once)
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


def _push_lang(lang: str | None) -> str:
    """لغة نص الإشعار: الإنجليزية لـen-US/en-GB، والعربية لغيرها (ar، ku بنفس الخط، أو توكن قديم بلا لغة
    — العربية لغة الواجهة الافتراضية)."""
    return "en" if (lang or "").lower().startswith("en") else "ar"


def _fmt_price(v) -> str:
    try:
        return f"{float(v):.10g}"
    except (TypeError, ValueError):
        return str(v)


_IND_NAMES = {
    "ar": {"rsi": "RSI", "ma_cross": "تقاطع المتوسطات", "macd_cross": "تقاطع MACD"},
    "en": {"rsi": "RSI", "ma_cross": "MA cross", "macd_cross": "MACD cross"},
}
_COND_WORDS = {
    "ar": {"above": "فوق", "below": "تحت", "cross_up": "صاعد ▲", "cross_down": "هابط ▼"},
    "en": {"above": "above", "below": "below", "cross_up": "up ▲", "cross_down": "down ▼"},
}


def _compose(ev: dict, lang: str) -> tuple[str, str]:
    """(عنوان، نص) الإشعار بلغة الجهاز. كان النص خاماً إنجليزياً للجميع («EURUSD price above 1.1»)
    تحت عنوان عربي — نص مختلط لا يقرؤه نصف الجمهور."""
    sym = ev["symbol"]
    if ev["kind"] == "price":
        up = ev["condition"] == "above"
        p = _fmt_price(ev["price"])
        if lang == "en":
            return "MATRIX · Price alert", f"{sym} {'▲ rose above' if up else '▼ fell below'} {p}"
        return "MATRIX · تنبيه سعر", f"{sym} {'▲ تجاوز' if up else '▼ نزل تحت'} {p}"
    name = _IND_NAMES[lang].get(ev["alert_type"], str(ev["alert_type"]).upper())
    cond = _COND_WORDS[lang].get(ev["condition"], ev["condition"])
    val = f" {_fmt_price(ev['value'])}" if ev.get("value") is not None and ev["alert_type"] == "rsi" else ""
    tf = f" · {ev['timeframe']}" if ev.get("timeframe") else ""
    title = "MATRIX · Indicator alert" if lang == "en" else "MATRIX · تنبيه مؤشر"
    return title, f"{sym} · {name} {cond}{val}{tf}"


def _check_once() -> None:
    # (owner user_id, event) — each push goes only to the alert owner's devices (it used to
    # go to every registered device, leaking one trader's alerts to all the others).
    triggered_msgs: list[tuple[int | None, dict]] = []
    # سعر واحد لكل رمز بالدورة: 30 تنبيهاً على EURUSD كانت 30 طلباً للمزوّد (تستنزف حد Twelve Data).
    prices: dict[str, float | None] = {}

    for a in db.list_alerts(all_users=True):
        try:
            if not a.get("active") or a.get("triggered"):
                continue
            key = str(a["symbol"]).upper()
            if key not in prices:
                prices[key] = _price(a["symbol"])
            q = prices[key]
            if q is None:
                log.warning("no price available for alert id=%s symbol=%s", a.get("id"), a.get("symbol"))
                continue
            hit = (a["condition"] == "above" and q >= a["price"]) or (
                a["condition"] == "below" and q <= a["price"]
            )
            if hit and db.mark_alert_triggered(a["id"]):
                triggered_msgs.append((
                    a.get("user_id"),
                    {"kind": "price", "symbol": a["symbol"], "condition": a["condition"], "price": a["price"]},
                ))
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
            if _check_indicator(a) and db.mark_indicator_alert_triggered(a["id"]):
                triggered_msgs.append((
                    a.get("user_id"),
                    {
                        "kind": "indicator",
                        "symbol": a["symbol"],
                        "alert_type": a["alert_type"],
                        "condition": a["condition"],
                        "value": a.get("value"),
                        "timeframe": a.get("timeframe"),
                    },
                ))
        except Exception:
            log.exception(
                "indicator alert processing failed id=%s symbol=%s",
                a.get("id"),
                a.get("symbol"),
            )

    if not triggered_msgs:
        return
    for owner, ev in triggered_msgs:
        targets = db.push_targets_for(owner)
        if not targets:
            continue
        by_lang: dict[str, list[str]] = {}
        for tok, lang in targets:
            by_lang.setdefault(_push_lang(lang), []).append(tok)
        for lang, tokens in by_lang.items():
            title, body = _compose(ev, lang)
            try:
                result = expo_push.send_push(tokens, title, body, {})
                for tok in result.get("invalid_tokens") or []:
                    db.delete_push_token(tok)
                    log.info("removed invalid push token (%s…)", tok[:24])
            except Exception:
                log.exception("push send failed for message: %s", body)
