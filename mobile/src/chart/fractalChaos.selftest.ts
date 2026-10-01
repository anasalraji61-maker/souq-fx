/**
 * Self-test: Fractal Chaos Bands/Oscillator يتحرّكان على شمعة **تأكيد** الفراكتل (الثانية بعده) لا على شمعته.
 * Run: npx --yes tsx src/chart/fractalChaos.selftest.ts
 */
import assert from 'node:assert/strict';
import { computeFractalChaosBands } from './indicators/volatility';
import { computeFractalChaosOsc } from './indicators/momentum';

const hs = [1, 2, 3, 5, 3, 2, 1, 1, 1];
const ls = [0.5, 1.5, 2.5, 4.5, 2.5, 1.5, 0.5, 0.6, 0.7];
const bars = hs.map((h, i) => ({ high: h, low: ls[i]! }));

const b = computeFractalChaosBands(bars);
assert.deepEqual(b.upper.slice(0, 6), [null, null, null, null, null, 5], 'الحدّ الأعلى يصير 5 عند تأكيد القمّة (5) لا عندها (3)');
assert.equal(b.upper[8], 5);
assert.equal(b.lower[7], null, 'القاع 0.5 عند 6 لم يؤكَّد عند 7');
assert.equal(b.lower[8], 0.5, 'ويؤكَّد عند 8 (0.6 و0.7 أعلى)');

const o = computeFractalChaosOsc(bars);
assert.equal(o[3], 0, 'لا إشارة على شمعة القمّة');
assert.equal(o[5], 1, '+1 على شمعة التأكيد');
assert.equal(o[0], null);

console.log('fractalChaos selftest PASS');
