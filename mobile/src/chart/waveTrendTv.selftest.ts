/**
 * WaveTrend كـPine (ta.ema تبذر SMA من أوّل قيمة حقيقية، لا أصفار بالإحماء). Run: npx --yes tsx src/chart/waveTrendTv.selftest.ts
 */
import assert from 'node:assert/strict';
import { computeWaveTrend } from './indicators/momentum';

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
let px = 1.1;
const bars = Array.from({ length: 120 }, (_, i) => {
  px += (rnd() - 0.5) * 0.002;
  const hi = px + rnd() * 0.001;
  const lo = px - rnd() * 0.001;
  return { time: i * 60, open: px, high: hi, low: lo, close: px, volume: 1 };
});
// مرجع Pine مستقلّ: ema(na…) = na؛ أوّل قيمة = SMA لأوّل length قيمة حقيقية.
function pineEma(src: (number | null)[], len: number): (number | null)[] {
  const a = 2 / (len + 1);
  let prev: number | null = null;
  const seen: number[] = [];
  return src.map((x) => {
    if (x == null) return null;
    if (prev == null) {
      seen.push(x);
      if (seen.length < len) return null;
      prev = seen.reduce((s, v) => s + v, 0) / len;
      return prev;
    }
    prev = a * x + (1 - a) * prev;
    return prev;
  });
}
const ap = bars.map((b) => (b.high + b.low + b.close) / 3);
const esa = pineEma(ap, 10);
const d = pineEma(ap.map((x, i) => (esa[i] == null ? null : Math.abs(x - esa[i]!))), 10);
const ci = ap.map((x, i) => (esa[i] == null || d[i] == null ? null : (x - esa[i]!) / (0.015 * d[i]!)));
const ref = pineEma(ci, 21);
const { wt1, wt2 } = computeWaveTrend(bars as never);
const first = 2 * 10 + 21 - 3;
assert.equal(wt1[first - 1], null);
assert.notEqual(wt1[first], null);
ref.forEach((r, i) => {
  if (r == null) return assert.equal(wt1[i], null, `bar ${i} should be null`);
  assert.ok(Math.abs((wt1[i] as number) - r) < 1e-9, `bar ${i}: ${wt1[i]} vs ${r}`);
});
assert.equal(wt2[first + 2], null);
assert.notEqual(wt2[first + 3], null);
console.log('waveTrendTv selftest PASS');
