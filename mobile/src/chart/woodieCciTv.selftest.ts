/**
 * Self-test: Woodie's CCI على الإغلاق كـTradingView (`ta.cci(close, 14)` / `ta.cci(close, 6)`)، وCCI العادي يبقى على TP.
 * Run: npx --yes tsx src/chart/woodieCciTv.selftest.ts
 */
import assert from 'node:assert/strict';
import type { Candle } from '../api';
import { computeCci, computeWoodieCci } from './indicators/momentum';

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const bars: Candle[] = [];
let p = 1.08;
for (let i = 0; i < 120; i++) {
  const o = p;
  p += (rnd() - 0.5) * 0.004;
  const h = Math.max(o, p) + rnd() * 0.002;
  const l = Math.min(o, p) - rnd() * 0.002;
  bars.push({ time: 1_700_000_000 + i * 900, open: o, high: h, low: l, close: p, volume: 0 } as Candle);
}

// مرجع مستقلّ: ta.cci(src, len) = (src − sma) / (0.015 × متوسط الانحراف المطلق)
const ref = (src: number[], len: number, i: number) => {
  const w = src.slice(i - len + 1, i + 1);
  const m = w.reduce((a, v) => a + v, 0) / len;
  const md = w.reduce((a, v) => a + Math.abs(v - m), 0) / len;
  return (src[i] - m) / (0.015 * md);
};
const closes = bars.map((b) => b.close);
const tp = bars.map((b) => (b.high + b.low + b.close) / 3);
const w = computeWoodieCci(bars);
for (const i of [20, 60, 119]) {
  assert.ok(Math.abs(w.cci[i]! - ref(closes, 14, i)) < 1e-6, `cci14 @${i}`);
  assert.ok(Math.abs(w.turbo[i]! - ref(closes, 6, i)) < 1e-6, `turbo @${i}`);
  assert.ok(Math.abs(computeCci(bars)[i]! - ref(tp, 20, i)) < 1e-6, `cci20 TP @${i}`);
}
assert.equal(w.cci[12], null);
assert.equal(typeof w.cci[13], 'number');
console.log('woodieCciTv selftest: PASS');
