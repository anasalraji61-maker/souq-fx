/**
 * Self-test for anchorDemoSeries (pure).
 * Run: npx --yes tsx src/chart/demoAnchor.selftest.ts
 */
import assert from 'node:assert/strict';
import { anchorDemoSeries } from './demoAnchor';
import type { ChartSeries } from '../api';

const s: ChartSeries = {
  symbol: 'EURUSD',
  timeframe: '15m',
  candles: [
    { time: 1, open: 1.08, high: 1.082, low: 1.079, close: 1.081 },
    { time: 2, open: 1.081, high: 1.0854, low: 1.0805, close: 1.085 },
  ],
  change_pct: 0.37,
  last: 1.085,
  data_source: { kind: 'demo', as_of: 0, channel: 'mock' },
};

const a = anchorDemoSeries(s, 1.17);
// آخر إغلاق = السعر الحيّ
assert.equal(a.candles[1].close, 1.17);
assert.equal(a.last, 1.17);
// الشكل محفوظ: النسبة بين إغلاقَين كما هي (ضمن تقريب 6 منازل)
assert.ok(Math.abs(a.candles[0].close / a.candles[1].close - 1.081 / 1.085) < 1e-5);
// high ≥ max(open, close) و low ≤ min بعد الضرب
for (const c of a.candles) {
  assert.ok(c.high >= Math.max(c.open, c.close));
  assert.ok(c.low <= Math.min(c.open, c.close));
}
// الأصل لا يُعدَّل، والحقول الأخرى تبقى
assert.equal(s.candles[1].close, 1.085);
assert.equal(a.data_source?.kind, 'demo');
assert.equal(a.change_pct, s.change_pct);
// سعر غير صالح أو سلسلة فارغة ⇒ كما هي
assert.equal(anchorDemoSeries(s, NaN), s);
assert.equal(anchorDemoSeries(s, 0), s);
assert.equal(anchorDemoSeries({ ...s, candles: [] }, 1.17).candles.length, 0);
// الين: 3 منازل + 1
const j = anchorDemoSeries({ ...s, symbol: 'USDJPY' }, 149.123);
assert.equal(j.candles[1].close, 149.123);

console.log('demoAnchor selftest: OK');
