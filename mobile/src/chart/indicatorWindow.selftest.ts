/**
 * Self-test for indicatorWindow (pure).
 * Run: npx --yes tsx src/chart/indicatorWindow.selftest.ts
 */
import assert from 'node:assert/strict';
import { indicatorBase, indicatorRangeBase, trimIndicator, trimIndicatorRange } from './indicatorWindow';
import { computeFractals, computeIchimoku } from './indicators/trend';
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

// الناظرة للأمام: نافذة مسحوبة 100 شمعة للخلف ⇒ Chikou والفراكتلات حتى حافّتها اليمنى (الشموع اللاحقة محمَّلة)
{
  const bars = all.map((c) => ({
    ...c,
    open: c.close,
    high: c.close + 0.0005 + Math.sin(c.time / 3) * 0.0004,
    low: c.close - 0.0005,
    volume: 0,
  }));
  const plot = bars.slice(20, 80);
  const b = indicatorRangeBase(bars, 20, plot, true);
  assert.deepEqual([b.from, b.to, b.bars.length], [20, 80, 180]);
  const ich = trimIndicatorRange(computeIchimoku(b.bars), b.bars.length, b.from, b.to);
  assert.equal(ich.chikou.length, 60);
  assert.equal(ich.chikou[59], bars[79 + 25]!.close, 'Chikou على آخر شمعة بالنافذة = إغلاق بعد 25');
  const old = trimIndicator(computeIchimoku(indicatorBase(bars, 20, plot).bars), 80, 20);
  assert.equal(old.chikou[59], null, 'الأساس القديم كان يُفرغها');
  const fr = trimIndicatorRange(computeFractals(b.bars), b.bars.length, b.from, b.to);
  const frFull = computeFractals(bars);
  assert.deepEqual(fr.top, frFull.top.slice(20, 80), 'الفراكتلات = السلسلة كلّها حتى آخر شمعتين');
  // الإعادة: حتى آخر شمعة معروضة فقط
  const r = indicatorRangeBase(bars, 20, plot, false);
  assert.deepEqual([r.from, r.to, r.bars.length], [20, 80, 80]);
  // غير محاذية (احتياط التابع) ⇒ النافذة وحدها
  const u = indicatorRangeBase(bars, 20, bars.slice(0, 60), true);
  assert.deepEqual([u.from, u.to, u.bars.length], [0, 60, 60]);
}

console.log('indicatorWindow.selftest: OK');
