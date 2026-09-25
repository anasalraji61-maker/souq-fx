/** فحص ذاتي لـ`positionTool.ts` — يُشغَّل بـNode بلا شجرة مكوّنات. */
import assert from 'node:assert/strict';
import {
  clampRr,
  isPositionTool,
  positionLabels,
  positionEndIndex,
  positionLabelLeft,
  positionLevels,
  positionOutcome,
  positionOutcomeText,
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
assert.equal(positionLabels(positionLevels('long', 1.085, 1.0825, 2, 'EURUSD'), 'EURUSD', 'en').stop, 'SL 1.08250 · 25.0 pips');
lab = positionLabels(positionLevels('short', 2650, 2655, 3, 'XAUUSD'), 'XAUUSD');
assert.equal(lab.target, 'TP 2635.00 · 150.0 pip · R:R 3');
assert.equal(lab.stop, 'SL 2655.00 · 50.0 pip');
// بلا مواصفة pip ⇒ فرق السعر بخانات الرمز
lab = positionLabels(positionLevels('long', 104.2, 104, 2, 'DXY'), 'DXY');
assert.equal(lab.stop, 'SL 104.000 · 0.200');
// منازل الفرق من السعر لا من حجم الفرق: وقف 35 نقطة على US30 كان «35.400»، و0.8 على BTC «0.80000»
lab = positionLabels(positionLevels('long', 42100, 42064.6, 2, 'US30'), 'US30');
assert.equal(lab.stop, 'SL 42064.60 · 35.40');
lab = positionLabels(positionLevels('short', 64000, 64000.8, 1, 'BTCUSD'), 'BTCUSD');
assert.equal(lab.stop, 'SL 64000.80 · 0.80');
assert.equal(lab.target, 'TP 63999.20 · 0.80 · R:R 1');
// النفط حول 100: الهدف والوقف بمنازل الدخول لا بحجم كلٍّ منهما («99.800» مقابل «100.20»)
lab = positionLabels(positionLevels('long', 100.05, 99.8, 1, 'USOIL'), 'USOIL');
assert.equal(lab.stop, 'SL 99.80 · 0.25');
assert.equal(lab.target, 'TP 100.30 · 0.25 · R:R 1');
// غاز حول 10: منازل الشارت (`priceRef` = آخر سعر 10.02 ⇒ ثلاث) لا منازل الدخول 9.985 (خمس)
lab = positionLabels(positionLevels('long', 9.985, 9.935, 2, 'NATGAS'), 'NATGAS', 'en-US', 10.02);
assert.equal(lab.stop, 'SL 9.935 · 0.050');
assert.equal(lab.target, 'TP 10.085 · 0.100 · R:R 2');

// النتيجة على الشموع: شراء 1.08500، وقف 1.08250، هدف 1.09000
const PL = positionLevels('long', 1.085, 1.0825, 2, 'EURUSD');
const bar = (low: number, high: number, close: number) => ({ low, high, close });
const bars = [
  bar(1.083, 1.087, 1.085), // 0 شمعة الدخول: لمسها للوقف قبل الدخول لا يُحسب
  bar(1.084, 1.086, 1.0855), // 1
  bar(1.0845, 1.0912, 1.089), // 2 تلمس الهدف
  bar(1.08, 1.09, 1.081), // 3
];
let o = positionOutcome(PL, bars, 0, 3, 3)!;
assert.equal(o.state, 'target');
assert.equal(o.exitIndex, 2);
assert.equal(o.r, 2);
assert.equal(positionOutcomeText(PL, o, 'EURUSD'), 'TP ✓ +50.0 pip · +2R');
// الإعادة عند الشمعة 1 ⇒ مفتوحة بإغلاقها، لا تُكشف النتيجة
o = positionOutcome(PL, bars, 0, 3, 1)!;
assert.equal(o.state, 'open');
near(o.exit, 1.0855);
assert.equal(positionOutcomeText(PL, o, 'EURUSD'), '+5.0 pip · +0.2R');
// رسمٌ من فريم أصغر يُرسى بفهرس كسري (M15 على H1 ⇒ 0.25، النهاية 2.75): كانت كل الشموع تُتخطّى ⇒ null/«مفتوحة»
o = positionOutcome(PL, bars, 0.25, 3, 3)!;
assert.equal(o.state, 'target');
assert.equal(o.exitIndex, 2);
// النهاية داخل شمعة تلمس الهدف (2.75): اللمس قد يقع بعد نهاية الصندوق ⇒ لا حكم، لا «TP» مخترع
assert.equal(positionOutcome(PL, bars, 0.25, 2.75, 3), null);
// صفقة H1 على D1: الوقف ضُرب ببقيّة يوم الدخول (الشمعة الحاوية) ⇒ لا حكم — كانت تُتخطّى فيُقرأ «TP ✓ +2R»
{
  const d1 = [bar(1.0824, 1.0866, 1.085), bar(1.0845, 1.0912, 1.089), bar(1.084, 1.086, 1.085)];
  assert.equal(positionOutcome(PL, d1, 0.4167, 1.25, 2), null);
  // الطرف على بداية الشمعة (رسمٌ على هذا الفريم) ⇒ لمس شمعة الدخول قبل الدخول لا يُحسب كالسابق
  assert.equal(positionOutcome(PL, d1, 0, 2, 2)!.state, 'target');
}
// صندوق داخل شمعة واحدة من هذا الفريم (M15 10:15→10:45 على H1) ⇒ لا حكم، لا «انتهى» بإغلاق H1
assert.equal(positionOutcome(PL, bars, 1.25, 1.75, 3), null);
assert.equal(positionOutcome(PL, bars, 1, 1.75, 3), null);
// والطرفان على الشمعة نفسها بالضبط (رسمٌ على هذا الفريم) ⇒ مفتوح كالسابق
assert.notEqual(positionOutcome(PL, bars, 1, 1, 3), null);
// الصندوق ينتهي عند 1 والسلسلة أطول ⇒ انتهى بلا لمس
assert.equal(positionOutcome(PL, bars, 0, 1, 3)!.state, 'ended');
// شمعة تلمس الحدّين معاً ⇒ الوقف
o = positionOutcome(PL, [bars[0], bar(1.08, 1.095, 1.09)], 0, 1, 1)!;
assert.equal(o.state, 'stop');
assert.equal(positionOutcomeText(PL, o, 'EURUSD'), 'SL ✕ −25.0 pip · −1R');
// صندوق بلا عرض زمني ⇒ مفتوح حتى آخر شمعة
assert.equal(positionOutcome(PL, bars, 0, 0, 3)!.state, 'target');
// دخول بعد آخر شمعة ⇒ لا نتيجة
assert.equal(positionOutcome(PL, bars, 5, 8, 3), null);
// دخول على آخر شمعة ⇒ مفتوحة بإغلاقها
o = positionOutcome(PL, bars, 3, 6, 3)!;
assert.equal(o.state, 'open');
assert.equal(positionOutcomeText(PL, o, 'EURUSD'), '−40.0 pip · −1.6R');
// شراء معلّق تحت السعر: لم يُنفَّذ ⇒ لا ربح ولا خسارة، بل بُعد السعر عن الدخول
const hi = [bar(1.087, 1.089, 1.088), bar(1.0865, 1.0915, 1.0872)]; // 1 يلمس «الهدف» قبل الدخول
o = positionOutcome(PL, hi, 0, 3, 1)!;
assert.equal(o.state, 'pending');
assert.equal(o.r, 0);
assert.equal(positionOutcomeText(PL, o, 'EURUSD'), 'Entry ⌛ 22.0 pip');
assert.equal(positionOutcomeText(PL, o, 'EURUSD', 'دخول'), 'دخول ⌛ 22.0 pip');
assert.equal(positionOutcomeText(PL, o, 'EURUSD', 'Entry', 'en'), 'Entry ⌛ 22.0 pips');
// الصندوق انتهى قبل بلوغه ⇒ فائت
o = positionOutcome(PL, [...hi, bar(1.086, 1.088, 1.087)], 0, 1, 2)!;
assert.equal(o.state, 'missed');
assert.equal(positionOutcomeText(PL, o, 'EURUSD'), 'Entry ✕');
assert.equal(positionOutcomeText(PL, o, 'EURUSD', 'دخول'), 'دخول ✕');
// يُنفَّذ بالشمعة 2، والهدف يُحسب بعد التنفيذ لا قبله
o = positionOutcome(PL, [...hi, bar(1.0845, 1.087, 1.086), bar(1.086, 1.0905, 1.09)], 0, 5, 3)!;
assert.equal(o.state, 'target');
assert.equal(o.fillIndex, 2);
assert.equal(o.exitIndex, 3);
// شمعة التنفيذ تلمس الوقف أيضاً ⇒ وقف
o = positionOutcome(PL, [...hi, bar(1.082, 1.087, 1.0822)], 0, 5, 2)!;
assert.equal(o.state, 'stop');
// فجوة تقفز فوق الدخول تنفّذه (عبور لا احتواء)
o = positionOutcome(PL, [...hi, bar(1.0835, 1.0845, 1.084)], 0, 5, 2)!;
assert.equal(o.state, 'open');
assert.equal(o.fillIndex, 2);
// بيع معلّق فوق السعر
const SP = positionLevels('short', 1.09, 1.0925, 2, 'EURUSD');
assert.equal(positionOutcome(SP, [bar(1.085, 1.087, 1.086)], 0, 3, 0)!.state, 'pending');
o = positionOutcome(SP, [bar(1.085, 1.087, 1.086), bar(1.086, 1.0901, 1.089)], 0, 3, 1)!;
assert.equal(o.state, 'open');
assert.equal(positionOutcomeText(SP, o, 'EURUSD'), '+10.0 pip · +0.4R');
// بيع ذهب: الوقف فوق
const SG = positionLevels('short', 2650, 2655, 3, 'XAUUSD');
o = positionOutcome(SG, [bar(2648, 2651, 2650), bar(2640, 2656, 2645)], 0, 1, 1)!;
assert.equal(o.state, 'stop');
o = positionOutcome(SG, [bar(2648, 2651, 2650), bar(2644, 2652, 2646)], 0, 1, 1)!;
assert.equal(positionOutcomeText(SG, o, 'XAUUSD'), '+40.0 pip · +0.8R');

// الوسم عند يمين اللوح يُزاح يساراً ليتّسع لا يُقصّ
const t30 = 'TP 1.09000 · 50.0 pip · R:R 2'; // 29 محرفاً ≈ 190px
assert.equal(positionLabelLeft(40, t30, 400), 40);
const shifted = positionLabelLeft(300, t30, 400);
assert.ok(shifted < 300 && shifted + t30.length * 6.2 + 10 <= 398, `${shifted}`);
assert.equal(positionLabelLeft(300, t30, 120), 2); // لوح أضيق من الوسم

// نهاية الصندوق يمين الدخول دائماً: سحبة لليسار تُعكس بالمسافة نفسها
assert.equal(positionEndIndex(100, 130), 130);
assert.equal(positionEndIndex(100, 100), 100);
assert.equal(positionEndIndex(100, 70), 130);
assert.equal(positionEndIndex(5, 0), 10);
assert.equal(positionEndIndex(NaN, 3), 3);

// خروج عند الدخول (أو دون نصف عُشر نقطة): صفر مطبوع بلا إشارة — كان «+0.0 pip · +0R» و«−0.0 pip · −0R»
assert.equal(positionOutcomeText(PL, { ...o, exit: PL.entry, r: 0 }, 'EURUSD'), '0.0 pip · 0R');
assert.equal(positionOutcomeText(PL, { ...o, exit: PL.entry - 0.000004, r: -0.00016 }, 'EURUSD'), '0.0 pip · 0R');
assert.equal(positionOutcomeText(PL, { ...o, exit: PL.entry - 0.00001, r: -0.0004 }, 'EURUSD'), '−0.1 pip · 0R');

console.log('positionTool.selftest: PASS');
