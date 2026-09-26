/**
 * حالة سوق الفوركس/المعادن/النفط: تداول شبه متواصل من افتتاح سيدني مساء
 * الأحد حتى إغلاق نيويورك مساء الجمعة، والحدّان كلاهما **17:00 بتوقيت نيويورك** —
 * تبسيط قياسي تتبعه أغلب منصات التداول لعرض حالة "مفتوح/مغلق" بلا حاجة لخلاصة بيانات
 * إضافية أو تكلفة جديدة (بند 2 من قائمة الإطلاق، docs/ROADMAP.md).
 * الكريبتو يتداول 24/7 فلا يُغلق أبداً — بأي كتابة وسيط («SOLUSD»، «BTCUSDT»، «BTCUSDm»؛ `isCryptoSymbol`).
 * كانت مطابقة حرفية لـBTCUSD/ETHUSD فتُعرض البقية «السوق مغلق» السبت وعدّادها يعدّ لإغلاق الجمعة.
 *
 * كان الحدّ 22:00 UTC ثابتاً: صحيح شتاءً فقط. من آذار حتى تشرين الثاني (التوقيت الصيفي
 * الأمريكي) الحدّ 21:00 UTC، فكانت الحالة «مفتوح» ساعةً بعد إغلاق الجمعة و«مغلق» ساعةً
 * بعد افتتاح الأحد — ومعها عدّاد إغلاق الشمعة يعدّ لسوق مغلق.
 */

import { isCryptoSymbol } from './newsRisk';

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
  if (isCryptoSymbol(sym)) return true;
  const day = now.getUTCDay();
  const sec = now.getTime() / 1000;
  const dayStart = Math.floor(sec / DAY_SEC) * DAY_SEC;
  if (day === 6) return false; // السبت: مغلق طوال اليوم
  if (day === 0 && sec < nyFivePmUtcSec(dayStart)) return false; // الأحد قبل الافتتاح
  if (day === 5 && sec >= nyFivePmUtcSec(dayStart)) return false; // الجمعة بعد الإغلاق
  if (isForexHolidaySession(sec)) return false;
  // CME (معادن، مؤشرات أمريكا، WTI): كسر يومي 17:00–18:00 نيويورك (ومنه افتتاح الأحد 18:00) — كانت «مفتوح» بلا تسعير.
  if (isLateOpenSymbol(sym) && inMetalsDailyBreak(sec)) return false;
  if (inIceDailyBreak(sym.trim(), sec)) return false;
  return true;
}

/**
 * عقود ICE (مرجع أسعار الوسطاء لهذين الرمزين): كانت «مفتوح» وقت كسرها اليومي بلا تسعير.
 * - مؤشر الدولار (DX): 20:00–17:00 نيويورك ⇒ كسر 17:00–20:00 (ومنه افتتاح الأحد 20:00).
 * - برنت (ICE Futures Europe): 01:00–23:00 لندن ⇒ كسر 23:00–01:00 (الاثنين–الخميس)؛ الأسبوع يفتح الأحد 23:00 لندن.
 * إغلاق الجمعة يبقى 17:00 نيويورك كبقية الرموز. منطقة المستقبل تتخطّى الكسر أيضاً (`nextForexOpenSec`).
 */
const DXY_RE = /^(DXY|USDX|USDINDEX)/i;
const BRENT_RE = /^(UKOIL|UKBRENT|BRENT|XBR)/i;

/**
 * التوقيت الصيفي البريطاني: من آخر أحد بآذار 01:00 UTC حتى آخر أحد بتشرين الأول 01:00 UTC.
 * النسخة الوحيدة — `sessions.ts` يستوردها (ويُعيد تصديرها) كي لا تنحرف ساعات الجلسات عن كسر برنت.
 */
export function ukDst(sec: number): boolean {
  const year = new Date(sec * 1000).getUTCFullYear();
  const lastSunday = (month: number) => {
    const firstNext = Date.UTC(year, month + 1, 1) / 1000;
    const dow = new Date(firstNext * 1000).getUTCDay();
    return firstNext - (dow === 0 ? 7 : dow) * DAY_SEC;
  };
  return sec >= lastSunday(2) + 3600 && sec < lastSunday(9) + 3600;
}

/** 23:00 لندن بيوم `dayStartSec` (منتصف ليل UTC) بالثواني UTC: 22:00 صيفاً، 23:00 شتاءً. */
function londonElevenPmUtcSec(dayStartSec: number): number {
  const at = dayStartSec + 22 * 3600;
  return at + (ukDst(at) ? 0 : 3600);
}

function inIceDailyBreak(sym: string, sec: number): boolean {
  return iceBreakEndSec(sym, sec) != null;
}

/** نهاية كسر ICE الذي يقع فيه `sec` (ثوانٍ UTC)، أو null خارج الكسر / لغير DXY وبرنت. */
function iceBreakEndSec(sym: string, sec: number): number | null {
  const dayStart = Math.floor(sec / DAY_SEC) * DAY_SEC;
  // النافذة قد تعبر منتصف ليل UTC ⇒ يُفحص يوم UTC الحالي والسابق.
  const windowEnd = (startOf: (d: number) => number, len: number, skipSunday = false): number | null => {
    for (const d of [dayStart, dayStart - DAY_SEC]) {
      if (skipSunday && new Date(d * 1000).getUTCDay() === 0) continue;
      if (sec >= startOf(d) && sec < startOf(d) + len) return startOf(d) + len;
    }
    return null;
  };
  if (DXY_RE.test(sym)) return windowEnd(nyFivePmUtcSec, 3 * 3600);
  if (BRENT_RE.test(sym)) {
    // جلسة الاثنين تبدأ الأحد 23:00 لندن: قبلها مغلق، وليلة الأحد ليست كسراً.
    if (new Date(dayStart * 1000).getUTCDay() === 0 && sec < londonElevenPmUtcSec(dayStart)) {
      return londonElevenPmUtcSec(dayStart);
    }
    return windowEnd(londonElevenPmUtcSec, 2 * 3600, true);
  }
  return null;
}

/**
 * بداية كسر ICE (DXY/برنت) الذي تُغلق الشمعة داخله أو عند نهايته، أو null. الشمعة لا تُتداول بعده، فإغلاقها
 * الفعلي بدايته — عدّاد 4H لـDXY الساعة 20:30 UTC صيفاً كان يعدّ 3:30:00 والسوق يُغلق بعد نصف ساعة.
 */
export function iceBreakStartForCloseSec(symbol: string, closeSec: number): number | null {
  const sym = symbol.toUpperCase().trim();
  const end = iceBreakEndSec(sym, closeSec - 1);
  if (end == null) return null;
  return end - (DXY_RE.test(sym) ? 3 : 2) * 3600;
}

/** داخل ساعة كسر المعادن اليومي (17:00–18:00 نيويورك)؟ */
function inMetalsDailyBreak(sec: number): boolean {
  const dayStart = Math.floor(sec / DAY_SEC) * DAY_SEC;
  const today = nyFivePmUtcSec(dayStart);
  return sec >= today && sec < today + 3600;
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
  if (isCryptoSymbol(symbol)) return null;
  const sec = nowMs / 1000;
  const dayStart = Math.floor(sec / DAY_SEC) * DAY_SEC;
  const day = new Date(dayStart * 1000).getUTCDay();
  const friday = dayStart + ((5 - day + 7) % 7) * DAY_SEC;
  const close = nyFivePmUtcSec(friday);
  return close > sec ? close : nyFivePmUtcSec(friday + 7 * DAY_SEC);
}

/**
 * الإغلاق التالي للسوق: إغلاق الجمعة، أو 17:00 نيويورك عشيّة جلسة عطلة (24 و31 ديسمبر) إن سبقته.
 * عدّاد 4H الساعة 20:00 UTC يوم 24 ديسمبر كان يعدّ أربع ساعات والسوق يُغلق بعد ساعتين حتى 26.
 */
export function forexNextCloseSec(symbol: string, nowMs: number): number | null {
  const weekClose = forexWeekCloseSec(symbol, nowMs);
  if (weekClose == null) return null;
  const sec = nowMs / 1000;
  const dayStart = Math.floor(sec / DAY_SEC) * DAY_SEC;
  const today = nyFivePmUtcSec(dayStart);
  const next = sec < today ? today : nyFivePmUtcSec(dayStart + DAY_SEC);
  return next < weekClose && isForexHolidaySession(next) ? next : weekClose;
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
  if (isCryptoSymbol(symbol)) return dayStart;
  const today = nyFivePmUtcSec(dayStart);
  return sec >= today ? today : nyFivePmUtcSec(dayStart - DAY_SEC);
}

/**
 * شمعة D عند المزوّد (Twelve Data) المختومة X 00:00 UTC تغطّي X−1 ‏17:00 ⇒ X ‏17:00 نيويورك للفوركس والمعادن
 * والنفط والمؤشرات (مُتحقَّق حيّاً بالخادم، `bar_end` بـ`twelve_data.py`)، لا X ⇒ X+1 00:00 UTC. الكريبتو يوم UTC.
 * `dailyBarCloseSec`: إغلاق شمعة مختومة `stampSec`. `dailyBarStampSec`: ختم الشمعة التي يقع فيها `sec`.
 */
export function dailyBarCloseSec(symbol: string, stampSec: number): number {
  const day = Math.floor(stampSec / DAY_SEC) * DAY_SEC;
  return isCryptoSymbol(symbol) ? day + DAY_SEC : nyFivePmUtcSec(day);
}

export function dailyBarStampSec(symbol: string, sec: number): number {
  if (isCryptoSymbol(symbol)) return Math.floor(sec / DAY_SEC) * DAY_SEC;
  return Math.floor(tradingDayStartSec(symbol, sec) / DAY_SEC) * DAY_SEC + DAY_SEC;
}

/**
 * يوم التداول الذي تُنسب إليه شمعة تبدأ عند `openSec` بطول `stepSec` — بالجزء **الأكبر** من ساعات
 * سوقها المفتوحة، لا بزمن فتحها. شمعة 4H من Twelve Data (محاذاة 00/04/…/20 UTC) تعبر حدّ 17:00
 * نيويورك: 20:00–24:00 صيفاً ثلاث ساعات منها لليوم الجديد، فكانت تُنسب للقديم ⇒ بين 21:00 و24:00
 * UTC الارتكاز وPDH/PDL وفاصل اليوم على 4H مستويات الأمس بينما 1H صحيحة. جزء بعطلة الأسبوع لا يُحسب:
 * شمعة الجمعة 20:00 (ساعة واحدة قبل الإغلاق) تبقى للجمعة، وشمعة الأحد 20:00 (افتتاح 21:00) للأحد.
 * تعادل ⇒ اليوم الجديد. `stepSec` غير صالح أو يومي فأكبر أو كريبتو ⇒ `tradingDayStartSec(openSec)`.
 */
export function barTradingDaySec(symbol: string, openSec: number, stepSec?: number): number {
  const own = tradingDayStartSec(symbol, openSec);
  if (!(stepSec != null && stepSec > 0 && stepSec < DAY_SEC) || isCryptoSymbol(symbol)) return own;
  const end = openSec + stepSec;
  const next = tradingDayStartSec(symbol, end - 1);
  if (next <= openSec) return own;
  // جلسة العطلة (25 ديسمبر، 1 يناير) مغلقة كعطلة الأسبوع: شمعة 4H 24 ديسمبر 20:00 (ساعتان لكلٍّ شتاءً) كانت
  // تُنسب بالتعادل لجلسة العطلة ⇒ «يوم» من شمعة واحدة، وPDH/PDL والارتكاز يوم 26 من تلك الشمعة وحدها.
  const closedAt = (sec: number) => inForexWeekend(sec) || isForexHolidaySession(sec);
  const before = closedAt(openSec) ? 0 : next - openSec;
  const after = closedAt(next) ? 0 : end - next;
  if (before === 0 && after === 0) return own;
  return after >= before ? next : own;
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

/**
 * جلسة CME Globex: افتتاح الأسبوع 18:00 نيويورك لا 17:00 كالعملات، وكسر يومي 17:00–18:00.
 * المعادن (ذهب/فضة/بلاتين/بلاديوم)، مؤشرات أمريكا (داو/ناسداك/S&P) ونفط WTI.
 * DAX بساعات أخرى — لا تُحسب هنا؛ برنت ومؤشر الدولار (ICE): `inIceDailyBreak`.
 */
const LATE_OPEN_RE =
  /^(XAU|XAG|XPT|XPD|GOLD|SILVER|US30|USA30|DJ30|DJI|WS30|NAS100|NAS1000|US100|USA100|NQ100|USTEC|NDX|SPX|US500|USA500|SP500|US2000|USOIL|WTI|XTI|CL[-_.]?OIL)/i;

/**
 * رمز بجلسة CME (افتتاح الأحد 18:00 نيويورك) — لمن يحسب الجلسة خارج هذا الملف (`dailyChange`).
 * أسماء الوسطاء الأخرى للمؤشرات نفسها (USA30/USA100/USA500/NQ100/US2000، وبادئة `#` أو `FX:`) كانت
 * بساعات العملات: «مفتوح» وعدّاد يجري بكسر 17:00–18:00 نيويورك، وخانة شمعة وهمية بمنطقة المستقبل.
 */
export function isLateOpenSymbol(symbol: string | null | undefined): boolean {
  return !!symbol && LATE_OPEN_RE.test(symbol.trim().replace(/^#/, '').replace(/^[A-Z0-9_]+:/i, ''));
}

/**
 * أوّل لحظة تداول عند `sec` أو بعده (يتخطّى عطلة نهاية الأسبوع وجلستَي 25/12 و1/1، ولو تتابعتا).
 * رمز CME (`LATE_OPEN_RE`): افتتاح الأحد بعد ساعة وكسر يومي ساعة. DXY/برنت: كسر ICE اليومي
 * (`iceBreakEndSec`) — كانت منطقة المستقبل ترسم خانات شموع DXY 17:00–20:00 نيويورك ولا شموع لها،
 * فيقرأ التقاطع يمين آخر شمعة وقتاً أبكر من الحقيقي بثلاث ساعات لكل ليلة.
 */
function nextForexOpenSec(sec: number, symbol = ''): number {
  const sym = symbol.trim();
  const lateOpen = isLateOpenSymbol(sym);
  let t = sec;
  for (let guard = 0; guard < 6; guard++) {
    const dayStart = Math.floor(t / DAY_SEC) * DAY_SEC;
    const iceEnd = iceBreakEndSec(sym, t);
    if (inForexWeekend(t)) {
      const dow = new Date(dayStart * 1000).getUTCDay();
      t = forexSundayOpenSec(dayStart + ((7 - dow) % 7) * DAY_SEC) + (lateOpen ? 3600 : 0);
    } else if (
      lateOpen &&
      new Date(dayStart * 1000).getUTCDay() === 0 &&
      t < forexSundayOpenSec(dayStart) + 3600
    ) {
      t = forexSundayOpenSec(dayStart) + 3600;
    } else if (lateOpen && inMetalsDailyBreak(t)) {
      // كسر CME اليومي: لا شمعة 17:00 نيويورك بالذهب/المؤشرات أيام الأسبوع
      t = nyFivePmUtcSec(dayStart) + 3600;
    } else if (iceEnd != null) {
      t = iceEnd;
    } else if (isForexHolidaySession(t)) {
      // نهاية الجلسة: 17:00 نيويورك التالية (المعادن 18:00 — `isForexMarketOpen`)
      const today = nyFivePmUtcSec(dayStart);
      t = (t < today ? today : nyFivePmUtcSec(dayStart + DAY_SEC)) + (lateOpen ? 3600 : 0);
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
 *   المعادن تفتح الأحد 18:00 نيويورك: كانت الخانة شمعة 17:00 لا وجود لها بالذهب.
 * - اليومي: السبت والأحد و25/12 و1/1 بلا شموع (شموع 00:00 UTC). الأسبوعي فما فوق والكريبتو: كما كان.
 */
export function projectBarTimeSec(symbol: string, lastSec: number, stepSec: number, ahead: number): number {
  const n = Math.max(0, Math.floor(ahead));
  if (!(stepSec > 0) || !Number.isFinite(lastSec) || n === 0) return lastSec + n * (stepSec || 0);
  if (isCryptoSymbol(symbol) || stepSec > DAY_SEC) return lastSec + n * stepSec;
  let t = lastSec;
  for (let i = 0; i < n; i++) {
    t += stepSec;
    if (stepSec === DAY_SEC) {
      while (forexDailyClosed(t)) t += DAY_SEC;
      continue;
    }
    const open = nextForexOpenSec(t, symbol);
    if (open === t) continue;
    // بداية الشمعة التي تحتوي الافتتاح على شبكة الفريم
    const bar = Math.floor(open / stepSec) * stepSec;
    t = bar > t - stepSec ? bar : open;
  }
  return t;
}

/**
 * افتتاح الأسبوع الأخير عند `sec` أو قبله، وإغلاق الجمعة الذي يليه. زمن داخل عطلة نهاية الأسبوع ⇒ الأسبوع
 * المنتهي (`close ≤ sec`). الافتتاح **بجلسة الرمز** (`nextForexOpenSec`): العملات الأحد 17:00 نيويورك،
 * CME (ذهب، مؤشرات، WTI) 18:00، DXY 20:00، برنت 23:00 لندن — كان 17:00 للكلّ فيُعدّ الذهب ساعة زائدة لكل
 * عطلة (4 شموع M15) وDXY ثلاثاً (12). `symbol` فارغ ⇒ العملات.
 */
function forexWeekAround(sec: number, symbol = ''): { open: number; close: number } {
  const dayStart = Math.floor(sec / DAY_SEC) * DAY_SEC;
  let sunday = dayStart - new Date(dayStart * 1000).getUTCDay() * DAY_SEC;
  const openOf = (sun: number) => (symbol ? nextForexOpenSec(forexSundayOpenSec(sun), symbol) : forexSundayOpenSec(sun));
  if (openOf(sunday) > sec) sunday -= 7 * DAY_SEC;
  return { open: openOf(sunday), close: nyFivePmUtcSec(sunday + 5 * DAY_SEC) };
}

/**
 * فترات التداول داخل أسبوع `wk` (تصاعدياً): الأسبوع ناقص جلستَي عطلة الفوركس (25/12، 1/1 — `isForexHolidaySession`)
 * إن وقعتا فيه. بدونها كان ترند رُسم قبل الميلاد ويُعرض على M15 بعده يبدأ يوماً كاملاً (96 شمعة) يساراً.
 * نهاية الجلسة 17:00 نيويورك (+ساعة لرموز CME كـ`nextForexOpenSec`). ويُطرح الكسر اليومي لرموز CME/ICE.
 */
function weekTradingSpans(wk: { open: number; close: number }, symbol = ''): [number, number][] {
  const late = isLateOpenSymbol(symbol.trim()) ? 3600 : 0;
  const holidays: [number, number][] = [];
  const y0 = new Date(wk.open * 1000).getUTCFullYear();
  for (const y of [y0, y0 + 1]) {
    for (const day of [Date.UTC(y - 1, 11, 25) / 1000, Date.UTC(y, 0, 1) / 1000, Date.UTC(y, 11, 25) / 1000]) {
      const hs = nyFivePmUtcSec(day - DAY_SEC);
      const he = nyFivePmUtcSec(day) + late;
      const lo = Math.max(hs, wk.open);
      const hi = Math.min(he, wk.close);
      if (hi > lo && !holidays.some(([a, b]) => a === lo && b === hi)) holidays.push([lo, hi]);
    }
  }
  // الكسر اليومي (كـ`isForexMarketOpen`): CME ساعة 17:00 نيويورك، DXY ثلاث ساعات، برنت 23:00–01:00 لندن
  // (الاثنين–الخميس). كان يُعدّ تداولاً ⇒ ترند ذهب رُسم قبل أسبوع يرسو 4 شموع M15 لكل ليلة يساراً (DXY 12).
  const sym = symbol.trim();
  const brent = BRENT_RE.test(sym);
  const breakLen = isLateOpenSymbol(sym) ? 3600 : DXY_RE.test(sym) ? 3 * 3600 : brent ? 2 * 3600 : 0;
  if (breakLen > 0) {
    for (let d = Math.floor(wk.open / DAY_SEC) * DAY_SEC; d < wk.close; d += DAY_SEC) {
      if (brent && new Date(d * 1000).getUTCDay() === 0) continue; // ليلة الأحد افتتاح لا كسر
      const lo = Math.max(brent ? londonElevenPmUtcSec(d) : nyFivePmUtcSec(d), wk.open);
      const hi = Math.min((brent ? londonElevenPmUtcSec(d) : nyFivePmUtcSec(d)) + breakLen, wk.close);
      if (hi > lo) holidays.push([lo, hi]);
    }
  }
  holidays.sort((x, z) => x[0] - z[0]);
  const spans: [number, number][] = [];
  let from = wk.open;
  for (const [lo, hi] of holidays) {
    if (lo > from) spans.push([from, lo]);
    from = Math.max(from, hi);
  }
  if (wk.close > from) spans.push([from, wk.close]);
  return spans;
}

/**
 * ثواني **التداول** بين `a` و`b` (a ≤ b): المدى ناقص عطل نهاية الأسبوع (الجمعة 17:00 → الأحد 17:00 نيويورك)
 * وجلستَي 25/12 و1/1 (`weekTradingSpans`).
 * لإرساء الرسومات قبل أوّل شمعة محمَّلة (`drawingAnchors.ts`): على M15 (180 شمعة < أسبوع) كانت عطلة 48 ساعة
 * تُعدّ 192 شمعة. الكريبتو لا يستعملها (يتداول 24/7). `symbol` ⇒ افتتاح جلسته (`forexWeekAround`).
 */
export function forexTradingSecBetween(a: number, b: number, symbol = ''): number {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b <= a) return 0;
  let t = b;
  let acc = 0;
  for (let guard = 0; guard < 5000 && t > a; guard++) {
    const wk = forexWeekAround(t, symbol);
    if (t > wk.close) t = wk.close; // داخل العطلة ⇒ من إغلاق الجمعة
    for (const [s0, e0] of weekTradingSpans(wk, symbol)) {
      const lo = Math.max(s0, a);
      const hi = Math.min(e0, t);
      if (hi > lo) acc += hi - lo;
    }
    if (wk.open <= a) return acc;
    t = forexWeekAround(wk.open - 1, symbol).close;
  }
  return acc;
}

/** الزمن الذي يسبق `from` بـ`sec` ثانية **تداول** (يتخطّى عطل نهاية الأسبوع و25/12 و1/1) — عكس `forexTradingSecBetween`. */
export function forexTimeBeforeTrading(from: number, sec: number, symbol = ''): number {
  if (!Number.isFinite(from) || !Number.isFinite(sec)) return from;
  let t = from;
  let left = Math.max(0, sec);
  for (let guard = 0; guard < 5000; guard++) {
    const wk = forexWeekAround(t, symbol);
    if (t > wk.close) t = wk.close;
    const spans = weekTradingSpans(wk, symbol);
    for (let k = spans.length - 1; k >= 0; k--) {
      const [s0, e0] = spans[k]!;
      if (s0 >= t) continue;
      const end = Math.min(e0, t);
      if (end - s0 >= left) return end - left;
      left -= end - s0;
    }
    t = forexWeekAround(wk.open - 1, symbol).close;
  }
  return t - left;
}
