/**
 * تكبير/تصغير نافذة الشموع (عدد الشموع المرئيّة + الإزاحة من الطرف الأيمن).
 *
 * كان زرّا − + يغيّران العدد وحده (الطرف الأيمن ثابت) بينما عجلة الفأرة تكبّر حول المركز،
 * وكلاهما بقاعدة مختلفة. وحول المركز عند متابعة السعر الحيّ (`offset = 0`) يسحب التكبير
 * الطرف الأيمن يساراً فتختفي الشمعة الجارية — المتداول يكبّر ليقرأ آخر حركة فيفقدها.
 *
 * القاعدة الموحّدة:
 * - `offset = 0` (يتابع الحيّ) ⇒ الطرف الأيمن مثبَّت، الشمعة الجارية تبقى ظاهرة.
 * - غير ذلك ⇒ حول مركز النافذة، مقيَّداً بطرفَي السلسلة.
 * - كل ضغطة تغيّر العدد شمعةً على الأقلّ (عند نافذة صغيرة قد يُقرَّب العامل إلى لا شيء).
 * - العدد بين `min` و`max`.
 */
export type ZoomWindow = { count: number; offset: number };

export function zoomWindow(
  allLen: number,
  count: number,
  offset: number,
  factor: number,
  min = 2,
  max = 1000
): ZoomWindow {
  const cur = Math.max(min, Math.min(max, Math.round(count)));
  const off = Math.max(0, Math.round(offset));
  if (!Number.isFinite(factor) || factor <= 0 || factor === 1) return { count: cur, offset: off };
  let next = Math.round(cur * factor);
  if (next === cur) next = factor > 1 ? cur + 1 : cur - 1;
  next = Math.max(min, Math.min(max, next));
  if (next === cur) return { count: cur, offset: off };
  if (off === 0 || allLen <= 0) return { count: next, offset: off };
  const oldEnd = allLen - off;
  const oldStart = Math.max(0, oldEnd - cur);
  const center = (oldStart + oldEnd) / 2;
  const newEnd = Math.min(allLen, Math.max(next, Math.round(center + next / 2)));
  return { count: next, offset: Math.max(0, allLen - newEnd) };
}
