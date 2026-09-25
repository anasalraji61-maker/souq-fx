/**
 * رأس لوحة المؤشّر عرضه 66px (عمود المحور، `paneHead`) ⇒ داخله ~62px. اللوحة المضغوطة (<42px،
 * أربع لوحات فأكثر بالهاتف) لا تتّسع لسطر ثالث، فكانت تسقط الإشارة (‎%D‎، Signal) أو تطبع الفارق
 * بدل «+DI / −DI» — مع أنّ رقمين قصيرين («25.1 20.8»، «82 71») يتّسعان بسطر واحد جنباً لجنب.
 *
 * هذا القرار وحده: هل يتّسع النصّان بسطر واحد بخطّ 11px (DESIGN-PRO §2، كان 9)؟ لا رسم هنا.
 * القياس تناسبي مشترك (`textWidth.ts`): الفاصلة والسالب أضيق من الرقم، فـ«-12.3 -8.40» يتّسع بـ11px
 * بينما عدّ المحارف × عرض الرقم كان يرفضه.
 */
import { propTextWidth } from './textWidth';

/** خطّ الرأس: الاسم والقيمة والزوج بسطر واحد. */
export const PANE_HEAD_FONT = 11;
/** فراغ بين الرقمين (`paneHeadRow` `gap`). */
export const PANE_INLINE_GAP = 4;
/** عرض الرأس الداخلي: 66 − حشوتا 2. */
export const PANE_HEAD_INNER_W = 62;

export function paneInlineFits(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  return propTextWidth(a, PANE_HEAD_FONT) + propTextWidth(b, PANE_HEAD_FONT) + PANE_INLINE_GAP <= PANE_HEAD_INNER_W;
}

/**
 * قيمة واحدة أعرض من الرأس بـ11px (نادر: ≥10 محارف كـ«-12345.678») ⇒ `paneHeadValueLong` 10px — العمود
 * بعرض محور السعر الثابت، والبديل قصّ رقم بـ«…» أو تغطية آخر أعمدة اللوحة. غير ذلك 11 (كان 10 لكل ≥7 محارف).
 */
export function paneValueTooWide(text: string | null | undefined): boolean {
  return !!text && propTextWidth(text, PANE_HEAD_FONT) > PANE_HEAD_INNER_W;
}
