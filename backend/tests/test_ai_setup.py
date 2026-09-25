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
    s = TestClient(main.app).post("/api/ai/ask", json={"question": "رأيك؟"}).json()["setup"]
    assert s["direction"] == want


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
