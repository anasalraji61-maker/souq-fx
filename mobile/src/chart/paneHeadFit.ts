/**
 * رأس لوحة المؤشّر عرضه 66px (عمود المحور، `paneHead`) ⇒ داخله ~62px. اللوحة المضغوطة (<42px،
 * أربع لوحات فأكثر بالهاتف) لا تتّسع لسطر ثالث، فكانت تسقط الإشارة (‎%D‎، Signal) أو تطبع الفارق
 * بدل «+DI / −DI» — مع أنّ رقمين قصيرين («25.1 20.8»، «82 71») يتّسعان بسطر واحد جنباً لجنب.
 *
 * هذا القرار وحده: هل يتّسع النصّان بسطر واحد بخطّ 8px؟ لا رسم هنا.
 */

/** عرض تقريبي لمحرف بخطّ 8px عريض (أرقام وفاصلة و«k»/«M») — محافظ قليلاً. */
export const PANE_INLINE_CHAR_W = 5.1;
/** فراغ بين الرقمين. */
export const PANE_INLINE_GAP = 5;
/** عرض الرأس الداخلي: 66 − حشوتا 2. */
export const PANE_HEAD_INNER_W = 62;

export function paneInlineFits(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const chars = Array.from(a).length + Array.from(b).length;
  return chars * PANE_INLINE_CHAR_W + PANE_INLINE_GAP <= PANE_HEAD_INNER_W;
}
