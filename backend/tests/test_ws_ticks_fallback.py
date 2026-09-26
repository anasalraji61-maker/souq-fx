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
    monkeypatch.setattr(main.td_ws, "received_at", lambda syms: {s: 1700000000.0 for s in syms})
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


def test_server_closing_cleanly_marks_disconnected_and_backs_off(monkeypatch):
    """إغلاق نظيف ينهي `async for` بلا استثناء: كان `connected` يبقى true وإعادة الاتصال فورية بلا انتظار."""
    import asyncio

    ws_mod = main.td_ws
    seen: list[bool] = []

    class _FakeWS:
        async def send(self, _msg):
            pass

        def __aiter__(self):
            return self

        async def __anext__(self):
            raise StopAsyncIteration

    class _Conn:
        async def __aenter__(self):
            return _FakeWS()

        async def __aexit__(self, *a):
            return False

    async def _sleep(_s):
        seen.append(ws_mod._connected)
        raise asyncio.CancelledError

    monkeypatch.setattr(ws_mod, "_ws_key", lambda: "k")
    monkeypatch.setattr(ws_mod.websockets, "connect", lambda *a, **k: _Conn())
    monkeypatch.setattr(ws_mod.asyncio, "sleep", _sleep)
    try:
        asyncio.run(ws_mod.run_forever())
    except asyncio.CancelledError:
        pass
    assert seen == [False]  # نام قبل إعادة الاتصال، والحالة «غير متصل»
    assert ws_mod.status()["connected"] is False


def test_snapshot_survives_a_tick_arriving_from_the_ws_thread_mid_read(monkeypatch):
    """`snapshot` يُقرأ من خيط (`asyncio.to_thread`) والحلقة تضيف رمزاً ⇒ كان RuntimeError يُسقط دورة الفحص."""
    import time as _t

    import twelve_data_ws as ws

    latest = {"EURUSD": 1.1, "GBPUSD": 1.3}

    class _Racy(dict):
        def get(self, k, d=None):
            latest.setdefault("XAUUSD", 2400.0)  # تيك جديد يصل أثناء المرور
            return super().get(k, d)

    now = _t.time()
    monkeypatch.setattr(ws, "LATEST", latest)
    monkeypatch.setattr(ws, "LATEST_AT", _Racy(EURUSD=now, GBPUSD=now))
    assert ws.snapshot(max_age=60) == {"EURUSD": 1.1, "GBPUSD": 1.3}
    assert ws.recent_snapshot()[0] == {"EURUSD": 1.1, "GBPUSD": 1.3}
