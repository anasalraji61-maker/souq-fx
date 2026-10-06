"""T36a: Contract test — every /api/... path in mobile/src/api.ts must match a backend route.

This test does not touch the DB and makes no network calls.
"""

from __future__ import annotations

import re
from pathlib import Path

import pytest


def extract_mobile_api_paths() -> set[str]:
    """Extract all /api/... paths from mobile/src/api.ts."""
    api_ts_path = Path(__file__).resolve().parents[2] / "mobile/src/api.ts"
    content = api_ts_path.read_text(encoding="utf-8")

    paths: set[str] = set()

    # 1. Single-quoted strings: '/api/...'
    for match in re.finditer(r"'(/api/[^'\s`]+)", content):
        path = match.group(1)
        # Cut at first ${, ?, or backtick
        path = path.split("${")[0].split("?")[0].split("`")[0]
        paths.add(path)

    # 2. Double-quoted strings: "/api/..."
    for match in re.finditer(r'"(/api/[^"\s`]+)', content):
        path = match.group(1)
        path = path.split("${")[0].split("?")[0].split("`")[0]
        paths.add(path)

    # 3. Template literals: `/api/...${...}` or `/api/...?...`
    # Find template literals containing /api/
    for match in re.finditer(r"`(/api/[^`]*?)([\$\?`]|$)", content):
        path = match.group(1)
        path = path.split("${")[0].split("?")[0]
        paths.add(path)

    # 4. ${API_URL}/api/... patterns inside template literals
    for match in re.finditer(r"\$\{API_URL\}(/api/[^`\$\?]+)", content):
        path = match.group(1)
        path = path.split("${")[0].split("?")[0]
        paths.add(path)

    return paths


def get_backend_route_paths() -> list[str]:
    """Get all /api/... route paths from the FastAPI app."""
    from main import app

    routes = []

    def walk(items, prefix=""):
        for route in items:
            # newer FastAPI keeps included routers as lazy `_IncludedRouter` entries
            inner = getattr(route, "original_router", None)
            if inner is not None:
                ctx = getattr(route, "include_context", None)
                walk(inner.routes, prefix + (getattr(ctx, "prefix", "") or ""))
                continue
            path = getattr(route, "path", None)
            if path is not None:
                full = prefix + path
                if full.startswith("/api"):
                    routes.append(full)

    walk(app.routes)
    return routes


def route_to_pattern(route_path: str) -> re.Pattern:
    """Convert FastAPI route path to regex pattern.
    
    Replaces {param} and {param:path} with [^/]+.
    """
    pattern = re.sub(r"\{[^}]+\}", "[^/]+", route_path)
    return re.compile("^" + pattern + "$")


def mobile_path_matches_route(mobile_path: str, route_path: str, route_pattern: re.Pattern) -> bool:
    """Check if a mobile path matches a backend route."""
    # Exact match via pattern
    if route_pattern.match(mobile_path):
        return True
    
    # Trailing slash on mobile path = "prefix followed by one path parameter"
    if mobile_path.endswith("/"):
        prefix = mobile_path.rstrip("/")
        # Check if route_path is prefix + / + {param}
        if route_path.startswith(prefix + "/"):
            rest = route_path[len(prefix) + 1:]
            if rest.startswith("{"):  # {param} or {param}/sub-path
                return True
    
    return False


def test_extracts_known_paths():
    """The extracted set contains known paths."""
    paths = extract_mobile_api_paths()
    
    # These are known paths from mobile/src/api.ts
    assert "/api/auth/login" in paths
    assert "/api/alerts/check" in paths
    assert "/api/trades" in paths


def test_matcher_handles_param_routes():
    """Unit-test the matcher with fake templates."""
    # /api/x/{id} should match /api/x/
    pattern = route_to_pattern("/api/x/{id}")
    assert mobile_path_matches_route("/api/x/", "/api/x/{id}", pattern)
    
    # /api/x/{id} should NOT match /api/x (no trailing slash)
    assert not mobile_path_matches_route("/api/x", "/api/x/{id}", pattern)
    
    # /api/x/{id} should match /api/x/123
    assert mobile_path_matches_route("/api/x/123", "/api/x/{id}", pattern)
    
    # /api/y/{name:path} should match /api/y/
    pattern2 = route_to_pattern("/api/y/{name:path}")
    assert mobile_path_matches_route("/api/y/", "/api/y/{name:path}", pattern2)
    
    # Exact match without trailing slash
    pattern3 = route_to_pattern("/api/exact")
    assert mobile_path_matches_route("/api/exact", "/api/exact", pattern3)
    assert not mobile_path_matches_route("/api/exact/", "/api/exact", pattern3)


def test_matcher_rejects_unknown():
    """Unknown path /api/nope/zzz does not match."""
    pattern = route_to_pattern("/api/known/{id}")
    assert not mobile_path_matches_route("/api/nope/zzz", "/api/known/{id}", pattern)
    
    # Also test that /api/nope/ doesn't match /api/known/{id}
    assert not mobile_path_matches_route("/api/nope/", "/api/known/{id}", pattern)


def test_every_mobile_path_has_backend_route():
    """Every mobile /api/... path must have a matching backend route."""
    mobile_paths = extract_mobile_api_paths()
    backend_routes = get_backend_route_paths()
    
    # Build route patterns
    route_patterns = {route: route_to_pattern(route) for route in backend_routes}
    
    # Skip auth prefix constants (used only as prefix check in api.ts)
    auth_prefixes = {"/api/auth/", "/api/auth/*"}
    
    unmatched = []
    for mobile_path in sorted(mobile_paths):
        if mobile_path in auth_prefixes:
            continue
        
        matched = False
        for route_path, pattern in route_patterns.items():
            if mobile_path_matches_route(mobile_path, route_path, pattern):
                matched = True
                break
        
        if not matched:
            unmatched.append(mobile_path)
    
    if unmatched:
        pytest.fail(
            "The following mobile API paths have no matching backend route:\n"
            + "\n".join(f"  {p}" for p in unmatched)
        )


# Additional TestClient tests for any compat routes we add
def test_compat_routes_exist():
    """Test that compat routes (if any) return non-404."""
    from fastapi.testclient import TestClient
    from main import app
    
    client = TestClient(app)
    
    # This test will pass even if no compat routes are added
    # If we add routes to routers_mobile_compat.py, add assertions here
    response = client.get("/api/health")
    assert response.status_code == 200