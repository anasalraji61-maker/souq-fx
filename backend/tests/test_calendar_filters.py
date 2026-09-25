"""اختبارات فلاتر التقويم الاقتصادي — بلا شبكة إطلاقاً.

`fetch_calendar` يجلب من ForexFactory حين تكون ذاكرته فارغة أو منتهية، فكل اختبار هنا
يحقن الذاكرة (`_CACHE`/`_CACHE_TS`) بأحداث معلومة: لا طلب خارجي، ولا رهان على أسبوع
التقويم الحقيقي الذي يتغيّر كل يوم.
"""
from __future__ import annotations

import time

import pytest

import econ_calendar as cal

_EVENTS = [
    {"id": "a", "title": "NFP", "currency": "USD", "impact": "high", "when": "الجمعة", "ts": 3},
    {"id": "b", "title": "ECB", "currency": "EUR", "impact": "high", "when": "الخميس", "ts": 2},
    {"id": "c", "title": "PMI", "currency": "EUR", "impact": "medium", "when": "الاثنين", "ts": 1},
    {"id": "d", "title": "Holiday", "currency": "JPY", "impact": "low", "when": "الثلاثاء", "ts": 4},
]


@pytest.fixture()
def seeded(monkeypatch):
    """ذاكرة محقونة وحديثة — فلا يلمس `fetch_calendar` الشبكة."""
    monkeypatch.setattr(cal, "_CACHE", [dict(e) for e in _EVENTS])
    monkeypatch.setattr(cal, "_CACHE_TS", time.time())
    monkeypatch.setattr(cal, "_FAIL_TS", 0.0)
    return cal


def _titles(events) -> list[str]:
    return [e["title"] for e in events]


def test_one_currency_still_filters_as_before(seeded):
    assert _titles(seeded.fetch_calendar(currency="USD")) == ["NFP"]


def test_several_currencies_are_accepted(seeded):
    """المتداول على EURUSD يهمّه العملتان معاً — وكانت القيمة الواحدة تعني طلبين أو تصفية
    بالجهاز بعد جلب الأسبوع كلّه."""
    assert _titles(seeded.fetch_calendar(currency="EUR,USD")) == ["NFP", "ECB", "PMI"]


def test_several_impacts_are_accepted(seeded):
    """«متوسط فما فوق» شرطان لا شرط."""
    assert _titles(seeded.fetch_calendar(impact="high,medium")) == ["NFP", "ECB", "PMI"]


def test_the_two_filters_combine(seeded):
    assert _titles(seeded.fetch_calendar(currency="EUR,JPY", impact="high,low")) == ["ECB", "Holiday"]


@pytest.mark.parametrize("raw", ["eur,usd", " EUR , usd ", "Eur,Usd"])
def test_case_and_spacing_do_not_matter(seeded, raw):
    assert len(seeded.fetch_calendar(currency=raw)) == 3


@pytest.mark.parametrize("raw", ["", ",", " ", "ALL", "all,"])
def test_an_empty_or_all_filter_means_no_filtering(seeded, raw):
    """«الكل» بالواجهة يُرسَل بلا قيمة اليوم — ولو أُرسل حرفياً فليس اسم عملة."""
    assert len(seeded.fetch_calendar(currency=raw)) == 4


def test_an_unknown_currency_still_returns_nothing(seeded):
    """الفلتر يبقى فلتراً: عملة لا حدث لها = قائمة فارغة، لا «كل الأحداث»."""
    assert seeded.fetch_calendar(currency="XAU") == []


def test_filtering_does_not_mutate_the_cache(seeded):
    """الذاكرة مشتركة بين كل الطلبات — طلبٌ مفلتر كان سيُفقر تقويم البقية لو عدّلها."""
    seeded.fetch_calendar(currency="USD", impact="high")
    assert len(seeded._CACHE) == 4
    assert len(seeded.fetch_calendar()) == 4


# ─── المصدر المتعذّر: لا أحداث مخترَعة ────────────────────────────────────────

def test_failed_source_returns_no_invented_events_and_says_unavailable(monkeypatch):
    class _Boom:
        def __init__(self, *a, **k):
            raise RuntimeError("offline")

    monkeypatch.setattr(cal.httpx, "Client", _Boom)
    monkeypatch.setattr(cal, "_CACHE", [])
    monkeypatch.setattr(cal, "_CACHE_TS", 0.0)
    monkeypatch.setattr(cal, "_FAIL_TS", 0.0)
    assert cal.fetch_calendar() == []
    st = cal.calendar_status()
    assert st["status"] == "unavailable" and st["as_of"]
    assert not hasattr(cal, "FALLBACK")


def test_failed_source_is_not_hammered_on_every_request(monkeypatch):
    calls = {"n": 0}

    class _Boom:
        def __init__(self, *a, **k):
            calls["n"] += 1
            raise RuntimeError("offline")

    monkeypatch.setattr(cal.httpx, "Client", _Boom)
    monkeypatch.setattr(cal, "_CACHE", [])
    monkeypatch.setattr(cal, "_CACHE_TS", 0.0)
    monkeypatch.setattr(cal, "_FAIL_TS", 0.0)
    cal.fetch_calendar()
    cal.fetch_calendar()
    assert calls["n"] == 1


def test_calendar_route_reports_status(seeded):
    from fastapi.testclient import TestClient

    import main

    body = TestClient(main.app).get("/api/calendar").json()
    assert body["status"] == "ok" and len(body["events"]) == 4


# ------------------------- المصدر يفشل بعد جلب ناجح: الأسبوع الحقيقي لا يُمسح

class _Boom:
    calls = 0

    def __init__(self, *a, **k):
        type(self).calls += 1
        raise RuntimeError("ForexFactory 429")


def _expired_week(monkeypatch, age: float):
    """أسبوع حقيقي جُلب قبل `age` ثانية (بعد انتهاء TTL) والمصدر يفشل الآن."""
    _Boom.calls = 0
    monkeypatch.setattr(cal.httpx, "Client", _Boom)
    monkeypatch.setattr(cal, "_CACHE", [dict(e) for e in _EVENTS])
    monkeypatch.setattr(cal, "_CACHE_TS", time.time() - age)
    monkeypatch.setattr(cal, "_FAIL_TS", 0.0)


def test_failed_refresh_keeps_the_real_week_with_its_fetch_time(monkeypatch):
    """كان الفشل يكتب `_CACHE = []`: 429 عابر بعد 30 دقيقة ⇒ التقويم وشريط «خبر قوي قريب» فارغان."""
    _expired_week(monkeypatch, cal.TTL + 60)
    fetched_at = cal._CACHE_TS
    events = cal.fetch_calendar(impact="high")
    assert _Boom.calls == 1, "حاول المصدر فعلاً"
    assert {e["title"] for e in events} == {"NFP", "ECB"}
    st = cal.calendar_status()
    assert st["status"] == "ok"
    assert st["as_of"] == fetched_at, "وقت الجلب الحقيقي لا وقت المحاولة"
    assert st["stale"] is True


def test_failed_refresh_backs_off_then_retries(monkeypatch):
    _expired_week(monkeypatch, cal.TTL + 60)
    cal.fetch_calendar()
    cal.fetch_calendar()
    assert _Boom.calls == 1, "لا قصف للمصدر المعطّل بكل طلب"
    monkeypatch.setattr(cal, "_FAIL_TS", time.time() - cal.FAILURE_TTL - 1)
    cal.fetch_calendar()
    assert _Boom.calls == 2, "يُعاد المحاولة بعد FAILURE_TTL"


def test_week_older_than_stale_max_is_not_served(monkeypatch):
    _expired_week(monkeypatch, cal.STALE_MAX + 60)
    assert cal.fetch_calendar() == []
    st = cal.calendar_status()
    assert st["status"] == "unavailable" and st["stale"] is False


def test_successful_refresh_clears_stale(monkeypatch):
    _expired_week(monkeypatch, cal.TTL + 60)
    cal.fetch_calendar()
    assert cal.calendar_status()["stale"] is True
    monkeypatch.setattr(cal, "_parse_ff_json", lambda text: [dict(_EVENTS[0])])

    class _Resp:
        status_code = 200
        text = "[]"

    class _Ok:
        def __init__(self, *a, **k):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def get(self, *a, **k):
            return _Resp()

    monkeypatch.setattr(cal.httpx, "Client", _Ok)
    monkeypatch.setattr(cal, "_FAIL_TS", time.time() - cal.FAILURE_TTL - 1)
    assert [e["title"] for e in cal.fetch_calendar()] == ["NFP"]
    st = cal.calendar_status()
    assert st["stale"] is False and time.time() - st["as_of"] < 5
