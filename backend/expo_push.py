"""Expo Push API — remote notifications when alerts trigger."""
from __future__ import annotations

from typing import Any

import httpx

EXPO_URL = "https://exp.host/--/api/v2/push/send"

# قناة إشعارات أندرويد التي ينشئها التطبيق عند الإقلاع (`mobile/src/notifications.ts` →
# `ALERT_CHANNEL_ID`). بلا هذا الحقل تسقط كل دفعة على القناة الاحتياطية «Miscellaneous»
# بأهمية افتراضية: لا ظهور فوق الشاشة، ولا مدخل باسم مفهوم بإعدادات النظام لضبط صوت
# تنبيهات الأسعار وحدها. **المعرّف مرتبط بالتطبيق حرفياً — لا يُغيَّر بطرف واحد.**
# قناة غير موجودة (تطبيق قديم لم يُحدَّث) تسقط تلقائياً للقناة الافتراضية كما كان، بلا فشل.
ANDROID_CHANNEL_ID = "matrix-alerts"

# أخطاء دائمة فقط — لا تحذف لـ MessageTooBig / MessageRateExceeded وغيرها
_PERMANENT_TOKEN_ERRORS = frozenset({"DeviceNotRegistered"})
# خطأ تذكرة عابر: Expo رفض رسالة هذا الجهاز الآن (حدّ المعدّل لكل جهاز) لا نهائياً ⇒ تُعاد لاحقاً.
# كان يُعامَل كنجاح ⇒ إشعار تنبيه موسوم مُطلَقاً لا يصل ولا يُعاد.
_TRANSIENT_TOKEN_ERRORS = frozenset({"MessageRateExceeded"})
# حدّ Expo لطلب واحد: 100 رسالة. `send_push` لا يقبل أكثر؛ المُرسِل يقسّم (`alert_worker._deliver`).
MAX_BATCH = 100


def _tokens_with_errors(tokens: list[str], payload: Any, errors: frozenset[str]) -> list[str]:
    if not isinstance(payload, dict):
        return []
    data = payload.get("data")
    if not isinstance(data, list):
        return []
    bad: list[str] = []
    for i, item in enumerate(data):
        if i >= len(tokens) or not isinstance(item, dict):
            continue
        if item.get("status") != "error":
            continue
        details = item.get("details")
        err = details.get("error") if isinstance(details, dict) else None
        if err in errors:
            bad.append(tokens[i])
    return bad


def _invalid_tokens_from_response(tokens: list[str], payload: Any) -> list[str]:
    return _tokens_with_errors(tokens, payload, _PERMANENT_TOKEN_ERRORS)


def send_push(tokens: list[str], title: str, body: str, data: dict | None = None) -> dict:
    if not tokens:
        return {"ok": False, "sent": 0, "invalid_tokens": []}
    if len(tokens) > MAX_BATCH:
        # كان `tokens[:100]` بصمت ⇒ الأجهزة بعد المئة لا تُبلَّغ و«sent» يوحي بالنجاح
        raise ValueError(f"at most {MAX_BATCH} tokens per request, got {len(tokens)}")
    batch = list(tokens)
    messages = [
        {
            "to": t,
            "title": title,
            "body": body,
            "sound": "default",
            "priority": "high",
            "channelId": ANDROID_CHANNEL_ID,
            "data": data or {},
        }
        for t in batch
    ]
    with httpx.Client(timeout=15.0) as client:
        r = client.post(EXPO_URL, json=messages, headers={"Accept": "application/json"})
        r.raise_for_status()
        payload = r.json()
    invalid = _invalid_tokens_from_response(batch, payload)
    return {
        "ok": True,
        "sent": len(messages),
        "response": payload,
        "invalid_tokens": invalid,
        "retry_tokens": _tokens_with_errors(batch, payload, _TRANSIENT_TOKEN_ERRORS),
    }
