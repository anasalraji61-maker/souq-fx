/** فحص ذاتي لـ`selectionTags.ts` — يُشغَّل بـNode بلا شجرة مكوّنات. */
import assert from 'node:assert/strict';
import { placeSelectionTags, selectionPrices } from './selectionTags';
import type { Drawing } from './types';

const d = (tool: Drawing['tool'], a: number, b?: number, rr?: number): Drawing => ({
  id: 'x',
  tool,
  a: { index: 1, price: a },
  b: b == null ? undefined : { index: 4, price: b },
  color: '#0ff',
  rr,
});

assert.deepEqual(selectionPrices(d('hline', 1.085), 'EURUSD'), [{ price: 1.085, tone: 'line' }]);
assert.deepEqual(selectionPrices(d('vline', 1.085), 'EURUSD'), []);
assert.deepEqual(selectionPrices(d('note', 1.085), 'EURUSD'), []);
assert.equal(selectionPrices(d('trend', 1.08, 1.09), 'EURUSD').length, 2);
assert.equal(selectionPrices(d('trend', 1.08, 1.08), 'EURUSD').length, 1);
const pos = selectionPrices(d('long', 1.085, 1.0825, 2), 'EURUSD');
assert.deepEqual(pos.map((p) => p.tone), ['line', 'bear', 'bull']);
assert.ok(Math.abs(pos[2].price - 1.09) < 1e-9);

// المواضع: محور 200px، السعر 1.08→200px و1.10→0px
const yOf = (p: number) => ((1.1 - p) / 0.02) * 200;
let tags = placeSelectionTags(
  [
    { price: 1.09, tone: 'line' },
    { price: 1.0901, tone: 'line' }, // يلامس الأوّل ⇒ يُسقط
    { price: 1.2, tone: 'bull' }, // خارج المدى ⇒ لا وسم
    { price: 1.085, tone: 'bear' },
  ],
  yOf,
  200,
  18,
  []
);
assert.deepEqual(tags.map((t) => t.price), [1.09, 1.085]);
assert.ok(Math.abs(tags[0].top - 91) < 1e-6);
// وسم السعر الحيّ محجوز
tags = placeSelectionTags([{ price: 1.09, tone: 'line' }], yOf, 200, 18, [{ top: 95, h: 18 }]);
assert.equal(tags.length, 0);
// قرب الحافّة السفلى يُقيَّد داخل المحور
tags = placeSelectionTags([{ price: 1.0801, tone: 'line' }], yOf, 200, 18, []);
assert.equal(tags[0].top, 180);

console.log('selectionTags.selftest: PASS');
