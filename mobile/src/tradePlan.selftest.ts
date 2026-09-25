/**
 * Self-test for tradePlan (pure).
 * Run: npx --yes tsx src/tradePlan.selftest.ts
 */
import assert from 'node:assert/strict';
import { parseDecimal } from './parseDecimal';
import {
  analyzePlan,
  computedPriceText,
  openQuotesRefreshDue,
  OPEN_QUOTES_REFRESH_AFTER_MS,
  openRiskTotals,
  openTradesWithoutStop,
  openTradesUnknownRisk,
  entryAfterSideSwitch,
  executionPrice,
  floatingExitPrice,
  liveEntryForStop,
  liveEntryQuote,
  liveEntryOrphaned,
  liveFillStillValid,
  closedElsewhere,
  liveStopChip,
  exitShortcuts,
  exitPreview,
  journalSizeDottedThousands,
  journalMoneyLots,
  parseJournalSize,
  averageR,
  initialStop,
  JOURNAL_NOTE_MAX,
  knownLots as knownLotsForMark,
  noteWithInitialStop,
  plainStopText,
  planStop,
  trailedStopAllowed,
  pnlPctContradictsCash,
  stopTooClose,
  journalStats,
  journalWinRateLine,
  roundHalfEven,
  floatingResult,
  formatPips,
  formatR,
  formatRR,
  journalSymbol,
  quoteSymbol,
  levelSideIssue,
  netByInstrument,
  knownLots,
  recentLotSizes,
  journalContractKind,
  journalSmallLotsStdEquiv,
  journalSizeFromSmall,
  pySum,
  quickJournalSymbols,
  stopsForPips,
  quickStopPips,
  stopAtPips,
  journalInstrumentKey,
  realizedMove,
  realizedR,
  roundR,
  targetAtRR,
  QUICK_RR,
  journalPipSize,
  journalSpec,
  draftRiskFigures,
  journalSizeLooksLikeUnits,
  isCentJournalSymbol,
  isMicroJournalSymbol,
  journalPnl,
  journalRisk,
  formatJournalMoney,
  formatJournalLots,
  planSummaryText,
  priceDistanceText,
  QUICK_SYMBOLS,
  stackedCurrencyExposure,
  draftStackedExposure,
  draftStackedExposureText,
  levelLooksLikePips,
  levelLooksLikePipsText,
} from './tradePlan';
import { riskInQuoteCcy as cashRisk } from './positionSize';
import {
  instrumentSpec,
  moneyRewardRisk,
  pipValuePerLot,
  planJournalNote,
  pnlInQuoteCcy,
  positionSize,
  slPipsFromPrices,
} from './positionSize';

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
assert.equal(formatRR(1.25), '1:1.2');
// فوق 1 نقصّ أيضاً: 1.95 لا تُطبع «1:2.0» لمتداولٍ حدّه الأدنى 1:2 (مثال التدقيق حرفياً)
const rr195 = analyzePlan({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.083, tp: 1.0889 });
assert.ok(Math.abs(rr195.rr! - 1.95) < 1e-9);
assert.equal(formatRR(rr195.rr), '1:1.9');
assert.equal(formatRR(1.99), '1:1.9');
assert.equal(formatRR(2.999), '1:2.9');
assert.equal(formatRR(1), '1:1.0');
// ضجيج الفاصلة العائمة لا يُسقط منزلة: 1.1 و2.3 و1.7 بالضبط تبقى كما هي
assert.equal(formatRR(1.1), '1:1.1');
assert.equal(formatRR(2.3), '1:2.3');
assert.equal(formatRR(1.7), '1:1.7');
assert.equal(formatRR(1.0999999999), '1:1.1');
assert.equal(formatRR(0.9999999999), '1:0.9');
// شرائح R:R السريعة تُطبع النسبة المختارة نفسها بعد القصّ (الهدف يُقرَّب بعيداً عن الدخول)
for (const [sym, side, entry, sl] of [
  ['EURUSD', 'buy', 1.08503, 1.08247],
  ['USDJPY', 'sell', 150.123, 150.377],
  ['XAUUSD', 'buy', 2350.17, 2344.91],
  ['GBPJPY', 'sell', 191.004, 191.337],
] as const) {
  for (const q of [1, 1.5, 2, 3]) {
    const tp = targetAtRR({ symbol: sym, side, entry, sl, rr: q })!;
    const p = analyzePlan({ symbol: sym, side, entry, sl, tp });
    assert.equal(formatRR(p.rr), `1:${q.toFixed(1)}`, `${sym} ${q}`);
  }
}
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
// رمز بلا pip معروف: «قريب جداً» دون 0.002% من الدخول (`minRiskForR`) — BTC 60000 ⇒ 1.2$؛ وقفٌ حقيقي كما كان
assert.equal(analyzePlan({ symbol: 'BTCUSD', side: 'buy', entry: 60000, sl: 59999.99, tp: 61000 }).issue, 'slTooClose');
assert.equal(analyzePlan({ symbol: 'BTCUSD', side: 'buy', entry: 60000, sl: 59999, tp: 61000 }).issue, 'slTooClose');
assert.equal(analyzePlan({ symbol: 'BTCUSD', side: 'buy', entry: 60000, sl: 59998, tp: 61000 }).ok, true);
assert.equal(analyzePlan({ symbol: 'US30', side: 'sell', entry: 44000, sl: 44000.5, tp: 43900 }).issue, 'slTooClose');
assert.equal(analyzePlan({ symbol: 'US30', side: 'sell', entry: 44000, sl: 44020, tp: 43900 }).ok, true);

console.log('tradePlan slTooClose selftest OK');


// نتيجة الصفقة بالـpip ونسبة الحركة (دفتر الصفقات)
assert.deepEqual(realizedMove({ symbol: 'EURUSD', side: 'buy', entry: 1.085, exit: 1.0875 }), { pips: 25, pct: 0.23, dir: 1 });
assert.deepEqual(realizedMove({ symbol: 'USDJPY', side: 'sell', entry: 150, exit: 150.3 }), { pips: -30, pct: -0.2, dir: -1 });
assert.deepEqual(realizedMove({ symbol: 'XAUUSD', side: 'buy', entry: 2350, exit: 2355.5 }), { pips: 55, pct: 0.23, dir: 1 });
assert.equal(realizedMove({ symbol: 'BTCUSD', side: 'buy', entry: 60000, exit: 60600 })?.pips, null);
assert.equal(realizedMove({ symbol: 'EURUSD', side: 'buy', entry: 1.085, exit: null }), null);
// تقريب متماثل حول الصفر: الخسارة لا تُكتب أصغر من الربح المماثل
assert.deepEqual(realizedMove({ symbol: 'XAUUSD', side: 'buy', entry: 2000, exit: 2002.5 }), { pips: 25, pct: 0.12, dir: 1 }); // = الخادم round(0.125, 2)
assert.deepEqual(realizedMove({ symbol: 'XAUUSD', side: 'buy', entry: 2000, exit: 1997.5 }), { pips: -25, pct: -0.12, dir: -1 });
assert.deepEqual(realizedMove({ symbol: 'XAUUSD', side: 'sell', entry: 2000, exit: 2002.5 }), { pips: -25, pct: -0.12, dir: -1 });
// الصفّ = «أفضل/أسوأ صفقة» بالإحصاء لكل صفقة (نفس الحساب ونفس التقريب)
for (let x = 1990; x <= 2010; x += 0.5) {
  const raw = ((x - 2000) / 2000) * 100;
  assert.equal(realizedMove({ symbol: 'XAUUSD', side: 'buy', entry: 2000, exit: x })!.pct, roundHalfEven(raw, 2) || 0, `exit ${x}`);
}
assert.equal(realizedMove({ symbol: 'XAUUSD', side: 'buy', entry: 1920, exit: 1932 })!.pct, 0.62);
assert.ok(!Object.is(realizedMove({ symbol: 'XAUUSD', side: 'sell', entry: 4000, exit: 4000.1 })!.pct, -0));
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
  dir: 1,
  r: 1,
});
// بيع بالين: السوق فوق الدخول ⇒ عائم سالب، والـR سالبة بالنسبة نفسها
assert.deepEqual(floatingResult({ symbol: 'USDJPY', side: 'sell', entry: 150, sl: 150.3, current: 150.15 }), {
  pips: -15,
  pct: -0.1,
  dir: -1,
  r: -0.5,
});
// الذهب: pip = 0.1 (لا 0.0001) — الرقم الذي يفسد أكثر من غيره لو حُسب بحجم pip عام
assert.deepEqual(floatingResult({ symbol: 'XAUUSD', side: 'buy', entry: 2350, sl: 2345, current: 2355.5 }), {
  pips: 55,
  pct: 0.23,
  dir: 1,
  r: 1.1,
});
// صفقة بلا وقف مسجَّل: نقاط ونسبة نعم، R لا (لا مخاطرة معلومة تُقاس بها النتيجة)
assert.deepEqual(floatingResult({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: null, current: 1.0875 }), {
  pips: 25,
  pct: 0.23,
  dir: 1,
  r: null,
});
// وقف بالجهة الخطأ بسجلّ قديم: R تسقط وحدها، والنقاط تبقى صادقة
assert.equal(floatingResult({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.09, current: 1.0875 })?.r, null);
// السوق عند الدخول تماماً: صفر — لا «—» ولا لون ربح/خسارة
assert.deepEqual(floatingResult({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.0825, current: 1.085 }), {
  pips: 0,
  pct: 0,
  dir: 0,
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
// 2.25 بالضبط (وقف 20، هدف 45) يُكتب واحداً بكل الأدوات — كان «1:2.2» على اليورو و«1:2.3» على الذهب؛ مقصوصةً «1:2.2» بكلّها
for (const [sym, e, s, tp] of [
  ['EURUSD', 1.085, 1.083, 1.0895],
  ['GBPUSD', 1.27, 1.268, 1.2745],
  ['USDJPY', 157.4, 157.2, 157.85],
  ['AUDUSD', 0.66, 0.658, 0.6645],
  ['XAUUSD', 2650, 2640, 2672.5],
] as const) {
  const p = analyzePlan({ symbol: sym, side: 'buy', entry: e, sl: s, tp });
  assert.equal(p.rr, 2.25, sym);
  assert.equal(formatRR(p.rr), '1:2.2', sym);
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

  // بالمال حين الأساس = عملة الحساب: USDJPY بحساب دولار، شراء 150.00 وقف 149.00 — «1:2» بالمسافة 152.00 = 1:1.96 مالاً
  {
    const plain = targetAtRR({ symbol: 'USDJPY', side: 'buy', entry: 150, sl: 149, rr: 2 })!;
    assert.equal(plain, 152);
    const pr = analyzePlan({ symbol: 'USDJPY', side: 'buy', entry: 150, sl: 149, tp: plain });
    assert.ok(moneyRewardRisk(pr.rr, 1 / 149, 1 / plain)! < 1.97, 'old chip was 1:1.96 in money');
    const tp = targetAtRR({ symbol: 'USDJPY', side: 'buy', entry: 150, sl: 149, rr: 2, stopQuoteToAccount: 1 / 149 })!;
    // (T − 150) ÷ T = 2 ÷ 149 ⇒ T = 150 × 149 ÷ 147 = 152.0408… ⇒ 152.041 (بعيداً عن الدخول)
    assert.equal(tp, 152.041);
    const lots = 1;
    const loss = (150 - 149) * 100000 * lots * (1 / 149);
    const profit = (tp - 150) * 100000 * lots * (1 / tp);
    assert.ok(profit / loss >= 2 - 1e-12 && profit / loss < 2.001, `money ${profit / loss}`);
    // بيع: (150 − T) ÷ T = 2 × 1 ÷ 151 ⇒ T = 150 × 151 ÷ 153 = 148.0392… ⇒ 148.039
    const sell = targetAtRR({ symbol: 'USDJPY', side: 'sell', entry: 150, sl: 151, rr: 2, stopQuoteToAccount: 1 / 151 })!;
    assert.equal(sell, 148.039);
    // شراءٌ لا يبلغه أي هدف: الخسارة لكل وحدة ≥ الوحدة كلها ÷ rr
    assert.equal(targetAtRR({ symbol: 'USDJPY', side: 'buy', entry: 150, sl: 10, rr: 2, stopQuoteToAccount: 1 / 10 }), null);
    // سعر تحويل غير صالح ⇒ المسافة كما كانت
    assert.equal(targetAtRR({ symbol: 'USDJPY', side: 'buy', entry: 150, sl: 149, rr: 2, stopQuoteToAccount: NaN }), 152);
    // الخاصية: R:R بالمال كما يحسبه سطر اللوحة ≥ المختارة ويُطبع بها
    let m = 0;
    const baseAcct: Array<[string, number, number]> = [
      ['USDJPY', 157.403, 0.01],
      ['USDCHF', 0.8812, 0.0001],
      ['USDCAD', 1.3714, 0.0001],
      ['EURUSD', 1.0852, 0.0001],
      ['GBPJPY', 198.437, 0.01],
    ];
    for (const [symbol, entry, pip] of baseAcct) {
      for (let tenths = 10; tenths <= 1500; tenths += 13) {
        const slPips = tenths / 10;
        for (const side of ['buy', 'sell'] as const) {
          const sl = Number((side === 'buy' ? entry - slPips * pip : entry + slPips * pip).toFixed(6));
          for (const rr of QUICK_RR) {
            const t = targetAtRR({ symbol, side, entry, sl, rr, stopQuoteToAccount: 1 / sl });
            assert.ok(t != null, `${symbol} ${side} ${slPips} ${rr}`);
            const p2 = analyzePlan({ symbol, side, entry, sl, tp: t! });
            assert.equal(p2.ok, true);
            const money = moneyRewardRisk(p2.rr, 1 / sl, 1 / t!)!;
            assert.ok(money >= rr - 1e-9, `${symbol} ${side} sl=${slPips} rr=${rr} money ${money}`);
            assert.equal(formatRR(money), formatRR(rr), `${symbol} ${side} sl=${slPips} rr=${rr} label`);
            m++;
          }
        }
      }
    }
    assert.ok(m > 3000);
  }
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
    ['GOLD#', 'XAUUSD'], // اسم الذهب لدى الوسيط = XAUUSD نفسه (`instrumentSpec`)
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

// ---- exitShortcuts: «الخروج = الوقف/الهدف» بالدفتر ----
{
  // شراء EURUSD: الخروج على الوقف = −1R بالضبط، وعلى الهدف = R:R الخطة
  const sc = exitShortcuts({ side: 'buy', entry: 1.085, sl: 1.0825, tp: 1.09 });
  assert.deepEqual(sc, [{ kind: 'sl', price: 1.0825 }, { kind: 'be', price: 1.085 }, { kind: 'tp', price: 1.09 }]);
  assert.equal(realizedR({ side: 'buy', entry: 1.085, sl: 1.0825, exit: sc[0].price }), -1);
  assert.equal(realizedR({ side: 'buy', entry: 1.085, sl: 1.0825, exit: sc[1].price }), 0);
  assert.equal(realizedR({ side: 'buy', entry: 1.085, sl: 1.0825, exit: sc[2].price }), 2);
  // بيع USDJPY كذلك
  const sj = exitShortcuts({ side: 'sell', entry: 150, sl: 150.3, tp: 149.55 });
  assert.deepEqual(sj.map((x) => x.kind), ['sl', 'be', 'tp']);
  assert.equal(realizedR({ side: 'sell', entry: 150, sl: 150.3, exit: sj[0].price }), -1);
  assert.equal(realizedR({ side: 'sell', entry: 150, sl: 150.3, exit: sj[1].price }), 0);
  assert.equal(realizedR({ side: 'sell', entry: 150, sl: 150.3, exit: sj[2].price }), 1.5);
  // واحد فقط مكتوب
  assert.deepEqual(exitShortcuts({ side: 'buy', entry: 2400, sl: 2390 }), [{ kind: 'sl', price: 2390 }, { kind: 'be', price: 2400 }]);
  // بلا وقف لا «= BE» (التعادل معناه وقفٌ نُقل)
  assert.deepEqual(exitShortcuts({ side: 'buy', entry: 2400, tp: 2420, sl: null }), [{ kind: 'tp', price: 2420 }]);
  // بالجهة الخطأ أو عند الدخول: لا شريحة (الحفظ يرفضها أصلاً)
  assert.deepEqual(exitShortcuts({ side: 'buy', entry: 1.085, sl: 1.09, tp: 1.08 }), []);
  assert.deepEqual(exitShortcuts({ side: 'sell', entry: 1.085, sl: 1.085, tp: 1.085 }), []);
  assert.deepEqual(exitShortcuts({ side: 'sell', entry: 1.085, sl: 1.08, tp: 1.07 }), [{ kind: 'tp', price: 1.07 }]);
  // بلا دخول صالح لا تُعرف الجهة
  assert.deepEqual(exitShortcuts({ side: 'buy', entry: null, sl: 1.08, tp: 1.09 }), []);
  assert.deepEqual(exitShortcuts({ side: 'buy', entry: NaN, sl: 1.08 }), []);
  // وقفٌ نُقل (للصفقة «1R @ …» صالحة ⇒ trailed): على الدخول ⇒ «= BE» وحدها؛ في الربح ⇒ BE ثم SL ثم TP
  assert.deepEqual(exitShortcuts({ side: 'buy', entry: 1.085, sl: 1.085, tp: 1.09, trailed: true }), [
    { kind: 'be', price: 1.085 },
    { kind: 'tp', price: 1.09 },
  ]);
  const trBuy = exitShortcuts({ side: 'buy', entry: 1.085, sl: 1.087, tp: 1.09, trailed: true });
  assert.deepEqual(trBuy, [{ kind: 'be', price: 1.085 }, { kind: 'sl', price: 1.087 }, { kind: 'tp', price: 1.09 }]);
  // الخروج على الوقف الرابح = +1R بالوقف الأصلي 1.083 (لا «−»، ولا مسافة الوقف الحالي)
  assert.equal(realizedR({ side: 'buy', entry: 1.085, sl: 1.087, exit: trBuy[1].price, note: '1R @ 1.083' }), 1);
  const trSell = exitShortcuts({ side: 'sell', entry: 150, sl: 149.8, tp: 149.5, trailed: true });
  assert.deepEqual(trSell.map((x) => x.kind), ['be', 'sl', 'tp']);
  // وقفٌ «رابح» تجاوز الهدف ⇒ لا شريحة وقف (مستوى متناقض)، التعادل والهدف يبقيان
  assert.deepEqual(exitShortcuts({ side: 'buy', entry: 1.085, sl: 1.095, tp: 1.09, trailed: true }).map((x) => x.kind), ['be', 'tp']);
  // وقفٌ صحيح الجهة: trailed لا يغيّر شيئاً
  assert.deepEqual(
    exitShortcuts({ side: 'buy', entry: 1.085, sl: 1.0825, tp: 1.09, trailed: true }).map((x) => x.kind),
    ['sl', 'be', 'tp']
  );
  // بلا علامة وقف أصلي: الوقف على الدخول يبقى بلا شريحة (الحفظ يرفضه)
  assert.deepEqual(exitShortcuts({ side: 'buy', entry: 1.085, sl: 1.087, tp: 1.09 }), [{ kind: 'tp', price: 1.09 }]);
  assert.deepEqual(exitShortcuts({ side: 'buy', entry: 1.085, sl: 0, tp: -1 }), []);
  assert.deepEqual(exitShortcuts({ side: 'buy', entry: 1.085, sl: NaN, tp: Infinity }), []);
}
{
  // «= BE»: 0 pip و0R و0 مال حرفياً، شراءً وبيعاً، على الفوركس والين والذهب
  for (const [symbol, side, entry, sl] of [
    ['EURUSD', 'buy', 1.085, 1.0825],
    ['USDJPY', 'sell', 150, 150.3],
    ['XAUUSD.m', 'buy', 2350.5, 2345],
  ] as const) {
    const be = exitShortcuts({ side, entry, sl }).find((x) => x.kind === 'be')!;
    assert.equal(be.price, entry);
    const p = exitPreview({ symbol, side, entry, sl, exit: be.price, lots: 1 })!;
    assert.equal(p.pips, 0, symbol);
    assert.equal(p.r, 0, symbol);
    assert.equal(p.pct, 0, symbol);
    assert.equal(p.cash!.amount, 0, symbol);
    assert.equal(formatR(p.r), '0R');
  }
  // وقف بالجهة الخطأ ⇒ لا وقف ولا تعادل
  assert.ok(!exitShortcuts({ side: 'sell', entry: 1.085, sl: 1.08, tp: 1.07 }).some((x) => x.kind === 'be'));
}
console.log('tradePlan exitShortcuts selftest OK');

// ---- exitPreview: نتيجة الصفقة بالنموذج قبل الحفظ = ما يعرضه سطرها بعد الحفظ ----
{
  // شراء EURUSD 0.5 لوت، خروج على الوقف: −25 pip، −125.00 USD، −1R
  const a = exitPreview({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.0825, exit: 1.0825, lots: 0.5 })!;
  assert.equal(a.pips, -25);
  assert.equal(a.r, -1);
  assert.deepEqual(a.cash, { amount: -125, ccy: 'USD' });
  assert.equal(a.pct, -0.23);
  // المنزلة المنقلبة (1.0852 بدل 1.0825) تُرى ربحاً صغيراً قبل الحفظ — هذا ما يجب أن يلاحظه
  const flip = exitPreview({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.0825, exit: 1.0852, lots: 0.5 })!;
  assert.equal(flip.pips, 2);
  assert.equal(flip.r, 0.1);
  assert.deepEqual(flip.cash, { amount: 10, ccy: 'USD' });
  // بيع USDJPY بالين، بلا حجم ⇒ بلا مال؛ الذهب بلاحقة وسيط
  const j = exitPreview({ symbol: 'usdjpy', side: 'sell', entry: 150, sl: 150.3, exit: 149.55, lots: null })!;
  assert.equal(j.pips, 45);
  assert.equal(j.r, 1.5);
  assert.equal(j.cash, null);
  const g = exitPreview({ symbol: 'XAUUSD.m', side: 'buy', entry: 2400, sl: 2390, exit: 2420, lots: 0.1 })!;
  assert.equal(g.pips, 200);
  assert.equal(g.r, 2);
  assert.deepEqual(g.cash, { amount: 200, ccy: 'USD' });
  // بلا وقف ⇒ بلا R؛ رمز بلا مواصفات ⇒ بلا نقاط ولا مال، والنسبة تبقى
  const n = exitPreview({ symbol: 'US30', side: 'buy', entry: 40000, exit: 40400, lots: 1 })!;
  assert.equal(n.pips, null);
  assert.equal(n.r, null);
  assert.equal(n.cash, null);
  assert.equal(n.pct, 1);
  // بلا دخول أو خروج صالح
  assert.equal(exitPreview({ symbol: 'EURUSD', side: 'buy', entry: null, exit: 1.09 }), null);
  assert.equal(exitPreview({ symbol: 'EURUSD', side: 'buy', entry: 1.085, exit: null }), null);
  assert.equal(exitPreview({ symbol: 'EURUSD', side: 'buy', entry: 1.085, exit: 0, lots: 1 }), null);
  assert.equal(exitPreview({ symbol: 'EURUSD', side: 'buy', entry: 1.085, exit: 1.09, lots: 0 })!.cash, null);
  // مطابقة حرفية لسطر الصفقة المحفوظة (realizedMove + realizedR + pnlInQuoteCcy) على شبكة
  for (const side of ['buy', 'sell'] as const) {
    for (const exit of [1.0801, 1.0825, 1.08499, 1.085, 1.08501, 1.0875, 1.0912]) {
      for (const lots of [0.01, 0.37, 2]) {
        const p = exitPreview({ symbol: 'EURUSD', side, entry: 1.085, sl: side === 'buy' ? 1.0825 : 1.0875, exit, lots })!;
        const mv = realizedMove({ symbol: 'EURUSD', side, entry: 1.085, exit })!;
        assert.equal(p.pips, mv.pips);
        assert.equal(p.pct, mv.pct);
        assert.equal(p.r, realizedR({ side, entry: 1.085, sl: side === 'buy' ? 1.0825 : 1.0875, exit }));
        assert.deepEqual(p.cash, pnlInQuoteCcy({ symbol: 'EURUSD', side, entry: 1.085, exit, lots }));
      }
    }
  }
}
console.log('tradePlan exitPreview selftest OK');

// —— journalSymbol: مؤشرات/سلع بلاحقة وسيط («GOLD#»، «US30-ecn») تُقبل ولا تفقد سعر السوق
{
  const cases: [string, string, string][] = [
    // [كما كُتب, كما يُحفظ, رمز السعر]
    ['GOLD#', 'GOLD#', 'XAUUSD'], // المزوّد لا يعرف «GOLD»
    ['us30#', 'US30#', 'US30'],
    ['us30-ecn', 'US30-ECN', 'US30'],
    ['US30_pro', 'US30_PRO', 'US30'],
    ['usoil.m', 'USOIL.M', 'USOIL'],
    ['US30.cash', 'US30.CASH', 'US30'],
    ['nas100+', 'NAS100+', 'NAS100'],
  ];
  for (const [raw, stored, quote] of cases) {
    assert.equal(journalSymbol(raw), stored, raw);
    assert.equal(quoteSymbol(journalSymbol(raw)!), quote, `quote ${raw}`);
    // مفتاح الأداة واحد مع الاسم المجرد: لا شريحة ثانية بالفلتر
    assert.equal(journalInstrumentKey(stored), journalInstrumentKey(quote), `key ${raw}`);
    // الحفظ ثابت: الرمز المحفوظ يُعاد كما هو
    assert.equal(journalSymbol(stored), stored, `idempotent ${raw}`);
  }
  // بلا تغيير: الشرطة داخل الاسم فاصل، الاسم المجهول بـ«#» مرفوض، الملاصق يبقى كما كان، الفوركس كما كان
  assert.equal(journalSymbol('US-30'), 'US30');
  assert.equal(journalSymbol('AAPL#'), null);
  assert.equal(journalSymbol('US30Cash'), 'US30CASH');
  assert.equal(journalSymbol('US30'), 'US30');
  assert.equal(journalSymbol('USDJPY#'), 'USDJPY#');
  assert.equal(journalSymbol('gbp/jpy-ecn'), 'GBPJPY-ECN');
  // الحدّ 12 (الخادم): كل ما يُقبل ≤ 12 و≥ 3
  for (const raw of ['USOIL.ABCDE', 'NAS100.ABCDE', 'GOLD#', 'US30-ECN'])
    { const v = journalSymbol(raw); if (v != null) assert.ok(v.length >= 3 && v.length <= 12, raw); }
}
console.log('tradePlan journalSymbol index-suffix selftest OK');

// ---- roundHalfEven + journalStats: إحصاءات الدفتر المفلتر = معادلة الخادم وتقريب بايثون حرفياً ----
{
  // حالات يُخطئ فيها Math.round: النصف التامّ إلى الزوجي، و«19.925» الثنائية فوق النصف
  assert.equal(roundHalfEven(6.25, 1), 6.2);
  assert.equal(roundHalfEven(6.75, 1), 6.8);
  assert.equal(roundHalfEven(-6.25, 1), -6.2);
  assert.equal(roundHalfEven(0.125, 2), 0.12);
  assert.equal(roundHalfEven(0.375, 2), 0.38);
  assert.equal(roundHalfEven(19.925, 2), 19.93);
  assert.equal(roundHalfEven(2.675, 2), 2.67);
  // جدول مولَّد من `round` ببايثون 3 (القيمة، خانة، خانتان) والسيناريوهات من معادلة `db.trade_stats` —
  // المصدر الذي يحسب به الخادم. الصفر بإشارته (−0) يُقبل صفراً: يُطبع «0» بالحالتين.
  const same = (a: number, b: number) => a === b;
  const py = {"table": [[-2.0, -2.0, -2.0], [-1.995, -2.0, -2.0], [-1.99, -2.0, -1.99], [-1.985, -2.0, -1.99], [-1.98, -2.0, -1.98], [-1.975, -2.0, -1.98], [-1.97, -2.0, -1.97], [-1.965, -2.0, -1.97], [-1.96, -2.0, -1.96], [-1.955, -2.0, -1.96], [-1.95, -1.9, -1.95], [-1.945, -1.9, -1.95], [-1.94, -1.9, -1.94], [-1.935, -1.9, -1.94], [-1.93, -1.9, -1.93], [-1.925, -1.9, -1.93], [-1.92, -1.9, -1.92], [-1.915, -1.9, -1.92], [-1.9100000000000001, -1.9, -1.91], [-1.905, -1.9, -1.91], [-1.9000000000000001, -1.9, -1.9], [-1.895, -1.9, -1.9], [-1.8900000000000001, -1.9, -1.89], [-1.885, -1.9, -1.89], [-1.8800000000000001, -1.9, -1.88], [-1.875, -1.9, -1.88], [-1.87, -1.9, -1.87], [-1.865, -1.9, -1.86], [-1.86, -1.9, -1.86], [-1.855, -1.9, -1.85], [-1.85, -1.9, -1.85], [-1.845, -1.8, -1.84], [-1.84, -1.8, -1.84], [-1.835, -1.8, -1.83], [-1.83, -1.8, -1.83], [-1.825, -1.8, -1.82], [-1.82, -1.8, -1.82], [-1.815, -1.8, -1.81], [-1.81, -1.8, -1.81], [-1.805, -1.8, -1.8], [-1.8, -1.8, -1.8], [-1.795, -1.8, -1.79], [-1.79, -1.8, -1.79], [-1.7850000000000001, -1.8, -1.79], [-1.78, -1.8, -1.78], [-1.7750000000000001, -1.8, -1.78], [-1.77, -1.8, -1.77], [-1.7650000000000001, -1.8, -1.77], [-1.76, -1.8, -1.76], [-1.7550000000000001, -1.8, -1.76], [-1.75, -1.8, -1.75], [-1.745, -1.7, -1.75], [-1.74, -1.7, -1.74], [-1.735, -1.7, -1.74], [-1.73, -1.7, -1.73], [-1.725, -1.7, -1.73], [-1.72, -1.7, -1.72], [-1.715, -1.7, -1.72], [-1.71, -1.7, -1.71], [-1.705, -1.7, -1.71], [-1.7, -1.7, -1.7], [-1.695, -1.7, -1.7], [-1.69, -1.7, -1.69], [-1.685, -1.7, -1.69], [-1.68, -1.7, -1.68], [-1.675, -1.7, -1.68], [-1.67, -1.7, -1.67], [-1.665, -1.7, -1.67], [-1.6600000000000001, -1.7, -1.66], [-1.655, -1.7, -1.66], [-1.6500000000000001, -1.7, -1.65], [-1.645, -1.6, -1.65], [-1.6400000000000001, -1.6, -1.64], [-1.635, -1.6, -1.64], [-1.6300000000000001, -1.6, -1.63], [-1.625, -1.6, -1.62], [-1.62, -1.6, -1.62], [-1.615, -1.6, -1.61], [-1.61, -1.6, -1.61], [-1.605, -1.6, -1.6], [-1.6, -1.6, -1.6], [-1.595, -1.6, -1.59], [-1.59, -1.6, -1.59], [-1.585, -1.6, -1.58], [-1.58, -1.6, -1.58], [-1.575, -1.6, -1.57], [-1.57, -1.6, -1.57], [-1.565, -1.6, -1.56], [-1.56, -1.6, -1.56], [-1.555, -1.6, -1.55], [-1.55, -1.6, -1.55], [-1.545, -1.5, -1.54], [-1.54, -1.5, -1.54], [-1.5350000000000001, -1.5, -1.54], [-1.53, -1.5, -1.53], [-1.5250000000000001, -1.5, -1.53], [-1.52, -1.5, -1.52], [-1.5150000000000001, -1.5, -1.52], [-1.51, -1.5, -1.51], [-1.5050000000000001, -1.5, -1.51], [-1.5, -1.5, -1.5], [-1.495, -1.5, -1.5], [-1.49, -1.5, -1.49], [-1.485, -1.5, -1.49], [-1.48, -1.5, -1.48], [-1.475, -1.5, -1.48], [-1.47, -1.5, -1.47], [-1.465, -1.5, -1.47], [-1.46, -1.5, -1.46], [-1.455, -1.5, -1.46], [-1.45, -1.4, -1.45], [-1.445, -1.4, -1.45], [-1.44, -1.4, -1.44], [-1.435, -1.4, -1.44], [-1.43, -1.4, -1.43], [-1.425, -1.4, -1.43], [-1.42, -1.4, -1.42], [-1.415, -1.4, -1.42], [-1.41, -1.4, -1.41], [-1.405, -1.4, -1.41], [-1.4000000000000001, -1.4, -1.4], [-1.395, -1.4, -1.4], [-1.3900000000000001, -1.4, -1.39], [-1.385, -1.4, -1.39], [-1.3800000000000001, -1.4, -1.38], [-1.375, -1.4, -1.38], [-1.37, -1.4, -1.37], [-1.365, -1.4, -1.36], [-1.36, -1.4, -1.36], [-1.355, -1.4, -1.35], [-1.35, -1.4, -1.35], [-1.345, -1.3, -1.34], [-1.34, -1.3, -1.34], [-1.335, -1.3, -1.33], [-1.33, -1.3, -1.33], [-1.325, -1.3, -1.32], [-1.32, -1.3, -1.32], [-1.315, -1.3, -1.31], [-1.31, -1.3, -1.31], [-1.305, -1.3, -1.3], [-1.3, -1.3, -1.3], [-1.295, -1.3, -1.29], [-1.29, -1.3, -1.29], [-1.285, -1.3, -1.28], [-1.28, -1.3, -1.28], [-1.2750000000000001, -1.3, -1.28], [-1.27, -1.3, -1.27], [-1.2650000000000001, -1.3, -1.27], [-1.26, -1.3, -1.26], [-1.2550000000000001, -1.3, -1.26], [-1.25, -1.2, -1.25], [-1.245, -1.2, -1.25], [-1.24, -1.2, -1.24], [-1.235, -1.2, -1.24], [-1.23, -1.2, -1.23], [-1.225, -1.2, -1.23], [-1.22, -1.2, -1.22], [-1.215, -1.2, -1.22], [-1.21, -1.2, -1.21], [-1.205, -1.2, -1.21], [-1.2, -1.2, -1.2], [-1.195, -1.2, -1.2], [-1.19, -1.2, -1.19], [-1.185, -1.2, -1.19], [-1.18, -1.2, -1.18], [-1.175, -1.2, -1.18], [-1.17, -1.2, -1.17], [-1.165, -1.2, -1.17], [-1.16, -1.2, -1.16], [-1.155, -1.2, -1.16], [-1.1500000000000001, -1.2, -1.15], [-1.145, -1.1, -1.15], [-1.1400000000000001, -1.1, -1.14], [-1.135, -1.1, -1.14], [-1.1300000000000001, -1.1, -1.13], [-1.125, -1.1, -1.12], [-1.12, -1.1, -1.12], [-1.115, -1.1, -1.11], [-1.11, -1.1, -1.11], [-1.105, -1.1, -1.1], [-1.1, -1.1, -1.1], [-1.095, -1.1, -1.09], [-1.09, -1.1, -1.09], [-1.085, -1.1, -1.08], [-1.08, -1.1, -1.08], [-1.075, -1.1, -1.07], [-1.07, -1.1, -1.07], [-1.065, -1.1, -1.06], [-1.06, -1.1, -1.06], [-1.055, -1.1, -1.05], [-1.05, -1.1, -1.05], [-1.045, -1.0, -1.04], [-1.04, -1.0, -1.04], [-1.035, -1.0, -1.03], [-1.03, -1.0, -1.03], [-1.025, -1.0, -1.02], [-1.02, -1.0, -1.02], [-1.0150000000000001, -1.0, -1.02], [-1.01, -1.0, -1.01], [-1.0050000000000001, -1.0, -1.01], [-1.0, -1.0, -1.0], [-0.995, -1.0, -0.99], [-0.99, -1.0, -0.99], [-0.985, -1.0, -0.98], [-0.98, -1.0, -0.98], [-0.975, -1.0, -0.97], [-0.97, -1.0, -0.97], [-0.965, -1.0, -0.96], [-0.96, -1.0, -0.96], [-0.9550000000000001, -1.0, -0.96], [-0.9500000000000001, -1.0, -0.95], [-0.9450000000000001, -0.9, -0.95], [-0.9400000000000001, -0.9, -0.94], [-0.935, -0.9, -0.94], [-0.93, -0.9, -0.93], [-0.925, -0.9, -0.93], [-0.92, -0.9, -0.92], [-0.915, -0.9, -0.92], [-0.91, -0.9, -0.91], [-0.905, -0.9, -0.91], [-0.9, -0.9, -0.9], [-0.895, -0.9, -0.9], [-0.89, -0.9, -0.89], [-0.885, -0.9, -0.89], [-0.88, -0.9, -0.88], [-0.875, -0.9, -0.88], [-0.87, -0.9, -0.87], [-0.865, -0.9, -0.86], [-0.86, -0.9, -0.86], [-0.855, -0.9, -0.85], [-0.85, -0.8, -0.85], [-0.845, -0.8, -0.84], [-0.84, -0.8, -0.84], [-0.835, -0.8, -0.83], [-0.8300000000000001, -0.8, -0.83], [-0.8250000000000001, -0.8, -0.83], [-0.8200000000000001, -0.8, -0.82], [-0.8150000000000001, -0.8, -0.82], [-0.81, -0.8, -0.81], [-0.805, -0.8, -0.81], [-0.8, -0.8, -0.8], [-0.795, -0.8, -0.8], [-0.79, -0.8, -0.79], [-0.785, -0.8, -0.79], [-0.78, -0.8, -0.78], [-0.775, -0.8, -0.78], [-0.77, -0.8, -0.77], [-0.765, -0.8, -0.77], [-0.76, -0.8, -0.76], [-0.755, -0.8, -0.76], [-0.75, -0.8, -0.75], [-0.745, -0.7, -0.74], [-0.74, -0.7, -0.74], [-0.735, -0.7, -0.73], [-0.73, -0.7, -0.73], [-0.725, -0.7, -0.72], [-0.72, -0.7, -0.72], [-0.715, -0.7, -0.71], [-0.71, -0.7, -0.71], [-0.705, -0.7, -0.7], [-0.7000000000000001, -0.7, -0.7], [-0.6950000000000001, -0.7, -0.7], [-0.6900000000000001, -0.7, -0.69], [-0.685, -0.7, -0.69], [-0.68, -0.7, -0.68], [-0.675, -0.7, -0.68], [-0.67, -0.7, -0.67], [-0.665, -0.7, -0.67], [-0.66, -0.7, -0.66], [-0.655, -0.7, -0.66], [-0.65, -0.7, -0.65], [-0.645, -0.6, -0.65], [-0.64, -0.6, -0.64], [-0.635, -0.6, -0.64], [-0.63, -0.6, -0.63], [-0.625, -0.6, -0.62], [-0.62, -0.6, -0.62], [-0.615, -0.6, -0.61], [-0.61, -0.6, -0.61], [-0.605, -0.6, -0.6], [-0.6, -0.6, -0.6], [-0.595, -0.6, -0.59], [-0.59, -0.6, -0.59], [-0.585, -0.6, -0.58], [-0.58, -0.6, -0.58], [-0.5750000000000001, -0.6, -0.58], [-0.5700000000000001, -0.6, -0.57], [-0.5650000000000001, -0.6, -0.57], [-0.56, -0.6, -0.56], [-0.555, -0.6, -0.56], [-0.55, -0.6, -0.55], [-0.545, -0.5, -0.55], [-0.54, -0.5, -0.54], [-0.535, -0.5, -0.54], [-0.53, -0.5, -0.53], [-0.525, -0.5, -0.53], [-0.52, -0.5, -0.52], [-0.515, -0.5, -0.52], [-0.51, -0.5, -0.51], [-0.505, -0.5, -0.51], [-0.5, -0.5, -0.5], [-0.495, -0.5, -0.49], [-0.49, -0.5, -0.49], [-0.485, -0.5, -0.48], [-0.48, -0.5, -0.48], [-0.47500000000000003, -0.5, -0.48], [-0.47000000000000003, -0.5, -0.47], [-0.465, -0.5, -0.47], [-0.46, -0.5, -0.46], [-0.455, -0.5, -0.46], [-0.45, -0.5, -0.45], [-0.445, -0.4, -0.45], [-0.44, -0.4, -0.44], [-0.435, -0.4, -0.43], [-0.43, -0.4, -0.43], [-0.425, -0.4, -0.42], [-0.42, -0.4, -0.42], [-0.41500000000000004, -0.4, -0.42], [-0.41000000000000003, -0.4, -0.41], [-0.405, -0.4, -0.41], [-0.4, -0.4, -0.4], [-0.395, -0.4, -0.4], [-0.39, -0.4, -0.39], [-0.385, -0.4, -0.39], [-0.38, -0.4, -0.38], [-0.375, -0.4, -0.38], [-0.37, -0.4, -0.37], [-0.365, -0.4, -0.36], [-0.36, -0.4, -0.36], [-0.355, -0.4, -0.35], [-0.35000000000000003, -0.4, -0.35], [-0.34500000000000003, -0.3, -0.35], [-0.34, -0.3, -0.34], [-0.335, -0.3, -0.34], [-0.33, -0.3, -0.33], [-0.325, -0.3, -0.33], [-0.32, -0.3, -0.32], [-0.315, -0.3, -0.32], [-0.31, -0.3, -0.31], [-0.305, -0.3, -0.3], [-0.3, -0.3, -0.3], [-0.295, -0.3, -0.29], [-0.29, -0.3, -0.29], [-0.28500000000000003, -0.3, -0.29], [-0.28, -0.3, -0.28], [-0.275, -0.3, -0.28], [-0.27, -0.3, -0.27], [-0.265, -0.3, -0.27], [-0.26, -0.3, -0.26], [-0.255, -0.3, -0.26], [-0.25, -0.2, -0.25], [-0.245, -0.2, -0.24], [-0.24, -0.2, -0.24], [-0.23500000000000001, -0.2, -0.24], [-0.23, -0.2, -0.23], [-0.225, -0.2, -0.23], [-0.22, -0.2, -0.22], [-0.215, -0.2, -0.21], [-0.21, -0.2, -0.21], [-0.20500000000000002, -0.2, -0.21], [-0.2, -0.2, -0.2], [-0.195, -0.2, -0.2], [-0.19, -0.2, -0.19], [-0.185, -0.2, -0.18], [-0.18, -0.2, -0.18], [-0.17500000000000002, -0.2, -0.18], [-0.17, -0.2, -0.17], [-0.165, -0.2, -0.17], [-0.16, -0.2, -0.16], [-0.155, -0.2, -0.15], [-0.15, -0.1, -0.15], [-0.145, -0.1, -0.14], [-0.14, -0.1, -0.14], [-0.135, -0.1, -0.14], [-0.13, -0.1, -0.13], [-0.125, -0.1, -0.12], [-0.12, -0.1, -0.12], [-0.115, -0.1, -0.12], [-0.11, -0.1, -0.11], [-0.105, -0.1, -0.1], [-0.1, -0.1, -0.1], [-0.095, -0.1, -0.1], [-0.09, -0.1, -0.09], [-0.085, -0.1, -0.09], [-0.08, -0.1, -0.08], [-0.075, -0.1, -0.07], [-0.07, -0.1, -0.07], [-0.065, -0.1, -0.07], [-0.06, -0.1, -0.06], [-0.055, -0.1, -0.06], [-0.05, -0.1, -0.05], [-0.045, -0.0, -0.04], [-0.04, -0.0, -0.04], [-0.035, -0.0, -0.04], [-0.03, -0.0, -0.03], [-0.025, -0.0, -0.03], [-0.02, -0.0, -0.02], [-0.015, -0.0, -0.01], [-0.01, -0.0, -0.01], [-0.005, -0.0, -0.01], [0.0, 0.0, 0.0], [0.005, 0.0, 0.01], [0.01, 0.0, 0.01], [0.015, 0.0, 0.01], [0.02, 0.0, 0.02], [0.025, 0.0, 0.03], [0.03, 0.0, 0.03], [0.035, 0.0, 0.04], [0.04, 0.0, 0.04], [0.045, 0.0, 0.04], [0.05, 0.1, 0.05], [0.055, 0.1, 0.06], [0.06, 0.1, 0.06], [0.065, 0.1, 0.07], [0.07, 0.1, 0.07], [0.075, 0.1, 0.07], [0.08, 0.1, 0.08], [0.085, 0.1, 0.09], [0.09, 0.1, 0.09], [0.095, 0.1, 0.1], [0.1, 0.1, 0.1], [0.105, 0.1, 0.1], [0.11, 0.1, 0.11], [0.115, 0.1, 0.12], [0.12, 0.1, 0.12], [0.125, 0.1, 0.12], [0.13, 0.1, 0.13], [0.135, 0.1, 0.14], [0.14, 0.1, 0.14], [0.145, 0.1, 0.14], [0.15, 0.1, 0.15], [0.155, 0.2, 0.15], [0.16, 0.2, 0.16], [0.165, 0.2, 0.17], [0.17, 0.2, 0.17], [0.17500000000000002, 0.2, 0.18], [0.18, 0.2, 0.18], [0.185, 0.2, 0.18], [0.19, 0.2, 0.19], [0.195, 0.2, 0.2], [0.2, 0.2, 0.2], [0.20500000000000002, 0.2, 0.21], [0.21, 0.2, 0.21], [0.215, 0.2, 0.21], [0.22, 0.2, 0.22], [0.225, 0.2, 0.23], [0.23, 0.2, 0.23], [0.23500000000000001, 0.2, 0.24], [0.24, 0.2, 0.24], [0.245, 0.2, 0.24], [0.25, 0.2, 0.25], [0.255, 0.3, 0.26], [0.26, 0.3, 0.26], [0.265, 0.3, 0.27], [0.27, 0.3, 0.27], [0.275, 0.3, 0.28], [0.28, 0.3, 0.28], [0.28500000000000003, 0.3, 0.29], [0.29, 0.3, 0.29], [0.295, 0.3, 0.29], [0.3, 0.3, 0.3], [0.305, 0.3, 0.3], [0.31, 0.3, 0.31], [0.315, 0.3, 0.32], [0.32, 0.3, 0.32], [0.325, 0.3, 0.33], [0.33, 0.3, 0.33], [0.335, 0.3, 0.34], [0.34, 0.3, 0.34], [0.34500000000000003, 0.3, 0.35], [0.35000000000000003, 0.4, 0.35], [0.355, 0.4, 0.35], [0.36, 0.4, 0.36], [0.365, 0.4, 0.36], [0.37, 0.4, 0.37], [0.375, 0.4, 0.38], [0.38, 0.4, 0.38], [0.385, 0.4, 0.39], [0.39, 0.4, 0.39], [0.395, 0.4, 0.4], [0.4, 0.4, 0.4], [0.405, 0.4, 0.41], [0.41000000000000003, 0.4, 0.41], [0.41500000000000004, 0.4, 0.42], [0.42, 0.4, 0.42], [0.425, 0.4, 0.42], [0.43, 0.4, 0.43], [0.435, 0.4, 0.43], [0.44, 0.4, 0.44], [0.445, 0.4, 0.45], [0.45, 0.5, 0.45], [0.455, 0.5, 0.46], [0.46, 0.5, 0.46], [0.465, 0.5, 0.47], [0.47000000000000003, 0.5, 0.47], [0.47500000000000003, 0.5, 0.48], [0.48, 0.5, 0.48], [0.485, 0.5, 0.48], [0.49, 0.5, 0.49], [0.495, 0.5, 0.49], [0.5, 0.5, 0.5], [0.505, 0.5, 0.51], [0.51, 0.5, 0.51], [0.515, 0.5, 0.52], [0.52, 0.5, 0.52], [0.525, 0.5, 0.53], [0.53, 0.5, 0.53], [0.535, 0.5, 0.54], [0.54, 0.5, 0.54], [0.545, 0.5, 0.55], [0.55, 0.6, 0.55], [0.555, 0.6, 0.56], [0.56, 0.6, 0.56], [0.5650000000000001, 0.6, 0.57], [0.5700000000000001, 0.6, 0.57], [0.5750000000000001, 0.6, 0.58], [0.58, 0.6, 0.58], [0.585, 0.6, 0.58], [0.59, 0.6, 0.59], [0.595, 0.6, 0.59], [0.6, 0.6, 0.6], [0.605, 0.6, 0.6], [0.61, 0.6, 0.61], [0.615, 0.6, 0.61], [0.62, 0.6, 0.62], [0.625, 0.6, 0.62], [0.63, 0.6, 0.63], [0.635, 0.6, 0.64], [0.64, 0.6, 0.64], [0.645, 0.6, 0.65], [0.65, 0.7, 0.65], [0.655, 0.7, 0.66], [0.66, 0.7, 0.66], [0.665, 0.7, 0.67], [0.67, 0.7, 0.67], [0.675, 0.7, 0.68], [0.68, 0.7, 0.68], [0.685, 0.7, 0.69], [0.6900000000000001, 0.7, 0.69], [0.6950000000000001, 0.7, 0.7], [0.7000000000000001, 0.7, 0.7], [0.705, 0.7, 0.7], [0.71, 0.7, 0.71], [0.715, 0.7, 0.71], [0.72, 0.7, 0.72], [0.725, 0.7, 0.72], [0.73, 0.7, 0.73], [0.735, 0.7, 0.73], [0.74, 0.7, 0.74], [0.745, 0.7, 0.74], [0.75, 0.8, 0.75], [0.755, 0.8, 0.76], [0.76, 0.8, 0.76], [0.765, 0.8, 0.77], [0.77, 0.8, 0.77], [0.775, 0.8, 0.78], [0.78, 0.8, 0.78], [0.785, 0.8, 0.79], [0.79, 0.8, 0.79], [0.795, 0.8, 0.8], [0.8, 0.8, 0.8], [0.805, 0.8, 0.81], [0.81, 0.8, 0.81], [0.8150000000000001, 0.8, 0.82], [0.8200000000000001, 0.8, 0.82], [0.8250000000000001, 0.8, 0.83], [0.8300000000000001, 0.8, 0.83], [0.835, 0.8, 0.83], [0.84, 0.8, 0.84], [0.845, 0.8, 0.84], [0.85, 0.8, 0.85], [0.855, 0.9, 0.85], [0.86, 0.9, 0.86], [0.865, 0.9, 0.86], [0.87, 0.9, 0.87], [0.875, 0.9, 0.88], [0.88, 0.9, 0.88], [0.885, 0.9, 0.89], [0.89, 0.9, 0.89], [0.895, 0.9, 0.9], [0.9, 0.9, 0.9], [0.905, 0.9, 0.91], [0.91, 0.9, 0.91], [0.915, 0.9, 0.92], [0.92, 0.9, 0.92], [0.925, 0.9, 0.93], [0.93, 0.9, 0.93], [0.935, 0.9, 0.94], [0.9400000000000001, 0.9, 0.94], [0.9450000000000001, 0.9, 0.95], [0.9500000000000001, 1.0, 0.95], [0.9550000000000001, 1.0, 0.96], [0.96, 1.0, 0.96], [0.965, 1.0, 0.96], [0.97, 1.0, 0.97], [0.975, 1.0, 0.97], [0.98, 1.0, 0.98], [0.985, 1.0, 0.98], [0.99, 1.0, 0.99], [0.995, 1.0, 0.99], [1.0, 1.0, 1.0], [1.0050000000000001, 1.0, 1.01], [1.01, 1.0, 1.01], [1.0150000000000001, 1.0, 1.02], [1.02, 1.0, 1.02], [1.025, 1.0, 1.02], [1.03, 1.0, 1.03], [1.035, 1.0, 1.03], [1.04, 1.0, 1.04], [1.045, 1.0, 1.04], [1.05, 1.1, 1.05], [1.055, 1.1, 1.05], [1.06, 1.1, 1.06], [1.065, 1.1, 1.06], [1.07, 1.1, 1.07], [1.075, 1.1, 1.07], [1.08, 1.1, 1.08], [1.085, 1.1, 1.08], [1.09, 1.1, 1.09], [1.095, 1.1, 1.09], [1.1, 1.1, 1.1], [1.105, 1.1, 1.1], [1.11, 1.1, 1.11], [1.115, 1.1, 1.11], [1.12, 1.1, 1.12], [1.125, 1.1, 1.12], [1.1300000000000001, 1.1, 1.13], [1.135, 1.1, 1.14], [1.1400000000000001, 1.1, 1.14], [1.145, 1.1, 1.15], [1.1500000000000001, 1.2, 1.15], [1.155, 1.2, 1.16], [1.16, 1.2, 1.16], [1.165, 1.2, 1.17], [1.17, 1.2, 1.17], [1.175, 1.2, 1.18], [1.18, 1.2, 1.18], [1.185, 1.2, 1.19], [1.19, 1.2, 1.19], [1.195, 1.2, 1.2], [1.2, 1.2, 1.2], [1.205, 1.2, 1.21], [1.21, 1.2, 1.21], [1.215, 1.2, 1.22], [1.22, 1.2, 1.22], [1.225, 1.2, 1.23], [1.23, 1.2, 1.23], [1.235, 1.2, 1.24], [1.24, 1.2, 1.24], [1.245, 1.2, 1.25], [1.25, 1.2, 1.25], [1.2550000000000001, 1.3, 1.26], [1.26, 1.3, 1.26], [1.2650000000000001, 1.3, 1.27], [1.27, 1.3, 1.27], [1.2750000000000001, 1.3, 1.28], [1.28, 1.3, 1.28], [1.285, 1.3, 1.28], [1.29, 1.3, 1.29], [1.295, 1.3, 1.29], [1.3, 1.3, 1.3], [1.305, 1.3, 1.3], [1.31, 1.3, 1.31], [1.315, 1.3, 1.31], [1.32, 1.3, 1.32], [1.325, 1.3, 1.32], [1.33, 1.3, 1.33], [1.335, 1.3, 1.33], [1.34, 1.3, 1.34], [1.345, 1.3, 1.34], [1.35, 1.4, 1.35], [1.355, 1.4, 1.35], [1.36, 1.4, 1.36], [1.365, 1.4, 1.36], [1.37, 1.4, 1.37], [1.375, 1.4, 1.38], [1.3800000000000001, 1.4, 1.38], [1.385, 1.4, 1.39], [1.3900000000000001, 1.4, 1.39], [1.395, 1.4, 1.4], [1.4000000000000001, 1.4, 1.4], [1.405, 1.4, 1.41], [1.41, 1.4, 1.41], [1.415, 1.4, 1.42], [1.42, 1.4, 1.42], [1.425, 1.4, 1.43], [1.43, 1.4, 1.43], [1.435, 1.4, 1.44], [1.44, 1.4, 1.44], [1.445, 1.4, 1.45], [1.45, 1.4, 1.45], [1.455, 1.5, 1.46], [1.46, 1.5, 1.46], [1.465, 1.5, 1.47], [1.47, 1.5, 1.47], [1.475, 1.5, 1.48], [1.48, 1.5, 1.48], [1.485, 1.5, 1.49], [1.49, 1.5, 1.49], [1.495, 1.5, 1.5], [1.5, 1.5, 1.5], [1.5050000000000001, 1.5, 1.51], [1.51, 1.5, 1.51], [1.5150000000000001, 1.5, 1.52], [1.52, 1.5, 1.52], [1.5250000000000001, 1.5, 1.53], [1.53, 1.5, 1.53], [1.5350000000000001, 1.5, 1.54], [1.54, 1.5, 1.54], [1.545, 1.5, 1.54], [1.55, 1.6, 1.55], [1.555, 1.6, 1.55], [1.56, 1.6, 1.56], [1.565, 1.6, 1.56], [1.57, 1.6, 1.57], [1.575, 1.6, 1.57], [1.58, 1.6, 1.58], [1.585, 1.6, 1.58], [1.59, 1.6, 1.59], [1.595, 1.6, 1.59], [1.6, 1.6, 1.6], [1.605, 1.6, 1.6], [1.61, 1.6, 1.61], [1.615, 1.6, 1.61], [1.62, 1.6, 1.62], [1.625, 1.6, 1.62], [1.6300000000000001, 1.6, 1.63], [1.635, 1.6, 1.64], [1.6400000000000001, 1.6, 1.64], [1.645, 1.6, 1.65], [1.6500000000000001, 1.7, 1.65], [1.655, 1.7, 1.66], [1.6600000000000001, 1.7, 1.66], [1.665, 1.7, 1.67], [1.67, 1.7, 1.67], [1.675, 1.7, 1.68], [1.68, 1.7, 1.68], [1.685, 1.7, 1.69], [1.69, 1.7, 1.69], [1.695, 1.7, 1.7], [1.7, 1.7, 1.7], [1.705, 1.7, 1.71], [1.71, 1.7, 1.71], [1.715, 1.7, 1.72], [1.72, 1.7, 1.72], [1.725, 1.7, 1.73], [1.73, 1.7, 1.73], [1.735, 1.7, 1.74], [1.74, 1.7, 1.74], [1.745, 1.7, 1.75], [1.75, 1.8, 1.75], [1.7550000000000001, 1.8, 1.76], [1.76, 1.8, 1.76], [1.7650000000000001, 1.8, 1.77], [1.77, 1.8, 1.77], [1.7750000000000001, 1.8, 1.78], [1.78, 1.8, 1.78], [1.7850000000000001, 1.8, 1.79], [1.79, 1.8, 1.79], [1.795, 1.8, 1.79], [1.8, 1.8, 1.8], [1.805, 1.8, 1.8], [1.81, 1.8, 1.81], [1.815, 1.8, 1.81], [1.82, 1.8, 1.82], [1.825, 1.8, 1.82], [1.83, 1.8, 1.83], [1.835, 1.8, 1.83], [1.84, 1.8, 1.84], [1.845, 1.8, 1.84], [1.85, 1.9, 1.85], [1.855, 1.9, 1.85], [1.86, 1.9, 1.86], [1.865, 1.9, 1.86], [1.87, 1.9, 1.87], [1.875, 1.9, 1.88], [1.8800000000000001, 1.9, 1.88], [1.885, 1.9, 1.89], [1.8900000000000001, 1.9, 1.89], [1.895, 1.9, 1.9], [1.9000000000000001, 1.9, 1.9], [1.905, 1.9, 1.91], [1.9100000000000001, 1.9, 1.91], [1.915, 1.9, 1.92], [1.92, 1.9, 1.92], [1.925, 1.9, 1.93], [1.93, 1.9, 1.93], [1.935, 1.9, 1.94], [1.94, 1.9, 1.94], [1.945, 1.9, 1.95], [1.95, 1.9, 1.95], [1.955, 2.0, 1.96], [1.96, 2.0, 1.96], [1.965, 2.0, 1.97], [1.97, 2.0, 1.97], [1.975, 2.0, 1.98], [1.98, 2.0, 1.98], [1.985, 2.0, 1.99], [1.99, 2.0, 1.99], [1.995, 2.0, 2.0], [2.0, 2.0, 2.0], [-10.0, -10.0, -10.0], [-9.875, -9.9, -9.88], [-9.75, -9.8, -9.75], [-9.625, -9.6, -9.62], [-9.5, -9.5, -9.5], [-9.375, -9.4, -9.38], [-9.25, -9.2, -9.25], [-9.125, -9.1, -9.12], [-9.0, -9.0, -9.0], [-8.875, -8.9, -8.88], [-8.75, -8.8, -8.75], [-8.625, -8.6, -8.62], [-8.5, -8.5, -8.5], [-8.375, -8.4, -8.38], [-8.25, -8.2, -8.25], [-8.125, -8.1, -8.12], [-8.0, -8.0, -8.0], [-7.875, -7.9, -7.88], [-7.75, -7.8, -7.75], [-7.625, -7.6, -7.62], [-7.5, -7.5, -7.5], [-7.375, -7.4, -7.38], [-7.25, -7.2, -7.25], [-7.125, -7.1, -7.12], [-7.0, -7.0, -7.0], [-6.875, -6.9, -6.88], [-6.75, -6.8, -6.75], [-6.625, -6.6, -6.62], [-6.5, -6.5, -6.5], [-6.375, -6.4, -6.38], [-6.25, -6.2, -6.25], [-6.125, -6.1, -6.12], [-6.0, -6.0, -6.0], [-5.875, -5.9, -5.88], [-5.75, -5.8, -5.75], [-5.625, -5.6, -5.62], [-5.5, -5.5, -5.5], [-5.375, -5.4, -5.38], [-5.25, -5.2, -5.25], [-5.125, -5.1, -5.12], [-5.0, -5.0, -5.0], [-4.875, -4.9, -4.88], [-4.75, -4.8, -4.75], [-4.625, -4.6, -4.62], [-4.5, -4.5, -4.5], [-4.375, -4.4, -4.38], [-4.25, -4.2, -4.25], [-4.125, -4.1, -4.12], [-4.0, -4.0, -4.0], [-3.875, -3.9, -3.88], [-3.75, -3.8, -3.75], [-3.625, -3.6, -3.62], [-3.5, -3.5, -3.5], [-3.375, -3.4, -3.38], [-3.25, -3.2, -3.25], [-3.125, -3.1, -3.12], [-3.0, -3.0, -3.0], [-2.875, -2.9, -2.88], [-2.75, -2.8, -2.75], [-2.625, -2.6, -2.62], [-2.5, -2.5, -2.5], [-2.375, -2.4, -2.38], [-2.25, -2.2, -2.25], [-2.125, -2.1, -2.12], [-2.0, -2.0, -2.0], [-1.875, -1.9, -1.88], [-1.75, -1.8, -1.75], [-1.625, -1.6, -1.62], [-1.5, -1.5, -1.5], [-1.375, -1.4, -1.38], [-1.25, -1.2, -1.25], [-1.125, -1.1, -1.12], [-1.0, -1.0, -1.0], [-0.875, -0.9, -0.88], [-0.75, -0.8, -0.75], [-0.625, -0.6, -0.62], [-0.5, -0.5, -0.5], [-0.375, -0.4, -0.38], [-0.25, -0.2, -0.25], [-0.125, -0.1, -0.12], [0.0, 0.0, 0.0], [0.125, 0.1, 0.12], [0.25, 0.2, 0.25], [0.375, 0.4, 0.38], [0.5, 0.5, 0.5], [0.625, 0.6, 0.62], [0.75, 0.8, 0.75], [0.875, 0.9, 0.88], [1.0, 1.0, 1.0], [1.125, 1.1, 1.12], [1.25, 1.2, 1.25], [1.375, 1.4, 1.38], [1.5, 1.5, 1.5], [1.625, 1.6, 1.62], [1.75, 1.8, 1.75], [1.875, 1.9, 1.88], [2.0, 2.0, 2.0], [2.125, 2.1, 2.12], [2.25, 2.2, 2.25], [2.375, 2.4, 2.38], [2.5, 2.5, 2.5], [2.625, 2.6, 2.62], [2.75, 2.8, 2.75], [2.875, 2.9, 2.88], [3.0, 3.0, 3.0], [3.125, 3.1, 3.12], [3.25, 3.2, 3.25], [3.375, 3.4, 3.38], [3.5, 3.5, 3.5], [3.625, 3.6, 3.62], [3.75, 3.8, 3.75], [3.875, 3.9, 3.88], [4.0, 4.0, 4.0], [4.125, 4.1, 4.12], [4.25, 4.2, 4.25], [4.375, 4.4, 4.38], [4.5, 4.5, 4.5], [4.625, 4.6, 4.62], [4.75, 4.8, 4.75], [4.875, 4.9, 4.88], [5.0, 5.0, 5.0], [5.125, 5.1, 5.12], [5.25, 5.2, 5.25], [5.375, 5.4, 5.38], [5.5, 5.5, 5.5], [5.625, 5.6, 5.62], [5.75, 5.8, 5.75], [5.875, 5.9, 5.88], [6.0, 6.0, 6.0], [6.125, 6.1, 6.12], [6.25, 6.2, 6.25], [6.375, 6.4, 6.38], [6.5, 6.5, 6.5], [6.625, 6.6, 6.62], [6.75, 6.8, 6.75], [6.875, 6.9, 6.88], [7.0, 7.0, 7.0], [7.125, 7.1, 7.12], [7.25, 7.2, 7.25], [7.375, 7.4, 7.38], [7.5, 7.5, 7.5], [7.625, 7.6, 7.62], [7.75, 7.8, 7.75], [7.875, 7.9, 7.88], [8.0, 8.0, 8.0], [8.125, 8.1, 8.12], [8.25, 8.2, 8.25], [8.375, 8.4, 8.38], [8.5, 8.5, 8.5], [8.625, 8.6, 8.62], [8.75, 8.8, 8.75], [8.875, 8.9, 8.88], [9.0, 9.0, 9.0], [9.125, 9.1, 9.12], [9.25, 9.2, 9.25], [9.375, 9.4, 9.38], [9.5, 9.5, 9.5], [9.625, 9.6, 9.62], [9.75, 9.8, 9.75], [9.875, 9.9, 9.88], [10.0, 10.0, 10.0], [-17.617, -17.6, -17.62], [-34.915, -34.9, -34.91], [15.093, 15.1, 15.09], [-42.756, -42.8, -42.76], [3.588, 3.6, 3.59], [-13.431, -13.4, -13.43], [-44.2, -44.2, -44.2], [0.744, 0.7, 0.74], [-46.25, -46.2, -46.25], [-6.635, -6.6, -6.63], [-43.014, -43.0, -43.01], [-40.929, -40.9, -40.93], [-7.548, -7.5, -7.55], [32.685, 32.7, 32.69], [-37.62, -37.6, -37.62], [-27.676, -27.7, -27.68], [12.743, 12.7, 12.74], [44.771, 44.8, 44.77], [7.71, 7.7, 7.71], [-10.332, -10.3, -10.33], [47.626, 47.6, 47.63], [-45.342, -45.3, -45.34], [35.847, 35.8, 35.85], [-21.039, -21.0, -21.04], [-35.574, -35.6, -35.57], [-38.221, -38.2, -38.22], [-19.152, -19.2, -19.15], [31.613, 31.6, 31.61], [-31.927, -31.9, -31.93], [8.16, 8.2, 8.16], [13.891, 13.9, 13.89], [-12.76, -12.8, -12.76], [4.774, 4.8, 4.77], [-43.721, -43.7, -43.72], [-44.04, -44.0, -44.04], [-29.404, -29.4, -29.4], [18.04, 18.0, 18.04], [-7.241, -7.2, -7.24], [-18.585, -18.6, -18.59], [8.556, 8.6, 8.56], [-4.682, -4.7, -4.68], [-20.023, -20.0, -20.02], [29.438, 29.4, 29.44], [19.899, 19.9, 19.9], [-25.59, -25.6, -25.59], [7.442, 7.4, 7.44], [2.52, 2.5, 2.52], [37.514, 37.5, 37.51], [22.945, 22.9, 22.95], [-21.206, -21.2, -21.21], [48.017, 48.0, 48.02], [-38.193, -38.2, -38.19], [-8.188, -8.2, -8.19], [25.714, 25.7, 25.71], [-34.802, -34.8, -34.8], [-1.104, -1.1, -1.1], [-46.079, -46.1, -46.08], [16.822, 16.8, 16.82], [26.457, 26.5, 26.46], [7.303, 7.3, 7.3], [37.548, 37.5, 37.55], [-18.625, -18.6, -18.62], [19.53, 19.5, 19.53], [9.437, 9.4, 9.44], [7.99, 8.0, 7.99], [-4.379, -4.4, -4.38], [33.997, 34.0, 34.0], [44.468, 44.5, 44.47], [-2.59, -2.6, -2.59], [16.415, 16.4, 16.41], [-43.933, -43.9, -43.93], [20.149, 20.1, 20.15], [14.713, 14.7, 14.71], [49.31, 49.3, 49.31], [32.192, 32.2, 32.19], [-21.54, -21.5, -21.54], [-11.421, -11.4, -11.42], [16.865, 16.9, 16.86], [-47.744, -47.7, -47.74], [-3.83, -3.8, -3.83], [-33.195, -33.2, -33.2], [-38.29, -38.3, -38.29], [-44.105, -44.1, -44.1], [26.823, 26.8, 26.82], [-37.066, -37.1, -37.07], [-25.239, -25.2, -25.24], [-10.905, -10.9, -10.9], [37.142, 37.1, 37.14], [-41.942, -41.9, -41.94], [-5.081, -5.1, -5.08], [4.944, 4.9, 4.94], [38.338, 38.3, 38.34], [31.928, 31.9, 31.93], [36.398, 36.4, 36.4], [-22.158, -22.2, -22.16], [-8.47, -8.5, -8.47], [-14.123, -14.1, -14.12], [38.419, 38.4, 38.42], [45.773, 45.8, 45.77], [-34.908, -34.9, -34.91], [-32.378, -32.4, -32.38], [-26.804, -26.8, -26.8], [-26.666, -26.7, -26.67], [-1.504, -1.5, -1.5], [8.912, 8.9, 8.91], [-23.725, -23.7, -23.73], [-49.591, -49.6, -49.59], [-8.105, -8.1, -8.11], [-13.075, -13.1, -13.07], [6.634, 6.6, 6.63], [45.31, 45.3, 45.31], [19.049, 19.0, 19.05], [1.549, 1.5, 1.55], [11.759, 11.8, 11.76], [17.62, 17.6, 17.62], [-44.601, -44.6, -44.6], [39.953, 40.0, 39.95], [27.997, 28.0, 28.0], [37.451, 37.5, 37.45], [29.787, 29.8, 29.79], [-10.762, -10.8, -10.76], [-10.102, -10.1, -10.1], [-39.646, -39.6, -39.65], [13.429, 13.4, 13.43], [-43.775, -43.8, -43.77], [-43.265, -43.3, -43.27], [-29.124, -29.1, -29.12], [-33.77, -33.8, -33.77], [-15.995, -16.0, -15.99], [-44.742, -44.7, -44.74], [-49.977, -50.0, -49.98], [-34.874, -34.9, -34.87], [-39.854, -39.9, -39.85], [-13.639, -13.6, -13.64], [-47.45, -47.5, -47.45], [37.433, 37.4, 37.43], [11.407, 11.4, 11.41], [-35.145, -35.1, -35.15], [-24.774, -24.8, -24.77], [-15.261, -15.3, -15.26], [-13.584, -13.6, -13.58], [-37.716, -37.7, -37.72], [34.894, 34.9, 34.89], [49.31, 49.3, 49.31], [-3.401, -3.4, -3.4], [-1.617, -1.6, -1.62], [-41.412, -41.4, -41.41], [-39.781, -39.8, -39.78], [-15.736, -15.7, -15.74], [-23.524, -23.5, -23.52], [32.886, 32.9, 32.89], [-33.856, -33.9, -33.86], [-47.69, -47.7, -47.69], [45.099, 45.1, 45.1], [2.826, 2.8, 2.83], [-35.34, -35.3, -35.34], [4.317, 4.3, 4.32], [-47.296, -47.3, -47.3], [2.811, 2.8, 2.81], [47.85, 47.9, 47.85], [36.333, 36.3, 36.33], [19.62, 19.6, 19.62], [-23.888, -23.9, -23.89], [-13.33, -13.3, -13.33], [-33.296, -33.3, -33.3], [27.194, 27.2, 27.19], [3.259, 3.3, 3.26], [27.905, 27.9, 27.91], [-17.034, -17.0, -17.03], [-27.696, -27.7, -27.7], [31.151, 31.2, 31.15], [48.493, 48.5, 48.49], [35.263, 35.3, 35.26], [30.608, 30.6, 30.61], [31.833, 31.8, 31.83], [23.987, 24.0, 23.99], [-27.326, -27.3, -27.33], [1.764, 1.8, 1.76], [-14.444, -14.4, -14.44], [-47.102, -47.1, -47.1], [-47.206, -47.2, -47.21], [-22.058, -22.1, -22.06], [-24.083, -24.1, -24.08], [19.252, 19.3, 19.25], [45.652, 45.7, 45.65], [-5.277, -5.3, -5.28], [43.702, 43.7, 43.7], [48.804, 48.8, 48.8], [45.5, 45.5, 45.5], [-13.536, -13.5, -13.54], [-27.954, -28.0, -27.95], [-27.315, -27.3, -27.32], [-30.329, -30.3, -30.33], [-29.563, -29.6, -29.56], [12.407, 12.4, 12.41], [40.031, 40.0, 40.03], [34.044, 34.0, 34.04], [-2.053, -2.1, -2.05], [15.298, 15.3, 15.3], [29.964, 30.0, 29.96], [-41.522, -41.5, -41.52], [16.059, 16.1, 16.06], [40.978, 41.0, 40.98], [28.23, 28.2, 28.23], [25.014, 25.0, 25.01], [-2.197, -2.2, -2.2], [-32.148, -32.1, -32.15], [28.914, 28.9, 28.91], [-16.748, -16.7, -16.75], [30.082, 30.1, 30.08], [47.166, 47.2, 47.17], [-10.416, -10.4, -10.42], [-9.861, -9.9, -9.86], [44.68, 44.7, 44.68], [22.48, 22.5, 22.48], [-33.0, -33.0, -33.0], [-37.296, -37.3, -37.3], [-34.885, -34.9, -34.88], [40.485, 40.5, 40.48], [30.65, 30.6, 30.65], [-35.383, -35.4, -35.38], [32.651, 32.7, 32.65], [48.031, 48.0, 48.03], [15.727, 15.7, 15.73], [-14.959, -15.0, -14.96], [4.866, 4.9, 4.87], [-36.902, -36.9, -36.9], [-48.576, -48.6, -48.58], [47.089, 47.1, 47.09], [14.967, 15.0, 14.97], [2.658, 2.7, 2.66], [43.362, 43.4, 43.36], [-6.619, -6.6, -6.62], [37.174, 37.2, 37.17], [32.616, 32.6, 32.62], [-28.896, -28.9, -28.9], [-24.817, -24.8, -24.82], [-20.703, -20.7, -20.7], [-25.946, -25.9, -25.95], [8.644, 8.6, 8.64], [-24.064, -24.1, -24.06], [-8.099, -8.1, -8.1], [-36.893, -36.9, -36.89], [41.002, 41.0, 41.0], [-14.622, -14.6, -14.62], [-4.184, -4.2, -4.18], [8.335, 8.3, 8.34], [40.43, 40.4, 40.43], [-7.937, -7.9, -7.94], [41.772, 41.8, 41.77], [0.165, 0.2, 0.17], [3.182, 3.2, 3.18], [2.351, 2.4, 2.35], [-48.13, -48.1, -48.13], [-5.988, -6.0, -5.99], [-31.689, -31.7, -31.69], [-49.607, -49.6, -49.61], [29.917, 29.9, 29.92], [-32.765, -32.8, -32.77], [-2.651, -2.7, -2.65], [22.519, 22.5, 22.52], [5.648, 5.6, 5.65], [-17.402, -17.4, -17.4], [1.835, 1.8, 1.83], [5.544, 5.5, 5.54], [28.427, 28.4, 28.43], [-39.389, -39.4, -39.39], [6.03, 6.0, 6.03], [-25.151, -25.2, -25.15], [-22.308, -22.3, -22.31], [27.226, 27.2, 27.23], [0.771, 0.8, 0.77], [6.173, 6.2, 6.17], [25.999, 26.0, 26.0], [41.249, 41.2, 41.25], [-5.675, -5.7, -5.67], [11.253, 11.3, 11.25], [0.555, 0.6, 0.56], [1.216, 1.2, 1.22], [19.273, 19.3, 19.27], [-4.765, -4.8, -4.76], [3.329, 3.3, 3.33], [-2.196, -2.2, -2.2], [44.15, 44.1, 44.15], [19.922, 19.9, 19.92], [37.654, 37.7, 37.65], [44.218, 44.2, 44.22], [-24.041, -24.0, -24.04], [5.951, 6.0, 5.95], [44.327, 44.3, 44.33], [34.0, 34.0, 34.0], [-36.287, -36.3, -36.29], [-37.838, -37.8, -37.84], [-5.788, -5.8, -5.79], [-42.745, -42.7, -42.74], [-25.936, -25.9, -25.94], [-42.688, -42.7, -42.69], [16.947, 16.9, 16.95], [28.394, 28.4, 28.39], [39.703, 39.7, 39.7], [19.925, 19.9, 19.93], [2.675, 2.7, 2.67], [6.25, 6.2, 6.25], [6.35, 6.3, 6.35], [0.125, 0.1, 0.12], [0.375, 0.4, 0.38], [-0.125, -0.1, -0.12], [1.005, 1.0, 1.0], [6.25, 6.2, 6.25]], "scen": [[[2.637, 1.0, -1.5, 2.8, 1.5, 0.0], {"trade_count": 6, "win_rate": 80.0, "total_pnl_pct": 6.44, "avg_win": 1.98, "avg_loss": -1.5, "best": 2.8, "worst": -1.5, "win_count": 4, "loss_count": 1, "breakeven_count": 1}], [[2.3, 2.9, -2.03, 2.96, -1.0, -0.9, 1.3, -0.97, -0.4, -0.694, 0.744, 2.8, 2.9], {"trade_count": 13, "win_rate": 53.8, "total_pnl_pct": 9.91, "avg_win": 2.27, "avg_loss": -1.0, "best": 2.96, "worst": -2.03, "win_count": 7, "loss_count": 6, "breakeven_count": 0}], [[-2.5, -2.8, -1.4, 1.919], {"trade_count": 4, "win_rate": 25.0, "total_pnl_pct": -4.78, "avg_win": 1.92, "avg_loss": -2.23, "best": 1.92, "worst": -2.8, "win_count": 1, "loss_count": 3, "breakeven_count": 0}], [[-0.564, 2.515, -0.03, -2.5, 1.8, -0.4, -1.4, 0.81, -2.5], {"trade_count": 9, "win_rate": 33.3, "total_pnl_pct": -2.27, "avg_win": 1.71, "avg_loss": -1.23, "best": 2.52, "worst": -2.5, "win_count": 3, "loss_count": 6, "breakeven_count": 0}], [[-1.4, -0.28, 2.97], {"trade_count": 3, "win_rate": 33.3, "total_pnl_pct": 1.29, "avg_win": 2.97, "avg_loss": -0.84, "best": 2.97, "worst": -1.4, "win_count": 1, "loss_count": 2, "breakeven_count": 0}], [[0.7, 0.2, 2.6, -1.4, -1.79, 0.772, 1.56, -0.326, -1.93, 0.0], {"trade_count": 10, "win_rate": 55.6, "total_pnl_pct": 0.39, "avg_win": 1.17, "avg_loss": -1.36, "best": 2.6, "worst": -1.93, "win_count": 5, "loss_count": 4, "breakeven_count": 1}], [[3.0], {"trade_count": 1, "win_rate": 100.0, "total_pnl_pct": 3.0, "avg_win": 3.0, "avg_loss": 0, "best": 3.0, "worst": 3.0, "win_count": 1, "loss_count": 0, "breakeven_count": 0}], [[-2.889], {"trade_count": 1, "win_rate": 0.0, "total_pnl_pct": -2.89, "avg_win": 0, "avg_loss": -2.89, "best": -2.89, "worst": -2.89, "win_count": 0, "loss_count": 1, "breakeven_count": 0}], [[2.868, -0.15, -2.362, -0.41, 0.28, 2.82, 1.1, -0.944, 1.4, -0.57, 2.9, -2.914, 1.45, -0.4, -2.49, 2.223, 2.826, -1.55], {"trade_count": 18, "win_rate": 50.0, "total_pnl_pct": 6.08, "avg_win": 1.99, "avg_loss": -1.31, "best": 2.9, "worst": -2.91, "win_count": 9, "loss_count": 9, "breakeven_count": 0}], [[-0.2, -1.4], {"trade_count": 2, "win_rate": 0.0, "total_pnl_pct": -1.6, "avg_win": 0, "avg_loss": -0.8, "best": -0.2, "worst": -1.4, "win_count": 0, "loss_count": 2, "breakeven_count": 0}], [[-0.82, 2.836, -1.1, 2.79, -1.7, -2.99, -2.5, 0.0, -1.5, 0.0], {"trade_count": 10, "win_rate": 25.0, "total_pnl_pct": -4.98, "avg_win": 2.81, "avg_loss": -1.77, "best": 2.84, "worst": -2.99, "win_count": 2, "loss_count": 6, "breakeven_count": 2}], [[-1.4, -2.137, -2.7], {"trade_count": 3, "win_rate": 0.0, "total_pnl_pct": -6.24, "avg_win": 0, "avg_loss": -2.08, "best": -1.4, "worst": -2.7, "win_count": 0, "loss_count": 3, "breakeven_count": 0}], [[-1.2, -2.493, 2.1, 0.945, 1.704, -0.66, 1.32, -2.103, 0.7, -2.737], {"trade_count": 10, "win_rate": 50.0, "total_pnl_pct": -2.42, "avg_win": 1.35, "avg_loss": -1.84, "best": 2.1, "worst": -2.74, "win_count": 5, "loss_count": 5, "breakeven_count": 0}], [[0.764, 1.206, -2.164, 1.517, 2.0, 1.958, 1.788, 1.097, 0.9, -2.8, 0.8, -0.74, 0.351, -2.887, 1.08, -1.42, 1.786], {"trade_count": 17, "win_rate": 70.6, "total_pnl_pct": 5.24, "avg_win": 1.27, "avg_loss": -2.0, "best": 2.0, "worst": -2.89, "win_count": 12, "loss_count": 5, "breakeven_count": 0}], [[2.4, 1.0, 1.47, -1.5, 2.1, 1.4, -1.616, 2.85, 2.1, -0.126, -1.3, 0.702, -1.81, -2.12, 0.909, -1.173, -2.2], {"trade_count": 17, "win_rate": 52.9, "total_pnl_pct": 3.09, "avg_win": 1.66, "avg_loss": -1.48, "best": 2.85, "worst": -2.2, "win_count": 9, "loss_count": 8, "breakeven_count": 0}], [[-0.085, -2.4, 0.0], {"trade_count": 3, "win_rate": 0.0, "total_pnl_pct": -2.48, "avg_win": 0, "avg_loss": -1.24, "best": 0.0, "worst": -2.4, "win_count": 0, "loss_count": 2, "breakeven_count": 1}], [[-1.255, -1.29, -0.2, 2.96, -1.8, 2.6, -1.3, 1.92, 2.96, -1.7, -2.6, -2.15, -1.43, -2.204, 0.1, 1.2], {"trade_count": 16, "win_rate": 37.5, "total_pnl_pct": -4.19, "avg_win": 1.96, "avg_loss": -1.59, "best": 2.96, "worst": -2.6, "win_count": 6, "loss_count": 10, "breakeven_count": 0}], [[2.39, -0.6, -2.98, 1.09, -1.2, -0.5, -1.1, -2.99, 2.0, 2.6, 1.278, -1.26, -2.61, 2.993, -2.54, 1.5], {"trade_count": 16, "win_rate": 43.8, "total_pnl_pct": -1.93, "avg_win": 1.98, "avg_loss": -1.75, "best": 2.99, "worst": -2.99, "win_count": 7, "loss_count": 9, "breakeven_count": 0}], [[-2.39, -1.3, -1.5, -0.38, -1.86, 1.71, 2.306, -0.6, 0.295], {"trade_count": 9, "win_rate": 33.3, "total_pnl_pct": -3.72, "avg_win": 1.44, "avg_loss": -1.34, "best": 2.31, "worst": -2.39, "win_count": 3, "loss_count": 6, "breakeven_count": 0}], [[-2.703, -0.535, 1.516], {"trade_count": 3, "win_rate": 33.3, "total_pnl_pct": -1.72, "avg_win": 1.52, "avg_loss": -1.62, "best": 1.52, "worst": -2.7, "win_count": 1, "loss_count": 2, "breakeven_count": 0}], [[-0.087, -2.24, -0.51, -1.213, 1.432, -1.439, -1.57, 0.34, -2.282, -2.0, 0.0], {"trade_count": 11, "win_rate": 20.0, "total_pnl_pct": -9.57, "avg_win": 0.89, "avg_loss": -1.42, "best": 1.43, "worst": -2.28, "win_count": 2, "loss_count": 8, "breakeven_count": 1}], [[2.44, 0.3, 2.44, -0.435, -1.8, -1.952, -2.5, -0.79, -1.8, 1.5, -0.703, 0.15, -1.4, -0.011, 2.8, 1.121, 0.8], {"trade_count": 17, "win_rate": 47.1, "total_pnl_pct": 0.16, "avg_win": 1.44, "avg_loss": -1.27, "best": 2.8, "worst": -2.5, "win_count": 8, "loss_count": 9, "breakeven_count": 0}], [[-1.4, -0.693, -0.32], {"trade_count": 3, "win_rate": 0.0, "total_pnl_pct": -2.41, "avg_win": 0, "avg_loss": -0.8, "best": -0.32, "worst": -1.4, "win_count": 0, "loss_count": 3, "breakeven_count": 0}], [[-2.24], {"trade_count": 1, "win_rate": 0.0, "total_pnl_pct": -2.24, "avg_win": 0, "avg_loss": -2.24, "best": -2.24, "worst": -2.24, "win_count": 0, "loss_count": 1, "breakeven_count": 0}], [[2.81, -3.0, 2.581, 2.13, -1.5, -1.7, 0.134, -2.347, 1.21, -2.5, -3.0, -1.6, 0.87, 2.775, -1.489, -0.4], {"trade_count": 16, "win_rate": 43.8, "total_pnl_pct": -5.03, "avg_win": 1.79, "avg_loss": -1.95, "best": 2.81, "worst": -3.0, "win_count": 7, "loss_count": 9, "breakeven_count": 0}], [[-2.578, 2.7, -0.7, 1.7, 0.0], {"trade_count": 5, "win_rate": 50.0, "total_pnl_pct": 1.12, "avg_win": 2.2, "avg_loss": -1.64, "best": 2.7, "worst": -2.58, "win_count": 2, "loss_count": 2, "breakeven_count": 1}], [[0.22], {"trade_count": 1, "win_rate": 100.0, "total_pnl_pct": 0.22, "avg_win": 0.22, "avg_loss": 0, "best": 0.22, "worst": 0.22, "win_count": 1, "loss_count": 0, "breakeven_count": 0}], [[2.754, 2.0, -0.1, 0.3, 2.764, 0.9, -2.87, 2.309, -0.48], {"trade_count": 9, "win_rate": 66.7, "total_pnl_pct": 7.58, "avg_win": 1.84, "avg_loss": -1.15, "best": 2.76, "worst": -2.87, "win_count": 6, "loss_count": 3, "breakeven_count": 0}], [[1.0, -1.6, 1.175, -0.477, -0.6, 1.782, 2.1, -1.8], {"trade_count": 8, "win_rate": 50.0, "total_pnl_pct": 1.58, "avg_win": 1.51, "avg_loss": -1.12, "best": 2.1, "worst": -1.8, "win_count": 4, "loss_count": 4, "breakeven_count": 0}], [[1.6, -1.6, -1.41, -2.346, -0.0, 2.38, -0.498, -2.661, -2.12, -2.7], {"trade_count": 10, "win_rate": 22.2, "total_pnl_pct": -9.36, "avg_win": 1.99, "avg_loss": -1.91, "best": 2.38, "worst": -2.7, "win_count": 2, "loss_count": 7, "breakeven_count": 1}], [[-2.1, 1.3, -0.64, 2.302, -2.3, 2.59, -1.856, 2.615, -0.19, 0.99, 2.03, -0.3, -2.98, -2.52, 2.7, 0.4, -0.72, 1.93, -2.473, -0.16, 0.0], {"trade_count": 21, "win_rate": 45.0, "total_pnl_pct": 0.62, "avg_win": 1.87, "avg_loss": -1.48, "best": 2.7, "worst": -2.98, "win_count": 9, "loss_count": 11, "breakeven_count": 1}], [[2.5, -1.06, 2.4, 0.8, 1.87, -2.8, -0.2, -1.458, -2.623, -0.97, -0.99, -2.738, 1.3, 2.55, -2.977, 2.499, 2.7, -2.9], {"trade_count": 18, "win_rate": 44.4, "total_pnl_pct": -2.1, "avg_win": 2.08, "avg_loss": -1.87, "best": 2.7, "worst": -2.98, "win_count": 8, "loss_count": 10, "breakeven_count": 0}], [[-0.15, 2.72, 1.74, 1.9], {"trade_count": 4, "win_rate": 75.0, "total_pnl_pct": 6.21, "avg_win": 2.12, "avg_loss": -0.15, "best": 2.72, "worst": -0.15, "win_count": 3, "loss_count": 1, "breakeven_count": 0}], [[-1.902, -1.18, 1.637, -1.58, -0.235, -2.5, -0.6, -1.5, 0.9, 0.32, -2.04, 2.3, -1.4, -1.75, -0.009, 2.8], {"trade_count": 16, "win_rate": 31.2, "total_pnl_pct": -6.74, "avg_win": 1.59, "avg_loss": -1.34, "best": 2.8, "worst": -2.5, "win_count": 5, "loss_count": 11, "breakeven_count": 0}], [[-2.2, 0.722, -1.59, 2.082, 1.56, -1.237, -1.39, 1.4], {"trade_count": 8, "win_rate": 50.0, "total_pnl_pct": -0.65, "avg_win": 1.44, "avg_loss": -1.6, "best": 2.08, "worst": -2.2, "win_count": 4, "loss_count": 4, "breakeven_count": 0}], [[-1.5, -1.59, 2.305, -1.9, -0.6, 0.0, 0.9, 0.9, -2.39, 2.3, 2.04, -2.76, -1.6, -1.863, -1.8, 0.0], {"trade_count": 16, "win_rate": 35.7, "total_pnl_pct": -7.56, "avg_win": 1.69, "avg_loss": -1.78, "best": 2.31, "worst": -2.76, "win_count": 5, "loss_count": 9, "breakeven_count": 2}], [[0.1, -0.31, 1.65, 2.7, 0.825, 0.7, -2.78, -2.2, 3.0, 0.597, 2.5, 1.91], {"trade_count": 12, "win_rate": 75.0, "total_pnl_pct": 8.69, "avg_win": 1.55, "avg_loss": -1.76, "best": 3.0, "worst": -2.78, "win_count": 9, "loss_count": 3, "breakeven_count": 0}], [[-1.89, -2.5, 1.772, -0.1, -2.39, 1.0, 0.8, 0.92, 1.17, 2.929, -1.2, -1.126], {"trade_count": 12, "win_rate": 50.0, "total_pnl_pct": -0.61, "avg_win": 1.43, "avg_loss": -1.53, "best": 2.93, "worst": -2.5, "win_count": 6, "loss_count": 6, "breakeven_count": 0}], [[-0.5, 2.19, 0.87, 1.4, 2.65, 2.41, -2.3, -0.56, -0.2, -2.2, 0.309, 1.84], {"trade_count": 12, "win_rate": 58.3, "total_pnl_pct": 5.91, "avg_win": 1.67, "avg_loss": -1.15, "best": 2.65, "worst": -2.3, "win_count": 7, "loss_count": 5, "breakeven_count": 0}], [[0.44, 1.4, -2.12], {"trade_count": 3, "win_rate": 66.7, "total_pnl_pct": -0.28, "avg_win": 0.92, "avg_loss": -2.12, "best": 1.4, "worst": -2.12, "win_count": 2, "loss_count": 1, "breakeven_count": 0}], [[0.0, 0.0], {"trade_count": 2, "win_rate": 0, "total_pnl_pct": 0.0, "avg_win": 0, "avg_loss": 0, "best": 0.0, "worst": 0.0, "win_count": 0, "loss_count": 0, "breakeven_count": 2}], [[1.2, 0.0, 0.0, -0.6], {"trade_count": 4, "win_rate": 50.0, "total_pnl_pct": 0.6, "avg_win": 1.2, "avg_loss": -0.6, "best": 1.2, "worst": -0.6, "win_count": 1, "loss_count": 1, "breakeven_count": 2}]]};
  for (const [v, r1, r2] of py.table as [number, number, number][]) {
    assert.ok(same(roundHalfEven(v, 1), r1), `r1 ${v}`);
    assert.ok(same(roundHalfEven(v, 2), r2), `r2 ${v}`);
  }
  for (const [pnls, want] of py.scen as [number[], Record<string, number>][]) {
    const got = journalStats(pnls.map((pnl) => ({ status: 'closed', pnl }))) as unknown as Record<string, number>;
    for (const k of Object.keys(want)) assert.ok(same(got[k], want[k]), `${k} ${pnls}`);
  }
  // ست عشرة صفقة وفوز واحد: 6.25% ⇒ «6.2» كالخادم (Math.round كان يكتب 6.3)
  const s16 = journalStats([
    { status: 'closed', pnl: 1 },
    ...Array.from({ length: 15 }, () => ({ status: 'closed', pnl: -0.5 })),
  ]);
  assert.equal(s16.win_rate, 6.2);
  assert.equal(s16.trade_count, 16);
  // المفتوحة / بلا pnl / pnl غير منتهٍ لا تُحسب؛ التعادل (0) ليس خسارة ولا يدخل نسبة الفوز (backend-r1)؛ pnl نصّاً يُقرأ
  const mixed = journalStats([
    { status: 'open', pnl: 5 },
    { status: 'closed', pnl: null },
    { status: 'closed' },
    { status: 'closed', pnl: NaN },
    { status: 'closed', pnl: '1.5' },
    { status: 'closed', pnl: 0 },
  ]);
  assert.deepEqual(mixed, {
    trade_count: 2, win_rate: 100, total_pnl_pct: 1.5, avg_win: 1.5, avg_loss: 0, best: 1.5, worst: 0,
    win_count: 1, loss_count: 0, breakeven_count: 1,
  });
  assert.deepEqual(journalStats([]), {
    trade_count: 0, win_rate: 0, total_pnl_pct: 0, avg_win: 0, avg_loss: 0, best: 0, worst: 0,
    win_count: 0, loss_count: 0, breakeven_count: 0,
  });
  // متداولٌ ينقل وقفه للتعادل: ربح، خسارة، ثم ثلاث صفقات أُغلقت على الدخول ⇒ 50% لا 20%
  const be = journalStats([1, -1, 0, 0, 0].map((pnl) => ({ status: 'closed', pnl })));
  assert.equal(be.win_rate, 50);
  assert.equal(be.avg_loss, -1); // التعادل لا يخفّف متوسط الخسارة
  assert.equal(be.breakeven_count, 3);
  assert.equal(be.trade_count, 5);
  // ضجيج الفاصلة العائمة (≤ 1e-9) تعادل؛ فوقه ربح/خسارة
  const eps = journalStats([1e-10, -1e-10, 2e-9, -2e-9].map((pnl) => ({ status: 'closed', pnl })));
  assert.deepEqual([eps.win_count, eps.loss_count, eps.breakeven_count], [1, 1, 2]);
}
console.log('tradePlan journalStats selftest OK');

// —— recentLotSizes: شرائح آخر أحجام اللوت بخانة الحجم ——
{
  // الأحدث أولاً، بلا تكرار، 3 على الأكثر
  assert.deepEqual(
    recentLotSizes([{ size: 0.5 }, { size: 0.1 }, { size: 0.5 }, { size: 0.2 }, { size: 0.3 }]),
    [0.5, 0.1, 0.2]
  );
  assert.deepEqual(recentLotSizes([{ size: 0.5 }, { size: 0.1 }, { size: 0.2 }], 2), [0.5, 0.1]);
  // الـ1 الافتراضي بالخادم لا يُقترح؛ الـ1 الذي كتبته الحاسبة بالملاحظة يُقترح
  assert.deepEqual(recentLotSizes([{ size: 1, note: '' }, { size: 0.25 }]), [0.25]);
  assert.deepEqual(recentLotSizes([{ size: 1, note: '1.00 lot · risk 100.00 USD · R:R 1:2.0' }]), [1]);
  // وحدات لا لوت، حجم خارج خطوة 0.01، صفر/سالب/NaN/null/غائب: لا شيء
  assert.deepEqual(
    recentLotSizes([{ size: 100000 }, { size: 0.015 }, { size: 0 }, { size: -0.1 }, { size: NaN }, { size: null }, {}]),
    []
  );
  // 100 بالضبط مقبول، 100.01 لا
  assert.deepEqual(recentLotSizes([{ size: 100.01 }, { size: 100 }]), [100]);
  // ضجيج الفاصلة العائمة (0.1 + 0.2) يُقترح 0.3 ولا يُكرَّر مع 0.3 المكتوبة
  assert.deepEqual(recentLotSizes([{ size: 0.1 + 0.2 }, { size: 0.3 }, { size: 0.07 }]), [0.3, 0.07]);
  // نصّ الشريحة toFixed(2) يطابق القيمة المقترحة حرفياً لكل خطوة حتى 100 لوت
  for (let k = 1; k <= 10000; k++) {
    const v = recentLotSizes([{ size: k / 100, note: k === 100 ? '1.00 lot' : null }])[0];
    assert.equal(Number(v.toFixed(2)), v);
    assert.equal(Math.round(v * 100), k);
  }
  assert.deepEqual(recentLotSizes([]), []);

  // لوت السنت/micro (1,000 وحدة) لا يُقترح لرمزٍ عادي ولا العكس
  const mixed = [
    { symbol: 'EURUSDC', size: 4 },
    { symbol: 'EURUSD.MICRO', size: 2.5 },
    { symbol: 'EURUSD', size: 0.04 },
    { symbol: 'XAUUSDC', size: 150 },
    { symbol: 'GBPUSD', size: 0.1 },
    { symbol: 'US30', size: 0.5 },
  ];
  assert.deepEqual(recentLotSizes(mixed, 3, 'EURUSD'), [0.04, 0.1, 0.5]);
  assert.deepEqual(recentLotSizes(mixed, 3, 'GBPUSDc'), [4, 2.5, 150]);
  assert.deepEqual(recentLotSizes(mixed, 3, 'EURUSDmicro'), [4, 2.5, 150]);
  // رمزٌ فارغ أو مجهول وسط الكتابة = عقدٌ عادي (الافتراض بالدفتر)
  assert.deepEqual(recentLotSizes(mixed, 3, ''), [0.04, 0.1, 0.5]);
  assert.deepEqual(recentLotSizes(mixed, 3, 'EURU'), [0.04, 0.1, 0.5]);
  // بلا رمز = كما كان (كل الصفقات، حدّ 100)
  assert.deepEqual(recentLotSizes(mixed), [4, 2.5, 0.04]);
  // حدّ السنت ضعف العادي (كـ`journalSizeLooksLikeUnits`): 200 تُقترح، 200.01 لا
  assert.deepEqual(recentLotSizes([{ symbol: 'EURUSDC', size: 200.01 }, { symbol: 'EURUSDC', size: 200 }], 3, 'EURUSDC'), [200]);
  assert.deepEqual(recentLotSizes([{ symbol: 'EURUSD', size: 150 }], 3, 'EURUSD'), []);
  // صفقة بلا رمز (نسخة قديمة) تُعدّ عادية
  assert.deepEqual(recentLotSizes([{ size: 0.2 }, { symbol: 'EURUSDC', size: 3 }], 3, 'EURUSD'), [0.2]);
  for (const s of ['EURUSDC', 'EURUSDc', 'GOLDC', 'EURUSD.c', 'EURUSD-cent', 'EURUSDMICRO', 'XAUUSD_micro'])
    assert.equal(journalContractKind(s), 'small', s);
  for (const s of ['EURUSD', 'EURUSDm', 'XAUUSD.m', 'US30', 'BTCUSDC', '', null, undefined])
    assert.equal(journalContractKind(s), 'std', String(s));
}
console.log('tradePlan recentLotSizes selftest OK');

// —— stopAtPips / quickStopPips: شرائح الوقف بالمسافة بالدفتر ——
{
  assert.equal(stopAtPips({ symbol: 'EURUSD', side: 'buy', entry: 1.085, pips: 20 }), 1.083);
  assert.equal(stopAtPips({ symbol: 'EURUSD', side: 'sell', entry: 1.085, pips: 20 }), 1.087);
  assert.equal(stopAtPips({ symbol: 'USDJPY', side: 'buy', entry: 157.4, pips: 20 }), 157.2);
  assert.equal(stopAtPips({ symbol: 'USDJPY', side: 'sell', entry: 157.4, pips: 20 }), 157.6);
  assert.equal(stopAtPips({ symbol: 'XAUUSD', side: 'buy', entry: 2400, pips: 100 }), 2390);
  assert.equal(stopAtPips({ symbol: 'XAUUSD.m', side: 'sell', entry: 2400.35, pips: 50 }), 2405.35);
  assert.equal(stopAtPips({ symbol: 'XAGUSD', side: 'buy', entry: 30.125, pips: 10 }), 30.025);
  // دخول بمنزلة pipette: لا ضجيج عائم بالناتج
  assert.equal(stopAtPips({ symbol: 'GBPUSD', side: 'buy', entry: 1.27345, pips: 30 }), 1.27045);
  // بلا مواصفات / مدخلات غير صالحة / وقف ≤ 0
  assert.equal(stopAtPips({ symbol: 'US30', side: 'buy', entry: 39000, pips: 20 }), null);
  assert.equal(stopAtPips({ symbol: 'EURUSD', side: 'buy', entry: 0, pips: 20 }), null);
  assert.equal(stopAtPips({ symbol: 'EURUSD', side: 'buy', entry: NaN, pips: 20 }), null);
  assert.equal(stopAtPips({ symbol: 'EURUSD', side: 'buy', entry: 1.085, pips: 0 }), null);
  assert.equal(stopAtPips({ symbol: 'EURUSD', side: 'buy', entry: 1.085, pips: -20 }), null);
  assert.equal(stopAtPips({ symbol: 'EURUSD', side: 'buy', entry: 0.001, pips: 50 }), null);
  assert.deepEqual(quickStopPips('XAUUSD'), [30, 50, 100, 200]);
  assert.deepEqual(quickStopPips('xauusd.m'), [30, 50, 100, 200]);
  assert.deepEqual(quickStopPips('EURUSD'), [10, 20, 30, 50]);
  assert.deepEqual(quickStopPips('XAGUSD'), [10, 20, 30, 50]);
  assert.deepEqual(quickStopPips('US30'), []);
  // بسعر الدخول: الرئيسية والين والمعادن كما كانت حرفياً…
  for (const [sym, px] of [
    ['EURUSD', 1.085], ['AUDUSD', 0.65], ['NZDUSD', 0.59], ['EURGBP', 0.84], ['GBPUSD', 1.27], ['USDCAD', 1.37],
    ['USDCHF', 0.88], ['GBPNZD', 2.15], ['GBPAUD', 1.95], ['USDJPY', 157.4], ['GBPJPY', 191.1], ['EURJPY', 170],
    ['AUDJPY', 98.7], ['CHFJPY', 178], ['USDSGD', 1.35], ['XAGUSD', 30.1], ['XAGUSD', 22.3],
  ] as const) {
    assert.deepEqual(quickStopPips(sym, px), [10, 20, 30, 50], sym);
  }
  assert.deepEqual(quickStopPips('XAUUSD', 2400), [30, 50, 100, 200]);
  assert.deepEqual(quickStopPips('EURUSD', null), [10, 20, 30, 50]);
  assert.deepEqual(quickStopPips('USDZAR', 0), [10, 20, 30, 50]);
  assert.deepEqual(quickStopPips('USDZAR', NaN), [10, 20, 30, 50]);
  assert.deepEqual(quickStopPips('US30', 39000), []);
  // …والبعيدة عنها تُقاس نسبةً للسعر، بأرقام مستديرة بلا ضجيج عائم
  assert.deepEqual(quickStopPips('USDZAR', 18.2), [200, 400, 600, 1000]);
  assert.deepEqual(quickStopPips('usdmxn.m', 19.5), [200, 400, 600, 1000]);
  assert.deepEqual(quickStopPips('EURTRY', 38), [500, 1000, 1500, 2500]);
  assert.deepEqual(quickStopPips('USDSEK', 10.5), [100, 200, 300, 500]);
  assert.deepEqual(quickStopPips('EURNOK', 11.7), [100, 200, 300, 500]);
  assert.deepEqual(quickStopPips('USDPLN', 4.0), [50, 100, 150, 250]);
  assert.deepEqual(quickStopPips('ZARJPY', 8.5), [1, 2, 3, 5]);
  assert.deepEqual(quickStopPips('MXNJPY', 7.9), [1, 2, 3, 5]);
  assert.deepEqual(quickStopPips('NOKJPY', 14.2), [1, 2, 3, 5]);
  // الشبكة: لكل زوج بسعره الواقعي، أوسع شريحة بين 0.2% و1.2% من السعر (EURUSD: 50 pip = 0.46%)، وأضيقها
  // ليست أقل من 1 pip؛ والوقف منها بالجهة الصحيحة ومسافته تُقرأ كما كُتبت.
  for (const [sym, px] of [
    ['EURUSD', 1.085], ['USDZAR', 18.2], ['USDMXN', 19.5], ['EURTRY', 38], ['USDTRY', 34.2], ['USDSEK', 10.5],
    ['USDNOK', 10.9], ['USDDKK', 6.8], ['USDPLN', 4.0], ['EURPLN', 4.3], ['USDCNH', 7.2], ['USDHKD', 7.8],
    ['USDILS', 3.7], ['ZARJPY', 8.5], ['MXNJPY', 7.9], ['TRYJPY', 4.4], ['SEKJPY', 14.5], ['USDJPY', 157.4],
    ['XAUUSD', 2400], ['EURSEK', 11.5], ['GBPZAR', 23.4], ['AUDNZD', 1.09], ['EURAUD', 1.65],
  ] as const) {
    const chips = quickStopPips(sym, px);
    const spec = instrumentSpec(sym)!;
    const widest = (chips[chips.length - 1] * spec.pipSize) / px;
    assert.ok(widest >= 0.002 && widest <= 0.012, `${sym} ${widest}`);
    assert.ok(chips[0] >= 1, sym);
    for (const pips of chips) {
      assert.equal(Number(pips.toFixed(1)), pips, `${sym} ${pips}`);
      for (const side of ['buy', 'sell'] as const) {
        const stop = stopAtPips({ symbol: sym, side, entry: px, pips })!;
        assert.equal(levelSideIssue({ side, entry: px, sl: stop }), null, sym);
        assert.equal(slPipsFromPrices(spec, px, stop), pips, `${sym} ${side} ${pips}`);
      }
    }
  }
  // الشبكة: الوقف الناتج بالجهة الصحيحة، ومسافته تُقرأ `pips` بالضبط بمسطرة الخطة وبمسطرة حجم اللوت
  // (slPipsFromPrices تقرّب للأعلى — ضجيجٌ عائم كان سيُحسب 20.1 pip فيُصغَّر اللوت)، والنتيجة −1R عند الوقف.
  let n = 0;
  for (const symbol of ['EURUSD', 'GBPJPY', 'USDJPY', 'XAUUSD', 'XAGUSD', 'EURGBP', 'USDCHF', 'AUDNZD']) {
    const spec = instrumentSpec(symbol)!;
    const bases = spec.base === 'XAU' ? [1850.3, 2400, 2654.87] : spec.base === 'XAG' ? [22.345, 30.125]
      : spec.quote === 'JPY' ? [98.765, 157.4, 191.123] : [0.61234, 0.8765, 1.085, 1.27345];
    for (const entry of bases) {
      for (const side of ['buy', 'sell'] as const) {
        for (const pips of [...quickStopPips(symbol), 7, 12.5, 15.3]) {
          const sl = stopAtPips({ symbol, side, entry, pips })!;
          assert.ok(sl != null && sl > 0);
          assert.equal(levelSideIssue({ side, entry, sl }), null);
          assert.equal(slPipsFromPrices(spec, entry, sl), pips, `${symbol} ${side} ${entry} ${pips}`);
          const tp = side === 'buy' ? entry * 1.1 : entry * 0.9;
          assert.equal(analyzePlan({ symbol, side, entry, sl, tp }).riskPips, pips);
          assert.equal(realizedR({ side, entry, sl, exit: sl }), -1);
          n++;
        }
      }
    }
  }
  assert.ok(n > 300);
}
console.log('tradePlan stopAtPips selftest OK');

// —— quickJournalSymbols: شرائح الرمز من أدوات المتداول نفسه ——
{
  const D = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'GBPJPY', 'EURGBP'];
  // بلا صفقات: القائمة الافتراضية كما هي
  assert.deepEqual(quickJournalSymbols([], D), D);
  // «XAUUSD.m» تحلّ محلّ «XAUUSD» الافتراضية (أداة واحدة)، وتأتي أولاً؛ التكملة بترتيب الافتراضية
  assert.deepEqual(quickJournalSymbols([{ symbol: 'XAUUSD.M' }], D), ['XAUUSD.M', 'EURUSD', 'GBPUSD', 'USDJPY', 'GBPJPY', 'EURGBP']);
  // الأكثر صفقاتٍ أولاً، والتعادل للأحدث؛ الكتابة الأحدث للأداة هي المعروضة
  assert.deepEqual(
    quickJournalSymbols(
      [
        { symbol: 'US30' },
        { symbol: 'XAUUSD.m' },
        { symbol: 'AUDCAD' },
        { symbol: 'xauusd' },
        { symbol: 'AUDCAD' },
        { symbol: 'XAUUSD' },
      ],
      D
    ),
    ['XAUUSD.M', 'AUDCAD', 'US30', 'EURUSD', 'GBPUSD', 'USDJPY']
  );
  // «EUR/USD» القديمة تُطبَّع ولا تُكرّر شريحة EURUSD
  assert.deepEqual(quickJournalSymbols([{ symbol: 'eur/usd' }], D), D);
  // رمز لا يُحفظ / فارغ / null يُتخطّى
  assert.deepEqual(quickJournalSymbols([{ symbol: 'EU' }, { symbol: '' }, { symbol: null }, {}], D), D);
  // السقف: أدوات المتداول وحدها تملأ الستّ، والزائدة (الأقل صفقاتٍ) تسقط
  const many = ['AUDCAD', 'NZDJPY', 'US30', 'NAS100', 'USOIL', 'CADJPY', 'EURAUD'].flatMap((sym, i) =>
    Array.from({ length: 7 - i }, () => ({ symbol: sym }))
  );
  assert.deepEqual(quickJournalSymbols(many, D), ['AUDCAD', 'NZDJPY', 'US30', 'NAS100', 'USOIL', 'CADJPY']);
  assert.equal(quickJournalSymbols(many, D, 3).length, 3);
  // `scan`: أداة بعد آخر 100 صفقة لا تحجز مكاناً
  const old = [...Array.from({ length: 100 }, () => ({ symbol: 'EURUSD' })), { symbol: 'USDTRY' }];
  assert.ok(!quickJournalSymbols(old, D).includes('USDTRY'));
  assert.ok(quickJournalSymbols(old, D, 6, 101).includes('USDTRY'));
  // كل شريحة رمزٌ يُحفظ كما هو، وأداة واحدة لكل شريحة
  for (const list of [quickJournalSymbols(many, D), quickJournalSymbols([{ symbol: 'GBPJPY-ECN' }, { symbol: 'us30.cash' }], D)]) {
    for (const x of list) assert.equal(journalSymbol(x), x);
    assert.equal(new Set(list.map((x) => journalInstrumentKey(x))).size, list.length);
  }
  assert.deepEqual(quickJournalSymbols([{ symbol: 'GBPJPY-ECN' }], D).slice(0, 1), ['GBPJPY-ECN']);
  assert.ok(!quickJournalSymbols([{ symbol: 'GBPJPY-ECN' }], D).includes('GBPJPY'));
}
console.log('tradePlan quickJournalSymbols selftest OK');

// —— stopsForPips: سعرا الوقف للاتجاهين من نقاط الحاسبة ——
{
  assert.deepEqual(stopsForPips({ symbol: 'EURUSD', entry: 1.085, pips: 20 }), [
    { side: 'buy', price: 1.083 },
    { side: 'sell', price: 1.087 },
  ]);
  assert.deepEqual(stopsForPips({ symbol: 'USDJPY', entry: 157.4, pips: 20 }), [
    { side: 'buy', price: 157.2 },
    { side: 'sell', price: 157.6 },
  ]);
  assert.deepEqual(stopsForPips({ symbol: 'XAUUSD.m', entry: 2400, pips: 50 }), [
    { side: 'buy', price: 2395 },
    { side: 'sell', price: 2405 },
  ]);
  // بلا مواصفات / مدخلات غير صالحة
  assert.deepEqual(stopsForPips({ symbol: 'US30', entry: 39000, pips: 20 }), []);
  assert.deepEqual(stopsForPips({ symbol: 'EURUSD', entry: NaN, pips: 20 }), []);
  assert.deepEqual(stopsForPips({ symbol: 'EURUSD', entry: 1.085, pips: 0 }), []);
  assert.deepEqual(stopsForPips({ symbol: 'EURUSD', entry: 1.085, pips: -5 }), []);
  // وقف الشراء ≤ 0 يسقط وحده، والبيع يبقى
  assert.deepEqual(stopsForPips({ symbol: 'EURUSD', entry: 0.001, pips: 50 }), [{ side: 'sell', price: 0.006 }]);
  // الشبكة: الجهة صحيحة، والمسافة المقروءة بمسطرة اللوت لا تقلّ عن المكتوبة (لا لوت أكبر بعد النقرة)،
  // وتساويها حرفياً لمسافة بعُشر pip؛ والاتجاه المستنتَج من الوقف (وقف تحت الدخول = شراء) هو الجهة نفسها
  let n = 0;
  for (const symbol of ['EURUSD', 'GBPJPY', 'XAUUSD', 'XAGUSD', 'AUDNZD', 'USDCHF.pro']) {
    const spec = instrumentSpec(symbol)!;
    const entries = spec.base === 'XAU' ? [1850.3, 2654.87] : spec.base === 'XAG' ? [22.345, 30.125]
      : spec.quote === 'JPY' ? [157.4, 191.123] : [0.61234, 1.085, 1.27345];
    for (const entry of entries) {
      for (const pips of [1, 5, 7.5, 12.3, 20, 33.33, 50, 100.05]) {
        const out = stopsForPips({ symbol, entry, pips });
        assert.equal(out.length, 2);
        for (const { side, price } of out) {
          assert.equal(price < entry ? 'buy' : 'sell', side);
          assert.equal(levelSideIssue({ side, entry, sl: price }), null);
          const got = slPipsFromPrices(spec, entry, price)!;
          assert.ok(got >= pips - 1e-9, `${symbol} ${side} ${entry} ${pips} → ${got}`);
          assert.ok(got - pips < 0.1 + 1e-9);
          if (Number.isInteger(Math.round(pips * 10 * 1e6) / 1e6)) assert.equal(got, pips);
          n++;
        }
      }
    }
  }
  assert.ok(n > 150);
}
console.log('tradePlan stopsForPips selftest OK');

// —— «GOLD»/«SILVER» بالدفتر: تُحفظ كما كُتبت، وتُحسب نقاطها وسعر سوقها كـXAUUSD/XAGUSD
{
  assert.equal(journalSymbol('gold'), 'GOLD');
  assert.equal(journalSymbol('GOLD#'), 'GOLD#');
  assert.equal(journalSymbol('silver'), 'SILVER');
  assert.equal(journalSymbol('silver.m'), 'SILVER.M');
  assert.equal(quoteSymbol('GOLD'), 'XAUUSD');
  assert.equal(quoteSymbol('SILVER.M'), 'XAGUSD');
  assert.equal(journalInstrumentKey('GOLD'), 'XAUUSD');
  assert.deepEqual(realizedMove({ symbol: 'GOLD', side: 'buy', entry: 2350, exit: 2355.5 }), { pips: 55, pct: 0.23, dir: 1 });
  assert.deepEqual(
    realizedMove({ symbol: 'GOLD#', side: 'sell', entry: 2000, exit: 2002.5 }),
    realizedMove({ symbol: 'XAUUSD', side: 'sell', entry: 2000, exit: 2002.5 })
  );
  // صفقتا GOLD و XAUUSD أداة واحدة بصافي واحد
  const net = netByInstrument([
    { symbol: 'GOLD', side: 'buy', entry: 2000, exit: 2004, size: 0.1, status: 'closed' },
    { symbol: 'XAUUSD', side: 'sell', entry: 2010, exit: 2012, size: 0.1, status: 'closed' },
  ]);
  assert.deepEqual(net, [{ symbol: 'XAUUSD', n: 2, pips: 20, cash: { amount: 20, ccy: 'USD' } }]);
}
console.log('tradePlan GOLD/SILVER journal selftest OK');

// ── سعر التنفيذ من Bid/Ask، وتبديل الجهة بعد تعبئة «السعر الحالي» بالدفتر ──
{
  const q = { price: 1.0851, bid: 1.085, ask: 1.0852 };
  assert.equal(executionPrice(q, 'buy'), 1.0852); // فتح شراء = Ask
  assert.equal(executionPrice(q, 'sell'), 1.085); // فتح بيع = Bid
  assert.equal(executionPrice(q, 'buy', 'close'), 1.085); // إغلاق شراء = Bid
  assert.equal(executionPrice(q, 'sell', 'close'), 1.0852); // إغلاق بيع = Ask
  // Bid/Ask غائب أو صفر أو NaN ⇒ السعر المفرد
  for (const bad of [null, undefined, 0, -1, NaN, Infinity]) {
    assert.equal(executionPrice({ price: 1.0851, bid: bad, ask: bad }, 'buy'), 1.0851);
    assert.equal(executionPrice({ price: 1.0851, bid: bad, ask: bad }, 'sell'), 1.0851);
  }
  assert.equal(executionPrice({ price: NaN }, 'buy'), null);
  assert.equal(executionPrice({ price: 0, ask: null }, 'buy'), null);

  // الخانة بنصّ التعبئة حرفياً ⇒ سعر الجهة الجديدة من اللقطة نفسها
  const filled = { symbol: 'EURUSD', text: '1.08520', q };
  assert.equal(entryAfterSideSwitch({ entryText: '1.08520', symbol: 'EURUSD', side: 'sell', filled }), 1.085);
  assert.equal(entryAfterSideSwitch({ entryText: ' 1.08520 ', symbol: 'EURUSD', side: 'sell', filled }), 1.085);
  // والعودة: بيع → شراء
  const back = { symbol: 'EURUSD', text: '1.08500', q };
  assert.equal(entryAfterSideSwitch({ entryText: '1.08500', symbol: 'EURUSD', side: 'buy', filled: back }), 1.0852);
  // كتب المتداول سعره بنفسه (ولو رقماً مساوياً بصيغة أخرى) ⇒ لا نلمسه
  assert.equal(entryAfterSideSwitch({ entryText: '1.0852', symbol: 'EURUSD', side: 'sell', filled }), null);
  assert.equal(entryAfterSideSwitch({ entryText: '1.08530', symbol: 'EURUSD', side: 'sell', filled }), null);
  assert.equal(entryAfterSideSwitch({ entryText: '', symbol: 'EURUSD', side: 'sell', filled }), null);
  // أداة أخرى أو لا تعبئة أصلاً
  assert.equal(entryAfterSideSwitch({ entryText: '1.08520', symbol: 'GBPUSD', side: 'sell', filled }), null);
  assert.equal(entryAfterSideSwitch({ entryText: '1.08520', symbol: null, side: 'sell', filled }), null);
  assert.equal(entryAfterSideSwitch({ entryText: '1.08520', symbol: 'EURUSD', side: 'sell', filled: null }), null);
  // لقطة بلا Bid/Ask ⇒ السعر المفرد نفسه (بلا فرق — لا نخترع سبريداً)
  const mid = { symbol: 'XAUUSD', text: '2350.50', q: { price: 2350.5 } };
  assert.equal(entryAfterSideSwitch({ entryText: '2350.50', symbol: 'XAUUSD', side: 'sell', filled: mid }), 2350.5);

  // ما يصنعه الفرق: بيع مسجَّل على Ask بدل Bid = 2 pip خطأ بالمخاطرة (وقف 1.0870)
  const wrong = analyzePlan({ symbol: 'EURUSD', side: 'sell', entry: 1.0852, sl: 1.087, tp: 1.08 });
  const right = analyzePlan({ symbol: 'EURUSD', side: 'sell', entry: 1.085, sl: 1.087, tp: 1.08 });
  assert.equal(wrong.riskPips, 18);
  assert.equal(right.riskPips, 20);
}
console.log('tradePlan executionPrice / side switch selftest OK');

// ── «الدخول = السعر الحالي» بالحاسبة: الجهة من موضع الوقف ──
{
  const q = { price: 1.0851, bid: 1.085, ask: 1.0852 };
  assert.equal(liveEntryForStop(q, null), 1.0851); // بلا وقف ⇒ الوسطي
  assert.equal(liveEntryForStop(q, undefined), 1.0851);
  assert.equal(liveEntryForStop(q, NaN), 1.0851); // خانة غير مفهومة (num ⇒ NaN)
  assert.equal(liveEntryForStop(q, 0), 1.0851);
  assert.equal(liveEntryForStop(q, 1.0851), 1.0851); // وقف عند السعر: لا جهة
  assert.equal(liveEntryForStop(q, 1.083), 1.0852); // وقف تحت ⇒ شراء ⇒ Ask
  assert.equal(liveEntryForStop(q, 1.087), 1.085); // وقف فوق ⇒ بيع ⇒ Bid
  assert.equal(liveEntryForStop({ price: 1.0851 }, 1.083), 1.0851); // بلا Bid/Ask ⇒ الوسطي
  assert.equal(liveEntryForStop({ price: 0, bid: 1, ask: 1 }, 1.083), null);
  // الذهب: سبريد 30 سنتاً — شراء بوقف 5$ تحت الوسطي = 5.15$ فعلياً لا 5
  const g = { price: 2350.5, bid: 2350.35, ask: 2350.65 };
  const e = liveEntryForStop(g, 2345.5)!;
  assert.equal(e, 2350.65);
  assert.equal(slPipsFromPrices(instrumentSpec('XAUUSD')!, e, 2345.5), 51.5);
  assert.equal(slPipsFromPrices(instrumentSpec('XAUUSD')!, g.price, 2345.5), 50);
  // وقفٌ كُتب **أثناء** طلب السعر (الحاسبة تقرأ الوقف عند وصول الرد، `stopPxRef`): بقراءته عند النقرة (فارغ ⇒ NaN)
  // يُعبّأ الوسطي ⇒ وقف 16.5 pip من Ask يُحسب 15 ⇒ 10,000 USD بـ1% = 0.66 lot بدل 0.60 (+10%)
  const gs = 2349.0; // 15 pip ذهب تحت الوسطي (pip = 0.1)
  const xau = instrumentSpec('XAUUSD')!;
  const sizeFrom = (entry: number) =>
    positionSize({ balance: 10000, riskPct: 1, slPips: slPipsFromPrices(xau, entry, gs)!, pipValuePerLot: pipValuePerLot(xau, 1), contractSize: xau.contractSize })!.lots;
  assert.equal(liveEntryForStop(g, NaN), 2350.5);
  assert.equal(sizeFrom(liveEntryForStop(g, NaN)!), 0.66);
  assert.equal(sizeFrom(liveEntryForStop(g, gs)!), 0.6);
  // اتّساق مع مسار الدفتر: الجهة المستنتجة = executionPrice بالجهة نفسها
  assert.equal(liveEntryForStop(q, 1.083), executionPrice(q, 'buy'));
  assert.equal(liveEntryForStop(q, 1.087), executionPrice(q, 'sell'));
}
console.log('tradePlan liveEntryForStop selftest OK');
// ── مصدر الدخول الحيّ: يُسمّى Ask/Bid فقط حين أُخذ منهما فعلاً ──
{
  const q = { price: 1.0851, bid: 1.085, ask: 1.0852 };
  assert.deepEqual(liveEntryQuote(q, 1.083), { price: 1.0852, quote: 'ask', side: 'buy' });
  assert.deepEqual(liveEntryQuote(q, 1.087), { price: 1.085, quote: 'bid', side: 'sell' });
  assert.deepEqual(liveEntryQuote(q, null), { price: 1.0851, quote: null, side: null });
  assert.deepEqual(liveEntryQuote(q, 1.0851), { price: 1.0851, quote: null, side: null });
  assert.deepEqual(liveEntryQuote(q, NaN), { price: 1.0851, quote: null, side: null });
  // Bid/Ask الجهة غائب أو تالف ⇒ الوسطي، ولا يُدّعى Ask/Bid
  assert.deepEqual(liveEntryQuote({ price: 1.0851, bid: 1.085 }, 1.083), { price: 1.0851, quote: null, side: 'buy' });
  assert.deepEqual(liveEntryQuote({ price: 1.0851, ask: 0, bid: 1.085 }, 1.083), { price: 1.0851, quote: null, side: 'buy' });
  assert.deepEqual(liveEntryQuote({ price: 1.0851, ask: 1.0852, bid: NaN }, 1.087), { price: 1.0851, quote: null, side: 'sell' });
  assert.equal(liveEntryQuote({ price: 0, bid: 1, ask: 1 }, 1.083), null);
  // السعر = liveEntryForStop دائماً (المصدر الواحد)
  for (const st of [null, 1.083, 1.087, 1.0851, 0]) {
    assert.equal(liveEntryQuote(q, st)!.price, liveEntryForStop(q, st));
  }
}
console.log('tradePlan liveEntryQuote selftest OK');

// ── شريحة الوقف والدخول ما زال السعر الحيّ الوسطي: الوقف يُقاس من سعر الجهة ──
{
  const q = { price: 1.0851, bid: 1.085, ask: 1.0852 };
  const buy = liveStopChip({ symbol: 'EURUSD', side: 'buy', pips: 20, q })!;
  assert.deepEqual(buy, { entry: 1.0852, stop: 1.0832 });
  const sell = liveStopChip({ symbol: 'EURUSD', side: 'sell', pips: 20, q })!;
  assert.deepEqual(sell, { entry: 1.085, stop: 1.087 });
  const spec = instrumentSpec('EURUSD')!;
  // النقاط المكتوبة تبقى كما هي بعد النقرة (لا 20.5)، والجهة المستنتجة من الوقف = جهة الشريحة
  assert.equal(slPipsFromPrices(spec, buy.entry, buy.stop), 20);
  assert.equal(slPipsFromPrices(spec, sell.entry, sell.stop), 20);
  assert.equal(liveEntryForStop(q, buy.stop), buy.entry);
  assert.equal(liveEntryForStop(q, sell.stop), sell.entry);
  // الين والذهب والنقاط الكسرية (بعيداً عن الدخول كـstopsForPips)
  const j = liveStopChip({ symbol: 'USDJPY', side: 'buy', pips: 33.33, q: { price: 150.005, bid: 150.0, ask: 150.01 } })!;
  assert.equal(j.entry, 150.01);
  assert.equal(j.stop, 149.676);
  assert.ok(slPipsFromPrices(instrumentSpec('USDJPY')!, j.entry, j.stop)! >= 33.33);
  const g = liveStopChip({ symbol: 'XAUUSD', side: 'sell', pips: 50, q: { price: 2350.5, bid: 2350.35, ask: 2350.65 } })!;
  assert.deepEqual(g, { entry: 2350.35, stop: 2355.35 });
  // بلا Bid/Ask ⇒ من الوسطي كما كانت الشريحة
  assert.deepEqual(liveStopChip({ symbol: 'EURUSD', side: 'buy', pips: 20, q: { price: 1.0851 } }), { entry: 1.0851, stop: 1.0831 });
  // مدخل غير صالح
  assert.equal(liveStopChip({ symbol: 'EURUSD', side: 'buy', pips: 20, q: { price: 0 } }), null);
  assert.equal(liveStopChip({ symbol: 'EURUSD', side: 'buy', pips: 0, q }), null);
  assert.equal(liveStopChip({ symbol: 'NOPE', side: 'buy', pips: 20, q }), null);
}
console.log('tradePlan liveStopChip selftest OK');

// ── الدفتر: دخولٌ حيّ لأداة سابقة يُمسح عند تبديل الأداة، وما كُتب باليد لا يُمسّ ──
{
  const filled = { symbol: 'EURUSD', text: '1.08515' };
  assert.equal(liveEntryOrphaned({ entryText: '1.08515', symbol: 'GBPUSD', filled }), true);
  assert.equal(liveEntryOrphaned({ entryText: ' 1.08515 ', symbol: 'gbp/usd', filled }), true);
  assert.equal(liveEntryOrphaned({ entryText: '1.08515', symbol: 'XAUUSD', filled }), true);
  // الأداة نفسها بلاحقة وسيط أو بالحروف الصغيرة ⇒ لا
  assert.equal(liveEntryOrphaned({ entryText: '1.08515', symbol: 'EURUSD', filled }), false);
  assert.equal(liveEntryOrphaned({ entryText: '1.08515', symbol: 'eurusd.m', filled }), false);
  assert.equal(
    liveEntryOrphaned({ entryText: '2350.65', symbol: 'GOLD#', filled: { symbol: 'XAUUSD', text: '2350.65' } }),
    false,
  );
  // أثناء الكتابة (رمز ناقص/فارغ) ⇒ لا
  assert.equal(liveEntryOrphaned({ entryText: '1.08515', symbol: 'GBPUS', filled }), false);
  assert.equal(liveEntryOrphaned({ entryText: '1.08515', symbol: '', filled }), false);
  assert.equal(liveEntryOrphaned({ entryText: '1.08515', symbol: 'AAPL', filled }), false); // غير معروفة: لا تخمين
  // شريحة مؤشر معروف ⇒ نعم
  assert.equal(liveEntryOrphaned({ entryText: '1.08515', symbol: 'US30', filled }), true);
  // كتبه المتداول بيده (أو عدّله) ⇒ لا يُمسّ
  assert.equal(liveEntryOrphaned({ entryText: '1.0852', symbol: 'GBPUSD', filled }), false);
  assert.equal(liveEntryOrphaned({ entryText: '1.27', symbol: 'GBPUSD', filled: null }), false);
}
console.log('tradePlan liveEntryOrphaned selftest OK');

// وقفٌ أضيق من 1 pip: لا R بسطر الصفقة ولا بالمتوسط (كان +200R يرفع متوسط ثلاث صفقات إلى +66R)
{
  const t = (symbol: string | undefined, side: string, entry: number, sl: number, exit: number) => ({
    symbol, side, entry, sl, exit, status: 'closed',
  });
  // بلا رمز كان +200R؛ الآن يُسقطه الحدّ النسبي 0.002% من الدخول (`minRiskForR`) أيضاً
  assert.equal(realizedR({ side: 'buy', entry: 1.085, sl: 1.08499, exit: 1.087 }), null);
  assert.equal(realizedR({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.08499, exit: 1.087 }), null);
  const trades = [
    t('EURUSD', 'buy', 1.085, 1.08499, 1.087),
    t('EURUSD', 'buy', 1.1, 1.09, 1.12),
    t('USDJPY', 'sell', 150, 151, 151),
  ];
  assert.deepEqual(averageR(trades.map((x) => ({ ...x, symbol: undefined }))), { r: 0.5, n: 2 });
  assert.deepEqual(averageR(trades), { r: 0.5, n: 2 });
  // 1 pip بالضبط يُحسب (هامش الفاصلة العائمة كـanalyzePlan): 1.0851 − 1.0850
  assert.equal(realizedR({ symbol: 'EURUSD', side: 'buy', entry: 1.0851, sl: 1.085, exit: 1.0853 }), 2);
  // ين: وقف 0.005 (نصف pip) ⇒ null؛ 0.01 ⇒ يُحسب
  assert.equal(realizedR({ symbol: 'USDJPY', side: 'sell', entry: 150, sl: 150.005, exit: 149.9 }), null);
  assert.equal(realizedR({ symbol: 'USDJPY', side: 'sell', entry: 150, sl: 150.01, exit: 149.9 }), 10);
  // ذهب: pip 0.1 — وقف 0.05 ⇒ null
  assert.equal(realizedR({ symbol: 'XAUUSD', side: 'buy', entry: 2350, sl: 2349.95, exit: 2351 }), null);
  // رمز مجهول: لا حدّ pip، بل 0.002% من الدخول (100 ⇒ 0.002) — كان وقف 0.00001 يُحسب
  assert.equal(realizedR({ symbol: 'ZZZ', side: 'buy', entry: 100, sl: 99.99999, exit: 100.00002 }), null);
  assert.equal(realizedR({ symbol: 'ZZZ', side: 'buy', entry: 100, sl: 99.99, exit: 100.02 }), 2);
  // exitPreview وfloatingResult بالمسطرة نفسها
  assert.equal(exitPreview({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.08499, exit: 1.087 })!.r, null);
  assert.equal(floatingResult({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.08499, current: 1.087 })!.r, null);
  assert.equal(exitPreview({ symbol: 'EURUSD', side: 'buy', entry: 1.1, sl: 1.09, exit: 1.12 })!.r, 2);
  // pips والنسبة باقية مع r null
  assert.equal(exitPreview({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.08499, exit: 1.087 })!.pips, 20);
}
console.log('tradePlan sub-pip stop R selftest OK');

// «إجمالي PnL %» يُخفى حين يعاكس مالاً معروفاً لكل صفقة
{
  const t = (symbol: string, side: string, entry: number, exit: number, size: number | null, note: string | null = null) => ({
    symbol, side, entry, exit, size, note, status: 'closed',
  });
  // 0.01 لوت +2% (1.0 ⇒ 1.02) و2 لوت −0.5% (1.1 ⇒ 1.0945): النسب +1.5%، المال +20 −1,100 = −1,080 USD
  const pair = [t('EURUSD', 'buy', 1.0, 1.02, 0.01), t('EURUSD', 'buy', 1.1, 1.0945, 2)];
  const pct = journalStats(pair.map((x) => ({ status: 'closed', pnl: ((x.exit - x.entry) / x.entry) * 100 }))).total_pnl_pct;
  assert.equal(pct, 1.5);
  assert.equal(pnlPctContradictsCash(pair, pct), true);
  // الإشارة نفسها: يبقى
  assert.equal(pnlPctContradictsCash(pair, -0.3), false);
  // صفقة بلا حجم معروف (1 افتراض الخادم بلا ملاحظة الحاسبة): لا نعرف المال كلّه ⇒ يبقى
  assert.equal(pnlPctContradictsCash([...pair, t('EURUSD', 'buy', 1.1, 1.2, 1)], pct), false);
  // 1.00 من الحاسبة (ملاحظتها تشهد): معروف
  assert.equal(pnlPctContradictsCash([t('EURUSD', 'buy', 1.0, 1.02, 0.01), t('EURUSD', 'buy', 1.1, 1.0945, 1, '1.00 lot · x')], 1.5), true);
  // أداة مجهولة: يبقى
  assert.equal(pnlPctContradictsCash([...pair, t('ZZZ', 'buy', 1, 2, 0.5)], pct), false);
  // عملتان بإشارتين مختلفتين (EURUSD −1,080 USD، USDJPY +JPY): الصافي غير واضح ⇒ يبقى
  assert.equal(pnlPctContradictsCash([...pair, t('USDJPY', 'buy', 150, 151, 2)], 1.5), false);
  // عملتان كلتاهما خاسرة والنسبة موجبة ⇒ يُخفى
  assert.equal(pnlPctContradictsCash([...pair, t('USDJPY', 'buy', 151, 150.9, 0.1)], 1.2), true);
  // المفتوحة لا تُحسب؛ نسبة صفر أو NaN لا تُخفى؛ بلا صفقات لا تُخفى
  assert.equal(pnlPctContradictsCash([...pair, { ...t('EURUSD', 'buy', 1, 1, null), status: 'open', exit: null as unknown as number }], pct), true);
  assert.equal(pnlPctContradictsCash(pair, 0), false);
  assert.equal(pnlPctContradictsCash(pair, NaN), false);
  assert.equal(pnlPctContradictsCash([], 1), false);
  // مال بصفر تماماً (خروج = دخول): لا إشارة ⇒ يبقى
  assert.equal(pnlPctContradictsCash([t('EURUSD', 'buy', 1.1, 1.1, 2)], 0.1), false);
  // بيع يُحسب بجهته: بيع 0.5 لوت 1.1 ⇒ 1.105 = −250 USD، والنسبة +0.2 ⇒ يُخفى
  assert.equal(pnlPctContradictsCash([t('EURUSD', 'sell', 1.1, 1.105, 0.5)], 0.2), true);
}
console.log('tradePlan pnlPctContradictsCash selftest OK');

// stopTooClose: حدّ slTooClose بلا هدف — الدفتر يحذّر بوقفٍ وحده
{
  assert.equal(stopTooClose({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.08499 }), true);
  assert.equal(stopTooClose({ symbol: 'EURUSD', side: 'sell', entry: 1.085, sl: 1.08505 }), true);
  // 1 pip بالضبط (هامش الفاصلة العائمة) وما فوقه: لا
  assert.equal(stopTooClose({ symbol: 'EURUSD', side: 'buy', entry: 1.0851, sl: 1.085 }), false);
  assert.equal(stopTooClose({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.083 }), false);
  // الجهة الخطأ/الوقف = الدخول: تحذير آخر، لا هذا
  assert.equal(stopTooClose({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.08501 }), false);
  assert.equal(stopTooClose({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.085 }), false);
  // ين وذهب بحجم pip كلٍّ منهما
  assert.equal(stopTooClose({ symbol: 'USDJPY', side: 'buy', entry: 150, sl: 149.995 }), true);
  assert.equal(stopTooClose({ symbol: 'USDJPY', side: 'buy', entry: 150, sl: 149.99 }), false);
  assert.equal(stopTooClose({ symbol: 'XAUUSD', side: 'sell', entry: 2350, sl: 2350.05 }), true);
  assert.equal(stopTooClose({ symbol: 'XAUUSD', side: 'sell', entry: 2350, sl: 2350.1 }), false);
  // رمز مجهول: 0.002% من الدخول (1 ⇒ 0.00002) — كان «لا» دائماً فيُسقط R بعد الإغلاق بلا تحذير
  assert.equal(stopTooClose({ symbol: 'ZZZ', side: 'buy', entry: 1, sl: 0.99999 }), true);
  assert.equal(stopTooClose({ symbol: 'ZZZ', side: 'buy', entry: 1, sl: 0.9999 }), false);
  assert.equal(stopTooClose({ symbol: 'BTCUSD', side: 'sell', entry: 60000, sl: 60000.01 }), true);
  assert.equal(stopTooClose({ symbol: 'BTCUSD', side: 'sell', entry: 60000, sl: 60300 }), false);
  // التحذير والـR متّفقان بلا pip أيضاً: ما يُحذَّر منه لا R له، وما لا يُحذَّر منه له R
  for (const sl of [59999.99, 59999, 59998.8, 59998.79, 59998, 59400]) {
    const close = stopTooClose({ symbol: 'BTCUSD', side: 'buy', entry: 60000, sl });
    assert.equal(realizedR({ symbol: 'BTCUSD', side: 'buy', entry: 60000, sl, exit: 61200 }) == null, close, `BTC ${sl}`);
  }
  // أسعار غير صالحة: لا
  assert.equal(stopTooClose({ symbol: 'EURUSD', side: 'buy', entry: null, sl: 1.08 }), false);
  assert.equal(stopTooClose({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: null }), false);
  // يتّفق مع analyzePlan حين يُكتب الهدف، ومع realizedR الذي لا يعطي R لهذا الوقف
  for (const [side, entry, sl] of [['buy', 1.085, 1.08499], ['buy', 1.0851, 1.085], ['sell', 1.085, 1.08505], ['sell', 1.085, 1.0852]] as const) {
    const tp = side === 'buy' ? entry + 0.01 : entry - 0.01;
    const close = stopTooClose({ symbol: 'EURUSD', side, entry, sl });
    assert.equal(analyzePlan({ symbol: 'EURUSD', side, entry, sl, tp }).issue === 'slTooClose', close, `${side} ${sl}`);
    assert.equal(realizedR({ symbol: 'EURUSD', side, entry, sl, exit: tp }) == null, close, `R ${side} ${sl}`);
  }
}
console.log('tradePlan stopTooClose selftest OK');

// ——— editExitValue: خروج فارغ بحفظ التعديل ———
{
  const { editExitValue } = require('./tradePlan') as typeof import('./tradePlan');
  // بدأ مفتوحاً (ثم أُغلق بالسوق أثناء التعديل): الفارغ لا يُرسل — كان null فيعيد الصفقة مفتوحة
  assert.equal(editExitValue(false, null), undefined);
  // بدأ مغلقاً: الفارغ = إعادة فتح مقصودة
  assert.equal(editExitValue(true, null), null);
  // سعرٌ مكتوب يُرسل كما هو بالحالتين
  assert.equal(editExitValue(false, 1.0875), 1.0875);
  assert.equal(editExitValue(true, 1.0875), 1.0875);
}
console.log('tradePlan editExitValue selftest OK');

// ——— editSizeValue: خانة حجم مُسحت بالتعديل ———
{
  const { editSizeValue } = require('./tradePlan') as typeof import('./tradePlan');
  // حجمٌ معروف مُسح ⇒ null (غير معروف) — كان undefined فيبقى 0.50 محفوظاً
  assert.equal(editSizeValue({ size: 0.5, note: '' }, null), null);
  // 1.00 بعلامتها (مكتوبة أو من الحاسبة) معروفة ⇒ مسحها null
  assert.equal(editSizeValue({ size: 1, note: '1.00 lot · breakout' }, null), null);
  // 1 بلا علامة = افتراض الخادم (الخانة فُتحت فارغة) ⇒ بلا تغيير
  assert.equal(editSizeValue({ size: 1, note: 'breakout' }, null), undefined);
  // مجهول أصلاً ⇒ بلا تغيير
  assert.equal(editSizeValue({ size: null, note: '' }, null), undefined);
  // مكتوب ⇒ كما هو
  assert.equal(editSizeValue({ size: 0.5, note: '' }, 0.3), 0.3);
  assert.equal(editSizeValue({ size: null }, 1), 1);
}
console.log('tradePlan editSizeValue selftest OK');

// ——— netLineIsWhole: «الصافي» بلا اسم فقط حين تدخل كل المغلقة ———
{
  const { netLineIsWhole, netByInstrument } = require('./tradePlan') as typeof import('./tradePlan');
  const eu = { symbol: 'EURUSD', side: 'buy', entry: 1.085, exit: 1.0875, size: 0.5, note: '0.50 lot', status: 'closed' };
  const us30 = { symbol: 'US30', side: 'buy', entry: 42000, exit: 41800, size: 1, note: '', status: 'closed' };
  const open = { symbol: 'US30', side: 'buy', entry: 42000, exit: null, size: 1, note: '', status: 'open' };
  // EURUSD وحدها (والمفتوحة لا تُحسب): بلا اسم كما كان
  assert.equal(netLineIsWhole([eu, open], netByInstrument([eu, open])), true);
  // EURUSD رابحة + US30 خاسرة: كانت «الصافي: +25 pip · +125.00 USD» بلا رمز ⇒ الآن بالاسم
  assert.equal(netByInstrument([eu, us30]).length, 1);
  assert.equal(netLineIsWhole([eu, us30], netByInstrument([eu, us30])), false);
  // «XAUUSD.m» و«XAUUSD» أداة واحدة: بلا اسم
  const g1 = { symbol: 'XAUUSD', side: 'buy', entry: 2350, exit: 2355, size: 1, note: '', status: 'closed' };
  const g2 = { ...g1, symbol: 'XAUUSD.m', exit: 2340 };
  assert.equal(netLineIsWhole([g1, g2], netByInstrument([g1, g2])), true);
  // أداتان أو لا شيء: false
  assert.equal(netLineIsWhole([eu, g1], netByInstrument([eu, g1])), false);
  assert.equal(netLineIsWhole([us30], netByInstrument([us30])), false);
  // مغلقة بلا خروج صالح لا تُعدّ ضدّه
  assert.equal(netLineIsWhole([eu, { ...eu, exit: null }], netByInstrument([eu, { ...eu, exit: null }])), true);
}
console.log('tradePlan netLineIsWhole selftest OK');

// ——— noteWithTypedSize: الحجم 1 المكتوب باليد يصير معروفاً ———
{
  const { noteWithTypedSize, knownLots, netByInstrument } = require('./tradePlan') as typeof import('./tradePlan');
  assert.equal(noteWithTypedSize(1, ''), '1.00 lot');
  assert.equal(noteWithTypedSize(1, '  breakout London '), '1.00 lot · breakout London');
  // ملاحظة الحاسبة فيها العلامة أصلاً: لا تتكرّر
  const plan = '1.00 lot · risk 100.00 USD · R:R 1:2';
  assert.equal(noteWithTypedSize(1, plan), plan);
  assert.equal(noteWithTypedSize(1, '1.00 lot'), '1.00 lot');
  // «1 lot مثلاً» بيد المتداول ليست العلامة: تُسبق
  assert.equal(noteWithTypedSize(1, '1 lot test'), '1.00 lot · 1 lot test');
  // غير 1 أو بلا حجم: كما هي
  assert.equal(noteWithTypedSize(0.5, 'x'), 'x');
  // تعديل الحجم من 1 إلى غيره: العلامة تسقط، والملاحظة الباقية كما هي
  assert.equal(noteWithTypedSize(0.5, '1.00 lot · x'), 'x');
  assert.equal(noteWithTypedSize(2, '1.00 lot'), '');
  assert.equal(noteWithTypedSize(0.5, ' 1.00 lot · breakout'), ' 1.00 lot · breakout'); // ليست العلامة حرفياً (كـknownLots)
  assert.equal(noteWithTypedSize(0.5, '1.00 lots x'), '1.00 lots x'); // ليست العلامة
  assert.equal(noteWithTypedSize(0.5, 'x 1.00 lot · y'), 'x 1.00 lot · y');
  assert.equal(knownLots(1, noteWithTypedSize(0.5, '1.00 lot · x')), null);
  // عدّاد الملاحظة: العلامة الساقطة تُعيد مكانها (الحفظ يطابق ما يُعدّ)
  {
    const { journalNoteRoom, JOURNAL_NOTE_MAX } = require('./tradePlan') as typeof import('./tradePlan');
    assert.equal(journalNoteRoom({ symbol: 'EURUSD', note: '1.00 lot · x', size: 0.5 }), JOURNAL_NOTE_MAX + 11);
    assert.equal(journalNoteRoom({ symbol: 'EURUSD', note: 'x', size: 1 }), JOURNAL_NOTE_MAX - 11);
  }
  // بلا حجم ⇒ كما هي
  assert.equal(noteWithTypedSize(null, '1.00 lot · x'), '1.00 lot · x');
  assert.equal(knownLots(1, 'x'), null);
  assert.equal(knownLots(0.5, '1.00 lot'), 0.5);
  assert.equal(noteWithTypedSize(null, ''), '');
  assert.equal(noteWithTypedSize(undefined, 'y'), 'y');
  assert.equal(noteWithTypedSize(10, ''), '');
  // حدّ الخادم 500: علامة «1.00 lot · » (11) فوق ملاحظة 495 كانت تُرفض 422 ⇒ الملاحظة كما هي؛ 489 + 11 = 500 تُعلَّم
  assert.equal(noteWithTypedSize(1, 'a'.repeat(495)), 'a'.repeat(495));
  assert.equal(noteWithTypedSize(1, 'a'.repeat(489)), `1.00 lot · ${'a'.repeat(489)}`);
  assert.equal(noteWithTypedSize(1, 'a'.repeat(489)).length, 500);
  // الأثر: EURUSD 1.0850 ⇒ 1.0875 بلوت واحد مكتوب ⇒ معروف و+250 USD بالصافي (كان null)
  const tr = { symbol: 'EURUSD', side: 'buy', entry: 1.085, exit: 1.0875, size: 1, status: 'closed' };
  assert.equal(netByInstrument([{ ...tr, note: '' }])[0]!.cash, null);
  const note = noteWithTypedSize(1, '');
  assert.equal(knownLots(1, note), 1);
  const cash = netByInstrument([{ ...tr, note }])[0]!.cash!;
  assert.equal(cash.ccy, 'USD');
  assert.equal(cash.amount, 250);
}
console.log('tradePlan noteWithTypedSize selftest OK');

// noteWithTypedSize — ملاحظة «سجّل الخطة» تتبع الحجم المعدَّل (اللوت والمخاطرة)
{
  const { noteWithTypedSize, knownLots, journalNoteRoom, JOURNAL_NOTE_MAX } = require('./tradePlan') as typeof import('./tradePlan');
  const { planJournalNote } = require('./positionSize') as typeof import('./positionSize');
  const n05 = planJournalNote({ lots: 0.5, risk: 100, ccy: 'USD', rr: '1:2', spreadPips: 1.2, commissionPerLot: 7, netRR: '1:1.8' });
  assert.equal(n05, '0.50 lot · risk 100.00 USD · R:R 1:2 · spread 1.2 pip · commission 7.00 USD/lot · net R:R 1:1.8');
  // 0.5 ⇒ 0.3: كان «0.50 lot · risk 100.00 USD» بجانب 0.3 (الحقيقة 60)
  assert.equal(noteWithTypedSize(0.3, n05), '0.30 lot · risk 60.00 USD · R:R 1:2 · spread 1.2 pip · commission 7.00 USD/lot · net R:R 1:1.8');
  // 0.5 ⇒ 1: كان «1.00 lot · 0.50 lot · …» — لوتان بسطر واحد
  const to1 = noteWithTypedSize(1, n05);
  assert.equal(to1, '1.00 lot · risk 200.00 USD · R:R 1:2 · spread 1.2 pip · commission 7.00 USD/lot · net R:R 1:1.8');
  assert.equal(knownLots(1, to1), 1);
  // 1 ⇒ 0.5: كانت العلامة تسقط ويبقى «risk 100.00 USD» — ضعف الحقيقة
  const n1 = planJournalNote({ lots: 1, risk: 100, ccy: 'USD', rr: '1:2' });
  assert.equal(noteWithTypedSize(0.5, n1), '0.50 lot · risk 50.00 USD · R:R 1:2');
  // حجم دون السنت ثم تعديل ثانٍ: «0.015 lot» (يكتبها هذا المسار نفسه) كانت لا تُعرف فتبقى المخاطرة القديمة أو يتكرّر اللوت
  const nMilli = noteWithTypedSize(0.015, n1);
  assert.equal(nMilli, '0.015 lot · risk 1.50 USD · R:R 1:2');
  assert.equal(noteWithTypedSize(0.02, nMilli!), '0.02 lot · risk 2.00 USD · R:R 1:2');
  assert.equal(noteWithTypedSize(1, nMilli!), '1.00 lot · risk 100.00 USD · R:R 1:2');
  assert.equal(noteWithTypedSize(0.015, nMilli!), nMilli);
  // الحجم نفسه ⇒ كما هي (0.5 = «0.50»)
  assert.equal(noteWithTypedSize(0.5, n05), n05);
  assert.equal(noteWithTypedSize(1, n1), n1);
  // كلمة المخاطرة بلغة الواجهة، والين بلا كسور، والآلاف بفاصلة
  const ar = planJournalNote({ lots: 2, risk: 15000, ccy: 'JPY', rr: '1:1.5', words: { risk: 'المخاطرة' } });
  assert.equal(noteWithTypedSize(3, ar), '3.00 lot · المخاطرة 22,500 JPY · R:R 1:1.5');
  const ku = planJournalNote({ lots: 0.1, risk: 1234.5, ccy: 'EUR', rr: '1:3', words: { risk: 'مەترسی' } });
  assert.equal(noteWithTypedSize(1.5, ku), '1.50 lot · مەترسی 18,517.50 EUR · R:R 1:3');
  // خطة بلا مبلغ («risk USD»): اللوت وحده يتغيّر
  assert.equal(noteWithTypedSize(0.2, planJournalNote({ lots: 0.1, risk: null, ccy: 'USD', rr: '1:2' })), '0.20 lot · risk USD · R:R 1:2');
  // حجمٌ بأكثر من منزلتين يُكتب كما هو
  assert.equal(noteWithTypedSize(0.125, n1), '0.125 lot · risk 12.50 USD · R:R 1:2');
  // ليست ملاحظة خطة ⇒ السلوك السابق حرفياً
  assert.equal(noteWithTypedSize(0.5, '1.00 lot · x'), 'x');
  assert.equal(noteWithTypedSize(0.5, '0.50 lot · x'), '0.50 lot · x');
  assert.equal(noteWithTypedSize(0.3, 'my 0.50 lot · risk 100.00 USD · R:R 1:2'), 'my 0.50 lot · risk 100.00 USD · R:R 1:2');
  // بلا حجم ⇒ كما هي
  assert.equal(noteWithTypedSize(null, n05), n05);
  // حدّ الخادم: الإعادة تُطيل الملاحظة (0.50 ⇒ 10.00، 100 ⇒ 2,000) — فوق الحدّ ⇒ كما كانت
  const long = `${n1} · ${'a'.repeat(JOURNAL_NOTE_MAX - n1.length - 3)}`;
  assert.equal(long.length, JOURNAL_NOTE_MAX);
  assert.equal(noteWithTypedSize(20, long), long);
  assert.ok(noteWithTypedSize(0.5, long).startsWith('0.50 lot · risk 50.00 USD'));
  // العدّاد يطابق ما يُحفظ
  assert.equal(journalNoteRoom({ symbol: 'EURUSD', note: n1, size: 20 }), JOURNAL_NOTE_MAX - 3);
}
console.log('tradePlan plan note follows edited size selftest OK');

// journalPipSize — صفقات حساب السنت (Exness «EURUSDc» تُحفظ «EURUSDC») بنقاطها لا بمالها
{
  assert.equal(journalPipSize('EURUSDC'), 0.0001);
  assert.equal(journalPipSize('EURUSDc'), 0.0001);
  assert.equal(journalPipSize('USDJPYC'), 0.01);
  assert.equal(journalPipSize('XAUUSDC'), 0.1);
  assert.equal(journalPipSize('GOLDC'), 0.1);
  // العادي كما كان
  assert.equal(journalPipSize('EURUSD'), 0.0001);
  assert.equal(journalPipSize('XAUUSD.m'), 0.1);
  // مجهول
  for (const s of ['US30', 'US30C', 'EURUSDT', 'EURUSDCC', '', null, undefined]) assert.equal(journalPipSize(s), null, String(s));

  const p = analyzePlan({ symbol: 'EURUSDC', side: 'buy', entry: 1.085, sl: 1.0825, tp: 1.09 });
  assert.equal(p.ok, true);
  assert.equal(p.riskPips, 25);
  assert.equal(p.rewardPips, 50);
  assert.equal(analyzePlan({ symbol: 'USDJPYC', side: 'sell', entry: 150, sl: 150.3, tp: 149.4 }).riskPips, 30);
  // وقف أضيق من pip يُكشف كالعادي
  assert.equal(analyzePlan({ symbol: 'EURUSDC', side: 'buy', entry: 1.085, sl: 1.08495, tp: 1.09 }).issue, 'slTooClose');
  assert.equal(stopTooClose({ symbol: 'EURUSDC', side: 'buy', entry: 1.085, sl: 1.08495 }), true);
  assert.equal(realizedR({ symbol: 'EURUSDC', side: 'buy', entry: 1.085, sl: 1.08495, exit: 1.09 }), null);
  assert.equal(realizedR({ symbol: 'EURUSDC', side: 'buy', entry: 1.085, sl: 1.0825, exit: 1.09 }), 2);
  assert.deepEqual(realizedMove({ symbol: 'EURUSDC', side: 'buy', entry: 1.085, exit: 1.0882 }), { pips: 32, pct: 0.29, dir: 1 });
  assert.equal(realizedMove({ symbol: 'XAUUSDC', side: 'sell', entry: 2000, exit: 1997.5 })?.pips, 25);
  // المال يبقى مجهولاً للسنت: عقده أصغر بمئة مرّة
  assert.equal(cashRisk({ symbol: 'EURUSDC', entry: 1.085, sl: 1.0825, lots: 1 }), null);
  assert.ok(cashRisk({ symbol: 'EURUSD', entry: 1.085, sl: 1.0825, lots: 1 }) != null);
}
console.log('tradePlan journalPipSize selftest OK');

// quoteSymbol لحساب السنت: السعر من الزوج العادي، ومفتاح الأداة منفصل (المال لا يُدمج)
{
  assert.equal(quoteSymbol('EURUSDC'), 'EURUSD');
  assert.equal(quoteSymbol('EURUSDc'), 'EURUSD');
  assert.equal(quoteSymbol(journalSymbol('EURUSDc')!), 'EURUSD');
  assert.equal(quoteSymbol('USDJPYC'), 'USDJPY');
  assert.equal(quoteSymbol('XAUUSDC'), 'XAUUSD');
  assert.equal(quoteSymbol('GOLDC'), 'XAUUSD');
  // ليست سنتاً: كما كانت
  assert.equal(quoteSymbol('EURUSD'), 'EURUSD');
  assert.equal(quoteSymbol('EURUSDT'), 'EURUSDT');
  assert.equal(quoteSymbol('EURUSDCC'), 'EURUSDCC');
  assert.equal(quoteSymbol('US30C'), 'US30C');
  assert.equal(quoteSymbol('XAUUSD.m'), 'XAUUSD');
  // مفتاح الأداة: السنت شريحة وحدها
  assert.equal(journalInstrumentKey('EURUSDC'), 'EURUSDC');
  assert.equal(journalInstrumentKey('GOLDC'), 'XAUUSDC');
  assert.equal(journalInstrumentKey('EURUSD'), 'EURUSD');
  // صافي EURUSD بالمال لا يسقط بصفقة سنت بجانبه
  const c = (symbol: string, exit: number) => ({ symbol, side: 'buy', entry: 1.1, exit, size: 0.5, status: 'closed' });
  const rows = netByInstrument([c('EURUSD', 1.102), c('EURUSDC', 1.101)]);
  const std = rows.find((r) => r.symbol === 'EURUSD')!;
  assert.deepEqual(std, { symbol: 'EURUSD', n: 1, pips: 20, cash: { amount: 100, ccy: 'USD' } });
  assert.deepEqual(rows.find((r) => r.symbol === 'EURUSDC'), { symbol: 'EURUSDC', n: 1, pips: 10, cash: { amount: 50, ccy: 'USC' } });
  // النتيجة العائمة لسنت على سعر الزوج العادي: نقاط وR، والمال مجهول
  assert.deepEqual(floatingResult({ symbol: 'EURUSDC', side: 'buy', entry: 1.085, sl: 1.0825, current: 1.0875 }), {
    pips: 25,
    pct: 0.23,
    dir: 1,
    r: 1,
  });
  assert.equal(pnlInQuoteCcy({ symbol: 'EURUSDC', side: 'buy', entry: 1.085, exit: 1.0875, lots: 1 }), null);
}
console.log('tradePlan cent quoteSymbol selftest OK');

// draftRiskFigures — سطر «المخاطرة» بمسودّة الدفتر؛ حساب السنت بنقاطه بلا مال
{
  const d = (symbol: string, side: 'buy' | 'sell', entry: number, sl: number, lots: number) =>
    draftRiskFigures({ symbol, side, entry, sl, lots });
  // العادي كما كان (riskInQuoteCcy + pipsBetween)
  assert.deepEqual(d('EURUSD', 'buy', 1.085, 1.0825, 0.5), { pips: 25, cash: { amount: 125, ccy: 'USD' }, cent: false, micro: false });
  assert.deepEqual(d('xauusd.m', 'sell', 2400, 2405, 0.1), { pips: 50, cash: { amount: 50, ccy: 'USD' }, cent: false, micro: false });
  assert.deepEqual(d('USDJPY', 'buy', 150, 149.7, 1), { pips: 30, cash: { amount: 30000, ccy: 'JPY' }, cent: false, micro: false });
  // السنت: نقاطٌ ومالٌ بعقد ÷100 — USC لزوجٍ مسعَّر بالدولار (كما يعرضه حساب السنت)، وعملة التسعير لغيره (USDJPYC بالين)
  assert.deepEqual(d('EURUSDC', 'buy', 1.085, 1.0825, 0.5), { pips: 25, cash: { amount: 125, ccy: 'USC' }, cent: true, micro: false });
  assert.deepEqual(d('EURUSDc', 'buy', 1.085, 1.0825, 0.5), { pips: 25, cash: { amount: 125, ccy: 'USC' }, cent: true, micro: false });
  assert.deepEqual(d('USDJPYC', 'sell', 150, 150.3, 2), { pips: 30, cash: { amount: 600, ccy: 'JPY' }, cent: true, micro: false });
  assert.deepEqual(d('GOLDC', 'buy', 2400, 2397.5, 1), { pips: 25, cash: { amount: 250, ccy: 'USC' }, cent: true, micro: false });
  // لا سطر: جهة خطأ، وقف على الدخول، حجم يبدو وحدات، مجهول، أرقام غير صالحة
  assert.equal(d('EURUSD', 'buy', 1.085, 1.09, 0.5), null);
  assert.equal(d('EURUSDC', 'sell', 1.085, 1.08, 0.5), null);
  assert.equal(d('EURUSD', 'buy', 1.085, 1.085, 0.5), null);
  assert.equal(d('EURUSD', 'buy', 1.085, 1.0825, 10000), null);
  assert.equal(d('EURUSDC', 'buy', 1.085, 1.0825, 10000), null);
  assert.equal(d('US30', 'buy', 39000, 38900, 1), null);
  assert.equal(d('EURUSDT', 'buy', 1.085, 1.0825, 1), null);
  assert.equal(d('EURUSD', 'buy', 1.085, 1.0825, 0), null);
  assert.equal(d('EURUSD', 'buy', NaN, 1.0825, 1), null);
  // isCentJournalSymbol
  for (const s of ['EURUSDC', 'eurusdc', 'XAUUSDC', 'GOLDC', ' USDJPYc ']) assert.equal(isCentJournalSymbol(s), true, s);
  for (const s of ['EURUSD', 'EURUSDT', 'EURUSDCC', 'US30C', 'XAUUSD.m', '', null, undefined])
    assert.equal(isCentJournalSymbol(s), false, String(s));
}
console.log('tradePlan draftRiskFigures selftest OK');

// journalSizeLooksLikeUnits — تحذير «الحجم يبدو وحدات» لرمز سنت أيضاً، بلا اقتراح تحويل
{
  // العادي كـsizeLooksLikeUnits تماماً
  assert.deepEqual(journalSizeLooksLikeUnits(10000, 'EURUSD'), { lots: 0.1 });
  assert.deepEqual(journalSizeLooksLikeUnits(10000, 'eurusd.m'), { lots: 0.1 });
  assert.equal(journalSizeLooksLikeUnits(0.5, 'EURUSD'), null);
  assert.equal(journalSizeLooksLikeUnits(100, 'EURUSD'), null);
  // السنت: كان null (يُحفظ بعشرة آلاف لوت)
  assert.deepEqual(journalSizeLooksLikeUnits(10000, 'EURUSDC'), { lots: null });
  assert.deepEqual(journalSizeLooksLikeUnits(250, 'GOLDC'), { lots: null });
  // أحجام سنت معقولة لا تُمنع — حتى فوق حدّ العادي
  for (const n of [0.01, 1, 150, 200]) assert.equal(journalSizeLooksLikeUnits(n, 'EURUSDC'), null, String(n));
  // مجهول: لا حكم
  assert.equal(journalSizeLooksLikeUnits(10000, 'US30'), null);
  assert.equal(journalSizeLooksLikeUnits(10000, ''), null);
  assert.equal(journalSizeLooksLikeUnits(NaN, 'EURUSDC'), null);
  // سطر المخاطرة يختفي لحجم السنت الذي يبدو وحدات، ويبقى لـ150
  assert.equal(draftRiskFigures({ symbol: 'EURUSDC', side: 'buy', entry: 1.085, sl: 1.0825, lots: 10000 }), null);
  assert.deepEqual(draftRiskFigures({ symbol: 'EURUSDC', side: 'buy', entry: 1.085, sl: 1.0825, lots: 150 }), {
    pips: 25,
    cash: { amount: 37500, ccy: 'USC' },
    cent: true,
    micro: false,
  });
}
console.log('tradePlan journalSizeLooksLikeUnits selftest OK');

// journalMicroNoMoney — micro بمسودّة الدفتر وتحت الصافي (نصّ السنت لا يصفها)
{
  for (const s of ['EURUSDMICRO', 'eurusdmicro', 'EURUSD.MICRO', 'GOLD_MICRO', ' XAUUSDmicro ']) assert.equal(isMicroJournalSymbol(s), true, s);
  for (const s of ['EURUSD', 'EURUSDC', 'EURUSD-CENT', 'US30MICRO', 'EURUSDMICROS', '', null, undefined])
    assert.equal(isMicroJournalSymbol(s), false, String(s));
  const d = (symbol: string) => draftRiskFigures({ symbol, side: 'buy', entry: 1.085, sl: 1.0825, lots: 2 });
  assert.deepEqual(d('EURUSD.MICRO'), { pips: 25, cash: { amount: 5, ccy: 'USD' }, cent: false, micro: true });
  assert.deepEqual(d('EURUSDC'), { pips: 25, cash: { amount: 500, ccy: 'USC' }, cent: true, micro: false });
  assert.deepEqual(d('EURUSD'), { pips: 25, cash: { amount: 500, ccy: 'USD' }, cent: false, micro: false });
  // حجمٌ يبدو وحدات: لا سطر أصلاً
  assert.equal(draftRiskFigures({ symbol: 'EURUSDMICRO', side: 'buy', entry: 1.085, sl: 1.0825, lots: 10000 }), null);
  const c = (symbol: string, size: number | null, status = 'closed') => ({ symbol, size, status, note: null });
  const trades = [c('EURUSD', 0.5), c('EURUSDMICRO', 0.5), c('EURUSDC', 0.5)];
  const keys = netByInstrument(trades.map((t) => ({ ...t, side: 'buy', entry: 1.1, exit: 1.101 }))).map((r) => r.symbol);
  assert.deepEqual([...keys].sort(), ['EURUSD', 'EURUSDC', 'EURUSDMICRO']);
  // المال لكل أداة بعقدها: +10 pip × 0.5 لوت — العادي 50 USD، micro (500 وحدة) 0.50 USD، السنت 50 USC
  const rows = netByInstrument(trades.map((t) => ({ ...t, side: 'buy', entry: 1.1, exit: 1.101 })));
  assert.deepEqual(rows.find((r) => r.symbol === 'EURUSD')!.cash, { amount: 50, ccy: 'USD' });
  assert.deepEqual(rows.find((r) => r.symbol === 'EURUSDMICRO')!.cash, { amount: 0.5, ccy: 'USD' });
  assert.deepEqual(rows.find((r) => r.symbol === 'EURUSDC')!.cash, { amount: 50, ccy: 'USC' });
  // بلا حجم معروف (1 = افتراض الخادم) ⇒ بلا مال كالعادي
  assert.equal(netByInstrument([{ ...c('EURUSDMICRO', 1), side: 'buy', entry: 1.1, exit: 1.101 }])[0]!.cash, null);
}
console.log('tradePlan journalMicroNoMoney selftest OK');

// لاحقة عقدٍ أصغر بمئة مرّة بفاصل («EURUSD-cent»، «XAUUSD_cent»، «GOLD.c»، «EURUSD.micro») بالدفتر: نقاط وسعر سوق بالزوج
// العادي، **بلا مال** (كان يُحسب بعقد الحساب العادي ⇒ مبلغ أكبر بمئة مرّة)، ومفتاح أداة منفصل لا يُدمج بالعادي
{
  for (const [raw, saved, pair, pip, key] of [
    ['EURUSD-cent', 'EURUSD-CENT', 'EURUSD', 0.0001, 'EURUSDC'],
    ['eurusd.c', 'EURUSD.C', 'EURUSD', 0.0001, 'EURUSDC'],
    ['XAUUSD_cent', 'XAUUSD_CENT', 'XAUUSD', 0.1, 'XAUUSDC'],
    ['GOLD.c', 'GOLD.C', 'XAUUSD', 0.1, 'XAUUSDC'],
    ['EURUSD.micro', 'EURUSD.MICRO', 'EURUSD', 0.0001, 'EURUSDMICRO'],
    ['USDJPY-micro', 'USDJPY-MICRO', 'USDJPY', 0.01, 'USDJPYMICRO'],
    // XM Micro: «micro» ملاصقة — كانت تُحفظ «EURUSDMICRO» بلا نقاط ولا سعر سوق
    ['EURUSDmicro', 'EURUSDMICRO', 'EURUSD', 0.0001, 'EURUSDMICRO'],
    ['GOLDmicro', 'GOLDMICRO', 'XAUUSD', 0.1, 'XAUUSDMICRO'],
  ] as const) {
    assert.equal(journalSymbol(raw), saved, raw);
    assert.equal(quoteSymbol(saved), pair, raw);
    assert.equal(journalPipSize(saved), pip, raw);
    assert.equal(journalInstrumentKey(saved), key, raw);
    assert.equal(pnlInQuoteCcy({ symbol: saved, side: 'buy', entry: 1.085, exit: 1.0875, lots: 0.1 }), null, raw);
  }
  assert.equal(isCentJournalSymbol('EURUSD-CENT'), true);
  assert.equal(isCentJournalSymbol('GOLD.C'), true);
  assert.equal(isCentJournalSymbol('EURUSD.MICRO'), false);
  // مسودّة سنت بفاصل: نقاط بلا مال
  assert.deepEqual(draftRiskFigures({ symbol: 'EURUSD-CENT', side: 'buy', entry: 1.085, sl: 1.0825, lots: 1 }), { pips: 25, cash: { amount: 250, ccy: 'USC' }, cent: true, micro: false });
  // اللواحق العادية كما كانت
  assert.equal(journalInstrumentKey('EURUSD.M'), 'EURUSD');
  assert.equal(journalInstrumentKey('GOLD#'), 'XAUUSD');
  assert.deepEqual(pnlInQuoteCcy({ symbol: 'EURUSD.PRO', side: 'buy', entry: 1.085, exit: 1.0875, lots: 0.1 }), { amount: 25, ccy: 'USD' });
}
console.log('tradePlan small-contract suffix selftest OK');

// شرائح الوقف والهدف بالدفتر لحساب سنت/micro: مسافات ومنازل الزوج العادي (`journalSpec`) — كانت بلا شرائح وقف،
// وأهداف 1:1…1:3 بعشر خانات معنوية
{
  assert.equal(journalSpec('EURUSDC')!.symbol, 'EURUSD');
  assert.equal(journalSpec('GOLD.C')!.pipSize, 0.1);
  assert.equal(journalSpec('EURUSDMICRO')!.symbol, 'EURUSD');
  assert.equal(journalSpec('US30C'), null);
  assert.equal(journalSpec(''), null);
  assert.deepEqual(quickStopPips('EURUSDC', 1.085), quickStopPips('EURUSD', 1.085));
  assert.deepEqual(quickStopPips('XAUUSDC', 2400), [30, 50, 100, 200]);
  assert.deepEqual(quickStopPips('USDJPY-MICRO', 157.4), quickStopPips('USDJPY', 157.4));
  assert.equal(stopAtPips({ symbol: 'EURUSDC', side: 'buy', entry: 1.085, pips: 20 }), 1.083);
  assert.equal(stopAtPips({ symbol: 'USDJPYC', side: 'sell', entry: 157.4, pips: 20 }), 157.6);
  assert.equal(stopAtPips({ symbol: 'GOLDMICRO', side: 'buy', entry: 2400, pips: 50 }), 2395);
  for (const rr of [1, 1.5, 2, 3])
    assert.equal(
      targetAtRR({ symbol: 'EURUSDC', side: 'buy', entry: 1.08503, sl: 1.08251, rr }),
      targetAtRR({ symbol: 'EURUSD', side: 'buy', entry: 1.08503, sl: 1.08251, rr }),
      String(rr)
    );
  // 1:1.5 على وقف 24.9 pip = 37.35 pip: 1.08874 بمنزلة الـpipette بعيداً عن الدخول (كانت «1.088735» بست منازل)
  assert.equal(targetAtRR({ symbol: 'EURUSDC', side: 'buy', entry: 1.085, sl: 1.08251, rr: 1.5 }), 1.08874);
  // المال بعقد micro (1,000 وحدة للوت): 25 pip × 1 لوت = 2.50 USD
  assert.deepEqual(draftRiskFigures({ symbol: 'EURUSDMICRO', side: 'buy', entry: 1.085, sl: 1.0825, lots: 1 }), { pips: 25, cash: { amount: 2.5, ccy: 'USD' }, cent: false, micro: true });
  assert.deepEqual(journalSizeLooksLikeUnits(10000, 'EURUSDMICRO'), { lots: null });
  assert.equal(journalSizeLooksLikeUnits(150, 'EURUSD.MICRO'), null);
}
console.log('tradePlan journalSpec chips selftest OK');

// liveEntryOrphaned لحساب سنت/micro: السعر المعبَّأ مفتاحه `quoteSymbol` (الزوج العادي)
{
  const filled = { symbol: 'EURUSD', text: '1.08515' };
  // شريحة GBPUSDc بعد سعر EURUSD ⇒ يُمسح (كان يبقى: صفقة GBPUSDC بدخول 1.08515)
  assert.equal(liveEntryOrphaned({ entryText: '1.08515', symbol: 'GBPUSDC', filled }), true);
  assert.equal(liveEntryOrphaned({ entryText: '1.08515', symbol: 'GBPUSD-cent', filled }), true);
  assert.equal(liveEntryOrphaned({ entryText: '1.08515', symbol: 'XAUUSDmicro', filled }), true);
  // الزوج نفسه بحساب سنت/micro — السعر نفسه ⇒ لا
  assert.equal(liveEntryOrphaned({ entryText: '1.08515', symbol: 'EURUSDc', filled }), false);
  assert.equal(liveEntryOrphaned({ entryText: '1.08515', symbol: 'EURUSDMICRO', filled }), false);
  // عُبّئ لسنت (مفتاحه EURUSD) ثم العادي ⇒ لا؛ ثم زوج آخر ⇒ نعم
  assert.equal(liveEntryOrphaned({ entryText: '1.08515', symbol: 'EURUSD', filled: { symbol: quoteSymbol('EURUSDC')!, text: '1.08515' } }), false);
  assert.equal(liveEntryOrphaned({ entryText: '1.08515', symbol: 'USDJPY', filled: { symbol: quoteSymbol('EURUSDC')!, text: '1.08515' } }), true);
}
console.log('tradePlan liveEntryOrphaned small-contract selftest OK');

// مفتاح أداة واحد لكل كتابات السنت/micro للزوج نفسه — شريحة واحدة وصافٍ واحد
{
  for (const raw of ['EURUSDc', 'EURUSDC', 'EURUSD.c', 'EURUSD-cent', 'EURUSD_CENT', 'EURUSD#c', 'EUR/USD.cent'])
    assert.equal(journalInstrumentKey(raw), 'EURUSDC', raw);
  for (const raw of ['XAUUSDc', 'GOLDC', 'gold.c', 'XAUUSD_cent']) assert.equal(journalInstrumentKey(raw), 'XAUUSDC', raw);
  for (const raw of ['EURUSDmicro', 'EURUSD.micro', 'EURUSD-MICRO']) assert.equal(journalInstrumentKey(raw), 'EURUSDMICRO', raw);
  // السنت ≠ micro ≠ العادي، والمفتاح نفسه سنتٌ/micro (لسطرَي «بلا مال»)
  assert.notEqual(journalInstrumentKey('EURUSDc'), journalInstrumentKey('EURUSDmicro'));
  assert.equal(journalInstrumentKey('EURUSD.m'), 'EURUSD');
  for (const k of ['EURUSDC', 'XAUUSDC', 'USDJPYC']) assert.equal(isCentJournalSymbol(k), true, k);
  for (const k of ['EURUSDMICRO', 'XAUUSDMICRO']) assert.equal(isMicroJournalSymbol(k), true, k);
  // صافٍ واحد: 10 + 15 pip لكتابتين، بلا مال؛ وEURUSD بماله كما كان
  const c = (symbol: string, exit: number) => ({ symbol, side: 'buy', entry: 1.1, exit, size: 0.5, status: 'closed' });
  const rows = netByInstrument([c('EURUSD.C', 1.101), c('EURUSDC', 1.1015), c('EURUSD', 1.102)]);
  assert.deepEqual(rows.find((r) => r.symbol === 'EURUSDC'), { symbol: 'EURUSDC', n: 2, pips: 25, cash: { amount: 125, ccy: 'USC' } });
  assert.deepEqual(rows.find((r) => r.symbol === 'EURUSD'), { symbol: 'EURUSD', n: 1, pips: 20, cash: { amount: 100, ccy: 'USD' } });
  assert.equal(rows.length, 2);
  // شرائح الرمز: كتابة واحدة (الأحدث) للأداة
  assert.deepEqual(quickJournalSymbols([{ symbol: 'EURUSD.c' }, { symbol: 'EURUSDc' }], [], 6), ['EURUSD.C']);
}
console.log('tradePlan small-contract instrument key selftest OK');

{
  // سطر «= X لوت بالحساب العادي» تحت حجم الدفتر: سنت/micro فقط، وحتى حدّ السنت
  assert.equal(journalSmallLotsStdEquiv(4, 'EURUSDc'), '0.04');
  assert.equal(journalSmallLotsStdEquiv(0.5, 'eurusd.micro'), '0.005');
  assert.equal(journalSmallLotsStdEquiv(200, 'XAUUSD_cent'), '2');
  assert.equal(journalSmallLotsStdEquiv(0.01, 'GBPJPYc'), '0.0001');
  for (const s of ['EURUSD', 'XAUUSD', '', null, undefined, 'FOOBAR']) assert.equal(journalSmallLotsStdEquiv(4, s), null, String(s));
  for (const v of [0, -1, NaN, Infinity, null, undefined, 201, 10000]) assert.equal(journalSmallLotsStdEquiv(v, 'EURUSDc'), null, String(v));
}
console.log('tradePlan journal small-lot std equivalent selftest OK');

{
  // المعادن بعملة تسعير بعيدة (الين): pip الـ0.1 نفسه على سعرٍ أكبر 150 مرّة — الشرائح ×100
  assert.deepEqual(quickStopPips('XAUJPY', 352000), [3000, 5000, 10000, 20000]);
  assert.deepEqual(quickStopPips('XAGJPY', 4600), [1000, 2000, 3000, 5000]);
  const st = stopAtPips({ symbol: 'XAUJPY', side: 'buy', entry: 352000, pips: quickStopPips('XAUJPY', 352000)[0] });
  assert.equal(st, 351700); // 300 ين، لا 3
  // الذهب/الفضة بعملات قريبة كما كانت حرفياً (أسعار 2026 المعقولة)
  for (const [sym, px] of [['XAUUSD', 1200], ['XAUUSD', 2400], ['XAUUSD', 3800], ['XAUUSD', 6000], ['XAUEUR', 3300], ['XAUAUD', 5800]] as const)
    assert.deepEqual(quickStopPips(sym, px), [30, 50, 100, 200], `${sym} ${px}`);
  for (const [sym, px] of [['XAGUSD', 15], ['XAGUSD', 32], ['XAGUSD', 70], ['XAGEUR', 28]] as const)
    assert.deepEqual(quickStopPips(sym, px), [10, 20, 30, 50], `${sym} ${px}`);
  assert.deepEqual(quickStopPips('XAUJPY'), [30, 50, 100, 200]); // بلا دخول: لا سعر يُقاس به
  assert.deepEqual(quickStopPips('XAUJPYc', 352000), [3000, 5000, 10000, 20000]);
}
console.log('tradePlan quickStopPips metal-in-JPY selftest OK');

{
  // الجمع كـsum() بايثون 3.12+ (Neumaier) — أرقام CPython الحرفية (repr) لنفس القوائم
  assert.equal(pySum([2.687, 0.91, 1.93, -0.81, 2.46, -2.775, -0.49]), 3.912); // الجمع المباشر 3.912000000000001
  assert.equal(pySum([-2.646, -2.22, -0.613, -2.517, -0.59, 2.3, 2.184, 1.238, 1.096]), -1.7679999999999998);
  assert.equal(pySum([0.4, 1.14, -0.26, -0.612, -2.379, -2.63, 2.908, -2.026, 0.6, -3, 0.22]), -5.639);
  assert.equal(pySum([]), 0);
  assert.equal(pySum([1e308, 1e308]), Infinity); // تعويضٌ غير منتهٍ لا يقلب اللانهاية NaN
  // إحصاءات الدفتر المفلتر = الخادم: round(sum(...), 2) ببايثون
  const st = (p: number[]) => journalStats(p.map((pnl) => ({ status: 'closed', pnl })));
  assert.equal(st([1.946, 0.95, 1.234, -0.71, -0.015, -0.95, 0.43]).total_pnl_pct, 2.88); // كان 2.89
  assert.equal(st([0.635, 0.22, 0.57, -1.891]).avg_win, 0.48); // كان 0.47
}
console.log('tradePlan journalStats python-sum selftest OK');

{
  // «4» كُتبت لـEURUSDC ثم شريحة EURUSD ⇒ 4 لوت عادي (مئة ضعف) — يُقترح 0.04
  assert.deepEqual(journalSizeFromSmall(4, 'EURUSDc', 'EURUSD'), { std: '0.04', prev: 'EURUSDC' });
  assert.deepEqual(journalSizeFromSmall(4, 'EURUSDc', 'GBPUSD'), { std: '0.04', prev: 'EURUSDC' });
  assert.deepEqual(journalSizeFromSmall(50, 'eurusd.micro', 'eurusd'), { std: '0.5', prev: 'EURUSD.MICRO' });
  assert.deepEqual(journalSizeFromSmall(200, 'XAUUSD_cent', 'XAUUSD'), { std: '2', prev: 'XAUUSD_CENT' });
  // الاقتراح بمعنى السنت نفسه: مخاطرة 25 pip بـ«4» سنت = مخاطرة 0.04 لوت عادي (10 USD)، لا 4 لوت (1,000 USD)
  {
    const fix = journalSizeFromSmall(4, 'EURUSDc', 'EURUSD')!;
    const r = draftRiskFigures({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.0825, lots: Number(fix.std) })!;
    assert.ok(Math.abs(r.cash!.amount - 10) < 1e-9);
  }
  // لا تبدّل من صغير إلى عادي ⇒ لا سطر
  assert.equal(journalSizeFromSmall(4, 'EURUSD', 'EURUSD'), null);
  assert.equal(journalSizeFromSmall(4, 'EURUSDc', 'EURUSDc'), null);
  assert.equal(journalSizeFromSmall(4, 'EURUSDc', 'GBPUSDc'), null);
  assert.equal(journalSizeFromSmall(0.04, 'EURUSD', 'EURUSDc'), null);
  assert.equal(journalSizeFromSmall(4, '', 'EURUSD'), null);
  assert.equal(journalSizeFromSmall(4, null, 'EURUSD'), null);
  // الرمز الحالي مجهول (وسط الكتابة) ⇒ لا سطر بعد
  for (const s of ['EURUS', '', 'FOOBAR', null]) assert.equal(journalSizeFromSmall(4, 'EURUSDc', s), null, String(s));
  // حجم غير صالح أو فوق حدّ السنت (سطر الوحدات يتكفّل به)
  for (const v of [0, -1, NaN, Infinity, null, undefined, 201]) assert.equal(journalSizeFromSmall(v, 'EURUSDc', 'EURUSD'), null, String(v));
}
console.log('tradePlan journal size from small contract selftest OK');

// journalPnl / journalRisk — مال صفقات السنت/micro بالدفتر (USC لسنت الدولار، عقد ÷100 لغيره)؛ العادي كما كان حرفياً
{
  const p = (symbol: string, side: 'buy' | 'sell', entry: number, exit: number, lots: number) => journalPnl({ symbol, side, entry, exit, lots });
  // عادي = pnlInQuoteCcy حرفياً
  for (const [s, side, e, x, l] of [['EURUSD', 'buy', 1.085, 1.0875, 0.5], ['usdjpy', 'sell', 150, 149.2, 1.3], ['XAUUSD.m', 'buy', 2400, 2391.35, 0.07], ['GOLDm', 'sell', 2400, 2390, 0.2]] as const)
    assert.deepEqual(p(s, side, e, x, l), pnlInQuoteCcy({ symbol: s, side, entry: e, exit: x, lots: l }), s);
  // Exness Cent: EURUSDc 4 لوت (= 4,000 وحدة) +25 pip = 10 USD = 1,000 USC
  assert.deepEqual(p('EURUSDc', 'buy', 1.085, 1.0875, 4), { amount: 1000, ccy: 'USC' });
  assert.deepEqual(p('EURUSD.c', 'sell', 1.085, 1.0875, 4), { amount: -1000, ccy: 'USC' });
  // ذهب سنت: 1 لوت = أونصة؛ +10 دولار سعراً = 10 USD = 1,000 USC
  assert.deepEqual(p('XAUUSDc', 'buy', 2400, 2410, 1), { amount: 1000, ccy: 'USC' });
  assert.deepEqual(p('GOLDC', 'buy', 2400, 2410, 1), { amount: 1000, ccy: 'USC' });
  // سنت بالين: 2 لوت سنت = 2,000 وحدة × 0.8 = 1,600 JPY (لا USC: لا سعر تحويل هنا)
  assert.deepEqual(p('USDJPYc', 'buy', 150, 150.8, 2), { amount: 1600, ccy: 'JPY' });
  // micro بعملة التسعير بعقد 1,000: 4 لوت × 25 pip = 10 USD؛ EURGBP micro بالجنيه
  assert.deepEqual(p('EURUSDmicro', 'buy', 1.085, 1.0875, 4), { amount: 10, ccy: 'USD' });
  assert.deepEqual(p('EURGBP.micro', 'sell', 0.86, 0.855, 1), { amount: 5, ccy: 'GBP' });
  // micro 0.01 لوت (10 وحدات) × 25 pip = 0.025 ⇒ 0.03 (تقريب pnlInQuoteCcy متماثل)
  assert.deepEqual(p('EURUSDmicro', 'buy', 1.085, 1.0875, 0.01), pnlInQuoteCcy({ symbol: 'EURUSD', side: 'buy', entry: 1.085, exit: 1.0875, lots: 0.0001 }));
  // مجهول/غير صالح
  for (const s of ['US30', 'BTCUSDC', 'EURUSDT', '']) assert.equal(p(s, 'buy', 1.085, 1.0875, 1), null, s);
  for (const l of [0, -1, NaN]) assert.equal(p('EURUSDc', 'buy', 1.085, 1.0875, l), null, String(l));
  // المخاطرة بالطريقة نفسها وموجبة
  assert.deepEqual(journalRisk({ symbol: 'EURUSDc', entry: 1.085, sl: 1.0825, lots: 4 }), { amount: 1000, ccy: 'USC' });
  assert.deepEqual(journalRisk({ symbol: 'EURUSDmicro', entry: 1.085, sl: 1.0875, lots: 4 }), { amount: 10, ccy: 'USD' });
  assert.deepEqual(journalRisk({ symbol: 'USDJPYC', entry: 150, sl: 149.7, lots: 2 }), { amount: 600, ccy: 'JPY' });
  assert.equal(journalRisk({ symbol: 'EURUSDc', entry: 1.085, sl: 1.085, lots: 4 }), null);
  // معاينة الخروج بالمسطرة نفسها
  assert.deepEqual(exitPreview({ symbol: 'EURUSDC', side: 'buy', entry: 1.085, sl: 1.0825, exit: 1.0875, lots: 4 })!.cash, { amount: 1000, ccy: 'USC' });
  // الصافي لكل أداة: 50 + 75 = 125 USC لكتابتين للسنت
  const c = (symbol: string, exit: number) => ({ symbol, side: 'buy', entry: 1.1, exit, size: 0.5, status: 'closed' });
  assert.deepEqual(netByInstrument([c('EURUSD.C', 1.101), c('EURUSDc', 1.1015)])[0], { symbol: 'EURUSDC', n: 2, pips: 25, cash: { amount: 125, ccy: 'USC' } });
  // إجمالي النسبة يعاكس المال: سنت الدولار يُجمع مع الدولار (÷100) — EURUSD +20 USD وEURUSDc −5,000 USC (−50 USD) ⇒ صافٍ خاسر
  const mix = [
    { symbol: 'EURUSD', side: 'buy', entry: 1.1, exit: 1.102, size: 0.1, status: 'closed' },
    { symbol: 'EURUSDc', side: 'buy', entry: 1.1, exit: 1.095, size: 10, status: 'closed' },
  ];
  assert.equal(pnlPctContradictsCash(mix, 0.1), true);
  assert.equal(pnlPctContradictsCash(mix, -0.1), false);
}
console.log('tradePlan journalPnl cent/micro money selftest OK');

// formatJournalMoney — USC بقالب journalMoneyUsc، وغيره formatMoney كما كان
{
  const tpl = '{usc} USC (≈ {usd} USD)';
  assert.equal(formatJournalMoney({ amount: 1000, ccy: 'USC' }, tpl), '1,000.00 USC (≈ 10.00 USD)');
  assert.equal(formatJournalMoney({ amount: 1000, ccy: 'USC' }, tpl, true), '+1,000.00 USC (≈ +10.00 USD)');
  assert.equal(formatJournalMoney({ amount: -250, ccy: 'USC' }, tpl, true), '−250.00 USC (≈ −2.50 USD)');
  assert.equal(formatJournalMoney({ amount: 0.5, ccy: 'USC' }, tpl), '0.50 USC (≈ 0.01 USD)');
  assert.equal(formatJournalMoney({ amount: 125, ccy: 'USD' }, tpl, true), '+125.00 USD');
  assert.equal(formatJournalMoney({ amount: -1600, ccy: 'JPY' }, tpl, true), '−1,600 JPY');
  assert.equal(formatJournalMoney({ amount: 0, ccy: 'USC' }, tpl, true), '0.00 USC (≈ 0.00 USD)');
}
// الإشارة تتبع الرقم المعروض: ربحٌ يُقرَّب صفراً بلا «+»، كالخسارة المقرَّبة صفراً بلا «−» (كانا «+0 JPY» مقابل «0 JPY»)
{
  const tpl = '{usc} USC (≈ {usd} USD)';
  assert.equal(formatJournalMoney({ amount: 0.04, ccy: 'USC' }, tpl, true), '+0.04 USC (≈ 0.00 USD)');
  assert.equal(formatJournalMoney({ amount: -0.04, ccy: 'USC' }, tpl, true), '−0.04 USC (≈ 0.00 USD)');
  assert.equal(formatJournalMoney({ amount: 0.2, ccy: 'JPY' }, tpl, true), '0 JPY');
  assert.equal(formatJournalMoney({ amount: -0.2, ccy: 'JPY' }, tpl, true), '0 JPY');
  assert.equal(formatJournalMoney({ amount: 0.6, ccy: 'JPY' }, tpl, true), '+1 JPY');
  assert.equal(formatJournalMoney({ amount: 0.004, ccy: 'USD' }, tpl, true), '0.00 USD');
  assert.equal(formatJournalMoney({ amount: 0.005, ccy: 'USD' }, tpl, true), '+0.01 USD');
  assert.equal(formatJournalMoney({ amount: 1.5, ccy: 'USC' }, tpl, true), '+1.50 USC (≈ +0.02 USD)');
}
console.log('tradePlan formatJournalMoney selftest OK');

// حجم سطر الدفتر بمنازله الكاملة (كان toFixed(2): 0.004 ⇒ «0 lot»)
{
  assert.equal(formatJournalLots(0.004), '0.004');
  assert.equal(formatJournalLots(0.015), '0.015');
  assert.equal(formatJournalLots(0.1 + 0.2), '0.3');
  assert.equal(formatJournalLots(1), '1');
  assert.equal(formatJournalLots(2.5), '2.5');
  assert.equal(formatJournalLots(0.01), '0.01');
}
console.log('tradePlan formatJournalLots selftest OK');

// knownLots يقرأ «1.00 lot» من ملاحظة الحاسبة بكلمات عربية/كردية
{
  const note = planJournalNote({ lots: 1, risk: 100, ccy: 'USD', rr: '1:2', spreadPips: 1.5, words: { risk: 'المخاطرة', spread: 'سبريد' } });
  assert.equal(knownLots(1, note), 1);
  assert.equal(knownLots(1, planJournalNote({ lots: 1, risk: null, ccy: 'USD', rr: '1:2', words: { risk: 'مەترسی' } })), 1);
}
console.log('tradePlan knownLots localized plan note selftest OK');

// planSummaryText — سطر الخطة المشترك (الدفتر، ولوحة الأفكار حين تنتقل إليه)
{
  const w = { risk: 'Risk', reward: 'Reward' };
  const plan = analyzePlan({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.0825, tp: 1.09 });
  assert.equal(planSummaryText(plan, w), 'Risk 25 pip · Reward 50 pip · R:R 1:2.0');
  assert.equal(planSummaryText(plan, w, '125.00 USD', '250.00 USD'), 'Risk 25 pip (125.00 USD) · Reward 50 pip (250.00 USD) · R:R 1:2.0');
  assert.equal(planSummaryText(plan, w, null, '250.00 USD'), 'Risk 25 pip · Reward 50 pip (250.00 USD) · R:R 1:2.0');
  assert.equal(planSummaryText(plan, w, '', ''), 'Risk 25 pip · Reward 50 pip · R:R 1:2.0');
  // بلا مواصفات pip: فرق السعر منظَّفاً لخمس منازل
  const us30 = analyzePlan({ symbol: 'US30', side: 'sell', entry: 39000, sl: 39100, tp: 38800 });
  assert.equal(planSummaryText(us30, w), 'Risk 100 · Reward 200 · R:R 1:2.0');
  // SHIB: المسافة دون 0.00001 كانت «Risk 0 · Reward 0» — الآن أربعة أرقام معنوية بلا صيغة أُسّية
  const shib = analyzePlan({ symbol: 'SHIBUSD', side: 'buy', entry: 0.00001234, sl: 0.000012, tp: 0.00001302 });
  assert.equal(planSummaryText(shib, w), 'Risk 0.00000034 · Reward 0.00000068 · R:R 1:2.0');
  assert.equal(priceDistanceText(0.00000123456), '0.000001235');
  assert.equal(priceDistanceText(1e-9), '0.000000001');
  // من 0.001 فما فوق: خمس منازل كما كان
  assert.equal(priceDistanceText(0.0012345678), '0.00123');
  assert.equal(priceDistanceText(25.123456), '25.12346');
  assert.equal(priceDistanceText(0.1 + 0.2), '0.3');
  assert.equal(priceDistanceText(100), '100');
  assert.equal(priceDistanceText(0.00005), '0.00005');
  assert.equal(priceDistanceText(0), '0');
}
console.log('tradePlan planSummaryText selftest OK');

// floatingExitPrice — الصفّ العائم على سعر الإغلاق الفعلي (Bid للشراء، Ask للبيع) كـ«أغلق بسعر السوق»
{
  const close = (a: number | null, b: number) => {
    assert.ok(a != null && Math.abs(a - b) < 1e-9, `${a} ≠ ${b}`);
  };
  // المثال الذي كان خاطئاً: ذهب، وسطي 2650.00، Bid 2649.80 / Ask 2650.20، شراء 1 لوت من 2645.00
  const snap = { price: 2650, bid: 2649.8, ask: 2650.2 };
  close(floatingExitPrice({ side: 'buy', snap }), 2649.8);
  close(floatingExitPrice({ side: 'sell', snap }), 2650.2);
  // يطابق executionPrice(…, 'close') حرفياً بلا تيك
  assert.equal(floatingExitPrice({ side: 'buy', snap }), executionPrice(snap, 'buy', 'close'));
  assert.equal(floatingExitPrice({ side: 'sell', snap }), executionPrice(snap, 'sell', 'close'));
  // المال: 5.00 × 100 أوقية = 500 بالوسطي، و480 على Bid
  const midCash = journalPnl({ symbol: 'XAUUSD', side: 'buy', entry: 2645, exit: 2650, lots: 1 });
  const bidCash = journalPnl({
    symbol: 'XAUUSD', side: 'buy', entry: 2645, exit: floatingExitPrice({ side: 'buy', snap }) as number, lots: 1,
  });
  assert.ok(midCash && Math.abs(midCash.amount - 500) < 1e-6);
  assert.ok(bidCash && Math.abs(bidCash.amount - 480) < 1e-6);
  // تيكٌ حيّ تحرّك: إزاحة اللقطة (−0.20 شراء / +0.20 بيع) على التيك
  close(floatingExitPrice({ side: 'buy', live: 2652, snap }), 2651.8);
  close(floatingExitPrice({ side: 'sell', live: 2652, snap }), 2652.2);
  // EURUSD: وسطي 1.08510، Bid 1.08500 / Ask 1.08520، تيك 1.08600
  const eu = { price: 1.0851, bid: 1.085, ask: 1.0852 };
  close(floatingExitPrice({ side: 'buy', live: 1.086, snap: eu }), 1.0859);
  close(floatingExitPrice({ side: 'sell', live: 1.086, snap: eu }), 1.0861);
  // بلا لقطة، أو لقطة بلا Bid/Ask ⇒ السعر المفرد كما كان
  assert.equal(floatingExitPrice({ side: 'buy', live: 1.086 }), 1.086);
  assert.equal(floatingExitPrice({ side: 'buy', live: 1.086, snap: null }), 1.086);
  assert.equal(floatingExitPrice({ side: 'buy', live: 1.086, snap: { price: 1.0851 } }), 1.086);
  assert.equal(floatingExitPrice({ side: 'sell', snap: { price: 1.0851, bid: null, ask: null } }), 1.0851);
  // Bid وحده (بيع يحتاج Ask) ⇒ لا إزاحة
  assert.equal(floatingExitPrice({ side: 'sell', live: 1.086, snap: { price: 1.0851, bid: 1.085 } }), 1.086);
  // لقطة فاسدة: Bid فوق Ask، Bid فوق السعر، سبريد > 1% ⇒ لا إزاحة
  assert.equal(floatingExitPrice({ side: 'buy', live: 1.086, snap: { price: 1.0851, bid: 1.0853, ask: 1.0852 } }), 1.086);
  assert.equal(floatingExitPrice({ side: 'buy', live: 1.086, snap: { price: 1.0851, bid: 1.0852, ask: 1.0853 } }), 1.086);
  assert.equal(floatingExitPrice({ side: 'buy', live: 1.086, snap: { price: 1.0851, bid: 1.07, ask: 1.1 } }), 1.086);
  // تيك غير صالح ⇒ سعر اللقطة بجهة الإغلاق؛ لا شيء صالح ⇒ null
  for (const bad of [null, undefined, 0, -1, NaN, Infinity]) {
    close(floatingExitPrice({ side: 'buy', live: bad, snap: eu }), 1.085);
    assert.equal(floatingExitPrice({ side: 'buy', live: bad }), null);
    assert.equal(floatingExitPrice({ side: 'buy', live: bad, snap: { price: NaN, bid: 1.085, ask: 1.0852 } }), null);
  }
}
console.log('tradePlan floatingExitPrice selftest OK');

// —— openRiskTotals: مجموع المخاطرة المفتوحة لكل عملة تسعير
{
  const T = (o: Partial<{ symbol: string; side: string; entry: number; sl: number | null; size: number | null; note: string | null; status: string }>) => ({
    symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.083, size: 0.5, note: null, status: 'open', ...o,
  });
  // EURUSD 0.5 لوت، وقف 20 pip: 0.0020 × 100,000 × 0.5 = 100 USD
  // GBPUSD بيع 0.3 لوت من 1.2700 ووقف 1.2750 (50 pip): 0.0050 × 100,000 × 0.3 = 150 USD
  // USDJPY شراء 1 لوت من 150.00 ووقف 149.50 (50 pip): 0.50 × 100,000 × 1 = 50,000 JPY
  const r = openRiskTotals([
    T({}),
    T({ symbol: 'GBPUSD', side: 'sell', entry: 1.27, sl: 1.275, size: 0.3 }),
    T({ symbol: 'USDJPY', entry: 150, sl: 149.5, size: 2 }),
    T({ status: 'closed', size: 10 }), // المغلقة لا تدخل
  ])!;
  assert.equal(r.n, 3);
  assert.deepEqual(r.totals, [
    { amount: 250, ccy: 'USD' },
    { amount: 100_000, ccy: 'JPY' },
  ]);
  // وقفٌ نُقل للتعادل أو لجهة الربح ⇒ 0 (لا |الدخول − الوقف|)
  const be = openRiskTotals([T({ sl: 1.085 }), T({ sl: 1.087 }), T({ side: 'sell', sl: 1.08 })])!;
  assert.deepEqual(be.totals, [{ amount: 0, ccy: 'USD' }]);
  assert.equal(be.n, 3);
  // وقفٌ بجهة الربح لا يُنقص مخاطرة صفقة أخرى
  assert.deepEqual(openRiskTotals([T({}), T({ sl: 1.09 })])!.totals, [{ amount: 100, ccy: 'USD' }]);
  // الكلّ أو لا شيء: بلا وقف / حجم مجهول (1 الافتراضي) / أداة بلا مواصفات ⇒ null
  assert.equal(openRiskTotals([T({}), T({ sl: null })]), null);
  assert.equal(openRiskTotals([T({}), T({ size: 1 })]), null);
  assert.equal(openRiskTotals([T({}), T({ size: null })]), null);
  assert.equal(openRiskTotals([T({}), T({ symbol: 'NOTAPAIR' })]), null);
  // 1 مكتوب بعلامة «1.00 lot» معروف: 0.0020 × 100,000 = 200
  assert.deepEqual(openRiskTotals([T({ size: 1, note: '1.00 lot · risk 200.00 USD' })])!.totals, [{ amount: 200, ccy: 'USD' }]);
  // لا مفتوحة ⇒ null
  assert.equal(openRiskTotals([T({ status: 'closed' })]), null);
  assert.equal(openRiskTotals([]), null);
  // الذهب: 1 لوت = 100 أونصة، وقف 5 دولار ⇒ 500 USD؛ مع EURUSD بالعملة نفسها ⇒ 600
  assert.deepEqual(openRiskTotals([T({ symbol: 'XAUUSD', entry: 2650, sl: 2645, size: 1, note: '1.00 lot' }), T({})])!.totals, [
    { amount: 600, ccy: 'USD' },
  ]);
  // سنت الدولار: USC كسطر الصفقة (`journalRisk`) — 1 لوت سنت، 20 pip ⇒ 0.0020 × 100,000 = 200 USC
  const c = openRiskTotals([T({ symbol: 'EURUSDc', size: 1, note: '1.00 lot' })])!;
  assert.deepEqual(c.totals, [{ amount: 200, ccy: 'USC' }]);
  // مطابقة `journalRisk` صفقةً صفقة
  const one = T({ symbol: 'GBPJPY', entry: 190.5, sl: 190.123, size: 0.37 });
  assert.deepEqual(openRiskTotals([one])!.totals, [journalRisk({ symbol: 'GBPJPY', entry: 190.5, sl: 190.123, lots: 0.37 })]);
}
console.log('tradePlan openRiskTotals selftest OK');

// —— openTradesWithoutStop: سبب غياب سطر «المخاطرة (مفتوحة)»
{
  const T = (o: Partial<{ symbol: string; side: string; entry: number; sl: number | null; size: number | null; note: string | null; status: string }>) => ({
    symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.083 as number | null, size: 0.5, note: null, status: 'open', ...o,
  });
  assert.equal(openTradesWithoutStop([]), 0);
  assert.equal(openTradesWithoutStop([T({})]), 0);
  // غائب/صفر/سالب/NaN/Infinity ⇒ بلا وقف؛ المغلقة لا تُعدّ
  const list = [T({ sl: null }), T({ sl: 0 }), T({ sl: -1 }), T({ sl: NaN }), T({ sl: Infinity }), T({ sl: null, status: 'closed' }), T({})];
  assert.equal(openTradesWithoutStop(list), 5);
  // حقل غائب كلياً (صفقة قديمة من الخادم) = بلا وقف
  assert.equal(openTradesWithoutStop([{ status: 'open' }]), 1);
  // اتّساق مع openRiskTotals: كلّما عُدّت صفقة بلا وقف فالمجموع null — لا يظهر السطران معاً
  for (const tr of list) {
    const arr = [T({}), tr];
    if (openTradesWithoutStop(arr) > 0) assert.equal(openRiskTotals(arr), null);
  }
  // وقفٌ صالح بجهة الربح ليس «بلا وقف»
  assert.equal(openTradesWithoutStop([T({ sl: 1.09 })]), 0);
}
console.log('tradePlan openTradesWithoutStop selftest OK');

// —— openTradesUnknownRisk: حجمٌ مجهول أو أداةٌ بلا عقد ⇒ سببٌ لغياب السطر بدل الصمت
{
  const T = (o: Partial<{ symbol: string; side: string; entry: number; sl: number | null; size: number | null; note: string | null; status: string }>) => ({
    symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.083 as number | null, size: 0.5, note: null as string | null, status: 'open', ...o,
  });
  assert.equal(openTradesUnknownRisk([]), 0);
  assert.equal(openTradesUnknownRisk([T({})]), 0);
  // أداة بلا عقد معروف، وحجمٌ غائب
  const btc = T({ symbol: 'BTCUSD', entry: 60000, sl: 59000 });
  const us30 = T({ symbol: 'US30', entry: 42000, sl: 42100, side: 'sell' });
  const noSize = T({ size: null });
  assert.equal(openTradesUnknownRisk([T({}), btc, us30, noSize]), 3);
  // كان: السطر يختفي بلا سبب (المجموع null ولا صفقة بلا وقف)
  assert.equal(openRiskTotals([T({}), btc]), null);
  assert.equal(openTradesWithoutStop([T({}), btc]), 0);
  assert.equal(openTradesUnknownRisk([T({}), btc]), 1);
  // بلا وقف تُعدّ هناك لا هنا؛ المغلقة لا تُعدّ
  assert.equal(openTradesUnknownRisk([T({ symbol: 'BTCUSD', sl: null }), T({ symbol: 'BTCUSD', entry: 60000, sl: 59000, status: 'closed' })]), 0);
  // اتّساق: لا صفقة مجهولة ولا بلا وقف ⇒ المجموع موجود
  const ok = [T({}), T({ symbol: 'USDJPY', entry: 150, sl: 149.5 }), T({ symbol: 'XAUUSD', entry: 2650, sl: 2660, side: 'sell', size: 0.1 })];
  assert.equal(openTradesUnknownRisk(ok), 0);
  assert.notEqual(openRiskTotals(ok), null);
}
console.log('tradePlan openTradesUnknownRisk selftest OK');

// QUICK_SYMBOLS: ثابت واحد للوحات الأربع (QA6) — كل شريحة رمزٌ يُحفظ كما هو وله مواصفات (pip/عقد) بالحاسبة والدفتر
{
  assert.equal(QUICK_SYMBOLS.length, 6);
  assert.equal(new Set(QUICK_SYMBOLS).size, QUICK_SYMBOLS.length);
  for (const s of QUICK_SYMBOLS) {
    assert.equal(journalSymbol(s), s, s);
    assert.ok(instrumentSpec(s), s);
    assert.ok(journalPipSize(s), s);
  }
  // الدفتر: بلا صفقات ⇒ الشرائح هي الافتراضية بترتيبها
  assert.deepEqual(quickJournalSymbols([], QUICK_SYMBOLS), [...QUICK_SYMBOLS]);
}
console.log('tradePlan QUICK_SYMBOLS selftest OK');

// stackedCurrencyExposure: اتجاهٌ لا حجم — عملات تراهن عليها ≥2 مفتوحة بالاتجاه نفسه
{
  const o = (symbol: string, side: string, status = 'open') => ({ symbol, side, status });
  // المثال الأصلي: شراء EURUSD + شراء GBPUSD + بيع USDJPY = ثلاث مرّات بيع الدولار
  assert.deepEqual(stackedCurrencyExposure([o('EURUSD', 'buy'), o('GBPUSD', 'buy'), o('USDJPY', 'sell')]), [
    { ccy: 'USD', n: 3, dir: 'short' },
  ]);
  // تحوّط: شراء EURUSD + شراء USDCHF ⇒ الدولار بساقين متعاكستين ⇒ لا سطر
  assert.deepEqual(stackedCurrencyExposure([o('EURUSD', 'buy'), o('USDCHF', 'buy')]), []);
  // صفقة واحدة ⇒ لا تراكم
  assert.deepEqual(stackedCurrencyExposure([o('EURUSD', 'buy')]), []);
  // المغلقة لا تُحسب
  assert.deepEqual(stackedCurrencyExposure([o('EURUSD', 'buy'), o('GBPUSD', 'buy', 'closed')]), []);
  // الزوج نفسه مرّتين ⇒ سطرٌ واحد بعملة الأساس لا EUR وUSD معاً
  assert.deepEqual(stackedCurrencyExposure([o('EURUSD', 'buy'), o('EURUSD', 'buy')]), [{ ccy: 'EUR', n: 2, dir: 'long' }]);
  assert.deepEqual(stackedCurrencyExposure([o('USDJPY', 'sell'), o('USDJPY', 'sell')]), [{ ccy: 'USD', n: 2, dir: 'short' }]);
  // الزوج نفسه بيعاً وشراءً ⇒ تحوّط تام
  assert.deepEqual(stackedCurrencyExposure([o('EURUSD', 'buy'), o('EURUSD', 'sell')]), []);
  // الذهب ساقُ USD كأيّ زوج؛ «GOLD» اسم وسيط للأداة نفسها؛ لاحقة وسيط وأحرف صغيرة
  assert.deepEqual(stackedCurrencyExposure([o('XAUUSD', 'buy'), o('eurusd.m', 'buy')]), [{ ccy: 'USD', n: 2, dir: 'short' }]);
  assert.deepEqual(stackedCurrencyExposure([o('GOLD', 'buy'), o('XAUUSD', 'buy')]), [{ ccy: 'XAU', n: 2, dir: 'long' }]);
  // أداة بلا مواصفات تُتخطّى ولا تُسقط الباقي
  assert.deepEqual(stackedCurrencyExposure([o('NAS100', 'buy'), o('EURJPY', 'sell'), o('GBPJPY', 'sell')]), [
    { ccy: 'JPY', n: 2, dir: 'long' },
  ]);
  // عملتان متراكمتان بمجموعتين مختلفتين: الأكثر صفقات أولاً
  assert.deepEqual(
    stackedCurrencyExposure([o('EURUSD', 'buy'), o('GBPUSD', 'buy'), o('AUDUSD', 'buy'), o('EURJPY', 'buy')]),
    [
      { ccy: 'USD', n: 3, dir: 'short' },
      { ccy: 'EUR', n: 2, dir: 'long' },
    ]
  );
  // سنت/micro: عقدٌ أصغر لكن الاتجاه نفسه
  assert.deepEqual(stackedCurrencyExposure([o('EURUSDC', 'buy'), o('GBPUSD.micro', 'buy')]), [{ ccy: 'USD', n: 2, dir: 'short' }]);
  assert.deepEqual(stackedCurrencyExposure([]), []);
}
console.log('tradePlan stackedCurrencyExposure selftest OK');

// ---- الوقف الأصلي «1R @ …»: R من المخاطرة التي دخل بها المتداول لا من وقفٍ حُرِّك بعدها ----
{
  const open = { side: 'buy', entry: 1.085, sl: 1.083, status: 'open' };
  // مثال التدقيق حرفياً: شدّ الوقف إلى 1.0845 ثم الخروج 1.0890 = +2R لا +8R
  const n1 = noteWithInitialStop({ symbol: 'EURUSD', note: '', before: open, after: { side: 'buy', entry: 1.085, sl: 1.0845 } });
  assert.equal(n1, '1R @ 1.083');
  assert.equal(realizedR({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.0845, exit: 1.089 }), 8); // قبلُ
  assert.equal(realizedR({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.0845, exit: 1.089, note: n1 }), 2);
  // ومتوسط R مع صفقة −1R: +0.5R لا +3.5R
  const avg = averageR([
    { symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.0845, exit: 1.089, note: n1, status: 'closed' },
    { symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.083, exit: 1.083, status: 'closed' },
  ])!;
  assert.deepEqual(avg, { r: 0.5, n: 2 });
  // نقلٌ للتعادل/حجز ربح: الوقف على الدخول أو خلفه ما زال يُحسب R من الأصلي؛ ضرب وقف التعادل = 0R
  const be = noteWithInitialStop({ symbol: 'EURUSD', note: 'breakout', before: open, after: { side: 'buy', entry: 1.085, sl: 1.085 } });
  assert.equal(be, 'breakout · 1R @ 1.083');
  assert.equal(realizedR({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.085, exit: 1.085, note: be }), 0);
  assert.equal(realizedR({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.086, exit: 1.086, note: be }), 0.5);
  assert.equal(trailedStopAllowed({ symbol: 'EURUSD', side: 'buy', entry: 1.085, note: be }), true);
  assert.equal(trailedStopAllowed({ symbol: 'EURUSD', side: 'buy', entry: 1.085, note: 'breakout' }), false);
  // بيع USDJPY: الوقف يُشدّ للأسفل
  const sj = noteWithInitialStop({
    symbol: 'USDJPY',
    note: '1.00 lot',
    before: { side: 'sell', entry: 150, sl: 150.3, status: 'open' },
    after: { side: 'sell', entry: 150, sl: 149.9 },
  });
  assert.equal(sj, '1.00 lot · 1R @ 150.3');
  assert.equal(knownLotsForMark(1, sj), 1); // علامة الحجم «1.00 lot» لا تنكسر
  assert.equal(realizedR({ symbol: 'USDJPY', side: 'sell', entry: 150, sl: 149.9, exit: 149.4, note: sj }), 2);
  // علامة واحدة فقط: الشدّ الثاني يُبقي الأصلي
  assert.equal(
    noteWithInitialStop({ symbol: 'EURUSD', note: n1, before: { ...open, sl: 1.0845 }, after: { side: 'buy', entry: 1.085, sl: 1.086 } }),
    n1
  );
  // لا علامة: مغلقة (تصحيح)، توسيع، بلا تغيير، بلا وقف قديم/جديد، اتجاه أو دخول تغيّر، وقف قديم بالجهة الخطأ أو أضيق من pip
  const nw = (before: object, after: object, symbol = 'EURUSD') =>
    noteWithInitialStop({ symbol, note: 'x', before: { ...open, ...before }, after: { side: 'buy', entry: 1.085, sl: 1.0845, ...after } as never });
  assert.equal(nw({ status: 'closed' }, {}), 'x');
  assert.equal(nw({}, { sl: 1.083 }), 'x');
  assert.equal(nw({ sl: null }, {}), 'x');
  assert.equal(nw({ sl: null }, { sl: null }), 'x');
  // توسيع الوقف أو مسحه يُلحق العلامة أيضاً: الخسارة تُقاس بالمخاطرة الأصلية
  assert.equal(nw({}, { sl: 1.082 }), 'x · 1R @ 1.083');
  assert.equal(nw({}, { sl: null }), 'x · 1R @ 1.083');
  {
    // مثال التدقيق: مسح الوقف ثم الإغلاق 1.0800 = −2.5R (كان null فتسقط من المتوسط: +1.5R بدل −0.5R)
    const cleared = noteWithInitialStop({ symbol: 'EURUSD', note: '', before: open, after: { side: 'buy', entry: 1.085, sl: null } });
    assert.equal(cleared, '1R @ 1.083');
    assert.equal(realizedR({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: null, exit: 1.08, note: cleared }), -2.5);
    assert.deepEqual(
      averageR([
        { symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: null, exit: 1.08, note: cleared, status: 'closed' },
        { symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.083, exit: 1.088, status: 'closed' },
      ]),
      { r: -0.5, n: 2 }
    );
    // توسيع إلى 1.0810 ثم ضربه = −2R لا −1R
    const wide = noteWithInitialStop({ symbol: 'EURUSD', note: '', before: open, after: { side: 'buy', entry: 1.085, sl: 1.081 } });
    assert.equal(wide, '1R @ 1.083');
    assert.equal(realizedR({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.081, exit: 1.081, note: wide }), -2);
    // توسيع ثم تعادل: العلامة تبقى الأصلية (1.083) لا الموسَّعة
    assert.equal(
      noteWithInitialStop({ symbol: 'EURUSD', note: wide, before: { ...open, sl: 1.081 }, after: { side: 'buy', entry: 1.085, sl: 1.085 } }),
      wide
    );
    // بيع: التوسيع للأعلى
    const sw = noteWithInitialStop({
      symbol: 'USDJPY',
      note: '',
      before: { side: 'sell', entry: 150, sl: 150.3, status: 'open' },
      after: { side: 'sell', entry: 150, sl: 150.6 },
    });
    assert.equal(sw, '1R @ 150.3');
    assert.equal(realizedR({ symbol: 'USDJPY', side: 'sell', entry: 150, sl: 150.6, exit: 150.6, note: sw }), -2);
  }
  assert.equal(nw({ side: 'sell' }, {}), 'x');
  assert.equal(nw({}, { entry: 1.0851 }), 'x');
  assert.equal(nw({ sl: 1.086 }, { sl: 1.087 }), 'x');
  assert.equal(nw({ sl: 1.08499 }, { sl: 1.08499 + 0.000005 }), 'x');
  // حدّ الخادم 500: علامة تتجاوزه لا تُلحق (الحفظ كان سيفشل كلّه)
  const long = 'a'.repeat(JOURNAL_NOTE_MAX - 5);
  assert.equal(noteWithInitialStop({ symbol: 'EURUSD', note: long, before: open, after: { side: 'buy', entry: 1.085, sl: 1.0845 } }), long);
  // قراءة العلامة: مقطعٌ كامل فقط، وصالحٌ لهذا الدخول والاتجاه، وإلا R من `sl` كما كان
  assert.equal(initialStop({ symbol: 'EURUSD', side: 'buy', entry: 1.085, note: 'a · 1R @ 1.083 · b' }), 1.083);
  assert.equal(initialStop({ symbol: 'EURUSD', side: 'buy', entry: 1.085, note: 'x1R @ 1.083' }), null);
  assert.equal(initialStop({ symbol: 'EURUSD', side: 'buy', entry: 1.085, note: '1R @ 1.083x' }), null);
  // نصٌّ كُتب بعد العلامة الملحقة بآخر الملاحظة: كان null ⇒ R من الوقف المشدود (+8R بدل +2R)
  for (const note of ['1R @ 1.083 moved to reduce risk', '1R @ 1.083, NFP', '1R @ 1.083، خبر', '1R @ 1.083.', 'BE · 1R @ 1.083 then TP', 'x 1R @ 1.083;'])
    assert.equal(initialStop({ symbol: 'EURUSD', side: 'buy', entry: 1.085, note }), 1.083, note);
  assert.equal(
    realizedR({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.0845, exit: 1.089, note: '1R @ 1.083 moved to reduce risk' })!.toFixed(6),
    '2.000000'
  );
  // رقمٌ ملتصق/أطول ليس العلامة: «1.0833» لا يُقرأ «1.083»، ولا «21R @»
  assert.equal(initialStop({ symbol: 'EURUSD', side: 'buy', entry: 1.085, note: '1R @ 1.0833' }), 1.0833);
  assert.equal(initialStop({ symbol: 'EURUSD', side: 'buy', entry: 1.085, note: '21R @ 1.083' }), null);
  assert.equal(initialStop({ symbol: 'EURUSD', side: 'buy', entry: 1.085, note: '1R @ 1.083تم' }), null);
  assert.equal(initialStop({ symbol: 'EURUSD', side: 'sell', entry: 1.085, note: n1 }), null);
  assert.equal(initialStop({ symbol: 'EURUSD', side: 'buy', entry: 1.08, note: n1 }), null);
  assert.equal(initialStop({ symbol: 'EURUSD', side: 'buy', entry: 1.08305, note: n1 }), null); // أضيق من pip
  assert.equal(initialStop({ symbol: 'EURUSD', side: 'buy', entry: 1.085, note: null }), null);
  assert.equal(realizedR({ symbol: 'EURUSD', side: 'sell', entry: 1.085, sl: 1.087, exit: 1.083, note: n1 }), 1);
  // بلا وقف حالي (مُسح بالتعديل) والعلامة باقية: R من الأصلي
  assert.equal(realizedR({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: null, exit: 1.087, note: n1 }), 1);

  // علامة بطلت بتصحيح الدخول ثم شدٌّ جديد: آخر علامة صالحة لا الأولى (كانت: null ⇒ 6R بدل 1.5R ورفض التعادل)
  {
    // شراء 1.1000 وقف 1.0950، شُدّ ⇒ «1R @ 1.095»؛ صُحّح الدخول 1.0940 ووقف 1.0900؛ شُدّ إلى 1.0930
    const n = noteWithInitialStop({
      symbol: 'EURUSD',
      note: '1R @ 1.095',
      before: { side: 'buy', entry: 1.094, sl: 1.09, status: 'open' },
      after: { side: 'buy', entry: 1.094, sl: 1.093 },
    });
    assert.equal(n, '1R @ 1.095 · 1R @ 1.09');
    assert.equal(initialStop({ symbol: 'EURUSD', side: 'buy', entry: 1.094, note: n }), 1.09);
    assert.equal(realizedR({ symbol: 'EURUSD', side: 'buy', entry: 1.094, sl: 1.093, exit: 1.1, note: n })!.toFixed(6), '1.500000');
    // وقد صلحت علامة ⇒ لا تُلحق ثالثة بالشدّ التالي
    assert.equal(
      noteWithInitialStop({ symbol: 'EURUSD', note: n, before: { side: 'buy', entry: 1.094, sl: 1.093, status: 'open' }, after: { side: 'buy', entry: 1.094, sl: 1.094 } }),
      n,
    );
    // اثنتان صالحتان ⇒ الأحدث (الأخيرة)؛ صالحة ثم باطلة ⇒ الصالحة
    assert.equal(initialStop({ symbol: 'EURUSD', side: 'buy', entry: 1.1, note: '1R @ 1.095 · 1R @ 1.09' }), 1.09);
    assert.equal(initialStop({ symbol: 'EURUSD', side: 'buy', entry: 1.1, note: '1R @ 1.09 · 1R @ 1.2' }), 1.09);
    assert.equal(initialStop({ symbol: 'EURUSD', side: 'sell', entry: 1.1, note: '1R @ 1.2 · 1R @ 1.09 · x' }), 1.2);
  }
  // فاصلة عشرية ملتصقة: لا تُقرأ «1» (كانت: 0.1R بدل 2R وفحص جهة الوقف مُطفأ) — تُسقط العلامة ويبقى sl
  for (const note of ['1R @ 1,0950', '1R @ 2,350.5', '1R @ 1٫0950', 'x · 1R @ 1,0950 · y']) {
    assert.equal(initialStop({ symbol: 'EURUSD', side: 'buy', entry: 1.1, note }), null, note);
  }
  assert.equal(realizedR({ symbol: 'EURUSD', side: 'buy', entry: 1.1, sl: 1.095, exit: 1.11, note: '1R @ 1,0950' })!.toFixed(6), '2.000000');
  // الفاصلة الفاصلة (بعدها مسافة/نص) تبقى نهاية الرقم
  assert.equal(initialStop({ symbol: 'EURUSD', side: 'buy', entry: 1.1, note: '1R @ 1.095, NFP' }), 1.095);
}
console.log('tradePlan initial stop (1R mark) selftest OK');

// ---- planStop: R:R المخطَّطة بسطر الصفقة من الوقف الأصلي ----
{
  const note = 'breakout · 1R @ 1.083';
  // وقف التعادل: كانت النسبة تسقط (slWrongSide) — الآن 1:2.0 المخطَّطة
  assert.equal(analyzePlan({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.085, tp: 1.089 }).issue, 'slWrongSide');
  const be = analyzePlan({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: planStop({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.085, note })!, tp: 1.089 });
  assert.equal(formatRR(be.rr), '1:2.0');
  // وقفٌ مشدود 5 pip: «1:8.0» غير المخطَّطة ⇒ 1:2.0
  assert.equal(formatRR(analyzePlan({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: planStop({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.0845, note })!, tp: 1.089 }).rr), '1:2.0');
  // بلا علامة: الوقف الحالي كما كان؛ بلا وقف ⇒ null
  assert.equal(planStop({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.0845, note: 'x' }), 1.0845);
  assert.equal(planStop({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: null }), null);
  assert.equal(planStop({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 0 }), null);
  // علامة لا تصلح لهذا الاتجاه ⇒ الوقف الحالي
  assert.equal(planStop({ symbol: 'EURUSD', side: 'sell', entry: 1.085, sl: 1.087, note }), 1.087);
}
console.log('tradePlan planStop selftest OK');

// ---- شرائح أهداف R بالدفتر بعد تحريك الوقف: من الوقف الأصلي (سلسلة اللوحة: noteWithInitialStop ⇒ initialStop ⇒ targetAtRR) ----
{
  const before = { side: 'buy', entry: 1.085, sl: 1.083, status: 'open' };
  const panelTargets = (symbol: string, side: 'buy' | 'sell', b: typeof before, sl: number) => {
    const n = noteWithInitialStop({ symbol, note: 'breakout', before: b, after: { side, entry: b.entry, sl } });
    const base = initialStop({ symbol, side, entry: b.entry, note: n }) ?? sl;
    return [1, 1.5, 2, 3].map((rr) => targetAtRR({ symbol, side, entry: b.entry, sl: base, rr }));
  };
  // شدّ 20 ⇒ 5 pip: كانت 1:2 = 1.086 (10 pip)؛ الآن 1.089 (40 pip) كالخطة
  assert.equal(targetAtRR({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.0845, rr: 2 }), 1.086);
  assert.deepEqual(panelTargets('EURUSD', 'buy', before, 1.0845), [1.087, 1.088, 1.089, 1.091]);
  // نقلٌ للتعادل: الشرائح باقية (كانت تختفي — وقفٌ على الدخول)
  assert.deepEqual(panelTargets('EURUSD', 'buy', before, 1.085), [1.087, 1.088, 1.089, 1.091]);
  // بيع USDJPY: 151.50 بوقف 151.80 (30 pip) شُدّ إلى 151.60 ⇒ 1:2 = 150.90
  const jpy = { side: 'sell', entry: 151.5, sl: 151.8, status: 'open' };
  assert.deepEqual(panelTargets('USDJPY', 'sell', jpy, 151.6), [151.2, 151.05, 150.9, 150.6]);
  // صفقة مغلقة (تصحيح لا تحريك): من الوقف الحالي كما كان
  assert.deepEqual(panelTargets('EURUSD', 'buy', { ...before, status: 'closed' }, 1.0845), [1.0855, 1.08575, 1.086, 1.0865]);
}
console.log('tradePlan journal R targets from initial stop selftest OK');

// ---- سطر خطة المسودّة بالدفتر أثناء تعديل صفقة حُرِّك وقفها: من الوقف الأصلي كسطر الصفقة (سلسلة اللوحة) ----
{
  const words = { risk: 'Risk', reward: 'Reward' };
  const before = { side: 'buy', entry: 1.085, sl: 1.083, status: 'open' };
  const draftLine = (b: typeof before, sl: number, tp: number, lots: number) => {
    const n = noteWithInitialStop({ symbol: 'EURUSD', note: '', before: b, after: { side: 'buy', entry: b.entry, sl } });
    const stop = initialStop({ symbol: 'EURUSD', side: 'buy', entry: b.entry, note: n }) ?? sl;
    const plan = analyzePlan({ symbol: 'EURUSD', side: 'buy', entry: b.entry, sl: stop, tp });
    const r = draftRiskFigures({ symbol: 'EURUSD', side: 'buy', entry: b.entry, sl: stop, lots });
    return plan.ok ? planSummaryText(plan, words, r?.cash ? `${r.cash.amount.toFixed(2)} ${r.cash.ccy}` : null) : null;
  };
  // الخطأ القديم: الوقف الحالي 1.0845 (5 pip) ⇒ «1:8.0» أثناء التعديل
  assert.equal(formatRR(analyzePlan({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.0845, tp: 1.089 }).rr), '1:8.0');
  // الآن الخطة المخطَّطة: 20 pip (200 USD لـ1 لوت) · 40 pip · 1:2 — نفس R:R سطر الصفقة بعد الحفظ (`planStop`)
  assert.equal(draftLine(before, 1.0845, 1.089, 1), 'Risk 20 pip (200.00 USD) · Reward 40 pip · R:R 1:2.0');
  assert.equal(
    formatRR(analyzePlan({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: planStop({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.0845, note: 'x · 1R @ 1.083' })!, tp: 1.089 }).rr),
    '1:2.0'
  );
  // نقلٌ للتعادل: السطر يبقى بالخطة (كان يختفي)
  assert.equal(draftLine(before, 1.085, 1.089, 1), 'Risk 20 pip (200.00 USD) · Reward 40 pip · R:R 1:2.0');
  // صفقة مغلقة (تصحيح): الوقف المكتوب هو الخطة كما كان
  assert.equal(draftLine({ ...before, status: 'closed' }, 1.0845, 1.089, 1), 'Risk 5 pip (50.00 USD) · Reward 40 pip · R:R 1:8.0');
}
console.log('tradePlan journal draft line from initial stop selftest OK');

// ---- الـR العائم (صفّ الصفقة المفتوحة) ومعاينة الخروج بالنموذج: من الوقف الأصلي «1R @ …» كالصفّ المغلق ----
{
  const note = noteWithInitialStop({
    symbol: 'EURUSD',
    note: 'breakout',
    before: { side: 'buy', entry: 1.085, sl: 1.083, status: 'open' },
    after: { side: 'buy', entry: 1.085, sl: 1.0845 },
  });
  const closedR = realizedR({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.0845, exit: 1.089, note });
  assert.equal(closedR, 2);
  // الخطأ القديم: بلا ملاحظة «+8R» عائمةً ثم «+2R» عند الإغلاق
  assert.equal(floatingResult({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.0845, current: 1.089 })!.r, 8);
  assert.equal(floatingResult({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.0845, current: 1.089, note })!.r, closedR);
  assert.equal(exitPreview({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.0845, exit: 1.089, note })!.r, closedR);
  // تعادل: كان بلا R؛ الآن +2R عائمة و−0 عند الوقف = 0R
  const be = noteWithInitialStop({
    symbol: 'EURUSD',
    note: '',
    before: { side: 'buy', entry: 1.085, sl: 1.083, status: 'open' },
    after: { side: 'buy', entry: 1.085, sl: 1.085 },
  });
  assert.equal(floatingResult({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.085, current: 1.089 })!.r, null);
  assert.equal(floatingResult({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.085, current: 1.089, note: be })!.r, 2);
  assert.equal(exitPreview({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.085, exit: 1.085, note: be })!.r, 0);
  // بيع USDJPY 151.50 بوقف 151.80 شُدّ إلى 151.60، السوق 150.90 ⇒ +2R (لا +6R)
  const jpy = noteWithInitialStop({
    symbol: 'USDJPY',
    note: '',
    before: { side: 'sell', entry: 151.5, sl: 151.8, status: 'open' },
    after: { side: 'sell', entry: 151.5, sl: 151.6 },
  });
  assert.equal(floatingResult({ symbol: 'USDJPY', side: 'sell', entry: 151.5, sl: 151.6, current: 150.9 })!.r, 6);
  assert.equal(floatingResult({ symbol: 'USDJPY', side: 'sell', entry: 151.5, sl: 151.6, current: 150.9, note: jpy })!.r, 2);
  // بلا علامة: كما كان
  assert.equal(exitPreview({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.083, exit: 1.089, note: 'x' })!.r, 2);
}
console.log('tradePlan floating/exit preview R from initial stop selftest OK');

// ---- حجم الدفتر «10.000»: آلافٌ بنقطة (cTrader أوروبي) أم 10 لوتات — مبهمٌ يُنبَّه عليه بقراءة الوحدات ----
{
  // الخطأ: parseDecimal يقرؤه 10 والتحذير لا يعمل تحت 100 لوت
  assert.equal(parseDecimal('10.000'), 10);
  assert.equal(journalSizeLooksLikeUnits(10, 'EURUSD'), null);
  assert.deepEqual(journalSizeDottedThousands('10.000', 'EURUSD'), { units: 10000, lots: 0.1 });
  assert.deepEqual(journalSizeDottedThousands('50.000', 'GBPJPY'), { units: 50000, lots: 0.5 });
  assert.deepEqual(journalSizeDottedThousands('100.000', 'EURUSD'), { units: 100000, lots: 1 });
  assert.deepEqual(journalSizeDottedThousands(' 1.000 ', 'USDJPY'), { units: 1000, lots: 0.01 });
  assert.deepEqual(journalSizeDottedThousands('١٠.٠٠٠', 'EURUSD.m'), { units: 10000, lots: 0.1 });
  // فضة: 10,000 أونصة = 2 لوت (أصغر من 10) ⇒ يُنبَّه
  assert.deepEqual(journalSizeDottedThousands('10.000', 'XAGUSD'), { units: 10000, lots: 2 });
  // غير مبهم: ذيلٌ غير صفري، أقلّ/أكثر من ثلاث منازل، فاصلة، بلا فاصل، صفر، أداة مجهولة/سنت
  for (const raw of ['1.500', '2.250', '10.00', '10.0000', '10', '10,000', '0.000', '1000.000', '']) {
    assert.equal(journalSizeDottedThousands(raw, 'EURUSD'), null, raw);
  }
  assert.equal(journalSizeDottedThousands('10.000', 'BTCUSD'), null);
  assert.equal(journalSizeDottedThousands('10.000', 'EURUSDc'), null);
  // الذهب 100 أونصة للّوت: قراءة الوحدات **أكبر** (1.000 = 10 لوتات، 10.000 = 100) ⇒ لا خطر ولا اقتراح؛ والفضة 1.000 = 0.2 لوت ⇒ يُنبَّه
  for (const raw of ['1.000', '10.000', '100.000']) assert.equal(journalSizeDottedThousands(raw, 'XAUUSD'), null, raw);
  assert.deepEqual(journalSizeDottedThousands('5.000', 'XAGUSD'), { units: 5000, lots: 1 });
  assert.deepEqual(journalSizeDottedThousands('1.000', 'XAGUSD'), { units: 1000, lots: 0.2 });
}
console.log('tradePlan journal dotted-thousands size selftest OK');

// ---- عدّاد ملاحظة الدفتر: `maxLength` 500 لا يوقف الكتابة بصمت ----
{
  const { noteCharsLeft, JOURNAL_NOTE_MAX: MAX, NOTE_COUNTER_FROM } = require('./tradePlan') as typeof import('./tradePlan');
  assert.equal(MAX, 500);
  assert.equal(noteCharsLeft(''), null);
  assert.equal(noteCharsLeft(null), null);
  assert.equal(noteCharsLeft('a'.repeat(399)), null);
  assert.equal(noteCharsLeft('a'.repeat(400)), NOTE_COUNTER_FROM);
  assert.equal(noteCharsLeft('a'.repeat(499)), 1);
  assert.equal(noteCharsLeft('a'.repeat(500)), 0);
  // أطول من الحدّ (ملاحظة قديمة/لصق قبل الحدّ): صفر لا سالب
  assert.equal(noteCharsLeft('a'.repeat(520)), 0);
  // UTF-16 كـ`maxLength`: «📈» وحدتان
  assert.equal(noteCharsLeft('📈'.repeat(200)), 100);
  assert.equal(noteCharsLeft('abc', 50), 47);
}
console.log('tradePlan note chars-left selftest OK');

// liveFillStillValid — ردّ «السعر الحالي» لا يُكتب فوق دخول صفقة فُتحت للتعديل أو سعرٍ كُتب باليد أثناء الطلب
{
  const tap = { key: 'EURUSD|buy', entryText: '', editId: null };
  assert.equal(liveFillStillValid(tap, { ...tap }), true);
  // «تعديل» صفقة قديمة (دخول 1.0820) قبل وصول الردّ: الرمز والجهة كما هما، لكن الدخول والصفقة تغيّرا
  assert.equal(liveFillStillValid(tap, { key: 'EURUSD|buy', entryText: '1.0820', editId: 42 }), false);
  // الصفقة نفسها بلا تغيير بالدخول — لكنها صارت قيد التعديل
  assert.equal(liveFillStillValid(tap, { key: 'EURUSD|buy', entryText: '', editId: 42 }), false);
  // سعرٌ كُتب باليد أثناء الطلب
  assert.equal(liveFillStillValid(tap, { ...tap, entryText: '1.0851' }), false);
  // الرمز أو الجهة (السلوك السابق)
  assert.equal(liveFillStillValid(tap, { ...tap, key: 'GBPUSD|buy' }), false);
  assert.equal(liveFillStillValid(tap, { ...tap, key: 'EURUSD|sell' }), false);
  // أثناء التعديل: نقرة وردّ على الصفقة نفسها بلا كتابة ⇒ يُكتب
  const editTap = { key: 'XAUUSD|sell', entryText: '2650.35', editId: 7 };
  assert.equal(liveFillStillValid(editTap, { ...editTap }), true);
  assert.equal(liveFillStillValid(editTap, { ...editTap, editId: 8 }), false);
}
console.log('tradePlan liveFillStillValid selftest OK');

// closedElsewhere — لا خروجٌ جديد فوق صفقة أُغلقت بجهاز آخر؛ ولا منعٌ لصفقة خارج آخر 200 أو حين يتعذّر الجلب
{
  const list = [
    { id: 'a', status: 'open' },
    { id: 'b', status: 'closed' },
  ];
  assert.equal(closedElsewhere(list, 'a'), false);
  assert.equal(closedElsewhere(list, 'b'), true);
  assert.equal(closedElsewhere(list, 'old-open-beyond-200'), false);
  assert.equal(closedElsewhere(null, 'b'), false);
  assert.equal(closedElsewhere([], 'a'), false);
}
console.log('tradePlan closedElsewhere selftest OK');

// ---- journalNoteRoom: خانة الملاحظة تترك مكاناً لعلامتَي الحفظ فلا تسقطان بصمت ----
{
  const { journalNoteRoom, noteWithTypedSize, noteWithInitialStop, knownLots, realizedR, JOURNAL_NOTE_MAX: MAX } =
    require('./tradePlan') as typeof import('./tradePlan');
  const open = { side: 'buy', entry: 1.085, sl: 1.083, status: 'open' };
  const tighter = { side: 'buy' as const, entry: 1.085, sl: 1.0845 };
  // بلا علامة ⇒ الحدّ كاملاً
  assert.equal(journalNoteRoom({ symbol: 'EURUSD', note: 'x', size: 0.5 }), MAX);
  assert.equal(journalNoteRoom({ symbol: 'EURUSD', note: '', size: null }), MAX);
  // حجم 1 مكتوب: «1.00 lot · » = 11 ⇒ 489؛ وملاحظة 489 تُحفظ بالعلامة فيبقى الحجم معروفاً (كانت 495 تُسقطها)
  const room1 = journalNoteRoom({ symbol: 'EURUSD', note: 'a'.repeat(300), size: 1 });
  assert.equal(room1, 489);
  const at1 = noteWithTypedSize(1, 'a'.repeat(room1));
  assert.equal(at1.length, MAX);
  assert.equal(knownLots(1, at1), 1);
  // ملاحظة فارغة بحجم 1: «1.00 lot» (8) بلا فاصل
  assert.equal(journalNoteRoom({ symbol: 'EURUSD', note: '', size: 1 }), MAX - 8);
  // علامة الحاسبة موجودة أصلاً ⇒ لا حجز
  assert.equal(journalNoteRoom({ symbol: 'EURUSD', note: '1.00 lot · risk 100.00 USD', size: 1 }), MAX);
  // شدّ وقف صفقة مفتوحة: « · 1R @ 1.083» = 13 ⇒ 487، والـR يبقى +2 لا +8 عند الحدّ
  const roomS = journalNoteRoom({ symbol: 'EURUSD', note: 'b'.repeat(50), size: 0.5, edit: { before: open, after: tighter } });
  assert.equal(roomS, MAX - ' · 1R @ 1.083'.length);
  const atS = noteWithInitialStop({ symbol: 'EURUSD', note: 'b'.repeat(roomS), before: open, after: tighter });
  assert.equal(atS.length, MAX);
  assert.equal(realizedR({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.0845, exit: 1.089, note: atS }), 2);
  // العلامتان معاً (حجم 1 + وقف مشدود): 11 + 13
  const roomB = journalNoteRoom({ symbol: 'EURUSD', note: 'c', size: 1, edit: { before: open, after: tighter } });
  assert.equal(roomB, MAX - 11 - 13);
  const both = noteWithInitialStop({ symbol: 'EURUSD', note: noteWithTypedSize(1, 'c'.repeat(roomB)), before: open, after: tighter });
  assert.equal(both.length, MAX);
  assert.equal(knownLots(1, both), 1);
  // وقفٌ أوسع يُلحق العلامة أيضاً ⇒ يُحجز لها؛ صفقة مغلقة ⇒ لا علامة وقف ⇒ لا حجز
  assert.equal(journalNoteRoom({ symbol: 'EURUSD', note: 'x', size: 2, edit: { before: open, after: { ...tighter, sl: 1.082 } } }), MAX - 13);
  assert.equal(journalNoteRoom({ symbol: 'EURUSD', note: 'x', size: 2, edit: { before: { ...open, status: 'closed' }, after: tighter } }), MAX);
  // الحدّ الافتراضي للدالّتين لم يتغيّر: 495 بحجم 1 ما زالت تُترك كما هي (لا 422)
  assert.equal(noteWithTypedSize(1, 'a'.repeat(495)), 'a'.repeat(495));
}
console.log('tradePlan journalNoteRoom selftest OK');

{
  // جهة النتيجة للون من الحركة لا من النسبة المقرَّبة: ذهب 4000.0 → 4000.1 بيعاً = «0.00%» لكنها خسارة
  const g = realizedMove({ symbol: 'XAUUSD', side: 'sell', entry: 4000, exit: 4000.1 })!;
  assert.equal(g.pct, 0);
  assert.equal(g.dir, -1);
  const e = realizedMove({ symbol: 'EURUSD', side: 'buy', entry: 1.085, exit: 1.08504 })!;
  assert.equal(e.pct, 0);
  assert.equal(e.dir, 1);
  // تعادل حقيقي ⇒ 0؛ ضجيج الفاصلة العائمة لا يلوّن
  assert.equal(realizedMove({ symbol: 'EURUSD', side: 'buy', entry: 1.085, exit: 1.085 })!.dir, 0);
  assert.equal(realizedMove({ symbol: 'EURUSD', side: 'buy', entry: 0.1 + 0.2, exit: 0.3 })!.dir, 0);
  // المعاينة والعائمة تحملانها
  assert.equal(exitPreview({ symbol: 'XAUUSD', side: 'sell', entry: 4000, exit: 4000.1, lots: 5 })!.dir, -1);
  assert.equal(floatingResult({ symbol: 'EURUSD', side: 'buy', entry: 1.085, current: 1.08504 })!.dir, 1);
}
console.log('tradePlan realizedMove dir selftest OK');

// ---- الحجم الذي يُحسب به مال مسودّة الدفتر: لا مال من «10.000» المبهم ولا من حجمٍ يبدو وحدات ----
{
  // كانت سطور المخاطرة/الخروج تحسب 10 لوتات: وقف 20 pip EURUSD = 2,000 USD بجانب سؤال «0.10 أم 10؟»
  assert.equal(journalMoneyLots('10.000', 'EURUSD'), null);
  assert.equal(journalMoneyLots('١٠.٠٠٠', 'EURUSD'), null);
  assert.equal(journalMoneyLots('50.000', 'GBPJPY'), null);
  assert.equal(journalMoneyLots('10000', 'EURUSD'), null); // يبدو وحدات
  assert.equal(journalMoneyLots('', 'EURUSD'), null);
  assert.equal(journalMoneyLots('0', 'EURUSD'), null);
  assert.equal(journalMoneyLots('abc', 'EURUSD'), null);
  // حجم عادي كما كان
  assert.equal(journalMoneyLots('0.10', 'EURUSD'), 0.1);
  assert.equal(journalMoneyLots('1.500', 'EURUSD'), 1.5);
  assert.equal(journalMoneyLots('10', 'EURUSD'), 10);
  assert.equal(journalMoneyLots('0,5', 'EURUSD'), 0.5);
  // ذهب «1.000» ليس مبهماً (قراءة الوحدات أكبر) ⇒ 1 لوت
  assert.equal(journalMoneyLots('1.000', 'XAUUSD'), 1);
  // بعد الاختيار (0.10) يعود المال: 20 pip × 10$ × 0.1 = 20
  const r = draftRiskFigures({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.083, lots: journalMoneyLots('0.10', 'EURUSD')! })!;
  assert.ok(Math.abs(r.cash!.amount - 20) < 1e-9);
}
console.log('tradePlan journalMoneyLots selftest OK');

// ── R بلا pip معروف (كريبتو/مؤشرات/أسهم): وقفٌ أضيق من 0.002% من الدخول لا يُبنى عليه R ──────────────
{
  // BTC 60000 بوقف 59999.99 (خطأ كتابة 59999) وخروج 61000 كانت +100000R
  assert.equal(realizedR({ symbol: 'BTCUSD', side: 'buy', entry: 60000, sl: 59999.99, exit: 61000 }), null);
  // الحدّ: 0.002% × 60000 = 1.2$ — وقف 1$ يسقط، 1.2$ و2$ يُحسبان
  assert.equal(realizedR({ symbol: 'BTCUSD', side: 'buy', entry: 60000, sl: 59999, exit: 60010 }), null);
  assert.equal(realizedR({ symbol: 'BTCUSD', side: 'buy', entry: 60000, sl: 59998, exit: 60010 }), 5);
  // وقفٌ حقيقي على الكريبتو والمؤشرات بلا تغيير
  assert.equal(realizedR({ symbol: 'BTCUSD', side: 'buy', entry: 60000, sl: 59400, exit: 61200 }), 2);
  assert.equal(realizedR({ symbol: 'US30', side: 'sell', entry: 44000, sl: 44050, exit: 43900 }), 2);
  assert.equal(realizedR({ symbol: 'US30', side: 'sell', entry: 44000, sl: 44000.5, exit: 43900 }), null);
  assert.equal(realizedR({ symbol: 'SPX500', side: 'buy', entry: 6000, sl: 5998, exit: 6003 }), 1.5);
  assert.equal(realizedR({ symbol: 'DOGEUSD', side: 'buy', entry: 0.2, sl: 0.199, exit: 0.203 }), 3);
  // بلا رمز: الحدّ النسبي نفسه، والوقف العادي كما كان
  assert.equal(realizedR({ side: 'buy', entry: 1.085, sl: 1.08499, exit: 1.087 }), null);
  assert.equal(realizedR({ side: 'buy', entry: 1.085, sl: 1.0825, exit: 1.09 }), 2);
  // pip معروف: القاعدة القديمة وحدها (الذهب 0.1 = 0.0029% عند 3500 ⇒ يبقى صالحاً فوق الحدّ النسبي أصلاً)
  assert.equal(realizedR({ symbol: 'XAUUSD', side: 'buy', entry: 3500, sl: 3499.9, exit: 3500.2 }), 2);
  assert.equal(realizedR({ symbol: 'XAUUSD', side: 'buy', entry: 3500, sl: 3499.95, exit: 3500.2 }), null);
  // «متوسط R» لا يبتلعه الخطأ: +2R و−1R وصفقة الوقف 0.01 ⇒ +0.5R على صفقتين
  const avg = averageR([
    { symbol: 'BTCUSD', side: 'buy', entry: 60000, sl: 59400, exit: 61200, status: 'closed' },
    { symbol: 'BTCUSD', side: 'sell', entry: 60000, sl: 60600, exit: 60600, status: 'closed' },
    { symbol: 'BTCUSD', side: 'buy', entry: 60000, sl: 59999.99, exit: 61000, status: 'closed' },
  ]);
  assert.deepEqual(avg, { r: 0.5, n: 2 });
  // علامة الوقف الأصلي بمسافة دون الحدّ لا تصلح ⇒ R من `sl` الحالي
  assert.equal(
    realizedR({ symbol: 'BTCUSD', side: 'buy', entry: 60000, sl: 59400, exit: 61200, note: '1R @ 59999.99' }),
    2
  );
  assert.equal(
    realizedR({ symbol: 'BTCUSD', side: 'buy', entry: 60000, sl: 59900, exit: 61200, note: '1R @ 59400' }),
    2
  );
}
console.log('tradePlan R floor without pip selftest OK');

// ---- علامة «1R @» لعملات دون 0.000001: بلا صيغة أُسّية، وتُقرأ (كانت «1R @ 8e-7» فالـR من الوقف المشدود) ----
{
  assert.equal(plainStopText(8e-7), '0.0000008');
  assert.equal(plainStopText(1.23e-7), '0.000000123');
  assert.equal(plainStopText(0.0000012), '0.0000012');
  assert.equal(plainStopText(1.083), '1.083');
  // تعديل صفقة بالدفتر يملأ الخانات بـplainStopText: كل سعرٍ يُقرأ ثانيةً كما سُجِّل (String(1.2e-9) = «1.2e-9» كان يُرفض)
  for (const v of [1.2e-9, 8e-7, 1.23456e-8, 0.00001234, 1.0845, 157.253, 65000.5]) {
    assert.equal(parseDecimal(plainStopText(v)), v, String(v));
    assert.ok(plainStopText(v).length <= 20, `${v} fits PRICE_MAX_LEN (TradeJournalPanel) — Android cuts filled text`);
  }
  assert.equal(parseDecimal(String(1.2e-9)), null); // الخطأ الذي يمنعه
  assert.equal(plainStopText(60000), '60000');
  const open = { side: 'buy', entry: 0.0000009, sl: 0.0000008, status: 'open' };
  const n = noteWithInitialStop({ symbol: 'PEPEUSD', note: '', before: open, after: { side: 'buy', entry: 0.0000009, sl: 0.00000089 } });
  assert.equal(n, '1R @ 0.0000008');
  assert.equal(initialStop({ symbol: 'PEPEUSD', side: 'buy', entry: 0.0000009, note: n }), 0.0000008);
  const r = realizedR({ symbol: 'PEPEUSD', side: 'buy', entry: 0.0000009, sl: 0.00000089, exit: 0.000001, note: n })!;
  assert.ok(Math.abs(r - 1) < 1e-9, String(r));
  // ملاحظة قديمة كُتبت أُسّياً تُقرأ أيضاً، ولا تُضاف فوقها علامة ثانية
  assert.equal(initialStop({ symbol: 'PEPEUSD', side: 'buy', entry: 0.0000009, note: '1R @ 8e-7' }), 8e-7);
  const again = noteWithInitialStop({ symbol: 'PEPEUSD', note: '1R @ 8e-7', before: { ...open, sl: 0.00000089 }, after: { side: 'buy', entry: 0.0000009, sl: 0.000000895 } });
  assert.equal(again, '1R @ 8e-7');
}
console.log('tradePlan sub-micro initial stop selftest OK');

// parseJournalSize — «0.10 lots» منسوخة من تأكيد الصفقة تُقرأ لوتاً؛ المال منها = المال من «0.10»
{
  assert.equal(parseJournalSize('0.10 lots'), 0.1);
  assert.equal(parseJournalSize('0.1lot'), 0.1);
  assert.equal(parseJournalSize('١٫٥ لوت'), 1.5);
  assert.equal(parseJournalSize('0,5 lot'), 0.5);
  assert.equal(parseJournalSize('0.1'), 0.1);
  assert.equal(parseJournalSize(''), null);
  assert.equal(parseJournalSize('0 lot'), null);
  assert.equal(parseJournalSize('lots'), null);
  assert.equal(parseJournalSize('0.1 pips'), null);
  assert.equal(parseJournalSize('10000 units'), null);
  assert.equal(journalMoneyLots('0.10 lots', 'EURUSD'), 0.1);
  assert.equal(journalMoneyLots('0.10 lots', 'EURUSD'), journalMoneyLots('0.10', 'EURUSD'));
  // «10.000 lots» مبهمة كـ«10.000» — سؤال «0.10 أم 10؟» لا 10 لوتات بصمت
  assert.deepEqual(journalSizeDottedThousands('10.000 lots', 'EURUSD'), { units: 10000, lots: 0.1 });
  assert.equal(journalMoneyLots('10.000 lots', 'EURUSD'), null);
  // يبدو وحدات «10000 lot» ⇒ لا مال كالرقم وحده
  assert.equal(journalMoneyLots('10000 lot', 'EURUSD'), null);
}
console.log('tradePlan parseJournalSize unit word selftest OK');

// نقاطٌ بخانة سعر بالدفتر: «50» هدفاً لشراء EURUSD على 1.0850 كانت هدفاً عند 50.00 بالجهة الصحيحة (levelLooksLikePips)
{
  const L = levelLooksLikePips;
  // الهدف «50» لشراء ⇒ 50 pip فوق الدخول
  assert.deepEqual(L({ symbol: 'EURUSD', side: 'buy', entry: 1.085, level: 50, kind: 'tp' }), { pips: 50, price: 1.09 });
  // الوقف «25» لبيع (فوق الدخول، الجهة «الصحيحة») ⇒ 25 pip فوق
  assert.deepEqual(L({ symbol: 'EURUSD', side: 'sell', entry: 1.085, level: 25, kind: 'sl' }), { pips: 25, price: 1.0875 });
  // الوقف «25» لشراء (الجهة الخطأ أيضاً) ⇒ يُقال «25 pip؟» قبل «الوقف فوق الدخول»
  assert.deepEqual(L({ symbol: 'EURUSD', side: 'buy', entry: 1.085, level: 25, kind: 'sl' }), { pips: 25, price: 1.0825 });
  // الين: الهدف «40» لبيع USDJPY على 157.00 ⇒ 156.60
  assert.deepEqual(L({ symbol: 'USDJPY', side: 'sell', entry: 157, level: 40, kind: 'tp' }), { pips: 40, price: 156.6 });
  // الذهب: الوقف «300» لشراء على 2650 ⇒ 300 pip = 30$ ⇒ 2620
  assert.deepEqual(L({ symbol: 'XAUUSD', side: 'buy', entry: 2650, level: 300, kind: 'sl' }), { pips: 300, price: 2620 });
  // سنت بزوجه العادي
  assert.deepEqual(L({ symbol: 'EURUSDc', side: 'buy', entry: 1.085, level: 50, kind: 'tp' }), { pips: 50, price: 1.09 });
  // مستويات حقيقية لا تُمسّ: أسعار قريبة، ذهب بعيد 1000$ (أقل من النصف)، الين
  assert.equal(L({ symbol: 'EURUSD', side: 'buy', entry: 1.085, level: 1.09, kind: 'tp' }), null);
  assert.equal(L({ symbol: 'EURUSD', side: 'buy', entry: 1.085, level: 1.0825, kind: 'sl' }), null);
  assert.equal(L({ symbol: 'XAUUSD', side: 'buy', entry: 2650, level: 3650, kind: 'tp' }), null);
  assert.equal(L({ symbol: 'USDJPY', side: 'buy', entry: 157, level: 156.5, kind: 'sl' }), null);
  // رمز بلا pip (BTC): نصف السعر ممكن ⇒ لا تخمين؛ ولا شيء بلا دخول/مستوى أو تحت 1 pip
  assert.equal(L({ symbol: 'BTCUSD', side: 'buy', entry: 60000, level: 50, kind: 'sl' }), null);
  assert.equal(L({ symbol: 'EURUSD', side: 'buy', entry: null, level: 50, kind: 'tp' }), null);
  assert.equal(L({ symbol: 'EURUSD', side: 'buy', entry: 1.085, level: null, kind: 'tp' }), null);
  assert.equal(L({ symbol: 'USDJPY', side: 'sell', entry: 157, level: 0.5, kind: 'tp' }), null);
  // المقترح نفسه غير معقول (50,000 pip على EURUSD تحت الصفر) ⇒ null لا اقتراحٌ سالب
  assert.equal(L({ symbol: 'EURUSD', side: 'sell', entry: 1.085, level: 50000, kind: 'tp' }), null);
  // الخطر الذي يُغلق: الملخّص كان «R:R 1:1960» من هدف 50.00
  const bad = analyzePlan({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.0825, tp: 50 });
  assert.equal(bad.ok, true);
  assert.ok((bad.rr ?? 0) > 1000);
}
console.log('tradePlan levelLooksLikePips selftest OK');

// الحاسبة: «25» بخانة سعر الوقف (اتجاه غير معروف ⇒ يُجرَّب الشراء ثم البيع) ينتقل لخانة النقاط
{
  const eu = instrumentSpec('EURUSD')!;
  // ما كان: 239,150 pip تُكتب بخانة النقاط ⇒ لوت 0.00
  assert.equal(slPipsFromPrices(eu, 1.085, 25), 239150);
  const r = positionSize({ balance: 10_000, riskPct: 1, slPips: 239150, pipValuePerLot: pipValuePerLot(eu, 1), contractSize: eu.contractSize })!;
  assert.equal(r.lots, 0);
  const at = (side: 'buy' | 'sell') => levelLooksLikePips({ symbol: 'EURUSD', side, entry: 1.085, level: 25, kind: 'sl' });
  assert.equal((at('buy') ?? at('sell'))?.pips, 25);
  // وقف حقيقي بأيّ جهة لا يُمسّ
  for (const lvl of [1.0825, 1.0875, 1.2, 0.95]) {
    for (const side of ['buy', 'sell'] as const) {
      assert.equal(levelLooksLikePips({ symbol: 'EURUSD', side, entry: 1.085, level: lvl, kind: 'sl' }), null, `${side} ${lvl}`);
    }
  }
  // بعد النقل: 25 pip ⇒ 0.40 لوت كما قصد
  const ok = positionSize({ balance: 10_000, riskPct: 1, slPips: 25, pipValuePerLot: pipValuePerLot(eu, 1), contractSize: eu.contractSize })!;
  assert.equal(ok.lots, 0.4);
}
console.log('tradePlan calculator stop-price pips selftest OK');

// launch88: نصّ «نقاطٌ بخانة سعر» بجملة كاملة — {price} مرّتان، القيم حرفية ولو فيها «$»
{
  const en = '⚠ {field} “{value}” looks like pips, not a price: {pips} pips is {price}. Tap to use {price}';
  assert.equal(
    levelLooksLikePipsText(en, 'Take profit', ' 50 ', 50, '1.0900'),
    '⚠ Take profit “50” looks like pips, not a price: 50 pips is 1.0900. Tap to use 1.0900'
  );
  assert.equal(levelLooksLikePipsText('{field}|{value}|{price}', 'SL', '$$25', 25, '1.0825'), 'SL|$$25|1.0825');
  // القيم لا تُعاد قراءتها قالباً: خانةٌ فيها «{price}» تبقى كما هي
  assert.equal(levelLooksLikePipsText('{value} → {price}', 'TP', '{price}', 1, '2'), '{price} → 2');
  // الرقم نفسه الذي يكتبه الاقتراح: 50 pip فوق 1.0850 ⇒ 1.09
  const hit = levelLooksLikePips({ symbol: 'EURUSD', side: 'buy', entry: 1.085, level: 50, kind: 'tp' })!;
  assert.match(levelLooksLikePipsText(en, 'TP', '50', hit.pips, hit.price.toFixed(4)), /50 pips is 1\.0900\. Tap to use 1\.0900$/);
}
console.log('tradePlan levelLooksLikePipsText selftest OK');

// قبل الدخول: المسودّة تُضيف رهاناً بالاتجاه نفسه (draftStackedExposure)
{
  const o = (symbol: string, side: string, status = 'open') => ({ symbol, side, status });
  const D = draftStackedExposure;
  // شراء EURUSD + GBPUSD مفتوحتان، والمسودّة شراء AUDUSD ⇒ الدولار بيعاً 2 → 3
  assert.deepEqual(D([o('EURUSD', 'buy'), o('GBPUSD', 'buy')], { symbol: 'AUDUSD', side: 'buy' }), [
    { ccy: 'USD', before: 2, after: 3, dir: 'short' },
  ]);
  // ما كان: السطر فوق القائمة يُحسب من المفتوحة وحدها — قبل الحفظ لا يعرف المسودّة
  assert.deepEqual(stackedCurrencyExposure([o('EURUSD', 'buy')]), []);
  // صفقة واحدة مفتوحة + المسودّة بالاتجاه نفسه ⇒ 1 → 2 (الزوج نفسه ⇒ مرّة بعملة الأساس)
  assert.deepEqual(D([o('EURUSD', 'buy')], { symbol: 'EURUSD', side: 'buy' }), [{ ccy: 'EUR', before: 1, after: 2, dir: 'long' }]);
  // بيع USDJPY مع شراء EURUSD مفتوحة ⇒ الدولار بيعاً 1 → 2 (الأساس بيعاً)
  assert.deepEqual(D([o('EURUSD', 'buy')], { symbol: 'USDJPY', side: 'sell' }), [{ ccy: 'USD', before: 1, after: 2, dir: 'short' }]);
  // المسودّة تحوّط (شراء USDCHF مقابل شراء EURUSD) ⇒ لا سطر؛ ولا يُذكر تراكمٌ قائم لا تمسّه المسودّة
  assert.deepEqual(D([o('EURUSD', 'buy')], { symbol: 'USDCHF', side: 'buy' }), []);
  assert.deepEqual(D([o('EURJPY', 'buy'), o('GBPJPY', 'buy')], { symbol: 'AUDNZD', side: 'buy' }), []);
  // مسودّة تكسر تراكماً قائماً لا تُذكر
  assert.deepEqual(D([o('EURUSD', 'buy'), o('GBPUSD', 'buy')], { symbol: 'EURUSD', side: 'sell' }), []);
  // المغلقة لا تُحسب؛ بلا مفتوحة لا شيء؛ رمز بلا مواصفات لا شيء
  assert.deepEqual(D([o('EURUSD', 'buy', 'closed')], { symbol: 'GBPUSD', side: 'buy' }), []);
  assert.deepEqual(D([], { symbol: 'EURUSD', side: 'buy' }), []);
  assert.deepEqual(D([o('EURUSD', 'buy')], { symbol: 'NAS100', side: 'sell' }), []);
  // عملتان تتراكمان بمجموعتين مختلفتين ⇒ كلتاهما
  assert.deepEqual(D([o('EURUSD', 'buy'), o('EURJPY', 'buy'), o('GBPUSD', 'buy')], { symbol: 'EURCHF.m', side: 'buy' }), [
    { ccy: 'EUR', before: 2, after: 3, dir: 'long' },
  ]);
  assert.deepEqual(D([o('EURJPY', 'buy'), o('GBPUSD', 'buy')], { symbol: 'EURUSD', side: 'buy' }), [
    { ccy: 'EUR', before: 1, after: 2, dir: 'long' },
    { ccy: 'USD', before: 1, after: 2, dir: 'short' },
  ]);
}
console.log('tradePlan draftStackedExposure selftest OK');

// نصّ السطر قبل الدخول (journalExposureStackedDraft): كل المواضع، والقيم حرفية
{
  const x = { ccy: 'USD', before: 2, after: 3 };
  assert.equal(
    draftStackedExposureText('With this trade, {after} of your trades bet the same way on {ccy} ({before} already open)', x),
    'With this trade, 3 of your trades bet the same way on USD (2 already open)'
  );
  assert.equal(draftStackedExposureText('{ccy} {ccy} $& {after}', x), 'USD USD $& 3');
  assert.equal(draftStackedExposureText('{n}', x), '{n}');
}
console.log('tradePlan draftStackedExposureText selftest OK');

// حساب mini بالدفتر: نقاط وأسعار بالزوج العادي، بلا مال، ومفتاح أداة منفصل، وسعر السوق للزوج العادي
{
  const tp = require('./tradePlan') as typeof import('./tradePlan');
  assert.equal(tp.journalPipSize('EURUSD.MINI'), 0.0001);
  assert.equal(tp.journalPipSize('USDJPY-MINI'), 0.01);
  assert.equal(tp.journalPipSize('GOLD.MINI'), 0.1);
  assert.equal(tp.journalSpec('EURUSDMINI')?.symbol, 'EURUSD');
  assert.equal(tp.journalPnl({ symbol: 'EURUSD.MINI', side: 'buy', entry: 1.1, exit: 1.102, lots: 1 }), null);
  assert.equal(tp.journalRisk({ symbol: 'EURUSD.MINI', entry: 1.1, sl: 1.098, lots: 1 }), null);
  // سطر المخاطرة بنقاط الزوج العادي بلا مبلغ (لا يختفي كلّه)
  assert.deepEqual(tp.draftRiskFigures({ symbol: 'EURUSD.MINI', side: 'buy', entry: 1.1, sl: 1.098, lots: 1 }), { pips: 20, cash: null, cent: false, micro: false });
  assert.deepEqual(tp.draftRiskFigures({ symbol: 'USDJPY-MINI', side: 'sell', entry: 150, sl: 150.25, lots: 0.5 }), { pips: 25, cash: null, cent: false, micro: false });
  assert.deepEqual(tp.draftRiskFigures({ symbol: 'GOLD.MINI', side: 'buy', entry: 2650, sl: 2645, lots: 1 }), { pips: 50, cash: null, cent: false, micro: false });
  // الشروط نفسها: وقف بالجهة الخطأ أو على الدخول، أو بلا حجم ⇒ لا سطر
  assert.equal(tp.draftRiskFigures({ symbol: 'EURUSD.MINI', side: 'buy', entry: 1.1, sl: 1.102, lots: 1 }), null);
  assert.equal(tp.draftRiskFigures({ symbol: 'EURUSD.MINI', side: 'buy', entry: 1.1, sl: 1.1, lots: 1 }), null);
  assert.equal(tp.draftRiskFigures({ symbol: 'EURUSD.MINI', side: 'buy', entry: 1.1, sl: 1.098, lots: 0 }), null);
  // والعادي بماله كما كان
  assert.deepEqual(tp.draftRiskFigures({ symbol: 'EURUSD', side: 'buy', entry: 1.1, sl: 1.098, lots: 1 })?.cash, { amount: 200, ccy: 'USD' });
  assert.equal(tp.quoteSymbol('EURUSD.mini'), 'EURUSD');
  assert.equal(tp.quoteSymbol('GOLD_mini'), 'XAUUSD');
  assert.equal(tp.journalInstrumentKey('EURUSD.MINI'), 'EURUSDMINI');
  assert.equal(tp.journalInstrumentKey('EURUSDmini'), 'EURUSDMINI');
  assert.notEqual(tp.journalInstrumentKey('EURUSD.MINI'), tp.journalInstrumentKey('EURUSD'));
  assert.equal(tp.journalSymbol('eurusd.mini'), 'EURUSD.MINI');
  assert.equal(tp.journalSymbol('EURUSD-mini'), 'EURUSD-MINI');
  assert.equal(tp.journalContractKind('EURUSD.MINI'), 'std');
  // العادي والـmicro كما كانا
  assert.equal(tp.journalPnl({ symbol: 'EURUSD', side: 'buy', entry: 1.1, exit: 1.102, lots: 1 })?.amount, 200);
  assert.ok(Math.abs(tp.journalPnl({ symbol: 'EURUSD.MICRO', side: 'buy', entry: 1.1, exit: 1.102, lots: 1 })!.amount - 2) < 1e-9);
}
console.log('tradePlan mini journal selftest OK');

// mini: دخول «السعر الحالي» لزوجٍ آخر يُمسح، وشرائح اللوت لا تخلط mini بالعادي
{
  const tp = require('./tradePlan') as typeof import('./tradePlan');
  const filled = { symbol: 'EURUSD', text: '1.08515' };
  for (const s of ['GBPUSD.MINI', 'GBPUSDMINI', 'GBPUSD', 'GBPUSD.MICRO']) {
    assert.equal(tp.liveEntryOrphaned({ entryText: '1.08515', symbol: s, filled }), true, s);
  }
  // الزوج نفسه بحساب mini ⇒ السعر نفسه صالح
  assert.equal(tp.liveEntryOrphaned({ entryText: '1.08515', symbol: 'EURUSD.MINI', filled }), false);
  assert.equal(tp.liveEntryOrphaned({ entryText: '1.08515', symbol: 'EURUSDmini', filled }), false);
  const trades = [
    { symbol: 'EURUSD.MINI', size: 4 },
    { symbol: 'EURUSD', size: 0.4 },
    { symbol: 'GBPUSDMINI', size: 2 },
    { symbol: 'EURUSDC', size: 7 },
  ];
  assert.deepEqual(tp.recentLotSizes(trades, 3, 'EURUSD'), [0.4]);
  assert.deepEqual(tp.recentLotSizes(trades, 3, 'EURUSD.MINI'), [4, 2]);
  assert.deepEqual(tp.recentLotSizes(trades, 3, 'EURUSDC'), [7]);
  assert.deepEqual(tp.recentLotSizes(trades, 5), [4, 0.4, 2, 7]);
  assert.equal(tp.isMiniJournalSymbol('EURUSD.MINI'), true);
  assert.equal(tp.isMiniJournalSymbol('EURUSD'), false);
  assert.equal(tp.isMiniJournalSymbol('EURUSD.MICRO'), false);
}
console.log('tradePlan mini orphan/lot chips selftest OK');

// نقاطٌ بخانة سعر على الين والفضة: داخل نصف السعر لكن تحت الدخول بأكثر من الخُمس ورقمٌ صحيح
{
  const L = levelLooksLikePips;
  const near = (a: { pips: number; price: number } | null, pips: number, price: number) => {
    assert.ok(a, `${pips}`);
    assert.equal(a!.pips, pips);
    assert.ok(Math.abs(a!.price - price) < 1e-9, `${a!.price} vs ${price}`);
  };
  near(L({ symbol: 'USDJPY', side: 'sell', entry: 157.4, level: 100, kind: 'tp' }), 100, 156.4);
  near(L({ symbol: 'GBPJPY', side: 'sell', entry: 199.5, level: 150, kind: 'tp' }), 150, 198);
  near(L({ symbol: 'XAGUSD', side: 'sell', entry: 45, level: 30, kind: 'tp' }), 30, 44.7);
  near(L({ symbol: 'USDJPY', side: 'buy', entry: 157.4, level: 100, kind: 'sl' }), 100, 156.4);
  near(L({ symbol: 'XAGUSD', side: 'buy', entry: 45, level: 25, kind: 'sl' }), 25, 44.75);
  // مستويات حقيقية: كسور، أو سقوط دون الخُمس، أو فوق الدخول (دون النصف)
  assert.equal(L({ symbol: 'USDJPY', side: 'sell', entry: 157.4, level: 150.25, kind: 'tp' }), null);
  assert.equal(L({ symbol: 'USDJPY', side: 'sell', entry: 157.4, level: 150, kind: 'tp' }), null);
  assert.equal(L({ symbol: 'USDJPY', side: 'sell', entry: 157.4, level: 99.5, kind: 'tp' }), null);
  assert.equal(L({ symbol: 'GBPJPY', side: 'buy', entry: 199.5, level: 205, kind: 'tp' }), null);
  assert.equal(L({ symbol: 'XAGUSD', side: 'buy', entry: 45, level: 40, kind: 'sl' }), null);
  assert.equal(L({ symbol: 'XAUUSD', side: 'buy', entry: 2650, level: 2400, kind: 'sl' }), null);
  assert.equal(L({ symbol: 'XAUUSD', side: 'buy', entry: 2650, level: 3650, kind: 'tp' }), null);
  // الخطر المُغلق: R:R 1:287 من هدف 100.00
  assert.ok((analyzePlan({ symbol: 'USDJPY', side: 'sell', entry: 157.4, sl: 157.6, tp: 100 }).rr ?? 0) > 100);
}
console.log('tradePlan levelLooksLikePips JPY/silver selftest OK');

// نقاطٌ بخانة سعر **فوق** الدخول على الين: هدف شراء «200» كان يُحفظ عند 200.00 و«R:R 1:142»
{
  const L = levelLooksLikePips;
  const near = (a: { pips: number; price: number } | null, pips: number, price: number) => {
    assert.ok(a, `${pips}`);
    assert.equal(a!.pips, pips);
    assert.ok(Math.abs(a!.price - price) < 1e-9, `${a!.price} vs ${price}`);
  };
  near(L({ symbol: 'USDJPY', side: 'buy', entry: 157.4, level: 200, kind: 'tp' }), 200, 159.4);
  near(L({ symbol: 'USDJPY', side: 'sell', entry: 157.4, level: 200, kind: 'sl' }), 200, 159.4);
  near(L({ symbol: 'GBPJPY', side: 'buy', entry: 200.5, level: 250, kind: 'tp' }), 250, 203);
  near(L({ symbol: 'EURJPY', side: 'sell', entry: 162, level: 200, kind: 'sl' }), 200, 164);
  // حقيقية: كسور، أو دون الخُمس، أو الليرة (USDTRY 34 ⇒ 41)، أو المعادن (قاعدة الضعف)
  assert.equal(L({ symbol: 'USDJPY', side: 'buy', entry: 157.4, level: 190.5, kind: 'tp' }), null);
  assert.equal(L({ symbol: 'USDJPY', side: 'buy', entry: 157.4, level: 185, kind: 'tp' }), null);
  assert.equal(L({ symbol: 'USDTRY', side: 'buy', entry: 34, level: 41, kind: 'tp' }), null);
  assert.equal(L({ symbol: 'XAGUSD', side: 'buy', entry: 30, level: 50, kind: 'tp' }), null);
  assert.equal(L({ symbol: 'XAUUSD', side: 'buy', entry: 2650, level: 4000, kind: 'tp' }), null);
  // الخطر المُغلق: كان R:R 1:142
  assert.ok((analyzePlan({ symbol: 'USDJPY', side: 'buy', entry: 157.4, sl: 157.1, tp: 200 }).rr ?? 0) > 100);
}
console.log('tradePlan levelLooksLikePips JPY above entry selftest OK');

// ---- openQuotesRefreshDue: لقطة أسعار الصفقات المفتوحة تتجدّد بعد العودة من الخلفية ----
{
  const t0 = 1_758_800_000_000;
  assert.equal(openQuotesRefreshDue(null, t0), false);
  assert.equal(openQuotesRefreshDue(t0, t0), false);
  assert.equal(openQuotesRefreshDue(t0, t0 + OPEN_QUOTES_REFRESH_AFTER_MS - 1), false);
  assert.equal(openQuotesRefreshDue(t0, t0 + OPEN_QUOTES_REFRESH_AFTER_MS), true);
  assert.equal(openQuotesRefreshDue(t0, t0 + 3 * 3_600_000), true);
  assert.equal(openQuotesRefreshDue(t0, t0 - 5_000), true);
  assert.equal(openQuotesRefreshDue(NaN, t0), false);
}
console.log('tradePlan openQuotesRefreshDue selftest OK');

// ---- computedPriceText: شريحة R:R لأداة بلا مواصفات تُكتب سعراً يُقرأ ----
{
  const v = 1.2e-9 + 2 * (1.2e-9 - 1.0e-9);
  assert.equal(String(v).includes('e'), true);
  assert.equal(computedPriceText(v), '0.0000000016');
  assert.equal(parseDecimal(computedPriceText(v)), 1.6e-9);
  assert.equal(computedPriceText(1.2345 + 2 * 0.0345), '1.3035');
  assert.equal(computedPriceText(0.1 + 0.2), '0.3');
  assert.equal(computedPriceText(123456.789), '123456.789');
  assert.equal(computedPriceText(8e-7), '0.0000008');
  for (const x of [1.23e-9, 4.5678e-12, 0.00012345, 3.5, 98765.4321]) {
    const txt = computedPriceText(x);
    assert.ok(!/e/i.test(txt) && txt.length <= 20, txt);
    assert.ok(Math.abs(parseDecimal(txt)! - x) <= Math.abs(x) * 1e-9, txt);
  }
}
console.log('tradePlan computedPriceText selftest OK');

// الرقمية بلاحقة وسيط: سعر السوق بالاسم القانوني (المزوّد يعرف BTCUSD وحده) و«#» تُقبل كـ«GOLD#»
{
  const tp = require('./tradePlan') as typeof import('./tradePlan');
  for (const s of ['BTCUSDm', 'BTCUSD.m', 'BTCUSD#', 'btcusd', 'BTC/USD']) assert.equal(tp.quoteSymbol(s), 'BTCUSD', s);
  assert.equal(tp.quoteSymbol('ETHUSD.m'), 'ETHUSD');
  assert.equal(tp.quoteSymbol('BTCUSDT'), 'BTCUSDT');
  assert.equal(tp.quoteSymbol('BTCUSDC'), 'BTCUSDC');
  assert.equal(tp.journalInstrumentKey('BTCUSDm'), tp.journalInstrumentKey('BTCUSD'));
  // يُحفظ كما كُتب
  assert.equal(tp.journalSymbol('BTCUSD#'), 'BTCUSD#');
  assert.equal(tp.journalSymbol('btcusd.m'), 'BTCUSD.M');
  assert.equal(tp.journalSymbol('BTCUSDm'), 'BTCUSDM');
  assert.equal(tp.journalSymbol('BTC-USD'), 'BTCUSD');
  // الفوركس والسلع كما كانت
  assert.equal(tp.quoteSymbol('XAUUSDm'), 'XAUUSD');
  assert.equal(tp.quoteSymbol('EURUSD.m'), 'EURUSD');
  assert.equal(tp.quoteSymbol('AAPL.US'), 'AAPL.US');
}
console.log('tradePlan crypto suffix quote selftest OK');

// ---- صفحات الدفتر: «تحميل الأقدم» والتحديث لا يُسقطان ولا يتخطّيان صفقات ----
{
  const tp = require('./tradePlan') as typeof import('./tradePlan');
  // أول «أقدم» بعد 200: من 195 بطول 205 (5 تداخل + 200 جديدة)
  assert.deepEqual(tp.journalOlderPage(200), { limit: 205, offset: 195 });
  assert.deepEqual(tp.journalOlderPage(3), { limit: 203, offset: 0 });
  assert.deepEqual(tp.journalOlderPage(0), { limit: 200, offset: 0 });
  assert.deepEqual(tp.journalOlderPage(NaN), { limit: 200, offset: 0 });
  // حذفُ 3 بجهاز آخر: الخادم أزاح الصفوف ⇒ أول صفّ لم يُرَ عند 197 ≥ 195 ⇒ لا تخطٍّ
  {
    const server = Array.from({ length: 450 }, (_, i) => ({ id: `t${i}` }));
    const loaded = server.slice(0, 200);
    const after = server.filter((x) => !['t10', 't50', 't90'].includes(x.id));
    const { limit, offset } = tp.journalOlderPage(loaded.length);
    const merged = tp.mergeJournalPage(loaded, after.slice(offset, offset + limit));
    const ids = new Set(merged.map((x) => x.id));
    for (let i = 200; i < 400; i++) assert.ok(ids.has(`t${i}`), `skipped t${i}`);
    assert.equal(merged.length, new Set(merged.map((x) => x.id)).size);
  }
  // إضافة 2 بجهاز آخر: الصفوف تُزاح للأسفل ⇒ مكرَّرات تُسقط، لا تخطٍّ
  {
    const server = Array.from({ length: 450 }, (_, i) => ({ id: `t${i}` }));
    const loaded = server.slice(0, 200);
    const after = [{ id: 'n1' }, { id: 'n2' }, ...server];
    const { limit, offset } = tp.journalOlderPage(loaded.length);
    const merged = tp.mergeJournalPage(loaded, after.slice(offset, offset + limit));
    assert.equal(merged.length, 398);
    assert.equal(merged[200].id, 't200');
    assert.equal(merged[397].id, 't397');
  }
  // الحدّ الأعلى للخادم 500 لا يُتجاوز
  assert.ok(tp.journalOlderPage(1e6).limit <= tp.JOURNAL_PAGE_MAX);
  // التحديث: صفحة واحدة حتى 500، ثم صفحات 500
  assert.deepEqual(tp.journalRefreshPages(0), [{ limit: 200, offset: 0 }]);
  assert.deepEqual(tp.journalRefreshPages(150), [{ limit: 200, offset: 0 }]);
  assert.deepEqual(tp.journalRefreshPages(405), [{ limit: 405, offset: 0 }]);
  assert.deepEqual(tp.journalRefreshPages(1101), [
    { limit: 500, offset: 0 },
    { limit: 500, offset: 500 },
    { limit: 101, offset: 1000 },
  ]);
  // الترتيب والأول يبقيان
  assert.deepEqual(
    tp.mergeJournalPage([{ id: 'a', v: 1 }], [{ id: 'a', v: 2 }, { id: 'b', v: 3 }, { id: 'b', v: 4 }]),
    [{ id: 'a', v: 1 }, { id: 'b', v: 3 }],
  );
}
console.log('tradePlan journal paging selftest OK');

// ---- journalWinRateLine: دفترٌ كل مغلقاته تعادل لا يقول «نسبة نجاح: 0%» (backend-r6 (5)) ----
{
  const ar = 'نسبة نجاح: {pct}%';
  const allBe = journalStats([0, 0, -0].map((pnl) => ({ status: 'closed', pnl })));
  assert.equal(allBe.trade_count, 3);
  assert.equal(allBe.breakeven_count, 3);
  assert.equal(journalWinRateLine(ar, allBe), 'نسبة نجاح: —');
  assert.equal(journalWinRateLine('Win rate: {pct}%', allBe), 'Win rate: —');
  // خادم يرسل null لاحقاً
  assert.equal(journalWinRateLine(ar, { win_rate: null, win_count: 0, loss_count: 0 }), 'نسبة نجاح: —');
  assert.equal(journalWinRateLine(ar, { win_rate: null }), 'نسبة نجاح: —');
  // خسارة حقيقية وحيدة: 0% صادقة
  const lost = journalStats([{ status: 'closed', pnl: -1.2 }, { status: 'closed', pnl: 0 }]);
  assert.equal(journalWinRateLine(ar, lost), 'نسبة نجاح: 0%');
  const mixed = journalStats([1, -1, 2, 0].map((pnl) => ({ status: 'closed', pnl })));
  assert.equal(journalWinRateLine(ar, mixed), 'نسبة نجاح: 66.7%');
  // خادمٌ أقدم بلا العدّادين: النسبة كما هي
  assert.equal(journalWinRateLine(ar, { win_rate: 0 }), 'نسبة نجاح: 0%');
  assert.equal(journalWinRateLine(ar, { win_rate: 55.5 }), 'نسبة نجاح: 55.5%');
  // قالب بلا % ملاصقة
  assert.equal(journalWinRateLine('WR {pct}', { win_rate: null }), 'WR —');
}
console.log('tradePlan journal win rate selftest OK');

// المعدن فوق الدخول: الضعف لا النصف — أهداف ذهب/فضة حقيقية بعد صعود 2023–2025 كانت تُقرأ نقاطاً ويُمنع حفظها
{
  const L = levelLooksLikePips;
  assert.equal(L({ symbol: 'XAUUSD', side: 'buy', entry: 2650, level: 4000, kind: 'tp' }), null);
  assert.equal(L({ symbol: 'XAUUSD', side: 'buy', entry: 1900, level: 3000, kind: 'tp' }), null);
  assert.equal(L({ symbol: 'GOLD', side: 'buy', entry: 2650, level: 5300, kind: 'tp' }), null);
  assert.equal(L({ symbol: 'XAGUSD', side: 'buy', entry: 30, level: 50, kind: 'tp' }), null);
  assert.equal(L({ symbol: 'XAGUSD.m', side: 'buy', entry: 30, level: 60, kind: 'tp' }), null);
  // وقف بيع فوق الدخول بالقاعدة نفسها
  assert.equal(L({ symbol: 'XAUUSD', side: 'sell', entry: 2650, level: 4200, kind: 'sl' }), null);
  // فوق الضعف تبقى نقاطاً: «500» على فضة 30 ⇒ 5.00 فوق؛ «6000» على ذهب 2650 ⇒ 600$ فوق
  assert.deepEqual(L({ symbol: 'XAGUSD', side: 'buy', entry: 30, level: 500, kind: 'tp' }), { pips: 500, price: 35 });
  assert.deepEqual(L({ symbol: 'XAUUSD', side: 'buy', entry: 2650, level: 6000, kind: 'tp' }), { pips: 6000, price: 3250 });
  // تحت الدخول بلا تغيير: وقف «300» لشراء ذهب ⇒ 2620
  assert.deepEqual(L({ symbol: 'XAUUSD', side: 'buy', entry: 2650, level: 300, kind: 'sl' }), { pips: 300, price: 2620 });
  // الفوركس بلا تغيير: النصف
  assert.deepEqual(L({ symbol: 'USDJPY', side: 'buy', entry: 157, level: 250, kind: 'tp' }), { pips: 250, price: 159.5 });
  assert.deepEqual(L({ symbol: 'EURUSD', side: 'buy', entry: 1.085, level: 50, kind: 'tp' }), { pips: 50, price: 1.09 });
}
console.log('tradePlan levelLooksLikePips metal above entry selftest OK');

// R:R بالنقاط: ضجيج طرح أسعارٍ كبيرة (XAUJPY ~337,000) كان يُطبع «1:0.9» لخطة 1:1
{
  const sl = 337255.74, entry = 337255.84;
  for (const rr of [1, 1.5, 2, 3]) {
    const tp = targetAtRR({ symbol: 'XAUJPY', side: 'buy', entry, sl, rr })!;
    const p = analyzePlan({ symbol: 'XAUJPY', side: 'buy', entry, sl, tp });
    assert.ok((p.rr ?? 0) >= rr, `buy ${rr}: ${p.rr}`);
    assert.equal(formatRR(p.rr), `1:${rr.toFixed(1)}`);
    const stp = targetAtRR({ symbol: 'XAUJPY', side: 'sell', entry, sl: entry + 0.1, rr })!;
    const sp = analyzePlan({ symbol: 'XAUJPY', side: 'sell', entry, sl: entry + 0.1, tp: stp });
    assert.equal(formatRR(sp.rr), `1:${rr.toFixed(1)}`, `sell ${rr}`);
  }
  // ما كان صحيحاً يبقى: 1:1 على USDJPY، 2.25 على EURUSD والذهب، ونسبة غير مستديرة
  assert.equal(analyzePlan({ symbol: 'USDJPY', side: 'buy', entry: 157.4, sl: 157.2, tp: 157.6 }).rr, 1);
  assert.equal(analyzePlan({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.083, tp: 1.0895 }).rr, 2.25);
  assert.equal(analyzePlan({ symbol: 'XAUUSD', side: 'sell', entry: 2650, sl: 2652, tp: 2645.5 }).rr, 2.25);
  assert.equal(analyzePlan({ symbol: 'EURUSD', side: 'buy', entry: 1.085, sl: 1.0835, tp: 1.0879 }).rr, 1.933333333);
  // بلا pip معروف: كما كان
  assert.equal(analyzePlan({ symbol: 'BTCUSD', side: 'buy', entry: 60000, sl: 59000, tp: 62000 }).rr, 2);
}
console.log('tradePlan analyzePlan large-price R:R selftest OK');

// formatSignedPct — سطور الإحصاءات بإشارة سطر الصفقة
{
  const { formatSignedPct } = require('./tradePlan') as typeof import('./tradePlan');
  assert.equal(formatSignedPct(1.5), '+1.50');
  assert.equal(formatSignedPct(-0.5), '−0.50');
  assert.equal(formatSignedPct(0.23), '+0.23');
  assert.equal(formatSignedPct(0), '0.00');
  assert.equal(formatSignedPct(-0), '0.00');
  assert.equal(formatSignedPct(-0.004), '0.00'); // يُقرَّب صفراً ⇒ بلا «−»
  assert.equal(formatSignedPct(0.005), '+0.01');
  assert.equal(formatSignedPct(-1.005), '−1.01');
  assert.equal(formatSignedPct(0.1 + 0.2), '+0.30');
  assert.equal(formatSignedPct(-244259.1), '−244259.10');
  assert.equal(formatSignedPct(null), '—');
  assert.equal(formatSignedPct(NaN), '—');
  // يطابق نسبة سطر الصفقة (`sign` + `toFixed(2)`) لقيمة غير صفرية
  for (const v of [0.23, -0.23, 1.25, -3.5, 12.34]) {
    assert.equal(formatSignedPct(v), `${v > 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}`);
  }
}
console.log('tradePlan formatSignedPct selftest OK');
