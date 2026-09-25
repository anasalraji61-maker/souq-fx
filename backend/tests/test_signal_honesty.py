"""المحلّلون وإجماع المصادر: لا مصدر مرخَّص ⇒ «غير متاح»، لا ضجيج SHA-256 بأسماء بنوك حقيقية.

كان `analysts_forecast` يعرض «HSBC FX Desk» و«Citi Research»… باتجاه وهدف = بصمة SHA-256
لـ(المعرّف|الرمز|نافذة 6 ساعات)، و`social_consensus` يعرض 14 «قناة» (منها «TradingCentral-like»)
بالطريقة نفسها، ومعهما «ثقة» = |المتوسط|×0.75+0.35 (أي 35% على الأقل من لا شيء).
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import main
import signal_hub


@pytest.fixture()
def client():
    return TestClient(main.app)


def _called(monkeypatch):
    calls = []
    monkeypatch.setattr(main, "build_series", lambda *a, **k: calls.append(a))
    return calls


def test_analysts_route_is_unavailable_with_no_invented_fields(client, monkeypatch):
    calls = _called(monkeypatch)
    res = client.get("/api/signals/analysts/EURUSD?timeframe=4H")
    assert res.status_code == 200, res.text
    out = res.json()
    assert out["status"] == "unavailable" and out["data_kind"] == "unavailable"
    assert out["unavailable_reason"] == "no_licensed_feed"
    assert out["analysts"] == []
    assert out["direction"] is None and out["avg_score"] is None and out["levels"] is None
    assert "confidence" not in out
    assert out["timeframe"] == "4H"
    assert calls == [], "لا طلب للمزوّد لبناء ردّ غير متاح"


def test_consensus_route_is_unavailable_with_no_votes(client, monkeypatch):
    calls = _called(monkeypatch)
    out = client.post("/api/signals/social/consensus", json={"symbol": "XAUUSD", "timeframe": "1H"}).json()
    assert out["status"] == "unavailable"
    assert out["votes"] == [] and out["selected_count"] == 0
    assert out["split"] == {"buy": 0, "sell": 0, "neutral": 0}
    assert out["direction"] is None and out["levels"] is None
    assert "confidence" not in out
    assert calls == []


def test_no_source_catalog_is_offered(client):
    assert client.get("/api/signals/social/sources").json()["sources"] == []


@pytest.mark.parametrize("name", ["HSBC", "Citi", "UBS", "Nomura", "Commerzbank", "ING Markets", "TradingCentral"])
def test_no_real_institution_or_competitor_name_remains(name):
    src = open(signal_hub.__file__, encoding="utf-8").read()
    code = "\n".join(line for line in src.splitlines() if not line.lstrip().startswith("#"))
    assert name not in code


def test_the_hash_generator_is_gone():
    for attr in ("_score", "_bucket", "_bias_for_symbol", "ANALYSTS", "SOCIAL_CATALOG", "_confidence"):
        assert not hasattr(signal_hub, attr), attr


def test_analysts_route_refuses_unknown_timeframe_and_bad_symbol(client):
    assert client.get("/api/signals/analysts/EURUSD?timeframe=2H").status_code == 422
    assert client.get("/api/signals/analysts/EU").status_code == 422


def test_indicator_forecast_carries_no_formula_confidence(client):
    """«الثقة» بالتوقّع كانت معادلة ثابتة تُقرأ كاحتمال نجاح — والمؤشّرات نفسها حقيقية تبقى."""
    out = client.post("/api/signals/indicators/forecast", json={"symbol": "EURUSD"}).json()
    assert "confidence" not in out
    assert out["votes"], "أصوات المؤشّرات الحقيقية باقية"
