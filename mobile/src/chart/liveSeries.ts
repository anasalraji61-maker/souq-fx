import type { ChartSeries, DataProvenance, LiveTick } from '../api';
import {
  canMergeLiveIntoCandles,
  normalizeProvenance,
  tickBelongsToCandle,
  timeframeStepSec,
} from './dataSource';

export type LiveMergeOpts = {
  /** unix seconds of the tick (usually source.as_of) */
  tickAsOf?: number | null;
  timeframe?: string | null;
  nowSec?: number;
};

/** Merge live tick into last candle only when provenance + time bucket agree. */
export function withLivePrice(
  series: ChartSeries,
  livePrice: number | null | undefined,
  tickSource?: DataProvenance | null,
  opts?: LiveMergeOpts
): ChartSeries {
  if (livePrice == null || !series.candles.length) return series;
  const candleSrc = series.data_source ?? { kind: 'unknown' as const };
  const tickSrc = tickSource ?? { kind: 'unknown' as const };
  if (!canMergeLiveIntoCandles(candleSrc, tickSrc)) {
    return series;
  }
  const last = series.candles[series.candles.length - 1]!;
  const step = timeframeStepSec(opts?.timeframe ?? series.timeframe);
  const tickAsOf = opts?.tickAsOf ?? tickSrc.as_of ?? null;
  if (!tickBelongsToCandle(last.time, tickAsOf, step, opts?.nowSec)) {
    return series;
  }
  const candles = [...series.candles];
  const next = { ...last };
  next.close = livePrice;
  next.high = Math.max(next.high, livePrice);
  next.low = Math.min(next.low, livePrice);
  candles[candles.length - 1] = next;
  const first = candles[0]!.close;
  return {
    ...series,
    candles,
    last: livePrice,
    change_pct: first ? ((livePrice - first) / first) * 100 : series.change_pct,
  };
}

export function livePriceForChart(
  series: ChartSeries,
  tick: LiveTick | null | undefined,
  opts?: LiveMergeOpts
): number | null {
  if (!tick) return null;
  if (!canMergeLiveIntoCandles(series.data_source, tick.source)) return null;
  if (!series.candles.length) return null;
  const last = series.candles[series.candles.length - 1]!;
  const step = timeframeStepSec(opts?.timeframe ?? series.timeframe);
  const tickAsOf = opts?.tickAsOf ?? tick.source.as_of ?? null;
  if (!tickBelongsToCandle(last.time, tickAsOf, step, opts?.nowSec)) return null;
  return tick.price;
}

export function ensureSeriesProvenance(series: ChartSeries): ChartSeries {
  if (series.data_source?.kind) {
    return { ...series, data_source: normalizeProvenance(series.data_source) };
  }
  return { ...series, data_source: { kind: 'unknown', as_of: null, channel: null } };
}
