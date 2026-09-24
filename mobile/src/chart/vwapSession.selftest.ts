/**
 * Self-test: VWAP / VWAP Bands تُصفَّر عند يوم تداول جديد (17:00 نيويورك) حين يُمرَّر `sessionOf`.
 * Run: npx --yes tsx src/chart/vwapSession.selftest.ts
 */
import assert from 'node:assert/strict';
import type { Candle } from '../api';
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

console.log('vwapSession selftest PASS');
