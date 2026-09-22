"""Economic calendar — ForexFactory XML + static fallback."""
from __future__ import annotations

import json
import re
import time
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from typing import Any

import httpx

_CACHE: list[dict] = []
_CACHE_TS = 0.0
TTL = 1800

FF_URL = "https://www.forexfactory.com/ffcal_week_this.xml"
# نسخة JSON من نفس مصدر ForexFactory — تواريخها ISO مع إزاحة زمنية صريحة، فتُحوَّل لـUTC بلا تخمين
# منطقة زمنية (XML أعلاه يعطي تاريخاً ووقتاً بلا منطقة، فيبقى احتياطياً بلا `ts`).
FF_JSON_URL = "https://nfs.faireconomy.media/ff_calendar_thisweek.json"

FALLBACK = [
    {
        "id": "e1",
        "title": "قرار الفائدة الفيدرالي",
        "currency": "USD",
        "impact": "high",
        "when": "اليوم 21:00 UTC",
        "forecast": "5.25%",
    },
    {
        "id": "e2",
        "title": "CPI الأمريكي",
        "currency": "USD",
        "impact": "high",
        "when": "غداً 15:30 UTC",
        "forecast": "0.3% m/m",
    },
    {
        "id": "e3",
        "title": "مبيعات التجزئة — GBP",
        "currency": "GBP",
        "impact": "medium",
        "when": "الجمعة 09:00 UTC",
        "forecast": "0.1%",
    },
    {
        "id": "e4",
        "title": "PMI التصنيع — EUR",
        "currency": "EUR",
        "impact": "medium",
        "when": "الاثنين 10:00 UTC",
        "forecast": "47.5",
    },
    {
        "id": "e5",
        "title": "حديث مسؤول فيدرالي",
        "currency": "USD",
        "impact": "low",
        "when": "اليوم 18:00 UTC",
        "forecast": "—",
    },
]


def _impact(raw: str | None) -> str:
    if not raw:
        return "low"
    t = raw.strip().lower()
    if t in ("3", "high", "red"):
        return "high"
    if t in ("2", "medium", "orange"):
        return "medium"
    return "low"


def _text(el: ET.Element | None) -> str:
    if el is None or el.text is None:
        return ""
    return re.sub(r"\s+", " ", el.text.strip())


def _parse_ff(xml_text: str) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    try:
        root = ET.fromstring(xml_text)
    except ET.ParseError:
        return out

    events = list(root.iter("event"))
    if not events:
        for item in root.iter("item"):
            title = _text(item.find("title"))
            if not title:
                continue
            desc = _text(item.find("description"))
            cur = "USD"
            m = re.search(r"\b([A-Z]{3})\b", desc or title)
            if m:
                cur = m.group(1)
            out.append(
                {
                    "id": f"ff-{hash(title) % 10_000_000}",
                    "title": title[:160],
                    "currency": cur,
                    "impact": _impact(_text(item.find("category"))),
                    "when": _text(item.find("pubDate"))[:22] or "هذا الأسبوع",
                    "forecast": "—",
                }
            )
            if len(out) >= 40:
                break
        return out

    for ev in events:
        title = _text(ev.find("title"))
        if not title:
            continue
        country = _text(ev.find("country")) or "USD"
        date = _text(ev.find("date"))
        tm = _text(ev.find("time"))
        when = f"{date} {tm}".strip() or "هذا الأسبوع"
        fc_raw = _text(ev.find("forecast"))
        prev_raw = _text(ev.find("previous"))
        forecast = fc_raw or prev_raw or "—"
        out.append(
            {
                "id": f"ff-{hash(title + when) % 10_000_000}",
                "title": title[:160],
                "currency": country[:3].upper() if country else "USD",
                "impact": _impact(_text(ev.find("impact"))),
                "when": when[:32],
                "forecast": forecast[:40],
                **_figures(fc_raw, prev_raw, _text(ev.find("actual"))),
            }
        )
        if len(out) >= 40:
            break
    return out


def _figures(forecast: str, previous: str, actual: str) -> dict[str, str]:
    """أرقام الحدث منفصلة ومسمّاة. `forecast` القديم يسقط للقيمة السابقة عند غياب التوقّع (فيظهر
    «السابق» كأنه توقّع) — يبقى كما هو لتوافق العملاء القدامى، والعميل الجديد يقرأ هذه الحقول."""
    return {
        "forecast_value": forecast[:40],
        "previous": previous[:40],
        "actual": actual[:40],
    }


def _parse_ff_json(text: str) -> list[dict[str, Any]]:
    """كل حدث يحمل `ts` (ثوانٍ UTC) ليعرضه التطبيق بتوقيت المستخدم ويحسب "بعد كم ساعة"."""
    out: list[dict[str, Any]] = []
    try:
        data = json.loads(text)
    except (ValueError, TypeError):
        return out
    if not isinstance(data, list):
        return out
    for ev in data:
        if not isinstance(ev, dict):
            continue
        title = re.sub(r"\s+", " ", str(ev.get("title") or "").strip())
        if not title:
            continue
        ts: int | None = None
        when = "هذا الأسبوع"
        raw_date = str(ev.get("date") or "").strip()
        if raw_date:
            try:
                dt = datetime.fromisoformat(raw_date.replace("Z", "+00:00"))
                if dt.tzinfo is not None:
                    ts = int(dt.timestamp())
                    when = dt.astimezone(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
            except ValueError:
                pass
        country = str(ev.get("country") or "USD").strip()
        fc_raw = str(ev.get("forecast") or "").strip()
        prev_raw = str(ev.get("previous") or "").strip()
        forecast = fc_raw or prev_raw or "—"
        out.append(
            {
                "id": f"ff-{hash(title + raw_date) % 10_000_000}",
                "title": title[:160],
                "currency": country[:3].upper() if country else "USD",
                "impact": _impact(str(ev.get("impact") or "")),
                "when": when[:32],
                "forecast": forecast[:40],
                **_figures(fc_raw, prev_raw, str(ev.get("actual") or "").strip()),
                "ts": ts,
            }
        )
    out.sort(key=lambda e: (e["ts"] is None, e["ts"] or 0))
    return out[:120]


def fetch_calendar(
    currency: str | None = None,
    impact: str | None = None,
) -> list[dict]:
    global _CACHE, _CACHE_TS
    if not _CACHE or time.time() - _CACHE_TS >= TTL:
        merged: list[dict] = []
        try:
            with httpx.Client(timeout=14.0, follow_redirects=True) as client:
                r = client.get(FF_JSON_URL, headers={"User-Agent": "MATRIX/1.0"})
                if r.status_code == 200 and r.text.strip():
                    merged = _parse_ff_json(r.text)
                if not merged:
                    r = client.get(FF_URL, headers={"User-Agent": "MATRIX/1.0"})
                    if r.status_code == 200 and r.text.strip():
                        merged = _parse_ff(r.text)
        except Exception:
            merged = []
        # الاحتياطي الثابت أمثلة توضيحية لا أحداث حقيقية — يُعلَّم `sample` ليعرض التطبيق ذلك صراحة
        _CACHE = merged if merged else [{**e, "ts": None, "sample": True} for e in FALLBACK]
        _CACHE_TS = time.time()

    events = list(_CACHE)
    if currency:
        cur = currency.upper()
        events = [e for e in events if str(e.get("currency", "")).upper() == cur]
    if impact:
        imp = impact.lower()
        events = [e for e in events if str(e.get("impact", "")).lower() == imp]
    return events
