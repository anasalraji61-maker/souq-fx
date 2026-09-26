"""run 118: صياغات توصية كانت تمرّ من الحارس، وفرض «لا سعر غير موجود بالسياق» على الخادم."""
import pytest
from fastapi.testclient import TestClient

import main
import openrouter_ai
from tests.test_signal_levels import _provider_series


@pytest.mark.parametrize("text", [
    "I'd accumulate EURUSD around 1.0850.",
    "Consider picking up some gold near 2350.",
    "This is a good spot to add to your position.",
    "Close out if it drops to 1.0800.",
    "Place your protective order at 1.0800.",
    "Risk it to 1.0800 for 1.0950.",
    "Bullish bet: EURUSD calls.",
    "Unload your gold here.",
    "Get out of EURUSD.",
    "Hop in at 1.0850.",
    "Jump in now.",
    "Pyramid into the position above 1.0900.",
    "Scale in between 1.0850 and 1.0830.",
    "Sell the rip.",
    "Dump EURUSD now.",
    "افتح مركزاً عند 1.0850.",
    "خذ ربحك عند 1.0950.",
    "Kauf EURUSD.",
    "Achetez l'EURUSD.",
    "Enter now with a 50 pip target.",
])
def test_new_call_wordings_are_caught(text):
    assert openrouter_ai.has_trade_call(text)


@pytest.mark.parametrize("text", [
    "Dump and pump schemes are illegal.",
    "A jump in volatility often follows news.",
    "Traders get out of positions for many reasons.",
    "Adding to a losing position increases risk.",
    "The pair closed out the week higher.",
])
def test_new_wordings_leave_education_alone(text):
    assert not openrouter_ai.has_trade_call(text)


_CTX = "last=1.08503 (latest price at 2026-09-26 10:00 UTC), change_pct_over_last_179_candles=+0.45%, tf=15m"


@pytest.mark.parametrize("line", [
    "The last price was 1.0850 at 10:00 UTC.",
    "آخر سعر 1.08503 وارتفع +0.45% خلال 179 شمعة.",
    "Risk 1% per trade, e.g. 0.01 lot on a small account.",
    "A 1.5x ATR stop is wider than 1x.",
])
def test_grounded_numbers_are_kept(line):
    assert openrouter_ai.guard_answer(line + "\nMore text.", "en", ground=_CTX) == line + "\nMore text."


@pytest.mark.parametrize("line", ["RSI is 63.2 now.", "Price may revisit 1.0800 support.", "ضع أمرك عند 1.0820"])
def test_price_not_in_context_drops_the_line(line):
    out = openrouter_ai.guard_answer(line + "\nMore text.", "en", ground=_CTX)
    assert line not in out and "More text." in out


def test_number_only_drop_says_number_not_recommendation():
    out = openrouter_ai.guard_answer("RSI is 63.2 now.\nMore text.", "en", ground=_CTX)
    assert out.endswith(openrouter_ai._GUARD_NUMBER_NOTE["en"])


def test_ask_route_drops_invented_levels(monkeypatch):
    monkeypatch.setattr(main, "build_series", _provider_series(0.0030))
    monkeypatch.setattr(main.openrouter_ai, "configured", lambda: True)
    reply = ("EURUSD is trending up on 15m.\nافتح مركزاً عند 1.0850 وخذ ربحك عند 1.0950.\n"
             "Scale in down to 1.0830.")
    monkeypatch.setattr(main.openrouter_ai, "chat", lambda system, user, max_tokens=900: reply)
    r = TestClient(main.app).post("/api/ai/ask", json={"question": "what now?", "symbol": "EURUSD", "lang": "en"})
    ans = r.json()["answer"]
    assert r.status_code == 200 and "trending up" in ans
    assert "1.0850" not in ans and "1.0950" not in ans and "1.0830" not in ans
