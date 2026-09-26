"""run 120: توصيات بلا سعر كانت تمرّ من الحارس حرفياً عبر /api/ai/ask (قرار ٤)."""
import pytest
from fastapi.testclient import TestClient

import main
import openrouter_ai
from tests.test_signal_levels import _provider_series

_CALLS = [
    "Now is the moment to sell gold.",
    "Take the long.",
    "Initiate a long position on EURUSD.",
    "Put on a short here.",
    "- Take a short on gold.",
    "Close your shorts.",
    "Cover shorts now.",
    "The trade is long EURUSD.",
    "Put your stop-loss under the swing low.",
    "Take profit at the previous high.",
    "نصيحتي تشتري الذهب",
    "انصحك تبيع اليورو",
    "أنصحك أن تشتري الذهب",
    "أنا بايع اليورو",
    "اخرج من الصفقة الآن",
    "سكّر الصفقة",
    "أغلق الصفقة الآن",
]


@pytest.mark.parametrize("text", _CALLS)
def test_priceless_calls_are_caught(text):
    assert openrouter_ai.has_trade_call(text)


@pytest.mark.parametrize("text", [
    "Take a long position means you profit if price rises.",
    "Open a long position requires margin.",
    "Traders often place stops below support.",
    "Always set your stop-loss before you enter a trade.",
    "If the trade is long, the stop sits below entry.",
    "A trade is long when you buy first.",
    "Short sellers cover shorts when price squeezes higher.",
    "Many traders take profits into strength.",
    "Now is the time to review your plan.",
    "Take the long view on risk.",
    "The long and short of it is patience.",
    "الوقت المناسب للشراء يعتمد على خطتك.",
    "الخروج من السوق قرار صعب.",
    "أغلق المتداول الصفقة بربح صغير في المثال.",
])
def test_education_is_left_alone(text):
    assert not openrouter_ai.has_trade_call(text)


def test_ask_route_drops_priceless_calls(monkeypatch):
    monkeypatch.setattr(main, "build_series", _provider_series(0.0030))
    monkeypatch.setattr(main.openrouter_ai, "configured", lambda: True)
    reply = "EURUSD is trending up on 15m.\n" + "\n".join(_CALLS)
    monkeypatch.setattr(main.openrouter_ai, "chat", lambda system, user, max_tokens=900: reply)
    r = TestClient(main.app).post("/api/ai/ask", json={"question": "what now?", "symbol": "EURUSD", "lang": "en"})
    ans = r.json()["answer"]
    assert r.status_code == 200 and "trending up" in ans
    for line in _CALLS:
        assert line not in ans
