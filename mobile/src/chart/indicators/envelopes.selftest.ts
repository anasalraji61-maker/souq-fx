/**
 * Envelopes: الافتراضي ±0.1% حول SMA(20) — لا يسحق شموع الفوركس بالمحور الآلي.
 * Run: npx --yes tsx src/chart/indicators/envelopes.selftest.ts
 */
import assert from 'node:assert/strict';
import { computeEnvelopes } from './volatility';

const closes = Array.from({ length: 60 }, (_, i) => 1.17 + 0.0004 * Math.sin(i / 3));
const env = computeEnvelopes(closes);
assert.equal(env.mid[18], null);
for (let i = 19; i < closes.length; i++) {
  const mid = closes.slice(i - 19, i + 1).reduce((a, b) => a + b, 0) / 20;
  assert.ok(Math.abs(env.mid[i]! - mid) < 1e-12);
  assert.ok(Math.abs(env.upper[i]! - mid * 1.001) < 1e-12);
  assert.ok(Math.abs(env.lower[i]! - mid * 0.999) < 1e-12);
}
// EURUSD 1.17 ⇒ النطاق ~±11.7 نقطة، لا ±290
const halfPips = (env.upper[40]! - env.mid[40]!) / 0.0001;
assert.ok(halfPips > 10 && halfPips < 13, `half width ${halfPips} pips`);
console.log('envelopes.selftest: PASS');
