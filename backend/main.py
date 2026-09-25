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
import re
import secrets
import time
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import Annotated, Literal

from pathlib import Path

from dotenv import load_dotenv
from fastapi import Depends, FastAPI, Header, HTTPException, Query, Request, WebSocket, WebSocketDisconnect
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel, Field, model_validator

from academy_data import get_lecture, get_school, get_schools_summary
import elevenlabs_tts as tts
import twelve_data as market
import twelve_data_ws as td_ws
import db
from core.auth import _auth_user, _install_key
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


def _json_safe(v):
    """قيمة صالحة لـJSON قياسي: `inf`/`nan` تصير نصّها، والبقية كما هي (تنازلياً بالقوائم والقواميس)."""
    if isinstance(v, float) and not math.isfinite(v):
        return repr(v)
    if isinstance(v, dict):
        return {k: _json_safe(x) for k, x in v.items()}
    if isinstance(v, (list, tuple)):
        return [_json_safe(x) for x in v]
    return v


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
    return JSONResponse(status_code=422, content={"detail": _json_safe(jsonable_encoder(exc.errors()))})


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

    kind: Literal["provider", "demo", "cache", "unknown"] = "unknown"
    as_of: float | None = None
    channel: str | None = None
    # لماذا ليست بيانات مزوّد (مثلاً `not_offered_by_provider` لـDXY) — None حين لا سبب معروف.
    unavailable_reason: str | None = None


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
    """فكرة تصويت. كان الرمز 1–20 حرفاً حرّاً (كل رمز آخر بالخادم 3–12) والمستويات أيّ float:
    رمز لا يُتابَع ولا يُنبَّه عليه، وأسعار سالبة، ووقف «شراء» فوق الدخول تُنشر للمجتمع كفكرة.
    التطبيق يمنعها (`analyzePlan`) لكن الخادم هو مصدر الحقيقة لما يراه الآخرون."""

    symbol: str = Field(min_length=3, max_length=12)
    direction: Literal["buy", "sell"]
    entry: float = Field(gt=0, allow_inf_nan=False)
    sl: float = Field(gt=0, allow_inf_nan=False)
    tp: float = Field(gt=0, allow_inf_nan=False)
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
        return self


class ContentReport(BaseModel):
    kind: Literal["group_message", "vote"]
    target_id: str = Field(min_length=1, max_length=64)
    reason: Literal["spam", "abuse", "scam", "other"] = "other"


# فلتر المحتوى عند النشر (شرط أبل 1.2: «طريقة لتصفية المحتوى المرفوض قبل نشره»). أشيع ضرر في
# مجتمعات الفوركس للمتداول الفردي: روابط «قنوات توصيات» و«إدارة حسابات» تجرّه لتيليغرام/واتساب
# أو مواقع احتيال. لا روابط في الرسائل والأفكار — النص فقط. متعمَّد أن يكون ضيقاً (لا قائمة شتائم
# بأربع لغات تحجب كلاماً بريئاً)؛ الإساءة تُعالَج بالبلاغ + الحظر.
_LINK_RE = re.compile(
    r"(https?://|www\.|\bt\.me/|\bwa\.me/|\btelegram\.me/|\bchat\.whatsapp\.com/|"
    r"\b[a-z0-9-]+\.(?:com|net|org|io|me|xyz|link|site|online|top|info|biz|co|app)\b)",
    re.IGNORECASE,
)


def _has_link(text: str) -> bool:
    return bool(_LINK_RE.search(text or ""))


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
    # كملاحظة الدفتر/التصويت: بلا حدّ كان نصّ غير محدود يُخزَّن ويُرسل بالإشعار
    note: str = Field(default="", max_length=500)


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
    # العميل يرسل معرّفه المحلي فيبقى تخطيط واحد لكل تخطيط محلي (كان كل حفظ يُنشئ صفاً جديداً)
    id: str | None = Field(default=None, max_length=64)
    name: str = Field(min_length=1, max_length=64)
    payload: dict


class WatchlistAdd(BaseModel):
    symbol: str = Field(min_length=3, max_length=12)


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
        for sym in self.symbols or []:
            if not (3 <= len(sym.strip()) <= 12):
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
    rsi_low: float = Field(default=30, gt=0, lt=100, allow_inf_nan=False)
    rsi_high: float = Field(default=70, gt=0, lt=100, allow_inf_nan=False)

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
        unknown = sorted({i for i in (self.indicators or []) if i not in signal_hub.FORECAST_INDICATOR_IDS})
        if unknown:
            raise ValueError(f"unknown indicator: {', '.join(unknown)}")
        return self


class IndicatorAlertCreate(BaseModel):
    symbol: str = Field(min_length=3, max_length=12)
    timeframe: str = "15m"
    alert_type: Literal["rsi", "ma_cross", "macd_cross"]
    condition: Literal["above", "below", "cross_up", "cross_down"]
    value: float | None = None
    fast_period: int = 9
    slow_period: int = 21
    note: str = Field(default="", max_length=500)

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
    entry: float = Field(gt=0, allow_inf_nan=False)
    exit: float | None = Field(default=None, gt=0, allow_inf_nan=False)
    # غائب = «غير معروف» (null بالقاعدة) لا لوت واحد: الافتراض 1 كان يُخزَّن فيقرأه المتداول حجماً كتبه.
    size: float | None = Field(default=None, gt=0, allow_inf_nan=False)
    note: str = Field(default="", max_length=500)
    opened_at: str | None = None
    sl: float | None = Field(default=None, gt=0, allow_inf_nan=False)
    tp: float | None = Field(default=None, gt=0, allow_inf_nan=False)


class TradeClose(BaseModel):
    """سعر إغلاق الصفقة. موجب منتهٍ: إغلاق بـ`exit=0` كان يُحفظ بـ`-100%` وبسعر سالب
    بـ`-554%`، وكلاهما يدخل نسبة النجاح وصافي الدفتر ولا يُمحى إلا بحذف الصفقة."""

    exit: float = Field(gt=0, allow_inf_nan=False)


class TradeUpdate(BaseModel):
    """تعديل صفقة بالدفتر (خطأ كتابة بالدخول/الوقف، ملاحظة لاحقة). الحقول الغائبة لا تتغيّر؛ `exit`/`sl`/`tp`
    بقيمة null صريحة تُمسح (مسح `exit` يعيد الصفقة مفتوحة)."""

    symbol: str | None = Field(default=None, min_length=3, max_length=12)
    side: Literal["buy", "sell"] | None = None
    entry: float | None = Field(default=None, gt=0, allow_inf_nan=False)
    exit: float | None = Field(default=None, gt=0, allow_inf_nan=False)
    size: float | None = Field(default=None, gt=0, allow_inf_nan=False)
    note: str | None = Field(default=None, max_length=500)
    sl: float | None = Field(default=None, gt=0, allow_inf_nan=False)
    tp: float | None = Field(default=None, gt=0, allow_inf_nan=False)


def _new_id(prefix: str) -> str:
    """معرّف فريد فعلاً لصفّ جديد (تنبيه/تنبيه مؤشر/فكرة صفقة).

    كانت المعرّفات `a{int(time.time())}{random 10–99}` و`v{int(time.time())}` — بدقّة ثانية، والجدول
    يُدرج بـ`INSERT` عادي على مفتاح أساسي: تنبيهان بنفس الثانية (1 من 90) أو فكرتا صفقة بنفس الثانية
    (دائماً) → `IntegrityError` = HTTP 500 للمستخدم الثاني. البادئة تبقى كما هي (لا عميل يحلّل المعرّف).
    """
    return f"{prefix}{int(time.time())}{secrets.token_hex(4)}"


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


# حجم السلسلة التي يفحص عليها `check_indicator_alerts` (الافتراضي أدناه)، ومنه أطول فترة
# متوسط يمكن أن تتقاطع فعلاً: `sma` تعطي أول قيمة عند الفهرس period-1، و`cross_up`/`cross_down`
# يلزمهما آخر **قيمتين** غير فارغتين — أي أن فترة أطول من (الطول − 1) لا تُنتج قيمتين أبداً
# فلا يتقاطع المتوسط مهما فعل السوق.
CHECK_SERIES_SIZE = 180
MIN_MA_PERIOD = 1
MAX_MA_PERIOD = CHECK_SERIES_SIZE - 1


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

    why = market.unavailable_reason(sym)
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
        data_source=DataProvenance(
            kind="demo", as_of=time.time(), channel="seed", unavailable_reason=why
        ),
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
def push_register(
    body: PushRegister,
    user: dict | None = Depends(_auth_user),
    key: str | None = Depends(_install_key),
):
    uid = user["user_id"] if user else None
    db.save_push_token(body.token, body.platform, uid, body.lang, owner_key=key)
    return {"ok": True}


@app.get("/api/layouts")
def layouts_list(user: dict | None = Depends(_auth_user), key: str | None = Depends(_install_key)):
    uid = user["user_id"] if user else None
    return {"layouts": db.list_layouts(uid, owner_key=key)}


@app.post("/api/layouts")
def layouts_save(
    body: LayoutSave,
    user: dict | None = Depends(_auth_user),
    key: str | None = Depends(_install_key),
):
    uid = user["user_id"] if user else None
    # db.save_layout يتولّى توليد معرّف فريد عند غيابه ويمنع الكتابة فوق تخطيط مالك آخر (مجهول أو مسجّل)
    saved = db.save_layout(body.id, body.name, body.payload, uid, owner_key=key)
    return {"ok": True, "layout": saved}


@app.delete("/api/layouts/{layout_id}")
def layouts_delete(
    layout_id: str, user: dict | None = Depends(_auth_user), key: str | None = Depends(_install_key)
):
    uid = user["user_id"] if user else None
    # حذف بلا صف مطابق ليس خطأً للعميل (تخطيط محلي لم يصل للخادم قط) — يُعاد عدد المحذوف فقط
    return {"ok": True, "deleted": db.delete_layout(layout_id, uid, owner_key=key)}


@app.get("/api/watchlist/custom")
def custom_watchlist(user: dict | None = Depends(_auth_user), key: str | None = Depends(_install_key)):
    uid = user["user_id"] if user else None
    syms = db.get_watchlist(uid, owner_key=key)
    return {"symbols": syms}


@app.post("/api/watchlist/custom")
def custom_watchlist_add(
    body: WatchlistAdd,
    user: dict | None = Depends(_auth_user),
    key: str | None = Depends(_install_key),
):
    uid = user["user_id"] if user else None
    syms = db.add_watchlist_symbol(body.symbol.upper(), uid, owner_key=key)
    return {"ok": True, "symbols": syms}


@app.delete("/api/watchlist/custom/{symbol}")
def custom_watchlist_remove(
    symbol: str,
    user: dict | None = Depends(_auth_user),
    key: str | None = Depends(_install_key),
):
    """إزالة رمز من قائمة متابعة المستدعي — **لم يكن للإضافة نقيض**: رمز يُضاف بضغطة ويبقى
    بالقائمة إلى الأبد (الرموز المدعومة ستة عشر، وقائمة مزدحمة برموز لا يتداولها تُفقد
    التبديل بلمسة واحدة معناه).

    حذف رمز ليس بالقائمة ليس خطأ للعميل (زرّ ضُغط مرّتين، أو قائمة محلية سبقت الخادم) —
    يُعاد `removed: 0` وقائمة المستدعي كما هي، كما بحذف التخطيط."""
    uid = user["user_id"] if user else None
    removed, syms = db.remove_watchlist_symbol(symbol, uid, owner_key=key)
    return {"ok": True, "removed": removed, "symbols": syms}


@app.get("/api/academy/progress")
def academy_progress_get(user: dict | None = Depends(_auth_user)):
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
    """
    if not q.strip():
        return {"results": []}
    if not market.configured():
        raise HTTPException(status_code=503, detail="Twelve Data not configured")
    try:
        results = market.symbol_search(q, limit=limit)
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
        ]
        + [
            {"symbol": sym, "td_symbol": None, "unavailable_reason": why}
            for sym, why in market.UNAVAILABLE_AT_PROVIDER.items()
        ],
        "market": market.status(),
    }


@app.get("/api/charts/{symbol}")
def chart(symbol: str, timeframe: str = "15m", outputsize: int = 180):
    return build_series(symbol, timeframe, outputsize)


@app.get("/api/alerts")
def list_alerts(user: dict | None = Depends(_auth_user), key: str | None = Depends(_install_key)):
    uid = user["user_id"] if user else None
    return {"alerts": db.list_alerts(uid, owner_key=key)}


@app.post("/api/alerts")
def create_alert(
    body: AlertCreate,
    user: dict | None = Depends(_auth_user),
    key: str | None = Depends(_install_key),
):
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
    db.create_alert(alert, uid, owner_key=key)
    return {"ok": True, "alert": alert}


@app.patch("/api/alerts/{alert_id}")
def update_alert(
    alert_id: str,
    body: AlertCreate,
    user: dict | None = Depends(_auth_user),
    key: str | None = Depends(_install_key),
):
    """تعديل ذرّي للتنبيه (بدل إنشاء جديد ثم حذف القديم) — يُعيد تفعيله. 404 إن لم يوجد أو لا يملكه."""
    data = {
        "symbol": body.symbol.upper(),
        "condition": body.condition,
        "price": round(body.price, 5),
        "note": body.note.strip(),
        "ts": datetime.now(timezone.utc).isoformat(),
    }
    uid = user["user_id"] if user else None
    alert = db.update_alert(alert_id, data, uid, owner_key=key)
    if alert is None:
        raise HTTPException(status_code=404, detail="alert not found")
    return {"ok": True, "alert": alert}


@app.delete("/api/alerts/{alert_id}")
def delete_alert(
    alert_id: str, user: dict | None = Depends(_auth_user), key: str | None = Depends(_install_key)
):
    uid = user["user_id"] if user else None
    return {"ok": db.delete_alert(alert_id, uid, owner_key=key)}


@app.post("/api/alerts/check")
def check_alerts(user: dict | None = Depends(_auth_user), key: str | None = Depends(_install_key)):
    """يفحص تنبيهات المستدعي فقط ويعيدها (كان يعيد تنبيهات كل المستخدمين فتستبدل قائمة العميل،
    وجهاز مجهول كان يُطلق تنبيهات كل المجهولين — الآن تنبيهات جهازه فقط عبر `X-Install-Id`)."""
    uid = user["user_id"] if user else None
    triggered: list[dict] = []
    # طلب واحد لكل رمز (كان طلب quote لكل تنبيه — 10 تنبيهات EURUSD × كل جهاز مفتوح كل دقيقة تستنزف حد
    # Twelve Data)، ونفس قاعدة الـworker: السعر الحالي أو ذيل شمعة 1m بعد دقيقة التسليح.
    quotes: dict[str, tuple[float | None, list[dict]]] = {}
    for a in db.list_alerts(uid, owner_key=key):
        if not a.get("active") or a.get("triggered"):
            continue
        sym = str(a["symbol"]).upper()
        if sym not in quotes:
            quotes[sym] = alert_worker._recent_minutes(sym)
        q, candles = quotes[sym]
        if q is None:
            continue
        if alert_worker._price_hit(a, q, candles) and db.mark_alert_triggered(a["id"]):
            # الصفّ كما استقرّ بالقاعدة لا كما قُرئ قبل القلب: `a` لُقّط قبل
            # `mark_alert_triggered` فيحمل `triggered: false` — أي أن المسار كان يسلّم تنبيهاً
            # **أُطلق للتوّ** موسوماً «يراقب». نفس التصحيح المطبَّق على تنبيهات المؤشر
            # (`/api/indicator-alerts/check`) وكان شقيقه السعريّ خارجه. العميل الحالي يبني
            # قائمته من `alerts` ويستعمل `triggered` للوميض والإشعار وحدهما فلا يظهر الأثر
            # اليوم — **يُقال كما هو**: هذا إغلاق فخّ لا إصلاح عطب ظاهر.
            triggered.append({**a, "triggered": True, "current": q})
    return {"triggered": triggered, "alerts": db.list_alerts(uid, owner_key=key)}


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
def list_indicator_alerts(
    user: dict | None = Depends(_auth_user), key: str | None = Depends(_install_key)
):
    uid = user["user_id"] if user else None
    return {"alerts": db.list_indicator_alerts(uid, owner_key=key)}


@app.post("/api/indicator-alerts")
def create_indicator_alert(
    body: IndicatorAlertCreate,
    user: dict | None = Depends(_auth_user),
    key: str | None = Depends(_install_key),
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
    alert_id: str, user: dict | None = Depends(_auth_user), key: str | None = Depends(_install_key)
):
    uid = user["user_id"] if user else None
    return {"ok": db.delete_indicator_alert(alert_id, uid, owner_key=key)}


@app.post("/api/indicator-alerts/{alert_id}/rearm")
def rearm_indicator_alert(
    alert_id: str, user: dict | None = Depends(_auth_user), key: str | None = Depends(_install_key)
):
    """إعادة تفعيل تنبيه مؤشر أُطلق (التنبيه لمرة واحدة) — كان الحلّ الوحيد حذفه وإعادة إنشائه بكل حقوله."""
    uid = user["user_id"] if user else None
    row = db.rearm_indicator_alert(alert_id, uid, owner_key=key)
    if row is None:
        raise HTTPException(status_code=404, detail="alert not found")
    return {"ok": True, "alert": row}


@app.post("/api/indicator-alerts/check")
def check_indicator_alerts(
    user: dict | None = Depends(_auth_user), key: str | None = Depends(_install_key)
):
    """تنبيهات المستدعي فقط (نفس قاعدة الرؤية في /api/indicator-alerts).

    سلسلة واحدة لكل (رمز، فريم) بالطلب — كانت تُبنى لكل تنبيه (3 تنبيهات EURUSD 1h = 3 طلبات للمزوّد
    من كل جهاز مفتوح). الفشل يُخزَّن أيضاً فلا يُعاد لنفس المفتاح. سلسلة demo البذرية تُعامَل كفشل."""
    uid = user["user_id"] if user else None
    triggered: list[dict] = []
    cache: dict[tuple[str, str], list[dict] | None] = {}
    for a in db.list_indicator_alerts(uid, owner_key=key):
        if not a.get("active") or a.get("triggered"):
            continue
        ck = (str(a["symbol"]).upper(), str(a["timeframe"]))
        if ck not in cache:
            try:
                series = build_series(a["symbol"], a["timeframe"])
                # سلسلة بذرية (المزوّد متعذّر) = شموع مختلَقة: كان تقاطع/RSI عليها يُطلق التنبيه ويعلّمه
                # «مُطلَق» نهائياً بلا حدث سوقي حقيقي. نتخطّاها كفشل (يُعاد الفحص بالطلب التالي).
                if series.data_source.kind == "demo":
                    cache[ck] = None
                else:
                    cache[ck] = [c.model_dump() for c in series.candles]
            except Exception:
                cache[ck] = None
        candles = cache[ck]
        if candles is None:
            continue
        if _check_indicator_alert(a, candles) and db.mark_indicator_alert_triggered(a["id"]):
            # الصفّ كما استقرّ بالقاعدة لا كما قُرئ قبل القلب: `a` لُقّط قبل
            # `mark_indicator_alert_triggered` فيحمل `triggered: false` — أي أن المسار كان
            # يسلّم تنبيهاً **أُطلق للتوّ** موسوماً «يراقب». العميل الحالي يستعمل هذه القائمة
            # للإشعار وحده فلم يظهر الأثر، لكنه فخّ لأي عرض يبني على الوسم (نفس قاعدة
            # `/api/academy/progress`: يُعاد ما بالقاعدة لا ما وصل بالطلب).
            triggered.append({**a, "triggered": True})
    return {"triggered": triggered, "alerts": db.list_indicator_alerts(uid, owner_key=key)}


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
    if series.data_source.kind == "demo":
        # لا يُشغَّل على مسار عشوائي بذري: نسبة ربح/عائد عليه أرقام مخترَعة بشكل أداء استراتيجية.
        # الوسم `demo` باقٍ لأن العميل يعرض عليه «لا بيانات حيّة».
        return {
            "strategy": body.strategy, "trades": [], "stats": {}, "equity_curve": [],
            "symbol": body.symbol.upper(), "timeframe": body.timeframe, "data_kind": "demo",
            "unavailable_reason": series.data_source.unavailable_reason or "provider_unavailable",
        }
    candles = [c.model_dump() for c in series.candles]
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
    # demo = مسار عشوائي بذري (المزوّد متعذّر): نسبة ربح/عائد عليه ليست أداء استراتيجية — العميل يرفضها.
    result["data_kind"] = series.data_source.kind
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
    if series.data_source.kind == "demo":
        # لا RSI ولا تقاطعات ولا «تغيّر %» على شموع مختلَقة (كانت تُحسب وتُعاد موسومة demo — رقم ينتظر
        # عميلاً ينسى فحص الوسم). `SymbolSnapshot` بلا `rsi` لا يعرض شيئاً. الوسم باقٍ للعميل.
        return {
            "data_kind": "demo",
            "unavailable_reason": series.data_source.unavailable_reason or "provider_unavailable",
        }
    candles = [c.model_dump() for c in series.candles]
    snap = ind_engine.snapshot(candles)
    snap["timeframe"] = series.timeframe
    snap["data_kind"] = series.data_source.kind
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
    if series.data_source.kind == "demo":
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
    return out


@app.get("/api/calendar")
def economic_calendar(currency: str | None = None, impact: str | None = None):
    """`currency` و`impact` يقبلان عدّة قيم مفصولة بفواصل (`EUR,USD` و`high,medium`): المتداول
    على زوج واحد يهمّه عملتاه معاً، و«متوسط فما فوق» شرطان لا شرط. القيمة الواحدة تبقى كما كانت."""
    events = econ_calendar.fetch_calendar(currency=currency, impact=impact)
    # `status: unavailable` = المصدر متعذّر (القائمة الفارغة ليست «لا أخبار»)
    return {"events": events, **econ_calendar.calendar_status()}


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
            "symbol": symbol.upper(),
            "price": None,
            "bid": None,
            "ask": None,
            "spread_source": None,
            "source": "unavailable",
            "data_kind": "unavailable",
            "unavailable_reason": why,
        }
    sym = symbol.upper()
    hit = _QUOTE_CACHE.get(sym)
    now = time.time()
    if hit and now - hit[0] < QUOTE_TTL:
        return {**hit[1], "data_kind": "cache"}
    book = market.fetch_quote_book(sym)
    if book and book.get("price_only"):
        # `/quote` متعذّر (429/خطأ) فجاء رقم `/price` بلا وقت: كان يُرسَل `as_of` = «الآن» ⇒ يوم السبت
        # إغلاق الجمعة «حيّ» وحاسبة الحجم تعبّئه دخولاً. فرع الشموع أدناه يحمل وقت آخر شمعة الحقيقي.
        book = None
    if not book:
        series = build_series(sym, "15m")
        if series.data_source.kind == "demo":
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
        # وقت السعر = إغلاق آخر شمعة (فتحها + 15د) إن سبق لحظة الجلب — لا لحظة الجلب وحدها: السبت
        # كانت شمعة الجمعة 21:45 تُرسَل `as_of` = «الآن» (نفس عيب الاقتباس المصحَّح بـ9f5cccd).
        fetched = series.data_source.as_of
        candle_end = float(series.candles[-1].time + TF_SECONDS["15m"]) if series.candles else None
        known = [t for t in (fetched, candle_end) if t is not None]
        price_at = min(known) if known else None
        return {
            "symbol": symbol.upper(),
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
        }
    book["source"] = "twelvedata"
    book["data_kind"] = "provider"
    # `as_of` = وقت السعر (العميل يقرؤه كذلك — `quoteAsOfMs`): وقت المزوّد حين يرسله، وإلا لحظة الجلب.
    # كان دائماً لحظة الجلب ⇒ إغلاق الجمعة يُعرض يوم السبت سعراً «الآن». `fetched_at` = لحظة الجلب.
    quoted_at = book.pop("quoted_at", None)
    book["as_of"] = quoted_at if quoted_at is not None else now
    book["fetched_at"] = now
    _QUOTE_CACHE[sym] = (now, dict(book))
    return book


@app.get("/api/trades")
def trades_list(
    limit: int = Query(default=db.TRADES_PAGE, ge=1, le=db.TRADES_PAGE_MAX),
    offset: int = Query(default=0, ge=0),
    user: dict | None = Depends(_auth_user),
    key: str | None = Depends(_install_key),
):
    """صفحة من الدفتر (الأحدث أولاً) + `total` لكل الصفقات؛ `stats` على كل المغلقة لا الصفحة."""
    uid = user["user_id"] if user else None
    return {
        "trades": db.list_trades(uid, owner_key=key, limit=limit, offset=offset),
        "total": db.count_trades(uid, owner_key=key),
        "limit": limit,
        "offset": offset,
        "stats": db.trade_stats(uid, owner_key=key),
    }


@app.post("/api/trades")
def trades_create(
    body: TradeCreate, user: dict | None = Depends(_auth_user), key: str | None = Depends(_install_key)
):
    uid = user["user_id"] if user else None
    row = db.add_trade(body.model_dump(), uid, owner_key=key)
    return {"ok": True, "trade": row, "stats": db.trade_stats(uid, owner_key=key)}


@app.post("/api/trades/{trade_id}/close")
def trades_close(
    trade_id: str,
    body: TradeClose,
    user: dict | None = Depends(_auth_user),
    key: str | None = Depends(_install_key),
):
    uid = user["user_id"] if user else None
    try:
        row = db.close_trade(trade_id, body.exit, uid, owner_key=key)
    except db.TradeAlreadyClosed as e:
        # 409 لا 200: الخروج المسجَّل أولاً يبقى، والعميل يعرض الصفّ كما هو مخزَّن
        raise HTTPException(409, {"error": "trade_already_closed", "trade": e.trade})
    if not row:
        raise HTTPException(404, "trade not found")
    return {"ok": True, "trade": row, "stats": db.trade_stats(uid, owner_key=key)}


@app.patch("/api/trades/{trade_id}")
def trades_update(
    trade_id: str,
    body: TradeUpdate,
    user: dict | None = Depends(_auth_user),
    key: str | None = Depends(_install_key),
):
    uid = user["user_id"] if user else None
    # model_fields_set يميّز «لم يُرسَل» (لا تغيير) عن null صريح (مسح الوقف/الهدف/الخروج)
    fields = {k: getattr(body, k) for k in body.model_fields_set}
    for k in ("symbol", "side", "entry", "size", "note"):
        if k in fields and fields[k] is None:
            fields.pop(k)  # حقول إلزامية بالجدول — null لها يُتجاهل بدل كسر الصف
    row = db.update_trade(trade_id, fields, uid, owner_key=key)
    if not row:
        raise HTTPException(404, "trade not found")
    return {"ok": True, "trade": row, "stats": db.trade_stats(uid, owner_key=key)}


@app.delete("/api/trades/{trade_id}")
def trades_delete(
    trade_id: str, user: dict | None = Depends(_auth_user), key: str | None = Depends(_install_key)
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
    if not text:
        return {"ok": False, "error": "empty"}
    if _has_link(text):
        return {"ok": False, "error": "links_not_allowed"}
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
    }
    db.create_vote(item, user["user_id"])
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
    if not x_moderation_token or not secrets.compare_digest(x_moderation_token, expected):
        raise HTTPException(403, "forbidden")


@app.get("/api/moderation/reports")
def moderation_reports(x_moderation_token: str | None = Header(default=None)):
    _require_moderator(x_moderation_token)
    return {"reports": db.list_reports(), "hide_threshold": db.REPORT_HIDE_THRESHOLD}


@app.post("/api/moderation/action")
def moderation_action(body: ModerationAction, x_moderation_token: str | None = Header(default=None)):
    _require_moderator(x_moderation_token)
    return {"ok": db.moderate(body.kind, body.target_id, body.action)}


@app.get("/api/news")
def news():
    return {"news": news_feed.fetch_news()}


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
        raise HTTPException(status_code=404, detail="course not found")
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
    """سؤال المساعد. لا «احتمال نجاح» بأي مسار: كان `55 + hash(السؤال) % 28` (رقم عشوائي بمظهر
    إحصائي) ومسار OpenRouter يعيد 58 ثابتاً — نسبة نجاح مختلَقة يعرضها التطبيق لمتداول فردي كتقدير.
    `win_probability` يبقى بالشكل (null) توافقاً مع العملاء القدامى. وعند سلسلة demo البذرية (المزوّد
    متعذّر) لا دخول/وقف/هدف ولا اتجاه: كانت تُشتق من شموع مختلَقة وتُعرض كسيناريو على سعر حقيقي."""
    q = body.question.strip()
    sym = (body.symbol or "EURUSD").upper()
    lang = openrouter_ai.normalize_lang(body.lang)
    series = build_series(sym)
    live = series.data_source.kind != "demo"
    # `change_pct` = التغيّر على **كامل السلسلة** (180 شمعة: ~45 ساعة على 15m) لا «لحظي» — والنصّ يقول
    # ذلك. تغيّر صفريّ لا اتجاه له: كان `>= 0` يجعله «صاعداً» بسيناريو شراء كامل.
    bars = len(series.candles)
    flat = series.change_pct == 0
    bias = "صاعد" if series.change_pct > 0 else "هابط"
    direction: str | None = None if flat else ("شراء" if series.change_pct > 0 else "بيع")
    entry: float | None = None
    sl: float | None = None
    tp: float | None = None
    if live and direction is not None:
        # وقف 1×ATR14 وهدف 2×ATR14 على فريم السلسلة (العائد/المخاطرة 1:2 كما يقول النص). كان 0.4%/0.8%
        # ثابتين لكل فريم، ومقرَّبين لخانتين حين السعر ≥50 ⇒ USDJPY تفقد خانة.
        atr_v = signal_hub._atr_last([c.model_dump() for c in series.candles])
        if atr_v is not None:
            sgn = 1 if direction == "شراء" else -1
            entry = series.last
            sl = round(entry - sgn * atr_v, 5)
            tp = round(entry + sgn * 2 * atr_v, 5)

    if live:
        context = (
            f"last={series.last}, change_pct_over_last_{bars}_candles={series.change_pct:+.2f}%, "
            f"tf={series.timeframe}" + ("" if flat else f", bias={bias}")
        )
    else:
        context = "no live price available (data provider unreachable) — do not quote price levels"
    if openrouter_ai.configured():
        try:
            answer = openrouter_ai.trading_answer(q, sym, context, lang)
            setup = openrouter_ai.parse_setup_hint(answer)
            # المستويات مبنيّة على اتجاه الخادم (إشارة التغيّر)؛ تُرفق فقط إن طابقه اتجاه الردّ —
            # كانت تُرفق دائماً فيظهر «بيع» بوقف تحت الدخول (مستويات شراء).
            if entry is not None and setup["direction"] == ("buy" if direction == "شراء" else "sell"):
                setup.update(entry=entry, sl=sl, tp=tp)
            if not live:
                setup["direction"] = None
            return {"answer": answer, "symbol": sym, "setup": setup, "live_price": live}
        except Exception:
            pass

    if lang == "en":
        # نفس القالب التعليمي بالإنجليزية لمستخدمي en-US/en-GB (بلا اقتباس السؤال: بعض الأسئلة
        # قوالب داخلية عربية). الكردية تبقى على القالب العربي (نفس الأبجدية) لغياب مراجعة لغوية.
        if live:
            bias_en = "bullish" if series.change_pct > 0 else "bearish"
            dir_en = "Buy" if direction == "شراء" else "Sell"
            read = (
                f"Over the last {bars} candles ({series.timeframe}) the price is flat (0.00%) — no direction.\n\n"
                if flat else
                f"Over the last {bars} candles ({series.timeframe}) the move looks **{bias_en}** "
                f"(change {series.change_pct:+.2f}%).\n\n"
            )
            scenario = (
                f"**Suggested scenario (educational, not financial advice):**\n"
                f"- Direction: {dir_en}\n"
                f"- Entry: {entry}\n"
                f"- Stop: {sl}\n"
                f"- Target: {tp}\n"
                f"- Risk/reward: 1:2\n\n"
            ) if entry is not None else ""
        else:
            read = "No live price is available right now, so no trend read or price levels.\n\n"
            scenario = ""
        answer = (
            f"**Quick read on {sym}**\n\n"
            f"{read}"
            f"- Check the pair against **DXY** before entering.\n"
            f"- Wait for a confirmed break or rejection at the nearest liquidity zone.\n"
            f"- Risk management: never risk more than 1% of your capital per trade.\n\n"
            f"{scenario}"
            f"_Local MVP model — connect OpenRouter for deeper analysis._"
        )
    else:
        if live:
            read = (
                f"على آخر {bars} شمعة ({series.timeframe}) السعر ثابت (0.00%) — لا اتجاه.\n\n"
                if flat else
                f"على آخر {bars} شمعة ({series.timeframe}) الحركة تبدو **{bias}** "
                f"(تغيّر {series.change_pct:+.2f}%).\n\n"
            )
            scenario = (
                f"**سيناريو مقترح (تعليمي وليس نصيحة مالية):**\n"
                f"- الاتجاه: {direction}\n"
                f"- دخول: {entry}\n"
                f"- وقف: {sl}\n"
                f"- هدف: {tp}\n"
                f"- العائد/المخاطرة: 1:2\n\n"
            ) if entry is not None else ""
        else:
            read = "لا يتوفر سعر حي الآن، لذلك لا قراءة اتجاه ولا مستويات سعرية.\n\n"
            scenario = ""
        answer = (
            f"**تحليل سريع لـ {sym}**\n\n"
            f"{read}"
            f"بالنسبة لسؤالك: «{q}»\n"
            f"- راقب علاقة الزوج مع **DXY** قبل الدخول.\n"
            f"- انتظر تأكيد كسر/رفض عند أقرب منطقة سيولة.\n"
            f"- إدارة المخاطر: لا تتجاوز 1% من رأس المال للصفقة.\n\n"
            f"{scenario}"
            f"_هذا النموذج MVP محلي — اربطه بـ OpenRouter لاحقاً لتحليل أعمق._"
        )
    return {
        "answer": answer,
        "symbol": sym,
        "setup": {
            "direction": ("buy" if direction == "شراء" else "sell") if live and direction else None,
            "entry": entry,
            "sl": sl,
            "tp": tp,
            "win_probability": None,
        },
        "live_price": live,
    }


@app.websocket("/ws/ticks")
async def ticks(ws: WebSocket):
    await ws.accept()
    try:
        while True:
            live, live_at = td_ws.recent_snapshot()
            if live:
                payload = {
                    "ts": time.time(),
                    "ticks": live,
                    # وقت استلام كل تيك (قد يسبق `as_of` بحتى دقيقتين) — لا يرث وقت أحدث رمز
                    "ticks_at": td_ws.received_at(live),
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
