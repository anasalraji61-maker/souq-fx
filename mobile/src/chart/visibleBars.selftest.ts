/**
 * Self-test for visibleBars (pure).
 * Run: npx --yes tsx src/chart/visibleBars.selftest.ts
 */
import assert from 'node:assert/strict';
import { visibleBarRange } from './visibleBars';

// بلا إزاحة: الكل
assert.deepEqual(visibleBarRange(80, 320, 0), { lo: 0, hi: 79 });
// هامش اليمين 10% (−32px، الشمعة 4px): أوّل 8 خلف الحافة اليسرى
assert.deepEqual(visibleBarRange(80, 320, -32), { lo: 8, hi: 79 });
// نصف شمعة: الأولى ما يزال نصفها ظاهراً
assert.deepEqual(visibleBarRange(80, 320, -2), { lo: 0, hi: 79 });
// سحب يميناً (فراغ يسار): آخر الشموع خلف الحافة اليمنى
assert.deepEqual(visibleBarRange(80, 320, 40), { lo: 0, hi: 69 });
// الفهرسان ثابتان داخل الشمعة نفسها ⇒ لا إعادة حساب بكل بكسل
assert.deepEqual(visibleBarRange(80, 320, -33), visibleBarRange(80, 320, -35.9));
// شمعة واحدة ظاهرة أو لا شيء ⇒ السلسلة كلها
assert.deepEqual(visibleBarRange(80, 320, -318), { lo: 0, hi: 79 });
assert.deepEqual(visibleBarRange(80, 320, 400), { lo: 0, hi: 79 });
assert.deepEqual(visibleBarRange(0, 320, 0), { lo: 0, hi: 0 });

console.log('visibleBars selftest: PASS');
