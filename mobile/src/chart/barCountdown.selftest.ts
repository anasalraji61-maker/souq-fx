/**
 * Self-test for barCloseCountdown (pure).
 * Run: npx --yes tsx src/chart/barCountdown.selftest.ts
 */
import assert from 'node:assert/strict';
import { barCloseCountdown } from './barCountdown';

const open = 1_760_000_000; // ثوانٍ
const at = (secAfterOpen: number) => (open + secAfterOpen) * 1000;

// 15 دقيقة: بعد 3:18 من الافتتاح يبقى 11:42
assert.equal(barCloseCountdown(open, 900, at(198)), '11:42');
// كسور الثانية تُقرَّب لأعلى: لا «0:00» والشمعة لم تُغلق
assert.equal(barCloseCountdown(open, 60, at(59.4)), '0:01');
// الدقيقة: أول ثانية
assert.equal(barCloseCountdown(open, 60, at(0)), '1:00');
// 4H: ساعات
assert.equal(barCloseCountdown(open, 14400, at(3600 + 125)), '2:57:55');
// اليومي
assert.equal(barCloseCountdown(open, 86400, at(1)), '23:59:59');
// زمن بالمللي ثانية كما يصل من بعض المصادر
assert.equal(barCloseCountdown(open * 1000, 900, at(198)), '11:42');
// أُغلقت الشمعة ولم تصل تاليتها (عطلة/انقطاع) ⇒ لا عدّاد
assert.equal(barCloseCountdown(open, 900, at(900)), null);
assert.equal(barCloseCountdown(open, 900, at(3 * 86400)), null);
// ساعة الجهاز متأخّرة عن الخادم ⇒ رقم مستحيل لا يُعرض
assert.equal(barCloseCountdown(open, 900, at(-60)), null);
// الأسبوعي ⇒ لا عدّاد
assert.equal(barCloseCountdown(open, 604800, at(10)), null);
// مدخلات غير صالحة
assert.equal(barCloseCountdown(NaN, 900, at(10)), null);
assert.equal(barCloseCountdown(open, 0, at(10)), null);

console.log('barCountdown.selftest: PASS');
