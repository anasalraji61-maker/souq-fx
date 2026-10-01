/**
 * مدى محور السعر حين تكون السلسلة **مسطّحة تماماً** (أعلى = أدنى).
 *
 * كان `max − min || 1`: شمعة إعادة واحدة بلا حركة، أو شموع دقيقة ساكنة بعد الإغلاق، تُرسم
 * على مدى وحدة سعرية كاملة — EURUSD 1.08 بمحور من 0.52 إلى 1.64، والشمعة خطّ باهت بالمنتصف
 * وعلامات المحور بلا معنى، والتقاطع يقرأ السعر بدقّة 0.005 للبكسل. الذهب 2300 عكس ذلك: وحدة
 * واحدة (10 نقاط) مقبولة بالصدفة. الآن ±0.2% من السعر (≈ 43 pip حول EURUSD، 60 حول USDJPY
 * 150) — المدى الذي يراه المتداول لشارت دقيقة هادئ. باللوغاريتمي المدى نسبيّ أصلاً ⇒ 0.004.
 *
 * خالص: يُفحص بـ`priceSpan.selftest.ts`.
 */
export const FLAT_SPAN_RATIO = 0.004;

export function priceSpan(min: number, max: number, logScale: boolean): number {
  const span = max - min;
  if (Number.isFinite(span) && span > 0) return span;
  if (!Number.isFinite(min) || !Number.isFinite(max)) return 1; // بلا بيانات: كما كان
  if (logScale) return FLAT_SPAN_RATIO;
  const mid = Math.abs((max + min) / 2);
  return mid > 0 ? mid * FLAT_SPAN_RATIO : 1;
}
