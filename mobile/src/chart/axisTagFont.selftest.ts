/**
 * Self-test for axisTagFontSize (pure).
 * Run: npx --yes tsx src/chart/axisTagFont.selftest.ts
 */
import assert from 'node:assert/strict';
import { axisTagFontSize } from './axisTagFont';

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
console.log('axisTagFont selftest OK');
