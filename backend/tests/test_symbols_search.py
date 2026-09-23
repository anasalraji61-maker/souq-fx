"""حدّا `/api/symbols/search` — نفس صنف العيب المعالَج بالفحص السريع والاختبار الخلفي: مُصادِق
يعلن قاعدةً ومسارٌ خارجها، والنتيجة **صمت** يقرؤه المتداول حالةَ سوق.

**لماذا هذا الملف**: المسار كان بلا اختبار واحد، وهو المسار الوحيد الذي يأخذ من المتداول نصّاً
يذهب حرفياً لرابط المزوّد وعدداً يُستعمل **شريحةً** على القائمة العائدة:

- `limit` غير موجب كان يمرّ من `min(limit, 30)` كما هو ثم يُستعمل `out[:limit]`: **الشريحة
  السالبة تحذف من الذيل** — `limit=-5` يُسقط آخر خمس نتائج بصمت، و`limit=0` يُفرغ القائمة
  كلّها فيُقرأ «لا رمز بهذا الاسم» على بحثٍ نجح. وطلب المزوّد صُرف من الحدّ المشترك قبلها.
- `q` بلا حدّ طول يذهب برابط الطلب: نصٌّ ملصوق بطول صفحة = **502** من ردّ خطأ المزوّد.

**بلا شبكة**: `httpx.Client` مُستبدَل بمزيّف يردّ جسم المزوّد من الذاكرة، وحالات الرفض تسبق
الطلب أصلاً فلا يُبنى عميل فيها. ولا `with TestClient` فلا دورة حياة ولا عامل خلفي.
"""
from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

import main
import twelve_data as market


@pytest.fixture()
def client():
    return TestClient(main.app, raise_server_exceptions=False)


@pytest.fixture()
def searchable(monkeypatch):
    """يجعل المزوّد «مضبوطاً» ويلتقط ما وصل `symbol_search` فعلاً."""
    calls: list[dict] = []

    def _fake(query: str, limit: int = 20):
        calls.append({"query": query, "limit": limit})
        return [{"symbol": f"SYM{i}", "td_symbol": f"SYM{i}", "name": "", "exchange": "", "type": ""}
                for i in range(limit)]

    monkeypatch.setattr(market, "configured", lambda: True)
    monkeypatch.setattr(market, "symbol_search", _fake)
    return calls


# ---------------------------------------------------------------- حدّ العدد

@pytest.mark.parametrize("bad", [0, -1, -5, -20])
def test_limit_non_positive_rejected(client, searchable, bad):
    """كان 200 بقائمة **مبتورة من الذيل** (سالب) أو فارغة تماماً (صفر) — والآن 422."""
    res = client.get(f"/api/symbols/search?q=eur&limit={bad}")
    assert res.status_code == 422, res.text
    assert calls_empty(searchable), "الطلب رُفض قبل أن يُصرف طلب المزوّد"


def test_limit_above_provider_cap_rejected(client, searchable):
    res = client.get(f"/api/symbols/search?q=eur&limit={market.MAX_SEARCH_RESULTS + 1}")
    assert res.status_code == 422, res.text
    assert calls_empty(searchable)


@pytest.mark.parametrize("ok", [1, 20, 30])
def test_limit_within_bounds_passes_through(client, searchable, ok):
    """الحدّ يرصد المستحيل لا الصغير: 1 و20 و30 تمرّ كما هي، وتصل `symbol_search` بلا تعديل."""
    res = client.get(f"/api/symbols/search?q=eur&limit={ok}")
    assert res.status_code == 200, res.text
    assert len(res.json()["results"]) == ok
    assert searchable[-1]["limit"] == ok


def test_limit_cap_matches_provider_constant(client, searchable):
    """حارس انحراف: سقف المسار هو سقف المزوّد نفسه لا نسخة ثانية منه."""
    res = client.get(f"/api/symbols/search?q=eur&limit={market.MAX_SEARCH_RESULTS}")
    assert res.status_code == 200, res.text


# ---------------------------------------------------------------- حدّ النصّ

def test_long_query_rejected_before_provider(client, searchable):
    """نصّ أطول من الحدّ كان يذهب حرفياً لرابط المزوّد ويعود 502 «فشل البحث»."""
    res = client.get("/api/symbols/search?q=" + "e" * (market.MAX_SEARCH_QUERY + 1))
    assert res.status_code == 422, res.text
    assert calls_empty(searchable)


def test_query_at_limit_still_searches(client, searchable):
    """الحدّ يتجاوز أطول اسم أداة بكثير: نصّ بطول الحدّ بالضبط يمرّ."""
    q = "e" * market.MAX_SEARCH_QUERY
    res = client.get("/api/symbols/search?q=" + q)
    assert res.status_code == 200, res.text
    assert searchable[-1]["query"] == q


@pytest.mark.parametrize("blank", ["", "%20%20"])
def test_blank_query_spends_no_provider_credit(client, searchable, blank):
    """السلوك القائم كما هو: قائمة فارغة بلا أي طلب للمزوّد."""
    res = client.get(f"/api/symbols/search?q={blank}")
    assert res.status_code == 200, res.text
    assert res.json() == {"results": []}
    assert calls_empty(searchable)


def test_unconfigured_provider_is_503(client, monkeypatch):
    monkeypatch.setattr(market, "configured", lambda: False)
    res = client.get("/api/symbols/search?q=eur")
    assert res.status_code == 503, res.text


# ------------------------------------------------- القاعدة بـ`twelve_data` نفسه

class _FakeResponse:
    def __init__(self, payload: dict):
        self._payload = payload
        self.captured: dict = {}

    def raise_for_status(self) -> None:
        return None

    def json(self) -> dict:
        return self._payload


class _FakeClient:
    """بديل `httpx.Client` — يلتقط الوسائط ويردّ جسم المزوّد من الذاكرة بلا شبكة."""

    def __init__(self, sink: dict, payload: dict, **_kw):
        self._sink = sink
        self._payload = payload

    def __enter__(self):
        return self

    def __exit__(self, *_exc):
        return False

    def get(self, url, params=None, **_kw):
        self._sink["url"] = url
        self._sink["params"] = dict(params or {})
        return _FakeResponse(self._payload)


@pytest.fixture()
def provider(monkeypatch):
    """مزوّد مزيّف يردّ ثمانية رموز مرتّبة، فيُرى أثر الشريحة على الترتيب لا على العدد وحده."""
    sink: dict = {}
    payload = {"data": [{"symbol": f"S{i}/X", "instrument_name": f"name {i}"} for i in range(8)]}
    monkeypatch.setattr(market, "_api_key", lambda: "test-key")
    monkeypatch.setattr(market.httpx, "Client", lambda **kw: _FakeClient(sink, payload, **kw))
    return sink


@pytest.mark.parametrize("bad", [0, -1, -5, market.MAX_SEARCH_RESULTS + 1])
def test_library_rejects_out_of_range_limit(provider, bad):
    with pytest.raises(ValueError, match="limit"):
        market.symbol_search("eur", limit=bad)
    assert provider == {}, "الرفض يسبق بناء العميل فلا طلب"


def test_library_rejects_overlong_query(provider):
    with pytest.raises(ValueError, match="query"):
        market.symbol_search("e" * (market.MAX_SEARCH_QUERY + 1))
    assert provider == {}


def test_library_slice_keeps_the_head(provider):
    """جوهر العيب: الشريحة يجب أن تأخذ **الأوائل**. بالسالب كانت تحذف من الذيل."""
    out = market.symbol_search("s", limit=3)
    assert [r["symbol"] for r in out] == ["S0X", "S1X", "S2X"]
    assert provider["params"]["outputsize"] == "3"


def test_library_outputsize_is_the_asked_number(provider):
    """`min(limit, 30)` كان يُرسل غير الموجب كما هو للمزوّد."""
    market.symbol_search("s", limit=market.MAX_SEARCH_RESULTS)
    assert provider["params"]["outputsize"] == str(market.MAX_SEARCH_RESULTS)


def calls_empty(calls: list) -> bool:
    return len(calls) == 0
