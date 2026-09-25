/**
 * Self-test for visibleBars (pure).
 * Run: npx --yes tsx src/chart/visibleBars.selftest.ts
 */
import assert from 'node:assert/strict';
import { visibleBarRange, visibleMax } from './visibleBars';

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

// Bar Replay: 80 خانة و20 مكشوفة ⇒ المقياس على الـ20 فقط، والخانات الفارغة لا تُحسب
assert.deepEqual(visibleBarRange(80, 320, 0, 20), { lo: 0, hi: 19 });
assert.deepEqual(visibleBarRange(80, 320, -32, 20), { lo: 8, hi: 19 });
// شمعة مكشوفة واحدة ⇒ هي وحدها (لا فهرس خارج السلسلة)
assert.deepEqual(visibleBarRange(80, 320, 0, 1), { lo: 0, hi: 0 });

// visibleMax: قفزة خارج الشاشة لا تدخل المقياس
const spike = [50, -40, null, 1, -3, 2];
assert.equal(visibleMax(spike, { lo: 3, hi: 5 }, true), 3);
assert.equal(visibleMax(spike, { lo: 3, hi: 5 }), 2);
assert.equal(visibleMax(spike, undefined, true), 50);
// لا قيمة صالحة بالنافذة ⇒ السلسلة كلّها؛ سلسلة فارغة/أصفار ⇒ 1e-9
assert.equal(visibleMax([null, 4, null], { lo: 2, hi: 2 }), 4);
assert.equal(visibleMax([0, 0], { lo: 0, hi: 1 }), 1e-9);
assert.equal(visibleMax([], { lo: 0, hi: 0 }), 1e-9);

console.log('visibleBars selftest: PASS');
