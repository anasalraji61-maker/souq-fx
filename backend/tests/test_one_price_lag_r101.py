"""سعر منسوخ من فريم آخر يُختم بوقت السعر لا بوقت جلبه: 1m جُلب 09:58 وآخر شمعة فيه انتهت 09:53 (مزوّد
متأخّر) ⇒ شارت 1H كان يقول as_of 09:58 والـ1m يقول 09:53 للسعر نفسه."""
from __future__ import annotations

import twelve_data as market
from tests.test_one_price_tf_r89 import _ts, cache  # noqa: F401 — fixture


def _bar(t, c):
    return {"time": int(_ts(t)), "open": c, "high": c, "low": c, "close": c, "volume": None}


def test_copied_close_is_dated_by_its_bar_not_its_fetch(cache):
    as_of = _ts("2026-09-23 09:50:30")
    hours = [_bar("2026-09-23 08:00:00", 1.1000), _bar("2026-09-23 09:00:00", 1.1000)]
    market._cache["BTCUSD|1m|180"] = (
        _ts("2026-09-23 09:58:00"), [_bar("2026-09-23 09:51:00", 1.1010), _bar("2026-09-23 09:52:00", 1.1020)])
    rows, meta = market._with_newest_close("BTCUSD", "1H", hours, {"as_of": as_of})
    assert rows[-1]["close"] == 1.1020
    assert meta["as_of"] == _ts("2026-09-23 09:53:00"), "the 1m close existed at 09:53, not at its 09:58 fetch"


def test_lagging_copy_older_than_our_fetch_is_not_applied(cache):
    as_of = _ts("2026-09-23 09:54:00")
    hours = [_bar("2026-09-23 09:00:00", 1.1000)]
    market._cache["BTCUSD|1m|180"] = (_ts("2026-09-23 09:58:00"), [_bar("2026-09-23 09:52:00", 1.1020)])
    rows, meta = market._with_newest_close("BTCUSD", "1H", hours, {"as_of": as_of})
    assert rows[-1]["close"] == 1.1000 and meta["as_of"] == as_of
