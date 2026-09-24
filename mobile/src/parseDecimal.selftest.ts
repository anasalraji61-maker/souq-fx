/**
 * Self-test for parseDecimal (pure).
 * Run: npx --yes tsx src/parseDecimal.selftest.ts
 */
import assert from 'node:assert/strict';
import { parseDecimal } from './parseDecimal';

const cases: [string, number | null][] = [
  ['1.0850', 1.085],
  ['1,0850', 1.085],
  ['2350.5', 2350.5],
  ['2,350.50', 2350.5],
  ['1.085,50', 1085.5],
  ['100,000', null], // مبهم: مئة ألف أم 100.000؟ يُرفض بدل التخمين
  ['1,085', null],
  ['0,085', 0.085],
  ['1,000,000', 1000000],
  ['1.000.000', 1000000],
  ['10000', 10000],
  ['١٫٠٨٥٠', 1.085],
  ['1٫0850', 1.085],
  ['١٠٬٠٠٠', 10000],
  ['۱۵۷٫۴۲', 157.42],
  [' 157.423 ', 157.423],
  ['1.', 1],
  ['.5', 0.5],
  ['', null],
  ['abc', null],
  ['1.2.3', null],
  ['1,2,3', null],
  ['2,35,0.5', null],
  ['-5', null],
  ['1e5', null],
];
for (const [inp, want] of cases) {
  assert.equal(parseDecimal(inp), want, `parseDecimal(${JSON.stringify(inp)})`);
}
assert.equal(parseDecimal('-0.0012', { signed: true }), -0.0012);
assert.equal(parseDecimal('−٧٠', { signed: true }), -70);
assert.equal(parseDecimal('70', { signed: true }), 70);
// خانة المبلغ: «10.000» أوروبية = عشرة آلاف، لا 10 — تُرفض كنظيرتها «10,000» بدل لوتٍ أصغر ألف مرة
assert.equal(parseDecimal('10.000'), 10); // خانة سعر: القاعدة العامة لا تتغيّر
assert.equal(parseDecimal('10.000', { amount: true }), null);
assert.equal(parseDecimal('10,000', { amount: true }), null);
assert.equal(parseDecimal('1.500', { amount: true }), null);
assert.equal(parseDecimal('0.500', { amount: true }), 0.5);
assert.equal(parseDecimal('10.000,00', { amount: true }), 10000);
assert.equal(parseDecimal('10,000.50', { amount: true }), 10000.5);
assert.equal(parseDecimal('10.000.000', { amount: true }), 10000000);
assert.equal(parseDecimal('10000', { amount: true }), 10000);
assert.equal(parseDecimal('2500.5', { amount: true }), 2500.5);
assert.equal(parseDecimal('2500.50', { amount: true }), 2500.5);
assert.equal(parseDecimal('١٠٫٠٠٠', { amount: true }), null);
// خانة النسبة: «1%» كما يقولها المتداول — علامة واحدة بأحد الطرفين، عربية أو لاتينية أو عريضة
assert.equal(parseDecimal('1%', { percent: true }), 1);
assert.equal(parseDecimal('0.5 %', { percent: true }), 0.5);
assert.equal(parseDecimal('٠٫٥٪', { percent: true }), 0.5);
assert.equal(parseDecimal('%2', { percent: true }), 2);
assert.equal(parseDecimal('1,5％', { percent: true }), 1.5);
assert.equal(parseDecimal('2', { percent: true }), 2);
assert.equal(parseDecimal('%', { percent: true }), null);
assert.equal(parseDecimal('1%%', { percent: true }), null);
assert.equal(parseDecimal('%1%', { percent: true }), null);
assert.equal(parseDecimal('1%5', { percent: true }), null);
assert.equal(parseDecimal('1%'), null); // بلا الخيار: العلامة مرفوضة كما كانت (خانات السعر والرصيد)
// الأرقام العريضة (لوحة المفاتيح اليابانية) بقواعد الفواصل نفسها — لا قراءة أرخى من اللاتينية
assert.equal(parseDecimal('１．０８５０'), 1.085);
assert.equal(parseDecimal('１５７．４２'), 157.42);
assert.equal(parseDecimal('1.0850'), parseDecimal('１．０８５０'));
assert.equal(parseDecimal('２，３５０．５０'), 2350.5);
assert.equal(parseDecimal('１，０８５０'), 1.085);
assert.equal(parseDecimal('１００００'), 10000);
assert.equal(parseDecimal('１，０００，０００', { amount: true }), 1000000);
assert.equal(parseDecimal('１０，０００', { amount: true }), null); // مبهمة كنظيرتها «10,000»
assert.equal(parseDecimal('１０．０００', { amount: true }), null);
assert.equal(parseDecimal('　１．５　'), 1.5); // المسافة العريضة
assert.equal(parseDecimal('０．５％', { percent: true }), 0.5);
assert.equal(parseDecimal('－０．００１２', { signed: true }), -0.0012);
assert.equal(parseDecimal('－５'), null); // بلا الخيار: السالب مرفوض كما كان
assert.equal(parseDecimal('１．２．３'), null);
assert.equal(parseDecimal('１ｅ５'), null);
// الخليط (لاتيني + عريض + عربي) يُقرأ كلّه أرقاماً — كل رقم بقيمته
assert.equal(parseDecimal('1٫０8５'), 1.085);
// شبكة: كل رقم لاتيني صالح يُقرأ بعد تحويله للعريض إلى القيمة نفسها بالضبط
{
  const toWide = (x: string) =>
    x.replace(/[0-9]/g, (d) => String.fromCharCode(0xff10 + Number(d))).replace(/\./g, '．').replace(/,/g, '，');
  for (const x of ['1.0850', '2,350.50', '1.085,50', '100,000', '0,085', '1,000,000', '157.423', '.5', '1.', '10000', 'abc', '1.2.3']) {
    for (const opts of [{}, { amount: true }, { percent: true }]) {
      assert.equal(parseDecimal(toWide(x), opts), parseDecimal(x, opts), `${x} ${JSON.stringify(opts)}`);
    }
  }
}
console.log('parseDecimal selftest OK');
