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

// أعلى الشمعة على حدّ صفّ: شمعة 1.10–1.11 بصفوف 0.01 حجمها كلّه بصفّ 1.105 (كان نصفه بصفّ 1.115 لم يُتداوَل فيه).
const edge: Candle[] = [
  { time: 0, open: 1.0, high: 1.0, low: 1.0, close: 1.0, volume: 0 },
  { time: 60, open: 1.24, high: 1.24, low: 1.24, close: 1.24, volume: 0 },
  { time: 120, open: 1.1, high: 1.11, low: 1.1, close: 1.11, volume: 100 },
] as Candle[];
const er = computeVolumeProfile(edge, 24);
assert.ok(Math.abs(er[10].volume - 100) < 1e-9 && er[11].volume === 0, `edge row: ${er[10].volume}/${er[11].volume}`);
const et = computeTpo(edge, 24);
assert.ok(et.rows[10].count === 1 && et.rows[11].count === 0, 'TPO edge row');

console.log('volumeProfile selftest PASS');
