/**
 * Self-test: Choppiness بلا قيمة على مدى صفري، وإحماء Ulcer Index كـTradingView (pure).
 * Run: npx --yes tsx src/chart/tvWarmup.selftest.ts
 */
import assert from 'node:assert/strict';
import { computeChoppiness } from './indicators/trend';
import { computeUlcerIndex } from './indicators/volatility';

const flat = Array.from({ length: 20 }, (_, i) => ({ time: i * 60, open: 1.1, high: 1.1, low: 1.1, close: 1.1, volume: 0 }));
const chop = computeChoppiness(flat);
// كان 0 («اتجاه قويّ») على سوق ميّت تماماً.
assert.equal(chop[19], null);

const closes = [1.2, ...Array.from({ length: 39 }, () => 1.1)];
const ui = computeUlcerIndex(closes, 14);
assert.equal(ui[13], null); // كان ≈8 من قمّة نافذة مقصوصة
assert.equal(ui[25], null);
assert.ok(ui[26] != null && ui[26]! >= 0);

console.log('tvWarmup.selftest: PASS');
