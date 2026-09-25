/**
 * Self-test for watermark (pure).
 * Run: npx --yes tsx src/chart/watermark.selftest.ts
 */
import assert from 'node:assert/strict';
import { watermarkFontSize, watermarkSymbol } from './watermark';

assert.equal(watermarkSymbol('EURUSD'), 'EUR/USD');
assert.equal(watermarkSymbol('USDJPY'), 'USD/JPY');
assert.equal(watermarkSymbol('XAUUSD'), 'XAU/USD');
// لاحقة الحساب تبقى: اسم الوسيط هو ما يبحث عنه المتداول
assert.equal(watermarkSymbol('EURUSDc'), 'EURUSDc');
// ليست زوجاً معروفاً ⇒ كما هي (لا «BTC/USD» لرمز بلا مواصفة، لا «DXY/…»)
assert.equal(watermarkSymbol('DXY'), 'DXY');

// هاتف: لوح 360×300 ⇒ خطّ مقروء بلا طغيان
const phone = watermarkFontSize(360, 300, 'EUR/USD');
assert.ok(phone != null && phone >= 20 && phone <= 46, `phone ${phone}`);
// لوح قصير: الارتفاع يحدّ الحجم
assert.ok((watermarkFontSize(800, 100, 'EUR/USD') ?? 99) <= 22);
// خلية صغيرة جداً ⇒ لا علامة
assert.equal(watermarkFontSize(120, 200, 'EUR/USD'), null);
assert.equal(watermarkFontSize(300, 60, 'EUR/USD'), null);
// سقف
assert.equal(watermarkFontSize(2000, 1000, 'EUR/USD'), 46);

console.log('watermark selftest: PASS');
