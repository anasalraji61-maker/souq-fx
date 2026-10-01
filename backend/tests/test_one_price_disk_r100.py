"""بعد إعادة التشغيل: `_with_newest_close` يقارن الذاكرة، والقرص يُحمَّل مدخلاً مدخلاً عند طلبه ⇒ أول طلب D
(القائمة) كان يُخدم بإغلاق أقدم من 15m المحفوظ (الشارت) حتى يُطلب الـ15m مصادفةً. الآن تُحمَّل كل فريمات
الرمز من القرص قبل المقارنة."""
from __future__ import annotations

import main
import twelve_data as market
from tests.test_one_price_tf_r89 import DAYS, QUARTERS, T0, cache  # noqa: F401 — fixture


def _saved_then_restart(tmp_path, monkeypatch):
    monkeypatch.setattr(market, "CANDLE_DISK", tmp_path / "candle_cache.db")
    market._base_at.clear()
    market._disk_write("AAPL|D|50", (T0, [dict(c) for c in DAYS]))
    market._disk_write("AAPL|15m|180", (T0 + 300, [dict(c) for c in QUARTERS]))
    market._disk_write("MSFT|15m|180", (T0 + 320, [dict(c, close=5.0) for c in QUARTERS]))
    monkeypatch.setattr(market, "_cache", {})
    monkeypatch.setattr(market, "_disk_checked", set())


def test_first_daily_request_after_restart_takes_the_saved_15m_close(cache, tmp_path, monkeypatch):  # noqa: F811
    _saved_then_restart(tmp_path, monkeypatch)
    days, meta = market.fetch_time_series_with_meta("AAPL", "D", 50)
    assert days[-1]["close"] == 101.2 and meta["as_of"] == T0 + 300
    assert not any(k.startswith("MSFT|") for k in market._cache), "only the requested symbol is loaded"


def test_watchlist_and_chart_agree_right_after_restart(cache, tmp_path, monkeypatch):  # noqa: F811
    _saved_then_restart(tmp_path, monkeypatch)
    assert main.build_series("AAPL", "D", 50).last == main.build_series("AAPL", "15m", 180).last == 101.2
