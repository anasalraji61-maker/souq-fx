/**
 * Self-test for macdPaneGeom (pure).
 * Run: npx --yes tsx src/chart/macdPane.selftest.ts
 */
import assert from 'node:assert/strict';
import { macdPaneGeom } from './macdPane';

const PANE_H = 60;
const INNER = PANE_H - 16; // 44
const ZERO = INNER / 2; // 22

// نافذة نموذجية: أول شمعتين قبل بدء macdLine (signal يحمل قيماً وهمية ضخمة عندهما)
{
  const macdLine = [null, null, 0.001, -0.002, 0.0005];
  const signal = [999, 999, 0.0008, -0.0011, 0.0004];
  const hist = [null, null, 0.0002, -0.0009, 0.0001];
  const g = macdPaneGeom(hist, macdLine, signal, PANE_H);

  // القيم الوهمية عند الفهارس غير الصالحة لا تدخل المقياس إطلاقاً
  assert.equal(g.maxAbs, 0.002, `maxAbs=${g.maxAbs}`);
  assert.equal(g.valid(0), false);
  assert.equal(g.valid(1), false);
  assert.equal(g.valid(2), true);

  assert.equal(g.innerH, INNER);
  assert.equal(g.zeroY, ZERO);
  // أكبر قيمة سالبة تبلغ قاع مساحة الرسم، وخطّ الصفر بالمنتصف
  assert.equal(g.y(-0.002), INNER);
  assert.equal(g.y(0.002), 0);
  assert.equal(g.y(0), ZERO);
  // الموجب فوق خطّ الصفر والسالب تحته — وهو ما كان مفقوداً كلّياً قبل إصلاح المحاذاة
  assert.ok(g.y(0.001) < ZERO);
  assert.ok(g.y(-0.001) > ZERO);
}

// المقياس من البيانات لا من رقم ثابت: ثلاثة أزواج بمقاييس سعر متباعدة جداً
// تعطي **نفس** الشكل النسبي بالضبط — وهو جوهر الإصلاح.
{
  const shape = (k: number) => {
    const macdLine = [null, 1 * k, -0.5 * k, 0.25 * k];
    const signal = [null, 0.8 * k, -0.4 * k, 0.2 * k];
    const hist = [null, 0.2 * k, -0.1 * k, 0.05 * k];
    const g = macdPaneGeom(hist, macdLine, signal, PANE_H);
    return [g.y(1 * k), g.y(-0.5 * k), g.barH(0.2 * k), g.barH(-0.1 * k)];
  };
  const eur = shape(0.0002); // EURUSD
  const jpy = shape(0.05); // USDJPY
  const gold = shape(2); // XAUUSD
  // المقارنة بهامش عائم صغير لا بـdeepEqual: الفارق الوحيد بين الثلاثة هو تقريب الفاصلة
  // العائمة (4.4 مقابل 4.400000000000001) — أي أن الشكل واحد فعلاً بمقاييس سعر ×10000.
  const near = (a: number[], b: number[], tag: string) => {
    assert.equal(a.length, b.length, tag);
    a.forEach((v, i) => assert.ok(Math.abs(v - b[i]) < 1e-9, `${tag}[${i}]: ${v} vs ${b[i]}`));
  };
  near(eur, jpy, 'eur-vs-jpy');
  near(eur, gold, 'eur-vs-gold');
  // وأن الشكل نفسه ليس مقصوصاً ولا مسطَّحاً: القمة بالأعلى والعمود بارتفاع معقول
  assert.equal(eur[0], 0);
  assert.ok(eur[2] > 1 && eur[2] < INNER / 2);
}

// قصّ داخل مساحة الرسم: لا شيء يخرج خارج [0, innerH]
{
  const g = macdPaneGeom([1], [1], [1], PANE_H);
  assert.equal(g.y(5), 0);
  assert.equal(g.y(-5), INNER);
  assert.equal(g.barH(5), INNER / 2);
  assert.equal(g.barH(-5), INNER / 2);
}

// سلسلة مسطّحة تماماً (كل القيم صفر) — بلا NaN ولا قسمة على صفر
{
  const g = macdPaneGeom([0, 0], [0, 0], [0, 0], PANE_H);
  assert.ok(Number.isFinite(g.maxAbs) && g.maxAbs > 0);
  assert.equal(g.y(0), ZERO);
  assert.equal(g.barH(0), 0);
}

// سلسلة فارغة / كلّها null
{
  const g = macdPaneGeom([], [], [], PANE_H);
  assert.ok(Number.isFinite(g.y(0)));
  assert.equal(g.valid(0), false);
  const g2 = macdPaneGeom([null, null], [null, null], [null, null], PANE_H);
  assert.equal(g2.valid(1), false);
  assert.ok(Number.isFinite(g2.maxAbs));
}

// لوحة قصيرة جداً / ارتفاع سالب / غير رقمي — بلا NaN ولا قيم سالبة
{
  for (const h of [16, 10, 0, -50, Number.NaN]) {
    const g = macdPaneGeom([0.5], [0.5], [0.4], h);
    assert.ok(g.innerH >= 0, `innerH<0 at paneH=${h}`);
    assert.ok(Number.isFinite(g.y(0.5)) && g.y(0.5) >= 0 && g.y(0.5) <= g.innerH);
    assert.ok(Number.isFinite(g.barH(0.5)) && g.barH(0.5) >= 0);
  }
}

// قيم غير رقمية تصل الدالة (NaN/Infinity) لا تُفسد المقياس ولا تعطي NaN
{
  const g = macdPaneGeom([Number.NaN, 0.1], [Number.POSITIVE_INFINITY, 0.2], [Number.NaN, 0.15], PANE_H);
  assert.equal(g.valid(0), false);
  assert.equal(g.maxAbs, 0.2);
  assert.ok(Number.isFinite(g.y(Number.NaN)));
  assert.equal(g.barH(Number.NaN), 0);
}

// `vis`: المقياس من الشموع الظاهرة وحدها؛ نافذة بلا فهرس صالح ⇒ السلسلة كلها
{
  const line = [5, 0.2, 0.1, 0.3];
  assert.equal(macdPaneGeom(line, line, line, PANE_H).maxAbs, 5);
  assert.equal(macdPaneGeom(line, line, line, PANE_H, { lo: 1, hi: 3 }).maxAbs, 0.3);
  const lead = [null, null, 0.4, 0.2];
  assert.equal(macdPaneGeom(lead, lead, lead, PANE_H, { lo: 0, hi: 1 }).maxAbs, 0.4);
}

console.log('macdPane.selftest: PASS');
