/**
 * Self-test for dataSource / liveSeries helpers (imports the real modules).
 * Run: npx --yes tsx src/chart/dataSource.selftest.ts
 */
import assert from 'node:assert/strict';
import {
  canMergeLiveIntoCandles,
  isFreshTick,
  isRealQuote,
  isValidAsOf,
  sourceFamily,
  tickBelongsToCandle,
  tickStatusLabel,
  FRESH_TICK_SEC,
  CLOCK_SKEW_SEC,
} from './dataSource';
import { withLivePrice, livePriceForChart, liveChangePct } from './liveSeries';
import type { ChartSeries } from '../api';

function series(partial: Partial<ChartSeries> & Pick<ChartSeries, 'candles' | 'data_source'>): ChartSeries {
  return {
    symbol: 'EURUSD',
    timeframe: '15m',
    change_pct: 0,
    last: partial.candles[partial.candles.length - 1]?.close ?? 0,
    ...partial,
  };
}

let fails = 0;
function check(name: string, cond: boolean) {
  if (!cond) {
    fails += 1;
    console.error('FAIL', name);
  } else {
    console.log('ok', name);
  }
}

// Families
check('family twelvedata_ws', sourceFamily('twelvedata_ws') === 'twelvedata');
check('family other', sourceFamily('otherfeed') === 'unknown');

// Channel-aware merge
check(
  'same provider family REST+WS',
  canMergeLiveIntoCandles(
    { kind: 'cache', channel: 'twelvedata' },
    { kind: 'provider', channel: 'twelvedata_ws' }
  )
);
check(
  'different channels blocked',
  !canMergeLiveIntoCandles(
    { kind: 'provider', channel: 'twelvedata' },
    { kind: 'provider', channel: 'otherfeed' }
  )
);
check(
  'unknown channel blocked',
  !canMergeLiveIntoCandles(
    { kind: 'provider', channel: null },
    { kind: 'provider', channel: 'twelvedata_ws' }
  )
);
check(
  'demo seed + ws_seed',
  canMergeLiveIntoCandles({ kind: 'demo', channel: 'seed' }, { kind: 'demo', channel: 'ws_seed' })
);
check(
  'demo vs provider blocked',
  !canMergeLiveIntoCandles({ kind: 'demo', channel: 'mock' }, { kind: 'provider', channel: 'twelvedata_ws' })
);

// Freshness
const now = 1_700_000_000;
check('fresh ok', isFreshTick(now - 5, now));
check('stale after window', !isFreshTick(now - (FRESH_TICK_SEC + 1), now));
check('future beyond skew', !isValidAsOf(now + CLOCK_SKEW_SEC + 5, now));
check('NaN rejected', !isValidAsOf(Number.NaN, now));
check('label stale provider', tickStatusLabel({ kind: 'provider', channel: 'twelvedata_ws' }, now - 20, now) === 'آخر سعر');
check('label fresh provider', tickStatusLabel({ kind: 'provider', channel: 'twelvedata_ws' }, now - 2, now) === 'حي');

// Candle bucket
const open = now - 100; // candle opened 100s ago, 15m step
const step = 900;
check('tick in bucket', tickBelongsToCandle(open, open + 50, step, now));
check('tick after bucket', !tickBelongsToCandle(open, open + step + 1, step, now));
check('tick before open', !tickBelongsToCandle(open, open - 1, step, now));

// withLivePrice must not rewrite historical candle
const histOpen = now - 3600;
const hist: ChartSeries = series({
  data_source: { kind: 'provider', channel: 'twelvedata', as_of: histOpen },
  candles: [
    { time: histOpen, open: 1.1, high: 1.11, low: 1.09, close: 1.105 },
  ],
  timeframe: '15m',
});
const unchanged = withLivePrice(
  hist,
  1.2,
  { kind: 'provider', channel: 'twelvedata_ws', as_of: now },
  { tickAsOf: now, timeframe: '15m', nowSec: now }
);
check('historical close unchanged', unchanged.candles[0]!.close === 1.105);
check('livePriceForChart null outside bucket', livePriceForChart(hist, {
  price: 1.2,
  source: { kind: 'provider', channel: 'twelvedata_ws', as_of: now },
}, { tickAsOf: now, timeframe: '15m', nowSec: now }) === null);

// Forming candle merges
const formOpen = now - 60;
const forming: ChartSeries = series({
  data_source: { kind: 'cache', channel: 'twelvedata', as_of: formOpen },
  candles: [{ time: formOpen, open: 1.1, high: 1.11, low: 1.09, close: 1.105 }],
  timeframe: '15m',
});
const merged = withLivePrice(
  forming,
  1.12,
  { kind: 'provider', channel: 'twelvedata_ws', as_of: now },
  { tickAsOf: now, timeframe: '15m', nowSec: now }
);
check('forming candle merged', merged.candles[0]!.close === 1.12);
const liveSrc = { kind: 'provider' as const, channel: 'twelvedata_ws', as_of: now };
const liveOpts = { tickAsOf: now, timeframe: '15m', nowSec: now };
check('livePriceForChart good tick in bucket', livePriceForChart(forming, { price: 1.12, source: liveSrc }, liveOpts) === 1.12);
check(
  'livePriceForChart rejects zero/negative/NaN tick',
  livePriceForChart(forming, { price: 0, source: liveSrc }, liveOpts) === null &&
    livePriceForChart(forming, { price: -1.1, source: liveSrc }, liveOpts) === null &&
    livePriceForChart(forming, { price: NaN, source: liveSrc }, liveOpts) === null
);
check(
  'withLivePrice ignores zero/NaN tick',
  withLivePrice(forming, 0, liveSrc, liveOpts) === forming &&
    withLivePrice(forming, NaN, liveSrc, liveOpts) === forming
);

// نسبة الرأس تتبع السعر الحيّ: من إغلاق أول شمعة (تعريف الخادم)، ونسبة الخادم بلا سعر مدموج.
const twoBars: ChartSeries = {
  ...forming,
  change_pct: 0.5,
  candles: [{ time: 0, open: 1, high: 1, low: 1, close: 1.0 }, ...forming.candles],
};
check('liveChangePct from first close', Math.abs(liveChangePct(twoBars, 1.01) - 1) < 1e-9);
check('liveChangePct null ⇒ server pct', liveChangePct(twoBars, null) === 0.5);
check('liveChangePct zero/NaN ⇒ server pct', liveChangePct(twoBars, 0) === 0.5 && liveChangePct(twoBars, NaN) === 0.5);

// اقتباس حقيقي مقابل بذري تجريبي
check('quote provider', isRealQuote({ price: 8.2, source: 'twelvedata', data_kind: 'provider' }));
check('quote cache fallback', isRealQuote({ price: 1.17, source: 'ohlc_fallback', data_kind: 'cache' }));
check('quote unknown channel', isRealQuote({ price: 1.17, source: 'ohlc_fallback', data_kind: 'unknown' }));
check('quote demo rejected', !isRealQuote({ price: 0.999, source: 'ohlc_fallback', data_kind: 'demo' }));
check('legacy fallback rejected', !isRealQuote({ price: 0.999, source: 'ohlc_fallback' }));
check('legacy twelvedata ok', isRealQuote({ price: 150.2, source: 'twelvedata' }));
check('bad price rejected', !isRealQuote({ price: 0, data_kind: 'provider' }) && !isRealQuote({ price: NaN, data_kind: 'provider' }));

assert.equal(fails, 0);
console.log(JSON.stringify({ ok: true, fails }));
