/**
 * Self-test for pivotBase (pure).
 * Run: npx --yes tsx src/chart/pivotBase.selftest.ts
 */
import assert from 'node:assert/strict';
import type { Candle } from '../api';
import { candlesThrough, currentSessionOpen, pivotInput, pivotLabelRank, pivotSessionStartIndex, prevDayFromIntraday } from './pivotBase';
import { tradingDayStartSec } from './marketHours';
import { computePivotPoints, computeWoodiePivots } from './indicators/price-transform';

const H = 3600;
const bar = (time: number, o: number, h: number, l: number, c: number): Candle => ({
  time,
  open: o,
  high: h,
  low: l,
  close: c,
  volume: 1,
});

// الأربعاء 2026-01-14 (شتاءً: 17:00 نيويورك = 22:00 UTC). جلسة الأربعاء تبدأ الثلاثاء 22:00.
const wedStart = Date.UTC(2026, 0, 13, 22) / 1000;
assert.equal(tradingDayStartSec('EURUSD', wedStart + 5 * H), wedStart);

// شموع ساعة من الثلاثاء 12:00 UTC (آخر جلسة الثلاثاء) حتى الخميس 03:00 UTC.
const hourly: Candle[] = [];
for (let t = wedStart - 10 * H, i = 0; t <= wedStart + 29 * H; t += H, i++) {
  const inWed = t >= wedStart && t < wedStart + 24 * H;
  const base = inWed ? 1.1 : 1.2;
  hourly.push(bar(t, base, base + 0.001 * (i % 5), base - 0.001 * (i % 3), base + 0.0001 * i));
}
// ترتيب عشوائي لا يغيّر شيئاً
const shuffled = [...hourly].reverse();
const p = prevDayFromIntraday(shuffled, 'EURUSD');
assert.ok(p);
const wed = hourly.filter((c) => c.time >= wedStart && c.time < wedStart + 24 * H);
assert.equal(p!.time, wedStart);
assert.equal(p!.open, wed[0].open);
assert.equal(p!.close, wed[wed.length - 1].close);
assert.equal(p!.high, Math.max(...wed.map((c) => c.high)));
assert.equal(p!.low, Math.min(...wed.map((c) => c.low)));

// أزمنة بالمللي ثانية (بعض المزوّدين)
assert.equal(prevDayFromIntraday(hourly.map((c) => ({ ...c, time: c.time * 1000 })), 'EURUSD')?.time, wedStart);

// السلسلة تبدأ بمنتصف الجلسة السابقة (5m × 180 = 15 ساعة) ⇒ لا ارتكاز مقصوص
const partial = hourly.filter((c) => c.time >= wedStart + 6 * H);
assert.equal(prevDayFromIntraday(partial, 'EURUSD'), null);
// تبدأ عند افتتاح الجلسة بالضبط ⇒ مكتملة
assert.ok(prevDayFromIntraday(hourly.filter((c) => c.time >= wedStart), 'EURUSD'));
// كل الشموع بجلسة واحدة ⇒ لا سابقة
assert.equal(prevDayFromIntraday(wed, 'EURUSD'), null);
assert.equal(prevDayFromIntraday([], 'EURUSD'), null);

// عطلة: الجمعة ثم مساء الأحد (22:00 UTC شتاءً = جلسة الإثنين) ⇒ السابقة الجمعة لا السبت
const friStart = Date.UTC(2026, 0, 15, 22) / 1000; // الخميس 22:00 ⇒ جلسة الجمعة
const wk: Candle[] = [];
for (let t = friStart - 4 * H; t < friStart + 19 * H; t += H) wk.push(bar(t, 1.3, 1.31, 1.29, 1.305));
const sunOpen = Date.UTC(2026, 0, 18, 22) / 1000;
wk.push(bar(sunOpen, 1.31, 1.32, 1.3, 1.315));
const pw = prevDayFromIntraday(wk, 'EURUSD');
assert.ok(pw);
assert.equal(pw!.time, friStart);

// الكريبتو: أيام UTC
const btc: Candle[] = [];
const d0 = Date.UTC(2026, 0, 14) / 1000;
for (let t = d0 - 2 * H; t < d0 + 26 * H; t += H) btc.push(bar(t, 100, 110, 90, 105));
assert.equal(prevDayFromIntraday(btc, 'BTCUSD')?.time, d0);

// مدخل دوالّ الارتكاز: الشمعة الأولى نافذتها كاملة
assert.equal(pivotInput(null), null);
const pv = computePivotPoints(pivotInput(bar(0, 1.1, 1.2, 1.0, 1.15))!, 1)!;
assert.ok(Math.abs(pv.pp - (1.2 + 1.0 + 1.15) / 3) < 1e-12);
assert.ok(Math.abs(pv.r1 - (2 * pv.pp - 1.0)) < 1e-12);

// أهمية الوسوم: المحور ثم الأقرب إليه؛ Camarilla R3/S3 ثم R4/S4
assert.equal(pivotLabelRank('PP'), 0);
assert.equal(pivotLabelRank('WPP'), 0);
assert.equal(pivotLabelRank('CPR-P'), 0);
assert.equal(pivotLabelRank('CPR-T'), 1);
assert.equal(pivotLabelRank('R1'), 1);
assert.equal(pivotLabelRank('FS2'), 2);
assert.equal(pivotLabelRank('WR3'), 3);
assert.equal(pivotLabelRank('DS1'), 1);
assert.equal(pivotLabelRank('CS3'), 1);
assert.equal(pivotLabelRank('PDH'), 0);
assert.equal(pivotLabelRank('PDL'), 0);
assert.equal(pivotLabelRank('PDC'), 2);
assert.equal(pivotLabelRank('CR4'), 2);
assert.equal(pivotLabelRank('CR1'), 4);
assert.equal(pivotLabelRank('??'), 5);


// بداية الجلسة الجارية داخل النافذة المرئيّة (خطوط الارتكاز تُرسم منها).
{
  // 14 يناير 2026 (شتاء): الجلسة تبدأ 22:00 UTC.
  const s0 = tradingDayStartSec('EURUSD', Date.UTC(2026, 0, 14, 12) / 1000);
  const hours = (from: number, n: number) => Array.from({ length: n }, (_, i) => from + i * H);
  const w = hours(s0 - 3 * H, 6); // 3 قبل الجلسة و3 بعدها
  assert.equal(pivotSessionStartIndex(w, w[5]!, 'EURUSD'), 3);
  // النافذة كلّها داخل الجلسة ⇒ 0
  assert.equal(pivotSessionStartIndex(hours(s0 + H, 4), s0 + 10 * H, 'EURUSD'), 0);
  // المتداول سحب للخلف: النافذة كلّها قبل الجلسة الجارية ⇒ الطول (لا خطوط)
  const back = hours(s0 - 30 * H, 5);
  assert.equal(pivotSessionStartIndex(back, s0 + 2 * H, 'EURUSD'), back.length);
  // مدخل غير صالح
  assert.equal(pivotSessionStartIndex([], s0, 'EURUSD'), -1);
  assert.equal(pivotSessionStartIndex(w, NaN, 'EURUSD'), -1);
  // NaN داخل النافذة يُتخطّى
  assert.equal(pivotSessionStartIndex([NaN, s0 + H], s0 + H, 'EURUSD'), 1);
}

// الإعادة: القطع عند شمعة من جلسة الأربعاء ⇒ السابقة جلسة الثلاثاء (الناقصة هنا ⇒ null)، لا الأربعاء.
{
  const cut = wedStart + 5 * H;
  const through = candlesThrough(hourly, cut);
  assert.equal(through.length, hourly.filter((c) => c.time <= cut).length);
  assert.equal(through[through.length - 1].time, cut);
  assert.equal(prevDayFromIntraday(through, 'EURUSD'), null);
  // القطع يوم الخميس ⇒ الأربعاء كما بلا إعادة؛ وبالمللي ثانية بالقطع نفسه.
  assert.equal(prevDayFromIntraday(candlesThrough(hourly, wedStart + 26 * H), 'EURUSD')?.time, wedStart);
  const ms = hourly.map((c) => ({ ...c, time: c.time * 1000 }));
  assert.equal(candlesThrough(ms, cut).length, through.length);
  // بلا قطع ⇒ المرجع نفسه.
  assert.equal(candlesThrough(hourly, null), hourly);
}

// Woodie: PP=(H+L+2×افتتاح الجلسة الجارية)/4 كـTradingView؛ الافتتاح مجهول ⇒ إغلاق السابقة.
{
  const prev = bar(0, 1.1, 1.2, 1.0, 1.15);
  const w = computeWoodiePivots(pivotInput(prev, 1.17)!, 1)!;
  assert.ok(Math.abs(w.pp - (1.2 + 1.0 + 2 * 1.17) / 4) < 1e-12);
  assert.ok(Math.abs(w.s1 - (2 * w.pp - 1.2)) < 1e-12);
  const w0 = computeWoodiePivots(pivotInput(prev)!, 1)!;
  assert.ok(Math.abs(w0.pp - (1.2 + 1.0 + 2 * 1.15) / 4) < 1e-12);
  // الكلاسيكي لا يتأثّر بالافتتاح.
  assert.equal(computePivotPoints(pivotInput(prev, 1.17)!, 1)!.pp, computePivotPoints(pivotInput(prev)!, 1)!.pp);
  // افتتاح الجلسة الجارية: أوّل شمعة من جلسة آخر شمعة؛ السلسلة تبدأ داخل الجلسة ⇒ null.
  const s0 = tradingDayStartSec('EURUSD', Date.UTC(2026, 0, 14, 12) / 1000);
  const hs: Candle[] = [];
  for (let t = s0 - 3 * H; t < s0 + 5 * H; t += H) hs.push(bar(t, t >= s0 ? 1.3 + (t - s0) / H / 1000 : 1.2, 1.4, 1.1, 1.25));
  assert.equal(currentSessionOpen(hs, 'EURUSD'), 1.3);
  assert.equal(currentSessionOpen(hs.filter((c) => c.time > s0), 'EURUSD'), null);
  assert.equal(currentSessionOpen(hs.filter((c) => c.time >= s0), 'EURUSD'), 1.3);
}

console.log('pivotBase.selftest: PASS');
