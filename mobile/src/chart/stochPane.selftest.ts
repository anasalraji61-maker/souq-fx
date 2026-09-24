/**
 * Self-test for stochPaneGeom + computeStoch's %D validity gate (pure).
 * Run: npx --yes tsx src/chart/stochPane.selftest.ts
 */
import assert from 'node:assert/strict';
import { STOCH_LINE_H, stochPaneGeom } from './stochPane';
import { placeGuides } from './paneGuides';
import { computeStoch } from './indicators/momentum';
import type { Candle } from '../api';

const PANE_H = 60;
const INNER = PANE_H - 16; // 44

// تعيين المدى 0..100: القمة بالأعلى والقاع بالأسفل، والمنتصف بالمنتصف
{
  const g = stochPaneGeom(PANE_H);
  assert.equal(g.innerH, INNER);
  assert.equal(g.y(100), 0);
  assert.equal(g.y(50), INNER / 2);
  // القاع مقصوص ليبقى الخطّ كلّه داخل مساحة الرسم (كان يخرج 3px فوق اللوحة التالية)
  assert.equal(g.y(0), INNER - STOCH_LINE_H);
  // رتابة: كلّما زادت القيمة ارتفع الخطّ
  const ys = [0, 20, 40, 60, 80, 100].map((v) => g.y(v)!);
  for (let i = 1; i < ys.length; i++) assert.ok(ys[i] < ys[i - 1], `ys=${ys.join(',')}`);
}

// **الشرط الحاسم**: خطّ المؤشّر يقع على خطّ العتبة نفسه لا بجواره — نفس تعيين paneGuides
{
  const g = stochPaneGeom(PANE_H);
  const guides = placeGuides('stoch', INNER);
  assert.equal(guides.length, 2, 'stoch has 20/80');
  for (const gd of guides) {
    assert.equal(g.y(gd.v), gd.top, `v=${gd.v} line=${g.y(gd.v)} guide=${gd.top}`);
  }
}

// قيم غير صالحة لا تُرسم أصلاً (null بدل موضع مخترَع)
{
  const g = stochPaneGeom(PANE_H);
  assert.equal(g.y(null), null);
  assert.equal(g.y(undefined), null);
  assert.equal(g.y(Number.NaN), null);
  assert.equal(g.y(Number.POSITIVE_INFINITY), null);
}

// خارج المدى (لا يحدث رياضياً لكن يصل من بيانات فاسدة): مقصوص لا خارج اللوحة
{
  const g = stochPaneGeom(PANE_H);
  assert.equal(g.y(140), 0);
  assert.equal(g.y(-40), INNER - STOCH_LINE_H);
}

// ارتفاعات حدّية: لوحة صفرية/سالبة/NaN وأقصر من سماكة الخطّ — بلا NaN وبلا موضع سالب
{
  for (const h of [0, -30, Number.NaN, 8, 16, 17]) {
    const g = stochPaneGeom(h);
    assert.ok(g.innerH >= 0 && Number.isFinite(g.innerH), `innerH=${g.innerH}`);
    for (const v of [0, 50, 100]) {
      const y = g.y(v)!;
      assert.ok(Number.isFinite(y) && y >= 0 && y <= Math.max(0, g.innerH - STOCH_LINE_H), `h=${h} v=${v} y=${y}`);
    }
  }
}

// مدى غير صالح لا يعطي قسمة على صفر
{
  const g = stochPaneGeom(PANE_H, 50, 50);
  assert.equal(g.y(50), 0);
  assert.ok(Number.isFinite(g.y(10)!));
}

// ===== بوابة صلاحية %D بـcomputeStoch =====
const candle = (i: number, close: number): Candle => ({
  time: 1700000000 + i * 60,
  open: close,
  high: close + 1,
  low: close - 1,
  close,
  volume: 100,
});

// 20 شمعة صاعدة: %K يبدأ عند الفهرس 13 (kPeriod=14)، و%D لا يصحّ قبل 15 (14+3−1)
{
  const candles = Array.from({ length: 20 }, (_, i) => candle(i, 100 + i));
  const { k, d } = computeStoch(candles);
  assert.equal(k.length, 20);
  assert.equal(d.length, 20);
  for (let i = 0; i < 13; i++) assert.equal(k[i], null, `k[${i}]`);
  assert.ok(k[13] != null);
  // **جوهر الإصلاح**: الفهرسان 13 و14 كانا يحملان قيماً مبنيّة على أصفار وهمية — أي
  // %D قريباً من الصفر تحت %K مباشرةً = تقاطع صعودي مفتعل عند أقصى يسار الشارت.
  for (let i = 0; i < 15; i++) assert.equal(d[i], null, `d[${i}] must be null, got ${d[i]}`);
  assert.ok(d[15] != null, 'd[15] should be the first real %D');
  // وأول قيمة حقيقية هي فعلاً متوسط آخر ثلاث قيم %K
  const expected = ((k[13] as number) + (k[14] as number) + (k[15] as number)) / 3;
  assert.ok(Math.abs((d[15] as number) - expected) < 1e-9, `d[15]=${d[15]} expected=${expected}`);
}

// سلسلة أقصر من فترة %K: كل شيء null، بلا أرقام مخترَعة
{
  const { k, d } = computeStoch(Array.from({ length: 5 }, (_, i) => candle(i, 100)));
  assert.ok(k.every((v) => v === null));
  assert.ok(d.every((v) => v === null));
}

// سلسلة فارغة
{
  const { k, d } = computeStoch([]);
  assert.equal(k.length, 0);
  assert.equal(d.length, 0);
}

// سعر مسطّح تماماً (المدى صفر): %K وD‏ null كـna بـTradingView — لا 0 «تشبّع بيعي» وهمي، ولا NaN
{
  const candles = Array.from({ length: 20 }, (_, i) => ({ ...candle(i, 100), high: 100, low: 100 }));
  const { k, d } = computeStoch(candles);
  assert.ok(k.every((v) => v === null));
  assert.ok(d.every((v) => v === null));
}

// كل قيم %K/%D الحقيقية داخل 0..100، فالقصّ لا يخفي خطأ تعيين
{
  const candles = Array.from({ length: 60 }, (_, i) => candle(i, 100 + Math.sin(i / 3) * 5));
  const { k, d } = computeStoch(candles);
  const g = stochPaneGeom(PANE_H);
  for (let i = 0; i < candles.length; i++) {
    for (const v of [k[i], d[i]]) {
      if (v == null) continue;
      assert.ok(v >= 0 && v <= 100, `value out of range: ${v}`);
      const y = g.y(v)!;
      assert.ok(y >= 0 && y <= INNER - STOCH_LINE_H, `y=${y}`);
    }
  }
  // ويوجد فعلاً تقاطع واحد على الأقل بهذه السلسلة المتذبذبة — أي أن رسم الخطّين يفيد
  let crosses = 0;
  for (let i = 16; i < candles.length; i++) {
    const a = k[i - 1]! - d[i - 1]!;
    const b = k[i]! - d[i]!;
    if (a < 0 && b > 0) crosses++;
  }
  assert.ok(crosses > 0, 'expected at least one %K/%D bullish cross');
}

console.log('stochPane.selftest: PASS');
