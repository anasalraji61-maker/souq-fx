"""run 59: المزوّد يملأ عطلة الفوركس شموعاً (1m كل دقيقة من الجمعة 21:00 UTC، وشمعتا D للسبت والأحد) —
كانت تُعرض سعراً «حيّاً» بوقت السبت وتُطلق عليها التنبيهات، بينما `bar_end` يعدّ السوق مغلقاً."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

import pytest

import alert_worker
import twelve_data as market
from tests.test_quote_spread import _Resp, routes  # noqa: F401 — fixture
from tests.test_twelve_data_candles import provider  # noqa: F401 — fixture


@pytest.fixture(autouse=True)
def _filter_on(monkeypatch):
    monkeypatch.setattr(market, "WEEKEND_CLOSE_FILTER", True)


def _ts(s: str) -> float:
    return datetime.fromisoformat(s).replace(tzinfo=timezone.utc).timestamp()


@pytest.mark.parametrize("sym,when,step,dropped", [
    ("EURUSD", "2026-09-25 20:59", 60, False),   # آخر دقيقة قبل إغلاق الجمعة (صيفي 21:00 UTC)
    ("EURUSD", "2026-09-25 21:00", 60, True),
    ("EURUSD", "2026-09-27 20:59", 60, True),
    ("EURUSD", "2026-09-27 21:00", 60, False),   # افتتاح الأحد 17:00 نيويورك
    ("EURUSD", "2026-09-25 17:00", 14400, False),  # تعبر الإغلاق — تبقى
    ("EURUSD", "2026-09-25 21:00", 14400, True),
    ("EURUSD", "2026-11-27 21:30", 60, False),   # شتاءً الإغلاق 22:00 UTC
    ("EURUSD", "2026-11-29 20:00", 14400, False),  # تعبر افتتاح الشتاء 22:00
    ("EURUSD", "2026-11-29 16:00", 14400, True),
    ("EURUSD", "2026-09-25 00:00", 86400, False),  # D الجمعة
    ("EURUSD", "2026-09-26 00:00", 86400, True),   # D السبت
    ("EURUSD", "2026-09-27 00:00", 86400, True),   # D الأحد
    ("EURUSD", "2026-09-28 00:00", 86400, False),
    ("USDMXN", "2026-09-26 03:00", 60, True),      # زوج ISO
    ("XAUUSD", "2026-09-26 03:00", 60, True),
    ("BTCUSD", "2026-09-26 03:00", 60, False),     # يتداول بالعطلة
    ("AAPL", "2026-09-26 03:00", 60, False),       # جلسة مجهولة ⇒ لا إسقاط
    ("EURUSD", "2026-09-21 00:00", 604800, False),
])
def test_in_weekend_close(sym, when, step, dropped):
    assert market.in_weekend_close(sym, _ts(when), step) is dropped


def _minutes(start: str, n: int) -> list[dict]:
    t0 = datetime.fromisoformat(start)
    return [{"datetime": (t0 + timedelta(minutes=i)).strftime("%Y-%m-%d %H:%M:%S"),
             "open": "1.139", "high": "1.14", "low": "1.138", "close": "1.139"} for i in range(n)]


def test_weekend_minutes_are_not_served(provider):  # noqa: F811
    provider["payload"] = {"values": _minutes("2026-09-25 20:50", 300)}
    candles, _ = market.fetch_time_series_with_meta("EURUSD", "1m", 300)
    assert len(candles) == 10
    assert candles[-1]["time"] == _ts("2026-09-25 20:59")


def test_crypto_weekend_minutes_kept(provider):  # noqa: F811
    provider["payload"] = {"values": _minutes("2026-09-25 20:50", 300)}
    candles, _ = market.fetch_time_series_with_meta("BTCUSD", "1m", 300)
    assert len(candles) == 300
    assert provider["sink"]["params"]["outputsize"] == "300"


def test_request_covers_the_dropped_weekend(provider):  # noqa: F811
    """120 شمعة 15m صباح الاثنين: الطلب يزيد بعدد شموع العطلة كي تبقى 120 بعد الإسقاط."""
    assert int(market._weekend_allowance("EURUSD", "15m", 120)) >= 49 * 4
    provider["payload"] = {"values": _minutes("2026-09-24 00:00", 1)}
    market.fetch_time_series_with_meta("EURUSD", "15m", 120)
    assert int(provider["sink"]["params"]["outputsize"]) == 120 + market._weekend_allowance("EURUSD", "15m", 120)
    assert market._weekend_allowance("EURUSD", "W", 50) == 0


SAT = "2026-09-26 01:43"
WED = "2026-09-23 10:00"


def test_weekend_quote_is_no_quote(routes):  # noqa: F811
    """المزوّد يقول `is_market_open: true` بتيك السبت ⇒ لا اقتباس (المسار يعود لإغلاق الجمعة بوقته)."""
    routes["/quote"] = _Resp({"close": "1.13916", "last_quote_at": int(_ts(SAT)), "is_market_open": True})
    assert market.fetch_quote_book("EURUSD") is None
    routes["/quote"] = _Resp({"close": "1.13916", "last_quote_at": int(_ts(WED))})
    assert market.fetch_quote_book("EURUSD")["price"] == pytest.approx(1.13916)
    routes["/quote"] = _Resp({"close": "65000", "last_quote_at": int(_ts(SAT))})
    assert market.fetch_quote_book("BTCUSD")["price"] == pytest.approx(65000)


@pytest.mark.parametrize("when,served", [(SAT, False), (WED, True)])
def test_untimed_price_on_weekend_is_no_price(routes, monkeypatch, when, served):  # noqa: F811
    monkeypatch.setattr(market, "_session_now", lambda: _ts(when))
    routes["/quote"] = _Resp({}, 429)
    routes["/price"] = _Resp({"price": "1.1"})
    assert (market.fetch_quote("EURUSD") is not None) is served


@pytest.mark.parametrize("when,served", [(SAT, False), (WED, True)])
def test_weekend_ws_tick_does_not_feed_alerts(monkeypatch, when, served):
    monkeypatch.setattr(alert_worker.market, "fetch_quote_book", lambda s: None)
    monkeypatch.setattr(alert_worker.td_ws, "snapshot", lambda max_age=180: {"EURUSD": 1.0950})
    monkeypatch.setattr(alert_worker.td_ws, "received_at", lambda syms: {"EURUSD": _ts(when)})
    assert (alert_worker._price_at("EURUSD")[0] is not None) is served


def test_ws_ticks_drop_weekend_forex(monkeypatch):
    from fastapi.testclient import TestClient

    import main
    monkeypatch.setattr(main.td_ws, "recent_snapshot", lambda: ({"EURUSD": 1.139, "BTCUSD": 65000.0}, _ts(SAT)))
    monkeypatch.setattr(main.td_ws, "received_at", lambda syms: {s: _ts(SAT) for s in syms})
    with TestClient(main.app).websocket_connect("/ws/ticks") as ws:
        msg = ws.receive_json()
    assert msg["ticks"] == {"BTCUSD": 65000.0}


def test_ws_ticks_as_of_is_newest_sent_tick(monkeypatch):
    """run 67: `as_of` كان وقت أحدث تيك **قبل** إسقاط العطلة ⇒ BTC (قبل 90 ث) يحمل وقت تيك يورو دولار محذوف."""
    from fastapi.testclient import TestClient

    import main
    at = {"EURUSD": _ts(SAT), "BTCUSD": _ts(SAT) - 90}
    monkeypatch.setattr(main.td_ws, "recent_snapshot", lambda: ({"EURUSD": 1.139, "BTCUSD": 65000.0}, _ts(SAT)))
    monkeypatch.setattr(main.td_ws, "received_at", lambda syms: {s: at[s] for s in syms})
    with TestClient(main.app).websocket_connect("/ws/ticks") as ws:
        msg = ws.receive_json()
    assert msg["ticks"] == {"BTCUSD": 65000.0}
    assert msg["data_source"]["as_of"] == _ts(SAT) - 90


FRI_LAST = "2026-09-25 20:59"  # آخر دقيقة قبل إغلاق الجمعة


@pytest.mark.parametrize("sym,now,says,expected", [
    ("EURUSD", SAT, True, False),     # المزوّد يقول مفتوح يوم السبت — ساعتنا تقول مغلق
    ("EURUSD", SAT, None, False),
    ("EURUSD", WED, True, True),
    ("EURUSD", WED, False, False),
    ("EURUSD", WED, None, None),      # لا يقول ⇒ لا تخمين خارج العطلة
    ("BTCUSD", SAT, True, True),      # الكريبتو بلا عطلة
])
def test_friday_quote_served_on_saturday_is_not_market_open(routes, monkeypatch, sym, now, says, expected):  # noqa: F811
    monkeypatch.setattr(market, "_session_now", lambda: _ts(now))
    body = {"close": "1.13913", "last_quote_at": int(_ts(FRI_LAST if now == SAT else now))}
    if says is not None:
        body["is_market_open"] = says
    routes["/quote"] = _Resp(body)
    q = market.fetch_quote_book(sym)
    assert q is not None and q["market_open"] is expected
