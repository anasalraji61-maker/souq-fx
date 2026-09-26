"""MATRIX binary commission plan (left/right network).

Rules:
- Direct referral: 10%
- When left == right at a qualifying level (2, 4, 8…): +5% matching bonus (Anas decision 14 —
  equality at a non-level count such as 1=1 or 3=3 pays nothing extra)
- Otherwise: only the 10% direct
- Trader: 4 balance levels → 2, 4, 8, 16
- Trainer / Broker / Agent / Company: 8 levels → 2, 4, 8, 16, 32, 64, 128, 256
"""
from __future__ import annotations

from typing import Any, Literal

Role = Literal["trader", "trainer", "broker", "agent", "company"]

DIRECT_RATE = 0.10
BALANCE_BONUS_RATE = 0.05

TRADER_LEVELS = [2, 4, 8, 16]
PRO_LEVELS = [2, 4, 8, 16, 32, 64, 128, 256]

PRO_ROLES: set[str] = {"trainer", "broker", "agent", "company"}

ROLE_LABELS_AR: dict[str, str] = {
    "trader": "متداول",
    "trainer": "مدرب",
    "broker": "بروكر",
    "agent": "وكيل",
    "company": "شركة",
}


def levels_for_role(role: str) -> list[int]:
    return list(PRO_LEVELS if role in PRO_ROLES else TRADER_LEVELS)


def plan_document() -> dict[str, Any]:
    return {
        "title": "ملف العمولات · MATRIX",
        "direct_rate": DIRECT_RATE,
        "balance_bonus_rate": BALANCE_BONUS_RATE,
        "rules": [
            "كل عضو له طرفان: يمين ويسار (شبكة ثنائية).",
            "عند جلب متداول جديد: عمولة مباشرة 10%.",
            "إذا تساوى الطرفان (يمين = يسار) عند مستوى مؤهل: عمولة إضافية 5%.",
            "غير ذلك (عدم تساوٍ، أو تساوٍ خارج المستويات مثل 1=1 و3=3): تبقى فقط عمولة الجلب 10%.",
            "المتداول العادي: 4 مستويات توازن — 2 و 4 و 8 و 16.",
            "المدرب / البروكر / الوكيل / الشركة: 8 مستويات — 2 و 4 و 8 و 16 و 32 و 64 و 128 و 256.",
        ],
        "roles": [
            {
                "id": "trader",
                "label": ROLE_LABELS_AR["trader"],
                "levels": TRADER_LEVELS,
                "level_count": 4,
            },
            {
                "id": "trainer",
                "label": ROLE_LABELS_AR["trainer"],
                "levels": PRO_LEVELS,
                "level_count": 8,
            },
            {
                "id": "broker",
                "label": ROLE_LABELS_AR["broker"],
                "levels": PRO_LEVELS,
                "level_count": 8,
            },
            {
                "id": "agent",
                "label": ROLE_LABELS_AR["agent"],
                "levels": PRO_LEVELS,
                "level_count": 8,
            },
            {
                "id": "company",
                "label": ROLE_LABELS_AR["company"],
                "levels": PRO_LEVELS,
                "level_count": 8,
            },
        ],
        "example": {
            "direct": "جلب متداول → 10%",
            "balanced": "يمين=يسار عند مستوى مؤهل → 10% + 5%",
            "unbalanced": "يمين ≠ يسار، أو تساوٍ خارج المستويات → 10% فقط",
        },
        "commission_table": [
            {
                "type": "جلب مباشر",
                "rate_pct": int(DIRECT_RATE * 100),
                "condition": "عند إدخال عضو جديد",
            },
            {
                "type": "مكافأة توازن",
                "rate_pct": int(BALANCE_BONUS_RATE * 100),
                "condition": "يمين = يسار عند مستوى مؤهل",
            },
            {
                "type": "فعّالة متوازن",
                "rate_pct": int((DIRECT_RATE + BALANCE_BONUS_RATE) * 100),
                "condition": "10% + 5%",
            },
            {
                "type": "فعّالة غير متوازن",
                "rate_pct": int(DIRECT_RATE * 100),
                "condition": "يمين ≠ يسار، أو تساوٍ خارج المستويات",
            },
        ],
    }


def unlocked_balance_levels(left: int, right: int, role: str) -> list[int]:
    """Levels reached only when both sides are equal and count >= level."""
    if left != right or left <= 0:
        return []
    balanced = left  # == right
    return [lv for lv in levels_for_role(role) if balanced >= lv]


def pays_balance_bonus(left: int, right: int, role: str) -> bool:
    """قرار أنس ١٤: مكافأة التوازن عند تساوي الطرفين **على مستوى مؤهل** فقط (2، 4، 8…). كانت تُدفع عند أي
    تساوٍ (1=1، 3=3) ⇒ أكثر مما تعد به الخطة. العدّادات لا تنقص ⇒ كل مستوى يُدفع مرة واحدة."""
    return left == right and left in levels_for_role(role)


def rate_summary(left: int, right: int, role: str) -> dict[str, Any]:
    balanced = left == right and left > 0
    pays = pays_balance_bonus(left, right, role)
    unlocked = unlocked_balance_levels(left, right, role)
    return {
        "direct_rate": DIRECT_RATE,
        "balance_bonus_rate": BALANCE_BONUS_RATE if pays else 0.0,
        # مقرَّب: 0.10 + 0.05 كان يُرسَل 0.15000000000000002
        "effective_rate": round(DIRECT_RATE + (BALANCE_BONUS_RATE if pays else 0.0), 4),
        "balanced": balanced,
        # التساوي الحالي على مستوى مؤهل (يدفع 5%) — «balanced» وحده لا يعني مكافأة
        "balance_bonus_qualifies": pays,
        "left": left,
        "right": right,
        "unlocked_levels": unlocked,
        "next_level": _next_level(left, right, role),
        "levels": levels_for_role(role),
        "role": role,
        "role_label": ROLE_LABELS_AR.get(role, role),
    }


def _next_level(left: int, right: int, role: str) -> int | None:
    pair = min(left, right)
    for lv in levels_for_role(role):
        if pair < lv:
            return lv
    return None
