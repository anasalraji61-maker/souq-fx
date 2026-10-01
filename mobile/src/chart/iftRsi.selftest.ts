/**
 * IFT-RSI بصيغة إيلرز: RSI(5) ⇒ 0.1×(RSI−50) ⇒ WMA(9) ⇒ tanh. Run: npx --yes tsx src/chart/iftRsi.selftest.ts
 */
import assert from 'node:assert/strict';
import { computeInverseFisherRsi } from './indicators/momentum';

// سلسلة متذبذبة ثابتة البذرة
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const closes: number[] = [];
let c = 1.08;
for (let i = 0; i < 200; i++) closes.push((c += (rnd() - 0.5) * 0.002));

// مرجع مستقلّ: RSI Wilder(5) ثم WMA(9) ثم tanh
const rsi: (number | null)[] = closes.map(() => null);
let g = 0;
let l = 0;
for (let i = 1; i <= 5; i++) {
  const d = closes[i] - closes[i - 1];
  if (d > 0) g += d;
  else l -= d;
}
g /= 5;
l /= 5;
rsi[5] = 100 - 100 / (1 + g / l);
for (let i = 6; i < closes.length; i++) {
  const d = closes[i] - closes[i - 1];
  g = (g * 4 + Math.max(d, 0)) / 5;
  l = (l * 4 + Math.max(-d, 0)) / 5;
  rsi[i] = 100 - 100 / (1 + g / l);
}
const got = computeInverseFisherRsi(closes);
for (let i = 0; i < 13; i++) assert.equal(got[i], null, `warm-up ${i}`);
for (let i = 13; i < closes.length; i++) {
  let s = 0;
  for (let w = 0; w < 9; w++) s += 0.1 * ((rsi[i - 8 + w] as number) - 50) * (w + 1);
  const ref = Math.tanh(s / 45);
  assert.ok(Math.abs((got[i] as number) - ref) < 1e-9, `bar ${i}: ${got[i]} vs ${ref}`);
}

// التنعيم يقلّل التقلّب: عدد عبورات الصفر أقلّ بكثير من RSI(5) الخام
const crossings = (xs: (number | null)[]) =>
  xs.reduce<number>((n, v, i) => (i > 0 && v != null && xs[i - 1] != null && Math.sign(v) !== Math.sign(xs[i - 1] as number) ? n + 1 : n), 0);
const raw = rsi.map((r) => (r == null ? null : Math.tanh(0.1 * (r - 50))));
assert.ok(crossings(got) * 2 < crossings(raw), `smoothed ${crossings(got)} vs raw ${crossings(raw)}`);

// سعر ثابت ⇒ RSI 50 ⇒ 0؛ صعود صارم ⇒ RSI 100 ⇒ tanh(5)
const flat = computeInverseFisherRsi(Array(40).fill(1.2345));
assert.equal(flat[30], 0);
const up = computeInverseFisherRsi(Array.from({ length: 40 }, (_, i) => 1.08 + i * 0.0001));
assert.ok(Math.abs((up[30] as number) - Math.tanh(5)) < 1e-12);

console.log('iftRsi selftest: PASS');
