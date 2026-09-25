/**
 * Self-test: `pineIsPriceScale` — ما يُرسم على محور السعر وما يأخذ مقياسه الخاص.
 * Run: npx --yes tsx src/chart/pineScale.selftest.ts
 */
import assert from 'node:assert/strict';
import { pineIsPriceScale } from './pineLite';

const want: [string, boolean][] = [
  ['sma(close,9)', true],
  ['ema(close, 50)', true],
  ['bbupper(20)', true],
  ['highest(high,20)', true],
  ['hlc3', true],
  // مذبذبات وفروق وإشارات 0/1: كانت تمطّ مدى السعر (EURUSD 1.08 ⇒ 0..70) فتنسحق الشموع
  ['rsi(close,14)', false],
  ['macd', false],
  ['atr(14)', false],
  ['stoch(14)', false],
  ['mom(close,10)', false],
  ['sma(close,9)-sma(close,21)', false],
  ['crossover(sma(close,9),sma(close,21))', false],
];
for (const [f, w] of want) assert.equal(pineIsPriceScale(f), w, f);
console.log('pineScale selftest PASS');
