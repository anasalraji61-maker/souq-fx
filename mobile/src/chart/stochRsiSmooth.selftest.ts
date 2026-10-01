/**
 * Self-test: StochRSI كـTradingView (3,3,14,14) — K = sma(الخام، 3) وD = sma(K، 3).
 * Run: npx --yes tsx src/chart/stochRsiSmooth.selftest.ts
 */
import assert from 'node:assert/strict';
import { computeStochRsi } from './indicators/momentum';

// سعر متذبذب بذرة ثابتة
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const closes: number[] = [];
let p = 1.1;
for (let i = 0; i < 200; i++) closes.push((p += (rnd() - 0.5) * 0.002));

const raw = computeStochRsi(closes, 14, 14, 1, 1).k;
const { k, d } = computeStochRsi(closes);
assert.equal(k.length, closes.length);
assert.equal(d.length, closes.length);
// الخام يبدأ عند 27، K عند 29، D عند 31
assert.equal(raw[26], null);
assert.notEqual(raw[27], null);
assert.equal(k[28], null);
assert.notEqual(k[29], null);
assert.equal(d[30], null);
assert.notEqual(d[31], null);
for (let i = 31; i < closes.length; i++) {
  const kWant = (raw[i]! + raw[i - 1]! + raw[i - 2]!) / 3;
  assert.ok(Math.abs(k[i]! - kWant) < 1e-9, `k[${i}]`);
  const dWant = (k[i]! + k[i - 1]! + k[i - 2]!) / 3;
  assert.ok(Math.abs(d[i]! - dWant) < 1e-9, `d[${i}]`);
  assert.ok(k[i]! > -1e-9 && k[i]! < 100 + 1e-9, `k[${i}] in range`);
}

console.log('stochRsiSmooth selftest PASS');
