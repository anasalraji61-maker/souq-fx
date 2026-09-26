"""سلسلة لم يتغيّر إغلاقها قطّ (USDSAR المربوط على 1m): RSI ‏50 اصطلاح (لا ربح ولا خسارة) لا قراءة.

كانت `/api/indicators/snapshot` تعيده `rsi: 50.0` موسوماً provider، وتنبيه RSI «تحت 50» و«فوق 50» يُطلقان
معاً («بلغ RSI المستوى» ولم يتحرّك السوق). التوقّع كان يُسقطه أصلاً (`368add6`).
"""
from __future__ import annotations

import math
import time

import pytest
from fastapi.testclient import TestClient

import alert_worker
import indicators
import main


def _flat(n: int = 180, p: float = 3.7502):
    now = int(time.time()) // 60 * 60
    return [
        {"time": now - 60 * (n - i), "open": p, "high": p, "low": p, "close": p, "volume": None}
        for i in range(n)
    ]


def _wave(n: int = 180):
    now = int(time.time()) // 60 * 60
    out = []
    for i in range(n):
        c = 3.75 * (1 + 0.0004 * math.sin(i / 3))
        out.append({"time": now - 60 * (n - i), "open": c, "high": c, "low": c, "close": c, "volume": None})
    return out


def test_snapshot_marks_flat_closes():
    assert indicators.snapshot(_flat())["flat_closes"] is True
    assert indicators.snapshot(_wave())["flat_closes"] is False


def test_snapshot_route_sends_no_rsi_for_flat_series(monkeypatch):
    monkeypatch.setattr(main.market, "configured", lambda: True)
    monkeypatch.setattr(
        main.market, "fetch_time_series_with_meta",
        lambda s, tf, outputsize=180: (_flat(), {"kind": "provider", "as_of": time.time(), "channel": "twelvedata"}),
    )
    out = TestClient(main.app).get("/api/indicators/snapshot/USDSAR?timeframe=1m").json()
    assert out["data_kind"] == "provider"
    assert out["rsi"] is None and out["flat_closes"] is True


@pytest.mark.parametrize("cond", ["above", "below"])
def test_rsi_alert_does_not_fire_on_flat_series(monkeypatch, cond):
    a = {"symbol": "USDSAR", "timeframe": "1m", "alert_type": "rsi", "condition": cond, "value": 50}
    assert main._check_indicator_alert(a, _flat()) is False
    monkeypatch.setattr(alert_worker, "_indicator_series", lambda a, cache=None: _flat())
    monkeypatch.setattr(alert_worker, "cross_is_stale", lambda a, raw: False)
    assert alert_worker._check_indicator(a) is False


def test_rsi_alert_still_fires_on_moving_series(monkeypatch):
    a = {"symbol": "USDSAR", "timeframe": "1m", "alert_type": "rsi", "condition": "above", "value": 0}
    assert main._check_indicator_alert(a, _wave()) is True
    monkeypatch.setattr(alert_worker, "_indicator_series", lambda a, cache=None: _wave())
    monkeypatch.setattr(alert_worker, "cross_is_stale", lambda a, raw: False)
    assert alert_worker._check_indicator(a) is True
