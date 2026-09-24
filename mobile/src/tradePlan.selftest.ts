/**
 * Self-test for tradePlan (pure).
 * Run: npx --yes tsx src/tradePlan.selftest.ts
 */
import assert from 'node:assert/strict';
import {
  analyzePlan,
  floatingResult,
  formatPips,
  formatR,
  formatRR,
  levelSideIssue,
  realizedMove,
  realizedR,
  roundR,
} from './tradePlan';

// شراء EURUSD صحيح: وقف 25 pip، هدف 50 pip ⇒ 1:2
const a = analyzePlan({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.0825, tp: 1.09 });
assert.equal(a.ok, true);
assert.equal(a.riskPips, 25);
assert.equal(a.rewardPips, 50);
assert.ok(Math.abs(a.rr! - 2) < 1e-9);
assert.equal(formatRR(a.rr), '1:2.0');

// بيع USDJPY صحيح: pip = 0.01
const b = analyzePlan({ symbol: 'usdjpy', side: 'sell', entry: 150.0, sl: 150.3, tp: 149.55 });
assert.equal(b.ok, true);
assert.equal(b.riskPips, 30);
assert.equal(b.rewardPips, 45);
assert.equal(formatRR(b.rr), '1:1.5');

// ذهب: pip = 0.1
const g = analyzePlan({ symbol: 'XAUUSD', side: 'buy', entry: 2350, sl: 2345, tp: 2365 });
assert.equal(g.riskPips, 50);
assert.equal(g.rewardPips, 150);
assert.equal(formatRR(g.rr), '1:3.0');

// وقف بالجهة الخطأ (شراء بوقف فوق الدخول)
const w1 = analyzePlan({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.09, tp: 1.095 });
assert.equal(w1.ok, false);
assert.equal(w1.issue, 'slWrongSide');
assert.equal(w1.rr, null);
// هدف بالجهة الخطأ (بيع بهدف فوق الدخول)
const w2 = analyzePlan({ symbol: 'EURUSD', side: 'sell', entry: 1.085, sl: 1.09, tp: 1.095 });
assert.equal(w2.issue, 'tpWrongSide');
// وقف = دخول
assert.equal(analyzePlan({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.085, tp: 1.09 }).issue, 'slWrongSide');

// رمز بلا pip معروف: R:R يعمل، الـpips null
const c = analyzePlan({ symbol: 'BTCUSD', side: 'buy', entry: 60000, sl: 59000, tp: 63000 });
assert.equal(c.ok, true);
assert.equal(c.riskPips, null);
assert.equal(formatRR(c.rr), '1:3.0');
const d = analyzePlan({ symbol: 'DXY', side: 'sell', entry: 104, sl: 104.5, tp: 103 });
assert.equal(d.ok, true);
assert.equal(d.riskPips, null);

// مدخلات فاسدة
assert.equal(analyzePlan({ symbol: 'EURUSD', side: 'buy', entry: NaN, sl: 1, tp: 2 }).issue, 'invalid');
assert.equal(analyzePlan({ symbol: 'EURUSD', side: 'buy', entry: 0, sl: 1, tp: 2 }).issue, 'invalid');
assert.equal(analyzePlan({ symbol: 'EURUSD', side: 'buy', entry: 1, sl: -1, tp: 2 }).issue, 'invalid');

// تنسيق
assert.equal(formatRR(null), '—');
assert.equal(formatRR(0.333), '1:0.3');
assert.equal(formatRR(1.25), '1:1.3');
assert.equal(formatPips(25), '25');
assert.equal(formatPips(12.5), '12.5');
assert.equal(formatPips(null), null);
// حساب عائم: 1.0850-1.0825 لا يعطي 24.999999
assert.equal(analyzePlan({ symbol: 'GBPUSD', side: 'buy', entry: 1.2732, sl: 1.2717, tp: 1.2777 }).riskPips, 15);

// دفتر الصفقات: وقف/هدف اختياريان
assert.equal(levelSideIssue({ side: 'buy', entry: 1.085 }), null);
assert.equal(levelSideIssue({ side: 'buy', entry: 1.085, sl: 1.08 }), null);
assert.equal(levelSideIssue({ side: 'buy', entry: 1.085, sl: 1.09 }), 'slWrongSide');
assert.equal(levelSideIssue({ side: 'buy', entry: 1.085, sl: 1.085 }), 'slWrongSide');
assert.equal(levelSideIssue({ side: 'sell', entry: 1.085, tp: 1.09 }), 'tpWrongSide');
assert.equal(levelSideIssue({ side: 'sell', entry: 1.085, sl: 1.08, tp: 1.09 }), 'slWrongSide');
assert.equal(levelSideIssue({ side: 'sell', entry: 1.085, sl: 1.09, tp: 1.08 }), null);
assert.equal(levelSideIssue({ side: 'buy', entry: 1.085, sl: null, tp: NaN }), null);

// النتيجة بالـR
assert.equal(realizedR({ side: 'buy', entry: 1.085, sl: 1.0825, exit: 1.09 }), 2);
assert.equal(realizedR({ side: 'buy', entry: 1.085, sl: 1.0825, exit: 1.0825 }), -1);
assert.equal(realizedR({ side: 'sell', entry: 150, sl: 150.3, exit: 149.55 }), 1.5);
assert.equal(realizedR({ side: 'sell', entry: 150, sl: 150.3, exit: 150.15 }), -0.5);
assert.equal(realizedR({ side: 'buy', entry: 1.085, sl: 1.09, exit: 1.1 }), null);
assert.equal(realizedR({ side: 'buy', entry: 1.085, sl: null, exit: 1.1 }), null);
assert.equal(realizedR({ side: 'buy', entry: 1.085, sl: 1.08, exit: null }), null);
assert.equal(formatR(2), '+2R');
assert.equal(formatR(-1), '−1R');
assert.equal(formatR(1.5), '+1.5R');
assert.equal(formatR(0), '0R');
assert.equal(formatR(null), null);

console.log('tradePlan selftest OK');

// وقف أقرب من 1 pip: كان «0 pip · R:R 1:5000» — الآن مشكلة صريحة
const tc = analyzePlan({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.08499, tp: 1.09 });
assert.equal(tc.ok, false);
assert.equal(tc.issue, 'slTooClose');
assert.equal(tc.rr, null);
// 1 pip بالضبط مقبول رغم الفاصلة العائمة (1.0851 − 1.0850 = 0.0000999…)
const one = analyzePlan({ symbol: 'EURUSD', side: 'sell', entry: 1.085, sl: 1.0851, tp: 1.084 });
assert.equal(one.ok, true);
assert.equal(one.riskPips, 1);
// الين: 0.005 أقل من pip (0.01)
assert.equal(analyzePlan({ symbol: 'USDJPY', side: 'buy', entry: 150, sl: 149.995, tp: 151 }).issue, 'slTooClose');
// الجهة الخطأ تسبق «قريب جداً»
assert.equal(analyzePlan({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.08501, tp: 1.09 }).issue, 'slWrongSide');
// رمز بلا pip معروف: لا حكم «قريب جداً»
assert.equal(analyzePlan({ symbol: 'BTCUSD', side: 'buy', entry: 60000, sl: 59999.99, tp: 61000 }).ok, true);

console.log('tradePlan slTooClose selftest OK');


// نتيجة الصفقة بالـpip ونسبة الحركة (دفتر الصفقات)
assert.deepEqual(realizedMove({ symbol: 'EURUSD', side: 'buy', entry: 1.085, exit: 1.0875 }), { pips: 25, pct: 0.23 });
assert.deepEqual(realizedMove({ symbol: 'USDJPY', side: 'sell', entry: 150, exit: 150.3 }), { pips: -30, pct: -0.2 });
assert.deepEqual(realizedMove({ symbol: 'XAUUSD', side: 'buy', entry: 2350, exit: 2355.5 }), { pips: 55, pct: 0.23 });
assert.equal(realizedMove({ symbol: 'BTCUSD', side: 'buy', entry: 60000, exit: 60600 })?.pips, null);
assert.equal(realizedMove({ symbol: 'EURUSD', side: 'buy', entry: 1.085, exit: null }), null);

// النتيجة العائمة لصفقة مفتوحة — نفس مسطرة الصفقة المغلقة بالضبط، والمصدر وحده يختلف (سعر السوق
// الآن بدل سعر خروج نُفِّذ). فلا يقفز الرقم المعروض لحظة الإغلاق على السعر نفسه.
assert.deepEqual(floatingResult({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.0825, current: 1.0875 }), {
  pips: 25,
  pct: 0.23,
  r: 1,
});
// بيع بالين: السوق فوق الدخول ⇒ عائم سالب، والـR سالبة بالنسبة نفسها
assert.deepEqual(floatingResult({ symbol: 'USDJPY', side: 'sell', entry: 150, sl: 150.3, current: 150.15 }), {
  pips: -15,
  pct: -0.1,
  r: -0.5,
});
// الذهب: pip = 0.1 (لا 0.0001) — الرقم الذي يفسد أكثر من غيره لو حُسب بحجم pip عام
assert.deepEqual(floatingResult({ symbol: 'XAUUSD', side: 'buy', entry: 2350, sl: 2345, current: 2355.5 }), {
  pips: 55,
  pct: 0.23,
  r: 1.1,
});
// صفقة بلا وقف مسجَّل: نقاط ونسبة نعم، R لا (لا مخاطرة معلومة تُقاس بها النتيجة)
assert.deepEqual(floatingResult({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: null, current: 1.0875 }), {
  pips: 25,
  pct: 0.23,
  r: null,
});
// وقف بالجهة الخطأ بسجلّ قديم: R تسقط وحدها، والنقاط تبقى صادقة
assert.equal(floatingResult({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.09, current: 1.0875 })?.r, null);
// السوق عند الدخول تماماً: صفر — لا «—» ولا لون ربح/خسارة
assert.deepEqual(floatingResult({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.0825, current: 1.085 }), {
  pips: 0,
  pct: 0,
  r: 0,
});
// رمز بلا حجم pip معروف: النسبة تبقى، والنقاط null (لا رقم نقاط مختلَق)
assert.equal(floatingResult({ symbol: 'BTCUSD', side: 'buy', entry: 60000, sl: 59000, current: 60600 })?.pips, null);
assert.equal(floatingResult({ symbol: 'BTCUSD', side: 'buy', entry: 60000, sl: 59000, current: 60600 })?.pct, 1);
// لا سعر (لم يصل اقتباس/اقتباس تجريبي مرفوض): لا نتيجة إطلاقاً
assert.equal(floatingResult({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.08, current: null }), null);
assert.equal(floatingResult({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.08, current: 0 }), null);
assert.equal(floatingResult({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.08, current: NaN }), null);

console.log('tradePlan floatingResult selftest OK');

// ضجيج الفاصلة العائمة بالـR:R — خطة 1:1 تماماً على USDJPY كانت تخرج 0.99999999999986 فتُحذِّر
// «الربح المحتمل أقل من المخاطرة» (اللوحات تفحص `rr < 1`)
const jpy11 = analyzePlan({ symbol: 'USDJPY', side: 'buy', entry: 157.4, sl: 157.2, tp: 157.6 });
assert.equal(jpy11.rr, 1);
assert.ok(!(jpy11.rr! < 1));
assert.equal(analyzePlan({ symbol: 'USDJPY', side: 'sell', entry: 157.4, sl: 157.6, tp: 157.2 }).rr, 1);
// 2.25 بالضبط (وقف 20، هدف 45) يُكتب واحداً بكل الأدوات — كان «1:2.2» على اليورو و«1:2.3» على الذهب
for (const [sym, e, s, tp] of [
  ['EURUSD', 1.085, 1.083, 1.0895],
  ['GBPUSD', 1.27, 1.268, 1.2745],
  ['USDJPY', 157.4, 157.2, 157.85],
  ['AUDUSD', 0.66, 0.658, 0.6645],
  ['XAUUSD', 2650, 2640, 2672.5],
] as const) {
  const p = analyzePlan({ symbol: sym, side: 'buy', entry: e, sl: s, tp });
  assert.equal(p.rr, 2.25, sym);
  assert.equal(formatRR(p.rr), '1:2.3', sym);
}
// ما دون 1 حقاً ما زال دون 1
assert.ok(analyzePlan({ symbol: 'USDJPY', side: 'buy', entry: 157.4, sl: 157.2, tp: 157.59 }).rr! < 1);

// الـR المحقّقة: ‎±1.25R‎ كانت تُقرأ حسب ضجيج الزوج (−1.2 على اليورو، −1.3 على 1.1000، +1.3 على
// الذهب) و`Math.round` يرفع النصف نحو +∞ فتصغر الخسارة عن الربح المماثل. الآن متماثلة: ‎±1.3R‎
for (const [e, s, lose, win] of [
  [1.085, 1.083, 1.0825, 1.0875],
  [1.1, 1.098, 1.0975, 1.1025],
  [157.4, 157.2, 157.15, 157.65],
  [2650, 2640, 2637.5, 2662.5],
] as const) {
  assert.equal(realizedR({ side: 'buy', entry: e, sl: s, exit: lose }), -1.3, `lose ${e}`);
  assert.equal(realizedR({ side: 'buy', entry: e, sl: s, exit: win }), 1.3, `win ${e}`);
  // البيع مرآة الشراء
  const d = e - s;
  assert.equal(realizedR({ side: 'sell', entry: e, sl: e + d, exit: e + (e - lose) }), -1.3, `sell lose ${e}`);
}
// خسارة ضئيلة تُقرَّب لصفر: صفر موجب لا «−0»
assert.ok(Object.is(realizedR({ side: 'buy', entry: 1.085, sl: 1.075, exit: 1.08496 }), 0));
// الحالات القائمة لم تتغيّر
assert.equal(realizedR({ side: 'buy', entry: 1.085, sl: 1.0825, exit: 1.0825 }), -1);
assert.equal(realizedR({ side: 'sell', entry: 150, sl: 150.3, exit: 150.15 }), -0.5);

console.log('tradePlan float-noise selftest OK');

// متوسط الـR بالدفتر بالقاعدة نفسها: (−1) و(−1.5) ⇒ −1.25 ⇒ −1.3R، مرآةً لـ+1.3R (كان −1.2R)
assert.equal(roundR((-1 + -1.5) / 2), -1.3);
assert.equal(roundR((1 + 1.5) / 2), 1.3);
assert.equal(roundR(-0.04), 0);
assert.ok(Object.is(roundR(-0.04), 0));
assert.equal(roundR(0.349999999999), 0.4); // فرق 1e-12 ضجيجٌ لا قيمة
assert.equal(roundR(-1.2499999999999722), -1.3);

console.log('tradePlan roundR selftest OK');

// تأكيد «أغلق بالسوق» بالدفتر يعرض الـR بالمسطرة نفسها التي يعرض بها السطرُ الصفقةَ مفتوحةً ثم
// مغلقة: الرقم المؤكَّد = الرقم العائم = الرقم بعد الحفظ، على السعر نفسه.
{
  const cases = [
    { symbol: 'EURUSD', side: 'buy' as const, entry: 1.085, sl: 1.083, px: 1.0858 },
    { symbol: 'USDJPY', side: 'sell' as const, entry: 157.4, sl: 157.6, px: 157.55 },
    { symbol: 'XAUUSD', side: 'buy' as const, entry: 2650, sl: 2640, px: 2662.5 },
  ];
  const want = [0.4, -0.8, 1.3];
  cases.forEach((c, i) => {
    const confirm = realizedR({ side: c.side, entry: c.entry, sl: c.sl, exit: c.px });
    const floating = floatingResult({ symbol: c.symbol, side: c.side, entry: c.entry, sl: c.sl, current: c.px });
    assert.equal(confirm, want[i], `${c.symbol} close-confirm R`);
    assert.equal(floating?.r, confirm, `${c.symbol} floating R = confirm R`);
  });
  // صفقة بلا وقف: لا R بالتأكيد (formatR(null) = null فلا يُلحق شيء)
  assert.equal(formatR(realizedR({ side: 'buy', entry: 1.085, sl: null, exit: 1.09 })), null);
  assert.equal(formatR(realizedR({ side: 'buy', entry: 1.085, sl: 1.083, exit: 1.0858 })), '+0.4R');
}

console.log('tradePlan close-confirm R selftest OK');
