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

export const DAY_SEC = 86400;

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
export function nyDst(sec: number): boolean {
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
  if (isForexHolidaySession(sec)) return false;
  return true;
}

/**
 * جلسة عطلة الفوركس (25 ديسمبر، 1 يناير)؟ كان «السوق مفتوح» يُعرض يومَي الميلاد ورأس السنة
 * والسيولة صفر والمنصّات مغلقة. الجلسة تُسمّى باليوم الذي تنتهي فيه (تبدأ 17:00 نيويورك من
 * اليوم السابق)، فجلسة «25 ديسمبر» من مساء 24 حتى مساء 25 — تبسيط لإغلاق أغلب الوسطاء (قد يُغلق
 * بعضهم مبكّراً في 24 و31 ديسمبر). العطل الوطنية الأخرى لا تُغلق سوق الفوركس كلّه فلا تُحسب.
 */
export function isForexHolidaySession(sec: number): boolean {
  const dayStart = Math.floor(sec / DAY_SEC) * DAY_SEC;
  const today = nyFivePmUtcSec(dayStart);
  const sessionStart = sec >= today ? today : nyFivePmUtcSec(dayStart - DAY_SEC);
  // بداية الجلسة 21:00/22:00 UTC ⇒ +6 ساعات تقع بيوم اسمها.
  const d = new Date((sessionStart + 6 * 3600) * 1000);
  const m = d.getUTCMonth();
  const dd = d.getUTCDate();
  return (m === 11 && dd === 25) || (m === 0 && dd === 1);
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

/**
 * بداية يوم التداول الذي يقع فيه `sec` (ثوانٍ UTC): آخر 17:00 نيويورك عنده أو قبله — حدّ
 * التبييت (rollover) الذي تفصل عنده المنصّات أيام الفوركس (21:00 UTC صيفاً، 22:00 شتاءً).
 * الكريبتو بلا تبييت: منتصف ليل UTC كما يفعل TradingView لها.
 */
export function tradingDayStartSec(symbol: string, sec: number): number {
  const dayStart = Math.floor(sec / DAY_SEC) * DAY_SEC;
  if (ALWAYS_OPEN.has(symbol.toUpperCase())) return dayStart;
  const today = nyFivePmUtcSec(dayStart);
  return sec >= today ? today : nyFivePmUtcSec(dayStart - DAY_SEC);
}

/** بداية شمعة الفوركس بعطلة نهاية الأسبوع (من إغلاق الجمعة حتى افتتاح الأحد)؟ العطل لا تُحسب. */
function inForexWeekend(sec: number): boolean {
  const dayStart = Math.floor(sec / DAY_SEC) * DAY_SEC;
  const day = new Date(dayStart * 1000).getUTCDay();
  if (day === 6) return true;
  if (day === 0) return sec < nyFivePmUtcSec(dayStart);
  if (day === 5) return sec >= nyFivePmUtcSec(dayStart);
  return false;
}

/** أوّل لحظة تداول عند `sec` أو بعده (يتخطّى عطلة نهاية الأسبوع وجلستَي 25/12 و1/1، ولو تتابعتا). */
function nextForexOpenSec(sec: number): number {
  let t = sec;
  for (let guard = 0; guard < 4; guard++) {
    const dayStart = Math.floor(t / DAY_SEC) * DAY_SEC;
    if (inForexWeekend(t)) {
      const dow = new Date(dayStart * 1000).getUTCDay();
      t = forexSundayOpenSec(dayStart + ((7 - dow) % 7) * DAY_SEC);
    } else if (isForexHolidaySession(t)) {
      // نهاية الجلسة: 17:00 نيويورك التالية
      const today = nyFivePmUtcSec(dayStart);
      t = t < today ? today : nyFivePmUtcSec(dayStart + DAY_SEC);
    } else return t;
  }
  return t;
}

/** يوم UTC بلا شمعة يومية فوركس: السبت/الأحد و25 ديسمبر و1 يناير. */
function forexDailyClosed(sec: number): boolean {
  const d = new Date(sec * 1000);
  const day = d.getUTCDay();
  const m = d.getUTCMonth();
  const dd = d.getUTCDate();
  return day === 6 || day === 0 || (m === 11 && dd === 25) || (m === 0 && dd === 1);
}

/**
 * زمن الشمعة رقم `ahead` بعد الشمعة `lastSec` (منطقة المستقبل بالشارت) **متخطّياً عطلة نهاية الأسبوع**
 * وعطلتَي الفوركس (25 ديسمبر، 1 يناير — `isForexHolidaySession`).
 * كان `lastSec + ahead × step`: تقاطع يمين شمعة الجمعة 16:00 على الساعة يقرأ «السبت 03:00» بينما
 * الشمعة الحقيقية التالية بتلك الخانة تُفتح مساء الأحد — والمتداول يخطّط على هذا الوسم لإصدار بيانات.
 * - دون اليوم: خطوة لا تبدأ داخل الإغلاق؛ ما يقع فيه يقفز لشمعة الافتتاح التالي (الشمعة المحتوية له).
 * - اليومي: السبت والأحد و25/12 و1/1 بلا شموع (شموع 00:00 UTC). الأسبوعي فما فوق والكريبتو: كما كان.
 */
export function projectBarTimeSec(symbol: string, lastSec: number, stepSec: number, ahead: number): number {
  const n = Math.max(0, Math.floor(ahead));
  if (!(stepSec > 0) || !Number.isFinite(lastSec) || n === 0) return lastSec + n * (stepSec || 0);
  if (ALWAYS_OPEN.has(symbol.toUpperCase()) || stepSec > DAY_SEC) return lastSec + n * stepSec;
  let t = lastSec;
  for (let i = 0; i < n; i++) {
    t += stepSec;
    if (stepSec === DAY_SEC) {
      while (forexDailyClosed(t)) t += DAY_SEC;
      continue;
    }
    const open = nextForexOpenSec(t);
    if (open === t) continue;
    // بداية الشمعة التي تحتوي الافتتاح على شبكة الفريم
    const bar = Math.floor(open / stepSec) * stepSec;
    t = bar > t - stepSec ? bar : open;
  }
  return t;
}
