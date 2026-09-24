/**
 * تغيّر اليوم لقائمة المتابعة — رياضيات صرفة بلا اعتماد على RN/الشبكة (قابلة للاختبار بـtsx).
 *
 * المرجع = إغلاق **الجلسة السابقة** (المعيار الذي يعتاده متداول التجزئة: "التغيّر منذ إغلاق أمس").
 * بعطلة نهاية الأسبوع آخر شمعة هي الجمعة المكتملة، فيصبح التغيّر = الجمعة مقابل الخميس — وهو ما
 * تعرضه تطبيقات التداول عادةً.
 *
 * الفوركس/المعادن تفتح مساء الأحد (UTC) فتظهر شمعة D1 قصيرة مؤرّخة بالأحد: كان «الشمعة قبل الأخيرة»
 * يجعل مرجع يوم الإثنين = إغلاق شمعة الأحد (ساعتان) بدل إغلاق الجمعة، ومساء الأحد قبل ظهور شمعته =
 * إغلاق الخميس (فيُحسب تحرّك الجمعة والفجوة معاً). الآن الأحد جزء من جلسة الإثنين والسبت من الجمعة؛
 * وأداة تتداول بالعطلة (شمعة سبت بالسلسلة — عملات رقمية) تبقى على أيام UTC العادية.
 */
import type { Candle } from '../api';

export type Direction = 'up' | 'down' | 'flat';

export type DailyChange = {
  abs: number;
  pct: number;
  dir: Direction;
};

const DAY_SEC = 86400;
/** افتتاح الأسبوع التقريبي للفوركس مساء الأحد (UTC) — قبله السوق مغلق وجلسة «اليوم» ما زالت الجمعة. */
const SUNDAY_OPEN_SEC = 20 * 3600;

/** 0=الأحد … 6=السبت لرقم يوم UTC منذ 1970-01-01 (الخميس). */
const weekdayOf = (day: number) => (((day + 4) % 7) + 7) % 7;

/**
 * رقم الجلسة (يوم UTC) لطابع زمني بالثواني. `weekendMerge`: الأحد → الإثنين، والسبت → الجمعة.
 * `isNow`: لحظة حالية لا شمعة — صباح الأحد قبل الافتتاح ما زال جلسة الجمعة.
 */
function sessionOf(tSec: number, weekendMerge: boolean, isNow: boolean): number {
  const day = Math.floor(tSec / DAY_SEC);
  if (!weekendMerge) return day;
  const wd = weekdayOf(day);
  if (wd === 6) return day - 1;
  if (wd === 0) {
    if (isNow && tSec - day * DAY_SEC < SUNDAY_OPEN_SEC) return day - 2;
    return day + 1;
  }
  return day;
}

/**
 * إغلاق الجلسة السابقة من شموع D1 (بالثواني، بأي ترتيب)؛ null إن لم تكفِ البيانات أو كانت فاسدة.
 * `nowSec` اختياري: إن كانت الجلسة الحالية بلا شمعة بعد (مساء الأحد، أو المزوّد متأخر) فالمرجع إغلاق
 * آخر شمعة — لا ما قبلها.
 */
export function prevCloseFromDaily(
  candles: readonly Pick<Candle, 'time' | 'close'>[],
  nowSec?: number
): number | null {
  if (!Array.isArray(candles) || candles.length < 2) return null;
  const sorted = candles
    .filter((c) => c && typeof c.time === 'number' && Number.isFinite(c.time))
    .sort((a, b) => a.time - b.time);
  if (sorted.length < 2) return null;
  const valid = (c: number | undefined) => (typeof c === 'number' && Number.isFinite(c) && c > 0 ? c : null);
  // شمعة سبت = أداة تتداول بالعطلة (عملات رقمية) → أيام UTC كما هي
  const weekendMerge = !sorted.some((c) => weekdayOf(Math.floor(c.time / DAY_SEC)) === 6);
  const last = sorted[sorted.length - 1];
  const lastSession = sessionOf(last.time, weekendMerge, false);
  if (typeof nowSec === 'number' && Number.isFinite(nowSec) && sessionOf(nowSec, weekendMerge, true) > lastSession) {
    return valid(last.close);
  }
  for (let i = sorted.length - 2; i >= 0; i--) {
    if (sessionOf(sorted[i].time, weekendMerge, false) < lastSession) return valid(sorted[i].close);
  }
  return null;
}

/**
 * تغيّر السعر الحالي عن المرجع. عتبة "ثابت" نسبية صغيرة (0.005%) كي لا يومض السهم أخضر/أحمر
 * على ضجيج الكسور العشرية.
 */
export function dailyChange(price: number | null | undefined, prevClose: number | null | undefined): DailyChange | null {
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return null;
  if (typeof prevClose !== 'number' || !Number.isFinite(prevClose) || prevClose <= 0) return null;
  const abs = price - prevClose;
  const pct = (abs / prevClose) * 100;
  const dir: Direction = Math.abs(pct) < 0.005 ? 'flat' : pct > 0 ? 'up' : 'down';
  return { abs, pct, dir };
}

/** "+0.23%" / "−0.41%" / "0.00%" — علامة ناقص طباعية واضحة، ومنزلتان دائماً. */
export function formatPct(pct: number): string {
  if (!Number.isFinite(pct)) return '—';
  const r = Math.round(pct * 100) / 100;
  if (r === 0) return '0.00%';
  return `${r > 0 ? '+' : '−'}${Math.abs(r).toFixed(2)}%`;
}

/**
 * اتجاه النسبة **كما تطبعها `formatPct`** — للّون بجانبها. اشتقاق اللون من الخام (`pct >= 0`) يُخرج
 * «+0.00%» بالأخضر لسالب الصفر (الخادم يقرّب بـ`round(chg, 2)` فيُرجع ‎-0.0‎ لهبوط دقيق، و`-0 >= 0`
 * صحيح بجافاسكربت) ولأي حركة دون 0.005%، فيناقض اللونُ الرقمَ الذي بجانبه. من حاصل التقريب نفسه
 * يتطابقان بالبناء. غير منتهٍ → 'flat' (و`formatPct` تطبع حينها «—»).
 */
export function pctDirection(pct: number | null | undefined): Direction {
  if (typeof pct !== 'number' || !Number.isFinite(pct)) return 'flat';
  const r = Math.round(pct * 100) / 100;
  return r > 0 ? 'up' : r < 0 ? 'down' : 'flat';
}

/** اتجاه آخر حركة تيك (لوميض قصير بالصف): مقارنة بالسعر السابق المختلف. */
export function tickDirection(prev: number | null | undefined, next: number | null | undefined): Direction {
  if (typeof prev !== 'number' || typeof next !== 'number' || !Number.isFinite(prev) || !Number.isFinite(next)) {
    return 'flat';
  }
  if (next > prev) return 'up';
  if (next < prev) return 'down';
  return 'flat';
}
