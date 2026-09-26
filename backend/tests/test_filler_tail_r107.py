"""run 107: إغلاق جُلب داخل فترة مغلقة (كسر يومي، جلسة عطلة، الأحد قبل الافتتاح) هو ملء المزوّد لا سعر تداول.
كان `_with_newest_close` ينسخه لشمعة D/W الجارية بـ`as_of` داخل الكسر، وشمعة 4H جارية فُتحت داخل العطلة تُعرض
«آخر سعر» قبل الافتتاح."""
from __future__ import annotations

from datetime import datetime, timezone

import pytest

import twelve_data as market


@pytest.fixture(autouse=True)
def _iso(monkeypatch):
    monkeypatch.setattr(market, "WEEKEND_CLOSE_FILTER", True)
    monkeypatch.setattr(market, "CANDLE_DISK", None)
    monkeypatch.setattr(market, "_cache", {})
    monkeypatch.setattr(market, "_quote_marks", {})


def _ts(s: str) -> float:
    return datetime.fromisoformat(s).replace(tzinfo=timezone.utc).timestamp()


def _bar(t: str, c: float) -> dict:
    return {"time": int(_ts(t)), "open": c, "high": c, "low": c, "close": c, "volume": None}


@pytest.mark.parametrize("sym,tf,target,as_of,src_tf,fetched,src_bar", [
    # برنت شتاءً: الكسر 23:00–01:00 UTC؛ 4H ‏00:00 جُلبت 00:30
    ("UKOIL", "D", "2026-01-14", "2026-01-13 22:00", "4H", "2026-01-14 00:30", "2026-01-14 00:00"),
    ("UKOIL", "W", "2026-01-12", "2026-01-13 22:00", "4H", "2026-01-14 00:30", "2026-01-14 00:00"),
    # ذهب شتاءً: الكسر 22:00–23:00 UTC؛ D المؤرَّخة 14 تبدأ 22:00 وجُلبت 22:30
    ("XAUUSD", "W", "2026-01-12", "2026-01-13 21:00", "D", "2026-01-13 22:30", "2026-01-14"),
    # 4H ذهب 20:00 تعبر الكسر وجُلبت داخله (`bar_end` يقصّها 22:00 لكن إغلاقها تيك 22:29)
    ("XAUUSD", "W", "2026-01-12", "2026-01-13 21:00", "4H", "2026-01-13 22:30", "2026-01-13 20:00"),
    # جلسة عطلة 25 ديسمبر (الأربعاء) 22:00 الثلاثاء ⇒ 22:00 الأربعاء
    ("EURUSD", "W", "2030-12-23", "2030-12-24 20:00", "4H", "2030-12-25 21:00", "2030-12-25 20:00"),
])
def test_close_fetched_inside_closed_window_is_not_copied(sym, tf, target, as_of, src_tf, fetched, src_bar):
    market._cache[f"{sym}|{src_tf}|120"] = (_ts(fetched), [_bar(src_bar, 99.0)])
    rows, meta = market._with_newest_close(sym, tf, [_bar(target, 1.0)], {"as_of": _ts(as_of)})
    assert rows[-1]["close"] == 1.0 and meta["as_of"] == _ts(as_of)


def test_close_fetched_after_break_is_still_copied():
    # الكسر نفسه لكن جُلبت 23:30 بعد نهايته ⇒ آخر تيك حقيقي
    market._cache["XAUUSD|15m|120"] = (_ts("2026-01-13 23:30"), [_bar("2026-01-13 23:15", 99.0)])
    rows, meta = market._with_newest_close("XAUUSD", "W", [_bar("2026-01-12", 1.0)], {"as_of": _ts("2026-01-13 21:00")})
    assert rows[-1]["close"] == 99.0 and meta["as_of"] == _ts("2026-01-13 23:30")


def test_bar_ending_before_break_fetched_inside_it_is_copied_at_its_end():
    # 1H ذهب 21:00 انتهت 22:00 مع بداية الكسر ⇒ إغلاقها حقيقي، مختوم 22:00
    market._cache["XAUUSD|1H|120"] = (_ts("2026-01-13 22:30"), [_bar("2026-01-13 21:00", 99.0)])
    rows, meta = market._with_newest_close("XAUUSD", "W", [_bar("2026-01-12", 1.0)], {"as_of": _ts("2026-01-13 21:00")})
    assert rows[-1]["close"] == 99.0 and meta["as_of"] == _ts("2026-01-13 22:00")


def _serve(monkeypatch, now: str, rows: list[str]):
    class _R:
        status_code = 200

        def raise_for_status(self):
            pass

        def json(self):
            return {"status": "ok", "values": [
                {"datetime": t + ":00", "open": "1.1", "high": "1.1", "low": "1.1", "close": "1.1"} for t in rows]}

    class _C:
        def __init__(self, *a, **k):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def get(self, *a, **k):
            return _R()

    monkeypatch.setattr(market, "_api_key", lambda: "k")
    monkeypatch.setattr(market.httpx, "Client", _C)
    monkeypatch.setattr(market.time, "time", lambda: _ts(now))


def test_forming_bar_that_is_all_filler_is_dropped(monkeypatch):
    # الأحد 11-01-2026: الافتتاح 22:00 UTC؛ 4H ‏20:00 جُلبت 21:00 = ساعة ملء عطلة فقط
    _serve(monkeypatch, "2026-01-11 21:00", ["2026-01-09 16:00", "2026-01-11 20:00"])
    candles = market.fetch_time_series("EURUSD", "4H", 2)
    assert [c["time"] for c in candles] == [_ts("2026-01-09 16:00")]


def test_forming_bar_after_reopen_is_kept(monkeypatch):
    _serve(monkeypatch, "2026-01-11 22:30", ["2026-01-09 16:00", "2026-01-11 20:00"])
    candles = market.fetch_time_series("EURUSD", "4H", 2)
    assert [c["time"] for c in candles] == [_ts("2026-01-09 16:00"), _ts("2026-01-11 20:00")]


def test_forming_bar_opened_before_break_is_kept_after_the_break(monkeypatch):
    # run 110: 4H ذهب 20:00 جُلبت 22:30 داخل الكسر = إغلاقها تيك 22:29 (ملء) ⇒ تُسقَط حتى الجلب بعد الكسر
    _serve(monkeypatch, "2026-01-13 22:30", ["2026-01-13 16:00", "2026-01-13 20:00"])
    candles = market.fetch_time_series("XAUUSD", "4H", 2)
    assert candles[-1]["time"] == _ts("2026-01-13 16:00")
    monkeypatch.setattr(market, "_cache", {})
    _serve(monkeypatch, "2026-01-13 23:05", ["2026-01-13 16:00", "2026-01-13 20:00"])
    candles = market.fetch_time_series("XAUUSD", "4H", 2)
    assert candles[-1]["time"] == _ts("2026-01-13 20:00")


@pytest.mark.parametrize("sym,tf,now,bars,last", [
    # D المؤرَّخة 30-09 تُفتح 17:00 نيويورك = بداية كسر الذهب صيفاً (21:00–22:00 UTC)
    ("XAUUSD", "D", "2026-09-29 21:30", ["2026-09-29 00:00", "2026-09-30 00:00"], "2026-09-29 00:00"),
    # الأحد 21:30 UTC: D الاثنين فُتحت 17:00 نيويورك وCME يفتح 18:00
    ("XAUUSD", "D", "2026-09-27 21:30", ["2026-09-25 00:00", "2026-09-28 00:00"], "2026-09-25 00:00"),
    # 4H برنت 20:00 جُلبت 23:30 صيفاً (الكسر 22:00–00:00 UTC)
    ("UKOIL", "4H", "2026-09-29 23:30", ["2026-09-29 16:00", "2026-09-29 20:00"], "2026-09-29 16:00"),
    # خارج الكسر تبقى الجارية
    ("XAUUSD", "D", "2026-09-29 20:30", ["2026-09-28 00:00", "2026-09-29 00:00"], "2026-09-29 00:00"),
    ("UKOIL", "4H", "2026-09-29 21:30", ["2026-09-29 16:00", "2026-09-29 20:00"], "2026-09-29 20:00"),
])
def test_forming_bar_during_daily_break_is_dropped(monkeypatch, sym, tf, now, bars, last):
    _serve(monkeypatch, now, bars)
    candles = market.fetch_time_series(sym, tf, 2)
    assert candles[-1]["time"] == _ts(last)


def test_friday_forming_bar_kept_over_the_weekend(monkeypatch):
    # 4H اليورو 20:00 الجمعة جُلبت 21:30 بعد الإغلاق (صيفاً 21:00): بياناتها حقيقية حتى الإغلاق وتُخزَّن حتى الافتتاح
    _serve(monkeypatch, "2026-09-25 21:30", ["2026-09-25 16:00", "2026-09-25 20:00"])
    candles = market.fetch_time_series("EURUSD", "4H", 2)
    assert candles[-1]["time"] == _ts("2026-09-25 20:00")
