/** فحص ذاتي لـ`holdView.ts` — يُشغَّل بـNode بلا شجرة مكوّنات. */
import assert from 'node:assert/strict';
import { appendedAfter, offsetAtTime, reanchorAhead } from './holdView';

// تيك داخل الشمعة نفسها ⇒ لا إضافة
assert.equal(appendedAfter(300, [0, 100, 200, 300]), 0);
// شمعة جديدة واحدة
assert.equal(appendedAfter(300, [0, 100, 200, 300, 400]), 1);
// جلب أضاف ثلاثاً (والسلسلة قُصّت من أوّلها — لا يهمّ)
assert.equal(appendedAfter(300, [200, 300, 400, 500, 600]), 3);
// الشمعة السابقة غير موجودة (رمز/فريم آخر، أو Renko أُعيد بناؤه) ⇒ 0
assert.equal(appendedAfter(350, [0, 100, 200, 300, 400]), 0);
assert.equal(appendedAfter(900, [0, 100]), 0);
// مدخل غير صالح
assert.equal(appendedAfter(null, [0, 100]), 0);
assert.equal(appendedAfter(NaN, [0, 100]), 0);
assert.equal(appendedAfter(100, []), 0);
// Renko: لبنتان من شمعة واحدة تحملان الزمن نفسه — تُعدّ من آخر ظهور
assert.equal(appendedAfter(300, [100, 200, 300, 300, 400]), 1);
// بالطول: لبنة جديدة من الشمعة نفسها (الزمن مكرَّر) تُعدّ
assert.equal(appendedAfter(300, [100, 200, 300, 300], 3), 1);
assert.equal(appendedAfter(300, [100, 200, 300, 300, 300], 3), 2);
// الطول لا يطابق (قُصّ من الأوّل) ⇒ البحث بالزمن
assert.equal(appendedAfter(300, [200, 300, 400], 4), 1);
assert.equal(appendedAfter(300, [200, 300, 400], 99), 1);

// تبديل النوع: الطرف الأيمن على الزمن نفسه. 30 شمعة كل 100ث، الطرف عند 1500 ⇒ 14 خانة بعده.
const candleTimes = Array.from({ length: 30 }, (_, i) => i * 100);
assert.equal(offsetAtTime(candleTimes, 1500), 14);
// Renko: لبنات أقلّ وأزمنة مكرّرة — آخر لبنة ≤ الطرف
const bricks = [0, 300, 300, 700, 1200, 1600, 2100, 2500, 2900];
assert.equal(offsetAtTime(bricks, 1500, 2), 4);
assert.equal(offsetAtTime(bricks, 2900, 2), 0);
// أقدم من السلسلة ⇒ أقصى إزاحة مسموحة؛ والقصّ يُبقي آخر `keep`
assert.equal(offsetAtTime(bricks, -5, 2), 7);
assert.equal(offsetAtTime(bricks, 300, 5), 4);
assert.equal(offsetAtTime([], 100), 0);
assert.equal(offsetAtTime(bricks, null), 0);
// تقاطع بالمستقبل: 3 خانات بعد الأخيرة (فهرس 9 من 10) ثم شمعة جديدة ⇒ الخانة نفسها = الأخيرة الجديدة + 2
assert.deepEqual(reanchorAhead(3, 1, 11), { index: 10, ahead: 2 });
// خانة +1 صارت الشمعة الجديدة نفسها ⇒ عليها بلا ahead
assert.deepEqual(reanchorAhead(1, 1, 11), { index: 10, ahead: 0 });
// جلب أضاف 3 شموع والتقاطع +2 ⇒ الشمعة الثانية من المضافة (فهرس 9+2)
assert.deepEqual(reanchorAhead(2, 3, 13), { index: 11, ahead: 0 });
assert.equal(reanchorAhead(0, 1, 11), null);
assert.equal(reanchorAhead(3, 0, 11), null);
assert.equal(reanchorAhead(3, 5, 5), null);
console.log('holdView.selftest: PASS');
