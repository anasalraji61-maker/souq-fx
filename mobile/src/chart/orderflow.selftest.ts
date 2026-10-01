/**
 * تشغيل: npx tsx src/chart/orderflow.selftest.ts
 */
import assert from 'node:assert/strict';
import type { Candle } from '../api';
import { computeCvd, computeFootprint } from './orderflow';

const c = (o: number, h: number, l: number, cl: number) =>
  ({ time: 0, open: o, high: h, low: l, close: cl, volume: 1000 }) as Candle & { volume: number };

const [bull, bear, thinGreen, doji] = computeFootprint([
  c(1.1, 1.101, 1.1, 1.101),
  c(1.101, 1.101, 1.1, 1.1),
  c(1.1, 1.101, 1.1, 1.1001),
  c(1.1005, 1.101, 1.1, 1.1005),
]);
// شمعة هابطة كاملة مرآة الصاعدة (كانت −500 مقابل +800)
assert.ok(Math.abs(bull.delta - 800) < 1e-6 && Math.abs(bear.delta + 800) < 1e-6);
// جسم أخضر رفيع لا يُقرأ بيعاً (كان −10)
assert.ok(thinGreen.delta > 0);
assert.equal(doji.delta, 0);
// دوجي لا يدفع CVD (كان +1000 لكل واحدة)
assert.deepEqual(computeCvd([doji, doji].map(() => c(1.1005, 1.101, 1.1, 1.1005))), [0, 0]);
// حجم صفري لا يعطي NaN
assert.equal(computeFootprint([{ ...c(1, 1, 1, 1), volume: 0 }])[0].imbalance, 0);
console.log('orderflow selftest PASS');
