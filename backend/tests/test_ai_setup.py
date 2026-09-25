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
    # كلمات كاملة لا نصّ جزئي: كانت الثلاثة الأولى «sell»/«buy»/«sell» — عكس الردّ أو من لا شيء
    ("Bias: bullish, expect a short-term pullback first", "buy"),
    ("In a downtrend for a long while; bias bearish", "sell"),
    ("السوق طبيعي الآن، انتظر", None),
    ("الاتجاه المحتمل: صاعد، وكسر الدعم قد يؤدي إلى الهبوط", None),
    ("الاتجاه صاعد", "buy"),
    ("اتجاه هبوطي واضح", "sell"),
    ("فرصة للبيع تحت المقاومة", "sell"),
    ("Shorting below 1.08", "sell"),
    # كلمة اتجاه منفيّة ⇒ بلا اتجاه: كانت الخمسة الأولى «sell»/«sell»/«buy»/«sell»/«buy» — بطاقة
    # بمستويات لصفقة ينهى عنها الردّ نفسه
    ("Avoid shorting here; wait for confirmation.", None),
    ("Do not sell into support.", None),
    ("I would not buy at this level, wait.", None),
    ("لا أنصح بالبيع الآن", None),
    ("I wouldn’t buy here", None),
    ("تجنّب الشراء قبل الإغلاق", None),
    ("ولا أرى فرصة شراء", None),
    # النفي بجملة أخرى لا يُسقط الاتجاه
    ("This is not financial advice. Bias bullish.", "buy"),
    ("ليست نصيحة مالية. سيناريو شراء عند الدعم", "buy"),
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


def test_no_buy_card_under_an_answer_that_says_do_not_buy(monkeypatch):
    s = _ask(monkeypatch, "Avoid buying here; wait for confirmation.")
    assert s["direction"] is None and s["entry"] is None and s["sl"] is None and s["tp"] is None


def test_answer_without_a_side_gets_no_direction_or_levels(monkeypatch):
    s = _ask(monkeypatch, "انتظر حتى يتضح السوق")
    assert s["direction"] is None and s["entry"] is None


# ─── تغيّر صفريّ لا اتجاه له، والنصّ يسمّي نافذته ─────────────────────────────

def _flat_series(change: float):
    base = _provider_series(0.0030)

    def build(sym, timeframe="15m", outputsize=180):
        return base(sym, timeframe, outputsize).model_copy(update={"change_pct": change})
    return build


@pytest.mark.parametrize("lang", ["ar", "en"])
def test_flat_series_gives_no_direction_or_buy_scenario(monkeypatch, lang):
    """كان `change_pct >= 0` ⇒ 0.00% «صاعد» بسيناريو شراء كامل (دخول/وقف/هدف)."""
    monkeypatch.setattr(main, "build_series", _flat_series(0.0))
    monkeypatch.setattr(main.openrouter_ai, "configured", lambda: False)
    body = TestClient(main.app).post("/api/ai/ask", json={"question": "رأيك؟", "lang": lang}).json()
    s = body["setup"]
    assert s["direction"] is None and s["entry"] is None and s["sl"] is None and s["tp"] is None
    assert "0.00%" in body["answer"]
    assert "شراء" not in body["answer"] and "Buy" not in body["answer"]


def test_flat_series_attaches_no_levels_even_if_the_model_says_buy(monkeypatch):
    monkeypatch.setattr(main, "build_series", _flat_series(0.0))
    monkeypatch.setattr(main.openrouter_ai, "configured", lambda: True)
    monkeypatch.setattr(main.openrouter_ai, "trading_answer", lambda *a, **k: "سيناريو شراء")
    s = TestClient(main.app).post("/api/ai/ask", json={"question": "رأيك؟"}).json()["setup"]
    assert s["entry"] is None and s["sl"] is None and s["tp"] is None


@pytest.mark.parametrize("lang, word", [("ar", "آخر 59 شمعة"), ("en", "last 59 candles")])
def test_local_answer_names_the_candle_window_not_an_instant_trend(monkeypatch, lang, word):
    """التغيّر على كامل السلسلة كان يُسمّى «الاتجاه اللحظي» / «short-term trend». 60 إغلاقاً = 59 شمعة
    تغطّيها النسبة (من إغلاق الأولى) — كان «60»."""
    monkeypatch.setattr(main, "build_series", _flat_series(0.3))
    monkeypatch.setattr(main.openrouter_ai, "configured", lambda: False)
    body = TestClient(main.app).post("/api/ai/ask", json={"question": "رأيك؟", "lang": lang}).json()
    assert word in body["answer"]
    assert "اللحظي" not in body["answer"] and "short-term" not in body["answer"]
    assert body["setup"]["direction"] == "buy" and body["setup"]["entry"] is not None


# ─── وقت السعر بالسياق والردّ ─────────────────────────────────────────────────

def test_ai_context_and_reply_carry_the_price_time_and_source(monkeypatch):
    # كان السياق `last=1.1` وحده ⇒ سلسلة مخزَّنة أو إغلاق الجمعة يُقال عنه «السعر الحالي».
    seen: dict = {}
    monkeypatch.setattr(main, "build_series", _provider_series(0.0030))
    monkeypatch.setattr(main.openrouter_ai, "configured", lambda: True)
    monkeypatch.setattr(
        main.openrouter_ai, "trading_answer",
        lambda q, sym, context, lang="ar": seen.setdefault("ctx", context) and "انتظر",
    )
    body = TestClient(main.app).post("/api/ai/ask", json={"question": "رأيك؟"}).json()
    series = main.build_series("EURUSD")
    assert body["price_as_of"] == main._series_price_at(series)
    assert "last candle close at" in seen["ctx"] and "source=provider" in seen["ctx"]


def test_template_reply_carries_the_price_time(monkeypatch):
    monkeypatch.setattr(main, "build_series", _provider_series(0.0030))
    monkeypatch.setattr(main.openrouter_ai, "configured", lambda: False)
    body = TestClient(main.app).post("/api/ai/ask", json={"question": "رأيك؟"}).json()
    assert body["price_as_of"] == main._series_price_at(main.build_series("EURUSD"))


def test_series_price_at_is_the_candle_close_not_the_fetch_time():
    c = main.Candle(time=1_000_000_000, open=1, high=1, low=1, close=1)
    s = main.ChartSeries(
        symbol="EURUSD", timeframe="1H", candles=[c], change_pct=0, last=1,
        data_source=main.DataProvenance(kind="cache", as_of=2_000_000_000.0, channel="twelvedata"),
    )
    assert main._series_price_at(s) == 1_000_000_000 + 3600


# ─── النموذج لا يخترع مستويات: يتلقّى مستويات الخادم نفسها التي تحملها البطاقة ─────────

def _context_for(monkeypatch, build):
    seen: dict = {}
    monkeypatch.setattr(main, "build_series", build)
    monkeypatch.setattr(main.openrouter_ai, "configured", lambda: True)
    monkeypatch.setattr(
        main.openrouter_ai, "trading_answer",
        lambda q, sym, context, lang="ar": seen.setdefault("ctx", context) and "سيناريو شراء",
    )
    body = TestClient(main.app).post("/api/ai/ask", json={"question": "رأيك؟"}).json()
    return seen["ctx"], body["setup"]


def test_model_context_carries_the_card_levels(monkeypatch):
    """كان السياق بلا مستويات والتعليمات «اذكر دخولاً ووقفاً وهدفاً» ⇒ وقف النصّ ≠ وقف البطاقة."""
    ctx, s = _context_for(monkeypatch, _provider_series(0.0030))
    assert s["sl"] is not None
    assert f"entry={s['entry']}, stop={s['sl']}, target={s['tp']}" in ctx
    assert "direction=buy" in ctx


def test_model_context_forbids_levels_when_the_server_has_none(monkeypatch):
    ctx, s = _context_for(monkeypatch, _flat_series(0.0))
    assert s["sl"] is None
    assert "computed_levels: none" in ctx


def test_system_prompt_no_longer_asks_the_model_for_its_own_levels(monkeypatch):
    seen: dict = {}
    monkeypatch.setattr(openrouter_ai, "chat", lambda system, user, **k: seen.setdefault("sys", system))
    openrouter_ai.trading_answer("q", "EURUSD", "ctx")
    assert "دخولاً تقريبياً" not in seen["sys"]
    assert "computed_levels" in seen["sys"]


@pytest.mark.parametrize("lang", ["ar", "en"])
@pytest.mark.parametrize("live", [True, False])
def test_template_reply_does_not_send_the_trader_to_dxy(monkeypatch, lang, live):
    # المزوّد لا يقدّم DXY وخانته بالتطبيق بذرة مولَّدة ⇒ الدعوة «راقب DXY» تُرسله لأرقام مخترعة (launch118)
    if live:
        monkeypatch.setattr(main, "build_series", _provider_series(0.0030))
    else:
        base = _provider_series(0.0030)
        monkeypatch.setattr(main, "build_series", lambda *a, **k: base(*a, **k).model_copy(update={"source": "demo"}))
    monkeypatch.setattr(main.openrouter_ai, "configured", lambda: False)
    answer = TestClient(main.app).post("/api/ai/ask", json={"question": "رأيك؟", "lang": lang}).json()["answer"]
    assert "DXY" not in answer
    assert "USDJPY" in answer


@pytest.mark.parametrize("lang, word", [("ar", "لا اتجاه واضح"), ("en", "no clear direction")])
def test_move_smaller_than_one_atr_is_no_direction(monkeypatch, lang, word):
    """+0.01% على 1.1 = 0.00011 وATR14 = 0.0030 ⇒ ضجيج: كان أي تغيّر غير صفري «صاعداً» بسيناريو شراء كامل."""
    monkeypatch.setattr(main, "build_series", _flat_series(0.01))
    monkeypatch.setattr(main.openrouter_ai, "configured", lambda: False)
    body = TestClient(main.app).post("/api/ai/ask", json={"question": "رأيك؟", "lang": lang}).json()
    s = body["setup"]
    assert s["direction"] is None and s["entry"] is None and s["sl"] is None and s["tp"] is None
    assert word in body["answer"] and "+0.01%" in body["answer"]
    assert "شراء" not in body["answer"] and "Buy" not in body["answer"]


def test_move_smaller_than_one_atr_tells_the_model_no_bias(monkeypatch):
    seen: dict = {}
    monkeypatch.setattr(main, "build_series", _flat_series(0.01))
    monkeypatch.setattr(main.openrouter_ai, "configured", lambda: True)
    monkeypatch.setattr(
        main.openrouter_ai, "trading_answer",
        lambda q, sym, context, lang="ar": seen.setdefault("ctx", context) and "سيناريو شراء",
    )
    s = TestClient(main.app).post("/api/ai/ask", json={"question": "رأيك؟"}).json()["setup"]
    assert "bias=none" in seen["ctx"] and "computed_levels: none" in seen["ctx"]
    assert s["entry"] is None


def test_move_larger_than_one_atr_keeps_its_direction(monkeypatch):
    # 0.3% على 1.1 ≈ 0.0033 > ATR 0.0030 ⇒ اتجاه وسيناريو كما كان
    monkeypatch.setattr(main, "build_series", _flat_series(0.3))
    monkeypatch.setattr(main.openrouter_ai, "configured", lambda: False)
    s = TestClient(main.app).post("/api/ai/ask", json={"question": "رأيك؟"}).json()["setup"]
    assert s["direction"] == "buy" and s["entry"] is not None
