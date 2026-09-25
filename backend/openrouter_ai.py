"""OpenRouter LLM — trading assistant + academy interrupt."""
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
    return str(data["choices"][0]["message"]["content"]).strip()


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


def trading_answer(question: str, symbol: str, context: str, lang: str = "ar") -> str:
    system = (
        "أنت خبير تداول فوركس في منصة MATRIX. أجب باختصار وعملية. "
        "اذكر اتجاهاً محتملاً. "
        # لا رقم سعر من النموذج: كان يُطلب «دخولاً تقريبياً، وقفاً، هدفاً» بلا مستويات بالسياق ⇒ يخترعها،
        # وبطاقة `setup` تحمل مستويات ATR من الخادم ⇒ وقفان مختلفان لنفس الصفقة. (الصياغة «خبير» قرار أنس.)
        "لا تكتب أي رقم سعر (دخول/وقف/هدف/دعم/مقاومة) غير موجود حرفياً في السياق. "
        "إن حمل السياق computed_levels ووافقتَ على اتجاهها فاذكرها كما هي مع العائد إلى المخاطرة 1:2؛ "
        "وإن خالفتَ اتجاهها أو لم توجد فلا تذكر مستويات سعرية. "
        "لا تذكر نسبة نجاح أو احتمال ربح (لا بيانات تسندها). لا تعد بأرباح مضمونة. "
        "إن قال السياق إن السعر الحي غير متاح فلا تذكر أي مستويات سعرية.\n"
        + _REPLY_LANGUAGE.get(lang, _REPLY_LANGUAGE["ar"])
    )
    user = f"الرمز: {symbol}\nسياق السوق:\n{context}\n\nسؤال المتداول:\n{question}"
    return chat(system, user)


def interrupt_answer(
    question: str, segment_title: str, segment_text: str, lang: str = "ar"
) -> str:
    # نص المقطع قد يكون عربياً بينما واجهة المتعلّم إنجليزية/كردية — الرد يتبع لغة الواجهة
    # (نفس قاعدة trading_answer)، فيشرح المدرّس المقطع بلغة المتعلّم.
    system = (
        "أنت مدرّس أكاديمية MATRIX. المتعلّم أوقف الشرح الصوتي ليسأل. "
        "أجب بشكل مختصر وعملي ثم اذكر أن الشرح سيكمل.\n"
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
_AR_SUF = r"(?:ي|ية|يا|اً|ا|ً|ٍ|ٌ)?(?!\w)"
_BUY_RE = re.compile(
    _AR_PRE + r"(?:شراء|صعود|صاعد)" + _AR_SUF
    + r"|\b(?:buy|buying|bullish|uptrend)\b|\blong\b(?![- ](?:term|while|time|run|way|period))",
    re.IGNORECASE,
)
_SELL_RE = re.compile(
    _AR_PRE + r"(?:بيع|هبوط|هابط)" + _AR_SUF
    + r"|\b(?:sell|selling|shorting|bearish|downtrend)\b|\bshort\b(?![- ](?:term|while|time|run|period))",
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


def _negated(text: str, start: int) -> bool:
    before = _CLAUSE_END.split(text[:start])[-1]
    for w in before.split()[-4:]:
        w = _TASHKEEL.sub("", w.strip("\"'()«»").lower()).replace("\u2019", "'")
        if w in _NEGATION or w.endswith("n't"):
            return True
        # «ولا»/«فلا»/«ولن»… بحرف عطف ملتصق
        if len(w) > 2 and w[0] in "وف" and w[1:] in _NEGATION:
            return True
    return False


def parse_setup_hint(text: str) -> dict[str, Any]:
    """اتجاه الردّ إن كان جانباً واحداً بلا لبس، وإلا None. كان «buy» إن وُجدت كلمة شراء وإلا
    **«sell»** — ردّ بلا اتجاه (أو «انتظر») يصير توصية بيع؛ والمستويات 0.0 أرقام بشكل أسعار."""
    text = text or ""
    hits = [(m, side) for side, rx in (("buy", _BUY_RE), ("sell", _SELL_RE)) for m in rx.finditer(text)]
    if any(_negated(text, m.start()) for m, _ in hits):
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
