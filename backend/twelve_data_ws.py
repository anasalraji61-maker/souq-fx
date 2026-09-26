"""Twelve Data WebSocket — live prices (shared Grow key with robot)."""
from __future__ import annotations

import asyncio
import json
import math
import os
import time
from typing import Any

import websockets

from twelve_data import SYMBOL_MAP, redact

WS_URL = "wss://ws.twelvedata.com/v1/quotes/price"

# MATRIX symbol -> latest price
LATEST: dict[str, float] = {}
# MATRIX symbol -> وقت آخر سعر عند المزوّد (epoch، `_quoted_at`؛ وقت الاستلام إن لم يُرسله) — بلا هذا كان سعر مجمَّد (انقطاع الـWS أو عطلة السوق) يُبثّ
# للعميل كـ«حي» بوقت الآن، ويُطلق عليه الـworker تنبيهات كأنه السعر الحالي.
LATEST_AT: dict[str, float] = {}
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
    if not sym or price is None or isinstance(price, bool):  # `true` كان سعراً 1.0
        return None
    try:
        p = float(price)
    except (TypeError, ValueError):
        return None
    # `float("NaN")`/`"inf"` تجتاز التحويل، و`send_json` يكتبها `NaN` حرفياً — JSON غير صالح يُسقط
    # `JSON.parse` بالتطبيق فتتوقّف كل التيكات لا الرمز وحده. وسعر غير موجب ليس سعراً (والتنبيهات تقرؤه).
    if not math.isfinite(p) or p <= 0:
        return None
    return _matrix_from_td(str(sym)), p


def _quoted_at(msg: dict[str, Any], received: float) -> float:
    """وقت السعر **عند المزوّد** (`timestamp` بحدث price، ثوانٍ epoch)، لا وقت وصوله. كان `time.time()`
    دائماً: سعر يُعاد إرساله عند الاشتراك/إعادة الاتصال (إغلاق الجمعة بعطلة الأسبوع) يُبثّ «حيّاً» بوقت الآن
    ويقرؤه الـworker سعراً حالياً للتنبيهات. لا يتجاوز وقت الوصول (ساعة مزوّد متقدّمة لا تجعل سعراً «أحدث»)،
    وبلا `timestamp` صالح ⇒ وقت الوصول كما كان."""
    raw = msg.get("timestamp")
    if isinstance(raw, bool):
        return received
    try:
        ts = float(raw)
    except (TypeError, ValueError):
        return received
    if not math.isfinite(ts) or ts <= 0:
        return received
    if ts > 1e12:  # ميلي ثانية
        ts /= 1000.0
    return min(ts, received)


def _store(msg: dict[str, Any]) -> None:
    parsed = _parse_price(msg)
    if parsed:
        at = _quoted_at(msg, time.time())
        # تيك متأخّر الوصول (وقته عند المزوّد أقدم من المخزَّن) كان يمحو سعراً أحدث ويُقرأ للتنبيهات حتى يتقادم
        if at < LATEST_AT.get(parsed[0], 0.0):
            return
        LATEST[parsed[0]] = parsed[1]
        LATEST_AT[parsed[0]] = at


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
            async with websockets.connect(url, ping_interval=20, ping_timeout=20) as ws:
                sub = {"action": "subscribe", "params": {"symbols": symbols}}
                await ws.send(json.dumps(sub))
                _connected = True
                _last_error = None
                async for raw in ws:
                    try:
                        data = json.loads(raw)
                    except json.JSONDecodeError:
                        continue
                    for item in data if isinstance(data, list) else [data]:
                        if isinstance(item, dict):
                            _store(item)
            # إغلاق نظيف (1000/1001) ينهي `async for` بلا استثناء: كان `connected` يبقى true وإعادة
            # الاتصال فورية بلا انتظار ⇒ خادم يقبل ثم يغلق (نفاد الرصيد) = «متصل» ولا شيء يصل، وحلقة بلا توقّف
            _connected = False
            _last_error = "closed by server"
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
    live = snapshot(max_age=LIVE_MAX_AGE)
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


def received_at(symbols: list[str] | dict[str, float]) -> dict[str, float | None]:
    """وقت استلام كل رمز على حدة — `as_of` الدفعة وقت **أحدثها**، فسعرٌ أقدم منه بدقيقتين كان يحمل وقت غيره."""
    return {s: LATEST_AT.get(s) for s in symbols}
