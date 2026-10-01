/**
 * Self-test for Chande Kroll Stop (pure) — صيغة TradingView: الحدّ الأوّل داخل المدى.
 * Run: npx --yes tsx src/chart/chandeKroll.selftest.ts
 */
import assert from 'node:assert/strict';
import { computeChandeKrollStop } from './indicators/trend';

// شموع متطابقة H=1.1010 L=1.1000 ⇒ ATR=0.0010: وقف البيع = أعلى − ATR = 1.1000، وقف الشراء = أدنى + ATR = 1.1010.
// كان 1.1020 / 1.0990 (الإشارة معكوسة) ⇒ الوقفان أبعد بـ2×ATR ولا يتقاطعان أبداً.
const flat = Array.from({ length: 40 }, (_, i) => ({
  time: i * 60,
  open: 1.1005,
  high: 1.101,
  low: 1.1,
  close: 1.1005,
  volume: 0,
}));
const r = computeChandeKrollStop(flat);
assert.ok(Math.abs(r.shortStop[39]! - 1.1) < 1e-9, `shortStop ${r.shortStop[39]}`);
assert.ok(Math.abs(r.longStop[39]! - 1.101) < 1e-9, `longStop ${r.longStop[39]}`);
// الإحماء: ATR(10) أوّل قيمة عند 9، والتدحرج 9 ⇒ ‎9 + 9 − 1 = 17‎ أوّل قيمة.
assert.equal(r.shortStop[16], null);
assert.ok(r.shortStop[17] != null && r.longStop[17] != null, 'first value at 17');

console.log('chandeKroll.selftest: PASS');
