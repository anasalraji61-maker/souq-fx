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
