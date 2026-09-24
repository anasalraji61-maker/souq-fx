/**
 * Self-test for indicatorWindow (pure).
 * Run: npx --yes tsx src/chart/indicatorWindow.selftest.ts
 */
import assert from 'node:assert/strict';
import { indicatorBase, trimIndicator } from './indicatorWindow';
import { computeRsi, dema } from './math';

const all = Array.from({ length: 180 }, (_, i) => ({ time: i, close: 1.08 + Math.sin(i / 7) * 0.003 + i * 1e-5 }));

// نافذة 80 على اليمين: التاريخ كلّه، والقصّ من بداية النافذة
{
  const plot = all.slice(100, 180);
  const b = indicatorBase(all, 100, plot);
  assert.equal(b.bars.length, 180);
  assert.equal(b.cut, 100);
  const closes = b.bars.map((c) => c.close);
  const rsi = trimIndicator(computeRsi(closes), closes.length, b.cut);
  assert.equal(rsi.length, 80);
  assert.ok(rsi.every((v) => v != null), 'RSI من أول شمعة معروضة');
  // القيمة على الشمعة نفسها لا تتغيّر بالسحب: نافذة مسحوبة 20 شمعة للخلف
  const plot2 = all.slice(80, 160);
  const b2 = indicatorBase(all, 80, plot2);
  assert.equal(b2.bars.length, 160);
  const c2 = b2.bars.map((c) => c.close);
  const d1 = trimIndicator(dema(closes, 20), closes.length, b.cut);
  const d2 = trimIndicator(dema(c2, 20), c2.length, b2.cut);
  assert.equal(d1[59], d2[79], 'DEMA للشمعة 159 نفسها بالنافذتين');
}

// الإعادة / نافذة يسارية: التاريخ حتى آخر معروضة فقط (لا مستقبل)
{
  const plot = all.slice(40, 70);
  const b = indicatorBase(all, 40, plot);
  assert.equal(b.bars.length, 70);
  assert.equal(b.bars[69], all[69]);
}

// شموع ليست `all[start…]` (احتياط التابع المتزامن) ⇒ النافذة وحدها كما كان
{
  const plot = all.slice(-40);
  const b = indicatorBase(all, 175, plot);
  assert.equal(b.cut, 0);
  assert.equal(b.bars.length, 40);
  assert.deepEqual(indicatorBase(all, 0, []), { bars: [], cut: 0 });
}

// أشكال الناتج: مصفوفة، كائن مصفوفات، خطوط GMMA، أعداد ومصفوفات بطول آخر
{
  const n = 5;
  const r = trimIndicator(
    { a: [1, 2, 3, 4, 5], lines: [[1, 2, 3, 4, 5], [6, 7, 8, 9, 10]], k: 3, other: [9, 9], nested: { b: [0, 0, 0, 1, 2] } },
    n,
    3
  );
  assert.deepEqual(r, { a: [4, 5], lines: [[4, 5], [9, 10]], k: 3, other: [9, 9], nested: { b: [1, 2] } });
  assert.deepEqual(trimIndicator([1, 2, 3], 3, 0), [1, 2, 3]);
  assert.equal(trimIndicator(null, 3, 1), null);
}

console.log('indicatorWindow.selftest: OK');
