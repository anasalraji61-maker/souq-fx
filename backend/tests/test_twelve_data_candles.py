"""`twelve_data` كان **بلا اختبار واحد** وهو طبقة المزوّد خلف كل شارت بالتطبيق.

**العيب الأكبر**: صفّ الشمعة كان يُبنى داخل حلقة بلا حارس (`float(row["open"])` …)، فقيمة
`null` واحدة — يرسلها المزوّد بالعطلات وأعطاله العابرة — ترمي `TypeError` من الدالّة كلّها،
و`build_series` يلتقط كل استثناء بـ`except Exception: pass` فيبني **سلسلة بذرية عشوائية**:
59 شمعة حقيقية تُلقى ويُعرض مكانها مسار مولَّد و«سعر» مخترَع. صفٌّ واحد معطوب = شارت
المتداول كلّه بيانات غير حقيقية.

ومعه: وقتٌ لا يُقرأ كان يصير **`time.time()`** أي الآن، فبعد الفرز تصير تلك الشمعة **آخر
شمعة** بالشارت أي «آخر ما جرى بالسوق»؛ و`outputsize` غير الموجب كان يُرسَل حرفياً للمزوّد.

**بلا شبكة**: `httpx.Client` مُستبدَل بمزيّف يردّ جسم المزوّد من الذاكرة.
"""
from __future__ import annotations

import pytest

import main
import twelve_data as market


def _rows(n: int = 6) -> list[dict]:
    return [
        {
            "datetime": f"2026-09-23 10:{i:02d}:00",
            "open": "1.1000", "high": "1.1050", "low": "1.0950",
            "close": "1.1020", "volume": "5",
        }
        for i in range(n)
    ]


class _FakeResponse:
    def __init__(self, payload: dict, status: int = 200):
        self._payload = payload
        self.status_code = status

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return self._payload


class _FakeClient:
    def __init__(self, sink: dict, payload: dict, status: int = 200, **_kw):
        self._sink, self._payload, self._status = sink, payload, status

    def __enter__(self):
        return self

    def __exit__(self, *_exc):
        return False

    def get(self, url, params=None, **_kw):
        self._sink["params"] = dict(params or {})
        return _FakeResponse(self._payload, self._status)


@pytest.fixture()
def provider(monkeypatch):
    """يردّ ما يوضع بـ`box['payload']`، ويلتقط ما أُرسل للمزوّد. الكاش مُفرَّغ لكل اختبار."""
    box: dict = {"payload": {"values": _rows()}, "sink": {}}
    monkeypatch.setattr(market, "_api_key", lambda: "test-key")
    monkeypatch.setattr(market, "_cache", {})
    monkeypatch.setattr(
        market.httpx, "Client",
        lambda **kw: _FakeClient(box["sink"], box["payload"], **{k: v for k, v in kw.items() if k == "x"}),
    )
    return box


# ------------------------- صفّ معطوب لا يُلغي الشموع السليمة

@pytest.mark.parametrize(
    "broken",
    [
        {"open": None},                      # null من المزوّد
        {"close": "not-a-number"},
        {"high": float("nan")},
        {"low": "Infinity"},
        {"datetime": "لا وقت"},
    ],
)
def test_one_broken_row_does_not_discard_the_real_candles(provider, broken):
    rows = _rows(6)
    rows[3] = {**rows[3], **broken}
    provider["payload"] = {"values": rows}
    candles, meta = market.fetch_time_series_with_meta("EURUSD", "15m", 180)
    assert len(candles) == 5, "الصفّ المعطوب وحده يُسقَط"
    assert meta["kind"] == "provider", "ما بقي شموع حقيقية لا بيانات تجريبية"


def test_a_missing_field_drops_only_its_row(provider):
    rows = _rows(4)
    del rows[1]["close"]
    provider["payload"] = {"values": rows}
    candles, _ = market.fetch_time_series_with_meta("EURUSD", "15m", 180)
    assert len(candles) == 3


def test_the_chart_stays_real_instead_of_turning_into_a_demo_walk(provider):
    """الأثر النهائي كما يراه المتداول: كان `kind` يصير `demo` بسلسلة مولَّدة كاملة."""
    rows = _rows(6)
    rows[2] = {**rows[2], "open": None}
    provider["payload"] = {"values": rows}
    series = main.build_series("EURUSD", "15m", 180)
    assert series.data_source.kind == "provider"
    assert len(series.candles) == 5
    assert series.last == pytest.approx(1.1020)


def test_every_row_broken_is_an_error_not_an_invented_series(provider):
    provider["payload"] = {"values": [{**r, "close": None} for r in _rows(4)]}
    with pytest.raises(RuntimeError, match="no usable candles"):
        market.fetch_time_series_with_meta("EURUSD", "15m", 180)


def test_an_all_broken_response_is_not_cached(provider):
    """القائمة الفارغة لو خُزِّنت لأُعيدت طوال الـTTL، فيبقى عطل عابر ربع ساعة."""
    provider["payload"] = {"values": [{**r, "close": None} for r in _rows(4)]}
    with pytest.raises(RuntimeError):
        market.fetch_time_series_with_meta("EURUSD", "15m", 180)
    provider["payload"] = {"values": _rows(4)}
    candles, meta = market.fetch_time_series_with_meta("EURUSD", "15m", 180)
    assert len(candles) == 4 and meta["kind"] == "provider"


def test_dropped_rows_are_counted_for_the_status_page(provider):
    market._stats["rows_dropped"] = 0
    rows = _rows(6)
    rows[1] = {**rows[1], "open": None}
    rows[4] = {**rows[4], "open": None}
    provider["payload"] = {"values": rows}
    market.fetch_time_series_with_meta("EURUSD", "15m", 180)
    assert market._stats["rows_dropped"] == 2


# ------------------------------------- وقت لا يُقرأ لا يصير «الآن»

@pytest.mark.parametrize("bad", ["", "لا وقت", "23/09/2026", None])
def test_unreadable_datetime_is_none_not_now(bad):
    assert market._parse_ts(bad) is None


def test_a_timeless_row_never_becomes_the_latest_candle(provider):
    """كان يأخذ `time.time()` فيقف بعد الفرز **آخر** الشارت: «آخر ما جرى بالسوق»."""
    rows = _rows(4)
    rows[1] = {**rows[1], "datetime": "لا وقت", "close": "9.9999"}
    provider["payload"] = {"values": rows}
    candles, _ = market.fetch_time_series_with_meta("EURUSD", "15m", 180)
    assert len(candles) == 3
    assert candles[-1]["close"] != pytest.approx(9.9999)


def test_readable_dates_still_parse_both_shapes():
    assert market._parse_ts("2026-09-23 10:30:00") == 1790159400
    assert market._parse_ts("2026-09-23") == 1790121600


# --------------------------------------------- ما لم يتغيّر

def test_a_clean_response_is_untouched_and_sorted(provider):
    rows = list(reversed(_rows(5)))
    provider["payload"] = {"values": rows}
    candles, meta = market.fetch_time_series_with_meta("EURUSD", "15m", 180)
    assert len(candles) == 5
    assert [c["time"] for c in candles] == sorted(c["time"] for c in candles)
    assert meta["kind"] == "provider"
    assert candles[0]["volume"] == 5.0


def test_volume_is_optional_and_never_breaks_a_row(provider):
    rows = _rows(3)
    rows[0] = {k: v for k, v in rows[0].items() if k != "volume"}
    rows[1] = {**rows[1], "volume": None}
    rows[2] = {**rows[2], "volume": "x"}
    provider["payload"] = {"values": rows}
    candles, _ = market.fetch_time_series_with_meta("EURUSD", "15m", 180)
    assert len(candles) == 3, "الحجم ليس سعراً — غيابه لا يُسقط شمعة"
    # الفوركس بلا فوليوم مركزي: الغائب None لا 0.0 («لم يُتداول شيء» رقماً مخترَعاً)
    assert [c["volume"] for c in candles] == [None, None, None]


def test_real_zero_volume_stays_zero_and_negative_is_dropped(provider):
    rows = _rows(3)
    rows[0] = {**rows[0], "volume": "0"}
    rows[1] = {**rows[1], "volume": "-3"}
    rows[2] = {**rows[2], "volume": "12.5"}
    provider["payload"] = {"values": rows}
    candles, _ = market.fetch_time_series_with_meta("EURUSD", "15m", 180)
    assert sorted(c["volume"] for c in candles if c["volume"] is not None) == [0.0, 12.5]
    assert sum(c["volume"] is None for c in candles) == 1


def test_chart_route_sends_null_volume_for_forex(provider):
    from fastapi.testclient import TestClient
    import main
    rows = [{k: v for k, v in r.items() if k != "volume"} for r in _rows(60)]
    provider["payload"] = {"values": rows}
    body = TestClient(main.app).get("/api/charts/EURUSD?timeframe=15m").json()
    assert body["candles"] and all(c["volume"] is None for c in body["candles"])


@pytest.mark.parametrize("asked,sent", [(-5, "1"), (0, "1"), (180, "180"), (99_999, "5000")])
def test_outputsize_never_leaves_as_a_non_positive_number(provider, asked, sent):
    market.fetch_time_series_with_meta("EURUSD", "15m", asked)
    assert provider["sink"]["params"]["outputsize"] == sent


# ------------------------- سعر غير موجب أو شمعة مستحيلة ليست سوقاً

@pytest.mark.parametrize(
    "bad",
    [
        {"low": "0"},                        # قاع صفري: «انهيار −100%»
        {"close": "-1.1"},
        {"open": "0.0"},
        {"high": "1.0900", "low": "1.1000"},  # القمّة تحت القاع
        {"high": "1.1010"},                  # القمّة تحت الإغلاق 1.1020
        {"low": "1.1010"},                   # القاع فوق الافتتاح 1.1000
    ],
)
def test_non_positive_or_impossible_candle_is_dropped(provider, bad):
    rows = _rows(6)
    rows[3] = {**rows[3], **bad}
    provider["payload"] = {"values": rows}
    candles, meta = market.fetch_time_series_with_meta("EURUSD", "15m", 180)
    assert len(candles) == 5, "الصفّ المستحيل وحده يُسقَط"
    assert all(min(c["open"], c["high"], c["low"], c["close"]) > 0 for c in candles)
    assert all(c["low"] <= min(c["open"], c["close"]) <= max(c["open"], c["close"]) <= c["high"]
               for c in candles)
    assert meta["kind"] == "provider"


def test_a_zero_low_tail_does_not_fire_a_below_alert(provider, monkeypatch):
    """الأثر عند المتداول: ذيل `low=0` بشمعة 1m بعد التسليح كان يُطلق تنبيه «تحت 1.09» فوراً."""
    import time as _time

    import alert_worker

    now = int(_time.time())
    rows = [
        {"datetime": _time.strftime("%Y-%m-%d %H:%M:%S", _time.gmtime(now - 60 * (4 - i))),
         "open": "1.1000", "high": "1.1050", "low": "1.0950", "close": "1.1020"}
        for i in range(5)
    ]
    rows[3] = {**rows[3], "low": "0"}
    provider["payload"] = {"values": rows}
    q, candles = alert_worker._recent_minutes("EURUSD")
    armed = _time.strftime("%Y-%m-%dT%H:%M:%S+00:00", _time.gmtime(now - 600))
    alert = {"price": 1.09, "condition": "below", "ts": armed}
    assert not alert_worker._price_hit(alert, q or 1.1020, candles)
