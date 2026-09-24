/**
 * أساس نقاط الارتكاز (Pivot/Fib/Camarilla/Woodie/DeMark/CPR): أعلى/أدنى/إغلاق **جلسة التداول
 * السابقة** — المعيار الذي يعنيه متداول الفوركس بـ«Pivot Points».
 *
 * كانت كلّها تُحسب من آخر 20 شمعة **بالفريم المعروض**: على 15m هي آخر خمس ساعات، وعلى 1m آخر
 * عشرين دقيقة، وعلى D آخر شهر — مستويات تتبدّل مع كل شمعة وتختلف بين الفريمات لنفس الرمز
 * بنفس اللحظة، ولا يطابق أيّ منها ما يقرؤه المتداول بمنصّته. وكانت تُحسب من الشموع المرسومة
 * (Heikin/Renko) لا الحقيقية.
 *
 * المصدر بالأولوية: شموع D1 (`dailyRefStore`)، وإلا الجلسة السابقة مجمَّعةً من شموع الفريم
 * داخل اليوم بحدّ 17:00 نيويورك — **بشرط** أن تبدأ السلسلة قبلها (جلسة مقصوصة من أوّلها تعطي
 * أعلى/أدنى ناقصين، فالأصدق ألا تُرسم).
 */
import type { Candle } from '../api';
import { candleTimeSec } from './dataSource';
import { tradingDayStartSec } from './marketHours';

/** الجلسة السابقة مجمَّعة من شموع داخل اليوم (بأي ترتيب)؛ null إن لم تكتمل بالسلسلة. */
export function prevDayFromIntraday(candles: readonly Candle[], symbol: string): Candle | null {
  if (!Array.isArray(candles) || candles.length < 2) return null;
  const sorted = candles
    .filter((c) => c && Number.isFinite(c.time))
    .sort((a, b) => a.time - b.time);
  if (sorted.length < 2) return null;
  const dayOf = (t: number) => tradingDayStartSec(symbol, candleTimeSec(t));
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
 * مدخل دوالّ الارتكاز بفترة 1: كل واحدة تقرأ `candles.slice(n - period - 1, n - 1)`، فالشمعة
 * الأولى هنا هي نافذتها كاملة والثانية حشوة (الشمعة «الجارية» التي تُستثنى).
 */
export function pivotInput(prev: Candle | null): Candle[] | null {
  return prev ? [prev, prev] : null;
}

/**
 * أهمية وسم مستوى ارتكاز (الأصغر أهمّ) حين تتزاحم الوسوم رأسياً: المحور أوّلاً ثم المستويات
 * بقربها منه (R1/S1 قبل R3/S3). Camarilla يُتداول على R3/S3 (ارتداد) وR4/S4 (اختراق) لا R1.
 */
export function pivotLabelRank(label: string): number {
  if (/^(PP|FPP|WPP|CPR-P)$/.test(label)) return 0;
  const cam = /^C[RS]([1-4])$/.exec(label);
  if (cam) return ({ '3': 1, '4': 2, '2': 3, '1': 4 } as Record<string, number>)[cam[1]];
  if (/^CPR-[TB]$/.test(label)) return 1;
  const n = /[RS]([1-3])$/.exec(label);
  return n ? Number(n[1]) : 5;
}
