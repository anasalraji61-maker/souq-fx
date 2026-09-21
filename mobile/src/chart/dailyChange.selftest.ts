/**
 * Self-test for dailyChange (pure).
 * Run: npx --yes tsx src/chart/dailyChange.selftest.ts
 */
import assert from 'node:assert/strict';
import { dailyChange, formatPct, prevCloseFromDaily, tickDirection } from './dailyChange';

// إغلاق الأمس = الشمعة قبل الأخيرة، حتى لو وصلت الشموع غير مرتّبة
assert.equal(prevCloseFromDaily([{ time: 1, close: 1.08 }, { time: 2, close: 1.09 }, { time: 3, close: 1.1 }]), 1.09);
assert.equal(prevCloseFromDaily([{ time: 3, close: 1.1 }, { time: 1, close: 1.08 }, { time: 2, close: 1.09 }]), 1.09);
assert.equal(prevCloseFromDaily([{ time: 1, close: 1.08 }]), null);
assert.equal(prevCloseFromDaily([]), null);
assert.equal(prevCloseFromDaily([{ time: 1, close: 0 }, { time: 2, close: 1 }]), null);
assert.equal(prevCloseFromDaily([{ time: 1, close: NaN }, { time: 2, close: 1 }]), null);

// تغيّر موجب/سالب/ثابت
const up = dailyChange(1.1, 1.0)!;
assert.equal(up.dir, 'up');
assert.ok(Math.abs(up.pct - 10) < 1e-9);
assert.equal(dailyChange(0.9, 1.0)!.dir, 'down');
assert.equal(dailyChange(2348.6, 2348.6)!.dir, 'flat');
// ضجيج أقل من 0.005% = ثابت (ذهب: 0.1 على 2348 ≈ 0.0043%)
assert.equal(dailyChange(2348.7, 2348.6)!.dir, 'flat');
assert.equal(dailyChange(2349.0, 2348.6)!.dir, 'up');
// مدخلات فاسدة
assert.equal(dailyChange(null, 1), null);
assert.equal(dailyChange(1, null), null);
assert.equal(dailyChange(1, 0), null);
assert.equal(dailyChange(-1, 1), null);

// تنسيق
assert.equal(formatPct(0.2345), '+0.23%');
assert.equal(formatPct(-0.4), '\u22120.40%');
assert.equal(formatPct(-1.5), '−1.50%');
assert.equal(formatPct(0.001), '0.00%');
assert.equal(formatPct(-0.001), '0.00%');
assert.equal(formatPct(NaN), '—');

// اتجاه التيك
assert.equal(tickDirection(1, 2), 'up');
assert.equal(tickDirection(2, 1), 'down');
assert.equal(tickDirection(1, 1), 'flat');
assert.equal(tickDirection(null, 1), 'flat');

console.log('dailyChange selftest OK');
