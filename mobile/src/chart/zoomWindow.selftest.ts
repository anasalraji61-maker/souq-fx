/**
 * Self-test for zoomWindow (pure).
 * Run: npx --yes tsx src/chart/zoomWindow.selftest.ts
 */
import assert from 'node:assert/strict';
import { pinchSpread, pinchWindow, zoomWindow } from './zoomWindow';

// يتابع الحيّ: الطرف الأيمن مثبَّت بالتكبير والتصغير
assert.deepEqual(zoomWindow(500, 80, 0, 0.8), { count: 64, offset: 0 });
assert.deepEqual(zoomWindow(500, 80, 0, 1.25), { count: 100, offset: 0 });
// بعيداً عن الحيّ: حول المركز. النافذة [300,400) مركزها 350 ⇒ 64 شمعة [318,382)
assert.deepEqual(zoomWindow(500, 100, 100, 0.64), { count: 64, offset: 118 });
// التصغير حول المركز لا يتجاوز الطرف الأيمن: [440,490) ×4 ⇒ الطرف يُقيَّد بـ500
assert.deepEqual(zoomWindow(500, 50, 10, 4), { count: 200, offset: 0 });
// خطوة شمعة على الأقلّ عند نافذة صغيرة
assert.deepEqual(zoomWindow(500, 3, 0, 0.8), { count: 2, offset: 0 });
assert.deepEqual(zoomWindow(500, 2, 0, 1.25), { count: 3, offset: 0 });
// الحدّان
assert.deepEqual(zoomWindow(500, 2, 0, 0.5), { count: 2, offset: 0 });
assert.deepEqual(zoomWindow(5000, 1000, 0, 1.25), { count: 1000, offset: 0 });
// لا تصغير فوق طول السلسلة: 180 شمعة ⇒ السقف 180، والضغطة + التالية تتحرّك فوراً
assert.deepEqual(zoomWindow(180, 156, 0, 1.25), { count: 180, offset: 0 });
assert.deepEqual(zoomWindow(180, 180, 0, 1.25), { count: 180, offset: 0 });
assert.deepEqual(zoomWindow(180, 1000, 0, 0.8), { count: 144, offset: 0 });
// نافذة أكبر من السلسلة (Renko بـ30 لبنة، العدد 80): أوّل تكبير يُرى
assert.deepEqual(zoomWindow(30, 80, 0, 0.8), { count: 24, offset: 0 });
// سلسلة لم تُحمَّل بعد: الحدّ كما كان
assert.deepEqual(zoomWindow(0, 80, 0, 1.25), { count: 100, offset: 0 });
// مسحوباً لأقدم التاريخ (180 شمعة، إزاحة 170 ⇒ 10 معروضة من نافذة 80): التكبير من المعروض لا المخزَّن.
// كان «+» ⇒ {64, 116} (64 معروضة) والقرص ×2 ⇒ {40, 140} — التكبير يزيد الشموع.
{
  const z = zoomWindow(180, 80, 170, 0.8);
  assert.equal(z.count, 8);
  assert.ok(180 - z.offset <= 10, `window end stays at the oldest bars: ${JSON.stringify(z)}`);
  const p = pinchWindow(180, 80, 170, 100, 200, 0);
  assert.equal(p.count, 5);
  assert.ok(180 - p.offset <= 10, `pinch keeps the oldest bars: ${JSON.stringify(p)}`);
  // والتصغير من المعروض كذلك: 10 ⇒ 13 لا 100
  assert.equal(zoomWindow(180, 80, 170, 1.25).count, 13);
}
// عامل غير صالح لا يغيّر شيئاً
assert.deepEqual(zoomWindow(500, 80, 7, NaN), { count: 80, offset: 7 });
assert.deepEqual(zoomWindow(500, 80, 7, 1), { count: 80, offset: 7 });

// القرص: يتابع الحيّ ⇒ الطرف الأيمن مثبَّت
assert.deepEqual(pinchWindow(500, 80, 0, 100, 200, 0.5), { count: 40, offset: 0 });
assert.deepEqual(pinchWindow(500, 80, 0, 200, 100, 0.5), { count: 160, offset: 0 });
// العودة لتباعد البدء تعيد النافذة نفسها (حساب من حالة البدء لا تراكمي)
assert.deepEqual(pinchWindow(500, 80, 30, 100, 100, 0.3), { count: 80, offset: 30 });
// بعيداً عن الحيّ: الشمعة تحت الإصبعين تبقى. [300,400) ربعها 325 ⇒ [313,363) ربعها 325.5
assert.deepEqual(pinchWindow(500, 100, 100, 100, 200, 0.25), { count: 50, offset: 137 });
assert.deepEqual(pinchWindow(500, 100, 100, 100, 200, 1), { count: 50, offset: 100 });
// مقيَّد بطرفَي السلسلة
assert.deepEqual(pinchWindow(500, 50, 10, 100, 25, 0.9), { count: 200, offset: 0 });
assert.deepEqual(pinchWindow(500, 100, 390, 100, 25, 0), { count: 400, offset: 90 });
assert.deepEqual(pinchWindow(180, 150, 0, 100, 20, 0.5), { count: 180, offset: 0 });
assert.deepEqual(pinchWindow(500, 3, 0, 100, 1000, 0.5), { count: 2, offset: 0 });
// تباعد غير صالح لا يغيّر شيئاً
assert.deepEqual(pinchWindow(500, 80, 5, 0, 100, 0.5), { count: 80, offset: 5 });
assert.deepEqual(pinchWindow(500, 80, 5, 100, NaN, 0.5), { count: 80, offset: 5 });
// إصبعان متلاصقان أو على خطّ عمودي واحد: الحدّ الأدنى لا صفر
assert.equal(pinchSpread(10, 12), 24);
assert.equal(pinchSpread(200, 100), 100);
assert.equal(pinchSpread(NaN, 1), 24);

console.log('zoomWindow.selftest: PASS');

// عجلة الفأرة حول المؤشّر: النافذة [300,400)، المؤشّر عند الربع (الشمعة 325) ⇒ بعد ×0.64 تبقى 325 عند الربع
{
  const z = zoomWindow(500, 100, 100, 0.64, undefined, undefined, 0.25);
  assert.equal(z.count, 64);
  const start = 500 - z.offset - z.count;
  assert.ok(Math.abs(start + 0.25 * z.count - 325) <= 1, `bar under the cursor stays put: ${JSON.stringify(z)}`);
  // البؤرة الافتراضية = المركز كما كان
  assert.deepEqual(zoomWindow(500, 100, 100, 0.64, undefined, undefined, 0.5), { count: 64, offset: 118 });
  // يتابع الحيّ: الطرف الأيمن مثبَّت أياً كان موضع المؤشّر
  assert.deepEqual(zoomWindow(500, 80, 0, 0.8, undefined, undefined, 0.1), { count: 64, offset: 0 });
  // بؤرة خارج اللوح أو NaN تُقيَّد
  assert.deepEqual(zoomWindow(500, 100, 100, 0.64, undefined, undefined, NaN), { count: 64, offset: 118 });
  const edge = zoomWindow(500, 100, 100, 0.64, undefined, undefined, 5);
  assert.equal(500 - edge.offset, 400, `focus clamps to the right edge: ${JSON.stringify(edge)}`);
}
