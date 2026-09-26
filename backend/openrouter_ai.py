"""OpenRouter LLM — educational analysis assistant + academy interrupt."""
from __future__ import annotations

import os
import re
import unicodedata
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
# «away/apart/ضعف»: مسافة لا سعر («a 1.5× ATR stop would be about 0.0098 away»، «على بعد 1.5 ضعف ATR»)
# run 80: «/» بعده سعر عشري زوج مستويات لا نسبة («SL/TP: 1.0800/1.0950» كان يمرّ)
_NOT_PRICE_AFTER = r"(?!\s*(?:[x×:%]|/(?!\s*\d+[.,]\d)|pips?\b|points?\b|نقط|نقاط|ATR|R\b|away\b|apart\b|ضعف|أضعاف)|[.,]?\d)"
# run 80: أيّ عدد صحيح كان «سعراً» ⇒ «Exit polls … in 2024»، «Stop 3 of the lesson»، «Target audience: 18+»
# تُحذف ويصير الردّ كلّه اعتذاراً. الآن: عشري، أو صحيح 3+ أرقام ليس سنة («in 2024»، «1980s»)، أو صحيح قصير
# (نفط 65) ينتهي عنده الكلام («Entry 65, stop 62») لا متبوعاً بكلمة («3 key ideas») ولا بعد اسم مؤشر (RSI 14).
_NUM = (
    r"(?:\d+[.,]\d+"
    r"|(?<![\d.,])(?<!\bin\s)(?<!since\s)(?<!during\s)(?<!\bby\s)(?<!\bof\s)\d{3,}(?!s\b)(?![+\d])"
    r"|(?<![\d.,])(?<!RSI\s)(?<!EMA\s)(?<!SMA\s)(?<!ADX\s)(?<!CCI\s)(?<!MFI\s)(?<!period\s)(?<!length\s)"
    r"\d{1,2}(?=\s*(?:$|[,;)]|\.(?!\d)|\s(?:and|or|then|now|here|with)\b)))"
) + _NOT_PRICE_AFTER
# run 78: فجوة بين كلمة المستوى والسعر تتخطّى مسافة بالنقاط («SL: 20 pips below 1.0850» كان يمرّ)
_GAP = r"(?:[^\n\d]|\d+(?:[.,]\d+)?\s*(?:pips?|points?|نقط\w*|[x×]\s*ATR)(?!\w))"
# run 78: اختصارات وصيغ كانت تمرّ (tgt/PT/S/L/T/P/TP1/SL1.0800، take profits، exit، invalidation، get in،
# cut losses، close the trade، «هدفنا»، الكردية والفرنسية/الإسبانية). «stop run/hunt» و«the entry of the
# London session» و«الهدف من هذا الدرس» وصف لا مستوى.
_LEVEL_WORD = (
    r"(?:\b(?:entry(?:\s?price)?(?!\s+of\s+the\b)|entries|enter|stop[- ]?loss(?:es)?|stops?(?![- ](?:run|hunt))"
    r"|s/?l\d?|take[- ]?profits?|t/?p\d?|pt|tgt|targets?(?!\s+of\s+th)|profit target|invalidation"
    r"|objective(?!\s+of\s+th)|exit(?!\s+of\b)|entrée|objectif|objetivo|entrada)(?![a-z])"
    # run 90: «Targeting 1.0950»، «Aiming 1.0950»، «Take the trade at 1.0850»، «Jump in at 1.0850»
    r"|\btargeting\b|\baim(?:ing|s)?\b|\b(?:take|enter)\s+(?:the|this)\s+(?:trade|position)\b|\bjump\s+in\b|\bget\s+(?:in|out)\b|\bcut\s+(?:your\s+|the\s+)?loss(?:es)?\b"
    r"|\bclose\s+(?:the|your|this)\s+(?:trade|position)\b"
    r"|" + _AR_PRE + r"(?:دخول|ادخل|إدخال|وقف|هدف|أهداف|اهداف|مستهدف|جني\s+(?:ال)?(?:ربح|أرباح)|(?:إيقاف|حد)\s+(?:ال)?خسار[ةه])(?:نا|ك|كم|ه|ها)?" + _AR_SUF
    + r"(?!\s+من\s+(?:هذ|ال|درس))"
    # run 94: «الخروج: 1.0950»، «نقطة الخروج 1.0950»، «خروج 1.0950» — «خروج السعر فوق 1.09» وصف كسر لا مستوى
    r"|(?<!\w)(?:(?:نقطة|نقطه|سعر|مستوى)\s+)?(?:ال)?خروج(?=\s*(?:[:\-–—=]|\d))"
    r"|ستۆپ(?:\s*لۆس)?|تەیک\s*پرۆفیت|ئامانج\w*|چوونەژوورەوە|وەستاندنی\s+زیان|زیان\s*وەستاندن"
    # run 80: التعريب الصوتي «ستوب لوس 1.0800»، «تيك بروفيت 1.0950»
    r"|(?<!\w)(?:ستوب|ستب)(?:\s*لوس)?(?!\w)|(?<!\w)تيك\s*بروفيت(?!\w)"
    # run 90: المعرَّف «الستوب/الاستوب لوس»، «التارجت/تارجت»، «خذ الربح»، «اغلق الصفقة»
    r"|(?<!\w)و?ال(?:ا)?(?:ستوب|ستب)(?:\s*لوس)?(?!\w)|(?<!\w)(?:و?ال)?تارجت(?:ات)?(?!\w)"
    r"|(?<!\w)(?:خذ|اخذ)\s+(?:ال)?(?:ربح|ارباح)(?!\w)|(?<!\w)(?:اغلق|أغلق)\s+(?:ال)?(?:صفقة|صفقه|مركز)(?!\w)"
    # run 83: التركية والألمانية («Giriş: 1.0850»، «zarar durdur 1.0800»، «hedef 1.0950»، «Einstieg 1.0850»)
    r"|\b(?:giri[şs]|zarar\s+durdur|hedef|k[aâ]r\s+al|einstieg|kursziel)\w*)"
    # run 83: رقم ترتيب بعد الكلمة («Target 1: 1.0950»، «TP 2: 1.1000»، «T1 1.0950») — كان الرقم يقطع الفجوة
    r"(?:\s*#?\d(?![\d.,]))?"
)
# «T1/T2» اختصار هدف مرقَّم — لا يُضاف لـ_LEVEL_WORD نفسه (تُلحقه اللاحقة أعلاه)
_LEVEL_WORD = r"(?:" + _LEVEL_WORD + r"|\bt\d(?![\d.,])(?![a-z]))"
# run 83: «أ/إ/آ» ⇒ «ا» بـ`_guard_norm` («انصحك بالشراء»، «إشتري») ⇒ الأنماط تُكتب بالألف المجرّدة كذلك
_ALEF = str.maketrans("أإآ", "ااا")
_LEVEL_WORD = _LEVEL_WORD.translate(_ALEF)
_PRICE = r"\d+[.,]\d+" + _NOT_PRICE_AFTER
# فعل صفقة (لا وصف): «selling pressure»/«sell-off»/«buy-side»/«short-term» وصف للسوق ⇒ مستثناة
# «Many traders sell at resistance like 1.0950» / «tend to buy near 1.0800»: وصف سلوك المتداولين، لا أمر
_EN_ACT = (
    r"(?<!traders )(?<!tend to )(?<!often )(?<!usually )(?<!typically )\b(?:buy|sell|buying|selling|shorting|short\s+(?:it|this|here)|go(?:ing)?\s+(?:long|short)"
    r"|enter(?:ing)?\s+(?:long|short)|an?\s+(?:long|short)\s+(?:position|trade|entry)|(?:long|short)\s+position)\b"
    r"(?![-‑](?:off|side))(?!\s+(?:pressure|interest|volume|climax|momentum|activity|power|wave|orders?)\b)"
)
_AR_ACT = r"(?<!\w)(?<!ضغط )(?<!قوى )(?<!عمليات )(?<!حجم )(?<!زخم )(?<!موجة )(?<!موجه )(?<!قوة )(?<!قوه )(?:ال)?(?:شراء|بيع)(?!\w)"
# أمر صفقة بأول الجملة: «Buy.»، «Go long.»، «Short it.»، «long EURUSD»، «Accumulate gold below 2350».
# الرمز حساس لحالة الأحرف (EURUSD، EUR/USD) — «Long wicks»/«Short-term» ليست أمراً.
_EN_ORDER = (
    r"(?:^\s*|[.!?]\s+|[-*•>,:;—–]\s*|\d[.)]\s*)(?:buy|sell|long|short|go\s+(?:long|short)|get\s+(?:long|short)"
    r"|load\s+up(?:\s+on)?|accumulate|consider\s+(?:buying|selling|shorting|going\s+(?:long|short)|an?\s+(?:long|short)))"
    r"(?![-‑\w])\s*(?:[.!]|$|(?:now|here|at|above|below|on|if|when|it|this|gold|silver|oil|crude|bitcoin|btc"
    r"|the\s+(?:pair|dip|breakout|retest|rally|euro|dollar|yen|pound))\b|(?-i:(?!(?:EMA|SMA|WMA|RSI|MACD|ATR|ADX|CCI|MFI|OBV|VWAP)\b)[A-Z]{3,6}\b|[A-Z]{3}/[A-Z]{3}))"
)
_TRADE_CALL_RE = re.compile(
    # كلمة المستوى ثم رقم سعر بالسطر نفسه («entry 1.0843»، «وقف الخسارة عند 1.0812»)
    _LEVEL_WORD + _GAP + r"{0,30}?" + _NUM
    # رقم ثم كلمة المستوى («1.0950 as the target»)
    + r"|\d+[.,]\d+\s*(?:as\s+(?:an?|the|your)\s+)?" + _LEVEL_WORD
    # توصية صريحة
    + r"|\b(?:i|we)(?:\s+would|['’]d)?\s+(?:recommend|suggest|advise)\s+(?:you\s+)?(?:to\s+)?"
    r"(?:buy|sell|buying|selling|go(?:ing)?\s+(?:long|short)|a\s+(?:long|short|buy|sell))\b"
    + r"|\b(?:recommendation|signal|call|direction|action|trade|advice|suggestion|verdict|bias|idea|setup|position"
    r"|answer|take|side|order|view|opinion|buy\s*/\s*sell|long\s*/\s*short)"
    r"\s*[:\-–—=]\s*"
    # «Each order has a side: buy or sell» شرح لا توصية
    r"(?!\s*(?:buy|sell|long|short)\s*(?:/|or|and|أو)\s*(?:buy|sell|long|short)\b)"
    r"(?:[^\n.:]{0,20}?[\s,])?(?:buy|sell|long|short)\b(?![-‑])"
    # سعر ثم كلمة المستوى بعدها بالسطر نفسه («1.0950, a good place to take profit»)
    + r"|" + _PRICE + r"[^\n\d]{0,40}?" + _LEVEL_WORD
    # فعل صفقة ثم سعر («You could buy near 1.0850»، «Short it at 1.0900»)
    + r"|" + _EN_ACT + r"[^\n\d]{0,30}?" + _PRICE
    # … أو سعر صحيح (ذهب/بيتكوين) بعد حرف جرّ («buy near 2350»)
    + r"|" + _EN_ACT + r"[^\n\d]{0,30}?(?:\b(?:at|near|around|below|above|from|under|over)|@)\s*\d{3,}(?![\d.,%])"
    + r"|\b(?:pending\s+)?(?:buy|sell)\s+(?:limit\s+|stop\s+)?orders?\s+(?:at|near|around|@)\s*\d"
    + r"|" + _EN_ORDER
    # run 83: جواب مباشر «Yes, buy now.»، «Yes — buying here makes sense»، «Buy? Yes.»
    + r"|\b(?:yes|yeah|yep|absolutely|definitely)\b[\s,.!:—–-]*(?:buy(?:ing)?|sell(?:ing)?|short(?:ing)?|go(?:ing)?\s+(?:long|short))\b"
    r"(?![-‑])(?!\s+(?:pressure|interest|volume|climax|momentum|activity|power|wave|orders?|signals?)\b)"
    + r"|\b(?:buy|sell|long|short)\s*\?\s*(?:yes|yeah|yep|absolutely|definitely)\b"
    # run 83: «Longs at 1.0850»، «Shorts from 1.0950»، «A long here at 1.0850»
    + r"|\b(?:longs|shorts|an?\s+(?:long|short)(?=\s+(?:here|from|at|near|around|above|below|@)\b))"
    r"\s+(?:here\s+)?(?:from|at|near|around|above|below|@)\s*" + _PRICE
    # run 83: إعداد بصيغة وصفية «Consider a position around 1.0850 with protection under 1.0800»، «In: 1.0850 Out: 1.0950»
    + r"|\b(?:consider|open|take|initiate)\s+an?\s+(?:new\s+)?position\b[^\n\d]{0,20}?" + _PRICE
    + r"|\bprotection\s+(?:under|below|above|over|at|near|around)\s*" + _PRICE
    + r"|\b(?:risk\s+it|reward)\s+(?:at|near|around|@)\s*" + _PRICE
    + r"|\bin\s*:\s*\d+[.,]\d+[^\n\d]{0,10}\bout\s*:\s*" + _PRICE
    # run 83: أمر بأول الجملة «Scale in at 1.0850»، «Add at …»، «Close at …»، «Hold until …» («the daily close at» وصف)
    + r"|(?:^\s*|[.!?]\s+|[-*•>,:;—–]\s*)(?:scale\s+in|add(?:\s+more)?|close(?:\s+it)?|hold(?:\s+it)?)\s+"
    r"(?:at|near|around|until|@)\s*" + _PRICE
    # run 80: صيغ أوامر كانت تمرّ
    + r"|\b(?:place|put|set|use)\s+an?\s+(?:(?:pending|limit|stop|buy|sell)\s+){0,3}orders?\s+"
    r"(?:at|near|around|above|below|@)\s*\d"
    + r"|\b(?:book|take|lock\s+in|bank)\s+(?:some\s+|partial\s+)?profits?\s+(?:at|near|around|above|below|@)\s*\d"
    + r"|\b(?:take|close|scale\s+out(?:\s+of)?)\s+(?:half|part|some|partials?)(?:\s+off)?\s+(?:at|near|around|@)\s*\d"
    + r"|(?:^\s*|[.!?]\s+|[-*•>]\s*)move\s+(?:the\s+|your\s+)?stop\s+to\s+(?:break[- ]?even|entry)\b"
    + r"|\binvalid(?:ated)?\s+(?:below|above|under|over|on\s+a\s+close)\b[^\n\d]{0,20}?" + _PRICE
    + r"|\bfade\b[^\n\d]{0,30}?" + _PRICE
    + r"|\b(?:look\s+for|take|consider|favou?r|prefer)\s+(?:longs|shorts)\b[^\n\d]{0,15}?" + _PRICE
    + r"|\b(?:(?:long|short|cover)\s+(?:from|at|above|below|near|around|under|over|@)\s*|(?:long|short)\s+)" + _PRICE
    + r"|\d+[.,]\d+\s*[:→\-–—]\s*(?:long|short|buy|sell)\b(?![-‑\w])"
    r"(?!\s+(?:wicks?|shadows?|tails?|candles?|bod(?:y|ies)|term|squeeze|covering)\b)"
    + r"|(?<!not\s)(?<!never\s)\brecommend(?:s|ed)?\s+(?:buying|selling|shorting|going\s+(?:long|short))\b"
    + r"|\bR\s*[:/]\s*R\b[^\n]{0,20}?\b(?:from|at|@)\s*" + _PRICE
    # حثّ بفعل مساعد على الآن/هنا/هذا الزوج — «you would buy when the fast MA crosses» شرح استراتيجية، مسموح
    + r"|\b(?:you|traders?|one)\s+(?:should|could|might|may|can|must|need\s+to|(?:might\s+|may\s+)?want\s+to)\s+"
    r"(?:(?:consider|look\s+to|think\s+about)\s+)?(?:buy(?:ing)?|sell(?:ing)?|short(?:ing)?|go(?:ing)?\s+(?:long|short)|enter)\b"
    r"(?=\s*(?:[.!?]|$)|[^\n.!?]{0,40}?(?:\bnow\b|\bhere\b|\btoday\b|\bthis\b|\bit\b|\bthe\s+pair\b|" + _PRICE + r"))"
    + r"|\b(?:i|we)(?:['’]d|['’]ll|\s+would|\s+will)\s+(?:be\s+)?(?:an?\s+)?(?:buy(?:ing|er)?|sell(?:ing|er)?"
    r"|go(?:ing)?\s+(?:long|short)|get(?:ting)?\s+(?:long|short|in)|short(?:ing)?)\b"
    + r"|\b(?:i['’]m|i\s+am|we['’]re|we\s+are)\s+(?:long|short)\b(?![-‑])(?!\s+(?:on|of)\b)"
    + r"|\b(?:good|right|best|ideal|great)\s+(?:time|moment|opportunity|place|spot|level|chance)\s+to\s+"
    r"(?:buy|sell|short|go\s+long|go\s+short|enter)\b"
    + r"|\btime\s+to\s+(?:buy|sell|short|go\s+(?:long|short)|get\s+in)\b"
    + r"|\b(?:is|it['’]s|looks\s+like)\s+an?\s+(?:strong\s+|clear\s+|good\s+)?(?:buy|sell)\b(?![-‑])"
    r"(?!\s+(?:signal|zone|side|order|stop|limit)s?\b)"
    + r"|\bstrong\s+(?:buy|sell)\b(?![-‑])(?!\s+signals?\b)"
    + r"|\b(?:long|short)\s+(?:opportunit(?:y|ies)|setup|entry|trade\s+idea)\b"
    # run 94: عنوان «- شراء: 1.0850»، «منطقة البيع: 2350» — «حجم البيع: 1200» مستثنى بـ_AR_ACT
    + r"|" + _AR_ACT + r"\s*[:\-–—=]\s*(?:\d+[.,]\d+|\d{3,})"
    + r"|" + _AR_ACT + r"\s+(?:من|عند|قرب|فوق|تحت|حول|الآن|الان|فورا|فوراً)(?!\w)"
    + r"|(?:يفضل|الأفضل|الافضل|من الأفضل|فرصة|فرصه)\s+(?:ل|ال|لل)?(?:شراء|بيع|دخول)(?!\w)"
    + r"|(?<!لا )(?<!لن )(?:أنصح|ننصح|أوصي|نوصي|ينصح)(?:ك|كم)?\s+(?:ب|ب?ال)?(?:شراء|بيع|دخول)"
    + r"|توصية\s*[:\-–—]?\s*(?:ب|ب?ال)?(?:شراء|بيع)"
    + r"|(?:الاتجاه|القرار|الصفقة|إشارة|اشارة|الإشارة|الاشارة)\s*[:\-–—=]\s*(?:ال)?(?:شراء|بيع)"
    + r"|(?:توصيتي|توصيتنا|الأنسب|الانسب|خياري)\s*(?:هي|هو)?\s*[:\-–—]?\s*(?:ال)?(?:شراء|بيع)(?!\w)"
    # run 90: فعل بلا حرف جرّ أو مع مفعول («بيع اليورو الآن»، «بيع الذهب من 2400»)، المضارع للمخاطَب
    # («يجب أن تشتري الآن»، «تشتري عند 1.0850»)، «الشراء منطقي/مناسب/الخيار الأمثل»، «لو كنت مكانك لاشتريت»
    + r"|" + _AR_ACT + r"\s+\S+\s+(?:الآن|الان|فورا|فوراً|(?:من|عند|قرب|فوق|تحت)\s*\d)"
    + r"|(?:يجب|ينبغي|عليك|لازم)\s+(?:ان\s+)?(?:تشتري|تبيع|تدخل)(?!\w)"
    + r"|(?<!\w)(?:تشتري|تبيع|تدخل)(?!\w)[^\n\d]{0,15}?(?:الآن|الان|فورا|هنا|(?:من|عند|قرب|فوق|تحت)\s*\d)"
    + r"|(?<!\w)ال(?:شراء|بيع)\s+(?:هو\s+)?(?:الخيار\s+)?(?:افضل|الافضل|انسب|الانسب|امثل|الامثل|منطقي|مناسب)(?!\w)"
    + r"|(?<!\w)ل(?:اشتريت|بعت|دخلت)(?!\w)"
    + r"|\b(?:buying|selling|shorting|going\s+(?:long|short))\s+(?:here|now|at\s+these\s+levels)\s+"
    r"(?:makes\s+sense|is\s+(?:\w+\s+)?(?:good|fine|reasonable|smart|wise|better|best|justified))\b"
    # run 90: «You should buy EURUSD.»، «You should sell gold.»
    + r"|\b(?:you|traders?|one)\s+(?:should|could|might|may|can|must|need\s+to|(?:might\s+|may\s+)?want\s+to)\s+"
    r"(?:buy|sell|short)\s+(?:(?:gold|silver|oil|crude|bitcoin|btc|the\s+(?:euro|dollar|yen|pound))\b"
    r"|(?-i:(?!(?:EMA|SMA|WMA|RSI|MACD|ATR|ADX|CCI|MFI|OBV|VWAP)\b)[A-Z]{3,6}\b|[A-Z]{3}/[A-Z]{3}))"
    # run 90: أمر بلا سعر «Place a buy order now.»، و«sell there»/«@1.0850 buy»، و«E: 1.0850 S: 1.0800»، «In at … out at …»
    + r"|(?:^\s*|[.!?]\s+|[-*•>,:;—–]\s*)(?:place|open|put\s+in|enter)\s+an?\s+(?:buy|sell|long|short)\s+"
    r"(?:order|trade|position)\s*(?:[.!]|$|(?:now|here|today)\b)"
    + r"|(?<!traders )(?<!tend to )(?<!often )(?<!usually )(?<!typically )\b(?:buy|sell|short)\s+(?:from\s+)?there\b|@\s*\d+[.,]\d+\s*(?:buy|sell|long|short)\b"
    + r"|(?-i:\bE)\s*:\s*\d+[.,]\d+[^\n]{0,15}?(?-i:\b(?:S|SL|T|TP))\s*:\s*\d"
    + r"|\bin\s+at\s*\d+[.,]\d+[^\n\d]{0,15}\bout\s+at\s*\d"
    + r"|\bget\s+in\s+(?:now|here|today)\b|(?<!\w)(?:ال)?(?:ربح|خروج)\s+(?:عند|قرب|من|فوق|تحت)\s*" + _PRICE
    + r"|(?:^|[.!؟]\s*|[-*•]\s*)(?:اشتر|اشتري|بع|ادخل)(?!\w)"
    # «أدخل مؤشر RSI» (أضِف) تصير «ادخل» بعد توحيد الألف — إدخال بالواجهة لا دخول صفقة
    r"(?!\s+(?:ال)?(?:مؤشر|اداة|أداة|قيمة|رقم|اسم|بريد|كود|رمز|اعدادات|إعدادات|اعداد|إعداد|الى|إلى|على)(?!\w))"
    # run 83: «قم بالشراء الآن»، «نصيحتي: شراء»، «رأيي شراء»، «الجواب: شراء»، «الشراء أفضل»
    + r"|(?<!لا )(?:قم|قوموا)\s+ب(?:ال)?(?:شراء|بيع|دخول)(?!\w)"
    + r"|(?:نصيحتي|نصيحتنا|رأيي|رأينا|الجواب|الإجابة|جوابي)\s*(?:هي|هو)?\s*[:\-–—]?\s*(?:ب?ال)?(?:شراء|بيع)(?!\w)"
    + r"|(?<!\w)ال(?:شراء|بيع)\s+(?:هو\s+)?(?:أفضل|الأفضل|أنسب|الأنسب)(?!\w)"
    + r"|(?:افتح|أدخل|ادخل|نفذ|خذ)\s+(?:صفقة|صفقه|مركز)\s+(?:ال)?(?:شراء|بيع)"
    # الكردية (سۆرانی): کڕین/فرۆشتن مع سعر أو «ئێستا» (الآن) أو «بکە» (افعل)
    + r"|(?:کڕین|فرۆشتن)\w*[^\n\d]{0,25}?(?:\d|ئێستا|بکە)"
    # run 80: فعل الأمر «بکڕە/بیکڕە/بفرۆشە»، «EURUSD: کڕین»، و«… پێشنیار دەکەم» (أنصح)
    + r"|(?<!\w)بی?(?:کڕە|فرۆشە)(?!\w)"
    # run 90: «پێویستە بکڕیت»، «باشترە بکڕیت»، «کڕین باشترە»
    + r"|(?:پێویستە|باشترە|دەبێت|دەبێ)\s+(?:\S+\s+)?بی?(?:کڕیت|فرۆشیت)(?!\w)|(?:کڕین|فرۆشتن)\w*\s+باشترە"
    + r"|(?:^\s*|[:\-–—=]\s*)(?:کڕین|فرۆشتن)\s*(?:[.!]|$)"
    + r"|(?:کڕین|فرۆشتن)\w*[^\n]{0,30}?پێشنیار|پێشنیار\w*[^\n]{0,30}?(?:کڕین|فرۆشتن)"
    # الفرنسية/الإسبانية: فعل أمر صفقة مع سعر أو «الآن»
    + r"|\b(?:achetez|achète|achetons|acheter|achat|vendez|vends|vendre|vente|compra|compre|comprar|vende|venda|vender"
    r"|ingresa|kaufen|kaufe|verkaufen|verkaufe|al[ıi][şs]|sat[ıi][şs])\b[^\n\d]{0,30}?(?:\d|maintenant|ahora|jetzt|şimdi)"
    # run 83: «Oui, achetez.»، «Sí, compra.»، «Satın al»، «Recomiendo comprar»، «Je recommande d'acheter»
    + r"|(?:^\s*|[.!?,:;—–-]\s*)(?:achetez|achète|vendez|vends|compra|compre|vende|venda|kaufen|verkaufen)\s*(?:[.!]|$)"
    + r"|\bsat[ıi]n\s+al(?!\w)"
    + r"|\b(?:recomiendo|recomendamos|recommande|recommandons|empfehle)\s+(?:de\s+|d['’]\s*|zu\s+)?"
    r"(?:comprar|vender|acheter|vendre|kaufen|verkaufen)\b",
    re.IGNORECASE | re.MULTILINE,
)
_TRADE_CALL_RE = re.compile(_TRADE_CALL_RE.pattern.translate(_ALEF), _TRADE_CALL_RE.flags)
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


def _guard_norm(text: str) -> str:
    # التشكيل («بِع»، «اشترِ»، «يُفضّل») وتنسيق Markdown («**Entry:** 1.0850») لا يغيّران المعنى
    # run 80: أحرف عريضة («Ｅｎｔｒｙ») ⇒ NFKC؛ وسوم HTML ورموز/إيموجي قبل الأمر («🟢 BUY»، «<b>BUY</b>»)
    # وعلامات اقتباس JSON («{"direction":"sell"}») تُزال؛ الفاصلة العربية العشرية «١٫٠٨٥٠» ⇒ نقطة.
    t = unicodedata.normalize("NFKC", _TASHKEEL.sub("", text or ""))
    t = re.sub(r"</?[A-Za-z][^<>\n]{0,40}>", " ", t)
    t = "".join(" " if unicodedata.category(ch) in ("So", "Sk", "Cs") or ch in "\ufe0f\u200d{}\"" else ch for ch in t)
    t = re.sub(r"(?<=\d)٫(?=\d)", ".", t)
    # run 83: «_» مسافة لا حذف: «entry_price» كان «entryprice» فلا يُعرف «entry»
    return re.sub(r"[*`]", "", t).replace("_", " ").translate(_ALEF)


def has_trade_call(text: str) -> bool:
    return bool(_TRADE_CALL_RE.search(_guard_norm(text)))


# run 78: الحارس كان يفحص كل سطر وحده ⇒ «Entry:\n1.0850» وقائمة «- Entry\n  - 1.0850» وجدول
# «| Entry | Stop | Target |» صفوفه أسعار كانت تمرّ كاملة.
_LABEL_END_RE = re.compile(_LEVEL_WORD + r"[\s:：\-–—=→←>|]*$", re.IGNORECASE)
_STARTS_NUM_RE = re.compile(r"^[\s\-*•>|:=→←]*\d")
# run 83: «Entry zone (pullback):\n1.0850» — كلام بعد الكلمة ثم سعر عشري بأول السطر التالي
_LABEL_NOTE_END_RE = re.compile(_LEVEL_WORD + r"[^\n\d]{0,30}[:：\-–—=→]\s*$", re.IGNORECASE)
_STARTS_PRICE_RE = re.compile(r"^[\s\-*•>|:=→←]*" + _PRICE)  # «1.5×ATR» مسافة لا سعر


def _trade_call_lines(lines: list[str]) -> set[int]:
    bad = {i for i, ln in enumerate(lines) if has_trade_call(ln)}
    # كلمة مستوى تنتهي بها سطر، والسطر غير الفارغ التالي يبدأ برقم
    filled = [i for i, ln in enumerate(lines) if ln.strip()]
    for a, b in zip(filled, filled[1:]):
        la, lb = _guard_norm(lines[a]), _guard_norm(lines[b])
        if (_LABEL_END_RE.search(la) and _STARTS_NUM_RE.match(lb) and has_trade_call(lines[a] + " " + lines[b])) or (
            _LABEL_NOTE_END_RE.search(la) and _STARTS_PRICE_RE.match(lb)
        ):
            bad |= {a, b}
    # جدول Markdown: رأسه فيه كلمة مستوى وصفوفه أسعار ⇒ يُحذف الجدول كله
    i = 0
    while i < len(lines):
        if not lines[i].lstrip().startswith("|"):
            i += 1
            continue
        j = i
        while j < len(lines) and lines[j].lstrip().startswith("|"):
            j += 1
        flat = re.sub(r"[|\-:\s]+", " ", " ".join(lines[i:j]))
        if re.search(_LEVEL_WORD, _guard_norm(lines[i]), re.IGNORECASE) and has_trade_call(flat):
            bad |= set(range(i, j))
        i = j
    return bad


def guard_answer(text: str, lang: str = "ar") -> str:
    """يُسقط أسطر التوصيات من ردّ النموذج (قرار أنس ٤). لا سطر نظيف باقٍ ⇒ ردّ الاعتذار التعليمي."""
    lines = (text or "").split("\n")
    bad = _trade_call_lines(lines)
    if not bad:
        return text
    kept = [ln for i, ln in enumerate(lines) if i not in bad]
    if not any(re.search(r"\w", ln) for ln in kept):
        return _GUARD_REFUSAL["en" if lang == "en" else "ar"]
    body = re.sub(r"\n{3,}", "\n\n", "\n".join(kept)).strip()
    return f"{body}\n\n{_GUARD_NOTE["en" if lang == "en" else "ar"]}"


def reply_lang(text: str, lang: str) -> str:
    """لغة ردّ النموذج بعد الحارس: الكردي يأخذ ردّاً كردياً، إلا اعتذار الحارس الكامل فهو عربي (لا نصّ كردي مراجَع)."""
    return "ar" if lang == "ku" and text == _GUARD_REFUSAL["ar"] else lang
