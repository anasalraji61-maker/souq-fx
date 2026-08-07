"""Twelve Data WebSocket — live prices (shared Grow key with robot)."""
from __future__ import annotations

import asyncio
import json
import os
from typing import Any

import websockets

from twelve_data import SYMBOL_MAP, td_symbol

WS_URL = "wss://ws.twelvedata.com/v1/quotes/price"

# MATRIX symbol -> latest price
LATEST: dict[str, float] = {}
_connected = False
_last_error: str | None = None

# Max symbols on Grow trial WS credits — keep light for robot
DEFAULT_WS_SYMBOLS = ["EUR/USD", "GBP/USD", "XAU/USD", "DX-Y.NYB", "USD/JPY"]


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
        return _matrix_from_td(str(sym)), float(price)
    except (TypeError, ValueError):
        return None


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
                        continue
                    parsed = _parse_price(data)
                    if parsed:
                        LATEST[parsed[0]] = parsed[1]
        except asyncio.CancelledError:
            _connected = False
            raise
        except Exception as exc:  # noqa: BLE001
            _connected = False
            _last_error = str(exc)[:200]
            await asyncio.sleep(8)


def status() -> dict:
    return {
        "connected": _connected,
        "symbols_live": list(LATEST.keys()),
        "last_error": _last_error,
        "has_key": bool(_ws_key()),
    }


def snapshot() -> dict[str, float]:
    return dict(LATEST)
