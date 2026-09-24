/**
 * Self-test for the flat-series price span (pure).
 * Run: npx --yes tsx src/chart/priceSpan.selftest.ts
 */
import assert from 'node:assert/strict';
import { FLAT_SPAN_RATIO, priceSpan } from './priceSpan';

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-12, `${a} ≉ ${b}`);

// مدى حقيقي كما هو
near(priceSpan(1.08, 1.09, false), 0.01);
near(priceSpan(Math.log(1.08), Math.log(1.09), true), Math.log(1.09) - Math.log(1.08));

// مسطّح: نسبة من السعر لا وحدة كاملة
near(priceSpan(1.08, 1.08, false), 1.08 * FLAT_SPAN_RATIO);
near(priceSpan(150, 150, false), 0.6);
near(priceSpan(Math.log(1.08), Math.log(1.08), true), FLAT_SPAN_RATIO);

// سعر صفر، وبلا بيانات (Infinity / −Infinity): المدى القديم 1
assert.equal(priceSpan(0, 0, false), 1);
assert.equal(priceSpan(Infinity, -Infinity, false), 1);
assert.equal(priceSpan(NaN, NaN, true), 1);

console.log('priceSpan.selftest: PASS');
