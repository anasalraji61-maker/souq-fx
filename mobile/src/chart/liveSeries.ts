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
  // سعر ≤ 0 أو NaN يمدّ ذيل الشمعة الحيّة إلى الصفر فيسحق مقياس السعر (انظر livePriceForChart).
  if (livePrice == null || !Number.isFinite(livePrice) || livePrice <= 0 || !series.candles.length) {
    return series;
  }
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
  return {
    ...series,
    candles,
    last: livePrice,
    change_pct: liveChangePct(series, livePrice),
  };
}

/**
 * نسبة التغيّر مع السعر الحيّ — بتعريف الخادم نفسه (`build_series`: من إغلاق أول شمعة
 * بالسلسلة إلى آخر سعر). الرأس كان يطبع **سعر التيك** بجانب **نسبة الجلب الأخير**:
 * السعر يتحرّك كل ثانية والنسبة واقفة حتى الجلب التالي، وقد تناقضه (سعر فوق الافتتاح
 * ونسبة حمراء). `livePrice` = ما يُدمج فعلاً بالشمعة (`livePriceForChart`)؛ null ⇒ نسبة الخادم.
 */
export function liveChangePct(series: ChartSeries, livePrice: number | null | undefined): number {
  if (livePrice == null || !Number.isFinite(livePrice) || livePrice <= 0) return series.change_pct;
  const first = series.candles[0]?.close;
  if (!first || !Number.isFinite(first)) return series.change_pct;
  return ((livePrice - first) / first) * 100;
}

export function livePriceForChart(
  series: ChartSeries,
  tick: LiveTick | null | undefined,
  opts?: LiveMergeOpts
): number | null {
  if (!tick) return null;
  // تيك صفر/NaN (عطل مزوّد أو رسالة ناقصة) كان يُعاد سعراً حيّاً فيُدمج بالشمعة الأخيرة ويمدّ
  // ذيلها إلى الصفر، فيسحق مقياس السعر كلّه لشمعة واحدة. لا سعر أداة ≤ 0.
  if (!Number.isFinite(tick.price) || tick.price <= 0) return null;
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
