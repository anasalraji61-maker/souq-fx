import type { Candle } from '../api';
import type { SyntheticBar } from './types';

/** Point & Figure columns as synthetic candles (X = bull brick, O = bear). */
export function pointFigure(candles: Candle[], boxSize?: number, reversal = 3): SyntheticBar[] {
  if (candles.length < 3) return candles;
  const ranges = candles.map((c) => c.high - c.low);
  const avg = ranges.reduce((a, b) => a + b, 0) / ranges.length;
  const box = boxSize ?? Math.max(avg * 0.5, 1e-8);
  const out: SyntheticBar[] = [];
  let colOpen = candles[0].close;
  let direction: 1 | -1 | 0 = 0;
  let t = candles[0].time;
  let src = candles[0].time;

  const pushBrick = (dir: 1 | -1, from: number) => {
    const close = from + dir * box;
    out.push({
      time: t,
      open: from,
      high: Math.max(from, close),
      low: Math.min(from, close),
      close,
      volume: 1,
      srcTime: src,
    });
    t += 60;
    return close;
  };

  for (const c of candles) {
    src = c.time;
    if (direction === 0) {
      if (c.close >= colOpen + box) {
        direction = 1;
        while (c.close >= colOpen + box) {
          colOpen = pushBrick(1, colOpen);
        }
      } else if (c.close <= colOpen - box) {
        direction = -1;
        while (c.close <= colOpen - box) {
          colOpen = pushBrick(-1, colOpen);
        }
      }
      continue;
    }

    if (direction === 1) {
      while (c.close >= colOpen + box) {
        colOpen = pushBrick(1, colOpen);
      }
      if (c.close <= colOpen - reversal * box) {
        direction = -1;
        while (c.close <= colOpen - box) {
          colOpen = pushBrick(-1, colOpen);
        }
      }
    } else {
      while (c.close <= colOpen - box) {
        colOpen = pushBrick(-1, colOpen);
      }
      if (c.close >= colOpen + reversal * box) {
        direction = 1;
        while (c.close >= colOpen + box) {
          colOpen = pushBrick(1, colOpen);
        }
      }
    }
  }

  return out.length ? out : candles;
}
