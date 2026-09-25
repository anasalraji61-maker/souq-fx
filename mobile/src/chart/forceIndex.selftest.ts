/** فحص ذاتي لبذرة `computeForceIndex` — يُشغَّل بـNode بلا شجرة مكوّنات. */
import assert from 'node:assert/strict';
import { computeForceIndex } from './indicators/volume';

// كـTradingView: `ta.ema(ta.change(close) * volume, 13)` — الشمعة 0 بلا تغيّر (na) ⇒ أوّل قيمة عند 13
// وهي متوسّط الخام 1..13 بالضبط (لا 0..12 مع صفر مختلَق).
const closes = Array.from({ length: 40 }, (_, i) => 1.1 + i * 0.001 + (i % 3) * 0.0004);
const candles = closes.map((c, i) => ({ time: i * 60, open: c, high: c + 0.001, low: c - 0.001, close: c, volume: 100 + i }));
const fi = computeForceIndex(candles, 13);
assert.equal(fi[12], null, 'لا قيمة قبل 13 تغيّراً');
let s = 0;
for (let i = 1; i <= 13; i++) s += (closes[i] - closes[i - 1]) * (100 + i);
assert.ok(fi[13] != null && Math.abs(fi[13] - s / 13) < 1e-12, `البذرة = متوسّط 1..13: ${fi[13]} ≈ ${s / 13}`);

console.log('forceIndex.selftest: PASS');
