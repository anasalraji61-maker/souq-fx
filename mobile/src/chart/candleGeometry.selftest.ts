/**
 * Self-test for candleBodyWidth (pure).
 * Run: npx --yes tsx src/chart/candleGeometry.selftest.ts
 */
import assert from 'node:assert/strict';
import { candleBodyWidth, restBarCount } from './candleGeometry';

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

// العرض الافتراضي بعرض اللوح: هاتف 360px (لوح 292) ⇒ ~49 شمعة بخطوة ~6px، لا 80 بخطوة 3.6px
assert.equal(restBarCount(292), 49);
assert.ok(292 / restBarCount(292) >= 5.9);
// لوح الرباعي على الويب ~600px ⇒ 100
assert.equal(restBarCount(600), 100);
// شاشة كاملة: السقف 160، وأضيق لوح: الحدّ الأدنى 40
assert.equal(restBarCount(1400), 160);
assert.equal(restBarCount(120), 40);
// قبل القياس: القيمة القديمة
assert.equal(restBarCount(NaN), 80);
assert.equal(restBarCount(0), 80);

console.log('candleGeometry.selftest: PASS');
