import type { ChartSeries } from './api';
import { TF_SECONDS, type Timeframe } from './timeframes';

export function mockSeries(
  symbol: string,
  base: number,
  timeframe: Timeframe | string = '15m',
  n = 60
): ChartSeries {
  const step = TF_SECONDS[timeframe as Timeframe] ?? 900;
  let price = base;
  const candles = [];
  const t0 = Math.floor(Date.now() / 1000) - n * step;
  const volScale = Math.sqrt(step / 900);
  for (let i = 0; i < n; i++) {
    const o = price;
    const c =
      o *
      (1 +
        Math.sin(i / 8) * 0.0012 * volScale +
        ((i * 17) % 7) * 0.00015 * volScale -
        0.0004 * volScale);
    const h = Math.max(o, c) * (1 + 0.0008 * volScale);
    const l = Math.min(o, c) * (1 - 0.0008 * volScale);
    candles.push({
      time: t0 + i * step,
      open: +o.toFixed(5),
      high: +h.toFixed(5),
      low: +l.toFixed(5),
      close: +c.toFixed(5),
      volume: Math.abs(c - o) * 1e6 * (0.5 + (i % 9) / 10) + 1200,
    });
    price = c;
  }
  const first = candles[0].close;
  const last = candles[candles.length - 1].close;
  return {
    symbol,
    timeframe,
    candles,
    change_pct: +(((last - first) / first) * 100).toFixed(2),
    last: +last.toFixed(symbol === 'DXY' || symbol === 'XAUUSD' ? 2 : 5),
    data_source: { kind: 'demo', as_of: Date.now() / 1000, channel: 'mock' },
  };
}
