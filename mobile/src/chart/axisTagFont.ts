/**
 * حجم خطّ وسم داخل محور السعر (السعر الحيّ، التقاطع، الرسم المحدَّد).
 *
 * الوسم هو أهمّ رقم في المحور فيجب ألّا يكون أصغر من علامات المحور (11px، DESIGN-PRO §2)، لكن
 * عرض المحور ثابت: `monospace` يأخذ ~0.6em للحرف، وحشوة الوسم وهامشاه ~8px. نختار أكبر حجم
 * ≤ `max` يتّسع فيه النصّ كاملاً — «1.08432» و«106543.2» بـ11، و«▲106543.21» يصغر إلى 10 بدل أن
 * يُقصّ. حساب لا `adjustsFontSizeToFit` لأن الويب يتجاهلها.
 */
export const MONO_ADVANCE_EM = 0.6;

export function axisTagFontSize(
  text: string,
  innerWidth: number,
  max = 11,
  min = 8
): number {
  const n = Math.max(1, [...text].length);
  const fit = Math.floor(innerWidth / (n * MONO_ADVANCE_EM));
  return Math.max(min, Math.min(max, fit));
}
