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

/**
 * سهم «خارج المدى» (▲/▼) أمام سعر الوسم: بمسافة ما دامت لا تصغّر الخطّ، وبلا مسافة حين تصغّره أو
 * تُخرج النصّ عن المحور — «▲ 0.000008900» (PEPE) 13 حرفاً = 62px بالحدّ الأدنى 8 على 60 فيُقصّ/يلتفّ،
 * و«▲0.000008900» 58px يتّسع. الأرقام الأكبر أهمّ من المسافة.
 */
export function withSideMark(mark: string, text: string, innerWidth: number, max = 11, min = 8): string {
  if (!mark) return text;
  const spaced = `${mark} ${text}`;
  const tight = `${mark}${text}`;
  const size = axisTagFontSize(spaced, innerWidth, max, min);
  const fits = [...spaced].length * MONO_ADVANCE_EM * size <= innerWidth;
  return fits && size >= axisTagFontSize(tight, innerWidth, max, min) ? spaced : tight;
}
