/**
 * Fisher Transform كـTradingView (round_ يُخزَّن، len 9). Run: npx --yes tsx src/chart/fisherTv.selftest.ts
 */
import assert from 'node:assert/strict';
import { computeFisherTransform } from './indicators/momentum';

// صعود متواصل: hl2 عند قمّة النافذة كل شمعة ⇒ القيمة تتشبّع عند 0.999.
const bars = Array.from({ length: 60 }, (_, i) => {
  const c = 1.08 + i * 0.0005;
  return { time: i * 60, open: c, high: c + 0.0002, low: c - 0.0002, close: c, volume: 1 };
});
// مرجع Pine مستقلّ.
const hl2 = bars.map((b) => (b.high + b.low) / 2);
let v = 0;
let f = 0;
const ref: (number | null)[] = hl2.map((x, i) => {
  if (i < 8) return null;
  const w = hl2.slice(i - 8, i + 1);
  const hi = Math.max(...w);
  const lo = Math.min(...w);
  const raw = 0.66 * ((x - lo) / (hi - lo) - 0.5) + 0.67 * v;
  v = raw > 0.99 ? 0.999 : raw < -0.99 ? -0.999 : raw;
  f = 0.5 * Math.log((1 + v) / (1 - v)) + 0.5 * f;
  return f;
});
const got = computeFisherTransform(bars as never);
assert.equal(got[7], null);
ref.forEach((r, i) => {
  if (r == null) return;
  assert.ok(Math.abs((got[i] as number) - r) < 1e-9, `bar ${i}: ${got[i]} vs ${r}`);
});
// التشبّع: القيمة المخزَّنة 0.999 ⇒ fisher → 2×atanh(0.999) ≈ 7.6
assert.ok((got[59] as number) > 7.5, `saturated ${got[59]}`);
console.log('fisherTv.selftest: PASS');
