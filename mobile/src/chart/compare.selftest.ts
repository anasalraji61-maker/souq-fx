/**
 * Self-test for the compare overlay time alignment (pure).
 * Run: npx --yes tsx src/chart/compare.selftest.ts
 */
import assert from 'node:assert/strict';
import { compareOverlay, rebaseCompare } from './compare';
import type { Candle } from '../api';

const bar = (time: number, close: number): Candle => ({ time, open: close, high: close, low: close, close });
const T0 = 1_760_000_000;
const step = 900;

// النافذة الأساسية = شموع قديمة (بعد الرجوع): المقارنة تُطابَق بزمنها لا بآخر شموعها
const primary = [0, 1, 2].map((i) => bar(T0 + i * step, 1.1 + i * 0.01));
const compare = Array.from({ length: 10 }, (_, i) => bar(T0 + i * step, 13 + i));
let o = compareOverlay(primary, compare, step);
assert.deepEqual(o.closes, [13, 14, 15]);
assert.equal(o.prices[0], 1.1);
assert.ok(Math.abs(o.prices[2]! - 1.1 * (15 / 13)) < 1e-12);

// مقارنة أقصر تبدأ لاحقاً ⇒ null يساراً، والأساس أوّل زوج مطابق
o = compareOverlay(primary, [bar(T0 + step, 2), bar(T0 + 2 * step, 2.2)], step);
assert.deepEqual(o.closes, [null, 2, 2.2]);
assert.equal(o.prices[1], 1.11);

// فجوة بالمقارنة أطول من شمعة ⇒ null لا امتداد لقيمة قديمة
o = compareOverlay(primary, [bar(T0, 2), bar(T0 + 2 * step, 2.2)], step);
assert.deepEqual(o.closes, [2, null, 2.2]);

// لبنات Renko: زمن اصطناعي (T0 + 60ث لكل لبنة) والحقيقي `srcTime` ⇒ المطابقة بالحقيقي
const bricks = [
  { ...bar(T0, 1.1), srcTime: T0 + 5 * step },
  { ...bar(T0 + 60, 1.11), srcTime: T0 + 5 * step },
  { ...bar(T0 + 120, 1.12), srcTime: T0 + 8 * step },
];
o = compareOverlay(bricks, compare, step);
assert.deepEqual(o.closes, [18, 18, 21]);

// أزمنة بالميلي ثانية بطرف واحد
o = compareOverlay(primary, compare.map((c) => ({ ...c, time: c.time * 1000 })), step);
assert.deepEqual(o.closes, [13, 14, 15]);

// لا شيء مطابق ⇒ كلّها null
o = compareOverlay(primary, [bar(T0 + 50 * step, 2)], step);
assert.ok(o.prices.every((p) => p == null));

// الأساس من أوّل شمعة ظاهرة: الخطّان يلتقيان عند `from` لا عند plot[0]
o = compareOverlay(primary, compare, step);
let r = rebaseCompare(primary, o.closes, 1);
assert.equal(r[1], 1.11);
assert.ok(Math.abs(r[2]! - 1.11 * (15 / 14)) < 1e-12);
// لا مطابق عند/بعد `from` ⇒ أوّل مطابق كلّياً؛ و`from` خارج الحدود يُقصّ
r = rebaseCompare(primary, [2, null, null], 1);
assert.equal(r[0], 1.1);
r = rebaseCompare(primary, o.closes, 99);
assert.equal(r[2], 1.12);

console.log('compare selftest: OK');
