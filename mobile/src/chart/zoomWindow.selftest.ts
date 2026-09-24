/**
 * Self-test for zoomWindow (pure).
 * Run: npx --yes tsx src/chart/zoomWindow.selftest.ts
 */
import assert from 'node:assert/strict';
import { zoomWindow } from './zoomWindow';

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
// عامل غير صالح لا يغيّر شيئاً
assert.deepEqual(zoomWindow(500, 80, 7, NaN), { count: 80, offset: 7 });
assert.deepEqual(zoomWindow(500, 80, 7, 1), { count: 80, offset: 7 });

console.log('zoomWindow.selftest: PASS');
