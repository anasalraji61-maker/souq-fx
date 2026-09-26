"""run 81: ردود مزوّد معطوبة — وقت مكرَّر، `true` سعراً، تيك متأخّر الوصول، ردّ صوت فارغ بـ200."""
from __future__ import annotations

import pytest

import twelve_data as market
import twelve_data_ws as td_ws
from tests.test_quote_spread import _Resp, routes  # noqa: F401 — fixture
from tests.test_twelve_data_candles import provider  # noqa: F401 — fixture


def _row(dt: str, close: str) -> dict:
    return {"datetime": dt, "open": close, "high": close, "low": close, "close": close}


def test_duplicate_provider_timestamp_is_one_candle(provider):  # noqa: F811
    provider["payload"] = {"values": [
        _row("2026-09-23 10:01:00", "1.15"), _row("2026-09-23 10:01:00", "1.19"), _row("2026-09-23 10:00:00", "1.14"),
    ]}
    candles, _ = market.fetch_time_series_with_meta("BTCUSD", "1m", 3)
    times = [c["time"] for c in candles]
    assert times == sorted(set(times)) and len(times) == 2
    assert candles[-1]["close"] == pytest.approx(1.15)  # أوّل صفّ بترتيب المزوّد


def test_boolean_is_not_a_price(routes):  # noqa: F811
    assert market._f(True) is None and market._pos(True) is None
    assert market._candle({"datetime": "2026-09-23 10:00:00", "open": True, "high": "1.2", "low": "1.0", "close": "1.1"}) is None
    assert td_ws._parse_price({"event": "price", "symbol": "EUR/USD", "price": True}) is None


def test_late_ws_tick_does_not_overwrite_a_newer_price(monkeypatch):
    now = 1_790_000_000.0
    monkeypatch.setattr(td_ws.time, "time", lambda: now)
    monkeypatch.setattr(td_ws, "LATEST", {})
    monkeypatch.setattr(td_ws, "LATEST_AT", {})
    td_ws._store({"event": "price", "symbol": "EUR/USD", "price": 1.10, "timestamp": int(now - 5)})
    td_ws._store({"event": "price", "symbol": "EUR/USD", "price": "1.09", "timestamp": int(now - 60)})
    assert td_ws.LATEST["EURUSD"] == 1.10 and td_ws.LATEST_AT["EURUSD"] == now - 5
    td_ws._store({"event": "price", "symbol": "EUR/USD", "price": 1.11, "timestamp": int(now - 1)})
    assert td_ws.LATEST["EURUSD"] == 1.11


class _Audio:
    def __init__(self, content: bytes, ctype: str):
        self.status_code, self.content, self.headers, self.text = 200, content, {"content-type": ctype}, ""


@pytest.mark.parametrize("content,ctype,ok", [
    (b"", "audio/mpeg", False),
    (b'{"detail":"x"}', "application/json", False),
    (b"<html></html>", "text/html", False),
    (b"ID3\x03mp3", "audio/mpeg", True),
])
def test_tts_200_without_audio_is_an_error(tmp_path, monkeypatch, content, ctype, ok):
    import elevenlabs_tts as tts

    monkeypatch.setattr(tts, "_api_key", lambda: "k")
    monkeypatch.setattr(tts, "CACHE_DIR", tmp_path)

    class _Client:
        def __init__(self, *a, **k):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def post(self, *a, **k):
            return _Audio(content, ctype)

    monkeypatch.setattr(tts.httpx, "Client", _Client)
    if ok:
        assert tts.synthesize("hello", "abcdefghij12").read_bytes() == content
    else:
        with pytest.raises(RuntimeError):
            tts.synthesize("hello", "abcdefghij12")
        assert list(tmp_path.iterdir()) == []


@pytest.mark.parametrize("hi,lo,want", [("1.3", "1.0", (1.3, 1.0)), ("1.0", "1.3", (None, None)), ("0", "1.0", (None, 1.0))])
def test_quote_impossible_day_range_is_none(routes, hi, lo, want):  # noqa: F811
    import time

    routes["/quote"] = _Resp({"close": "1.1", "high": hi, "low": lo, "open": "-1", "last_quote_at": time.time() - 5})
    q = market.fetch_quote_book("BTCUSD")
    assert (q["high"], q["low"]) == want and q["open"] is None
