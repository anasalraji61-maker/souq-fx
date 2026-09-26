"""Simple strategy backtest on historical candles."""
from __future__ import annotations

from typing import Any, Literal

import indicators as ind
from twelve_data import bar_end

StrategyId = Literal["ma_cross", "rsi_reversal", "macd_cross", "bb_bounce"]

_MAJORS = {"EUR", "GBP", "AUD", "NZD", "USD", "CAD", "CHF", "JPY"}
_TIGHTEST = {"EURUSD", "USDJPY"}
_MAJOR_USD = {"GBPUSD", "AUDUSD", "NZDUSD", "USDCAD", "USDCHF"}
_ALIASES = {"GOLD": "XAUUSD", "SILVER": "XAGUSD"}
_OIL = {"USOIL", "UKOIL", "WTI", "BRENT", "XTIUSD", "XBRUSD", "WTIUSD"}


def _round(x: float, n: int) -> float:
    """`round` بلا «−0.0»: صفقة بيع خرجت بسعر دخولها (أو عائد −0.001%) كانت تُرسَل `-0.0` فيعرضها
    العميل «−0.00%» — خسارة لم تحدث."""
    return round(x, n) + 0.0


def typical_spread(symbol: str) -> tuple[float, float] | None:
    """سبريد تقديري لحساب تجزئة عادي: (عدد الـpip، حجم الـpip). None = ليس زوج فوركس/معدن (DXY مؤشر لا يُتداول).

    تقدير محافظ لا سعر وسيط بعينه — الغرض ألا يُعرض عائد استراتيجية تنقلب كل بضع شموع بلا أي تكلفة،
    فتبدو رابحة على 15m وهي خاسرة فعلياً بعد السبريد.
    """
    s = "".join(ch for ch in symbol.upper() if ch.isalpha())
    # أسماء الوسطاء للمعادن والنفط (كانت None ⇒ الاختبار الخلفي بلا أي تكلفة على الذهب والنفط).
    s = _ALIASES.get(s, s)
    if s in _OIL:
        return (4.0, 0.01)  # ~4 سنت للبرميل بحساب تجزئة عادي
    if len(s) != 6:
        return None
    base, quote = s[:3], s[3:]
    # المعدن بالدولار وحده: XAUJPY ≈ 520000 كان يأخذ 0.30 «ين» (0.00006% للصفقة) موسوماً «مشمولة»
    if base in ("XAU", "XAG"):
        if quote != "USD":
            return None
        return (3.0, 0.1) if base == "XAU" else (3.0, 0.01)
    if not (base.isalpha() and quote.isalpha()) or base == quote:
        return None
    # الين أساساً (JPYUSD ≈ 0.0067): pip 0.0001 = 1.5% من السعر ⇒ 2.5 pip كانت 3.7% تكلفة مختلَقة لكل صفقة
    if base == "JPY":
        return None
    pip = 0.01 if quote == "JPY" else 0.0001
    if s in _TIGHTEST:
        return (1.0, pip)
    if s in _MAJOR_USD:
        return (1.5, pip)
    if base in _MAJORS and quote in _MAJORS:
        return (2.5, pip)
    # عملة ناشئة أو رمز مجهول ⇒ None («قبل التكاليف» صراحةً). كان `(15.0, 0.0001)` ثابتاً لكل ما سبق: بلا
    # مقياس سعر — USDTRY ≈ 40 ⇒ 0.004% للصفقة، USDHUF ≈ 360 ⇒ 0.0004%، XPTUSD ≈ 1000 ⇒ 0.00015% (سبريده
    # الحقيقي دولارات) — ثم `costs_included: true`: تكلفة شبه صفرية موسومة «مشمولة» على أوسع الأسواق سبريداً.
    return None


def closed_candles(
    candles: list[dict[str, Any]], bar_seconds: int, now: float, symbol: str = ""
) -> list[dict[str, Any]]:
    """الشموع **المغلقة** وحدها: المزوّد يرسل الشمعة الجارية آخراً، وإشارة عليها (تقاطع/انعكاس) كانت تُسجَّل
    صفقةً **مغلقة** بسعر لم يُحسم بعد — تدخل نسبة الفوز والعائد وقد تزول بإغلاق الشمعة. كمختبر TradingView
    (الحساب عند إغلاق الشمعة افتراضياً). تُسقط الأخيرة إن لم تنتهِ مدّتها عند `now` (وقت جلب السلسلة).
    النهاية بـ`twelve_data.bar_end` (كالإشارات): شمعة W المفتوحة الاثنين تنتهي بإغلاق الجمعة 17:00 نيويورك،
    وكانت فتحاً + 7 أيام ⇒ طوال العطلة يُسقَط الأسبوع **المكتمل** من الاختبار كأنه جارٍ (QA79)."""
    if candles and bar_end(symbol, int(candles[-1]["time"]), bar_seconds) > now:
        return candles[:-1]
    return candles


def _stats(trades: list[dict[str, Any]]) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    """إحصاء الصفقات ومنحنى رأس المال (يبدأ 100 ويتراكب).

    - `total_return_pct` = العائد **المركّب** (`final_equity − 100`). كان مجموع نسب الصفقات، واللوحة تعرضه
      بجانب `final_equity`: +50% ثم −50% ⇒ «العائد 0%» بجانب «رأس المال 75» — رقمان متناقضان.
    - **التعادل ليس خسارة** (كدفتر الصفقات، `db.trade_stats`): `win_rate` = رابحة ÷ (رابحة + خاسرة)،
      والتعادل يُعدّ وحده `breakeven_count` ويبقى ضمن `trade_count`، ولا يدخل `avg_loss_pct`.
    - **بلا صفقة حاسمة `win_rate` = None** (لا صفقات، أو كلّها تعادل): 0 كانت تُعرض «نسبة نجاح 0%» = «خسرت
      الاستراتيجية كل صفقاتها» (backend-r7، كالدفتر `2d0fb58`). `BacktestPanel` يعرض «—».
    - **المركز المفتوح بآخر شمعة ليس صفقة منتهية**: كان يُقوَّم بآخر إغلاق ويدخل نسبة الفوز والعائد ورأس
      المال كأنه أُغلق — ربح/خسارة غير محقّقة بشكل نتيجة. الآن الإحصاء على المغلقة وحدها، والمفتوح
      بـ`open_pnl_pct` (None إن لا مركز) كـ«الربح المفتوح» بمختبر استراتيجيات TradingView.
    - **`max_drawdown_pct` على منحنى مقوَّم بسعر السوق شمعةً شمعة** (قمم الإغلاق داخل الصفقات، وأسوأ نقطة بكل
      شمعة، والمركز المفتوح) لا نقاط إغلاق الصفقات وحدها."""
    open_t = next((t for t in trades if t.get("open")), None)
    open_pnl = open_t["pnl_pct"] if open_t else None
    trades = [t for t in trades if not t.get("open")]
    wins = [t["pnl_pct"] for t in trades if t["pnl_pct"] > 0]
    losses = [t["pnl_pct"] for t in trades if t["pnl_pct"] < 0]
    decided = len(wins) + len(losses)

    equity = 100.0
    curve = [{"i": 0, "equity": equity}]
    peak = equity
    max_dd = 0.0

    def walk(t: dict[str, Any], base: float) -> None:
        """يمرّ على مسار صفقة مقوَّمة بسعر السوق شمعةً شمعة (`_path` من `run_backtest`): القمّة تشمل إغلاقات
        الشموع **داخل** الصفقة، والقاع أسوأ نقطة بكل شمعة. كان القمّة تُحدَّث عند الإغلاقات وحدها ⇒ صفقة صعدت
        +10% ثم أُغلقت +1% تُعرض «أقصى هبوط 0%» والهبوط الفعلي من القمّة ~8%. (قمم الشموع لا تُعدّ قمّة: ترتيب
        القمّة والقاع داخل الشمعة مجهول.) صفقة بلا مسار (نداء قديم) = `mae_pct` ثم الإغلاق."""
        nonlocal peak, max_dd
        path = t.get("_path") or [(min(t.get("mae_pct", t["pnl_pct"]), t["pnl_pct"]), t["pnl_pct"])]
        for adverse, close in path:
            max_dd = max(max_dd, (peak - base * (1 + adverse / 100)) / peak * 100)
            mark = base * (1 + close / 100)
            max_dd = max(max_dd, (peak - mark) / peak * 100)
            peak = max(peak, mark)

    for j, t in enumerate(trades):
        walk(t, equity)
        # خسارة صفقة واحدة فوق 100% (بيع على أصل تضاعف سعره — BTC/أسهم) كانت تجعل الرصيد **سالباً** (‎-848)
        # وأقصى هبوط 1829%، ثم صفقة رابحة تضرب رصيداً سالباً فتُنزله أكثر. الحساب مُصفّى عند الصفر ويبقى صفراً.
        equity = max(0.0, equity * (1 + t["pnl_pct"] / 100))
        max_dd = max(max_dd, (peak - equity) / peak * 100)
        peak = max(peak, equity)
        curve.append({"i": j + 1, "equity": _round(equity, 2)})
    # المركز المفتوح يدخل أقصى هبوط (خسارته غير المحقّقة مخاطرة قائمة، كمختبر TradingView) لا العائد ولا نسبة الفوز
    if open_t:
        walk(open_t, equity)
    max_dd = min(max_dd, 100.0)

    stats = {
        "trade_count": len(trades),
        "win_rate": _round(len(wins) / decided * 100, 1) if decided else None,
        "breakeven_count": len(trades) - decided,
        "total_return_pct": _round(equity - 100.0, 2),
        "final_equity": _round(equity, 2),
        # بلا رابحة لا متوسّط ربح (None لا 0): «متوسّط الربح 0%» يُقرأ «ربحت صفقات بلا شيء». والخسارة كذلك.
        "avg_win_pct": _round(sum(wins) / len(wins), 2) if wins else None,
        "avg_loss_pct": _round(sum(losses) / len(losses), 2) if losses else None,
        "max_drawdown_pct": _round(max_dd, 2),
        "open_pnl_pct": open_pnl,
    }
    return stats, curve


def run_backtest(
    candles: list[dict[str, Any]],
    strategy: StrategyId = "ma_cross",
    fast: int = 9,
    slow: int = 21,
    rsi_low: float = 30,
    rsi_high: float = 70,
    spread: float = 0.0,
) -> dict[str, Any]:
    """`spread`: تكلفة السبريد بوحدات السعر، تُخصم مرة لكل صفقة (دخول+خروج بسعري bid/ask)."""
    # الأطول من الفترتين: سريع 178 على 179 شمعة كان يعطي «0 صفقات» (لا تقاطع ممكن) لا «شموع غير كافية»
    # والفترتان لـ`ma_cross` وحده: RSI بـslow=176 على 179 شمعة كان «شموع غير كافية» وهو لا يستعمل المتوسّطين
    if len(candles) < (max(slow, fast, 30) if strategy == "ma_cross" else 30) + 5:
        return {"error": "not enough candles", "trades": [], "stats": {}}

    closes = [float(c["close"]) for c in candles]
    highs = [float(c["high"]) for c in candles]
    lows = [float(c["low"]) for c in candles]
    times = [int(c["time"]) for c in candles]
    f_sma = ind.sma(closes, fast)
    s_sma = ind.sma(closes, slow)
    r = ind.rsi(closes)
    m_line, m_sig = ind.macd(closes)
    mid = ind.sma(closes, 20)
    # BB bands from mid ± 2 * rolling std approx via ATR-like range
    bb_upper: list[float | None] = [None] * len(closes)
    bb_lower: list[float | None] = [None] * len(closes)
    for i in range(19, len(closes)):
        window = closes[i - 19 : i + 1]
        mean = sum(window) / 20
        var = sum((x - mean) ** 2 for x in window) / 20
        std = var**0.5
        bb_upper[i] = mean + 2 * std
        bb_lower[i] = mean - 2 * std

    trades: list[dict[str, Any]] = []
    position: Literal["long", "short", "flat"] = "flat"
    entry_price = 0.0
    entry_i = 0
    # فترة المتوسط البطيء لا تخصّ غير `ma_cross`: كانت `slow=150` تُسقط أول 150 شمعة من اختبار RSI/MACD/بولنجر
    # بصمت (8 صفقات ⇒ 1) والنتيجة تُعرض أداءً على السلسلة كلها.
    # أول تقاطع ممكن لـ`ma_cross` عند الشمعة `slow` (أول قيمتين للبطيء: slow-1 وslow) — كان `slow+1` فيُسقط
    # التقاطع الأول حين slow ≥ 26 (fast=5/slow=30: صفقة الشراء عند الشمعة 30 تغيب عن النتيجة).
    # ولا بداية ثابتة عند 27 (بقيّة `max(slow, 26) + 1`): كل إشارة تفحص جاهزية مؤشّرها (None قبلها) ⇒ RSI من
    # الشمعة 14 وبولنجر من 19 وMA من `slow` — كان تشبّع RSI على الشمعات 15–21 ثم صعود 3% يُسقط بصمت (0 صفقات).
    start_i = 1

    def close_trade(exit_i: int, still_open: bool = False) -> None:
        """يسجّل صفقة المركز الحالي مغلقةً عند إغلاق الشمعة `exit_i`.

        `mae_pct` = أسوأ ربح/خسارة **أثناء** الصفقة (أدنى قاع للشراء / أعلى قمّة للبيع) من الشمعة
        التالية للدخول (الدخول عند إغلاق شمعته) حتى شمعة الخروج ضمناً — يغذّي أقصى هبوط بـ`_stats`."""
        exit_price = closes[exit_i]
        sgn = 1 if position == "long" else -1
        span = range(entry_i + 1, exit_i + 1)
        worst = min((lows[k] for k in span), default=exit_price) if sgn > 0 else max(
            (highs[k] for k in span), default=exit_price)
        pnl = sgn * (exit_price - entry_price) / entry_price * 100
        mae = min(pnl, sgn * (worst - entry_price) / entry_price * 100)
        # مسار الصفقة شمعةً شمعة (أسوأ نقطة بالشمعة، الإغلاق) كنسب — لأقصى هبوط بـ`_stats` ثم يُحذف من الردّ
        path = [
            (sgn * ((lows[k] if sgn > 0 else highs[k]) - entry_price) / entry_price * 100,
             sgn * (closes[k] - entry_price) / entry_price * 100)
            for k in span
        ]
        t: dict[str, Any] = {
            "side": position,
            "entry": entry_price,
            "exit": exit_price,
            "pnl_pct": _round(pnl, 3),
            "mae_pct": _round(mae, 3),
            "entry_time": times[entry_i],
            "exit_time": times[exit_i],
            "_path": path,
        }
        if still_open:
            t["open"] = True
        trades.append(t)

    for i in range(start_i, len(closes)):
        price = closes[i]
        signal: Literal["buy", "sell", "flat"] | None = None

        if strategy == "ma_cross":
            if ind.cross_up(f_sma[: i + 1], s_sma[: i + 1], price):
                signal = "buy"
            elif ind.cross_down(f_sma[: i + 1], s_sma[: i + 1], price):
                signal = "sell"
        elif strategy == "rsi_reversal":
            rv = r[i]
            if rv is not None:
                if rv <= rsi_low:
                    signal = "buy"
                elif rv >= rsi_high:
                    signal = "sell"
        elif strategy == "macd_cross":
            if ind.cross_up(m_line[: i + 1], m_sig[: i + 1], price):
                signal = "buy"
            elif ind.cross_down(m_line[: i + 1], m_sig[: i + 1], price):
                signal = "sell"
        elif strategy == "bb_bounce":
            lo = bb_lower[i]
            hi = bb_upper[i]
            m = mid[i]
            if lo is not None and lows[i] <= lo and price > lo:
                signal = "buy"
            elif hi is not None and highs[i] >= hi and price < hi:
                signal = "sell"
            # إشارة بجانب المركز المفتوح نفسه لا تفعل شيئاً ⇒ لا تحجب الخروج: كانت شمعة شراء بذيل يلمس
            # السفلي ويُغلق فوق الوسط تُقرأ «شراء» فيُتخطّى الخروج ⇒ ربح القاعدة يُعرض صفقةً مفتوحة خاسرة
            # لاحقاً أو خروجاً متأخّراً بسعر آخر.
            if signal == {"long": "buy", "short": "sell"}.get(position):
                signal = None
            # الخروج عند الخط الأوسط **إغلاق فقط** (QA55 (e)): كان يُطلق الإشارة المعاكسة فيفتح المحرّك
            # (إيقاف-وعكس) بيعاً عند الوسط بلا لمس النطاق العلوي — صفقات لا تقولها قواعد الاستراتيجية.
            if signal is None and m is not None and position == "long" and price >= m:
                signal = "flat"
            elif signal is None and m is not None and position == "short" and price <= m:
                signal = "flat"

        if signal == "flat" and position != "flat":
            close_trade(i)
            position = "flat"
        elif signal == "buy" and position != "long":
            if position == "short":
                close_trade(i)
            position = "long"
            entry_price = price
            entry_i = i
        elif signal == "sell" and position != "short":
            if position == "long":
                close_trade(i)
            position = "short"
            entry_price = price
            entry_i = i

    if position != "flat":
        close_trade(len(closes) - 1, still_open=True)

    if spread > 0:
        for t in trades:
            cost = spread / t["entry"] * 100
            t["pnl_pct"] = _round(t["pnl_pct"] - cost, 3)
            t["mae_pct"] = _round(t["mae_pct"] - cost, 3)
            t["_path"] = [(a - cost, c - cost) for a, c in t["_path"]]

    stats, curve = _stats(trades)
    for t in trades:
        t.pop("_path", None)
    return {
        "strategy": strategy,
        "trades": trades[-40:],
        "stats": stats,
        "equity_curve": curve,
    }
