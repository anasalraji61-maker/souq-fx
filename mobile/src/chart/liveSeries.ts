import type { ChartSeries } from '../api';

/** Merge live tick into last candle for real-time chart updates. */
export function withLivePrice(series: ChartSeries, livePrice: number | null | undefined): ChartSeries {
  if (livePrice == null || !series.candles.length) return series;
  const candles = [...series.candles];
  const last = { ...candles[candles.length - 1] };
  last.close = livePrice;
  last.high = Math.max(last.high, livePrice);
  last.low = Math.min(last.low, livePrice);
  candles[candles.length - 1] = last;
  const first = candles[0].close;
  return {
    ...series,
    candles,
    last: livePrice,
    change_pct: first ? ((livePrice - first) / first) * 100 : series.change_pct,
  };
}
