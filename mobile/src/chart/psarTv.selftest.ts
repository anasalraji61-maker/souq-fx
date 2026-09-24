/**
 * Self-test: Parabolic SAR بترتيب `ta.sar` في TradingView (الانعكاس قبل القصّ، SAR الانعكاس = max(high, EP)).
 * Run: npx --yes tsx src/chart/psarTv.selftest.ts
 */
import assert from 'node:assert/strict';
import type { Candle } from '../api';
import { computePsar } from './indicators/trend';

/** نقل سطري لمرجع `pine_sar` المنشور بوثائق Pine (`ta.sar`)، بأسماء متغيّراته. */
function pineSar(c: Candle[], start: number, inc: number, max: number): (number | null)[] {
  const out: (number | null)[] = [];
  let result = NaN;
  let maxMin = NaN;
  let acceleration = NaN;
  let isBelow = false;
  for (let bar = 0; bar < c.length; bar++) {
    if (bar === 0) {
      out.push(null);
      continue;
    }
    let isFirstTrendBar = false;
    const { high, low } = c[bar];
    if (bar === 1) {
      if (c[1].close > c[0].close) {
        isBelow = true;
        maxMin = high;
        result = c[0].low;
      } else {
        isBelow = false;
        maxMin = low;
        result = c[0].high;
      }
      isFirstTrendBar = true;
      acceleration = start;
    }
    result = result + acceleration * (maxMin - result);
    if (isBelow) {
      if (result > low) {
        isFirstTrendBar = true;
        isBelow = false;
        result = Math.max(high, maxMin);
        maxMin = low;
        acceleration = start;
      }
    } else if (result < high) {
      isFirstTrendBar = true;
      isBelow = true;
      result = Math.min(low, maxMin);
      maxMin = high;
      acceleration = start;
    }
    if (!isFirstTrendBar) {
      if (isBelow) {
        if (high > maxMin) {
          maxMin = high;
          acceleration = Math.min(acceleration + inc, max);
        }
      } else if (low < maxMin) {
        maxMin = low;
        acceleration = Math.min(acceleration + inc, max);
      }
    }
    if (isBelow) {
      result = Math.min(result, c[bar - 1].low);
      if (bar > 1) result = Math.min(result, c[bar - 2].low);
    } else {
      result = Math.max(result, c[bar - 1].high);
      if (bar > 1) result = Math.max(result, c[bar - 2].high);
    }
    out.push(result);
  }
  return out;
}

// سلسلة عشوائية حتمية بانعكاسات كثيرة
let seed = 7;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const candles: Candle[] = [];
let px = 1.085;
for (let i = 0; i < 600; i++) {
  const open = px;
  const close = open + (rnd() - 0.5) * 0.004;
  const high = Math.max(open, close) + rnd() * 0.0015;
  const low = Math.min(open, close) - rnd() * 0.0015;
  candles.push({ time: i * 900, open, high, low, close } as Candle);
  px = close;
}
const got = computePsar(candles);
const ref = pineSar(candles, 0.02, 0.02, 0.2);
assert.equal(got[0], null);
let flips = 0;
for (let i = 1; i < candles.length; i++) {
  assert.ok(Math.abs((got[i] as number) - (ref[i] as number)) < 1e-12, `bar ${i}: ${got[i]} vs ${ref[i]}`);
  if (i > 1 && (got[i]! < candles[i].low) !== (got[i - 1]! < candles[i - 1].low)) flips++;
}
assert.ok(flips > 20, `expected many reversals, got ${flips}`);

// حالة يدوية: صعود ثم شمعة تكسر SAR بقمة أعلى من EP ⇒ SAR الانعكاس = قمتها لا EP
const k = (o: number, h: number, l: number, c: number, t: number) => ({ time: t, open: o, high: h, low: l, close: c } as Candle);
const hand = [k(10, 11, 9, 10, 0), k(10, 12, 10, 11.5, 1), k(11.5, 13, 11, 12.5, 2), k(12.5, 14, 8, 9, 3)];
const h = computePsar(hand);
// الشمعة 3: قمتها 14 > EP 13 ⇒ SAR = 14 (المرجع القديم: EP = 13 تحت قمة الشمعة نفسها)
assert.equal(h[3], 14);
console.log('psarTv.selftest: PASS', { flips });
