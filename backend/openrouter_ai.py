"""OpenRouter LLM — trading assistant + academy interrupt."""
from __future__ import annotations

import os
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


def trading_answer(question: str, symbol: str, context: str) -> str:
    system = (
        "أنت خبير تداول فوركس في منصة MATRIX. أجب بالعربية باختصار وعملية. "
        "اذكر اتجاهاً محتملاً، دخولاً تقريبياً، وقفاً، هدفاً، ونسبة نجاح تقديرية. "
        "لا تعد بأرباح مضمونة."
    )
    user = f"الرمز: {symbol}\nسياق السوق:\n{context}\n\nسؤال المتداول:\n{question}"
    return chat(system, user)


def interrupt_answer(question: str, segment_title: str, segment_text: str) -> str:
    system = (
        "أنت مدرّس أكاديمية MATRIX. المتعلّم أوقف الشرح الصوتي ليسأل. "
        "أجب بالعربية بشكل مختصر وعملي ثم اذكر أن الشرح سيكمل."
    )
    user = (
        f"المقطع: {segment_title}\n"
        f"نص المقطع: {segment_text}\n\n"
        f"سؤال المتعلّم: {question}"
    )
    return chat(system, user, max_tokens=600)


def parse_setup_hint(text: str) -> dict[str, Any]:
    """Light extraction for API shape compatibility."""
    direction = "buy" if any(w in text for w in ("شراء", "صعود", "buy", "long")) else "sell"
    return {
        "direction": direction,
        "entry": 0.0,
        "sl": 0.0,
        "tp": 0.0,
        "win_probability": 58,
    }
