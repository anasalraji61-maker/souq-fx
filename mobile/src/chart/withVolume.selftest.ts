/** فحص ذاتي لـ`withVolume` — يُشغَّل بـNode بلا شجرة مكوّنات. */
import assert from 'node:assert/strict';
import { withVolume } from './types';

const c = (open: number, close: number, volume?: number) =>
  ({ time: 0, open, high: Math.max(open, close), low: Math.min(open, close), close, volume }) as never;

// فوركس: الخادم يرسل 0 لكل شمعة ⇒ البديل التركيبي (موجب) لا صفر.
const fx = withVolume([c(1.1, 1.1005, 0), c(1.1005, 1.1, 0)]);
assert.ok(fx.every((x) => x.volume > 0));
// بلا حقل فوليوم ⇒ البديل كما كان.
assert.ok(withVolume([c(1, 1.001)])[0]!.volume > 0);
// فوليوم حقيقي: يبقى كما هو، والشمعة الصفرية تبقى صفراً (لا يُخترَع لها فوليوم).
const real = withVolume([c(1, 1.001, 500), c(1.001, 1.002, 0), c(1.002, 1.001, 320)]);
assert.deepEqual(real.map((x) => x.volume), [500, 0, 320]);
// NaN وسط فوليوم حقيقي ⇒ بديل لتلك الشمعة وحدها لا NaN يسمّم التراكم.
assert.ok(Number.isFinite(withVolume([c(1, 1.001, 500), c(1, 1.002, Number.NaN)])[1]!.volume));

console.log('withVolume.selftest: PASS');
