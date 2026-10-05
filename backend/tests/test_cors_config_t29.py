"""T29: CORS origins configurable via CORS_ORIGINS env var."""
from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.middleware.cors import CORSMiddleware

from cors_config import DEFAULT_ORIGINS, get_cors_origins, parse_origins


@pytest.mark.parametrize("raw", [None, "", "   "])
def test_parse_origins_empty_returns_defaults(raw):
    assert parse_origins(raw) == DEFAULT_ORIGINS


def test_parse_origins_single_origin():
    assert parse_origins("http://a.com") == ["http://a.com"]


def test_parse_origins_strips_trailing_slash_and_spaces():
    assert parse_origins("http://a.com/, http://b.com") == ["http://a.com", "http://b.com"]


def test_parse_origins_deduplicates_preserving_order():
    assert parse_origins("http://a.com,http://b.com,http://a.com") == ["http://a.com", "http://b.com"]


def test_parse_origins_wildcard_wins():
    assert parse_origins("http://a.com,*") == ["*"]
    assert parse_origins("*") == ["*"]


def test_parse_origins_only_commas_returns_defaults():
    assert parse_origins(" , ,") == DEFAULT_ORIGINS


def test_parse_origins_returns_copy_of_defaults():
    result = parse_origins(None)
    result.append("http://mutated.example")
    assert DEFAULT_ORIGINS == ["http://localhost:3000", "http://localhost:5173"]
    assert parse_origins("") == DEFAULT_ORIGINS


def test_get_cors_origins_reads_env(monkeypatch):
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    assert get_cors_origins() == DEFAULT_ORIGINS

    monkeypatch.setenv("CORS_ORIGINS", "http://x.com")
    assert get_cors_origins() == ["http://x.com"]

    monkeypatch.delenv("CORS_ORIGINS")
    assert get_cors_origins() == DEFAULT_ORIGINS


def _cors_app(allow_origins):
    app = FastAPI()
    app.add_middleware(CORSMiddleware, allow_origins=allow_origins, allow_credentials=True)

    @app.get("/ping")
    def ping():
        return {"ok": True}

    return app


def test_cors_allows_configured_origin():
    client = TestClient(_cors_app(parse_origins("http://ok.example")))
    resp = client.get("/ping", headers={"Origin": "http://ok.example"})
    assert resp.status_code == 200
    assert resp.headers["access-control-allow-origin"] == "http://ok.example"


def test_cors_blocks_unknown_origin():
    client = TestClient(_cors_app(parse_origins("http://ok.example")))
    resp = client.get("/ping", headers={"Origin": "http://evil.example"})
    assert resp.status_code == 200
    assert "access-control-allow-origin" not in resp.headers


def test_cors_defaults_block_both_unknown_origins():
    client = TestClient(_cors_app(parse_origins(None)))
    assert "access-control-allow-origin" not in client.get(
        "/ping", headers={"Origin": "http://evil.example"}
    ).headers
    assert client.get("/ping", headers={"Origin": "http://localhost:5173"}).headers[
        "access-control-allow-origin"
    ] == "http://localhost:5173"
