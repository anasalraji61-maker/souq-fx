"""Run 99: one malformed WS frame no longer drops the provider connection; weekend ticks are not 'live' in status."""
import asyncio
import json
from datetime import datetime, timezone

import pytest

import twelve_data as market
import twelve_data_ws as td_ws


@pytest.fixture(autouse=True)
def _clean(monkeypatch):
    monkeypatch.setattr(td_ws, "LATEST", {})
    monkeypatch.setattr(td_ws, "LATEST_AT", {})


def test_huge_integer_price_or_timestamp_is_ignored_not_raised():
    big = int("9" * 400)
    assert td_ws._parse_price({"event": "price", "symbol": "EUR/USD", "price": big}) is None
    assert td_ws._provider_ts({"timestamp": big}) is None


def test_non_string_symbol_is_not_stored_under_junk_key():
    td_ws._store({"event": "price", "symbol": ["EUR/USD"], "price": 1.1})
    assert td_ws.LATEST == {}


class _FakeWS:
    def __init__(self, frames):
        self._frames = frames

    async def __aenter__(self):
        return self

    async def __aexit__(self, *a):
        return False

    async def send(self, _msg):
        pass

    def __aiter__(self):
        async def gen():
            for f in self._frames:
                yield f
        return gen()


def test_bad_frame_does_not_end_the_loop_for_other_symbols(monkeypatch):
    frames = [
        json.dumps({"event": "price", "symbol": "EUR/USD", "price": 1.1}),
        '{"event": "price", "symbol": "GBP/USD", "price": ' + "9" * 400 + "}",
        json.dumps({"event": "price", "symbol": "USD/JPY", "price": 150.1}),
    ]
    monkeypatch.setenv("TWELVE_DATA_WS_KEY", "k")
    monkeypatch.setattr(td_ws.websockets, "connect", lambda *a, **k: _FakeWS(frames))
    errors = []

    async def stop(_s):
        errors.append(td_ws._last_error)
        raise asyncio.CancelledError

    monkeypatch.setattr(td_ws.asyncio, "sleep", stop)
    with pytest.raises(asyncio.CancelledError):
        asyncio.run(td_ws.run_forever())
    assert td_ws.LATEST == {"EURUSD": 1.1, "USDJPY": 150.1}
    assert errors == ["closed by server"]  # clean end of stream, not an exception from the bad frame


def test_status_does_not_list_weekend_tick_as_live(monkeypatch):
    sat = datetime(2026, 9, 26, 10, 0, tzinfo=timezone.utc).timestamp()
    monkeypatch.setattr(market, "WEEKEND_CLOSE_FILTER", True)
    monkeypatch.setattr(market, "_session_now", lambda: sat)
    monkeypatch.setattr(td_ws.time, "time", lambda: sat)
    td_ws.LATEST.update({"EURUSD": 1.17, "BTCUSD": 60000.0})
    td_ws.LATEST_AT.update({"EURUSD": sat - 2, "BTCUSD": sat - 2})
    st = td_ws.status()
    assert st["symbols_live"] == ["BTCUSD"]
    assert "EURUSD" in st["symbols_stale"]
