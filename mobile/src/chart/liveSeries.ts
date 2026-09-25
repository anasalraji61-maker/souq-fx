import type { ChartSeries, DataProvenance, LiveTick } from '../api';
import {
  canMergeLiveIntoCandles,
  isSyntheticProvenance,
  normalizeProvenance,
  tickBelongsToCandle,
  timeframeStepSec,
} from './dataSource';
import { candlesThrough, prevDayFromIntraday } from './pivotBase';

export type LiveMergeOpts = {
  /** unix seconds of the tick (usually source.as_of) */
  tickAsOf?: number | null;
  timeframe?: string | null;
  nowSec?: number;
};

/**
 * هل التيك سعرٌ لهذه السلسلة أصلاً؟ عند تبديل الرمز يتبع التيك الرمز الجديد فوراً والشموع تبقى
 * للقديم حتى يصل الجلب: تيك الذهب (2650) كان يُدمج بآخر شمعة يورو (1.17) فتصير شمعة واحدة بطول
 * الشاشة، ومحور السعر يُسحق لخطّ مسطّح، ووسم السعر يطبع 2650 على شارت اليورو — حتى وصول الجديد.
 * والتبديل بين زوجين متقاربين (EURUSD↔GBPUSD، الفرق ~15%) يفعل الشيء نفسه بشكل أخفى.
 * الحدّ: 3% من آخر إغلاق، أو 20 ضعف وسيط مدى الشموع الأخيرة (فريمات كبيرة/أدوات متقلّبة) — أيّهما أكبر.
 * حركة فعلية بهذا الحجم بين جلبَين لا تحدث بالفوركس؛ الجلب التالي يُظهرها بشموعها على أي حال.
 */
export function tickPlausibleForSeries(series: ChartSeries, price: number): boolean {
  const n = series.candles.length;
  const ref = n ? series.candles[n - 1]!.close : NaN;
  if (!Number.isFinite(ref) || ref <= 0) return true;
  const ranges: number[] = [];
  for (let i = Math.max(0, n - 50); i < n; i++) {
    const c = series.candles[i]!;
    const r = c.high - c.low;
    if (Number.isFinite(r) && r > 0) ranges.push(r);
  }
  ranges.sort((a, b) => a - b);
  const med = ranges.length ? ranges[Math.floor(ranges.length / 2)]! : 0;
  return Math.abs(price - ref) <= Math.max(ref * 0.03, med * 20);
}

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
  if (!tickPlausibleForSeries(series, livePrice)) return series;
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

/** أعلى/أدنى ما بلغته التيكات المدموجة في الشمعة الحيّة `key` (`رمز|فريم|زمن الشمعة`). */
export type LiveExtremes = { key: string; high: number; low: number };

/**
 * يمدّ الشمعة الحيّة بأعلى/أدنى ما بلغته التيكات منذ فُتحت — `withLivePrice` يبني الشمعة من شمعة الجلب
 * الأخيرة والتيك **الحالي** وحده، فذيل رسمه تيك عند 1.08600 فوق أعلى الجلب 1.08500 يعود إلى 1.08550 مع
 * التيك التالي: الذيل يطول ويقصر ويضيع أعلى الشمعة الحقيقي حتى الجلب التالي (~90 ث).
 * `merged` ناتج `withLivePrice`؛ إن لم يُدمج تيك (`merged === base`) لا تغيير ولا تتبّع. مفتاح مختلف
 * (شمعة جديدة/رمز/فريم) يبدأ التتبّع من الشمعة المدموجة نفسها.
 */
export function withLiveExtremes(
  base: ChartSeries,
  merged: ChartSeries,
  prev: LiveExtremes | null
): { series: ChartSeries; ext: LiveExtremes | null } {
  if (merged === base || !merged.candles.length) return { series: merged, ext: prev };
  const i = merged.candles.length - 1;
  const last = merged.candles[i]!;
  const key = `${merged.symbol}|${merged.timeframe}|${last.time}`;
  const same = prev != null && prev.key === key;
  const high = same ? Math.max(prev.high, last.high) : last.high;
  const low = same ? Math.min(prev.low, last.low) : last.low;
  const ext = { key, high, low };
  if (high === last.high && low === last.low) return { series: merged, ext };
  const candles = [...merged.candles];
  candles[i] = { ...last, high, low };
  return { series: { ...merged, candles }, ext };
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

/**
 * نسبة رأس الإطار/خلية الرباعي: **تغيّر اليوم** (من إغلاق الجلسة السابقة، `useDailyRefs`) كما تعرضه قائمة
 * المتابعة وشريط الهاتف وTradingView. كانت `liveChangePct` وحدها (من أول شمعة محمّلة) فيقرأ الزوج نفسه
 * +0.1% على 15m (~3 أيام تاريخ) و−1.8% على 4H (~50 يوماً) وثالثةً بالقائمة. المرجع يُهمل ⇒ النسبة القديمة:
 * لا مرجع بعد (تحميل/فشل)، أو شموع تجريبية (مرجع حقيقي مقابل سعر مُولَّد)، أو فرق >25% (مرجع لأداة أخرى).
 * `price` السعر المطبوع بالرأس (التيك الحيّ للسلسلة أو null ⇒ `series.last`).
 */
export function headerChangePct(
  series: ChartSeries,
  price: number | null | undefined,
  prevClose: number | null | undefined
): number {
  const px = price != null && Number.isFinite(price) && price > 0 ? price : series.last;
  if (
    !isSyntheticProvenance(series.data_source) &&
    prevClose != null &&
    Number.isFinite(prevClose) &&
    prevClose > 0 &&
    Number.isFinite(px) &&
    px > 0
  ) {
    const pct = ((px - prevClose) / prevClose) * 100;
    if (Math.abs(pct) <= 25) return pct;
  }
  return liveChangePct(series, price);
}

/**
 * إغلاق الجلسة السابقة لشمعة الإعادة (`cutSec`) — كي يقرأ رأس الإطار بالإعادة «تغيّر ذلك اليوم» كما خارجها،
 * لا التغيّر من أوّل شمعة محمّلة (4H ⇒ ~50 يوماً: «−1.80%» مكان «+0.12%»). داخل اليوم: الجلسة السابقة
 * بحدّ 17:00 نيويورك من الشموع حتى الإعادة (ناقصة ⇒ null)؛ اليومي فأكبر: إغلاق الشمعة السابقة.
 */
export function replayPrevClose(series: ChartSeries, cutSec: number | null | undefined): number | null {
  if (cutSec == null || !Number.isFinite(cutSec)) return null;
  const upTo = candlesThrough(series.candles, cutSec);
  if (timeframeStepSec(series.timeframe) < 86400) return prevDayFromIntraday(upTo, series.symbol)?.close ?? null;
  const prev = upTo.length >= 2 ? upTo[upTo.length - 2]!.close : null;
  return prev != null && Number.isFinite(prev) && prev > 0 ? prev : null;
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
  if (!tickPlausibleForSeries(series, tick.price)) return null;
  const last = series.candles[series.candles.length - 1]!;
  const step = timeframeStepSec(opts?.timeframe ?? series.timeframe);
  const tickAsOf = opts?.tickAsOf ?? tick.source.as_of ?? null;
  if (!tickBelongsToCandle(last.time, tickAsOf, step, opts?.nowSec)) return null;
  return tick.price;
}

/**
 * السعر الذي تُحسب منه نسبة الرأس: التيك نفسه المطبوع بجانبها، ما دام سعراً لهذه السلسلة (المصدر
 * متوافق والسعر معقول) — **بلا** شرط أن يقع بشمعتها الأخيرة. كانت النسبة من `livePriceForChart`
 * التي ترفض التيك بعد إغلاق الشمعة الأخيرة حتى الجلب التالي (~90 ث): على 1m/5m بعد كل إغلاق يتحرّك
 * السعر والنسبة واقفة، وقد تناقضه (سعر فوق الافتتاح ونسبة حمراء). المرجع (أوّل شمعة) لا يتعلّق
 * بالشمعة الأخيرة، فالنسبة صحيحة. null ⇒ نسبة الخادم.
 */
export function livePriceForHeader(series: ChartSeries, tick: LiveTick | null | undefined): number | null {
  if (!tick || !Number.isFinite(tick.price) || tick.price <= 0) return null;
  if (!series.candles.length) return null;
  if (!canMergeLiveIntoCandles(series.data_source, tick.source)) return null;
  if (!tickPlausibleForSeries(series, tick.price)) return null;
  return tick.price;
}

export function ensureSeriesProvenance(series: ChartSeries): ChartSeries {
  if (series.data_source?.kind) {
    return { ...series, data_source: normalizeProvenance(series.data_source) };
  }
  return { ...series, data_source: { kind: 'unknown', as_of: null, channel: null } };
}
