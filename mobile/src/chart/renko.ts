import type { Candle } from '../api';
import type { SyntheticBar } from './types';
import { computeAtr } from './indicators/volatility';

function atrBox(candles: Candle[]): number {
  if (candles.length < 2) return 1e-8;
  let sum = 0;
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const prev = candles[i - 1].close;
    sum += Math.max(c.high - c.low, Math.abs(c.high - prev), Math.abs(c.low - prev));
  }
  return Math.max(sum / (candles.length - 1), 1e-8);
}

/**
 * صندوق Renko الافتراضي كـTradingView: ATR(14) بتنعيم Wilder على آخر شمعة **مغلقة** — الحيّة تتغيّر
 * مع كل تيك فكانت كل اللبنات تُعاد رسماً تحت إصبع المتداول. كان ‎0.55 × متوسط المدى الحقيقي‎ للتاريخ
 * كلّه: صندوق نصف حجم TradingView ⇒ ضعف اللبنات والانعكاسات للزوج نفسه. تاريخ أقصر من 15 ⇒ المتوسط.
 */
export function renkoAtrBox(candles: Candle[], period = 14): number {
  // أرضية نسبةً من السعر كـRange (`MIN_BOX_FRACTION`): تاريخ مسطّح (مزوّد متوقّف) يجعل ATR بتنعيم Wilder
  // ~1e-16 ⇒ أوّل تيك حيّ بـ20 pip كان ملايين اللبنات (وملايين صناديق Kagi/P&F) ⇒ تجمّد الشارت.
  const ref = candles.length ? Math.abs(candles[candles.length - 1].close) : 0;
  const floor = ref * MIN_BOX_FRACTION;
  const closed = candles.length - 2;
  if (closed < period) return Math.max(atrBox(candles), floor);
  const atr = computeAtr(candles.slice(0, closed + 1), period)[closed];
  return Math.max(atr != null && Number.isFinite(atr) && atr > 0 ? atr : atrBox(candles), floor);
}

/** أرضية الصندوق التلقائي نسبةً من السعر (0.005% ≈ نصف pip على EUR/USD) — كـ`range.ts`. */
const MIN_BOX_FRACTION = 5e-5;
/** سقف اللبنات — الأقدم يسقط (الشارت لا يعرض أكثر من بضع مئات). */
export const RENKO_MAX_BRICKS = 5000;

/**
 * Renko bricks — ATR box by default, optional fixed size. Traditional rules like TradingView:
 * source = close, a trend brick needs one box beyond the last brick's close, a reversal needs two
 * (one box beyond the last brick's *open*). The old single-box reversal from high/low stacked
 * overlapping bricks on every wick and flipped direction on noise. Wicks show the extremes price
 * reached since the previous brick (first brick of the batch only).
 */
export function renko(candles: Candle[], boxSize?: number): SyntheticBar[] {
  if (candles.length < 2) return candles;
  const box = boxSize ?? renkoAtrBox(candles);
  const out: SyntheticBar[] = [];
  const base = candles[0].close;
  // حدود آخر لبنة (فتحها وإغلاقها): قبل أوّل لبنة كلاهما الأساس ⇒ أوّل لبنة بصندوق واحد بأيّ اتجاه.
  // الانعكاس بصندوقين تلقائياً: بعد لبنة صاعدة `bottom` = فتحها، فالهبوط يلزمه ‎close − 2·box‎.
  let top = base;
  let bottom = base;
  let t = candles[0].time;
  let runHi = -Infinity;
  let runLo = Infinity;
  const push = (open: number, close: number, c: Candle) => {
    const up = close > open;
    out.push({
      time: t,
      open,
      high: up ? close : Math.max(open, runHi),
      low: up ? Math.min(open, runLo) : close,
      close,
      volume: c.volume,
      srcTime: c.time,
    });
    runHi = -Infinity;
    runLo = Infinity;
    t += 60;
  };
  for (const c of candles) {
    runHi = Math.max(runHi, c.high);
    runLo = Math.min(runLo, c.low);
    const px = c.close;
    // صعود: فوق أعلى آخر لبنة بصندوق (استمرار، أو انعكاس بصندوقين من إغلاق لبنة هابطة = قمّتها + صندوق)
    // قفزة بأكثر من السقف: ما قبل آخر `RENKO_MAX_BRICKS` لبنة سيسقط أصلاً ⇒ يُتخطّى بدل حلقة بالملايين
    // (صندوق صريح صغير جداً أو فجوة ضخمة). اللبنات الباقية متّصلة وتنتهي عند آخر صندوق تحت السعر.
    const n = px >= top + box ? Math.floor((px - top) / box + 1e-9) : px <= bottom - box ? Math.floor((bottom - px) / box + 1e-9) : 0;
    if (n > RENKO_MAX_BRICKS) {
      const skip = n - RENKO_MAX_BRICKS;
      out.length = 0;
      if (px > top) {
        top += skip * box;
        bottom = top - box;
      } else {
        bottom -= skip * box;
        top = bottom + box;
      }
      t += 60 * skip;
    }
    if (px >= top + box) {
      while (px >= top + box) {
        push(top, top + box, c);
        bottom = top;
        top += box;
      }
    } else if (px <= bottom - box) {
      while (px <= bottom - box) {
        push(bottom, bottom - box, c);
        top = bottom;
        bottom -= box;
      }
    }
    if (out.length > 2 * RENKO_MAX_BRICKS) out.splice(0, out.length - RENKO_MAX_BRICKS);
  }
  if (out.length > RENKO_MAX_BRICKS) out.splice(0, out.length - RENKO_MAX_BRICKS);
  return out.length ? out : candles;
}

export function measureStats(
  a: { index: number; price: number },
  b: { index: number; price: number }
): { bars: number; diff: number; pct: number } {
  // رسمٌ من فريم أصغر يُرسى بفهرس كسري (H1 09:00→18:00 على D1 ⇒ 0.375): كانت القراءة «0.375 bars»
  const bars = Math.round(Math.abs(b.index - a.index));
  const diff = b.price - a.price;
  const pct = a.price ? (diff / a.price) * 100 : 0;
  return { bars, diff, pct };
}

export function snapPrice(
  price: number,
  candle: { open: number; high: number; low: number; close: number }
): number {
  const pts = [candle.open, candle.high, candle.low, candle.close];
  let best = price;
  let d = Infinity;
  for (const p of pts) {
    const dd = Math.abs(p - price);
    if (dd < d) {
      d = dd;
      best = p;
    }
  }
  return best;
}
