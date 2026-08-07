"""Expo Push API — remote notifications when alerts trigger."""
from __future__ import annotations

from typing import Any

import httpx

EXPO_URL = "https://exp.host/--/api/v2/push/send"


def send_push(tokens: list[str], title: str, body: str, data: dict | None = None) -> dict:
    if not tokens:
        return {"ok": False, "sent": 0}
    messages = [
        {
            "to": t,
            "title": title,
            "body": body,
            "sound": "default",
            "priority": "high",
            "data": data or {},
        }
        for t in tokens[:100]
    ]
    with httpx.Client(timeout=15.0) as client:
        r = client.post(EXPO_URL, json=messages, headers={"Accept": "application/json"})
        r.raise_for_status()
        payload = r.json()
    return {"ok": True, "sent": len(messages), "response": payload}
