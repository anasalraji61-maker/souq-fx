"""Run 124: a provider timestamp minutes ahead of arrival no longer freezes the symbol."""
import twelve_data_ws as td_ws


def _feed(monkeypatch, ticks):
    monkeypatch.setattr(td_ws, "LATEST", {})
    monkeypatch.setattr(td_ws, "LATEST_AT", {})
    monkeypatch.setattr(td_ws, "_PROVIDER_TS", {})
    for received, msg in ticks:
        monkeypatch.setattr(td_ws.time, "time", lambda r=received: r)
        td_ws._store({"event": "price", "symbol": "EUR/USD", **msg})


def test_tick_stamped_minutes_ahead_does_not_block_later_correct_ticks(monkeypatch):
    t0 = 1_790_000_000.0
    _feed(monkeypatch, [
        (t0, {"price": 1.1000, "timestamp": t0}),
        (t0 + 1, {"price": 1.1001, "timestamp": t0 + 1 + 1800}),  # glitch: +30 min
        (t0 + 60, {"price": 1.1050, "timestamp": t0 + 60}),
        (t0 + 600, {"price": 1.1100, "timestamp": t0 + 600}),
    ])
    assert td_ws.LATEST["EURUSD"] == 1.1100
    assert td_ws.LATEST_AT["EURUSD"] == t0 + 600


def test_small_clock_skew_still_orders_ticks(monkeypatch):
    t0 = 1_790_000_000.0
    _feed(monkeypatch, [
        (t0, {"price": 1.1010, "timestamp": t0 + 30}),  # provider 30 s ahead
        (t0 + 1, {"price": 1.1000, "timestamp": t0 + 20}),  # late, older tick
    ])
    assert td_ws.LATEST["EURUSD"] == 1.1010
