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
// نافذة مسطّحة (high = low ثابت، توقّف التغذية): فجوة كـTV، ثم الحالة تبدأ من صفر لا من بقايا الصعود
{
  const mk = (x: number) => ({ time: 0, open: x, high: x, low: x, close: x });
  const seq = [
    ...Array.from({ length: 30 }, (_, i) => mk(1.1 + i * 0.001)),
    ...Array.from({ length: 12 }, () => mk(1.129)),
    ...Array.from({ length: 18 }, (_, i) => mk(1.129 - (i + 1) * 0.001)),
  ];
  const fz = computeFisherTransform(seq as never);
  for (let i = 38; i <= 41; i++) assert.equal(fz[i], null, `flat bar ${i} is a gap`);
  // الشمعة 42: أوّل نافذة بمدى ⇒ ratio 0 ⇒ value = −0.33، fisher = atanh(−0.33)·… من صفر
  const v0 = -0.33;
  assert.ok(Math.abs((fz[42] as number) - 0.5 * Math.log((1 + v0) / (1 - v0))) < 1e-9, `restart ${fz[42]}`);
}
console.log('fisherTv.selftest: PASS');
