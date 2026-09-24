/**
 * Self-test: إزاحة سحابة Ichimoku والخطّ المتأخر displacement−1 (25) كـTradingView لا 26.
 * Run: npx --yes tsx src/chart/ichimokuShift.selftest.ts
 */
import assert from 'node:assert/strict';
import type { Candle } from '../api';
import { computeIchimoku } from './indicators/trend';

// شمعة i: أعلى=أدنى=إغلاق=i ⇒ Tenkan/Kijun/SpanB الخام = منتصف نافذة منتهية عند i
const candles: Candle[] = [];
for (let i = 0; i < 120; i++) candles.push({ time: i * 3600, open: i, high: i, low: i, close: i } as Candle);
const { tenkan, kijun, spanA, spanB, chikou } = computeIchimoku(candles);

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

console.log('ichimokuShift selftest PASS');
