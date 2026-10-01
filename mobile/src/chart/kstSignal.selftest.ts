/**
 * Self-test: KST بخطّ إشارته `sma(kst, 9)` كـTradingView.
 * Run: npx --yes tsx src/chart/kstSignal.selftest.ts
 */
import assert from 'node:assert/strict';
import { computeKst } from './indicators/momentum';

let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const closes: number[] = [];
let p = 1.1;
for (let i = 0; i < 200; i++) closes.push((p += (rnd() - 0.5) * 0.004));

// مرجع مستقلّ بأسلوب Pine
const roc = (l: number, i: number) => (i < l ? null : (100 * (closes[i] - closes[i - l])) / closes[i - l]);
const smaAt = (f: (i: number) => number | null, l: number, i: number) => {
  let s = 0;
  for (let k = i - l + 1; k <= i; k++) {
    const v = k < 0 ? null : f(k);
    if (v == null) return null;
    s += v;
  }
  return s / l;
};
const kstRef = (i: number) => {
  const a = smaAt((k) => roc(10, k), 10, i);
  const b = smaAt((k) => roc(15, k), 10, i);
  const c = smaAt((k) => roc(20, k), 10, i);
  const d = smaAt((k) => roc(30, k), 15, i);
  return a == null || b == null || c == null || d == null ? null : a + 2 * b + 3 * c + 4 * d;
};

const { kst, signal } = computeKst(closes);
assert.equal(kst.length, closes.length);
assert.equal(signal.length, closes.length);
// أوّل KST بالشمعة 44 (ROC30 من 30 + SMA15)، أوّل إشارة بعد 8 شموع أخرى
assert.equal(kst[43], null);
assert.notEqual(kst[44], null);
assert.equal(signal[51], null);
assert.notEqual(signal[52], null);
for (let i = 0; i < closes.length; i++) {
  const r = kstRef(i);
  if (r == null) assert.equal(kst[i], null, `kst ${i}`);
  else assert.ok(Math.abs((kst[i] as number) - r) < 1e-9, `kst ${i}`);
  const sr = smaAt(kstRef, 9, i);
  if (sr == null) assert.equal(signal[i], null, `sig ${i}`);
  else assert.ok(Math.abs((signal[i] as number) - sr) < 1e-9, `sig ${i}`);
}
// سعر ثابت ⇒ صفر للخطّين
const flat = computeKst(Array(80).fill(1.2345));
assert.equal(flat.kst[79], 0);
assert.equal(flat.signal[79], 0);

console.log('kstSignal selftest: PASS');
