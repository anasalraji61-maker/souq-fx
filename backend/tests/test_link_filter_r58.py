"""فلتر الروابط بالمجموعة: المختصِرات ونطاقات «VIP» والأشكال بعرض كامل/نقطة صينية/محرف خفيّ تُمنع؛
الكلام العادي (أسعار، «EUR/USD»، «1.0850») يمرّ."""
from __future__ import annotations

import pytest

import main


@pytest.mark.parametrize("text", [
    "join bit.ly/fxvip", "forexvip.ru", "fx.vip/abc", "t。me/fxvip", "HTTPS：//x",
    "ｔ．ｍｅ/signals", "t​.me/x", "best.club", "free signals at goldfx.pro",
])
def test_link_forms_blocked(text):
    assert main._has_link(text)


@pytest.mark.parametrize("text", [
    "EUR/USD buy at 1.0850 sl 1.0800", "الذهب 2350.5 هدف 2360", "U.S. CPI at 8:30", "went long.to be safe", "R:R 1:2.5, e.g. 20 pips",
])
def test_plain_text_passes(text):
    assert not main._has_link(text)
