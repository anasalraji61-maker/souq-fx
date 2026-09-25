/**
 * Self-test for tickAge.ts — رفض سعر متجمّد يعيد الخادم بثّه (`ticks_at`، backend 1f40c21).
 * Run: npx --yes tsx src/hooks/tickAge.selftest.ts
 */
import assert from 'node:assert/strict';
import { acceptTick, tickServerAgeSec } from './tickAge';

const src = { kind: 'provider' as const, as_of: 1000, channel: 'twelvedata_ws' };
const now = 5_000_000;
const STALE = 20_000;

// خادم أقدم بلا `ticks_at` ⇒ السلوك القديم (لحظة الوصول، مصدر الدفعة)
assert.equal(tickServerAgeSec({ ts: 1000 }, 'EURUSD'), null);
assert.deepEqual(acceptTick({ ts: 1000 }, 'EURUSD', 1.1, src, now, STALE), {
  tick: { price: 1.1, source: src },
  at: now,
});

// الدفعة: EURUSD حديث، XAUUSD متجمّد منذ 90ث (مثال اختبار الخادم)
const batch = { ts: 1000, ticks_at: { EURUSD: 999, XAUUSD: 910, GBPUSD: null } };
assert.equal(tickServerAgeSec(batch, 'XAUUSD'), 90);
assert.equal(acceptTick(batch, 'XAUUSD', 2650, src, now, STALE), null);

// الحديث يُقبل بعمره الحقيقي و`as_of` خاصّ به
const e = acceptTick(batch, 'EURUSD', 1.1, src, now, STALE);
assert.ok(e);
assert.equal(e.at, now - 1000);
assert.equal(e.tick.source.as_of, 999);
assert.equal(e.tick.source.kind, 'provider');

// عند الحدّ تماماً يُقبل؛ بعده يُرفض
assert.ok(acceptTick({ ts: 1000, ticks_at: { X: 980 } }, 'X', 1, src, now, STALE));
assert.equal(acceptTick({ ts: 1000, ticks_at: { X: 979.9 } }, 'X', 1, src, now, STALE), null);

// `ticks_at` null/غير صالح للرمز ⇒ لا يُحكم بعمره (سلوك قديم)
assert.equal(acceptTick(batch, 'GBPUSD', 1.3, src, now, STALE)?.at, now);

// ساعة خادم تسبق `ticks_at` (فرق دقيق) ⇒ عمر 0 لا سالب
assert.equal(tickServerAgeSec({ ts: 1000, ticks_at: { X: 1000.4 } }, 'X'), 0);

// الأسعار المعطوبة تبقى مرفوضة
for (const bad of [0, -1, NaN, Infinity, '1.1', null]) {
  assert.equal(acceptTick(batch, 'EURUSD', bad, src, now, STALE), null);
}

console.log('tickAge.selftest: OK');
