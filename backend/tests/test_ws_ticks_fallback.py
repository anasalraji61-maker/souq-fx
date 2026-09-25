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


def test_each_tick_carries_its_own_receive_time(monkeypatch):
    """`as_of` الدفعة = أحدث استلام؛ تيكٌ أقدم بـ90 ثانية كان يحمل وقت غيره."""
    now = 1700000000.0
    monkeypatch.setattr(main.td_ws, "LATEST", {"EURUSD": 1.08, "XAUUSD": 2400.0})
    monkeypatch.setattr(main.td_ws, "LATEST_AT", {"EURUSD": now, "XAUUSD": now - 90})
    with TestClient(main.app).websocket_connect("/ws/ticks") as ws:
        msg = ws.receive_json()
    assert msg["data_source"]["as_of"] == now
    assert msg["ticks_at"] == {"EURUSD": now, "XAUUSD": now - 90}


def test_status_lists_only_recent_symbols_as_live(monkeypatch):
    """`symbols_live` كان كل رمز وصل سعره يوماً — حتى بعد انقطاع بساعات."""
    import time
    now = time.time()
    monkeypatch.setattr(main.td_ws, "LATEST", {"EURUSD": 1.08, "GBPUSD": 1.3})
    monkeypatch.setattr(main.td_ws, "LATEST_AT", {"EURUSD": now - 5, "GBPUSD": now - 3600})
    st = main.td_ws.status()
    assert st["symbols_live"] == ["EURUSD"]
    assert st["symbols_stale"] == ["GBPUSD"]
