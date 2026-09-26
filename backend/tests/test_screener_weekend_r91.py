"""Run 91: the screener counted real Friday-close series as "failed" on the weekend."""
from datetime import datetime, timezone

import pytest

import alert_worker
import twelve_data as market

FRI_FETCH = datetime(2026, 9, 25, 21, 6, tzinfo=timezone.utc).timestamp()  # after 17:00 NY close
SAT_NOON = datetime(2026, 9, 26, 12, 0, tzinfo=timezone.utc).timestamp()
MON_NOON = datetime(2026, 9, 28, 12, 0, tzinfo=timezone.utc).timestamp()


@pytest.fixture(autouse=True)
def _weekend_filter_on(monkeypatch):
    monkeypatch.setattr(market, "WEEKEND_CLOSE_FILTER", True)


def test_weekend_series_is_current_for_screener():
    assert alert_worker.series_fresh_enough(FRI_FETCH, "15m", now=SAT_NOON, symbol="EURUSD")


def test_without_symbol_rule_unchanged():
    # indicator alerts keep the fetch-age rule
    assert not alert_worker.series_fresh_enough(FRI_FETCH, "15m", now=SAT_NOON)


def test_weekend_series_stale_after_reopen():
    assert not alert_worker.series_fresh_enough(FRI_FETCH, "15m", now=MON_NOON, symbol="EURUSD")


def test_crypto_has_no_weekend_allowance():
    assert not alert_worker.series_fresh_enough(FRI_FETCH, "15m", now=SAT_NOON, symbol="BTCUSD")


def test_screener_uses_symbol(monkeypatch):
    import screener

    candles = [
        {"time": FRI_FETCH - 900 * (200 - i), "open": 1.1 + i * 1e-4, "high": 1.1002 + i * 1e-4,
         "low": 1.0998 + i * 1e-4, "close": 1.1 + i * 1e-4 * (1 if i % 3 else -1)}
        for i in range(200)
    ]
    monkeypatch.setattr(market, "fetch_time_series_with_meta",
                        lambda s, tf, outputsize=None: (candles, {"as_of": FRI_FETCH}))
    monkeypatch.setattr(alert_worker.time, "time", lambda: SAT_NOON)
    out = screener.run_scan_detailed("15m", ["rsi_oversold"], ["EURUSD"])
    assert out["failed"] == []
    assert out["scanned"] == 1
