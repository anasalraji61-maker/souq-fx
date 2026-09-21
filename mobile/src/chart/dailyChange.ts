/**
 * تغيّر اليوم لقائمة المتابعة — رياضيات صرفة بلا اعتماد على RN/الشبكة (قابلة للاختبار بـtsx).
 *
 * المرجع = إغلاق الشمعة اليومية **السابقة** (المعيار الذي يعتاده متداول التجزئة: "التغيّر منذ إغلاق
 * أمس"). آخر شمعة D1 قد تكون شمعة اليوم الجارية؛ لذلك نأخذ ما قبلها. بعطلة نهاية الأسبوع آخر شمعة
 * هي الجمعة المكتملة، فيصبح التغيّر = الجمعة مقابل الخميس — وهو ما تعرضه تطبيقات التداول عادةً.
 */
import type { Candle } from '../api';

export type Direction = 'up' | 'down' | 'flat';

export type DailyChange = {
  abs: number;
  pct: number;
  dir: Direction;
};

/** إغلاق الأمس من شموع D1 مرتّبة زمنياً تصاعدياً؛ null إن لم تكفِ البيانات أو كانت فاسدة. */
export function prevCloseFromDaily(candles: readonly Pick<Candle, 'time' | 'close'>[]): number | null {
  if (!Array.isArray(candles) || candles.length < 2) return null;
  const sorted = [...candles].sort((a, b) => a.time - b.time);
  const c = sorted[sorted.length - 2]?.close;
  return typeof c === 'number' && Number.isFinite(c) && c > 0 ? c : null;
}

/**
 * تغيّر السعر الحالي عن المرجع. عتبة "ثابت" نسبية صغيرة (0.005%) كي لا يومض السهم أخضر/أحمر
 * على ضجيج الكسور العشرية.
 */
export function dailyChange(price: number | null | undefined, prevClose: number | null | undefined): DailyChange | null {
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return null;
  if (typeof prevClose !== 'number' || !Number.isFinite(prevClose) || prevClose <= 0) return null;
  const abs = price - prevClose;
  const pct = (abs / prevClose) * 100;
  const dir: Direction = Math.abs(pct) < 0.005 ? 'flat' : pct > 0 ? 'up' : 'down';
  return { abs, pct, dir };
}

/** "+0.23%" / "−0.41%" / "0.00%" — علامة ناقص طباعية واضحة، ومنزلتان دائماً. */
export function formatPct(pct: number): string {
  if (!Number.isFinite(pct)) return '—';
  const r = Math.round(pct * 100) / 100;
  if (r === 0) return '0.00%';
  return `${r > 0 ? '+' : '−'}${Math.abs(r).toFixed(2)}%`;
}

/** اتجاه آخر حركة تيك (لوميض قصير بالصف): مقارنة بالسعر السابق المختلف. */
export function tickDirection(prev: number | null | undefined, next: number | null | undefined): Direction {
  if (typeof prev !== 'number' || typeof next !== 'number' || !Number.isFinite(prev) || !Number.isFinite(next)) {
    return 'flat';
  }
  if (next > prev) return 'up';
  if (next < prev) return 'down';
  return 'flat';
}
