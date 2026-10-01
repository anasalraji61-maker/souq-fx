"""Twelve Data WebSocket — live prices (shared Grow key with robot)."""
from __future__ import annotations

import asyncio
import json
import math
import os
import time
from typing import Any

import websockets

import twelve_data as market
from twelve_data import SYMBOL_MAP, redact

WS_URL = "wss://ws.twelvedata.com/v1/quotes/price"

# MATRIX symbol -> latest price
LATEST: dict[str, float] = {}
# MATRIX symbol -> وقت آخر سعر عند المزوّد (epoch، `_quoted_at`؛ وقت الاستلام إن لم يُرسله) — بلا هذا كان سعر مجمَّد (انقطاع الـWS أو عطلة السوق) يُبثّ
# للعميل كـ«حي» بوقت الآن، ويُطلق عليه الـworker تنبيهات كأنه السعر الحالي.
LATEST_AT: dict[str, float] = {}
# MATRIX symbol -> `timestamp` المزوّد الخام لآخر تيك مخزَّن (بلا سقف وقت الوصول) — للترتيب وحده (`_store`)
_PROVIDER_TS: dict[str, float] = {}
_connected = False
_last_error: str | None = None

# Max symbols on Grow trial WS credits — keep light for robot
# (كان `DX-Y.NYB` هنا — رمز Yahoo لا يعرفه Twelve Data ⇒ خانة بثّ مهدورة بلا سعر أبداً.)
DEFAULT_WS_SYMBOLS = ["EUR/USD", "GBP/USD", "XAU/USD", "USD/JPY"]


def _ws_key() -> str:
    return (
        os.getenv("TWELVE_DATA_WS_KEY")
        or os.getenv("TWELVE_DATA_API_KEY")
        or os.getenv("TWELVEDATA_API_KEY")
        or ""
    ).strip()


def _matrix_from_td(td_sym: str) -> str:
    for mx, td in SYMBOL_MAP.items():
        if td.upper() == td_sym.upper():
            return mx
    return td_sym.replace("/", "").upper()


def _parse_price(msg: dict[str, Any]) -> tuple[str, float] | None:
    event = msg.get("event") or msg.get("type")
    if event and event not in ("price", "quote", "trade"):
        return None
    # `meta: null` (أو غير كائن) كان يرمي AttributeError خارج أي حارس ⇒ يُغلق الاتصال وتتوقّف تيكات كل الرموز 8ث
    meta = msg.get("meta")
    sym = msg.get("symbol") or (meta.get("symbol") if isinstance(meta, dict) else None)
    price = msg.get("price") or msg.get("close") or msg.get("last")
    # `symbol: ["EUR/USD"]` كان يُخزَّن ويُبثّ برمز خردة «['EURUSD']» موسوماً twelvedata_ws
    if not isinstance(sym, str) or not sym or price is None or isinstance(price, bool):  # `true` كان سعراً 1.0
        return None
    try:
        p = float(price)
    except (TypeError, ValueError, OverflowError):  # عدد JSON بأكثر من ~309 أرقام ⇒ OverflowError
        return None
    # `float("NaN")`/`"inf"` تجتاز التحويل، و`send_json` يكتبها `NaN` حرفياً — JSON غير صالح يُسقط
    # `JSON.parse` بالتطبيق فتتوقّف كل التيكات لا الرمز وحده. وسعر غير موجب ليس سعراً (والتنبيهات تقرؤه).
    if not math.isfinite(p) or p <= 0 or p > market.PRICE_MAX:  # 1e200 عطل لا سعر (كـ`_candle`)
        return None
    return _matrix_from_td(str(sym)), p


def _quoted_at(msg: dict[str, Any], received: float) -> float:
    """وقت السعر **عند المزوّد** (`timestamp` بحدث price، ثوانٍ epoch)، لا وقت وصوله. كان `time.time()`
    دائماً: سعر يُعاد إرساله عند الاشتراك/إعادة الاتصال (إغلاق الجمعة بعطلة الأسبوع) يُبثّ «حيّاً» بوقت الآن
    ويقرؤه الـworker سعراً حالياً للتنبيهات. لا يتجاوز وقت الوصول (ساعة مزوّد متقدّمة لا تجعل سعراً «أحدث»)،
    وبلا `timestamp` صالح ⇒ وقت الوصول كما كان."""
    ts = _provider_ts(msg)
    return received if ts is None else min(ts, received)


def _provider_ts(msg: dict[str, Any]) -> float | None:
    """`timestamp` التيك عند المزوّد بالثواني، أو None إن غاب/لم يُقرأ."""
    raw = msg.get("timestamp")
    if isinstance(raw, bool):
        return None
    try:
        ts = float(raw)
    except (TypeError, ValueError, OverflowError):
        return None
    if not math.isfinite(ts) or ts <= 0:
        return None
    if ts > 1e14:  # ميكروثانية
        return ts / 1e6
    return ts / 1000.0 if ts > 1e11 else ts  # ميلي ثانية


# run 124: كانت ساعة كاملة ⇒ `timestamp` معطوب متقدّماً 1–59 دقيقة يصير مرجع الترتيب فيُسقَط كل تيك صحيح بعده
# («أقدم» منه) حتى تتجاوزه الساعة: السعر يتجمّد والسوق يتحرّك، ويُبثّ ~3 دقائق «حيّاً». فرق ساعتي خادمٍ
# ومزوّدٍ حقيقي ثوانٍ؛ ما فوق دقيقة لا يُقرأ وقتاً ولا يدخل الترتيب.
_MAX_AHEAD_S = 60.0


def _store(msg: dict[str, Any]) -> None:
    global _last_price_frame
    parsed = _parse_price(msg)
    if parsed:
        _last_price_frame = time.monotonic()
        sym = parsed[0]
        received = time.time()
        at = _quoted_at(msg, received)
        ts = _provider_ts(msg)
        # وقت بعد الوصول بأكثر من `_MAX_AHEAD_S` ليس فرق ساعات بل وقتٌ لم يُقرأ (وحدة خاطئة، سنة معطوبة): كان يُحفظ
        # مرجعاً للترتيب ⇒ كل تيك لاحق «أقدم» منه فيُسقَط حتى إعادة تشغيل الخادم، والسعر يتجمّد ثم يتقادم.
        # يُعامَل كتيك بلا `timestamp`: يُقبل بوقت وصوله ولا يدخل الترتيب.
        if ts is not None and ts > received + _MAX_AHEAD_S:
            ts = None
        # تيك متأخّر الوصول (وقته عند المزوّد أقدم من المخزَّن) كان يمحو سعراً أحدث ويُقرأ للتنبيهات حتى يتقادم.
        # الترتيب بوقت المزوّد **الخام** (run 91): المقارنة كانت بالوقت المسقوف بوقت الوصول ⇒ ساعة خادم متأخّرة
        # عن المزوّد تسقف كل التيكات فيحكم ترتيب الوصول (1.1000 الأقدم يمحو 1.1010)، وتيك بلا `timestamp`
        # (وقت وصول كسري) كان يُسقط تيكاً أحدث بالثانية نفسها. بلا `timestamp` ⇒ لا ترتيب ممكن: يُقبل.
        if ts is not None and ts < _PROVIDER_TS.get(sym, 0.0):
            return
        LATEST[sym] = parsed[1]
        LATEST_AT[sym] = at
        if ts is not None:
            _PROVIDER_TS[sym] = ts


# run 124: الحلقة كانت تعيد الاتصال فقط حين ينتهي `async for` أو يرمي. مزوّد يتوقّف عن الأسعار والمقبس قائم
# (يردّ على ping) ⇒ انتظار للأبد: لا إعادة اشتراك، `connected` يبقى true، وكل الرموز بلا سعر حتى إعادة
# تشغيل الخادم. المراقب يرسل heartbeat المزوّد كل `_HEARTBEAT_S`، وبلا سعر `_STALL_S` والسوق مفتوح لرمز
# مشترَك (العطلة والكسر اليومي بلا تيكات أصلاً) ⇒ يغلق المقبس فتعيد الحلقة الاتصال والاشتراك.
_HEARTBEAT_S = 10.0
_STALL_S = 90.0
_last_price_frame = 0.0  # time.monotonic() لآخر سعر مقبول
_real_sleep = asyncio.sleep  # الاختبارات تستبدل `asyncio.sleep` لإيقاف الحلقة الرئيسية


def _stalled(td_symbols: list[str], connected_at: float) -> bool:
    """لا سعر منذ `_STALL_S` (منذ الاتصال إن كان أحدث) وسوق رمز مشترَك واحد على الأقل مفتوح الآن."""
    if time.monotonic() - max(_last_price_frame, connected_at) < _STALL_S:
        return False
    now = time.time()
    return any(not market.in_weekend_close(_matrix_from_td(s), now, 0) for s in td_symbols)


async def _watch(ws: Any, td_symbols: list[str], stall: list[bool]) -> None:
    connected_at = time.monotonic()
    try:
        while True:
            await _real_sleep(_HEARTBEAT_S)
            if _stalled(td_symbols, connected_at):
                stall.append(True)
                await ws.close()
                return
            await ws.send(json.dumps({"action": "heartbeat"}))
    except Exception:  # noqa: BLE001 — المقبس أُغلق أثناء الإرسال: الحلقة الرئيسية تعيد الاتصال
        return


async def run_forever() -> None:
    global _connected, _last_error
    key = _ws_key()
    if not key:
        _last_error = "no websocket key"
        return

    td_syms = os.getenv("TWELVE_DATA_WS_SYMBOLS")
    symbols = td_syms if td_syms else ",".join(DEFAULT_WS_SYMBOLS)

    while True:
        try:
            url = f"{WS_URL}?apikey={key}"
            stall: list[bool] = []
            async with websockets.connect(url, ping_interval=20, ping_timeout=20) as ws:
                sub = {"action": "subscribe", "params": {"symbols": symbols}}
                await ws.send(json.dumps(sub))
                _connected = True
                _last_error = None
                watch = asyncio.ensure_future(_watch(ws, [x.strip() for x in symbols.split(",") if x.strip()], stall))
                try:
                    async for raw in ws:
                        try:
                            data = json.loads(raw)
                        except json.JSONDecodeError:
                            continue
                        for item in data if isinstance(data, list) else [data]:
                            if isinstance(item, dict):
                                # إطار واحد معطوب كان يرمي خارج `async for` ⇒ يُغلق الاتصال وتتوقّف تيكات كل
                                # الرموز ~8ث. يُتجاوَز وحده.
                                try:
                                    _store(item)
                                except Exception:  # noqa: BLE001
                                    continue
                finally:
                    watch.cancel()
            # إغلاق نظيف (1000/1001) ينهي `async for` بلا استثناء: كان `connected` يبقى true وإعادة
            # الاتصال فورية بلا انتظار ⇒ خادم يقبل ثم يغلق (نفاد الرصيد) = «متصل» ولا شيء يصل، وحلقة بلا توقّف
            _connected = False
            _last_error = "no prices from provider" if stall else "closed by server"
            await asyncio.sleep(8)
        except asyncio.CancelledError:
            _connected = False
            raise
        except Exception as exc:  # noqa: BLE001
            _connected = False
            _last_error = redact(exc)[:200]  # حالة عامة (`/api/status`): رابط الـWS يحمل المفتاح
            await asyncio.sleep(8)


# عمر أقصى لسعر يُعدّ «حيّاً» بالحالة (نفس نافذة تنبيهات الـworker `snapshot(max_age=180)`)
LIVE_MAX_AGE = 180.0


def status() -> dict:
    # كان `symbols_live` = كل رمز وصل سعره يوماً — حتى بعد انقطاع الـWS بساعات. الآن ما وصل خلال
    # `LIVE_MAX_AGE` فقط، والباقي بـ`symbols_stale`.
    # وتيك بعطلة الأسبوع (ملء المزوّد بعد إغلاق الجمعة) ليس «حيّاً»: البثّ والتنبيهات يُسقطانه أصلاً
    # (`in_weekend_close`)، والحالة كانت تعدّه بـ`symbols_live`.
    live = {s: p for s, p in snapshot(max_age=LIVE_MAX_AGE).items()
            if not market.in_weekend_close(s, LATEST_AT.get(s) or market._session_now(), 0)}
    return {
        "connected": _connected,
        "symbols_live": list(live.keys()),
        "symbols_stale": [s for s in dict(LATEST) if s not in live],
        "last_error": _last_error,
        "has_key": bool(_ws_key()),
    }


def snapshot(max_age: float | None = None) -> dict[str, float]:
    """آخر الأسعار؛ مع `max_age` (ثوانٍ) فقط ما وصل خلالها — سعر أقدم ليس «السعر الحالي»."""
    if max_age is None:
        return dict(LATEST)
    cutoff = time.time() - max_age
    # نسخة أولاً: يُستدعى من خيوط (`asyncio.to_thread` — الـworker و`/api/alerts/check`) بينما حلقة الـWS
    # تضيف رمزاً جديداً ⇒ «dictionary changed size during iteration» يُسقط دورة الفحص كلها.
    return {s: p for s, p in dict(LATEST).items() if LATEST_AT.get(s, 0.0) >= cutoff}


def recent_snapshot(window: float = 120.0) -> tuple[dict[str, float], float | None]:
    """(الأسعار القريبة من أحدث استلام، وقت أحدث استلام) — لبثّ `/ws/ticks` بوقت حقيقي `as_of` بدل
    «الآن»: حين يتجمّد الـWS يصير as_of قديماً فيعرض العميل «آخر سعر» لا «حي». رمز تأخّر أكثر من
    `window` عن أحدث رمز يُستبعد كي لا يحمل وقت غيره."""
    if not LATEST_AT:
        return dict(LATEST), None
    newest = max(dict(LATEST_AT).values())
    return {s: p for s, p in dict(LATEST).items() if LATEST_AT.get(s, 0.0) >= newest - window}, newest


def tick(symbol: str, max_age: float) -> tuple[float, float] | None:
    """(السعر، وقت استلامه) لرمز واحد، متّسقان؛ أقدم من `max_age` ⇒ None.

    يُستدعى من خيط الـworker بينما حلقة الـWS تكتب `LATEST` ثم `LATEST_AT` (run 123): قراءتهما منفصلتين كانت
    تأخذ السعر القديم بوقت التيك الجديد ⇒ سعر قبل تسليح التنبيه يُعدّ بعده. الوقت يُقرأ قبل السعر وبعده؛
    اختلافهما = تيك وصل بينهما ⇒ إعادة. تطابقهما قد يعني سعراً أحدث بوقت أقدم — الاتجاه الآمن (لا يُطلق مبكراً)."""
    for _ in range(5):
        at = LATEST_AT.get(symbol)
        p = LATEST.get(symbol)
        if LATEST_AT.get(symbol) == at:
            break
    else:
        return None
    if p is None or at is None or at < time.time() - max_age:
        return None
    return p, at


def received_at(symbols: list[str] | dict[str, float]) -> dict[str, float | None]:
    """وقت استلام كل رمز على حدة — `as_of` الدفعة وقت **أحدثها**، فسعرٌ أقدم منه بدقيقتين كان يحمل وقت غيره."""
    return {s: LATEST_AT.get(s) for s in symbols}
