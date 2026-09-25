/**
 * Self-test for armedAlertsFor (pure).
 * Run: npx --yes tsx src/chart/armedAlerts.selftest.ts
 */
import assert from 'node:assert/strict';
import type { PriceAlert } from '../api';
import { armedAlertsFor } from './armedAlerts';

const al = (over: Partial<PriceAlert>): PriceAlert => ({
  id: Math.random().toString(36).slice(2),
  symbol: 'EURUSD',
  condition: 'above',
  price: 1.09,
  note: '',
  active: true,
  triggered: false,
  ts: '',
  ...over,
});

const list = [
  al({ price: 1.085, condition: 'below' }),
  al({ price: 1.0925 }),
  al({ price: 1.0925 }), // مكرّر ⇒ خطّ واحد
  al({ price: 1.1, triggered: true }), // أُطلق
  al({ price: 1.2, active: false }), // موقوف
  al({ symbol: 'GBPUSD', price: 1.27 }),
  al({ symbol: ' eurusd ', price: 1.07 }), // حالة الأحرف والمسافات
  al({ price: Number.NaN }),
  al({ price: 0 }),
];

const out = armedAlertsFor(list, 'EURUSD');
assert.deepEqual(
  out.map((a) => [a.price, a.condition]),
  [
    [1.0925, 'above'],
    [1.085, 'below'],
    [1.07, 'above'],
  ]
);
assert.equal(armedAlertsFor(list, 'eurusd').length, 3);
assert.deepEqual(armedAlertsFor(list, 'GBPUSD').map((a) => a.price), [1.27]);
assert.equal(armedAlertsFor(list, '').length, 0);
assert.equal(armedAlertsFor([], 'EURUSD').length, 0);

console.log('armedAlerts selftest: PASS');
