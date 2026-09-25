/**
 * Self-test: السحب عند طرفَي التاريخ لا يُفرغ اللوح.
 * Run: npx --yes tsx src/chart/panClamp.selftest.ts
 */
import assert from 'node:assert/strict';
import { clampXPan } from './panClamp';

const W = 340;
const n = 80;
const xOf = (i: number, xPan: number) => ((i + 0.5) / n) * W + xPan;
// سحبة 300px يساراً عند الحيّ (الراحة −34): كانت −334 ⇒ آخر شمعة عند x≈2 خارج اللوح تقريباً
const left = clampXPan(-34 - 300, n, W);
assert.ok(Math.abs(xOf(n - 1, left) - 0.2 * W) < 1e-9, 'آخر شمعة عند 20%');
// سحبة يميناً عند أقدم التاريخ: أول شمعة لا تعبر 80%
const right = clampXPan(400, n, W);
assert.ok(Math.abs(xOf(0, right) - 0.8 * W) < 1e-9, 'أول شمعة عند 80%');
// السحب العادي (بين شمعتين، الهامش الأيمن 10%) بلا تغيير
for (const x of [0, -34, 4.25, -4.25, -120, 150]) assert.equal(clampXPan(x, n, W), x);
// سلسلة قصيرة (Renko 12 لبنة) والمدخلات الشاذّة
assert.ok(Math.abs(((11 + 0.5) / 12) * W + clampXPan(-1000, 12, W) - 0.2 * W) < 1e-9);
assert.equal(clampXPan(NaN, n, W), 0);
assert.equal(clampXPan(-50, 0, W), -50);
assert.equal(clampXPan(-50, n, 0), -50);
// الإعادة: 80 خانة والمكشوف شمعة واحدة (عند حدّ القطع) ⇒ تبقى عند 20% لا تخرج يساراً
const replayLeft = clampXPan(-1000, n, W, undefined, 1);
assert.ok(Math.abs(xOf(0, replayLeft) - 0.2 * W) < 1e-9, 'شمعة الإعادة عند 20%');
// 30 مكشوفة: آخرها المرجع؛ والأوّل (السحب يميناً) كما هو
assert.ok(Math.abs(xOf(29, clampXPan(-1000, n, W, undefined, 30)) - 0.2 * W) < 1e-9);
assert.equal(clampXPan(400, n, W, undefined, 30), clampXPan(400, n, W));
assert.equal(clampXPan(-1000, n, W, undefined, 0), clampXPan(-1000, n, W));
console.log('panClamp selftest: PASS');
