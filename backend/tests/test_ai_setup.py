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


# run 78: صيغ كانت تمرّ من الحارس (فحص عدائي — قرار ٤ «بأي صياغة»)
@pytest.mark.parametrize("text", [
    "tgt 1.0950", "PT 1.0950", "S/L 1.0800", "T/P 1.0950", "SL1.0800", "TP1 1.0950 TP2 1.1000", "TP1: 1.0950",
    "Take profits at 1.0950", "exit at 1.0950", "Close the trade at 1.0950", "Invalidation: 1.0800",
    "Get in at 1.0850.", "BTC: get in around 64000, exit at 68000, cut losses at 62000",
    "Stops go below 1.0800 and profits get taken at 1.0950", "SL: 20 pips below 1.0850",
    "Long gold at 2350", "Accumulate gold below 2350.", "long EURUSD", "Long EURUSD.", "short gold",
    "Short gold now.", "Go long.", "Short it.", "Buy.", "buy EUR/USD", "Load up on EURUSD here.",
    "Consider buying EURUSD", "Consider a long at 1.0850", "This is a long opportunity at 1.0850",
    "I'd be a buyer at 1.0850", "I'd get long here", "I'm long EURUSD", "It's a buy.", "EURUSD is a strong buy",
    "Strong sell on gold", "Now is the time to buy.", "Recommendation — Buy", "Verdict: bullish, buy",
    "Pending buy order at 1.0850", "**Entry:** 1.0850", "Target 1.0850 1.0900",
    "اشتري اليورو دولار", "بع الذهب", "بِع الذهب الآن", "افتح صفقة شراء", "افتح مركز بيع على الذهب",
    "أدخل صفقة بيع", "هدفنا 1.0950", "يُفضّل الشراء عند 1.0850",
    "کڕین لە 1.0850", "کڕین بکە ئێستا", "فرۆشتنی زێڕ ئێستا", "خاڵی چوونەژوورەوە 1.0850", "ستۆپ لۆس 1.0800",
    "Achetez EURUSD à 1.0850", "Vende oro ahora", "Entrée: 1.0850",
])
def test_guard_flags_adversarial_trade_calls(text):
    assert openrouter_ai.has_trade_call(text)


@pytest.mark.parametrize("text", [
    "ATR(14) is 0.0065, so a 1.5× ATR stop would be about 0.0098 away.",
    "يوضع وقف الخسارة عادة على بعد 1.5 ضعف ATR", "الهدف من هذا الدرس شرح مؤشر RSI 14",
    "The stop run below 1.0800 swept liquidity.", "We were at 1.0850 at the entry of the London session.",
    "Many traders sell at resistance like 1.0950 — that's why it acts as a ceiling.",
    "Retail traders tend to buy near 1.0800, which is why liquidity pools there.",
    "Long-term traders often use the 200 EMA.", "Long upper wicks near 1.0900 show rejection.",
    "Long EMA periods smooth noise.", "The exit of the UK from the EU in 2020 hit the pound.",
    "It's a long way from 1.0800 to 1.1000.", "This is a sell signal in textbook terms.",
    "أدخل مؤشر RSI على الشارت من القائمة.", "اشتريت الكتاب أمس.", "فشاری فرۆشتن زیاد بوو",
    "1. Long wicks show rejection.", "Sell signals appear when RSI crosses below 70.",
])
def test_guard_adversarial_education_left_alone(text):
    assert openrouter_ai.guard_answer(text, "en") == text


@pytest.mark.parametrize("text", [
    "RSI is 55.\nEntry:\n1.0850", "RSI is 55.\n- Entry\n  - 1.0850", "RSI is 55.\n1. Stop loss —\n\n1.0800",
    "RSI is 55.\n| Entry | Stop | Target |\n|---|---|---|\n| 1.0850 | 1.0800 | 1.0950 |",
])
def test_guard_catches_a_level_split_across_lines(text):
    out = openrouter_ai.guard_answer(text, "en")
    assert "RSI is 55." in out and "was removed" in out
    assert not any(p in out for p in ("1.0850", "1.0800", "1.0950"))


@pytest.mark.parametrize("text", [
    "Stop-loss placement:\n1.5×ATR beyond the swing is common.",
    "| Indicator | Value |\n|---|---|\n| RSI | 55.2 |\n| EMA 50 | 1.0840 |",
    "Targets in harmonic patterns are Fibonacci ratios:\n0.618 and 1.272 extensions.",
])
def test_guard_multiline_education_left_alone(text):
    assert openrouter_ai.guard_answer(text, "en") == text


def test_template_reply_does_not_quote_a_trade_call_question(monkeypatch):
    monkeypatch.setattr(main, "build_series", _flat_series(0.3))
    monkeypatch.setattr(main.openrouter_ai, "configured", lambda: False)
    c = TestClient(main.app)
    ans = c.post("/api/ai/ask", json={"question": "اشترِ عند 1.0850 الآن", "lang": "ar"}).json()["answer"]
    assert "1.0850" not in ans and "بالنسبة لسؤالك:" in ans
    ans = c.post("/api/ai/ask", json={"question": "ما هو RSI؟", "lang": "ar"}).json()["answer"]
    assert "«ما هو RSI؟»" in ans


# قرار أنس ١٢: الكردي يُجاب بالقالب العربي عند غياب النموذج ⇒ الردّ يقول لغته ليقولها التطبيق صراحةً
@pytest.mark.parametrize("lang, configured, want", [
    ("ku", False, "ar"), ("ar", False, "ar"), ("en", False, "en"), ("ku", True, "ku"), ("en", True, "en"),
])
def test_ai_ask_reports_the_reply_language(monkeypatch, lang, configured, want):
    monkeypatch.setattr(main, "build_series", _flat_series(0.3))
    monkeypatch.setattr(main.openrouter_ai, "configured", lambda: configured)
    monkeypatch.setattr(main.openrouter_ai, "trading_answer", lambda *a, **k: "RSI measures momentum.")
    body = TestClient(main.app).post("/api/ai/ask", json={"question": "RSI?", "lang": lang}).json()
    assert body["answer_lang"] == want


def test_ai_ask_kurdish_guard_refusal_is_arabic(monkeypatch):
    monkeypatch.setattr(main, "build_series", _flat_series(0.3))
    monkeypatch.setattr(main.openrouter_ai, "configured", lambda: True)
    monkeypatch.setattr(main.openrouter_ai, "trading_answer", lambda *a, **k: "کڕین لە 1.0850")
    body = TestClient(main.app).post("/api/ai/ask", json={"question": "RSI?", "lang": "ku"}).json()
    assert "1.0850" not in body["answer"] and body["answer_lang"] == "ar"


# ─── run 80: فحص عدائي ثالث — صيغ كانت تمرّ، وأعداد صحيحة كانت «أسعاراً» ───────
@pytest.mark.parametrize("text", ['SL/TP: 1.0800/1.0950', 'TP1/TP2: 1.0950/1.1000', '🟢 BUY', '🔴 SELL EURUSD', '✅ Buy EURUSD', '📈 LONG EURUSD', '<b>BUY</b> EURUSD', '{"direction":"sell"}', 'Signal = BUY', 'Buy/Sell: Buy', 'Position: Long', 'place a pending order at 1.0850', 'Put a limit order at 1.0850', 'Book profits at 1.0950', 'Take half off at 1.0950', 'Close half at 1.0950', 'Move stop to breakeven', 'Invalidated below 1.0800', 'Setup invalid under 1.0800', 'Fade the move at 1.0900', 'Short from 1.0900, cover at 1.0800', 'Look for longs above 1.0850', 'Above 1.0850: long. Below 1.0800: short.', 'Scenario A: long 1.0850 → 1.0950', 'Recommend buying EURUSD', 'R:R 1:2 from 1.0850', 'ستوب لوس 1.0800', 'تيك بروفيت 1.0950', 'إشارة: شراء', 'توصيتي الشراء', 'الأنسب هو الشراء', 'بفرۆشە', 'وەرە بکڕە', 'ئێستا بیکڕە', 'EURUSD: کڕین', 'کڕینی EURUSD پێشنیار دەکەم', 'زیان وەستاندن ١٫٠٨٠٠', 'Ｅｎｔｒｙ 1.0850', 'Entry 65, stop 62', 'Stop at 150.20', 'Target 2400', 'Buy gold at 2350', 'Entry: ١٫٠٨٥٠', 'entry 155'])
def test_guard_run80_trade_calls(text):
    assert openrouter_ai.has_trade_call(text)


@pytest.mark.parametrize("text", ['Exit polls showed a close race in 2024.', 'The stop-loss concept dates to the 1980s.', 'Stop 3 of the lesson covers RSI 14.', 'Target audience: 18+ learners.', 'Lesson objective: 3 key ideas.', 'Exit strategy matters: 1 rule per trade.', 'RSI above 70 is overbought.', 'Price is at 1.0850 now.', 'Buy and sell orders meet in the order book.', 'A stop-loss limits the loss on a trade.', 'Traders often move the stop to breakeven after the price moves in their favor.', 'Long wicks above 1.0900 show rejection.', 'The signal line crossed above MACD.', 'Many traders place a buy limit order below support.', 'Risk-reward of 1:2 means the target is twice the stop distance.', '✅ RSI is 55, neutral.', 'The pair was invalidated as a pattern.', 'EURUSD traded between 1.0850 - long wicks showed rejection.', 'In 2008 the stop-loss hunting was common.', 'The 200 EMA is at 1.0820.', 'RSI(14) is at 62.', 'A 50-period moving average smooths price.', 'Target 2 of the course: understand support.', 'Entry-level traders should learn risk first.', 'The exit of 3 major banks changed liquidity.', 'Gold reached 2350 in April.', 'Stops are often placed beyond recent swing lows.', 'The target price in a head and shoulders equals the pattern height.', 'Price closed at 1.13913 on Friday.', '🟢 Bullish momentum on the daily chart.', '<b>Note:</b> the market is closed.', 'المؤشر في منطقة التشبع الشرائي فوق 70.', 'السعر عند ١٫١٣٩١ حالياً.', 'ئەم نیشاندەرە بۆ فێربوونە.', 'Take profit orders close a trade automatically at a set price.', 'In the 1990s traders used MACD 12 26 9.', 'Stop hunting happens around round numbers like 1.1000.'])
def test_guard_run80_education_left_alone(text):
    """كانت تُحذف (أيّ عدد صحيح بعد كلمة مستوى = سعر) فيصير الردّ كلّه اعتذاراً."""
    assert openrouter_ai.guard_answer(text, "en") == text


# ─── run 83: صيغ كانت تمرّ حارس قرار ٤ كما هي ────────────────────────────────


@pytest.mark.parametrize("text", [
    "Yes, buy now.", "Short answer: yes, buy now.", "Yes — buy.", "Should you buy? Yes, buying here makes sense.",
    "Answer: buy", "My take: buy.", "side: BUY", "Order: BUY EURUSD", "Buy? Yes.",
    "قم بالشراء الآن", "قم بالبيع عند 1.0850", "انصحك بالشراء", "إشتري الآن", "نصيحتي: شراء", "رأيي شراء",
    "الشراء أفضل", "الجواب: شراء", "المستهدف 1.0950", "إدخال عند 1.0850",
    "Stop 1: 1.0800", "Target 1: 1.0950", "TP 2: 1.1000", "T1 1.0950",
    '"entry_price": 1.0850', "entryPrice: 1.0850",
    "Longs at 1.0850", "Shorts from 1.0950", "A long here at 1.0850 makes sense",
    "Scale in at 1.0850", "Add at 1.0850", "Close at 1.0950", "Hold until 1.0950",
    "Alış 1.0850, zarar durdur 1.0800, hedef 1.0950", "Giriş: 1.0850", "Satın al", "Kaufen bei 1.0850",
    "Oui, achetez.", "Achat à 1,0850", "Acheter à 1,0850", "Sí, compra.", "Recomiendo comprar",
    "Je recommande d'acheter",
    "Consider a position around 1.0850 with protection under 1.0800 and aim at 1.0950.",
    "Risk it at 1.0800, reward at 1.0950", "In: 1.0850 Out: 1.0950", "aim at 1.0950",
])
def test_guard_flags_run83_leaks(text):
    assert openrouter_ai.has_trade_call(text), text


@pytest.mark.parametrize("text", [
    "Entry zone (pullback):\n1.0850", "نقطة الدخول (تقريباً):\n1.0850",
    '{\n"direction": "buy",\n"entry_price": 1.0850,\n"stop_loss": 1.0800\n}',
])
def test_guard_drops_run83_multiline_leaks(text):
    out = openrouter_ai.guard_answer(text, "en")
    assert "1.0850" not in out, out


@pytest.mark.parametrize("text", [
    "Each order has a side: buy or sell.",
    "A long wick at 1.0850 shows rejection.",
    "The daily close at 1.0950 was the highest this month.",
    "Yes, selling pressure increased after the data.",
    "Stop 3 of the lesson covers position sizing.",
    "Stop-loss placement:\n1.5×ATR beyond the swing is common.",
    "أدخل مؤشر RSI على الشارت من القائمة.",
    "Buyers stepped in near the lows yesterday.",
    "Target audience: beginners.",
])
def test_guard_run83_education_left_alone(text):
    assert openrouter_ai.guard_answer(text, "en") == text


# run 88: النسبة المعروضة من الحركة نفسها التي قرّرت الاتجاه — كانت «صاعد (تغيّر +0.00%)» على USDHKD
@pytest.mark.parametrize("lang", ["ar", "en"])
def test_direction_is_never_shown_next_to_zero_pct(monkeypatch, lang):
    base = _provider_series(0.0002, "USDHKD", 7.8, change_pct=0.0038)
    build = lambda *a, **k: base(*a, **k).model_copy(update={"change_pct": 0.0})
    monkeypatch.setattr(main, "build_series", build)
    monkeypatch.setattr(main.openrouter_ai, "configured", lambda: False)
    s = build("USDHKD")
    want = main._move_pct_text(s.last - s.candles[0].close, s.candles[0].close)
    body = TestClient(main.app).post("/api/ai/ask", json={"question": "رأيك؟", "symbol": "USDHKD", "lang": lang}).json()
    assert "0.00%" not in body["answer"]
    assert want in body["answer"] and want.startswith("+0.00")


def test_ai_context_pct_matches_real_move(monkeypatch):
    base = _provider_series(0.0002, "USDHKD", 7.8, change_pct=0.0038)
    monkeypatch.setattr(main, "build_series", lambda *a, **k: base(*a, **k).model_copy(update={"change_pct": 0.0}))
    monkeypatch.setattr(main.openrouter_ai, "configured", lambda: True)
    seen = {}
    monkeypatch.setattr(main.openrouter_ai, "trading_answer", lambda q, sym, ctx, lang: seen.setdefault("ctx", ctx))
    TestClient(main.app).post("/api/ai/ask", json={"question": "رأيك؟", "symbol": "USDHKD"})
    assert "bias=" in seen["ctx"] and "=+0.00%" not in seen["ctx"]


@pytest.mark.parametrize("move, first, want", [
    (0.0003, 7.8, "+0.0038%"),
    (-0.0003, 7.8, "-0.0038%"),
    (0.0030, 1.0, "+0.30%"),
    (-0.00001, 1.0, "-0.0010%"),
    (0.0, 1.0, "+0.00%"),
    (0.1, 0.0, None),
    (float("nan"), 1.0, None),
])
def test_move_pct_text(move, first, want):
    assert main._move_pct_text(move, first) == want


# run 90: صيغ كانت تمرّ الحارس (وتُقتبس بالقالب الاحتياطي حين لا نموذج)
RUN90_LEAKS = [
    "الستوب 1.0800", "الاستوب لوس 1.0800", "حط الستوب تحت 1.0800", "التارجت 1.0950", "تارجت 1.0950",
    "You should buy EURUSD.", "You should sell gold.", "Place a buy order now", "Place a sell order.",
    "خذ الربح عند 1.0950", "الربح عند 1.0950", "اغلق الصفقة عند 1.0950", "Targeting 1.0950", "Aiming 1.0950",
    "Take the trade at 1.0850", "Jump in at 1.0850", "Get in now", "Price should reach 1.0950, sell there.",
    "Demand zone 1.0840-1.0850, buy there", "@1.0850 buy", "E: 1.0850 S: 1.0800 T: 1.0950",
    "In at 1.0850, out at 1.0950", "بيع اليورو الآن", "بيع الذهب من 2400", "يجب أن تشتري الآن",
    "تشتري عند 1.0850", "الشراء منطقي الآن", "أرى أن الشراء مناسب الآن", "الشراء هو الخيار الأمثل",
    "لو كنت مكانك لاشتريت", "Buying here makes sense", "Selling here makes sense.",
    "پێویستە بکڕیت", "باشترە بکڕیت", "کڕین باشترە",
]


@pytest.mark.parametrize("text", RUN90_LEAKS)
def test_guard_flags_run90_leaks(text):
    assert openrouter_ai.has_trade_call(text)
    assert text not in openrouter_ai.guard_answer("RSI is 55.\n" + text, "en")


@pytest.mark.parametrize("text", [
    "Traders get in when the fast MA crosses.", "الخروج من السوق قرار صعب.", "الربح عند الإغلاق يُحسب بالنقاط.",
    "Aiming for consistency matters more than profit.", "Many traders buy there because support held.",
    "In at the open, out at the close is a day-trading style.", "الستوب يحمي رأس المال.",
    "التارجت يُحسب من نسبة المخاطرة.", "البيع على المكشوف مفهوم متقدّم.", "How to place a buy order.",
    "E: exponential. S: simple.", "ضغط البيع الآن قوي.", "حجم البيع الآن مرتفع.",
    "When you buy EURUSD you sell dollars.",
])
def test_guard_run90_education_left_alone(text):
    assert not openrouter_ai.has_trade_call(text)


# run 94: صيغ عربية فصيحة للوقف/الهدف/الخروج، وعنوان «شراء:»، و«Buy @ 2350» بسعر صحيح (ذهب/مؤشرات)
RUN94_LEAKS = [
    "إيقاف الخسارة: 1.0800", "ايقاف الخسارة عند 1.0800", "ضع إيقاف الخسارة عند 1.0800", "حد الخسارة: 1.0800",
    "جني ربح: 1.0950", "جني الأرباح 1.0950", "الخروج: 1.0950", "نقطة الخروج: 1.0950", "خروج 1.0950",
    "- شراء: 1.0850", "- بيع: 2350.5", "منطقة الشراء: 1.0850", "شراء: 2350",
    "Buy @ 2350", "Sell @ 38950", "SELL @ 2350",
]


@pytest.mark.parametrize("text", RUN94_LEAKS)
def test_guard_flags_run94_leaks(text):
    assert openrouter_ai.has_trade_call(text)
    assert text not in openrouter_ai.guard_answer("RSI is 55.\n" + text, "en")


@pytest.mark.parametrize("text", [
    "الخروج من السوق عند الأخبار", "حد الخسارة اليومي 2%", "خروج السعر فوق 1.0900 يعني كسراً",
    "حجم البيع: 1200", "ضغط البيع - 1.0850", "إيقاف الخسارة أداة لإدارة المخاطر", "بعد الخروج من النطاق 1.0800",
    "Buy @ 20%", "Traders tend to buy @ 2350",
])
def test_guard_run94_education_left_alone(text):
    assert not openrouter_ai.has_trade_call(text)
