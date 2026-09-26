"""إعداد pytest: يضيف مجلد backend/ لمسار الاستيراد.

الوحدات بـbackend (indicators.py، commissions.py، ...) تُستورَد بأسلوب مسطّح
(`import indicators`) كما يفعل main.py فعلاً — نفس الأسلوب هنا حتى تعمل
الاختبارات بلا حاجة لحزمة/`__init__.py` جديدة أو تغيير بنية الاستيراد الحالية.
"""
from __future__ import annotations

import os
import sys

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if _BACKEND_DIR not in sys.path:
    sys.path.insert(0, _BACKEND_DIR)


import pytest


@pytest.fixture(autouse=True)
def _fresh_quote_cache():
    """كاش `/api/market/quote` على مستوى الوحدة — يُفرَّغ لكل اختبار كي لا يتسرّب سعر بين الاختبارات."""
    import main

    main._QUOTE_CACHE.clear()
    yield
    main._QUOTE_CACHE.clear()


@pytest.fixture(autouse=True)
def _no_weekend_close_filter(monkeypatch):
    """اختبارات كثيرة تبني اقتباسات EURUSD بوقت «الآن»: إسقاط شموع/اقتباسات العطلة (run 59) كان سيُفشلها
    كل سبت. `tests/test_weekend_bars_r59.py` يعيد تفعيله ويثبّت الساعة."""
    import twelve_data

    monkeypatch.setattr(twelve_data, "WEEKEND_CLOSE_FILTER", False)


@pytest.fixture(autouse=True)
def _no_candle_disk(monkeypatch):
    """نسخة القرص من كاش الشموع معطّلة بالاختبارات — كانت ستحمّل شموع تشغيل سابق (أو الخادم المحلي) لاختبار
    يتوقّع كاشاً فارغاً. `tests/test_candle_disk_cache.py` يفعّلها بمسار مؤقّت."""
    import twelve_data

    monkeypatch.setattr(twelve_data, "CANDLE_DISK", None)
    monkeypatch.setattr(twelve_data, "_disk_checked", set())
    monkeypatch.setattr(twelve_data, "_base_at", {})
    monkeypatch.setattr(twelve_data, "_quote_marks", {})


@pytest.fixture(autouse=True)
def _fresh_ws_order(monkeypatch):
    """ترتيب تيكات الـWS بوقت المزوّد (run 91) حالة على مستوى الوحدة — لا تتسرّب بين الاختبارات."""
    import twelve_data_ws

    monkeypatch.setattr(twelve_data_ws, "_PROVIDER_TS", {})
