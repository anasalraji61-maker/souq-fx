import type { Candle } from '../api';
import type { SyntheticBar } from './types';
import { renkoAtrBox } from './renko';

/**
 * Point & Figure columns as synthetic candles (X = bull brick, O = bear).
 * الصندوق الافتراضي كـTradingView: ATR(14) على آخر شمعة مغلقة، والانعكاس 3 صناديق. كان نصف متوسط مدى
 * الشمعة للتاريخ كلّه ⇒ صندوق أصغر بكثير (ضجيج أعمدة) ويتغيّر مع كل تيك حيّ.
 */
export function pointFigure(candles: Candle[], boxSize?: number, reversal = 3): SyntheticBar[] {
  if (candles.length < 3) return candles;
  const box = boxSize ?? renkoAtrBox(candles);
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
