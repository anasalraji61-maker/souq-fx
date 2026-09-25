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
import { DAY_SEC, forexSundayOpenSec, isForexMarketOpen, isLateOpenSymbol } from './marketHours';
import { isFreshTick } from './dataSource';

export type Direction = 'up' | 'down' | 'flat';

export type DailyChange = {
  abs: number;
  pct: number;
  dir: Direction;
};

/** 0=الأحد … 6=السبت لرقم يوم UTC منذ 1970-01-01 (الخميس). */
const weekdayOf = (day: number) => (((day + 4) % 7) + 7) % 7;

/**
 * رقم الجلسة (يوم UTC) لطابع زمني بالثواني. `weekendMerge`: الأحد → الإثنين، والسبت → الجمعة.
 * `isNow`: لحظة حالية لا شمعة — صباح الأحد قبل الافتتاح ما زال جلسة الجمعة.
 * `lateOpen`: رمز CME (ذهب/مؤشرات/نفط) يفتح بعد العملات بساعة.
 */
function sessionOf(tSec: number, weekendMerge: boolean, isNow: boolean, lateOpen = false, symbol?: string | null): number {
  const day = Math.floor(tSec / DAY_SEC);
  if (!weekendMerge) return day;
  const wd = weekdayOf(day);
  if (wd === 6) return day - 1;
  /**
   * رموز ICE تفتح أسبوعها بعد العملات: مؤشر الدولار 20:00 نيويورك (00:00/01:00 UTC **الإثنين**)، وبرنت 23:00 لندن.
   * بالحدّ 17:00 كانت ساعات السوق المغلق (DXY حتى 3، UKOIL ساعة) جلسةً جديدة مرجعها إغلاق الجمعة ⇒ «0.00%» بدل حركة
   * الجمعة. `isForexMarketOpen` يعرف كسرها (`inIceDailyBreak`)؛ مغلقٌ مساء الأحد/فجر الإثنين ⇒ جلسة الجمعة.
   */
  if (isNow && symbol && (wd === 0 || (wd === 1 && tSec < day * DAY_SEC + 2 * 3600))) {
    if (tSec >= forexSundayOpenSec((wd === 0 ? day : day - 1) * DAY_SEC) && !isForexMarketOpen(symbol, new Date(tSec * 1000))) {
      return day - (wd === 0 ? 2 : 3);
    }
  }
  if (wd === 0) {
    // قبل افتتاح الأسبوع (17:00 نيويورك: 21:00 UTC صيفاً، 22:00 شتاءً) جلسة «اليوم» ما زالت
    // الجمعة. كان الحدّ 20:00 ثابتاً: ساعة أو ساعتان من سوق مغلق تعرض «0.00%» بدل حركة الجمعة.
    // والذهب/المؤشرات/النفط تفتح 18:00 (CME): بالحدّ 17:00 كانت ساعة السوق المغلق جلسةً جديدة مرجعها
    // إغلاق الجمعة نفسه ⇒ «0.00%» بدل حركة الجمعة.
    if (isNow && tSec < forexSundayOpenSec(day * DAY_SEC) + (lateOpen ? 3600 : 0)) return day - 2;
    return day + 1;
  }
  return day;
}

/** شمعة سبت بالسلسلة = أداة تتداول بالعطلة (عملات رقمية) ⇒ أيام UTC كما هي بلا دمج العطلة. */
export function weekendMergeOf(candles: readonly Pick<Candle, 'time'>[]): boolean {
  return !candles.some((c) => c && Number.isFinite(c.time) && weekdayOf(Math.floor(c.time / DAY_SEC)) === 6);
}

/**
 * رقم الجلسة الجارية عند `nowSec` — مخزن المرجع (`dailyRefStore`) يقارنه بما حُسب عند الجلب:
 * تغيّره (منتصف ليل UTC، افتتاح الأحد) يعني أن «إغلاق الأمس» المخزَّن صار إغلاق ما قبل الأمس.
 */
export function sessionKeyAt(nowSec: number, weekendMerge: boolean, symbol?: string | null): number {
  return sessionOf(nowSec, weekendMerge, true, isLateOpenSymbol(symbol), symbol);
}

/**
 * شمعة الجلسة السابقة من شموع D1 (بالثواني، بأي ترتيب)؛ null إن لم تكفِ البيانات.
 * `nowSec` اختياري: إن كانت الجلسة الحالية بلا شمعة بعد (مساء الأحد، أو المزوّد متأخر) فالسابقة
 * آخر شمعة — لا ما قبلها.
 */
export function prevSessionFromDaily<T extends Pick<Candle, 'time'>>(
  candles: readonly T[],
  nowSec?: number,
  symbol?: string | null
): T | null {
  if (!Array.isArray(candles) || candles.length < 2) return null;
  const sorted = candles
    .filter((c) => c && typeof c.time === 'number' && Number.isFinite(c.time))
    .sort((a, b) => a.time - b.time);
  if (sorted.length < 2) return null;
  const weekendMerge = weekendMergeOf(sorted);
  const last = sorted[sorted.length - 1];
  const lastSession = sessionOf(last.time, weekendMerge, false);
  if (typeof nowSec === 'number' && Number.isFinite(nowSec) && sessionKeyAt(nowSec, weekendMerge, symbol) > lastSession) {
    return last;
  }
  for (let i = sorted.length - 2; i >= 0; i--) {
    if (sessionOf(sorted[i].time, weekendMerge, false) < lastSession) return sorted[i];
  }
  return null;
}

/**
 * أعلى/أدنى/إغلاق/افتتاح جلسة سابقة صالحة لحساب نقاط الارتكاز؛ null لشمعة فاسدة.
 */
export function validSessionBar(c: Candle | null | undefined): Candle | null {
  if (!c) return null;
  const ok = (v: number) => typeof v === 'number' && Number.isFinite(v) && v > 0;
  if (!ok(c.open) || !ok(c.high) || !ok(c.low) || !ok(c.close) || c.high < c.low) return null;
  return c;
}

/**
 * تغيّر السعر الحالي عن المرجع. عتبة "ثابت" نسبية صغيرة (ما يُطبع «0.00%») كي لا يومض السهم أخضر/أحمر
 * على ضجيج الكسور العشرية.
 */
export function dailyChange(price: number | null | undefined, prevClose: number | null | undefined): DailyChange | null {
  if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return null;
  if (typeof prevClose !== 'number' || !Number.isFinite(prevClose) || prevClose <= 0) return null;
  const abs = price - prevClose;
  const pct = (abs / prevClose) * 100;
  // العتبة = «هل تُطبع النسبة غير صفرية» (`pctDirection`) لا مقارنة خام بـ0.005: 99.995 مقابل 100 تعطي
  // ‎−0.00499999…‎ بالفاصلة العائمة فكانت «ثابتاً» بجانب «−0.01%» المطبوعة.
  return { abs, pct, dir: pctDirection(pct) };
}

/**
 * تقريب النسبة لمنزلتين **متماثلاً حول الصفر** بعد تنظيف ضجيج الفاصلة العائمة — مصدر واحد لـ`formatPct`
 * و`pctDirection` كي يتطابق اللون والرقم بالبناء.
 *
 * `Math.round` يرفع النصف نحو +∞: هبوط ‎−0.125%‎ كان «−0.12%» وصعود ‎+0.125%‎ المماثل «+0.13%» — الهبوط
 * يُكتب أصغر من الصعود بالحجم نفسه. والأسوأ عند الحدّ: ‎−0.005%‎ كان «0.00%» (Math.round(−0.5) = −0)
 * بينما `dailyChange` يعطيه `dir: 'down'` (عتبته ≥ 0.005) فيومض السهم أحمر بجانب «0.00%». و‎1.005 × 100‎
 * بالفاصلة العائمة 100.4999… فكان «+1.00%» لنسبةٍ أرسلها الخادم 1.005 حرفياً.
 */
function round2(pct: number): number {
  const c = Math.round(Math.abs(pct) * 100 * 1e6) / 1e6;
  const r = Math.round(c) / 100;
  return pct < 0 ? -r || 0 : r;
}

/** "+0.23%" / "−0.41%" / "0.00%" — علامة ناقص طباعية واضحة، ومنزلتان دائماً. */
export function formatPct(pct: number): string {
  if (!Number.isFinite(pct)) return '—';
  const r = round2(pct);
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
  const r = round2(pct);
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

/**
 * سعر التيك الحيّ **صالحاً مرجعاً** لقرار — اتجاه تنبيهٍ من الشارت («فوق/تحت السعر الحالي») — أو `null`.
 *
 * المقبس يحتفظ بآخر تيك لكل رمز بلا حدّ عمر (`useMultiLiveTicks`)، والشاشة تُبقي تيكات ما قبل الخلفية معروضة حتى
 * أول رسالة — فتيكٌ عمره دقائق كان يقرّر الاتجاه: السوق صعد 30 pip، والتنبيه تحت السعر الحالي يُحفظ «≥» فيطلق فوراً
 * (أو «≤» فوقه فلا يطلق أبداً). يُرفض: تيك البثّ التجريبي (سعر عشوائي — كـ`seriesRefPrice` للسلسلة)، وعمرٌ خارج
 * نافذة «حيّ» (`isFreshTick`، نفس شارة الحداثة بالشاشة)، وسعر غير موجب. المستدعي يسقط بعدها لمرجعٍ آخر.
 */
export function freshTickRefPrice(
  tick: { price: number; source: { kind: string; as_of?: number | null } } | null | undefined,
  nowSec = Date.now() / 1000
): number | null {
  if (!tick || tick.source.kind === 'demo') return null;
  if (!isFreshTick(tick.source.as_of, nowSec)) return null;
  const p = tick.price;
  return typeof p === 'number' && Number.isFinite(p) && p > 0 ? p : null;
}
