import type { Candle } from '../api';
import type { SyntheticBar } from './types';

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

/** Renko bricks — ATR box by default, optional fixed size, with wick extremes. */
export function renko(candles: Candle[], boxSize?: number): SyntheticBar[] {
  if (candles.length < 2) return candles;
  const box = boxSize ?? atrBox(candles) * 0.55;
  const out: SyntheticBar[] = [];
  let brickOpen = candles[0].close;
  let t = candles[0].time;
  for (const c of candles) {
    // use high/low for more bricks (classic renko uses close; hybrid uses extremes)
    let hi = c.high;
    let lo = c.low;
    while (hi >= brickOpen + box) {
      const close = brickOpen + box;
      out.push({
        time: t,
        open: brickOpen,
        high: Math.max(close, c.high),
        low: brickOpen,
        close,
        volume: c.volume,
        srcTime: c.time,
      });
      brickOpen = close;
      t += 60;
    }
    while (lo <= brickOpen - box) {
      const close = brickOpen - box;
      out.push({
        time: t,
        open: brickOpen,
        high: brickOpen,
        low: Math.min(close, c.low),
        close,
        volume: c.volume,
        srcTime: c.time,
      });
      brickOpen = close;
      t += 60;
    }
  }
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
