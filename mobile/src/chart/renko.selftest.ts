/**
 * Self-test: Renko تقليدي كـTradingView — مصدر الإغلاق، انعكاس بصندوقين، فتائل من أطراف ما بين اللبنات.
 * Run: npx --yes tsx src/chart/renko.selftest.ts
 */
import assert from 'node:assert/strict';
import type { Candle } from '../api';
import { renko, renkoAtrBox } from './renko';
import { computeAtr } from './indicators/volatility';

const bar = (i: number, close: number, high = close, low = close): Candle =>
  ({ time: i * 60, open: close, high, low, close, volume: 1 }) as Candle;

// صندوق 1، أساس 10: صعود لـ13 ⇒ 3 لبنات صاعدة 10→11→12→13
let b = renko([bar(0, 10), bar(1, 13)], 1);
assert.deepEqual(b.map((x) => [x.open, x.close]), [[10, 11], [11, 12], [12, 13]]);

// تراجع صندوق واحد (13→12) لا يعكس؛ صندوقان (→11) يعكس: لبنة هابطة من فتح آخر صاعدة 12→11
b = renko([bar(0, 10), bar(1, 13), bar(2, 12)], 1);
assert.equal(b.length, 3, 'one-box pullback is not a reversal');
b = renko([bar(0, 10), bar(1, 13), bar(2, 11)], 1);
assert.deepEqual(b.map((x) => [x.open, x.close]), [[10, 11], [11, 12], [12, 13], [12, 11]]);

// فتيل ضخم بلا إغلاق خلفه لا يصنع لبنات (كان high/low يرسم لبنة صعود وهبوط متراكبتين)
b = renko([bar(0, 10), bar(1, 10.5, 12.5, 8.2)], 1);
assert.equal(b.length, 2, 'fallback: no bricks ⇒ source candles');
assert.equal(b[0].close, 10);

// الفتيل: أدنى ما بلغه السعر قبل اللبنة الصاعدة يظهر ذيلاً سفلياً لأوّلها فقط
b = renko([bar(0, 10), bar(1, 10.2, 10.4, 9.4), bar(2, 12)], 1);
assert.deepEqual(b.map((x) => [x.open, x.close]), [[10, 11], [11, 12]]);
assert.equal(b[0].low, 9.4);
assert.equal(b[1].low, 11);
assert.equal(b[1].srcTime, 120);

// هبوط ثم انعكاس صعود بصندوقين من إغلاق الهابطة
b = renko([bar(0, 10), bar(1, 8), bar(2, 9), bar(3, 10)], 1);
assert.deepEqual(b.map((x) => [x.open, x.close]), [[10, 9], [9, 8], [9, 10]]);

// الصندوق الافتراضي = ATR(14) Wilder على آخر شمعة مغلقة — تيك الحيّة لا يغيّره
const hist: Candle[] = [];
for (let i = 0; i < 40; i++) hist.push({ time: i * 60, open: 1, high: 1 + 0.001 * (1 + (i % 3)), low: 1, close: 1.0005 } as Candle);
const want = computeAtr(hist.slice(0, 39))[38]!;
assert.equal(renkoAtrBox(hist), want);
const spiked = hist.slice(0, 39).concat({ ...hist[39], high: 1.05 });
assert.equal(renkoAtrBox(spiked), want, 'live candle spike leaves the box alone');
assert.ok(renkoAtrBox(hist.slice(0, 5)) > 0, 'short history falls back to mean TR');

// تجمّد: 20 شمعة عادية ثم 400 مسطّحة ⇒ ATR بتنعيم Wilder ~1e-16 ⇒ شمعة حيّة +20 pip كانت ملايين اللبنات.
const flatHist: Candle[] = [];
for (let i = 0; i < 20; i++) flatHist.push(bar(i, 1.1 + (i % 3) * 0.0004, 1.1 + (i % 3) * 0.0004 + 0.0005, 1.1 + (i % 3) * 0.0004 - 0.0005));
for (let i = 20; i < 420; i++) flatHist.push(bar(i, 1.1));
flatHist.push(bar(420, 1.1));
const t0 = Date.now();
const frozen = renko([...flatHist, bar(421, 1.102, 1.102, 1.1)]);
assert.ok(Date.now() - t0 < 1000, 'flat flatHistory then a live move must not freeze');
assert.ok(renkoAtrBox(flatHist) >= 1.1 * 5e-5 * 0.999, 'box floor relative to price');
assert.ok(frozen.length <= 5000);
// صندوق صريح صغير جداً: القفزة مسقوفة، واللبنات متّصلة وتنتهي عند آخر صندوق تحت السعر.
const tiny = renko([bar(0, 1), bar(1, 2)], 1e-6);
assert.equal(tiny.length, 5000);
assert.ok(Math.abs(tiny[tiny.length - 1]!.close - 2) < 2e-6);
assert.ok(tiny.every((x, i) => i === 0 || Math.abs(x.open - tiny[i - 1]!.close) < 1e-9));
const tinyDn = renko([bar(0, 2), bar(1, 1)], 1e-6);
assert.equal(tinyDn.length, 5000);
assert.ok(tinyDn.every((x) => x.close < x.open));

console.log('renko selftest PASS');

// الفوليوم: ما بين اللبنات يُجمَع ويُقسَم على لبنات الدفعة — المجموع محفوظ (كان 1000×3 وضياع 500 و700)
{
  const v = (i: number, close: number, volume: number): Candle => ({ time: i * 60, open: close, high: close, low: close, close, volume }) as Candle;
  const vb = renko([v(0, 1.1, 100), v(1, 1.1004, 500), v(2, 1.1008, 700), v(3, 1.103, 1000)], 0.001);
  assert.equal(vb.length, 3);
  const total = vb.reduce((s, x) => s + (x.volume ?? 0), 0);
  assert.ok(Math.abs(total - 2300) < 1e-9, `renko volume conserved: ${total}`);
  assert.ok(vb.every((x) => Math.abs((x.volume ?? 0) - 2300 / 3) < 1e-9));
}
