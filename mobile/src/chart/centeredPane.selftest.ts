/**
 * Self-test for the two-sided (centered) pane geometry — pure.
 * Run: npx --yes tsx src/chart/centeredPane.selftest.ts
 */
import assert from 'node:assert/strict';
import {
  PANE_PAD,
  centeredBarH,
  centeredBarTop,
  centeredPaneInnerH,
  centeredPaneZeroY,
} from './centeredPane';

/** مقارنة هندسية بهامش فاصلة عائمة: (a−b)+b لا يساوي a بتّياً دائماً بحساب مزدوج. */
const near = (a: number, b: number, eps = 1e-9): boolean => Math.abs(a - b) <= eps;

const PANE_H = 60;
const INNER = PANE_H - PANE_PAD; // 44
const HALF = INNER / 2; // 22

// ١) مساحة الرسم وخطّ الصفر: المركز الحقيقي لا مركز اللوحة
{
  assert.equal(centeredPaneInnerH(PANE_H), INNER);
  assert.equal(centeredPaneZeroY(PANE_H), HALF);
  // **الشرط الحاسم**: الصفر ليس عند paneH/2 — وهو بالضبط الخلل الذي أُصلح
  assert.notEqual(centeredPaneZeroY(PANE_H), PANE_H / 2);
  assert.equal(PANE_H / 2 - centeredPaneZeroY(PANE_H), PANE_PAD / 2); // إزاحة 8px ثابتة
}

// ٢) لا فيض: أقصى عمود بأي جانب يبقى كلّه داخل مساحة الرسم
{
  const maxAbs = 5;
  for (const v of [maxAbs, -maxAbs, maxAbs * 10, -maxAbs * 10]) {
    const h = centeredBarH(v, maxAbs, PANE_H);
    const top = centeredBarTop(v, h, PANE_H);
    assert.ok(h <= HALF, `h=${h}`);
    assert.ok(top >= 0, `top=${top}`);
    assert.ok(top + h <= INNER, `bottom=${top + h} inner=${INNER}`);
  }
  // بالصيغة السابقة كان قاع أقصى عمود سالب عند paneH − 8 = 52 > 44 — أي مقطوعاً دائماً
  assert.ok(PANE_H / 2 + (PANE_H / 2 - 8) > INNER);
}

// ٣) التماثل حول الصفر: قيمتان متعاكستان بنفس الامتداد على جانبيه بالضبط
{
  const maxAbs = 3;
  for (const mag of [0, 0.5, 1, 2, 3]) {
    const hp = centeredBarH(mag, maxAbs, PANE_H);
    const hn = centeredBarH(-mag, maxAbs, PANE_H);
    assert.equal(hp, hn, `mag=${mag}`);
    const topP = centeredBarTop(mag, hp, PANE_H);
    const topN = centeredBarTop(-mag, hn, PANE_H);
    const zeroY = centeredPaneZeroY(PANE_H);
    // الموجب ينتهي عند الصفر، والسالب يبدأ منه (بهامش فاصلة عائمة — المقارنة هندسية لا بتّية)
    assert.ok(near(topP + hp, zeroY), `mag=${mag} bottom=${topP + hp}`);
    assert.equal(topN, zeroY, `mag=${mag}`);
    // ومسافتاهما عن خطّ الصفر متساويتان
    assert.ok(near(zeroY - topP, topN + hn - zeroY), `mag=${mag}`);
  }
}

// ٤) رتابة: كلّما كبرت القيمة المطلقة طال العمود، بلا قفزات
{
  const maxAbs = 10;
  let prev = -1;
  for (const mag of [0, 1, 2, 3, 5, 8, 10]) {
    const h = centeredBarH(mag, maxAbs, PANE_H);
    assert.ok(h > prev || (mag === 0 && h === 0), `mag=${mag} h=${h} prev=${prev}`);
    prev = h;
  }
  assert.equal(centeredBarH(0, maxAbs, PANE_H), 0);
  assert.equal(centeredBarH(maxAbs, maxAbs, PANE_H), HALF);
}

// ٥) الصفر بالضبط يُعامل كقيمة موجبة (v >= 0) — نفس السلوك السابق حرفياً، لا انحدار
{
  const h = centeredBarH(0, 4, PANE_H);
  assert.equal(h, 0);
  assert.equal(centeredBarTop(0, h, PANE_H), centeredPaneZeroY(PANE_H));
}

// ٦) المؤشرات المحصورة رياضياً بـ‎±1‎ (Twiggs MF، IFT-RSI) بـmaxAbs = 1
{
  assert.equal(centeredBarH(1, 1, PANE_H), HALF);
  assert.equal(centeredBarH(-1, 1, PANE_H), HALF);
  assert.equal(centeredBarH(0.5, 1, PANE_H), HALF / 2);
  // قيمة تتجاوز المدى النظري تُقصّ ولا تخرج
  assert.equal(centeredBarH(1.4, 1, PANE_H), HALF);
}

// ٧) مدخلات فاسدة: صفر لا NaN ولا قسمة على صفر
{
  for (const bad of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
    assert.equal(centeredBarH(bad, 5, PANE_H), 0, `v=${bad}`);
    assert.equal(centeredBarH(5, bad, PANE_H), 0, `max=${bad}`);
    assert.ok(Number.isFinite(centeredBarTop(bad, 3, PANE_H)), `top v=${bad}`);
    assert.ok(Number.isFinite(centeredBarTop(3, bad, PANE_H)), `top h=${bad}`);
  }
  assert.equal(centeredBarH(5, 0, PANE_H), 0, 'maxAbs=0 → لا قسمة على صفر');
  assert.equal(centeredBarH(5, -2, PANE_H), 0, 'maxAbs سالبة');
  // قيمة غير صالحة ← خطّ الصفر نفسه، لا موضع مخترَع
  assert.equal(centeredBarTop(Number.NaN, 3, PANE_H), centeredPaneZeroY(PANE_H));
}

// ٨) ارتفاعات لوحة حدّية: لا سالب ولا NaN بأيّ منها
{
  for (const ph of [0, -40, 8, 16, 17, Number.NaN, Number.POSITIVE_INFINITY]) {
    const inner = centeredPaneInnerH(ph);
    assert.ok(Number.isFinite(inner) || inner === Number.POSITIVE_INFINITY, `ph=${ph}`);
    assert.ok(inner >= 0, `ph=${ph} inner=${inner}`);
    const h = centeredBarH(2, 4, ph);
    const top = centeredBarTop(2, h, ph);
    assert.ok(h >= 0, `ph=${ph} h=${h}`);
    assert.ok(top >= 0, `ph=${ph} top=${top}`);
  }
  // لوحة أقصر من الحافة المحجوزة ← مساحة رسم صفرية وكل المواضع صفر (بلا سالب)
  assert.equal(centeredPaneInnerH(8), 0);
  assert.equal(centeredPaneZeroY(8), 0);
  assert.equal(centeredBarH(9, 3, 8), 0);
  assert.equal(centeredBarTop(9, 0, 8), 0);
  assert.equal(centeredPaneInnerH(16), 0);
  assert.equal(centeredPaneInnerH(17), 1);
}

// ٩) اتّساق مع هندسة MACD: نفس ثابت الحافة ونفس مركز مساحة الرسم
{
  // macdPaneGeom يعرّف zeroY = (paneH − 16) / 2 — يجب أن يطابق تعريفنا حرفياً لكل ارتفاع
  for (const ph of [24, 40, 44, 60, 88, 120]) {
    assert.equal(centeredPaneZeroY(ph), Math.max(0, ph - 16) / 2, `ph=${ph}`);
  }
}

console.log('centeredPane.selftest: PASS');
