/** فحص ذاتي لـ`computeTwiggsMoneyFlow` — تنعيم Wilder (RMA) كنسخة LazyBear، لا EMA. يُشغَّل بـNode. */
import assert from 'node:assert/strict';
import { computeTwiggsMoneyFlow } from './indicators/volume';

const n = 120;
const candles = Array.from({ length: n }, (_, i) => {
  const c = 1.1 + Math.sin(i / 7) * 0.004 + (i % 5) * 0.0003;
  return { time: i * 900, open: c - 0.0002, high: c + 0.0009 + (i % 3) * 0.0002, low: c - 0.0011, close: c, volume: 500 + ((i * 37) % 200) };
});
// مرجع مستقلّ: adv/range بالمدى الحقيقي، ثم RMA(adv)/RMA(volume) ببذرة SMA.
const P = 21;
const adv: number[] = [];
for (let i = 0; i < n; i++) {
  const pc = i > 0 ? candles[i - 1].close : candles[i].close;
  const h = Math.max(candles[i].high, pc);
  const l = Math.min(candles[i].low, pc);
  adv.push(h === l ? 0 : (candles[i].volume * (candles[i].close - l - (h - candles[i].close))) / (h - l));
}
const rma = (xs: number[]) => {
  const out: (number | null)[] = [];
  let prev: number | null = null;
  xs.forEach((x, i) => {
    if (i < P - 1) return out.push(null);
    prev = prev == null ? xs.slice(0, P).reduce((a, b) => a + b, 0) / P : (prev * (P - 1) + x) / P;
    out.push(prev);
  });
  return out;
};
const ra = rma(adv);
const rv = rma(candles.map((c) => c.volume));
const tmf = computeTwiggsMoneyFlow(candles, P);
assert.equal(tmf[P - 2], null);
for (let i = P - 1; i < n; i++) {
  const want = ra[i]! / rv[i]!;
  assert.ok(Math.abs(tmf[i]! - want) < 1e-12, `bar ${i}: ${tmf[i]} ≠ ${want}`);
  assert.ok(tmf[i]! >= -1 && tmf[i]! <= 1);
}
console.log('twiggsTv.selftest: PASS');
