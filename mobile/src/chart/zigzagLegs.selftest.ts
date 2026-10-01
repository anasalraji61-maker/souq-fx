/**
 * سيقان ZigZag عبر حافّتي النافذة + الطرف الجاري. Run: npx --yes tsx src/chart/zigzagLegs.selftest.ts
 */
import assert from 'node:assert/strict';
import { computeZigZag, computeZigZagLegs } from './indicators/trend';
import { zigzagWindowSegments } from './zigzagLegs';

// 100 → 120 (i=10) → 100 (i=20) → 115 (i=30)
const closes: number[] = [];
for (let i = 0; i <= 10; i++) closes.push(100 + 2 * i);
for (let i = 11; i <= 20; i++) closes.push(120 - 2 * (i - 10));
for (let i = 21; i <= 30; i++) closes.push(100 + 1.5 * (i - 20));
const { pivots, tail } = computeZigZagLegs(closes);
assert.deepEqual(pivots, computeZigZag(closes));
assert.equal(pivots[10], 120);
assert.equal(pivots[20], 100);
assert.deepEqual(tail, { i: 30, v: 115 });

// نافذة 12..17 داخل الساق الهابطة 10→20: لا انعطاف داخلها ⇒ كان فارغاً، الآن ساق مقصوصة عند الحافّتين.
const mid = zigzagWindowSegments(pivots, tail, 12, 6);
assert.equal(mid.length, 1);
assert.equal(mid[0].x1, -0.5);
assert.equal(mid[0].x2, 5.5);
assert.ok(Math.abs(mid[0].y1 - 117) < 1e-9); // الفهرس العام 11.5
assert.ok(Math.abs(mid[0].y2 - 105) < 1e-9); // 17.5
assert.equal(mid[0].tentative, false);

// النافذة الحيّة 15..30: الساق إلى الطرف الجاري موسومة غير مؤكَّدة.
const live = zigzagWindowSegments(pivots, tail, 15, 16);
assert.equal(live.length, 2);
assert.equal(live[1].tentative, true);
assert.equal(live[1].x2, 15);
assert.equal(live[1].y2, 115);

// بلا انعطاف مؤكَّد ⇒ لا ساق ولا طرف.
const flat = computeZigZagLegs([1, 1.01, 1.02, 1.03]);
assert.equal(flat.tail, null);
assert.deepEqual(zigzagWindowSegments(flat.pivots, flat.tail, 0, 4), []);

// شموع: القمّة على فتيل `high` والقاع على فتيل `low` (كـTradingView) — لا على الإغلاق.
const candles = closes.map((c, i) => ({ high: c + (i === 10 ? 3 : 0.5), low: c - (i === 20 ? 4 : 0.5) }));
const wick = computeZigZagLegs(candles);
assert.equal(wick.pivots[10], 123, 'القمّة على الفتيل');
assert.equal(wick.pivots[20], 96, 'القاع على الفتيل');
// الانعكاس يُقاس بالمدى: قمّة 100 ثم شمعة low 94.9 (−5.1%) وإغلاقها 96 (−4%) ⇒ انعطاف بالشموع لا بالإغلاق.
const bar = (c: number, h: number, l: number) => ({ c, h, l });
const seq = [bar(99, 100, 98), bar(96, 97, 94.9), bar(97, 98, 96)];
assert.equal(computeZigZagLegs(seq.map((b) => ({ high: b.h, low: b.l }))).pivots[0], 100);
assert.equal(computeZigZagLegs(seq.map((b) => b.c)).pivots.every((v) => v == null), true);
console.log('zigzagLegs selftest PASS');
