"""
Tests for Risk Controls Module — Task T05
"""

from datetime import datetime, timedelta, timezone

import pytest

from backend.risk_controls import (
    LIVE_TRADING_ENABLED,
    MAX_UNITS,
    DAILY_LOSS_LIMIT,
    LOW_MARGIN,
    CIRCUIT_BREAKER,
    RiskLimits,
    RiskDecision,
    RiskGuard,
    is_live_trading_allowed,
)

T0 = datetime(2026, 1, 5, 12, 0, tzinfo=timezone.utc)


def test_live_trading_disabled():
    assert LIVE_TRADING_ENABLED is False
    assert is_live_trading_allowed() is False


def test_clean_guard_allows_normal_trade():
    guard = RiskGuard()
    decision = guard.check_new_trade(1000.0, 250.0, T0)
    assert isinstance(decision, RiskDecision)
    assert decision.allowed is True
    assert decision.reasons == []


def test_units_at_max_units_allowed():
    guard = RiskGuard()
    decision = guard.check_new_trade(100000.0, None, T0)
    assert decision.allowed is True
    assert decision.reasons == []


def test_units_over_max_units_blocks():
    guard = RiskGuard()
    decision = guard.check_new_trade(100001.0, None, T0)
    assert decision.allowed is False
    assert decision.reasons == [MAX_UNITS]


@pytest.mark.parametrize("units", [0.0, -1.0, -1000.0])
def test_units_not_positive_raises(units):
    guard = RiskGuard()
    with pytest.raises(ValueError):
        guard.check_new_trade(units, None, T0)


def test_daily_loss_exactly_at_limit_blocks():
    guard = RiskGuard()
    guard.record_trade_result(-500.0, T0)
    decision = guard.check_new_trade(100.0, None, T0)
    assert decision.allowed is False
    assert DAILY_LOSS_LIMIT in decision.reasons


def test_daily_loss_just_under_limit_allowed():
    guard = RiskGuard()
    guard.record_trade_result(-499.99, T0)
    decision = guard.check_new_trade(100.0, None, T0)
    assert decision.allowed is True
    assert DAILY_LOSS_LIMIT not in decision.reasons


def test_profits_offset_losses():
    guard = RiskGuard()
    guard.record_trade_result(-600.0, T0)
    guard.record_trade_result(200.0, T0 + timedelta(minutes=30))
    assert guard.daily_pnl(T0) == pytest.approx(-400.0)
    decision = guard.check_new_trade(100.0, None, T0)
    assert decision.allowed is True


def test_daily_ledger_resets_next_utc_day():
    guard = RiskGuard()
    guard.record_trade_result(-600.0, T0)
    next_day = T0 + timedelta(days=1)
    assert guard.daily_pnl(next_day) == 0.0
    decision = guard.check_new_trade(100.0, None, next_day)
    assert decision.allowed is True


def test_margin_below_minimum_blocks():
    guard = RiskGuard()
    decision = guard.check_new_trade(100.0, 149.9, T0)
    assert decision.allowed is False
    assert decision.reasons == [LOW_MARGIN]


def test_margin_at_minimum_allowed():
    guard = RiskGuard()
    decision = guard.check_new_trade(100.0, 150.0, T0)
    assert decision.allowed is True
    assert decision.reasons == []


def test_margin_none_allowed():
    guard = RiskGuard()
    decision = guard.check_new_trade(100.0, None, T0)
    assert decision.allowed is True
    assert decision.reasons == []


def test_three_consecutive_losses_trigger_breaker():
    guard = RiskGuard()
    t = T0
    for _ in range(3):
        guard.record_trade_result(-1.0, t)
        t += timedelta(minutes=5)
    assert guard.consecutive_losses == 3
    # Cooldown starts at the 3rd loss (T0 + 10 min)
    assert guard.cooldown_until == T0 + timedelta(minutes=10) + timedelta(seconds=3600)
    decision = guard.check_new_trade(100.0, None, T0 + timedelta(minutes=16))
    assert decision.allowed is False
    assert CIRCUIT_BREAKER in decision.reasons


def test_win_resets_consecutive_loss_counter():
    guard = RiskGuard()
    t = T0
    for _ in range(2):
        guard.record_trade_result(-1.0, t)
        t += timedelta(minutes=5)
    guard.record_trade_result(1.0, t)
    t += timedelta(minutes=5)
    guard.record_trade_result(-1.0, t)
    t += timedelta(minutes=5)
    guard.record_trade_result(-1.0, t)
    assert guard.consecutive_losses == 2
    assert guard.cooldown_until is None
    decision = guard.check_new_trade(100.0, None, t + timedelta(minutes=5))
    assert decision.allowed is True


def test_breaker_expires_after_cooldown():
    guard = RiskGuard()
    t = T0
    for _ in range(3):
        guard.record_trade_result(-1.0, t)
        t += timedelta(minutes=5)
    # Cooldown starts at the 3rd loss (T0 + 10 min)
    assert guard.cooldown_until == T0 + timedelta(minutes=10) + timedelta(seconds=3600)

    before_expiry = T0 + timedelta(minutes=10) + timedelta(seconds=3599)
    decision = guard.check_new_trade(100.0, None, before_expiry)
    assert decision.allowed is False
    assert CIRCUIT_BREAKER in decision.reasons

    at_expiry = T0 + timedelta(minutes=10) + timedelta(seconds=3600)
    decision = guard.check_new_trade(100.0, None, at_expiry)
    assert decision.allowed is True
    assert guard.cooldown_until is None
    assert guard.consecutive_losses == 0

    # Counter was reset: one more loss does not re-trigger the breaker.
    guard.record_trade_result(-1.0, at_expiry + timedelta(minutes=1))
    assert guard.cooldown_until is None
    decision = guard.check_new_trade(100.0, None, at_expiry + timedelta(minutes=2))
    assert decision.allowed is True


def test_multiple_violations_return_all_reasons():
    guard = RiskGuard()
    guard.record_trade_result(-600.0, T0)
    for _ in range(3):
        guard.record_trade_result(-1.0, T0 + timedelta(minutes=5))
    decision = guard.check_new_trade(
        200000.0, 100.0, T0 + timedelta(minutes=5) + timedelta(seconds=3599)
    )
    assert decision.allowed is False
    assert decision.reasons == [MAX_UNITS, DAILY_LOSS_LIMIT, LOW_MARGIN, CIRCUIT_BREAKER]


def test_naive_datetime_raises_in_record_trade_result():
    guard = RiskGuard()
    naive = datetime(2026, 1, 5, 12, 0)
    with pytest.raises(ValueError):
        guard.record_trade_result(-1.0, naive)


def test_custom_limits_respected():
    limits = RiskLimits(
        max_units=100.0,
        daily_loss_limit=10.0,
        min_margin_level=200.0,
        max_consecutive_losses=2,
        cooldown_seconds=60,
    )
    guard = RiskGuard(limits)
    assert guard.check_new_trade(100.0, 250.0, T0).allowed is True
    assert guard.check_new_trade(100.1, 250.0, T0).reasons == [MAX_UNITS]
    assert guard.check_new_trade(50.0, 199.9, T0).reasons == [LOW_MARGIN]

    guard.record_trade_result(-10.0, T0)
    assert guard.check_new_trade(50.0, 250.0, T0).reasons == [DAILY_LOSS_LIMIT]

    guard.record_trade_result(-1.0, T0)
    assert guard.cooldown_until == T0 + timedelta(seconds=60)
    assert CIRCUIT_BREAKER in guard.check_new_trade(
        50.0, 250.0, T0 + timedelta(seconds=59)
    ).reasons


def test_reset_clears_state():
    guard = RiskGuard()
    guard.record_trade_result(-100.0, T0)
    guard.record_trade_result(-1.0, T0 + timedelta(minutes=1))
    assert guard.daily_pnl(T0) == pytest.approx(-101.0)

    guard.reset()
    assert guard.daily_pnl(T0) == 0.0
    assert guard.consecutive_losses == 0
    assert guard.cooldown_until is None
    assert guard.check_new_trade(1000.0, 300.0, T0).allowed is True


def test_details_contents():
    guard = RiskGuard()
    guard.record_trade_result(-100.0, T0)
    decision = guard.check_new_trade(100.0, 250.0, T0)
    assert decision.details["daily_pnl"] == pytest.approx(-100.0)
    assert decision.details["consecutive_losses"] == 1
    assert decision.details["cooldown_until"] is None
    assert decision.details["live_trading_enabled"] is False

    guard2 = RiskGuard()
    for _ in range(3):
        guard2.record_trade_result(-1.0, T0 + timedelta(minutes=5))
    decision2 = guard2.check_new_trade(100.0, None, T0 + timedelta(minutes=15))
    assert decision2.details["cooldown_until"] == (
        T0 + timedelta(minutes=5) + timedelta(seconds=3600)
    ).isoformat()
