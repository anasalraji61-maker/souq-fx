/**
 * Self-test for Chandelier Exit (pure) — سكربت everget بـTradingView: أعلى/أدنى الإغلاق، سقّاطة، واتجاه.
 * Run: npx --yes tsx src/chart/chandelierExit.selftest.ts
 */
import assert from 'node:assert/strict';
import { computeChandelierExit } from './indicators/trend';
import { computeAtr } from './indicators/volatility';

type C = { time: number; open: number; high: number; low: number; close: number; volume: number };
const bar = (i: number, close: number, wick = 0.001): C => ({
  time: i * 60,
  open: close,
  high: close + wick,
  low: close - wick,
  close,
  volume: 0,
});

// 1) مرجع حرفي لـPine (سلاسل بـ[1]) على 400 شمعة عشوائية.
{
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const bars: C[] = [];
  let p = 1.1;
  for (let i = 0; i < 400; i++) {
    p += (rnd() - 0.5) * 0.004;
    bars.push({ time: i * 60, open: p, high: p + rnd() * 0.002, low: p - rnd() * 0.002, close: p, volume: 0 });
  }
  const len = 22;
  const mult = 3;
  const atr = computeAtr(bars, len);
  const L: (number | null)[] = [];
  const S: (number | null)[] = [];
  let dir = 1;
  const want: (number | null)[] = [];
  for (let i = 0; i < bars.length; i++) {
    if (i < len - 1 || atr[i] == null) {
      L.push(null);
      S.push(null);
      want.push(null);
      continue;
    }
    const w = bars.slice(i - len + 1, i + 1).map((b) => b.close);
    let l = Math.max(...w) - mult * atr[i]!;
    let s = Math.min(...w) + mult * atr[i]!;
    const lp = L[i - 1] ?? l;
    const sp = S[i - 1] ?? s;
    l = bars[i - 1].close > lp ? Math.max(l, lp) : l;
    s = bars[i - 1].close < sp ? Math.min(s, sp) : s;
    dir = bars[i].close > sp ? 1 : bars[i].close < lp ? -1 : dir;
    L.push(l);
    S.push(s);
    want.push(dir === 1 ? l : s);
  }
  const got = computeChandelierExit(bars);
  let flips = 0;
  for (let i = 0; i < bars.length; i++) {
    if (want[i] == null) assert.equal(got.value[i], null, `i=${i}`);
    else assert.ok(Math.abs(got.value[i]! - want[i]!) < 1e-12, `i=${i}: ${got.value[i]} ≠ ${want[i]}`);
    if (i > 0 && got.up[i] != null && got.up[i - 1] != null && got.up[i] !== got.up[i - 1]) flips++;
  }
  assert.ok(flips >= 2, `بيانات الاختبار يجب أن تقلب الاتجاه (${flips})`);
}

// 2) السقّاطة: صعود ثم تراجع طفيف — الوقف الطويل لا يرتخي للخلف حين تخرج القمّة من النافذة.
{
  const bars: C[] = [];
  for (let i = 0; i < 40; i++) bars.push(bar(i, 1.1 + i * 0.0005));
  for (let i = 40; i < 70; i++) bars.push(bar(i, 1.1195 - (i - 40) * 0.00002));
  const r = computeChandelierExit(bars);
  for (let i = 41; i < 70; i++) {
    assert.equal(r.up[i], true, `i=${i} يبقى صاعداً`);
    assert.ok(r.value[i]! >= r.value[i - 1]! - 1e-12, `i=${i}: الوقف نزل ${r.value[i - 1]} → ${r.value[i]}`);
  }
}

// 3) انهيار يكسر الوقف ⇒ هابط، والخطّ صار فوق السعر.
{
  const bars: C[] = [];
  for (let i = 0; i < 40; i++) bars.push(bar(i, 1.1 + i * 0.0005));
  for (let i = 40; i < 50; i++) bars.push(bar(i, 1.1195 - (i - 39) * 0.004));
  const r = computeChandelierExit(bars);
  assert.equal(r.up[39], true);
  assert.equal(r.up[49], false);
  assert.ok(r.value[49]! > bars[49].close, 'الوقف القصير فوق السعر');
}

// 4) سعر ثابت: الوقف = السعر، بلا NaN.
{
  const bars = Array.from({ length: 60 }, (_, i) => bar(i, 1.25, 0));
  const r = computeChandelierExit(bars);
  assert.equal(r.value[20], null);
  for (let i = 21; i < 60; i++) assert.ok(Math.abs(r.value[i]! - 1.25) < 1e-12, `i=${i}`);
}

console.log('chandelierExit selftest PASS');
