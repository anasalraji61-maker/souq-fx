/**
 * Self-test: TRIX وDPO وCoppock كـTradingView.
 * TRIX = 10000 × change(ema³(log(close), 18))؛ DPO = close − sma(close, 21)[11]؛ Coppock na حتى 14+10−1.
 * Run: npx --yes tsx src/chart/trixDpoCoppock.selftest.ts
 */
import assert from 'node:assert/strict';
import { computeCoppock, computeDpo } from './indicators/momentum';
import { computeTrix } from './indicators/trend';

let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const closes: number[] = [];
let p = 1.1;
for (let i = 0; i < 300; i++) closes.push((p *= 1 + (rnd() - 0.5) * 0.004));

// مرجع مستقلّ بأسلوب Pine: ema مبذور بـsma، na يمرّ
const pineEma = (src: (number | null)[], n: number) => {
  const out: (number | null)[] = [];
  let prev: number | null = null;
  const win: number[] = [];
  for (const v of src) {
    if (v == null) { out.push(null); continue; }
    if (prev == null) {
      win.push(v);
      if (win.length < n) { out.push(null); continue; }
      prev = win.reduce((a, b) => a + b, 0) / n;
    } else prev = v * (2 / (n + 1)) + prev * (1 - 2 / (n + 1));
    out.push(prev);
  }
  return out;
};
const e3 = pineEma(pineEma(pineEma(closes.map(Math.log), 18), 18), 18);
const trix = computeTrix(closes);
let checked = 0;
for (let i = 1; i < closes.length; i++) {
  if (e3[i] == null || e3[i - 1] == null) { assert.equal(trix[i], null, `trix[${i}] warm-up`); continue; }
  assert.ok(Math.abs(trix[i]! - (e3[i]! - e3[i - 1]!) * 10000) < 1e-9, `trix[${i}]`);
  checked++;
}
assert.ok(checked > 200);
// القياس: تغيّر 0.1% للشمعة ⇒ TRIX ≈ 10 (كان ≈ 0.1)
const ramp = Array.from({ length: 120 }, (_, i) => 1.1 * Math.pow(1.001, i));
assert.ok(Math.abs(computeTrix(ramp)[119]! - 10000 * Math.log(1.001)) < 1e-6);

// DPO
const sma21 = (i: number) => closes.slice(i - 20, i + 1).reduce((a, b) => a + b, 0) / 21;
const dpo = computeDpo(closes);
assert.equal(dpo[30], null);
assert.notEqual(dpo[31], null);
for (let i = 31; i < closes.length; i++) assert.ok(Math.abs(dpo[i]! - (closes[i] - sma21(i - 11))) < 1e-12, `dpo[${i}]`);

// Coppock: أول قيمة عند 23، والقيم = wma10(roc14 + roc11)
const cop = computeCoppock(closes);
for (let i = 0; i < 23; i++) assert.equal(cop[i], null, `coppock[${i}]`);
const roc = (i: number, n: number) => ((closes[i] - closes[i - n]) / closes[i - n]) * 100;
for (let i = 23; i < closes.length; i++) {
  let s = 0;
  for (let w = 0; w < 10; w++) { const j = i - 9 + w; s += (roc(j, 14) + roc(j, 11)) * (w + 1); }
  assert.ok(Math.abs(cop[i]! - s / 55) < 1e-9, `coppock[${i}]`);
}
console.log('trixDpoCoppock selftest: PASS');
