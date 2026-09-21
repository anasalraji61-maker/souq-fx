/**
 * Self-test for newsRisk (pure).
 * Run: npx --yes tsx src/chart/newsRisk.selftest.ts
 */
import assert from 'node:assert/strict';
import { nextHighImpact, symbolCurrencies, type NewsEvent } from './newsRisk';

assert.deepEqual(symbolCurrencies('EURUSD'), ['EUR', 'USD']);
assert.deepEqual(symbolCurrencies('gbpjpy'), ['GBP', 'JPY']);
assert.deepEqual(symbolCurrencies('XAUUSD'), ['USD']);
assert.deepEqual(symbolCurrencies('DXY'), ['USD']);
assert.deepEqual(symbolCurrencies('USDCNH'), ['USD', 'CNY']);
assert.deepEqual(symbolCurrencies('EUR/USD'), ['EUR', 'USD']);
assert.deepEqual(symbolCurrencies('BTCUSD'), []);
assert.deepEqual(symbolCurrencies('NAS100'), []);
assert.deepEqual(symbolCurrencies(''), []);

const now = 1_800_000_000_000;
const ev = (id: string, cur: string, impact: string, minsFromNow: number | null, sample = false): NewsEvent => ({
  id,
  title: id,
  currency: cur,
  impact,
  ts: minsFromNow == null ? null : (now + minsFromNow * 60_000) / 1000,
  sample,
});

const list = [
  ev('usd-low', 'USD', 'low', 10),
  ev('usd-high-90', 'USD', 'high', 90),
  ev('eur-high-45', 'EUR', 'High', 45),
  ev('jpy-high-5', 'JPY', 'high', 5),
  ev('usd-high-sample', 'USD', 'high', 1, true),
  ev('usd-high-notime', 'USD', 'high', null),
  ev('usd-high-past', 'USD', 'high', -30),
  ev('usd-high-far', 'USD', 'high', 200),
];

const r1 = nextHighImpact(list, ['EUR', 'USD'], now);
assert.equal(r1?.event.id, 'eur-high-45');
assert.equal(r1?.deltaMs, 45 * 60_000);
assert.equal(nextHighImpact(list, ['USD'], now)?.event.id, 'usd-high-90');
assert.equal(nextHighImpact(list, ['GBP'], now), null);
assert.equal(nextHighImpact(list, [], now), null);
// جارٍ الآن (قبل 10 دقائق) يبقى ظاهراً ضمن مهلة 15 دقيقة
const r2 = nextHighImpact([ev('now', 'USD', 'high', -10)], ['USD'], now);
assert.equal(r2?.event.id, 'now');
assert.ok(r2!.deltaMs < 0);
// حدود النافذة
assert.equal(nextHighImpact([ev('edge', 'USD', 'high', 180)], ['USD'], now)?.event.id, 'edge');
assert.equal(nextHighImpact([ev('edge2', 'USD', 'high', -15)], ['USD'], now)?.event.id, 'edge2');

console.log('newsRisk selftest OK');
