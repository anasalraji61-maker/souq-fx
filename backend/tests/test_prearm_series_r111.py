"""تنبيه مؤشر لا يُطلق على سلسلة جُلبت **قبل** تسليحه (كاش 1H حتى 3د، وحتى 15د بعد 429).

كان تنبيه RSI «فوق 70» سُلِّح 10:59 يُطلق ويُدفع على RSI ‏97.6 من جلب 10:58 — قراءة من قبل وجود التنبيه.
تنبيه السعر يرفض ذلك أصلاً (`q_at >= armed`)."""
from __future__ import annotations

import time
from datetime import datetime, timezone
from types import SimpleNamespace

import alert_worker
import main
from tests.test_main_routes import _IND_RSI, _RISING, _auth, _fake_series, _register, client  # noqa: F401

_CANDLES = [{"time": 1_700_000_000 + 3600 * i, "open": v, "high": v, "low": v, "close": v}
            for i, v in enumerate(_RISING)]


def _alert(armed: float) -> dict:
    return {"symbol": "BTCUSD", "timeframe": "1H", "alert_type": "rsi", "condition": "above", "value": 70,
            "ts": datetime.fromtimestamp(armed, timezone.utc).isoformat()}


def _serve(monkeypatch, as_of: float):
    monkeypatch.setattr(alert_worker.market, "fetch_time_series_with_meta",
                        lambda s, tf, outputsize=180: (_CANDLES, {"kind": "cache", "as_of": as_of}))
    monkeypatch.setattr(alert_worker, "cross_is_stale", lambda a, raw: False)


def test_worker_skips_series_fetched_before_arming(monkeypatch):
    now = time.time()
    _serve(monkeypatch, now - 90)
    a = _alert(now - 30)
    assert alert_worker._check_indicator(a) is False
    cache: dict = {}
    assert alert_worker._check_indicator(a, cache) is False
    # نفس السلسلة بالكاش لتنبيه سُلِّح قبل جلبها ⇒ قراءة بعده تُحسب
    assert alert_worker._check_indicator(_alert(now - 600), cache) is True


def test_worker_fires_on_series_fetched_after_arming(monkeypatch):
    now = time.time()
    _serve(monkeypatch, now - 10)
    assert alert_worker._check_indicator(_alert(now - 30)) is True


def test_check_route_skips_series_fetched_before_arming(client, monkeypatch):  # noqa: F811
    token = _register(client, "indprearm")
    client.post("/api/indicator-alerts", json=_IND_RSI, headers=_auth(token))
    monkeypatch.setattr(main, "build_series", lambda s, tf="15m", outputsize=180: _fake_series(
        "twelvedata", _RISING, as_of=time.time() - 60))
    assert client.post("/api/indicator-alerts/check", headers=_auth(token)).json()["triggered"] == []
    monkeypatch.setattr(main, "build_series", lambda s, tf="15m", outputsize=180: _fake_series(
        "twelvedata", _RISING))
    assert len(client.post("/api/indicator-alerts/check", headers=_auth(token)).json()["triggered"]) == 1
