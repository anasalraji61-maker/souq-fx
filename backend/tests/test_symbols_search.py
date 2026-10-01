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
                for i in range(limit)], []

    monkeypatch.setattr(market, "configured", lambda: True)
    monkeypatch.setattr(market, "search_listings", _fake)
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
    assert res.json() == {"results": [], "ambiguous": []}
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


@pytest.mark.parametrize("limit", [1, 3, 8])
def test_library_fetches_every_listing_whatever_the_limit(provider, limit):
    """`outputsize` ثابت بحدّ المزوّد لا `limit` (كان `min(limit, 30)` يُرسل غير الموجب كما هو): بصفحة `limit`
    قد تقع بورصة SHEL الثانية خارجها فيبدو الرمز فريداً ويُرسم الإدراج الخطأ. الشريحة بعد التصنيف."""
    out = market.symbol_search("s", limit=limit)
    assert provider["params"]["outputsize"] == str(market._SEARCH_FETCH)
    assert len(out) == limit


def calls_empty(calls: list) -> bool:
    return len(calls) == 0


# ------------------------------------------- إدراج واحد لكل رمز يرسمه التطبيق

def _row(symbol: str, exchange: str, type_: str = "Common Stock", currency: str = "", name: str = "") -> dict:
    return {"symbol": symbol, "instrument_name": name or symbol, "exchange": exchange,
            "instrument_type": type_, "currency": currency}


# ردود المزوّد الحقيقية (`symbol_search`، 2026-09-25) مختصرة
SHEL = [
    _row("SHEL", "LSE", currency="GBp", name="Shell plc"),
    _row("SHEL", "NYSE", "American Depositary Receipt", "USD", "Shell plc ADS"),
    _row("SHEL", "BCBA", "Depositary Receipt", "ARS", "Shell plc CEDear"),
    _row("SHEL", "PSX", currency="PKR", name="Shell Pakistan Ltd."),
    _row("SHELL", "Euronext", currency="EUR", name="Shell plc"),
]
BTC_EUR = [_row("BTC/EUR", ex, "Digital Currency", name="Bitcoin Euro")
           for ex in ("Binance", "Coinbase Pro", "Kraken", "BitStamp")]


def _search(monkeypatch, rows: list[dict], limit: int = 20):
    sink: dict = {}
    monkeypatch.setattr(market, "_api_key", lambda: "test-key")
    monkeypatch.setattr(market.httpx, "Client", lambda **kw: _FakeClient(sink, {"data": rows}, **kw))
    return market.search_listings("q", limit=limit)


def test_ticker_on_several_exchanges_is_not_offered_as_a_chart(monkeypatch):
    """«SHEL · PSX» (شركة أخرى بالروبية) و«SHEL · LSE» (بالبنس) كانا يرسمان كلاهما ما يجيب به المزوّد
    لـ`SHEL` المجرّد — سعر أداة غير التي اختارها المتداول."""
    ok, ambiguous = _search(monkeypatch, SHEL)
    assert [(r["symbol"], r["exchange"]) for r in ok] == [("SHELL", "Euronext")]
    assert {r["exchange"] for r in ambiguous} == {"LSE", "NYSE", "BCBA", "PSX"}
    assert all(r["unavailable_reason"] == market.AMBIGUOUS_LISTING for r in ambiguous)


def test_quote_currency_travels_with_the_listing(monkeypatch):
    ok, ambiguous = _search(monkeypatch, SHEL)
    assert ok[0]["currency"] == "EUR"
    assert {r["currency"] for r in ambiguous if r["exchange"] == "LSE"} == {"GBp"}
    ok, _ = _search(monkeypatch, [_row("USD/TRY", "PHYSICAL CURRENCY", "Physical Currency")])
    assert ok[0]["currency"] is None, "العملات بلا عملة معلنة ⇒ None لا نصّ فارغ"


def test_crypto_listings_are_not_returned(monkeypatch):
    """لا عملات رقمية (قرار أنس، امتثال عراقي): «BTC/EUR» على أربع منصّات كان صفّاً قابلاً للرسم والتنبيه.
    الآن لا نتيجة ولا ملتبس — بنوع المزوّد «Digital Currency» أو بالاسم (سهم «BTCUSD» يرسم لا شيء آمناً)."""
    rows = BTC_EUR + [_row("ETH/BTC", "Binance", "Digital Currency"),
                      _row("BTCUSD", "OTC", "Common Stock", "USD", "Some BTCUSD stock"),
                      _row("EUR/USD", "PHYSICAL CURRENCY", "Physical Currency")]
    ok, ambiguous = _search(monkeypatch, rows)
    assert ambiguous == []
    assert [r["symbol"] for r in ok] == ["EURUSD"]


def test_mapped_symbol_keeps_only_the_instrument_the_chart_draws(monkeypatch):
    """`XAUUSD` مُسنَد لـ`XAU/USD`: سهمٌ اسمه «XAUUSD» يُرسم الذهب ⇒ ملتبس لا نتيجة."""
    rows = [_row("XAU/USD", "PHYSICAL CURRENCY", "Physical Currency"),
            _row("XAUUSD", "OTC", "Common Stock", "USD", "Some XAUUSD stock")]
    ok, ambiguous = _search(monkeypatch, rows)
    assert [(r["symbol"], r["td_symbol"]) for r in ok] == [("XAUUSD", "XAU/USD")]
    assert [r["td_symbol"] for r in ambiguous] == ["XAUUSD"]


def test_single_listing_and_physical_currency_pass_unchanged(monkeypatch):
    rows = [_row("USD/TRY", "PHYSICAL CURRENCY", "Physical Currency", name="US Dollar / Turkish Lira"),
            _row("EUR/USD", "PHYSICAL CURRENCY", "Physical Currency")]
    ok, ambiguous = _search(monkeypatch, rows)
    assert ambiguous == []
    assert [(r["symbol"], r["exchange"]) for r in ok] == [("USDTRY", "PHYSICAL CURRENCY"),
                                                          ("EURUSD", "PHYSICAL CURRENCY")]
    assert "exchanges" not in ok[0]


def test_symbols_colliding_after_slash_removal_are_ambiguous(monkeypatch):
    """«BRK/A» و«BRKA» يصيران الرمز نفسه للتطبيق — أيّهما يُرسم غير معروف."""
    rows = [_row("BRK/A", "NYSE"), _row("BRKA", "OTC", "ETF", "USD")]
    ok, ambiguous = _search(monkeypatch, rows)
    assert ok == [] and len(ambiguous) == 2


def test_limit_applies_after_dropping_crypto(monkeypatch):
    """صفوف الكريبتو المُسقطة لا تأكل من `limit`."""
    rows = BTC_EUR + [_row("EUR/USD", "PHYSICAL CURRENCY", "Physical Currency"),
                      _row("GBP/USD", "PHYSICAL CURRENCY", "Physical Currency")]
    ok, _ = _search(monkeypatch, rows, limit=2)
    assert [r["symbol"] for r in ok] == ["EURUSD", "GBPUSD"]


def test_route_returns_ambiguous_listings_apart(client, monkeypatch):
    monkeypatch.setattr(market, "configured", lambda: True)
    monkeypatch.setattr(market, "_api_key", lambda: "test-key")
    monkeypatch.setattr(market.httpx, "Client", lambda **kw: _FakeClient({}, {"data": SHEL}, **kw))
    body = client.get("/api/symbols/search?q=SHEL").json()
    assert [r["symbol"] for r in body["results"]] == ["SHELL"]
    assert len(body["ambiguous"]) == 4


def test_blank_query_has_both_lists(client):
    assert client.get("/api/symbols/search?q=%20").json() == {"results": [], "ambiguous": []}


def test_blank_query_returns_empty_results_not_index_error(monkeypatch):
    monkeypatch.setattr(market, "_api_key", lambda: "test-key")
    assert market.search_listings("   ") == ([], [])
    assert market.symbol_search("   ") == []


def test_provider_commodity_returns_under_its_mapped_name(monkeypatch):
    """«WTI/USD» كان يُعاد «WTIUSD» خارج الخريطة ⇒ يُطلب بلا «/» وشمعة W لا تُقصّ عند إغلاق الجمعة (run 54)."""
    rows = [_row("WTI/USD", "Commodity", "Commodity", name="Crude Oil WTI"),
            _row("XBR/USD", "Commodity", "Commodity", name="Brent Crude Oil")]
    ok, ambiguous = _search(monkeypatch, rows)
    assert ambiguous == []
    assert [(r["symbol"], r["td_symbol"]) for r in ok] == [("USOIL", "WTI/USD"), ("UKOIL", "XBR/USD")]
    assert market.td_symbol(ok[0]["symbol"]) == "WTI/USD"
    monday_w = 1789344000  # 2026-09-14 00:00 UTC (اثنين)
    assert market.bar_end(ok[0]["symbol"], monday_w, 7 * 86400) < monday_w + 7 * 86400
