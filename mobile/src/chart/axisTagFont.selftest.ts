/**
 * Self-test for axisTagFontSize (pure).
 * Run: npx --yes tsx src/chart/axisTagFont.selftest.ts
 */
import assert from 'node:assert/strict';
import { axisTagFontSize, withSideMark } from './axisTagFont';

const W = 60; // محور 68 − هامشا الوسم 2+2 − حشوته 2+2
// أزواج الفوركس والين والذهب: بحجم علامات المحور
assert.equal(axisTagFontSize('1.08432', W), 11);
assert.equal(axisTagFontSize('157.432', W), 11);
assert.equal(axisTagFontSize('2345.67', W), 11);
// تسعة أحرف ما زالت 11 (9 × 6.6 = 59.4)
assert.equal(axisTagFontSize('106543.21', W), 11);
// سهم خارج المدى + تسعة أحرف ⇒ 10 لا قصّ
assert.equal(axisTagFontSize('▲106543.21', W), 10);
// نصّ طويل جداً لا ينزل عن الحدّ الأدنى
assert.equal(axisTagFontSize('1234567890123456', W), 8);
// فارغ لا يقسم على صفر
assert.equal(axisTagFontSize('', W), 11);
// سهم خارج المدى: بمسافة ما دامت لا تصغّر الخطّ
assert.equal(withSideMark('▲', '1.08432', W), '▲ 1.08432');
assert.equal(withSideMark('', '1.08432', W), '1.08432');
// BTC: المسافة تنزل بالخطّ من 10 إلى 9 ⇒ بلا مسافة
assert.equal(withSideMark('▼', '106543.21', W), '▼106543.21');
// PEPE: «▲ 0.000008900» 13 × 4.8 = 62.4 > 60 حتى بالحدّ الأدنى ⇒ بلا مسافة (57.6) فيتّسع
const pepe = withSideMark('▲', '0.000008900', W);
assert.equal(pepe, '▲0.000008900');
assert.ok([...pepe].length * 0.6 * axisTagFontSize(pepe, W) <= W);
console.log('axisTagFont selftest OK');
