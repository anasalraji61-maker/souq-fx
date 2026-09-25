"""Forex news — RSS only (no fabricated fallback headlines)."""
from __future__ import annotations

import hashlib
import re
import time
import xml.etree.ElementTree as ET
from datetime import timezone
from email.utils import parsedate_to_datetime

import httpx

_CACHE: list[dict] = []
_CACHE_TS = 0.0
TTL = 900
# تعذّر كل المصادر: لا نخزّن «لا أخبار» 15 دقيقة — نعيد المحاولة بعد دقيقتين (كالتقويم).
EMPTY_TTL = 120

FEEDS = [
    "https://www.forexfactory.com/ffcal_week_this.xml",
    "https://feeds.feedburner.com/dailyfx/news",
]

# لا أخبار احتياطية: كانت «قرار الفائدة الفيدرالي — اليوم» و«CPI هذا الأسبوع» تُعرض كخبر حقيقي كلما
# تعذّرت المصادر — متداول قد يتجنّب/يدخل صفقة على حدث مختلَق. قائمة فارغة → «لا توجد أخبار حالياً».
FALLBACK: list[dict] = []


def _stable_id(title: str) -> str:
    """`hash()` لنصوص بايثون عشوائي لكل عملية (PYTHONHASHSEED) — معرّف ثابت بين إعادات التشغيل؛ من
    العنوان وحده كي يُدمج الخبر نفسه من مصدرين."""
    return "rss-" + hashlib.sha1(title.encode("utf-8")).hexdigest()[:12]


# تصنيف التأثير بمطابقة **كلمة كاملة** لا بجزء من كلمة. المطابقة الجزئية السابقة (`k in t`) كانت
# تجعل «rate» يتحقّق داخل corporate وmoderate وaccurate وseparate و**strategy** — كلمات تتكرّر
# بعناوين الفوركس اليومية — فتُعرَض عناوين عادية بشارة «عالي التأثير» الحمراء. والصيغة الجمعية
# مقصودة صراحةً (`rates`/`PMIs` بالعناوين أكثر من المفرد) فلا تسقط بحدّ الكلمة.
_HIGH_WORDS = re.compile(r"\b(?:fed|fomc|cpi|nfp|rates?)\b", re.IGNORECASE)
_MEDIUM_WORDS = re.compile(r"\b(?:gdp|pmis?|employment)\b", re.IGNORECASE)
# العربية تبقى مطابقةً جزئية عمداً: `\b` يمنع «الفائدة» و«التضخم» (أداة التعريف ملتصقة بالكلمة)،
# وهذه كلمات تامّة لا تَرِد داخل كلمة أخرى فلا تنتج الالتباس الإنجليزي نفسه.
_HIGH_AR = ("فائدة", "تضخم")
_MEDIUM_AR = ("بيانات",)


def _impact_from_title(title: str) -> str:
    if _HIGH_WORDS.search(title) or any(k in title for k in _HIGH_AR):
        return "high"
    if _MEDIUM_WORDS.search(title) or any(k in title for k in _MEDIUM_AR):
        return "medium"
    return "low"


def when_and_ts(raw: str | None, *, default: str = "اليوم") -> tuple[str, int | None]:
    """(نصّ الوقت، ثواني UTC) من `pubDate` بصيغة RFC 2822.

    **عامّة لأن فرع RSS بالتقويم الاقتصادي كان خارجها بنفس العيب حرفياً** (`pubDate[:22]`
    يقصّ الإزاحة): قاعدة واحدة بمكان واحد بدل نسختين تنحرفان. و`default` لأن نصّ الغياب
    يختلف بين اللوحتين («اليوم» للأخبار، «هذا الأسبوع» لأسبوع التقويم) والقاعدة واحدة.

    كان `pub.text[:16]` وحده: قصُّ «Tue, 23 Sep 2026 14:30:00 +0000» عند 16 حرفاً يعطي
    **التاريخ بلا وقت**، ويُلقي إزاحة المنطقة الزمنية معه — فالخبر يُعرض «Tue, 23 Sep 2026»
    لمتداول ببغداد وآخر بلندن سواءً، بلا ما يقول أيّهما قبل الآخر. والنتيجة بلا `ts` أصلاً
    فلا التطبيق يحوّلها لتوقيت الجهاز ولا يرتّب بها — خلافاً لأحداث التقويم التي تحمل `ts`
    منذ تشغيل سابق. الصيغة هنا نفس صيغة التقويم حرفياً حتى تُقرأ اللوحتان بنفس العين.
    """
    if not raw:
        return default, None
    try:
        dt = parsedate_to_datetime(raw.strip())
    except (TypeError, ValueError):
        return raw.strip()[:32] or default, None
    if dt.tzinfo is None:  # خلاصة بلا منطقة زمنية: تُقرأ UTC ولا تُخمَّن منطقة
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"), int(dt.timestamp())


def _parse_rss(xml_text: str, source: str) -> list[dict]:
    out: list[dict] = []
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return out
    for item in root.iter("item"):
        title_el = item.find("title")
        if title_el is None or not title_el.text:
            continue
        title = re.sub(r"\s+", " ", title_el.text.strip())[:180]
        pub = item.find("pubDate")
        # خبر بلا تاريخ ⇒ «—» لا «اليوم»: كان يُعرض «اليوم» (وبالعربية لكل اللغات) لخبر قد يكون عمره أيام
        when, ts = when_and_ts(pub.text if pub is not None else None, default="—")
        out.append(
            {
                "id": _stable_id(title),
                "impact": _impact_from_title(title),
                # التأثير **تقديرٌ من كلمات العنوان** لا تصنيف مصدر (كتأثير التقويم) — يُقال صراحةً
                "impact_basis": "headline_keywords",
                "title": title,
                "pair_effect": "Forex",
                "when": when,
                "ts": ts,
                "source": source,
            }
        )
        if len(out) >= 12:
            break
    return out


def fetch_news() -> list[dict]:
    global _CACHE, _CACHE_TS
    if time.time() - _CACHE_TS < (TTL if _CACHE else EMPTY_TTL) and _CACHE_TS:
        return _CACHE

    merged: list[dict] = []
    for url in FEEDS:
        try:
            with httpx.Client(timeout=12.0, follow_redirects=True) as client:
                r = client.get(url, headers={"User-Agent": "MATRIX/1.0"})
                if r.status_code == 200 and r.text.strip():
                    merged.extend(_parse_rss(r.text, url.split("/")[2]))
        except Exception:
            continue

    if not merged:
        merged = list(FALLBACK)
    # الأحدث أولاً، وما لا وقت له بالذيل. كانت القائمة **بترتيب الخلاصات**: كل أخبار المصدر
    # الأول ثم كل أخبار الثاني مهما تفاوتت أعمارها — فخبرُ أمس يعلو خبر هذه الساعة. والقصّ
    # عند 20 كان يُبقي الأقدم لمجرّد أن مصدره أوّلاً؛ الترتيب قبله فلا يسقط إلا الأقدم فعلاً.
    merged.sort(key=lambda n: (n.get("ts") is None, -(n.get("ts") or 0)))
    # نفس الخبر من مصدرين (أو مكرراً بالخلاصة) مرة واحدة — كان يُنتج مفتاح React مكرراً.
    # وبعد الترتيب تبقى **النسخة الأحدث** لا التي صادف أن مصدرها أوّلاً.
    seen: set[str] = set()
    merged = [n for n in merged if not (n["id"] in seen or seen.add(n["id"]))]
    _CACHE = merged[:20]
    _CACHE_TS = time.time()
    return _CACHE
