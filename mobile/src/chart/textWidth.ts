/**
 * تقدير عرض النصّ بالشارت — مصدر واحد بدل ثلاثة أرقام متفرّقة (QA84b: 6.4 و6.6 و6.8 للخطّ نفسه 11px).
 *
 * الفرق بين الأرقام لم يكن كلّه خطأ: وسوم القمّة/القاع ووقت التقاطع **أحادية المسافة** (`monospace`)، فعرض
 * كل محرف ثابت = 0.6em أيّاً كان الوزن (Menlo/Roboto Mono/Courier). أمّا المفتاح فخطّ **تناسبي**: «MACD»
 * أعرض بكثير من «rsi» بعدد المحارف نفسه، فرقم واحد للمحرف يقصّ الأسماء الكبيرة أولاً على هاتف 360pt.
 * هنا: الأحادي بثابت واحد، والتناسبي بفئة كل محرف (كبير/صغير/رقم/ضيّق/فراغ) — تقدير متحفّظ لوزن 500–600.
 */
import { MONO_ADVANCE_EM } from './axisTagFont';

/** عرض محرف بخطّ أحادي المسافة بحجم `fontSize` (11 ⇒ 6.6). */
export function monoCharW(fontSize: number): number {
  return fontSize * MONO_ADVANCE_EM;
}

/** عرض نصّ أحادي المسافة — بعدد المحارف الفعلية لا وحدات UTF-16. */
export function monoTextWidth(text: string, fontSize: number): number {
  return [...text].length * monoCharW(fontSize);
}

// نسب em لخطّ النظام (Roboto / SF) بوزن 500–600، مقرَّبة للأعلى.
const EM_SPACE = 0.28;
const EM_NARROW = 0.3; // . , : ; ' | ! i l I ( ) [ ]
const EM_DIGIT = 0.58; // الأرقام `tabular-nums` كلّها بعرض واحد، و«1» منها
const EM_UPPER = 0.66;
const EM_WIDE = 0.86; // M W m w
const EM_LOWER = 0.56;
const EM_OTHER = 0.62; // العربية والكردية والرموز

const NARROW = new Set([...".,:;'|!ilI()[]"]);
const WIDE = new Set([...'MWmw']);

/** عرض محرف واحد بخطّ تناسبي، بـem. */
function propEm(ch: string): number {
  if (ch === ' ') return EM_SPACE;
  if (NARROW.has(ch)) return EM_NARROW;
  if (ch >= '0' && ch <= '9') return EM_DIGIT;
  if (WIDE.has(ch)) return EM_WIDE;
  if (ch >= 'A' && ch <= 'Z') return EM_UPPER;
  if (ch >= 'a' && ch <= 'z') return EM_LOWER;
  return EM_OTHER;
}

/** عرض نصّ بخطّ تناسبي (المفتاح، الشارات) بحجم `fontSize`. */
export function propTextWidth(text: string, fontSize: number): number {
  let em = 0;
  for (const ch of text) em += propEm(ch);
  return em * fontSize;
}

/** عرض محرف رقمي بخطّ تناسبي مع `tabular-nums` (القيم المطبوعة بعد اسم المؤشّر). */
export function propDigitW(fontSize: number): number {
  return EM_DIGIT * fontSize;
}
