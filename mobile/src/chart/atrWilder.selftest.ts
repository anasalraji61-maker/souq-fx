/**
 * Self-test: ATR بتنعيم Wilder (RMA) كـta.atr بـTradingView — لا SMA للمدى الحقيقي.
 * Run: npx --yes tsx src/chart/atrWilder.selftest.ts
 */
import assert from 'node:assert/strict';
import type { Candle } from '../api';
import { computeAtr, computeTrueRange } from './indicators/volatility';
import { evalPineLite } from './pineLite';

const near = (a: number | null | undefined, b: number, msg = '') =>
  assert.ok(a != null && Math.abs(a - b) < 1e-12, `${msg} got=${a} want=${b}`);

const bar = (i: number, o: number, h: number, l: number, c: number): Candle =>
  ({ time: 1_700_000_000 + i * 60, open: o, high: h, low: l, close: c } as Candle);

// 20 شمعة مداها 0.0010 ثم شمعة واحدة مداها 0.0150 ثم 20 هادئة
const candles: Candle[] = [];
for (let i = 0; i < 41; i++) {
  const r = i === 20 ? 0.015 : 0.001;
  candles.push(bar(i, 1.1, 1.1 + r / 2, 1.1 - r / 2, 1.1));
}
const tr = computeTrueRange(candles) as number[];
const atr = computeAtr(candles, 14);

// الإحماء والبذرة = SMA لأول 14
assert.equal(atr[12], null);
near(atr[13], 0.001, 'seed');
// بعد الشمعة الكبيرة: (سابق×13 + TR)/14
near(atr[20], (0.001 * 13 + 0.015) / 14, 'spike');
// الأثر يتلاشى تدريجياً ولا يسقط فجأة بعد 14 شمعة (سلوك SMA القديم)
const a33 = atr[33]!;
const a34 = atr[34]!;
assert.ok(a34 < a33 && a34 > 0.001, 'decays');
const smaDrop = a33 - a34;
assert.ok(smaDrop < (0.015 - 0.001) / 14, 'no 14-bar cliff');
// تكرار مستقلّ
let prev = tr.slice(0, 14).reduce((a, b) => a + b, 0) / 14;
for (let i = 14; i < tr.length; i++) prev = (prev * 13 + tr[i]) / 14;
near(atr[40], prev, 'recursion');

// atr(14) بمحرّر الصيغ يطابق لوحة ATR
const pine = evalPineLite('atr(14)', candles);
{
  for (let i = 0; i < candles.length; i++) {
    if (atr[i] == null) assert.equal(pine[i], null, `pine warm-up ${i}`);
    else near(pine[i] as number, atr[i]!, `pine ${i}`);
  }
}

console.log('atrWilder selftest PASS');
