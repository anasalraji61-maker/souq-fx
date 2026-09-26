/**
 * Self-test: STARC Bands بتعريف ستولر — SMA(6) ± 2×ATR(15) (ATR بتنعيم Wilder كبقية الشارت).
 * Run: npx --yes tsx src/chart/starcBands.selftest.ts
 */
import assert from 'node:assert/strict';
import type { Candle } from '../api';
import { computeStarcBands } from './indicators/volatility';

const candles: Candle[] = [];
let p = 1.1;
for (let i = 0; i < 80; i++) {
  const o = p;
  p += Math.sin(i * 0.7) * 0.0012 + (i % 5 === 0 ? 0.0009 : -0.0003);
  const h = Math.max(o, p) + 0.0004 + (i % 3) * 0.0001;
  const l = Math.min(o, p) - 0.0005;
  candles.push({ time: 1_700_000_000 + i * 900, open: o, high: h, low: l, close: p } as Candle);
}

// مرجع مستقلّ
const tr = candles.map((c, i) =>
  i === 0 ? c.high - c.low : Math.max(c.high - c.low, Math.abs(c.high - candles[i - 1]!.close), Math.abs(c.low - candles[i - 1]!.close))
);
const atr: (number | null)[] = [];
let rma = 0;
for (let i = 0; i < tr.length; i++) {
  if (i < 14) atr.push(null);
  else if (i === 14) {
    rma = tr.slice(0, 15).reduce((a, b) => a + b, 0) / 15;
    atr.push(rma);
  } else {
    rma = (rma * 14 + tr[i]!) / 15;
    atr.push(rma);
  }
}
const { mid, upper, lower } = computeStarcBands(candles);
for (let i = 0; i < candles.length; i++) {
  const want = i >= 5 ? candles.slice(i - 5, i + 1).reduce((a, c) => a + c.close, 0) / 6 : null;
  if (want == null) assert.equal(mid[i], null, `mid null @${i}`);
  else assert.ok(Math.abs(mid[i]! - want) < 1e-12, `mid SMA(6) @${i}`);
  if (want != null && atr[i] != null) {
    assert.ok(Math.abs(upper[i]! - (want + 2 * atr[i]!)) < 1e-12, `upper @${i}`);
    assert.ok(Math.abs(lower[i]! - (want - 2 * atr[i]!)) < 1e-12, `lower @${i}`);
  }
}
console.log(JSON.stringify({ ok: true }));
