/**
 * Self-test for the live-tick plausibility guard (pure).
 * Run: npx --yes tsx src/chart/liveSeries.selftest.ts
 */
import assert from 'node:assert/strict';
import { livePriceForChart, tickPlausibleForSeries, withLivePrice } from './liveSeries';
import type { ChartSeries } from '../api';

const now = 1_760_000_000;
const src = { kind: 'provider' as const, as_of: now, channel: 'twelvedata' };
const eur: ChartSeries = {
  symbol: 'EURUSD',
  timeframe: '15m',
  candles: Array.from({ length: 30 }, (_, i) => ({
    time: now - (29 - i) * 900 - 60,
    open: 1.17,
    high: 1.1705,
    low: 1.1697,
    close: 1.1702,
  })),
  change_pct: 0,
  last: 1.1702,
  data_source: src,
};

// حركة عادية تُقبل
assert.equal(tickPlausibleForSeries(eur, 1.1712), true);
// تيك الذهب أو الباوند على شموع اليورو (تبديل الرمز قبل وصول الجلب) يُرفض
assert.equal(tickPlausibleForSeries(eur, 2650), false);
assert.equal(tickPlausibleForSeries(eur, 1.345), false);
// فريم يومي متقلّب: 20× وسيط المدى يوسّع الحدّ فوق 3%
const btc: ChartSeries = {
  ...eur,
  symbol: 'BTCUSD',
  timeframe: '1d',
  candles: eur.candles.map((c) => ({ ...c, open: 60000, high: 61500, low: 59000, close: 60000 })),
};
assert.equal(tickPlausibleForSeries(btc, 66000), true);
// بلا شموع ⇒ لا حكم
assert.equal(tickPlausibleForSeries({ ...eur, candles: [] }, 5), true);

// المسار الكامل: تيك مرفوض لا يُدمج ولا يُعاد سعراً للشارت
const tick = (price: number) => ({ price, source: src });
assert.equal(livePriceForChart(eur, tick(2650), { nowSec: now + 1 }), null);
assert.equal(livePriceForChart(eur, tick(1.1709), { nowSec: now + 1 }), 1.1709);
assert.equal(withLivePrice(eur, 2650, src, { nowSec: now + 1 }), eur);

console.log('liveSeries selftest: OK');
