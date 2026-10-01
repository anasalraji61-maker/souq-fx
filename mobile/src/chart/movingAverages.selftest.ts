/**
 * Self-test: طبقات EMA/WMA/SMA المتتالية تبدأ من أول قيمة حقيقية للطبقة السابقة (لا من أصفار الإحماء).
 * Run: npx --yes tsx src/chart/movingAverages.selftest.ts
 */
import assert from 'node:assert/strict';
import { dema, ema, hma, sma, tema, wma } from './indicators/moving-averages';
import { computeMacd } from './indicators/momentum';
import { computeT3, computeTrix, computeZlema } from './indicators/trend';

const near = (a: number | null, b: number, eps = 1e-9, msg = '') =>
  assert.ok(a != null && Math.abs(a - b) < eps, `${msg} got=${a} want=${b}`);

// لقيم كلّها أرقام: النتيجة كما كانت (بذرة SMA عند period−1)
{
  const v = [1, 2, 3, 4, 5, 6];
  assert.deepEqual(sma(v, 3), [null, null, 2, 3, 4, 5]);
  assert.deepEqual(wma(v, 2).slice(1), [5 / 3, 8 / 3, 11 / 3, 14 / 3, 17 / 3]);
  const e = ema(v, 3);
  assert.deepEqual(e.slice(0, 3), [null, null, 2]);
  near(e[3], 3);
}

// null في النافذة ⇒ null؛ الـEMA تبدأ ببذرة من أول period قيمة حقيقية
{
  const v = [null, null, 1, 2, 3, 4];
  assert.deepEqual(sma(v, 2), [null, null, null, 1.5, 2.5, 3.5]);
  assert.deepEqual(wma(v, 2), [null, null, null, 5 / 3, 8 / 3, 11 / 3]);
  const e = ema(v, 3);
  assert.deepEqual(e.slice(0, 4), [null, null, null, null]);
  near(e[4], 2, 1e-12, 'seed');
  near(e[5], 3, 1e-12, 'step');
}

// سعر ثابت: كل المتوسطات المركّبة = السعر من أول قيمة لها (كانت DEMA20 تبلغ 2.41 وTRIX 503%)
{
  const flat = Array.from({ length: 120 }, () => 1.2345);
  for (const [name, out] of [
    ['dema', dema(flat, 20)],
    ['tema', tema(flat, 20)],
    ['hma', hma(flat, 20)],
    ['t3', computeT3(flat, 5)],
  ] as const) {
    const vals = out.filter((x): x is number => x != null);
    assert.ok(vals.length > 0, `${name} empty`);
    for (const x of vals) near(x, 1.2345, 1e-9, name);
  }
  // DEMA20: أول قيمة عند 2×(20−1) = 38، لا قبلها
  const d = dema(flat, 20);
  assert.equal(d[37], null);
  near(d[38], 1.2345);
  for (const x of computeTrix(flat, 15)) assert.ok(x == null || Math.abs(x) < 1e-9, `trix ${x}`);
}

// MACD: الإشارة تبدأ عند 25+8 = 33 ببذرة SMA لأول 9 قيم MACD حقيقية
{
  const closes = Array.from({ length: 80 }, (_, i) => 1.08 + i * 0.0001);
  const { macdLine, signal, hist } = computeMacd(closes);
  assert.equal(macdLine[24], null);
  assert.ok(macdLine[25] != null);
  assert.equal(signal[32], null);
  const seed = macdLine.slice(25, 34).reduce((a, b) => a! + b!, 0)! / 9;
  near(signal[33], seed, 1e-15, 'signal seed');
  assert.equal(hist[32], null);
  // اتّجاه ثابت: MACD يقترب من الإشارة من فوق، لا تقاطع وهمي من صفر
  for (let i = 33; i < 80; i++) assert.ok(hist[i]! >= -1e-12, `hist[${i}]=${hist[i]}`);
}

// ta.hma: النصف والجذر مقطوعان للأسفل — HMA(9) = wma(2·wma(4) − wma(9), 3)
{
  const xs = Array.from({ length: 40 }, (_, i) => 1.1 + Math.sin(i / 3) * 0.01 + i * 0.0003);
  const w4 = wma(xs, 4);
  const w9 = wma(xs, 9);
  const raw = xs.map((_, i) => (w4[i] != null && w9[i] != null ? 2 * w4[i]! - w9[i]! : null));
  const want = wma(raw, 3);
  const got = hma(xs, 9);
  for (let i = 0; i < xs.length; i++) {
    if (want[i] == null) assert.equal(got[i], null, `hma9 ${i}`);
    else assert.ok(Math.abs((got[i] as number) - (want[i] as number)) < 1e-12, `hma9 ${i}`);
  }
}

// ZLEMA كـPine ‎ta.ema(src + (src − src[lag]), len)‎: لا مدخل قبل lag ⇒ أول نقطة عند lag+len−1، والبذرة SMA حقيقية
{
  const c = Array.from({ length: 80 }, (_, i) => 1.1 + i * 0.0001);
  const z = computeZlema(c, 20);
  assert.equal(z.findIndex((v) => v != null), 28, 'ZLEMA first value at lag+period-1');
  near(z[28]!, 1.10275, 1e-9, 'ZLEMA seed');
}

console.log('movingAverages.selftest: OK');
