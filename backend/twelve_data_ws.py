"""Twelve Data WebSocket — live prices (shared Grow key with robot)."""
from __future__ import annotations

import asyncio
import json
import math
import os
import time
from typing import Any

import websockets

from twelve_data import SYMBOL_MAP

WS_URL = "wss://ws.twelvedata.com/v1/quotes/price"

# MATRIX symbol -> latest price
LATEST: dict[str, float] = {}
# MATRIX symbol -> وقت استلام آخر سعر (epoch) — بلا هذا كان سعر مجمَّد (انقطاع الـWS أو عطلة السوق) يُبثّ
# للعميل كـ«حي» بوقت الآن، ويُطلق عليه الـworker تنبيهات كأنه السعر الحالي.
LATEST_AT: dict[str, float] = {}
_connected = False
_last_error: str | None = None

# Max symbols on Grow trial WS credits — keep light for robot
# (كان `DX-Y.NYB` هنا — رمز Yahoo لا يعرفه Twelve Data ⇒ خانة بثّ مهدورة بلا سعر أبداً.)
DEFAULT_WS_SYMBOLS = ["EUR/USD", "GBP/USD", "XAU/USD", "USD/JPY"]


def _ws_key() -> str:
    return (
        os.getenv("TWELVE_DATA_WS_KEY")
        or os.getenv("TWELVE_DATA_API_KEY")
        or os.getenv("TWELVEDATA_API_KEY")
        or ""
    ).strip()


def _matrix_from_td(td_sym: str) -> str:
    for mx, td in SYMBOL_MAP.items():
        if td.upper() == td_sym.upper():
            return mx
    return td_sym.replace("/", "").upper()


def _parse_price(msg: dict[str, Any]) -> tuple[str, float] | None:
    event = msg.get("event") or msg.get("type")
    if event and event not in ("price", "quote", "trade"):
        return None
    sym = msg.get("symbol") or msg.get("meta", {}).get("symbol")
    price = msg.get("price") or msg.get("close") or msg.get("last")
    if not sym or price is None:
        return None
    try:
        p = float(price)
    except (TypeError, ValueError):
        return None
    # `float("NaN")`/`"inf"` تجتاز التحويل، و`send_json` يكتبها `NaN` حرفياً — JSON غير صالح يُسقط
    # `JSON.parse` بالتطبيق فتتوقّف كل التيكات لا الرمز وحده. وسعر غير موجب ليس سعراً (والتنبيهات تقرؤه).
    if not math.isfinite(p) or p <= 0:
        return None
    return _matrix_from_td(str(sym)), p


async def run_forever() -> None:
    global _connected, _last_error
    key = _ws_key()
    if not key:
        _last_error = "no websocket key"
        return

    td_syms = os.getenv("TWELVE_DATA_WS_SYMBOLS")
    symbols = td_syms if td_syms else ",".join(DEFAULT_WS_SYMBOLS)

    while True:
        try:
            url = f"{WS_URL}?apikey={key}"
            async with websockets.connect(url, ping_interval=20, ping_timeout=20) as ws:
                sub = {"action": "subscribe", "params": {"symbols": symbols}}
                await ws.send(json.dumps(sub))
                _connected = True
                _last_error = None
                async for raw in ws:
                    try:
                        data = json.loads(raw)
                    except json.JSONDecodeError:
                        continue
                    if isinstance(data, list):
                        for item in data:
                            parsed = _parse_price(item)
                            if parsed:
                                LATEST[parsed[0]] = parsed[1]
                                LATEST_AT[parsed[0]] = time.time()
                        continue
                    parsed = _parse_price(data)
                    if parsed:
                        LATEST[parsed[0]] = parsed[1]
                        LATEST_AT[parsed[0]] = time.time()
        except asyncio.CancelledError:
            _connected = False
            raise
        except Exception as exc:  # noqa: BLE001
            _connected = False
            _last_error = str(exc)[:200]
            await asyncio.sleep(8)


# عمر أقصى لسعر يُعدّ «حيّاً» بالحالة (نفس نافذة تنبيهات الـworker `snapshot(max_age=180)`)
LIVE_MAX_AGE = 180.0


def status() -> dict:
    # كان `symbols_live` = كل رمز وصل سعره يوماً — حتى بعد انقطاع الـWS بساعات. الآن ما وصل خلال
    # `LIVE_MAX_AGE` فقط، والباقي بـ`symbols_stale`.
    live = snapshot(max_age=LIVE_MAX_AGE)
    return {
        "connected": _connected,
        "symbols_live": list(live.keys()),
        "symbols_stale": [s for s in LATEST if s not in live],
        "last_error": _last_error,
        "has_key": bool(_ws_key()),
    }


def snapshot(max_age: float | None = None) -> dict[str, float]:
    """آخر الأسعار؛ مع `max_age` (ثوانٍ) فقط ما وصل خلالها — سعر أقدم ليس «السعر الحالي»."""
    if max_age is None:
        return dict(LATEST)
    cutoff = time.time() - max_age
    return {s: p for s, p in LATEST.items() if LATEST_AT.get(s, 0.0) >= cutoff}


def recent_snapshot(window: float = 120.0) -> tuple[dict[str, float], float | None]:
    """(الأسعار القريبة من أحدث استلام، وقت أحدث استلام) — لبثّ `/ws/ticks` بوقت حقيقي `as_of` بدل
    «الآن»: حين يتجمّد الـWS يصير as_of قديماً فيعرض العميل «آخر سعر» لا «حي». رمز تأخّر أكثر من
    `window` عن أحدث رمز يُستبعد كي لا يحمل وقت غيره."""
    if not LATEST_AT:
        return dict(LATEST), None
    newest = max(LATEST_AT.values())
    return {s: p for s, p in LATEST.items() if LATEST_AT.get(s, 0.0) >= newest - window}, newest


def received_at(symbols: list[str] | dict[str, float]) -> dict[str, float | None]:
    """وقت استلام كل رمز على حدة — `as_of` الدفعة وقت **أحدثها**، فسعرٌ أقدم منه بدقيقتين كان يحمل وقت غيره."""
    return {s: LATEST_AT.get(s) for s in symbols}
