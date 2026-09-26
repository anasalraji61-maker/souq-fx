"""W1 (قرار ١٦): قائمة المتابعة تعرض إغلاق شمعة D من `/api/charts` (`useLastCloses`) والشارت يعرض
آخر شمعة فريمه — «مصدر واحد» يعني أن الرقمين متساويان والسوق مغلق. صفوف المزوّد الحقيقية لليورو دولار
(demo، السبت 2026-09-26): بلا إسقاط العطلة كانت D تعطي 1.13915 (شمعة السبت) و15m ‏1.13909 و1H ‏1.13909 —
ثلاثة أرقام لسعر واحد. بعد الإسقاط كلها إغلاق الجمعة 17:00 نيويورك = 1.13913."""
from __future__ import annotations

import pytest

import main
import twelve_data as market
from tests.test_twelve_data_candles import provider  # noqa: F401 — fixture

FRIDAY_CLOSE = 1.13913

ROWS = {
    "D": [
        ("2026-09-23", "1.14491", "1.1451", "1.13706", "1.13847"),
        ("2026-09-24", "1.13841", "1.1399", "1.13598", "1.13811"),
        ("2026-09-25", "1.13809", "1.14097", "1.13683", "1.13913"),
        ("2026-09-26", "1.13911", "1.13948", "1.13889", "1.13915"),
    ],
    "15m": [
        ("2026-09-25 20:00:00", "1.1396", "1.13974", "1.13934", "1.13941"),
        ("2026-09-25 20:15:00", "1.1394", "1.13949", "1.13925", "1.13927"),
        ("2026-09-25 20:30:00", "1.1393", "1.13954", "1.13921", "1.13937"),
        ("2026-09-25 20:45:00", "1.13942", "1.13942", "1.13908", "1.13913"),
        ("2026-09-25 21:00:00", "1.13911", "1.13942", "1.13895", "1.13939"),
        ("2026-09-25 21:15:00", "1.13937", "1.13941", "1.13894", "1.13908"),
        ("2026-09-25 21:30:00", "1.13929", "1.13948", "1.13889", "1.13942"),
        ("2026-09-25 21:45:00", "1.13942", "1.13944", "1.13891", "1.13941"),
        ("2026-09-25 22:00:00", "1.13938", "1.13944", "1.13891", "1.13936"),
        ("2026-09-25 22:15:00", "1.13933", "1.13943", "1.13891", "1.13911"),
        ("2026-09-25 22:30:00", "1.13937", "1.13943", "1.13891", "1.1391"),
        ("2026-09-25 22:45:00", "1.13934", "1.13943", "1.13891", "1.1391"),
        ("2026-09-25 23:00:00", "1.13937", "1.13943", "1.13891", "1.13941"),
        ("2026-09-25 23:15:00", "1.13938", "1.13944", "1.13893", "1.1391"),
        ("2026-09-25 23:30:00", "1.13937", "1.13942", "1.13891", "1.1394"),
        ("2026-09-25 23:45:00", "1.13938", "1.13944", "1.13891", "1.13909"),
        ("2026-09-26 00:00:00", "1.13937", "1.13944", "1.13893", "1.13916"),
    ],
    "1H": [
        ("2026-09-25 19:00:00", "1.13998", "1.14013", "1.13958", "1.13963"),
        ("2026-09-25 20:00:00", "1.1396", "1.13974", "1.13908", "1.13913"),
        ("2026-09-25 21:00:00", "1.13911", "1.13948", "1.13889", "1.13941"),
        ("2026-09-25 22:00:00", "1.13938", "1.13944", "1.13891", "1.1391"),
        ("2026-09-25 23:00:00", "1.13937", "1.13944", "1.13891", "1.13909"),
        ("2026-09-26 00:00:00", "1.13937", "1.13944", "1.13893", "1.13915"),
    ],
    "4H": [
        ("2026-09-25 13:00:00", "1.1402", "1.14097", "1.13864", "1.13935"),
        ("2026-09-25 17:00:00", "1.13933", "1.14013", "1.13878", "1.13913"),
        ("2026-09-25 21:00:00", "1.13911", "1.13948", "1.13889", "1.13915"),
    ],
}


@pytest.fixture(autouse=True)
def _filter_on(monkeypatch):
    monkeypatch.setattr(market, "WEEKEND_CLOSE_FILTER", True)


def _series(provider, tf):  # noqa: F811
    provider["payload"] = {"values": [
        {"datetime": r[0] if " " in r[0] else r[0] + " 00:00:00", "open": r[1], "high": r[2], "low": r[3], "close": r[4]}
        for r in ROWS[tf]
    ]}
    market._cache.clear()
    return main.build_series("EURUSD", tf, 50)


@pytest.mark.parametrize("tf", ["D", "15m", "1H", "4H"])
def test_every_timeframe_ends_on_the_friday_close(provider, tf):  # noqa: F811
    s = _series(provider, tf)
    assert s.data_source.kind == "provider"
    assert s.last == pytest.approx(FRIDAY_CLOSE)


def test_without_the_weekend_drop_the_numbers_disagree(provider, monkeypatch):  # noqa: F811
    """يثبت أن الاختبار أعلاه يقيس شيئاً: الصفوف نفسها بلا الإسقاط تعطي أرقاماً مختلفة."""
    monkeypatch.setattr(market, "WEEKEND_CLOSE_FILTER", False)
    lasts = {tf: _series(provider, tf).last for tf in ROWS}
    assert len(set(lasts.values())) > 1


def _ts(s: str) -> float:
    from datetime import datetime, timezone
    return datetime.fromisoformat(s).replace(tzinfo=timezone.utc).timestamp()


@pytest.mark.parametrize("sym,fetched,until", [
    ("EURUSD", "2026-09-26 09:00", "2026-09-27 21:00"),   # السبت ⇒ حتى افتتاح الأحد 17:00 نيويورك
    ("EURUSD", "2026-09-25 21:06", "2026-09-27 21:00"),   # بعد مهلة الإغلاق
    ("EURUSD", "2026-09-25 21:02", None),                 # داخل مهلة الإغلاق
    ("EURUSD", "2026-09-25 20:00", None),                 # قبل الإغلاق
    ("EURUSD", "2026-09-27 21:00", None),                 # بعد الافتتاح
    ("EURUSD", "2026-11-28 09:00", "2026-11-29 22:00"),   # شتاءً
    ("XAUUSD", "2026-09-26 09:00", "2026-09-27 21:00"),
    ("BTCUSD", "2026-09-26 09:00", None),                 # يتداول بالعطلة
    ("AAPL", "2026-09-26 09:00", None),                   # جلسة مجهولة
])
def test_closed_until(sym, fetched, until):
    got = market._closed_until(sym, _ts(fetched))
    assert got == (_ts(until) if until else None)


def test_weekend_fetch_is_served_from_cache_until_reopen(provider, monkeypatch):  # noqa: F811
    """جلبٌ السبت يخدم طوال العطلة بلا طلب جديد (وبوقت الجلب الحقيقي)، ويُجلب من جديد بعد الافتتاح."""
    clock = {"t": _ts("2026-09-26 09:00")}
    monkeypatch.setattr(market.time, "time", lambda: clock["t"])
    _series(provider, "D")
    provider["sink"].clear()
    clock["t"] = _ts("2026-09-27 20:59")
    candles, meta = market.fetch_time_series_with_meta("EURUSD", "D", 50)
    assert provider["sink"] == {}, "لا طلب للمزوّد والسوق مغلق"
    assert meta == {"kind": "cache", "as_of": _ts("2026-09-26 09:00"), "channel": "twelvedata"}
    assert candles[-1]["close"] == pytest.approx(FRIDAY_CLOSE)
    clock["t"] = _ts("2026-09-27 21:01")
    _, meta = market.fetch_time_series_with_meta("EURUSD", "D", 50)
    assert meta["kind"] == "provider"


def test_provider_error_at_the_reopen_still_serves_the_friday_close(provider, monkeypatch):  # noqa: F811
    """run 80: شموع السبت عمرها ~36 ساعة عند افتتاح الأحد ⇒ خطأ/429 عنده (16 شمعة D للقائمة تنتهي معاً)
    كان يعيد «غير متاح». العمر يُعدّ من الافتتاح: 15 دقيقة سماح بإغلاق الجمعة الحقيقي ووقت جلبه الحقيقي."""
    clock = {"t": _ts("2026-09-26 09:00")}
    monkeypatch.setattr(market.time, "time", lambda: clock["t"])
    _series(provider, "D")
    provider["payload"] = {"status": "error", "code": 429, "message": "rate limit"}
    clock["t"] = _ts("2026-09-27 21:00") + 30
    candles, meta = market.fetch_time_series_with_meta("EURUSD", "D", 50)
    assert meta == {"kind": "cache", "as_of": _ts("2026-09-26 09:00"), "channel": "twelvedata"}
    assert candles[-1]["close"] == pytest.approx(FRIDAY_CLOSE)
    clock["t"] = _ts("2026-09-27 21:16")
    with pytest.raises(RuntimeError):
        market.fetch_time_series_with_meta("EURUSD", "D", 50)


# ─── run 84: الكاش بمفتاح الحجم كان يعطي الرمز نفسه سعرين بين قائمة المتابعة (D/50) والشارت (D/180) ───

def _rows_until(n: int, last_close: str) -> list[dict]:
    from datetime import datetime, timedelta
    t0 = datetime(2026, 9, 1)
    rows = [{"datetime": (t0 + timedelta(minutes=15 * i)).strftime("%Y-%m-%d %H:%M:%S"),
             "open": "1.1", "high": "1.2", "low": "1.0", "close": "1.1"} for i in range(n)]
    rows[-1]["close"] = last_close
    return rows


def _age_cache(seconds: float) -> None:
    for k, (at, c) in list(market._cache.items()):
        market._cache[k] = (at - seconds, c)


def test_watchlist_and_chart_sizes_give_one_last_price(provider):  # noqa: F811
    provider["payload"] = {"values": _rows_until(200, "1.1000")}
    chart, _ = market.fetch_time_series_with_meta("BTCUSD", "15m", 180)
    provider["payload"] = {"values": _rows_until(201, "1.1050")}  # السعر تحرّك بعد جلب الشارت
    watch, meta = market.fetch_time_series_with_meta("BTCUSD", "15m", 50)
    assert watch[-1]["close"] == chart[-1]["close"] == pytest.approx(1.1)
    assert meta["kind"] == "cache"


def test_provider_error_serves_the_other_size_instead_of_nothing(provider):  # noqa: F811
    """429/خطأ والقائمة لم تُخزَّن بعد ⇒ كانت «—» بجانب سعر الشارت الحقيقي."""
    provider["payload"] = {"values": _rows_until(200, "1.1000")}
    market.fetch_time_series_with_meta("BTCUSD", "15m", 180)
    _age_cache(market.CACHE_TTL["15m"] + 1)
    provider["payload"] = {"status": "error", "code": 429, "message": "limit"}
    watch, meta = market.fetch_time_series_with_meta("BTCUSD", "15m", 50)
    assert watch[-1]["close"] == pytest.approx(1.1) and meta["kind"] == "cache"


def test_a_fresh_small_fetch_updates_the_larger_cached_series(provider):  # noqa: F811
    provider["payload"] = {"values": _rows_until(320, "1.1000")}
    market.fetch_time_series_with_meta("BTCUSD", "15m", 300)
    _age_cache(market.CACHE_TTL["15m"] + 1)
    provider["payload"] = {"values": _rows_until(321, "1.1050")}  # شمعة جديدة
    small, _ = market.fetch_time_series_with_meta("BTCUSD", "15m", 180)
    before = market._stats["api_calls"]
    big, meta = market.fetch_time_series_with_meta("BTCUSD", "15m", 300)
    assert market._stats["api_calls"] == before and meta["kind"] == "cache"
    assert big[-1] == small[-1] and big[-1]["close"] == pytest.approx(1.105)
    assert len(big) == 300 and [c["time"] for c in big] == sorted({c["time"] for c in big})
