/**
 * موضع نصّ الملاحظة (`note`) على الشارت: يبدأ عند نقطة الإرساء ويمتدّ يميناً — فملاحظة قرب
 * الشمعة الحيّة (حيث يكتب المتداول أغلب ملاحظاته) كانت تمرّ تحت محور السعر وتُقصّ بلا نقاط.
 *
 * الآن: إن لم يتّسع النصّ يميناً يُقلب لينتهي عند نقطة الإرساء (محاذاة يمين)، وإن لم يتّسع
 * بأيّ جهة يأخذ الجهة الأوسع ويُختصر بسطر واحد (`numberOfLines={1}` عند المستدعي).
 * نقطة الإرساء نفسها لا تتحرّك — هي هدف اللمس والسحب.
 */
import { propTextWidth } from './textWidth';

/** خطّ الملاحظة (DESIGN-PRO §2: 11px أصغر حجم) — `styles.note` يقرؤه. */
export const NOTE_FONT = 11;
/** حشوة الإطار عند التحديد (3 + 3) + حدّان. */
export const NOTE_PAD_W = 8;
/** هامش عن حافّتي اللوح. */
const EDGE = 2;

export type NoteBox = { left: number; width: number; flipped: boolean };

export function noteTextWidth(text: string): number {
  // بالقياس التناسبي المشترك (`textWidth.ts`) لا عدد المحارف × ثابت: «MMM» أعرض من «iii» بكثير.
  return propTextWidth(text, NOTE_FONT) + NOTE_PAD_W;
}

/**
 * `anchorX`: موضع نقطة الإرساء بالبكسل داخل اللوح؛ `plotW`: عرض لوح الشموع (بلا المحور).
 * يعيد `left` و`width` (سقف العرض) و`flipped` (⇒ محاذاة يمين تنتهي عند الإرساء).
 */
export function noteBox(anchorX: number, text: string, plotW: number): NoteBox {
  const want = noteTextWidth(text);
  const right = Math.max(0, plotW - EDGE - anchorX);
  const leftRoom = Math.max(0, anchorX - EDGE);
  if (want <= right || right >= leftRoom) {
    return { left: anchorX, width: Math.min(want, right), flipped: false };
  }
  const width = Math.min(want, leftRoom);
  return { left: anchorX - width, width, flipped: true };
}
