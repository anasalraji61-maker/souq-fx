/** فحص ذاتي لمعاملات `computeCamarillaPivots` — يُشغَّل بـNode بلا شجرة مكوّنات. */
import assert from 'node:assert/strict';
import { computeCamarillaPivots } from './indicators/price-transform';

// يوم سابق H 1.0900 L 1.0800 C 1.0850 ⇒ R3 = 1.0850 + 0.01×1.1/4 = 1.08775، R4 = 1.0905، S3 = 1.08225.
const prev = { time: 0, open: 1.085, high: 1.09, low: 1.08, close: 1.085 };
const cur = { time: 1, open: 1.085, high: 1.086, low: 1.084, close: 1.0855 };
const p = computeCamarillaPivots([prev, cur], 1);
assert.ok(p, 'مستويات معرّفة');
const near = (a: number, b: number, what: string) => assert.ok(Math.abs(a - b) < 1e-9, `${what}: ${a} ≈ ${b}`);
near(p.r1, 1.0850 + 0.011 / 12, 'R1');
near(p.r3, 1.08775, 'R3');
near(p.r4, 1.0905, 'R4');
near(p.s3, 1.08225, 'S3');
near(p.s4, 1.0795, 'S4');

console.log('camarilla.selftest: PASS');
