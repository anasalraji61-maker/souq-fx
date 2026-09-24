/** فحص ذاتي لـ`selectionTags.ts` — يُشغَّل بـNode بلا شجرة مكوّنات. */
import assert from 'node:assert/strict';
import { lineNowText, lineValueAt, placeSelectionTags, selectionPrices } from './selectionTags';
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

// سعر الترند/الشعاع عند الشمعة الحيّة (الطرفان عند 1 و4).
const A = { index: 1, price: 1.08 };
const B = { index: 4, price: 1.083 };
assert.ok(Math.abs(lineValueAt(A, B, 3, false)! - 1.082) < 1e-12); // بين الطرفين
assert.equal(lineValueAt(A, B, 7, false), null); // الترند لا يمتدّ بعد طرفه
assert.ok(Math.abs(lineValueAt(A, B, 7, true)! - 1.086) < 1e-12); // الشعاع يمتدّ
assert.equal(lineValueAt(A, B, 0, true), null); // ولا يمتدّ خلف بدايته
assert.equal(lineValueAt(B, A, 7, true), null); // شعاع نحو اليسار لا يبلغ الحيّة
assert.equal(lineValueAt(A, { index: 1, price: 1.09 }, 1, true), null); // طرفان على شمعة واحدة
assert.equal(lineValueAt(A, { index: 2, price: 0.5 }, 9, true), null); // شعاع هابط تحت الصفر
const ray = selectionPrices({ ...d('ray', 1.08, 1.083) }, 'EURUSD', 7);
assert.deepEqual(ray.map((p) => p.tone), ['line', 'line', 'now']);
assert.ok(Math.abs(ray[2].price - 1.086) < 1e-12);
// ترند انتهى قبل الشمعة الحيّة ⇒ لا وسم «الآن»؛ وعند طرفه بالضبط ⇒ وسم الطرف يكفي.
assert.equal(selectionPrices(d('trend', 1.08, 1.083), 'EURUSD', 7).length, 2);
assert.equal(selectionPrices(d('trend', 1.08, 1.083), 'EURUSD', 4).length, 2);
// بلا فهرس حيّ (المستدعي القديم) ⇒ كما كان؛ ولا وسم «الآن» لغير الترند/الشعاع.
assert.equal(selectionPrices(d('ray', 1.08, 1.083), 'EURUSD').length, 2);
assert.equal(selectionPrices(d('rect', 1.08, 1.083), 'EURUSD', 3).length, 2);

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

// lineNowText: سعر الخطّ عند الحيّة وبُعد السعر عنه.
{
  const fmt = (v: number) => v.toFixed(5);
  // ترند 1.0800@1 → 1.0830@4 ⇒ عند 4 = 1.0830 (طرف) — الشعاع يمتدّ ⇒ عند 7 = 1.0860.
  assert.equal(lineNowText(d('ray', 1.08, 1.083), 7, 1.0866, 'EURUSD', fmt), '1.08600 · −6.0 pip');
  assert.equal(lineNowText(d('ray', 1.08, 1.083), 7, 1.0850, 'EURUSD', fmt), '1.08600 · +10.0 pip');
  assert.equal(lineNowText(d('trend', 1.08, 1.083), 3, 1.0820, 'EURUSD', fmt), '1.08200 · 0.0 pip');
  // الترند لا يبلغ ما بعد طرفه الثاني.
  assert.equal(lineNowText(d('trend', 1.08, 1.083), 7, 1.0850, 'EURUSD', fmt), null);
  assert.equal(lineNowText(d('hline', 1.08), 7, 1.0850, 'EURUSD', fmt), null);
  assert.equal(lineNowText(d('fib', 1.08, 1.083), 3, 1.0850, 'EURUSD', fmt), null);
  assert.equal(lineNowText(d('ray', 1.08, 1.083), 7, Number.NaN, 'EURUSD', fmt), null);
  // أداة بلا مواصفة pip ⇒ لا نصّ.
  assert.equal(lineNowText(d('ray', 100, 103), 7, 104, 'NOPE123', fmt), null);
}
console.log('selectionTags lineNowText OK');
