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
    # المؤنّث (كانا None: «ة» ليست لاحقة معروفة)
    ("السعر داخل قناة صاعدة", "buy"),
    ("الموجة الحالية هابطة", "sell"),
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
    # تعابير بلا اتجاه (كانت «buy»/«buy»/«sell»×5): بطاقة بمستويات لصفقة لم يقترحها الردّ
    ("No clear direction. Stay flat as long as price remains inside the range.", None),
    ("Wait on the sidelines so long as the range holds.", None),
    ("Price fell short of the 1.10 target; momentum is fading.", None),
    ("The rally may fall short.", None),
    ("A short squeeze is possible.", None),
    ("The move was short-lived.", None),
    ("In short, wait for the close.", None),
    # الكلمة بمعناها التداولي باقية
    ("Go long above 1.09", "buy"),
    ("Look to short the retest", "sell"),
    ("Long above 1.09 as long as support holds", "buy"),
    # نفي/رفض **بعد** كلمة الاتجاه بنفس الجملة (كانت buy×3، sell×2)
    ("I would wait. A buy is not justified yet.", None),
    ("Buying here is not recommended; wait.", None),
    ("الشراء غير مستحسن الآن", None),
    ("Selling at these levels would be a mistake.", None),
    ("A sell is premature here.", None),
    # long/short وصفاً لشمعة أو حركة (كانت buy×3، sell)
    ("Price printed a long upper wick at resistance, sellers stepped in. I expect a pullback.", None),
    ("EURUSD looks weak: a long upper shadow rejected 1.0900.", None),
    ("Buyers are exhausted after a long rally and could correct lower.", None),
    ("Short-sellers are covering, price is rising strongly.", None),
    ("Buy on a close above 1.0900 with a stop under the prior swing low.", "buy"),
    ("I favor a long position toward 1.0950.", "buy"),
    # سيولة/ضغط/حركة ماضية لا توصية (كانت sell×4، buy): بطاقة بعكس الردّ
    ("Price swept sell-side liquidity and is now reversing higher; look for longs above the sweep low.", "buy"),
    ("The recent sell-off looks exhausted.", None),
    ("Selling pressure is fading and a bounce is likely.", None),
    ("بعد الهبوط الأخير نتوقع ارتداداً", None),
    ("Buy-side liquidity was taken, expect a move lower.", None),
    ("Look for shorts below 1.08", "sell"),
    ("Place a sell stop under 1.08", "sell"),
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


@pytest.mark.parametrize("reply", ["سيناريو شراء", "سيناريو بيع", "Avoid buying here; wait.", "انتظر حتى يتضح السوق"])
def test_setup_card_is_always_empty(monkeypatch, reply):
    """قرار أنس ٤: لا اتجاه ولا دخول/وقف/هدف بالبطاقة أبداً — كانت تُرفق مستويات ATR حين يطابق اتجاه الردّ."""
    assert _ask(monkeypatch, reply) == {"direction": None, "entry": None, "sl": None, "tp": None, "win_probability": None}


# ─── تغيّر صفريّ لا اتجاه له، والنصّ يسمّي نافذته ─────────────────────────────

def _flat_series(change: float):
    return _provider_series(0.0030, change_pct=change)


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
    assert body["setup"]["direction"] is None and body["setup"]["entry"] is None


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
    assert "latest price of the last candle at" in seen["ctx"] and "close at" not in seen["ctx"] and "source=provider" in seen["ctx"]


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


@pytest.mark.parametrize("change", [0.3, 0.0])
def test_model_context_carries_no_trade_levels(monkeypatch, change):
    """قرار أنس ٤: كان السياق يحمل computed_levels (دخول/وقف/هدف) ليقتبسها النموذج."""
    ctx, s = _context_for(monkeypatch, _flat_series(change))
    assert s["sl"] is None and s["direction"] is None
    assert "computed_levels" not in ctx and "entry=" not in ctx and "stop=" not in ctx


def test_system_prompt_is_an_educational_assistant_that_refuses_trade_calls(monkeypatch):
    seen: dict = {}
    monkeypatch.setattr(openrouter_ai, "chat", lambda system, user, **k: seen.setdefault("sys", system))
    openrouter_ai.trading_answer("q", "EURUSD", "ctx")
    assert "خبير" not in seen["sys"] and "مساعد تحليل تعليمي" in seen["sys"]
    assert "اذكر اتجاهاً" not in seen["sys"] and "computed_levels" not in seen["sys"]
    for w in ("نقطة دخول", "وقف خسارة", "هدف ربح", "شراء/بيع", "ولو طلب"):
        assert w in seen["sys"]
    seen.clear()
    openrouter_ai.interrupt_answer("q", "t", "x")
    assert "وقف خسارة" in seen["sys"] and "ولو طلب" in seen["sys"]


@pytest.mark.parametrize("text", [
    "Entry: 1.0843", "Stop 1.0812", "Target 1.0950", "1.0950 as the target", "take profit at 1.10",
    "وقف الخسارة عند 1.0812", "الهدف 1.10", "نقطة الدخول 1.0843",
    "Buy EURUSD now", "Sell here", "Go long above 1.09", "I recommend buying", "I'd suggest you sell",
    "Direction: buy", "أنصحك بالشراء", "توصية: بيع", "الاتجاه: شراء", "اشترِ الآن",
])
def test_guard_flags_trade_calls(text):
    assert openrouter_ai.has_trade_call(text)


@pytest.mark.parametrize("text", [
    "The trend over the window is bullish.", "الاتجاه صاعد على آخر 59 شمعة", "RSI is at 72 — overbought.",
    "Place a stop-loss 1.5×ATR away from entry.", "Risk/reward 1:2", "a stop loss of 20 pips",
    "Keep risk to 1% per trade.", "The 50 SMA is above the 200 SMA.", "توقف السعر عند 1.08",
    "The recent sell-off looks exhausted.", "Traders often buy when RSI leaves oversold.", "لا أنصح بالشراء",
])
def test_guard_leaves_education_alone(text):
    assert not openrouter_ai.has_trade_call(text)


# run 77: صيغ كانت تمرّ من الحارس (قرار ٤ «بأي صياغة»)
@pytest.mark.parametrize("text", [
    "A long position near 1.0850 makes sense.", "You could buy near 1.0850.", "I'd go long here.", "My advice: sell.",
    "Aim for 1.0950.", "The price could reach 1.0950, which is a good place to take profit.",
    "يفضل الشراء عند 1.0850", "شراء من 1.0850", "بيع عند 1.0900", "It is a good time to buy.",
    "You should sell now.", "You should sell.", "Short it at 1.0900.", "فرصة شراء واضحة",
])
def test_guard_flags_reworded_trade_calls(text):
    assert openrouter_ai.has_trade_call(text)


@pytest.mark.parametrize("text", [
    "Selling pressure pushed price to 1.0800.", "The sell-off reached 1.0800.", "Buyers defended 1.0800.",
    "a long wick at 1.0850", "Short-term support at 1.0800.", "ضغط البيع عند 1.0900 واضح",
    "In a crossover strategy you would buy when the fast MA crosses above the slow MA.",
    "Buying volume rose near 1.0850.", "The pair traded between 1.0800 and 1.0900 today.",
    "the buy-side liquidity above 1.0900", "One can buy or sell any pair in MATRIX's demo.",
    "Support is at 1.0800, resistance at 1.0950.",
])
def test_guard_still_leaves_market_description_alone(text):
    assert not openrouter_ai.has_trade_call(text)


def test_guard_drops_trade_lines_and_says_so(monkeypatch):
    reply = "RSI is 72 — overbought.\nEntry 1.0843\nStop 1.0812\nRisk 1% per trade."
    monkeypatch.setattr(main, "build_series", _provider_series(0.0030))
    monkeypatch.setattr(main.openrouter_ai, "configured", lambda: True)
    monkeypatch.setattr(main.openrouter_ai, "trading_answer", lambda *a, **k: reply)
    ans = TestClient(main.app).post("/api/ai/ask", json={"question": "entry?", "lang": "en"}).json()["answer"]
    assert "1.0843" not in ans and "1.0812" not in ans
    assert "RSI is 72" in ans and "Risk 1% per trade." in ans and "was removed" in ans


@pytest.mark.parametrize("lang, want", [("ar", "مساعد MATRIX تعليمي"), ("en", "educational"), ("ku", "مساعد MATRIX")])
def test_guard_all_trade_lines_gives_the_refusal(lang, want):
    out = openrouter_ai.guard_answer("Buy EURUSD now\nStop 1.0812", lang)
    assert want in out and "1.0812" not in out


def test_guard_keeps_a_clean_answer_verbatim():
    text = "RSI measures momentum.\n\nAbove 70 is often called overbought."
    assert openrouter_ai.guard_answer(text, "en") == text


@pytest.mark.parametrize("lang", ["ar", "en"])
@pytest.mark.parametrize("change", [0.3, -0.3])
def test_template_reply_has_no_trade_call(monkeypatch, lang, change):
    monkeypatch.setattr(main, "build_series", _flat_series(change))
    monkeypatch.setattr(main.openrouter_ai, "configured", lambda: False)
    ans = TestClient(main.app).post("/api/ai/ask", json={"question": "رأيك؟", "lang": lang}).json()["answer"]
    assert not openrouter_ai.has_trade_call(ans)
    for w in ("Entry", "Stop:", "Target", "دخول:", "وقف:", "هدف:", "سيناريو", "scenario", "before entering"):
        assert w not in ans


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
    assert "bias=none" in seen["ctx"]
    assert s["entry"] is None


def test_move_larger_than_one_atr_keeps_its_description(monkeypatch):
    # 0.3% على 1.1 ≈ 0.0033 > ATR 0.0030 ⇒ الحركة توصف «صاعدة» (وصف الشارت) بلا توصية ولا مستويات
    monkeypatch.setattr(main, "build_series", _flat_series(0.3))
    monkeypatch.setattr(main.openrouter_ai, "configured", lambda: False)
    body = TestClient(main.app).post("/api/ai/ask", json={"question": "رأيك؟"}).json()
    assert "**صاعد**" in body["answer"] and body["setup"]["entry"] is None


def test_no_sell_card_with_a_negative_target(monkeypatch):
    """سعر 0.05، ATR 0.03، هبوط 50% ⇒ هدف البيع 0.05 − 2×0.03 = −0.01: سعر مستحيل كان يُعرض هدفاً."""
    base = _provider_series(0.03, "SHIBUSD", 0.05)
    monkeypatch.setattr(main, "build_series",
                        lambda *a, **k: base(*a, **k).model_copy(update={"change_pct": -50.0}))
    monkeypatch.setattr(main.openrouter_ai, "configured", lambda: True)
    monkeypatch.setattr(main.openrouter_ai, "trading_answer", lambda *a, **k: "سيناريو بيع")
    s = TestClient(main.app).post("/api/ai/ask", json={"question": "ما رأيك؟", "symbol": "SHIBUSD"}).json()["setup"]
    assert s["entry"] is None and s["sl"] is None and s["tp"] is None


@pytest.mark.parametrize("lang", ["ar", "en"])
def test_too_few_candles_for_atr_give_no_direction(monkeypatch, lang):
    """12 شمعة ⇒ لا ATR14 ⇒ كان مرشّح الضجيج يُتخطّى فيصير +0.3% «شراء» بلا مستويات."""
    base = _provider_series(0.0030)

    def build(*a, **k):
        s = base(*a, **k)
        return s.model_copy(update={"candles": s.candles[:12]})
    monkeypatch.setattr(main, "build_series", build)
    monkeypatch.setattr(main.openrouter_ai, "configured", lambda: False)
    out = TestClient(main.app).post("/api/ai/ask", json={"question": "ما رأيك؟", "lang": lang}).json()
    assert out["setup"]["direction"] is None and out["setup"]["entry"] is None
    assert "ATR14" in out["answer"] and ("12" in out["answer"])


def _closes_series(first: float, last: float, rng: float):
    """سلسلة حقيقية الشكل: `change_pct` مقرَّب لخانتين كـ`build_series`، وATR14 = `rng`."""
    def build(sym, timeframe="15m", outputsize=180):
        cs = [main.Candle(time=1_700_000_000 + i * 900, open=last, high=last + rng / 2,
                          low=last - rng / 2, close=last) for i in range(60)]
        cs[0] = main.Candle(time=cs[0].time, open=first, high=first + rng / 2, low=first - rng / 2, close=first)
        return main.ChartSeries(
            symbol=sym.upper(), timeframe=timeframe, candles=cs,
            change_pct=round((last - first) / first * 100, 2), last=last,
            data_source=main.DataProvenance(kind="provider", as_of=1.0, channel="twelvedata"),
        )
    return build


@pytest.mark.parametrize("first, last, want", [
    # +0.0251% تُقرّب +0.03% (0.00033 > ATR) — الحركة الحقيقية 0.000276 تحت ATR ⇒ لا اتجاه (كان «شراء» كاملاً)
    (1.10000, 1.100276, None),
    # +0.0345% تُقرّب +0.03% (0.00033 < ATR 0.00035) — الحركة الحقيقية 0.00038 فوقه ⇒ اتجاه (كان يُخفى)
    (1.10000, 1.10038, "buy"),
])
def test_noise_filter_uses_the_real_closes_not_the_rounded_percent(monkeypatch, first, last, want):
    import signal_hub
    build = _closes_series(first, last, 0.0003 if want is None else 0.00035)
    atr = signal_hub._atr_last([c.model_dump() for c in build("EURUSD").candles])
    move = abs(last - first)
    assert (move > atr) == (want is not None)
    monkeypatch.setattr(main, "build_series", build)
    monkeypatch.setattr(main.openrouter_ai, "configured", lambda: False)
    ans = TestClient(main.app).post("/api/ai/ask", json={"question": "رأيك؟"}).json()["answer"]
    assert ("**صاعد**" in ans) == (want is not None)


class _NullReply:
    def __init__(self, content):
        self._content = content

    def __enter__(self):
        return self

    def __exit__(self, *a):
        return False

    def post(self, *a, **k):
        content = self._content

        class R:
            def raise_for_status(self):
                pass

            def json(self):
                return {"choices": [{"message": {"content": content}, "finish_reason": "length"}]}
        return R()


@pytest.mark.parametrize("content", [None, "", "   "])
def test_empty_model_reply_is_an_error_not_the_answer_none(monkeypatch, content):
    # كان `str(None)` ⇒ الجواب «None» (أو فارغ) يُعرض للمتداول ولا يعمل الردّ الاحتياطي
    monkeypatch.setenv("OPENROUTER_API_KEY", "x")
    monkeypatch.setattr(openrouter_ai.httpx, "Client", lambda **k: _NullReply(content))
    with pytest.raises(RuntimeError):
        openrouter_ai.chat("s", "u")
    monkeypatch.setattr(main, "build_series", _provider_series(0.0030))
    out = TestClient(main.app).post("/api/ai/ask", json={"question": "ما رأيك؟"}).json()
    assert out["answer"] and out["answer"] not in ("None", "")


def test_ai_symbol_is_bounded():
    r = TestClient(main.app).post("/api/ai/ask", json={"question": "hi there", "symbol": "X" * 100000})
    assert r.status_code == 422


def _one_candle(monkeypatch):
    c = {"time": 1_790_000_000, "open": 1.1, "high": 1.11, "low": 1.09, "close": 1.1, "volume": None}
    monkeypatch.setattr(main.market, "configured", lambda: True)
    monkeypatch.setattr(main.market, "fetch_time_series_with_meta",
                        lambda *a, **k: ([c], {"kind": "provider", "as_of": 1_790_000_100}))


def test_single_candle_series_has_no_change_pct(monkeypatch):
    """شمعة واحدة من المزوّد: كان `change_pct` = 0.0 ⇒ «0.00%» بالشارت (ثابت) بلا أيّ حركة مقيسة."""
    _one_candle(monkeypatch)
    s = main.build_series("EURUSD")
    assert s.last == 1.1 and s.change_pct is None and s.change_bars == 0


@pytest.mark.parametrize("lang", ["ar", "en"])
@pytest.mark.parametrize("model", [True, False])
def test_ai_on_single_candle_says_no_direction_without_crashing(monkeypatch, lang, model):
    _one_candle(monkeypatch)
    seen = {}
    monkeypatch.setattr(main.openrouter_ai, "configured", lambda: model)
    monkeypatch.setattr(main.openrouter_ai, "trading_answer",
                        lambda q, sym, ctx, lang: seen.setdefault("ctx", ctx) and "انتظر")
    body = TestClient(main.app).post("/api/ai/ask", json={"question": "رأيك؟", "lang": lang}).json()
    assert body["setup"]["direction"] is None and body["setup"]["entry"] is None
    assert "0.00%" not in body["answer"]
    if model:
        assert "change_pct=unavailable" in seen["ctx"] and "bias=none" in seen["ctx"]


@pytest.mark.parametrize("lang, said, not_said", [
    ("ar", "لا حركة سعرية على آخر 60 شمعة", "أقلّ من أن يُقاس"),
    ("en", "No price movement over the last 60 candles", "too few"),
])
def test_frozen_series_says_no_movement_not_too_few_candles(monkeypatch, lang, said, not_said):
    """60 شمعة متطابقة ⇒ ATR14 = 0 ⇒ كان الردّ «60 شمعة فقط — أقلّ من أن يُقاس ATR14» (سبب كاذب)."""
    monkeypatch.setattr(main, "build_series", _closes_series(1.1, 1.1, 0.0))
    monkeypatch.setattr(main.openrouter_ai, "configured", lambda: False)
    out = TestClient(main.app).post("/api/ai/ask", json={"question": "ما رأيك؟", "lang": lang}).json()
    assert out["setup"]["direction"] is None and out["setup"]["entry"] is None
    assert said in out["answer"] and not_said not in out["answer"]


def test_frozen_series_tells_the_model_no_movement(monkeypatch):
    ctx, setup = _context_for(monkeypatch, _closes_series(1.1, 1.1, 0.0))
    assert "no price movement" in ctx and "too few" not in ctx
    assert setup["entry"] is None


class _Reply(_NullReply):
    def __init__(self, content, finish):
        super().__init__(content)
        self._finish = finish

    def post(self, *a, **k):
        content, finish = self._content, self._finish

        class R:
            def raise_for_status(self):
                pass

            def json(self):
                return {"choices": [{"message": {"content": content}, "finish_reason": finish}]}
        return R()


@pytest.mark.parametrize("content, finish, want", [
    # قُطع عند max_tokens وسط رقم: «1.08» كان يُعرض بدل 1.0812 ⇒ السطر المبتور يُسقط ويُعلَّم
    ("Buy EURUSD\nentry 1.0843\nstop 1.08", "length", "Buy EURUSD\nentry 1.0843\n\n…"),
    ("Buy EURUSD\nentry 1.0843\nstop 1.0812", "stop", "Buy EURUSD\nentry 1.0843\nstop 1.0812"),
])
def test_truncated_model_reply_drops_its_cut_line(monkeypatch, content, finish, want):
    monkeypatch.setenv("OPENROUTER_API_KEY", "x")
    monkeypatch.setattr(openrouter_ai.httpx, "Client", lambda **k: _Reply(content, finish))
    assert openrouter_ai.chat("s", "u") == want


def test_truncated_reply_with_no_complete_line_is_an_error(monkeypatch):
    monkeypatch.setenv("OPENROUTER_API_KEY", "x")
    monkeypatch.setattr(openrouter_ai.httpx, "Client", lambda **k: _Reply("Buy EURUSD, stop 1.08", "length"))
    with pytest.raises(RuntimeError):
        openrouter_ai.chat("s", "u")


@pytest.mark.parametrize("lang", ["ar", "en"])
def test_move_larger_than_atr_is_not_called_flat_when_its_percent_rounds_to_zero(monkeypatch, lang):
    """زوج مربوط: +0.0003 على 7.8 = +0.0038% ⇒ `change_pct` المقرَّب 0.00 ⇒ كان «صافي الحركة أصغر من
    ATR14» بلا اتجاه — والحركة الحقيقية أكبر من ATR (≈0.0002). الإشارة والصفر من الإغلاقين الحقيقيين."""
    base = _provider_series(0.0002, "USDHKD", 7.8, change_pct=0.0038)
    build = lambda *a, **k: base(*a, **k).model_copy(update={"change_pct": 0.0})
    monkeypatch.setattr(main, "build_series", build)
    monkeypatch.setattr(main.openrouter_ai, "configured", lambda: False)
    s = build("USDHKD")
    move = s.last - s.candles[0].close
    atr = main.signal_hub._atr_raw([c.model_dump() for c in s.candles])
    assert move > atr > 0
    body = TestClient(main.app).post("/api/ai/ask", json={"question": "رأيك؟", "symbol": "USDHKD", "lang": lang}).json()
    assert "**صاعد**" in body["answer"] or "**bullish**" in body["answer"]
    assert "ATR14 —" not in body["answer"] and "أصغر من" not in body["answer"]
