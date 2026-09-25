/** فحص ذاتي لرتبة ROC المئوية بـ`computeConnorsRsi` — يُشغَّل بـNode بلا شجرة مكوّنات. */
import assert from 'node:assert/strict';
import { computeConnorsRsi } from './indicators/momentum';

// شمعة بلا تغيّر بعد 100 شمعة بلا تغيّر: `ta.percentrank` يعدّ المتعادلات (≤) ⇒ الرتبة 100 لا 0.
const flat = Array.from({ length: 105 }, () => 1.1);
const bumped = flat.slice();
bumped[104] = 1.1 + 1e-9; // ROC أكبر من كل ما قبله ⇒ الرتبة 100 بأيّ من التعريفين
const a = computeConnorsRsi(flat)[104];
const b = computeConnorsRsi(bumped)[104];
assert.ok(a != null && b != null, 'قيمتان معرّفتان');
// المسطّحة: RSI الإغلاق وRSI السلسلة = 50 (بلا ربح ولا خسارة، كـMT5) والرتبة 100 ⇒ (50+50+100)/3.
// بـ`<` كانت رتبتها 0 ⇒ 33.3.
assert.ok(Math.abs(a - 200 / 3) < 1e-9, `متعادلات تُعدّ: ${a} ≈ 66.67`);
assert.ok(Math.abs(b - 100) < 1e-3, `المرفوعة: ${b} ≈ 100`);

console.log('connorsRsi.selftest: PASS');
