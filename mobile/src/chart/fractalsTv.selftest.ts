/**
 * Self-test: Williams Fractals كـTradingView — يمين صارم، ويسار يقبل حتى 4 قمم/قيعان مساوية ملاصقة.
 * Run: npx --yes tsx src/chart/fractalsTv.selftest.ts
 */
import assert from 'node:assert/strict';
import { computeFractals } from './indicators/trend';

const bars = (hs: number[], ls?: number[]) => hs.map((h, i) => ({ high: h, low: ls ? ls[i] : h - 0.001 }));

// قمّتان متساويتان: الفراكتل على الثانية (مساوية يساراً مقبولة، واليمين أدنى صراحةً)
let f = computeFractals(bars([1.099, 1.1, 1.1012, 1.1012, 1.1005, 1.0998]));
assert.equal(f.top[3], 1.1012, 'قمّة بمساوية على يسارها');
assert.equal(f.top[2], null, 'الأولى تسقط بمساوية على يمينها');

// الكلاسيكي
f = computeFractals(bars([1.0, 1.1, 1.3, 1.2, 1.1]));
assert.equal(f.top[2], 1.3);

// مساوية بين الشمعتين الأدنى يساراً (غير ملاصقة) ⇒ لا فراكتل
f = computeFractals(bars([1.3, 1.2, 1.3, 1.2, 1.1]));
assert.equal(f.top[2], null, 'مساوية على بُعد شمعتين تُسقطه');

// قاع بمساوية ملاصقة يساراً
f = computeFractals(bars([1.2, 1.2, 1.2, 1.2, 1.2, 1.2], [1.1, 1.05, 1.0, 1.0, 1.02, 1.04]));
assert.equal(f.bottom[3], 1.0, 'قاع بمساوية يساراً');
assert.equal(f.bottom[2], null);

// مسطّحة ⇒ لا شيء
f = computeFractals(bars(Array(12).fill(1.1)));
assert.ok(f.top.every((v) => v === null) && f.bottom.every((v) => v === null));

console.log('fractalsTv selftest PASS');
