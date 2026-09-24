/**
 * قراءة رقم عشري كتبه المتداول بحقل نصي — بلا React، قابلة للاختبار بـ`parseDecimal.selftest.ts`.
 *
 * كان كل حقل يستخدم `parseFloat(s.replace(',', '.'))` وهذا يفشل بصمت في حالات شائعة:
 * - فاصل الآلاف: «2,350.50» (ذهب) → 2.35 و«100,000» (رصيد) → 100 — حاسبة المخاطرة اقترحت 100 لوت.
 * - الأرقام العربية الهندية ولوحة المفاتيح العربية: «١٫٠٨٥٠» → NaN، و«1٫0850» → 1 (يتوقف عند ٫).
 * - الكتابة الأوروبية: «1.085,50» → 1.085.
 *
 * القواعد: الأرقام ٠-٩ و۰-۹ → 0-9، «٫» → نقطة عشرية، «٬» والمسافات تُحذف. إن وُجدت فاصلة ونقطة معاً فالأخيرة
 * هي العشرية والأخرى فاصل آلاف. فاصل واحد متكرر (1,000,000 أو 1.000.000) = آلاف بشرط مجموعات من 3 أرقام.
 * فاصلة وحيدة = عشرية («1,0850»)، **إلا** إذا تلاها 3 أرقام بالضبط («10,000» أو «1,085») — مبهمة (عشرة آلاف أم
 * 10.000؟) فتُرفض بدل التخمين؛ الحقول مالية والتخمين الخاطئ يغيّر الحجم ألف مرة. كل ما عدا ذلك → null.
 */

const ARABIC_INDIC = /[٠-٩]/g;
const EXT_ARABIC_INDIC = /[۰-۹]/g;

export function normalizeDigits(s: string): string {
  return s
    .replace(ARABIC_INDIC, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(EXT_ARABIC_INDIC, (c) => String(c.charCodeAt(0) - 0x06f0));
}

const THOUSANDS_GROUPS = (body: string, sep: string) => {
  const parts = body.split(sep);
  return parts.length > 1 && /^\d{1,3}$/.test(parts[0]) && parts.slice(1).every((p) => /^\d{3}$/.test(p));
};

/**
 * @param opts.signed اسمح بإشارة سالبة (قيم مؤشرات مثل MACD) — الأسعار والأرصدة موجبة دائماً.
 * @param opts.amount خانة **مبلغ** (رصيد الحساب): النقطة الوحيدة متبوعة بثلاثة أرقام بالضبط تُرفض كالفاصلة
 *   المبهمة تماماً. الأسعار تحتاج «1.085» عشريةً فتبقى القاعدة العامة كما هي، لكن رصيداً بثلاث منازل لا
 *   يوجد، و«10.000» بكتابة أوروبية/تركية/إندونيسية تعني **عشرة آلاف** — كانت تُقرأ 10 فتقترح الحاسبة
 *   لوتاً أصغر ألف مرة بصمت، بينما «10,000» بجانبها تُرفض. الآن يتصرّف الفاصلان بالخانة نفسها بالقاعدة نفسها.
 * @param opts.percent خانة **نسبة** (مخاطرة %): علامة نسبة واحدة بأحد الطرفين تُحذف — «1%»، «0.5 ٪»، «%2».
 *   المتداول يكتب المخاطرة كما يقولها («1%»)، وكانت تُرفض بـ«رقم غير مفهوم» فتقف الحاسبة عند خانة لا
 *   خطأ فيها. علامتان («1%%»، «%1%») أو علامة بالوسط تبقى مرفوضة، وبلا هذا الخيار تُرفض العلامة كما كانت.
 * @returns الرقم، أو null إن كان النص فارغاً/غير صالح/مبهماً.
 */
export function parseDecimal(
  raw: string,
  opts: { signed?: boolean; amount?: boolean; percent?: boolean } = {}
): number | null {
  let s = normalizeDigits(raw)
    .replace(/[\s   ٬']/g, '')
    .replace(/٫/g, '.');
  if (opts.percent) {
    const signs = s.match(/[%٪％]/g)?.length ?? 0;
    if (signs === 1 && /^[%٪％]|[%٪％]$/.test(s)) s = s.replace(/[%٪％]/, '');
  }
  let neg = false;
  if (opts.signed && /^[-−]/.test(s)) {
    neg = true;
    s = s.slice(1);
  }
  if (!s) return null;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma !== -1 && lastDot !== -1) {
    const decSep = lastComma > lastDot ? ',' : '.';
    const thouSep = decSep === ',' ? '.' : ',';
    const cut = s.lastIndexOf(decSep);
    const intPart = s.slice(0, cut);
    if (s.indexOf(decSep) !== cut) return null;
    if (!THOUSANDS_GROUPS(intPart, thouSep)) return null;
    s = `${intPart.split(thouSep).join('')}.${s.slice(cut + 1)}`;
  } else if (lastComma !== -1 || lastDot !== -1) {
    const sep = lastComma !== -1 ? ',' : '.';
    const count = s.split(sep).length - 1;
    if (count > 1) {
      if (!THOUSANDS_GROUPS(s, sep)) return null;
      s = s.split(sep).join('');
    } else {
      const [a, b] = s.split(sep);
      const ambiguous = /^\d{3}$/.test(b) && a !== '0' && a !== '';
      if (ambiguous && (sep === ',' || opts.amount)) return null;
      if (sep === ',') s = `${a}.${b}`;
    }
  }
  if (!/^(\d+\.?\d*|\.\d+)$/.test(s)) return null;
  const n = Number(s);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}
