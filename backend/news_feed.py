"""Forex news — RSS with static fallback."""
from __future__ import annotations

import re
import time
import xml.etree.ElementTree as ET

import httpx

_CACHE: list[dict] = []
_CACHE_TS = 0.0
TTL = 900

FEEDS = [
    "https://www.forexfactory.com/ffcal_week_this.xml",
    "https://feeds.feedburner.com/dailyfx/news",
]

FALLBACK = [
    {
        "id": "n1",
        "impact": "high",
        "title": "قرار الفائدة الفيدرالي — توقع تثبيت",
        "pair_effect": "DXY / EURUSD / XAUUSD",
        "when": "اليوم",
        "source": "matrix",
    },
    {
        "id": "n2",
        "impact": "high",
        "title": "CPI الأمريكي — تذبذب متوقع على USD",
        "pair_effect": "USD pairs",
        "when": "هذا الأسبوع",
        "source": "matrix",
    },
]


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
                "id": f"rss-{hash(title) % 10_000_000}",
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
    if _CACHE and time.time() - _CACHE_TS < TTL:
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
    _CACHE = merged[:20]
    _CACHE_TS = time.time()
    return _CACHE
