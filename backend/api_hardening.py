"""T20 API hardening: in-memory per-IP rate limiter + health payload.

This module is intentionally free of any FastAPI app import. It exposes pure
logic (the `RateLimiter` sliding-window limiter, env parsing, db reachability
and the health payload) plus a single Starlette `BaseHTTPMiddleware` subclass
(`RateLimitMiddleware`) that can be mounted on any app.
"""
from __future__ import annotations

import os
import time
from collections import deque

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

_ENV_RATE_LIMIT = "API_RATE_LIMIT_PER_MIN"


class RateLimiter:
    """Sliding-window per-key rate limiter.

    A `deque` of hit timestamps is kept per key. Each call drops entries that
    have fallen out of the window (``<= now - window_s``) and, when still under
    the limit, records the hit. A blocked call is never recorded, so it does
    not extend the window. ``limit <= 0`` disables limiting entirely.
    """

    def __init__(self, limit: int, window_s: float = 60.0) -> None:
        self.limit = limit
        self.window_s = window_s
        self._hits: dict[str, deque] = {}

    def allow(self, key: str, now: float) -> bool:
        if self.limit <= 0:
            return True
        dq = self._hits.setdefault(key, deque())
        cutoff = now - self.window_s
        while dq and dq[0] <= cutoff:
            dq.popleft()
        if len(dq) >= self.limit:
            return False
        dq.append(now)
        return True

    def reset(self) -> None:
        self._hits.clear()


def limit_from_env(default: int = 100000) -> int:
    """Read the per-minute limit from the environment.

    Falls back to ``default`` when the variable is missing, not an integer, or
    negative.
    """
    raw = os.getenv(_ENV_RATE_LIMIT)
    if raw is None:
        return default
    try:
        value = int(raw.strip())
    except (ValueError, AttributeError):
        return default
    if value < 0:
        return default
    return value


def db_reachable() -> bool:
    """Return True when the database answers a trivial ``SELECT 1``."""
    try:
        from core.db_conn import _conn

        conn = _conn()
        try:
            conn.execute("SELECT 1")
        finally:
            conn.close()
        return True
    except Exception:
        return False


def health_payload(version: str) -> dict:
    """Build the ``/api/health`` response body."""
    db = db_reachable()
    return {"status": "ok" if db else "degraded", "version": version, "db": db}


class RateLimitMiddleware(BaseHTTPMiddleware):
    """Per-IP sliding-window limiter for ``/api/*`` paths.

    ``/api/health`` is exempt so monitors can always reach it. Blocked requests
    receive a 429 with a ``Retry-After`` header.
    """

    def __init__(self, app, limiter: RateLimiter) -> None:
        super().__init__(app)
        self.limiter = limiter

    async def dispatch(self, request, call_next):
        path = request.url.path
        if path.startswith("/api/") and path != "/api/health":
            key = request.client.host if request.client else "unknown"
            if not self.limiter.allow(key, time.monotonic()):
                return JSONResponse(
                    status_code=429,
                    content={"detail": "rate limit exceeded"},
                    headers={"Retry-After": "60"},
                )
        return await call_next(request)
