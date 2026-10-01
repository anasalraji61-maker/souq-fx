/**
 * Self-test: Ultimate Oscillator كـ`ta`/المؤشر المدمج بـTradingView — أوّل قيمة بالفهرس 28 (الشمعة 0 بلا
 * إغلاق سابق)، ونافذة بلا مدى ⇒ null لا 0.
 * Run: npx --yes tsx src/chart/uoTv.selftest.ts
 */
import assert from 'node:assert/strict';
import { computeUltimateOsc } from './indicators/momentum';

let seed = 5;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
let p = 1.1;
const bars = Array.from({ length: 120 }, (_, i) => {
  const o = p;
  const c = (p += (rnd() - 0.5) * 0.004);
  return { time: i * 60, open: o, high: Math.max(o, c) + rnd() * 0.001, low: Math.min(o, c) - rnd() * 0.001, close: c };
});

// مرجع Pine: bp/tr na بالشمعة 0، math.sum بنافذة فيها na ⇒ na
const bp = bars.map((b, i) => (i === 0 ? null : b.close - Math.min(b.low, bars[i - 1].close)));
const tr = bars.map((b, i) =>
  i === 0 ? null : Math.max(b.high, bars[i - 1].close) - Math.min(b.low, bars[i - 1].close)
);
const sum = (a: (number | null)[], i: number, l: number) => {
  let s = 0;
  for (let k = i - l + 1; k <= i; k++) {
    if (k < 0 || a[k] == null) return null;
    s += a[k] as number;
  }
  return s;
};
const ref = (i: number) => {
  const avg = (l: number) => {
    const b = sum(bp, i, l);
    const t = sum(tr, i, l);
    return b == null || t == null || t === 0 ? null : b / t;
  };
  const a = avg(7), b = avg(14), c = avg(28);
  return a == null || b == null || c == null ? null : (100 * (4 * a + 2 * b + c)) / 7;
};

const uo = computeUltimateOsc(bars);
assert.equal(uo[27], null);
assert.notEqual(uo[28], null);
for (let i = 0; i < bars.length; i++) {
  const r = ref(i);
  if (r == null) assert.equal(uo[i], null, `uo ${i}`);
  else assert.ok(Math.abs((uo[i] as number) - r) < 1e-9, `uo ${i}`);
}

// 40 شمعة مسطّحة (سوق مغلق) ⇒ null لا 0
const flat = Array.from({ length: 40 }, (_, i) => ({ time: i * 60, open: 1.1, high: 1.1, low: 1.1, close: 1.1 }));
assert.ok(computeUltimateOsc(flat).every((v) => v == null));

console.log('uoTv selftest: PASS');
