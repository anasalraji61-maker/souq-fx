"""OpenRouter LLM — educational analysis assistant + academy interrupt."""
from __future__ import annotations

import os
import re
from typing import Any

import httpx

OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "openai/gpt-4o-mini"


def configured() -> bool:
    return bool(_key())


def _key() -> str:
    return (os.getenv("OPENROUTER_API_KEY") or "").strip()


def _headers() -> dict[str, str]:
    return {
        "Authorization": f"Bearer {_key()}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://matrix-charts.local",
        "X-Title": "MATRIX Charts",
    }


def chat(system: str, user: str, max_tokens: int = 900) -> str:
    if not configured():
        raise RuntimeError("OPENROUTER_API_KEY not set")
    model = os.getenv("OPENROUTER_MODEL", DEFAULT_MODEL)
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "max_tokens": max_tokens,
        "temperature": 0.4,
    }
    with httpx.Client(timeout=45.0) as client:
        r = client.post(OPENROUTER_URL, headers=_headers(), json=payload)
        r.raise_for_status()
        data = r.json()
    # محتوى null (نفاد max_tokens قبل أي نصّ، أو فلتر محتوى) كان يُعاد نصّاً «None» جواباً للمتداول، و""
    # جواباً فارغاً — بلا استثناء فلا يعمل الردّ الاحتياطي. الآن خطأ ⇒ المسار الاحتياطي القائم.
    choice = data["choices"][0]
    content = choice["message"].get("content")
    text = content.strip() if isinstance(content, str) else ""
    # ردّ قُطع عند max_tokens كان يُعاد كاملاً: «وقف 1.08» بدل 1.0812 — رقم الخادم الصحيح مبتوراً إلى سعر
    # آخر. يُسقط السطر الأخير غير المكتمل ويُعلَّم الردّ بـ«…»؛ لا سطر مكتمل ⇒ خطأ ⇒ المسار الاحتياطي.
    if choice.get("finish_reason") == "length":
        text = text.rsplit("\n", 1)[0].strip() if "\n" in text else ""
        if text:
            text += "\n\n…"
    if not text:
        raise RuntimeError("OpenRouter returned no answer text")
    return text


# لغة ردّ المساعد تتبع لغة واجهة المتداول (يرسلها التطبيق بحقل `lang`)، لا لغة نص السؤال —
# فبعض الأسئلة (مثل قوالب التقرير الأسبوعي) مكتوبة بالعربية داخلياً حتى لمستخدم إنجليزي.
_REPLY_LANGUAGE = {
    "ar": "أجب بالعربية دائماً.",
    "en": "Always reply in English, whatever language the question is written in.",
    "ku": "Always reply in Kurdish (Sorani, Arabic script), whatever language the question is written in.",
}


def normalize_lang(value: str | None) -> str:
    """'en-US'/'en-GB' → 'en'، 'ku' → 'ku'، وأي قيمة أخرى أو غياب الحقل → 'ar' (توافق خلفي)."""
    v = (value or "").strip().lower()
    if v.startswith("en"):
        return "en"
    if v.startswith("ku"):
        return "ku"
    return "ar"


# قرار أنس ٤ (`docs/DECISIONS-ANAS.md`): «مساعد تحليل تعليمي» لا «خبير تداول». لا نقطة دخول ولا وقف ولا هدف
# ولا توصية شراء/بيع بأي صياغة ولو طلبها المستخدم صراحةً — وصف التطبيق بالمتجر «لا يقدّم نصيحة استثمارية».
# مسموح: شرح المؤشرات، وصف ما يظهر على الشارت، تعليم المفاهيم، شرح إدارة المخاطر. `guard_answer` يحرس الردّ.
_NO_TRADE_CALLS = (
    "ممنوع منعاً باتاً، ولو طلب المستخدم ذلك صراحةً وبأي صياغة: نقطة دخول، وقف خسارة، هدف ربح، "
    "أو توصية شراء/بيع (ولا «long/short» ولا «سيناريو» ولا «لو كنتُ مكانك»). إن طُلب شيء من ذلك فاعتذر بجملة "
    "واحدة بأنك مساعد تعليمي لا يقدّم توصيات تداول، ثم اشرح المفهوم المتعلّق تعليمياً. "
)


def trading_answer(question: str, symbol: str, context: str, lang: str = "ar") -> str:
    system = (
        "أنت مساعد تحليل تعليمي في منصة MATRIX. أجب باختصار ووضوح. "
        "مهمتك: شرح المؤشرات، ووصف ما يظهر على الشارت من السياق المعطى، وتعليم المفاهيم، وشرح إدارة المخاطر. "
        + _NO_TRADE_CALLS
        + "لا تكتب أي رقم سعر غير موجود حرفياً في السياق. "
        "لا تذكر نسبة نجاح أو احتمال ربح (لا بيانات تسندها). لا تعد بأرباح. "
        "إن قال السياق إن السعر الحي غير متاح فقل ذلك ولا تذكر أي أسعار.\n"
        + _REPLY_LANGUAGE.get(lang, _REPLY_LANGUAGE["ar"])
    )
    user = f"الرمز: {symbol}\nسياق السوق:\n{context}\n\nسؤال المستخدم:\n{question}"
    return chat(system, user)


def interrupt_answer(
    question: str, segment_title: str, segment_text: str, lang: str = "ar"
) -> str:
    # نص المقطع قد يكون عربياً بينما واجهة المتعلّم إنجليزية/كردية — الرد يتبع لغة الواجهة
    # (نفس قاعدة trading_answer)، فيشرح المدرّس المقطع بلغة المتعلّم.
    system = (
        "أنت مدرّس أكاديمية MATRIX. المتعلّم أوقف الشرح الصوتي ليسأل. "
        "أجب بشكل مختصر وعملي ثم اذكر أن الشرح سيكمل. "
        + _NO_TRADE_CALLS
        + "\n"
        + _REPLY_LANGUAGE.get(lang, _REPLY_LANGUAGE["ar"])
    )
    user = (
        f"المقطع: {segment_title}\n"
        f"نص المقطع: {segment_text}\n\n"
        f"سؤال المتعلّم: {question}"
    )
    return chat(system, user, max_tokens=600)


# كلمات الاتجاه **كلماتٍ كاملة**. كانت مطابقة نصّ جزئي: «short-term pullback» بردّ صاعد ⇒ بيع، «for a long
# while» بردّ هابط ⇒ شراء، و«بيع» داخل «طبيعي»/«الربيع» ⇒ بيع؛ و«bullish/bearish/صاعد/هابط» لم تكن تُعرف.
# ردّ يذكر الجانبين (صاعد ثم «قد يؤدي إلى الهبوط») يبقى بلا اتجاه — أسلم من جانب خاطئ.
_AR_PRE = r"(?<!\w)(?:[وف])?(?:[بلك])?(?:ال|لل)?"
# «ة»: «صاعدة/هابطة» (قناة، موجة) لم تكن تُعرف ⇒ ردّ عربي اتجاهه الوحيد بصيغة المؤنّث بلا بطاقة.
_AR_SUF = r"(?:ي|ية|يا|اً|ا|ً|ٍ|ٌ|ة|ةً)?(?!\w)"
# تعابير لا اتجاه فيها: «as long as» (= «طالما») كانت «buy» ⇒ «ابقَ خارج السوق طالما السعر بالنطاق» بطاقة شراء
# بدخول ووقف وهدف؛ و«fell short (of)»/«in short»/«short-lived» كانت «sell»، و«short squeeze»/«short covering»
# (صعود!) كانت «sell» على سلسلة هابطة. الـlookbehind ثابت الطول ⇒ بديل لكل صيغة.
_SHORT_IDIOM_PRE = "".join(
    rf"(?<!\b{w} )" for w in ("in", "fell", "fall", "falls", "falling", "fallen", "come", "comes", "came", "coming")
)
# «long/short» وصفاً لشمعة أو حركة لا مركزاً: «a long upper wick at resistance» (نمط هبوطي!) كانت «buy» ⇒ بطاقة
# شراء تحت ردّ يتوقّع الارتداد للأسفل، و«after a long rally … could correct lower» كذلك؛ و«short-sellers are
# covering, price is rising» كانت «sell».
_CANDLE_WORDS = (
    r"(?:upper|lower|wicks?|shadows?|tails?|candles?|candlesticks?|bodies|body|bars?|legs?|rally|rallies|"
    r"decline|declines|sell-?off|consolidation|range|streak|history)\b"
)
# سيولة/ضغط/حركة ماضية لا توصية: «swept sell-side liquidity … look for longs» و«the recent sell-off looks
# exhausted» و«Selling pressure is fading» كانت «sell» ⇒ بطاقة بيع تحت ردّ صاعد؛ «Buy-side liquidity was
# taken, expect a move lower» كانت «buy»؛ و«بعد الهبوط الأخير نتوقع ارتداداً» كانت «sell». و«longs/shorts»
# (مراكز) لم تكن تُعرف.
_NOT_A_CALL = r"(?![- ]?(?:side|off)\b)(?! (?:pressure|interest|climax|exhaustion|volume|flows?|programs?)\b)"
_AR_PAST = r"(?!\s+(?:ال)?أخير)"
_BUY_RE = re.compile(
    r"(?<!بعد )" + _AR_PRE + r"(?:شراء|صعود|صاعد)" + _AR_SUF + _AR_PAST
    + r"|\b(?:buy|buying|bullish|uptrend|longs)\b" + _NOT_A_CALL
    + r"|(?<!\bas )(?<!\bso )\blong\b(?! as\b)(?![- ](?:term|while|time|run|way|period|" + _CANDLE_WORDS + r"))",
    re.IGNORECASE,
)
_SELL_RE = re.compile(
    r"(?<!بعد )" + _AR_PRE + r"(?:بيع|هبوط|هابط)" + _AR_SUF + _AR_PAST
    + r"|\b(?:sell|selling|shorting|bearish|downtrend)\b" + _NOT_A_CALL
    + r"|\bshorts\b(?! (?:are |were )?covering)|" + _SHORT_IDIOM_PRE
    + r"\bshort\b(?![- ](?:term|while|time|run|period|lived|squeeze|covering|sellers?|of\b|" + _CANDLE_WORDS + r"))",
    re.IGNORECASE,
)


# نفيٌ قبل كلمة الاتجاه بنفس الجملة (حتى 4 كلمات): «Avoid shorting here» و«لا أنصح بالبيع» كانت
# «sell» فتُرفق مستويات بيع ووقف وهدف تحت ردّ يقول «لا تبع». كلمة اتجاه منفيّة ⇒ الردّ كله بلا اتجاه
# (لا نعكسه: «لا تبع» ليست «اشترِ»). النافذة لا تتجاوز حدّ الجملة ⇒ «ليست نصيحة مالية.» لا تُسقط البطاقة.
_NEGATION = frozenset({
    "not", "no", "never", "avoid", "avoiding", "against", "without", "dont", "don't", "cannot",
    "لا", "لن", "لم", "ليس", "ليست", "عدم", "تجنب", "بدون", "دون", "غير",
})
_CLAUSE_END = re.compile(r"[.!?؟؛;:,،\n]")
_TASHKEEL = re.compile(r"[\u064B-\u0652]")


# حكمٌ **بعد** كلمة الاتجاه بنفس الجملة يرفضها: «Selling at these levels would be a mistake» و«A sell is premature
# here» كانت «sell». مع النفي اللاحق («A buy is not justified yet»، «الشراء غير مستحسن الآن» كانت «buy»).
_REJECT_AFTER = frozenset({
    "mistake", "premature", "unwise", "inadvisable", "unjustified", "risky", "wrong", "dangerous",
    "خطأ", "خاطئ", "خاطئة", "مبكر", "مبكرا", "مبكرة", "خطير", "خطيرة", "مخاطرة",
})


def _neg_word(raw: str) -> str | None:
    w = _TASHKEEL.sub("", raw.strip("\"'()«»").lower()).replace("\u2019", "'")
    if w in _NEGATION or w.endswith("n't"):
        return w
    # «ولا»/«فلا»/«ولن»… بحرف عطف ملتصق
    if len(w) > 2 and w[0] in "وف" and w[1:] in _NEGATION:
        return w
    return None


def _negated(text: str, start: int, end: int | None = None) -> bool:
    before = _CLAUSE_END.split(text[:start])[-1]
    if any(_neg_word(w) for w in before.split()[-4:]):
        return True
    if end is None:
        return False
    after = _CLAUSE_END.split(text[end:])[0].split()[:8]
    return any(
        _neg_word(w) or _TASHKEEL.sub("", w.strip("\"'()«»").lower()) in _REJECT_AFTER for w in after
    )


def parse_setup_hint(text: str) -> dict[str, Any]:
    """اتجاه الردّ إن كان جانباً واحداً بلا لبس، وإلا None. كان «buy» إن وُجدت كلمة شراء وإلا
    **«sell»** — ردّ بلا اتجاه (أو «انتظر») يصير توصية بيع؛ والمستويات 0.0 أرقام بشكل أسعار."""
    text = text or ""
    hits = [(m, side) for side, rx in (("buy", _BUY_RE), ("sell", _SELL_RE)) for m in rx.finditer(text)]
    if any(_negated(text, m.start(), m.end()) for m, _ in hits):
        hits = []
    buy = any(side == "buy" for _, side in hits)
    sell = any(side == "sell" for _, side in hits)
    return {
        "direction": "buy" if buy and not sell else "sell" if sell and not buy else None,
        "entry": None,
        "sl": None,
        "tp": None,
        # كان 58 ثابتاً — نسبة نجاح مختلَقة؛ لا مصدر لها.
        "win_probability": None,
    }


# ─── حارس الردّ (قرار أنس ٤) ──────────────────────────────────────────────────
# التعليمات وحدها لا تضمن امتثال النموذج ⇒ يُسقط الخادم كل سطر فيه مستوى صفقة (كلمة دخول/وقف/هدف بجوار رقم
# سعر) أو توصية شراء/بيع صريحة، ويقول ذلك للمستخدم. الرقم الملاصق لـ×/pips/نقطة/%/ATR أو «1:2» ليس سعراً
# (شرح إدارة المخاطر مسموح: «ضع الوقف على بعد 1.5×ATR»). الكلمات الوصفية («صاعد»، «bullish») مسموحة: وصف
# الشارت ليس توصية.
_NUM = r"\d+(?:[.,]\d+)?(?!\s*(?:[x×:/%]|pips?\b|points?\b|نقط|نقاط|ATR|R\b|[.,]?\d))"
_LEVEL_WORD = (
    r"(?:\b(?:entry|entries|enter|stop[- ]?loss|stop|sl|take[- ]?profit|tp|targets?|profit target)\b"
    r"|" + _AR_PRE + r"(?:دخول|ادخل|وقف|هدف|أهداف|اهداف|جني الربح|جني الأرباح)" + _AR_SUF + r")"
)
_TRADE_CALL_RE = re.compile(
    # كلمة المستوى ثم رقم سعر بالسطر نفسه («entry 1.0843»، «وقف الخسارة عند 1.0812»)
    _LEVEL_WORD + r"[^\n\d]{0,30}?" + _NUM
    # رقم ثم كلمة المستوى («1.0950 as the target»)
    + r"|\d+[.,]\d+\s*(?:as\s+(?:an?|the|your)\s+)?" + _LEVEL_WORD
    # توصية صريحة
    + r"|\b(?:i|we)(?:\s+would|['’]d)?\s+(?:recommend|suggest|advise)\s+(?:you\s+)?(?:to\s+)?"
    r"(?:buy|sell|buying|selling|go(?:ing)?\s+(?:long|short)|a\s+(?:long|short|buy|sell))\b"
    + r"|\b(?:recommendation|signal|call|direction|action|trade)\s*[:\-–]\s*(?:buy|sell|long|short)\b"
    + r"|(?:^|[.!?]\s+|[-*•]\s*)(?:buy|sell|go\s+long|go\s+short)\s+(?:now|here|at|above|below|on|if|when|it|"
    r"this|the\s+(?:pair|dip|breakout|retest|rally)|[A-Z]{3,6}\b)"
    + r"|(?<!لا )(?<!لن )(?:أنصح|ننصح|أوصي|نوصي|يُنصح|ينصح)(?:ك|كم)?\s+(?:ب|ب?ال)?(?:شراء|بيع|دخول)"
    + r"|توصية\s*[:\-–]?\s*(?:ب|ب?ال)?(?:شراء|بيع)"
    + r"|(?:الاتجاه|القرار|الصفقة)\s*[:\-–]\s*(?:شراء|بيع)"
    + r"|(?:^|[.!؟]\s*|[-*•]\s*)(?:اشترِ|اشتر|بِع|ادخل)(?!\w)",
    re.IGNORECASE | re.MULTILINE,
)
# الكردية على النصّ العربي (نفس الأبجدية) كقالب `ai_ask` الاحتياطي — لا مراجعة لغوية كردية.
_GUARD_NOTE = {
    "ar": "_حُذف من الردّ ما يشبه توصية تداول (دخول/وقف/هدف أو شراء/بيع): مساعد MATRIX تعليمي ولا يقدّم توصيات._",
    "en": "_Part of this reply looked like a trade recommendation (entry/stop/target or buy/sell) and was removed: "
          "MATRIX's assistant is educational and does not give trade calls._",
}
_GUARD_REFUSAL = {
    "ar": "مساعد MATRIX تعليمي: لا يقدّم نقاط دخول ولا وقف خسارة ولا أهداف ولا توصيات شراء/بيع. "
          "يمكنني شرح المؤشرات، أو وصف ما يظهر على الشارت، أو شرح إدارة المخاطر.",
    "en": "MATRIX's assistant is educational: it does not give entries, stop-losses, targets or buy/sell calls. "
          "I can explain indicators, describe what the chart shows, or explain risk management.",
}


def has_trade_call(text: str) -> bool:
    return bool(_TRADE_CALL_RE.search(text or ""))


def guard_answer(text: str, lang: str = "ar") -> str:
    """يُسقط أسطر التوصيات من ردّ النموذج (قرار أنس ٤). لا سطر نظيف باقٍ ⇒ ردّ الاعتذار التعليمي."""
    lines = (text or "").split("\n")
    kept = [ln for ln in lines if not has_trade_call(ln)]
    if len(kept) == len(lines):
        return text
    if not any(re.search(r"\w", ln) for ln in kept):
        return _GUARD_REFUSAL["en" if lang == "en" else "ar"]
    body = re.sub(r"\n{3,}", "\n\n", "\n".join(kept)).strip()
    return f"{body}\n\n{_GUARD_NOTE["en" if lang == "en" else "ar"]}"
