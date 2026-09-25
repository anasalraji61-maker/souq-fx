/**
 * Self-test for denseOhlcFit (pure).
 * Run: npx --yes tsx src/chart/denseOhlcFit.selftest.ts
 */
import assert from 'node:assert/strict';
import { planDenseOhlc } from './denseOhlcFit';

const l1 = 'O 1.08520  H 1.08545';
const l2 = 'L 1.08501  C 1.08532';
const pct = '+0.32%';
const range = '↕ 4.4 pip';

// لوح هاتف كامل (~300px): سطر واحد 11 مع التغيّر
const phone = planDenseOhlc(l1, l2, pct, range, 300);
assert.equal(phone.fontSize, 11);
assert.equal(phone.wide, true);
assert.equal(phone.showPct, true);
// لوح عريض: المدى أيضاً
assert.deepEqual(planDenseOhlc(l1, l2, pct, range, 420), { fontSize: 11, lineH: 14, wide: true, showPct: true, showRange: true });
// خلية رباعية ~150px: سطران، ولا أصغر من 9
const cell = planDenseOhlc(l1, l2, pct, range, 150);
assert.equal(cell.wide, false);
assert.ok(cell.fontSize >= 9 && cell.fontSize <= 11);
assert.equal(cell.showRange, false);
// أضيق ما يكون: 9 بلا تغيّر، لا أصغر
const tiny = planDenseOhlc(l1, l2, pct, range, 60);
assert.equal(tiny.fontSize, 9);
assert.equal(tiny.showPct, false);
// العرض يزيد ⇒ الخطّ لا يصغر، وما صار سطراً واحداً يبقى كذلك
let prevF = 0;
let wasWide = false;
for (let w = 60; w <= 500; w += 5) {
  const p = planDenseOhlc(l1, l2, pct, range, w);
  assert.ok(p.fontSize >= prevF, `w=${w}: خطّ أصغر`);
  assert.ok(p.wide || !wasWide, `w=${w}: عاد سطرين`);
  prevF = p.fontSize;
  wasWide = p.wide;
}
// بلا تغيّر (أول شمعة): لا يُعرض
assert.equal(planDenseOhlc(l1, l2, null, null, 400).showPct, false);
// النصّ نفسه بأرقام مختلفة وطول واحد ⇒ الخطة نفسها (لا قفز أثناء السحب)
assert.deepEqual(planDenseOhlc(l1, l2, pct, null, 200), planDenseOhlc('O 1.99999  H 1.11111', 'L 1.00000  C 1.77777', '-0.01%', null, 200));

console.log('denseOhlcFit selftest: PASS');
