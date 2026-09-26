/**
 * تكبير/تصغير نافذة الشموع (عدد الشموع المرئيّة + الإزاحة من الطرف الأيمن).
 *
 * كان زرّا − + يغيّران العدد وحده (الطرف الأيمن ثابت) بينما عجلة الفأرة تكبّر حول المركز،
 * وكلاهما بقاعدة مختلفة. وحول المركز عند متابعة السعر الحيّ (`offset = 0`) يسحب التكبير
 * الطرف الأيمن يساراً فتختفي الشمعة الجارية — المتداول يكبّر ليقرأ آخر حركة فيفقدها.
 *
 * القاعدة الموحّدة:
 * - `offset = 0` (يتابع الحيّ) ⇒ الطرف الأيمن مثبَّت، الشمعة الجارية تبقى ظاهرة.
 * - غير ذلك ⇒ حول مركز النافذة، مقيَّداً بطرفَي السلسلة — أو حول `focus` (0 يسار اللوح، 1 يمينه):
 *   عجلة الفأرة تمرّر موضع المؤشّر فتبقى الشمعة تحته في مكانها، كالقرص (`pinchWindow`).
 * - كل ضغطة تغيّر العدد شمعةً على الأقلّ (عند نافذة صغيرة قد يُقرَّب العامل إلى لا شيء).
 * - العدد بين `min` و`max`، و`max` لا يتجاوز طول السلسلة: الخادم يعيد ~180 شمعة، فكان
 *   التصغير يصعد 195، 244… حتى 1000 بلا أيّ تغيير مرئيّ، ثم يلزم ~8 ضغطات + قبل أن يتحرّك
 *   الشارت. وكذلك عدد أكبر من السلسلة سلفاً (Renko بـ30 لبنة بنافذة 80) يُقرأ بطولها.
 */
export type ZoomWindow = { count: number; offset: number };

/**
 * العدد **المعروض** لا المخزَّن: مسحوباً لأقدم التاريخ (إزاحة 170 من 180) النافذة 80 تعرض 10 شموع فقط
 * (الشارت يقسم اللوح على المعروض)، فكان «+» يحسب من 80 ⇒ 64 وتصير 64 شمعة ظاهرة — التكبير يُصغّر
 * الشموع (10 ⇒ 64)، والقرص كذلك (10 ⇒ 40). الآن من المعروض: 10 ⇒ 8 كـTradingView.
 */
function shownCount(allLen: number, count: number, off: number, min: number, max: number): number {
  const stored = Math.max(min, Math.min(max, Math.round(count)));
  return off > 0 && allLen > 0 ? Math.max(min, Math.min(stored, allLen - off)) : stored;
}

export function zoomWindow(
  allLen: number,
  count: number,
  offset: number,
  factor: number,
  min = 2,
  max = 1000,
  focus = 0.5
): ZoomWindow {
  if (allLen > 0) max = Math.max(min, Math.min(max, allLen));
  const off = Math.max(0, Math.round(offset));
  const cur = shownCount(allLen, count, off, min, max);
  if (!Number.isFinite(factor) || factor <= 0 || factor === 1) return { count: cur, offset: off };
  let next = Math.round(cur * factor);
  if (next === cur) next = factor > 1 ? cur + 1 : cur - 1;
  next = Math.max(min, Math.min(max, next));
  if (next === cur) return { count: cur, offset: off };
  if (off === 0 || allLen <= 0) return { count: next, offset: off };
  const f = Number.isFinite(focus) ? Math.max(0, Math.min(1, focus)) : 0.5;
  const oldEnd = allLen - off;
  const oldStart = Math.max(0, oldEnd - cur);
  const focusBar = oldStart + f * (oldEnd - oldStart);
  const newEnd = Math.min(allLen, Math.max(next, Math.round(focusBar + (1 - f) * next)));
  return { count: next, offset: Math.max(0, allLen - newEnd) };
}

/**
 * قرص بإصبعين: تباعد أفقي بين الإصبعين، بحدّ أدنى — إصبعان متلاصقان (أو على خطّ عمودي
 * واحد) كانا سيقسمان على صفر فتقفز النافذة لطرفها.
 */
export const PINCH_MIN_SPREAD = 24;

export function pinchSpread(x1: number, x2: number): number {
  const d = Math.abs(x1 - x2);
  return Number.isFinite(d) ? Math.max(PINCH_MIN_SPREAD, d) : PINCH_MIN_SPREAD;
}

/**
 * نافذة القرص: تُحسب **من حالة بدء القرص** كل إطار (لا تراكمياً)، فالعودة بالإصبعين لتباعدهما
 * الأوّل تعيد النافذة نفسها بالضبط. تباعد الإصبعين ⇒ شموع أقلّ (تكبير).
 * - `startOffset = 0` (يتابع الحيّ) ⇒ الطرف الأيمن مثبَّت كقاعدة `zoomWindow`.
 * - غير ذلك ⇒ الشمعة تحت منتصف الإصبعين (`focus` من 0 يسار اللوح إلى 1 يمينه) تبقى تحتهما.
 * بلا «شمعة على الأقلّ» لـ`zoomWindow`: إطار حركة صغير لا يُفترض أن يغيّر شيئاً.
 */
export function pinchWindow(
  allLen: number,
  startCount: number,
  startOffset: number,
  startSpread: number,
  spread: number,
  focus: number,
  min = 2,
  max = 1000
): ZoomWindow {
  if (allLen > 0) max = Math.max(min, Math.min(max, allLen));
  const off = Math.max(0, Math.round(startOffset));
  const cur = shownCount(allLen, startCount, off, min, max);
  if (!(startSpread > 0) || !(spread > 0)) return { count: cur, offset: off };
  const next = Math.max(min, Math.min(max, Math.round((cur * startSpread) / spread)));
  if (next === cur || off === 0 || allLen <= 0) return { count: next, offset: off };
  const f = Number.isFinite(focus) ? Math.max(0, Math.min(1, focus)) : 0.5;
  const oldEnd = allLen - off;
  const focusBar = oldEnd - cur + f * cur;
  const newEnd = Math.min(allLen, Math.max(next, Math.round(focusBar + (1 - f) * next)));
  return { count: next, offset: Math.max(0, allLen - newEnd) };
}
