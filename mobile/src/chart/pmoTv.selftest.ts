/**
 * Self-test: PMO كنصّ TradingView (تنعيم csf بعامل 2/length من صفر، ×10 بين الطبقتين) وخطّ إشارته
 * `ema(pmo, 10)`.
 * Run: npx --yes tsx src/chart/pmoTv.selftest.ts
 */
import assert from 'node:assert/strict';
import { computePmo } from './indicators/momentum';

let seed = 5;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const closes: number[] = [];
let p = 1.1;
for (let i = 0; i < 300; i++) closes.push((p += (rnd() - 0.5) * 0.004));

// مرجع بأسلوب Pine: calc_csf(src, len) => csf := (src - nz(csf[1])) * (2/len) + nz(csf[1])
const csf = (src: number[], len: number) => {
  const out: number[] = [];
  let prev = 0;
  for (const v of src) out.push((prev = (v - prev) * (2 / len) + prev));
  return out;
};
const i100 = closes.map((c, i) => (c / (i > 0 ? closes[i - 1] : c)) * 100 - 100);
const pmol2 = csf(i100, 35);
const pmolRef = csf(pmol2.map((v) => 10 * v), 20);
// ta.ema مبذورة بـsma (اتفاقية ema() بالمستودع)
const sigRef: (number | null)[] = [];
{
  let prev: number | null = null;
  const buf: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    const v = i < 53 ? null : pmolRef[i];
    if (v == null) {
      sigRef.push(null);
      continue;
    }
    if (prev == null) {
      buf.push(v);
      if (buf.length < 10) {
        sigRef.push(null);
        continue;
      }
      prev = buf.reduce((a, b) => a + b, 0) / 10;
    } else prev = (2 / 11) * v + (9 / 11) * prev;
    sigRef.push(prev);
  }
}

const { pmo, signal } = computePmo(closes);
assert.equal(pmo[52], null);
assert.notEqual(pmo[53], null);
assert.equal(signal[61], null);
assert.notEqual(signal[62], null);
for (let i = 53; i < closes.length; i++) {
  assert.ok(Math.abs((pmo[i] as number) - pmolRef[i]) < 1e-9, `pmo ${i}`);
  if (sigRef[i] == null) assert.equal(signal[i], null, `sig ${i}`);
  else assert.ok(Math.abs((signal[i] as number) - sigRef[i]!) < 1e-9, `sig ${i}`);
}
const flat = computePmo(Array(80).fill(1.2345));
assert.equal(flat.pmo[79], 0);
assert.equal(flat.signal[79], 0);

console.log('pmoTv selftest: PASS');
