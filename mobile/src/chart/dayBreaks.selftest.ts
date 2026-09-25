/**
 * Self-test for planDayBreaks / tradingDayStartSec (pure).
 * Run: npx --yes tsx src/chart/dayBreaks.selftest.ts
 */
import assert from 'node:assert/strict';
import { planDayBreaks } from './dayBreaks';
import { barTradingDaySec, tradingDayStartSec } from './marketHours';

const utc = (s: string) => Date.parse(s) / 1000;

// حدّ اليوم: 17:00 نيويورك — 21:00 UTC صيفاً، 22:00 شتاءً
assert.equal(tradingDayStartSec('EURUSD', utc('2026-09-23T21:00:00Z')), utc('2026-09-23T21:00:00Z'));
assert.equal(tradingDayStartSec('EURUSD', utc('2026-09-23T20:59:00Z')), utc('2026-09-22T21:00:00Z'));
assert.equal(tradingDayStartSec('EURUSD', utc('2026-09-24T03:00:00Z')), utc('2026-09-23T21:00:00Z'));
assert.equal(tradingDayStartSec('EURUSD', utc('2026-01-14T21:30:00Z')), utc('2026-01-13T22:00:00Z'));
assert.equal(tradingDayStartSec('EURUSD', utc('2026-01-14T22:00:00Z')), utc('2026-01-14T22:00:00Z'));
// الكريبتو: منتصف ليل UTC
assert.equal(tradingDayStartSec('btcusd', utc('2026-09-24T03:00:00Z')), utc('2026-09-24T00:00:00Z'));

// 1H صيفاً: فاصل عند شمعة 21:00 UTC
{
  const times = Array.from({ length: 30 }, (_, k) => utc('2026-09-23T10:00:00Z') + k * 3600);
  const br = planDayBreaks(times, 3600, 'EURUSD', 600);
  assert.deepEqual(br, [11]); // 10:00 + 11 س = 21:00
  // بالكريبتو: عند 00:00 UTC
  assert.deepEqual(planDayBreaks(times, 3600, 'BTCUSD', 600), [14]);
}

// عطلة الأسبوع: الجمعة 20:00 ثم الأحد 21:00 (صيفاً) ⇒ فاصل واحد
{
  const fri = [17, 18, 19, 20].map((h) => utc(`2026-09-25T${h}:00:00Z`));
  const sun = [21, 22, 23].map((h) => utc(`2026-09-27T${h}:00:00Z`));
  assert.deepEqual(planDayBreaks([...fri, ...sun], 3600, 'EURUSD', 600), [4]);
}

// لا فواصل: يومي، متقاربة جداً، مدخلات فاسدة
{
  const d = [0, 1, 2].map((k) => utc('2026-09-21T00:00:00Z') + k * 86400);
  assert.deepEqual(planDayBreaks(d, 86400, 'EURUSD', 600), []);
  const h4 = Array.from({ length: 300 }, (_, k) => utc('2026-08-01T00:00:00Z') + k * 14400);
  assert.deepEqual(planDayBreaks(h4, 14400, 'EURUSD', 320), []); // 6 شموع/يوم × ~1px
  assert.ok(planDayBreaks(h4.slice(0, 60), 14400, 'EURUSD', 320).length > 0); // 32px ⇒ تظهر
  assert.deepEqual(planDayBreaks([utc('2026-09-23T10:00:00Z')], 3600, 'EURUSD', 600), []);
  assert.deepEqual(planDayBreaks([NaN, utc('2026-09-23T22:00:00Z')], 3600, 'EURUSD', 600), []);
}

// 4H بمحاذاة UTC: الشمعة ليوم معظم ساعاتها المفتوحة
{
  const H4 = 14400;
  // صيفاً (حدّ 21:00): 20:00–24:00 ثلاث ساعات لليوم الجديد
  assert.equal(barTradingDaySec('EURUSD', utc('2026-09-23T20:00:00Z'), H4), utc('2026-09-23T21:00:00Z'));
  assert.equal(barTradingDaySec('EURUSD', utc('2026-09-23T16:00:00Z'), H4), utc('2026-09-22T21:00:00Z'));
  // بلا خطوة ⇒ زمن الفتح كما كان
  assert.equal(barTradingDaySec('EURUSD', utc('2026-09-23T20:00:00Z')), utc('2026-09-22T21:00:00Z'));
  // شتاءً (حدّ 22:00): ساعتان وساعتان ⇒ الجديد
  assert.equal(barTradingDaySec('EURUSD', utc('2026-01-14T20:00:00Z'), H4), utc('2026-01-14T22:00:00Z'));
  // 1H لا يتغيّر (الحدّ على رأس الساعة)
  assert.equal(barTradingDaySec('EURUSD', utc('2026-09-23T20:00:00Z'), 3600), utc('2026-09-22T21:00:00Z'));
  // الجمعة 20:00 (ساعة قبل الإغلاق، الباقي عطلة) ⇒ الجمعة؛ الأحد 20:00 (افتتاح 21:00) ⇒ جلسة الأحد
  assert.equal(barTradingDaySec('EURUSD', utc('2026-09-25T20:00:00Z'), H4), utc('2026-09-24T21:00:00Z'));
  assert.equal(barTradingDaySec('EURUSD', utc('2026-09-27T20:00:00Z'), H4), utc('2026-09-27T21:00:00Z'));
  // الكريبتو: منتصف ليل UTC، 4H محاذاة عليه
  assert.equal(barTradingDaySec('BTCUSD', utc('2026-09-23T20:00:00Z'), H4), utc('2026-09-23T00:00:00Z'));
  // عشية العطلة: شمعة 4H 24 ديسمبر 20:00 (ساعتان مفتوحتان وساعتان بجلسة الميلاد المغلقة) تبقى لـ24 ديسمبر
  assert.equal(barTradingDaySec('EURUSD', utc('2025-12-24T20:00:00Z'), H4), utc('2025-12-23T22:00:00Z'));
  assert.equal(barTradingDaySec('EURUSD', utc('2025-12-31T20:00:00Z'), H4), utc('2025-12-30T22:00:00Z'));
  assert.equal(barTradingDaySec('EURUSD', utc('2025-12-25T20:00:00Z'), H4), utc('2025-12-25T22:00:00Z'));
  // الفاصل صيفاً قبل شمعة 20:00 لا بعدها (كان عند 00:00)
  const h4 = Array.from({ length: 12 }, (_, k) => utc('2026-09-22T00:00:00Z') + k * H4);
  assert.deepEqual(planDayBreaks(h4, H4, 'EURUSD', 600), [5, 11]);
}

console.log('dayBreaks.selftest: PASS');
