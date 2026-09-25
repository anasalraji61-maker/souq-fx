/**
 * Self-test: VWAP / VWAP Bands / TWAP تُصفَّر عند يوم تداول جديد (17:00 نيويورك) حين يُمرَّر `sessionOf`.
 * Run: npx --yes tsx src/chart/vwapSession.selftest.ts
 */
import assert from 'node:assert/strict';
import type { Candle } from '../api';
import { computeTwap } from './indicators/price-transform';
import { computeVwap, computeVwapBands } from './indicators/volume';
import { tradingDayStartSec } from './marketHours';

const near = (a: number | null | undefined, b: number, msg = '') =>
  assert.ok(a != null && Math.abs(a - b) < 1e-12, `${msg} got=${a} want=${b}`);

// 1H EURUSD من الاثنين 2026-09-21 12:00 UTC — الصيفي: اليوم يبدأ 21:00 UTC
const t0 = Date.UTC(2026, 8, 21, 12) / 1000;
const candles: (Candle & { volume: number })[] = [];
for (let i = 0; i < 24; i++) {
  const p = i < 9 ? 1.1 : 1.2; // 12:00…20:00 عند 1.1، ثم 21:00 فصاعداً عند 1.2
  candles.push({ time: t0 + i * 3600, open: p, high: p, low: p, close: p, volume: 100 } as Candle & {
    volume: number;
  });
}
const sessionOf = (c: Candle) => tradingDayStartSec('EURUSD', c.time);
assert.notEqual(sessionOf(candles[8]), sessionOf(candles[9]), '21:00 UTC is a new day');

const cont = computeVwap(candles);
const sess = computeVwap(candles, sessionOf);
near(sess[8], 1.1);
// اليوم الجديد: VWAP = سعره لا متوسط أمس واليوم
near(sess[9], 1.2, 'reset at rollover');
near(sess[23], 1.2);
// بلا sessionOf: التراكم القديم كما هو
near(cont[9], (1.1 * 9 + 1.2) / 10, 'continuous unchanged');

// النطاقات: التباين يُصفَّر معه — سعر ثابت باليوم الجديد ⇒ عرض صفر
const b = computeVwapBands(candles, 2, sessionOf);
near(b.upper[15], 1.2);
near(b.lower[15], 1.2);
const bc = computeVwapBands(candles);
assert.ok(bc.upper[15]! - bc.lower[15]! > 0.01, 'continuous bands keep old variance');

// TWAP بالجلسة نفسها: يُصفَّر مع VWAP، وبلا sessionOf المتوسط التراكمي كما كان
const tw = computeTwap(candles, sessionOf);
near(tw[8], 1.1);
near(tw[9], 1.2, 'twap reset at rollover');
near(tw[23], 1.2);
near(computeTwap(candles)[9]!, (1.1 * 9 + 1.2) / 10, 'twap continuous unchanged');

// اليومي (Anchor = Session كـTradingView): كل شمعة جلستها ⇒ VWAP = (H+L+C)/3 لا تراكم يتغيّر مع التاريخ المحمَّل
const d1: (Candle & { volume: number })[] = [
  { time: 0, open: 1.1, high: 1.3, low: 1.0, close: 1.2, volume: 500 },
  { time: 86400, open: 1.2, high: 1.5, low: 1.2, close: 1.5, volume: 10 },
] as (Candle & { volume: number })[];
const d1v = computeVwap(d1, (c) => c.time);
near(d1v[0], (1.3 + 1.0 + 1.2) / 3, 'd1 bar0 = hlc3');
near(d1v[1], (1.5 + 1.2 + 1.5) / 3, 'd1 bar1 = hlc3, not weighted by bar0');

console.log('vwapSession selftest PASS');
