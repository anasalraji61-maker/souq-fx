/** فحص ذاتي لرتبة ROC المئوية بـ`computeConnorsRsi` — يُشغَّل بـNode بلا شجرة مكوّنات. */
import assert from 'node:assert/strict';
import { computeConnorsRsi } from './indicators/momentum';

// شمعة بلا تغيّر بعد 100 شمعة بلا تغيّر: `ta.percentrank` يعدّ المتعادلات (≤) ⇒ الرتبة 100 لا 0.
// الفرق بين الحالتين ثلث الرتبة بالضبط (مكوّنا RSI لا يتأثّران).
const flat = Array.from({ length: 105 }, () => 1.1);
const bumped = flat.slice();
bumped[104] = 1.1 + 1e-9; // ROC أكبر من كل ما قبله ⇒ الرتبة 100 بأيّ من التعريفين
const a = computeConnorsRsi(flat)[104];
const b = computeConnorsRsi(bumped)[104];
assert.ok(a != null && b != null, 'قيمتان معرّفتان');
// بـ`<` كانت الشمعة المسطّحة رتبتها 0 ⇒ أقلّ بـ33.3 من المرفوعة رغم أن مكوّني RSI متطابقان تقريباً.
assert.ok(Math.abs(a - b) < 1e-3, `متعادلات تُعدّ: ${a} ≈ ${b}`);

console.log('connorsRsi.selftest: PASS');
