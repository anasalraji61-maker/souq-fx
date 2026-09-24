/**
 * Self-test for dailyChange (pure).
 * Run: npx --yes tsx src/chart/dailyChange.selftest.ts
 */
import assert from 'node:assert/strict';
import {
  dailyChange,
  formatPct,
  pctDirection,
  prevCloseFromDaily,
  sessionKeyAt,
  tickDirection,
  weekendMergeOf,
} from './dailyChange';

// أيام UTC حقيقية (ثوانٍ): 2026-09-14 إثنين … 2026-09-20 أحد، 2026-09-21 إثنين
const D = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 1000;
const H = 3600;
const wed = { time: D('2026-09-16'), close: 1.08 };
const thu = { time: D('2026-09-17'), close: 1.09 };
const fri = { time: D('2026-09-18'), close: 1.1 };
const sun = { time: D('2026-09-20'), close: 1.105 };
const mon = { time: D('2026-09-21'), close: 1.12 };

// إغلاق الأمس = الجلسة السابقة، حتى لو وصلت الشموع غير مرتّبة
assert.equal(prevCloseFromDaily([wed, thu, fri]), 1.09);
assert.equal(prevCloseFromDaily([fri, wed, thu]), 1.09);
assert.equal(prevCloseFromDaily([wed]), null);
assert.equal(prevCloseFromDaily([]), null);
assert.equal(prevCloseFromDaily([{ ...thu, close: 0 }, fri]), null);
assert.equal(prevCloseFromDaily([{ ...thu, close: NaN }, fri]), null);
// السبت/صباح الأحد (السوق مغلق): الجمعة مقابل الخميس كما تعرضه تطبيقات التداول
assert.equal(prevCloseFromDaily([wed, thu, fri], D('2026-09-19') + 12 * H), 1.09);
assert.equal(prevCloseFromDaily([wed, thu, fri], D('2026-09-20') + 10 * H), 1.09);
// الأحد 20:30 UTC صيفاً (الافتتاح 21:00) ثم 21:30 شتاءً (الافتتاح 22:00): السوق مغلق بعد
assert.equal(prevCloseFromDaily([wed, thu, fri], D('2026-09-20') + 20.5 * H), 1.09);
const friW = { time: D('2026-11-13'), close: 1.1 };
const thuW = { time: D('2026-11-12'), close: 1.09 };
assert.equal(prevCloseFromDaily([thuW, friW], D('2026-11-15') + 21.5 * H), 1.09);
assert.equal(prevCloseFromDaily([thuW, friW], D('2026-11-15') + 22.5 * H), 1.1);
// مساء الأحد بعد الافتتاح وقبل ظهور شمعة الأحد: المرجع إغلاق الجمعة (كان الخميس)
assert.equal(prevCloseFromDaily([wed, thu, fri], D('2026-09-20') + 22 * H), 1.1);
// شمعة الأحد جزء من جلسة الإثنين: المرجع الجمعة مساء الأحد ويوم الإثنين (كان إغلاق شمعة الأحد)
assert.equal(prevCloseFromDaily([thu, fri, sun], D('2026-09-20') + 23 * H), 1.1);
assert.equal(prevCloseFromDaily([thu, fri, sun, mon], D('2026-09-21') + 9 * H), 1.1);
assert.equal(prevCloseFromDaily([thu, fri, mon]), 1.1);
// الثلاثاء قبل ظهور شمعته (مزوّد متأخر): المرجع إغلاق الإثنين المكتمل
assert.equal(prevCloseFromDaily([fri, sun, mon], D('2026-09-22') + 3 * H), 1.12);
// أداة تتداول بالعطلة (شمعة سبت بالسلسلة): أيام UTC عادية — الأحد مقابل السبت
const sat = { time: D('2026-09-19'), close: 64000 };
assert.equal(
  prevCloseFromDaily([{ time: D('2026-09-18'), close: 63000 }, sat, { time: D('2026-09-20'), close: 65000 }], D('2026-09-20') + 12 * H),
  64000
);

// تغيّر موجب/سالب/ثابت
const up = dailyChange(1.1, 1.0)!;
assert.equal(up.dir, 'up');
assert.ok(Math.abs(up.pct - 10) < 1e-9);
assert.equal(dailyChange(0.9, 1.0)!.dir, 'down');
assert.equal(dailyChange(2348.6, 2348.6)!.dir, 'flat');
// ضجيج أقل من 0.005% = ثابت (ذهب: 0.1 على 2348 ≈ 0.0043%)
assert.equal(dailyChange(2348.7, 2348.6)!.dir, 'flat');
assert.equal(dailyChange(2349.0, 2348.6)!.dir, 'up');
// مدخلات فاسدة
assert.equal(dailyChange(null, 1), null);
assert.equal(dailyChange(1, null), null);
assert.equal(dailyChange(1, 0), null);
assert.equal(dailyChange(-1, 1), null);

// تنسيق
assert.equal(formatPct(0.2345), '+0.23%');
assert.equal(formatPct(-0.4), '\u22120.40%');
assert.equal(formatPct(-1.5), '−1.50%');
assert.equal(formatPct(0.001), '0.00%');
assert.equal(formatPct(-0.001), '0.00%');
assert.equal(formatPct(NaN), '—');

// لون النسبة يتبع الرقم المطبوع: سالب الصفر وما دون 0.005% «0.00%» بلا لون
assert.equal(pctDirection(-0), 'flat');
assert.equal(pctDirection(0.004), 'flat');
assert.equal(pctDirection(-0.004), 'flat');
assert.equal(pctDirection(0.005), 'up'); // يُطبع +0.01%
assert.equal(pctDirection(-0.006), 'down');
assert.equal(pctDirection(0.23), 'up');
assert.equal(pctDirection(-1.5), 'down');
assert.equal(pctDirection(NaN), 'flat');
assert.equal(pctDirection(null), 'flat');
assert.equal(pctDirection(undefined), 'flat');
for (const v of [-0, 0.004, -0.004, 0.005, -0.006, 0.23, -1.5, 0.0049, -0.0051]) {
  const printed = formatPct(v);
  const d = pctDirection(v);
  assert.equal(d === 'up', printed.startsWith('+'), `pctDirection(${v}) vs ${printed}`);
  assert.equal(d === 'down', printed.startsWith('−'), `pctDirection(${v}) vs ${printed}`);
}

// تقريب متماثل حول الصفر: الهبوط لا يُكتب أصغر من الصعود المماثل، والحدّ ±0.005% يطابق `dailyChange().dir`
assert.equal(formatPct(0.125), '+0.13%');
assert.equal(formatPct(-0.125), '−0.13%');
assert.equal(formatPct(-0.005), '−0.01%');
assert.equal(formatPct(0.005), '+0.01%');
assert.equal(pctDirection(-0.005), 'down');
assert.equal(formatPct(1.005), '+1.01%'); // 1.005×100 = 100.4999… بالفاصلة العائمة
assert.equal(formatPct(-1.005), '−1.01%');
assert.equal(formatPct(-0.0049), '0.00%');
assert.equal(pctDirection(-0.0049), 'flat');
for (const v of [0.005, 0.015, 0.125, 0.335, 1.005, 2.675, 10.245]) {
  assert.equal(formatPct(-v), formatPct(v).replace('+', '−'), `symmetry ${v}`);
}
// لون السهم بقائمة المتابعة (`dailyChange().dir`) يطابق النص المطبوع عند حدّ العتبة
for (const price of [99.995, 100.005, 99.9951, 100.0049]) {
  const ch = dailyChange(price, 100)!;
  const printed = formatPct(ch.pct);
  assert.equal(ch.dir === 'down', printed.startsWith('−'), `dir vs text @${price}: ${ch.dir} ${printed}`);
  assert.equal(ch.dir === 'up', printed.startsWith('+'), `dir vs text @${price}: ${ch.dir} ${printed}`);
}

// اتجاه التيك
assert.equal(tickDirection(1, 2), 'up');
assert.equal(tickDirection(2, 1), 'down');
assert.equal(tickDirection(1, 1), 'flat');
assert.equal(tickDirection(null, 1), 'flat');

// مفتاح الجلسة لمخزن المرجع: يتبدّل عند منتصف ليل UTC، والعطلة تُدمج حتى افتتاح الأحد
assert.equal(sessionKeyAt(D('2026-09-16') + 23 * H, true), sessionKeyAt(D('2026-09-16') + 1, true));
assert.notEqual(sessionKeyAt(D('2026-09-17') + 60, true), sessionKeyAt(D('2026-09-16') + 23.9 * H, true));
// الجمعة → السبت → صباح الأحد: جلسة واحدة (لا جلب بلا داعٍ)؛ مساء الأحد بعد الافتتاح = الإثنين
assert.equal(sessionKeyAt(D('2026-09-19') + 12 * H, true), sessionKeyAt(D('2026-09-18') + 12 * H, true));
assert.equal(sessionKeyAt(D('2026-09-20') + 10 * H, true), sessionKeyAt(D('2026-09-18') + 12 * H, true));
assert.equal(sessionKeyAt(D('2026-09-20') + 23 * H, true), sessionKeyAt(D('2026-09-21') + 12 * H, true));
// أداة تتداول بالعطلة: السبت جلسة مستقلة
assert.notEqual(sessionKeyAt(D('2026-09-19') + 12 * H, false), sessionKeyAt(D('2026-09-18') + 12 * H, false));
assert.equal(weekendMergeOf([wed, thu]), true);
assert.equal(weekendMergeOf([wed, { time: D('2026-09-19'), close: 1 }]), false);

console.log('dailyChange selftest OK');
