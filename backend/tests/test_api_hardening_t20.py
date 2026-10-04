"""T20 API hardening tests: /api/health + per-IP rate limiter middleware."""
from __future__ import annotations

import api_hardening
from api_hardening import (
    RateLimiter,
    RateLimitMiddleware,
    db_reachable,
    health_payload,
    limit_from_env,
)
from fastapi import FastAPI
from fastapi.testclient import TestClient


# ── RateLimiter sliding window ────────────────────────────────────────────────

def test_rate_limiter_blocks_after_limit():
    rl = RateLimiter(3)
    assert rl.allow("ip", 0.0) is True
    assert rl.allow("ip", 0.1) is True
    assert rl.allow("ip", 0.2) is True
    assert rl.allow("ip", 0.3) is False


def test_rate_limiter_allows_after_window_passes():
    rl = RateLimiter(3)
    assert rl.allow("ip", 0.0) is True
    assert rl.allow("ip", 0.1) is True
    assert rl.allow("ip", 0.2) is True
    assert rl.allow("ip", 0.3) is False
    # 60.5 is past the 60s window, so the earlier hits fall out.
    assert rl.allow("ip", 60.5) is True


def test_rate_limiter_keys_are_independent():
    rl = RateLimiter(1)
    assert rl.allow("a", 0.0) is True
    assert rl.allow("a", 0.1) is False
    # different key is unaffected
    assert rl.allow("b", 0.1) is True


def test_rate_limiter_limit_zero_is_disabled():
    rl = RateLimiter(0)
    for i in range(10):
        assert rl.allow("ip", float(i)) is True


def test_rate_limiter_blocked_call_does_not_extend_window():
    rl = RateLimiter(1)
    assert rl.allow("ip", 0.0) is True
    # blocked calls must not be recorded
    assert rl.allow("ip", 0.1) is False
    assert rl.allow("ip", 0.2) is False
    # window from the single allowed hit at 0.0 expires after 60s
    assert rl.allow("ip", 60.1) is True


def test_rate_limiter_reset_clears_state():
    rl = RateLimiter(2)
    assert rl.allow("ip", 0.0) is True
    assert rl.allow("ip", 0.1) is True
    assert rl.allow("ip", 0.2) is False
    rl.reset()
    assert rl.allow("ip", 0.3) is True


# ── limit_from_env ────────────────────────────────────────────────────────────

def test_limit_from_env_unset_returns_default(monkeypatch):
    monkeypatch.delenv("API_RATE_LIMIT_PER_MIN", raising=False)
    assert limit_from_env(default=123) == 123


def test_limit_from_env_valid_integer(monkeypatch):
    monkeypatch.setenv("API_RATE_LIMIT_PER_MIN", "50")
    assert limit_from_env(default=123) == 50


def test_limit_from_env_non_integer_falls_back(monkeypatch):
    monkeypatch.setenv("API_RATE_LIMIT_PER_MIN", "abc")
    assert limit_from_env(default=123) == 123


def test_limit_from_env_negative_falls_back(monkeypatch):
    monkeypatch.setenv("API_RATE_LIMIT_PER_MIN", "-5")
    assert limit_from_env(default=123) == 123


# ── health_payload ────────────────────────────────────────────────────────────

def test_health_payload_ok_when_db_reachable(monkeypatch):
    monkeypatch.setattr(api_hardening, "db_reachable", lambda: True)
    payload = health_payload("0.1.0")
    assert payload["status"] == "ok"
    assert payload["version"] == "0.1.0"
    assert payload["db"] is True


def test_health_payload_degraded_when_db_unreachable(monkeypatch):
    monkeypatch.setattr(api_hardening, "db_reachable", lambda: False)
    payload = health_payload("9.9.9")
    assert payload["status"] == "degraded"
    assert payload["version"] == "9.9.9"
    assert payload["db"] is False


def test_db_reachable_is_a_function():
    assert callable(db_reachable)


# ── Middleware (fresh FastAPI app, not main.app) ─────────────────────────────

def _build_app() -> tuple[FastAPI, RateLimiter]:
    limiter = RateLimiter(2)
    app = FastAPI()
    app.add_middleware(RateLimitMiddleware, limiter=limiter)

    @app.get("/api/x")
    def api_x():
        return {"x": True}

    @app.get("/api/health")
    def api_health():
        return {"ok": True}

    @app.get("/other")
    def other():
        return {"ok": True}

    return app, limiter


def test_middleware_limits_api_path_only():
    app, _ = _build_app()
    client = TestClient(app)
    assert client.get("/api/x").status_code == 200
    assert client.get("/api/x").status_code == 200
    blocked = client.get("/api/x")
    assert blocked.status_code == 429
    assert blocked.headers["Retry-After"] == "60"
    assert blocked.json() == {"detail": "rate limit exceeded"}


def test_middleware_does_not_limit_health_or_non_api():
    app, _ = _build_app()
    client = TestClient(app)
    # /api/health is exempt and /other is not an /api path
    for _ in range(10):
        assert client.get("/api/health").status_code == 200
        assert client.get("/other").status_code == 200


# ── main.app integration ─────────────────────────────────────────────────────

def test_main_app_api_health_endpoint():
    import main

    client = TestClient(main.app, raise_server_exceptions=False)
    r = client.get("/api/health")
    assert r.status_code == 200
    body = r.json()
    assert "status" in body
    assert "version" in body
    assert "db" in body


def test_main_app_existing_health_endpoint_unchanged():
    import main

    client = TestClient(main.app, raise_server_exceptions=False)
    r = client.get("/health")
    assert r.status_code == 200
