"""
MATRIX API — منصة تحليل فني للفوركس
معزولة تماماً عن روبوت التداول Matrix/MT5 وجسوره وعن سوق العراق
المنفذ الافتراضي: 8100
"""
from __future__ import annotations

import asyncio
import math
import os
import random
import secrets
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Literal

from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field

from academy_data import get_lecture, get_school, get_schools_summary
import elevenlabs_tts as tts
import twelve_data as market
import twelve_data_ws as td_ws
import db
from core.auth import _auth_user
import news_feed
import openrouter_ai
import alert_worker
import econ_calendar
import backtest as backtest_engine
import screener as screener_engine
import indicators as ind_engine
import signal_hub
import commissions as commissions_mod

_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(_ROOT / ".env")
load_dotenv()

APP_NAME = "MATRIX"
API_PORT = int(os.getenv("MATRIX_PORT", "8100"))


@asynccontextmanager
async def lifespan(app: FastAPI):
    db.init_db()
    ws_task = asyncio.create_task(td_ws.run_forever())
    alert_task = asyncio.create_task(alert_worker.run_alert_loop(60.0))
    yield
    ws_task.cancel()
    alert_task.cancel()
    for task in (ws_task, alert_task):
        try:
            await task
        except asyncio.CancelledError:
            pass


app = FastAPI(title=APP_NAME, version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Models ───────────────────────────────────────────────────────────────────

class Candle(BaseModel):
    time: int
    open: float
    high: float
    low: float
    close: float
    volume: float = 0


class DataProvenance(BaseModel):
    """Honest candle/tick origin — never imply live market from HTTP/WS alone."""

    kind: Literal["provider", "demo", "cache", "unknown"] = "unknown"
    as_of: float | None = None
    channel: str | None = None


class ChartSeries(BaseModel):
    symbol: str
    timeframe: str
    candles: list[Candle]
    change_pct: float
    last: float
    data_source: DataProvenance = Field(default_factory=DataProvenance)


class ChatMessage(BaseModel):
    # الحقول الأخرى التي ترسلها نسخ أقدم (id/user/ts/room/peer) تُتجاهَل: الخادم يحدد المعرّف
    # والوقت واسم المرسل من التوكن — الاسم لم يعد نصاً حرّاً يتيح انتحال أي متداول.
    text: str = Field(min_length=1, max_length=1000)


class VoteCreate(BaseModel):
    symbol: str
    direction: Literal["buy", "sell"]
    entry: float
    sl: float
    tp: float
    note: str = ""


class VoteBallot(BaseModel):
    vote_id: str
    choice: Literal["agree", "disagree"]


class AiAsk(BaseModel):
    question: str = Field(min_length=2, max_length=2000)
    symbol: str | None = None
    # لغة واجهة المتداول ('ar' | 'en-US' | 'en-GB' | 'ku'). اختياري: غيابه = عربي (عملاء أقدم).
    lang: str | None = Field(default=None, max_length=10)


class TeacherInterrupt(BaseModel):
    school_id: str
    lecture_id: str
    segment_id: str | None = None
    question: str = Field(min_length=2, max_length=2000)
    # لغة واجهة المتعلّم (نفس قاعدة AiAsk). اختياري: غيابه = عربي (عملاء أقدم).
    lang: str | None = Field(default=None, max_length=10)


class DmSend(BaseModel):
    to_user: str
    text: str = Field(min_length=1, max_length=2000)
    from_user: str = "أنت"


class AlertCreate(BaseModel):
    symbol: str = Field(min_length=3, max_length=12)
    condition: Literal["above", "below"]
    price: float = Field(gt=0)
    note: str = ""


class AuthRegister(BaseModel):
    username: str = Field(min_length=3, max_length=32)
    email: str = Field(min_length=5, max_length=120)
    password: str = Field(min_length=4, max_length=128)
    role: Literal["trader", "trainer", "broker", "agent", "company"] = "trader"
    sponsor_code: str | None = None
    side: Literal["left", "right"] | None = None


class AuthLogin(BaseModel):
    username: str = ""  # username or email
    email: str | None = None
    password: str


class PushRegister(BaseModel):
    token: str = Field(min_length=10)
    platform: str = "unknown"
    # لغة واجهة الجهاز (ar/en-US/en-GB/ku) — اختيارية؛ العملاء الأقدم لا يرسلونها
    lang: str | None = Field(default=None, max_length=10)


class LayoutSave(BaseModel):
    id: str | None = None
    name: str = Field(min_length=1, max_length=64)
    payload: dict


class WatchlistAdd(BaseModel):
    symbol: str = Field(min_length=3, max_length=12)


class ProgressSave(BaseModel):
    school_id: str
    lecture_id: str
    segment_index: int = 0
    completed: bool = False


class ScreenerRun(BaseModel):
    timeframe: str = "15m"
    filters: list[str] = Field(default_factory=lambda: ["ma_cross_up"])
    symbols: list[str] | None = None
    fast: int = 9
    slow: int = 21


class BacktestRun(BaseModel):
    symbol: str = "EURUSD"
    timeframe: str = "15m"
    strategy: Literal["ma_cross", "rsi_reversal", "macd_cross", "bb_bounce"] = "ma_cross"
    fast: int = 9
    slow: int = 21
    rsi_low: float = 30
    rsi_high: float = 70


class SocialConsensusBody(BaseModel):
    symbol: str = "EURUSD"
    timeframe: str = "15m"
    source_ids: list[str] = Field(default_factory=list)


class IndicatorForecastBody(BaseModel):
    symbol: str = "EURUSD"
    timeframe: str = "15m"
    indicators: list[str] | None = None


class IndicatorAlertCreate(BaseModel):
    symbol: str = Field(min_length=3, max_length=12)
    timeframe: str = "15m"
    alert_type: Literal["rsi", "ma_cross", "macd_cross"]
    condition: Literal["above", "below", "cross_up", "cross_down"]
    value: float | None = None
    fast_period: int = 9
    slow_period: int = 21
    note: str = ""


class TradeCreate(BaseModel):
    symbol: str = Field(min_length=3, max_length=12)
    side: Literal["buy", "sell"]
    entry: float
    exit: float | None = None
    size: float = 1.0
    note: str = ""
    opened_at: str | None = None
    sl: float | None = None
    tp: float | None = None


class TradeClose(BaseModel):
    exit: float


def _new_id(prefix: str) -> str:
    """معرّف فريد فعلاً لصفّ جديد (تنبيه/تنبيه مؤشر/فكرة صفقة).

    كانت المعرّفات `a{int(time.time())}{random 10–99}` و`v{int(time.time())}` — بدقّة ثانية، والجدول
    يُدرج بـ`INSERT` عادي على مفتاح أساسي: تنبيهان بنفس الثانية (1 من 90) أو فكرتا صفقة بنفس الثانية
    (دائماً) → `IntegrityError` = HTTP 500 للمستخدم الثاني. البادئة تبقى كما هي (لا عميل يحلّل المعرّف).
    """
    return f"{prefix}{int(time.time())}{secrets.token_hex(4)}"


# ─── In-memory store (MVP) ────────────────────────────────────────────────────

PRICE_ALERTS: list[dict] = []

GROUP_CHAT: list[dict] = [
    {
        "id": "g1",
        "user": "أحمد",
        "text": "DXY يكسر 104.2 — راقبوا EURUSD",
        "ts": "21:02",
        "room": "group",
    },
    {
        "id": "g2",
        "user": "سارة",
        "text": "تصويتي شراء GBPUSD على الريتست",
        "ts": "21:05",
        "room": "group",
    },
    {
        "id": "g3",
        "user": "كريم",
        "text": "خبر CPI بعد ساعة — حجم منخفض الآن",
        "ts": "21:08",
        "room": "group",
    },
]

DM_THREADS: dict[str, list[dict]] = {
    "سارة": [
        {
            "id": "d1",
            "user": "سارة",
            "text": "شفت السيولة عند 1.0850؟",
            "ts": "20:40",
            "room": "dm",
            "peer": "سارة",
        },
        {
            "id": "d2",
            "user": "أنت",
            "text": "نعم، أنتظر تأكيد الكسر",
            "ts": "20:42",
            "room": "dm",
            "peer": "سارة",
        },
    ],
    "كريم": [
        {
            "id": "d3",
            "user": "كريم",
            "text": "أرسلتك سيناريو الذهب",
            "ts": "19:15",
            "room": "dm",
            "peer": "كريم",
        },
    ],
}

VOTES: list[dict] = [
    {
        "id": "v1",
        "symbol": "EURUSD",
        "direction": "sell",
        "entry": 1.0862,
        "sl": 1.0895,
        "tp": 1.0790,
        "note": "رفض عند المقاومة اليومية + DXY صاعد",
        "agree": 18,
        "disagree": 5,
        "author": "أحمد",
        "ts": "21:00",
    },
    {
        "id": "v2",
        "symbol": "XAUUSD",
        "direction": "buy",
        "entry": 2348.5,
        "sl": 2335.0,
        "tp": 2372.0,
        "note": "دعم أسبوعي + ضعف الدولار المؤقت",
        "agree": 12,
        "disagree": 9,
        "author": "سارة",
        "ts": "20:50",
    },
]

NEWS: list[dict] = [
    {
        "id": "n1",
        "impact": "high",
        "title": "قرار الفائدة الفيدرالي — توقع تثبيت",
        "pair_effect": "DXY / EURUSD / XAUUSD",
        "when": "اليوم 21:00",
    },
    {
        "id": "n2",
        "impact": "high",
        "title": "CPI الأمريكي أعلى من المتوقع (سيناريو وهمي للتجربة)",
        "pair_effect": "USD pairs",
        "when": "غداً 15:30",
    },
    {
        "id": "n3",
        "impact": "medium",
        "title": "خطاب عضو في الفيدرالي عن التضخم",
        "pair_effect": "DXY",
        "when": "اليوم 18:00",
    },
]

COURSES: list[dict] = []  # replaced by /api/academy/*


def _alert_price(symbol: str) -> float | None:
    try:
        q = market.fetch_quote(symbol)
        if q is not None:
            return float(q)
    except Exception:
        pass
    snap = td_ws.snapshot()
    p = snap.get(symbol.upper())
    return float(p) if p is not None else None


def _seed_walk(
    symbol: str, base: float, n: int = 80, vol: float = 0.0012, step_sec: int = 900
) -> list[Candle]:
    rng = random.Random((hash(symbol) + step_sec) % 10_000)
    t0 = int(time.time()) - n * step_sec
    price = base
    out: list[Candle] = []
    vol_scale = math.sqrt(step_sec / 900)
    for i in range(n):
        drift = math.sin(i / 9) * vol * base * 0.35 * vol_scale
        shock = rng.uniform(-vol, vol) * base * vol_scale
        o = price
        c = max(0.0001, o + drift + shock)
        h = max(o, c) * (1 + abs(rng.uniform(0, vol * 0.6 * vol_scale)))
        l = min(o, c) * (1 - abs(rng.uniform(0, vol * 0.6 * vol_scale)))
        out.append(
            Candle(
                time=t0 + i * step_sec,
                open=round(o, 5 if base < 50 else 2),
                high=round(h, 5 if base < 50 else 2),
                low=round(l, 5 if base < 50 else 2),
                close=round(c, 5 if base < 50 else 2),
                volume=round(abs(c - o) * (1e6 if base < 50 else 80) * (0.5 + rng.random()) + rng.uniform(800, 5000), 2),
            )
        )
        price = c
    return out


SYMBOL_BASES = {
    "DXY": 104.25,
    "EURUSD": 1.0854,
    "GBPUSD": 1.2732,
    "USDJPY": 157.42,
    "AUDUSD": 0.6621,
    "USDCAD": 1.3642,
    "NZDUSD": 0.6014,
    "USDCHF": 0.8842,
    "EURJPY": 162.15,
    "GBPJPY": 200.4,
    "EURGBP": 0.852,
    "AUDJPY": 104.2,
    "EURAUD": 1.64,
    "EURCHF": 0.96,
    "CADJPY": 115.3,
    "XAUUSD": 2348.6,
    "XAGUSD": 28.45,
    "USOIL": 78.35,
    "UKOIL": 82.1,
    "BTCUSD": 67420.0,
    "ETHUSD": 3450.0,
}

TF_SECONDS = {
    "1m": 60,
    "5m": 300,
    "15m": 900,
    "30m": 1800,
    "1H": 3600,
    "4H": 14400,
    "D": 86400,
    "W": 604800,
}


def build_series(symbol: str, timeframe: str = "15m", outputsize: int = 180) -> ChartSeries:
    sym = symbol.upper()
    tf = timeframe if timeframe in TF_SECONDS else "15m"
    size = max(50, min(int(outputsize or 180), 5000))

    if market.configured():
        try:
            raw, meta = market.fetch_time_series_with_meta(sym, tf, outputsize=size)
            if raw:
                candles = [Candle(**c) for c in raw]
                first = candles[0].close
                last = candles[-1].close
                change = ((last - first) / first) * 100 if first else 0
                kind = meta.get("kind") if meta.get("kind") in ("provider", "cache") else "unknown"
                return ChartSeries(
                    symbol=sym,
                    timeframe=tf,
                    candles=candles,
                    change_pct=round(change, 2),
                    last=last,
                    data_source=DataProvenance(
                        kind=kind,  # type: ignore[arg-type]
                        as_of=meta.get("as_of"),
                        channel=meta.get("channel") or "twelvedata",
                    ),
                )
        except Exception:
            pass  # fallback to demo seed below

    step = TF_SECONDS[tf]
    base = SYMBOL_BASES.get(sym, 1.0)
    vol = 0.0008 if sym == "DXY" else 0.0015
    candles = _seed_walk(sym, base, n=size, vol=vol, step_sec=step)
    first = candles[0].close
    last = candles[-1].close
    change = ((last - first) / first) * 100
    return ChartSeries(
        symbol=sym,
        timeframe=tf,
        candles=candles,
        change_pct=round(change, 2),
        last=last,
        data_source=DataProvenance(kind="demo", as_of=time.time(), channel="seed"),
    )


# ─── Routes ───────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {
        "ok": True,
        "app": APP_NAME,
        "port": API_PORT,
        "market": market.status(),
        "note": "MATRIX charts app — isolated from trading robot/MT5 bridge and Souq-Iraq",
        "ts": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/market/status")
def market_status():
    st = market.status()
    st["websocket"] = td_ws.status()
    st["ai"] = {"openrouter": openrouter_ai.configured()}
    st["database"] = str(db.DB_PATH.name)
    return st


@app.post("/api/auth/register")
def auth_register(body: AuthRegister):
    try:
        return db.register_user(
            body.username,
            body.password,
            role=body.role,
            sponsor_code=body.sponsor_code,
            side=body.side,
            email=body.email,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/api/auth/login")
def auth_login(body: AuthLogin):
    ident = (body.email or body.username or "").strip()
    if not ident:
        raise HTTPException(status_code=400, detail="email or username required")
    try:
        return db.login_user(ident, body.password)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


@app.get("/api/auth/me")
def auth_me(user: dict | None = Depends(_auth_user)):
    if not user:
        raise HTTPException(status_code=401, detail="not authenticated")
    net = db.ensure_network_for_user(user["user_id"], user["username"])
    rates = commissions_mod.rate_summary(
        int(net.get("left_count") or 0),
        int(net.get("right_count") or 0),
        str(net.get("role") or "trader"),
    )
    return {**user, "network": net, "commissions": rates}


@app.delete("/api/auth/account")
def auth_delete_account(user: dict | None = Depends(_auth_user)):
    """حذف الحساب من داخل التطبيق — شرط إلزامي لأبل (App Store Review Guideline
    5.1.1(v)). راجع db.delete_user_account للتفصيل الكامل لآلية المحو."""
    if not user:
        raise HTTPException(status_code=401, detail="not authenticated")
    db.delete_user_account(user["user_id"])
    return {"ok": True}


@app.get("/api/commissions/plan")
def commissions_plan():
    return commissions_mod.plan_document()


@app.get("/api/commissions/me")
def commissions_me(user: dict | None = Depends(_auth_user)):
    if not user:
        raise HTTPException(status_code=401, detail="not authenticated")
    net = db.ensure_network_for_user(user["user_id"], user["username"])
    rates = commissions_mod.rate_summary(
        int(net.get("left_count") or 0),
        int(net.get("right_count") or 0),
        str(net.get("role") or "trader"),
    )
    return {"network": net, "rates": rates, "plan": commissions_mod.plan_document()}


@app.get("/api/commissions/tree")
def commissions_tree(depth: int = 5, user: dict | None = Depends(_auth_user)):
    if not user:
        raise HTTPException(status_code=401, detail="not authenticated")
    db.ensure_network_for_user(user["user_id"], user["username"])
    tree = db.get_network_tree(user["user_id"], depth=depth)
    return {"tree": tree}


class PlaceMemberBody(BaseModel):
    username: str = Field(min_length=3, max_length=32)
    password: str | None = Field(default=None, max_length=128)
    side: Literal["left", "right"]
    role: Literal["trader", "trainer", "broker", "agent", "company"] = "trader"
    under_user_id: int | None = None


@app.post("/api/commissions/place")
def commissions_place(body: PlaceMemberBody, user: dict | None = Depends(_auth_user)):
    if not user:
        raise HTTPException(status_code=401, detail="not authenticated")
    db.ensure_network_for_user(user["user_id"], user["username"])
    try:
        return db.place_under_sponsor(
            user["user_id"],
            body.username,
            body.password,
            body.side,
            body.role,
            under_user_id=body.under_user_id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/commissions/report")
def commissions_report(user: dict | None = Depends(_auth_user)):
    if not user:
        raise HTTPException(status_code=401, detail="not authenticated")
    db.ensure_network_for_user(user["user_id"], user["username"])
    return db.get_commission_report(user["user_id"])


@app.post("/api/push/register")
def push_register(body: PushRegister, user: dict | None = Depends(_auth_user)):
    uid = user["user_id"] if user else None
    db.save_push_token(body.token, body.platform, uid, body.lang)
    return {"ok": True}


@app.get("/api/layouts")
def layouts_list(user: dict | None = Depends(_auth_user)):
    uid = user["user_id"] if user else None
    return {"layouts": db.list_layouts(uid)}


@app.post("/api/layouts")
def layouts_save(body: LayoutSave, user: dict | None = Depends(_auth_user)):
    uid = user["user_id"] if user else None
    # db.save_layout يتولّى توليد معرّف فريد عند غيابه ويمنع الكتابة فوق تخطيط مالك آخر
    saved = db.save_layout(body.id, body.name, body.payload, uid)
    return {"ok": True, "layout": saved}


@app.get("/api/watchlist/custom")
def custom_watchlist(user: dict | None = Depends(_auth_user)):
    uid = user["user_id"] if user else None
    syms = db.get_watchlist(uid)
    return {"symbols": syms}


@app.post("/api/watchlist/custom")
def custom_watchlist_add(body: WatchlistAdd, user: dict | None = Depends(_auth_user)):
    uid = user["user_id"] if user else None
    syms = db.add_watchlist_symbol(body.symbol.upper(), uid)
    return {"ok": True, "symbols": syms}


@app.get("/api/academy/progress")
def academy_progress_get(user: dict | None = Depends(_auth_user)):
    if not user:
        return {"progress": []}
    return {"progress": db.get_progress(user["user_id"])}


@app.post("/api/academy/progress")
def academy_progress_save(body: ProgressSave, user: dict = Depends(_auth_user)):
    item = db.save_progress(
        user["user_id"],
        body.school_id,
        body.lecture_id,
        body.segment_index,
        body.completed,
    )
    return {"ok": True, "progress": item}


@app.get("/api/symbols/search")
def symbols_search(q: str = "", limit: int = 20):
    if not q.strip():
        return {"results": []}
    if not market.configured():
        raise HTTPException(status_code=503, detail="Twelve Data not configured")
    try:
        results = market.symbol_search(q, limit=min(limit, 30))
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {"results": results}


@app.get("/api/terminal")
def terminal_layout(
    tf0: str = "15m",
    tf1: str = "1H",
    tf2: str = "4H",
    dxy_tf: str = "15m",
):
    """DXY + 3 frames in one call (cache-friendly for shared Twelve Data quota)."""
    frames = ["EURUSD", "GBPUSD", "XAUUSD"]
    tfs = [tf0, tf1, tf2]
    return {
        "dxy": build_series("DXY", dxy_tf),
        "frames": [build_series(s, tfs[i]) for i, s in enumerate(frames)],
        "frame_sizes": ["small", "medium", "large"],
        "timeframes": list(TF_SECONDS.keys()),
        "market": market.status(),
    }


@app.get("/api/watchlist")
def watchlist():
    """Symbol catalog only — no bulk API burn (robot shares the same key)."""
    return {
        "symbols": [
            {"symbol": sym, "td_symbol": market.td_symbol(sym)}
            for sym in market.SYMBOL_MAP
        ],
        "market": market.status(),
    }


@app.get("/api/charts/{symbol}")
def chart(symbol: str, timeframe: str = "15m", outputsize: int = 180):
    return build_series(symbol, timeframe, outputsize)


@app.get("/api/alerts")
def list_alerts(user: dict | None = Depends(_auth_user)):
    uid = user["user_id"] if user else None
    return {"alerts": db.list_alerts(uid)}


@app.post("/api/alerts")
def create_alert(body: AlertCreate, user: dict | None = Depends(_auth_user)):
    alert = {
        "id": _new_id("a"),
        "symbol": body.symbol.upper(),
        "condition": body.condition,
        "price": round(body.price, 5),
        "note": body.note.strip(),
        "active": True,
        "triggered": False,
        "ts": datetime.now(timezone.utc).isoformat(),
    }
    uid = user["user_id"] if user else None
    db.create_alert(alert, uid)
    return {"ok": True, "alert": alert}


@app.patch("/api/alerts/{alert_id}")
def update_alert(alert_id: str, body: AlertCreate, user: dict | None = Depends(_auth_user)):
    """تعديل ذرّي للتنبيه (بدل إنشاء جديد ثم حذف القديم) — يُعيد تفعيله. 404 إن لم يوجد أو لا يملكه."""
    data = {
        "symbol": body.symbol.upper(),
        "condition": body.condition,
        "price": round(body.price, 5),
        "note": body.note.strip(),
        "ts": datetime.now(timezone.utc).isoformat(),
    }
    uid = user["user_id"] if user else None
    alert = db.update_alert(alert_id, data, uid)
    if alert is None:
        raise HTTPException(status_code=404, detail="alert not found")
    return {"ok": True, "alert": alert}


@app.delete("/api/alerts/{alert_id}")
def delete_alert(alert_id: str, user: dict | None = Depends(_auth_user)):
    uid = user["user_id"] if user else None
    return {"ok": db.delete_alert(alert_id, uid)}


@app.post("/api/alerts/check")
def check_alerts(user: dict | None = Depends(_auth_user)):
    """يفحص تنبيهات المستدعي فقط ويعيدها (كان يعيد تنبيهات كل المستخدمين فتستبدل قائمة العميل)."""
    uid = user["user_id"] if user else None
    triggered: list[dict] = []
    for a in db.list_alerts(uid):
        if not a.get("active") or a.get("triggered"):
            continue
        q = _alert_price(a["symbol"])
        if q is None:
            continue
        hit = (a["condition"] == "above" and q >= a["price"]) or (
            a["condition"] == "below" and q <= a["price"]
        )
        if hit:
            db.mark_alert_triggered(a["id"])
            triggered.append({**a, "current": q})
    return {"triggered": triggered, "alerts": db.list_alerts(uid)}


def _check_indicator_alert(alert: dict, candles: list[dict]) -> bool:
    snap = ind_engine.snapshot(
        [{"close": c["close"], "open": c["open"], "high": c["high"], "low": c["low"]} for c in candles],
        fast=int(alert.get("fast_period") or 9),
        slow=int(alert.get("slow_period") or 21),
    )
    at = alert["alert_type"]
    cond = alert["condition"]
    if at == "rsi":
        rsi_v = snap.get("rsi")
        if rsi_v is None or alert.get("value") is None:
            return False
        if cond == "above":
            return rsi_v >= float(alert["value"])
        if cond == "below":
            return rsi_v <= float(alert["value"])
    if at == "ma_cross":
        if cond == "cross_up":
            return bool(snap.get("ma_cross_up"))
        if cond == "cross_down":
            return bool(snap.get("ma_cross_down"))
    if at == "macd_cross":
        if cond == "cross_up":
            return bool(snap.get("macd_cross_up"))
        if cond == "cross_down":
            return bool(snap.get("macd_cross_down"))
    return False


@app.get("/api/indicator-alerts")
def list_indicator_alerts(user: dict | None = Depends(_auth_user)):
    uid = user["user_id"] if user else None
    return {"alerts": db.list_indicator_alerts(uid)}


@app.post("/api/indicator-alerts")
def create_indicator_alert(body: IndicatorAlertCreate, user: dict | None = Depends(_auth_user)):
    alert = {
        "id": _new_id("ia"),
        "symbol": body.symbol.upper(),
        "timeframe": body.timeframe,
        "alert_type": body.alert_type,
        "condition": body.condition,
        "value": body.value,
        "fast_period": body.fast_period,
        "slow_period": body.slow_period,
        "note": body.note.strip(),
        "active": True,
        "triggered": False,
        "ts": datetime.now(timezone.utc).isoformat(),
    }
    uid = user["user_id"] if user else None
    db.create_indicator_alert(alert, uid)
    return {"ok": True, "alert": alert}


@app.delete("/api/indicator-alerts/{alert_id}")
def delete_indicator_alert(alert_id: str, user: dict | None = Depends(_auth_user)):
    uid = user["user_id"] if user else None
    return {"ok": db.delete_indicator_alert(alert_id, uid)}


@app.post("/api/indicator-alerts/check")
def check_indicator_alerts(user: dict | None = Depends(_auth_user)):
    """تنبيهات المستدعي فقط (نفس قاعدة الرؤية في /api/indicator-alerts)."""
    uid = user["user_id"] if user else None
    triggered: list[dict] = []
    for a in db.list_indicator_alerts(uid):
        if not a.get("active") or a.get("triggered"):
            continue
        try:
            series = build_series(a["symbol"], a["timeframe"])
            candles = [c.model_dump() for c in series.candles]
        except Exception:
            continue
        if _check_indicator_alert(a, candles):
            db.mark_indicator_alert_triggered(a["id"])
            triggered.append(a)
    return {"triggered": triggered, "alerts": db.list_indicator_alerts(uid)}


@app.post("/api/screener/run")
def screener_run(body: ScreenerRun):
    hits = screener_engine.run_scan(
        timeframe=body.timeframe,
        filters=body.filters,
        symbols=body.symbols,
        fast=body.fast,
        slow=body.slow,
    )
    return {
        "results": hits,
        "count": len(hits),
        "provider_configured": market.configured(),
    }


@app.get("/api/screener/filters")
def screener_filters():
    return {
        "filters": [
            {"id": "rsi_oversold", "label": "RSI oversold (<30)"},
            {"id": "rsi_overbought", "label": "RSI overbought (>70)"},
            {"id": "ma_cross_up", "label": "تقاطع MA صعودي"},
            {"id": "ma_cross_down", "label": "تقاطع MA هبوطي"},
            {"id": "macd_cross_up", "label": "MACD cross up"},
            {"id": "bullish", "label": "زخم صاعد"},
            {"id": "bearish", "label": "زخم هابط"},
        ]
    }


@app.post("/api/backtest")
def backtest_run(body: BacktestRun):
    series = build_series(body.symbol.upper(), body.timeframe)
    candles = [c.model_dump() for c in series.candles]
    result = backtest_engine.run_backtest(
        candles,
        strategy=body.strategy,
        fast=body.fast,
        slow=body.slow,
        rsi_low=body.rsi_low,
        rsi_high=body.rsi_high,
    )
    result["symbol"] = body.symbol.upper()
    result["timeframe"] = body.timeframe
    return result


@app.get("/api/indicators/library")
def indicators_library():
    return {
        "pine_presets": [
            {"id": "sma9", "name": "SMA 9", "formula": "sma(close,9)"},
            {"id": "sma21", "name": "SMA 21", "formula": "sma(close,21)"},
            {"id": "ema50", "name": "EMA 50", "formula": "ema(close,50)"},
            {"id": "rsi14", "name": "RSI 14", "formula": "rsi(close,14)"},
            {"id": "atr14", "name": "ATR 14", "formula": "atr(14)"},
            {"id": "stoch14", "name": "Stoch 14", "formula": "stoch(14)"},
            {"id": "macd", "name": "MACD line", "formula": "macd"},
            {"id": "bb_mid", "name": "BB Mid", "formula": "bbmid(20)"},
            {"id": "bb_upper", "name": "BB Upper", "formula": "bbupper(20)"},
            {"id": "close", "name": "Close", "formula": "close"},
            {"id": "hlc3", "name": "HLC3", "formula": "hlc3"},
        ]
    }


@app.get("/api/indicators/snapshot/{symbol}")
def indicator_snapshot(symbol: str, timeframe: str = "15m"):
    series = build_series(symbol.upper(), timeframe)
    candles = [c.model_dump() for c in series.candles]
    snap = ind_engine.snapshot(candles)
    return snap


@app.get("/api/signals/social/sources")
def social_sources():
    return {"sources": signal_hub.list_social_sources()}


@app.post("/api/signals/social/consensus")
def social_consensus(body: SocialConsensusBody):
    series = build_series(body.symbol.upper(), body.timeframe)
    return signal_hub.social_consensus(
        body.symbol,
        body.source_ids,
        last=series.last,
    )


@app.get("/api/signals/analysts/{symbol}")
def analysts_forecast(symbol: str, timeframe: str = "15m"):
    series = build_series(symbol.upper(), timeframe)
    return signal_hub.analysts_forecast(symbol, last=series.last)


@app.post("/api/signals/indicators/forecast")
def indicators_forecast(body: IndicatorForecastBody):
    series = build_series(body.symbol.upper(), body.timeframe)
    candles = [c.model_dump() for c in series.candles]
    return signal_hub.indicator_forecast(body.symbol, candles, enabled=body.indicators)


@app.get("/api/calendar")
def economic_calendar(currency: str | None = None, impact: str | None = None):
    return {"events": econ_calendar.fetch_calendar(currency=currency, impact=impact)}


@app.get("/api/market/quote/{symbol}")
def market_quote(symbol: str):
    book = market.fetch_quote_book(symbol.upper())
    if not book:
        series = build_series(symbol.upper(), "15m")
        last = series.last
        spread = last * 0.00008
        return {
            "symbol": symbol.upper(),
            "price": last,
            "bid": last - spread / 2,
            "ask": last + spread / 2,
            "source": "ohlc_fallback",
        }
    book["source"] = "twelvedata"
    return book


@app.get("/api/trades")
def trades_list(user: dict | None = Depends(_auth_user)):
    uid = user["user_id"] if user else None
    return {"trades": db.list_trades(uid), "stats": db.trade_stats(uid)}


@app.post("/api/trades")
def trades_create(body: TradeCreate, user: dict | None = Depends(_auth_user)):
    uid = user["user_id"] if user else None
    row = db.add_trade(body.model_dump(), uid)
    return {"ok": True, "trade": row, "stats": db.trade_stats(uid)}


@app.post("/api/trades/{trade_id}/close")
def trades_close(trade_id: str, body: TradeClose, user: dict | None = Depends(_auth_user)):
    uid = user["user_id"] if user else None
    row = db.close_trade(trade_id, body.exit, uid)
    if not row:
        raise HTTPException(404, "trade not found")
    return {"ok": True, "trade": row, "stats": db.trade_stats(uid)}


@app.delete("/api/trades/{trade_id}")
def trades_delete(trade_id: str, user: dict | None = Depends(_auth_user)):
    uid = user["user_id"] if user else None
    ok = db.delete_trade(trade_id, uid)
    if not ok:
        raise HTTPException(404, "trade not found")
    return {"ok": True, "stats": db.trade_stats(uid)}


@app.get("/api/chat/group")
def group_chat(user: dict | None = Depends(_auth_user)):
    return {"messages": db.group_messages(user["user_id"] if user else None)}


@app.post("/api/chat/group")
def post_group(msg: ChatMessage, user: dict | None = Depends(_auth_user)):
    # كانت بلا مصادقة واسم المرسل نص حرّ من العميل («أنت» دائماً) → الجميع «أنت» وانتحال سهل.
    # الآن المشاركة للمسجّل فقط وباسم حسابه؛ القراءة تبقى متاحة للجميع.
    if not user:
        return {"ok": False, "error": "login_required"}
    text = msg.text.strip()
    if not text:
        return {"ok": False, "error": "empty"}
    item = {
        "id": _new_id("g"),
        "user": user["username"],
        "text": text,
        "ts": datetime.now().strftime("%H:%M"),
        "room": "group",
    }
    db.add_group_message(item, user["user_id"])
    return {"ok": True, "message": {**item, "mine": True}}


# --- الرسائل الخاصة معطّلة للإطلاق العام ---
# كانت مسارات /api/dm بلا أي مصادقة أو عزل لكل مستخدم: أي أحد يقرأ أي محادثة عبر
# GET /api/dm/{peer} ويرسل باسم أي أحد (from_user نص حرّ) — أي «رسائل خاصة» ليست خاصة.
# تبويب الرسائل مخفيّ في العميل ضمن الـMVP، و410 هنا تُغلق السطح على مستوى الـAPI أيضاً.
# لإعادة التفعيل: أعد البناء بمصادقة توكن (user_id للمرسل والمستقبل، والمحادثة معزولة
# للمستدعي). دوال db.dm_* تبقى سليمة لذلك البناء.
_DM_DISABLED_DETAIL = "الرسائل الخاصة غير متاحة حالياً"


@app.get("/api/dm")
def list_dm():
    raise HTTPException(status_code=410, detail=_DM_DISABLED_DETAIL)


@app.get("/api/dm/{peer}")
def get_dm(peer: str):
    raise HTTPException(status_code=410, detail=_DM_DISABLED_DETAIL)


@app.post("/api/dm")
def send_dm(body: DmSend):
    raise HTTPException(status_code=410, detail=_DM_DISABLED_DETAIL)


@app.get("/api/votes")
def list_votes(user: dict | None = Depends(_auth_user)):
    return {"votes": db.list_votes(user["user_id"] if user else None)}


@app.post("/api/votes")
def create_vote(body: VoteCreate, user: dict | None = Depends(_auth_user)):
    item = {
        "id": _new_id("v"),
        "symbol": body.symbol.upper(),
        "direction": body.direction,
        "entry": body.entry,
        "sl": body.sl,
        "tp": body.tp,
        "note": body.note,
        "agree": 0,
        "disagree": 0,
        # كان "أنت" ثابتاً لكل فكرة → كل متداول يرى أفكار غيره «بواسطة أنت» (وبالعربية حتى بواجهة
        # إنجليزية). الآن اسم المستخدم للمسجّل، ولا مؤلّف للمجهول (الواجهة تُخفي السطر).
        "author": user["username"] if user else None,
        "ts": datetime.now().strftime("%H:%M"),
    }
    db.create_vote(item)
    return {"ok": True, "vote": item}


@app.post("/api/votes/ballot")
def ballot(body: VoteBallot, user: dict | None = Depends(_auth_user)):
    # صوت واحد لكل حساب — المجهول لا يُعرَّف فلا يُحتسب صوته (كان يقدر يضخّم العدّاد بلا حد)
    if not user:
        return {"ok": False, "error": "login_required"}
    v = db.ballot(body.vote_id, body.choice, user["user_id"])
    if not v:
        return {"ok": False, "error": "vote not found"}
    return {"ok": True, "vote": v}


@app.get("/api/news")
def news():
    return {"news": news_feed.fetch_news()}


@app.get("/api/academy/schools")
def academy_schools():
    return {"schools": get_schools_summary()}


@app.get("/api/academy/schools/{school_id}")
def academy_school(school_id: str):
    school = get_school(school_id)
    if not school:
        return {"error": "not found"}
    return school


@app.get("/api/academy/schools/{school_id}/lectures/{lecture_id}")
def academy_lecture(school_id: str, lecture_id: str):
    lec = get_lecture(school_id, lecture_id)
    if not lec:
        return {"error": "not found"}
    return lec


class AcademyTtsRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    voice_id: str | None = None


@app.get("/api/academy/voice/status")
def academy_voice_status():
    return tts.status()


@app.get("/api/academy/audio/{file_id}")
def academy_audio_file(file_id: str):
    safe = "".join(c for c in file_id if c.isalnum() or c in "-_")
    path = tts.CACHE_DIR / f"{safe}.mp3"
    if not path.exists():
        raise HTTPException(status_code=404, detail="audio not found")
    return FileResponse(path, media_type="audio/mpeg", filename=path.name)


@app.post("/api/academy/tts")
def academy_tts(body: AcademyTtsRequest):
    if not tts.configured():
        raise HTTPException(status_code=503, detail="ElevenLabs not configured")
    try:
        path = tts.synthesize(body.text, body.voice_id)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {
        "ok": True,
        "audio_url": f"/api/academy/audio/{path.stem}",
        "voice_id": tts.resolve_voice_id(),
    }


@app.post("/api/academy/interrupt")
def academy_interrupt(body: TeacherInterrupt):
    lec = get_lecture(body.school_id, body.lecture_id)
    if not lec:
        return {"ok": False, "error": "lecture not found"}

    seg_title = "المقطع الحالي"
    seg_text = ""
    for seg in lec.get("script_segments", []):
        if body.segment_id and seg["id"] == body.segment_id:
            seg_title = seg["title"]
            seg_text = seg["narration"]
            break
    if not seg_text and lec.get("script_segments"):
        seg = lec["script_segments"][0]
        seg_title = seg["title"]
        seg_text = seg["narration"]

    segs = lec.get("script_segments", [])
    resume_from = 0
    if body.segment_id:
        for i, seg in enumerate(segs):
            if seg["id"] == body.segment_id:
                resume_from = i
                break

    q = body.question.strip()
    lang = openrouter_ai.normalize_lang(body.lang)
    if openrouter_ai.configured():
        try:
            clarification = openrouter_ai.interrupt_answer(q, seg_title, seg_text, lang)
            return {
                "ok": True,
                "paused": True,
                "teacher": "شرح صوتي",
                "clarification": clarification,
                "resume_segment_index": resume_from,
            }
        except Exception:
            pass

    if lang == "en":
        # بلا اقتباس عنوان/نص المقطع لأن محتوى الدروس عربي — القالب يبقى إنجليزياً بالكامل.
        clarification = (
            "The narration is paused for a moment.\n\n"
            "About your question:\n"
            "- Try the idea on the screen in its simplest form first.\n"
            "- Apply it to a single chart before combining it with anything else.\n"
            "- If you need an example on a specific pair, ask for it.\n\n"
            "Now let's continue the lecture from the same segment."
        )
        return {
            "ok": True,
            "paused": True,
            "teacher": "شرح صوتي",
            "clarification": clarification,
            "resume_segment_index": resume_from,
        }

    clarification = (
        f"توقف الشرح مؤقتاً. كنت أشرح «{seg_title}».\n\n"
        f"خلاصة المقطع: {seg_text}\n\n"
        f"بخصوص سؤالك «{q}»:\n"
        f"- سأبسّطه عملياً على الشاشة.\n"
        f"- طبّقه على شارت واحد أولاً.\n"
        f"- إذا احتجت مثالاً على زوج محدد اطلبه.\n\n"
        f"الآن نكمل المحاضرة من نفس المقطع."
    )

    return {
        "ok": True,
        "paused": True,
        "teacher": "شرح صوتي",
        "clarification": clarification,
        "resume_segment_index": resume_from,
    }


@app.get("/api/courses")
def courses():
    cards = []
    for s in get_schools_summary():
        cards.append(
            {
                "id": s["id"],
                "school": s["name_ar"],
                "title": s["name_ar"],
                "level": f"{s['levels_count']} مستويات",
                "lessons": s["lectures_count"],
                "ai_tutor": True,
                "progress": s["progress"],
                "desc": s["summary"],
            }
        )
    return {"courses": cards}


@app.get("/api/courses/{course_id}")
def course_detail(course_id: str):
    school = get_school(course_id)
    if not school:
        return {"error": "not found"}
    return {
        "id": school["id"],
        "school": school["name_ar"],
        "title": school["name_ar"],
        "level": f"حتى مستوى {school['max_level']}",
        "lessons": sum(len(lv["lectures"]) for lv in school["levels"]),
        "ai_tutor": True,
        "progress": 0,
        "desc": school["summary"],
        "modules": [
            {
                "id": f"lv{lv['level']}",
                "title": f"المستوى {lv['level']}: {lv['title']}",
                "ai_quiz": True,
            }
            for lv in school["levels"]
        ],
        "ai_intro": (
            f"مدرسة {school['name_ar']}: شاشة كاملة مع شرح صوتي. "
            f"يمكنك إيقاف الشرح في أي لحظة لتسأل عن جزء غير واضح."
        ),
    }


@app.post("/api/ai/ask")
def ai_ask(body: AiAsk):
    q = body.question.strip()
    sym = (body.symbol or "EURUSD").upper()
    lang = openrouter_ai.normalize_lang(body.lang)
    series = build_series(sym)
    bias = "صاعد" if series.change_pct >= 0 else "هابط"
    win = 55 + abs(hash(q + sym) % 28)
    direction = "شراء" if series.change_pct >= 0 else "بيع"
    entry = series.last
    sl = round(entry * (0.996 if direction == "شراء" else 1.004), 5 if entry < 50 else 2)
    tp = round(entry * (1.008 if direction == "شراء" else 0.992), 5 if entry < 50 else 2)

    context = (
        f"last={series.last}, change_pct={series.change_pct:+.2f}%, "
        f"tf={series.timeframe}, bias={bias}"
    )
    if openrouter_ai.configured():
        try:
            answer = openrouter_ai.trading_answer(q, sym, context, lang)
            setup = openrouter_ai.parse_setup_hint(answer)
            setup["entry"] = entry
            setup["sl"] = sl
            setup["tp"] = tp
            return {"answer": answer, "symbol": sym, "setup": setup}
        except Exception:
            pass

    if lang == "en":
        # نفس القالب التعليمي بالإنجليزية لمستخدمي en-US/en-GB (بلا اقتباس السؤال: بعض الأسئلة
        # قوالب داخلية عربية). الكردية تبقى على القالب العربي (نفس الأبجدية) لغياب مراجعة لغوية.
        bias_en = "bullish" if series.change_pct >= 0 else "bearish"
        dir_en = "Buy" if direction == "شراء" else "Sell"
        answer = (
            f"**Quick read on {sym}**\n\n"
            f"The short-term trend on the current timeframe looks **{bias_en}** "
            f"(approx. change {series.change_pct:+.2f}%).\n\n"
            f"- Check the pair against **DXY** before entering.\n"
            f"- Wait for a confirmed break or rejection at the nearest liquidity zone.\n"
            f"- Risk management: never risk more than 1% of your capital per trade.\n\n"
            f"**Suggested scenario (educational, not financial advice):**\n"
            f"- Direction: {dir_en}\n"
            f"- Entry: {entry}\n"
            f"- Stop: {sl}\n"
            f"- Target: {tp}\n"
            f"- Estimated success probability: **{win}%**\n\n"
            f"_Local MVP model — connect OpenRouter for deeper analysis._"
        )
    else:
        answer = (
            f"**تحليل سريع لـ {sym}**\n\n"
            f"الاتجاه اللحظي على الإطار الحالي يبدو **{bias}** "
            f"(تغيّر تقريبي {series.change_pct:+.2f}%).\n\n"
            f"بالنسبة لسؤالك: «{q}»\n"
            f"- راقب علاقة الزوج مع **DXY** قبل الدخول.\n"
            f"- انتظر تأكيد كسر/رفض عند أقرب منطقة سيولة.\n"
            f"- إدارة المخاطر: لا تتجاوز 1% من رأس المال للصفقة.\n\n"
            f"**سيناريو مقترح (تعليمي وليس نصيحة مالية):**\n"
            f"- الاتجاه: {direction}\n"
            f"- دخول: {entry}\n"
            f"- وقف: {sl}\n"
            f"- هدف: {tp}\n"
            f"- احتمال نجاح تقديري: **{win}%**\n\n"
            f"_هذا النموذج MVP محلي — اربطه بـ OpenRouter لاحقاً لتحليل أعمق._"
        )
    return {
        "answer": answer,
        "symbol": sym,
        "setup": {
            "direction": "buy" if direction == "شراء" else "sell",
            "entry": entry,
            "sl": sl,
            "tp": tp,
            "win_probability": win,
        },
    }


@app.websocket("/ws/ticks")
async def ticks(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            live = td_ws.snapshot()
            if live:
                payload = {
                    "ts": time.time(),
                    "ticks": live,
                    "source": "twelvedata_ws",
                    "data_source": {"kind": "provider", "as_of": time.time(), "channel": "twelvedata_ws"},
                }
            else:
                payload = {
                    "ts": time.time(),
                    "source": "fallback",
                    "data_source": {"kind": "demo", "as_of": time.time(), "channel": "ws_seed"},
                    "ticks": {
                        sym: round(
                            base * (1 + random.uniform(-0.0004, 0.0004)),
                            5 if base < 50 else 2,
                        )
                        for sym, base in SYMBOL_BASES.items()
                    },
                }
            await ws.send_json(payload)
            await asyncio.sleep(1.0)
    except WebSocketDisconnect:
        return


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=API_PORT, reload=True)
