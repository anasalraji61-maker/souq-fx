/**
 * Self-test for Klinger Oscillator (pure) — صيغة TradingView: sv = ±volume بإشارة تغيّر hlc3.
 * Run: npx --yes tsx src/chart/klingerTv.selftest.ts
 */
import assert from 'node:assert/strict';
import { computeKlinger } from './indicators/volume';

const bar = (i: number, p: number, volume: number) => ({
  time: i * 60,
  open: p,
  high: p,
  low: p,
  close: p,
  volume,
});

// سعر ثابت ⇒ sv = +100 من الشمعة الثانية؛ الأولى −100 (بلا تغيّر سابق) تبقى داخل بذرتي EMA فقط.
const flat = Array.from({ length: 200 }, (_, i) => bar(i, 1.1, 100));
const f = computeKlinger(flat);
assert.equal(f.kvo[52], null, 'EMA55 warm-up');
assert.ok(f.kvo[54] != null, 'first kvo at bar 54');
// أثر الشمعة الأولى يتلاشى أسّياً (كـTradingView) ⇒ قرب الصفر لا صفر حرفي.
assert.ok(Math.abs(f.kvo[199]!) < 0.1 && Math.abs(f.kvo[199]!) < Math.abs(f.kvo[60]!), `flat kvo ${f.kvo[199]}`);
assert.ok(Math.abs(f.signal[199]!) < 0.1, `flat signal ${f.signal[199]}`);

// صعود دائم بعد هبوط دائم: sv يقفز من −v إلى +v ⇒ EMA34 تلحق أسرع من EMA55 ⇒ kvo > 0 ويحدّه ‎2v‎.
const vShape = Array.from({ length: 200 }, (_, i) => bar(i, i < 100 ? 2 - i * 0.001 : 1.9 + i * 0.001, 50));
const k = computeKlinger(vShape);
assert.ok(Math.abs(k.kvo[99]!) < 1, `down leg steady kvo ${k.kvo[99]}`);
assert.ok(k.kvo[120]! > 0 && k.kvo[120]! < 100, `up turn kvo ${k.kvo[120]}`);
// صيغة القوّة الكاملة القديمة (×100 × |2dm/cm−1|) كانت تعطي 0 هنا (dm = 0) — الجديدة تتبع الحجم كـTradingView.
console.log('klingerTv selftest PASS');
