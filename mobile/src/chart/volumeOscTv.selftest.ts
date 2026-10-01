/**
 * Self-test: Volume Oscillator كـTradingView المدمج — ‎100 × (ema(volume, 5) − ema(volume, 10)) / ema(volume, 10)‎.
 * Run: npx --yes tsx src/chart/volumeOscTv.selftest.ts
 */
import assert from 'node:assert/strict';
import type { Candle } from '../api';
import { computeVolumeOscillator } from './indicators/volume';

// مرجع مستقلّ بأسلوب Pine: ta.ema مبذور بـsma
const pineEma = (src: number[], n: number) => {
  const out: (number | null)[] = [];
  let prev: number | null = null;
  for (let i = 0; i < src.length; i++) {
    if (i < n - 1) out.push(null);
    else {
      prev = prev == null ? src.slice(0, n).reduce((a, b) => a + b, 0) / n : src[i] * (2 / (n + 1)) + prev * (1 - 2 / (n + 1));
      out.push(prev);
    }
  }
  return out;
};
const vol = Array.from({ length: 60 }, (_, i) => 1000 + 400 * Math.sin(i / 4) + 50 * (i % 5));
const bars = vol.map((v, i) => ({ time: i * 60, open: 1, high: 1.001, low: 0.999, close: 1, volume: v }) as Candle);
const s = pineEma(vol, 5);
const l = pineEma(vol, 10);
const vo = computeVolumeOscillator(bars);
for (let i = 0; i < vol.length; i++) {
  if (l[i] == null) assert.equal(vo[i], null, `warmup ${i}`);
  else assert.ok(Math.abs(vo[i]! - (100 * (s[i]! - l[i]!)) / l[i]!) < 1e-9, `vo[${i}]`);
}
assert.equal(vo.findIndex((v) => v != null), 9);

console.log('volumeOscTv selftest PASS');
