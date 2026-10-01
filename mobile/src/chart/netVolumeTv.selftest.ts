/**
 * Self-test: Net Volume كـTradingView المدمج — ‎ta.change(close) > 0 ? volume : < 0 ? −volume : 0‎ لكل شمعة، بلا تراكم.
 * Run: npx --yes tsx src/chart/netVolumeTv.selftest.ts
 */
import assert from 'node:assert/strict';
import type { Candle } from '../api';
import { computeNetVolume } from './indicators/volume';

const bar = (i: number, open: number, close: number, volume: number): Candle =>
  ({ time: i * 60, open, high: Math.max(open, close), low: Math.min(open, close), close, volume }) as Candle;

const bars = [
  bar(0, 1.1, 1.105, 500), // الأولى: ta.change = na ⇒ 0
  bar(1, 1.1, 1.108, 1000), // إغلاق أعلى من السابق ⇒ +1000
  // شمعة صاعدة (إغلاق > فتح) لكنها أغلقت تحت إغلاق سابقتها ⇒ −1000 (القديم: +1000 لأنه قارن الفتح)
  bar(2, 1.1, 1.105, 1000),
  bar(3, 1.106, 1.105, 700), // إغلاق مساوٍ ⇒ 0
  bar(4, 1.105, 1.101, 300), // هبوط ⇒ −300
];
assert.deepEqual(computeNetVolume(bars), [0, 1000, -1000, 0, -300]);

// لا تراكم: سلسلة صاعدة طويلة تبقى عند فوليوم الشمعة لا مجموعها
const up = Array.from({ length: 50 }, (_, i) => bar(i, 1 + i * 0.001, 1 + (i + 1) * 0.001, 100));
const nv = computeNetVolume(up);
assert.equal(nv[0], 0);
for (let i = 1; i < nv.length; i++) assert.equal(nv[i], 100, `nv[${i}]`);

console.log('netVolumeTv selftest PASS');
