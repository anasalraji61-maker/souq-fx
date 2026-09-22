"""Forex news — RSS only (no fabricated fallback headlines)."""
from __future__ import annotations

import hashlib
import re
import time
import xml.etree.ElementTree as ET

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


def _impact_from_title(title: str) -> str:
    t = title.lower()
    if any(k in t for k in ("fed", "cpi", "nfp", "fomc", "rate", "فائدة", "تضخم")):
        return "high"
    if any(k in t for k in ("gdp", "pmi", "employment", "بيانات")):
        return "medium"
    return "low"


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
        when = pub.text[:16] if pub is not None and pub.text else "اليوم"
        out.append(
            {
                "id": _stable_id(title),
                "impact": _impact_from_title(title),
                "title": title,
                "pair_effect": "Forex",
                "when": when,
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
    # نفس الخبر من مصدرين (أو مكرراً بالخلاصة) مرة واحدة — كان يُنتج مفتاح React مكرراً.
    seen: set[str] = set()
    merged = [n for n in merged if not (n["id"] in seen or seen.add(n["id"]))]
    _CACHE = merged[:20]
    _CACHE_TS = time.time()
    return _CACHE
