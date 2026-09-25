"""حدود مسارَي الفحص السريع والاختبار الخلفي — نفس القاعدة التي يعلنها تنبيه المؤشر.

**لماذا هذا الملف**: `/api/screener/run` و`/api/backtest` كانا **بلا اختبار واحد** رغم أنهما
المسارين الوحيدين اللذين يأخذان فترتَي متوسط من المتداول ويمرّرانهما لـ`indicators.sma` مباشرة.
و`IndicatorAlertCreate` يعلن قاعدة الفترة منذ تشغيل سابق بينما هذان المساران خارجها:

- **فترة 0 كانت 500 حقيقياً** بالمسارين (قسمة على صفر بـ`sma`، خارج أي `try`) — رقمٌ كتبه
  المتداول بخانة يراه «خطأ خادم».
- فترة سالبة تُقبل بـ200 وتعطي خطّاً مسطّحاً (‎-0.0‎) لا يتقاطع أبداً = «لا نتائج» كاذبة.
- فريم مجهول يُبدَّل بـ15m صامتاً بينما النتيجة تُعاد موسومةً بالفريم المكتوب.
- معرّف فلتر مجهول = قائمة فارغة صامتة تُقرأ «لا تطابق».
- `symbols` بلا سقف: 400 رمز = 400 طلب متسلسل للمزوّد بمفتاح مشترك بين كل المستخدمين.
- `rsi_low >= rsi_high` يعطي «أداء استراتيجية» هو ناتج عتبتين متناقضتين.

**بلا شبكة**: المزوّد مُستبدَل بشموع مبنيّة بالذاكرة (`_candles`)، ولا `with TestClient` فلا
دورة حياة ولا عامل خلفي.
"""
from __future__ import annotations

import time

import pytest
from fastapi.testclient import TestClient

import db
import main
import screener as screener_engine
import twelve_data as market
from core import db_conn


def _candles(n: int = 200) -> list[dict]:
    """شموع مصطنعة تتذبذب فعلاً (فتتقاطع المتوسطات) — لا مسار عشوائي، فالنتيجة قابلة للإعادة."""
    out: list[dict] = []
    price = 1.1000
    for i in range(n):
        price += 0.0004 if (i // 7) % 2 == 0 else -0.0003
        out.append(
            {
                "time": 1_700_000_000 + i * 900,
                "open": price,
                "high": price + 0.0005,
                "low": price - 0.0005,
                "close": price,
                "volume": 100,
            }
        )
    return out


@pytest.fixture()
def client(tmp_path, monkeypatch):
    path = tmp_path / "test_scan.db"
    assert "souq-fx" not in str(path), f"قاعدة الاختبار يجب أن تكون خارج المستودع: {path}"
    monkeypatch.setattr(db_conn, "DB_PATH", path)
    monkeypatch.setattr(db, "DB_PATH", path)
    monkeypatch.setattr(db, "_PBKDF2_ITERATIONS", 1_000)
    db.init_db()
    monkeypatch.setattr(
        market, "fetch_time_series", lambda sym, tf, outputsize=180: _candles()
    )
    monkeypatch.setattr(
        market, "fetch_time_series_with_meta",
        lambda sym, tf, outputsize=180: (_candles(), {"kind": "provider", "as_of": time.time()}),
    )
    # raise_server_exceptions=False: الـ500 يصل كردّ حقيقي بدل أن يُرمى — وهو ما يُرصد هنا.
    return TestClient(main.app, raise_server_exceptions=False)


# ---------------------------------------------------------------- الفحص السريع


@pytest.mark.parametrize("tf,age,fresh", [("1m", 600, False), ("15m", 600, True), ("15m", 1200, False), ("1H", 900, True)])
def test_scan_stale_cache_counts_as_not_scanned(client, monkeypatch, tf, age, fresh):
    """كاش أقدم من شمعة من الفريم (عند 429 يُخدَم حتى 15د) لا يُعرض تقاطعاً/RSI «الآن»: كان الرمز يُطابق
    `ma_cross_up` على 1m من سلسلة عمرها 10 دقائق. الآن يُعدّ ضمن `failed` كرمز لم يُقرأ."""
    as_of = time.time() - age
    monkeypatch.setattr(
        market, "fetch_time_series_with_meta",
        lambda sym, tf_, outputsize=180: (_candles(), {"kind": "cache", "as_of": as_of}),
    )
    r = client.post(
        "/api/screener/run",
        json={"symbols": ["EURUSD"], "timeframe": tf, "filters": ["bullish", "bearish"]},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    if fresh:
        assert body["scanned"] == 1 and body["failed"] == [] and body["count"] == 1
    else:
        assert body["scanned"] == 0 and body["failed"] == ["EURUSD"] and body["results"] == []


def test_scan_with_valid_body_still_works(client):
    """الحارس المعاكس: بلا هذا الاختبار قد تمرّ حدودٌ ترفض **كل** طلب."""
    r = client.post(
        "/api/screener/run",
        json={"symbols": ["EURUSD", "GBPUSD"], "timeframe": "15m", "filters": ["bullish", "bearish"]},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["total"] == 2 and body["scanned"] == 2 and body["failed"] == []
    assert body["count"] == len(body["results"])
    for hit in body["results"]:
        assert hit["symbol"] in ("EURUSD", "GBPUSD")
        assert hit["filters_matched"], "نتيجة بلا فلتر مطابق لا معنى لها"


@pytest.mark.parametrize("bad", [0, -5, main.MAX_MA_PERIOD + 1])
def test_scan_impossible_period_is_422_not_500(client, bad):
    """0 كانت **500** فعلياً (قسمة على صفر)، والسالبة والأطول من السلسلة كانتا 200 بلا نتائج."""
    r = client.post("/api/screener/run", json={"symbols": ["EURUSD"], "fast": bad})
    assert r.status_code == 422, r.text
    assert "fast" in r.text


@pytest.mark.parametrize("period", [main.MIN_MA_PERIOD, 2, main.MAX_MA_PERIOD])
def test_scan_edge_but_usable_periods_pass(client, period):
    """الحدّ يرصد المستحيل لا الصغير: فترة 1 و179 فترتان حقيقيتان تمرّان كما هما."""
    r = client.post(
        "/api/screener/run",
        json={"symbols": ["EURUSD"], "fast": period, "slow": period + 1 if period < main.MAX_MA_PERIOD else period - 1},
    )
    assert r.status_code == 200, r.text


def test_scan_equal_periods_rejected_only_for_cross_filters(client):
    """خطّان بنفس الفترة خطّ واحد: تقاطعه بنفسه مستحيل — وفلاتر RSI لا تستعمل الفترتين أصلاً."""
    cross = client.post(
        "/api/screener/run", json={"symbols": ["EURUSD"], "fast": 9, "slow": 9, "filters": ["ma_cross_up"]}
    )
    assert cross.status_code == 422, cross.text
    rsi = client.post(
        "/api/screener/run", json={"symbols": ["EURUSD"], "fast": 9, "slow": 9, "filters": ["rsi_oversold"]}
    )
    assert rsi.status_code == 200, rsi.text


def test_scan_unknown_filter_is_422_not_silent_empty(client):
    r = client.post("/api/screener/run", json={"symbols": ["EURUSD"], "filters": ["rsi_oversold_typo"]})
    assert r.status_code == 422, r.text
    assert "rsi_oversold_typo" in r.text


def test_scan_accepts_every_published_filter_id(client):
    """كل معرّف يعلنه `/api/screener/filters` مقبول فعلاً بالفحص — وإلا رفض الخادمُ زرَّه نفسه."""
    published = [f["id"] for f in client.get("/api/screener/filters").json()["filters"]]
    assert sorted(published) == sorted(screener_engine.FILTER_IDS), "قائمة الأزرار انحرفت عن القائمة المفهومة"
    r = client.post("/api/screener/run", json={"symbols": ["EURUSD"], "filters": published})
    assert r.status_code == 200, r.text


def test_scan_symbol_list_is_capped(client):
    """400 رمز = 400 طلب متسلسل للمزوّد بمفتاح مشترك — كانت تُقبل كما هي (`total: 400`)."""
    over = screener_engine.MAX_SCAN_SYMBOLS + 1
    r = client.post("/api/screener/run", json={"symbols": ["EURUSD"] * over})
    assert r.status_code == 422, r.text
    at_cap = client.post(
        "/api/screener/run", json={"symbols": ["EURUSD"] * screener_engine.MAX_SCAN_SYMBOLS}
    )
    assert at_cap.status_code == 200, at_cap.text


def test_scan_default_symbol_set_fits_under_the_cap(client):
    """السقف لا يمنع فحص خريطة الرموز كاملةً — وإلا كان حدّاً يكسر استعمالاً قائماً."""
    assert len(screener_engine.DEFAULT_SYMBOLS) <= screener_engine.MAX_SCAN_SYMBOLS


@pytest.mark.parametrize("body", [{"symbols": []}, {"filters": []}])
def test_scan_empty_list_is_422_not_silent_default(client, body):
    """`filters or [...]` كانت تستبدل الفارغ بالافتراضي فيرى المتداول نتائج فلترٍ لم يختره."""
    r = client.post("/api/screener/run", json={"symbols": ["EURUSD"], **body})
    assert r.status_code == 422, r.text


def test_scan_absurd_symbol_string_rejected(client):
    r = client.post("/api/screener/run", json={"symbols": ["E" * 300]})
    assert r.status_code == 422, r.text


def test_scan_unknown_timeframe_is_422_not_silently_15m(client):
    r = client.post("/api/screener/run", json={"symbols": ["EURUSD"], "timeframe": "1h"})
    assert r.status_code == 422, r.text
    ok = client.post("/api/screener/run", json={"symbols": ["EURUSD"], "timeframe": "1H"})
    assert ok.status_code == 200, ok.text


@pytest.mark.parametrize("tf", sorted(main.TF_SECONDS))
def test_scan_accepts_every_supported_timeframe(client, tf):
    """كل فريم يعرضه الشارت مقبول بالفحص — الحدّ يطابق الفريمات القائمة لا قائمةً جديدة."""
    r = client.post("/api/screener/run", json={"symbols": ["EURUSD"], "timeframe": tf})
    assert r.status_code == 200, r.text


# ------------------------------------------------------------ الاختبار الخلفي


def test_backtest_with_valid_body_still_works(client):
    r = client.post("/api/backtest", json={"symbol": "EURUSD", "timeframe": "15m", "strategy": "ma_cross"})
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["symbol"] == "EURUSD" and body["timeframe"] == "15m"
    assert "stats" in body and "equity_curve" in body


@pytest.mark.parametrize("bad", [0, -5, main.MAX_MA_PERIOD + 1])
def test_backtest_impossible_period_is_422_not_500(client, bad):
    r = client.post("/api/backtest", json={"symbol": "EURUSD", "slow": bad})
    assert r.status_code == 422, r.text
    assert "slow" in r.text


def test_backtest_equal_periods_rejected_only_for_ma_cross(client):
    same = {"symbol": "EURUSD", "fast": 9, "slow": 9}
    assert client.post("/api/backtest", json={**same, "strategy": "ma_cross"}).status_code == 422
    assert client.post("/api/backtest", json={**same, "strategy": "rsi_reversal"}).status_code == 200


def test_backtest_inverted_rsi_thresholds_are_422(client):
    """90/10 كانت تُقبل وتُخرج «نسبة نجاح» لصفقة ناتجة عن شرطٍ يتحقّق على كل شمعة."""
    r = client.post(
        "/api/backtest", json={"symbol": "EURUSD", "strategy": "rsi_reversal", "rsi_low": 90, "rsi_high": 10}
    )
    assert r.status_code == 422, r.text


@pytest.mark.parametrize("thresholds", [{"rsi_low": 0}, {"rsi_high": 100}, {"rsi_low": -20}, {"rsi_high": 140}])
def test_backtest_unreachable_rsi_threshold_is_422(client, thresholds):
    """RSI محصور 0–100: عتبة خارجه لا تُلمس أبداً = «الاستراتيجية بلا إشارات» وهي عتبة مستحيلة."""
    r = client.post("/api/backtest", json={"symbol": "EURUSD", "strategy": "rsi_reversal", **thresholds})
    assert r.status_code == 422, r.text


def test_backtest_narrow_but_real_rsi_band_passes(client):
    """الحدّ يرصد المستحيل لا الضيّق: 45/55 نطاقٌ يستعمله متداول فعلاً."""
    r = client.post(
        "/api/backtest", json={"symbol": "EURUSD", "strategy": "rsi_reversal", "rsi_low": 45, "rsi_high": 55}
    )
    assert r.status_code == 200, r.text


def test_backtest_unknown_timeframe_is_422_not_silently_15m(client):
    """النتيجة تُعاد موسومةً بالفريم المكتوب، فالإبدال الصامت = نتيجة 15m يقرؤها المتداول ساعةً."""
    r = client.post("/api/backtest", json={"symbol": "EURUSD", "timeframe": "1h"})
    assert r.status_code == 422, r.text


def test_backtest_absurd_symbol_string_rejected(client):
    r = client.post("/api/backtest", json={"symbol": "E" * 300})
    assert r.status_code == 422, r.text


def test_indicator_alert_period_rule_unchanged(client):
    """القاعدة انتقلت لدالّة مشتركة — هذا يثبت أن تنبيه المؤشر ما زال يطبّقها بنفس الرسالة."""
    r = client.post(
        "/api/indicator-alerts",
        json={"symbol": "EURUSD", "alert_type": "ma_cross", "condition": "cross_up", "fast_period": 0},
    )
    assert r.status_code == 422, r.text
    assert "fast_period" in r.text


@pytest.mark.parametrize("symbol,included", [("EURUSD", True), ("GOLD", True), ("USOIL", True), ("BTCUSD", False)])
def test_backtest_says_whether_costs_are_included(client, monkeypatch, symbol, included):
    monkeypatch.setattr(market, "configured", lambda: True)
    monkeypatch.setattr(
        market, "fetch_time_series_with_meta",
        lambda sym, tf, outputsize=180: (_candles(), {"kind": "provider"}),
    )
    stats = client.post("/api/backtest", json={"symbol": symbol, "strategy": "ma_cross"}).json()["stats"]
    assert stats, "fixture candles must produce trades"
    assert stats["costs_included"] is included
    assert (stats["spread_pips"] is not None) is included


def test_filters_route_publishes_the_rule_the_scan_applies(client, monkeypatch):
    """QA54 (d): الوصف كان «(<30)» والفحص `<=` — RSI = 30 بالضبط يطابق. الآن الوصف آلي من الثوابت
    نفسها، ويُتحقَّق هنا بتشغيل الفحص على الحدّ نفسه."""
    filters = {f["id"]: f for f in client.get("/api/screener/filters").json()["filters"]}
    assert all("label" not in f for f in filters.values()), "لا نصّ بشري بلغة واحدة من الخادم"
    over = filters["rsi_oversold"]["rule"]
    assert over == {"indicator": "rsi", "period": 14, "op": "<=", "value": 30.0}
    assert filters["rsi_overbought"]["rule"]["op"] == ">="
    assert filters["ma_cross_up"]["rule"]["indicator"] == "sma_cross"  # snapshot يستعمل sma لا ema
    assert filters["bullish"]["rule"]["change_bars"] == screener_engine.CHANGE_WINDOW

    candles = [{"time": i, "open": 1.0, "high": 1.0, "low": 1.0, "close": 1.0} for i in range(100)]
    monkeypatch.setattr(
        screener_engine.market, "fetch_time_series_with_meta", lambda *a, **k: (candles, {"kind": "provider", "as_of": time.time()})
    )
    monkeypatch.setattr(
        screener_engine.ind, "snapshot",
        lambda raw, **k: {"rsi": over["value"], "last": 1.0},
    )
    scan = screener_engine.run_scan_detailed("15m", ["rsi_oversold"], ["EURUSD"])
    assert [h["filters_matched"] for h in scan["results"]] == [["rsi_oversold"]], scan


def test_scan_hit_says_it_was_served_from_a_stale_cache(monkeypatch):
    """حدّ المزوّد: السلسلة من الكاش (حتى 15د). كانت النتيجة بلا وسم فيُقرأ RSI/التقاطع «الآن»."""
    candles = [{"time": i, "open": 1.0, "high": 1.0, "low": 1.0, "close": 1.0} for i in range(100)]
    as_of = time.time() - 300  # كاش عمره 5د على 15m: أحدث من شمعة ⇒ يُعرض موسوماً (الأقدم «لم يُفحص»)
    monkeypatch.setattr(
        screener_engine.market, "fetch_time_series_with_meta",
        lambda *a, **k: (candles, {"kind": "cache", "as_of": as_of, "channel": "twelvedata"}),
    )
    monkeypatch.setattr(screener_engine.ind, "snapshot", lambda raw, **k: {"rsi": 20.0, "last": 1.0})
    hit = screener_engine.run_scan_detailed("15m", ["rsi_oversold"], ["EURUSD"])["results"][0]
    assert hit["data_kind"] == "cache" and hit["as_of"] == as_of


def test_scan_hit_carries_the_last_candle_close_not_the_fetch_time(monkeypatch):
    """السبت: السلسلة تُجلب طازجة (تجتاز فحص القِدم) وآخر شمعة إغلاق الجمعة. `as_of` وحده = وقت الجلب
    ⇒ تقاطع الجمعة يُقرأ «الآن». `price_as_of` = إغلاق آخر شمعة كالتوقّع والمساعد."""
    now = time.time()
    friday_open = now - 36 * 3600
    candles = [{"time": friday_open - (99 - i) * 900, "open": 1.0, "high": 1.0, "low": 1.0, "close": 1.0}
               for i in range(100)]
    monkeypatch.setattr(
        screener_engine.market, "fetch_time_series_with_meta",
        lambda *a, **k: (candles, {"kind": "provider", "as_of": now}),
    )
    monkeypatch.setattr(screener_engine.ind, "snapshot", lambda raw, **k: {"rsi": 20.0, "last": 1.0})
    hit = screener_engine.run_scan_detailed("15m", ["rsi_oversold"], ["EURUSD"])["results"][0]
    assert hit["as_of"] == now
    assert hit["price_as_of"] == pytest.approx(friday_open + 900)


def test_scan_price_as_of_never_later_than_the_fetch():
    # شمعة جارية (لم تُغلق) ⇒ نهايتها بعد الجلب ⇒ السعر «حتى لحظة الجلب»
    assert screener_engine._price_as_of([{"time": 1000}], "1H", 1500.0) == 1500.0
    assert screener_engine._price_as_of([], "1H", None) is None
