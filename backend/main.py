"""
MATRIX API — منصة تحليل فني للفوركس
معزولة تماماً عن روبوت التداول Matrix/MT5 وجسوره وعن سوق العراق
المنفذ الافتراضي: 8100
"""
from __future__ import annotations

import asyncio
import json
import math
import os
import re
import secrets
import time
import unicodedata
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from typing import Annotated, Literal

from pathlib import Path

from dotenv import load_dotenv
from fastapi import BackgroundTasks, Depends, FastAPI, Header, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field, field_validator, model_validator

from academy_data import get_lecture, get_school, get_schools_summary
import elevenlabs_tts as tts
import twelve_data as market
import twelve_data_ws as td_ws
import db
from core.auth import _auth_user, _install_key, _owner_key
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

_LONE_SURROGATE_ESC = re.compile(rb"\\u[dD][89a-fA-F][0-9a-fA-F]{2}")


def _has_lone_surrogate(v) -> bool:
    if isinstance(v, str):
        return any("\ud800" <= ch <= "\udfff" for ch in v)
    if isinstance(v, dict):
        return any(_has_lone_surrogate(k) or _has_lone_surrogate(x) for k, x in v.items())
    if isinstance(v, list):
        return any(_has_lone_surrogate(x) for x in v)
    return False


@app.middleware("http")
async def _reject_lone_surrogates(request: Request, call_next):
    """`"\\ud800"` بمفرده JSON صالح ومحلّل بايثون يقبله، لكن SQLite وترميز الردّ لا يرمّزانه UTF-8 ⇒ 500 على
    رسائل المجموعة والأفكار والبلاغات والتسجيل ووضع العضو، و400/401 يحمل خطأ الترميز الخام بالدخول. 422
    هنا لكل المسارات (زوج صحيح كـ`\\ud83d\\ude00` يصير حرفاً واحداً فلا يُرفض). يُضاف قبل CORS ⇒ الردّ برؤوسه."""
    if request.method in ("POST", "PUT", "PATCH"):
        body = await request.body()
        if _LONE_SURROGATE_ESC.search(body):
            try:
                parsed = json.loads(body)
            except ValueError:
                parsed = None
            if _has_lone_surrogate(parsed):
                return JSONResponse(status_code=422, content={"detail": [{
                    "type": "string_unicode", "loc": ["body"], "msg": "Text contains an invalid character",
                    "input": None}]})
    return await call_next(request)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _json_safe(v):
    """قيمة صالحة لـJSON قياسي: `inf`/`nan` تصير نصّها، والبقية كما هي (تنازلياً بالقوائم والقواميس)."""
    if isinstance(v, float) and not math.isfinite(v):
        return repr(v)
    if isinstance(v, dict):
        return {k: _json_safe(x) for k, x in v.items()}
    if isinstance(v, (list, tuple)):
        return [_json_safe(x) for x in v]
    return v


@app.exception_handler(PermissionError)
async def _account_gone_is_401(request: Request, exc: PermissionError):
    """`db._lock_owner`: الحساب حُذف (أو خرج) بين المصادقة والكتابة ⇒ 401 لا 500 ولا صفّ يتيم."""
    return JSONResponse(status_code=401, content={"detail": "login_required"})


@app.exception_handler(RequestValidationError)
async def _validation_error_stays_422(request: Request, exc: RequestValidationError):
    """**خطأ تصديق برقم غير منتهٍ كان يخرج 500 لا 422** — بكل مسارات الخادم لا بالصفقات وحدها.

    معالج FastAPI الافتراضي يُعيد القيمة المرفوضة نفسها داخل جسم الـ422 (`input`)، و
    `json.dumps` القياسي يرفض `Infinity`/`NaN` فيرمي ValueError **بعد** أن نجح التصديق بعمله:
    العميل يرى «خطأ خادم» على جسمٍ هو من أرسله، ويُسجَّل بسجلّ الأعطال كأنه عطب بالخادم.
    ومحلّل JSON ببايثون يقبل `Infinity` حرفياً، فالجسم يصل سليماً حتى نهاية التصديق.

    الشكل نفسه (`{"detail": [...]}`) كي لا يتغيّر عقد الخطأ على أيّ عميل — القيمة غير المنتهية
    وحدها تُعرض نصّاً — و`jsonable_encoder` يبقى كما بالمعالج الافتراضي لأن `ctx` بأخطاء
    `model_validator` يحمل كائن `ValueError` نفسه (إسقاطه كان يُسقط 14 اختباراً قائماً بـ500)."""
    errors = exc.errors()
    for e in errors:
        # جسم التخطيط المرفوض لعمقه/حجمه كان يُعاد كاملاً بـ`input` ⇒ `jsonable_encoder` التعاودي يفشل
        # (500 بدل 422) أو 20MB تُعاد. لا يُعاد ما رُفض لأنه كبير.
        v = e.get("input")
        if isinstance(v, (dict, list)) and _json_depth(v) > LAYOUT_DEPTH_MAX:
            e["input"] = None
        elif isinstance(v, (dict, list, str)) and len(json.dumps(v, default=str)) > 10_000:
            e["input"] = None
        elif _has_lone_surrogate(v):
            # بايتات UTF-8 خام لبديل منفرد (ED A0 80) أو جسم UTF-16 يجتازان الوسيط (يبحث عن `\ud800`
            # المهرَّب فقط): التصديق يرفضه `string_unicode` صحيحاً، لكن إعادته بـ`input` تفشل بترميز الردّ ⇒ 500
            e["input"] = None
    return JSONResponse(status_code=422, content={"detail": _json_safe(jsonable_encoder(errors))})


# ─── Models ───────────────────────────────────────────────────────────────────

class Candle(BaseModel):
    time: int
    open: float
    high: float
    low: float
    close: float
    # None = المصدر لا يعطي فوليوماً (الفوركس) — لا صفر مخترَع
    volume: float | None = None


class DataProvenance(BaseModel):
    """Honest candle/tick origin — never imply live market from HTTP/WS alone."""

    kind: Literal["provider", "demo", "cache", "unavailable", "unknown"] = "unknown"
    as_of: float | None = None
    channel: str | None = None
    # لماذا ليست بيانات مزوّد (مثلاً `not_offered_by_provider` لـDXY) — None حين لا سبب معروف.
    unavailable_reason: str | None = None


class ChartSeries(BaseModel):
    symbol: str
    timeframe: str
    candles: list[Candle]
    # None = لا سعر أصلاً (رمز لا يقدّمه المزوّد — DXY): لا شموع ولا إغلاق ولا نسبة، لا رقم مكتوب باليد
    change_pct: float | None
    # الشموع التي تغطّيها `change_pct` (أول إغلاق ← آخره = N−1): 180 شمعة يومية ≈ 6 أشهر، لا «تغيّر اليوم».
    # كـ`change_bars` بـ`/api/indicators/snapshot`. None حين لا نسبة.
    change_bars: int | None = None
    last: float | None
    data_source: DataProvenance = Field(default_factory=DataProvenance)


class ChatMessage(BaseModel):
    # الحقول الأخرى التي ترسلها نسخ أقدم (id/user/ts/room/peer) تُتجاهَل: الخادم يحدد المعرّف
    # والوقت واسم المرسل من التوكن — الاسم لم يعد نصاً حرّاً يتيح انتحال أي متداول.
    text: str = Field(min_length=1, max_length=1000)


class VoteCreate(BaseModel):
    """فكرة تصويت. كان الرمز 1–20 حرفاً حرّاً (كل رمز آخر بالخادم 3–12) والمستويات أيّ float:
    رمز لا يُتابَع ولا يُنبَّه عليه، وأسعار سالبة، ووقف «شراء» فوق الدخول تُنشر للمجتمع كفكرة.
    التطبيق يمنعها (`analyzePlan`) لكن الخادم هو مصدر الحقيقة لما يراه الآخرون."""

    symbol: str = Field(min_length=3, max_length=12)
    direction: Literal["buy", "sell"]
    entry: float = Field(gt=0, allow_inf_nan=False, strict=True)
    sl: float = Field(gt=0, allow_inf_nan=False, strict=True)
    tp: float = Field(gt=0, allow_inf_nan=False, strict=True)
    note: str = Field(default="", max_length=500)

    @model_validator(mode="after")
    def _consistent(self) -> "VoteCreate":
        sym = self.symbol.strip().upper().replace("/", "")
        if not (3 <= len(sym) <= 12 and sym.isascii() and sym.isalnum()):
            raise ValueError("symbol must be 3-12 letters/digits")
        self.symbol = sym
        if self.direction == "buy" and not (self.sl < self.entry < self.tp):
            raise ValueError("buy idea needs sl < entry < tp")
        if self.direction == "sell" and not (self.tp < self.entry < self.sl):
            raise ValueError("sell idea needs tp < entry < sl")
        # وقف 5e-324 وهدف 1.7e308 كانا يُنشران: R:R عند العميل Infinity. لا أداة يتحرّك سعرها ×10 لفكرة
        # صفقة واحدة ⇒ المستويان ضمن عُشر الدخول وعشرة أضعافه (يكفي تقلّب العملات الرقمية نفسها).
        if not all(self.entry / 10 <= v <= self.entry * 10 for v in (self.sl, self.tp)):
            raise ValueError("sl/tp must be within 10x of entry")
        return self


class ContentReport(BaseModel):
    kind: Literal["group_message", "vote"]
    target_id: str = Field(min_length=1, max_length=64)
    reason: Literal["spam", "abuse", "scam", "other"] = "other"


# فلتر المحتوى عند النشر (شرط أبل 1.2: «طريقة لتصفية المحتوى المرفوض قبل نشره»). أشيع ضرر في
# مجتمعات الفوركس للمتداول الفردي: روابط «قنوات توصيات» و«إدارة حسابات» تجرّه لتيليغرام/واتساب
# أو مواقع احتيال. لا روابط في الرسائل والأفكار — النص فقط. متعمَّد أن يكون ضيقاً (لا قائمة شتائم
# بأربع لغات تحجب كلاماً بريئاً)؛ الإساءة تُعالَج بالبلاغ + الحظر.
_LINK_RE = db.LINK_RE  # نفس الفلتر يمنع الرابط باسم المستخدم (يظهر مؤلّفاً على كل رسالة)


def _blank(text: str) -> bool:
    """`strip()` لا يقطع محارف التنسيق (U+200B/FEFF/علامات الاتجاه) ⇒ رسالة «\u200b» فقاعة فارغة."""
    return not "".join(ch for ch in (text or "") if not ch.isspace() and unicodedata.category(ch) != "Cf")


_LINK_DOTS = str.maketrans({"\u3002": ".", "\uff61": "."})


def _has_link(text: str) -> bool:
    # «ｔ．ｍｅ/x» و«HTTPS：//x» (عرض كامل) و«t。me» و«t\u200b.me» كانت تمرّ: NFKC + النقطة الصينية + حذف
    # محارف التنسيق غير المرئية قبل الفحص (النصّ المحفوظ نفسه لا يتغيّر)
    norm = unicodedata.normalize("NFKC", text or "").translate(_LINK_DOTS)
    norm = "".join(ch for ch in norm if unicodedata.category(ch) != "Cf")
    return bool(_LINK_RE.search(norm))


class VoteBallot(BaseModel):
    # كالبلاغ (`ContentReport.target_id`): كان بلا حدّ ⇒ 5MB معرّف يُقبل ويُبحث عنه
    vote_id: str = Field(min_length=1, max_length=64)
    choice: Literal["agree", "disagree"]


def _not_blank(v: str) -> str:
    # «   » يجتاز `min_length` ثم يُقصّ فارغاً: سؤال فارغ يذهب للنموذج المدفوع («بخصوص سؤالك «»»)، ونصّ
    # صوت فارغ يرمي ValueError داخل `synthesize` فيُعاد 502 «خطأ المزوّد» لطلب لم يصل المزوّد أصلاً
    if not v.strip():
        raise ValueError("must not be blank")
    return v


class AiAsk(BaseModel):
    question: str = Field(min_length=2, max_length=2000)
    _q = field_validator("question")(_not_blank)
    # كان بلا حدّ: 100 ألف حرف تذهب لرابط المزوّد وموجّه النموذج المدفوع (حدّ `question` يُتجاوز به)
    symbol: str | None = Field(default=None, max_length=12)
    # لغة واجهة المتداول ('ar' | 'en-US' | 'en-GB' | 'ku'). اختياري: غيابه = عربي (عملاء أقدم).
    lang: str | None = Field(default=None, max_length=10)


class TeacherInterrupt(BaseModel):
    school_id: str
    lecture_id: str
    segment_id: str | None = None
    question: str = Field(min_length=2, max_length=2000)
    _q = field_validator("question")(_not_blank)
    # لغة واجهة المتعلّم (نفس قاعدة AiAsk). اختياري: غيابه = عربي (عملاء أقدم).
    lang: str | None = Field(default=None, max_length=10)


class DmSend(BaseModel):
    to_user: str
    text: str = Field(min_length=1, max_length=2000)
    from_user: str = "أنت"


# رمز يُحفظ ويُجلب لاحقاً (تنبيه/متابعة/ماسح): حروف لاتينية وأرقام وفواصل رموز المزوّد (EUR/USD، BRK.A،
# AAPL:BMV) فقط. سطر جديد أو NUL أو إيموجي أو حرف غير لاتيني كان يُحفظ «يراقب» ولا يعرفه المزوّد أبداً.
_SYMBOL_CHARS_RE = re.compile(r"[A-Z0-9][A-Z0-9/.:_&-]*")


def _symbol_chars(v: str) -> str:
    if not _SYMBOL_CHARS_RE.fullmatch(v):
        raise ValueError("symbol must be latin letters/digits")
    return v


def _alertable_symbol(v: str) -> str:
    """DXY لا يقدّمه المزوّد: تنبيه عليه يُحفظ «يراقب» ولا يُطلق أبداً (الـworker يسجّل «لا سعر» كل دقيقة).
    ويُقصّ ويُكبَّر أولاً: «EURUSD » كان يُحفظ بمسافته فلا يعرفه المزوّد ويبقى «يراقب» إلى الأبد، و« dxy»
    كان يتخطّى فحص DXY."""
    v = market.canonical_symbol(v)  # «EUR/USD» ⇒ «EURUSD»: وإلا لا قصّ جمعة ولا سعر WS المخزّن باسم MATRIX
    if len(v) < 3:
        raise ValueError("symbol too short")
    _symbol_chars(v)
    if market.unavailable_reason(v):
        raise ValueError("symbol unavailable at provider")
    return v


class AlertCreate(BaseModel):
    symbol: str = Field(min_length=3, max_length=12)
    condition: Literal["above", "below"]
    # `inf` كان يجتاز `gt=0` فيُحفظ ثم يسقط تسلسل JSON ⇒ كل GET/check لتنبيهات المالك 500 بعده
    price: float = Field(gt=0, allow_inf_nan=False, strict=True)
    # كملاحظة الدفتر/التصويت: بلا حدّ كان نصّ غير محدود يُخزَّن ويُرسل بالإشعار
    note: str = Field(default="", max_length=500)

    _sym = field_validator("symbol")(_alertable_symbol)


class AlertUpdate(AlertCreate):
    """تعديل تنبيه + الصفّ كما رآه العميل (`seen_*`، كقاعدة PATCH الصفقة). التعديل يكتب كل الحقول ويعيد
    التسليح، فجهاز بقائمة قديمة يحفظ ملاحظة كان يُرجِع المستوى الذي نقله جهاز آخر (1.2000 ⇒ 1.1000) بلا
    تنبيه، ويعيد تسليح تنبيه أُطلق بعد قراءته فيُطلق فوراً ويُدفع مرّة ثانية. مختلف ⇒ 409. غائب = بلا فحص."""

    seen_symbol: str | None = Field(default=None, max_length=40)  # صفّ قديم قد يحمل رمزاً أطول/غير مطبَّع
    seen_condition: Literal["above", "below"] | None = None
    seen_price: float | None = Field(default=None, gt=0, allow_inf_nan=False, strict=True)
    seen_triggered: bool | None = None
    seen_ts: str | None = Field(default=None, max_length=40)


def _alert_level(price: float) -> float:
    """مستوى التنبيه كما كتبه المتداول (10 أرقام معنوية تزيل ضجيج الفاصلة العائمة فقط). كان
    `round(price, 5)`: رمز تحت 0.00001 (SHIB/USD ‏0.0000123 بقائمة متابعة مخصّصة) يُحفظ 0.00001 أو **0**
    ⇒ «فوق 0» يُطلق بأول فحص ويُعرض مستوى لم يكتبه أحد؛ و`gt=0` لا يحرس ما بعد التقريب."""
    return float(f"{price:.10g}")


class AuthRegister(BaseModel):
    username: str = Field(min_length=3, max_length=32)
    email: str = Field(min_length=5, max_length=120)
    password: str = Field(min_length=db.PASSWORD_MIN, max_length=128)
    # التسجيل الذاتي «متداول» فقط: كان أي عميل يرسل `role: "company"` فيمنح نفسه 8 مستويات توازن
    # بخطة العمولات (`commissions.levels_for_role`) بلا أي تحقّق. التطبيق يرسل `trader` دائماً (`api.ts`).
    role: Literal["trader"] = "trader"
    sponsor_code: str | None = None
    side: Literal["left", "right"] | None = None


class AuthLogin(BaseModel):
    username: str = ""  # username or email
    email: str | None = None
    password: str


class PushRegister(BaseModel):
    # بلا حدّ أعلى: رمز 2MB يُخزَّن ويُعاد إرساله لـExpo مع كل إشعار للمالك
    token: str = Field(min_length=10, max_length=256)
    platform: str = Field(default="unknown", max_length=20)
    # لغة واجهة الجهاز (ar/en-US/en-GB/ku) — اختيارية؛ العملاء الأقدم لا يرسلونها
    lang: str | None = Field(default=None, max_length=10)


LAYOUT_PAYLOAD_MAX = 1_000_000  # تخطيط الطرفية مع رسومه أصغر بكثير
LAYOUT_DEPTH_MAX = 32  # التخطيط الحقيقي ~3 مستويات


def _json_depth(v: object) -> int:
    """عمق التداخل بلا تعاود (المدخل نفسه قد يكون أعمق من حدّ التعاود)."""
    deepest, stack = 0, [(v, 1)]
    while stack:
        node, d = stack.pop()
        if isinstance(node, (dict, list)):
            deepest = max(deepest, d)
            if d > LAYOUT_DEPTH_MAX:
                return d
            stack.extend((c, d + 1) for c in (node.values() if isinstance(node, dict) else node))
    return deepest


class LayoutSave(BaseModel):
    # العميل يرسل معرّفه المحلي فيبقى تخطيط واحد لكل تخطيط محلي (كان كل حفظ يُنشئ صفاً جديداً)
    id: str | None = Field(default=None, max_length=64)
    name: str = Field(min_length=1, max_length=64)
    payload: dict

    @field_validator("payload")
    @classmethod
    def _finite(cls, v: dict) -> dict:
        """NaN/Infinity متداخلة (`{"a": Infinity}` من عميل غير متصفّح) كانت تُحفظ ثم يفشل ترميز الردّ ⇒ 500،
        وكل `GET /api/layouts` للمالك 500 للأبد."""
        try:
            text = json.dumps(v, allow_nan=False)
        except ValueError as exc:
            raise ValueError("payload must not contain NaN or Infinity") from exc
        # 1000 مستوى تداخل: `json.dumps` (C) يقبلها و`jsonable_encoder` (تعاودي) يفشل ⇒ 500 الحفظ وكل
        # `GET /api/layouts` للمالك إلى الأبد. وبلا حدّ حجم: 20MB لكل طلب مجهول تُحفظ وتُعاد كاملة.
        if len(text) > LAYOUT_PAYLOAD_MAX:
            raise ValueError(f"payload must be at most {LAYOUT_PAYLOAD_MAX} bytes")
        if _json_depth(v) > LAYOUT_DEPTH_MAX:
            raise ValueError(f"payload must be nested at most {LAYOUT_DEPTH_MAX} levels")
        return v


class WatchlistAdd(BaseModel):
    symbol: str = Field(min_length=3, max_length=12)

    @field_validator("symbol")
    @classmethod
    def _strip(cls, v: str) -> str:
        # «EUR/USD» كان يُحفظ كما هو: لا يُفتح شارته (`/api/charts/EUR/USD` 404) ولا يُحذف (الشرطة تكسر
        # مسار الحذف)، و«EURUSD» بعده صفّ ثانٍ للأداة نفسها ⇒ اسم MATRIX كالتنبيهات والماسح
        v = market.canonical_symbol(v)
        if len(v) < 3:
            raise ValueError("symbol too short")
        if market.is_crypto(v):  # لا عملات رقمية (قرار أنس) — DXY يُقبل ويُعرض «غير متاح» بسببه
            raise ValueError("crypto not supported")
        return _symbol_chars(v)


class ProgressSave(BaseModel):
    """موضع المتداول بالمحاضرة. الحقول الثلاثة كانت **بلا حدّ واحد** وتُكتب كما وصلت بصفٍّ
    دائم (`academy_progress`):

    - `segment_index` سالب: الاستئناف يقرأ الموضع المحفوظ، وموضعٌ سالب يجعل المقطع الحالي
      **غير معرّف** — قاعة محاضرة تُفتح بلا نصّ. لا عميل يرسله، وهذا سبب رفضه لا سبب قبوله.
    - `school_id`/`lecture_id` بلا طول: مفتاحٌ بحجم صفحة يُخزَّن للأبد بمفتاح الصفّ نفسه.
      الحدّ 64 يتجاوز أطول معرّف بالأكاديمية بكثير.
    """

    school_id: str = Field(min_length=1, max_length=64)
    lecture_id: str = Field(min_length=1, max_length=64)
    segment_index: int = Field(default=0, ge=0)
    completed: bool = False


def _check_ma_periods(fast: int, slow: int, *, fast_name: str, slow_name: str) -> None:
    """قاعدة فترتَي المتوسط بمكان واحد — يعلنها `IndicatorAlertCreate` منذ تشغيل سابق، وكان
    **الفحص السريع والاختبار الخلفي وحدهما خارجها** رغم أنهما يستدعيان `indicators.sma` نفسها:

    - **فترة 0 = 500 فعليّ** لا 422: `sma` تقسم مجموع شريحة فارغة على صفر (`ZeroDivisionError`)،
      وليست بداخل `try` بأيٍّ من المسارين — أي أن رقماً كتبه المتداول بخانة الفترة يُخرج «خطأ خادم».
    - **فترة سالبة تُقبل بصمت**: الشريحة فارغة والقسمة على عدد سالب تعطي ‎-0.0‎ لكل شمعة — خطّ
      مسطّح لا يتقاطع أبداً، فيرى المتداول «لا نتائج» على كل فحص ويظنّها حالة السوق.
    - **فترة ≥ طول السلسلة** لا تُنتج قيمتين فلا تتقاطع؛ نفس «لا نتائج» الكاذبة.
    """
    for name, period in ((fast_name, fast), (slow_name, slow)):
        if not (MIN_MA_PERIOD <= period <= MAX_MA_PERIOD):
            raise ValueError(f"{name} must be between {MIN_MA_PERIOD} and {MAX_MA_PERIOD}")


def _check_timeframe(tf: str) -> None:
    """فريم غير معروف يُبدَّل بـ`15m` صامتاً (`build_series` و`twelve_data.fetch_time_series` كلاهما
    `tf if tf in ... else "15m"`) بينما النتيجة تُعاد موسومةً **بالفريم المكتوب**: نتيجة فحص/اختبار
    خلفي على شموع 15 دقيقة يقرؤها المتداول على أنها ساعة. نفس القاعدة التي يطبّقها تنبيه المؤشر."""
    if tf not in TF_SECONDS:
        raise ValueError("unknown timeframe")


class ScreenerRun(BaseModel):
    """طلب فحص. القيود الثلاثة الجديدة كلّها ضدّ **صمت** لا ضد قيمة نادرة (راجع
    `_check_ma_periods`/`_check_timeframe`)، ورابعها ضدّ استنزاف حدّ المزوّد:

    - `symbols` بلا سقف: كل رمز طلبٌ متسلسل للمزوّد بمفتاح مشترك بين كل المستخدمين — طلبٌ بـ400
      رمز كان يُقبل كما هو (مُثبَت: `total: 400`). السقف `screener_engine.MAX_SCAN_SYMBOLS`.
    - معرّف فلتر مجهول كان يُقابَل بقائمة فارغة صامتة تُقرأ «لا تطابق».
    - `filters`/`symbols` فارغةً كانت تُستبدَل بالافتراضي (`filters or [...]`) فيرى المتداول
      نتائج فلترٍ لم يختره؛ والواجهة تعطّل الزرّ بلا فلتر أصلاً فلا عميل يرسل الفارغ.
    """

    timeframe: str = "15m"
    filters: list[str] = Field(
        default_factory=lambda: ["ma_cross_up"], min_length=1, max_length=len(screener_engine.FILTER_IDS)
    )
    symbols: list[str] | None = Field(default=None, min_length=1, max_length=screener_engine.MAX_SCAN_SYMBOLS)
    fast: int = 9
    slow: int = 21

    @model_validator(mode="after")
    def _bounded(self) -> "ScreenerRun":
        _check_timeframe(self.timeframe)
        _check_ma_periods(self.fast, self.slow, fast_name="fast", slow_name="slow")
        unknown = sorted({f for f in self.filters if f not in screener_engine.FILTER_IDS})
        if unknown:
            raise ValueError(f"unknown filter: {', '.join(unknown)}")
        # متوسطان بالفترة نفسها خطّ واحد حرفياً فتقاطعه بنفسه مستحيل — نفس قاعدة تنبيه المؤشر،
        # ومحصورةً بفلتري التقاطع وحدهما: فلاتر RSI/الزخم لا تستعمل الفترتين أصلاً.
        if self.fast == self.slow and {"ma_cross_up", "ma_cross_down"} & set(self.filters):
            raise ValueError("fast and slow periods must differ")
        # « EURUSD» كان يُرسَل للمزوّد بمسافته فيفشل، و«EUR/USD» بلا قصّ الجمعة (`canonical_symbol`)
        # ولا تكرار: «EURUSD/eurusd/EUR/USD» كانت ثلاثة صفوف متطابقة و«3 من 3 مفحوصة» (طلبات مزوّد ×3)
        self.symbols = list(dict.fromkeys(market.canonical_symbol(s) for s in self.symbols)) if self.symbols else self.symbols
        self.filters = list(dict.fromkeys(self.filters))
        for sym in self.symbols or []:
            if not (3 <= len(sym) <= 12):
                raise ValueError("symbol must be 3-12 characters")
        return self


class BacktestRun(BaseModel):
    """اختبار خلفي. نفس قاعدتَي الفترة والفريم أعلاه (كان خارجهما تماماً)، و`symbol` بلا حدّ طول
    خلافاً لكل حقل رمز آخر بالملف، وعتبتا RSI بلا حدّ:

    - `rsi_low >= rsi_high` يجعل `rsi_reversal` تشتري على كل شمعة تقريباً (شرطها الأول يتحقّق
      دائماً) — **نتيجة تُعرض كأداء استراتيجية** وهي ناتج عتبتين متناقضتين (مُثبَت: 90/10 يعطي
      صفقة واحدة ونسبة نجاح 0%). وعتبة خارج 0–100 لا يبلغها RSI فلا صفقة أبداً: «الاستراتيجية
      لا تعطي إشارات» وهي عتبة مستحيلة.
    """

    symbol: str = Field(default="EURUSD", min_length=3, max_length=12)
    timeframe: str = "15m"
    strategy: Literal["ma_cross", "rsi_reversal", "macd_cross", "bb_bounce"] = "ma_cross"
    fast: int = 9
    slow: int = 21
    rsi_low: float = Field(default=30, gt=0, lt=100, allow_inf_nan=False, strict=True)
    rsi_high: float = Field(default=70, gt=0, lt=100, allow_inf_nan=False, strict=True)

    @model_validator(mode="after")
    def _bounded(self) -> "BacktestRun":
        _check_timeframe(self.timeframe)
        _check_ma_periods(self.fast, self.slow, fast_name="fast", slow_name="slow")
        if self.rsi_low >= self.rsi_high:
            raise ValueError("rsi_low must be below rsi_high")
        # كما بتنبيه المؤشر: خطٌّ واحد لا يتقاطع بنفسه. محصورةً بـ`ma_cross` وحدها.
        if self.strategy == "ma_cross" and self.fast == self.slow:
            raise ValueError("fast and slow periods must differ")
        return self


class SocialConsensusBody(BaseModel):
    """إجماع المصادر — لا مصدر مرخَّص، فالردّ «غير متاح» دائماً (كان ضجيج SHA-256 بأسماء قنوات
    مخترَعة). الرمز والفريم يبقيان محدودَين كباقي الأجسام."""

    symbol: str = Field(default="EURUSD", min_length=3, max_length=12)
    timeframe: str = "15m"
    # لا فهرس مصادر بعد اليوم (الردّ «غير متاح») ⇒ المعرّفات تُقبل محدودةً وتُتجاهل: عميل قديم يرسل
    # اختياره المحفوظ يرى «غير متاح» لا 422 عامّاً.
    source_ids: list[Annotated[str, Field(max_length=40)]] = Field(
        default_factory=list, max_length=signal_hub.MAX_SOURCE_IDS
    )

    @model_validator(mode="after")
    def _bounded(self) -> "SocialConsensusBody":
        _check_timeframe(self.timeframe)
        return self


class IndicatorForecastBody(BaseModel):
    """توقّع المؤشّرات — **رياضيات حقيقية على شموع حقيقية** (خلافاً للوحتي الإجماع والمحلّلين)،
    ويقف على شاشة الشارت أي أولى شاشات الـMVP. وكان بلا قيد واحد:

    - **الفريم المجهول يُبدَّل بـ15m صامتاً** بـ`build_series`، **والردّ لا يحمل الفريم أصلاً**:
      المتداول يختار «4H» فتُحسب مؤشّراته على شموع 15 دقيقة ولا شيء بالردّ يقول ذلك — وهو
      بالضبط العيب المُصحَّح بالفحص السريع والاختبار الخلفي وتنبيه المؤشر، وبقي هذا خارجه.
    - **معرّف مؤشّر مجهول كان يُهمَل بصمت**: `want` مجموعة، والمعرّف الذي لا يطابق لا يصوّت —
      فيُبنى التوقّع بمؤشّرين بينما الواجهة تعرض ثلاثة، بلا ما يدلّ على الفرق.
    - `symbol` بلا حدّ طول يذهب لرابط المزوّد.
    """

    symbol: str = Field(default="EURUSD", min_length=3, max_length=12)
    timeframe: str = "15m"
    indicators: list[str] | None = Field(
        default=None, min_length=1, max_length=len(signal_hub.FORECAST_INDICATOR_IDS)
    )
    # لغة نصّ `detail`/`name`/`disclaimer` (ar افتراضياً، en). كل صوت يحمل `detail_code` أيضاً.
    lang: str | None = Field(default=None, max_length=10)

    @model_validator(mode="after")
    def _bounded(self) -> "IndicatorForecastBody":
        _check_timeframe(self.timeframe)
        self.symbol = market.canonical_symbol(self.symbol)
        if len(self.symbol) < 3:
            raise ValueError("symbol too short")
        unknown = sorted({i for i in (self.indicators or []) if i not in signal_hub.FORECAST_INDICATOR_IDS})
        if unknown:
            raise ValueError(f"unknown indicator: {', '.join(unknown)}")
        return self


class IndicatorAlertCreate(BaseModel):
    symbol: str = Field(min_length=3, max_length=12)
    timeframe: str = "15m"
    alert_type: Literal["rsi", "ma_cross", "macd_cross"]
    condition: Literal["above", "below", "cross_up", "cross_down"]
    # Infinity لتنبيه تقاطع كان يُحفظ (فحص المدى لـrsi فقط) ثم يفشل ترميز كل ردّ ⇒ قائمة المالك 500 للأبد
    value: float | None = Field(default=None, allow_inf_nan=False, strict=True)
    fast_period: int = 9
    slow_period: int = 21
    note: str = Field(default="", max_length=500)

    _sym = field_validator("symbol")(_alertable_symbol)

    @model_validator(mode="after")
    def _consistent(self) -> "IndicatorAlertCreate":
        """تنبيه لا يمكن أن يُطلق يُرفض بـ422 بدل حفظه بصمت: ma_cross/macd_cross بشرط above/below، أو RSI بلا
        عتبة (NaN من العميل يصل null) أو خارج 0–100، أو فريم غير معروف (build_series كان يحوّله لـ15m بصمت
        بينما التنبيه يُعرض بفريمه المكتوب)."""
        if self.alert_type == "rsi":
            if self.condition not in ("above", "below"):
                raise ValueError("rsi alert needs condition above/below")
            if self.value is None or not (0 < self.value < 100):
                raise ValueError("rsi threshold must be between 0 and 100")
        elif self.condition not in ("cross_up", "cross_down"):
            raise ValueError("cross alert needs condition cross_up/cross_down")
        _check_timeframe(self.timeframe)
        # نفس القاعدة مطبَّقة على فترتَي المتوسط: كانتا بلا أي حدّ. فترة 0 كان يبتلعها
        # `_check_indicator_alert` بـ`or 9`/`or 21` فيصير التنبيه بفترة غير التي طلبها
        # المتداول وتُعرض له؛ وفترة سالبة تجعل `sma` تعيد ‎-0.0‎ لكل شمعة (شريحة فارغة
        # مقسومة على عدد سالب) — خطّ مسطّح لا يتقاطع أبداً؛ وفترة ≥ طول السلسلة لا تُنتج
        # قيمتين فلا تتقاطع. الثلاث كانت تُحفَظ بـ200 ويراها المتداول «يراقب» إلى الأبد.
        _check_ma_periods(
            self.fast_period, self.slow_period, fast_name="fast_period", slow_name="slow_period"
        )
        # متوسطان بالفترة نفسها خطّ واحد حرفياً: تقاطعه بنفسه مستحيل.
        if self.alert_type != "rsi" and self.fast_period == self.slow_period:
            raise ValueError("fast and slow periods must differ")
        return self


def _strip_trade_symbol(v):
    """قبل فحص الطول: «   » (3 فراغات) كان يجتاز `min_length=3` ويُحفظ رمزاً فارغاً."""
    return v.strip() if isinstance(v, str) else v


class TradeCreate(BaseModel):
    """صفقة جديدة بالدفتر. **الأسعار والحجم موجبة منتهية** — نفس قاعدة `TradeUpdate` المعلنة والتي
    كان مسار الإنشاء وحده خارجها:

    - `entry=0`: **500** فوراً إن أُرسل `exit` معه (قسمة على صفر بحساب النتيجة)؛ وبلا `exit`
      تُحفظ صفقة **مفتوحة لا تُغلق أبداً**: كل ضغطة «إغلاق» عليها 500 بلا ما يدلّ المتداول على السبب.
    - `entry` سالب: النتيجة تنقلب إشارتها (قسمة على عدد سالب) فتُعرض صفقة رابحة خاسرة والعكس.
    - `size=0`: كان يصير **1 صامتاً** (`float(size or 1)`) فيرى المتداول حجماً لم يكتبه.
    - `sl`/`tp` غير موجب: `_opt_level` يبدّله بـNone صامتاً — أي **وقف خسارة كتبه المتداول ثم اختفى**.

    و`allow_inf_nan=False`: `inf` يجتاز `gt=0` ويعطي `pnl=nan` لا يقبله JSON قياسياً (و`_opt_level`
    يستثني `inf` للمستويات أصلًا) — ومحلل JSON ببايثون يقبل `Infinity` حرفياً فالطريق مفتوح.
    """

    symbol: str = Field(min_length=3, max_length=12)
    side: Literal["buy", "sell"]
    entry: float = Field(gt=0, allow_inf_nan=False, strict=True)
    exit: float | None = Field(default=None, gt=0, allow_inf_nan=False, strict=True)
    # غائب = «غير معروف» (null بالقاعدة) لا لوت واحد: الافتراض 1 كان يُخزَّن فيقرأه المتداول حجماً كتبه.
    size: float | None = Field(default=None, gt=0, allow_inf_nan=False, strict=True)
    note: str = Field(default="", max_length=500)
    opened_at: str | None = Field(default=None, max_length=40)
    sl: float | None = Field(default=None, gt=0, allow_inf_nan=False, strict=True)
    tp: float | None = Field(default=None, gt=0, allow_inf_nan=False, strict=True)

    _sym = field_validator("symbol", mode="before")(_strip_trade_symbol)

    # وقت الإغلاق لصفقة تُسجَّل بعد حدوثها. غائب مع `opened_at` مكتوب ⇒ null «غير معروف» (كان يُخترع «الآن»)
    closed_at: str | None = Field(default=None, max_length=40)

    @field_validator("opened_at", "closed_at")
    @classmethod
    def _opened_at_as_journal_time(cls, v: str | None) -> str | None:
        return _journal_time(v)

    @model_validator(mode="after")
    def _closed_after_opened(self):
        if self.closed_at is not None:
            if self.exit is None:
                raise ValueError("closed_at needs exit")
            if self.opened_at is None:
                raise ValueError("closed_at needs opened_at")  # الفتح يصير «الآن» ⇒ بعد إغلاق ماضٍ
            if db.journal_time_before(self.closed_at, self.opened_at):  # الساعة المكرَّرة: لا سبق يقيني
                raise ValueError("closed_at is before opened_at")
        return self


def _journal_time(v: str | None) -> str | None:
    """بصيغة الخادم نفسها (`YYYY-MM-DD HH:MM` بتوقيته، كـ`db.add_trade` حين يغيب). كان نصّاً حرّاً يُحفظ
    كما هو والدفتر يُرتَّب به نصّياً (`ORDER BY opened_at`): «2026-09-25T08:00:00Z» تُرتَّب أحدث من
    «2026-09-25 10:00» (`T` بعد المسافة) فتنقلب الصفحات، و«أمس» يُقبل وقتاً. غير المقروء ⇒ 422."""
    if v is None or not v.strip():
        return None
    try:
        dt = datetime.fromisoformat(v.strip())
    except ValueError:
        raise ValueError("must be an ISO date/time") from None
    # «0999-01-01» كان يُحفظ «999-01-01 00:00» (`%Y` بلا أصفار) فيُرتَّب نصّياً أحدث صفقة بالدفتر؛
    # وسنة 1 بإزاحة موجبة تفيض بـ`astimezone` (OverflowError ⇒ 500)
    if dt.year < 1970:
        raise ValueError("is before 1970")
    if dt.tzinfo is not None:
        try:
            dt = dt.astimezone()  # لتوقيت الخادم كبقية أوقات الدفتر
        except OverflowError:  # «9999-12-31T23:59-12:00» يفيض بعد سنة 9999 ⇒ كان 500
            raise ValueError("is in the future") from None
        if dt.year < 1970:  # «1970-01-01T00:00+14:00» ⇒ 1969 بتوقيت الخادم
            raise ValueError("is before 1970")
    # وقت فتح بالمستقبل ⇒ 422: كان يُقبل فتُحفظ صفقة مغلقة `closed_at` (الآن) قبل `opened_at`، وتتصدّر
    # الدفتر (`ORDER BY opened_at DESC`) فوق كل صفقة حقيقية حتى يحين ذلك التاريخ. سماح 5 دقائق لفرق ساعة الجهاز.
    # المقارنة بلحظة مطلقة: ساعتان محلّيتان بلا منطقة كانتا تُرفضان في الساعة المكرَّرة عند نهاية التوقيت
    # الصيفي (02:50+02:00 قبل الرجوع = ماضٍ، لكنّ «الآن» 02:30 بالساعة الشتوية)
    if dt.astimezone(timezone.utc) > datetime.now(timezone.utc) + timedelta(minutes=5):
        raise ValueError("is in the future")
    return dt.strftime("%Y-%m-%d %H:%M")


class TradeClose(BaseModel):
    """سعر إغلاق الصفقة. موجب منتهٍ: إغلاق بـ`exit=0` كان يُحفظ بـ`-100%` وبسعر سالب
    بـ`-554%`، وكلاهما يدخل نسبة النجاح وصافي الدفتر ولا يُمحى إلا بحذف الصفقة."""

    exit: float = Field(gt=0, allow_inf_nan=False, strict=True)
    # run 82 (tools122a): الصفّ كما بُنيت عليه نافذة التأكيد. تصحيح دخول/اتجاه/حجم/وقف من جهاز آخر بعد
    # فتحها كان يُغلق بصمت على شروط لم يرها المتداول ⇒ مختلف ⇒ 409 كقاعدة PATCH. غائب = بلا فحص.
    seen_symbol: str | None = Field(default=None, max_length=40)  # صفّ قديم قد يحمل رمزاً أطول/غير مطبَّع
    seen_side: Literal["buy", "sell"] | None = None
    seen_entry: float | None = Field(default=None, gt=0, allow_inf_nan=False, strict=True)
    seen_size: float | None = Field(default=None, gt=0, allow_inf_nan=False, strict=True)
    seen_sl: float | None = Field(default=None, gt=0, allow_inf_nan=False, strict=True)
    seen_tp: float | None = Field(default=None, gt=0, allow_inf_nan=False, strict=True)
    seen_note: str | None = Field(default=None, max_length=500)
    # tools130c: وقت الإغلاق الحقيقي لصفقة أُعيد فتحها بالتعديل ثم أُغلقت من خانة الخروج — كانت تُختم «الآن»
    # (صفقة أغسطس تُعدّ من هذا الأسبوع بالتقرير وسلسلة الخسائر). قواعد PATCH: لا يسبق `opened_at` (422).
    # غائب/null = «الآن» كما كان (الإغلاق بالسعر الحالي).
    closed_at: str | None = Field(default=None, max_length=40)

    @field_validator("closed_at")
    @classmethod
    def _closed_as_journal_time(cls, v: str | None) -> str | None:
        return _journal_time(v)


def _seen_expect(body: BaseModel) -> dict:
    """`seen_X` المُرسَلة فقط (null صريح يُفحص: «رأيته فارغاً»). أعمدة لا تكون null بالجدول ⇒ null = «لم أرها»."""
    expect = {k.removeprefix("seen_"): getattr(body, k) for k in body.model_fields_set if k.startswith("seen_")}
    for k in ("status", "symbol", "side", "entry", "opened_at"):
        if expect.get(k, "") is None:
            expect.pop(k)
    return expect


class TradeUpdate(BaseModel):
    """تعديل صفقة بالدفتر (خطأ كتابة بالدخول/الوقف، ملاحظة لاحقة). الحقول الغائبة لا تتغيّر؛ `exit`/`sl`/`tp`
    بقيمة null صريحة تُمسح (مسح `exit` يعيد الصفقة مفتوحة)، و`size` null = حجم غير معروف."""

    symbol: str | None = Field(default=None, min_length=3, max_length=12)
    side: Literal["buy", "sell"] | None = None
    entry: float | None = Field(default=None, gt=0, allow_inf_nan=False, strict=True)
    exit: float | None = Field(default=None, gt=0, allow_inf_nan=False, strict=True)
    size: float | None = Field(default=None, gt=0, allow_inf_nan=False, strict=True)
    note: str | None = Field(default=None, max_length=500)
    sl: float | None = Field(default=None, gt=0, allow_inf_nan=False, strict=True)
    tp: float | None = Field(default=None, gt=0, allow_inf_nan=False, strict=True)
    # run 78: حالة الصفّ كما رآها النموذج عند فتحه. إغلاق من جهاز آخر بعد فتح نموذج التعديل كان يُمحى بحفظه
    # (يُعاد تطبيق الخروج القديم على الصفّ الجديد: ربح +9% يصير خسارة) — مختلف ⇒ 409. غائبان = بلا فحص (عملاء قدامى).
    seen_status: Literal["open", "closed"] | None = None
    seen_exit: float | None = Field(default=None, gt=0, allow_inf_nan=False, strict=True)
    # run 80: الفحص كان للحالة والخروج فقط، والنموذج يعيد إرسال كل الحقول ⇒ تصحيح دخول/اتجاه/وقف من جهاز آخر
    # كان يُمحى بحفظ ملاحظة من نموذج قديم (والنتيجة تُحسب من الدخول القديم). كل `seen_X` مُرسَل يُقارَن بالمخزَّن.
    seen_symbol: str | None = Field(default=None, max_length=40)  # صفّ قديم قد يحمل رمزاً أطول/غير مطبَّع
    seen_side: Literal["buy", "sell"] | None = None
    seen_entry: float | None = Field(default=None, gt=0, allow_inf_nan=False, strict=True)
    seen_size: float | None = Field(default=None, gt=0, allow_inf_nan=False, strict=True)
    seen_sl: float | None = Field(default=None, gt=0, allow_inf_nan=False, strict=True)
    seen_tp: float | None = Field(default=None, gt=0, allow_inf_nan=False, strict=True)
    seen_note: str | None = Field(default=None, max_length=500)
    # run 91: وقت الإغلاق الحقيقي. مسح الخروج (إعادة الصفقة مفتوحة) يمسح `closed_at`، وإعادة كتابته كانت تختم
    # «الآن» ⇒ صفقة أغسطس تُعدّ من هذا الأسبوع بالتقرير وسلسلة الخسائر، بلا حقل يعيد تاريخها. null صريح =
    # «غير معروف» (كإنشاء صفقة بأثر رجعي). يشترط صفقة مغلقة بعد التعديل وألّا يسبق `opened_at` (وإلا 422).
    closed_at: str | None = Field(default=None, max_length=40)
    # tools150c: وقت الفتح الحقيقي بقواعد الإنشاء (`_journal_time`: لا مستقبل، لا قبل 1970) — صفقة سُجّلت «الآن»
    # خطأً كان فتحها لا يُصحَّح أبداً. null يُتجاهل (العمود إلزامي). بعد الدمج لا يسبق الإغلاقُ الفتحَ (422).
    opened_at: str | None = Field(default=None, max_length=40)
    # كما خزّنه الخادم حرفياً (لا يُطبَّع: صفوف قديمة بصيغ أخرى)؛ مختلف ⇒ 409 كبقية `seen_*`
    seen_opened_at: str | None = Field(default=None, max_length=40)

    _sym = field_validator("symbol", mode="before")(_strip_trade_symbol)

    @field_validator("closed_at", "opened_at")
    @classmethod
    def _closed_as_journal_time(cls, v: str | None) -> str | None:
        return _journal_time(v)


def _new_id(prefix: str) -> str:
    """معرّف فريد فعلاً لصفّ جديد (تنبيه/تنبيه مؤشر/فكرة صفقة).

    كانت المعرّفات `a{int(time.time())}{random 10–99}` و`v{int(time.time())}` — بدقّة ثانية، والجدول
    يُدرج بـ`INSERT` عادي على مفتاح أساسي: تنبيهان بنفس الثانية (1 من 90) أو فكرتا صفقة بنفس الثانية
    (دائماً) → `IntegrityError` = HTTP 500 للمستخدم الثاني. البادئة تبقى كما هي (لا عميل يحلّل المعرّف).
    """
    return f"{prefix}{int(time.time())}{secrets.token_hex(4)}"


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


# حجم السلسلة التي يفحص عليها `check_indicator_alerts` (الافتراضي أدناه)، ومنه أطول فترة
# متوسط يمكن أن تتقاطع فعلاً: `sma` تعطي أول قيمة عند الفهرس period-1، و`cross_up`/`cross_down`
# يلزمهما آخر **قيمتين** غير فارغتين — أي أن فترة أطول من (الطول − 1) لا تُنتج قيمتين أبداً
# فلا يتقاطع المتوسط مهما فعل السوق.
CHECK_SERIES_SIZE = 180
MIN_MA_PERIOD = 1
MAX_MA_PERIOD = CHECK_SERIES_SIZE - 1


def build_series(symbol: str, timeframe: str = "15m", outputsize: int = 180) -> ChartSeries:
    sym = market.canonical_symbol(symbol)
    tf = timeframe if timeframe in TF_SECONDS else "15m"
    size = max(50, min(int(outputsize or 180), 5000))

    if market.configured():
        try:
            raw, meta = market.fetch_time_series_with_meta(sym, tf, outputsize=size)
            if raw:
                candles = [Candle(**c) for c in raw]
                first = candles[0].close
                last = candles[-1].close
                # شمعة واحدة = لا حركة تُقاس ⇒ None لا «0.00%» (تُقرأ «ثابت»)، كالماسح بلا 81 شمعة
                change = ((last - first) / first) * 100 if first and len(candles) > 1 else None
                kind = meta.get("kind") if meta.get("kind") in ("provider", "cache") else "unknown"
                return ChartSeries(
                    symbol=sym,
                    timeframe=tf,
                    candles=candles,
                    change_pct=round(change, 2) + 0.0 if change is not None else None,  # لا «−0.00%»
                    change_bars=len(candles) - 1,
                    last=last,
                    data_source=DataProvenance(
                        kind=kind,  # type: ignore[arg-type]
                        as_of=meta.get("as_of"),
                        channel=meta.get("channel") or "twelvedata",
                    ),
                )
        except Exception:
            pass  # لا بيانات ⇒ سلسلة فارغة موسومة أدناه

    # backend-r22: لا شموع ولا سعر حين لا بيانات من المزوّد — لأي رمز. كانت بذرة عشوائية حول أسعار مكتوبة باليد
    # من 2024 (`SYMBOL_BASES`: EURUSD 1.0854، الذهب 2348.6…؛ ورمز مجهول حول 1.0) تُرسَل شموعاً وإغلاقاً ونسبة
    # موسومة demo عند كل 429 بلا كاش أو انقطاع أو بلا مفتاح — والشارت يرسمها. DXY (`27fa8ba`) كان الحالة الأولى.
    # `kind: demo` يبقى فيرفضها كل مسار حسابي كما قبل (تنبيهات، اقتباس، ماسح، اختبار خلفي، توقّع، مساعد).
    # السبب: `not_offered_by_provider` (DXY) أو `provider_unavailable` (المزوّد متعذّر أو غير مهيّأ أو لا يعرف الرمز).
    why = market.unavailable_reason(sym) or "provider_unavailable"
    return ChartSeries(
        symbol=sym,
        timeframe=tf,
        candles=[],
        change_pct=None,
        last=None,
        # `unavailable` بلا `as_of`: كانت `demo` بـ`as_of` = الآن ⇒ شارة «تجريبي» ووقت «الآن» على شارت فارغ (توحي
        # بأرقام تجريبية موجودة)، وقائمة المتابعة (`useLastCloses` يفحص `unavailable`) تعرض DXY «—» لا «غير متاح».
        data_source=DataProvenance(kind="unavailable", as_of=None, channel=None, unavailable_reason=why),
    )


def _no_real_data(series: ChartSeries) -> bool:
    """سلسلة بلا شموع مزوّد حقيقية (`unavailable`؛ `demo` لسلاسل قديمة/محقونة) — لا يُحسب عليها شيء."""
    return series.data_source.kind in ("unavailable", "demo")


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
    # بريد فراغات «  » كان يُقدَّم على اسم مستخدم صحيح ⇒ 400 «مطلوب»
    ident = (body.email or "").strip() or (body.username or "").strip()
    if not ident:
        raise HTTPException(status_code=400, detail="email or username required")
    try:
        return db.login_user(ident, body.password)
    except ValueError as exc:
        raise HTTPException(status_code=401, detail=str(exc)) from exc


class AuthLogout(BaseModel):
    push_token: str | None = Field(default=None, max_length=256)


@app.post("/api/auth/logout")
def auth_logout(
    body: AuthLogout | None = None,
    authorization: str | None = Header(default=None),
    user: dict | None = Depends(_auth_user),
    key: str | None = Depends(_install_key),
):
    # مُتساوي الأثر: توكن غائب أو مجهول ⇒ ok أيضاً (العميل يمسح حالته المحلية على أي حال). توكن **منتهٍ**
    # يُفكّ به رمز الجهاز أيضاً (كان يُتخطّى ⇒ الهاتف يبقى يتلقّى إشعارات الحساب بعد «الخروج»).
    if authorization:
        token = authorization.replace("Bearer ", "").strip()
        uid = user["user_id"] if user else db.session_user_id(token)
        if uid:
            db.logout_session(token, uid, owner_key=key, push_token=body.push_token if body else None)
    return {"ok": True}


class AuthPassword(BaseModel):
    current_password: str = Field(max_length=256)
    new_password: str = Field(max_length=256)


@app.post("/api/auth/password")
def auth_change_password(
    body: AuthPassword,
    authorization: str | None = Header(default=None),
    user: dict | None = Depends(_auth_user),
    key: str | None = Depends(_install_key),
):
    """تغيير كلمة المرور؛ يُخرج كل الأجهزة الأخرى (راجع `db.change_password`)."""
    if not user or not authorization:
        raise HTTPException(status_code=401, detail="not authenticated")
    token = authorization.replace("Bearer ", "").strip()
    try:
        db.change_password(user["user_id"], token, body.current_password, body.new_password, owner_key=key)
    except ValueError as exc:
        # 400 لا 401: كلمة حالية خاطئة لا تعني جلسة منتهية (العميل لا يُخرج المستخدم)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"ok": True}


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
def auth_delete_account(
    user: dict | None = Depends(_auth_user),
    key: str | None = Depends(_install_key),
):
    """حذف الحساب من داخل التطبيق — شرط إلزامي لأبل (App Store Review Guideline
    5.1.1(v)). راجع db.delete_user_account للتفصيل الكامل لآلية المحو."""
    if not user:
        raise HTTPException(status_code=401, detail="not authenticated")
    if key:
        # نقل صفوف الجهاز المجهولة يجري مرّة لكل توكن (`_CLAIMED`) ⇒ صفقة/تنبيه مجهول كُتب من الجهاز بعد
        # أوّل نقل (أثناء إكمال الدخول) يبقى `user_id=NULL`: يراه الحساب بدفتره، والحذف (`WHERE user_id`)
        # يُبقيه، والحساب التالي على الهاتف يتبنّاه. يُنقل هنا دائماً ثم يُحذف مع الحساب.
        db.claim_device_rows(int(user["user_id"]), key)
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
def push_register(
    body: PushRegister,
    authorization: str | None = Header(default=None),
    user: dict | None = Depends(_auth_user),
    key: str | None = Depends(_owner_key),
):
    # توكن مُرسَل غير صالح (جلسة انتهت بعد 30 يوماً والعميل ما زال يحمله) كان يُعامَل مجهولاً ⇒
    # `INSERT OR REPLACE` بـuser_id=NULL يفكّ الهاتف من الحساب بصمت، فكل تنبيه بعدها لا يصل أحداً.
    # 401 يُبقي الربط القائم كما هو.
    # `_owner_key`: مجهول بلا معرّف تثبيت ⇒ 400. كان يُحفظ (user_id=NULL, owner_key=NULL) ⇒ يدخل دلو
    # التنبيهات المجهولة القديمة (`_push_owner_sql`) فيتلقّى أيّ أحد يسجّل رمزه يدوياً تنبيهات الآخرين.
    if authorization and not user:
        raise HTTPException(status_code=401, detail="not authenticated")
    uid = user["user_id"] if user else None
    session = authorization.replace("Bearer ", "").strip() if user and authorization else None
    db.save_push_token(body.token, body.platform, uid, body.lang, owner_key=key, session_token=session)
    return {"ok": True}


@app.get("/api/layouts")
def layouts_list(user: dict | None = Depends(_auth_user), key: str | None = Depends(_owner_key)):
    uid = user["user_id"] if user else None
    return {"layouts": db.list_layouts(uid, owner_key=key)}


@app.post("/api/layouts")
def layouts_save(
    body: LayoutSave,
    user: dict | None = Depends(_auth_user),
    key: str | None = Depends(_owner_key),
):
    uid = user["user_id"] if user else None
    # db.save_layout يتولّى توليد معرّف فريد عند غيابه ويمنع الكتابة فوق تخطيط مالك آخر (مجهول أو مسجّل)
    saved = db.save_layout(body.id, body.name, body.payload, uid, owner_key=key)
    return {"ok": True, "layout": saved}


@app.delete("/api/layouts/{layout_id}")
def layouts_delete(
    layout_id: str, user: dict | None = Depends(_auth_user), key: str | None = Depends(_owner_key)
):
    uid = user["user_id"] if user else None
    # حذف بلا صف مطابق ليس خطأً للعميل (تخطيط محلي لم يصل للخادم قط) — يُعاد عدد المحذوف فقط
    return {"ok": True, "deleted": db.delete_layout(layout_id, uid, owner_key=key)}


@app.get("/api/watchlist/custom")
def custom_watchlist(user: dict | None = Depends(_auth_user), key: str | None = Depends(_owner_key)):
    uid = user["user_id"] if user else None
    syms = db.get_watchlist(uid, owner_key=key)
    return {"symbols": syms}


@app.post("/api/watchlist/custom")
def custom_watchlist_add(
    body: WatchlistAdd,
    user: dict | None = Depends(_auth_user),
    key: str | None = Depends(_owner_key),
):
    uid = user["user_id"] if user else None
    syms = db.add_watchlist_symbol(body.symbol.upper(), uid, owner_key=key)
    return {"ok": True, "symbols": syms}


@app.delete("/api/watchlist/custom/{symbol:path}")
def custom_watchlist_remove(
    symbol: str,
    user: dict | None = Depends(_auth_user),
    key: str | None = Depends(_owner_key),
):
    """إزالة رمز من قائمة متابعة المستدعي — **لم يكن للإضافة نقيض**: رمز يُضاف بضغطة ويبقى
    بالقائمة إلى الأبد (الرموز المدعومة ستة عشر، وقائمة مزدحمة برموز لا يتداولها تُفقد
    التبديل بلمسة واحدة معناه).

    حذف رمز ليس بالقائمة ليس خطأ للعميل (زرّ ضُغط مرّتين، أو قائمة محلية سبقت الخادم) —
    يُعاد `removed: 0` وقائمة المستدعي كما هي، كما بحذف التخطيط."""
    uid = user["user_id"] if user else None
    # `:path` + الاسمان: صفّ «EUR/USD» محفوظ قبل التطبيع يُحذف بأيّ الصيغتين
    removed, syms = db.remove_watchlist_symbol(symbol, uid, owner_key=key)
    canon = market.canonical_symbol(symbol)
    if canon != symbol.strip().upper():
        more, syms = db.remove_watchlist_symbol(canon, uid, owner_key=key)
        removed += more
    return {"ok": True, "removed": removed, "symbols": syms}


@app.get("/api/academy/progress")
def academy_progress_get(
    user: dict | None = Depends(_auth_user), authorization: str | None = Header(default=None)
):
    # توكن مُرسَل منتهٍ/ملغى ⇒ 401 (كشقيقه POST و`_owner_key`)، لا «لا تقدّم» بـ200 يبدو كل محاضرة غير مبدوءة
    if authorization and not user:
        raise HTTPException(status_code=401, detail="login_required")
    if not user:
        return {"progress": []}
    return {"progress": db.get_progress(user["user_id"])}


@app.post("/api/academy/progress")
def academy_progress_save(body: ProgressSave, user: dict | None = Depends(_auth_user)):
    """401 لا 500 بلا توكن صالح. كان النوع `dict` بينما `_auth_user` يعيد `None` لكل
    طلب بلا ترويسة أو بتوكن منتهٍ — فـ`user["user_id"]` يرمي TypeError ويخرج **500**.
    وهو مسار يُستدعى تلقائياً مع **كل** انتقال مقطع بقاعة المحاضرة: جلسة انتهت صلاحيتها
    والعميل ما زال يحمل بيانات المستخدم محلياً (فيمرّ شرط `if (user)` عنده) = خطأ خادم
    لكل مقطع، بلا ما يدلّ العميل أن المطلوب إعادة دخول. الشقيق GET يعيد قائمة فارغة
    للمجهول أصلاً — فالتباين كان بهذا المسار وحده."""
    if not user:
        raise HTTPException(status_code=401, detail="not authenticated")
    # محاضرة غير موجودة كانت تُخزَّن وتُعاد بالقائمة (صفوف بلا حدّ لأي حساب)، وموضع بعد آخر مقطع
    # (99 على محاضرة بمقطعين) يُستأنف منه فتُفتح القاعة بلا مقطع حالي؛ و2**63 = 500 من SQLite.
    lec = get_lecture(body.school_id, body.lecture_id)
    if not lec:
        raise HTTPException(status_code=404, detail="lecture not found")
    if body.segment_index >= max(len(lec.get("script_segments") or []), 1):
        raise HTTPException(status_code=422, detail="segment_index beyond the lecture")
    item = db.save_progress(
        user["user_id"],
        body.school_id,
        body.lecture_id,
        body.segment_index,
        body.completed,
    )
    return {"ok": True, "progress": item}


@app.get("/api/symbols/search")
def symbols_search(
    q: str = Query(default="", max_length=market.MAX_SEARCH_QUERY),
    limit: int = Query(default=20, ge=1, le=market.MAX_SEARCH_RESULTS),
):
    """بحث الرموز. الحدّان الجديدان ضدّ **صمت** كسابقيهما لا ضدّ قيمة نادرة:

    - `limit` غير موجب كان يمرّ من `min(limit, 30)` كما هو، ثم يُستعمل شريحةً `out[:limit]`
      بـ`twelve_data.symbol_search`: **الشريحة السالبة تحذف من الذيل**، فـ`limit=-5` يُسقط آخر
      خمس نتائج بصمت و`limit=0` يُفرغ القائمة كلّها — يقرؤها المتداول «لا رمز بهذا الاسم» على
      بحثٍ نجح فعلاً، وطلبُ المزوّد قد صُرف من الحدّ المشترك قبل أن تُرمى نتيجته.
    - `q` بلا حدّ طول يذهب **حرفياً** لرابط المزوّد: نصٌّ ملصوق بطول صفحة يُخرج **502** من ردّ
      خطأ المزوّد لا رسالةً تدلّ المتداول، وقد صُرف الطلب. والحدّ يرصد المستحيل لا الصغير —
      64 حرفاً يتجاوز أطول اسم أداة بالمزوّد بكثير (أطولها دون الخمسين).

    والقاعدة معلنة بـ`twelve_data` نفسه (حيث يقع حدّ المزوّد) ويُقرأ منه هنا، فلا تنحرف نسختان.

    `ambiguous`: إدراجات لا يرسمها رمزها المجرّد (الرمز نفسه بعدّة بورصات — «AAPL · BMV» كان يرسم ناسداك)،
    خارج `results` كي لا يختارها عميل قديم؛ كلٌّ بـ`unavailable_reason` (`twelve_data._listings`).
    """
    if not q.strip():
        return {"results": [], "ambiguous": []}
    if not market.configured():
        raise HTTPException(status_code=503, detail="Twelve Data not configured")
    try:
        results, ambiguous = market.search_listings(q, limit=limit)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=market.redact(exc)) from None
    return {"results": results, "ambiguous": ambiguous}


def _require_timeframe(*tfs: str) -> None:
    """مسارات GET بلا نموذج جسم: فريم غير معروف (`1h`، `1d`، `M`) كان يمرّ إلى `build_series` فيُبدَّل
    بـ`15m` صامتاً ⇒ RSI وتقاطعات «الساعة» محسوبة على شموع 15 دقيقة. 422 كنماذج الأجسام (`_check_timeframe`)."""
    for tf in tfs:
        if tf not in TF_SECONDS:
            raise HTTPException(422, {"error": "unknown_timeframe", "timeframe": tf,
                                      "allowed": list(TF_SECONDS.keys())})


@app.get("/api/terminal")
def terminal_layout(
    tf0: str = "15m",
    tf1: str = "1H",
    tf2: str = "4H",
    dxy_tf: str = "15m",
):
    """DXY + 3 frames in one call (cache-friendly for shared Twelve Data quota)."""
    _require_timeframe(tf0, tf1, tf2, dxy_tf)
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
        ]
        + [
            {"symbol": sym, "td_symbol": None, "unavailable_reason": why}
            for sym, why in market.UNAVAILABLE_AT_PROVIDER.items()
        ],
        "market": market.status(),
    }


@app.get("/api/charts/{symbol}")
def chart(symbol: str, timeframe: str = "15m", outputsize: int = 180):
    _require_timeframe(timeframe)
    return build_series(symbol, timeframe, outputsize)


@app.get("/api/alerts")
def list_alerts(user: dict | None = Depends(_auth_user), key: str | None = Depends(_owner_key)):
    uid = user["user_id"] if user else None
    return {"alerts": db.list_alerts(uid, owner_key=key)}


@app.post("/api/alerts")
def create_alert(
    body: AlertCreate,
    user: dict | None = Depends(_auth_user),
    key: str | None = Depends(_owner_key),
):
    alert = {
        "id": _new_id("a"),
        "symbol": body.symbol.upper(),
        "condition": body.condition,
        "price": _alert_level(body.price),
        "note": body.note.strip(),
        "active": True,
        "triggered": False,
        "ts": datetime.now(timezone.utc).isoformat(),
    }
    uid = user["user_id"] if user else None
    db.create_alert(alert, uid, owner_key=key)
    return {"ok": True, "alert": alert}


@app.patch("/api/alerts/{alert_id}")
def update_alert(
    alert_id: str,
    body: AlertUpdate,
    user: dict | None = Depends(_auth_user),
    key: str | None = Depends(_owner_key),
):
    """تعديل ذرّي للتنبيه (بدل إنشاء جديد ثم حذف القديم) — يُعيد تفعيله. 404 إن لم يوجد أو لا يملكه،
    409 `alert_changed` (مع الصفّ المخزَّن) إن اختلف عن `seen_*` المُرسَلة."""
    data = {
        "symbol": body.symbol.upper(),
        "condition": body.condition,
        "price": _alert_level(body.price),
        "note": body.note.strip(),
        "ts": datetime.now(timezone.utc).isoformat(),
    }
    uid = user["user_id"] if user else None
    expect = {k.removeprefix("seen_"): getattr(body, k) for k in body.model_fields_set if k.startswith("seen_")}
    expect = {k: v for k, v in expect.items() if v is not None}
    # القيمة كما أُرسلت **أو** مطبَّعة: التطبيق يعيد الصفّ المخزَّن حرفياً، وصفّ قديم (RLM قبل c4ecd74،
    # «EUR/USD»، سعر `round(x, 5)` بأكثر من 10 أرقام) لا يساوي صيغته المطبَّعة ⇒ كان 409 للأبد ولا يُعدَّل.
    if "symbol" in expect:
        expect["symbol"] = (expect["symbol"], market.canonical_symbol(expect["symbol"]))
    if "price" in expect:
        expect["price"] = (expect["price"], _alert_level(expect["price"]))
    try:
        alert = db.update_alert(alert_id, data, uid, owner_key=key, expect=expect)
    except db.AlertChanged as e:
        raise HTTPException(409, {"error": "alert_changed", "alert": e.alert})
    if alert is None:
        raise HTTPException(status_code=404, detail="alert not found")
    return {"ok": True, "alert": alert}


@app.delete("/api/alerts/{alert_id}")
def delete_alert(
    alert_id: str, user: dict | None = Depends(_auth_user), key: str | None = Depends(_owner_key)
):
    uid = user["user_id"] if user else None
    return {"ok": db.delete_alert(alert_id, uid, owner_key=key)}


@app.post("/api/alerts/check")
def check_alerts(
    background: BackgroundTasks,
    user: dict | None = Depends(_auth_user),
    key: str | None = Depends(_owner_key),
):
    """يفحص تنبيهات المستدعي فقط ويعيدها (كان يعيد تنبيهات كل المستخدمين فتستبدل قائمة العميل،
    وجهاز مجهول كان يُطلق تنبيهات كل المجهولين — الآن تنبيهات جهازه فقط عبر `X-Install-Id`)."""
    uid = user["user_id"] if user else None
    triggered: list[dict] = []
    # طلب واحد لكل رمز (كان طلب quote لكل تنبيه — 10 تنبيهات EURUSD × كل جهاز مفتوح كل دقيقة تستنزف حد
    # Twelve Data)، ونفس قاعدة الـworker: السعر الحالي أو ذيل شمعة 1m بعد دقيقة التسليح.
    quotes: dict[str, tuple[float | None, list[dict], float | None]] = {}
    rows = db.list_alerts(uid, owner_key=key)
    for a in rows:
        if not a.get("active") or a.get("triggered"):
            continue
        sym = str(a["symbol"]).upper()
        if sym not in quotes:
            quotes[sym] = alert_worker._recent_minutes(sym)
        q, candles, q_at = quotes[sym]
        if q is None:
            continue
        if alert_worker._price_hit(a, q, candles, q_at) and db.mark_alert_triggered(a["id"], a):
            # الصفّ كما استقرّ بالقاعدة لا كما قُرئ قبل القلب: `a` لُقّط قبل
            # `mark_alert_triggered` فيحمل `triggered: false` — أي أن المسار كان يسلّم تنبيهاً
            # **أُطلق للتوّ** موسوماً «يراقب». نفس التصحيح المطبَّق على تنبيهات المؤشر
            # (`/api/indicator-alerts/check`) وكان شقيقه السعريّ خارجه. العميل الحالي يبني
            # قائمته من `alerts` ويستعمل `triggered` للوميض والإشعار وحدهما فلا يظهر الأثر
            # اليوم — **يُقال كما هو**: هذا إغلاق فخّ لا إصلاح عطب ظاهر.
            # `current_at` = وقت `q` لدى المزوّد (None إن لم يعطِ وقتاً): قد يكون إغلاق 1m عمره دقائق أو كاشاً
            triggered.append({**a, "triggered": True, "current": q, "current_at": q_at})
    # الوسم أعلاه يجعل الـworker يتخطّاه ⇒ دفع إشعار بقية أجهزة المالك من هنا (لا لهذا الجهاز). صفوف
    # القائمة العامة بلا `user_id`/`owner_key` ⇒ المالك = المستدعي (القائمة قائمته وحده).
    if triggered:
        background.add_task(
            alert_worker.dispatch, [alert_worker.price_event({**a, "user_id": uid, "owner_key": key}) for a in triggered], key
        )
    # القراءة الثانية بعد الوسم: «database is locked» هنا كان 500 ⇒ التطبيق لا يرى `triggered` ولا يُشعر،
    # والدفع لبقية الأجهزة (مهمة خلفية) لا يجري لطلب فاشل، والتنبيه موسوم مُطلَقاً فلا يُعاد ⇒ ضاع كلياً.
    # عند فشلها: الصفوف المقروءة أولاً بعد قلب ما أُطلق (الوسم لا يغيّر عموداً غيره).
    try:
        alerts = db.list_alerts(uid, owner_key=key)
    except Exception:
        alert_worker.log.exception("alerts re-read failed after check; returning pre-check rows")
        fired = {a["id"] for a in triggered}
        alerts = [{**a, "triggered": True} if a["id"] in fired else a for a in rows]
    return {"triggered": triggered, "alerts": alerts}


def _check_indicator_alert(alert: dict, candles: list[dict]) -> bool:
    if alert_worker.cross_is_stale(alert, candles):
        return False
    snap = ind_engine.snapshot(
        [{"close": c["close"], "open": c["open"], "high": c["high"], "low": c["low"]} for c in candles],
        fast=int(alert.get("fast_period") or 9),
        slow=int(alert.get("slow_period") or 21),
    )
    at = alert["alert_type"]
    cond = alert["condition"]
    if at == "rsi":
        rsi_v = snap.get("rsi")
        if rsi_v is None or snap.get("flat_closes") or alert.get("value") is None:  # كـ`alert_worker`
            return False
        rsi_v = round(rsi_v, 1) + 0.0  # كـ`alert_worker`: على RSI المعروض لا الخام
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
def list_indicator_alerts(
    user: dict | None = Depends(_auth_user), key: str | None = Depends(_owner_key)
):
    uid = user["user_id"] if user else None
    return {"alerts": db.list_indicator_alerts(uid, owner_key=key)}


@app.post("/api/indicator-alerts")
def create_indicator_alert(
    body: IndicatorAlertCreate,
    user: dict | None = Depends(_auth_user),
    key: str | None = Depends(_owner_key),
):
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
    db.create_indicator_alert(alert, uid, owner_key=key)
    return {"ok": True, "alert": alert}


@app.delete("/api/indicator-alerts/{alert_id}")
def delete_indicator_alert(
    alert_id: str, user: dict | None = Depends(_auth_user), key: str | None = Depends(_owner_key)
):
    uid = user["user_id"] if user else None
    return {"ok": db.delete_indicator_alert(alert_id, uid, owner_key=key)}


@app.post("/api/indicator-alerts/{alert_id}/rearm")
def rearm_indicator_alert(
    alert_id: str, user: dict | None = Depends(_auth_user), key: str | None = Depends(_owner_key)
):
    """إعادة تفعيل تنبيه مؤشر أُطلق (التنبيه لمرة واحدة) — كان الحلّ الوحيد حذفه وإعادة إنشائه بكل حقوله."""
    uid = user["user_id"] if user else None
    row = db.rearm_indicator_alert(alert_id, uid, owner_key=key)
    if row is None:
        raise HTTPException(status_code=404, detail="alert not found")
    return {"ok": True, "alert": row}


@app.post("/api/indicator-alerts/check")
def check_indicator_alerts(
    background: BackgroundTasks,
    user: dict | None = Depends(_auth_user),
    key: str | None = Depends(_owner_key),
):
    """تنبيهات المستدعي فقط (نفس قاعدة الرؤية في /api/indicator-alerts).

    سلسلة واحدة لكل (رمز، فريم) بالطلب — كانت تُبنى لكل تنبيه (3 تنبيهات EURUSD 1h = 3 طلبات للمزوّد
    من كل جهاز مفتوح). الفشل يُخزَّن أيضاً فلا يُعاد لنفس المفتاح. سلسلة demo البذرية تُعامَل كفشل."""
    uid = user["user_id"] if user else None
    triggered: list[dict] = []
    cache: dict[tuple[str, str], list[dict] | None] = {}
    fetched_at: dict[tuple[str, str], float | None] = {}
    rows = db.list_indicator_alerts(uid, owner_key=key)
    for a in rows:
        if not a.get("active") or a.get("triggered"):
            continue
        ck = (str(a["symbol"]).upper(), str(a["timeframe"]))
        if ck not in cache:
            try:
                series = build_series(a["symbol"], a["timeframe"])
                # سلسلة بذرية (المزوّد متعذّر) = شموع مختلَقة: كان تقاطع/RSI عليها يُطلق التنبيه ويعلّمه
                # «مُطلَق» نهائياً بلا حدث سوقي حقيقي. نتخطّاها كفشل (يُعاد الفحص بالطلب التالي).
                # وكاش قديم (حتى 15د عند 429) أقدم من شمعة من الفريم: تقاطع حدث قبل ربع ساعة يُطلق «الآن».
                if _no_real_data(series) or not alert_worker.series_fresh_enough(
                    series.data_source.as_of, str(a["timeframe"])
                ):
                    cache[ck] = None
                else:
                    cache[ck] = [c.model_dump() for c in series.candles]
                    fetched_at[ck] = series.data_source.as_of
            except Exception:
                cache[ck] = None
        candles = cache[ck]
        # سلسلة من الكاش جُلبت قبل تسليح هذا التنبيه (فحص فوري بعد الإنشاء) ⇒ ليست قراءة بعده
        if candles is None or alert_worker.series_predates_arming(a, fetched_at.get(ck)):
            continue
        if _check_indicator_alert(a, candles) and db.mark_indicator_alert_triggered(
            a["id"], alert_worker.last_bar_time(candles), seen=a
        ):
            # الصفّ كما استقرّ بالقاعدة لا كما قُرئ قبل القلب: `a` لُقّط قبل
            # `mark_indicator_alert_triggered` فيحمل `triggered: false` — أي أن المسار كان
            # يسلّم تنبيهاً **أُطلق للتوّ** موسوماً «يراقب». العميل الحالي يستعمل هذه القائمة
            # للإشعار وحده فلم يظهر الأثر، لكنه فخّ لأي عرض يبني على الوسم (نفس قاعدة
            # `/api/academy/progress`: يُعاد ما بالقاعدة لا ما وصل بالطلب).
            triggered.append({**a, "triggered": True})
    if triggered:
        background.add_task(
            alert_worker.dispatch,
            [alert_worker.indicator_event({**a, "user_id": uid, "owner_key": key}) for a in triggered],
            key,
        )
    # كشقيقه السعري: فشل القراءة الثانية كان 500 بعد الوسم ⇒ لا إشعار بالتطبيق ولا دفع لبقية الأجهزة
    try:
        alerts = db.list_indicator_alerts(uid, owner_key=key)
    except Exception:
        alert_worker.log.exception("indicator alerts re-read failed after check; returning pre-check rows")
        fired = {a["id"] for a in triggered}
        alerts = [{**a, "triggered": True} if a["id"] in fired else a for a in rows]
    return {"triggered": triggered, "alerts": alerts}


@app.post("/api/screener/run")
def screener_run(body: ScreenerRun):
    scan = screener_engine.run_scan_detailed(
        timeframe=body.timeframe,
        filters=body.filters,
        symbols=body.symbols,
        fast=body.fast,
        slow=body.slow,
    )
    hits = scan["results"]
    return {
        "results": hits,
        "count": len(hits),
        "scanned": scan["scanned"],
        "failed": scan["failed"],
        "insufficient_data": scan["insufficient_data"],
        "total": scan["total"],
        "provider_configured": market.configured(),
    }


@app.get("/api/screener/filters")
def screener_filters():
    # كانت تسميات يدوية «RSI oversold (<30)» والفحص `<=` (30 تطابق)، نصفها عربي ونصفها إنجليزي.
    # الآن القاعدة الآلية من ثوابت الفحص نفسها (بفترتي `ScreenerRun` الافتراضيتين) — لا نصّ يَنحرف.
    defaults = ScreenerRun()
    return {"filters": screener_engine.filter_rules(fast=defaults.fast, slow=defaults.slow)}


@app.post("/api/backtest")
def backtest_run(body: BacktestRun):
    series = build_series(body.symbol.upper(), body.timeframe)
    if _no_real_data(series):
        # لا يُشغَّل على مسار عشوائي بذري: نسبة ربح/عائد عليه أرقام مخترَعة بشكل أداء استراتيجية.
        # الوسم `demo` باقٍ لأن العميل يعرض عليه «لا بيانات حيّة».
        return {
            "strategy": body.strategy, "trades": [], "stats": {}, "equity_curve": [],
            "symbol": body.symbol.upper(), "timeframe": body.timeframe, "data_kind": "demo",
            "unavailable_reason": series.data_source.unavailable_reason or "provider_unavailable",
        }
    all_candles = [c.model_dump() for c in series.candles]
    candles = backtest_engine.closed_candles(
        all_candles, TF_SECONDS[series.timeframe], series.data_source.as_of or time.time(), body.symbol.upper()
    )
    # بلا تكلفة كانت استراتيجية تنقلب كل بضع شموع تبدو رابحة وهي خاسرة بعد السبريد عند وسيط حقيقي.
    spread = backtest_engine.typical_spread(body.symbol)
    result = backtest_engine.run_backtest(
        candles,
        strategy=body.strategy,
        fast=body.fast,
        slow=body.slow,
        rsi_low=body.rsi_low,
        rsi_high=body.rsi_high,
        spread=spread[0] * spread[1] if spread else 0.0,
    )
    if isinstance(result.get("stats"), dict) and result["stats"]:
        result["stats"]["spread_pips"] = spread[0] if spread else None
        # لا تقدير سبريد لهذا الرمز (DXY، كريبتو، مجهول) ⇒ النتيجة قبل التكاليف، ويُقال ذلك صراحةً
        result["stats"]["costs_included"] = bool(spread)
    result["symbol"] = body.symbol.upper()
    result["timeframe"] = body.timeframe
    # الشمعة الجارية لم تدخل الاختبار (المركز المفتوح يُقوَّم بآخر إغلاق **محسوم**)
    result["forming_bar_excluded"] = len(candles) < len(all_candles)
    # demo = مسار عشوائي بذري (المزوّد متعذّر): نسبة ربح/عائد عليه ليست أداء استراتيجية — العميل يرفضها.
    result["data_kind"] = series.data_source.kind
    # وقت آخر جلب حقيقي للشموع (قد يكون كاشاً حتى 15د) — كان يُستعمل لإسقاط الشمعة الجارية ولا يُرسَل
    result["as_of"] = series.data_source.as_of
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
    _require_timeframe(timeframe)
    series = build_series(market.canonical_symbol(symbol), timeframe)
    if _no_real_data(series):
        # لا RSI ولا تقاطعات ولا «تغيّر %» على شموع مختلَقة (كانت تُحسب وتُعاد موسومة demo — رقم ينتظر
        # عميلاً ينسى فحص الوسم). `SymbolSnapshot` بلا `rsi` لا يعرض شيئاً. الوسم باقٍ للعميل.
        return {
            "data_kind": "demo",
            "unavailable_reason": series.data_source.unavailable_reason or "provider_unavailable",
        }
    candles = [c.model_dump() for c in series.candles]
    snap = ind_engine.snapshot(candles)
    if snap.get("flat_closes"):
        snap["rsi"] = None  # 50 اصطلاح لسلسلة لم تتحرّك، لا قراءة موسومة provider
    snap["timeframe"] = series.timeframe
    snap["data_kind"] = series.data_source.kind
    snap["price_as_of"] = _series_price_at(series)  # وقت `last` — راجع مسار التوقّع
    return snap


@app.get("/api/signals/social/sources")
def social_sources():
    return {"sources": signal_hub.list_social_sources()}


@app.post("/api/signals/social/consensus")
def social_consensus(body: SocialConsensusBody):
    # لا مصدر مرخَّص ⇒ «غير متاح» بلا طلب للمزوّد (لا حاجة لسعر يُبنى عليه شيء).
    return signal_hub.social_consensus(body.symbol, body.timeframe)


@app.get("/api/signals/analysts/{symbol}")
def analysts_forecast(symbol: str, timeframe: str = "15m"):
    if timeframe not in TF_SECONDS:
        raise HTTPException(422, "unknown timeframe")
    if not 3 <= len(symbol) <= 12:
        raise HTTPException(422, "symbol must be 3-12 characters")
    return signal_hub.analysts_forecast(symbol, timeframe)


@app.post("/api/signals/indicators/forecast")
def indicators_forecast(body: IndicatorForecastBody):
    series = build_series(body.symbol.upper(), body.timeframe)
    if _no_real_data(series):
        # لا أصوات ولا اتجاه على شموع مختلَقة (كانت تُحسب وتُعاد موسومة demo). الوسم باقٍ للعميل.
        return {
            "symbol": body.symbol.upper(), "mode": "indicators", "direction": None,
            "avg_score": None, "votes": [], "levels": None,
            "levels_basis": {"unavailable": "no_live_price"},
            "data_kind": "demo", "timeframe": series.timeframe,
            "unavailable_reason": series.data_source.unavailable_reason or "provider_unavailable",
        }
    candles = [c.model_dump() for c in series.candles]
    out = signal_hub.indicator_forecast(body.symbol, candles, enabled=body.indicators, lang=body.lang)
    out["data_kind"] = series.data_source.kind
    out["timeframe"] = series.timeframe
    # وقت سعر الدخول (إغلاق آخر شمعة، ثوانٍ UTC) كالمساعد: بلاه مستويات السبت مبنيّة على إغلاق الجمعة، أو على
    # كاش حتى 15د عند حدّ المزوّد، وتُعرض بلا ما يقول إنها ليست السعر الحالي.
    out["price_as_of"] = _series_price_at(series)
    return out


@app.get("/api/calendar")
def economic_calendar(currency: str | None = None, impact: str | None = None):
    """`currency` و`impact` يقبلان عدّة قيم مفصولة بفواصل (`EUR,USD` و`high,medium`): المتداول
    على زوج واحد يهمّه عملتاه معاً، و«متوسط فما فوق» شرطان لا شرط. القيمة الواحدة تبقى كما كانت."""
    events = econ_calendar.fetch_calendar(currency=currency, impact=impact)
    # `status: unavailable` = المصدر متعذّر (القائمة الفارغة ليست «لا أخبار»)
    return {"events": events, **econ_calendar.calendar_status()}


def _series_price_at(series: ChartSeries) -> float | None:
    """وقت إغلاق السلسلة `last` = إغلاق آخر شمعة (فتحها + طول الفريم) إن سبق لحظة الجلب — لا لحظة الجلب
    وحدها: السبت كانت شمعة الجمعة 21:45 تُرسَل «الآن» (نفس عيب الاقتباس المصحَّح بـ9f5cccd)."""
    fetched = series.data_source.as_of
    step = TF_SECONDS.get(series.timeframe)
    # `bar_end`: لا بعد إغلاق الجمعة — شمعة W الاثنين كانت تُعدّ جارية طوال العطلة فيُرسَل إغلاق الجمعة «الآن»
    candle_end = (
        market.bar_end(series.symbol, series.candles[-1].time, step) if series.candles and step else None
    )
    known = [t for t in (fetched, candle_end) if t is not None]
    return min(known) if known else None


# كاش الاقتباس: الدفتر وحاسبة المخاطرة وقائمة المتابعة تطلب الرمز نفسه مرّات بالدقيقة، وكل طلب
# كان يصرف من حدّ المزوّد المشترك (~8/دقيقة بالخطة المجانية) ⇒ 429 ثم أسعار احتياطية للجميع.
# المُخزَّن يُعاد `data_kind: cache` مع `as_of` = وقت جلبه الحقيقي، لا «الآن».
QUOTE_TTL = 30.0
_QUOTE_CACHE: dict[str, tuple[float, dict]] = {}


@app.get("/api/market/quote/{symbol}")
def market_quote(symbol: str):
    why = market.unavailable_reason(symbol)
    if why:
        # لا سعر مختلَق لرمز لا يقدّمه المزوّد (DXY): كان يُعاد إغلاق السلسلة البذرية كـ«price».
        return {
            "symbol": market.canonical_symbol(symbol),
            "price": None,
            "bid": None,
            "ask": None,
            "spread_source": None,
            "source": "unavailable",
            "data_kind": "unavailable",
            "unavailable_reason": why,
        }
    sym = market.canonical_symbol(symbol)
    hit = _QUOTE_CACHE.get(sym)
    now = time.time()
    if hit and now - hit[0] < QUOTE_TTL:
        out = {**hit[1], "data_kind": "cache"}
        if "market_open" in out:
            # run 90: اقتباس الجمعة 20:59:50 مخزَّن بـ`market_open: true` كان يُعاد كما هو حتى 30ث بعد إغلاق
            # 17:00 نيويورك ⇒ الحاسبة/الدفتر «السوق مفتوح» بعد الإغلاق. الحالة تُحسب الآن لا وقت التخزين.
            out["market_open"] = market._market_open(sym, out["market_open"])
        return out
    try:
        book = market.fetch_quote_book(sym)
    except Exception:  # noqa: BLE001
        # مهلة/انقطاع شبكة أو ردّ غير JSON من `/quote` كان يخرج **500** — التطبيق يعرض «خطأ» بدل آخر
        # إغلاق حقيقي بوقته، مع أن فرع الشموع أدناه يخدم كاشاً حقيقياً (حتى 15د) موسوماً `cache`.
        book = None
    if book and book.get("price_only"):
        # `/quote` متعذّر (429/خطأ) فجاء رقم `/price` بلا وقت: كان يُرسَل `as_of` = «الآن» ⇒ يوم السبت
        # إغلاق الجمعة «حيّ» وحاسبة الحجم تعبّئه دخولاً. فرع الشموع أدناه يحمل وقت آخر شمعة الحقيقي.
        book = None
    elif book and book.get("quoted_at") is None:
        # `/quote` نجح بلا `last_quote_at` صالح: كان `as_of` = لحظة الجلب موسوماً `provider` ⇒ نفس عيب
        # `/price` أعلاه (إغلاق الجمعة «الآن» يوم السبت، ويُخزَّن 30ث بهذا الوقت). لا وقت للسعر ⇒ فرع
        # الشموع بوقت آخر شمعة الحقيقي بدل وقت مخترَع.
        book = None
    if not book:
        series = build_series(sym, "15m")
        if _no_real_data(series):
            # السلسلة البذرية ليست سعراً: كان إغلاقها يُعاد كـ«price» موسوماً demo — رقم مخترَع ينتظر
            # عميلاً ينسى فحص الوسم (سعر إغلاق «بسعر السوق» بالدفتر، سعر تحويل الحاسبة).
            return {
                "symbol": sym,
                "price": None,
                "bid": None,
                "ask": None,
                "spread_source": None,
                "source": "unavailable",
                "data_kind": "unavailable",
                "unavailable_reason": series.data_source.unavailable_reason or "provider_unavailable",
            }
        last = series.last
        fetched = series.data_source.as_of
        price_at = _series_price_at(series)
        return {
            "symbol": market.canonical_symbol(symbol),
            "price": last,
            # لا Bid/Ask بلا دفتر أسعار حقيقي: كان سبريد ثابت مختلَق (0.8 نقطة أساس من الإغلاق) يُعرض
            # بالشارت كـ«Bid/Ask/سبريد» للمتداول — العميل يُخفي السطر حين يكونان null.
            "bid": None,
            "ask": None,
            "spread_source": None,
            "source": "ohlc_fallback",
            # provider/cache = آخر إغلاق حقيقي؛ demo = سلسلة بذرية (المزوّد غير مهيّأ أو لا يعرف الرمز) —
            # سعر غير حقيقي لا يصلح لحساب رقمي (حاسبة حجم المركز تتجاهله وتطلب السعر يدوياً).
            "data_kind": series.data_source.kind,
            # وقت السعر (العميل يقرؤه كذلك — `quoteAsOfMs`)؛ `fetched_at` = لحظة جلب السلسلة (قد تسبق 15د مع `cache`)
            "as_of": price_at,
            "fetched_at": fetched,
            # المزوّد يختم تيكات العطلة بوقت السبت (مُتحقَّق حيّاً) ⇒ `fetch_quote_book` يرفضها فيصل كل طلب
            # عطلة إلى هنا: كان الردّ بلا `market_open` ⇒ الحاسبة تقرأ إغلاق الجمعة «متوقّفاً منذ 800 دقيقة»
            # بدل «السوق مغلق · آخر إغلاق». بساعتنا: False بالعطلة، None (لا نعرف) خارجها.
            "market_open": market._market_open(sym, None),
        }
    book["source"] = "twelvedata"
    book["data_kind"] = "provider"
    # `as_of` = وقت السعر من المزوّد (العميل يقرؤه كذلك — `quoteAsOfMs`)؛ بلاه لا يصل هنا (فرع الشموع).
    # كان دائماً لحظة الجلب ⇒ إغلاق الجمعة يُعرض يوم السبت سعراً «الآن». `fetched_at` = لحظة الجلب.
    book["as_of"] = book.pop("quoted_at")
    book["fetched_at"] = now
    _QUOTE_CACHE[sym] = (now, dict(book))
    market.note_quote(sym, book.get("price"), book["as_of"])
    return book


def _journal_iso(v, fold: int = 0) -> str | None:
    """وقت دفتر (`YYYY-MM-DD HH:MM` بتوقيت الخادم بلا منطقة) ⇒ ISO بإزاحة الخادم **لذلك التاريخ** (tools130a).
    العميل لا يعرف منطقة الخادم: متداول ببغداد كان يقرأ/يكتب الوقت مزاحاً بفرق الساعات فتنتقل صفقة الأحد 23:30
    لأسبوع آخر بالتقرير. الإزاحة لكل صفّ لا واحدة عامّة: صفقة يناير وصفقة يوليو يفصلهما التوقيت الصيفي.
    غير المقروء (صفوف قديمة بنصّ حرّ) ⇒ None — لا وقت مخمَّن."""
    if not isinstance(v, str) or not v:
        return None
    try:
        dt = datetime.strptime(v, "%Y-%m-%d %H:%M")
    except ValueError:
        return None
    try:
        return dt.replace(fold=fold).astimezone().isoformat()  # ساعة مكرَّرة بنهاية الصيفي ⇒ أولاهما (fold=0)
    except (OverflowError, OSError):
        return None


def _trade_out(row: dict | None) -> dict | None:
    if not row:
        return row
    opened, closed = row.get("opened_at"), row.get("closed_at")
    # run 113: فتح 02:40 وإغلاق 02:10 كلاهما بالساعة المكرَّرة (مقبول منذ `2a76547`) = القراءة الوحيدة المتّسقة:
    # الفتح بالمرّة الأولى (صيفي) والإغلاق بالثانية (شتوي). كان كلاهما fold=0 ⇒ `closed_at_iso` قبل `opened_at_iso`
    # بنصف ساعة وإغلاقٌ مختوم قبل وقته الحقيقي بساعة.
    later = int(
        isinstance(opened, str) and isinstance(closed, str) and closed < opened
        and db._in_dst_fold(opened) and db._in_dst_fold(closed)
    )
    return {**row, "opened_at_iso": _journal_iso(opened), "closed_at_iso": _journal_iso(closed, later)}


def _server_utc_offset_min() -> int:
    """إزاحة الخادم **الآن** بالدقائق (لكتابة وقت جديد). الأوقات المخزّنة تُقرأ من `*_at_iso` لكل صفّ."""
    off = datetime.now().astimezone().utcoffset()
    return int(off.total_seconds() // 60) if off is not None else 0


@app.get("/api/trades")
def trades_list(
    limit: int = Query(default=db.TRADES_PAGE, ge=1, le=db.TRADES_PAGE_MAX),
    # بلا حدّ أعلى: 10**20 = OverflowError عند ربط SQLite ⇒ 500
    offset: int = Query(default=0, ge=0, le=10_000_000),
    user: dict | None = Depends(_auth_user),
    key: str | None = Depends(_owner_key),
):
    """صفحة من الدفتر (المفتوحة أولاً ثم الأحدث) + `total` لكل الصفقات؛ `stats` على كل المغلقة لا الصفحة.
    `open_first` يعلن الترتيب؛ `open_total` عدد المفتوحة كلها ⇒ الصفحة الأولى تحمل كل المفتوحة
    متى `open_total <= limit` (وإلا فمجموع خطرها من الصفحة جزئي)."""
    uid = user["user_id"] if user else None
    return {
        "trades": [_trade_out(t) for t in db.list_trades(uid, owner_key=key, limit=limit, offset=offset)],
        "server_utc_offset_min": _server_utc_offset_min(),
        "open_first": True,
        "open_total": db.count_trades(uid, owner_key=key, status="open"),
        "total": db.count_trades(uid, owner_key=key),
        "limit": limit,
        "offset": offset,
        "stats": db.trade_stats(uid, owner_key=key),
    }


@app.post("/api/trades")
def trades_create(
    body: TradeCreate, user: dict | None = Depends(_auth_user), key: str | None = Depends(_owner_key)
):
    uid = user["user_id"] if user else None
    row = db.add_trade(body.model_dump(), uid, owner_key=key)
    return {"ok": True, "trade": _trade_out(row), "stats": db.trade_stats(uid, owner_key=key)}


@app.post("/api/trades/{trade_id}/close")
def trades_close(
    trade_id: str,
    body: TradeClose,
    user: dict | None = Depends(_auth_user),
    key: str | None = Depends(_owner_key),
):
    uid = user["user_id"] if user else None
    try:
        row = db.close_trade(
            trade_id, body.exit, uid, owner_key=key, expect=_seen_expect(body), closed_at=body.closed_at
        )
    except db.TradeCloseTimeInvalid as e:
        raise HTTPException(422, {"error": "invalid_closed_at", "reason": str(e)})
    except db.TradeAlreadyClosed as e:
        # 409 لا 200: الخروج المسجَّل أولاً يبقى، والعميل يعرض الصفّ كما هو مخزَّن
        raise HTTPException(409, {"error": "trade_already_closed", "trade": _trade_out(e.trade)})
    except db.TradeUpdateConflict:
        # الصفّ تغيّر عمّا رآه العميل (`seen_*`)، أو الدخول/الاتجاه يتغيّران باستمرار من جهاز آخر
        raise HTTPException(409, {"error": "trade_changed_concurrently"})
    if not row:
        raise HTTPException(404, "trade not found")
    return {"ok": True, "trade": _trade_out(row), "stats": db.trade_stats(uid, owner_key=key)}


@app.patch("/api/trades/{trade_id}")
def trades_update(
    trade_id: str,
    body: TradeUpdate,
    user: dict | None = Depends(_auth_user),
    key: str | None = Depends(_owner_key),
):
    uid = user["user_id"] if user else None
    # model_fields_set يميّز «لم يُرسَل» (لا تغيير) عن null صريح (مسح الوقف/الهدف/الخروج)
    fields = {k: getattr(body, k) for k in body.model_fields_set if not k.startswith("seen_")}
    # `seen_exit: null` صريح = «رأيتها مفتوحة بلا خروج» ⇒ يُفحص كذلك
    expect = _seen_expect(body)
    for k in ("symbol", "side", "entry", "note", "opened_at"):
        if k in fields and fields[k] is None:
            fields.pop(k)  # حقول إلزامية بالجدول — null لها يُتجاهل بدل كسر الصف
    # `size` ليس منها: null = «غير معروف» كالإنشاء (a078946). كان يُتجاهل ⇒ «1 لوت» الافتراضي القديم
    # بصفوف ما قبل الإصلاح لا يُمحى أبداً ويبقى حجماً لم يكتبه المتداول.
    try:
        row = db.update_trade(trade_id, fields, uid, owner_key=key, expect=expect)
    except db.TradeOpenTimeInvalid as e:
        raise HTTPException(422, {"error": "invalid_opened_at", "reason": str(e)})
    except db.TradeCloseTimeInvalid as e:
        raise HTTPException(422, {"error": "invalid_closed_at", "reason": str(e)})
    except db.TradeUpdateConflict:
        # لا نكتب فوق خروج لم نقرأه؛ العميل يعيد التحميل ويرى الصفّ كما هو
        raise HTTPException(409, {"error": "trade_changed_concurrently"})
    if not row:
        raise HTTPException(404, "trade not found")
    return {"ok": True, "trade": _trade_out(row), "stats": db.trade_stats(uid, owner_key=key)}


@app.delete("/api/trades/{trade_id}")
def trades_delete(
    trade_id: str, user: dict | None = Depends(_auth_user), key: str | None = Depends(_owner_key)
):
    uid = user["user_id"] if user else None
    ok = db.delete_trade(trade_id, uid, owner_key=key)
    if not ok:
        raise HTTPException(404, "trade not found")
    return {"ok": True, "stats": db.trade_stats(uid, owner_key=key)}


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
    if _blank(text):
        return {"ok": False, "error": "empty"}
    if _has_link(text):
        return {"ok": False, "error": "links_not_allowed"}
    item = {
        "id": _new_id("g"),
        "user": user["username"],
        "text": text,
        # `ts` نصّ «HH:MM» بساعة الخادم المحلية — يبقى للعميل الحالي؛ `created_at` ثوانٍ UTC ليعرضها بتوقيت المتداول
        "ts": datetime.now().strftime("%H:%M"),
        "created_at": time.time(),
        "room": "group",
    }
    try:
        db.add_group_message(item, user["user_id"])
    except PermissionError:
        # الحساب حُذف بين المصادقة والإدراج
        return {"ok": False, "error": "login_required"}
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
    # النشر للمسجّل فقط (مثل محادثة المجموعة): فكرة بلا ناشر معروف لا يمكن حظر صاحبها ولا
    # محاسبته على بلاغ — شرط أبل 1.2 (حظر المستخدم المسيء). القراءة تبقى للجميع.
    if not user:
        return {"ok": False, "error": "login_required"}
    if _has_link(body.note) or _has_link(body.symbol):
        return {"ok": False, "error": "links_not_allowed"}
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
        "created_at": time.time(),  # ثوانٍ UTC — كرسائل المجموعة
    }
    try:
        db.create_vote(item, user["user_id"])
    except PermissionError:
        return {"ok": False, "error": "login_required"}
    item["my_choice"] = None
    item["mine"] = True
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


@app.post("/api/reports")
def report_content(body: ContentReport, user: dict | None = Depends(_auth_user)):
    # بلاغ عن رسالة مجموعة أو فكرة صفقة. العنصر يختفي فوراً عند المُبلِّغ، وعن الجميع عند بلوغ
    # db.REPORT_HIDE_THRESHOLD حسابات مختلفة. المجهول لا يُبلغ (وإلا يُخفي أي أحد أي شيء بلا حد)
    # — لكنه يقدر يحظر المرسل محلياً من الواجهة.
    if not user:
        return {"ok": False, "error": "login_required"}
    r = db.report_content(body.kind, body.target_id, user["user_id"], body.reason)
    if r is None:
        return {"ok": False, "error": "not_found"}
    return {"ok": True, "new": r}


class ModerationAction(BaseModel):
    kind: Literal["group_message", "vote"]
    target_id: str = Field(min_length=1, max_length=64)
    action: Literal["remove", "dismiss"]


def _require_moderator(x_moderation_token: str | None) -> None:
    # أبل تشترط أن يتصرّف المطوّر على البلاغات خلال 24 ساعة. مسار مراجعة بسيط بتوكن من متغيّر
    # بيئة MATRIX_MODERATION_TOKEN (بلا توكن مضبوط = المسار غير موجود أصلاً → 404، لا باب مفتوح).
    expected = os.getenv("MATRIX_MODERATION_TOKEN", "")
    if not expected:
        raise HTTPException(404, "not found")
    # بايتات: `compare_digest` على نصّين يرمي TypeError لأي حرف غير ASCII (رأس «é») ⇒ 500 بدل 403
    if not x_moderation_token or not secrets.compare_digest(
        x_moderation_token.encode("utf-8", "surrogateescape"), expected.encode("utf-8", "surrogateescape")
    ):
        raise HTTPException(403, "forbidden")


@app.get("/api/moderation/reports")
def moderation_reports(x_moderation_token: str | None = Header(default=None)):
    _require_moderator(x_moderation_token)
    return {"reports": db.list_reports(), "pending_total": db.count_reported_items(),
            "hide_threshold": db.REPORT_HIDE_THRESHOLD}


@app.post("/api/moderation/action")
def moderation_action(body: ModerationAction, x_moderation_token: str | None = Header(default=None)):
    _require_moderator(x_moderation_token)
    return {"ok": db.moderate(body.kind, body.target_id, body.action)}


@app.get("/api/news")
def news():
    news = news_feed.fetch_news()
    return {"news": news, **news_feed.news_status()}


@app.get("/api/academy/schools")
def academy_schools():
    return {"schools": get_schools_summary()}


@app.get("/api/academy/schools/{school_id}")
def academy_school(school_id: str):
    """**404 لا 200 بجسم `{"error": "not found"}`**: العميل يرمي عند `!res.ok` وحده
    (`getJson`)، وله مسار احتياطي مكتوب لهذه الحالة بالضبط (`setSchoolFallback`) — فردُّ 200
    كان **يعطّل احتياطيَّه**: يُسنَد كائن الخطأ كأنه مدرسة، فـ`school.levels` غير معرّفة
    وتُعرض قائمة مستويات فارغة بلا رسالة ولا محتوى بديل."""
    school = get_school(school_id)
    if not school:
        raise HTTPException(status_code=404, detail="school not found")
    return school


@app.get("/api/academy/schools/{school_id}/lectures/{lecture_id}")
def academy_lecture(school_id: str, lecture_id: str):
    """نفس السبب، وأثره هنا أوضح: `LectureClassroom` يبني **محاضرة احتياطية بمقطعين** عند
    الخطأ، وردُّ 200 كان يمرّ من فوقه فيُعرض «درس» بلا عنوان ولا مقاطع ولا نصّ."""
    lec = get_lecture(school_id, lecture_id)
    if not lec:
        raise HTTPException(status_code=404, detail="lecture not found")
    return lec


class AcademyTtsRequest(BaseModel):
    text: str = Field(min_length=1, max_length=5000)
    # يُلصق بمسار ElevenLabs: «../voices/add» كان يصل لنقاط أخرى بمفتاح الخادم (httpx يحلّ «..»)
    voice_id: str | None = Field(default=None, pattern=r"^[A-Za-z0-9]{10,40}$")
    _t = field_validator("text")(_not_blank)


@app.get("/api/academy/voice/status")
def academy_voice_status():
    return tts.status()


@app.get("/api/academy/audio/{file_id}")
def academy_audio_file(file_id: str):
    # المعرّفات الحقيقية أول 32 من sha256 (`elevenlabs_tts.synthesize`). كان يُنقّى الحرف فقط: 300 حرف
    # (أو 130 «ب» = 260 بايت) ⇒ `exists()` يرمي «File name too long» ⇒ 500 لأيّ مجهول
    if not re.fullmatch(r"[0-9a-f]{32}", file_id):
        raise HTTPException(status_code=404, detail="audio not found")
    path = tts.CACHE_DIR / f"{file_id}.mp3"
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
        # نصّ ردّ المزوّد لا يُعاد للعميل المجهول (قد يحمل تفاصيل الحساب) — يُسجَّل فقط
        print(f"[tts] {exc}")
        raise HTTPException(status_code=502, detail="tts provider error") from exc
    return {
        "ok": True,
        "audio_url": f"/api/academy/audio/{path.stem}",
        # الصوت المستعمل فعلاً (كان الافتراضي دائماً ولو طُلب غيره؛ والافتراضي مخزَّن بعد `synthesize`)
        "voice_id": body.voice_id or tts.resolve_voice_id(),
    }


@app.post("/api/academy/interrupt")
def academy_interrupt(body: TeacherInterrupt):
    lec = get_lecture(body.school_id, body.lecture_id)
    if not lec:
        # كان 200 بجسم خطأ — كبقية مسارات الأكاديمية الآن
        raise HTTPException(status_code=404, detail="lecture not found")

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
            # قرار ٤ يشمل مدرّس الأكاديمية: الطالب قد يسأل «ماذا أشتري الآن؟» والتعليمة وحدها لا تضمن الامتثال
            clarification = openrouter_ai.guard_answer(
                openrouter_ai.interrupt_answer(q, seg_title, seg_text, lang), lang, ground=f"{seg_title}\n{seg_text}"
            )
            return {
                "ok": True,
                "paused": True,
                "teacher": "شرح صوتي",
                "clarification": clarification,
                "clarification_lang": openrouter_ai.reply_lang(clarification, lang),
                "resume_segment_index": resume_from,
                "source": "model",
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
            "clarification_lang": "en",
            "resume_segment_index": resume_from,
            # launch216a: القالب ليس جواب المدرّس — التطبيق يسمه «غير متاح الآن»
            "source": "template",
        }

    # السؤال يُقتبس في الردّ ⇒ «اشترِ عند 1.0850» كان يظهر بصوت المدرّس (قرار ٤) — لا يُقتبس حينها
    quoted = "" if openrouter_ai.has_trade_call(q) else f" «{q}»"
    clarification = (
        f"توقف الشرح مؤقتاً. كنت أشرح «{seg_title}».\n\n"
        f"خلاصة المقطع: {seg_text}\n\n"
        f"بخصوص سؤالك{quoted}:\n"
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
        # قرار أنس ١٢: القالب عربي حتى للكردي (لا نصّ كردي مراجَع) ⇒ التطبيق يقول للمستخدم إن الردّ بالعربية
        "clarification_lang": "ar",
        "resume_segment_index": resume_from,
        "source": "template",
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
                # المعلّم = `/api/academy/interrupt` بالنموذج؛ بلا مفتاح يردّ قالباً ثابتاً ⇒ لا يُعلَن
                "ai_tutor": openrouter_ai.configured(),
                "progress": s["progress"],
                "desc": s["summary"],
            }
        )
    return {"courses": cards}


@app.get("/api/courses/{course_id}")
def course_detail(course_id: str):
    school = get_school(course_id)
    if not school:
        raise HTTPException(status_code=404, detail="course not found")
    return {
        "id": school["id"],
        "school": school["name_ar"],
        "title": school["name_ar"],
        "level": f"حتى مستوى {school['max_level']}",
        "lessons": sum(len(lv["lectures"]) for lv in school["levels"]),
        "ai_tutor": openrouter_ai.configured(),
        "progress": None,  # لا مستخدم هنا ⇒ غير معروف لا «0%» (التقدّم الحقيقي بـ/api/academy/progress)
        "desc": school["summary"],
        "modules": [
            {
                "id": f"lv{lv['level']}",
                "title": f"المستوى {lv['level']}: {lv['title']}",
                "ai_quiz": False,  # لا مسار اختبار بالخادم أصلاً — كان True لميزة غير موجودة
            }
            for lv in school["levels"]
        ],
        "ai_intro": (
            f"مدرسة {school['name_ar']}: شاشة كاملة مع شرح صوتي. "
            f"يمكنك إيقاف الشرح في أي لحظة لتسأل عن جزء غير واضح."
        ),
    }


def _move_pct_text(move: float, first: float | None) -> str | None:
    """نسبة حركة حقيقية بخانتين، وبخانات أكثر إن كانت الخانتان تُظهرانها صفراً وهي ليست صفراً
    (حتى رقمين معنويين: +0.0038%) — لا «+0.00%» بجانب اتجاه، ولا «−0.00%»."""
    if not first or not math.isfinite(move):
        return None
    pct = move / first * 100
    if not math.isfinite(pct):
        return None
    dp = 2
    if pct != 0 and round(pct, 2) == 0:
        dp = min(-math.floor(math.log10(abs(pct))) + 1, 10)
    return f"{round(pct, dp) + 0.0:+.{dp}f}%"


@app.post("/api/ai/ask")
def ai_ask(body: AiAsk):
    """سؤال المساعد التعليمي. قرار أنس ٤: لا دخول ولا وقف ولا هدف ولا توصية شراء/بيع بأي مسار — كانت بطاقة
    `setup` تحمل اتجاهاً ودخولاً ووقف 1×ATR وهدف 2×ATR، والقالب «سيناريو مقترح». `setup` يبقى بالشكل (كل
    حقوله null) توافقاً مع العملاء القدامى، وردّ النموذج يمرّ بـ`openrouter_ai.guard_answer`. لا «احتمال نجاح» بأي مسار: كان `55 + hash(السؤال) % 28` (رقم عشوائي بمظهر
    إحصائي) ومسار OpenRouter يعيد 58 ثابتاً — نسبة نجاح مختلَقة يعرضها التطبيق لمتداول فردي كتقدير.
    `win_probability` يبقى بالشكل (null) توافقاً مع العملاء القدامى. وعند سلسلة demo البذرية (المزوّد
    متعذّر) لا دخول/وقف/هدف ولا اتجاه: كانت تُشتق من شموع مختلَقة وتُعرض كسيناريو على سعر حقيقي."""
    q = body.question.strip()
    sym = market.canonical_symbol(body.symbol or "") or "EURUSD"
    lang = openrouter_ai.normalize_lang(body.lang)
    series = build_series(sym)
    live = not _no_real_data(series)
    # `change_pct` = التغيّر على **كامل السلسلة** (180 شمعة: ~45 ساعة على 15m) لا «لحظي» — والنصّ يقول
    # ذلك. تغيّر صفريّ لا اتجاه له: كان `>= 0` يجعله «صاعداً» بسيناريو شراء كامل.
    # الشموع التي تغطّيها النسبة: من إغلاق الأولى إلى إغلاق الأخيرة = N−1 (كـ`change_bars` بـ`indicators.snapshot`)
    bars = max(len(series.candles) - 1, 0)
    # None = رمز بلا سعر أصلاً (DXY) ⇒ `live` False أعلاه، ولا اتجاه
    atr_raw = signal_hub._atr_raw([c.model_dump() for c in series.candles]) if live else None
    atr_v = atr_raw if atr_raw else None
    # صافي الحركة على النافذة أصغر من مدى شمعة واحدة معتاد (ATR14) = ضجيج لا اتجاه: كان أي إشارة غير صفرية
    # (+0.01% على ~45 ساعة بـ15m) ⇒ «صاعد» وسيناريو شراء كامل بدخول ووقف وهدف. الحركة من الإغلاقين
    # الحقيقيين (الأخير − أول السلسلة) لا من `change_pct`: تلك مقرَّبة لخانتين (0.005% ≈ 15% من ATR 15m
    # لليورو) فكانت حركة +0.0251% تحت ATR تُقرأ +0.03% فوقه ⇒ سيناريو شراء كامل على ضجيج، والعكس.
    move = (
        series.last - series.candles[0].close
        if series.last is not None and series.candles else 0.0
    )
    net_move = abs(move)
    # بلا ATR14 (أقلّ من 15 شمعة) لا مقياس للضجيج ⇒ لا اتجاه: كان المرشّح يُتخطّى فيصير +0.01% على 12 شمعة «شراء»
    # ATR14 = 0 (180 شمعة متطابقة: زوج مربوط أو تغذية متجمّدة) ليس «شموعاً قليلة»: كان `_atr_last` يعيد None
    # للحالتين ⇒ «180 شمعة فقط — أقلّ من أن يُقاس…» سبباً كاذباً للمستخدم وللنموذج. الآن سببان منفصلان.
    still = live and atr_raw == 0
    few = live and atr_raw is None
    # الإشارة والصفر من الحركة الحقيقية لا `chg` المقرَّب: زوج مربوط (USDHKD، ATR 15m ≈ 0.00025) يتحرّك +0.0003
    # = +0.0038% ⇒ `chg` 0.00 ⇒ كان «صافي الحركة أصغر من ATR14» — جملة كاذبة عن حركة أكبر منه.
    flat = move == 0 or few or still or (atr_v is not None and net_move < atr_v)
    # وصف الحركة (صاعدة/هابطة) مسموح — وصف ما على الشارت ليس توصية
    bias = "صاعد" if move > 0 else "هابط"
    # النسبة المعروضة من الحركة نفسها التي قرّرت الاتجاه: `change_pct` مقرَّبة لخانتين ⇒ USDHKD +0.0003
    # (+0.0038%، فوق ATR) كانت «صاعد (تغيّر +0.00%)» — اتجاه بجانب رقم يقول «لا تغيّر».
    pct_txt = _move_pct_text(move, series.candles[0].close if series.candles else None)

    # «close» كان يصف شمعة 15m لم تُغلق بعد (`at` = وقت الجلب) بأنها إغلاق ⇒ «latest price» الآن.
    # وقت `last` ومصدره: كان السياق `last=` وحده ⇒ النموذج يقول «السعر الحالي» عن سلسلة مخزَّنة (حتى 15د
    # عند حدّ المزوّد) أو عن إغلاق الجمعة يوم السبت، والدخول بالسيناريو بلا وقت بالردّ.
    price_at = _series_price_at(series) if live else None
    if live:
        at = (
            datetime.fromtimestamp(price_at, timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
            if price_at is not None else "unknown"
        )
        # run 126: «إن لم يكن حديثاً فقُله» بلا وقت الآن ⇒ النموذج لا يميّز سعر الجمعة يوم السبت (30 ساعة) من سعر
        # دقيقة، فيكتب «EURUSD is currently trading at 1.17179». و«قد تكون جارية» كانت ثابتة حتى لشمعة أُغلقت
        # يقيناً (نهايتها ≤ وقت السعر). الآن الوقت الحالي والعمر مذكوران، والقديم يُوصف «ليس السعر الحالي» صراحةً.
        now = time.time()
        step = TF_SECONDS.get(series.timeframe) or 0
        candle_end = (
            market.bar_end(series.symbol, series.candles[-1].time, step) if series.candles and step else None
        )
        closed = price_at is not None and candle_end is not None and price_at >= candle_end
        age_min = max(0, int((now - price_at) // 60)) if price_at is not None else None
        stale = age_min is None or age_min * 60 > max(2 * step, 1800)
        age_txt = (
            "age unknown" if age_min is None else
            f"{age_min // 60} h {age_min % 60} min old" if age_min >= 60 else f"{age_min} min old"
        )
        context = (
            f"now={datetime.fromtimestamp(now, timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}, "
            f"last={series.last} (last price of the candle at {at}, {age_txt} — "
            + ("that candle is closed" if closed else "that candle was still forming when this price was fetched")
            + f", source={series.data_source.kind}; not a live tick"
            + ("; this is NOT the current price (the market may be closed or the feed delayed) — say how old it "
               "is and never call it the current price" if stale else
               " — call it the latest available price, not a live price")
            + "), "
            + (f"change_pct_over_last_{bars}_candles={pct_txt}, "
               if series.change_pct is not None and pct_txt else "change_pct=unavailable (single candle), ")
            + f"tf={series.timeframe}"
            + (", bias=none (too few candles for ATR14 — direction cannot be judged)" if few else
               ", bias=none (no price movement: every candle in the window has zero range)" if still else
               ", bias=none (net move smaller than one ATR14 — no clear direction)" if flat else f", bias={bias}")
        )
    else:
        context = "no live price available (data provider unreachable) — do not quote any price"
    # قرار أنس ٤: البطاقة بلا اتجاه ولا مستويات دائماً (الشكل باقٍ للعملاء القدامى)
    setup = {"direction": None, "entry": None, "sl": None, "tp": None, "win_probability": None}
    if openrouter_ai.configured():
        try:
            answer = openrouter_ai.guard_answer(openrouter_ai.trading_answer(q, sym, context, lang), lang, ground=context)
            return {
                "answer": answer, "answer_lang": openrouter_ai.reply_lang(answer, lang), "symbol": sym,
                "setup": setup, "live_price": live, "price_as_of": price_at, "source": "model",
            }
        except Exception:
            # النموذج مربوط وتعذّر ⇒ خطأ صريح لا القالب المحلي: كان يعود 200 بـ«تحليل سريع لـ EURUSD … صاعد
            # (+1.63%)» فيعرضه تقرير الأداء الأسبوعي (`WeeklyReportPanel`) تقريراً — اتجاه سوق بلا أيّ رقم
            # من دفتره ولا «الذكاء غير متاح»؛ وبديل التطبيق الصادق (إحصاءات الدفتر) لا يعمل إلا على خطأ.
            raise HTTPException(503, {"error": "ai_unavailable"})

    if lang == "en":
        # نفس القالب التعليمي بالإنجليزية لمستخدمي en-US/en-GB (بلا اقتباس السؤال: بعض الأسئلة
        # قوالب داخلية عربية). الكردية تبقى على القالب العربي (نفس الأبجدية) لغياب مراجعة لغوية.
        if live:
            bias_en = "bullish" if move > 0 else "bearish"
            read = (
                f"Only {bars + 1} candles ({series.timeframe}) — too few to measure a normal candle range "
                f"(ATR14), so no direction.\n\n"
                if few else
                f"No price movement over the last {bars + 1} candles ({series.timeframe}) — every candle has "
                f"zero range, so no direction.\n\n"
                if still else
                f"Over the last {bars} candles ({series.timeframe}) the net move ({pct_txt}) is "
                f"smaller than one average candle range (ATR14) — no clear direction.\n\n"
                if flat else
                f"Over the last {bars} candles ({series.timeframe}) the move looks **{bias_en}** "
                f"(change {pct_txt}).\n\n"
            )
        else:
            read = "No live price is available right now, so no trend read.\n\n"
        answer = (
            f"**Quick read on {sym}**\n\n"
            f"{read}"
            # لا «DXY»: المزوّد لا يقدّمه وخانته بالتطبيق بذرة مولَّدة (launch118)
            f"- The dollar's strength shows best across more than one pair (EURUSD and USDJPY), not one chart.\n"
            f"- A break of a level is usually treated as confirmed only after a candle closes beyond it.\n"
            f"- Risk management: many traders cap the risk on any one trade at about 1% of capital.\n\n"
            # لا «connect OpenRouter»: تعليمة مطوّر لا نصّ واجهة (ui131a) — التطبيق يسم ردّ القالب بنفسه
            f"_Educational read only — not a trade recommendation._"
        )
    else:
        if live:
            read = (
                f"{bars + 1} شمعة فقط ({series.timeframe}) — أقلّ من أن يُقاس مدى الشمعة المعتاد (ATR14)، "
                f"فلا قراءة اتجاه.\n\n"
                if few else
                f"لا حركة سعرية على آخر {bars + 1} شمعة ({series.timeframe}) — مدى كل شمعة صفر، فلا قراءة "
                f"اتجاه.\n\n"
                if still else
                f"على آخر {bars} شمعة ({series.timeframe}) صافي الحركة ({pct_txt}) أصغر من "
                f"مدى شمعة واحدة معتاد (ATR14) — لا اتجاه واضح.\n\n"
                if flat else
                f"على آخر {bars} شمعة ({series.timeframe}) الحركة تبدو **{bias}** "
                f"(تغيّر {pct_txt}).\n\n"
            )
        else:
            read = "لا يتوفر سعر حي الآن، لذلك لا قراءة اتجاه.\n\n"
        # السؤال لا يُقتبس في الردّ (كالقالب الإنجليزي): سؤال فيه توصية كان يظهر بصوت المساعد (قرار ٤)، وأسئلة
        # التقارير قوالب داخلية («…فلا تسمّها كذلك. اعتمد عليها في التقرير.») كانت تُطبع للمستخدم
        answer = (
            f"**تحليل سريع لـ {sym}**\n\n"
            f"{read}"
            # لا «بالنسبة لسؤالك»: النقاط عامة لا تجيب عن السؤال (ui131a)
            f"- قوة الدولار تظهر على أكثر من زوج (EURUSD وUSDJPY) لا على شارت واحد.\n"
            f"- كسر المستوى يُعدّ مؤكَّداً عادةً بعد إغلاق شمعة خلفه لا بمجرّد لمسه.\n"
            f"- إدارة المخاطر: كثير من المتداولين لا يخاطرون بأكثر من نحو 1% من رأس المال في الصفقة الواحدة.\n\n"
            f"_قراءة تعليمية فقط — ليست توصية تداول._"
        )
    return {
        "answer": answer,
        # قرار أنس ١٢: القالب الاحتياطي عربي للكردي أيضاً (لا نصّ كردي مراجَع) ⇒ «ar»، والتطبيق يقول ذلك صراحةً
        "answer_lang": "en" if lang == "en" else "ar",
        "symbol": sym,
        "setup": setup,
        "live_price": live,
        # وقت السعر الذي بُني عليه الجواب (إغلاق آخر شمعة، ثوانٍ UTC) — null بلا سعر حقيقي
        "price_as_of": price_at,
        # «template» = قالب محلي (لا نموذج مربوط): قراءة شارت عامة، لا جواب عن السؤال — لا يصلح تقريراً
        "source": "template",
    }


@app.websocket("/ws/ticks")
async def ticks(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            live, live_at = td_ws.recent_snapshot()
            # تيكات العطلة (فوركس/معادن/نفط بعد إغلاق الجمعة) ليست أسعاراً قابلة للتداول — كانت تُبثّ «حيّة»
            at_by = td_ws.received_at(live)
            live = {s: p for s, p in live.items()
                    if not market.in_weekend_close(s, at_by.get(s) or market._session_now(), 0)}
            if live:
                sent_at = td_ws.received_at(live)
                # `as_of` = أحدث تيك **مُرسَل**: كان `live_at` قبل إسقاط تيكات العطلة ⇒ السبت يحمل BTC
                # (09:58:30) وقت تيك يورو دولار محذوف (10:00)
                live_at = max((t for t in sent_at.values() if t), default=None)
                payload = {
                    "ts": time.time(),
                    "ticks": live,
                    # وقت استلام كل تيك (قد يسبق `as_of` بحتى دقيقتين) — لا يرث وقت أحدث رمز
                    "ticks_at": sent_at,
                    "source": "twelvedata_ws",
                    # وقت الاستلام الحقيقي لا «الآن»: سعر مجمَّد (انقطاع/عطلة) كان يظهر بشارة «حي»
                    "data_source": {
                        "kind": "provider",
                        "as_of": live_at or time.time(),
                        "channel": "twelvedata_ws",
                    },
                }
            else:
                # لا أسعار بلا مزوّد. كان هنا بثّ كل ثانية لـ«أسعار» = قاعدة مكتوبة باليد ± 0.04%
                # عشوائياً (موسومة demo، لكن كل عميل مُلزَم أن يتذكّر رفضها). الآن لا تيكات والسبب معلن.
                payload = {
                    "ts": time.time(),
                    "source": "unavailable",
                    "data_source": {"kind": "unavailable", "as_of": None, "channel": None},
                    "ticks": {},
                }
            await ws.send_json(payload)
            await asyncio.sleep(1.0)
    except WebSocketDisconnect:
        return


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=API_PORT, reload=True)
