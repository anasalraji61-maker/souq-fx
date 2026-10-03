"""
Risk Controls Module — Task T05
MATRIX Platform Pre-Trade Safety Guard

Decides whether a new trade is allowed based on configurable limits:
1. MAX_UNITS: order size must not exceed max_units
2. DAILY_LOSS_LIMIT: daily P&L must not breach the loss limit (per UTC day)
3. LOW_MARGIN: margin level must stay above min_margin_level
4. CIRCUIT_BREAKER: cooldown after max_consecutive_losses consecutive losses

This module is pure: no I/O, no DB, no network. It places no orders.
Real-money trading is disabled by the LIVE_TRADING_ENABLED constant.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

LIVE_TRADING_ENABLED: bool = False

MAX_UNITS = "MAX_UNITS"
DAILY_LOSS_LIMIT = "DAILY_LOSS_LIMIT"
LOW_MARGIN = "LOW_MARGIN"
CIRCUIT_BREAKER = "CIRCUIT_BREAKER"


def _require_aware(now: datetime) -> None:
    """Reject naive datetimes; all datetimes must be tz-aware."""
    if not isinstance(now, datetime) or now.tzinfo is None:
        raise ValueError("datetime must be tz-aware")


def _to_utc(dt: datetime) -> datetime:
    """Normalize a tz-aware datetime to UTC."""
    return dt.astimezone(timezone.utc)


@dataclass(frozen=True)
class RiskLimits:
    """Pre-trade risk limits."""

    max_units: float = 100000
    daily_loss_limit: float = 500.0
    min_margin_level: float = 150.0
    max_consecutive_losses: int = 3
    cooldown_seconds: int = 3600


@dataclass
class RiskDecision:
    """Result of a pre-trade risk check."""

    allowed: bool
    reasons: list[str]
    details: dict


class RiskGuard:
    """Pre-trade safety guard.

    Tracks per-UTC-day P&L and a consecutive-loss counter, and evaluates a
    new trade against the configured RiskLimits. Pure in-memory state only.
    """

    def __init__(self, limits: RiskLimits | None = None) -> None:
        self.limits = limits or RiskLimits()
        self._daily_pnl: dict[datetime.date, float] = {}
        self.consecutive_losses: int = 0
        self.cooldown_until: datetime | None = None

    def record_trade_result(self, pnl: float, now: datetime) -> None:
        """Record a closed trade's P&L into the daily ledger.

        Args:
            pnl: Realized P&L of the closed trade.
            now: tz-aware datetime of the trade result.

        Raises:
            ValueError: If ``now`` is not tz-aware.
        """
        _require_aware(now)
        day = _to_utc(now).date()
        self._daily_pnl[day] = self._daily_pnl.get(day, 0.0) + pnl

        if pnl < 0:
            self.consecutive_losses += 1
            if self.consecutive_losses >= self.limits.max_consecutive_losses:
                self.cooldown_until = _to_utc(now) + timedelta(
                    seconds=self.limits.cooldown_seconds
                )
        else:
            self.consecutive_losses = 0

    def daily_pnl(self, now: datetime) -> float:
        """Sum of today's (UTC) recorded P&L."""
        _require_aware(now)
        return self._daily_pnl.get(_to_utc(now).date(), 0.0)

    def check_new_trade(
        self, units: float, margin_level: float | None, now: datetime
    ) -> RiskDecision:
        """Evaluate a proposed new trade against all limits.

        Args:
            units: Order size; must be positive.
            margin_level: Current margin level in percent, or None when
                there are no open positions.
            now: tz-aware datetime of the check.

        Returns:
            RiskDecision with allowed, all violated reason codes, and
            diagnostic details.

        Raises:
            ValueError: If ``units <= 0`` or ``now`` is not tz-aware.
        """
        _require_aware(now)
        if units <= 0:
            raise ValueError("units must be positive")

        now_utc = _to_utc(now)
        limits = self.limits

        # Expired cooldowns clear the breaker state before evaluating.
        if self.cooldown_until is not None and now_utc >= self.cooldown_until:
            self.cooldown_until = None
            self.consecutive_losses = 0

        reasons: list[str] = []

        if units > limits.max_units:
            reasons.append(MAX_UNITS)

        if self.daily_pnl(now_utc) <= -limits.daily_loss_limit:
            reasons.append(DAILY_LOSS_LIMIT)

        if margin_level is not None and margin_level < limits.min_margin_level:
            reasons.append(LOW_MARGIN)

        if self.cooldown_until is not None and now_utc < self.cooldown_until:
            reasons.append(CIRCUIT_BREAKER)

        return RiskDecision(
            allowed=not reasons,
            reasons=reasons,
            details={
                "daily_pnl": self.daily_pnl(now_utc),
                "consecutive_losses": self.consecutive_losses,
                "cooldown_until": (
                    self.cooldown_until.isoformat() if self.cooldown_until else None
                ),
                "live_trading_enabled": LIVE_TRADING_ENABLED,
            },
        )

    def reset(self) -> None:
        """Clear all tracked state."""
        self._daily_pnl = {}
        self.consecutive_losses = 0
        self.cooldown_until = None


def is_live_trading_allowed() -> bool:
    """Whether real-money trading is enabled (currently always False)."""
    return LIVE_TRADING_ENABLED
