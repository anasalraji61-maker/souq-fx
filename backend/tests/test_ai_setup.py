"""`setup` بردّ المساعد: الاتجاه من ردّ النموذج بلا لبس فقط، والمستويات تُرفق حين تطابقه.

كان `parse_setup_hint` يعيد «sell» لكل ردّ بلا كلمة شراء (أي «انتظر» ⇒ بيع)، ومستويات 0.0،
ثم يُلصق عليه وقف/هدف مبنيّان على اتجاه الخادم ⇒ «بيع» بوقف تحت الدخول.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import main
import openrouter_ai
from tests.test_signal_levels import _provider_series


@pytest.mark.parametrize("text, want", [
    ("السوق متذبذب، انتظر تأكيداً", None),
    ("No clear edge right now.", None),
    ("سيناريو شراء عند الدعم", "buy"),
    ("Consider a short below 1.08", "sell"),
    ("شراء فوق 1.09 أو بيع تحت 1.08", None),
])
def test_direction_only_when_unambiguous(text, want):
    out = openrouter_ai.parse_setup_hint(text)
    assert out["direction"] == want
    assert out["entry"] is None and out["sl"] is None and out["tp"] is None


def _ask(monkeypatch, reply):
    # سلسلة ثابتة ⇒ change_pct موجب (0.3) ⇒ اتجاه الخادم «شراء»
    monkeypatch.setattr(main, "build_series", _provider_series(0.0030))
    monkeypatch.setattr(main.openrouter_ai, "configured", lambda: True)
    monkeypatch.setattr(main.openrouter_ai, "trading_answer", lambda *a, **k: reply)
    return TestClient(main.app).post("/api/ai/ask", json={"question": "ما رأيك؟"}).json()["setup"]


def test_levels_attached_when_the_answer_agrees(monkeypatch):
    s = _ask(monkeypatch, "سيناريو شراء")
    assert s["direction"] == "buy" and s["entry"] == pytest.approx(1.1)
    assert s["sl"] < s["entry"] < s["tp"]


def test_no_buy_levels_under_a_sell_answer(monkeypatch):
    s = _ask(monkeypatch, "سيناريو بيع")
    assert s["direction"] == "sell"
    assert s["entry"] is None and s["sl"] is None and s["tp"] is None


def test_answer_without_a_side_gets_no_direction_or_levels(monkeypatch):
    s = _ask(monkeypatch, "انتظر حتى يتضح السوق")
    assert s["direction"] is None and s["entry"] is None
