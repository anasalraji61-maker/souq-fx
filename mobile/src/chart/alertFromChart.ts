/**
 * إنشاء تنبيه سعري من الشارت مباشرة (تقاطع/خط أفقي/منطقة) — منطق مشترك بين شارت التركيز
 * (`FocusChartModal`) وشارت الشاشة الرئيسية (`TerminalScreen`) بعدما كان موجوداً بلوحة التركيز وحدها،
 * فكان المتداول على الشارت الرئيسي مضطراً لفتح لوحة التنبيهات وكتابة السعر يدوياً.
 *
 * قاعدتان مقصودتان:
 * - الاتجاه (`above`/`below`) يُحسم بسعر مرجعي **للرمز نفسه**: تيك حي أو آخر إغلاق من مصدر غير تجريبي،
 *   وإلا اقتباس حي. بلا مرجع لا يُنشأ التنبيه (كان كل تنبيه يصبح «فوق» بلا مرجع حتى لو كان تحت السعر).
 * - الاقتباس البذري التجريبي (`isRealQuote`) ليس سعراً حقيقياً — لا يُستخدم مرجعاً أبداً.
 */
import { api, type ChartSeries } from '../api';
import { isRealQuote } from './dataSource';

/** من أين جاء السعر: تقاطع الشارت أو أداة رسم (يغيّر ملاحظة التنبيه فقط). */
export type ChartAlertOrigin = 'drawing' | 'crosshair';

/** آخر إغلاق صالح كمرجع: نفس الرمز ومن مصدر غير تجريبي، وإلا null. */
export function seriesRefPrice(series: ChartSeries | null | undefined, symbol: string): number | null {
  if (!series || series.symbol.toUpperCase() !== symbol.toUpperCase()) return null;
  if (series.data_source?.kind === 'demo') return null;
  const last = series.last;
  return typeof last === 'number' && Number.isFinite(last) && last > 0 ? last : null;
}

const positive = (v: number | null | undefined): number | null =>
  typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : null;

/**
 * ينشئ التنبيه ويعيد اتجاهه. يرمي عند: سعر غير صالح (خط اتجاه منحدر ممدَّد قد يعطي ≤0 والخادم يرفضه
 * بـ422 برسالة عامة)، أو تعذّر معرفة سعر مرجعي، أو فشل الطلب — والمستدعي يعرض رسالة الفشل.
 */
export async function createChartAlert(input: {
  symbol: string;
  price: number;
  /** سعر مرجعي معروف لدى المستدعي (تيك حي / آخر إغلاق) — إن غاب يُطلب اقتباس حي. */
  refPrice?: number | null;
  note?: string;
}): Promise<{ condition: 'above' | 'below'; price: number }> {
  const price = positive(input.price);
  if (price == null) throw new Error('invalid alert price');
  let ref = positive(input.refPrice);
  if (ref == null) {
    const q = await api.marketQuote(input.symbol);
    ref = isRealQuote(q) ? positive(q.price) : null;
  }
  if (ref == null) throw new Error('no reference price');
  const condition: 'above' | 'below' = price >= ref ? 'above' : 'below';
  await api.createAlert({ symbol: input.symbol, condition, price, note: input.note });
  return { condition, price };
}

/** «EURUSD ≥ 1.08540» — نص تأكيد «مُسلَّح» الموحّد. */
export function armedText(symbol: string, condition: 'above' | 'below', priceText: string): string {
  return `${symbol} ${condition === 'above' ? '≥' : '≤'} ${priceText}`;
}
