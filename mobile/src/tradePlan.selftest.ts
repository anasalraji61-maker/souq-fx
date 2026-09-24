/**
 * Self-test for tradePlan (pure).
 * Run: npx --yes tsx src/tradePlan.selftest.ts
 */
import assert from 'node:assert/strict';
import {
  analyzePlan,
  averageR,
  floatingResult,
  formatPips,
  formatR,
  formatRR,
  journalSymbol,
  quoteSymbol,
  levelSideIssue,
  netByInstrument,
  knownLots,
  journalInstrumentKey,
  realizedMove,
  realizedR,
  roundR,
  targetAtRR,
  QUICK_RR,
} from './tradePlan';
import { instrumentSpec, pipValuePerLot, planJournalNote, positionSize } from './positionSize';

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
// تحت 1 نقصّ لا تقريب: 0.96 لا تُطبع «1:1.0» فوق تحذير «الربح أقل من المخاطرة»
assert.equal(formatRR(0.96), '1:0.9');
assert.equal(formatRR(0.999999), '1:0.9');
assert.equal(formatRR(0.5), '1:0.5');
assert.equal(formatRR(0.1), '1:0.1');
assert.equal(formatRR(0.3), '1:0.3'); // 0.3 × 10 بالفاصلة العائمة = 2.9999… لا يُقصّ إلى 0.2
assert.equal(formatRR(0.7), '1:0.7');
assert.equal(formatRR(1), '1:1.0');
assert.equal(formatRR(0.999999999999), '1:0.9');
// الصغيرة جداً (صافٍ بعد التكاليف يكاد يكون صفراً) لا تُطبع «1:0.0»
assert.equal(formatRR(0.04), '1:0.04');
assert.equal(formatRR(0.099), '1:0.09');
assert.equal(formatRR(0.07), '1:0.07');
assert.equal(formatRR(0.004), '1:<0.01');
assert.equal(formatRR(1e-12), '1:<0.01');
assert.equal(formatRR(0), '—');
assert.equal(formatRR(-1), '—');
assert.equal(formatRR(NaN), '—');
// شبكة: كل R:R موجبة تحت 1 تُطبع «1:0.» أو «1:<0.01» ولا تتجاوز قيمتها؛ ومن 1 فما فوق لا تُطبع تحت «1:1.0»
for (let i = 1; i <= 3000; i++) {
  const rr = i / 1000;
  const s = formatRR(rr);
  if (rr < 1) {
    assert.ok(s.startsWith('1:0.') || s === '1:<0.01', `${rr} ${s}`);
    if (s !== '1:<0.01') assert.ok(Number(s.slice(2)) <= rr + 1e-12, `${rr} ${s}`);
  } else {
    assert.ok(Number(s.slice(2)) >= 1, `${rr} ${s}`);
  }
}
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
// تقريب متماثل حول الصفر: الخسارة لا تُكتب أصغر من الربح المماثل
assert.deepEqual(realizedMove({ symbol: 'XAUUSD', side: 'buy', entry: 2000, exit: 2002.5 }), { pips: 25, pct: 0.13 });
assert.deepEqual(realizedMove({ symbol: 'XAUUSD', side: 'buy', entry: 2000, exit: 1997.5 }), { pips: -25, pct: -0.13 });
assert.deepEqual(realizedMove({ symbol: 'XAUUSD', side: 'sell', entry: 2000, exit: 2002.5 }), { pips: -25, pct: -0.13 });
assert.equal(realizedMove({ symbol: 'EURUSD', side: 'buy', entry: 1.085, exit: 1.085005 })?.pips, 0.1);
assert.equal(realizedMove({ symbol: 'EURUSD', side: 'buy', entry: 1.085, exit: 1.084995 })?.pips, -0.1);
assert.equal(realizedMove({ symbol: 'EURUSD', side: 'sell', entry: 1.085, exit: 1.085005 })?.pips, -0.1);
// صفر بلا إشارة
assert.ok(Object.is(realizedMove({ symbol: 'EURUSD', side: 'sell', entry: 1.085, exit: 1.085 })!.pips, 0));
assert.ok(Object.is(realizedMove({ symbol: 'EURUSD', side: 'sell', entry: 1.085, exit: 1.085 })!.pct, 0));
// خاصية: الاتجاهان متعاكسان تماماً بالقيمة على شبكة أسعار الأدوات
for (const [sym, entry, step] of [['EURUSD', 1.085, 0.00001], ['USDJPY', 157.4, 0.001], ['XAUUSD', 2000, 0.01], ['GBPJPY', 198.5, 0.001]] as const) {
  for (let k = 1; k <= 3000; k++) {
    const exit = Number((entry + k * step).toFixed(6));
    const up = realizedMove({ symbol: sym, side: 'buy', entry, exit })!;
    const dn = realizedMove({ symbol: sym, side: 'sell', entry, exit })!;
    assert.equal(up.pips, 0 - dn.pips!, `${sym} ${exit} pips`);
    assert.equal(up.pct, 0 - dn.pct, `${sym} ${exit} pct`);
  }
}

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

// —— سعر الهدف من نسبة R:R (شرائح 1:1/1:1.5/1:2/1:3 بالحاسبة والدفتر) ——
{
  // القيم المرجعية: شراء EURUSD وقف 25 pip ⇒ 1:2 = +50 pip
  assert.equal(targetAtRR({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.0825, rr: 2 }), 1.09);
  assert.equal(targetAtRR({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.0825, rr: 1 }), 1.0875);
  // بيع USDJPY وقف 20 pip ⇒ 1:1 = 157.20، و1:3 = 156.80 (منزلة الـpipette 3)
  assert.equal(targetAtRR({ symbol: 'USDJPY', side: 'sell', entry: 157.4, sl: 157.6, rr: 1 }), 157.2);
  assert.equal(targetAtRR({ symbol: 'USDJPY', side: 'sell', entry: 157.4, sl: 157.6, rr: 3 }), 156.8);
  // ذهب: وقف 50 pip (5$) ⇒ 1:1.5 = +7.5$
  assert.equal(targetAtRR({ symbol: 'XAUUSD', side: 'buy', entry: 2650, sl: 2645, rr: 1.5 }), 2657.5);
  // تقريب بعيداً عن الدخول: وقف 25.3 pip × 1.5 = 37.95 pip ⇒ 38.0 (شراء) — لا 37.9 فتصير النسبة أقل
  assert.equal(targetAtRR({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.08247, rr: 1.5 }), 1.0888);
  assert.equal(targetAtRR({ symbol: 'EURUSD', side: 'sell', entry: 1.085, sl: 1.08753, rr: 1.5 }), 1.0812);
  // رمز بلا مواصفات: بلا قصّ لمنزلة
  assert.equal(targetAtRR({ symbol: 'BTCUSD', side: 'buy', entry: 60000, sl: 59000, rr: 2 }), 62000);
  // مرفوض: وقف بالجهة الخطأ / يساوي الدخول / مدخل فاسد / هدف بيع ≤ 0
  assert.equal(targetAtRR({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.09, rr: 2 }), null);
  assert.equal(targetAtRR({ symbol: 'EURUSD', side: 'sell', entry: 1.085, sl: 1.08, rr: 2 }), null);
  assert.equal(targetAtRR({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.085, rr: 2 }), null);
  assert.equal(targetAtRR({ symbol: 'EURUSD', side: 'buy', entry: NaN, sl: 1.08, rr: 2 }), null);
  assert.equal(targetAtRR({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.08, rr: 0 }), null);
  assert.equal(targetAtRR({ symbol: 'EURUSD', side: 'sell', entry: 0.5, sl: 0.9, rr: 2 }), null);

  // الخاصية: على كل تركيبة، الهدف الناتج يعطي بـ`analyzePlan` خطةً صالحة نسبتها ≥ المطلوبة
  // (بفارق أقل من عُشر pip) وتُطبع `formatRR` بالنسبة المختارة نفسها.
  let n = 0;
  const syms: Array<[string, number, number]> = [
    ['EURUSD', 1.0852, 0.0001],
    ['GBPJPY', 198.437, 0.01],
    ['USDJPY', 157.403, 0.01],
    ['XAUUSD', 2650.37, 0.1],
    ['XAGUSD', 31.245, 0.01],
    ['EURGBP', 0.8431, 0.0001],
  ];
  for (const [symbol, entry, pip] of syms) {
    for (let tenths = 10; tenths <= 1500; tenths += 7) {
      const slPips = tenths / 10;
      for (const side of ['buy', 'sell'] as const) {
        const sl = Number((side === 'buy' ? entry - slPips * pip : entry + slPips * pip).toFixed(6));
        for (const rr of QUICK_RR) {
          const tp = targetAtRR({ symbol, side, entry, sl, rr });
          assert.ok(tp != null, `${symbol} ${side} ${slPips} ${rr}`);
          const plan = analyzePlan({ symbol, side, entry, sl, tp: tp! });
          assert.equal(plan.ok, true, `${symbol} ${side} ${slPips} ${rr} ok`);
          assert.ok(plan.rr! >= rr - 1e-9, `${symbol} ${side} sl=${slPips} rr=${rr} got ${plan.rr}`);
          const overPips = Math.abs(plan.rewardDist - rr * plan.riskDist) / pip;
          assert.ok(overPips < 0.1 + 1e-6, `${symbol} ${side} sl=${slPips} rr=${rr} over ${overPips}`);
          assert.equal(formatRR(plan.rr), formatRR(rr), `${symbol} ${side} sl=${slPips} rr=${rr} label`);
          n++;
        }
      }
    }
  }
  assert.ok(n > 10000);
}

// رمز الدفتر: تطبيع الفواصل والحالة، وطول الخادم 3–12
assert.equal(journalSymbol('EURUSD'), 'EURUSD');
assert.equal(journalSymbol(' eur/usd '), 'EURUSD');
assert.equal(journalSymbol('Eur usd'), 'EURUSD');
assert.equal(journalSymbol('XAU-USD'), 'XAUUSD');
assert.equal(journalSymbol('gbp_jpy'), 'GBPJPY');
assert.equal(journalSymbol('us30'), 'US30');
assert.equal(journalSymbol('NAS100'), 'NAS100');
assert.equal(journalSymbol('EURUSD.m'), 'EURUSD.M');
assert.equal(journalSymbol('DXY'), 'DXY');
assert.equal(journalSymbol('EU'), null);
assert.equal(journalSymbol('E/U'), null);
assert.equal(journalSymbol(''), null);
assert.equal(journalSymbol('   '), null);
assert.equal(journalSymbol('ABCDEFGHIJKLM'), null);
assert.equal(journalSymbol('ABCDEFGHIJKL'), 'ABCDEFGHIJKL');
assert.equal(journalSymbol('يورو'), null);
assert.equal(journalSymbol('EUR$USD'), null);
// كل ما يُقبل يوافق قيد الخادم (min_length=3, max_length=12) ولا يحوي مسافة/فاصلاً
for (const raw of ['eur/usd', 'x a u / u s d', 'A-B', 'nas-100', 'a.b.c']) {
  const v = journalSymbol(raw);
  if (v != null) assert.ok(v.length >= 3 && v.length <= 12 && !/[\s/_-]/.test(v) && v === v.toUpperCase());
}

console.log('tradePlan targetAtRR selftest OK');

// رمز الدفتر بلاحقة الوسيط كما يحفظه `journalSymbol` («XAUUSD.M») يُقاس بمسطرة الأداة نفسها
{
  const sym = journalSymbol('xauusd.m')!;
  assert.equal(sym, 'XAUUSD.M');
  assert.deepEqual(
    realizedMove({ symbol: sym, side: 'buy', entry: 2650, exit: 2655 }),
    realizedMove({ symbol: 'XAUUSD', side: 'buy', entry: 2650, exit: 2655 })
  );
  assert.equal(realizedMove({ symbol: sym, side: 'buy', entry: 2650, exit: 2655 })!.pips, 50);
  const p = analyzePlan({ symbol: 'EURUSDM', side: 'sell', entry: 1.085, sl: 1.0875, tp: 1.08 });
  assert.equal(p.riskPips, 25);
  assert.equal(p.rewardPips, 50);
  assert.equal(targetAtRR({ symbol: 'USDJPY.pro', side: 'buy', entry: 157.4, sl: 157.2, rr: 2 }), 157.8);
}

console.log('tradePlan broker-suffix selftest OK');

// quoteSymbol — الرمز الذي يُطلب به سعر السوق لصفقة بالدفتر
{
  // كما يحفظها الدفتر (journalSymbol يرفع الأحرف): اللاحقة تسقط فيُطلب اقتباس الأداة نفسها
  for (const [raw, want] of [
    ['XAUUSD.M', 'XAUUSD'],
    ['EURUSDM', 'EURUSD'],
    ['GBPJPY-ECN', 'GBPJPY'],
    ['USDJPY#', 'USDJPY'],
    ['XAUUSD.pro', 'XAUUSD'],
    ['eur/usd', 'EURUSD'],
    ['EURUSD', 'EURUSD'],
    [' xauusd ', 'XAUUSD'],
  ] as const) {
    assert.equal(quoteSymbol(raw), want, raw);
    // والرمز المحفوظ بالدفتر نفسه يعطي النتيجة ذاتها
    assert.equal(quoteSymbol(journalSymbol(raw)!), want, `stored ${raw}`);
  }
  // رموز بلا مواصفات تبقى كما يحفظها الدفتر (المزوّد قد يعرفها) — لا تُرمى
  assert.equal(quoteSymbol('US30'), 'US30');
  // مؤشر/سلعة بلاحقة وسيط: يُطلب الاسم المعروف (المزوّد يعرف USOIL لا USOIL.M)
  assert.equal(quoteSymbol('USOIL.m'), 'USOIL');
  assert.equal(quoteSymbol(journalSymbol('usoil.m')!), 'USOIL');
  assert.equal(quoteSymbol('US30Cash'), 'US30');
  assert.equal(quoteSymbol('AAPL.US'), 'AAPL.US'); // اسم مجهول: كما يُحفظ
  assert.equal(quoteSymbol('US30M'), 'US30M');
  assert.equal(quoteSymbol('nas100'), 'NAS100');
  assert.equal(quoteSymbol('BTCUSD'), 'BTCUSD');
  // «EURUSDT» ليس EURUSD (يورو/تيثر) — لا يُطلب له اقتباس اليورو/دولار
  assert.equal(quoteSymbol('EURUSDT'), 'EURUSDT');
  assert.equal(quoteSymbol('EU'), null);
  assert.equal(quoteSymbol(''), null);
}

console.log('tradePlan quoteSymbol selftest OK');

// journalSymbol يحفظ لاحقة الوسيط بفاصلها — فتبقى الأداة معروفة بعد الحفظ (نقاط/R/مخاطرة بالمال)
{
  for (const [raw, want] of [
    ['GBPJPY-ECN', 'GBPJPY-ECN'],
    ['gbp/jpy-ecn', 'GBPJPY-ECN'],
    ['EURUSD_PRO', 'EURUSD_PRO'],
    ['USDJPY#', 'USDJPY#'],
    ['XAUUSD+', 'XAUUSD+'],
    ['xauusd.m', 'XAUUSD.M'],
    ['EURUSDm', 'EURUSDM'],
    ['EUR USD', 'EURUSD'],
    [' eur / usd ', 'EURUSD'],
    ['XAUUSD.ABCDE', 'XAUUSD.ABCDE'],
  ] as const) {
    const stored = journalSymbol(raw);
    assert.equal(stored, want, raw);
    assert.ok(stored!.length <= 12, `server max 12: ${stored}`);
    // الرمز المحفوظ تعرفه الأداة: نقاط الصفقة ونتيجتها بالـR تُحسب كالرمز النظيف حرفياً
    const clean = instrumentSpec(raw)!.symbol;
    assert.deepEqual(
      realizedMove({ symbol: stored!, side: 'buy', entry: 150, exit: 150.5 }),
      realizedMove({ symbol: clean, side: 'buy', entry: 150, exit: 150.5 }),
      `pips ${stored}`
    );
    assert.notEqual(realizedMove({ symbol: stored!, side: 'buy', entry: 150, exit: 150.5 })!.pips, null);
  }
  // ما لا مواصفات له يبقى على القاعدة القديمة
  assert.equal(journalSymbol('US-30'), 'US30');
  assert.equal(journalSymbol('EURUSDT'), 'EURUSDT');
}

console.log('tradePlan journalSymbol suffix selftest OK');


// —— netByInstrument: صافي النقاط والمال لكل أداة بإحصاءات الدفتر ——
{
  const c = (symbol: string, side: string, entry: number, exit: number | null, size = 0.5, status = 'closed') => ({
    symbol, side, entry, exit, size, status,
  });
  const rows = netByInstrument([
    c('EURUSD', 'buy', 1.085, 1.0875), // +25 pip · +125.00
    c('EURUSD', 'sell', 1.09, 1.091), // −10 pip · −50.00
    c('XAUUSD', 'buy', 2400, 2405, 0.1), // +50 pip · +50.00
    c('USDJPY', 'buy', 150, 149.5, 1.2), // −50 pip · −60,000 JPY
    c('EURUSD', 'buy', 1.08, null, 0.5, 'open'), // مفتوحة — لا تُحسب
    c('US30', 'buy', 39000, 39100), // بلا مواصفات — بلا نقاط فلا تدخل
  ]);
  assert.deepEqual(rows, [
    { symbol: 'EURUSD', n: 2, pips: 15, cash: { amount: 75, ccy: 'USD' } },
    { symbol: 'USDJPY', n: 1, pips: -50, cash: { amount: -60000, ccy: 'JPY' } },
    { symbol: 'XAUUSD', n: 1, pips: 50, cash: { amount: 50, ccy: 'USD' } },
  ]);
  // المال كلّه أو لا شيء: صفقة بحجم 1 (قيمة الخادم الافتراضية) تُسقط مال الأداة كلها لا جزءاً منه
  const partial = netByInstrument([c('GBPUSD', 'buy', 1.27, 1.272, 0.3), c('GBPUSD', 'buy', 1.27, 1.271, 1)]);
  assert.deepEqual(partial, [{ symbol: 'GBPUSD', n: 2, pips: 30, cash: null }]);
  // جمعٌ بلا ضجيج فاصلة عائمة، ومتماثل حول الصفر، وبلا «−0»
  const noise = netByInstrument([
    c('EURUSD', 'buy', 1.1, 1.10001, 0.1), // +0.1 pip · +0.10
    c('EURUSD', 'buy', 1.1, 1.10002, 0.1), // +0.2 pip · +0.20
    c('EURUSD', 'sell', 1.1, 1.10003, 0.1), // −0.3 pip · −0.30
  ]);
  assert.equal(noise[0]!.pips, 0);
  assert.ok(Object.is(noise[0]!.pips, 0), 'no −0 pips');
  assert.ok(noise[0]!.cash && Object.is(noise[0]!.cash.amount, 0), 'no −0 cash');
  const three = netByInstrument([c('EURUSD', 'buy', 1.1, 1.10001, 0.1), c('EURUSD', 'buy', 1.1, 1.10002, 0.1)]);
  assert.equal(three[0]!.pips, 0.3);
  assert.equal(three[0]!.cash!.amount, 0.3);
  // المجموع = مجموع أسطر الصفقات نفسها حرفياً (سطر الإحصاءات لا يناقض القائمة تحته)
  const trades = [c('EURUSD', 'buy', 1.08512, 1.08777, 0.37), c('EURUSD', 'sell', 1.0901, 1.09233, 0.21)];
  const sumRows = trades.reduce((a, tr) => a + realizedMove({ ...tr, side: tr.side as 'buy' | 'sell' })!.pips!, 0);
  assert.equal(netByInstrument(trades)[0]!.pips, Math.round(sumRows * 10) / 10);
  // الترتيب: الأكثر صفقاتٍ ثم أبجدياً؛ والمفتاح الأداة (شرائح الفلتر نفسها — لاحقة الوسيط تسقط)
  const order = netByInstrument([c('GBPUSD', 'buy', 1.27, 1.271), c('AUDUSD', 'buy', 0.66, 0.661), c('xauusd.m', 'buy', 2400, 2401)]);
  assert.deepEqual(order.map((r) => r.symbol), ['AUDUSD', 'GBPUSD', 'XAUUSD']);
  // «XAUUSD.m» و«XAUUSD» و«XAUUSDm» أداة واحدة: صافٍ واحد بالنقاط والمال لا ثلاثة
  const gold = netByInstrument([
    c('XAUUSD', 'buy', 2400, 2404, 0.1), // +40 pip · +40.00
    c('XAUUSD.m', 'sell', 2400, 2405.5, 0.1), // −55 pip · −55.00
    c('xauusdm', 'buy', 2400, 2401, 0.2), // +10 pip · +20.00
  ]);
  assert.deepEqual(gold, [{ symbol: 'XAUUSD', n: 3, pips: -5, cash: { amount: 5, ccy: 'USD' } }]);
  // المال الكلّي-أو-لا-شيء يسري على الأداة المدموجة: صفقة بلاحقة بلا حجم تُسقط مال الذهب كلّه
  assert.equal(netByInstrument([c('XAUUSD', 'buy', 2400, 2404, 0.1), c('XAUUSD.PRO', 'buy', 2400, 2401, 1)])[0]!.cash, null);
  assert.deepEqual(netByInstrument([]), []);
}
console.log('tradePlan netByInstrument selftest OK');

// —— journalInstrumentKey: مفتاح الأداة لشرائح الفلتر والصافي ——
{
  for (const [raw, key] of [
    ['XAUUSD', 'XAUUSD'],
    ['xauusd.m', 'XAUUSD'],
    ['XAUUSDm', 'XAUUSD'],
    ['GBPJPY-ECN', 'GBPJPY'],
    ['USDJPY#', 'USDJPY'],
    [' eurusd ', 'EURUSD'],
    ['US30', 'US30'], // بلا مواصفات: الرمز كما يُحفظ
    ['nas100', 'NAS100'],
    ['EURUSDT', 'EURUSDT'], // ليس «EURUSD» بلاحقة — رمز آخر لا يُدمج
    // مؤشرات/سلع بلاحقة وسيط: شريحة واحدة مع الاسم المجرد
    ['US30.cash', 'US30'],
    ['US30Cash', 'US30'],
    ['us30-ecn', 'US30'],
    ['NAS100.m', 'NAS100'],
    ['GER40Cash', 'GER40'],
    ['GOLD#', 'GOLD'],
    ['usoil.pro', 'USOIL'],
    ['US30M', 'US30M'], // حرف ملاصق غير Cash: لا تخمين
    ['AAPL.US', 'AAPL.US'], // اسم غير معروف: كما يُحفظ
    ['GER40', 'GER40'], // الأسماء البديلة لا تُدمج
    ['DE40', 'DE40'],
    ['CASH', 'CASH'],
    ['', ''],
    ['   ', ''],
  ] as const) {
    assert.equal(journalInstrumentKey(raw), key, raw);
  }
  assert.equal(journalInstrumentKey(null), '');
  assert.equal(journalInstrumentKey(undefined), '');
}
console.log('tradePlan journalInstrumentKey selftest OK');

// knownLots — 1.00 لوت من «سجّل الخطة» حجمٌ معروف، و1 بلا شاهد يبقى افتراض الخادم
{
  // الحالة التي وجدها الفحص: 10,000 USD، 1%، وقف 10 pip EURUSD = 1.00 لوت بالضبط
  const eu = instrumentSpec('EURUSD')!;
  const r = positionSize({ balance: 10_000, riskPct: 1, slPips: 10, pipValuePerLot: pipValuePerLot(eu, 1), contractSize: eu.contractSize })!;
  assert.equal(r.lots, 1);
  const note = planJournalNote({ lots: r.lots, risk: r.actualRisk, ccy: 'USD', rr: '1:2', spreadPips: 1.2 });
  assert.equal(knownLots(r.lots, note), 1);
  assert.equal(knownLots(1, planJournalNote({ lots: 1, risk: null, ccy: 'USD', rr: '1:2' })), 1);
  // 1 بلا شاهد: مجهول كما كان
  for (const n of [undefined, null, '', 'breakout', '1 lot', '1.0 lot', '0.50 lot · risk 50.00 USD', ' 1.00 lot', '1.00 lots', '1.00 lot!']) {
    assert.equal(knownLots(1, n), null, String(n));
  }
  // غير 1: الحجم كما هو مهما كانت الملاحظة؛ وغير الصالح null
  assert.equal(knownLots(0.5, undefined), 0.5);
  assert.equal(knownLots(2, '1.00 lot · risk'), 2);
  for (const bad of [0, -1, NaN, Infinity, null, undefined]) assert.equal(knownLots(bad as number, '1.00 lot'), null, String(bad));

  // صافي الأداة: 0.5 لوت رابحة + 1.00 من الحاسبة خاسرة — كان المال null للأداة كلّها
  const c = (entry: number, exit: number, size: number, note?: string) =>
    ({ symbol: 'EURUSD', side: 'buy', entry, exit, size, note, status: 'closed' });
  const rows = netByInstrument([c(1.085, 1.087, 0.5), c(1.085, 1.083, 1, note)]);
  assert.equal(rows.length, 1);
  assert.equal(rows[0]!.pips, 0);
  assert.deepEqual(rows[0]!.cash, { amount: -100, ccy: 'USD' }); // +100 − 200
  // و1 بلا ملاحظة الحاسبة يبقى يُسقط المال (المجموع الجزئي أسوأ من غيابه)
  assert.equal(netByInstrument([c(1.085, 1.087, 0.5), c(1.085, 1.083, 1, 'manual')])[0]!.cash, null);
}
console.log('tradePlan knownLots selftest OK');

// averageR — متوسط R من القيم الدقيقة لا المقرَّبة لكل صفقة
{
  const t = (side: string, entry: number, sl: number | null, exit: number | null, status = 'closed') => ({
    side, entry, sl, exit, status,
  });
  // +0.05R و+0.05R و+0.04R على EURUSD (وقف 100 pip): المتوسط 0.0467 ⇒ 0R (المقرَّبة كانت تعطي +0.1R)
  const small = [t('buy', 1.1, 1.09, 1.1005), t('buy', 1.1, 1.09, 1.1005), t('buy', 1.1, 1.09, 1.1004)];
  assert.deepEqual(averageR(small), { r: 0, n: 3 });
  const oldWay = roundR(small.reduce((a, x) => a + realizedR({ side: 'buy', entry: x.entry, sl: x.sl, exit: x.exit })!, 0) / 3);
  assert.equal(oldWay, 0.1); // الخطأ الذي يُصلحه
  // +2R و−1R ⇒ +0.5R؛ بيع يُحسب بجهته
  assert.deepEqual(averageR([t('buy', 1.1, 1.09, 1.12), t('sell', 150, 151, 151)]), { r: 0.5, n: 2 });
  // المفتوحة، وبلا وقف، ووقف بالجهة الخطأ، وبلا خروج: لا تُحسب
  assert.deepEqual(
    averageR([
      t('buy', 1.1, 1.09, 1.12),
      t('buy', 1.1, 1.09, 1.2, 'open'),
      t('buy', 1.1, null, 1.2),
      t('buy', 1.1, 1.11, 1.2),
      t('sell', 1.1, 1.11, null),
    ]),
    { r: 2, n: 1 }
  );
  assert.equal(averageR([]), null);
  assert.equal(averageR([t('buy', 1.1, null, 1.2)]), null);
  // تقريب متماثل: −0.25R ⇒ −0.3R (لا −0.2)
  assert.deepEqual(averageR([t('buy', 1.1, 1.09, 1.0975)]), { r: -0.3, n: 1 });
  // realizedR لم يتغيّر
  assert.equal(realizedR({ side: 'buy', entry: 1.1, sl: 1.09, exit: 1.12 }), 2);
}
console.log('tradePlan averageR selftest OK');
