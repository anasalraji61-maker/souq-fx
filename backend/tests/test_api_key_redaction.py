"""مفتاح Twelve Data لا يخرج بنصّ خطأ.

`httpx.HTTPStatusError` يحمل الرابط كاملاً `…&apikey=<المفتاح>`: كان 429 من البحث يصل العميل
(`/api/symbols/search` بلا دخول) بـ502 نصّه الرابط بالمفتاح — والمفتاح مشترك مع الروبوت ⇒ أيّ أحد
يستنزف الحدّ المشترك. وفشل الشموع يُسجَّل بـ`exc_info` (السلسلة `from exc` تطبع الرابط).

**بلا شبكة**: `httpx.Client` بناقل مزيّف (`MockTransport`).
"""
from __future__ import annotations

import httpx
import pytest
from fastapi.testclient import TestClient

import main
import twelve_data as market
import twelve_data_ws

_KEY = "SECRETKEY123"


@pytest.fixture()
def provider(monkeypatch):
    client = TestClient(main.app, raise_server_exceptions=False)  # قبل استبدال `httpx.Client`
    monkeypatch.setenv("TWELVE_DATA_API_KEY", _KEY)
    real = httpx.Client
    status = {"code": 429}

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(status["code"], json={"status": "error"})

    monkeypatch.setattr(market.httpx, "Client", lambda **k: real(transport=httpx.MockTransport(handler), **k))
    market._cache.clear()
    return client, status


@pytest.mark.parametrize("code", [429, 401, 500, 503])
def test_symbol_search_error_does_not_leak_the_key(provider, code):
    client, status = provider
    status["code"] = code
    r = client.get("/api/symbols/search?q=EUR")
    assert r.status_code == 502
    assert _KEY not in r.text and "apikey" not in r.text.lower()


def test_time_series_error_has_no_key_and_no_chained_url(provider):
    _, status = provider
    status["code"] = 500
    with pytest.raises(RuntimeError) as ei:
        market.fetch_time_series_with_meta("EURUSD", "15m", 120)
    assert _KEY not in str(ei.value)
    assert ei.value.__cause__ is None and ei.value.__suppress_context__


def test_redact_hides_key_in_any_text(monkeypatch):
    monkeypatch.setenv("TWELVE_DATA_API_KEY", _KEY)
    assert _KEY not in market.redact(f"wss://ws.twelvedata.com/v1/quotes/price?apikey={_KEY} rejected")
    assert market.redact("apikey=other&x=1") == "apikey=***&x=1"
    assert twelve_data_ws.redact is market.redact
