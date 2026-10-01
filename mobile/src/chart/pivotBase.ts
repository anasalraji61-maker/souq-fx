/**
 * أساس نقاط الارتكاز (Pivot/Fib/Camarilla/Woodie/DeMark/CPR): أعلى/أدنى/إغلاق **جلسة التداول
 * السابقة** — المعيار الذي يعنيه متداول الفوركس بـ«Pivot Points».
 *
 * كانت كلّها تُحسب من آخر 20 شمعة **بالفريم المعروض**: على 15m هي آخر خمس ساعات، وعلى 1m آخر
 * عشرين دقيقة، وعلى D آخر شهر — مستويات تتبدّل مع كل شمعة وتختلف بين الفريمات لنفس الرمز
 * بنفس اللحظة، ولا يطابق أيّ منها ما يقرؤه المتداول بمنصّته. وكانت تُحسب من الشموع المرسومة
 * (Heikin/Renko) لا الحقيقية.
 *
 * المصدر بالأولوية (فريم داخل اليوم): الجلسة السابقة مجمَّعةً من شموع الفريم بحدّ 17:00 نيويورك
 * (يوم MT4/MT5) — **بشرط** أن تبدأ السلسلة قبلها (جلسة مقصوصة من أوّلها تعطي أعلى/أدنى ناقصين،
 * فالأصدق ألا تُرسم)؛ وإلا شموع D1 (`dailyRefStore`، يوم UTC من المزوّد) احتياطاً.
 */
import type { Candle } from '../api';
import { candleTimeSec } from './dataSource';
import { barTradingDaySec } from './marketHours';

/**
 * الجلسة السابقة مجمَّعة من شموع داخل اليوم (بأي ترتيب)؛ null إن لم تكتمل بالسلسلة. `stepSec` (خطوة الفريم)
 * ⇒ الشمعة لليوم الذي يحوي معظمها (`barTradingDaySec`: 4H 20:00 UTC صيفاً لليوم الجديد)؛ بدونه زمن فتحها.
 */
export function prevDayFromIntraday(candles: readonly Candle[], symbol: string, stepSec?: number): Candle | null {
  if (!Array.isArray(candles) || candles.length < 2) return null;
  const sorted = candles
    .filter((c) => c && Number.isFinite(c.time))
    .sort((a, b) => a.time - b.time);
  if (sorted.length < 2) return null;
  const dayOf = (t: number) => barTradingDaySec(symbol, candleTimeSec(t), stepSec);
  const lastDay = dayOf(sorted[sorted.length - 1].time);
  let end = sorted.length - 1;
  while (end >= 0 && dayOf(sorted[end].time) === lastDay) end--;
  if (end < 0) return null;
  const prevDay = dayOf(sorted[end].time);
  let start = end;
  while (start > 0 && dayOf(sorted[start - 1].time) === prevDay) start--;
  // مكتملة إن سبقتها شمعة من يوم أقدم، أو بدأت السلسلة عند افتتاح الجلسة نفسه.
  if (start === 0 && candleTimeSec(sorted[0].time) > prevDay) return null;
  let high = -Infinity;
  let low = Infinity;
  let volume = 0;
  for (let i = start; i <= end; i++) {
    high = Math.max(high, sorted[i].high);
    low = Math.min(low, sorted[i].low);
    volume += sorted[i].volume ?? 0;
  }
  if (!Number.isFinite(high) || !Number.isFinite(low)) return null;
  return {
    time: prevDay,
    open: sorted[start].open,
    high,
    low,
    close: sorted[end].close,
    volume,
  };
}

/**
 * الشموع حتى `cutSec` (ضمناً) — للإعادة: جلسة «الأمس» هي ما قبل يوم شمعة الإعادة لا ما قبل اليوم.
 * `cutSec` غير محدّد ⇒ السلسلة كما هي (نفس المرجع، فلا يُعاد حساب ما يعتمد عليها).
 */
export function candlesThrough<T extends Pick<Candle, 'time'>>(candles: readonly T[], cutSec: number | null): readonly T[] {
  if (cutSec == null || !Number.isFinite(cutSec)) return candles;
  return candles.filter((c) => c && Number.isFinite(c.time) && candleTimeSec(c.time) <= cutSec);
}

/**
 * مدخل دوالّ الارتكاز بفترة 1: كل واحدة تقرأ `candles.slice(n - period - 1, n - 1)`، فالشمعة
 * الأولى هنا هي نافذتها كاملة والثانية الجلسة «الجارية» التي تُستثنى — ولا يقرأ منها إلا Woodie
 * افتتاحها (`currOpen`؛ غير معروف ⇒ إغلاق السابقة، وهو افتتاح الجارية بالفوركس ما لم تكن فجوة).
 */
export function pivotInput(prev: Candle | null, currOpen?: number | null): Candle[] | null {
  if (!prev) return null;
  const open = currOpen != null && Number.isFinite(currOpen) ? currOpen : prev.close;
  return [prev, { ...prev, open }];
}

/**
 * افتتاح الجلسة الجارية (جلسة آخر شمعة) من شموع داخل اليوم — Woodie يبني محوره عليه. null إن بدأت السلسلة
 * بعد افتتاح الجلسة (أوّل شمعة معروضة ليست الافتتاح الحقيقي). `stepSec` كما بـ`prevDayFromIntraday`.
 */
export function currentSessionOpen(candles: readonly Candle[], symbol: string, stepSec?: number): number | null {
  if (!Array.isArray(candles) || candles.length === 0) return null;
  const sorted = candles.filter((c) => c && Number.isFinite(c.time)).sort((a, b) => a.time - b.time);
  if (!sorted.length) return null;
  const dayOf = (t: number) => barTradingDaySec(symbol, candleTimeSec(t), stepSec);
  const lastDay = dayOf(sorted[sorted.length - 1].time);
  let start = sorted.length - 1;
  while (start > 0 && dayOf(sorted[start - 1].time) === lastDay) start--;
  if (start === 0 && candleTimeSec(sorted[0].time) > lastDay) return null;
  const o = sorted[start].open;
  return Number.isFinite(o) ? o : null;
}

/**
 * افتتاح الجلسة الجارية من شموع **يومية** (أو أسبوعية): الشمعة التالية لشمعة الجلسة السابقة `prev` (ما أعاده
 * `prevSessionFromDaily`). على فريم D/W كان Woodie يأخذ إغلاق السابقة دائماً ⇒ فجوة افتتاح الاثنين تُزيح WPP
 * وكل مستوياته بنصفها، وتختلف عن الفريمات داخل اليوم للرمز نفسه. null إن كانت `prev` آخر شمعة (الجارية لم تُجلب).
 */
export function currentSessionOpenAfter<T extends Pick<Candle, 'time' | 'open'>>(
  candles: readonly T[],
  prev: Pick<Candle, 'time'> | null | undefined
): number | null {
  if (!prev || !Array.isArray(candles)) return null;
  const pt = candleTimeSec(prev.time);
  let next: T | null = null;
  for (const c of candles) {
    if (!c || !Number.isFinite(c.time)) continue;
    const t = candleTimeSec(c.time);
    if (t > pt && (!next || t < candleTimeSec(next.time))) next = c;
  }
  const o = next?.open;
  return typeof o === 'number' && Number.isFinite(o) && o > 0 ? o : null;
}

/**
 * أهمية وسم مستوى ارتكاز (الأصغر أهمّ) حين تتزاحم الوسوم رأسياً: المحور أوّلاً ثم المستويات
 * بقربها منه (R1/S1 قبل R3/S3). PDH/PDL بمرتبة المحور (يُتداول عليهما مباشرةً)، وPDC بعدهما. Camarilla يُتداول على R3/S3 (ارتداد) وR4/S4 (اختراق) لا R1.
 */
export function pivotLabelRank(label: string): number {
  if (/^(PP|FPP|WPP|CPR-P|PDH|PDL)$/.test(label)) return 0;
  if (label === 'PDC') return 2;
  const cam = /^C[RS]([1-4])$/.exec(label);
  if (cam) return ({ '3': 1, '4': 2, '2': 3, '1': 4 } as Record<string, number>)[cam[1]];
  if (/^CPR-[TB]$/.test(label)) return 1;
  const n = /[RS]([1-3])$/.exec(label);
  return n ? Number(n[1]) : 5;
}

/**
 * من أين يبدأ رسم خطوط الارتكاز داخل النافذة المرئيّة: أوّل شمعة من **الجلسة الجارية** (جلسة
 * `lastSec`، آخر شمعة بالسلسلة كلّها). المستويات محسوبة للجلسة الجارية من الجلسة السابقة، فمدّها
 * فوق شموع أمس يوحي بأن السعر «احترمها» أو «كسرها» قبل أن توجد — TradingView يرسمها من بداية
 * جلستها وحدها.
 *
 * - `0` ⇒ الجلسة بدأت قبل النافذة (بعرض اللوح كلّه).
 * - `timesSec.length` ⇒ النافذة كلّها قبل الجلسة (المتداول سحب للخلف) ⇒ لا خطوط.
 * - `-1` ⇒ مدخل غير صالح ⇒ يتصرّف المستدعي كما كان (بعرض اللوح).
 * `stepSec` ⇒ نسبة الشمعة ليومها كـ`prevDayFromIntraday` (4H العابرة للحدّ أوّل الجلسة الجديدة).
 */
export function pivotSessionStartIndex(
  timesSec: readonly number[],
  lastSec: number,
  symbol: string,
  stepSec?: number
): number {
  if (!Array.isArray(timesSec) || timesSec.length === 0 || !Number.isFinite(lastSec)) return -1;
  const session = barTradingDaySec(symbol, lastSec, stepSec);
  for (let i = 0; i < timesSec.length; i++) {
    if (Number.isFinite(timesSec[i]) && barTradingDaySec(symbol, timesSec[i]!, stepSec) >= session) return i;
  }
  return timesSec.length;
}
