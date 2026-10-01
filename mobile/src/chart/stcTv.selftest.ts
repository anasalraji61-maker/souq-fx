/**
 * Schaff Trend Cycle كـTradingView (حالة `var … = 0.0` من الشمعة 0). Run: npx --yes tsx src/chart/stcTv.selftest.ts
 */
import assert from 'node:assert/strict';
import { computeStc } from './indicators/trend';

// سلسلة حتمية (LCG) 140 شمعة.
let seed = 12345;
const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
let p = 1.1;
const closes: number[] = [];
for (let i = 0; i < 140; i++) {
  p += (rnd() - 0.5) * 0.002 + 0.0003 * Math.sin(i / 7);
  closes.push(+p.toFixed(5));
}
const out = computeStc(closes);
// أول نافذة MACD صالحة: 49 + 10 − 1.
assert.equal(out.findIndex((v) => v != null), 58);
// قيم مرجع Pine (المرحلتان تُمهَّدان من الصفر) — كانت 0.0000 عند 67–80.
const ref: Record<number, number> = { 58: 50, 60: 87.5, 64: 90.6555, 67: 26.955, 68: 13.4775, 70: 3.3694, 72: 0.8423, 90: 50, 139: 50.8208 };
for (const [i, v] of Object.entries(ref)) assert.ok(Math.abs(out[+i]! - v) < 1e-3, `bar ${i}: ${out[+i]} ≠ ${v}`);
// سعر ثابت ⇒ أصفار بلا NaN.
const flat = computeStc(new Array(120).fill(1.1));
assert.ok(flat.slice(58).every((v) => v === 0));
console.log('stcTv selftest: PASS');
