/**
 * Self-test: إزاحة سحابة Ichimoku والخطّ المتأخر displacement−1 (25) كـTradingView لا 26.
 * Run: npx --yes tsx src/chart/ichimokuShift.selftest.ts
 */
import assert from 'node:assert/strict';
import type { Candle } from '../api';
import { computeAlligator, computeIchimoku } from './indicators/trend';

// شمعة i: أعلى=أدنى=إغلاق=i ⇒ Tenkan/Kijun/SpanB الخام = منتصف نافذة منتهية عند i
const candles: Candle[] = [];
for (let i = 0; i < 120; i++) candles.push({ time: i * 3600, open: i, high: i, low: i, close: i } as Candle);
const { tenkan, kijun, spanA, spanB, chikou, lead } = computeIchimoku(candles);

// الخام عند 74: Tenkan=(66+74)/2=70، Kijun=(49+74)/2=61.5 ⇒ SpanA=65.75؛ SpanB عند 74=(23+74)/2=48.5
assert.equal(tenkan[74], 70);
assert.equal(kijun[74], 61.5);
assert.equal(spanA[99], 65.75, 'span A of bar 74 plotted on bar 99 (+25)');
assert.equal(spanB[99], 48.5, 'span B of bar 74 plotted on bar 99 (+25)');
// أوّل قيمة للسحابة: SpanA الخام يبدأ عند 25 ⇒ يظهر عند 50؛ SpanB الخام عند 51 ⇒ 76
assert.equal(spanA[49], null);
assert.notEqual(spanA[50], null);
assert.equal(spanB[75], null);
assert.notEqual(spanB[76], null);
// المتأخر: إغلاق الشمعة 99 مرسوم عند 74 (−25)، وآخر 25 شمعة بلا متأخر
assert.equal(chikou[74], 99);
assert.equal(chikou[94], 119);
assert.equal(chikou[95], null);

// السحابة المُسقَطة: 25 خانة بعد آخر شمعة (119)، الخانة 120+k من الخام عند 95+k
assert.equal(lead.spanA.length, 25);
assert.equal(lead.spanB.length, 25);
// الخام عند 95: Tenkan=(87+95)/2=91، Kijun=(70+95)/2=82.5 ⇒ 86.75؛ SpanB=(44+95)/2=69.5
assert.equal(lead.spanA[0], 86.75, 'raw of bar 95 plotted on slot 120');
assert.equal(lead.spanB[0], 69.5);
// آخر خانة (144) = خام آخر شمعة 119: Tenkan=115، Kijun=106.5 ⇒ 110.75
assert.equal(lead.spanA[24], 110.75);
// الاستمرارية: الخانة 119 (آخر مرسومة) خام 94، والخانة 120 خام 95
assert.equal(spanA[119], 85.75);
// تاريخ قصير: الخام غير معرَّف ⇒ null لا استثناء
const short = computeIchimoku(candles.slice(0, 30));
assert.equal(short.lead.spanB.every((v) => v == null), true);
assert.equal(short.lead.spanA[0], null);

// Alligator: الخطوط المُزاحة تكمل بعد آخر شمعة بلا فجوة — الخانة 120+k = الخام عند 120−shift+k
const al = computeAlligator(candles);
assert.deepEqual([al.lead.jaw.length, al.lead.teeth.length, al.lead.lips.length], [8, 5, 3]);
const alFull = computeAlligator([...candles, ...Array.from({ length: 8 }, (_, k) => ({ ...candles[119], time: (120 + k) * 3600 }))]);
// الخانات 120..127 بسلسلة أطول تعتمد على خام ≤119 فقط ⇒ تطابق الإسقاط
for (let k = 0; k < 8; k++) assert.equal(al.lead.jaw[k], alFull.jaw[120 + k]);
for (let k = 0; k < 3; k++) assert.equal(al.lead.lips[k], alFull.lips[120 + k]);

console.log('ichimokuShift selftest PASS');
