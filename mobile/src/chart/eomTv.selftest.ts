/**
 * Self-test: Ease of Movement كـTradingView المدمج — ‎sma(10000 × change(hl2) × (high − low) / volume, 14)‎.
 * Run: npx --yes tsx src/chart/eomTv.selftest.ts
 */
import assert from 'node:assert/strict';
import type { Candle } from '../api';
import { computeEom } from './indicators/volume';

const bars: Candle[] = [];
for (let i = 0; i < 40; i++) {
  const mid = 1.1 + 0.0003 * Math.sin(i / 3) + 0.00002 * i;
  const span = 0.0008 + 0.0002 * (i % 4);
  bars.push({ time: i * 60, open: mid, high: mid + span / 2, low: mid - span / 2, close: mid, volume: 500 + 37 * (i % 7) } as Candle);
}
const hl2 = (c: Candle) => (c.high + c.low) / 2;
const raw = bars.map((c, i) => (i === 0 ? null : (10000 * (hl2(c) - hl2(bars[i - 1])) * (c.high - c.low)) / c.volume!));
const eom = computeEom(bars);
for (let i = 0; i < bars.length; i++) {
  if (i < 14) {
    assert.equal(eom[i], null, `warmup ${i}: ta.change is na on bar 0 ⇒ first value at bar 14`);
    continue;
  }
  const want = raw.slice(i - 13, i + 1).reduce((a, v) => a! + v!, 0)! / 14;
  assert.ok(Math.abs(eom[i]! - want) < 1e-12, `bar ${i}: ${eom[i]} vs ${want}`);
}
// المقياس: قيمة EUR/USD نموذجية بحجم TradingView (أجزاء من الألف) لا ×10000
assert.ok(Math.abs(eom[39]!) < 0.01, `scale ${eom[39]}`);
// مدى صفري ⇒ صفر (change × 0)، لا NaN
const flat = bars.map((c) => ({ ...c, high: 1.1, low: 1.1 }));
assert.ok(computeEom(flat).slice(14).every((v) => v === 0));

console.log('eomTv selftest PASS');
