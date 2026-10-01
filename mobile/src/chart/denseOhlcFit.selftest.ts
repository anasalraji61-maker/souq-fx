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
const cl = 'C 1.08532';

// لوح هاتف كامل (~300px): سطر واحد 11 مع التغيّر
const phone = planDenseOhlc(l1, l2, pct, range, 300, cl);
assert.equal(phone.fontSize, 11);
assert.equal(phone.wide, true);
assert.equal(phone.showPct, true);
// لوح عريض: المدى أيضاً
assert.deepEqual(planDenseOhlc(l1, l2, pct, range, 420, cl), {
  fontSize: 11,
  lineH: 14,
  wide: true,
  closeOnly: false,
  lines: 1,
  showPct: true,
  showRange: true,
});
// خلية رباعية ~150px: سطران 11px
const cell = planDenseOhlc(l1, l2, pct, range, 150, cl);
assert.equal(cell.wide, false);
assert.equal(cell.closeOnly, false);
assert.equal(cell.lines, 2);
assert.equal(cell.fontSize, 11);
assert.equal(cell.showRange, false);
// ضيّق (~100px): الإغلاق وحده بـ11 لا سطران بـ9
const narrow = planDenseOhlc(l1, l2, pct, range, 100, cl);
assert.equal(narrow.fontSize, 11);
assert.equal(narrow.closeOnly, true);
assert.equal(narrow.lines, 1);
// أضيق ما يكون: 11 والإغلاق وحده بلا تغيّر
const tiny = planDenseOhlc(l1, l2, pct, range, 60, cl);
assert.equal(tiny.fontSize, 11);
assert.equal(tiny.closeOnly, true);
assert.equal(tiny.showPct, false);
// الخطّ 11 دائماً، والحقول لا تنقص مع اتّساع العرض
const rank = (p: ReturnType<typeof planDenseOhlc>) =>
  (p.closeOnly ? 0 : p.wide ? 2 : 1) * 4 + (p.showPct ? 1 : 0) + (p.showRange ? 2 : 0);
let prev = -1;
for (let w = 40; w <= 500; w += 5) {
  const p = planDenseOhlc(l1, l2, pct, range, w, cl);
  assert.equal(p.fontSize, 11, `w=${w}`);
  assert.ok(rank(p) >= prev, `w=${w}: حقول أقلّ من عرض أضيق`);
  prev = rank(p);
}
// بلا تغيّر (أول شمعة): لا يُعرض
assert.equal(planDenseOhlc(l1, l2, null, null, 400, cl).showPct, false);
// النصّ نفسه بأرقام مختلفة وطول واحد ⇒ الخطة نفسها (لا قفز أثناء السحب)
assert.deepEqual(planDenseOhlc(l1, l2, pct, null, 200, cl), planDenseOhlc('O 1.99999  H 1.11111', 'L 1.00000  C 1.77777', '-0.01%', null, 200, 'C 1.77777'));

console.log('denseOhlcFit selftest: PASS');
