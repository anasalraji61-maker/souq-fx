/**
 * Self-test: أسعار تحت 0.01 بأربعة أرقام معنوية على الأقل (SHIBUSD كان «0.00001» بكل المحور والتقاطع).
 * Run: npx --yes tsx src/chart/cheapPrice.selftest.ts
 */
import assert from 'node:assert/strict';
import { crossPriceAt } from './crossAnchor';
import { formatPrice, formatPriceDiff, magnitudeDecimals, stickyPriceRef } from './indicators/utils';

// ما فوق 0.01 كما كان تماماً
assert.equal(magnitudeDecimals(2650), 2);
assert.equal(magnitudeDecimals(99.8), 3);
assert.equal(magnitudeDecimals(1.085), 5);
assert.equal(magnitudeDecimals(0.15), 5);
assert.equal(magnitudeDecimals(0.01), 5);
assert.equal(magnitudeDecimals(0), 5);
assert.equal(magnitudeDecimals(NaN), 5);
// تحت 0.01
assert.equal(magnitudeDecimals(0.005), 6);
assert.equal(magnitudeDecimals(0.001), 7);
assert.equal(magnitudeDecimals(0.00001234), 8);
assert.equal(magnitudeDecimals(0.0000089), 9);
assert.equal(magnitudeDecimals(1e-15), 19);
assert.equal(magnitudeDecimals(1.23e-9), 12);
assert.equal(formatPrice(1.23e-9), '0.000000001230');
assert.equal(magnitudeDecimals(1e-30), 20);

// SHIBUSD: المحور والتقاطع يميّزان علامتين متجاورتين
assert.equal(formatPrice(0.00001234, 'SHIBUSD'), '0.00001234');
assert.notEqual(formatPrice(0.00001234, 'SHIBUSD', 0.0000123), formatPrice(0.00001251, 'SHIBUSD', 0.0000123));
// المنازل من سعر الأداة لا من الرقم: علامة 0.0000099 على محور سعره 0.0000123 بثماني منازل أيضاً
assert.equal(formatPrice(0.0000099, 'SHIBUSD', 0.0000123), '0.00000990');
// فرق القياس بمنازل السعر
assert.equal(formatPriceDiff(0.00000017, 0.00001234, 'SHIBUSD'), '0.00000017');
// التقاطع لا يلتصق بصفر
assert.equal(crossPriceAt(0.0000089123, null, false, null, Infinity, 0.0000089), 0.000008912);
// الأزواج بمواصفتها لا تتأثّر
assert.equal(formatPrice(1.085054, 'EURUSD'), '1.08505');
assert.equal(formatPrice(157.4234, 'USDJPY'), '157.423');

console.log('cheapPrice selftest: PASS');

// مؤشّر الدولار بأسماء الوسطاء — ثلاث منازل كـDXY (كانت 104.24)
for (const s of ['DXY', 'USDX', 'USDINDEX', 'DXY.f', 'TVC:DXY', 'usdindex.cash']) {
  assert.equal(formatPrice(104.2351, s), '104.235', s);
}
assert.equal(formatPrice(104.2351, 'USDCHF'), '104.23510');
// سالب يُقرَّب لصفر بلا إشارة
assert.equal(formatPrice(-0.000001, 'EURUSD'), '0.00000');
assert.equal(formatPrice(-0.00012, 'EURUSD'), '-0.00012');
assert.equal(formatPrice(-2.5, 'US30', 40000), '-2.50');
console.log('cheapPrice DXY/negative-zero OK');
// الفورنت ثلاث منازل كوسطاء MT5 (كانت 350.12)؛ HUF أساساً لا مقاماً ⇒ بلا تغيير.
for (const s of ['USDHUF', 'EURHUF.m', 'USDHUFc', 'TVC:USDHUF']) assert.equal(formatPrice(350.1234, s), '350.123');
assert.equal(formatPrice(350.1234, 'HUFJPY'), '350.12');
console.log('cheapPrice HUF OK');

// مرجع المنازل الثابت (`stickyPriceRef`): LTCUSD يعبر 100 ذهاباً وإياباً ⇒ المنازل لا تقفز
{
  let r = stickyPriceRef(null, 99.98);
  assert.equal(r, 99.98);
  r = stickyPriceRef(r, 100.01);
  assert.equal(r, 99.98);
  assert.equal(formatPrice(99.954, 'LTCUSD', r), '99.954');
  assert.equal(formatPrice(100.012, 'LTCUSD', r), '100.012');
  // حركة بحجم عقد ⇒ مرجع جديد
  assert.equal(stickyPriceRef(99.98, 450), 450);
  assert.equal(stickyPriceRef(99.98, 20), 20);
  // سعر غير صالح ⇒ يبقى السابق
  assert.equal(stickyPriceRef(99.98, null), 99.98);
  assert.equal(stickyPriceRef(null, NaN), null);
}
