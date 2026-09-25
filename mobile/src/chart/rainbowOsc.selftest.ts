/** فحص ذاتي لـ`computeRainbowOscillator` — صيغة وايدنر بإشارة (لا عرض القوس). يُشغَّل بـNode. */
import assert from 'node:assert/strict';
import { computeRainbowOscillator } from './indicators/trend';

const n = 80;
const closes = Array.from({ length: n }, (_, i) => 1.1 + Math.sin(i / 6) * 0.005 + (i % 4) * 0.0004);
// مرجع مستقلّ: عشر مراحل SMA(2) متتالية، ثم 100×(إغلاق − متوسّطها)/(HHV−LLV للإغلاق على 10)
const stages: (number | null)[][] = [];
let prev: (number | null)[] = closes;
for (let k = 0; k < 10; k++) {
  const st = prev.map((v, i) => (i > 0 && v != null && prev[i - 1] != null ? (v + prev[i - 1]!) / 2 : null));
  stages.push(st);
  prev = st;
}
const ro = computeRainbowOscillator(closes);
assert.equal(ro[9], null, 'أوّل قيمة عند الفهرس 10');
let neg = 0;
for (let i = 10; i < n; i++) {
  const mean = stages.reduce((a, st) => a + st[i]!, 0) / 10;
  const w = closes.slice(i - 9, i + 1);
  const want = (100 * (closes[i] - mean)) / (Math.max(...w) - Math.min(...w));
  assert.ok(Math.abs(ro[i]! - want) < 1e-9, `bar ${i}: ${ro[i]} ≠ ${want}`);
  if (ro[i]! < 0) neg++;
}
assert.ok(neg > 0, 'مذبذب بإشارة: ينزل تحت الصفر');
// سوق مسطّح ⇒ 0 لا NaN
assert.deepEqual(computeRainbowOscillator(new Array(20).fill(1.2345)).slice(10), new Array(10).fill(0));
console.log('rainbowOsc.selftest: PASS');
