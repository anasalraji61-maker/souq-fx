"""نهاية الشمعة لا تتجاوز إغلاق السوق الأسبوعي (الجمعة 17:00 نيويورك) — `market.bar_end`.

كانت فتحاً + طول الفريم: شمعة W لليورو دولار المؤرّخة الاثنين «جارية» حتى الاثنين التالي ⇒ تنبيه تقاطع W
أُنشئ السبت يُطلق على تقاطع الأسبوع الماضي، وإغلاق الجمعة يُرسَل `price_as_of` بوقت الجلب (السبت).
"""
from __future__ import annotations

from datetime import datetime, timezone

import alert_worker
import main
import screener
import twelve_data as market


def _ts(*a) -> int:
    return int(datetime(*a, tzinfo=timezone.utc).timestamp())


MON = _ts(2026, 9, 21)  # فتح شمعة W
FRI_CLOSE_SUMMER = _ts(2026, 9, 25, 21)  # 17:00 نيويورك بالتوقيت الصيفي
SAT = datetime(2026, 9, 26, 10, tzinfo=timezone.utc)
W = 604800


def test_weekly_bar_ends_at_friday_new_york_close():
    assert market.bar_end("EURUSD", MON, W) == FRI_CLOSE_SUMMER
    assert market.bar_end("XAUUSD", MON, W) == FRI_CLOSE_SUMMER
    # بلا توقيت صيفي أمريكي (ديسمبر) 17:00 نيويورك = 22:00 UTC
    assert market.bar_end("EURUSD", _ts(2026, 12, 7), W) == _ts(2026, 12, 11, 22)
    # الأسبوع بين تحويل أوروبا وأمريكا: نوفمبر 2 أحد التحويل الأمريكي ⇒ الجمعة 30 أكتوبر ما تزال صيفية
    assert market.bar_end("EURUSD", _ts(2026, 10, 26), W) == _ts(2026, 10, 30, 21)
    assert market.bar_end("EURUSD", _ts(2026, 3, 2), W) == _ts(2026, 3, 6, 22)
    assert market.bar_end("EURUSD", _ts(2026, 3, 9), W) == _ts(2026, 3, 13, 21)


def test_sunday_dated_weekly_bar_is_clamped_too():
    assert market.bar_end("EURUSD", _ts(2026, 9, 20), W) == FRI_CLOSE_SUMMER


def test_daily_and_intraday_bars_friday_evening():
    assert market.bar_end("EURUSD", _ts(2026, 9, 25), 86400) == FRI_CLOSE_SUMMER
    assert market.bar_end("EURUSD", _ts(2026, 9, 25, 20), 14400) == FRI_CLOSE_SUMMER
    # منتصف الأسبوع: D المؤرَّخة X تنتهي X ‏17:00 نيويورك (run 60) لا X+1 00:00 UTC
    assert market.bar_end("EURUSD", _ts(2026, 9, 23), 86400) == _ts(2026, 9, 23, 21)
    assert market.bar_end("EURUSD", _ts(2026, 9, 25, 10), 3600) == _ts(2026, 9, 25, 11)


def test_crypto_and_unknown_symbols_are_not_clamped():
    assert market.bar_end("BTCUSD", MON, W) == MON + W
    assert market.bar_end("ETHUSD", _ts(2026, 9, 25), 86400) == _ts(2026, 9, 26)
    assert market.bar_end("AAPL", MON, W) == MON + W


def _alert(symbol: str) -> dict:
    return {
        "id": "ia-w", "symbol": symbol, "timeframe": "W", "alert_type": "ma_cross",
        "condition": "cross_up", "fast_period": 2, "slow_period": 3, "value": None,
        "ts": SAT.isoformat(),
    }


def _weekly(last_open: int) -> list[dict]:
    closes = [5, 4, 3, 2, 1, 1, 5]
    n = len(closes)
    return [{"time": last_open - (n - 1 - i) * W, "open": c, "high": c, "low": c, "close": c}
            for i, c in enumerate(closes)]


def test_weekend_armed_weekly_cross_alert_does_not_fire_on_last_weeks_cross():
    c = _weekly(MON)
    assert alert_worker.cross_predates_arming(_alert("EURUSD"), c) is True
    assert main._check_indicator_alert(_alert("EURUSD"), c) is False
    # BTC يتداول بالعطلة: شمعة الأسبوع ما تزال جارية ⇒ مؤهّلة كما كانت
    assert alert_worker.cross_predates_arming(_alert("BTCUSD"), c) is False


def test_weekend_price_as_of_is_friday_close_not_fetch_time():
    fetched = SAT.timestamp()
    assert screener._price_as_of([{"time": MON}], "W", fetched, "EURUSD") == FRI_CLOSE_SUMMER
    assert screener._price_as_of([{"time": MON}], "W", fetched, "BTCUSD") == fetched
    series = main.ChartSeries(
        symbol="EURUSD", timeframe="W",
        candles=[main.Candle(time=MON, open=1, high=1, low=1, close=1)],
        change_pct=0, last=1.0,
        data_source=main.DataProvenance(kind="provider", as_of=fetched, channel="twelvedata"),
    )
    assert main._series_price_at(series) == FRI_CLOSE_SUMMER


def test_search_added_iso_pairs_close_friday_like_the_majors():
    """USDMXN/EURSEK/XAUEUR من البحث تُطلب أزواج فوركس (`td_symbol`) — كانت «مجهولة الجلسة» فلا قصّ."""
    for sym in ("USDMXN", "EURSEK", "XAUEUR"):
        assert market.bar_end(sym, MON, W) == FRI_CLOSE_SUMMER, sym
        assert alert_worker.cross_predates_arming(_alert(sym), _weekly(MON)) is True, sym
    assert market.bar_end("USDUSD", MON, W) == MON + W  # ليس زوجاً
