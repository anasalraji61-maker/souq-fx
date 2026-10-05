"""
Tests for Trading Mode API — Task T34b

Verifies:
- GET /api/trading/mode returns PAPER mode
- PUT/POST reject non-PAPER modes with 403
- PUT/POST accept PAPER mode and empty body
- GET still returns PAPER after rejected requests
- get_trading_mode() raises RuntimeError when live trading enabled
- Source scan: no MetaTrader5/mt5 imports in backend/*.py (excluding tests/)
- Source scan: no order_send in backend/*.py (excluding tests/)
"""
from __future__ import annotations

import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

import main
import risk_controls
import trading_mode


@pytest.fixture()
def client():
    """TestClient without lifespan (no background tasks)."""
    return TestClient(main.app, raise_server_exceptions=False)


class TestTradingModeAPI:
    """Tests for /api/trading/mode endpoints."""

    def test_get_mode_returns_paper(self, client):
        """GET /api/trading/mode returns 200 with mode PAPER, live_trading_enabled false, real_orders false."""
        response = client.get("/api/trading/mode")
        assert response.status_code == 200, response.text
        data = response.json()
        assert data["mode"] == "PAPER"
        assert data["live_trading_enabled"] is False
        assert data["real_orders"] is False

    def test_put_mode_mt5_live_returns_403(self, client):
        """PUT with {"mode":"MT5_LIVE"} returns 403."""
        response = client.put("/api/trading/mode", json={"mode": "MT5_LIVE"})
        assert response.status_code == 403, response.text
        assert response.json()["detail"] == "التداول الحقيقي معطّل: الوضع الورقي فقط"

    def test_put_mode_tradingmode_live_returns_403(self, client):
        """PUT with {"tradingMode":"live"} returns 403."""
        response = client.put("/api/trading/mode", json={"tradingMode": "live"})
        assert response.status_code == 403, response.text
        assert response.json()["detail"] == "التداول الحقيقي معطّل: الوضع الورقي فقط"

    def test_post_mode_paper_returns_200(self, client):
        """POST with {"mode":"paper"} returns 200 and mode PAPER."""
        response = client.post("/api/trading/mode", json={"mode": "paper"})
        assert response.status_code == 200, response.text
        data = response.json()
        assert data["mode"] == "PAPER"
        assert data["live_trading_enabled"] is False
        assert data["real_orders"] is False

    def test_put_mode_empty_body_returns_200(self, client):
        """PUT with an empty body {} returns 200 and mode PAPER."""
        response = client.put("/api/trading/mode", json={})
        assert response.status_code == 200, response.text
        data = response.json()
        assert data["mode"] == "PAPER"
        assert data["live_trading_enabled"] is False
        assert data["real_orders"] is False

    def test_get_still_returns_paper_after_rejected_request(self, client):
        """After a rejected request, GET still returns PAPER."""
        # First, reject a request
        client.put("/api/trading/mode", json={"mode": "LIVE"})
        # Then GET should still return PAPER
        response = client.get("/api/trading/mode")
        assert response.status_code == 200, response.text
        data = response.json()
        assert data["mode"] == "PAPER"
        assert data["live_trading_enabled"] is False
        assert data["real_orders"] is False


class TestTradingModeFunction:
    """Tests for get_trading_mode() function directly."""

    def test_get_trading_mode_raises_runtime_error_when_live_enabled(self, monkeypatch):
        """With LIVE_TRADING_ENABLED=True, get_trading_mode() raises RuntimeError."""
        monkeypatch.setattr(risk_controls, "LIVE_TRADING_ENABLED", True)
        with pytest.raises(RuntimeError, match="live trading is forbidden"):
            trading_mode.get_trading_mode()


class TestSourceScans:
    """Source code scans to prove backend never places real orders."""

    def test_no_metatrader5_imports(self):
        """No backend/*.py file (excluding tests/) imports MetaTrader5 or mt5."""
        backend_dir = Path("backend")
        pattern = re.compile(r"^\s*(import|from)\s+(MetaTrader5|mt5)\b")
        violations = []
        for py_file in backend_dir.glob("*.py"):
            if py_file.name.startswith("test_") or py_file.name == "conftest.py":
                continue
            content = py_file.read_text(encoding="utf-8")
            for i, line in enumerate(content.splitlines(), 1):
                if pattern.match(line):
                    violations.append(f"{py_file.name}:{i}: {line.strip()}")
        assert not violations, f"Found MetaTrader5/mt5 imports:\n" + "\n".join(violations)

    def test_no_order_send(self):
        """No backend/*.py file (excluding tests/) contains order_send."""
        backend_dir = Path("backend")
        violations = []
        for py_file in backend_dir.glob("*.py"):
            if py_file.name.startswith("test_") or py_file.name == "conftest.py":
                continue
            content = py_file.read_text(encoding="utf-8")
            if "order_send" in content:
                # Find line numbers
                for i, line in enumerate(content.splitlines(), 1):
                    if "order_send" in line:
                        violations.append(f"{py_file.name}:{i}: {line.strip()}")
        assert not violations, f"Found order_send references:\n" + "\n".join(violations)