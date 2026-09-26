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


_GOLD = "last=2350.12 (latest price at 2026-09-26 10:00 UTC), change_pct_over_last_179_candles=+0.45%, tf=15m"


@pytest.mark.parametrize("ground,line", [
    (_GOLD, "Gold is trading near 2400 right now."),
    (_GOLD, "الذهب عند 2400 الآن"),
    (_GOLD, "Above 2000 is the level to watch."),
    ("last=148.123 (latest price), tf=1h", "USDJPY sits at 150."),
    ("last=65123.4, tf=1h", "Bitcoin is at 70000."),
    ("last=65123.4, tf=1h", "Bitcoin is at 70,000."),
])
def test_whole_number_price_not_in_context_drops_the_line(ground, line):
    out = openrouter_ai.guard_answer(line + "\nMore text.", "en", ground=ground)
    assert line not in out and "More text." in out and out.endswith(openrouter_ai._GUARD_NUMBER_NOTE["en"])


@pytest.mark.parametrize("ground,line", [
    (_GOLD, "Gold is trading near 2350 right now."),
    (_GOLD, "Price is above 2350."),
    (_GOLD, "Over 179 candles price rose +0.45%."),
    (_GOLD, "From 2020 to 2026 gold rallied."),
    (_GOLD, "A stop 300 pips away is wide."),
    (_GOLD, "Over 200 candles the trend is up."),
    ("last=148.123 (latest price), tf=1h", "USDJPY sits at 148."),
    ("last=65123.4, tf=1h", "Bitcoin is around 65,000."),
])
def test_grounded_or_non_price_whole_numbers_are_kept(ground, line):
    assert openrouter_ai.guard_answer(line + "\nMore text.", "en", ground=ground) == line + "\nMore text."


@pytest.mark.parametrize("line", ["Price is above the 200 SMA.", "Gold trades below the 200-day moving average.",
                                  "السعر فوق متوسط 200 يوم."])
def test_moving_average_periods_are_not_prices(line):
    assert openrouter_ai.guard_answer(line + "\nMore text.", "en", ground=_GOLD) == line + "\nMore text."
