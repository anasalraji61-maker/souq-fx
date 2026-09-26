"""كاش الشموع كان بالذاكرة وحدها: إعادة تشغيل الخادم تمحوه ⇒ قائمة المتابعة تطلب 16 شمعة D دفعة واحدة من حدّ
8/دقيقة ⇒ نصف الصفوف «غير متاح» بجانب إغلاق حقيقي محفوظ. النسخة على القرص تُخدم بقواعد الذاكرة نفسها."""
from __future__ import annotations

import sqlite3

import pytest

import twelve_data as market
from tests.test_one_price_w1 import _rows_until
from tests.test_twelve_data_candles import provider  # noqa: F401 — fixture


@pytest.fixture()
def disk(tmp_path, monkeypatch):
    path = tmp_path / "candle_cache.db"
    monkeypatch.setattr(market, "CANDLE_DISK", path)
    return path


def _restart(monkeypatch):
    monkeypatch.setattr(market, "_cache", {})
    monkeypatch.setattr(market, "_disk_checked", set())
    monkeypatch.setattr(market, "_base_at", {})


def _age_disk(path, seconds):
    con = sqlite3.connect(str(path))
    with con:
        con.execute(f"UPDATE {market._DISK_TABLE} SET fetched_at = fetched_at - ?, base_at = base_at - ?", (seconds, seconds))
    con.close()


def test_a_restart_serves_the_saved_candles_without_a_provider_call(provider, disk, monkeypatch):  # noqa: F811
    provider["payload"] = {"values": _rows_until(200, "1.1000")}
    first, meta0 = market.fetch_time_series_with_meta("BTCUSD", "D", 180)
    _restart(monkeypatch)
    provider["payload"] = {"status": "error", "code": 429, "message": "limit"}
    before = market._stats["api_calls"]
    again, meta = market.fetch_time_series_with_meta("BTCUSD", "D", 50)
    assert market._stats["api_calls"] == before
    assert meta["kind"] == "cache" and meta["as_of"] == pytest.approx(meta0["as_of"])  # وقت الجلب الحقيقي
    assert again == first[-50:] and again[-1]["close"] == pytest.approx(1.1)


def test_a_restart_on_429_serves_saved_candles_only_within_the_stale_window(provider, disk, monkeypatch):  # noqa: F811
    provider["payload"] = {"values": _rows_until(200, "1.1000")}
    market.fetch_time_series_with_meta("BTCUSD", "15m", 180)
    _age_disk(disk, market.STALE_MAX_SEC + 3600)
    _restart(monkeypatch)
    provider["payload"] = {"status": "error", "code": 429, "message": "limit"}
    with pytest.raises(RuntimeError):
        market.fetch_time_series_with_meta("BTCUSD", "15m", 180)


def test_an_old_saved_entry_is_refetched_when_the_provider_answers(provider, disk, monkeypatch):  # noqa: F811
    provider["payload"] = {"values": _rows_until(200, "1.1000")}
    market.fetch_time_series_with_meta("BTCUSD", "15m", 180)
    _age_disk(disk, market.CACHE_TTL["15m"] + 1)
    _restart(monkeypatch)
    provider["payload"] = {"values": _rows_until(201, "1.1050")}
    candles, meta = market.fetch_time_series_with_meta("BTCUSD", "15m", 180)
    assert meta["kind"] == "provider" and candles[-1]["close"] == pytest.approx(1.105)


def test_a_dropped_gapped_entry_does_not_come_back_after_a_restart(provider, disk, monkeypatch):  # noqa: F811
    provider["payload"] = {"values": _rows_until(320, "1.1000")}
    market.fetch_time_series_with_meta("BTCUSD", "15m", 300)
    for k, (at, c) in list(market._cache.items()):
        market._cache[k] = (at - 30 * 86400, c)
    provider["payload"] = {"values": _rows_until(2000, "1.1050")[-200:]}
    market.fetch_time_series_with_meta("BTCUSD", "15m", 180)
    _restart(monkeypatch)
    assert market._cached("BTCUSD|15m|300") is None


@pytest.mark.parametrize("body", ["not json", "[]", '[{"time": 1, "open": "x"}]', '{"a": 1}'])
def test_a_corrupt_saved_row_is_ignored(provider, disk, monkeypatch, body):  # noqa: F811
    provider["payload"] = {"values": _rows_until(200, "1.1000")}
    market.fetch_time_series_with_meta("BTCUSD", "15m", 180)
    con = sqlite3.connect(str(disk))
    with con:
        con.execute(f"UPDATE {market._DISK_TABLE} SET body = ?", (body,))
    con.close()
    _restart(monkeypatch)
    provider["payload"] = {"values": _rows_until(201, "1.1050")}
    candles, meta = market.fetch_time_series_with_meta("BTCUSD", "15m", 180)
    assert meta["kind"] == "provider" and candles[-1]["close"] == pytest.approx(1.105)


def test_a_saved_row_from_the_future_is_not_served_as_fresh(provider, disk, monkeypatch):  # noqa: F811
    provider["payload"] = {"values": _rows_until(200, "1.1000")}
    market.fetch_time_series_with_meta("BTCUSD", "15m", 180)
    _age_disk(disk, -86400)
    _restart(monkeypatch)
    provider["payload"] = {"values": _rows_until(201, "1.1050")}
    _, meta = market.fetch_time_series_with_meta("BTCUSD", "15m", 180)
    assert meta["kind"] == "provider"


def test_an_unusable_disk_path_never_breaks_a_fetch(provider, tmp_path, monkeypatch):  # noqa: F811
    blocker = tmp_path / "file"
    blocker.write_text("x")
    monkeypatch.setattr(market, "CANDLE_DISK", blocker / "sub" / "candle_cache.db")
    provider["payload"] = {"values": _rows_until(200, "1.1000")}
    candles, meta = market.fetch_time_series_with_meta("BTCUSD", "15m", 180)
    assert meta["kind"] == "provider" and candles[-1]["close"] == pytest.approx(1.1)
    _restart(monkeypatch)
    _, meta = market.fetch_time_series_with_meta("BTCUSD", "15m", 180)
    assert meta["kind"] == "provider"


def _age_memory(seconds):
    for k, (at, c) in list(market._cache.items()):
        market._cache[k] = (at - seconds, c)
        market._base_at[k] = market._base_at.get(k, at) - seconds


def test_the_older_bars_of_a_bigger_entry_are_refetched_after_a_day_of_small_merges(provider, disk, monkeypatch):  # noqa: F811
    """القائمة (D/50 كل 90ث) كانت تدمج بـD/180 وتختمه «الآن» ⇒ أول 130 شمعة لا تُجلب أبداً، والقرص يحفظها."""
    provider["payload"] = {"values": _rows_until(200, "9.9900")}
    market.fetch_time_series_with_meta("BTCUSD", "D", 180)
    provider["payload"] = {"values": _rows_until(200, "1.1000")}
    for _ in range(3):  # يوم ونصف من تحديثات القائمة، كلّ منها داخل TTL الشارت
        _age_memory(market.MERGE_MAX_AGE_SEC / 2)
        market.fetch_time_series_with_meta("BTCUSD", "D", 50)
    _restart(monkeypatch)
    before = market._stats["api_calls"]
    candles, meta = market.fetch_time_series_with_meta("BTCUSD", "D", 180)
    assert market._stats["api_calls"] == before + 1 and meta["kind"] == "provider"
    assert all(c["close"] == pytest.approx(1.1) for c in candles)


def test_a_small_fetch_still_refreshes_a_recent_bigger_entry(provider, disk, monkeypatch):  # noqa: F811
    provider["payload"] = {"values": _rows_until(200, "1.1000")}
    market.fetch_time_series_with_meta("BTCUSD", "D", 180)
    _age_memory(market.CACHE_TTL["D"] + 1)
    provider["payload"] = {"values": _rows_until(200, "1.1050")}
    market.fetch_time_series_with_meta("BTCUSD", "D", 50)
    _restart(monkeypatch)
    before = market._stats["api_calls"]
    candles, meta = market.fetch_time_series_with_meta("BTCUSD", "D", 180)
    assert market._stats["api_calls"] == before and meta["kind"] == "cache"
    assert len(candles) == 180 and candles[-1]["close"] == pytest.approx(1.105)


def test_rows_saved_by_an_older_disk_layout_are_not_loaded(provider, disk, monkeypatch):  # noqa: F811
    con = sqlite3.connect(str(disk))
    with con:
        con.execute("CREATE TABLE candles (key TEXT PRIMARY KEY, fetched_at REAL NOT NULL, body TEXT NOT NULL)")
        con.execute(
            "INSERT INTO candles VALUES (?, ?, ?)",
            ("BTCUSD|D|180", __import__("time").time(), '[{"time":1,"open":9,"high":9,"low":9,"close":9}]'),
        )
    con.close()
    provider["payload"] = {"values": _rows_until(200, "1.1000")}
    _, meta = market.fetch_time_series_with_meta("BTCUSD", "D", 180)
    assert meta["kind"] == "provider"
