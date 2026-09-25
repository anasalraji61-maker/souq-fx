/**
 * Self-test for lineBreak (pure).
 * Run: npx --yes tsx src/chart/lineBreak.selftest.ts
 */
import assert from 'node:assert/strict';
import { lineBreak } from './lineBreak';
import type { SyntheticBar } from './types';

const bars = (closes: number[]) =>
  closes.map((c, i) => ({ time: 1000 + i * 900, open: i ? closes[i - 1]! : 1, high: c, low: c, close: c, volume: 1 }));

// 1 → 2 → 3 → 4 صاعدة: أربعة خطوط متتالية، كلّ من إغلاق السابق.
{
  const lb = lineBreak(bars([1, 2, 3, 4])) as SyntheticBar[];
  assert.deepEqual(lb.map((b) => [b.open, b.close]), [[1, 2], [2, 3], [3, 4]]);
  assert.equal(lb[0]!.srcTime, 1900);
  assert.equal(lb[1]!.time - lb[0]!.time, 60);
}
// تراجع إلى 1.5 لا يكسر أدنى آخر 3 خطوط (1) ⇒ لا خطّ؛ 0.5 يكسره ⇒ هابط من أصل آخر خطّ (3) إلى 0.5.
{
  const lb = lineBreak(bars([1, 2, 3, 4, 1.5, 0.5]));
  assert.deepEqual(lb.map((b) => [b.open, b.close]), [[1, 2], [2, 3], [3, 4], [3, 0.5]]);
  // الفوليوم المتراكم للشمعة التي لم ترسم ينتقل للخطّ التالي.
  assert.equal(lb[3]!.volume, 2);
}
// خطّان صاعدان فقط ⇒ الانعكاس يكسر أدنى الخطّين (1) لا ثلاثة.
{
  const lb = lineBreak(bars([1, 2, 3, 1.2, 0.9]));
  assert.deepEqual(lb.map((b) => [b.open, b.close]), [[1, 2], [2, 3], [2, 0.9]]);
}
// هابط ثم انعكاس صاعد يتطلّب تجاوز أعلى آخر 3 خطوط.
{
  const lb = lineBreak(bars([1, 0.9, 0.8, 0.7, 0.85, 1.05]));
  assert.deepEqual(lb.map((b) => [b.open, b.close]), [[1, 0.9], [0.9, 0.8], [0.8, 0.7], [0.8, 1.05]]);
  assert.ok(lb.every((b) => b.high === Math.max(b.open, b.close) && b.low === Math.min(b.open, b.close)));
}
// سعر مسطّح ⇒ الشموع كما هي.
{
  const flat = bars([1, 1, 1]);
  assert.equal(lineBreak(flat), flat);
}
console.log('lineBreak.selftest: PASS');
