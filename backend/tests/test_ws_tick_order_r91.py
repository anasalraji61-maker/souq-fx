"""Run 91: WS tick ordering uses the raw provider timestamp, not the one capped at arrival time."""
import twelve_data_ws as td_ws


def _feed(monkeypatch, ticks):
    monkeypatch.setattr(td_ws, "LATEST", {})
    monkeypatch.setattr(td_ws, "LATEST_AT", {})
    for received, msg in ticks:
        monkeypatch.setattr(td_ws.time, "time", lambda r=received: r)
        td_ws._store({"event": "price", **msg})


def test_older_tick_does_not_overwrite_newer_when_provider_clock_ahead(monkeypatch):
    # provider clock 5 s ahead of ours: both ticks get capped to arrival time
    _feed(monkeypatch, [
        (1000.0, {"symbol": "EUR/USD", "price": 1.1010, "timestamp": 1005}),
        (1000.5, {"symbol": "EUR/USD", "price": 1.1000, "timestamp": 1004}),
    ])
    assert td_ws.LATEST["EURUSD"] == 1.1010
    assert td_ws.LATEST_AT["EURUSD"] == 1000.0


def test_timeless_tick_does_not_block_newer_stamped_tick(monkeypatch):
    _feed(monkeypatch, [
        (2000.7, {"symbol": "GBP/USD", "price": 1.30}),
        (2000.9, {"symbol": "GBP/USD", "price": 1.31, "timestamp": 2000}),
    ])
    assert td_ws.LATEST["GBPUSD"] == 1.31


def test_late_older_tick_still_dropped(monkeypatch):
    _feed(monkeypatch, [
        (1010.0, {"symbol": "EUR/USD", "price": 1.1010, "timestamp": 1009}),
        (1011.0, {"symbol": "EUR/USD", "price": 1.1000, "timestamp": 1002}),
    ])
    assert td_ws.LATEST["EURUSD"] == 1.1010
