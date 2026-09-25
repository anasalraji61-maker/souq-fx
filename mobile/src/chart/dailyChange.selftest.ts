/**
 * Self-test for dailyChange (pure).
 * Run: npx --yes tsx src/chart/dailyChange.selftest.ts
 */
import assert from 'node:assert/strict';
import {
  dailyChange,
  formatPct,
  freshTickRefPrice,
  isVerifiedTickKind,
  pctDirection,
  prevSessionFromDaily,
  sessionKeyAt,
  tickDirection,
  validSessionBar,
  weekendMergeOf,
} from './dailyChange';

// إغلاق الجلسة السابقة كما يقرؤه المستهلكون (`dailyRefStore`، الشارت): `prevSessionFromDaily` ثم الإغلاق.
const prevClose = (candles: { time: number; close: number }[], nowSec?: number, symbol?: string | null) =>
  prevSessionFromDaily(candles, nowSec, symbol)?.close ?? null;

// أيام UTC حقيقية (ثوانٍ): 2026-09-14 إثنين … 2026-09-20 أحد، 2026-09-21 إثنين
const D = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 1000;
const H = 3600;
const wed = { time: D('2026-09-16'), close: 1.08 };
const thu = { time: D('2026-09-17'), close: 1.09 };
const fri = { time: D('2026-09-18'), close: 1.1 };
const sun = { time: D('2026-09-20'), close: 1.105 };
const mon = { time: D('2026-09-21'), close: 1.12 };

// إغلاق الأمس = الجلسة السابقة، حتى لو وصلت الشموع غير مرتّبة
assert.equal(prevClose([wed, thu, fri]), 1.09);
assert.equal(prevClose([fri, wed, thu]), 1.09);
assert.equal(prevClose([wed]), null);
assert.equal(prevClose([]), null);
// شمعة سابقة فاسدة: الجلسة تُختار، و`validSessionBar` (بوابة المستهلكين) ترفضها
const bar = (close: number) => ({ time: thu.time, open: 1.085, high: 1.095, low: 1.08, close, volume: 0 });
assert.equal(prevSessionFromDaily([bar(0), fri])?.time, thu.time);
assert.equal(validSessionBar(bar(0)), null);
assert.equal(validSessionBar(bar(NaN)), null);
assert.equal(validSessionBar({ ...bar(1.09), high: 1.07 }), null); // أعلى < أدنى
assert.equal(validSessionBar(bar(1.09))?.close, 1.09);
assert.equal(validSessionBar(null), null);
// السبت/صباح الأحد (السوق مغلق): الجمعة مقابل الخميس كما تعرضه تطبيقات التداول
assert.equal(prevClose([wed, thu, fri], D('2026-09-19') + 12 * H), 1.09);
assert.equal(prevClose([wed, thu, fri], D('2026-09-20') + 10 * H), 1.09);
// الأحد 20:30 UTC صيفاً (الافتتاح 21:00) ثم 21:30 شتاءً (الافتتاح 22:00): السوق مغلق بعد
assert.equal(prevClose([wed, thu, fri], D('2026-09-20') + 20.5 * H), 1.09);
const friW = { time: D('2026-11-13'), close: 1.1 };
const thuW = { time: D('2026-11-12'), close: 1.09 };
assert.equal(prevClose([thuW, friW], D('2026-11-15') + 21.5 * H), 1.09);
assert.equal(prevClose([thuW, friW], D('2026-11-15') + 22.5 * H), 1.1);
// مساء الأحد بعد الافتتاح وقبل ظهور شمعة الأحد: المرجع إغلاق الجمعة (كان الخميس)
assert.equal(prevClose([wed, thu, fri], D('2026-09-20') + 22 * H), 1.1);
// شمعة الأحد جزء من جلسة الإثنين: المرجع الجمعة مساء الأحد ويوم الإثنين (كان إغلاق شمعة الأحد)
assert.equal(prevClose([thu, fri, sun], D('2026-09-20') + 23 * H), 1.1);
assert.equal(prevClose([thu, fri, sun, mon], D('2026-09-21') + 9 * H), 1.1);
assert.equal(prevClose([thu, fri, mon]), 1.1);
// الثلاثاء قبل ظهور شمعته (مزوّد متأخر): المرجع إغلاق الإثنين المكتمل
assert.equal(prevClose([fri, sun, mon], D('2026-09-22') + 3 * H), 1.12);
// افتتاح CME المتأخر (الأحد 18:00 نيويورك = 22:00Z صيفاً، 23:00Z شتاءً) حين يُمرَّر الرمز
{
  const sun2130 = D('2026-09-20') + 21.5 * H; // الفوركس فُتح 21:00Z، الذهب/US30/WTI لا
  assert.equal(prevClose([wed, thu, fri], sun2130), 1.1); // بلا رمز: كما كان
  assert.equal(prevClose([wed, thu, fri], sun2130, 'EURUSD'), 1.1);
  for (const s of ['XAUUSD', 'xagusd', 'US30', 'NAS100', 'USOIL', 'GOLD']) {
    assert.equal(prevClose([wed, thu, fri], sun2130, s), 1.09, s); // حركة الجمعة لا «0.00%»
    assert.equal(sessionKeyAt(sun2130, true, s), sessionKeyAt(D('2026-09-19') + 12 * H, true), s);
  }
  // بعد الافتتاح 22:00Z: جلسة الإثنين كالفوركس
  assert.equal(prevClose([wed, thu, fri], D('2026-09-20') + 22.5 * H, 'XAUUSD'), 1.1);
  assert.equal(sessionKeyAt(D('2026-09-20') + 22.5 * H, true, 'XAUUSD'), sessionKeyAt(D('2026-09-20') + 22.5 * H, true));
  // شتاءً: 22:30Z مغلق للذهب (يفتح 23:00Z)، مفتوح للفوركس
  assert.equal(prevClose([thuW, friW], D('2026-11-15') + 22.5 * H, 'XAUUSD'), 1.09);
  assert.equal(prevClose([thuW, friW], D('2026-11-15') + 22.5 * H, 'EURUSD'), 1.1);
  assert.equal(prevClose([thuW, friW], D('2026-11-15') + 23.5 * H, 'XAUUSD'), 1.1);
  // كسر CME اليومي أيام الأسبوع لا يغيّر الجلسة (الأربعاء 21:30Z)
  assert.equal(prevClose([wed, thu, fri, sun, mon, { time: D('2026-09-23'), close: 1.13 }], D('2026-09-23') + 21.5 * H, 'XAUUSD'), 1.12);
}
// افتتاح ICE المتأخر: مؤشر الدولار 20:00 نيويورك (00:00Z الإثنين صيفاً، 01:00Z شتاءً)، برنت 23:00 لندن (22:00Z/23:00Z)
{
  const monW = { time: D('2026-11-16'), close: 1.11 };
  // DXY صيفاً: مغلق الأحد 21:00–24:00Z ⇒ حركة الجمعة (كان «0.00%»)
  for (const h of [21.5, 23.9]) {
    assert.equal(prevClose([wed, thu, fri], D('2026-09-20') + h * H, 'DXY'), 1.09, `DXY ${h}`);
    assert.equal(prevClose([wed, thu, fri], D('2026-09-20') + h * H, 'USDX.m'), 1.09, `USDX ${h}`);
  }
  assert.equal(prevClose([wed, thu, fri], D('2026-09-21') + 0.5 * H, 'DXY'), 1.1);
  // DXY شتاءً: فجر الإثنين 00:30Z ما زال مغلقاً ⇒ الجمعة؛ 01:30Z مفتوح ⇒ الجلسة الجديدة
  assert.equal(prevClose([thuW, friW], D('2026-11-16') + 0.5 * H, 'DXY'), 1.09);
  assert.equal(prevClose([thuW, friW], D('2026-11-16') + 1.5 * H, 'DXY'), 1.1);
  assert.equal(sessionKeyAt(D('2026-11-16') + 0.5 * H, true, 'DXY'), sessionKeyAt(D('2026-11-13') + 12 * H, true));
  // والفوركس فجر الإثنين نفسه: الإثنين كما كان
  assert.equal(prevClose([thuW, friW], D('2026-11-16') + 0.5 * H, 'EURUSD'), 1.1);
  // شمعة الإثنين ظهرت والسوق مفتوح: المرجع الجمعة كالعادة
  assert.equal(prevClose([thuW, friW, monW], D('2026-11-16') + 12 * H, 'DXY'), 1.1);
  // UKOIL صيفاً: مغلق حتى 22:00Z
  assert.equal(prevClose([wed, thu, fri], D('2026-09-20') + 21.5 * H, 'UKOIL'), 1.09);
  assert.equal(prevClose([wed, thu, fri], D('2026-09-20') + 22.5 * H, 'UKOIL'), 1.1);
  // UKOIL شتاءً: حتى 23:00Z
  assert.equal(prevClose([thuW, friW], D('2026-11-15') + 22.5 * H, 'BRENT'), 1.09);
  assert.equal(prevClose([thuW, friW], D('2026-11-15') + 23.5 * H, 'BRENT'), 1.1);
  // كسر ICE اليومي أيام الأسبوع لا يغيّر الجلسة (DXY الأربعاء 21:30Z، برنت الثلاثاء 22:30Z)
  const tue = { time: D('2026-09-22'), close: 1.125 };
  assert.equal(prevClose([wed, thu, fri, sun, mon, tue, { time: D('2026-09-23'), close: 1.13 }], D('2026-09-23') + 21.5 * H, 'DXY'), 1.125);
  assert.equal(prevClose([fri, sun, mon, tue], D('2026-09-22') + 22.5 * H, 'UKOIL'), 1.12);
}
// أداة تتداول بالعطلة (شمعة سبت بالسلسلة): أيام UTC عادية — الأحد مقابل السبت
const sat = { time: D('2026-09-19'), close: 64000 };
assert.equal(
  prevClose([{ time: D('2026-09-18'), close: 63000 }, sat, { time: D('2026-09-20'), close: 65000 }], D('2026-09-20') + 12 * H),
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
// الذهب/المؤشرات/النفط (CME) تفتح الأحد 18:00 NY (22:00Z صيفاً) لا 17:00: 21:30Z ما زالت جلسة الجمعة
// ومرجعها الخميس ⇒ حركة الجمعة لا «0.00%». العملات عند 21:30Z في جلسة الإثنين (مرجعها الجمعة).
const sun2130 = D('2026-09-20') + 21.5 * H;
assert.equal(sessionKeyAt(sun2130, true, 'XAUUSD'), sessionKeyAt(D('2026-09-18') + 12 * H, true));
assert.equal(sessionKeyAt(sun2130, true, 'US30'), sessionKeyAt(D('2026-09-18') + 12 * H, true));
assert.equal(sessionKeyAt(sun2130, true, 'EURUSD'), sessionKeyAt(D('2026-09-21') + 12 * H, true));
assert.equal(sessionKeyAt(D('2026-09-20') + 22.5 * H, true, 'XAUUSD'), sessionKeyAt(D('2026-09-21') + 12 * H, true));
assert.equal(prevClose([wed, thu, fri], sun2130, 'XAUUSD'), 1.09);
assert.equal(prevClose([wed, thu, fri], sun2130, 'EURUSD'), 1.1);
assert.equal(prevClose([wed, thu, fri], sun2130), 1.1);
assert.equal(weekendMergeOf([wed, thu]), true);
assert.equal(weekendMergeOf([wed, { time: D('2026-09-19'), close: 1 }]), false);

console.log('dailyChange selftest OK');

// freshTickRefPrice: مرجع اتجاه التنبيه من الشارت — لا تيك متجمّد ولا تجريبي ولا ≤0
{
  const now = 1_790_000_000;
  const T = (price: number, kind: string, age: number | null) => ({
    price,
    source: { kind, as_of: age == null ? null : now - age },
  });
  assert.equal(freshTickRefPrice(T(1.085, 'provider', 2), now), 1.085);
  assert.equal(freshTickRefPrice(T(1.085, 'cache', 0), now), 1.085);
  assert.equal(freshTickRefPrice(T(1.085, 'provider', 14.9), now), 1.085);
  // متجمّد: خارج نافذة «حيّ» (15ث) — دقائق خلف الخلفية
  assert.equal(freshTickRefPrice(T(1.085, 'provider', 15), now), null);
  assert.equal(freshTickRefPrice(T(1.085, 'provider', 600), now), null);
  // بلا وقت / وقت بالمستقبل البعيد
  assert.equal(freshTickRefPrice(T(1.085, 'provider', null), now), null);
  assert.equal(freshTickRefPrice(T(1.085, 'provider', -3600), now), null);
  // البثّ التجريبي ليس سعراً — حتى لو حديثاً
  assert.equal(freshTickRefPrice(T(1.085, 'demo', 1), now), null);
  // ui4: `unknown` (خادمٌ أقدم بلا مصدر) و`unavailable` — لا يُعرف أنه سعر مزوّد، حتى لو حديثاً
  assert.equal(freshTickRefPrice(T(1.085, 'unknown', 1), now), null);
  assert.equal(freshTickRefPrice(T(1.085, 'unavailable', 1), now), null);
  assert.equal(freshTickRefPrice(T(1.085, 'Provider', 1), now), null);
  // سعر فاسد
  assert.equal(freshTickRefPrice(T(0, 'provider', 1), now), null);
  assert.equal(freshTickRefPrice(T(-1, 'provider', 1), now), null);
  assert.equal(freshTickRefPrice(T(NaN, 'provider', 1), now), null);
  assert.equal(freshTickRefPrice(null, now), null);
  assert.equal(freshTickRefPrice(undefined, now), null);
}
console.log('dailyChange freshTickRefPrice selftest OK');

// 25 ديسمبر و1 يناير (بلا شمعة يومية): مرجع «الأمس» يوم التداول الذي قبل آخر شمعة لا آخر شمعة (كان «0.00%» طوال اليوم)
{
  const c = (iso: string, close: number) => ({ time: D(iso), close });
  // 2025-12-25 خميس: الشموع حتى الأربعاء 24 ⇒ التغيّر = 24 مقابل 23
  const xmas25 = [c('2025-12-22', 1.17), c('2025-12-23', 1.179), c('2025-12-24', 1.18)];
  for (const sym of ['EURUSD', 'XAUUSD', 'DXY', null]) {
    assert.equal(prevClose(xmas25, D('2025-12-25') + 12 * H, sym), 1.179, `xmas noon ${sym}`);
    assert.equal(prevClose(xmas25, D('2025-12-25') + 1 * H, sym), 1.179, `xmas 01Z ${sym}`);
  }
  // ليلة 24 بعد إغلاق 17:00 نيويورك (22Z شتاءً): ما زالت جلسة 24 كما كانت
  assert.equal(prevClose(xmas25, D('2025-12-24') + 23 * H, 'EURUSD'), 1.179);
  // بعد إعادة الافتتاح 17:00 نيويورك يوم 25 (22:00Z): جلسة جديدة مرجعها إغلاق 24 — بلا تغيير
  assert.equal(prevClose(xmas25, D('2025-12-25') + 22 * H + 60, 'EURUSD'), 1.18);
  // 1 يناير 2026 خميس كذلك
  const ny26 = [c('2025-12-30', 1.17), c('2025-12-31', 1.175)];
  assert.equal(prevClose(ny26, D('2026-01-01') + 15 * H, 'GBPUSD'), 1.17);
  assert.equal(prevClose(ny26, D('2026-01-01') + 22 * H + 60, 'GBPUSD'), 1.175);
  // 2026-12-25 جمعة: الجمعة والسبت والأحد قبل الافتتاح على الخميس 24 (مقابل 23)
  const xmas26 = [c('2026-12-22', 1.1), c('2026-12-23', 1.11), c('2026-12-24', 1.12)];
  assert.equal(prevClose(xmas26, D('2026-12-25') + 10 * H, 'EURUSD'), 1.11);
  assert.equal(prevClose(xmas26, D('2026-12-26') + 10 * H, 'EURUSD'), 1.11);
  assert.equal(prevClose(xmas26, D('2026-12-27') + 10 * H, 'EURUSD'), 1.11);
  // افتتاح الأحد 27 (22:00Z): جلسة الإثنين، مرجعها إغلاق الخميس 24
  assert.equal(prevClose(xmas26, D('2026-12-27') + 22 * H + 60, 'EURUSD'), 1.12);
  // 2029-01-01 إثنين: مساء الأحد 31 (بعد 22Z) والإثنين نفسه على الجمعة 29 (مقابل الخميس 28)
  const ny29 = [c('2028-12-27', 1.2), c('2028-12-28', 1.21), c('2028-12-29', 1.22)];
  assert.equal(prevClose(ny29, D('2028-12-31') + 23 * H, 'EURUSD'), 1.21);
  assert.equal(prevClose(ny29, D('2029-01-01') + 12 * H, 'EURUSD'), 1.21);
  // إعادة الافتتاح 17:00 نيويورك يوم 1 يناير: مرجعها إغلاق الجمعة 29
  assert.equal(prevClose(ny29, D('2029-01-01') + 22 * H + 60, 'EURUSD'), 1.22);
  // شمعة عطلة رقيقة من المزوّد (25 موجودة): المرجع إغلاق 24 كما كان
  assert.equal(prevClose([...xmas25, c('2025-12-25', 1.181)], D('2025-12-25') + 12 * H, 'EURUSD'), 1.18);
  // كريبتو (شمعة سبت بالسلسلة ⇒ بلا دمج): يوم 25 يوم تداول عادي
  const btc = [c('2025-12-20', 90000), c('2025-12-23', 91000), c('2025-12-24', 92000)];
  assert.equal(prevClose(btc, D('2025-12-25') + 12 * H, 'BTCUSD'), 92000);
  // يوم عادي بلا عطلة: بلا تغيير
  assert.equal(prevClose([wed, thu], thu.time + 12 * H, 'EURUSD'), 1.08);
  assert.equal(sessionKeyAt(D('2025-12-25') + 12 * H, true, 'EURUSD'), D('2025-12-24') / 86400);
}
console.log('dailyChange holiday sessions selftest OK');

// isVerifiedTickKind (ui4): provider/cache فقط سعرٌ حيّ يُلوَّن وتُحسب نسبته
{
  assert.equal(isVerifiedTickKind('provider'), true);
  assert.equal(isVerifiedTickKind('cache'), true);
  for (const k of ['demo', 'unknown', 'unavailable', '', 'twelvedata_ws', null, undefined]) {
    assert.equal(isVerifiedTickKind(k), false, String(k));
  }
  console.log('isVerifiedTickKind selftest OK');
}
