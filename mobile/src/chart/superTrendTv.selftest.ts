/**
 * Self-test: SuperTrend بمنطق `ta.supertrend` في TradingView — يبدأ هابطاً، ثم يطابقه شمعةً شمعة.
 * Run: npx --yes tsx src/chart/superTrendTv.selftest.ts
 */
import assert from 'node:assert/strict';
import type { Candle } from '../api';
import { computeSuperTrend } from './indicators/trend';
import { computeAtr } from './indicators/volatility';

/** نقل سطري لمرجع `pine_supertrend` بوثائق Pine (direction: −1 صاعد، 1 هابط). */
function pineSupertrend(c: Candle[], factor: number, atrPeriod: number) {
  const atr = computeAtr(c, atrPeriod);
  const st: (number | null)[] = [];
  const dir: (number | null)[] = [];
  let prevUpper: number | null = null;
  let prevLower: number | null = null;
  for (let i = 0; i < c.length; i++) {
    if (atr[i] == null) {
      st.push(null);
      dir.push(null);
      continue;
    }
    const src = (c[i].high + c[i].low) / 2;
    let upper = src + factor * atr[i]!;
    let lower = src - factor * atr[i]!;
    const pl = prevLower ?? 0;
    const pu = prevUpper ?? 0;
    const close1 = c[i - 1]?.close ?? NaN;
    lower = lower > pl || close1 < pl ? lower : pl;
    upper = upper < pu || close1 > pu ? upper : pu;
    let d: number;
    if (i === 0 || atr[i - 1] == null) d = 1;
    else if (st[i - 1] === pu) d = c[i].close > upper ? -1 : 1;
    else d = c[i].close < lower ? 1 : -1;
    st.push(d === -1 ? lower : upper);
    dir.push(d);
    prevUpper = upper;
    prevLower = lower;
  }
  return { st, dir };
}

let seed = 11;
const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648);
const candles: Candle[] = [];
let px = 1.27;
for (let i = 0; i < 800; i++) {
  const open = px;
  const close = open + (rnd() - 0.48) * 0.003;
  const high = Math.max(open, close) + rnd() * 0.001;
  const low = Math.min(open, close) - rnd() * 0.001;
  candles.push({ time: i * 3600, open, high, low, close } as Candle);
  px = close;
}
// أوّل شمعة بـATR (9) تُغلق عند قمّتها — فوق منتصفها: البداية القديمة (`close >= hl2`) كانت تجعلها صاعدة.
candles[9] = { ...candles[9], close: candles[9].high };
candles[10] = { ...candles[10], open: candles[9].close };
const got = computeSuperTrend(candles, 10, 3);
const ref = pineSupertrend(candles, 3, 10);
let flips = 0;
for (let i = 0; i < candles.length; i++) {
  if (ref.st[i] == null) {
    assert.equal(got.value[i], null);
    continue;
  }
  assert.ok(Math.abs(got.value[i]! - ref.st[i]!) < 1e-12, `bar ${i}`);
  assert.equal(got.up[i], ref.dir[i] === -1, `dir bar ${i}`);
  if (i > 0 && got.up[i - 1] != null && got.up[i] !== got.up[i - 1]) flips++;
}
assert.ok(flips > 10, `flips ${flips}`);

// أوّل قيمة: هابطة (الحدّ العلوي) كـTradingView
const first = got.up.findIndex((u) => u != null);
assert.equal(got.up[first], false);
console.log('superTrendTv.selftest: PASS', { flips });
