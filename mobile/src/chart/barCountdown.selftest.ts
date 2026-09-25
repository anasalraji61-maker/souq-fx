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

// ساعات السوق (مع الرمز): يومية الجمعة 2026-09-25 (مختومة 00:00 UTC، توقيت صيفي ⇒ الإغلاق 21:00 UTC)
const friD = Date.UTC(2026, 8, 25) / 1000;
const utc = (d: number, h: number, m = 0) => Date.UTC(2026, 8, d, h, m);
assert.equal(barCloseCountdown(friD, 86400, utc(25, 12), 'EURUSD'), '9:00:00');
assert.equal(barCloseCountdown(friD, 86400, utc(25, 12)), '12:00:00'); // بلا رمز كما كان
// بعد الإغلاق: لا عدّاد (كان يعدّ حتى منتصف الليل)
assert.equal(barCloseCountdown(friD, 86400, utc(25, 21, 30), 'EURUSD'), null);
// 4H الساعة 20:00 الجمعة ⇒ ساعة واحدة حتى الإغلاق لا أربع
assert.equal(barCloseCountdown(friD + 20 * 3600, 14400, utc(25, 20), 'EURUSD'), '1:00:00');
// الكريبتو لا يُغلق
assert.equal(barCloseCountdown(friD, 86400, utc(25, 21, 30), 'BTCUSD'), '2:30:00');
// شتاءً الإغلاق 22:00 UTC: الجمعة 2026-12-04 الساعة 21:30 ما زال مفتوحاً
const friW = Date.UTC(2026, 11, 4) / 1000;
assert.equal(barCloseCountdown(friW, 86400, Date.UTC(2026, 11, 4, 21, 30), 'EURUSD'), '30:00');

// عشيّة الميلاد (الخميس 2026-12-24، إغلاق 22:00 UTC حتى 26): 4H الساعة 20:00 ⇒ ساعتان لا أربع
const xmasEve = Date.UTC(2026, 11, 24) / 1000;
assert.equal(barCloseCountdown(xmasEve + 20 * 3600, 14400, Date.UTC(2026, 11, 24, 20), 'EURUSD'), '2:00:00');
assert.equal(barCloseCountdown(xmasEve, 86400, Date.UTC(2026, 11, 24, 12), 'EURUSD'), '10:00:00');
// اليوم السابق عادي
assert.equal(barCloseCountdown(xmasEve - 86400, 86400, Date.UTC(2026, 11, 23, 12), 'EURUSD'), '12:00:00');

// كسر ICE اليومي: DXY صيفاً يُغلق 21:00 UTC (حتى 00:00) ⇒ 4H الساعة 20:00 تُغلق فعلياً 21:00 — كان «3:30:00»
const jul15 = Date.UTC(2026, 6, 15) / 1000;
assert.equal(barCloseCountdown(jul15 + 20 * 3600, 14400, Date.UTC(2026, 6, 15, 20, 30), 'DXY'), '30:00');
// شتاءً 22:00 UTC
const jan14 = Date.UTC(2026, 0, 14) / 1000;
assert.equal(barCloseCountdown(jan14 + 20 * 3600, 14400, Date.UTC(2026, 0, 14, 21, 30), 'DXY'), '30:00');
// برنت صيفاً: الكسر 22:00–00:00 UTC
assert.equal(barCloseCountdown(jul15 + 20 * 3600, 14400, Date.UTC(2026, 6, 15, 21, 30), 'UKOIL'), '30:00');
// شمعة تنتهي قبل الكسر لا تتأثّر، واليورو بلا كسر ICE
assert.equal(barCloseCountdown(jul15 + 16 * 3600, 14400, Date.UTC(2026, 6, 15, 18), 'DXY'), '2:00:00');
assert.equal(barCloseCountdown(jul15 + 20 * 3600, 14400, Date.UTC(2026, 6, 15, 20, 30), 'EURUSD'), '3:30:00');

console.log('barCountdown.selftest: PASS');
