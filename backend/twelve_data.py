"""Twelve Data market feed for MATRIX charts (Grow / shared with robot)."""
from __future__ import annotations

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
    "UKOIL": "BRENT/USD",
    "BTCUSD": "BTC/USD",
    "ETHUSD": "ETH/USD",
    "DXY": "DX-Y.NYB",
}

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
}


def _api_key() -> str:
    return (os.getenv("TWELVE_DATA_API_KEY") or os.getenv("TWELVEDATA_API_KEY") or "").strip()


def configured() -> bool:
    return bool(_api_key())


def td_symbol(matrix_symbol: str) -> str:
    return SYMBOL_MAP.get(matrix_symbol.upper(), matrix_symbol.upper())


def _parse_ts(dt_str: str) -> int:
    dt_str = dt_str.strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(dt_str, fmt).replace(tzinfo=timezone.utc)
            return int(dt.timestamp())
        except ValueError:
            continue
    return int(time.time())


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
        "outputsize": str(min(outputsize, 5000)),
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
    for row in data["values"]:
        candles.append(
            {
                "time": _parse_ts(row["datetime"]),
                "open": float(row["open"]),
                "high": float(row["high"]),
                "low": float(row["low"]),
                "close": float(row["close"]),
                "volume": float(row.get("volume") or 0),
            }
        )

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
    if not key:
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
            return {"price": p, "bid": None, "ask": None, "symbol": matrix_symbol.upper()} if p else None
        if r.status_code >= 400:
            r2 = client.get(f"{API_BASE}/price", params={"symbol": td_sym, "apikey": key})
            if r2.status_code != 200:
                return None
            try:
                p = float(r2.json()["price"])
            except (KeyError, TypeError, ValueError):
                return None
            return {"price": p, "bid": None, "ask": None, "symbol": matrix_symbol.upper()}
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
    if bid_f is None and ask_f is None:
        # synthetic spread from typical FX pip when L2 absent
        spread = price * 0.00008
        bid_f = price - spread / 2
        ask_f = price + spread / 2
    return {
        "symbol": matrix_symbol.upper(),
        "price": price,
        "bid": bid_f,
        "ask": ask_f,
        "open": _f(data.get("open")),
        "high": _f(data.get("high")),
        "low": _f(data.get("low")),
        "percent_change": _f(data.get("percent_change")),
    }


def _f(v: object) -> float | None:
    try:
        return float(v) if v is not None else None
    except (TypeError, ValueError):
        return None


def symbol_search(query: str, limit: int = 20) -> list[dict]:
    key = _api_key()
    if not key:
        raise RuntimeError("TWELVE_DATA_API_KEY missing")
    q = query.strip()
    if len(q) < 1:
        return []
    with httpx.Client(timeout=20.0) as client:
        r = client.get(
            f"{API_BASE}/symbol_search",
            params={"symbol": q, "outputsize": str(min(limit, 30)), "apikey": key},
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
