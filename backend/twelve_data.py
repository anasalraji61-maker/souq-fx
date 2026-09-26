"""Twelve Data market feed for MATRIX charts (Grow / shared with robot)."""
from __future__ import annotations

import math
import os
import re
import time
from datetime import datetime, timedelta, timezone

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

_TD_TO_MATRIX: dict[str, str] = {v.upper(): k for k, v in SYMBOL_MAP.items() if v.replace("/", "") != k}

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
    # بالاسم القانوني كـ`td_symbol`: « DXY» (مسافة) كان يجتاز الحارس ويُطلب «DXY» من المزوّد (حدّ مشترك
    # مع الروبوت) بسبب `provider_unavailable` بدل `not_offered_by_provider`.
    return UNAVAILABLE_AT_PROVIDER.get(canonical_symbol(matrix_symbol))


# رموز تتداول بعطلة الأسبوع — لا إغلاق أسبوعي لها. الباقي بـ`SYMBOL_MAP` (فوركس، معادن، نفط) يُغلق
# الجمعة 17:00 نيويورك، وكذلك أزواج ISO من البحث. غيرها خارج الخريطة (أسهم…) مجهول الجلسة ⇒ لا قصّ.
WEEKEND_TRADED = frozenset({"BTCUSD", "ETHUSD"})
_DAY = 86400


def _nth_sunday(year: int, month: int, n: int) -> int:
    """يوم الشهر لأحد رقم n (1 = الأول)."""
    first = datetime(year, month, 1, tzinfo=timezone.utc).weekday()  # الاثنين 0 … الأحد 6
    return 1 + (6 - first) % 7 + 7 * (n - 1)


def _weekly_close_utc(friday: datetime) -> int:
    """الجمعة 17:00 نيويورك بثواني UTC — 21:00 بالتوقيت الصيفي الأمريكي (الأحد الثاني من مارس حتى
    الأحد الأول من نوفمبر)، وإلا 22:00. الجمعة لا تقع يوم تحويل الساعة، فالتاريخ وحده يكفي."""
    y = friday.year
    dst = (3, _nth_sunday(y, 3, 2)) <= (friday.month, friday.day) < (11, _nth_sunday(y, 11, 1))
    return int(friday.replace(hour=21 if dst else 22, minute=0, second=0, microsecond=0).timestamp())


def _has_weekly_session(sym: str) -> bool:
    """فوركس/معادن/نفط `SYMBOL_MAP` وأزواج ISO: تُغلق الجمعة 17:00 وتفتح الأحد 17:00 نيويورك."""
    return (sym in SYMBOL_MAP or _is_iso_pair(sym)) and sym not in WEEKEND_TRADED


def bar_end(matrix_symbol: str, open_ts: float, step: int) -> float:
    """نهاية شمعة فُتحت `open_ts` وطولها `step` ثانية: فتحها + طولها، **ولا تتجاوز إغلاق السوق الأسبوعي**.

    كانت فتحاً + طولاً وحده: شمعة W لليورو دولار مؤرّخة الاثنين «تنتهي» الاثنين التالي، والسوق أُغلق
    الجمعة 17:00 نيويورك ⇒ طوال العطلة تُعدّ جارية: تنبيه «تقاطع صاعد · W» أُنشئ السبت يُطلق فوراً على
    تقاطع الأسبوع الماضي كأنه للتوّ، وإغلاق الجمعة يُرسَل `price_as_of` «الآن» (حتى 45 ساعة خطأ). ونفسه
    لشمعة D/4H الجمعة بعد 21:00. العملات الرقمية تتداول بالعطلة فلا قصّ لها."""
    end = float(open_ts) + step
    sym = canonical_symbol(matrix_symbol)
    # زوج ISO من البحث (USDMXN، EURSEK، XAUEUR) يُطلب زوجَ فوركس (`td_symbol`) ويُغلق الجمعة كالرئيسية:
    # كان «مجهول الجلسة» فشمعة W تبقى «جارية» طوال العطلة ⇒ تنبيه تقاطع يُسلَّح السبت يُطلق على تقاطع
    # الأسبوع الماضي، و`price_as_of` لإغلاق الجمعة يُرسَل حتى ~51 ساعة لاحقاً.
    if not _has_weekly_session(sym):
        return end
    opened = datetime.fromtimestamp(float(open_ts), tz=timezone.utc)
    if step == _DAY:
        # شمعة D المؤرَّخة X عند المزوّد تغطّي X−1 ‏17:00 ⇒ X ‏17:00 نيويورك (مُتحقَّق حيّاً: افتتاح D ‏24-09 =
        # افتتاح 1H ‏23-09 21:00 UTC، وإغلاقها = إغلاق 1H ‏24-09 20:00) — فتحاً + يوماً كان X+1 00:00 UTC ⇒
        # الشمعة «جارية» 3 ساعات (2 شتاءً) بعد إغلاقها الحقيقي.
        end = min(end, _weekly_close_utc(opened))
    friday = opened + timedelta(days=(4 - opened.weekday()) % 7)
    close = _weekly_close_utc(friday)
    if close <= open_ts:  # فُتحت بعد إغلاق هذه الجمعة (نادر) ⇒ إغلاق الجمعة التالية
        close = _weekly_close_utc(friday + timedelta(days=7))
    return float(min(end, close))

def _weekly_open_utc(sunday: datetime) -> int:
    """الأحد 17:00 نيويورك بثواني UTC — يوم تحويل الساعة نفسه يأخذ الإزاحة الجديدة (التحويل 02:00)."""
    y = sunday.year
    dst = (3, _nth_sunday(y, 3, 2)) <= (sunday.month, sunday.day) < (11, _nth_sunday(y, 11, 1))
    return int(sunday.replace(hour=21 if dst else 22, minute=0, second=0, microsecond=0).timestamp())


# مفتاح للاختبارات فقط: اختبارات قديمة تبني اقتباسات EURUSD بوقت «الآن» فتسقط يوم السبت (`tests/conftest.py`).
WEEKEND_CLOSE_FILTER = True


def _session_now() -> float:
    """الساعة لفحص الجلسة حين لا يرسل المزوّد وقتاً (`/price`، تيك WS) — تُثبَّت بالاختبارات."""
    return time.time()


def in_weekend_close(matrix_symbol: str, open_ts: float, step: int) -> bool:
    """شمعة تقع كلّها بين إغلاق الجمعة 17:00 وافتتاح الأحد 17:00 نيويورك لرمز له جلسة أسبوعية.

    المزوّد يملأ العطلة كلّها شموعاً (السبت 2026-09-26: 284 شمعة 1m لليورو دولار بعد 21:00 UTC، والأحد كل دقيقة؛ سيولة
    ما بعد الإغلاق بلا وسيط تجزئة يُنفّذ عليها) ⇒ كانت تُعرض «آخر سعر» بوقت السبت، وتُطلق عليها التنبيهات
    ويحسب منها الاختبار الخلفي والمستويات — بينما `bar_end` نفسه يعدّ السوق مغلقاً. شمعة تعبر الافتتاح
    (4H شتاءً 20:00 الأحد) تبقى."""
    sym = canonical_symbol(matrix_symbol)
    if not WEEKEND_CLOSE_FILTER or not _has_weekly_session(sym):
        return False
    opened = datetime.fromtimestamp(float(open_ts), tz=timezone.utc)
    if step == _DAY:
        # شمعة D المؤرَّخة X عند المزوّد تغطّي X−1 ‏17:00 ⇒ X ‏17:00 نيويورك (افتتاح شمعة السبت 26-09 = افتتاح
        # 1m الجمعة 21:00 UTC) ⇒ شمعتا السبت والأحد عطلة كلّها (الأحد 20-09: مدى 20 نقطة من تداول العطلة).
        return opened.weekday() >= 5
    friday = opened - timedelta(days=(opened.weekday() - 4) % 7)
    close = _weekly_close_utc(friday)
    reopen = _weekly_open_utc(friday + timedelta(days=2))
    return close <= open_ts and open_ts + step <= reopen


TF_SECONDS: dict[str, int] = {
    "1m": 60, "5m": 300, "15m": 900, "30m": 1800, "1H": 3600, "4H": 14400, "D": 86400, "W": 604800,
}

def _weekend_allowance(matrix_symbol: str, tf: str, n: int) -> int:
    """شموع إضافية تُطلب لتعوّض ما يُسقطه `in_weekend_close`: المزوّد يملأ كل عطلة (~48 ساعة) لليورو دولار
    شموعاً ⇒ بلا هذا كان طلب 120 شمعة 15m صباح الاثنين يعود بـ16 فقط بعد الإسقاط. عطلة لكل 5 أيام تداول + واحدة."""
    step = TF_SECONDS.get(tf, 900)
    if step >= 7 * _DAY or not _has_weekly_session(canonical_symbol(matrix_symbol)):
        return 0
    weekends = n * step // (5 * _DAY) + 1
    return weekends * -(-49 * 3600 // step)


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


_APIKEY_PARAM = re.compile(r"(apikey=)[^&\s'\"]+", re.I)


def redact(text: str) -> str:
    """نصّ خطأ بلا المفتاح: `HTTPStatusError` يحمل الرابط كاملاً (`…&apikey=<المفتاح>`) وكان يصل
    العميل بـ502 البحث (مسار بلا دخول) وسجلّات الخادم وحالة الـWS العامة. المفتاح مشترك مع الروبوت."""
    key = _api_key()
    out = _APIKEY_PARAM.sub(r"\1***", str(text))
    return out.replace(key, "***") if key else out


# رموز ISO 4217 لعملات ومعادن يسعّرها المزوّد أزواجاً «AAA/BBB» (`Physical Currency`). البحث يعيد
# «USD/MXN» والتطبيق يحفظ «USDMXN» (بلا «/») — كان يُرسَل كذلك، لا بصيغة المزوّد المعلنة.
_ISO_CURRENCIES = frozenset(
    "USD EUR GBP JPY CHF CAD AUD NZD SEK NOK DKK PLN CZK HUF RON BGN TRY ZAR MXN BRL CLP COP PEN ARS "
    "CNY CNH HKD SGD TWD KRW INR IDR MYR PHP THB ILS SAR AED QAR KWD BHD OMR JOD EGP MAD KES NGN RUB "
    "ISK XAU XAG XPT XPD".split()
)


def _is_iso_pair(sym: str) -> bool:
    return len(sym) == 6 and sym[:3] in _ISO_CURRENCIES and sym[3:] in _ISO_CURRENCIES and sym[:3] != sym[3:]


def canonical_symbol(symbol: str) -> str:
    """اسم MATRIX للرمز: مقصوص ومكبَّر، و«EUR/USD» ⇒ «EURUSD»، واسم المزوّد «XBR/USD» ⇒ «UKOIL».

    كان «EUR/USD» يُمرَّر كما هو فيجلب شموع اليورو الحقيقية، لكن `bar_end` لا يعرفه (لا بالخريطة ولا
    زوج ISO) فلا يقصّ عند إغلاق الجمعة: شمعة W/D «جارية» طوال العطلة ⇒ تنبيه تقاطع يُسلَّح السبت يُطلق
    على تقاطع الأسبوع الماضي، و`price_as_of` بالماسح والتوقّع = وقت الجلب لا إغلاق الجمعة. رموز أخرى
    بشرطة (أسهم «BRK/A») تبقى كما هي."""
    sym = (symbol or "").strip().upper()
    if sym in _TD_TO_MATRIX:
        return _TD_TO_MATRIX[sym]
    if sym.count("/") == 1:
        joined = sym.replace("/", "")
        if joined in SYMBOL_MAP or _is_iso_pair(joined):
            return joined
    return sym


def td_symbol(matrix_symbol: str) -> str:
    sym = canonical_symbol(matrix_symbol)
    if sym in SYMBOL_MAP:
        return SYMBOL_MAP[sym]
    # زوج عملتين خارج الخريطة ⇒ صيغة المزوّد القانونية (كما يعيدها بحثه نفسه)
    if _is_iso_pair(sym):
        return f"{sym[:3]}/{sym[3:]}"
    return sym


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
    # سعر غير موجب أو شمعة مستحيلة (القمّة تحت القاع/الجسم) ليست سوقاً — كـ`_pos` بالاقتباس و`/ws/ticks`.
    # كانت تمرّ: `low=0` بشمعة 1m واحدة يُطلق **كل** تنبيه «تحت» على الرمز (`_price_hit` يقرأ الذيول)،
    # ويرسم الشارت انهياراً −100% ويدخل RSI/ATR والماسح والاختبار الخلفي كحركة حقيقية.
    if min(o, h, l, c) <= 0 or h < max(o, c, l) or l > min(o, c):
        return None
    # لا فوليوم مركزياً للفوركس: المزوّد لا يرسل الحقل، وكان يُملأ 0.0 ⇒ «لم يُتداول شيء» رقماً حقيقياً.
    # الغائب/غير الصالح None؛ الصفر الذي يرسله المزوّد فعلاً (دقيقة بلا تيك) يبقى صفراً.
    try:
        volume: float | None = float(row["volume"]) if row.get("volume") not in (None, "") else None
    except (TypeError, ValueError):
        volume = None
    if volume is not None and (not math.isfinite(volume) or volume < 0):
        volume = None
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


# أحجام الطلب من المزوّد. كان الكاش بمفتاح `outputsize` كما طُلب (50–5000) بلا إخلاء ⇒ `?outputsize=51`،
# `52`… كلٌّ طلبٌ جديد من الحدّ المشترك مع الروبوت، وكل ردّ يُحفظ للأبد. يُطلب الحجم الأعلى التالي ويُقصّ.
_SIZE_BUCKETS = (16, 50, 120, 180, 300, 500, 1000, 2000, 5000)


def _size_bucket(outputsize: int) -> int:
    n = max(1, min(int(outputsize), 5000))
    return next(b for b in _SIZE_BUCKETS if b >= n)


def fetch_time_series_with_meta(
    matrix_symbol: str, timeframe: str, outputsize: int = 120
) -> tuple[list[dict], dict]:
    """Candles + provenance: kind provider|cache, as_of unix, channel twelvedata. آخر `outputsize` شمعة."""
    n = max(1, min(int(outputsize), 5000))
    candles, meta = _fetch_bucket(matrix_symbol, timeframe, _size_bucket(n))
    return candles[-n:], meta


def _fetch_bucket(matrix_symbol: str, timeframe: str, outputsize: int) -> tuple[list[dict], dict]:
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
    # شمعة W من المزوّد لرمز له جلسة أسبوعية = شموع D من الاثنين حتى **الأحد** (مُتحقَّق حيّاً: W ‏24-08
    # لليورو دولار قاعها 1.14898 = قاع D الأحد 30-08، وقاع الاثنين–الجمعة 1.15781 — 88 نقطة من تداول
    # العطلة؛ وإغلاقها إغلاق الأحد لا الجمعة). تُبنى من شموع D بلا السبت والأحد (7 لكل أسبوع + أسبوع يُسقَط).
    weekly_from_daily = tf == "W" and _has_weekly_session(canonical_symbol(sym))
    if weekly_from_daily:
        interval = TF_MAP["D"]
    params = {
        "symbol": td_sym,
        "interval": interval,
        # `min(outputsize, 5000)` كان يمرّر غير الموجب كما هو للمزوّد (نفس عائلة عيب
        # `symbol_search`). كل نداء اليوم يمرّ بثابت أو بقيمة محصورة بـ`build_series`،
        # فهذا حارس مسارٍ مستقبليّ — ورفعُ الخطأ هنا لا يصلح: `build_series` يبتلعه فيُعرض
        # شارت تجريبي بدل رسالة.
        "outputsize": str(max(1, min(
            (outputsize + 1) * 7 if weekly_from_daily else outputsize + _weekend_allowance(sym, tf, outputsize),
            5000,
        ))),
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
            if not isinstance(data, dict):
                raise ValueError("time_series body is not an object")
    # ردّ 200 غير JSON (صفحة وسيط/صيانة) = `ValueError` لا `HTTPError`: كان يتخطّى الكاش الصالح (حتى 15د)
    # فيُعرض «المزوّد متعذّر» بشارت فارغ رغم شموع حقيقية محفوظة.
    except (httpx.HTTPError, ValueError) as exc:
        stale = _serve_stale(cache_key, now)
        if stale:
            candles, as_of = stale
            return candles, {"kind": "cache", "as_of": as_of, "channel": "twelvedata"}
        raise RuntimeError(redact(exc)) from None  # لا سلسلة: سجلّ `exc_info` كان يطبع الرابط بالمفتاح

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
    step = _DAY if weekly_from_daily else TF_SECONDS[tf]
    for row in data["values"] or []:
        candle = _candle(row)
        if candle is None:
            dropped += 1
            continue
        if in_weekend_close(sym, candle["time"], step):
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
    if weekly_from_daily:
        candles = _weeks_from_days(candles, drop_first=len(data["values"] or []) >= int(params["outputsize"]))
    _cache[cache_key] = (now, candles)
    return candles, {"kind": "provider", "as_of": now, "channel": "twelvedata"}


def _weeks_from_days(days: list[dict], drop_first: bool) -> list[dict]:
    """شموع W (مؤرَّخة الاثنين 00:00 UTC كالمزوّد) من شموع D للاثنين–الجمعة مرتّبة. `drop_first`: نافذة D
    امتلأت فأقدم أسبوع قد يبدأ منتصفه (افتتاح وقمّة وقاع ناقصة) ⇒ يُسقَط."""
    weeks: list[dict] = []
    for d in days:
        opened = datetime.fromtimestamp(float(d["time"]), tz=timezone.utc)
        monday = int((opened - timedelta(days=opened.weekday())).replace(hour=0, minute=0, second=0).timestamp())
        if weeks and weeks[-1]["time"] == monday:
            w = weeks[-1]
            w["high"] = max(w["high"], d["high"])
            w["low"] = min(w["low"], d["low"])
            w["close"] = d["close"]
            if d.get("volume") is not None:
                w["volume"] = (w["volume"] or 0) + d["volume"]
        else:
            weeks.append({**d, "time": monday})
    return weeks[1:] if drop_first else weeks


def fetch_time_series(matrix_symbol: str, timeframe: str, outputsize: int = 120) -> list[dict]:
    """Return candles oldest-first: {time, open, high, low, close, volume}."""
    candles, _meta = fetch_time_series_with_meta(matrix_symbol, timeframe, outputsize)
    return candles


def fetch_quote(matrix_symbol: str) -> float | None:
    book = fetch_quote_book(matrix_symbol)
    if not book:
        return None
    return book.get("price")


def _price_only(matrix_symbol: str, p: float) -> dict:
    """ردّ `/price` الاحتياطي: رقم بلا أي وقت (المزوّد لا يرسله) — قد يكون إغلاق الجمعة يوم السبت.
    `price_only` يقول ذلك صراحةً: التنبيهات تقبله (سعر قديم لا يقطع مستوى)، ومسار الاقتباس لا يُرسله
    للعميل بوقت «الآن»."""
    return {"price": p, "bid": None, "ask": None, "spread_source": None, "symbol": matrix_symbol.upper(),
            "price_only": True}


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
                p = _pos(r2.json().get("price"))
            return _price_only(matrix_symbol, p) if p and not in_weekend_close(matrix_symbol, _session_now(), 0) else None
        if r.status_code >= 400:
            r2 = client.get(f"{API_BASE}/price", params={"symbol": td_sym, "apikey": key})
            if r2.status_code != 200:
                return None
            p = _pos(r2.json().get("price"))
            return _price_only(matrix_symbol, p) if p and not in_weekend_close(matrix_symbol, _session_now(), 0) else None
        data = r.json()
    if data.get("status") == "error":
        return None
    price = _pos(data.get("close") or data.get("price"))
    if not price:
        return None
    quoted_at = _quote_time(data.get("last_quote_at"))
    # تيك العطلة (المزوّد يواصل بعد إغلاق الجمعة ويقول `is_market_open: true`) ليس سعراً قابلاً للتداول:
    # كان يُعرض «آخر سعر» بوقت السبت ويُطلق تنبيهات السعر ⇒ None، والمسار يعود لإغلاق الجمعة الحقيقي بوقته.
    if in_weekend_close(matrix_symbol, quoted_at if quoted_at is not None else _session_now(), 0):
        return None
    bid_f = _pos(data.get("bid"))
    ask_f = _pos(data.get("ask"))
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
        "quoted_at": quoted_at,
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
    """رقم منتهٍ أو None. `float("NaN")` كان يجتاز: bid/ask NaN يمرّ فحص `<= 0` و`bid > ask` (كلاهما
    False) فيُرسَل سبريد NaN موسوماً `provider`، وJSON الردّ يرفض NaN ⇒ 500 بدل «لا سعر»."""
    try:
        f = float(v) if v is not None else None
    except (TypeError, ValueError):
        return None
    return f if f is not None and math.isfinite(f) else None


def _pos(v: object) -> float | None:
    """سعر: موجب منتهٍ وإلا None."""
    f = _f(v)
    return f if f is not None and f > 0 else None


# حدّا بحث الرموز — معلنان هنا لأنهما **حدّا المزوّد**: `limit` يُرسَل `outputsize` ويُستعمل
# شريحةً على القائمة العائدة، و`query` يذهب حرفياً برابط الطلب. `main.symbols_search` يعلن
# القيمتين نفسيهما بـ`Query` فيصل المتداول 422 لا 502 — قاعدة واحدة بمكان واحد كـ
# `screener.MAX_SCAN_SYMBOLS`.
MAX_SEARCH_RESULTS = 30
MAX_SEARCH_QUERY = 64


def symbol_search(query: str, limit: int = 20) -> list[dict]:
    """النتائج القابلة للرسم وحدها — راجع `search_listings`."""
    return search_listings(query, limit)[0]


# صفوف يطلبها البحث من المزوّد (حدّه الأعلى لـ`symbol_search`) — لا يكلّف أكثر من طلب واحد، ويكشف كل
# بورصات الرمز الواحد: بـ`limit` وحده قد تسقط قائمة SHEL الثانية خارج الصفحة فيبدو الرمز فريداً.
_SEARCH_FETCH = 120
_CRYPTO_TYPE = "digital currency"
AMBIGUOUS_LISTING = "ambiguous_listing"


def _listings(rows: list[dict]) -> tuple[list[dict], list[dict]]:
    """(قابلة للرسم، ملتبسة). التطبيق يرسم **`symbol` وحده** (`/api/charts/{symbol}`) والمزوّد يجيبه بإدراجٍ
    واحد يختاره هو — AAPL ⇒ ناسداك بالدولار. كانت كل بورصة صفّاً مستقلاً: «AAPL · BMV» (≈6,032 بيزو)
    يرسم سهم ناسداك (≈341$)، و«SHEL · PSX» — **شركة أخرى** (Shell Pakistan، بالروبية) — يرسم إيصال
    شل البريطانية بنيويورك. سعر حقيقي لأداة غير التي اختارها المتداول = رقم مخترَع بالنسبة إليه.

    - رمز بإدراج واحد ⇒ كما هو.
    - زوج عملة رقمية واحد على عدّة منصّات (BTC/EUR: Binance، Kraken…) ⇒ صفّ واحد بلا منصّة
      (`exchange: ""`؛ المزوّد يختارها) ومعه `exchanges`. الفارق بين المنصّات أجزاء من المئة.
    - رمز بـ`SYMBOL_MAP` ⇒ صفّ الأداة المُسنَدة وحدها؛ ما سواه باسمها المجرّد (سهم «BTCUSD») ملتبس.
    - غير ذلك (سهم بعدّة بورصات/عملات، أو رمزان يتطابقان بعد حذف «/») ⇒ `ambiguous` بسببه، لا يُعرض
      للاختيار حتى يحمل الرمز بورصته (طلب للتطبيق بـCOORDINATION)."""
    groups: dict[str, list[dict]] = {}
    for row in rows:
        groups.setdefault(row["symbol"], []).append(row)
    ok: list[dict] = []
    ambiguous: list[dict] = []
    for sym, group in groups.items():
        mapped = SYMBOL_MAP.get(sym)
        if mapped is not None:
            mine = [r for r in group if r["td_symbol"].upper() == mapped]
            others = [r for r in group if r["td_symbol"].upper() != mapped]
            ambiguous += [{**r, "unavailable_reason": AMBIGUOUS_LISTING} for r in others]
            group = mine
            if not group:
                continue
        if len(group) == 1:
            ok.append(group[0])
        elif len({r["td_symbol"] for r in group}) == 1 and all(
            r["type"].strip().lower() == _CRYPTO_TYPE for r in group
        ):
            ok.append({**group[0], "exchange": "", "exchanges": [r["exchange"] for r in group]})
        elif mapped is not None and len({r["td_symbol"] for r in group}) == 1:
            # أداة الخريطة نفسها مكرّرة (نادر) — ما يُرسَم هو المُسنَد، فصفّ واحد بلا بورصة
            ok.append({**group[0], "exchange": "", "exchanges": [r["exchange"] for r in group]})
        else:
            ambiguous += [{**r, "unavailable_reason": AMBIGUOUS_LISTING} for r in group]
    return ok, ambiguous


def search_listings(query: str, limit: int = 20) -> tuple[list[dict], list[dict]]:
    """(نتائج يرسمها `symbol` كما تُعرض، نتائج ملتبسة لا تُرسم) — كلٌّ حتى `limit`."""
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
        return [], []  # كان `[]` خلاف النوع المعلَن ⇒ `symbol_search("   ")` = IndexError
    with httpx.Client(timeout=20.0) as client:
        r = client.get(
            f"{API_BASE}/symbol_search",
            params={"symbol": q, "outputsize": str(_SEARCH_FETCH), "apikey": key},
        )
        try:
            r.raise_for_status()
        except httpx.HTTPStatusError as exc:  # نصّه الرابط بالمفتاح ⇒ الرمز وحده
            raise RuntimeError(f"Twelve Data symbol_search HTTP {exc.response.status_code}") from None
        data = r.json()
    if data.get("status") == "error":
        raise RuntimeError(data.get("message", "search failed"))
    out: list[dict] = []
    for row in data.get("data") or []:
        if not isinstance(row, dict):
            continue
        sym = str(row.get("symbol") or "").strip()
        if not sym:
            continue
        out.append(
            {
                # رمز للمزوّد له اسم بالخريطة (WTI/USD ⇒ USOIL، XBR/USD ⇒ UKOIL) يُعاد بذلك الاسم: «WTIUSD»
                # خارج الخريطة كان يُطلب بلا «/» ولا يُقصّ عند إغلاق الجمعة (شمعة W «جارية» طوال العطلة)
                "symbol": _TD_TO_MATRIX.get(sym.upper()) or sym.replace("/", "").upper(),
                "td_symbol": sym,
                "name": row.get("instrument_name") or row.get("name") or sym,
                "exchange": row.get("exchange") or row.get("mic_code") or "",
                "type": row.get("instrument_type") or row.get("type") or "",
                # عملة التسعير كما يعلنها المزوّد (LSE بالبنس `GBp`) — None حين لا يرسلها (العملات والكريبتو)
                "currency": row.get("currency") or None,
            }
        )
    ok, ambiguous = _listings(out)
    return ok[:limit], ambiguous[:limit]


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
