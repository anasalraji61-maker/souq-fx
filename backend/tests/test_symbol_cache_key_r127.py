"""run 127: «EURUSD» و« EURUSD» و«‏EURUSD» (علامة اتجاه) و«ＥＵＲＵＳＤ» أداة واحدة — كان كلّ منها مفتاح كاش وطلب
مزوّد مستقلّين ⇒ الرمز نفسه بسعرين مختلفين لحظةَ واحدة (حتى 90ث بـ15m، 30ث بالاقتباس)، وحصّة الروبوت تُستهلك."""
import time
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

import main
import twelve_data as market

SPELLINGS = ["EURUSD", "%20EURUSD", "%E2%80%8FEURUSD", "%EF%BC%A5%EF%BC%B5%EF%BC%B2%EF%BC%B5%EF%BC%B3%EF%BC%A4", "eurusd"]


class _Resp:
    status_code = 200

    def __init__(self, body):
        self._b = body

    def json(self):
        return self._b

    def raise_for_status(self):
        pass


@pytest.fixture
def provider(monkeypatch):
    now = time.time()
    start = (int(now) // 900) * 900 - 900 * 199
    calls, price = [], {"v": 1.1}

    def rows():
        return [{"datetime": datetime.fromtimestamp(start + i * 900, tz=timezone.utc).strftime("%Y-%m-%d %H:%M:%S"),
                 "open": str(price["v"]), "high": str(price["v"] + 0.0002), "low": str(price["v"] - 0.0002),
                 "close": str(price["v"])} for i in range(200)]

    class _Client:
        def __init__(self, *a, **k):
            pass

        def __enter__(self):
            return self

        def __exit__(self, *a):
            return False

        def get(self, url, params=None):
            ep = url.rsplit("/", 1)[-1]
            calls.append((ep, dict(params or {})))
            if ep == "time_series":
                return _Resp({"values": rows()})
            return _Resp({"close": str(price["v"]), "last_quote_at": int(now) - 5, "is_market_open": True})

    monkeypatch.setenv("TWELVE_DATA_API_KEY", "test-key")
    monkeypatch.setattr(market, "configured", lambda: True)
    monkeypatch.setattr(market, "CANDLE_DISK", None, raising=False)
    monkeypatch.setattr(market.httpx, "Client", _Client)
    for c in (market._cache, market._base_at, market._disk_checked, market._quote_marks, main._QUOTE_CACHE):
        c.clear()
    yield calls, price
    for c in (market._cache, market._quote_marks, main._QUOTE_CACHE):
        c.clear()


def test_chart_spellings_share_one_cache_entry(provider):
    calls, price = provider
    client = TestClient(main.app)
    seen = set()
    for s in SPELLINGS:
        j = client.get(f"/api/charts/{s}?timeframe=15m").json()
        seen.add((j["symbol"], j["last"]))
        price["v"] += 0.01  # المزوّد يتحرّك بين الطلبات
    assert seen == {("EURUSD", 1.1)}
    assert sum(1 for ep, _ in calls if ep == "time_series") == 1


def test_quote_spellings_share_one_cache_entry(provider):
    calls, price = provider
    client = TestClient(main.app)
    out = set()
    for s in SPELLINGS:
        j = client.get(f"/api/market/quote/{s}").json()
        out.add((j["symbol"], j["price"]))
        price["v"] += 0.01
    assert out == {("EURUSD", 1.1)}
    assert sum(1 for ep, _ in calls if ep == "quote") == 1
