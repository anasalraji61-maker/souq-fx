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
