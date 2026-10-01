/**
 * Self-test: Relative Vigor Index كـTradingView — ‎rvi = sum(swma(close−open), 10) / sum(swma(high−low), 10)‎،
 * الإشارة ‎swma(rvi)‎ ([1,2,2,1]/6).
 * Run: npx --yes tsx src/chart/rviSignal.selftest.ts
 */
import assert from 'node:assert/strict';
import type { Candle } from '../api';
import { computeRvi, computeRviSignal } from './indicators/momentum';

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const bars: Candle[] = [];
let p = 1.1;
for (let i = 0; i < 80; i++) {
  const o = p;
  p *= 1 + (rnd() - 0.5) * 0.003;
  bars.push({ time: i * 60, open: o, high: Math.max(o, p) + rnd() * 0.0005, low: Math.min(o, p) - rnd() * 0.0005, close: p } as Candle);
}
const swma = (x: (number | null)[], i: number) =>
  i < 3 || [x[i], x[i - 1], x[i - 2], x[i - 3]].some((v) => v == null)
    ? null
    : (x[i - 3]! + 2 * x[i - 2]! + 2 * x[i - 1]! + x[i]!) / 6;
const co = bars.map((c) => c.close - c.open);
const hl = bars.map((c) => c.high - c.low);
const num = co.map((_, i) => swma(co, i));
const den = hl.map((_, i) => swma(hl, i));
const want = bars.map((_, i) => {
  if (i < 12) return null;
  let a = 0;
  let b = 0;
  for (let k = i - 9; k <= i; k++) {
    a += num[k]!;
    b += den[k]!;
  }
  return a / b;
});
const rvi = computeRvi(bars);
const sig = computeRviSignal(rvi);
for (let i = 0; i < bars.length; i++) {
  if (want[i] == null) assert.equal(rvi[i], null, `rvi warmup ${i}`);
  else assert.ok(Math.abs(rvi[i]! - want[i]!) < 1e-12, `rvi[${i}]`);
  const ws = swma(want, i);
  if (ws == null) assert.equal(sig[i], null, `signal warmup ${i}`);
  else assert.ok(Math.abs(sig[i]! - ws) < 1e-12, `signal[${i}]`);
}
assert.equal(sig.findIndex((v) => v != null), 15, 'signal starts 3 bars after RVI');

console.log('rviSignal selftest PASS');
