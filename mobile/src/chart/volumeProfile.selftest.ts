/**
 * Self-test: Volume Profile / TPO على سلسلة ساكنة (high = low بكل الشموع) — POC على السعر لا ~208 pip فوقه.
 * Run: npx --yes tsx src/chart/volumeProfile.selftest.ts
 */
import assert from 'node:assert/strict';
import type { Candle } from '../api';
import { computeTpo, computeVolumeProfile, pocPrice } from './volumeProfile';

const still = (p: number, n = 3): Candle[] =>
  Array.from({ length: n }, (_, i) => ({ time: i * 60, open: p, high: p, low: p, close: p, volume: 100 }) as Candle);

for (const p of [1.08, 150, 2300]) {
  const poc = pocPrice(computeVolumeProfile(still(p)));
  assert.ok(poc != null && Math.abs(poc - p) < 1e-9 * p, `VP POC ${p} → ${poc}`);
  const t = computeTpo(still(p));
  for (const v of [t.poc, t.vah, t.val]) assert.ok(v != null && Math.abs(v - p) < 1e-9 * p, `TPO ${p} → ${v}`);
}

// سلسلة متحرّكة: لا تغيير — الصفوف تغطّي [أدنى، أعلى] بالضبط
const moving: Candle[] = [
  { time: 0, open: 1.1, high: 1.102, low: 1.098, close: 1.101, volume: 100 },
  { time: 60, open: 1.101, high: 1.106, low: 1.1, close: 1.105, volume: 300 },
] as Candle[];
const rows = computeVolumeProfile(moving, 8);
const step = (1.106 - 1.098) / 8;
assert.ok(Math.abs(rows[0].price - (1.098 + step / 2)) < 1e-12);
assert.ok(Math.abs(rows[7].price - (1.106 - step / 2)) < 1e-12);
assert.ok(Math.abs(rows.reduce((s, r) => s + r.volume, 0) - 400) < 1e-9, 'volume conserved');

console.log('volumeProfile selftest PASS');
