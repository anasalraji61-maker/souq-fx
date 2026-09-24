/**
 * Self-test for axisDrag (pure).
 * Run: npx --yes tsx src/chart/axisDrag.selftest.ts
 */
import assert from 'node:assert/strict';
import {
  AXIS_DRAG_K,
  isDoubleTap,
  priceAxisDragScale,
  timeAxisDragWindow,
} from './axisDrag';

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≈ ${b}`);

// لأسفل ⇒ ضغط (مقياس أكبر = مدى أوسع)، لأعلى ⇒ مطّ
near(priceAxisDragScale(1, 100), Math.exp(100 * AXIS_DRAG_K));
assert.ok(priceAxisDragScale(1, 100) > 1);
assert.ok(priceAxisDragScale(1, -100) < 1);
// من حالة البدء: العودة للموضع ⇒ المقياس نفسه
near(priceAxisDragScale(2.5, 0), 2.5);
near(priceAxisDragScale(priceAxisDragScale(1, 80), -80), priceAxisDragScale(1, 80) * Math.exp(-80 * AXIS_DRAG_K));
// الحدّان كحدّي عجلة الويب
assert.equal(priceAxisDragScale(1, 100000), 200);
assert.equal(priceAxisDragScale(1, -100000), 0.01);
// مدخلات تالفة لا تفسد المقياس
assert.equal(priceAxisDragScale(NaN, 50) > 0, true);
assert.equal(priceAxisDragScale(1.5, NaN), 1.5);
assert.equal(priceAxisDragScale(0, 0), 1);

// محور الزمن: يميناً ⇒ شموع أقلّ، يساراً ⇒ أكثر، والطرف الأيمن مثبَّت
{
  const r = timeAxisDragWindow(500, 80, 0, 100);
  assert.ok(r.count < 80);
  assert.equal(r.offset, 0);
  const l = timeAxisDragWindow(500, 80, 0, -100);
  assert.ok(l.count > 80);
  assert.equal(l.offset, 0);
}
// بعيداً عن الحيّ: الطرف الأيمن (الشمعة عند يمين اللوح) باقٍ — الإزاحة كما هي
assert.deepEqual(timeAxisDragWindow(500, 100, 120, 60).offset, 120);
assert.deepEqual(timeAxisDragWindow(500, 100, 120, -60).offset, 120);
// لا يتجاوز طول السلسلة ولا يقلّ عن شمعتين
assert.equal(timeAxisDragWindow(180, 80, 0, -5000).count, 180);
assert.equal(timeAxisDragWindow(180, 80, 0, 5000).count, 2);
// تصغير يلمس أوّل التاريخ: الطرف الأيمن محفوظ ما أمكن، الإزاحة غير سالبة
{
  const z = timeAxisDragWindow(200, 100, 90, -400);
  assert.ok(z.offset >= 0 && z.count <= 200);
}
// بلا حركة ⇒ كما كان
assert.deepEqual(timeAxisDragWindow(500, 80, 7, 0), { count: 80, offset: 7 });
assert.deepEqual(timeAxisDragWindow(500, 80, 7, NaN), { count: 80, offset: 7 });

// نقرتان
assert.equal(isDoubleTap(null, { at: 100, x: 0, y: 0 }), false);
assert.equal(isDoubleTap({ at: 100, x: 10, y: 10 }, { at: 350, x: 20, y: 25 }), true);
assert.equal(isDoubleTap({ at: 100, x: 10, y: 10 }, { at: 500, x: 10, y: 10 }), false);
assert.equal(isDoubleTap({ at: 100, x: 10, y: 10 }, { at: 200, x: 10, y: 60 }), false);
// ساعة رجعت للخلف لا تُحسب نقرتين
assert.equal(isDoubleTap({ at: 500, x: 0, y: 0 }, { at: 400, x: 0, y: 0 }), false);

console.log('axisDrag selftest: PASS');
