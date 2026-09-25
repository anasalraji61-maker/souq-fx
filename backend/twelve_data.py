"""Twelve Data market feed for MATRIX charts (Grow / shared with robot)."""
from __future__ import annotations

import math
import os
import time
from datetime import datetime, timezone

import httpx

API_BASE = "https://api.twelvedata.com"

SYMBOL_MAP: dict[str, str] = {
    "EURUSD": "EUR/USD",
    "GBPUSD": "GBP/USD",
    "USDJPY": "USD/JPY",
    "AUDUSD": "AUD/USD",
    "USDCAD": "USD/CAD",
    "NZDUSD": "NZD/USD",
    "USDCHF": "USD/CHF",
    "EURJPY": "EUR/JPY",
    "GBPJPY": "GBP/JPY",
    "EURGBP": "EUR/GBP",
    "AUDJPY": "AUD/JPY",
    "EURAUD": "EUR/AUD",
    "EURCHF": "EUR/CHF",
    "CADJPY": "CAD/JPY",
    "XAUUSD": "XAU/USD",
    "XAGUSD": "XAG/USD",
    "USOIL": "WTI/USD",
    # برنت عند Twelve Data اسمه `XBR/USD` (قائمة /commodities). `BRENT/USD` لا يوجد ⇒ كان كل طلب
    # يفشل فيُعرض برنت بسلسلة تجريبية دائماً.
    "UKOIL": "XBR/USD",
    "BTCUSD": "BTC/USD",
    "ETHUSD": "ETH/USD",
}

# رموز يعرضها التطبيق لكن **لا يقدّمها المزوّد**. DXY كان مُسنداً لـ`DX-Y.NYB` (رمز Yahoo) ولا
# مؤشر دولار بقائمة Twelve Data (/indices) ⇒ كل طلب يفشل ويُستهلك من الحدّ المشترك ثم تُعرض
# سلسلة مختلَقة. الآن لا طلب أصلاً، والسبب يُعاد صراحةً للعميل.
UNAVAILABLE_AT_PROVIDER: dict[str, str] = {
    "DXY": "not_offered_by_provider",
}


class SymbolUnavailable(RuntimeError):
    """الرمز غير متاح عند المزوّد — `reason` يُعاد للعميل كما هو."""

    def __init__(self, symbol: str, reason: str):
        super().__init__(f"{symbol} unavailable at provider: {reason}")
        self.symbol = symbol
        self.reason = reason


def unavailable_reason(matrix_symbol: str) -> str | None:
    return UNAVAILABLE_AT_PROVIDER.get((matrix_symbol or "").upper())

TF_MAP: dict[str, str] = {
    "1m": "1min",
    "5m": "5min",
    "15m": "15min",
    "30m": "30min",
    "1H": "1h",
    "4H": "4h",
    "D": "1day",
    "W": "1week",
}

_CACHE_MODE = (os.getenv("TWELVE_DATA_CACHE_MODE") or "shared").strip().lower()

_CACHE_SHARED: dict[str, int] = {
    "1m": 45,
    "5m": 60,
    "15m": 90,
    "30m": 120,
    "1H": 180,
    "4H": 300,
    "D": 600,
    "W": 900,
}

_CACHE_FRESH: dict[str, int] = {
    "1m": 15,
    "5m": 25,
    "15m": 35,
    "30m": 45,
    "1H": 60,
    "4H": 90,
    "D": 180,
    "W": 300,
}

CACHE_TTL = _CACHE_FRESH if _CACHE_MODE == "fresh" else _CACHE_SHARED
# Serve stale up to 15 min when robot consumes quota (429)
STALE_MAX_SEC = int(os.getenv("TWELVE_DATA_STALE_MAX", "900"))

_cache: dict[str, tuple[float, list[dict]]] = {}

# طول السلسلة الموحَّد للشارت (build_series) والماسح وتنبيهات المؤشر بالـworker. مفتاح الكاش يشمل الطول،
# فكان الماسح (80) والـworker (80) والشارت/فحص التنبيهات من التطبيق (180) يجلبون نفس (رمز، فريم) كلٌّ
# بطلب منفصل — والمزوّد يحسب طلباً لكل رمز مهما كان الطول. طول واحد = طلب واحد يخدم الجميع ضمن الـTTL،
# ونفس الشموع للمؤشر بالخادم والعميل (RSI/MACD على 80 شمعة ≠ على 180).
CHART_BARS = 180
_stats: dict[str, int | float | None] = {
    "api_calls": 0,
    "cache_hits": 0,
    "stale_served": 0,
    "rate_limited": 0,
    "last_rate_limit_at": None,
    # صفوف أسقطها `_candle` لعدم صلاحيتها — تُقرأ بـ/api/market/status كبقيّة صحّة المزوّد.
    # ارتفاعها المفاجئ = خلل بالمصدر لا بالتطبيق، وكان يظهر قبلها «شارت تجريبي» بلا سبب ظاهر.
    "rows_dropped": 0,
}


def _api_key() -> str:
    return (os.getenv("TWELVE_DATA_API_KEY") or os.getenv("TWELVEDATA_API_KEY") or "").strip()


def configured() -> bool:
    return bool(_api_key())


def td_symbol(matrix_symbol: str) -> str:
    return SYMBOL_MAP.get(matrix_symbol.upper(), matrix_symbol.upper())


def _parse_ts(dt_str: str) -> int | None:
    """ثواني UTC، أو `None` إن لم يُقرأ الوقت.

    كان يُعيد `int(time.time())` أي **الآن**: شمعة بوقت غير مقروء تُدَسّ عند الحافة اليمنى
    للشارت — بعد `candles.sort` تصير **آخر شمعة**، أي «آخر ما جرى بالسوق» بعين المتداول،
    وهي صفٌّ لم يُعرف وقته أصلاً. الصفّ يُسقَط الآن بدل أن يُخترع له وقت."""
    dt_str = (dt_str or "").strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(dt_str, fmt).replace(tzinfo=timezone.utc)
            return int(dt.timestamp())
        except ValueError:
            continue
    return None


def _candle(row: object) -> dict | None:
    """شمعة واحدة من صفّ المزوّد، أو `None` إن كان الصفّ غير صالح.

    **العيب**: الصفّ كان يُبنى مباشرةً (`float(row["open"])` …) داخل حلقة بلا حارس، فـ**قيمة
    `null` واحدة** — يرسلها المزوّد بالعطلات وأعطاله العابرة — ترمي `TypeError` من
    `fetch_time_series_with_meta` كلّها. و`build_series` يلتقط كل استثناء بـ
    `except Exception: pass` ثم يبني **سلسلة بذرية عشوائية**: مُثبَت بالسندبوكس أن 59 شمعة
    حقيقية تُلقى ويُعرض مكانها مسار مولَّد بـ180 شمعة و«سعر» مخترَع (`kind="demo"`).
    أي أن صفّاً واحداً معطوباً كان يحوّل شارت المتداول كلّه إلى بيانات غير حقيقية.

    والصفّ غير الصالح يُسقَط وحده الآن فتبقى بقيّة الشموع حقيقية وموسومةً `provider`.
    و`NaN`/`inf` يجتازان `float()` ولا يقبلهما JSON قياسياً — يُسقطان كالمفقود.
    """
    if not isinstance(row, dict):
        return None
    ts = _parse_ts(str(row.get("datetime") or ""))
    if ts is None:
        return None
    try:
        o, h, l, c = (float(row[k]) for k in ("open", "high", "low", "close"))
    except (TypeError, ValueError, KeyError):
        return None
    if not all(math.isfinite(v) for v in (o, h, l, c)):
        return None
    try:
        volume = float(row.get("volume") or 0)
    except (TypeError, ValueError):
        volume = 0.0
    if not math.isfinite(volume):
        volume = 0.0
    return {"time": ts, "open": o, "high": h, "low": l, "close": c, "volume": volume}


def _serve_stale(cache_key: str, now: float) -> tuple[list[dict], float] | None:
    hit = _cache.get(cache_key)
    if not hit:
        return None
    age = now - hit[0]
    if age <= STALE_MAX_SEC:
        _stats["stale_served"] = int(_stats["stale_served"] or 0) + 1
        return hit[1], hit[0]
    return None


def fetch_time_series_with_meta(
    matrix_symbol: str, timeframe: str, outputsize: int = 120
) -> tuple[list[dict], dict]:
    """Candles + provenance: kind provider|cache, as_of unix, channel twelvedata."""
    key = _api_key()
    if not key:
        raise RuntimeError("TWELVE_DATA_API_KEY missing")

    sym = matrix_symbol.upper()
    why = unavailable_reason(sym)
    if why:
        raise SymbolUnavailable(sym, why)
    tf = timeframe if timeframe in TF_MAP else "15m"
    cache_key = f"{sym}|{tf}|{outputsize}"
    ttl = CACHE_TTL.get(tf, 90)
    now = time.time()
    hit = _cache.get(cache_key)
    if hit and now - hit[0] < ttl:
        _stats["cache_hits"] = int(_stats["cache_hits"] or 0) + 1
        return hit[1], {"kind": "cache", "as_of": hit[0], "channel": "twelvedata"}

    td_sym = td_symbol(sym)
    interval = TF_MAP[tf]
    params = {
        "symbol": td_sym,
        "interval": interval,
        # `min(outputsize, 5000)` كان يمرّر غير الموجب كما هو للمزوّد (نفس عائلة عيب
        # `symbol_search`). كل نداء اليوم يمرّ بثابت أو بقيمة محصورة بـ`build_series`،
        # فهذا حارس مسارٍ مستقبليّ — ورفعُ الخطأ هنا لا يصلح: `build_series` يبتلعه فيُعرض
        # شارت تجريبي بدل رسالة.
        "outputsize": str(max(1, min(outputsize, 5000))),
        "apikey": key,
        "timezone": "UTC",
        "order": "ASC",
    }
    try:
        with httpx.Client(timeout=25.0) as client:
            r = client.get(f"{API_BASE}/time_series", params=params)
            if r.status_code == 429:
                _stats["rate_limited"] = int(_stats["rate_limited"] or 0) + 1
                _stats["last_rate_limit_at"] = now
                stale = _serve_stale(cache_key, now)
                if stale:
                    candles, as_of = stale
                    return candles, {"kind": "cache", "as_of": as_of, "channel": "twelvedata"}
                raise RuntimeError("Twelve Data rate limit — robot may be using quota")
            r.raise_for_status()
            data = r.json()
    except httpx.HTTPError as exc:
        stale = _serve_stale(cache_key, now)
        if stale:
            candles, as_of = stale
            return candles, {"kind": "cache", "as_of": as_of, "channel": "twelvedata"}
        raise RuntimeError(str(exc)) from exc

    _stats["api_calls"] = int(_stats["api_calls"] or 0) + 1

    if data.get("status") == "error" or "values" not in data:
        msg = data.get("message") or data.get("code") or str(data)[:200]
        stale = _serve_stale(cache_key, now)
        if stale:
            candles, as_of = stale
            return candles, {"kind": "cache", "as_of": as_of, "channel": "twelvedata"}
        raise RuntimeError(f"Twelve Data: {msg}")

    candles: list[dict] = []
    dropped = 0
    for row in data["values"] or []:
        candle = _candle(row)
        if candle is None:
            dropped += 1
            continue
        candles.append(candle)
    if dropped:
        _stats["rows_dropped"] = int(_stats["rows_dropped"] or 0) + dropped

    # ولا صفّ صالح: يُعامَل كردّ خطأ من المزوّد — قديمٌ حقيقي إن وُجد، وإلا خطأ صريح. ولا
    # تُخزَّن القائمة الفارغة: كانت ستُعاد من الكاش طوال الـTTL فيبقى العطل العابر ربع ساعة.
    if not candles:
        stale = _serve_stale(cache_key, now)
        if stale:
            cached, as_of = stale
            return cached, {"kind": "cache", "as_of": as_of, "channel": "twelvedata"}
        raise RuntimeError("Twelve Data: no usable candles in response")

    candles.sort(key=lambda c: c["time"])
    _cache[cache_key] = (now, candles)
    return candles, {"kind": "provider", "as_of": now, "channel": "twelvedata"}


def fetch_time_series(matrix_symbol: str, timeframe: str, outputsize: int = 120) -> list[dict]:
    """Return candles oldest-first: {time, open, high, low, close, volume}."""
    candles, _meta = fetch_time_series_with_meta(matrix_symbol, timeframe, outputsize)
    return candles


def fetch_quote(matrix_symbol: str) -> float | None:
    book = fetch_quote_book(matrix_symbol)
    if not book:
        return None
    return book.get("price")


def fetch_quote_book(matrix_symbol: str) -> dict | None:
    """Price + bid/ask when Twelve Data quote endpoint provides them."""
    key = _api_key()
    if not key or unavailable_reason(matrix_symbol):
        return None
    td_sym = td_symbol(matrix_symbol.upper())
    with httpx.Client(timeout=15.0) as client:
        r = client.get(f"{API_BASE}/quote", params={"symbol": td_sym, "apikey": key})
        if r.status_code == 429:
            _stats["rate_limited"] = int(_stats["rate_limited"] or 0) + 1
            # fallback to /price
            p = None
            r2 = client.get(f"{API_BASE}/price", params={"symbol": td_sym, "apikey": key})
            if r2.status_code == 200:
                try:
                    p = float(r2.json().get("price"))
                except (TypeError, ValueError):
                    p = None
            return {"price": p, "bid": None, "ask": None, "spread_source": None, "symbol": matrix_symbol.upper()} if p else None
        if r.status_code >= 400:
            r2 = client.get(f"{API_BASE}/price", params={"symbol": td_sym, "apikey": key})
            if r2.status_code != 200:
                return None
            try:
                p = float(r2.json()["price"])
            except (KeyError, TypeError, ValueError):
                return None
            return {"price": p, "bid": None, "ask": None, "spread_source": None, "symbol": matrix_symbol.upper()}
        data = r.json()
    if data.get("status") == "error":
        return None
    try:
        price = float(data.get("close") or data.get("price") or 0)
    except (TypeError, ValueError):
        return None
    if not price:
        return None
    bid = data.get("bid")
    ask = data.get("ask")
    try:
        bid_f = float(bid) if bid is not None else None
    except (TypeError, ValueError):
        bid_f = None
    try:
        ask_f = float(ask) if ask is not None else None
    except (TypeError, ValueError):
        ask_f = None
    # لا Bid/Ask إلا من المزوّد نفسه. كان هنا سبريد مختلَق (السعر × 0.00008) يُرسَل موسوماً
    # `data_kind: provider` فيقرأه المتداول سبريداً حقيقياً ويُزيح أسعار الدفتر به. طرفٌ واحد
    # أو قيمة غير موجبة أو bid > ask = لا دفتر صالح ⇒ كلاهما None والعميل يُخفي السطر.
    if bid_f is None or ask_f is None or bid_f <= 0 or ask_f <= 0 or bid_f > ask_f:
        bid_f = ask_f = None
    return {
        "symbol": matrix_symbol.upper(),
        "price": price,
        "bid": bid_f,
        "ask": ask_f,
        # من أين جاء Bid/Ask: `provider` = من المزوّد، None = غير متاح (لا تقدير أبداً).
        "spread_source": "provider" if bid_f is not None else None,
        "open": _f(data.get("open")),
        "high": _f(data.get("high")),
        "low": _f(data.get("low")),
        "percent_change": _f(data.get("percent_change")),
        # وقت السعر نفسه من المزوّد (آخر شمعة دقيقة)، لا لحظة جلبه: بعطلة نهاية الأسبوع كان إغلاق الجمعة
        # يُعاد `as_of` = «الآن» فتقرؤه الحاسبة/الدفتر سعراً حيّاً. None حين لا يرسله (المسار يقرّر).
        "quoted_at": _quote_time(data.get("last_quote_at")),
        # السوق مفتوح/مغلق كما يقوله المزوّد — None حين لا يقول (لا تخمين من الساعة)
        "market_open": data.get("is_market_open") if isinstance(data.get("is_market_open"), bool) else None,
    }


def _quote_time(v: object) -> float | None:
    """ثوانٍ UTC موجبة ومنطقية (ليست بالمستقبل بأكثر من دقيقة) — وإلا None."""
    t = _f(v)
    if t is None or not math.isfinite(t) or t <= 1e9 or t > time.time() + 60:
        return None
    return t


def _f(v: object) -> float | None:
    try:
        return float(v) if v is not None else None
    except (TypeError, ValueError):
        return None


# حدّا بحث الرموز — معلنان هنا لأنهما **حدّا المزوّد**: `limit` يُرسَل `outputsize` ويُستعمل
# شريحةً على القائمة العائدة، و`query` يذهب حرفياً برابط الطلب. `main.symbols_search` يعلن
# القيمتين نفسيهما بـ`Query` فيصل المتداول 422 لا 502 — قاعدة واحدة بمكان واحد كـ
# `screener.MAX_SCAN_SYMBOLS`.
MAX_SEARCH_RESULTS = 30
MAX_SEARCH_QUERY = 64


def symbol_search(query: str, limit: int = 20) -> list[dict]:
    key = _api_key()
    if not key:
        raise RuntimeError("TWELVE_DATA_API_KEY missing")
    # `min(limit, 30)` كان يمرّر غير الموجب كما هو، و`out[:limit]` بالنهاية **شريحة سالبة
    # تحذف من الذيل**: `limit=-5` يُسقط آخر خمس نتائج بصمت و`limit=0` يُفرغ القائمة كلّها —
    # بعد أن صُرف طلب المزوّد من الحدّ المشترك. حارسٌ لأي مسار مستقبليّ؛ المسار الوحيد اليوم
    # (`/api/symbols/search`) يعلن القاعدة نفسها فلا يبلغه غير موجب أصلاً.
    if not (1 <= limit <= MAX_SEARCH_RESULTS):
        raise ValueError(f"limit must be between 1 and {MAX_SEARCH_RESULTS}")
    if len(query) > MAX_SEARCH_QUERY:
        raise ValueError(f"query must be at most {MAX_SEARCH_QUERY} characters")
    q = query.strip()
    if len(q) < 1:
        return []
    with httpx.Client(timeout=20.0) as client:
        r = client.get(
            f"{API_BASE}/symbol_search",
            params={"symbol": q, "outputsize": str(limit), "apikey": key},
        )
        r.raise_for_status()
        data = r.json()
    if data.get("status") == "error":
        raise RuntimeError(data.get("message", "search failed"))
    out: list[dict] = []
    for row in data.get("data") or []:
        sym = row.get("symbol") or ""
        out.append(
            {
                "symbol": sym.replace("/", ""),
                "td_symbol": sym,
                "name": row.get("instrument_name") or row.get("name") or sym,
                "exchange": row.get("exchange") or row.get("mic_code") or "",
                "type": row.get("instrument_type") or row.get("type") or "",
            }
        )
    return out[:limit]


def status() -> dict:
    return {
        "configured": configured(),
        "provider": "twelvedata.com",
        "plan_hint": "Grow ($29) — ~55 credits/min shared with trading robot",
        "cache_mode": _CACHE_MODE,
        "cache_entries": len(_cache),
        "symbols": list(SYMBOL_MAP.keys()),
        "symbols_count": len(SYMBOL_MAP),
        "stats": {k: v for k, v in _stats.items()},
        "matrix_policy": {
            "terminal_poll_sec": 90,
            "pause_poll_when_focus_chart": True,
            "serve_stale_on_429": True,
            "stale_max_sec": STALE_MAX_SEC,
        },
        "note": "MATRIX stays light so the robot keeps Twelve Data headroom",
    }
