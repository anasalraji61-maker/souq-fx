/** فحص ذاتي لانحراف `computeVwapBands` — يُشغَّل بـNode بلا شجرة مكوّنات. */
import assert from 'node:assert/strict';
import { computeVwapBands } from './indicators/volume';

// ثلاث شموع بفوليوم متساوٍ و tp = 1.0000/1.0010/1.0020 ⇒ VWAP 1.0010، sd = √(2/3)×0.001 = 0.000816
// (TradingView)، لا 0.000645 (انحراف كل شمعة عن VWAP لحظتها).
const bar = (tp: number, t: number) => ({ time: t, open: tp, high: tp, low: tp, close: tp, volume: 50 });
const b = computeVwapBands([bar(1.0, 0), bar(1.001, 1), bar(1.002, 2)], 2);
const sd = Math.sqrt(2 / 3) * 0.001;
assert.ok(Math.abs(b.mid[2]! - 1.001) < 1e-12, 'VWAP');
assert.ok(Math.abs(b.upper[2]! - (1.001 + 2 * sd)) < 1e-12, `العلوي ${b.upper[2]}`);
assert.ok(Math.abs(b.lower[2]! - (1.001 - 2 * sd)) < 1e-12, `السفلي ${b.lower[2]}`);
// جلسة جديدة تصفّر: أوّل شمعة بها بلا انحراف
const s = computeVwapBands([bar(1.0, 0), bar(1.002, 1), bar(1.5, 2)], 2, (c) => (c.time < 2 ? 0 : 1));
assert.ok(Math.abs(s.upper[2]! - 1.5) < 1e-12 && Math.abs(s.lower[2]! - 1.5) < 1e-12, 'تصفير الجلسة');

console.log('vwapBands.selftest: PASS');
