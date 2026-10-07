"""SPA static file serving with fallback to index.html via 404 handler.

Serves built frontend from FRONTEND_DIST_DIR (default <repo root>/dist).
Uses an exception handler for 404 instead of a catch-all route to avoid
shadowing other routes and turning 405 into 404.
"""
from __future__ import annotations

import os
from pathlib import Path

from fastapi import Request
from fastapi.responses import FileResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from fastapi.exception_handlers import http_exception_handler as default_http_exception_handler


def resolve_dist_dir() -> Path | None:
    """Return the dist directory if it exists and contains index.html, else None.

    Reads FRONTEND_DIST_DIR env var on every call (default: repo root / dist).
    """
    dist = Path(os.environ.get("FRONTEND_DIST_DIR", "") or "")
    if not dist:
        repo_root = Path(__file__).resolve().parent.parent
        dist = repo_root / "dist"
    if dist.is_dir() and (dist / "index.html").is_file():
        return dist
    return None


def cache_headers(path: str) -> dict[str, str]:
    """Browser/CDN caching. Built files under assets/ have a content hash in their name, so they never change:
    cache them for a year (Cloudflare keeps them at its edge too). Pages and the service worker must always be
    re-checked so a new release shows up at once."""
    p = path.lstrip("/")
    if p.startswith("assets/"):
        return {"Cache-Control": "public, max-age=31536000, immutable"}
    if p.endswith((".html", ".webmanifest", ".json")) or p in ("sw.js", "service-worker.js", "registerSW.js"):
        return {"Cache-Control": "no-cache"}
    if p.endswith((".png", ".svg", ".ico", ".jpg", ".jpeg", ".webp", ".woff2", ".woff", ".ttf", ".mp3", ".wav")):
        return {"Cache-Control": "public, max-age=86400"}
    return {"Cache-Control": "no-cache"}


def try_serve_spa(path: str, method: str) -> FileResponse | None:
    """Try to serve a SPA route.

    Returns a FileResponse or None.
    - Returns None if the method is not GET or HEAD.
    - Returns None if the path is `api` or starts with `api/`, `ws`, or `docs`/`openapi.json`.
    - Returns None if `resolve_dist_dir()` is None.
    - If the resolved candidate is an existing file and is_relative_to(dist.resolve()), returns FileResponse(candidate).
    - If the last segment contains a "." (a missing asset), returns None.
    - Otherwise returns FileResponse(dist/"index.html").
    """
    if method not in ("GET", "HEAD"):
        return None

    # Skip API, websocket, and docs routes
    # Strip leading "/" for comparison
    path_stripped = path.lstrip("/")
    if path_stripped == "api" or path_stripped.startswith("api/") or path_stripped.startswith("ws") or path_stripped == "docs" or path_stripped.startswith("docs/") or path_stripped == "openapi.json":
        return None

    dist = resolve_dist_dir()
    if dist is None:
        return None

    dist_resolved = dist.resolve()
    # Strip leading "/" and resolve candidate
    candidate_path = path.lstrip("/")
    candidate = (dist / candidate_path).resolve()

    # Security: block path traversal (including percent-encoded)
    # Check both the original path and the decoded path for traversal attempts
    if ".." in candidate_path or "%2e%2e" in candidate_path.lower() or "%2e" in candidate_path.lower():
        return None
    if candidate.is_file() and candidate.is_relative_to(dist_resolved):
        return FileResponse(candidate, headers=cache_headers(candidate_path))
    # A folder with its own index.html (e.g. /admin/, /legal/) serves that page, not the app shell.
    folder_index = candidate / "index.html"
    if candidate.is_dir() and candidate != dist_resolved and folder_index.is_file() and folder_index.is_relative_to(dist_resolved):
        return FileResponse(folder_index, headers=cache_headers("index.html"))

    # If the last segment has a ".", treat as a missing asset
    last_segment = candidate_path.rsplit("/", 1)[-1]
    if "." in last_segment:
        return None

    # SPA fallback: serve index.html for all other paths
    return FileResponse(dist / "index.html", headers=cache_headers("index.html"))


def register_spa(app) -> None:
    """Register the SPA 404 exception handler on the given FastAPI app."""

    @app.exception_handler(StarletteHTTPException)
    async def _spa_exception_handler(request: Request, exc: StarletteHTTPException):
        if exc.status_code == 404:
            response = try_serve_spa(request.url.path, request.method)
            if response is not None:
                return response
        # For all other cases, use the default JSON error handler
        return await default_http_exception_handler(request, exc)