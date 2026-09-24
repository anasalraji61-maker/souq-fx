/**
 * Self-test for planHiLoLabels (pure).
 * Run: npx --yes tsx src/chart/hiLoLabels.selftest.ts
 */
import assert from 'node:assert/strict';
import { planHiLoLabels } from './hiLoLabels';

const bars = (hl: [number, number][]) => hl.map(([high, low]) => ({ high, low }));
const xs = (n: number, w: number, pan = 0) => (i: number) => ((i + 0.5) / n) * w + pan;

// الأساس: القمّة والقاع وجهة الوسم
{
  const p = bars([
    [1.1, 1.0],
    [1.3, 1.05],
    [1.2, 0.9],
    [1.15, 1.0],
  ]);
  const r = planHiLoLabels(p, xs(4, 400), 400, 300)!;
  assert.equal(r.high.index, 1);
  assert.equal(r.high.price, 1.3);
  assert.equal(r.high.leftSide, false); // x=150 بالنصف الأيسر ⇒ الوسم يمينه
  assert.equal(r.low.index, 2);
  assert.equal(r.low.price, 0.9);
  assert.equal(r.low.leftSide, true); // x=250 بالنصف الأيمن ⇒ الوسم يساره
}

// التعادل ⇒ الأحدث
{
  const p = bars([
    [2, 1],
    [2, 1],
    [1.5, 1.2],
  ]);
  const r = planHiLoLabels(p, xs(3, 300), 300, 300)!;
  assert.equal(r.high.index, 1);
  assert.equal(r.low.index, 1);
}

// شموع خارج الشاشة بالإزاحة لا تُحتسب
{
  const p = bars([
    [9, 0.1], // x = 50 − 200 < 0
    [1.2, 1.0],
    [1.3, 1.1],
    [1.25, 0.95],
  ]);
  const r = planHiLoLabels(p, xs(4, 400, -200), 400, 300)!;
  assert.equal(r.high.index, 2);
  assert.equal(r.low.index, 3);
}

// لا وسم: شمعة واحدة، مدى صفر، لوح قصير، عرض فاسد، قيم فاسدة
assert.equal(planHiLoLabels(bars([[1, 0.5]]), xs(1, 300), 300, 300), null);
assert.equal(planHiLoLabels(bars([[1, 1], [1, 1]]), xs(2, 300), 300, 300), null);
assert.equal(planHiLoLabels(bars([[2, 1], [3, 1.5]]), xs(2, 300), 300, 100), null);
assert.equal(planHiLoLabels(bars([[2, 1], [3, 1.5]]), xs(2, 300), 300, 100, 80) != null, true);
assert.equal(planHiLoLabels(bars([[2, 1], [3, 1.5]]), xs(2, 300), 0, 300), null);
{
  const r = planHiLoLabels(bars([[NaN, 1], [3, 1.5], [2.5, 1.2]]), xs(3, 300), 300, 300)!;
  assert.equal(r.high.index, 1);
  assert.equal(r.low.index, 2);
}

console.log('hiLoLabels.selftest: PASS');
