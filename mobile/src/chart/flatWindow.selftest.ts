/**
 * Self-test: نافذة مسطّحة بلا حركة ⇒ null (كـna بـTradingView) لا 0/100 وهمية.
 * %K و%R وCCI وStochRSI وMFI وCMF كانت ترسم 0 أو 100 فيقرأها المتداول تشبّعاً.
 * Run: npx --yes tsx src/chart/flatWindow.selftest.ts
 */
import assert from 'node:assert/strict';
import { computeBop, computeCci, computeCmo, computeSmi, computeCutlerRsi, computeRsi, computeRvi, computeStoch, computeStochRsi, computeWilliamsR } from './indicators/momentum';
import { computeCmf, computeMfi } from './indicators/volume';
import { computePercentB } from './indicators/volatility';
import { computeLinRegR2, computeTrendIntensityIndex } from './indicators/trend';
import { evalPineLite } from './pineLite';

const flat = (n: number, p = 1.1, volume?: number) =>
  Array.from({ length: n }, (_, i) => ({ time: i * 60, open: p, high: p, low: p, close: p, volume }));

// 30 شمعة متحرّكة ثم 30 مسطّحة
let seed = 3;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const moving = Array.from({ length: 30 }, (_, i) => {
  const o = 1.1 + (rnd() - 0.5) * 0.01;
  const c = o + (rnd() - 0.5) * 0.004;
  return { time: i * 60, open: o, high: Math.max(o, c) + 0.001, low: Math.min(o, c) - 0.001, close: c };
});
const bars = [...moving, ...flat(30).map((b, i) => ({ ...b, time: (30 + i) * 60 }))];
const last = bars.length - 1;

const st = computeStoch(bars);
assert.equal(st.k[last], null, '%K');
assert.equal(st.d[last], null, '%D');
assert.equal(typeof st.k[20], 'number');
assert.equal(computeWilliamsR(bars)[last], null, '%R');
assert.equal(typeof computeWilliamsR(bars)[20], 'number');
assert.equal(computeCci(bars)[last], null, 'CCI');
assert.equal(typeof computeCci(bars)[25], 'number');
assert.equal(computeMfi(bars)[last], null, 'MFI');
assert.equal(typeof computeMfi(bars)[25], 'number');
// CMF: حجم صفري حقيقي من المزوّد ⇒ null؛ حجم موجب مع شموع بلا مدى ⇒ 0 (MFM = 0 كـTradingView)
assert.equal(computeCmf(flat(25, 1.1, 0))[24], null, 'CMF vol 0');
assert.equal(computeCmf(flat(25, 1.1, 500))[24], 0, 'CMF flat with volume');

// StochRSI: سعر ثابت ⇒ RSI ثابت ⇒ الخام null ⇒ K وD null
const closes = [...moving.map((b) => b.close), ...Array(60).fill(1.1)];
const sr = computeStochRsi(closes);
assert.equal(sr.k[closes.length - 1], null, 'StochRSI K');
assert.equal(sr.d[closes.length - 1], null, 'StochRSI D');

// لا تغيير على بيانات متحرّكة: لا null بعد الإحماء
const k = computeStoch(moving).k;
for (let i = 13; i < moving.length; i++) assert.equal(typeof k[i], 'number', `k[${i}]`);

// CMO: 14 شمعة بلا حركة ⇒ null (`ta.cmo` 0/0 = na)، لا 0 «محايد»؛ بيانات متحرّكة ⇒ رقم
assert.equal(computeCmo(closes)[closes.length - 1], null, 'CMO flat');
assert.equal(typeof computeCmo(moving.map((b) => b.close))[29], 'number', 'CMO moving');

// RSI: نافذة بلا ربح ولا خسارة = 50 كـMT5 وتنبيه الخادم (backend-r10)، لا 100 «تشبّع شراء»؛ صعود صافٍ يبقى 100
const still = Array(30).fill(1.1);
assert.equal(computeRsi(still)[29], 50, 'RSI flat');
assert.equal(computeCutlerRsi(still)[29], 50, 'Cutler RSI flat');
assert.equal(computeRsi(Array.from({ length: 30 }, (_, i) => 1.1 + i * 0.001))[29], 100, 'RSI all gains');
assert.equal(evalPineLite('stoch(14)', bars)[last], null, 'Pine stoch flat');
assert.equal(typeof evalPineLite('stoch(14)', bars)[20], 'number');
assert.equal(computeBop(bars)[last], null, 'BOP zero-range bar');
assert.equal(typeof computeBop(bars)[5], 'number');

// SMI: نافذة ساكنة ⇒ na؛ وأوّل قيمة بالفهرس 13 (10 + 3 + 3 − 3) كـPine — لا قيم من بذرة أصفار بالفهارس 9..12
assert.equal(computeSmi(flat(40, 1.1, 100)).smi[39], null, 'SMI flat');
{
  const smi = computeSmi(moving).smi;
  for (let i = 0; i < 13; i++) assert.equal(smi[i], null, `SMI warm-up ${i}`);
  assert.equal(typeof smi[13], 'number', 'SMI first value');
}

// %B وTII: بقايا مجموع `sma` الجاري بعد حركة سابقة (~1e-16) كانت تعطي %B = 0.75/0.25 وTII = 100 على سوق ميّت
{
  const wavy = Array.from({ length: 70 }, (_, i) => 1.08 + Math.sin(i / 3) * 0.003 + (i % 7) * 0.0001);
  const pb = computePercentB([...wavy.slice(0, 10), ...Array(25).fill(1.08505)]);
  assert.equal(pb[34], null, '%B flat');
  assert.equal(typeof computePercentB(wavy)[40], 'number');
  const tii = computeTrendIntensityIndex([...wavy, ...Array(100).fill(1.08505)]);
  assert.equal(tii[169], 50, 'TII flat');
  assert.ok(Math.abs(computeTrendIntensityIndex(wavy)[69]! - 50) > 1e-9, 'TII moving');
}

// LR R² وRVI: بقايا التقريب ~1e-32/1e-18 كانت تعطي R² = −6.07 وRVI = −0.34 ثابتة على سوق ميّت
for (const p of [1.1, 1.23456, 145.123]) {
  const r2 = computeLinRegR2(Array(30).fill(p));
  for (let i = 13; i < 30; i++) assert.equal(r2[i], 1, `R² flat ${p}`);
}
{
  const r2 = computeLinRegR2(bars.map((b) => b.close));
  for (const v of r2) if (v != null) assert.ok(v >= 0 && v <= 1, 'R² in [0,1]');
  const rvi = computeRvi(bars);
  assert.equal(rvi[last], null, 'RVI flat');
  assert.equal(typeof rvi[20], 'number', 'RVI moving');
}

console.log('flatWindow selftest: PASS');
