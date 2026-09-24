/** فحص ذاتي لـ`holdView.ts` — يُشغَّل بـNode بلا شجرة مكوّنات. */
import assert from 'node:assert/strict';
import { appendedAfter } from './holdView';

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

console.log('holdView.selftest: PASS');
