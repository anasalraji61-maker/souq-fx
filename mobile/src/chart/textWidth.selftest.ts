/**
 * Self-test for textWidth (pure).
 * Run: npx --yes tsx src/chart/textWidth.selftest.ts
 */
import assert from 'node:assert/strict';
import { monoCharW, monoTextWidth, propTextWidth } from './textWidth';
import { legendChipWidth } from './priceLegend';

// الأحادي: 0.6em لكل محرف، ثابت واحد لوسم القمّة/القاع ووقت التقاطع
assert.ok(Math.abs(monoCharW(11) - 6.6) < 1e-9);
assert.ok(Math.abs(monoTextWidth('1.08432', 11) - 7 * 6.6) < 1e-9);
assert.equal(monoTextWidth('الأربعاء', 11), 8 * 6.6); // بالمحارف لا بوحدات UTF-16

// التناسبي: الأسماء الكبيرة أعرض من الصغيرة بعدد المحارف نفسه
assert.ok(propTextWidth('MACD', 11) > propTextWidth('rsi.', 11));
assert.ok(propTextWidth('MACD', 11) > 4 * 6.4); // التقدير القديم كان يقصّها
assert.ok(propTextWidth('W', 11) > propTextWidth('A', 11));
assert.ok(propTextWidth('i', 11) < propTextWidth('a', 11));
// الأرقام بعرض واحد (tabular-nums)
assert.equal(propTextWidth('11', 11), propTextWidth('88', 11));
// لا ينقص عن التقدير القديم لأسماء المفتاح الشائعة (لا قصّ جديد)
for (const label of ['SMA 20', 'EMA 21', 'VWAP', 'Ichimoku', 'Supertrend', 'McGinley']) {
  assert.ok(propTextWidth(label, 11) >= label.length * 5.5, label);
}
// الشارة نفسها تتّسع للاسم الكبير
assert.ok(legendChipWidth({ label: 'MACD', swatch: ['a'] }) > legendChipWidth({ label: 'rsi.', swatch: ['a'] }));

console.log('textWidth selftest: PASS');
