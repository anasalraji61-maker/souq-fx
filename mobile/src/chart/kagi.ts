import type { Candle } from '../api';
import type { SyntheticBar } from './types';

/** Classic Kagi: thick yang (up) / yin (down) line with reversal threshold. */
export function kagi(candles: Candle[], reversalPct = 0.004): SyntheticBar[] {
  if (candles.length < 2) return candles;
  const out: SyntheticBar[] = [];
  let lastClose = candles[0].close;
  let direction: 1 | -1 = candles[1].close >= lastClose ? 1 : -1;
  let extreme = lastClose;
  let t = candles[0].time;

  for (let i = 1; i < candles.length; i++) {
    const price = candles[i].close;
    const rev = extreme * reversalPct;
    if (direction === 1) {
      if (price > extreme) {
        extreme = price;
        out.push({
          time: t,
          open: lastClose,
          high: price,
          low: Math.min(lastClose, price),
          close: price,
          volume: candles[i].volume,
          srcTime: candles[i].time,
        });
        lastClose = price;
        t += 60;
      } else if (price <= extreme - rev) {
        direction = -1;
        extreme = price;
        out.push({
          time: t,
          open: lastClose,
          high: Math.max(lastClose, price),
          low: price,
          close: price,
          volume: candles[i].volume,
          srcTime: candles[i].time,
        });
        lastClose = price;
        t += 60;
      }
    } else if (price < extreme) {
      extreme = price;
      out.push({
        time: t,
        open: lastClose,
        high: Math.max(lastClose, price),
        low: price,
        close: price,
        volume: candles[i].volume,
        srcTime: candles[i].time,
      });
      lastClose = price;
      t += 60;
    } else if (price >= extreme + rev) {
      direction = 1;
      extreme = price;
      out.push({
        time: t,
        open: lastClose,
        high: price,
        low: Math.min(lastClose, price),
        close: price,
        volume: candles[i].volume,
        srcTime: candles[i].time,
      });
      lastClose = price;
      t += 60;
    }
  }
  return out.length ? out : candles;
}
