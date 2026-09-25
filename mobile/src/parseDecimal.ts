/**
 * قراءة رقم عشري كتبه المتداول بحقل نصي — بلا React، قابلة للاختبار بـ`parseDecimal.selftest.ts`.
 *
 * كان كل حقل يستخدم `parseFloat(s.replace(',', '.'))` وهذا يفشل بصمت في حالات شائعة:
 * - فاصل الآلاف: «2,350.50» (ذهب) → 2.35 و«100,000» (رصيد) → 100 — حاسبة المخاطرة اقترحت 100 لوت.
 * - الأرقام العربية الهندية ولوحة المفاتيح العربية: «١٫٠٨٥٠» → NaN، و«1٫0850» → 1 (يتوقف عند ٫).
 * - الكتابة الأوروبية: «1.085,50» → 1.085.
 *
 * القواعد: الأرقام ٠-٩ و۰-۹ و٠-٩ العريضة (０-９) → 0-9، «٫» و«．» → نقطة عشرية، «，» و«،» → فاصلة، «٬» و«'»/«’» والمسافات تُحذف. إن وُجدت فاصلة ونقطة معاً فالأخيرة
 * هي العشرية والأخرى فاصل آلاف. فاصل واحد متكرر (1,000,000 أو 1.000.000) = آلاف بشرط مجموعات من 3 أرقام.
 * فاصلة وحيدة = عشرية («1,0850»)، **إلا** إذا تلاها 3 أرقام بالضبط («10,000» أو «1,085») — مبهمة (عشرة آلاف أم
 * 10.000؟) فتُرفض بدل التخمين؛ الحقول مالية والتخمين الخاطئ يغيّر الحجم ألف مرة. كل ما عدا ذلك → null.
 */

const ARABIC_INDIC = /[٠-٩]/g;
const EXT_ARABIC_INDIC = /[۰-۹]/g;
/**
 * الأرقام العريضة (U+FF10–FF19) — ما تكتبه لوحة المفاتيح اليابانية بوضع الإدخال الافتراضي («１．０８５»)،
 * وطوكيو من أولويات المشروع. كانت كل خانة بالحاسبة والدفتر ترفضها «رقماً غير مفهوم» بينما «％» العريضة
 * مقبولة أصلاً بخانة النسبة.
 */
const FULLWIDTH = /[０-９]/g;

export function normalizeDigits(s: string): string {
  return s
    .replace(ARABIC_INDIC, (c) => String(c.charCodeAt(0) - 0x0660))
    .replace(EXT_ARABIC_INDIC, (c) => String(c.charCodeAt(0) - 0x06f0))
    .replace(FULLWIDTH, (c) => String(c.charCodeAt(0) - 0xff10));
}

const THOUSANDS_GROUPS = (body: string, sep: string) => {
  const parts = body.split(sep);
  return parts.length > 1 && /^[1-9]\d{0,2}$/.test(parts[0]) && parts.slice(1).every((p) => /^\d{3}$/.test(p));
};

/**
 * «٬» (فاصل الآلاف العربي) و«'» (السويسري) والمسافة **بين رقمين** تُحذف — لكن فقط حيث تفصل آلافاً فعلاً:
 * أول مجموعة 1–3 أرقام وكل ما بعدها 3 بالضبط، وقبل أيّ فاصلة/نقطة عشرية. كانت تُحذف بلا شرط: «0٬5» بخانة
 * المخاطرة (٬ تكاد لا تُميَّز عن ٫ العشرية على لوحة المفاتيح العربية) = **5%** بدل 0.5% ⇒ لوت أكبر عشر مرات،
 * و«2 50» = 250. الفاصلة والنقطة تمرّان أصلاً بـ`THOUSANDS_GROUPS`؛ الآن كل فواصل الآلاف بالقاعدة نفسها.
 * «1 234,5»، «١٬٠٠٠»، «1'234.50»، «10 000» تبقى؛ مسافة قبل «%» أو بعد الرقم لا تُفحص (ليست بين رقمين).
 *
 * «’» (U+2019) = «'» نفسها: iOS يحوّل الفاصلة العليا تلقائياً (Smart Punctuation مفعّلة افتراضياً)، وهي فاصل الآلاف السويسري
 * بـCLDR ⇒ «1’000» كانت «رقم غير مفهوم» بينما «1'000» مقبولة. و«،» (الفاصلة العربية U+060C) تُعامَل كـ«,» بقواعدها كاملة:
 * «1،5» = 1.5، و«10،000» مبهمة مرفوضة كـ«10,000».
 *
 * مجموعة آلاف أولى **لا تبدأ بصفر** (هنا وبـ`THOUSANDS_GROUPS`): «0٬500» كانت 500 — المتداول قصد «0٫500» (نصف) فخرجت
 * مخاطرة «USD 0٬500» = 500$ = 5% بدل 0.5$، وسعر «0٬850» لـEURGBP = 850. و«0.500.000» = 500,000. لا رقم آلاف يبدأ بصفر.
 */
function groupsBetweenDigitsOk(s: string): boolean {
  const marked = s.replace(/(\d)[\s   ٬'’]+(?=\d)/g, '$1\u0000');
  if (!marked.includes('\u0000')) return true;
  const parts = marked.split('\u0000');
  if (!/^[^\d.,]*[1-9]\d{0,2}$/.test(parts[0])) return false;
  return parts.slice(1).every((p, i, rest) => (i === rest.length - 1 ? /^\d{3}(?!\d)/.test(p) : /^\d{3}$/.test(p)));
}

/**
 * كلمة **الوحدة** بآخر الخانة: «25 pips» (من رسالة توصية «SL 25 pips»)، «0.10 lot» (من تأكيد الصفقة «Buy 0.10 lots EURUSD»)
 * كانت «رقم غير مفهوم» بخانة لا تحتمل وحدة غيرها. **كلمة الخانة نفسها فقط**: «pip/pips/بيب/پیپ» لخانات النقاط، «lot/lots/لوت/لۆت»
 * لخانة الحجم. «points»/«pts»/«نقطة»/«نقاط» تبقى مرفوضة عمداً: «النقطة» بمنصّة MT4/MT5 (وترجمتها العربية «نقاط») = **عُشر pip**
 * ⇒ «250 points» = 25 pip، وقراءتها 250 pip = لوت أصغر بعشر مرّات. وحدةٌ واحدة بالآخر فقط؛ «pips» وحدها = فارغة.
 */
const UNIT_WORDS: Record<'pip' | 'lot', RegExp> = {
  pip: /^(.+?)\s*(?:pips?|بيبس|بيبات|بيب|پیپ)\.?$/i,
  lot: /^(.+?)\s*(?:lots?|لوتات|لوت|لۆت)\.?$/i,
};

export function stripUnitWord(raw: string, unit: 'pip' | 'lot'): string {
  const m = UNIT_WORDS[unit].exec(raw.trim());
  return m ? m[1] : raw;
}

/**
 * @param opts.unit كلمة وحدة الخانة مقبولة بآخرها (`stripUnitWord`) — «25 pips»، «0.1 lot».
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
  opts: { signed?: boolean; amount?: boolean; percent?: boolean; unit?: 'pip' | 'lot' } = {}
): number | null {
  if (opts.unit) raw = stripUnitWord(raw.replace(/[\u200e\u200f\u061c\u202a-\u202e\u2066-\u2069]/g, ''), opts.unit);
  // علامات الاتجاه الخفية (LRM/RLM/ALM وعزل bidi) تأتي مع النسخ من محادثة/منصّة عربية: «‏1.0850» كانت «رقم غير مفهوم» بلا سبب يُرى
  const digits = normalizeDigits(raw.replace(/[\u200e\u200f\u061c\u202a-\u202e\u2066-\u2069]/g, '')).trim();
  if (!groupsBetweenDigitsOk(digits)) return null;
  let s = digits
    .replace(/[\s   ٬'’]/g, '')
    .replace(/[٫．]/g, '.')
    .replace(/[，،]/g, ',');
  if (opts.percent) {
    const signs = s.match(/[%٪％]/g)?.length ?? 0;
    if (signs === 1 && /^[%٪％]|[%٪％]$/.test(s)) s = s.replace(/[%٪％]/, '');
  }
  let neg = false;
  // «+» واحدة بالمقدّمة لا تغيّر رقماً موجباً: «+25» (نقاط من رسالة توصية) و«+1.0850» كانت «رقم غير مفهوم»
  if (/^[+＋]/.test(s)) s = s.slice(1);
  else if (opts.signed && /^[-−－]/.test(s)) {
    neg = true;
    s = s.slice(1);
  }
  if (!s) return null;
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma !== -1 && lastDot !== -1) {
    const decSep = lastComma > lastDot ? ',' : '.';
    // «٫» عشرية صريحة لا فاصل آلاف: «1٫000,5» كانت 1000.5 والمتداول قد قصد 1.0005 ⇒ مبهم، يُرفض
    if (decSep === ',' && digits.includes('٫')) return null;
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
  // «-0» صفرٌ لا «-0» (`Object.is`/`toFixed` بلا إشارة، لكن `String(-0)` = «0» و`1/n` = -∞)
  return neg ? -n || 0 : n;
}

/**
 * «0٬5» مرفوض لأن «٬» (فاصل الآلاف العربي) بغير موضع آلاف — والحرفان «٬» و«٫» متجاوران ومتشابهان على لوحة
 * المفاتيح العربية، فالأرجح أن المتداول قصد الكسر. true حين: فيه «٬»، و`parseDecimal` يرفضه، واستبدال «٬» بـ«٫»
 * يجعله مقروءاً — عندها تقول الرسالة (`arabicThousandsSignHint`) أيّ الحرفين يُكتب، بدل «اكتبه بلا فواصل آلاف».
 * لا يقرأ الرقم ولا يخمّنه: القيمة تبقى مرفوضة حتى يصحّحها المتداول.
 */
export function misplacedArabicThousandsSign(
  raw: string,
  opts: { signed?: boolean; amount?: boolean; percent?: boolean; unit?: 'pip' | 'lot' } = {}
): boolean {
  if (!raw.includes('٬') || parseDecimal(raw, opts) != null) return false;
  return parseDecimal(raw.replace(/٬/g, '٫'), opts) != null;
}
