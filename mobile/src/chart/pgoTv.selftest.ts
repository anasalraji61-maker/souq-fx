/**
 * PGO = (close − SMA(close,14)) / EMA(TR,14). Run: npx --yes tsx src/chart/pgoTv.selftest.ts
 */
import assert from 'node:assert/strict';
import { computePgo } from './indicators/momentum';

let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
let c = 1.08;
const bars = Array.from({ length: 150 }, (_, i) => {
  const o = c;
  c += (rnd() - 0.5) * 0.003;
  const hi = Math.max(o, c) + rnd() * 0.001;
  const lo = Math.min(o, c) - rnd() * 0.001;
  return { time: i * 60, open: o, high: hi, low: lo, close: c, volume: 1 };
});

// مرجع مستقلّ: TR، EMA ببذرة SMA أوّل 14، SMA الإغلاق
const tr = bars.map((b, i) =>
  i === 0 ? b.high - b.low : Math.max(b.high - b.low, Math.abs(b.high - bars[i - 1].close), Math.abs(b.low - bars[i - 1].close))
);
const k = 2 / 15;
const e: number[] = [];
for (let i = 0; i < tr.length; i++) {
  if (i < 13) continue;
  e[i] = i === 13 ? tr.slice(0, 14).reduce((a, b) => a + b, 0) / 14 : tr[i] * k + e[i - 1] * (1 - k);
}
const got = computePgo(bars as never);
for (let i = 0; i < 13; i++) assert.equal(got[i], null);
let maxRel = 0;
for (let i = 13; i < bars.length; i++) {
  const sma = bars.slice(i - 13, i + 1).reduce((a, b) => a + b.close, 0) / 14;
  const ref = (bars[i].close - sma) / e[i];
  assert.ok(Math.abs((got[i] as number) - ref) < 1e-9, `bar ${i}: ${got[i]} vs ${ref}`);
  maxRel = Math.max(maxRel, Math.abs(ref));
}
assert.ok(maxRel > 0.5, 'non-trivial series');

// مسطّح ⇒ 0 لا Infinity
const flat = computePgo(Array.from({ length: 30 }, (_, i) => ({ time: i, open: 1, high: 1, low: 1, close: 1, volume: 1 })) as never);
assert.equal(flat[20], 0);

console.log('pgoTv selftest: PASS');
