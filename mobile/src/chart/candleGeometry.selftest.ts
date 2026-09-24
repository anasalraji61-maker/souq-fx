/**
 * Self-test for candleBodyWidth (pure).
 * Run: npx --yes tsx src/chart/candleGeometry.selftest.ts
 */
import assert from 'node:assert/strict';
import { candleBodyWidth } from './candleGeometry';

// تصغير شديد: لا يقلّ عن 2px ولا يتجاوز العمود
assert.equal(candleBodyWidth(2), 2);
assert.equal(candleBodyWidth(1), 2);
assert.equal(candleBodyWidth(NaN), 2);
// 80 شمعة على 320px ⇒ خطوة 4، عمود 3: الجسم 3 بدل 2
assert.equal(candleBodyWidth(3), 3);
// 20 شمعة على 360px ⇒ خطوة 18، عمود 17: فجوة 4px بدل 2px
assert.equal(candleBodyWidth(17), 14);
// أقصى عمود (48): فجوة ~11px بدل 2px
assert.equal(candleBodyWidth(48), 38);
// لا يتجاوز العمود أبداً
for (let w = 2; w <= 48; w += 0.5) assert.ok(candleBodyWidth(w) <= Math.max(2, w));

console.log('candleGeometry.selftest: PASS');
