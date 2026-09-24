/**
 * Self-test: أعمدة AO/AC ملوّنة بارتفاعها عن سابقها (TradingView) لا بإشارتها.
 * Run: npx --yes tsx src/chart/aoColors.selftest.ts
 */
import assert from 'node:assert/strict';
import type { Candle } from '../api';
import { risingBars } from './centeredPane';
import { computeAwesomeOsc } from './indicators/momentum';
import { trimIndicator } from './indicatorWindow';

assert.deepEqual(risingBars([null, 1, 2, 1.5, 1.5, -1, -0.5]), [true, true, true, false, false, false, true]);
// موجب يهبط = أحمر، سالب يصعد = أخضر
assert.deepEqual(risingBars([3, 2]), [true, false]);
assert.deepEqual(risingBars([-3, -2]), [true, true]);
assert.deepEqual(risingBars([]), []);

// على بيانات حقيقية الشكل: اللون يطابق ao[i] > ao[i-1]، وقصّ النافذة يُبقي لون أوّل عمود مرئيّ صحيحاً
let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
let p = 1.1;
const bars: Candle[] = Array.from({ length: 120 }, (_, i) => {
  const o = p;
  p += (rnd() - 0.5) * 0.004;
  return { time: i * 60, open: o, high: Math.max(o, p) + 0.0005, low: Math.min(o, p) - 0.0005, close: p, volume: 1 };
});
const v = computeAwesomeOsc(bars);
const up = risingBars(v);
for (let i = 34; i < v.length; i++) assert.equal(up[i], (v[i] as number) > (v[i - 1] as number), `bar ${i}`);
const cut = 60;
const t = trimIndicator({ v, up }, v.length, cut);
assert.equal(t.up[0], (v[cut] as number) > (v[cut - 1] as number));
assert.equal(t.v.length, t.up.length);

console.log('aoColors selftest: PASS');
