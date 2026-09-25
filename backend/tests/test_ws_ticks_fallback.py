"""`/ws/ticks` بلا مزوّد: لا تيكات. كان يبثّ كل ثانية قاعدة مكتوبة باليد ± 0.04% عشوائياً."""
from __future__ import annotations

from fastapi.testclient import TestClient

import main


def test_no_provider_means_no_ticks_and_says_so(monkeypatch):
    monkeypatch.setattr(main.td_ws, "recent_snapshot", lambda: ({}, None))
    with TestClient(main.app).websocket_connect("/ws/ticks") as ws:
        msg = ws.receive_json()
    assert msg["ticks"] == {}
    assert msg["data_source"]["kind"] == "unavailable"
    assert msg["source"] == "unavailable"


def test_live_provider_ticks_pass_through_unchanged(monkeypatch):
    monkeypatch.setattr(main.td_ws, "recent_snapshot", lambda: ({"EURUSD": 1.08412}, 1700000000.0))
    with TestClient(main.app).websocket_connect("/ws/ticks") as ws:
        msg = ws.receive_json()
    assert msg["ticks"] == {"EURUSD": 1.08412}
    assert msg["data_source"] == {"kind": "provider", "as_of": 1700000000.0, "channel": "twelvedata_ws"}
