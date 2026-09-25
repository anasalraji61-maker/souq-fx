/** فحص ذاتي لـ`overlayTags.ts` — يُشغَّل بـNode بلا شجرة مكوّنات. */
import assert from 'node:assert/strict';
import { OVERLAY_TAG_MAX, placeOverlayTags, tagTextColor } from './overlayTags';

// مقياس بسيط: 1.08 أسفل (300) و1.10 أعلى (0).
const yOf = (p: number) => ((1.1 - p) / 0.02) * 300;
const it = (key: string, price: number) => ({ key, price, color: '#FBBF24' });

// وسمان متباعدان يظهران؛ الموضع حول الخطّ (y − h/2).
const two = placeOverlayTags([it('a', 1.09), it('b', 1.085)], yOf, 300, 18, []);
assert.equal(two.length, 2);
assert.ok(Math.abs(two[0]!.top - (150 - 9)) < 1e-9);

// متلاصقان: الأهمّ (الأوّل) يبقى.
const tight = placeOverlayTags([it('a', 1.09), it('b', 1.0901)], yOf, 300, 18, []);
assert.deepEqual(tight.map((t) => t.key), ['a']);

// علبة محجوزة (السعر الحيّ) تُسقط ما يلمسها ولا تُسقط البعيد.
const res = placeOverlayTags([it('a', 1.09), it('b', 1.085)], yOf, 300, 18, [{ top: 145, h: 30 }]);
assert.deepEqual(res.map((t) => t.key), ['b']);

// خارج المدى المرئيّ أو غير محدود ⇒ لا وسم ملتصق بالحافّة.
assert.equal(placeOverlayTags([it('a', 1.2), it('b', 1.0), it('c', Number.NaN)], yOf, 300, 18, []).length, 0);

// قرب الحافّة السفلى يُقصّ داخل اللوح.
const edge = placeOverlayTags([it('a', 1.0801)], yOf, 300, 18, []);
assert.ok(edge[0]!.top <= 300 - 18 - 2);

// السقف.
const many = Array.from({ length: 12 }, (_, k) => it(`k${k}`, 1.081 + k * 0.0015));
assert.equal(placeOverlayTags(many, yOf, 300, 18, []).length, OVERLAY_TAG_MAX);

// لون النصّ: داكن فوق الفاتح، أبيض فوق الداكن.
assert.equal(tagTextColor('#FFFFFF'), '#041514');
assert.equal(tagTextColor('#FBBF24'), '#041514');
assert.equal(tagTextColor('#3B82F6'), '#041514'); // تباين 4.8 مقابل 3.75 للأبيض
assert.equal(tagTextColor('#1E3A8A'), '#FFFFFF');
assert.equal(tagTextColor('#F87171'), '#041514');
assert.equal(tagTextColor('#fff'), '#041514');
assert.equal(tagTextColor('rgba(1,2,3,0.5)'), '#041514');

console.log('overlayTags selftest PASS');
