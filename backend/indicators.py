"""Technical indicators for screener, alerts, and backtest."""
from __future__ import annotations

from typing import Any


def _closes(candles: list[dict[str, Any]]) -> list[float]:
    return [float(c["close"]) for c in candles]


def sma(values: list[float], period: int) -> list[float | None]:
    out: list[float | None] = []
    for i in range(len(values)):
        if i < period - 1:
            out.append(None)
            continue
        out.append(sum(values[i - period + 1 : i + 1]) / period)
    return out


def ema(values: list[float], period: int) -> list[float | None]:
    out: list[float | None] = []
    k = 2 / (period + 1)
    prev: float | None = None
    for i, v in enumerate(values):
        if i < period - 1:
            out.append(None)
            continue
        if prev is None:
            prev = sum(values[i - period + 1 : i + 1]) / period
        else:
            prev = v * k + prev * (1 - k)
        out.append(prev)
    return out


def _rsi_value(avg_gain: float, avg_loss: float) -> float:
    """بلا حركة إطلاقاً (لا ربح ولا خسارة) = 50 كـMT5 لا 100: كان `avg_loss == 0` وحده يعطي 100
    لسلسلة مسطّحة ⇒ «تشبّع شراء» يُطلق تنبيه RSI «فوق 70» ويطابق فلتر الماسح وصوت بيع — من لا حركة."""
    if avg_loss == 0:
        return 50.0 if avg_gain == 0 else 100.0
    return 100 - 100 / (1 + avg_gain / avg_loss)


def rsi(values: list[float], period: int = 14) -> list[float | None]:
    out: list[float | None] = [None] * len(values)
    if len(values) <= period:
        return out
    gains = 0.0
    losses = 0.0
    for i in range(1, period + 1):
        d = values[i] - values[i - 1]
        if d >= 0:
            gains += d
        else:
            losses -= d
    avg_gain = gains / period
    avg_loss = losses / period
    out[period] = _rsi_value(avg_gain, avg_loss)
    for i in range(period + 1, len(values)):
        d = values[i] - values[i - 1]
        gain = d if d > 0 else 0.0
        loss = -d if d < 0 else 0.0
        avg_gain = (avg_gain * (period - 1) + gain) / period
        avg_loss = (avg_loss * (period - 1) + loss) / period
        out[i] = _rsi_value(avg_gain, avg_loss)
    return out


def macd(values: list[float]) -> tuple[list[float | None], list[float | None]]:
    e12 = ema(values, 12)
    e26 = ema(values, 26)
    line: list[float | None] = []
    for a, b in zip(e12, e26):
        line.append(a - b if a is not None and b is not None else None)
    # الإشارة = EMA9 على قيم الخطّ **الحقيقية** فقط. كانت القيم المبكّرة (قبل EMA26) تُملأ أصفاراً
    # فتبدأ الإشارة من 0 وتقطع الخطّ بتقاطع وهمي بأوّل الاختبار الخلفي والماسح. الآن None حتى
    # تتوفّر 9 قيم خطّ حقيقية (الشمعة 34 لـ12/26/9)، بنفس فهارس الشموع.
    start = next((i for i, x in enumerate(line) if x is not None), len(line))
    real = [x for x in line[start:] if x is not None]
    signal: list[float | None] = [None] * start + ema(real, 9)
    signal += [None] * (len(line) - len(signal))
    return line, signal


def atr(candles: list[dict[str, Any]], period: int = 14) -> list[float | None]:
    """Average True Range (Wilder). None حتى تتوفّر `period` مدى حقيقياً (الشمعة `period`)."""
    n = len(candles)
    out: list[float | None] = [None] * n
    if n <= period:
        return out
    tr: list[float] = []
    for i in range(1, n):
        h, lo = float(candles[i]["high"]), float(candles[i]["low"])
        pc = float(candles[i - 1]["close"])
        tr.append(max(h - lo, abs(h - pc), abs(lo - pc)))
    prev = sum(tr[:period]) / period
    out[period] = prev
    for i in range(period + 1, n):
        prev = (prev * (period - 1) + tr[i - 1]) / period
        out[i] = prev
    return out


def _side(a: float, b: float, scale: float | None) -> int:
    """موضع a من b: 1 فوق، −1 تحت، 0 مستوى واحد. فرق بحجم ضجيج الفاصلة العائمة (≤ 1e-12 من السعر)
    = مستوى واحد: SMA9 وSMA21 على إغلاقات 3.7502 متطابقة خرجا 3.7502000000000004 و3.7502 ⇒ «تقاطع صاعد»
    بالماسح وصوت توقّع وتنبيه وصفقة اختبار خلفي على زوج مربوط بلا أي حركة. `scale` = السعر (MACD قيمة
    صغيرة قرب الصفر وضجيجها بحجم السعر لا بحجمها)؛ بدونه أكبر القيمتين."""
    s = abs(scale) if scale else max(abs(a), abs(b))
    d = a - b
    if abs(d) <= s * 1e-12:
        return 0
    return 1 if d > 0 else -1


def _last_two(fast: list[float | None], slow: list[float | None]) -> tuple[float, float, float, float] | None:
    if len(fast) < 2 or len(slow) < 2:
        return None
    a0, a1 = fast[-2], fast[-1]
    b0, b1 = slow[-2], slow[-1]
    if None in (a0, a1, b0, b1):
        return None
    return a0, a1, b0, b1  # type: ignore[return-value]


def cross_up(fast: list[float | None], slow: list[float | None], scale: float | None = None) -> bool:
    v = _last_two(fast, slow)
    if v is None:
        return False
    a0, a1, b0, b1 = v
    return _side(a0, b0, scale) <= 0 and _side(a1, b1, scale) > 0


def cross_down(fast: list[float | None], slow: list[float | None], scale: float | None = None) -> bool:
    v = _last_two(fast, slow)
    if v is None:
        return False
    a0, a1, b0, b1 = v
    return _side(a0, b0, scale) >= 0 and _side(a1, b1, scale) < 0


def snapshot(candles: list[dict[str, Any]], fast: int = 9, slow: int = 21) -> dict[str, Any]:
    closes = _closes(candles)
    if not closes:
        return {}
    r = rsi(closes)
    f = sma(closes, fast)
    s = sma(closes, slow)
    m_line, m_sig = macd(closes)
    last = closes[-1]
    first = closes[0]
    return {
        "last": last,
        # التغيّر على **كامل** السلسلة المُمرَّرة (180 شمعة: ~45 ساعة على 15m، ~6 أشهر على D) لا يومياً —
        # `change_bars` يقول النافذة كي لا يُعرض كتغيّر اليوم. إغلاق أوّل صفريّ أو إغلاق واحد ⇒ None لا 0 مخترَع.
        "change_pct": ((last - first) / first * 100) if first and len(closes) > 1 else None,
        # عدد الشموع التي **تغطّيها** النسبة = الحركات من أوّل إغلاق إلى الأخير (N إغلاقاً = N−1 شمعة بعد
        # الأولى)، كـ«آخر 10 شموع» بـ`signal_hub` (من إغلاق ما قبلها). كان `len(closes)` ⇒ شمعة زائدة.
        "change_bars": len(closes) - 1,
        "rsi": r[-1],
        "sma_fast": f[-1],
        "sma_slow": s[-1],
        "macd": m_line[-1],
        "macd_signal": m_sig[-1],
        "ma_cross_up": cross_up(f, s, last),
        "ma_cross_down": cross_down(f, s, last),
        "macd_cross_up": cross_up(m_line, m_sig, last),
        "macd_cross_down": cross_down(m_line, m_sig, last),
    }
