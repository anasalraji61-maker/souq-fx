"""اختبارات وحدة لـcommissions.py — منطق عمولات ثنائي بحت (بلا قاعدة بيانات)،
كل توقّع محسوب يدوياً من قواعد الملف نفسه (10% مباشر، +5% توازن، مستويات
2/4/8/16 للمتداول و2/4/8/16/32/64/128/256 لباقي الأدوار)."""
from __future__ import annotations

import commissions as comm


def test_levels_for_role_trader():
    assert comm.levels_for_role("trader") == [2, 4, 8, 16]


def test_levels_for_role_pro_roles():
    for role in ("trainer", "broker", "agent", "company"):
        assert comm.levels_for_role(role) == [2, 4, 8, 16, 32, 64, 128, 256]


def test_levels_for_role_unknown_defaults_to_trader_levels():
    assert comm.levels_for_role("unknown-role") == [2, 4, 8, 16]


def test_unlocked_balance_levels_requires_equal_sides():
    assert comm.unlocked_balance_levels(3, 5, "trader") == []


def test_unlocked_balance_levels_requires_positive_side():
    assert comm.unlocked_balance_levels(0, 0, "trader") == []


def test_unlocked_balance_levels_trader_partial():
    # متوازن عند 4 → يفتح 2 و4 فقط (8 و16 أعلى من 4)
    assert comm.unlocked_balance_levels(4, 4, "trader") == [2, 4]


def test_unlocked_balance_levels_trader_full():
    assert comm.unlocked_balance_levels(16, 16, "trader") == [2, 4, 8, 16]


def test_unlocked_balance_levels_company_full():
    assert comm.unlocked_balance_levels(300, 300, "company") == [
        2,
        4,
        8,
        16,
        32,
        64,
        128,
        256,
    ]


def test_rate_summary_balanced_trader():
    out = comm.rate_summary(4, 4, "trader")
    assert out["balanced"] is True
    assert out["direct_rate"] == 0.10
    assert out["balance_bonus_rate"] == 0.05
    # مقارنة بنفس تعبير الجمع بالوحدة نفسها (لا 0.15 حرفياً) لتجنّب أي فرق تقريب عائم
    assert out["effective_rate"] == comm.DIRECT_RATE + comm.BALANCE_BONUS_RATE
    assert out["unlocked_levels"] == [2, 4]
    assert out["next_level"] == 8


def test_rate_summary_unbalanced_trader():
    out = comm.rate_summary(3, 5, "trader")
    assert out["balanced"] is False
    assert out["direct_rate"] == 0.10
    assert out["balance_bonus_rate"] == 0.0
    assert out["effective_rate"] == 0.10
    assert out["unlocked_levels"] == []
    # pair = min(3, 5) = 3 → أول مستوى أعلى منه هو 4
    assert out["next_level"] == 4


def test_rate_summary_next_level_none_when_all_unlocked():
    out = comm.rate_summary(16, 16, "trader")
    assert out["next_level"] is None


def test_plan_document_structure_and_rates():
    doc = comm.plan_document()
    assert doc["direct_rate"] == 0.10
    assert doc["balance_bonus_rate"] == 0.05
    assert len(doc["roles"]) == 5
    rates = {row["type"]: row["rate_pct"] for row in doc["commission_table"]}
    assert rates["جلب مباشر"] == 10
    assert rates["مكافأة توازن"] == 5
    assert rates["فعّالة متوازن"] == 15
    assert rates["فعّالة غير متوازن"] == 10
