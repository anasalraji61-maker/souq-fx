/**
 * أول قيمة لـADX ويانغ-تشانغ: لا مبكرة ولا متأخرة.
 * Run: npx --yes tsx src/chart/indicators/warmup.selftest.ts
 */
import assert from 'node:assert/strict';
import type { Candle } from '../../api';
import { computeAdx } from './trend';
import { computeYangZhangVolatility } from './volatility';

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const bars: Candle[] = [];
let px = 1.08;
for (let i = 0; i < 40; i++) {
  const open = px;
  const close = open + (rnd() - 0.5) * 0.004;
  const high = Math.max(open, close) + rnd() * 0.002;
  const low = Math.min(open, close) - rnd() * 0.002;
  bars.push({ time: 1_700_000_000 + i * 3600, open, high, low, close, volume: 0 } as Candle);
  px = close + (rnd() - 0.5) * 0.001;
}

// ADX 14: القيمة عند 27 تعتمد على 0..27 فقط ⇒ 28 شمعة تكفي وتطابق السلسلة الأطول.
const full = computeAdx(bars, 14);
const exact = computeAdx(bars.slice(0, 28), 14);
assert.equal(full[26], null);
assert.ok(full[27] != null);
assert.equal(exact[27], full[27]);
assert.equal(computeAdx(bars.slice(0, 27), 14).every((v) => v == null), true);

// يانغ-تشانغ 10: الشمعة 0 بلا إغلاق سابق ⇒ أول قيمة عند 10 لا 9.
const yz = computeYangZhangVolatility(bars, 10);
assert.equal(yz[9], null);
assert.ok(yz[10] != null && Number.isFinite(yz[10]!));

console.log('warmup selftest: PASS');
