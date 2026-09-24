/**
 * Self-test for parseDecimal (pure).
 * Run: npx --yes tsx src/parseDecimal.selftest.ts
 */
import assert from 'node:assert/strict';
import { parseDecimal } from './parseDecimal';

const cases: [string, number | null][] = [
  ['1.0850', 1.085],
  ['1,0850', 1.085],
  ['2350.5', 2350.5],
  ['2,350.50', 2350.5],
  ['1.085,50', 1085.5],
  ['100,000', null], // مبهم: مئة ألف أم 100.000؟ يُرفض بدل التخمين
  ['1,085', null],
  ['0,085', 0.085],
  ['1,000,000', 1000000],
  ['1.000.000', 1000000],
  ['10000', 10000],
  ['١٫٠٨٥٠', 1.085],
  ['1٫0850', 1.085],
  ['١٠٬٠٠٠', 10000],
  ['۱۵۷٫۴۲', 157.42],
  [' 157.423 ', 157.423],
  ['1.', 1],
  ['.5', 0.5],
  ['', null],
  ['abc', null],
  ['1.2.3', null],
  ['1,2,3', null],
  ['2,35,0.5', null],
  ['-5', null],
  ['1e5', null],
];
for (const [inp, want] of cases) {
  assert.equal(parseDecimal(inp), want, `parseDecimal(${JSON.stringify(inp)})`);
}
assert.equal(parseDecimal('-0.0012', { signed: true }), -0.0012);
assert.equal(parseDecimal('−٧٠', { signed: true }), -70);
assert.equal(parseDecimal('70', { signed: true }), 70);
// خانة المبلغ: «10.000» أوروبية = عشرة آلاف، لا 10 — تُرفض كنظيرتها «10,000» بدل لوتٍ أصغر ألف مرة
assert.equal(parseDecimal('10.000'), 10); // خانة سعر: القاعدة العامة لا تتغيّر
assert.equal(parseDecimal('10.000', { amount: true }), null);
assert.equal(parseDecimal('10,000', { amount: true }), null);
assert.equal(parseDecimal('1.500', { amount: true }), null);
assert.equal(parseDecimal('0.500', { amount: true }), 0.5);
assert.equal(parseDecimal('10.000,00', { amount: true }), 10000);
assert.equal(parseDecimal('10,000.50', { amount: true }), 10000.5);
assert.equal(parseDecimal('10.000.000', { amount: true }), 10000000);
assert.equal(parseDecimal('10000', { amount: true }), 10000);
assert.equal(parseDecimal('2500.5', { amount: true }), 2500.5);
assert.equal(parseDecimal('2500.50', { amount: true }), 2500.5);
assert.equal(parseDecimal('١٠٫٠٠٠', { amount: true }), null);
console.log('parseDecimal selftest OK');
