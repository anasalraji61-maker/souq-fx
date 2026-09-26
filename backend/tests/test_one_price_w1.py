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
