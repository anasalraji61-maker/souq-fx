/**
 * SMI Ergodic Osc كـTradingView: tsi(close,5,20)/100 − ema(·,5). Run: npx --yes tsx src/chart/smiErgodic.selftest.ts
 */
import assert from 'node:assert/strict';
import { computeSmiErgodicOscillator } from './indicators/momentum';

const closes = Array.from({ length: 120 }, (_, i) => 1.08 + 0.002 * Math.sin(i / 6) + 0.00005 * i);
const bars = closes.map((c, i) => ({ time: i * 60, open: c, high: c + 0.0003, low: c - 0.0003, close: c, volume: 1 }));

// مرجع مستقلّ بنصّ Pine: ema بذرة SMA عند أوّل قيمة صالحة.
function pineEma(xs: (number | null)[], n: number): (number | null)[] {
  const out: (number | null)[] = xs.map(() => null);
  const a = 2 / (n + 1);
  let prev: number | null = null;
  const buf: number[] = [];
  xs.forEach((x, i) => {
    if (x == null) return;
    if (prev == null) {
      buf.push(x);
      if (buf.length === n) prev = buf.reduce((p, q) => p + q, 0) / n;
    } else prev = a * x + (1 - a) * prev;
    out[i] = prev;
  });
  return out;
}
const pc: (number | null)[] = closes.map((c, i) => (i ? c - closes[i - 1] : null));
const ds = (xs: (number | null)[]) => pineEma(pineEma(xs, 20), 5);
const num = ds(pc);
const den = ds(pc.map((v) => (v == null ? null : Math.abs(v))));
const erg = num.map((v, i) => (v != null && den[i] ? v / den[i]! : null));
const sig = pineEma(erg, 5);
const ref = erg.map((v, i) => (v != null && sig[i] != null ? v - sig[i]! : null));

const got = computeSmiErgodicOscillator(bars as never);
let valid = 0;
got.forEach((v, i) => {
  if (ref[i] == null) return;
  valid++;
  assert.ok(v != null && Math.abs(v - ref[i]!) < 1e-9, `bar ${i}: ${v} vs ${ref[i]}`);
});
assert.ok(valid > 80, `valid ${valid}`);
assert.ok(got.every((v) => v == null || Math.abs(v) < 2), 'نطاق ±1 تقريباً لا عشرات');
console.log('smiErgodic.selftest: PASS');
