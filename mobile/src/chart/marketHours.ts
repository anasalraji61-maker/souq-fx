/**
 * حالة سوق الفوركس/المعادن/النفط: تداول شبه متواصل من افتتاح سيدني مساء
 * الأحد حتى إغلاق نيويورك مساء الجمعة، والحدّان كلاهما **17:00 بتوقيت نيويورك** —
 * تبسيط قياسي تتبعه أغلب منصات التداول لعرض حالة "مفتوح/مغلق" بلا حاجة لخلاصة بيانات
 * إضافية أو تكلفة جديدة (بند 2 من قائمة الإطلاق، docs/ROADMAP.md).
 * الكريبتو (BTCUSD/ETHUSD) يتداول 24/7 فلا يُغلق أبداً.
 *
 * كان الحدّ 22:00 UTC ثابتاً: صحيح شتاءً فقط. من آذار حتى تشرين الثاني (التوقيت الصيفي
 * الأمريكي) الحدّ 21:00 UTC، فكانت الحالة «مفتوح» ساعةً بعد إغلاق الجمعة و«مغلق» ساعةً
 * بعد افتتاح الأحد — ومعها عدّاد إغلاق الشمعة يعدّ لسوق مغلق.
 */

const ALWAYS_OPEN = new Set(['BTCUSD', 'ETHUSD']);

const DAY_SEC = 86400;

/** الأحد رقم `nth` (1…) من شهر `month` (0…11) بسنة `year` — منتصف ليله بالثواني UTC. */
function nthSundayUtcSec(year: number, month: number, nth: number): number {
  const first = Date.UTC(year, month, 1) / 1000;
  const dow = new Date(first * 1000).getUTCDay();
  return first + (((7 - dow) % 7) + (nth - 1) * 7) * DAY_SEC;
}

/**
 * التوقيت الصيفي بنيويورك عند `sec` (ثوانٍ UTC)؟ يبدأ الأحد الثاني من آذار 02:00 EST
 * (07:00 UTC) وينتهي الأحد الأول من تشرين الثاني 02:00 EDT (06:00 UTC). حساب خالص بلا
 * `Intl` (دعم المناطق الزمنية بمحرّك الهاتف غير مضمون).
 */
function nyDst(sec: number): boolean {
  const year = new Date(sec * 1000).getUTCFullYear();
  const start = nthSundayUtcSec(year, 2, 2) + 7 * 3600;
  const end = nthSundayUtcSec(year, 10, 1) + 6 * 3600;
  return sec >= start && sec < end;
}

/** ساعة UTC لـ17:00 نيويورك بيوم `dayStartSec` (منتصف ليل UTC): 21 صيفاً، 22 شتاءً. */
function nyFivePmUtcSec(dayStartSec: number): number {
  const at = dayStartSec + 21 * 3600;
  return at + (nyDst(at) ? 0 : 3600);
}

/**
 * افتتاح الأسبوع (الأحد 17:00 نيويورك) بالثواني UTC ليوم الأحد الذي يبدأ عند `sundayStartSec`
 * (منتصف ليل UTC): 21:00 صيفاً، 22:00 شتاءً.
 */
export function forexSundayOpenSec(sundayStartSec: number): number {
  return nyFivePmUtcSec(sundayStartSec);
}

/** مفتوح الآن؟ بتوقيت UTC — 0=الأحد..6=السبت (نفس اصطلاح Date#getUTCDay). */
export function isForexMarketOpen(symbol: string, now: Date = new Date()): boolean {
  const sym = symbol.toUpperCase();
  if (ALWAYS_OPEN.has(sym)) return true;
  const day = now.getUTCDay();
  const sec = now.getTime() / 1000;
  const dayStart = Math.floor(sec / DAY_SEC) * DAY_SEC;
  if (day === 6) return false; // السبت: مغلق طوال اليوم
  if (day === 0 && sec < nyFivePmUtcSec(dayStart)) return false; // الأحد قبل الافتتاح
  if (day === 5 && sec >= nyFivePmUtcSec(dayStart)) return false; // الجمعة بعد الإغلاق
  return true;
}

/**
 * إغلاق الأسبوع التالي (الجمعة 17:00 نيويورك) بالثواني UTC، أو null لأداة لا تُغلق.
 * يُسقَّف به عدّاد الشمعة: يومية الجمعة المختومة 00:00 UTC «تُغلق» نظرياً منتصف ليل
 * السبت، والسوق أغلق قبلها بساعتين أو ثلاث.
 */
export function forexWeekCloseSec(symbol: string, nowMs: number): number | null {
  if (ALWAYS_OPEN.has(symbol.toUpperCase())) return null;
  const sec = nowMs / 1000;
  const dayStart = Math.floor(sec / DAY_SEC) * DAY_SEC;
  const day = new Date(dayStart * 1000).getUTCDay();
  const friday = dayStart + ((5 - day + 7) % 7) * DAY_SEC;
  const close = nyFivePmUtcSec(friday);
  return close > sec ? close : nyFivePmUtcSec(friday + 7 * DAY_SEC);
}

export type MarketStatusLabels = { open: string; closed: string };

/** تسميات افتراضية بالعربية — توافق خلفي لأي استدعاء بلا كائن ترجمة. */
const MARKET_STATUS_LABELS_AR: MarketStatusLabels = {
  open: 'السوق مفتوح',
  closed: 'السوق مغلق',
};

export function marketStatusLabel(
  symbol: string,
  labels: MarketStatusLabels = MARKET_STATUS_LABELS_AR,
  now: Date = new Date()
): string {
  return isForexMarketOpen(symbol, now) ? labels.open : labels.closed;
}
