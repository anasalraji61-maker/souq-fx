/** فحص ذاتي لـ`positionTool.ts` — يُشغَّل بـNode بلا شجرة مكوّنات. */
import assert from 'node:assert/strict';
import {
  clampRr,
  isPositionTool,
  positionLabels,
  positionLevels,
  positionStop,
  rrFromTarget,
  rrText,
} from './positionTool';

const near = (a: number, b: number) => assert.ok(Math.abs(a - b) < 1e-9, `${a} ≈ ${b}`);

assert.equal(isPositionTool('long'), true);
assert.equal(isPositionTool('short'), true);
assert.equal(isPositionTool('rect'), false);
assert.equal(isPositionTool(undefined), false);

// شراء: الوقف تحت الدخول، الهدف ضعف المخاطرة فوقه
let L = positionLevels('long', 1.085, 1.0825, undefined, 'EURUSD');
near(L.stop, 1.0825);
near(L.target, 1.09);
assert.equal(L.rr, 2);
// وقف رُسم بالجهة الخطأ ⇒ يُعكس بالمسافة نفسها
L = positionLevels('long', 1.085, 1.0875, 2, 'EURUSD');
near(L.stop, 1.0825);
// بيع: الوقف فوق، الهدف تحت
const S = positionLevels('short', 157.5, 157.8, 1.5, 'USDJPY');
near(S.stop, 157.8);
near(S.target, 157.05);
// مسافة صفرية ⇒ 20 pip (اليورو)، 20 pip ين، 0.2% لمجهول
near(positionStop('long', 1.085, 1.085, 'EURUSD'), 1.083);
near(positionStop('short', 157.5, 157.5, 'USDJPY'), 157.7);
near(positionStop('long', 100, 100, 'DXY'), 99.8);

// النسبة: قيم فاسدة ⇒ الافتراضي، ومقيّدة بالمدى
assert.equal(clampRr(undefined), 2);
assert.equal(clampRr(NaN), 2);
assert.equal(clampRr(-1), 2);
assert.equal(clampRr(0.01), 0.1);
assert.equal(clampRr(99), 20);

// النسبة من مقبض الهدف
assert.equal(rrFromTarget({ side: 'long', entry: 1.085, stop: 1.0825 }, 1.0925), 3);
assert.equal(rrFromTarget({ side: 'short', entry: 1.085, stop: 1.0875 }, 1.08125), 1.5);
// الهدف بالجهة الخطأ ⇒ أدنى نسبة لا قلب
assert.equal(rrFromTarget({ side: 'long', entry: 1.085, stop: 1.0825 }, 1.08), 0.1);
assert.equal(rrFromTarget({ side: 'long', entry: 1.085, stop: 1.0825 }, 1.085), 0.1);
// مقرّبة لمنزلتين
assert.equal(rrFromTarget({ side: 'long', entry: 1, stop: 0.97 }, 1.0712345), 2.37);

assert.equal(rrText(2), '2');
assert.equal(rrText(2.5), '2.5');
assert.equal(rrText(1.3749), '1.37');

// الوسوم بخانات الزوج وبالنقاط
let lab = positionLabels(positionLevels('long', 1.085, 1.0825, 2, 'EURUSD'), 'EURUSD');
assert.equal(lab.target, 'TP 1.09000 · 50.0 pip · R:R 2');
assert.equal(lab.stop, 'SL 1.08250 · 25.0 pip');
lab = positionLabels(positionLevels('short', 2650, 2655, 3, 'XAUUSD'), 'XAUUSD');
assert.equal(lab.target, 'TP 2635.00 · 150.0 pip · R:R 3');
assert.equal(lab.stop, 'SL 2655.00 · 50.0 pip');
// بلا مواصفة pip ⇒ فرق السعر بخانات الرمز
lab = positionLabels(positionLevels('long', 104.2, 104, 2, 'DXY'), 'DXY');
assert.equal(lab.stop, 'SL 104.000 · 0.200');

console.log('positionTool.selftest: PASS');
