import type { ChartSeries, DataProvenance, LiveTick } from '../api';
import {
  canMergeLiveIntoCandles,
  candleTimeSec,
  isSyntheticProvenance,
  isValidAsOf,
  serverNowSec,
  timeframeStepSec,
} from './dataSource';
import { candlesThrough, prevDayFromIntraday } from './pivotBase';
import { forexWeekCloseSec } from './marketHours';

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

/** أقصى فريم تُفتح له شمعة حيّة محلياً: ≤1H محاذاته لرأس الدقيقة/الساعة معروفة؛ 4H/D/W تختلف بين المزوّدين. */
const ROLL_MAX_STEP_SEC = 3600;
/** تيك بعد أكثر من شمعتين فارغتين من آخر شمعة ⇒ فجوة (عطلة/انقطاع) ينتظر فيها الشارت الجلب لا يخمّنها. */
const ROLL_MAX_BARS = 3;

/**
 * افتتاح الشمعة التي يقع فيها التيك نسبةً لآخر شمعة بالسلسلة: افتتاحها نفسه إن وقع فيها، أو افتتاح شمعة
 * تالية (≤1H، حتى `ROLL_MAX_BARS`) — null خارج ذلك. كانت التيكات بعد إغلاق الشمعة الأخيرة تُرمى حتى الجلب
 * التالي (~90 ث): على 1m/5m يتجمّد الشارت عند كل إغلاق ويرتدّ وسم السعر لإغلاق الجلب بينما الرأس يتحرّك.
 */
export function liveBarOpenSec(
  lastOpenTime: number,
  tickSec: number | null | undefined,
  stepSec: number,
  nowSec = serverNowSec(),
  symbol?: string
): number | null {
  if (!isValidAsOf(tickSec, nowSec)) return null;
  if (!(stepSec > 0) || !Number.isFinite(stepSec)) return null;
  const open = candleTimeSec(lastOpenTime);
  if (!Number.isFinite(open)) return null;
  // الأسبوعي مختوم الاثنين: تيك افتتاح الأحد (21:00/22:00 UTC) بعد 6 أيام و21 ساعة فيقع «داخل» خطوة الأسبوع
  // الماضي ⇒ ذيل فجوة العطلة وإغلاق الأحد يُلصقان بشمعة أُغلقت الجمعة، حتى منتصف ليل الاثنين. بعد إغلاق
  // أسبوع الشمعة ينتظر الشارت شمعة المزوّد الجديدة (كاليومي، حيث الأحد k=2 أصلاً).
  if (symbol && stepSec > 86400) {
    const weekClose = forexWeekCloseSec(symbol, open * 1000);
    if (weekClose != null && tickSec >= weekClose) return null;
  }
  const k = Math.floor((tickSec - open) / stepSec);
  if (k === 0) return open;
  if (k < 0 || k >= ROLL_MAX_BARS || stepSec > ROLL_MAX_STEP_SEC) return null;
  return open + k * stepSec;
}

/**
 * Merge live tick into last candle only when provenance + time bucket agree — أو يفتح الشمعة التالية حين يقع
 * التيك بعدها (`liveBarOpenSec`): افتتاحها = التيك الأول (يثبّته `withLiveExtremes` للتيكات التالية)، والجلب
 * التالي يستبدلها بشمعة المزوّد.
 */
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
  const barOpen = liveBarOpenSec(last.time, tickAsOf, step, opts?.nowSec, series.symbol);
  if (barOpen == null) return series;
  if (barOpen !== candleTimeSec(last.time)) {
    // بوحدة أزمنة السلسلة نفسها (ms أو ث) كي يطابق مفتاح التتبّع شمعة المزوّد حين تصل.
    const time = last.time > 1e12 ? barOpen * 1000 : barOpen;
    return {
      ...series,
      candles: [...series.candles, { time, open: livePrice, high: livePrice, low: livePrice, close: livePrice }],
      last: livePrice,
      change_pct: liveChangePct(series, livePrice),
    };
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

/** أعلى/أدنى ما بلغته التيكات المدموجة في الشمعة الحيّة `key` (`رمز|فريم|زمن الشمعة`)، وافتتاحها وآخر إغلاق.
 * `closed` = الشمعة التي أُغلقت بالتيكات ولم يصل جلبها بعد — تبقى على آخر ما بلغته. */
export type LiveBarState = { key: string; open: number; high: number; low: number; close: number };
export type LiveExtremes = LiveBarState & {
  closed?: LiveBarState | null;
  /** زمن الشمعة الحيّة بوحدة السلسلة (ms أو ث). */
  time?: number;
  /** شموع فُتحت وأُغلقت محلياً بعد آخر شمعة جلب ولم يصل جلبها (شمعتان تُغلقان بين تحديثَين على 1m). */
  between?: (LiveBarState & { time: number })[];
};

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
  const keyOf = (t: number) => `${merged.symbol}|${merged.timeframe}|${t}`;
  const i = merged.candles.length - 1;
  const last = merged.candles[i]!;
  const key = keyOf(last.time);
  const same = prev != null && prev.key === key;
  // شمعة فُتحت محلياً (`withLivePrice`): افتتاحها أوّل تيك فيها لا التيك الحالي.
  const rolled = merged.candles.length === base.candles.length + 1;
  const open = rolled && same ? prev.open : last.open;
  const high = same ? Math.max(prev.high, last.high) : last.high;
  const low = same ? Math.min(prev.low, last.low) : last.low;
  // الشمعة التي أُغلقت للتوّ تبقى على آخر تيكاتها: كانت تُبنى من جلبها الأخير فيرتدّ إغلاقها ويختفي ذيلها.
  let closed: LiveBarState | null = null;
  // `withLivePrice` يبني من الجلب الأخير ويضيف شمعة **واحدة** عند زمن التيك: على 1m تُغلق شمعتان بين تحديثَين
  // (كل 90 ث) فالشمعة المحلية الأولى كانت تختفي مع قمّتها/قاعها — الشارت يقفز من 10:00 إلى 10:02 حتى الجلب.
  // تُحفظ هنا (`between`) وتُعاد بين آخر شمعة جلب والحيّة؛ والجلب الذي يحملها يُسقطها (زمنها لم يعد بعده).
  let between: (LiveBarState & { time: number })[] = [];
  if (rolled) {
    const baseLast = base.candles[base.candles.length - 1]!.time;
    const bk = keyOf(baseLast);
    closed = prev?.key === bk ? { key: bk, open: prev.open, high: prev.high, low: prev.low, close: prev.close } : prev?.closed?.key === bk ? prev.closed : null;
    const prefix = keyOf(0).slice(0, -1);
    const inGap = (b: { key: string; time: number }) => b.key.startsWith(prefix) && b.time > baseLast && b.time < last.time;
    between = (prev?.between ?? []).filter(inGap);
    if (prev && !same && prev.time != null && inGap({ key: prev.key, time: prev.time })) {
      between.push({ key: prev.key, time: prev.time, open: prev.open, high: prev.high, low: prev.low, close: prev.close });
    }
  }
  const ext: LiveExtremes = { key, open, high, low, close: last.close, closed, time: last.time, between };
  if (open === last.open && high === last.high && low === last.low && !closed && !between.length) return { series: merged, ext };
  const candles = [...merged.candles];
  candles[i] = { ...last, open, high: Math.max(high, open), low: Math.min(low, open) };
  if (closed) {
    const c = candles[i - 1]!;
    candles[i - 1] = { ...c, high: Math.max(c.high, closed.high), low: Math.min(c.low, closed.low), close: closed.close };
  }
  if (between.length) {
    const gap = between.map((b) => ({ time: b.time, open: b.open, high: b.high, low: b.low, close: b.close }));
    candles.splice(i, 0, ...gap);
  }
  return { series: { ...merged, candles }, ext };
}

/**
 * نسبة التغيّر مع السعر الحيّ — بتعريف الخادم نفسه (`build_series`: من إغلاق أول شمعة
 * بالسلسلة إلى آخر سعر). الرأس كان يطبع **سعر التيك** بجانب **نسبة الجلب الأخير**:
 * السعر يتحرّك كل ثانية والنسبة واقفة حتى الجلب التالي، وقد تناقضه (سعر فوق الافتتاح
 * ونسبة حمراء). `livePrice` = ما يُدمج فعلاً بالشمعة (`livePriceForChart`)؛ null ⇒ نسبة الخادم.
 */
export function liveChangePct(series: ChartSeries, livePrice: number | null | undefined): number {
  // `change_pct: null` (backend-r19، ui18) ⇒ NaN: كل الرؤوس تحرس `Number.isFinite` فلا تُطبع نسبة.
  const serverPct = series.change_pct ?? NaN;
  if (livePrice == null || !Number.isFinite(livePrice) || livePrice <= 0) return serverPct;
  const first = series.candles[0]?.close;
  if (!first || !Number.isFinite(first)) return serverPct;
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
  const px = price != null && Number.isFinite(price) && price > 0 ? price : series.last ?? NaN;
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
  const step = timeframeStepSec(series.timeframe);
  if (step < 86400) return prevDayFromIntraday(upTo, series.symbol, step)?.close ?? null;
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
  if (liveBarOpenSec(last.time, tickAsOf, step, opts?.nowSec, series.symbol) == null) return null;
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
