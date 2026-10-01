"""Run 124: an upstream that stops sending prices with the socket still up is reconnected."""
import asyncio
import json

import pytest

import twelve_data_ws as td_ws


class _SilentWS:
    """One price frame, then silence until closed."""

    def __init__(self):
        self.sent: list[dict] = []
        self.closed = asyncio.Event()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False

    async def send(self, msg):
        self.sent.append(json.loads(msg))

    async def close(self):
        self.closed.set()

    def __aiter__(self):
        async def gen():
            yield json.dumps({"event": "price", "symbol": "EUR/USD", "price": 1.1})
            await self.closed.wait()
        return gen()


def _run(monkeypatch, market_closed: bool, run_for: float = 0.5):
    ws = _SilentWS()
    errors: list = []
    monkeypatch.setattr(td_ws, "LATEST", {})
    monkeypatch.setattr(td_ws, "LATEST_AT", {})
    monkeypatch.setattr(td_ws, "_PROVIDER_TS", {})
    monkeypatch.setattr(td_ws, "_HEARTBEAT_S", 0.02)
    monkeypatch.setattr(td_ws, "_STALL_S", 0.1)
    monkeypatch.setattr(td_ws.market, "in_weekend_close", lambda *a: market_closed)
    monkeypatch.setenv("TWELVE_DATA_WS_KEY", "k")
    monkeypatch.setattr(td_ws.websockets, "connect", lambda *a, **k: ws)

    async def stop(_s):
        errors.append((td_ws._last_error, td_ws._connected))
        raise asyncio.CancelledError

    monkeypatch.setattr(td_ws.asyncio, "sleep", stop)

    async def main():
        task = asyncio.ensure_future(td_ws.run_forever())
        await asyncio.wait([task], timeout=run_for)
        if not task.done():
            task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass

    asyncio.run(main())
    return ws, errors


def test_silent_upstream_is_closed_and_marked_disconnected(monkeypatch):
    ws, errors = _run(monkeypatch, market_closed=False)
    assert ws.closed.is_set()
    assert errors == [("no prices from provider", False)]
    assert {"action": "heartbeat"} in ws.sent


def test_no_reconnect_loop_while_market_closed(monkeypatch):
    ws, errors = _run(monkeypatch, market_closed=True, run_for=0.3)
    assert not ws.closed.is_set()
    assert errors == []
    assert {"action": "heartbeat"} in ws.sent  # heartbeats keep the socket alive over the weekend
