"""Twelve Data market feed for MATRIX charts (Grow / shared with robot)."""
from __future__ import annotations

import json
import math
import os
import re
import sqlite3
import threading
import time
import unicodedata
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx

from core import db_conn

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
    # لا عملات رقمية (BTCUSD/ETHUSD أُزيلا): قرار أنس — امتثال لتنظيمات العراق المالية (`fa3fe80`،
    # README، `.agents/agent-4-backend.md` «Strictly zero crypto symbols»). انظر `is_crypto`.
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


# MATRIX لا يعرض عملات رقمية إطلاقاً (قرار أنس، انظر `SYMBOL_MAP`). كان BTCUSD/ETHUSD بالخريطة وبالماسح،
# والبحث يعيد أزواج «Digital Currency» قابلة للرسم والتنبيه. الآن لا طلب للمزوّد ولا سعر، والسبب صريح.
CRYPTO_NOT_SUPPORTED = "crypto_not_supported"
_CRYPTO_ASSETS = frozenset(
    "BTC XBT ETH XRP SOL LTC BCH DOGE ADA BNB DOT TRX AVAX LINK MATIC POL SHIB XLM XMR ETC USDT USDC "
    "DAI BUSD TON ATOM UNI PEPE NEAR APT ARB OP SUI FIL ICP HBAR ALGO AAVE".split()
)
_CRYPTO_TYPE = "digital currency"


def is_crypto(matrix_symbol: str) -> bool:
    """زوج طرفه الأول عملة رقمية معروفة والثاني عملة (ISO أو رقمية): «BTCUSD»، «BTC/EUR»، «ETHBTC»،
    «BTCUSDT». رمز مجرّد («SOL»، «OP») قد يكون سهماً فلا يُعدّ — البحث يُسقط ما يعلنه المزوّد رقمياً."""
    sym = canonical_symbol(matrix_symbol)
    quotes = _ISO_CURRENCIES | _CRYPTO_ASSETS
    if sym.count("/") == 1:
        base, quote = sym.split("/")
        return base in _CRYPTO_ASSETS and quote in quotes
    return any(sym.startswith(a) and sym[len(a):] in quotes for a in _CRYPTO_ASSETS)


def unavailable_reason(matrix_symbol: str) -> str | None:
    # بالاسم القانوني كـ`td_symbol`: « DXY» (مسافة) كان يجتاز الحارس ويُطلب «DXY» من المزوّد (حدّ مشترك
    # مع الروبوت) بسبب `provider_unavailable` بدل `not_offered_by_provider`.
    if is_crypto(matrix_symbol):
        return CRYPTO_NOT_SUPPORTED
    return UNAVAILABLE_AT_PROVIDER.get(canonical_symbol(matrix_symbol))


# بـ`SYMBOL_MAP` (فوركس، معادن، نفط) وأزواج ISO من البحث: إغلاق الجمعة 17:00 نيويورك. غيرها خارج
# الخريطة (أسهم…) مجهول الجلسة ⇒ لا قصّ.
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
    return sym in SYMBOL_MAP or _is_iso_pair(sym)


# جلسة عطلة الفوركس (كالتطبيق `marketHours.ts` `isForexHolidaySession`): 25 ديسمبر و1 يناير، الجلسة من 17:00
# نيويورك عشيّتها حتى 17:00 يومها. كان الخادم يعدّها جلسة عادية والتطبيق مغلقة ⇒ تيك/شمعة العطلة من المزوّد
# تُعرض «آخر سعر» بوقت العطلة وتُطلق التنبيهات، وفي أسبوع جمعته عطلة تبقى شمعة W «جارية» حتى الجمعة فيدخلها
# اقتباس العطلة إغلاقاً وقمّة للأسبوع — والتطبيق يعدّ الأسبوع مغلقاً منذ الخميس 17:00.
_HOLIDAYS = frozenset({(12, 25), (1, 1)})


def _is_holiday(day: datetime) -> bool:
    """يوم تداول (الاثنين–الجمعة) جلسته عطلة — عطلة تقع السبت/الأحد تغطّيها العطلة الأسبوعية."""
    return (day.month, day.day) in _HOLIDAYS and day.weekday() < 5


def _holiday_session(ts: float) -> tuple[int, int] | None:
    """(بداية، نهاية) جلسة العطلة التي تقع فيها `ts` بثواني UTC، وإلا None. الجلسة تُسمّى باليوم الذي تنتهي فيه."""
    d = datetime.fromtimestamp(float(ts), tz=timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    for day in (d, d + timedelta(days=1)):
        if not _is_holiday(day):
            continue
        start, end = _weekly_close_utc(day - timedelta(days=1)), _weekly_close_utc(day)
        if start <= ts < end:
            return start, end
    return None


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
    else:
        # شمعة تعبر بداية جلسة عطلة وسط الأسبوع (4H ‏20:00 UTC يوم 24 ديسمبر، والعطلة من 22:00) تنتهي عندها — كإغلاق
        # الجمعة وكالتطبيق `forexNextCloseSec`. كانت «جارية» حتى 00:00 ⇒ إغلاقها تيك عطلة، ويُنسخ لـW/D
        # (`_with_newest_close`) بوقت الجلب داخل العطلة.
        holiday = _holiday_session(end - 1)
        if holiday and open_ts < holiday[0] < end:
            end = float(holiday[0])
        # شمعة تنتهي داخل الكسر اليومي (أو عند نهايته) تُغلق فعلياً ببدايته — كالتطبيق `iceBreakStartForCloseSec`:
        # 4H برنت 20:00 UTC الثلاثاء شتاءً كانت «جارية» حتى 00:00 والسوق مغلق من 23:00 لندن ⇒ ساعة (ساعتان صيفاً)
        # يُسلَّح فيها تنبيه على شمعة منتهية، ويعدّها الاختبار الخلفي والماسح غير مغلقة.
        brk = _daily_break(sym, end - 1)
        if brk and open_ts < brk[0] < end:
            end = float(brk[0])
    friday = opened + timedelta(days=(4 - opened.weekday()) % 7)
    close = _week_close(friday)
    if close <= open_ts:  # فُتحت بعد إغلاق هذه الجمعة (نادر) ⇒ إغلاق الجمعة التالية
        close = _week_close(friday + timedelta(days=7))
    return float(min(end, close))


def _week_close(friday: datetime) -> int:
    """إغلاق أسبوع الجمعة هذه: الخميس 17:00 نيويورك إن كانت الجمعة عطلة (25 ديسمبر/1 يناير)."""
    return _weekly_close_utc(friday - timedelta(days=1) if _is_holiday(friday) else friday)


def _week_reopen(friday: datetime, sym: str) -> int:
    """افتتاح ما بعد عطلة أسبوع الجمعة هذه: الأحد (`_weekly_open_utc`)، أو الاثنين 17:00 نيويورك إن كان الاثنين
    عطلة (25 ديسمبر/1 يناير 2028) — كانت شموع الأحد قبل جلسة العطلة تُعدّ مفتوحة، والكاش يُجلب من جديد الأحد."""
    reopen = _weekly_open_utc(friday + timedelta(days=2), sym)
    monday = friday + timedelta(days=3)
    return max(reopen, _weekly_close_utc(monday)) if _is_holiday(monday) else reopen

# المعادن وWTI تفتح الأحد 18:00 نيويورك (CME Globex) وبرنت 23:00 لندن (ICE) — لا 17:00 كالفوركس (كالتطبيق:
# `marketHours.ts` `nextForexOpenSec`). كانت كلها تُعدّ مفتوحة من 17:00 ⇒ شموع ملء العطلة من المزوّد لتلك
# الساعة تمرّ «أسعاراً حيّة» للذهب والنفط: تُطلق عليها التنبيهات وتُعرض آخر سعر.
def _last_sunday(year: int, month: int) -> int:
    nxt = datetime(year + month // 12, month % 12 + 1, 1, tzinfo=timezone.utc)
    last = nxt - timedelta(days=1)
    return last.day - (last.weekday() + 1) % 7


def _weekly_open_utc(sunday: datetime, sym: str = "") -> int:
    """الأحد 17:00 نيويورك بثواني UTC (18:00 للمعادن وWTI، 23:00 لندن لبرنت) — يوم تحويل الساعة نفسه يأخذ
    الإزاحة الجديدة (التحويل فجراً)."""
    y = sunday.year
    if sym == "UKOIL":
        bst = (3, _last_sunday(y, 3)) <= (sunday.month, sunday.day) < (10, _last_sunday(y, 10))
        hour = 22 if bst else 23
    else:
        dst = (3, _nth_sunday(y, 3, 2)) <= (sunday.month, sunday.day) < (11, _nth_sunday(y, 11, 1))
        cme = sym == "USOIL" or sym[:3] in ("XAU", "XAG", "XPT", "XPD")
        hour = (21 if dst else 22) + (1 if cme else 0)
    return int(sunday.replace(hour=hour, minute=0, second=0, microsecond=0).timestamp())


# الكسر اليومي (كالتطبيق `marketHours.ts` `inMetalsDailyBreak`/`inIceDailyBreak`): المعادن وWTI (CME) 17:00–18:00
# نيويورك، وبرنت (ICE) 23:00–01:00 لندن، ليالي الاثنين–الخميس (الجمعة إغلاق أسبوعي والأحد افتتاح). التطبيق يعدّ
# السوق مغلقاً فيه ولا يرسم له خانات شموع، والخادم كان يعدّه جلسة ⇒ شمعة/اقتباس/تيك يملأ به المزوّد الساعة
# كان يُعرض «آخر سعر» حيّاً ويُطلق التنبيهات، و`market_open: true` بجانب «مغلق» بالتطبيق.
def _break_len(sym: str) -> int:
    if sym == "UKOIL":
        return 2 * 3600
    return 3600 if sym == "USOIL" or sym[:3] in ("XAU", "XAG", "XPT", "XPD") else 0


def _break_start(day: datetime, sym: str) -> int:
    """بداية كسر يوم `day` (منتصف ليل UTC): 17:00 نيويورك، أو 23:00 لندن لبرنت. الاثنين–الخميس لا تحويل ساعة."""
    if sym == "UKOIL":
        y = day.year
        bst = (3, _last_sunday(y, 3)) <= (day.month, day.day) < (10, _last_sunday(y, 10))
        return int(day.replace(hour=22 if bst else 23).timestamp())
    return _weekly_close_utc(day)


def _daily_break(sym: str, ts: float) -> tuple[int, int] | None:
    """(بداية، نهاية) الكسر اليومي الذي تقع فيه `ts` لرمز قانوني، وإلا None."""
    length = _break_len(sym)
    if not length:
        return None
    d = datetime.fromtimestamp(float(ts), tz=timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    for day in (d, d - timedelta(days=1)):
        if day.weekday() > 3:  # يبدأ الكسر الاثنين–الخميس فقط
            continue
        start = _break_start(day, sym)
        if start <= ts < start + length:
            return start, start + length
    return None


# مفتاح للاختبارات فقط: اختبارات قديمة تبني اقتباسات EURUSD بوقت «الآن» فتسقط يوم السبت (`tests/conftest.py`).
WEEKEND_CLOSE_FILTER = True


def _session_now() -> float:
    """الساعة لفحص الجلسة حين لا يرسل المزوّد وقتاً (`/price`، تيك WS) — تُثبَّت بالاختبارات."""
    return time.time()


def in_weekend_close(matrix_symbol: str, open_ts: float, step: int) -> bool:
    """شمعة تقع كلّها بين إغلاق الجمعة 17:00 وافتتاح الأحد 17:00 نيويورك لرمز له جلسة أسبوعية — أو داخل جلسة
    عطلة، أو داخل الكسر اليومي للمعادن/النفط (`_daily_break`).

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
        # شمعة D المؤرَّخة 25 ديسمبر/1 يناير = جلسة العطلة كلّها
        return opened.weekday() >= 5 or _is_holiday(opened)
    holiday = _holiday_session(open_ts)
    if holiday and open_ts + step <= holiday[1]:
        return True
    brk = _daily_break(sym, open_ts)
    if brk and open_ts + step <= brk[1]:
        return True
    friday = opened - timedelta(days=(opened.weekday() - 4) % 7)
    close = _week_close(friday)
    reopen = _week_reopen(friday, sym)
    # لحظة (step=0: اقتباس/تيك/الساعة) عند الافتتاح نفسه = السوق مفتوح. كانت `<=` تُسقطها ⇒ `last_quote_at`
    # (بداية شمعة 1m) يساوي الافتتاح طوال الدقيقة الأولى فيُرفض اقتباس حقيقي كل أسبوع و`market_open` خطأ.
    if not step:
        return close <= open_ts < reopen
    return close <= open_ts and open_ts + step <= reopen


def _closed_window(matrix_symbol: str, ts: float) -> tuple[float, float] | None:
    """(بداية، نهاية) الفترة المغلقة (عطلة أسبوعية، جلسة عطلة، كسر يومي) التي تقع فيها `ts`، وإلا None."""
    sym = canonical_symbol(matrix_symbol)
    if not WEEKEND_CLOSE_FILTER or not _has_weekly_session(sym):
        return None
    window = _holiday_session(ts) or _daily_break(sym, ts)
    if window:
        return float(window[0]), float(window[1])
    d = datetime.fromtimestamp(float(ts), tz=timezone.utc)
    friday = (d - timedelta(days=(d.weekday() - 4) % 7)).replace(hour=0, minute=0, second=0, microsecond=0)
    close, reopen = _week_close(friday), _week_reopen(friday, sym)
    return (float(close), float(reopen)) if close <= ts < reopen else None


def _filler_tail(matrix_symbol: str, open_ts: float, step: int, fetched_at: float) -> bool:
    """آخر تيك في شمعة جُلبت `fetched_at` (قبل نهايتها الخام إن كانت جارية) يقع داخل فترة مغلقة ⇒ إغلاقها ملء
    المزوّد لتلك الفترة لا سعر تداول. النهاية الخام (فتح + طول) لا المقصوصة بـ`bar_end`: 4H ذهب 20:00 جُلبت 22:30
    داخل الكسر تنتهي «22:00» بـ`bar_end` وإغلاقها تيك 22:29. D/W بـ`bar_end` (D مؤرَّخة بتاريخ إغلاقها)."""
    end = bar_end(matrix_symbol, open_ts, step) if step >= _DAY else float(open_ts) + step
    return _closed_window(matrix_symbol, min(float(fetched_at), end) - 1e-3) is not None


# أطول كسر يومي (برنت ساعتان): فترة مغلقة أقصر من هذا كسرٌ داخل الجلسة لا عطلة.
_SHORT_BREAK = 3 * 3600

# مهلة بعد إغلاق الجمعة قبل أن تُعدّ شموع الجلب نهائية (آخر دقائق الجمعة قد تصل من المزوّد متأخرة).
_CLOSE_SETTLE = 300


def _closed_until(matrix_symbol: str, fetched_at: float) -> float | None:
    """افتتاح الأحد إن جُلبت الشموع والسوق مغلق (بعد إغلاق الجمعة + `_CLOSE_SETTLE`)، وإلا None.

    شموع رمز بجلسة أسبوعية جُلبت بعد إغلاق الجمعة لا تتغيّر حتى الافتتاح (شموع العطلة تُسقَط) ⇒ تبقى
    صالحة حتى الافتتاح بدل TTL الفريم. W1: قائمة المتابعة تطلب شمعة D لكل رمز (16) — كل 10 دقائق طوال
    العطلة من حدّ الروبوت المشترك، وأيّ 429 بعد 15 دقيقة من الجلب كان يعيد الصفّ «—». `as_of` يبقى وقت
    الجلب الحقيقي."""
    sym = canonical_symbol(matrix_symbol)
    if not WEEKEND_CLOSE_FILTER or not _has_weekly_session(sym):
        return None
    d = datetime.fromtimestamp(float(fetched_at), tz=timezone.utc)
    holiday = _holiday_session(fetched_at)
    if holiday and holiday[0] + _CLOSE_SETTLE <= fetched_at:
        ends = datetime.fromtimestamp(holiday[1], tz=timezone.utc)
        if ends.weekday() != 4:  # عطلة وسط الأسبوع (أو الاثنين) ⇒ السوق يعود بنهاية الجلسة
            return float(holiday[1])
        # جمعة عطلة ⇒ مغلق حتى افتتاح الأحد
        return float(_week_reopen(ends.replace(hour=0, minute=0, second=0), sym))
    friday = (d - timedelta(days=(d.weekday() - 4) % 7)).replace(hour=0, minute=0, second=0, microsecond=0)
    close = _week_close(friday)
    reopen = _week_reopen(friday, sym)
    return float(reopen) if close + _CLOSE_SETTLE <= fetched_at < reopen else None


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
    # والكسر اليومي (`_daily_break`) لكل يوم تداول تغطّيه النافذة
    breaks = (n * step // _DAY + 1) * -(-brk // step) if (brk := _break_len(canonical_symbol(matrix_symbol))) and step < _DAY else 0
    return weekends * -(-49 * 3600 // step) + breaks


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

# نسخة على القرص من `_cache` (كتابة مع كل تخزين، وقراءة كسولة لكل مفتاح بعد الإقلاع). كان الكاش بالذاكرة
# وحدها ⇒ كل إعادة تشغيل للخادم تمحوه، فتطلب قائمة المتابعة 16 شمعة D دفعة واحدة من الحدّ المشترك مع الروبوت
# (8/دقيقة بالخطة المجانية) ⇒ نصف الصفوف 429 بلا كاش ⇒ «—»/«غير متاح» بجانب إغلاق الجمعة الحقيقي. يوم السبت
# كانت كل إعادة نشر تفرغ القائمة. قواعد الخدمة لم تتغيّر: المدخل المحمَّل يُخدم بقواعد الذاكرة نفسها (TTL،
# `_closed_until`، 15 دقيقة عند 429) و`as_of` = وقت جلبه الحقيقي — لا يُقدَّم قديمٌ أقدم مما كانت الذاكرة تقدّمه.
# `None` = معطّل (الاختبارات، `tests/conftest.py`). بجانب `matrix.db` ⇒ على القرص الدائم نفسه بالنشر.
_ENV_CANDLE_DISK = (os.getenv("MATRIX_CANDLE_CACHE_PATH") or "").strip()
CANDLE_DISK: Path | None = (
    Path(_ENV_CANDLE_DISK).expanduser() if _ENV_CANDLE_DISK else db_conn.DB_PATH.with_name("candle_cache.db")
)
_disk_checked: set[str] = set()
# الجدول باسم نسخة: تغيير بمعالجة الشموع (فلتر العطلة، بناء W من D، `_candle`) لا يصل لسلسلة محفوظة قبله —
# كانت تُحمَّل بعد النشر وتبقى. رفع الرقم مع أيّ تغيير كهذا ⇒ النشر يبدأ بقرص فارغ ويُجلب من المزوّد.
_DISK_TABLE = "candles_v7"

# وقت آخر جلب **كامل** لكل مدخل (بحجمه هو). الدمج يُبقي شموع المدخل الأكبر الأقدم ويختم المدخل «الآن» ⇒ القائمة
# (D/50 كل 90ث) كانت تُبقي أول ~130 شمعة من D/180 بلا جلب أبداً (والقرص يحفظها عبر إعادة التشغيل) — تصحيح
# المزوّد للتاريخ لا يصل. بعد `MERGE_MAX_AGE_SEC` من الجلب الكامل لا دمج: يُحذف فيُجلب كاملاً عند طلبه.
_base_at: dict[str, float] = {}
MERGE_MAX_AGE_SEC = 86400


def _disk_conn() -> sqlite3.Connection | None:
    if CANDLE_DISK is None:
        return None
    CANDLE_DISK.parent.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(str(CANDLE_DISK), timeout=5)
    con.execute(
        f"CREATE TABLE IF NOT EXISTS {_DISK_TABLE} "
        "(key TEXT PRIMARY KEY, fetched_at REAL NOT NULL, base_at REAL NOT NULL, body TEXT NOT NULL)"
    )
    return con


def _disk_write(key: str, entry: tuple[float, list[dict]] | None) -> None:
    """عطل القرص لا يُسقط الجلب: الذاكرة تبقى المصدر، والقرص احتياط لما بعد الإقلاع فقط."""
    try:
        con = _disk_conn()
        if con is None:
            return
        with con:
            if entry is None:
                con.execute(f"DELETE FROM {_DISK_TABLE} WHERE key = ?", (key,))
            else:
                con.execute(
                    f"INSERT OR REPLACE INTO {_DISK_TABLE} (key, fetched_at, base_at, body) VALUES (?, ?, ?, ?)",
                    (key, entry[0], _base_at.get(key, entry[0]), json.dumps(entry[1], separators=(",", ":"))),
                )
        con.close()
    except (sqlite3.Error, OSError, TypeError, ValueError):
        pass


def _disk_read(key: str) -> tuple[float, float, list[dict]] | None:
    """(وقت الجلب، وقت الجلب الكامل، الشموع)."""
    try:
        con = _disk_conn()
        if con is None:
            return None
        row = con.execute(f"SELECT fetched_at, base_at, body FROM {_DISK_TABLE} WHERE key = ?", (key,)).fetchone()
        con.close()
        if not row:
            return None
        at, base, candles = float(row[0]), float(row[1]), json.loads(row[2])
    except (sqlite3.Error, OSError, TypeError, ValueError):
        return None
    # صفّ تالف أو وقت جلب بالمستقبل (ساعة خاطئة) كان سيُخدم «طازجاً» بلا نهاية — يُهمَل ويُجلب من المزوّد
    if not math.isfinite(at) or at > time.time() + 60 or not isinstance(candles, list) or not candles:
        return None
    if not math.isfinite(base) or base > at:
        return None
    fields = ("time", "open", "high", "low", "close")
    if not all(isinstance(c, dict) and all(isinstance(c.get(f), (int, float)) for f in fields) for c in candles):
        return None
    return at, base, candles


# `_store` (افحص ⇒ احذف/ادمج ⇒ اكتب) يُستدعى من خيوط عدّة معاً (مجمّع FastAPI + الـworker): خيطان يريان
# مدخلاً كبيراً قديماً فيحذفانه ⇒ الثاني `KeyError` بعد جلب ناجح ⇒ `build_series` «غير متاح» بجانب شموع
# حقيقية جُلبت للتوّ، وخيط يقرأ `_base_at` بعد أن أزاله آخر فيمدّد عمر شموع لم تُراجَع. قفل واحد للقراءة/الكتابة.
_cache_lock = threading.RLock()


def _cached(key: str) -> tuple[float, list[dict]] | None:
    """مدخل الكاش بالذاكرة، أو من القرص أوّل مرة يُسأل عنه بعد الإقلاع."""
    with _cache_lock:
        if key not in _cache and key not in _disk_checked:
            _disk_checked.add(key)
            hit = _disk_read(key)
            if hit and key not in _cache:
                _cache[key] = (hit[0], hit[2])
                _base_at[key] = hit[1]
        return _cache.get(key)


def _load_symbol_from_disk(sym: str) -> None:
    """كل فريمات الرمز المحفوظة على القرص إلى الذاكرة (مرة واحدة بعد الإقلاع) — `_with_newest_close` يقارن
    الذاكرة وحدها، و`_cached` يحمّل المدخل عند طلبه هو فقط ⇒ بعد إعادة التشغيل كانت D (القائمة) تُخدم بإغلاق
    أقدم بدقائق من 15m المحفوظ (الشارت) حتى يُطلب الـ15m مصادفةً — رقمان للرمز نفسه."""
    marker = f"{sym}|*"
    with _cache_lock:
        if marker in _disk_checked:
            return
        _disk_checked.add(marker)
    try:
        con = _disk_conn()
        if con is None:
            return
        prefix = f"{sym}|"
        keys = [r[0] for r in con.execute(
            f"SELECT key FROM {_DISK_TABLE} WHERE substr(key, 1, ?) = ?", (len(prefix), prefix)
        )]
        con.close()
    except (sqlite3.Error, OSError):
        return
    for key in keys:
        _cached(key)

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


_key_lock = threading.Lock()
_key_cooldowns: dict[str, float] = {}
_current_key_idx: int = 0


def _all_api_keys() -> list[str]:
    raw = (
        os.getenv("TWELVE_DATA_API_KEYS")
        or os.getenv("TWELVE_DATA_API_KEY")
        or os.getenv("TWELVEDATA_API_KEY")
        or ""
    ).strip()
    if not raw:
        return []
    # Support comma-separated, semicolon, or newline-separated keys
    keys = [k.strip() for k in re.split(r"[,;\n\s]+", raw) if k.strip()]
    return keys


def _api_key() -> str:
    """إرجاع المفتاح النشط مع تدوير تلقائي في حال استهلاك حد الطلبات (Rate Limit Rotation)."""
    keys = _all_api_keys()
    if not keys:
        return ""
    if len(keys) == 1:
        return keys[0]

    now = time.time()
    with _key_lock:
        global _current_key_idx
        # فحص المفاتيح ابتداءً من المؤشر الحالي
        for i in range(len(keys)):
            idx = (_current_key_idx + i) % len(keys)
            k = keys[idx]
            cooldown_until = _key_cooldowns.get(k, 0.0)
            if now >= cooldown_until:
                _current_key_idx = idx
                return k
        # إن كانت كل المفاتيح في فترة تهدئة، نستخدم أقربها انتهاءً
        return min(keys, key=lambda k: _key_cooldowns.get(k, 0.0))


def mark_key_rate_limited(key: str, cooldown_seconds: float = 65.0) -> None:
    """وسم المفتاح كـ Rate Limited وتدوير المؤشر فوراً إلى المفتاح التالي."""
    if not key:
        return
    now = time.time()
    with _key_lock:
        global _current_key_idx
        _key_cooldowns[key] = now + cooldown_seconds
        keys = _all_api_keys()
        if keys and key in keys:
            _current_key_idx = (keys.index(key) + 1) % len(keys)


def configured() -> bool:
    return bool(_api_key())


_APIKEY_PARAM = re.compile(r"(apikey=)[^&\s'\"]+", re.I)


def redact(text: str) -> str:
    """نصّ خطأ بلا أي مفتاح من قائمة المفاتيح المشتركة لضمان عدم تسريبها باللوجات."""
    out = _APIKEY_PARAM.sub(r"\1***", str(text))
    for k in _all_api_keys():
        if k:
            out = out.replace(k, "***")
    return out


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
    بشرطة (أسهم «BRK/A») تبقى كما هي.

    ويُطبَّع NFKC وتُحذف حروف التنسيق غير المرئية (Cf): «EURUSD» منسوخاً من نصّ عربي يحمل علامة اتجاه
    (U+200F) وعرض كامل «ＥＵＲＵＳＤ» كانا يُحفظان تنبيهاً يبدو EURUSD «يراقب» ولا يعرفه المزوّد فلا يُطلق أبداً."""
    sym = "".join(
        ch for ch in unicodedata.normalize("NFKC", symbol or "") if unicodedata.category(ch) != "Cf"
    ).strip().upper()
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


_TS_MAX = 4_102_444_800  # 2100-01-01 UTC


def _parse_ts(dt_str: str) -> int | None:
    """ثواني UTC، أو `None` إن لم يُقرأ الوقت.

    كان يُعيد `int(time.time())` أي **الآن**: شمعة بوقت غير مقروء تُدَسّ عند الحافة اليمنى
    للشارت — بعد `candles.sort` تصير **آخر شمعة**، أي «آخر ما جرى بالسوق» بعين المتداول،
    وهي صفٌّ لم يُعرف وقته أصلاً. الصفّ يُسقَط الآن بدل أن يُخترع له وقت."""
    dt_str = (dt_str or "").strip()
    for fmt in ("%Y-%m-%d %H:%M:%S", "%Y-%m-%d"):
        try:
            dt = datetime.strptime(dt_str, fmt).replace(tzinfo=timezone.utc)
            ts = int(dt.timestamp())
        except ValueError:
            continue
        # وقت خارج المعقول (0001-01-01، 9999-12-31) كان يُقبل ثم يرمي `bar_end` (`fromtimestamp`) ⇒ 500 من
        # اللقطة والاقتباس، ويُعرض بالشارت شمعةَ مزوّد. يُسقَط كأيّ صفّ بلا وقت مقروء (يُعدّ بـ`rows_dropped`).
        return ts if 0 < ts < _TS_MAX else None
    return None


# سقف سعر معقول لأيّ أداة (أغلى سهم/عملة مشفّرة اليوم دون 1e6 بكثير) — فوقه عطل مزوّد لا سوق.
PRICE_MAX = 1e12


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
    if any(isinstance(row[k], bool) for k in ("open", "high", "low", "close")):
        return None  # JSON `true` كان سعراً 1.0 (`float(True)`)
    if not all(math.isfinite(v) for v in (o, h, l, c)):
        return None
    # سعر غير موجب أو شمعة مستحيلة (القمّة تحت القاع/الجسم) ليست سوقاً — كـ`_pos` بالاقتباس و`/ws/ticks`.
    # كانت تمرّ: `low=0` بشمعة 1m واحدة يُطلق **كل** تنبيه «تحت» على الرمز (`_price_hit` يقرأ الذيول)،
    # ويرسم الشارت انهياراً −100% ويدخل RSI/ATR والماسح والاختبار الخلفي كحركة حقيقية.
    if min(o, h, l, c) <= 0 or h < max(o, c, l) or l > min(o, c):
        return None
    # منتهٍ لكنه عبثي (1e200 من عطل المزوّد): لا أداة بسعر فوق `PRICE_MAX`. كان يمرّ فيرمي OverflowError
    # بـ(x−mean)² بالاختبار الخلفي والتوقّع، و`change_pct` لا نهائية ⇒ 500 للشارت والطرفية والماسح.
    if h > PRICE_MAX:
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
    hit = _bucket_hit(cache_key)
    if not hit:
        return None
    # شموع العطلة صالحة حتى افتتاح الأحد (`_closed_until`) ⇒ عمرها يُعدّ من الافتتاح لا من الجلب. كان الجلب
    # يوم السبت عمره ~36 ساعة عند الافتتاح ⇒ 429 عنده (16 شمعة D للقائمة تنتهي كلها باللحظة نفسها) يعيد
    # الصفّ «—» والشارت «غير متاح» بدل إغلاق الجمعة الحقيقي. `as_of` يبقى وقت الجلب الحقيقي.
    fresh_until = max(hit[0], _closed_until(cache_key.split("|", 1)[0], hit[0]) or 0)
    if now - fresh_until <= STALE_MAX_SEC:
        _stats["stale_served"] = int(_stats["stale_served"] or 0) + 1
        return hit[1], hit[0]
    return None


# **مصدر واحد للسعر بين أحجام الطلب** (W1): الكاش بمفتاح «رمز|فريم|حجم»، وقائمة المتابعة تطلب D/50 والشارت
# D/180 ⇒ مدخلان بوقتَي جلب مختلفين، فيُعرض للرمز نفسه في اللحظة نفسها `last` مختلف (1.1000 بالشارت
# و1.1050 بالقائمة)، وعند 429 يجد الشارت كاشه والقائمة لا شيء فتعرض «—» بجانب سعر. الآن: الطلب يُخدم من
# أحدث مدخل بحجم ≥ حجمه، وكل جلب ناجح يُحدِّث كل مدخلات الرمز والفريم معاً (الأكبر: شموعه الأقدم + الجديدة).
def _bucket_hit(cache_key: str) -> tuple[float, list[dict]] | None:
    sym, tf, size = cache_key.rsplit("|", 2)
    best = None
    for b in _SIZE_BUCKETS:
        hit = _cached(f"{sym}|{tf}|{b}") if b >= int(size) else None
        if hit and (best is None or hit[0] > best[0]):
            best = hit
    return best


def _store(cache_key: str, now: float, candles: list[dict]) -> None:
    with _cache_lock:
        _store_locked(cache_key, now, candles)


def _store_locked(cache_key: str, now: float, candles: list[dict]) -> None:
    sym, tf, size = cache_key.rsplit("|", 2)
    for b in _SIZE_BUCKETS:
        key = f"{sym}|{tf}|{b}"
        old = _cached(key)
        if b <= int(size) or not old or not candles:
            if b == int(size) or old:
                _cache[key] = (now, candles)
                _base_at[key] = now
                _disk_write(key, _cache[key])
            continue
        first = candles[0]["time"]
        # بلا تداخل (المدخل الأكبر جُلب قبل أن تبدأ الشموع الجديدة: D/180 قبل أسابيع ثم D/50 الآن) كان الدمج
        # يلصق القديم بالجديد بفجوة أسابيع وبوقت جلب «الآن» ⇒ الشارت يرسم ثغرة ويُحسب RSI/MACD عبرها. يُحذف.
        # وكذلك مدخل آخر جلب كامل له أقدم من `MERGE_MAX_AGE_SEC` (شموعه الأقدم لم تُراجَع منذئذ).
        if old[1][-1]["time"] < first or now - _base_at.get(key, old[0]) > MERGE_MAX_AGE_SEC:
            del _cache[key]
            _base_at.pop(key, None)
            _disk_write(key, None)
            continue
        merged = [c for c in old[1] if c["time"] < first] + candles
        _base_at.setdefault(key, old[0])
        _cache[key] = (now, merged[-max(len(old[1]), len(candles)):])
        _disk_write(key, _cache[key])


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
    if meta.get("kind") == "cache":
        candles, meta = _with_newest_close(canonical_symbol(matrix_symbol), timeframe, candles, meta)
    return candles[-n:], meta


# آخر اقتباس حقيقي من المزوّد لكل رمز (وقت السعر عند المزوّد، السعر) — يسجّله `/api/market/quote` بعد جلب ناجح
# موقوت. `_with_newest_close` يعامله كجلب آخر: كان الاقتباس (الحاسبة/الدفتر) 1.1010 والشارت/القائمة من كاش
# 15m قبل دقيقة 1.1000 في اللحظة نفسها (حتى 90ث، و10د لـD) — رقمان للرمز.
_quote_marks: dict[str, tuple[float, float]] = {}


def note_quote(matrix_symbol: str, price, quoted_at) -> None:
    try:
        p, at = float(price), float(quoted_at)
    except (TypeError, ValueError):
        return
    if not (math.isfinite(p) and p > 0 and math.isfinite(at)) or at > time.time() + 60:
        return
    sym = canonical_symbol(matrix_symbol)
    with _cache_lock:
        prev = _quote_marks.get(sym)
        if prev is None or at >= prev[0]:
            _quote_marks[sym] = (at, p)


def _mismatch_threshold(candles: list[dict]) -> float:
    """Calculate the threshold for detecting a price mismatch.
    
    Uses the last up to 20 candles to compute the average range (high - low).
    Threshold is max(3 * avg_range, 0.003 * abs(last_close)).
    """
    if not candles:
        return 0.0
    recent = candles[-20:]
    total_range = sum(c["high"] - c["low"] for c in recent)
    avg_range = total_range / len(recent)
    last_close = abs(candles[-1]["close"])
    return max(3 * avg_range, 0.003 * last_close)


def _with_newest_close(sym: str, tf: str, candles: list[dict], meta: dict) -> tuple[list[dict], dict]:
    """**سعر واحد بين الفريمات** (W1): كل فريم بكاشه وعمره (D ‏600ث، 15m ‏90ث، 1m ‏45ث) ⇒ رمز بلا تيك حيّ
    (14 رمزاً بأيام التداول، والرقمية بالعطلة) كانت قائمة المتابعة (D) تعرض إغلاقاً أقدم بحتى 10 دقائق من
    رأس الشارت (15m) في اللحظة نفسها — رقمان للرمز. شمعة مخزّنة ما زالت جارية تأخذ إغلاق أحدث جلب للرمز
    نفسه بأيّ فريم إن وقع جلبه قبل نهايتها (السعر نفسه داخل الشمعة نفسها)، وقمّتها/قاعها يتّسعان له؛
    `as_of` = وقت ذلك الجلب الحقيقي. جلبٌ بعد نهاية الشمعة (العطلة، شمعة جديدة) لا يُمسّ به شيء."""
    if not candles:
        return candles, meta
    last = candles[-1]
    as_of = float(meta.get("as_of") or 0)
    step = TF_SECONDS.get(tf, 900)
    end = bar_end(sym, last["time"], step)
    newest: tuple[float, float] | None = None
    _load_symbol_from_disk(sym)
    with _cache_lock:
        for key, (at, rows) in _cache.items():
            o_sym, o_tf, _size = key.rsplit("|", 2)
            if not rows or o_sym != sym or o_tf == tf:
                continue
            # وقت السعر المنسوخ = min(جلبه، نهاية آخر شمعة فيه): مزوّد متأخّر (آخر 1m انتهت 09:53 وجُلبت 09:58)
            # كان يُختم as_of 09:58 على شارت 1H بينما شارت 1m يقول 09:53 للسعر نفسه. وسلسلة متأخّرة عن جلبنا
            # (آخر شمعة فيها انتهت قبله) ⇒ إغلاقها أقدم من إغلاقنا فلا يُنسخ.
            o_step = TF_SECONDS.get(o_tf, 900)
            price_at = min(at, bar_end(sym, rows[-1]["time"], o_step))
            if not as_of < price_at < end:
                continue
            # جُلبت داخل كسر يومي/جلسة عطلة/ما قبل افتتاح الأحد وآخر شمعة فيها تمتدّ إليه ⇒ إغلاقها ملء المزوّد
            # للفترة المغلقة: كان يُنسخ لشمعة D/W الجارية بـ`as_of` داخل الكسر (برنت 00:30 UTC، ذهب 22:30).
            if _filler_tail(sym, rows[-1]["time"], o_step, at):
                continue
            if newest is None or price_at > newest[0]:
                newest = (price_at, rows[-1]["close"])
        # الاقتباس بوقت سعره عند المزوّد (لا لحظة جلبه): بعد جلبنا وقبل نهاية شمعتنا ⇒ داخلها. `time` لا يصلح
        # حدّاً أدنى: شمعة D موسومة 00:00 UTC لتاريخ إغلاقها وتبدأ 17:00 نيويورك من اليوم السابق.
        mark = _quote_marks.get(sym)
        if mark and as_of < mark[0] < end and (newest is None or mark[0] > newest[0]):
            newest = mark
    if newest is None:
        return candles, meta
    at, close = newest
    # Sanity guard: if the new price is wildly different from the candle, don't patch
    threshold = _mismatch_threshold(candles)
    if abs(close - last["close"]) > threshold:
        return candles, {**meta, "stale_mismatch": True, "mismatch_price": close}
    patched = {**last, "close": close, "high": max(last["high"], close), "low": min(last["low"], close)}
    return candles[:-1] + [patched], {**meta, "as_of": at}


def _fetch_bucket(matrix_symbol: str, timeframe: str, outputsize: int) -> tuple[list[dict], dict]:
    key = _api_key()
    if not key:
        raise RuntimeError("TWELVE_DATA_API_KEY missing")

    sym = canonical_symbol(matrix_symbol)
    why = unavailable_reason(sym)
    if why:
        raise SymbolUnavailable(sym, why)
    tf = timeframe if timeframe in TF_MAP else "15m"
    cache_key = f"{sym}|{tf}|{outputsize}"
    ttl = CACHE_TTL.get(tf, 90)
    now = time.time()
    hit = _bucket_hit(cache_key)
    if hit and (now - hit[0] < ttl or now < (_closed_until(sym, hit[0]) or 0)):
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
                mark_key_rate_limited(key)
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
        # شمعة جارية فُتحت داخل فترة مغلقة وما زالت داخلها عند الجلب (4H اليورو الأحد 20:00 جُلبت 21:00 والافتتاح
        # 22:00): `in_weekend_close` يبقيها لأنها ستعبر الافتتاح، لكنها الآن ملء المزوّد كلّها ⇒ «آخر سعر» مخترَع.
        # وD كذلك (كانت مستثناة): D المؤرَّخة غداً تُفتح 17:00 نيويورك = بداية كسر الذهب/WTI، والأحد قبل افتتاح CME.
        # وشمعة فُتحت قبل كسر يومي قصير وما زالت جارية داخله (4H ذهب 20:00 جُلبت 22:30 شتاءً، 4H برنت 20:00 جُلبت
        # 23:30): إغلاقها تيك الكسر ⇒ كان يُرسَل «آخر سعر» `provider` والسوق مغلق، وتحسب عليه تنبيهات RSI. الجلب بعد
        # الكسر يعيدها. العطلة الأسبوعية/جلسة العطلة لا: شمعة الجمعة الجارية وقت الإغلاق حقيقية حتى إغلاقها وتُخزَّن
        # حتى الافتتاح (`_closed_until`) — إسقاطها يُخفيها العطلة كلها.
        end = bar_end(sym, candle["time"], step) if step >= _DAY else candle["time"] + step
        opened = end - step if step == _DAY else candle["time"]
        if opened <= now < end:
            window = _closed_window(sym, now - 1e-3)
            if window and (opened >= window[0] or window[1] - window[0] <= _SHORT_BREAK):
                continue
        elif opened < now and step < _DAY:
            # run 113: شمعة انتهت **داخل** كسر يومي ما زال قائماً عند الجلب (4H برنت 20:00 شتاءً تنتهي 24:00 والكسر
            # 23:00–01:00، جُلبت 00:30): لم تعد «جارية» فكان الشرط أعلاه يبقيها **آخر شمعة** وإغلاقها تيك الكسر
            # (`_filler_tail` نفسه يقول ذلك) ⇒ «آخر سعر» `provider` مختوماً 23:00 والسوق مغلق. تعود بعد الكسر (حدّ معروف).
            window = _closed_window(sym, now - 1e-3)
            if window and window[1] - window[0] <= _SHORT_BREAK and window[0] < end <= window[1]:
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
    # وقت مكرَّر من المزوّد كان يمرّ شمعتين بالوقت نفسه: مكتبة الشارت تشترط أوقاتاً متزايدة تماماً، وRSI/ATR
    # والماسح والاختبار الرجعي وتنبيهات الذيل تعدّ الشمعة مرّتين. يبقى أوّل صفّ بترتيب المزوّد (الترتيب ثابت).
    candles = [c for i, c in enumerate(candles) if i == 0 or c["time"] != candles[i - 1]["time"]]
    if weekly_from_daily:
        candles = _weeks_from_days(candles, drop_first=len(data["values"] or []) >= int(params["outputsize"]))
    _store(cache_key, now, candles)
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
            # يوم بلا حجم ⇒ الأسبوع بلا حجم: كان يُجمع الموجود فقط فيُعرض مجموع جزئي كحجم الأسبوع كله
            w["volume"] = None if w["volume"] is None or d.get("volume") is None else w["volume"] + d["volume"]
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
    return {"price": p, "bid": None, "ask": None, "spread_source": None, "symbol": canonical_symbol(matrix_symbol),
            "price_only": True}


def fetch_quote_book(matrix_symbol: str) -> dict | None:
    """Price + bid/ask when Twelve Data quote endpoint provides them."""
    key = _api_key()
    if not key or unavailable_reason(matrix_symbol):
        return None
    td_sym = td_symbol(canonical_symbol(matrix_symbol))
    with httpx.Client(timeout=15.0) as client:
        r = client.get(f"{API_BASE}/quote", params={"symbol": td_sym, "apikey": key})
        if r.status_code == 429:
            mark_key_rate_limited(key)
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
    # `close: "null"` نصّاً كان يُعدّ موجوداً فيحجب `price` صالحاً ⇒ اقتباس يسقط بلا سبب
    price = _pos(data.get("close")) or _pos(data.get("price"))
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
    # قمّة وقاع اليوم: سعر موجب، وقمّة تحت القاع ليست يوماً (كـ`_candle`) ⇒ كلاهما None
    high_f, low_f = _pos(data.get("high")), _pos(data.get("low"))
    if high_f is not None and low_f is not None and high_f < low_f:
        high_f = low_f = None
    return {
        "symbol": canonical_symbol(matrix_symbol),
        "price": price,
        "bid": bid_f,
        "ask": ask_f,
        # من أين جاء Bid/Ask: `provider` = من المزوّد، None = غير متاح (لا تقدير أبداً).
        "spread_source": "provider" if bid_f is not None else None,
        "open": _pos(data.get("open")),
        "high": high_f,
        "low": low_f,
        # «-0.00000» من المزوّد كان يصل ‎-0.0 ⇒ «−0.00%» لتغيّر صفري
        "percent_change": (pc + 0.0) if (pc := _f(data.get("percent_change"))) is not None else None,
        # وقت السعر نفسه من المزوّد (آخر شمعة دقيقة)، لا لحظة جلبه: بعطلة نهاية الأسبوع كان إغلاق الجمعة
        # يُعاد `as_of` = «الآن» فتقرؤه الحاسبة/الدفتر سعراً حيّاً. None حين لا يرسله (المسار يقرّر).
        "quoted_at": quoted_at,
        "market_open": _market_open(matrix_symbol, data.get("is_market_open")),
    }


def _market_open(matrix_symbol: str, provider_says: object) -> bool | None:
    """السوق مفتوح/مغلق كما يقوله المزوّد — None حين لا يقول. إلا بعطلة الجلسة الأسبوعية بساعتنا: المزوّد يقول
    `true` طوال العطلة، واقتباس الجمعة 20:59 يمرّ فحص وقته ⇒ كان يُرسَل `market_open: true` يوم السبت فتقرأ
    الحاسبة إغلاق الجمعة «سعراً متوقّفاً منذ 2500 دقيقة» بدل «السوق مغلق · آخر إغلاق»."""
    if in_weekend_close(matrix_symbol, _session_now(), 0):
        return False
    return provider_says if isinstance(provider_says, bool) else None


def _quote_time(v: object) -> float | None:
    """ثوانٍ UTC موجبة ومنطقية (ليست بالمستقبل بأكثر من دقيقة) — وإلا None."""
    t = _f(v)
    if t is None or not math.isfinite(t) or t <= 1e9 or t > time.time() + 60:
        return None
    return t


def _f(v: object) -> float | None:
    """رقم منتهٍ أو None. `float("NaN")` كان يجتاز: bid/ask NaN يمرّ فحص `<= 0` و`bid > ask` (كلاهما
    False) فيُرسَل سبريد NaN موسوماً `provider`، وJSON الردّ يرفض NaN ⇒ 500 بدل «لا سعر»."""
    if isinstance(v, bool):  # `float(True)` = 1.0 ⇒ `{"close": true}` كان سعراً 1.0
        return None
    try:
        f = float(v) if v is not None else None
    except (TypeError, ValueError):
        return None
    return f if f is not None and math.isfinite(f) else None


def _pos(v: object) -> float | None:
    """سعر: موجب منتهٍ وإلا None."""
    f = _f(v)
    return f if f is not None and 0 < f <= PRICE_MAX else None


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
AMBIGUOUS_LISTING = "ambiguous_listing"


def _listings(rows: list[dict]) -> tuple[list[dict], list[dict]]:
    """(قابلة للرسم، ملتبسة). التطبيق يرسم **`symbol` وحده** (`/api/charts/{symbol}`) والمزوّد يجيبه بإدراجٍ
    واحد يختاره هو — AAPL ⇒ ناسداك بالدولار. كانت كل بورصة صفّاً مستقلاً: «AAPL · BMV» (≈6,032 بيزو)
    يرسم سهم ناسداك (≈341$)، و«SHEL · PSX» — **شركة أخرى** (Shell Pakistan، بالروبية) — يرسم إيصال
    شل البريطانية بنيويورك. سعر حقيقي لأداة غير التي اختارها المتداول = رقم مخترَع بالنسبة إليه.

    - رمز بإدراج واحد ⇒ كما هو.
    - رمز بـ`SYMBOL_MAP` ⇒ صفّ الأداة المُسنَدة وحدها؛ ما سواه باسمها المجرّد (سهم «XAUUSD») ملتبس.
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
        # لا عملات رقمية (قرار أنس): لا تُعرض ولا كملتبسة
        itype = str(row.get("instrument_type") or row.get("type") or "")
        if itype.strip().lower() == _CRYPTO_TYPE or is_crypto(sym):
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
        # لا «plan_hint» ثابتاً: كان يُعلن باقة المزوّد («Grow $29») على /health العامّ دون تحقّق —
        # الباقة الفعلية سؤال ترخيص مفتوح عند أنس، والخادم لا يعرفها من المفتاح.
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
