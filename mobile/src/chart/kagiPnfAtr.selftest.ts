/**
 * Self-test for Kagi / Point & Figure default sizing — ATR(14) كـTradingView.
 * Run: npx --yes tsx src/chart/kagiPnfAtr.selftest.ts
 */
import assert from 'node:assert/strict';
import { kagi } from './kagi';
import { pointFigure } from './pointFigure';

// مدى ثابت 0.0020 (20 نقطة) وإغلاق يصعد 0.0010 كل شمعة ⇒ المدى الحقيقي = 0.0020 دائماً ⇒ ATR = 0.0020.
const bar = (i: number, close: number) => ({
  time: i * 60,
  open: close,
  high: close + 0.001,
  low: close - 0.001,
  close,
  volume: 1,
});
const rising = Array.from({ length: 40 }, (_, i) => bar(i, 1.1 + i * 0.001));

// P&F: صندوق = ATR = 0.0020 (كان نصف متوسط المدى = 0.0010).
const pf = pointFigure(rising);
const size = pf[pf.length - 1].close - pf[pf.length - 1].open;
assert.ok(Math.abs(size - 0.002) < 1e-9, `pnf box ${size}`);

// Kagi: انعكاس = ATR (0.0020). تراجع 15 نقطة لا يعكس الخط، و25 نقطة تعكسه.
// (القديم 0.4% من 1.14 ≈ 46 نقطة ⇒ لا انعكاس في الحالتين.)
const last = rising[rising.length - 1].close;
const small = kagi([...rising, bar(40, last - 0.0015)]);
assert.ok(small[small.length - 1].close >= small[small.length - 1].open, 'no reversal under ATR');
const big = kagi([...rising, bar(40, last - 0.0025)]);
assert.ok(big[big.length - 1].close < big[big.length - 1].open, 'reversal past ATR');

// مبلغ صريح ما زال يعمل.
assert.equal(kagi([...rising, bar(40, last - 0.0025)], 0.005).at(-1)!.close, last);
console.log('kagiPnfAtr selftest PASS');
