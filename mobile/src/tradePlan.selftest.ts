/**
 * Self-test for tradePlan (pure).
 * Run: npx --yes tsx src/tradePlan.selftest.ts
 */
import assert from 'node:assert/strict';
import { analyzePlan, formatPips, formatR, formatRR, levelSideIssue, realizedR } from './tradePlan';

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

