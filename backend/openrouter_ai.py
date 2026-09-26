"""OpenRouter LLM — educational analysis assistant + academy interrupt."""
from __future__ import annotations

import html
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
    r"|(?<![\d.,])(?<![^\W\d_])(?<!RSI\s)(?<!EMA\s)(?<!SMA\s)(?<!ADX\s)(?<!CCI\s)(?<!MFI\s)(?<!period\s)(?<!length\s)"
    r"\d{1,2}(?=\s*(?:$|[,;)]|\.(?!\d)|\s(?:and|or|then|now|here|with|for|on)\b)))"
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
    r"|\blevels?\s+to\s+(?:buy|sell|enter|get\s+in)\b|\btargeting\b|\baim(?:ing|s)?\b|\b(?:take|enter)\s+(?:the|this)\s+(?:trade|position)\b|\bjump\s+in\b|\bget\s+(?:in|out)\b|\bcut\s+(?:your\s+|the\s+)?loss(?:es)?\b"
    r"|\bclose\s+(?:the|your|this)\s+(?:trade|position)\b"
    r"|" + _AR_PRE + r"(?:دخول|ادخل|إدخال|وقف|هدف|أهداف|اهداف|مستهدف|جني\s+(?:ال)?(?:ربح|أرباح)|(?:إيقاف|حد|وقف)\s+(?:ال)?خسار[ةه]|إيقاف(?!\s+(?:ال)?تداول)|إلغاء\s+(?:ال)?سيناريو)(?:نا|ك|كم|ه|ها)?" + _AR_SUF
    + r"(?!\s+من\s+(?:هذ|ال|درس))"
    # run 94: «الخروج: 1.0950»، «نقطة الخروج 1.0950»، «خروج 1.0950» — «خروج السعر فوق 1.09» وصف كسر لا مستوى
    r"|(?<!\w)(?:(?:نقطة|نقطه|سعر|مستوى)\s+)?(?:ال)?خروج(?=\s*(?:[:\-–—=]|\d))"
    r"|ستۆپ(?:\s*لۆس)?|تەیک\s*پرۆفیت|ئامانج\w*|چوونەژوورەوە|وەستاندنی\s+زیان|زیان\s*وەستاندن"
    # run 80: التعريب الصوتي «ستوب لوس 1.0800»، «تيك بروفيت 1.0950»
    r"|(?<!\w)و?(?:ستوب|ستب)(?:\s*لوس)?(?:ك|كم|نا)?(?!\w)|(?<!\w)(?:و?ال)?تيك\s*بروف[يى]?ت(?!\w)"
    # run 90: المعرَّف «الستوب/الاستوب لوس»، «التارجت/تارجت»، «خذ الربح»، «اغلق الصفقة»
    r"|(?<!\w)و?ال(?:ا)?(?:ستوب|ستب)(?:\s*لوس)?(?!\w)|(?<!\w)(?:و?ال|و)?تارجت(?:ات)?(?:ك|كم|نا)?(?!\w)"
    r"|(?<!\w)(?:خذ|اخذ)\s+(?:ال)?(?:ربح|ارباح)(?!\w)|(?<!\w)(?:اغلق|أغلق)\s+(?:ال)?(?:صفقة|صفقه|مركز)(?!\w)"
    # run 83: التركية والألمانية («Giriş: 1.0850»، «zarar durdur 1.0800»، «hedef 1.0950»، «Einstieg 1.0850»)
    r"|\b(?:giri[şs]|zarar\s+durdur|hedef|k[aâ]r\s+al|einstieg|kursziel|armanc)\w*"
    # run 109: عربيزي «el hadaf 1.0950»، «el wa2f 1.0800»
    r"|\b(?:el|al)[- ]?(?:hadaf|ahdaf|wa2f|da5ool|dukhool|stop|target))"
    # run 83: رقم ترتيب بعد الكلمة («Target 1: 1.0950»، «TP 2: 1.1000»، «T1 1.0950») — كان الرقم يقطع الفجوة
    r"(?:\s*#?\d(?![\d.,]))?"
)
# «T1/T2» اختصار هدف مرقَّم — لا يُضاف لـ_LEVEL_WORD نفسه (تُلحقه اللاحقة أعلاه)
_LEVEL_WORD = r"(?:" + _LEVEL_WORD + r"|\bt\d(?![\d.,])(?![a-z]))"
# run 113: كلمات مستوى بلغات/صيغ كانت تمرّ («Stopp bei 1,0800»، «Gewinnmitnahme»، «Zarar kes»، «Obiettivo»، «Prise de
# bénéfices»، «Toma de ganancias»، «Стоп-лосс»، «Вход»، «止损»، «स्टॉप लॉस»، الفارسية «حد ضرر/حد سود/نقطه ورود»، الأردية
# «سٹاپ لاس/ٹارگٹ»، الكردية «ستوپ/تارگێت/ڕاگرتنی زیان/خاڵی دەرچوون»، «Stopa»، «استهدف/نستهدف»، «نقطة الانطلاق»، «سعر التنفيذ»،
# «حمايتك تحت»، «اخرج عند»، «خروج جزئي عند»)
_LEVEL_WORD = (
    r"(?:" + _LEVEL_WORD + r"|\bstopp(?:\s*loss)?\b|\bstopa\b|\bgewinnmitnahme\b|\bverlustbegrenzung\b|\bzarar\s+kes\b"
    r"|\bobiettivo\b|\bprise\s+de\s+(?:bénéfices|benefices|profits?)\b|\bseuil\s+de\s+sortie\b|\btoma\s+de\s+(?:ganancias|beneficios)\b"
    r"|стоп[- ]?лосс|тейк[- ]?профит|(?<!\w)(?:вход|цель)(?!\w)|止损|止盈|目标位|入场|进场|स्टॉप\s*लॉस|टारगेट"
    r"|حد\s+ضرر|حد\s+سود|نقطه\s+ورود|سٹاپ\s*لاس|ٹارگٹ|ستوپ|تارگێت|ڕاگرتنی\s+زیان|قازانج\s+وەرگرتن|خاڵی\s+دەرچوون"
    r"|(?<!\w)[انتي]ستهدف(?:ون|ين|وا)?(?!\w)|نقط[ةه]\s+(?:ال)?انطلاق|سعر\s+(?:ال)?تنفيذ|(?<!\w)حمايت(?:ك|كم|نا)(?!\w)"
    r"|(?<!\w)[وف]?اخرج(?!\w)|(?<!\w)(?:ال)?خروج\s+(?:ال)?جزئي)"
)
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
    r"(?:^\s*|[.!?]\s+|[-*•>,:;—–→]\s*|\d[.)]\s*)(?:buy|sell|long|short|go\s+(?:long|short)|get\s+(?:long|short)"
    r"|load\s+up(?:\s+on)?|accumulate|consider\s+(?:buying|selling|shorting|going\s+(?:long|short)|an?\s+(?:long|short)))"
    r"(?![-‑\w])\s*(?:[.!]|$|(?:now|here|at|above|below|between|on|if|when|it|this|gold|silver|oil|crude|bitcoin|btc"
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
    r"'?\s*[:\-–—=]\s*'?"
    # «Each order has a side: buy or sell» شرح لا توصية
    r"(?!\s*(?:buy|sell|long|short)\s*(?:/|or|and|أو)\s*(?:buy|sell|long|short)\b)"
    r"(?:[^\n.:]{0,20}?[\s,])?(?:buy|sell|long|short)\b(?![-‑])"
    # سعر ثم كلمة المستوى بعدها بالسطر نفسه («1.0950, a good place to take profit»)
    + r"|" + _PRICE + r"[^\n\d]{0,40}?" + _LEVEL_WORD
    # فعل صفقة ثم سعر («You could buy near 1.0850»، «Short it at 1.0900»)
    + r"|" + _EN_ACT + r"[^\n\d]{0,30}?" + _PRICE
    # … أو سعر صحيح (ذهب/بيتكوين) بعد حرف جرّ («buy near 2350»)
    + r"|" + _EN_ACT + r"[^\n\d]{0,30}?(?:\b(?:at|near|around|below|above|from|under|over|between)|@)\s*\d{3,}(?![\d.,%])"
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
    + r"|\bstrong\s+(?:buy|sell)\b(?![-‑])(?!\s+signals?\b)(?!['’]?\s+(?:ratings?|labels?|grades?)\b)"
    + r"|\b(?:long|short)\s+(?:opportunit(?:y|ies)|setup|entry|trade\s+idea)\b"
    # run 94: عنوان «- شراء: 1.0850»، «منطقة البيع: 2350» — «حجم البيع: 1200» مستثنى بـ_AR_ACT
    + r"|" + _AR_ACT + r"\s*[:\-–—=]\s*(?:\d+[.,]\d+|\d{3,})"
    + r"|" + _AR_ACT + r"\s+(?:من|عند|قرب|فوق|تحت|حول|الآن|الان|فورا|فوراً|هلا|هلق|هسه|هسا|هسع|الحين|دلوقتي|دلوقت)(?!\w)"
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
    + r"|(?-i:\bE)\s*:?\s*\d+[.,]\d+[^\n]{0,15}?(?-i:\b(?:S|SL|T|TP))\s*:?\s*\d"
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
    r"(?:comprar|vender|acheter|vendre|kaufen|verkaufen)\b"
    # run 97: «Enter long at market.»، «Stay short until 1.0800»، «Hold your long.»، «I lean long»،
    # «My pick is long»، «Pull the trigger on a long»، «Risk 1.0800 to make 1.0950»، «Cut the trade at …»،
    # «Bail out below …»، «Kauf bei 1.0850» — «Traders enter long when …» و«don't pull the trigger early» شرح
    + r"|(?:^\s*|[.!?]\s+|[-*•>,:;—–]\s*)(?:enter\s+(?:long|short)(?![-‑\w])\s*(?:[.!]|$|(?:now|here|at|on|today)\b)"
    r"|(?:stay|remain)\s+(?:long|short)(?![-‑\w])|hold\s+(?:your|the|this)\s+(?:long|short)s?(?![-‑\w]))"
    + r"|\b(?:i|we)(?:['’]m|\s+am|['’]re|\s+are)?\s+(?:lean(?:ing)?|tilt(?:ing)?)\s+(?:towards?\s+)?(?:a\s+)?"
    r"(?:long|short|buy(?:ing)?|sell(?:ing)?)(?![-‑\w])"
    + r"|\b(?:my|our)\s+(?:pick|call|choice|preference|bias|play|trade|vote)\s+(?:is|would\s+be)\s+(?:to\s+)?(?:an?\s+)?"
    r"(?:go\s+)?(?:long|short|buy|sell)(?![-‑\w])"
    + r"|\bpull\s+the\s+trigger\s+(?:on\s+(?:an?\s+|the\s+)?(?:long|short|buy|sell)|now|here)\b"
    + r"|\brisk(?:ing)?\s+(?:it\s+)?(?:to\s+|at\s+|down\s+to\s+)?" + _PRICE
    + r"[^\n\d]{0,20}?\b(?:to\s+make|for\s+a\s+(?:move|run)\s+to|targeting|aiming\s+(?:at|for))\s*" + _PRICE
    + r"|\bcut\s+(?:the|your|this)\s+(?:trade|position)\s+(?:at|below|above|under|over|near|@)\s*" + _PRICE
    + r"|\bbail(?:\s+out)?\s+(?:at|below|above|under|over|near|@)\s*" + _PRICE
    + r"|\b(?:kauf|verkauf)\s+(?:bei|ab|um|über|unter)\s*\d"
    # run 97: «أميل للشراء»، «الصفقة المقترحة: شراء»، «سأشتري من هنا»، «كنت سأبيع»، «افتح شراء»،
    # «شراء EURUSD» و«بيع الذهب» سطراً وحده — «المؤشر يميل للشراء» وصف و«بيع الذهب من البنوك المركزية …» خبر
    + r"|(?<!\w)(?:انا\s+|نحن\s+)?(?:اميل|نميل)\s+(?:لل|ل|الى\s+ال|إلى\s+ال)(?:شراء|بيع)(?!\w)"
    + r"|(?:الصفقة|الصفقه|الاتجاه|الخيار)\s+(?:المقترح|المقترحة|المقترحه|المفضل)\s*[:\-–—=]?\s*(?:هو\s+|هي\s+)?(?:ال)?(?:شراء|بيع)(?!\w)"
    + r"|(?<!\w)(?:كنت\s+)?(?:سا|سن)(?:شتري|بيع)(?!\w)"
    + r"|(?<!\w)(?:افتح|نفذ)\s+(?:ال)?(?:شراء|بيع)(?!\w)"
    + r"|(?:^\s*|[.!؟:\-–—•*]\s*)(?:ال)?(?:شراء|بيع)\s+(?:(?-i:[A-Z]{3,6}|[A-Z]{3}/[A-Z]{3})|الذهب|الفضة|الفضه|النفط"
    r"|اليورو|الدولار|الين|الجنيه|الباوند|البيتكوين)\s*(?:الان|الآن|فورا|فوراً)?\s*[.!؟]?\s*$"
    # run 101: «أقترح الشراء»، «اقتراحي: شراء»، «أفضّل الشراء»، «يمكن الدخول بصفقة شراء»، «بيع الارتفاعات نحو 2350»،
    # «Add to longs … 1.0850»، «Selling rallies toward 2350 looks attractive»، «It makes sense to buy here»،
    # «My suggestion is to buy»، «The best move now is to sell» — «استراتيجية الشراء على الارتدادات شائعة»،
    # «Traders often add to longs when …»، «Selling rallies is a known approach» شرح
    + r"|(?<!لا )(?<!\w)(?:اقترح|نقترح|اقتراحي|اقتراحنا|افضل|نفضل)(?:\s+عليك|\s+عليكم)?\s*(?:هو\s+)?[:\-–—]?\s*"
    r"(?:ب?ال)?(?:شراء|بيع|دخول)(?!\w)"
    + r"|يمكن(?:ك|كم)?\s+(?:ال)?دخول\s+ب?(?:صفقة|صفقه)\s+(?:ال)?(?:شراء|بيع)"
    + r"|(?:^\s*|[.!؟:\-–—•*]\s*)(?:ال)?(?:شراء|بيع)\s+(?:على\s+)?(?:ال)?(?:ارتداد|ارتفاع|انخفاض|تراجع|هبوط|صعود)"
    + r"|(?:شراء|بيع)\s+(?:على\s+)?(?:ال)?(?:ارتداد|ارتفاع|انخفاض|تراجع|هبوط|صعود)\w*[^\n\d]{0,20}?"
    r"(?:نحو|عند|قرب|من|فوق|تحت|حول)\s*\d"
    + r"|(?:^\s*|[.!?]\s+|[-*•>,:;—–]\s*)(?:buy|sell|short)\s+(?:the\s+|any\s+|every\s+)?"
    r"(?:dips?|rall(?:y|ies)|pullbacks?|bounces?|retests?|spikes?)\b"
    + r"|\b(?:buying|selling|shorting)\s+(?:the\s+)?(?:dips?|rall(?:y|ies)|pullbacks?|bounces?|retests?)\b[^\n\d.]{0,25}?"
    r"(?:\d|\b(?:here|now|looks|is\s+(?:\w+\s+)?(?:attractive|good|best|smart|wise|ideal|the\s+play)))"
    + r"|\badd(?:ing)?\s+to\s+(?:(?:your|the|my)\s+)?(?:longs?|shorts?|(?:long|short)\s+positions?)\b"
    r"(?:\s*(?:[.!]|$)|[^\n\d.]{0,25}?(?:\d|\b(?:here|now|today)\b))"
    + r"|\b(?:my|our)\s+(?:suggestion|recommendation|advice|idea)\s+(?:is|would\s+be)\s+(?:to\s+)?(?:go\s+)?"
    r"(?:buy|sell|short|long)(?![-‑\w])"
    + r"|\b(?:best|smartest|smart|right|wisest)\s+(?:move|play|trade)\b[^\n.]{0,20}?\b(?:is|would\s+be)\s+(?:to\s+)?"
    r"(?:buy|sell|short|go\s+(?:long|short))(?![-‑\w])"
    + r"|\bmakes?\s+sense\s+to\s+(?:buy|sell|short|go\s+(?:long|short))(?![-‑\w])\s*(?:[.!]|$|(?:now|here|it|this"
    r"|gold|silver|oil|crude|bitcoin|btc|the\s+(?:pair|euro|dollar|yen|pound))\b"
    r"|(?-i:[A-Z]{3,6}\b|[A-Z]{3}/[A-Z]{3}))"
    # run 107: دخول «بالسوق» بلا رقم («Entry: market»، «Buy @ market»، «الدخول: سعر السوق»)
    + r"|\bentry\s*(?:[:\-–—=@]|at)\s*(?:the\s+)?(?:market|now|immediately)\b|\b(?:buy|sell)\s*@\s*(?:the\s+)?market\b"
    + r"|(?<!\w)ال(?:دخول|شراء|بيع)\s*[:\-–—=]?\s*(?:من\s+|ب|على\s+)?(?:ال)?(?:سعر\s+(?:ال)?)?سوق(?!\w)"
    # run 107: وقف/هدف بمسافة أو مضاعف R أو نسبة بأول الجملة («Stop 20 pips below entry»، «SL: 30 pips»، «Target 2R»،
    # «Exit at +2%»، «Cut losses at -1%»، «الوقف ٢٠ نقطة أسفل القاع»، «الهدف ٥٪») — «a stop 20 pips away is common» شرح
    + r"|(?:^\s*|[.!?؟]\s+|[-*•>→]\s*)(?:(?:place|put|set|move)\s+(?:your\s+|the\s+)?)?"
    r"(?:stop(?:[- ]?loss)?|sl|tp|take[- ]?profits?|targets?|aim\s+for|exit|cut\s+(?:your\s+)?loss(?:es)?)"
    r"\s*[:\-–—=]?\s*(?:at\s+|a\s+|around\s+|of\s+)?[+\-−]?\s*\d+(?:[.,]\d+)?\s*(?:R\b|%|٪|pips?\b|points?\b)"
    r"(?!\s+(?:annual|yearly|monthly|a\s+(?:year|month)|per\s+(?:year|month)|returns?|of\s+(?:the\s+|your\s+)?(?:account|capital|balance))\b)"
    + r"|(?:^\s*|[.!?؟]\s*|[-*•>→]\s*)(?:ال)?(?:ستوب|ستب|وقف|هدف|اهداف)(?:\s+(?:ال)?خسار[ةه])?\s*[:\-–—=]?\s*"
    r"(?:عند\s+|على\s+بعد\s+)?[+\-]?\d+(?:[.,]\d+)?\s*(?:R\b|%|٪|نقط|نقاط)"
    # run 107: «Risk 1.0800, reward 1.0950»، «Take a long position now»، «Flip long»، «Close your short and go long»،
    # «Grab some BTC here»، «This is a buying opportunity»
    + r"|\brisk\s*[:\-–—=]?\s*" + _PRICE + r"[^\n\d]{0,15}?\breward\s*[:\-–—=]?\s*" + _PRICE
    + r"|(?:^\s*|[.!?]\s+|[-*•>,:;—–→]\s*)(?:take|open)\s+an?\s+(?:long|short)(?:\s+(?:position|trade))?(?![-‑\w])"
    r"(?!\s+(?:position|trade|means|is|requires|involves)\b)"
    + r"|(?:^\s*|[.!?]\s+|[-*•>,:;—–→]\s*)flip\s+(?:to\s+)?(?:long|short)\b"
    + r"|\bclose\s+your\s+(?:long|short)s?\s+and\s+(?:go\s+)?(?:long|short|buy|sell)\b"
    + r"|(?:^\s*|[.!?]\s+|[-*•>,:;—–→]\s*)(?:grab|pick\s+up|scoop\s+up)\b[^\n.]{0,25}?"
    r"\b(?:here|now|today|on\s+(?:the|any|a)\s+dips?)\b"
    + r"|\b(?:this|that|it)\s+(?:is|looks\s+like|['’]s)\s+(?:an?\s+)?(?:\w+\s+)?(?:buying|selling|shorting)\s+opportunit(?:y|ies)\b"
    # run 107: عربي — المخاطَب/الجمع («بيعي الذهب»، «ادخلي شراء»)، «خليك شراء»، «لو منك اشتري»، «بالشراء عند 1.0850»،
    # «بيع ع المقاومة ١٫٠٩٠٠»، «منطقة الشراء 1.0850»، لهجات («شري هلأ»، «فوت شراء»، «خش شراء»، «يلا بيع»،
    # «روح لونج»، «خذ شورت»)
    + r"|(?:^|[.!؟]\s*|[-*•→]\s*)(?:بيعي|بيعوا|اشتروا|ادخلي|ادخلوا|شري|شروا)(?!\w)"
    + r"|(?<!\w)خليك\s+(?:في\s+|على\s+|ب|ع\s+)?(?:ال)?(?:شراء|بيع|لونج|شورت)(?!\w)"
    + r"|(?<!\w)لو\s+(?:كنت\s+)?(?:منك|مكانك|بمكانك|محلك|بمحلك)[^\n\d]{0,15}?(?:شتري|بيع|بعت|دخل)"
    + r"|(?<!\w)[بل]ال(?:شراء|بيع)\s+(?:من|عند|قرب|فوق|تحت|حول)\s*" + _PRICE
    + r"|" + _AR_ACT + r"\s+(?:ع|على)\s+[^\n\d]{0,20}?" + _PRICE
    + r"|(?<!\w)(?:منطقة|منطقه|مستوى|سعر|نقطة|نقطه)\s+(?:ال)?(?:شراء|بيع|دخول)\s*[:\-–—=]?\s*" + _PRICE
    + r"|(?<!\w)(?:فوت|خش|اضرب|يلا|يالله)\s+(?:ب)?(?:ال)?(?:شراء|بيع|اشتري|بيع|لونج|شورت)(?!\w)"
    + r"|(?<!\w)(?:روح|خذ|افتح|ادخل)\s+(?:ال)?(?:لونج|شورت)(?!\w)"
    + r"|(?:^\s*|[.!؟:\-–—•*→]\s*)(?:ال)?(?:شراء|بيع)\s*[.!؟]?\s*$"
    + r"|(?:^\s*|[.!?]\s+|[-*•>→]\s*)(?:buy|sell|long|short)\s+\S+\s+(?:الان|الآن|هنا|فورا)(?!\w)"
    # run 107: الكردية «پێشنیار دەکەم بکڕیت»، «وەرە ژوورەوە بە کڕین»
    + r"|پێشنیار\w*[^\n]{0,30}?بی?(?:کڕیت|فرۆشیت)|ژوورەوە\s+(?:بە\s+)?(?:کڕین|فرۆشتن)"
    # run 108: اختصارات مستوى مع سعر عشري («Ent 1.0850»، «EP: 1.0850»، «Stp 1.0800»، «Obj 1.0950»، «Limit: 1.0850»،
    # «Trigger 1.0860»، «BL 1.0850») — عشري فقط: «trigger when RSI crosses 70» شرح
    + r"|\b(?:ent|ep|bl|stp|obj|limit|trigger)\b\s*[:@=\-–—→]?\s*(?:at\s+)?" + _PRICE
    # run 108: سعر بالكلمات بعد كلمة المستوى («Entry at one point oh eight five»، «Take profit at twenty four hundred»،
    # «الدخول عند واحد فاصلة صفر ثمانية»، «الهدف ألفين وأربعمية»)
    + r"|" + _LEVEL_WORD + r"\s*[:\-–—=]?\s*(?:at\s+|around\s+|near\s+|عند\s+|قرب\s+)?"
    r"(?:(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)"
    r"(?:[\s-]+(?:one|two|three|four|five|six|seven|eight|nine))?\s+(?:point|hundred|thousand)\b"
    r"|(?:واحد|اثنين|اثنان|ثلاث\w*|اربع\w*|خمس\w*|ست\w*|سبع\w*|ثمان\w*|تسع\w*|عشر\w*|صفر)\s+فاصل[ةه]|(?:الف|الفين|الفان|الاف)(?!\w))"
    # run 108: شرط كسر ثم أمر («If it breaks 1.0900 go long.»، «If price breaks 1.0900, buy.»، «Break above 1.0900 = buy»،
    # «A close above 1.0900 is your signal to buy»، «إذا كسر 1.0900 اشتري»، «بين 1.0840 و1.0850 اشتري»، «… تحت 1.0800 بيع»)
    + r"|" + _PRICE + r"\s*[,،]?\s*(?:then\s+)?(?:go\s+(?:long|short)|get\s+(?:long|short)|buy|sell|short\s+it)(?![-‑\w])"
    r"(?!\s+(?:pressure|orders?|stops?|signals?|side|volume|interest|zones?|areas?|limits?|programs?|walls?)\b)"
    + r"|" + _PRICE + r"\s*=\s*(?:buy|sell|long|short)\b"
    + r"|" + _PRICE + r"[^\n\d]{0,30}?\b(?:your|the|a|our)\s+(?:signal|cue|trigger)\s+to\s+(?:buy|sell|short|go\s+(?:long|short)|enter)\b"
    + r"|" + _PRICE + r"\s*[^\n\d\w]{0,3}\s*(?:(?:ثم|ف)\s*)?(?:اشتري|اشتر|بع|ادخل|اشري)(?!\w)|" + _PRICE + r"\s*[,،]?\s*بيع\s*[.!؟]?\s*$"
    # run 108: أوامر إدارة بسعر («Bank some at 1.0950»، «Scale out at»، «Add on dips to 1.0850»، «Pyramid in above»،
    # «Flatten at»، «Square up at»، «Take the money at»، «Book it at»، «Entering at 1.0850»)
    + r"|\b(?:bank\s+(?:some|it|half|part|partials?)|scale\s+out|add\s+on\s+(?:dips|rallies|pullbacks)|pyramid(?:\s+in)?"
    r"|flatten(?:\s+out)?|square\s+up|take\s+the\s+money|book\s+(?:it|some|half)|entering(?:\s+(?:long|short))?)\b"
    r"[^\n\d]{0,15}?(?:\bat|\bnear|\baround|\babove|\bbelow|\bto|@)\s*" + _PRICE
    # run 108: أوامر عامية بأول الجملة («Fade this rally.»، «Sell strength.»، «Buy weakness.»، «Short the pop»، «Load the boat»،
    # «Back up the truck»، «Go all in on gold»، «Bet against gold»، «Punt a long»، «Be a buyer here»، «Be long.»،
    # «Lift the offer»، «Hit the bid»، «Dump gold now»، «Unload EURUSD»، «Snap up gold»، «Take a position now»، خيارات
    # «Buy calls/puts»، «Sell a put at 2300»، «Buy the 2400 call»، «Go long via calls»)
    + r"|(?:^\s*|[.!?]\s+|[-*•>,:;—–→]\s*)(?:fade\s+(?:this|the|that|any)\s+(?:rally|move|pop|spike|bounce|drop|dip|breakout|sell-?off)"
    r"|(?:buy|sell|short)\s+(?:the\s+)?(?:pop|strength|weakness)|load\s+the\s+boat|back\s+up\s+the\s+truck|go\s+all[- ]in"
    r"|bet\s+against|punt\s+(?:a|on)|be\s+(?:an?\s+)?(?:buyer|seller|long|short)(?![-‑\w])|lift\s+the\s+offer|hit\s+the\s+bid"
    r"|(?:dump|unload)\s+(?:\S+\s+)?(?:now|here|today|it|this)\b|snap\s+up|take\s+a\s+position\s+(?:now|here|today)"
    r"|(?:buy|sell)\s+(?:an?\s+|the\s+\d+\s+|covered\s+)?(?:calls?|puts?)|go\s+(?:long|short)\s+via)\b"
    r"(?!\s+(?:means?|is|are|refers?\s+to|describes?|and|or|of|scheme|schemes|strateg(?:y|ies)|trading)\b)(?!\s*(?:=|:|—|-)\s*\w)"
    # run 108: لوتات («Long 1 lot EURUSD @ 1.0850»، «Open 2 lots buy») — «If you buy 1 lot of EURUSD, a pip is $10» شرح
    + r"|(?:^\s*|[.!?]\s+|[-*•>,:;—–→]\s*)(?:long|short|buy|sell|open)\s+\d+(?:[.,]\d+)?\s*lots?\b"
    r"(?:[^\n]{0,25}?(?:@|\bat\b)\s*\d|\s+(?:buy|sell|long|short|now)\b)"
    # run 108: متكلّم بالمضارع («I'm buying here»، «We're shorting EURUSD»، «Buying EURUSD here»)، «Sell sell sell!»، «screaming buy»
    + r"|\b(?:i['’]m|i\s+am|we['’]re|we\s+are)\s+(?:buying|selling|shorting|going\s+(?:long|short)|entering)\b"
    r"(?:[^\n.]{0,20}?\b(?:here|now|today)\b|\s+(?:gold|silver|oil|crude|bitcoin|btc|it|this|the\s+(?:pair|euro|dollar|yen|pound))\b"
    r"|\s+(?-i:[A-Z]{3,6}\b|[A-Z]{3}/[A-Z]{3})|[^\n\d]{0,15}?(?:@|\bat\b)\s*\d)"
    + r"|(?:^\s*|[.!?]\s+|[-*•>,:;—–→]\s*)(?:buying|selling|shorting)\s+(?:gold|silver|oil|crude|bitcoin|btc"
    r"|(?-i:[A-Z]{3,6}\b|[A-Z]{3}/[A-Z]{3}))\s*(?:here|now|at|@)"
    + r"|\b(?P<en_rep>buy|sell)[\s,!]+(?P=en_rep)\b|\bscreaming\s+(?:buy|sell)\b"
    # run 108: عربي فصيح/لهجات («باشر الشراء»، «بادر بالشراء»، «عليك بالبيع»، «الأفضل أن تبيع»، «اغتنم الفرصة واشتر»،
    # «خفف الخسارة عند 1.0800»، «اجنِ الأرباح عند 1.0950»، «أضف إلى مراكز البيع»، «بيع على المكشوف الآن»، «الدخول شراء»،
    # «اشري دابا»، «خاصك تشري»، «دير شراء»، «خود شراء»، «ركب لونج»، «بيع وارتاح»، «شراء شراء»، «الحين وقت الشراء»)
    + r"|(?<!لا )(?<!\w)(?:باشر|بادر|سارع|عليك|عليكم)\s+(?:ب|ب?ال)?(?:شراء|بيع|دخول)(?!\w)"
    + r"|(?:الافضل|من\s+الافضل|يفضل|خاصك|خصك|لازمك|بدك)\s+(?:ان\s+)?(?:تشتري|تبيع|تدخل|تشري)(?!\w)|(?<!\w)لازم\s+تشري(?!\w)"
    + r"|اغتنم\s+(?:ال)?فرص[ةه]\s+(?:و|ف)?\s*(?:اشتر|اشتري|بع|ادخل|اشري)(?!\w)"
    + r"|(?<!\w)(?:خفف|اجن|اجني|احجز|اقفل|اغلق)\s+(?:ال)?(?:خسار[ةه]|خسائر|ارباح|ربح)[^\n\d]{0,10}?(?:عند|قرب|من|فوق|تحت)\s*" + _PRICE
    + r"|(?<!\w)اضف\s+(?:الى\s+|ل)(?:ال)?مراكز\s+(?:ال)?(?:شراء|بيع)(?!\w)"
    + r"|(?<!\w)(?:ال)?بيع\s+على\s+(?:ال)?مكشوف\s+(?:الان|فورا|فوراً|هنا|من|عند)"
    + r"|(?<!\w)ال(?:دخول|صفقة|صفقه)\s*[:\-–—=]?\s*(?:ب)?(?:ال)?(?:شراء|بيع)(?=\s*(?:[.!؟،,]|$))"
    + r"|(?<!\w)(?:ا?شري|اشتري|بيع|بع)\s+(?:\S+\s+)?(?:دابا|دركا|دروك|توا|هلأ|هلا)(?!\w)|(?<!\w)اشري(?!\w)"
    + r"|(?<!\w)(?:خود|خد|دير|ركب|روح)\s+(?:ال)?(?:شراء|بيع|لونج|شورت)(?!\w)"
    + r"|(?<!\w)(?:شراء|بيع|اشتري|بع)\s+و\s*ارتاح(?!\w)|(?<!\w)(?P<ar_rep>شراء|بيع)[\s،,!]+(?P=ar_rep)(?!\w)"
    + r"|(?<!\w)(?:الحين|هسه|هسا|هلا|هلق|الان|دا|ده|هذا)\s+(?:هو\s+)?(?:ال)?وقت\s+(?:ال)?(?:شراء|بيع|شرا|دخول)(?!\w)"
    # run 108: الكردية («لۆنگ بکە»، «شۆرت بکە»، «دەتوانیت بکڕیت»، «بفرۆشن ئێستا»، «بچۆ ژوورەوە ئێستا»، «قازانج وەرگرە لە 1.0950»)
    + r"|(?:لۆنگ|شۆرت)\s+(?:بکە|بکەن|بگرە)(?!\w)|(?<!\w)بی?(?:کڕن|فرۆشن)(?!\w)"
    + r"|(?:دەتوانیت|دەتوانن)\s+(?:\S+\s+)?بی?(?:کڕیت|فرۆشیت|کڕن|فرۆشن)(?!\w)"
    + r"|بچۆ\s+ژوورەوە|قازانج\w*\s+(?:وەر\s*)?(?:بگرە|گرە)"
    # run 109: ميل/تفضيل بصيغة لطيفة («My bias is to accumulate … 1.0850»، «I'd lean long»، «Longs are favoured above 1.0850»،
    # «Shorts make sense below 1.0800»، «enter long at the current price»، «open a buy position now»)
    + r"|\b(?:my|our)\s+bias\s+is\s+to\s+(?:accumulate|buy|sell|short|add|go\s+(?:long|short))\b"
    + r"|\b(?:i|we)(?:['’]d|\s+would)\s+lean\s+(?:long|short)\b"
    + r"|\b(?:longs|shorts)\s+(?:are|look|seem)\s+(?:favou?red|preferred|better|best|attractive)[^\n\d]{0,20}?" + _PRICE
    + r"|\b(?:longs|shorts)\s+make\s+sense[^\n\d]{0,20}?" + _PRICE
    + r"|\b(?:enter|open)\s+(?:an?\s+)?(?:long|short|buy|sell)(?:\s+(?:position|trade|order))?\s+"
    r"(?:now|here|today|at\s+(?:the\s+)?(?:current\s+price|market))\b"
    # run 109: مبني للمجهول («Profits should be taken at 1.0950»، «Gold should be sold at 2400»، «Longs are to be initiated at»،
    # «is best entered at»، «A sell order is recommended at 1.0900»)
    + r"|\b(?:should|must|ought\s+to|is\s+to|are\s+to|(?:is|are)\s+(?:best|ideally))\s+(?:be\s+)?"
    r"(?:bought|sold|shorted|initiated|opened|entered|taken|placed)\b[^\n\d]{0,30}?" + _NUM
    + r"|\b(?:buy|sell|long|short)\s+(?:order|position|trade|entry)\s+(?:is|are)\s+(?:recommended|advised|suggested|warranted)\b"
    # run 109: سطر CSV/أعمدة («BUY,EURUSD,1.0850,1.0800,1.0950»، «Long | 1.0850 | 1.0800») — سعران بعد الجانب
    + r"|\b(?:buy|sell|long|short)\s*[|,;]\s*(?:[A-Za-z/]{3,7}\s*[|,;]\s*)?\d+\.\d+\s*[|,;]\s*\d+\.\d+"
    # run 109: رمزان يوسمان سعرين («📈 1.0850 ➡️ 1.0950»، «🟢 1.0850 🔴 1.0800») — `_guard_norm` يضع ⊕ مكان الرمز؛
    # «Hold & buy more»، «Buy more.»
    + r"|⊕\s*\d+[.,]\d+[^\n\d]{0,6}?⊕\s*\d+[.,]\d+"
    + r"|\b(?:hold|hodl)\s*(?:&|and|\+)\s*(?:buy|add)\s+more\b|(?:^\s*|[.!?]\s+)(?:buy|add)\s+more\b(?!\s+(?:means?|is)\b)"
    # run 109: «buy zone 2400»، «منطقة البيع ٢٤٠٠»
    + r"|\b(?:buy|sell)(?:ing)?\s+(?:zone|area|region)\s*[:\-–—=]?\s*(?:at|near|around|@)?\s*" + _NUM
    + r"|(?<!\w)(?:منطق[ةه]|مناطق)\s+(?:ال)?(?:شراء|بيع)\s*[:\-–—=]?\s*(?:عند|قرب|من)?\s*" + _NUM
    # run 109: تعابير («get involved on the long side at»، «Hop in long now»، «Grab some EURUSD at»، «Pick up gold under 2350»،
    # «Nibble at»، «Start a starter position at»، «Put a bid in at»، «Double down at»، «Average down to»، «Let it run to»، «Ride it to»)
    + r"|\bon\s+the\s+(?:long|short|buy|sell)\s+side\s+(?:at|near|around|from|@)\s*" + _NUM
    + r"|\b(?:hop|jump|dive)\s+in\s+(?:long|short)\b|\bhop\s+in\s+(?:now|here)\b"
    + r"|\b(?:(?:grab|pick\s+up|scoop\s+up)\s+(?:some\s+)?(?:gold|silver|oil|crude|bitcoin|btc|(?-i:[A-Z]{3,6}\b|[A-Z]{3}/[A-Z]{3}))"
    r"|nibble|start\s+an?\s+(?:starter\s+|small\s+)?position|put\s+(?:a|your)\s+bid\s+in|double\s+down|average\s+(?:down|up|in)"
    r"|let\s+it\s+run|ride\s+it)\b[^\n\d]{0,20}?(?:\bat|\bnear|\baround|\bbelow|\babove|\bunder|\bover|\bto|\bfrom|@)\s*" + _NUM
    # run 109: لهجات («هلأ وقت تشتري»، «اشتريلك دهب هسه»، «شد شراء»، «اضرب سل من 1.0900»، «افتح صفقة شراء»)
    + r"|(?<!\w)(?:الحين|هسه|هسا|هلا|هلق|الان|دابا)\s+(?:هو\s+)?(?:ال)?وقت\s+(?:ان\s+)?(?:تشتري|تبيع|تشري|تدخل)(?!\w)"
    + r"|(?<!\w)(?:اشتري|اشتر|اشري|بع)(?:لك|لي|لكم)?\s+(?:\S+\s+)?(?:هسه|هسا|هلق|الحين|الان|فورا|حالا)(?!\w)"
    + r"|(?<!\w)(?:شد|اضرب|افتح)\s+(?:صفق[ةه]\s+)?(?:ال)?(?:شراء|بيع|لونج|شورت|سل|باي)(?!\w)"
    # run 109: عربيزي («ishtri 3ind 1.08»، «bee3 3ind 1.0900»، «od5ol shira2 men 1.0850»، «5od long»، «bi3 delwa2ti»)
    + r"|\b(?:ishtri|ishtiri|ishteri|eshtri|eshteri|ishtari|bee3|bi3|od5ol|ud5ul|odkhol|udkhul)\b"
    + r"|\b(?:5od|5ud|khod|khud)\s+(?:long|short|buy|sell|shira2|bee3)\b"
    # run 109: كردي («لە ١٫٠٨٥٠ بچۆ ناو مامەڵەی کڕین»، «Long بکە»)؛ كرمانجي لاتيني («Bikire niha»، «Bifroşe zêr»، «Kirînê veke»)؛
    # سوراني لاتيني («keriin bka la 1.0850»)
    + r"|بچۆ\s+ناو\s+مامەڵە|مامەڵەی\s+(?:کڕین|فرۆشتن)\s+(?:بکە|بکەن|بکەرەوە)|\b(?:long|short|buy|sell)\s+(?:بکە|بکەن|بکه)"
    + r"|\bbi(?:k[iî]re|k[iî]rin|fro[sş]e|fro[sş]in)\b|\b(?:k[iî]r[iî]n|firotin)\w*\s+veke\b|\b(?:k[ae]ri+n|fro?shtin)\s+bka\b"
    # run 108: إسبانية/ألمانية/تركية («Vende ya»، «Jetzt verkaufen»، «Hemen al»، «Sat şimdi»)
    + r"|\b(?:compra|compre|vende|venda)\b[^\n\d]{0,20}?\bya\b|\bjetzt\s+(?:kaufen|verkaufen)\b"
    r"|\bhemen\s+(?:al|sat)\b|\b(?:al|sat)\s+şimdi\b"
    # run 113: أفعال/عامّية أمر بأول الجملة ثم سعر («Purchase EURUSD at»، «Bid it at»، «Offload gold at»، «Trim at»،
    # «Cash out at»، «Pay yourself at»، «Realise profits at»، «Shoot for 1.0950»، «Work a bid at»، «Plan: bid 1.0850»)
    + r"|(?:^\s*|[.!?]\s+|[-*•>,:;—–→(]\s*|\d[.)]\s*)(?:purchase|acquire|bid|offer|offload|unload|trim|peel\s+off|cash\s+(?:out|in)?"
    r"|pay\s+yourself|reali[sz]e|harvest|ring\s+the\s+register|shoot\s+for|work\s+a\s+bid|press\s+it|protect|bail|cover"
    r"|join\s+the\s+(?:bulls|bears)|go\s+(?:bullish|bearish)|get\s+(?:some\s+)?exposure)\b[^\n\d]{0,25}?" + _NUM
    # «I'm wrong below»، «void below»، «Thesis dies under»، «line in the sand is»، «Risk down to»، «Walk away on a close under»،
    # «I'd want exposure from»، «Upside exposure from»، «The long side from»، «Lean on 1.0900 from the short side»، «a buyer near»
    + r"|\b(?:wrong|void|invalid(?:ated)?|dies|dead|out)\s+(?:below|above|under|over)\s*" + _NUM
    + r"|\bline\s+in\s+the\s+sand\b[^\n\d]{0,15}?" + _NUM + r"|\brisk\s+(?:down|up)\s+to\s*" + _NUM
    + r"|\bwalk\s+away\b[^\n\d]{0,25}?" + _NUM + r"|\b(?:want|get|upside|downside)\s+exposure\s+(?:from|at|near)\s*" + _NUM
    + r"|\bthe\s+(?:long|short)\s+side\s+(?:from|at|near)\s*" + _NUM + r"|\bfrom\s+the\s+(?:long|short)\s+side\b"
    + r"|\bworth\s+a\s+punt\b|\ba\s+(?:buyer|seller)\s+(?:near|around|at|from|above|below|under|over)\s*" + _NUM
    + r"|\b(?:bullish|bearish)\s+(?:position|trade|entry)\s+(?:from|at|near|around)\s*" + _NUM
    # «Own EURUSD above»، «Own gold here»، «Go overweight EURUSD»
    + r"|(?:^\s*|[.!?]\s+|[-*•>,:;—–→]\s*)(?:own|go\s+(?:overweight|underweight)|overweight|underweight)\s+"
    r"(?:gold|silver|oil|it|this|the\s+pair|(?-i:[A-Z]{3,6}\b))"
    # أسماء الأزواج الشائعة وأزواج بأحرف صغيرة («Long the fiber»، «Short cable at»، «Sell the greenback»، «Buy eurusd.»)
    + r"|(?:^\s*|[.!?]\s+|[-*•>,:;—–→]\s*|\d[.)]\s*)(?:buy|sell|long|short|go\s+(?:long|short))\s+(?:the\s+)?"
    r"(?:fiber|fibre|cable|aussie|kiwi|loonie|swissy|greenback|brent|wti|nasdaq|dow|s&p|ether|eth|xau\w*|xag\w*"
    r"|(?:eur|gbp|usd|jpy|aud|nzd|cad|chf)(?:usd|eur|jpy|gbp|chf|aud|cad|nzd))\b"
    # المتكلّم («I'm a buyer above»، «We're sellers at»، «Buyer above 1.0900.»، «count me in/long»، «I'm in»، «that's my cue»)
    + r"|\b(?:i['’]?m|i\s+am|we['’]?re|we\s+are)\s+(?:an?\s+)?(?:buyers?|sellers?)\b"
    + r"|(?:^\s*|[.!?]\s+|[-*•>]\s*)(?:buyers?|sellers?)\s+(?:above|below|at|near|from|under|over)\s*" + _NUM
    + r"|\bcount\s+me\s+(?:in|long|short)\b|\bi['’]?m\s+(?:in|out)(?=\s*(?:[.,!;]|$))"
    + r"|\b(?:that['’]?s|is)\s+my\s+(?:cue|signal|trigger)\b|\bi['’]?d\s+get\s+involved\b"
    # سؤال وجواب بسطر واحد («Is it a buy? In my view, yes.»، «Should you sell gold? I would.»، «Long or short? The former.»)
    + r"|\b(?:should\s+(?:i|you|we)|would\s+(?:i|you|we)|is\s+(?:it|this|gold|\w{3,6})\s+an?)\s+(?:buy|sell|short|long|go\s+long|go\s+short)"
    r"\b[^\n?]{0,25}\?[^\n]{0,20}?\b(?:yes|yep|yeah|i\s+would|we\s+would|absolutely|definitely)\b"
    + r"|\blong\s+or\s+short\?\s*(?:the\s+)?(?:former|latter|long|short)\b"
    # «in=1.0850 out=1.0950»، «B,EURUSD,1.0850,1.0800,1.0950»، «side: B»
    + r"|(?:^|[\s,;])(?:in|out|cut)\s*=\s*\d+\.\d+|\b[bs]\s*[|,;]\s*[A-Za-z/]{3,7}\s*[|,;]\s*\d+\.\d+\s*[|,;]\s*\d+\.\d+"
    r"|\bside\s*:\s*(?:b|s)\b"
    # فرنسية/إسبانية/إيطالية/برتغالية/ألمانية/تركية/روسية/صينية/هندية/إندونيسية
    + r"|\bentrez\s+(?:long|short|à\s+l['’]achat|à\s+la\s+vente)\b|\bshortez\b|\bpositionnez[- ]vous\b"
    r"|\b(?:entra|entre)\s+en\s+(?:largo|corto)\b|\bponte\s+(?:largo|corto)\b|\babre\s+(?:largos|cortos)\b"
    r"|\b(?:compra|compre|vende|venda|vendi)\s+(?:agora|ora|ya)\b|\bvendi\s+a\s+\d|\blong\s+gehen\b|\b(?:ver)?kaufen\s+sie\b"
    r"|\b(?:long|short)\s+pozisyon\s+aç|\b(?:satış|alış|alım)\s+yap|\bşimdi\s+(?:al|sat)\b|(?-i:\b[A-Z]{3,6})\s+(?:al|sat)\s*[.!]"
    r"|(?<!\w)(?:покупайте|продавайте|купите|продайте|покупай|продавай)(?!\w)|买入|卖出|做多|做空|खरीदें|बेचें"
    r"|\b(?:beli|jual)\s+(?:sekarang|di)\b"
    # الفارسية/الأردية («بخرید در ۱٫۰۸۵۰»، «خرید کنید»، «بفروشید»، «ابھی خریدیں»، «فروخت کریں»، «خرید EURUSD»)
    + r"|(?<!\w)(?:بخرید|بفروشید|بخر|بفروش|خریدیں|خریداری\s+کریں|فروخت\s+کریں)(?!\w)|(?<!\w)(?:خرید|فروش)\s+(?:کنید|[A-Za-z]{3,7})"
    # العربية الفصحى/اللهجات («صفقة شرائية من»، «مركز شرائي عند»، «شراء 1.0850»، «شراء ليمت»، «اشتريه من»، «فكّر بالدخول الآن»،
    # «شرا من»، «اضرب شرا»، «فوت شرا»، «هات شراء»، «قفّل على مكسب»، «دخل فالشرا»، «باي ليمت/باي من/سيل من/لونج من»، «شورت على الذهب»)
    + r"|(?<!\w)(?:صفق[ةه]|مركز|تمركز|مراكز)\s+(?:شرائي|بيعي)[ةه]?(?!\w)[^\n\d]{0,12}?" + _NUM
    + r"|(?<!\w)(?<!سعر )(?<!اسعار )(?:ال)?(?:شراء|شرا|بيع)\s+(?:ليمت\s+|ستوب\s+|limit\s+|stop\s+)?" + _PRICE
    + r"|(?<!\w)(?:اشتري|اشتر|بيع|بع)(?:ه|ها)\s+(?:من|عند|هلق|الان|هسه|هسا|الحين|دابا)"
    + r"|(?<!\w)فكر\s+(?:ب|في\s+)(?:ال)?(?:دخول|شراء|بيع)\s+(?:الان|فورا|هنا)"
    + r"|(?<!\w)(?:(?:ال|فال|بال)?شرا)\s+(?:من|عند)\s*" + _NUM
    + r"|(?<!\w)(?:اضرب|فوت|هات|خذ|شد|دخل|ادخل)\s+(?:لك\s+)?(?:صفق[ةه]\s+)?(?:ف|في\s+)?(?:ال)?(?:شرا|شراء|بيع)(?!\w)"
    + r"|(?<!\w)(?:باي|سيل)\s+(?:ليمت|ستوب)\s*" + _NUM
    + r"|(?<!\w)قفل\s+على\s+(?:مكسب|ربح)|(?<!\w)(?:باي|سيل|لونج|شورت)\s+(?:ليمت\s+|ستوب\s+)?(?:من|عند)\s*" + _NUM
    + r"|(?<!\w)(?:لونج|شورت)\s+(?:على\s+(?:ال)?\w+|[A-Za-z]{3,7}\b)"
    # عربيزي، كردي («بیکرە ئێستا»، «کرین لە»، «ئێستا کاتی کڕینە»)، كرمانجي («Kirîn li 1.0850»، «Têkeve li»، «Bikeve bazarê»)، مختلط
    + r"|\b(?:eshtery|eshtiri|eshtry|ishtree|ishtry|shtri|bi3o|bee3o|ed5ol|da5la)\b"
    + r"|(?<!\w)بی?کر[ەه](?!\w)|(?<!\w)ک[ڕر]ین\s+لە\s*" + _NUM + r"|کاتی\s+ک[ڕر]ینە"
    + r"|\b(?:k[iî]r[iî]n|firotin)\s+li\s*" + _NUM + r"|\b(?:t[eê]keve|bikeve)\b"
    + r"|\b(?:buy|sell|long|short)\s+(?:هون|هنا|هلأ|هلا|هلق|الان|هسه|عالدعم|ئێستا)"
    # run 118: صياغات مرّت بلا سعر أو بفعل غير معروف («Get out of EURUSD.»، «Jump in now.»، «افتح مركزاً»، «خذ ربحك»)
    + r"|(?:^\s*|[.!?]\s+|[-*•>,:;—–→]\s*|\d[.)]\s*)(?:get\s+out(?:\s+of)?|bail(?:\s+out)?|jump\s+in|hop\s+in|pile\s+in"
    r"|scale\s+(?:in|out)|pyramid(?:\s+into)?|unload|offload|ditch|dump\s+(?:it|them|your|the\s+(?:pair|position|trade)|now|here|(?-i:[A-Z]{3,6}\b))|close\s+(?:it\s+|them\s+)?out)\b"
    + r"|\b(?:jump|hop|pile|get)\s+in\s+(?:now|here|at|on|near|around|above|below)\b|\benter\s+(?:now|here|immediately)\b"
    + r"|\b(?:i|we)(?:['’]d|\s+would)\s+(?:accumulate|add|pick\s+up|scale\s+in|load\s+up|buy|sell|short|get\s+(?:in|out))\b"
    + r"|\b(?:consider|try)\s+(?:picking|scooping)\s+up\b|\b(?:bullish|bearish)\s+bet\b"
    + r"|\b(?:good|great|nice|ideal|perfect)\s+(?:spot|place|time|level|area|zone)\s+to\s+(?:add|buy|sell|short|enter|exit"
    r"|get\s+(?:in|out)|go\s+(?:long|short))\b"
    + r"|\bclose\s+(?:it\s+|them\s+|the\s+trade\s+|your\s+(?:trade|position)\s+)?out\s+(?:if|at|here|now|near|around|when|below|above)\b"
    + r"|\bprotective\s+(?:order|stop)\s+(?:at|near|around|below|above|under)\s*\d|\brisk\s+it\s+(?:down\s+)?to\s*\d"
    + r"|\b(?:buy|sell)\s+the\s+(?:rip|bounce|pop|spike|strength|weakness|news)\b"
    + r"|(?<!\w)[وف]?افتح\s+(?:لك\s+)?(?:مركز|صفق|شراء|بيع)|(?<!\w)[وف]?خذ\s+(?:ال)?(?:ربح|ارباح|أرباح)"
    + r"|(?-i:\b(?:Kauf|Verkauf|Kaufe|Verkaufe)\s+[A-Z]{3,6}\b)|\b(?:achetez|vendez)\b|\b(?:achète|vends)\s+(?:maintenant|l['’]|le\s|la\s)",
    re.IGNORECASE | re.MULTILINE,
)
_TRADE_CALL_RE = re.compile(_TRADE_CALL_RE.pattern.translate(_ALEF), _TRADE_CALL_RE.flags)
# الكردية على النصّ العربي (نفس الأبجدية) كقالب `ai_ask` الاحتياطي — لا مراجعة لغوية كردية.
_GUARD_NOTE = {
    "ar": "_حُذف من الردّ ما يشبه توصية تداول (دخول/وقف/هدف أو شراء/بيع): مساعد MATRIX تعليمي ولا يقدّم توصيات._",
    "en": "_Part of this reply looked like a trade recommendation (entry/stop/target or buy/sell) and was removed: "
          "MATRIX's assistant is educational and does not give trade calls._",
}
# سطر حُذف لأنه يذكر رقماً ليس بالبيانات (لا لأنه توصية): «RSI is 63.2» والـRSI غير مُعطى للنموذج
_GUARD_NUMBER_NOTE = {
    "ar": "_حُذف من الردّ رقم لا يوجد في بيانات السوق المعطاة للمساعد: MATRIX لا يعرض أرقاماً غير مصدرها المزوّد._",
    "en": "_A number that is not in the market data given to the assistant was removed from this reply: "
          "MATRIX shows no figures that did not come from the data provider._",
}
_GUARD_REFUSAL = {
    "ar": "مساعد MATRIX تعليمي: لا يقدّم نقاط دخول ولا وقف خسارة ولا أهداف ولا توصيات شراء/بيع. "
          "يمكنني شرح المؤشرات، أو وصف ما يظهر على الشارت، أو شرح إدارة المخاطر.",
    "en": "MATRIX's assistant is educational: it does not give entries, stop-losses, targets or buy/sell calls. "
          "I can explain indicators, describe what the chart shows, or explain risk management.",
}


# run 113: + اليونانية («ΒUY»، «LΟNG») والشيروكي («ᏴUY»)
_HOMOGLYPH = str.maketrans(
    "АВЕКМНОРСТХЅІЈаеорсухѕіјΑΒΕΖΗΙΚΜΝΟΡΤΥΧαοριυνκᎪᏴᏟᎬᎻᎫᏦᏞᎷᏢᏚᎢᏔᏃ",
    "ABEKMHOPCTXSIJaeopcyxsijABEZHIKMNOPTYXaopiuvkABCEHJKLMPSTWZ",
)
_SPACED_WORDS = frozenset({"buy", "sell", "long", "short", "sl", "tp", "stop", "entry", "target", "stoploss", "takeprofit"})
# run 113: «5ELL»، «L0NG»، «8UY»، «Buuuy»، «BUYYY» ⇒ الكلمة (بالنسخة الثانية من النصّ فقط)
_LEET = str.maketrans("01358", "oiesb")
_LEET_WORDS = {"buy": "buy", "sel": "sell", "long": "long", "short": "short", "shor": "short"}


def _xml_tag(m: re.Match) -> str:
    # «<order side="buy" price="1.0850"/>» — الوسم كان يُحذف بخصائصه ⇒ «side: buy, price: 1.0850,»
    attrs = re.findall(r"""([A-Za-z_]\w*)\s*=\s*["']([^"'<>]*)["']""", m.group(0))
    return " " + " ".join(f"{k}: {v}," for k, v in attrs) + " "


def _leet_word(m: re.Match) -> str:
    w = m.group(0)
    k = re.sub(r"(.)\1+", r"\1", w.lower().translate(_LEET))
    return _LEET_WORDS.get(k, w)


def _guard_variants(text: str) -> list[str]:
    """النصّ المطبَّع، ونسخة بلا علامات فوق الحروف اللاتينية («Búy»، «S̶e̶l̶l̶»، «Bu̲y») وبلا أرقام/تكرار داخل كلمات
    الاتجاه — نسخة ثانية لا بديل: الأنماط التركية/الفرنسية («şimdi»، «entrée») تحتاج الحروف كما هي."""
    t = _guard_norm(text)
    d = "".join(ch for ch in unicodedata.normalize("NFD", t) if not ("\u0300" <= ch <= "\u036f"))
    d = unicodedata.normalize("NFC", d)
    d = re.sub(r"(?<![\w.,])[A-Za-z0-9]{3,8}(?![\w])", _leet_word, d)
    return [t] if d == t else [t, d]


def _guard_norm(text: str) -> str:
    # التشكيل («بِع»، «اشترِ»، «يُفضّل») وتنسيق Markdown («**Entry:** 1.0850») لا يغيّران المعنى
    # run 80: أحرف عريضة («Ｅｎｔｒｙ») ⇒ NFKC؛ وسوم HTML ورموز/إيموجي قبل الأمر («🟢 BUY»، «<b>BUY</b>»)
    # وعلامات اقتباس JSON («{"direction":"sell"}») تُزال؛ الفاصلة العربية العشرية «١٫٠٨٥٠» ⇒ نقطة.
    # run 113: كيانات HTML («&#66;uy»، «Buy&nbsp;EURUSD»)، تعليق «Bu<!-- -->y»، نصّ معكوس بـRLO («\u202eYUB\u202c» يُعرض BUY)،
    # وكل حرف تنسيق غير مرئي (Cf: ZWNJ/LRM/RLM/العزل/U+2062) — كان يُحذف أربعة فقط
    t = html.unescape(html.unescape(text or ""))
    t = re.sub(r"<!--.*?-->", "", t, flags=re.S)
    t = re.sub(r"\u202e([^\u202c\n]*)\u202c?", lambda m: m.group(1)[::-1], t)
    t = "".join(ch for ch in t if unicodedata.category(ch) != "Cf" and ch != "\u034f")
    t = unicodedata.normalize("NFKC", _TASHKEEL.sub("", t))
    # run 108: «🎯 1.0950»/«🛑 1.0800» — الرمز هو الوسم؛ «~~Hold~~ **Buy**» المشطوب ليس جزءاً من الردّ؛ «### Buy EURUSD» عنوان
    t = t.replace("🎯", " target ").replace("🛑", " stop ")
    t = re.sub(r"~~[^~\n]*~~", " ", t)
    t = re.sub(r"(?m)^[ \t]*#{1,6}[ \t]*", "", t)
    # run 113: وسم داخل كلمة/رقم («B<span>uy</span>»، «<b>1</b>.0850») يُحذف بلا مسافة؛ رابط «[Buy](#)» ⇒ نصّه؛
    # LaTeX «$\\textbf{Long}$»؛ «62k» ⇒ 62000 (كان «SL 62k» يمرّ: الصحيح القصير لا ينتهي عنده الكلام)
    t = re.sub(r"(?<=[\w.])</?[A-Za-z][^<>\n=]{0,40}>(?=[\w.])", "", t)
    t = re.sub(r"</?[A-Za-z][^<>\n]{0,80}>", _xml_tag, t)
    t = re.sub(r"\[([^\]\n]{1,40})\]\([^)\n]{0,200}\)", r"\1", t)
    t = re.sub(r"\\[A-Za-z]+\{?", "", t)
    t = re.sub(r"\$(?!\s*\d)", " ", t)
    t = re.sub(r"(?<![\w.,])(\d{1,3})\s?[kK](?!\w)", lambda m: m.group(1) + "000", t)
    # run 109: «B\u200buy»/«BUY\u00ad» (حرف غير مرئي داخل الكلمة)؛ «Вuy»/«Ѕell» (حرف كيريلي بشكل لاتيني داخل كلمة لاتينية)؛
    # «b u y»، «L-O-N-G»، «S L 1.0800»، «T.P. 1.0950» (حروف مفرّقة)؛ رمز قبل سعر («📈 1.0850 ➡️ 1.0950») ⇒ ⊕
    t = re.sub(r"[\u200b\u00ad\u2060\ufeff]", "", t)
    t = re.sub(r"\w*[A-Za-z]\w*", lambda m: m.group(0).translate(_HOMOGLYPH), t)
    t = re.sub(r"(?<![^\W\d_])[A-Za-z](?:[ .\-_/][A-Za-z]){1,7}\.?(?![^\W\d_])",
               lambda m: j if (j := re.sub(r"[ .\-_/]", "", m.group(0))).lower() in _SPACED_WORDS else m.group(0), t)
    t = re.sub(r"(?:[\U0001F300-\U0001FAFF\u2190-\u21FF\u2B00-\u2BFF\u27A0-\u27BF]\ufe0f?)+(?=\s*\d)", " ⊕", t)
    t = "".join(" " if unicodedata.category(ch) in ("So", "Sk", "Cs") or ch in "\ufe0f\u200d{}\"" else ch for ch in t)
    t = re.sub(r"(?<=\d)٫(?=\d)", ".", t)
    # run 107: فاصل الآلاف «1,085.50» ⇒ 1085.50؛ «الـentry» — التطويل وحدّ الأبجديتين كانا يلصقان الكلمة الإنجليزية
    t = re.sub(r"(?<=\d),(?=\d{3}\.\d)", "", t).replace("\u0640", "")
    t = re.sub(r"(?<=[\u0600-\u06FF])(?=[A-Za-z])|(?<=[A-Za-z])(?=[\u0600-\u06FF])", " ", t)
    # run 83: «_» مسافة لا حذف: «entry_price» كان «entryprice» فلا يُعرف «entry»
    return re.sub(r"[*`]", "", t).replace("_", " ").translate(_ALEF)


def has_trade_call(text: str) -> bool:
    return any(_TRADE_CALL_RE.search(v) for v in _guard_variants(text))


# run 78: الحارس كان يفحص كل سطر وحده ⇒ «Entry:\n1.0850» وقائمة «- Entry\n  - 1.0850» وجدول
# «| Entry | Stop | Target |» صفوفه أسعار كانت تمرّ كاملة.
_LABEL_END_RE = re.compile(_LEVEL_WORD + r"[\s:：\-–—=→←>|]*$", re.IGNORECASE)
_STARTS_NUM_RE = re.compile(r"^[\s\-*•>|:=→←]*\d")
# run 83: «Entry zone (pullback):\n1.0850» — كلام بعد الكلمة ثم سعر عشري بأول السطر التالي
# run 108: «The level I'd use for entry is\n1.0850» — الجملة تنتهي بـis/at/would be بلا نقطتين
_LABEL_NOTE_END_RE = re.compile(
    _LEVEL_WORD + r"[^\n\d]{0,30}(?:[:：\-–—=→]|\b(?:is|are|at|would\s+be|around|near|عند|هو|هي))\s*$", re.IGNORECASE
)
_STARTS_PRICE_RE = re.compile(r"^[\s\-*•>|:=→←]*" + _PRICE)  # «1.5×ATR» مسافة لا سعر


_QUESTION_CALL_RE = re.compile(
    r"\b(?:should|would|do|can|where|when)\s+(?:i|you|we)\s+(?:\w+\s+)?(?:buy|sell|short|go\s+(?:long|short)|get\s+(?:in|out)|exit|enter"
    r"|take\s+profits?|put\s+(?:the|my|your)\s+stop)\b[^\n]*\?\s*$",
    re.IGNORECASE,
)
_ANSWER_YES_RE = re.compile(r"^\s*(?:a\s*[:.)\-]\s*)?(?:yes|yep|yeah|sure|i\s+would|we\s+would|absolutely|definitely|\d+[.,]\d+)", re.IGNORECASE)


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
    # run 113: سؤال بسطر وجوابه بالتالي («Q: Should I buy EURUSD?» ثم «A: Yes.»؛ «Where would you get out?» ثم «A: 1.0950.»)
    for a, b in zip(filled, filled[1:]):
        if _QUESTION_CALL_RE.search(_guard_norm(lines[a])) and _ANSWER_YES_RE.match(_guard_norm(lines[b])):
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


# run 118: الحارس بالكلمات لا يحصي كل صياغة («افتح مركزاً عند 1.0850»، «خذ ربحك عند 1.0950»، «Hop in at 1.0850»،
# «Scale in between 1.0850 and 1.0830» كانت تمرّ). التعليمة تقول «لا تكتب أي رقم سعر غير موجود حرفياً في السياق» —
# والآن تُفرض: سعر عشري بسطر لا يطابق رقماً بالسياق (ولو مقرَّباً: 1.085 لـlast=1.08503) رقمٌ اخترعه النموذج ⇒ يُسقط السطر
# مهما كان الفعل. لا يُحسب: نسبة/مضاعف/نقاط/ATR/R (`_NOT_PRICE_AFTER`)، ولا حجم لوت/وحدات («0.01 lot»).
_UNGROUNDED_NUM_RE = re.compile(r"(?<![\d.,])" + _PRICE + r"(?!\s*(?:lots?|لوت|units?|وحد))", re.IGNORECASE)


def _num(tok: str) -> float | None:
    try:
        return float(tok.replace(",", "."))
    except ValueError:
        return None


def _grounded_numbers(ground: str) -> list[float]:
    return [v for v in (_num(m.group(0)) for m in re.finditer(r"\d+[.,]\d+", _guard_norm(ground))) if v is not None]


def _ungrounded_price_lines(lines: list[str], allowed: list[float]) -> set[int]:
    bad = set()
    for i, ln in enumerate(lines):
        for m in _UNGROUNDED_NUM_RE.finditer(_guard_norm(ln)):
            tok = re.match(r"\d+[.,]\d+", m.group(0)).group(0)
            x = _num(tok)
            if x is None:
                continue
            tol = 0.5 * 10 ** -len(re.split(r"[.,]", tok)[1]) + 1e-12
            if not any(abs(x - v) <= tol for v in allowed):
                bad.add(i)
                break
    return bad


def guard_answer(text: str, lang: str = "ar", ground: str | None = None) -> str:
    """يُسقط أسطر التوصيات من ردّ النموذج (قرار أنس ٤). لا سطر نظيف باقٍ ⇒ ردّ الاعتذار التعليمي.
    `ground`: النصّ الذي أُعطي للنموذج (سياق السوق / نصّ المقطع) ⇒ سطر فيه سعر عشري ليس منه يُسقط كذلك."""
    lines = (text or "").split("\n")
    bad = _trade_call_lines(lines)
    only_numbers = False
    if ground is not None:
        extra = _ungrounded_price_lines(lines, _grounded_numbers(ground)) - bad
        only_numbers = bool(extra) and not bad
        bad |= extra
    if not bad:
        return text
    kept = [ln for i, ln in enumerate(lines) if i not in bad]
    if not any(re.search(r"\w", ln) for ln in kept):
        return _GUARD_REFUSAL["en" if lang == "en" else "ar"]
    body = re.sub(r"\n{3,}", "\n\n", "\n".join(kept)).strip()
    note = _GUARD_NUMBER_NOTE if only_numbers else _GUARD_NOTE
    return f"{body}\n\n{note["en" if lang == "en" else "ar"]}"


def reply_lang(text: str, lang: str) -> str:
    """لغة ردّ النموذج بعد الحارس: الكردي يأخذ ردّاً كردياً، إلا اعتذار الحارس الكامل فهو عربي (لا نصّ كردي مراجَع)."""
    return "ar" if lang == "ku" and text == _GUARD_REFUSAL["ar"] else lang
