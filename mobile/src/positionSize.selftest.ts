/**
 * Self-test for positionSize (pure).
 * Run: npx --yes tsx src/positionSize.selftest.ts
 */
import { parseDecimal } from './parseDecimal';
import assert from 'node:assert/strict';
import {
  convStaleMinutes,
  parseSlPips,
  ambiguousSlPips,
  slPipsInPoints,
  formatPipValue,
  instrumentSpec as specForSl,
  pipValuePerLot as pvForSl,
  positionSize as sizeForSl,
  CONV_STALE_AFTER_MS,
  liveEntryFillAllowed,
  parseRiskInput,
  toggleRiskUnit,
  ACCOUNT_CCYS,
  instrumentSpec,
  conversionPair,
  reversedConversion,
  usdBridge,
  bridgedRate,
  quoteToAccountRate,
  pipValuePerLot,
  positionSize,
  slPipsFromPrices,
  pipsBetween,
  quoteSpreadPips,
  priceAtPipOffset,
  riskForLots,
  riskInQuoteCcy,
  pnlInQuoteCcy,
  profitAtTarget,
  exitQuoteToAccount,
  pipsOnlyExitQuoteToAccount,
  formatRiskPct,
  formatMoney,
  moneyDecimals,
  LOT_STEP,
  parseLeverage,
  requiredMargin,
  marginBaseToAccount,
  maxLotsForMargin,
  stopPipsMismatch,
  marginPrice,
  sizeLooksLikeUnits,
  lotsOverOrderMax,
  ORDER_WARN_LOTS,
  RISK_HIGH_PCT,
  riskIsHigh,
  MAX_SANE_LOTS,
  MAX_SMALL_LOTS,
  parseSpreadPips,
  spreadRisk,
  parsePriceFor,
  smallContractSpec,
  centQuoteToAccount,
  smallLotsStdEquiv,
  smallContractSuffix,
  commissionAcrossModes,
  commissionNoteExample,
  conversionKey,
  SYMBOL_INPUT_MAX_LEN,
  withSmallSuffix,
  CENTS_PER_USD,
  ambiguousThousandsPrice,
  spreadBeyondLiveEntry,
  MAX_SPREAD_PIPS,
  type InstrumentSpec,
  spreadTooWide,
  stopInsideSpread,
  misplacedArabicThousandsSignInRisk,
  leverageOutOfRange,
  leverageAmbiguousThousands,
  savedRiskMoney,
  riskOverBalance,
  centAccountSymbol,
  smallContractPair,
  microAccountSymbol,
  MAX_LEVERAGE,
  planJournalNote,
  parseCommission,
  moneyInOtherCurrency,
  costsLotsAdvice,
  profitAfterCosts,
  rewardBelowRisk,
  lowRewardWarning,
} from './positionSize';
import { formatRR } from './tradePlan';

const near = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps;

// مواصفات
const eu = instrumentSpec('eur/usd')!;
assert.equal(eu.symbol, 'EURUSD');
assert.equal(eu.pipSize, 0.0001);
assert.equal(instrumentSpec('USDJPY')!.pipSize, 0.01);
assert.equal(instrumentSpec('XAUUSD')!.pipSize, 0.1);
assert.equal(instrumentSpec('XAUUSD')!.contractSize, 100);
assert.equal(instrumentSpec('DXY'), null);
assert.equal(instrumentSpec('USDXAU'), null);
// معدن بعملة ورقية غير الدولار مقبول (حجم العقد نفسه، التسعير بعملته)؛ معدن مقابل معدن/عملة رقمية لا
assert.deepEqual(instrumentSpec('XAUEUR'), { symbol: 'XAUEUR', base: 'XAU', quote: 'EUR', pipSize: 0.1, contractSize: 100 });
assert.equal(instrumentSpec('XAGAUD')!.contractSize, 5000);
assert.equal(instrumentSpec('XAUXAG'), null);
assert.equal(instrumentSpec('XAGXAU'), null);
assert.equal(instrumentSpec('XAUBTC'), null);
// عملات رقمية/رموز غير ورقية ليست فوركس (لا pip 0.0001)
assert.equal(instrumentSpec('BTCUSD'), null);
assert.equal(instrumentSpec('ETHUSD'), null);
assert.equal(instrumentSpec('USDSAR')!.pipSize, 0.0001);
assert.equal(instrumentSpec('EURTRY')!.pipSize, 0.0001);

// أزواج التحويل
assert.equal(conversionPair('USD', 'USD'), null);
assert.deepEqual(conversionPair('JPY', 'USD'), { symbol: 'USDJPY', invert: true });
assert.deepEqual(conversionPair('GBP', 'USD'), { symbol: 'GBPUSD', invert: false });
assert.deepEqual(conversionPair('CHF', 'EUR'), { symbol: 'EURCHF', invert: true });
assert.deepEqual(conversionPair('USD', 'GBP'), { symbol: 'GBPUSD', invert: true });
assert.deepEqual(conversionPair('GBP', 'EUR'), { symbol: 'EURGBP', invert: true });

// قيمة الـpip: EURUSD بحساب دولار = 10$ للوت
assert.ok(near(pipValuePerLot(eu, 1), 10));
// USDJPY بحساب دولار عند 150: 100000×0.01/150 = 6.6667$
const uj = instrumentSpec('USDJPY')!;
const ujRate = quoteToAccountRate(conversionPair('JPY', 'USD'), 150)!;
assert.ok(near(pipValuePerLot(uj, ujRate), 1000 / 150));
// GBPJPY بحساب دولار (تقاطع): نفس تحويل JPY→USD
assert.ok(near(pipValuePerLot(instrumentSpec('GBPJPY')!, ujRate), 1000 / 150));
// EURGBP بحساب دولار عند GBPUSD=1.25: 10 GBP × 1.25 = 12.5$
assert.ok(near(pipValuePerLot(instrumentSpec('EURGBP')!, quoteToAccountRate(conversionPair('GBP', 'USD'), 1.25)!), 12.5));
// الذهب بحساب دولار: 100×0.1 = 10$ للوت
assert.ok(near(pipValuePerLot(instrumentSpec('XAUUSD')!, 1), 10));
// EURUSD بحساب يورو عند EURUSD=1.1: 10$ / 1.1 = 9.0909€
assert.ok(near(pipValuePerLot(eu, quoteToAccountRate(conversionPair('USD', 'EUR'), 1.1)!), 10 / 1.1));
assert.equal(quoteToAccountRate({ invert: true }, null), null);
assert.equal(quoteToAccountRate({ invert: true }, 0), null);

// حجم المركز: 10,000$ × 1% = 100$ ، SL 20 pip ، 10$/pip → 0.5 لوت
const r1 = positionSize({ balance: 10000, riskPct: 1, slPips: 20, pipValuePerLot: 10, contractSize: 100000 })!;
assert.ok(near(r1.riskAmount, 100));
assert.equal(r1.lots, 0.5);
assert.equal(r1.units, 50000);
assert.equal(r1.belowMinLot, false);
// التقريب للأسفل لا يتجاوز المخاطرة: 100$ / (30×10) = 0.3333 → 0.33
const r2 = positionSize({ balance: 10000, riskPct: 1, slPips: 30, pipValuePerLot: 10, contractSize: 100000 })!;
assert.equal(r2.lots, 0.33);
assert.ok(r2.actualRisk <= r2.riskAmount);
// حالة فاصلة عائمة: 0.3 بالضبط يجب ألا تصبح 0.29
const r3 = positionSize({ balance: 3000, riskPct: 1, slPips: 10, pipValuePerLot: 10, contractSize: 100000 })!;
assert.equal(r3.lots, 0.3);
// حساب صغير: أقل من الحد الأدنى
const r4 = positionSize({ balance: 100, riskPct: 1, slPips: 50, pipValuePerLot: 10, contractSize: 100000 })!;
assert.equal(r4.lots, 0);
assert.equal(r4.belowMinLot, true);
// مدخلات غير صالحة
assert.equal(positionSize({ balance: 0, riskPct: 1, slPips: 20, pipValuePerLot: 10, contractSize: 1 }), null);
assert.equal(positionSize({ balance: 1000, riskPct: 150, slPips: 20, pipValuePerLot: 10, contractSize: 1 }), null);
assert.equal(positionSize({ balance: 1000, riskPct: 1, slPips: NaN, pipValuePerLot: 10, contractSize: 1 }), null);
// حدّ نسبة المخاطرة بالضبط: 100% (كل الرصيد) مقبولة وما فوقها مرفوض. يعتمد عليه `riskImpossible`
// بلوح المخاطرة كي يكفّ الصندوق عن قول «أدخل الرصيد ونسبة المخاطرة ووقف الخسارة» والثلاثة مكتوبة.
const rMax = positionSize({ balance: 1000, riskPct: 100, slPips: 20, pipValuePerLot: 10, contractSize: 100000 })!;
assert.ok(rMax !== null);
assert.ok(near(rMax.riskAmount, 1000));
assert.equal(positionSize({ balance: 1000, riskPct: 100.01, slPips: 20, pipValuePerLot: 10, contractSize: 1 }), null);

// الوقف من السعر: EURUSD 1.08500 → 1.08250 = 25 pip؛ USDJPY 150.00 → 149.62 = 38 pip؛ الذهب 2400 → 2385 = 150 pip
assert.equal(slPipsFromPrices(eu, 1.085, 1.0825), 25);
assert.equal(slPipsFromPrices(eu, 1.0825, 1.085), 25); // الاتجاه لا يهم (بيع/شراء)
assert.equal(slPipsFromPrices(instrumentSpec('USDJPY')!, 150, 149.62), 38);
assert.equal(slPipsFromPrices(instrumentSpec('XAUUSD')!, 2400, 2385), 150);
assert.equal(slPipsFromPrices(eu, 1.08503, 1.08251), 25.2); // pipette
assert.equal(slPipsFromPrices(eu, 1.085, 1.085), null);
assert.equal(slPipsFromPrices(eu, NaN, 1.08), null);
assert.equal(slPipsFromPrices(eu, 0, 1.08), null);

// عملات حساب إضافية: EURUSD بحساب فرنك عند USDCHF=0.88 → 10$ × 0.88 = 8.8 CHF؛ XAUUSD بحساب ين عند USDJPY=150 → 1500¥
assert.deepEqual(conversionPair('USD', 'CHF'), { symbol: 'USDCHF', invert: false });
assert.ok(near(pipValuePerLot(eu, quoteToAccountRate(conversionPair('USD', 'CHF'), 0.88)!), 8.8));
assert.deepEqual(conversionPair('USD', 'JPY'), { symbol: 'USDJPY', invert: false });
assert.ok(near(pipValuePerLot(instrumentSpec('XAUUSD')!, quoteToAccountRate(conversionPair('USD', 'JPY'), 150)!), 1500));
// GBPJPY بحساب أسترالي: AUDJPY=100 → 1000¥ / 100 = 10 AUD
assert.deepEqual(conversionPair('JPY', 'AUD'), { symbol: 'AUDJPY', invert: true });
assert.ok(near(pipValuePerLot(instrumentSpec('GBPJPY')!, quoteToAccountRate(conversionPair('JPY', 'AUD'), 100)!), 10));
// EURUSD بحساب كندي: USDCAD=1.36 → 13.6 CAD
assert.deepEqual(conversionPair('USD', 'CAD'), { symbol: 'USDCAD', invert: false });
assert.ok(near(pipValuePerLot(eu, quoteToAccountRate(conversionPair('USD', 'CAD'), 1.36)!), 13.6));

// عملة تسعير ناشئة بحساب ين: الين يبقى عملة تسعير (ZARJPY لا «JPYZAR» غير المتداول)
assert.deepEqual(conversionPair('ZAR', 'JPY'), { symbol: 'ZARJPY', invert: false });
assert.deepEqual(conversionPair('TRY', 'JPY'), { symbol: 'TRYJPY', invert: false });
// USDZAR بحساب ين عند ZARJPY=8.2: 100000×0.0001 ZAR × 8.2 = 82¥ للوت
assert.ok(near(pipValuePerLot(instrumentSpec('USDZAR')!, quoteToAccountRate(conversionPair('ZAR', 'JPY'), 8.2)!), 82));
// بقية عملات الحساب مع عملة ناشئة: الحساب أساساً كما كان (USDZAR، EURTRY…)
assert.deepEqual(conversionPair('ZAR', 'USD'), { symbol: 'USDZAR', invert: true });
assert.deepEqual(conversionPair('TRY', 'EUR'), { symbol: 'EURTRY', invert: true });
// الزوج المعكوس (محاولة ثانية) يعطي نفس المعدّل بالسعر المقلوب
const cz = conversionPair('ZAR', 'CHF')!;
assert.deepEqual(cz, { symbol: 'CHFZAR', invert: true });
const zc = reversedConversion(cz);
assert.deepEqual(zc, { symbol: 'ZARCHF', invert: false });
assert.ok(near(quoteToAccountRate(cz, 20)!, quoteToAccountRate(zc, 1 / 20)!));
assert.deepEqual(reversedConversion(zc), cz);

// السعر على بُعد مسافة بالنقاط (شرائح المسافات بلوح التنبيهات): حجم pip الأداة لا رقم عام
const uj2 = instrumentSpec('USDJPY')!;
const au = instrumentSpec('XAUUSD')!;
const ag = instrumentSpec('XAGUSD')!;
assert.ok(near(priceAtPipOffset(eu, 1.085, 10)!, 1.086));
assert.ok(near(priceAtPipOffset(eu, 1.085, -25)!, 1.0825));
assert.ok(near(priceAtPipOffset(uj2, 157.4, 10)!, 157.5)); // الين: pip = 0.01 ⇒ +0.10
assert.ok(near(priceAtPipOffset(uj2, 157.4, -50)!, 156.9));
assert.ok(near(priceAtPipOffset(au, 2650, 10)!, 2651)); // الذهب: pip = 0.1 ⇒ +1.00 دولار
assert.ok(near(priceAtPipOffset(au, 2650, -50)!, 2645));
assert.ok(near(priceAtPipOffset(ag, 31.2, 25)!, 31.45)); // الفضة: pip = 0.01 ⇒ +0.25
assert.ok(near(priceAtPipOffset(instrumentSpec('GBPJPY')!, 198.5, -10)!, 198.4));
// الجمع بالفاصلة العائمة لا يسرّب أرقاماً طويلة لخانة يقرأها المتداول
assert.equal(priceAtPipOffset(eu, 1.085, 10), 1.086);
assert.equal(priceAtPipOffset(eu, 1.08503, 10), 1.08603);
assert.equal(priceAtPipOffset(uj2, 157.423, 25), 157.673);
// الاتجاه محفوظ دائماً: موجب فوق السعر وسالب تحته، بلا تساوٍ بعد التقريب
for (const [spec, px] of [[eu, 1.08503], [uj2, 157.423], [au, 2650.07], [ag, 31.204]] as const) {
  for (const off of [-50, -25, -10, 10, 25, 50]) {
    const v = priceAtPipOffset(spec, px, off)!;
    assert.ok(off > 0 ? v > px : v < px, `${spec.symbol} ${off}`);
    assert.ok(Math.abs((v - px) / spec.pipSize - off) < 1e-6, `${spec.symbol} ${off}: المسافة`);
  }
}
// مدخلات غير صالحة / سعر ناتج ≤ 0
assert.equal(priceAtPipOffset(eu, NaN, 10), null);
assert.equal(priceAtPipOffset(eu, 1.085, NaN), null);
assert.equal(priceAtPipOffset(eu, 0, 10), null);
assert.equal(priceAtPipOffset(eu, -1, 10), null);
assert.equal(priceAtPipOffset(instrumentSpec('EURGBP')!, 0.003, -50), null);
assert.equal(priceAtPipOffset(eu, 1.085, 0), 1.085); // مسافة صفر = السعر نفسه بلا ذيل عائم
// التقريب بمنزلة الأداة لا بـ`Math.round(x/step)*step` — الضرب العكسي كان يعيد الخطأ العائم نفسه
assert.equal(priceAtPipOffset(uj2, 157.4, 0), 157.4);
assert.equal(priceAtPipOffset(au, 2650, 0), 2650);
assert.equal(priceAtPipOffset(ag, 31.2, 0), 31.2);
// ولا يقصّ منزلة حقيقية: الـpipette محفوظة لكل أداة
assert.equal(priceAtPipOffset(eu, 1.08503, 0), 1.08503);
assert.equal(priceAtPipOffset(uj2, 157.423, 0), 157.423);
assert.equal(priceAtPipOffset(au, 2650.05, 0), 2650.05);
assert.equal(priceAtPipOffset(ag, 31.204, 0), 31.204);
/**
 * الثابت الحاكم: القيمة المعادة = النصّ الذي يعرضه `formatPrice` لها، بالبناء لا بالمصادفة —
 * فلا يُحفظ تنبيه عند رقم غير الذي قرأه المتداول على الشريحة. (`decimals` هنا نسخة من
 * `symbolPriceDecimals` بـchart/indicators/utils.ts، وهي المعادلة التي يبني عليها `formatPrice`.)
 */
const decimalsOf = (sp: InstrumentSpec) => Math.round(-Math.log10(sp.pipSize)) + 1;
for (const sp of [eu, uj2, au, ag, instrumentSpec('GBPJPY')!, instrumentSpec('EURGBP')!]) {
  const base = { EURUSD: 1.08503, USDJPY: 157.423, XAUUSD: 2650.07, XAGUSD: 31.204, GBPJPY: 198.556, EURGBP: 0.84217 }[
    sp.symbol
  ]!;
  for (const off of [-50, -25, -10, 0, 10, 25, 50]) {
    const v = priceAtPipOffset(sp, base, off)!;
    assert.equal(v, Number(v.toFixed(decimalsOf(sp))), `${sp.symbol} ${off}: ذيل عائم`);
    const frac = String(v).split('.')[1]?.length ?? 0;
    assert.ok(frac <= decimalsOf(sp), `${sp.symbol} ${off}: ${frac} منزلة > ${decimalsOf(sp)}`);
  }
}


/* ─────────────── جسر الدولار (التحويل عبر USD حين لا يوجد زوج مباشر) ─────────────── */

// لا جسر حين لا معنى له: طرفٌ دولار (الجسر = الزوج المباشر نفسه) أو العملتان واحدة
assert.equal(usdBridge('USD', 'EUR'), null);
assert.equal(usdBridge('JPY', 'USD'), null);
assert.equal(usdBridge('CHF', 'CHF'), null);

// حساب بالفرنك على USDJPY: `CHFJPY` تقاطعٌ قد لا يعرفه المزوّد — الجسر يطلب زوجَي دولار
assert.deepEqual(usdBridge('JPY', 'CHF'), {
  first: { symbol: 'USDJPY', invert: true },
  second: { symbol: 'USDCHF', invert: false },
});
// حساب أسترالي على USDCAD: `AUDCAD` ← USDCAD + AUDUSD
assert.deepEqual(usdBridge('CAD', 'AUD'), {
  first: { symbol: 'USDCAD', invert: true },
  second: { symbol: 'AUDUSD', invert: true },
});
// حساب باليورو على زوج مسعَّر بالإسترليني (EURGBP مثلاً لو كان الحساب بعملة ثالثة): الساقان دولاريتان
assert.deepEqual(usdBridge('GBP', 'JPY'), {
  first: { symbol: 'GBPUSD', invert: false },
  second: { symbol: 'USDJPY', invert: false },
});

/**
 * **الثابت الحاكم للجسر**: سعره يساوي سعر الزوج المباشر المكافئ. يُفحص عددياً من أسعار دولار
 * متسقة: لكل عملة «كم دولاراً تساوي الوحدة منها»، فالزوج المباشر يُشتقّ منها بالقسمة، والجسر
 * يُحسب من ساقيه — ويجب أن يتطابقا. لو انقلبت `invert` بساقٍ واحدة لانفجر الفرق فوراً.
 */
{
  const USD_PER: Record<string, number> = {
    EUR: 1.0845,
    GBP: 1.2712,
    AUD: 0.6634,
    NZD: 0.6011,
    USD: 1,
    CAD: 1 / 1.3588,
    CHF: 1 / 0.8823,
    JPY: 1 / 157.42,
  };
  /** سعر أي زوج من جدول الدولار: كم وحدة من عملة التسعير لكل وحدة من العملة الأساس. */
  const priceOf = (sym: string) => USD_PER[sym.slice(0, 3)]! / USD_PER[sym.slice(3, 6)]!;
  const ccys = Object.keys(USD_PER);
  let checked = 0;
  for (const quote of ccys) {
    for (const account of ccys) {
      const direct = conversionPair(quote, account);
      const expected = direct == null ? 1 : quoteToAccountRate(direct, priceOf(direct.symbol))!;
      // القيمة الصحيحة بحكم الجدول: وحدات الحساب لكل وحدة تسعير
      assert.ok(near(expected, USD_PER[quote]! / USD_PER[account]!, 1e-9), `مباشر ${quote}->${account}`);
      const bridge = usdBridge(quote, account);
      if (!bridge) {
        assert.ok(quote === account || quote === 'USD' || account === 'USD', `جسر مفقود ${quote}->${account}`);
        continue;
      }
      // ساقا الجسر دولاريتان دائماً — وهي بالضبط الأزواج التي يعرفها المزوّد
      for (const leg of [bridge.first, bridge.second]) {
        assert.ok(leg.symbol.includes('USD'), `ساق غير دولارية: ${leg.symbol}`);
      }
      const viaUsd = bridgedRate(bridge, priceOf(bridge.first.symbol), priceOf(bridge.second.symbol))!;
      assert.ok(near(viaUsd, expected, 1e-9), `جسر ${quote}->${account}: ${viaUsd} ≠ ${expected}`);
      checked += 1;
    }
  }
  assert.equal(checked, 42); // 8×8 تركيبة ناقص 8 متطابقة وناقص 14 لها طرفٌ دولاري
}

// قيمة الـpip عبر الجسر تساوي قيمتها بالزوج المباشر: USDJPY بحساب فرنك
{
  const bridge = usdBridge('JPY', 'CHF')!;
  // USDJPY = 157.42 ، USDCHF = 0.8823
  const viaUsd = bridgedRate(bridge, 157.42, 0.8823)!;
  const direct = quoteToAccountRate(conversionPair('JPY', 'CHF'), 157.42 / 0.8823)!; // CHFJPY
  assert.ok(near(viaUsd, direct, 1e-12));
  // 100000 × 0.01 = 1000 ين للـpip ← بالفرنك
  assert.ok(near(pipValuePerLot(instrumentSpec('USDJPY')!, viaUsd), (1000 / 157.42) * 0.8823, 1e-9));
}

// ساقٌ مفقودة = لا سعر (لا يُحسب حجم مركز من نصف تحويل)
{
  const bridge = usdBridge('CAD', 'AUD')!;
  assert.equal(bridgedRate(bridge, null, 0.6634), null);
  assert.equal(bridgedRate(bridge, 1.3588, null), null);
  assert.equal(bridgedRate(bridge, 1.3588, 0), null);
}

/* ─────────────── عملات الحساب ─────────────── */

// العملات الثماني الرئيسية كاملةً — النيوزيلندي منها، وNZDUSD أداةٌ يتداولها التطبيق
assert.deepEqual(ACCOUNT_CCYS, ['USD', 'EUR', 'GBP', 'AUD', 'NZD', 'CAD', 'CHF', 'JPY']);
assert.equal(new Set(ACCOUNT_CCYS).size, ACCOUNT_CCYS.length);
/**
 * **الثابتة التي يقوم عليها جسر الدولار**: لكل عملة حساب مدعومة زوجُ دولارٍ مباشر — وإلا فلا ساق
 * ثانية للجسر، وتعود تلك العملة لطلب السعر يدوياً بنصف أدواتها. أي عملة حساب تُضاف مستقبلاً بلا
 * زوج دولار يكسر هذا السطر قبل أن تصل للمتداول.
 */
for (const acc of ACCOUNT_CCYS) {
  if (acc === 'USD') continue;
  const leg = conversionPair('USD', acc)!;
  assert.ok(leg != null, `${acc}: لا زوج تحويل`);
  assert.equal(leg.symbol.replace('USD', ''), acc, `${acc}: ساق غير دولارية ${leg.symbol}`);
  // والاتجاه صحيح: سعر NZDUSD يُقلب ليعطي «كم نيوزيلندياً لكل دولار»، وسعر USDCHF لا يُقلب
  assert.equal(leg.invert, leg.symbol.startsWith(acc), `${acc}: اتجاه ${leg.symbol}`);
}
// حساب نيوزيلندي على USDJPY: `NZDJPY` تقاطعٌ خارج قائمة المزوّد ← الجسر بساقين دولاريتين
assert.deepEqual(conversionPair('JPY', 'NZD'), { symbol: 'NZDJPY', invert: true });
assert.deepEqual(usdBridge('JPY', 'NZD'), {
  first: { symbol: 'USDJPY', invert: true },
  second: { symbol: 'NZDUSD', invert: true },
});
// وعلى NZDUSD نفسه لا جسر أصلاً: التسعير دولار ← الزوج المباشر NZDUSD مقلوباً
assert.deepEqual(conversionPair('USD', 'NZD'), { symbol: 'NZDUSD', invert: true });
assert.equal(usdBridge('USD', 'NZD'), null);

console.log('positionSize selftest: OK');

// المسافة بين سعرين بنقاط الأداة — الموضع الواحد الذي تقرأ منه كل أدوات المتداول
const jpSpec = instrumentSpec('USDJPY')!;
const goldSpec = instrumentSpec('XAUUSD')!;
const silverSpec = instrumentSpec('XAGUSD')!;
assert.equal(pipsBetween(eu, 1.085, 1.0874), 24);
// بلا إشارة: الترتيب لا يغيّر المسافة
assert.equal(pipsBetween(eu, 1.0874, 1.085), 24);
// الين بحجم pip 0.01 لا 0.0001 — الخطأ الذي كان يُخرج «12000 نقطة» على 120 نقطة
assert.equal(pipsBetween(jpSpec, 157.4, 158.6), 120);
assert.equal(pipsBetween(goldSpec, 2350, 2355), 50);
assert.equal(pipsBetween(silverSpec, 28.4, 28.65), 25);
// عُشر النقطة (pipette) يبقى، وما دونه يُقرَّب
assert.equal(pipsBetween(eu, 1.085, 1.08505), 0.5);
assert.equal(pipsBetween(eu, 1.085, 1.085003), 0);
// الصفر قيمة صادقة (سعر عند السوق تماماً) لا «لا شيء»
assert.equal(pipsBetween(eu, 1.085, 1.085), 0);
// سعر غير صالح أو غير موجب ⇒ لا مسافة
assert.equal(pipsBetween(eu, 1.085, 0), null);
assert.equal(pipsBetween(eu, 1.085, -1), null);
assert.equal(pipsBetween(eu, NaN, 1.085), null);
assert.equal(pipsBetween(eu, 1.085, Infinity), null);
// وقف الخسارة يُبنى عليها ولا يقبل الصفر (وقفٌ عند الدخول ليس وقفاً)
assert.equal(slPipsFromPrices(eu, 1.085, 1.085), null);
assert.equal(slPipsFromPrices(eu, 1.085, 1.0825), 25);
assert.equal(slPipsFromPrices(jpSpec, 157.4, 157.7), 30);

console.log('positionSize pipsBetween selftest OK');

/**
 * لماذا يُرفض وقفٌ أضيق من 1 pip بالحاسبة (`slTooClose` بـPositionSizePanel): حجم اللوت يتناسب
 * **عكسياً** مع الوقف بالضبط — فخطأ كتابة يُصغّر الوقف عشرة أضعاف يُكبّر المركز عشرة أضعاف،
 * ويخرج برقمٍ أنيق يبدو محسوباً. الحدّ هو حدّ `analyzePlan` نفسه (`slTooClose`) فلا قاعدتان.
 */
const pvEu = pipValuePerLot(eu, 1); // EURUSD بحساب دولار: 10$ للنقطة للوت
const deep = positionSize({ balance: 10_000, riskPct: 1, slPips: 20, pipValuePerLot: pvEu, contractSize: eu.contractSize })!;
const typo = positionSize({ balance: 10_000, riskPct: 1, slPips: 2, pipValuePerLot: pvEu, contractSize: eu.contractSize })!;
assert.equal(deep.lots, 0.5);
assert.equal(typo.lots, 5);
assert.ok(near(typo.lots / deep.lots, 10));
// وعُشر النقطة يُخرج خمسين ضعفاً — رقمٌ لا يُميَّز بالنظر عن رقم صحيح
const absurd = positionSize({ balance: 10_000, riskPct: 1, slPips: 0.5, pipValuePerLot: pvEu, contractSize: eu.contractSize })!;
assert.equal(absurd.lots, 20);
// المخاطرة المعلنة تبقى 100$ بالثلاثة — فالرقم الخاطئ لا يفضح نفسه بسطر «المخاطرة الفعلية»
for (const r of [deep, typo, absurd]) assert.ok(near(r.actualRisk, 100));

console.log('positionSize slTooClose-rationale selftest OK');

// قيمة الـpip **للمركز المحسوب** (لا للوت القياسي): «كل نقطة عليّ كذا» — من اللوت المقرَّب نفسه،
// فـ`pipValue × slPips = actualRisk` بالبناء
{
  // EURUSD بحساب دولار: 0.33 لوت × 10$ = 3.30$ للنقطة
  const a = positionSize({ balance: 10000, riskPct: 1, slPips: 30, pipValuePerLot: 10, contractSize: 100000 })!;
  assert.equal(a.lots, 0.33);
  assert.ok(near(a.pipValue, 3.3));
  // USDJPY @150 بحساب دولار: 6.667$ للوت → 0.75 لوت → 5$ للنقطة بالضبط
  const jpy = instrumentSpec('USDJPY')!;
  const pvJ = pipValuePerLot(jpy, quoteToAccountRate(conversionPair('JPY', 'USD'), 150)!);
  const b = positionSize({ balance: 10000, riskPct: 1, slPips: 20, pipValuePerLot: pvJ, contractSize: jpy.contractSize })!;
  assert.equal(b.lots, 0.75);
  assert.ok(near(b.pipValue, 5));
  // الذهب: 10$ للوت، 150 نقطة → 0.06 لوت (مقرَّب للأسفل) → 0.60$ للنقطة، ومخاطرة فعلية 90$ لا 100$
  const xau = instrumentSpec('XAUUSD')!;
  const c = positionSize({ balance: 10000, riskPct: 1, slPips: 150, pipValuePerLot: pipValuePerLot(xau, 1), contractSize: xau.contractSize })!;
  assert.equal(c.lots, 0.06);
  assert.ok(near(c.pipValue, 0.6));
  // تحت أصغر لوت: لا مركز ⇒ لا قيمة نقطة
  const d = positionSize({ balance: 100, riskPct: 1, slPips: 50, pipValuePerLot: 10, contractSize: 100000 })!;
  assert.equal(d.pipValue, 0);
  for (const [r, sl] of [[a, 30], [b, 20], [c, 150], [d, 50]] as const) assert.ok(near(r.pipValue * sl, r.actualRisk));
}

console.log('positionSize pipValue-for-position selftest OK');

// —— المخاطرة الفعلية لحجم لوت (سطر «أصغر لوت» والنسبة الفعلية بعد التقريب) ——
{
  // 0.01 لوت، وقف 30 pip، EURUSD (10$/لوت) = 3.00$ ⇒ 6% من رصيد 50$
  const m = riskForLots({ lots: LOT_STEP, slPips: 30, pipValuePerLot: 10, balance: 50 });
  assert.ok(m && Math.abs(m.risk - 3) < 1e-9 && Math.abs(m.pct - 6) < 1e-9);
  assert.equal(formatRiskPct(m!.pct), '6.00%');
  // متّسقة مع positionSize: المخاطرة الفعلية للّوت المقرَّب = actualRisk بالضبط
  const r = positionSize({ balance: 10000, riskPct: 1, slPips: 23, pipValuePerLot: 10, contractSize: 100_000 })!;
  const f = riskForLots({ lots: r.lots, slPips: 23, pipValuePerLot: 10, balance: 10000 })!;
  assert.equal(r.lots, 0.43);
  assert.ok(Math.abs(f.risk - r.actualRisk) < 1e-9);
  assert.equal(formatRiskPct(f.pct), '0.99%'); // 0.43 × 23 × 10 = 98.9$ من 10000
  // USDJPY@150 (6.667$/لوت)، 0.01 لوت، وقف 20 ⇒ 1.33$ من 100$ = 1.33%
  const j = riskForLots({ lots: 0.01, slPips: 20, pipValuePerLot: pipValuePerLot(instrumentSpec('USDJPY')!, 1 / 150), balance: 100 })!;
  assert.equal(formatRiskPct(j.pct), '1.33%');
  // حالة «أقل من أصغر لوت» فعلاً: positionSize يقول belowMinLot، والنسبة لأصغر لوت أكبر من المطلوبة
  const tiny = positionSize({ balance: 50, riskPct: 1, slPips: 30, pipValuePerLot: 10, contractSize: 100_000 })!;
  assert.equal(tiny.belowMinLot, true);
  assert.ok(riskForLots({ lots: LOT_STEP, slPips: 30, pipValuePerLot: 10, balance: 50 })!.pct > 1);
  // تنسيق: منزلة واحدة من 10% فما فوق، وتقريب لا قصّ
  assert.equal(formatRiskPct(12.46), '12.5%');
  assert.equal(formatRiskPct(0.8666), '0.87%');
  assert.equal(formatRiskPct(NaN), '—');
  // مدخل فاسد
  assert.equal(riskForLots({ lots: 0, slPips: 30, pipValuePerLot: 10, balance: 50 }), null);
  assert.equal(riskForLots({ lots: 0.01, slPips: 30, pipValuePerLot: 10, balance: 0 }), null);
  assert.equal(riskForLots({ lots: 0.01, slPips: NaN, pipValuePerLot: 10, balance: 50 }), null);
}

console.log('positionSize riskForLots selftest OK');

// —— المال المعرَّض بعملة التسعير (سطر المخاطرة بالدفتر) ——
{
  // EURUSD: 25 pip × 0.5 لوت × 10$/pip/لوت = 125$
  assert.deepEqual(riskInQuoteCcy({ symbol: 'EURUSD', entry: 1.085, sl: 1.0825, lots: 0.5 }), { amount: 125, ccy: 'USD' });
  // USDJPY: 20 pip × 1 لوت × 1000¥ = 20000¥ (بيع: الوقف فوق — المسافة بلا إشارة)
  assert.deepEqual(riskInQuoteCcy({ symbol: 'USDJPY', entry: 157.4, sl: 157.6, lots: 1 }), { amount: 20000, ccy: 'JPY' });
  // الذهب: 5$ × 100 أونصة × 0.1 لوت = 50$
  assert.deepEqual(riskInQuoteCcy({ symbol: 'XAUUSD', entry: 2650, sl: 2645, lots: 0.1 }), { amount: 50, ccy: 'USD' });
  // الفضة: 0.3$ × 5000 × 0.01 = 15$
  assert.deepEqual(riskInQuoteCcy({ symbol: 'XAGUSD', entry: 31.2, sl: 30.9, lots: 0.01 }), { amount: 15, ccy: 'USD' });
  // EURGBP بالإسترليني، وضجيج الطرح (0.00015000000000009) لا يظهر: 1.5 pip × 0.03 × 10£ = 0.45£
  assert.deepEqual(riskInQuoteCcy({ symbol: 'EURGBP', entry: 0.8431, sl: 0.84295, lots: 0.03 }), { amount: 0.45, ccy: 'GBP' });
  // اتساق مع positionSize: بعملة حساب = عملة التسعير، المال المعرَّض للّوت المحسوب = actualRisk
  const r = positionSize({ balance: 10000, riskPct: 1, slPips: 23, pipValuePerLot: 10, contractSize: 100_000 })!;
  const q = riskInQuoteCcy({ symbol: 'EURUSD', entry: 1.085, sl: 1.0827, lots: r.lots })!;
  assert.ok(Math.abs(q.amount - Math.round(r.actualRisk * 100) / 100) < 1e-9, `${q.amount} vs ${r.actualRisk}`);
  // مرفوض
  assert.equal(riskInQuoteCcy({ symbol: 'BTCUSD', entry: 60000, sl: 59000, lots: 1 }), null);
  assert.equal(riskInQuoteCcy({ symbol: 'EURUSD', entry: 1.085, sl: 1.085, lots: 1 }), null);
  assert.equal(riskInQuoteCcy({ symbol: 'EURUSD', entry: 1.085, sl: 1.08, lots: 0 }), null);
  assert.equal(riskInQuoteCcy({ symbol: 'EURUSD', entry: NaN, sl: 1.08, lots: 1 }), null);
}

console.log('positionSize riskInQuoteCcy selftest OK');

// لاحقة الوسيط (الدفتر يقبلها عمداً): الأداة نفسها بمواصفاتها، والرمز القانوني بلا لاحقة
{
  const same = (raw: string, canon: string) => {
    const s = instrumentSpec(raw);
    assert.ok(s, `${raw} should resolve`);
    assert.deepEqual(s, instrumentSpec(canon), raw);
  };
  same('EURUSD.m', 'EURUSD');
  same('EURUSDm', 'EURUSD');
  same('XAUUSD.pro', 'XAUUSD');
  same('GBPJPY-ECN', 'GBPJPY');
  same('USDJPY#', 'USDJPY');
  same('xagusd.m', 'XAGUSD');
  same('EUR/USD.m', 'EURUSD');
  same('EURUSD+', 'EURUSD');
  assert.equal(instrumentSpec('XAUUSD.m')!.symbol, 'XAUUSD');
  // حرف ملاصق غير M قد يكون رمزاً آخر (يورو/تيثر) — يبقى مرفوضاً بدل التخمين
  assert.equal(instrumentSpec('EURUSDT'), null);
  assert.equal(instrumentSpec('EURUSDX'), null);
  // لاحقة طويلة، أو أساس غير ورقي، يبقيان مرفوضين
  assert.equal(instrumentSpec('EURUSD.abcdef'), null);
  assert.equal(instrumentSpec('BTCUSD.m'), null);
  assert.equal(instrumentSpec('XAUXAG.m'), null);
  assert.equal(instrumentSpec('US30.m'), null);
  // ما كان يغيب بصمت عن صفقة الدفتر: المال المعرَّض والنقاط
  assert.deepEqual(riskInQuoteCcy({ symbol: 'XAUUSD.m', entry: 2650, sl: 2645, lots: 0.1 }), { amount: 50, ccy: 'USD' });
  assert.equal(pipsBetween(instrumentSpec('USDJPYm')!, 157.4, 157.2), 20);
}

console.log('positionSize broker-suffix selftest OK');

// formatMoney — الين بلا كسور، والبقية منزلتان، وتقريب متماثل منظَّف من ضجيج الفاصلة العائمة
{
  assert.equal(moneyDecimals('JPY'), 0);
  assert.equal(moneyDecimals('jpy'), 0);
  for (const c of ACCOUNT_CCYS.filter((c) => c !== 'JPY')) assert.equal(moneyDecimals(c), 2, c);
  assert.equal(formatMoney(1500, 'JPY'), '1,500 JPY');
  assert.equal(formatMoney(1572.4, 'JPY'), '1,572 JPY');
  assert.equal(formatMoney(1572.5, 'JPY'), '1,573 JPY');
  assert.equal(formatMoney(15.7, 'JPY'), '16 JPY');
  assert.equal(formatMoney(1234.5, 'USD'), '1,234.50 USD');
  assert.equal(formatMoney(1000000, 'EUR'), '1,000,000.00 EUR');
  assert.equal(formatMoney(0, 'USD'), '0.00 USD');
  assert.equal(formatMoney(1.005, 'USD'), '1.01 USD'); // toFixed(2) وحده: «1.00»
  assert.equal(formatMoney(0.125, 'GBP'), '0.13 GBP');
  assert.equal(formatMoney(-0.125, 'GBP'), '−0.13 GBP');
  assert.equal(formatMoney(-0.001, 'USD'), '0.00 USD'); // لا «−0.00»
  assert.equal(formatMoney(NaN, 'USD'), '—');
  assert.equal(formatMoney(Infinity, 'USD'), '—');

  // سيناريو الحاسبة بحساب بالين: EURUSD، USDJPY = 157.24، رصيد 1,000,000 ين، 1%، وقف 25 pip
  const spec = instrumentSpec('EURUSD')!;
  const conv = conversionPair(spec.quote, 'JPY')!;
  const pv = pipValuePerLot(spec, quoteToAccountRate(conv, 157.24)!);
  assert.equal(formatMoney(pv, 'JPY'), '1,572 JPY');
  const r = positionSize({ balance: 1_000_000, riskPct: 1, slPips: 25, pipValuePerLot: pv, contractSize: spec.contractSize })!;
  assert.equal(r.lots, 0.25); // 10,000 ÷ (25 × 1,572.4) = 0.254 ⇒ 0.25
  assert.equal(formatMoney(r.actualRisk, 'JPY'), '9,828 JPY'); // 9,827.5 — لا «9,827.50 JPY»
  assert.equal(formatMoney(r.pipValue, 'JPY'), '393 JPY'); // 0.25 × 1,572.4 = 393.1
  assert.ok(r.actualRisk <= 10_000);
  // ومبلغ الدفتر بعملة التسعير (USDJPY ⇒ ين): 20 pip × 0.5 لوت = 10,000 ين
  const q = riskInQuoteCcy({ symbol: 'USDJPY', entry: 157.4, sl: 157.2, lots: 0.5 })!;
  assert.equal(formatMoney(q.amount, q.ccy), '10,000 JPY');
  const g = riskInQuoteCcy({ symbol: 'XAUUSD', entry: 2350.5, sl: 2340.5, lots: 0.25 })!;
  assert.equal(formatMoney(g.amount, g.ccy), '250.00 USD');
}

console.log('positionSize formatMoney selftest OK');

/**
 * `slPipsFromPrices` تقرّب **للأعلى** لعُشر pip: المسافة يُقسَم عليها حجم اللوت، فوقفٌ محسوب أقصر من
 * الحقيقي = مركز يخاطر بأكثر من النسبة المختارة.
 */
{
  const au = instrumentSpec('XAUUSD')!;
  const jp = instrumentSpec('USDJPY')!;
  // سعر وقف بمنزلة دون الـpipette: 24.51 pip ⇒ 24.6 (أعلى عُشر)، وكان 24.5
  assert.equal(slPipsFromPrices(eu, 1.085, 1.082549), 24.6);
  assert.equal(slPipsFromPrices(eu, 1.082549, 1.085), 24.6); // الاتجاه لا يغيّر شيئاً
  // ذهب: 19.96 ⇒ 20، و19.49/19.41 ⇒ 19.5 (كان 19.4 للثانية)، و19.59 ⇒ 19.6
  assert.equal(slPipsFromPrices(au, 2400, 2398.004), 20);
  assert.equal(slPipsFromPrices(au, 2400, 2398.051), 19.5);
  assert.equal(slPipsFromPrices(au, 2400, 2398.059), 19.5);
  assert.equal(slPipsFromPrices(au, 2400, 2398.041), 19.6);
  // ين بمنزلة رابعة: 150 − 149.7249 = 27.51 ⇒ 27.6 (كان 27.5)
  assert.equal(slPipsFromPrices(jp, 150, 149.7249), 27.6);
  // أسعار على شبكة الـpipette لا تتحرّك: ضجيج الفاصلة العائمة لا يدفع ceil منزلةً كاملة
  assert.equal(slPipsFromPrices(eu, 1.08503, 1.08251), 25.2);
  assert.equal(slPipsFromPrices(eu, 1.0851, 1.085), 1);
  assert.equal(slPipsFromPrices(jp, 157.4, 157.2), 20);
  assert.equal(slPipsFromPrices(au, 2350.5, 2340.5), 100);
  for (let i = 1; i <= 3000; i++) {
    // كل مسافة على الشبكة (i pipette) تعود كما هي حرفياً
    assert.equal(slPipsFromPrices(eu, 1.1, Number((1.1 - i * 0.00001).toFixed(5))), i / 10);
    assert.equal(slPipsFromPrices(jp, 150, Number((150 - i * 0.001).toFixed(3))), i / 10);
  }
  // البرهان المالي: وقف حقيقي 25.04 pip (1.085 → 1.082496)، 1% من 10,000. بالتقريب العادي كان 25.0 ⇒
  // 0.40 لوت ⇒ خسارة فعلية عند الوقف 100.16$ > 100$. الآن 25.1 ⇒ 0.39 لوت ⇒ 97.66$.
  const sl = slPipsFromPrices(eu, 1.085, 1.082496)!;
  assert.equal(sl, 25.1);
  const r = positionSize({ balance: 10_000, riskPct: 1, slPips: sl, pipValuePerLot: pvEu, contractSize: eu.contractSize })!;
  assert.equal(r.lots, 0.39);
  assert.ok(r.lots * 25.04 * pvEu <= 100);
  const old = positionSize({ balance: 10_000, riskPct: 1, slPips: 25, pipValuePerLot: pvEu, contractSize: eu.contractSize })!;
  assert.ok(old.lots * 25.04 * pvEu > 100); // ما كان يحدث
  // مسح عشوائي: أي وقف حقيقي بأي منزلة، الخسارة عند الوقف بحجم الحاسبة ≤ المخاطرة المطلوبة
  let seed = 7;
  const rnd = (): number => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 5000; i++) {
    const stop = 1.1 - (0.0005 + rnd() * 0.01);
    const trueSl: number = (1.1 - stop) / eu.pipSize;
    const p = slPipsFromPrices(eu, 1.1, stop)!;
    const bal = 500 + Math.floor(rnd() * 50_000);
    const z = positionSize({ balance: bal, riskPct: 1, slPips: p, pipValuePerLot: pvEu, contractSize: eu.contractSize })!;
    assert.ok(z.lots * trueSl * pvEu <= bal / 100 + 1e-9, `stop ${stop} bal ${bal}`);
  }
  assert.equal(slPipsFromPrices(eu, 1.085, 1.085), null);
  assert.equal(slPipsFromPrices(eu, NaN, 1.08), null);
}

console.log('positionSize slPipsFromPrices ceil selftest OK');

/** `pnlInQuoteCcy`: نتيجة الصفقة بالمال بعملة التسعير لسطر الدفتر. */
{
  // EURUSD شراء 0.50 لوت، +25 pip ⇒ +125 USD
  assert.deepEqual(pnlInQuoteCcy({ symbol: 'EURUSD', side: 'buy', entry: 1.085, exit: 1.0875, lots: 0.5 }), { amount: 125, ccy: 'USD' });
  // البيع معكوس
  assert.deepEqual(pnlInQuoteCcy({ symbol: 'EURUSD', side: 'sell', entry: 1.085, exit: 1.0875, lots: 0.5 }), { amount: -125, ccy: 'USD' });
  // الين: USDJPY بيع 1 لوت، 30 pip لصالحه ⇒ +30,000 JPY
  const jpy = pnlInQuoteCcy({ symbol: 'USDJPY', side: 'sell', entry: 157.4, exit: 157.1, lots: 1 })!;
  assert.deepEqual(jpy, { amount: 30000, ccy: 'JPY' });
  assert.equal(formatMoney(jpy.amount, jpy.ccy), '30,000 JPY');
  // الذهب 100 أونصة: شراء 0.10 من 2350.5 إلى 2340.25 ⇒ −102.50 USD
  const g = pnlInQuoteCcy({ symbol: 'XAUUSD', side: 'buy', entry: 2350.5, exit: 2340.25, lots: 0.1 })!;
  assert.deepEqual(g, { amount: -102.5, ccy: 'USD' });
  assert.equal(formatMoney(g.amount, g.ccy), '−102.50 USD');
  // الفضة 5,000 أونصة
  assert.deepEqual(pnlInQuoteCcy({ symbol: 'XAGUSD', side: 'buy', entry: 30, exit: 30.1, lots: 0.2 }), { amount: 100, ccy: 'USD' });
  // تقاطع: EURGBP بالإسترليني
  assert.deepEqual(pnlInQuoteCcy({ symbol: 'EURGBP', side: 'buy', entry: 0.85, exit: 0.852, lots: 1 }), { amount: 200, ccy: 'GBP' });
  // رمز الوسيط بلاحقة يُحسب كالقانوني
  assert.deepEqual(pnlInQuoteCcy({ symbol: 'XAUUSD.m', side: 'buy', entry: 2350.5, exit: 2340.25, lots: 0.1 }), g);
  // ضجيج الفاصلة العائمة: 1.0851 − 1.085 على لوت = 10 بالضبط لا 9.999999
  assert.deepEqual(pnlInQuoteCcy({ symbol: 'EURUSD', side: 'buy', entry: 1.085, exit: 1.0851, lots: 1 }), { amount: 10, ccy: 'USD' });
  // تماثل حول الصفر: الربح والخسارة المتماثلان بنفس الرقم (0.005 USD ⇒ ±0.01)
  const up = pnlInQuoteCcy({ symbol: 'EURUSD', side: 'buy', entry: 1.1, exit: 1.10001, lots: 0.005 })!;
  const dn = pnlInQuoteCcy({ symbol: 'EURUSD', side: 'sell', entry: 1.1, exit: 1.10001, lots: 0.005 })!;
  assert.equal(up.amount, -dn.amount);
  // التعادل صفر بلا «−0»
  const flat = pnlInQuoteCcy({ symbol: 'EURUSD', side: 'sell', entry: 1.085, exit: 1.085, lots: 1 })!;
  assert.ok(Object.is(flat.amount, 0));
  // مطابقة مخاطرة الصفقة: الخروج عند الوقف = −riskInQuoteCcy حرفياً
  for (const [sym, e, s, l] of [['EURUSD', 1.085, 1.0825, 0.37], ['USDJPY', 150, 149.62, 0.2], ['XAUUSD', 2400, 2385.5, 0.03]] as const) {
    const risk = riskInQuoteCcy({ symbol: sym, entry: e, sl: s, lots: l })!;
    const hit = pnlInQuoteCcy({ symbol: sym, side: 'buy', entry: e, exit: s, lots: l })!;
    assert.equal(hit.amount, -risk.amount, sym);
    assert.equal(hit.ccy, risk.ccy);
  }
  // مدخل غير صالح / أداة بلا مواصفات
  assert.equal(pnlInQuoteCcy({ symbol: 'NAS100', side: 'buy', entry: 18000, exit: 18100, lots: 1 }), null);
  assert.equal(pnlInQuoteCcy({ symbol: 'EURUSD', side: 'buy', entry: 1.085, exit: 0, lots: 1 }), null);
  assert.equal(pnlInQuoteCcy({ symbol: 'EURUSD', side: 'buy', entry: 1.085, exit: 1.09, lots: 0 }), null);
  assert.equal(pnlInQuoteCcy({ symbol: 'EURUSD', side: 'buy', entry: NaN, exit: 1.09, lots: 1 }), null);
}

console.log('positionSize pnlInQuoteCcy selftest OK');

// —— profitAtTarget: الربح المحتمل من المسافة الخام لا من نقاط الهدف المقرَّبة للعرض ——
{
  // هدف بمنزلة دون الـpipette: 25.49 pip. القديم (rewardPips 25.5 × 10 × 0.4) = 102.00 — أكبر من الحقيقة
  const p = profitAtTarget({ spec: eu, entry: 1.085, target: 1.087549, lots: 0.4, quoteToAccount: 1 })!;
  assert.ok(near(p, 101.96, 1e-6), String(p));
  assert.equal(formatMoney(p, 'USD'), '101.96 USD');
  assert.notEqual(formatMoney(p, 'USD'), formatMoney(25.5 * pipValuePerLot(eu, 1) * 0.4, 'USD'));
  // الاتجاه لا يهمّ (المسافة كمّية): هدف بيع تحت الدخول
  assert.ok(near(profitAtTarget({ spec: eu, entry: 1.085, target: 1.082451, lots: 0.4, quoteToAccount: 1 })!, 101.96));
  // على شبكة الـpipette يطابق الطريقة القديمة حرفياً: 50 pip × 10$ × 0.4 = 200
  assert.ok(near(profitAtTarget({ spec: eu, entry: 1.085, target: 1.09, lots: 0.4, quoteToAccount: 1 })!, 200));
  // USDJPY بحساب دولار: 50 pip × 100,000 × 0.01 ÷ 150 × 0.5 لوت = 33.33 USD
  const jp = profitAtTarget({ spec: uj, entry: 150, target: 150.5, lots: 0.5, quoteToAccount: ujRate })!;
  assert.equal(formatMoney(jp, 'USD'), '166.67 USD');
  // الذهب: 12.35$ × 100 أونصة × 0.2 = 247.00
  assert.ok(near(profitAtTarget({ spec: au, entry: 2400, target: 2412.35, lots: 0.2, quoteToAccount: 1 })!, 247));
  // هدف 1:2 على خطة كاملة = ضعف المخاطرة الفعلية للّوت نفسه بالضبط (أسعار على الشبكة)
  const sl = slPipsFromPrices(eu, 1.085, 1.0825)!;
  const rs = positionSize({ balance: 10_000, riskPct: 1, slPips: sl, pipValuePerLot: pvEu, contractSize: eu.contractSize })!;
  const tp2 = profitAtTarget({ spec: eu, entry: 1.085, target: 1.09, lots: rs.lots, quoteToAccount: 1 })!;
  assert.ok(near(tp2, 2 * rs.actualRisk), `${tp2} vs ${rs.actualRisk}`);
  // مدخلات غير صالحة
  assert.equal(profitAtTarget({ spec: eu, entry: 1.085, target: 1.085, lots: 1, quoteToAccount: 1 }), null);
  assert.equal(profitAtTarget({ spec: eu, entry: 1.085, target: 1.09, lots: 0, quoteToAccount: 1 }), null);
  assert.equal(profitAtTarget({ spec: eu, entry: 1.085, target: NaN, lots: 1, quoteToAccount: 1 }), null);
  assert.equal(profitAtTarget({ spec: eu, entry: 1.085, target: 1.09, lots: 1, quoteToAccount: -1 }), null);
}
console.log('positionSize profitAtTarget selftest OK');

// —— ربح الهدف بملخّص خطة الدفتر: pnlInQuoteCcy عند الهدف = R:R × riskInQuoteCcy للحجم نفسه ——
{
  const cases = [
    { symbol: 'EURUSD', side: 'buy' as const, entry: 1.085, sl: 1.0825, tp: 1.09, lots: 0.5, rr: 2, ccy: 'USD', gain: '250.00 USD' },
    { symbol: 'USDJPY', side: 'sell' as const, entry: 150, sl: 150.3, tp: 149.55, lots: 0.2, rr: 1.5, ccy: 'JPY', gain: '9,000 JPY' },
    { symbol: 'XAUUSD', side: 'buy' as const, entry: 2400, sl: 2390, tp: 2430, lots: 0.1, rr: 3, ccy: 'USD', gain: '300.00 USD' },
    { symbol: 'GBPJPY-ECN', side: 'buy' as const, entry: 190, sl: 189.8, tp: 190.2, lots: 1.5, rr: 1, ccy: 'JPY', gain: '30,000 JPY' },
  ];
  for (const c of cases) {
    const risk = riskInQuoteCcy({ symbol: c.symbol, entry: c.entry, sl: c.sl, lots: c.lots })!;
    const gain = pnlInQuoteCcy({ symbol: c.symbol, side: c.side, entry: c.entry, exit: c.tp, lots: c.lots })!;
    assert.equal(gain.ccy, risk.ccy, c.symbol);
    assert.equal(gain.ccy, c.ccy, c.symbol);
    assert.ok(gain.amount > 0, c.symbol);
    assert.ok(near(gain.amount, c.rr * risk.amount, 1e-6), `${c.symbol}: ${gain.amount} vs ${c.rr}×${risk.amount}`);
    assert.equal(formatMoney(gain.amount, gain.ccy), c.gain, c.symbol);
  }
}
console.log('positionSize journal plan gain selftest OK');

// —— requiredMargin / parseLeverage: الهامش المحجوز بالحاسبة ——
{
  // الرافعة كما تُنسخ من المنصّة
  assert.equal(parseLeverage('100'), 100);
  assert.equal(parseLeverage('1:100'), 100);
  assert.equal(parseLeverage(' 1 : 500 '), 500);
  assert.equal(parseLeverage('1/30'), 30);
  assert.equal(parseLeverage('١:٢٠٠'), 200);
  assert.equal(parseLeverage('۱:۴۰۰'), 400);
  // لوحة المفاتيح اليابانية: أرقام ونقطتان وشرطة مائلة عريضة
  assert.equal(parseLeverage('１：５００'), 500);
  assert.equal(parseLeverage('１／２５'), 25);
  assert.equal(parseLeverage('２００'), 200);
  assert.equal(parseLeverage('１０００００'), null); // الحدّ نفسه
  assert.equal(parseLeverage('1'), 1); // بلا رافعة: الهامش = القيمة الاسمية كاملة
  for (const bad of ['', '0', '0.5', '1:0', '10000', '100:1', '2:100', 'abc', '1:', ':100', '-100', '1.000', '1:1.000', '1:2.000', '٢٫٠٠٠', '500.000']) {
    assert.equal(parseLeverage(bad), null, bad);
  }
  // «1.000» مرفوضة لأنها مبهمة: الرسالة تسأل «1:1000؟» بقراءة الآلاف، لا «رقم غير مفهوم… مثل 1.0850»
  assert.deepEqual(leverageAmbiguousThousands('1.000'), { value: '1.000', big: 1000 });
  assert.deepEqual(leverageAmbiguousThousands(' 1:1.000 '), { value: '1:1.000', big: 1000 });
  assert.deepEqual(leverageAmbiguousThousands('1/2.000'), { value: '1/2.000', big: 2000 });
  assert.deepEqual(leverageAmbiguousThousands('٢٫٠٠٠'), { value: '٢٫٠٠٠', big: 2000 });
  assert.deepEqual(leverageAmbiguousThousands('１.０００'), { value: '１.０００', big: 1000 });
  assert.deepEqual(leverageAmbiguousThousands('3.000'), { value: '3.000', big: 3000 });
  // قراءة الآلاف فوق الحدّ أو صفر: ليست اقتراحاً ⇒ الرسالة العامة
  for (const raw of ['500.000', '4.000', '0.000', '1:5.000']) assert.equal(leverageAmbiguousThousands(raw), null, raw);
  // غير مبهمة: مقبولة أو مرفوضة لسبب آخر
  for (const raw of ['', '1000', '1:1000', '1.5', '1:33.3', '1.00', '1.0000', '1,000', '100:1', 'abc', '10.000.000']) {
    assert.equal(leverageAmbiguousThousands(raw), null, raw);
  }
  // لا تُقبل بحسابها: المبهمة تبقى مرفوضة
  assert.equal(parseLeverage('1.000'), null);
  assert.equal(leverageOutOfRange('1.000'), false);

  const m = (sym: string, lots: number, price: number, rate: number, lev: number) =>
    requiredMargin({ spec: instrumentSpec(sym)!, lots, price, quoteToAccount: rate, leverage: lev });
  // EURUSD بحساب دولار: 0.5 × 100,000 × 1.085 ÷ 100 = 542.50 USD
  assert.equal(formatMoney(m('EURUSD', 0.5, 1.085, 1, 100)!, 'USD'), '542.50 USD');
  // الذهب: 0.1 × 100 × 2400 ÷ 100 = 240.00 USD
  assert.equal(formatMoney(m('XAUUSD', 0.1, 2400, 1, 100)!, 'USD'), '240.00 USD');
  // USDJPY بحساب دولار: السعر يُلغي نفسه — 1 لوت ÷ 100 = 1,000 USD مهما كان سعر الين
  const jpyRate = quoteToAccountRate(conversionPair('JPY', 'USD'), 150)!;
  assert.ok(near(m('USDJPY', 1, 150, jpyRate, 100)!, 1000));
  assert.ok(near(m('USDJPY', 1, 160, quoteToAccountRate(conversionPair('JPY', 'USD'), 160)!, 100)!, 1000));
  // EURUSD بحساب يورو: 1 لوت ÷ 30 = 3,333.33 EUR (العملة الأساس = عملة الحساب)
  const usdToEur = quoteToAccountRate(conversionPair('USD', 'EUR'), 1.085)!;
  assert.equal(formatMoney(m('EURUSD', 1, 1.085, usdToEur, 30)!, 'EUR'), '3,333.33 EUR');
  // حساب بالين على الذهب: 0.1 × 100 × 2400 × 150 ÷ 100 = 36,000 JPY
  assert.equal(formatMoney(m('XAUUSD', 0.1, 2400, 150, 100)!, 'JPY'), '36,000 JPY');
  // الهامش يتناسب مع اللوت وعكسياً مع الرافعة
  assert.ok(near(m('GBPUSD', 0.4, 1.27, 1, 50)!, 2 * m('GBPUSD', 0.2, 1.27, 1, 50)!));
  assert.ok(near(m('GBPUSD', 0.4, 1.27, 1, 50)!, 10 * m('GBPUSD', 0.4, 1.27, 1, 500)!));
  // السيناريو الذي من أجله الخانة: حجم مخاطرة صحيح (1% من 500$ على وقف 1 pip) لا يتّسع له الهامش
  const spec = instrumentSpec('EURUSD')!;
  const size = positionSize({ balance: 500, riskPct: 1, slPips: 1, pipValuePerLot: pipValuePerLot(spec, 1), contractSize: spec.contractSize })!;
  assert.equal(size.lots, 0.5);
  assert.ok(m('EURUSD', size.lots, 1.085, 1, 30)! > 500);
  // مدخل غير صالح
  assert.equal(m('EURUSD', 0, 1.085, 1, 100), null);
  assert.equal(m('EURUSD', 0.1, NaN, 1, 100), null);
  assert.equal(m('EURUSD', 0.1, 1.085, 1, 0), null);
  assert.equal(m('EURUSD', 0.1, 1.085, -1, 100), null);
}
console.log('positionSize margin selftest OK');

// —— maxLotsForMargin: أكبر لوت يتّسع له الرصيد هامشاً ——
{
  const eu = instrumentSpec('EURUSD')!;
  const mx = (sym: string, avail: number, price: number, rate: number, lev: number) =>
    maxLotsForMargin({ spec: instrumentSpec(sym)!, available: avail, price, quoteToAccount: rate, leverage: lev });
  // 500 USD × 30 ÷ (100,000 × 1.085) = 0.1382 ⇒ 0.13 (للأسفل)
  assert.equal(mx('EURUSD', 500, 1.085, 1, 30), 0.13);
  // الحدّ الدقيق: 1,000 USD برافعة 100 على EURUSD عند 1.0 = لوت واحد بالضبط (لا 0.99 من ضجيج عائم)
  assert.equal(mx('EURUSD', 1000, 1.0, 1, 100), 1);
  // 0.3 لوت تماماً: 325.5 × 100 ÷ 108,500 = 0.3 — ضجيج 0.29999 لا يُسقطها لـ0.29
  assert.equal(mx('EURUSD', 325.5, 1.085, 1, 100), 0.3);
  // الذهب: 1,000 × 100 ÷ (100 × 2400) = 0.4166 ⇒ 0.41
  assert.equal(mx('XAUUSD', 1000, 2400, 1, 100), 0.41);
  // USDJPY بحساب دولار: السعر يُلغي نفسه — 1,000 × 50 ÷ 100,000 = 0.5
  assert.equal(mx('USDJPY', 1000, 150, quoteToAccountRate(conversionPair('JPY', 'USD'), 150)!, 50), 0.5);
  // لا يتّسع حتى أصغر لوت
  assert.equal(mx('XAUUSD', 10, 2400, 1, 10), 0);
  // العكس لا يتجاوز المتاح أبداً، على شبكة من الحالات
  for (const avail of [37, 500, 1234.56, 9999]) {
    for (const lev of [1, 30, 100, 500]) {
      for (const price of [0.66, 1.085, 1.27]) {
        const l = maxLotsForMargin({ spec: eu, available: avail, price, quoteToAccount: 1, leverage: lev })!;
        if (l > 0) {
          assert.ok(requiredMargin({ spec: eu, lots: l, price, quoteToAccount: 1, leverage: lev })! <= avail + 1e-9);
        }
        // وخطوة واحدة فوقه تتجاوز المتاح (أي أنه الأكبر فعلاً)
        const up = Math.round((l + LOT_STEP) * 100) / 100;
        assert.ok(requiredMargin({ spec: eu, lots: up, price, quoteToAccount: 1, leverage: lev })! > avail - 1e-9);
      }
    }
  }
  assert.equal(mx('EURUSD', 0, 1.085, 1, 30), null);
  assert.equal(mx('EURUSD', 500, 1.085, 1, NaN), null);
}
console.log('positionSize maxLotsForMargin selftest OK');

// —— stopPipsMismatch: غير متماثل — الأضيق تعارضٌ بأي فرق، الأوسع بهامش نصف pipette
{
  assert.equal(stopPipsMismatch(25, 25), null);
  assert.equal(stopPipsMismatch(25.04, 25), null); // أوسع قليلاً = لوت أصغر، مسموح
  assert.equal(stopPipsMismatch(25.05, 25), null);
  assert.deepEqual(stopPipsMismatch(25.1, 25), { typed: 25.1, derived: 25, narrower: false });
  // الحالة التي كان هامش ±0.05 يمرّرها: نقاط أضيق من السعرين ⇒ لوت أكبر من وقفه المحفوظ
  assert.deepEqual(stopPipsMismatch(24.96, 25), { typed: 24.96, derived: 25, narrower: true });
  assert.deepEqual(stopPipsMismatch(15, 25), { typed: 15, derived: 25, narrower: true });
  // ضجيج عائم لا يُعدّ أضيق
  assert.equal(stopPipsMismatch(0.1 + 0.2, 0.3), null);
  // لا مقارنة بلا سعرين أو بخانة فارغة
  assert.equal(stopPipsMismatch(20, null), null);
  assert.equal(stopPipsMismatch(NaN, 25), null);
  // البرهان المالي: كل «لا تعارض» يعني أن مخاطرة اللوت على الوقف المحفوظ لا تتجاوز المطلوبة
  const pv = pipValuePerLot(eu, 1);
  for (const derived of [5, 12.3, 25, 40.7]) {
    for (let d = -1; d <= 1; d += 0.01) {
      const typed = Math.round((derived + d) * 100) / 100;
      if (typed <= 0 || stopPipsMismatch(typed, derived)) continue;
      const r = positionSize({ balance: 10_000, riskPct: 1, slPips: typed, pipValuePerLot: pv, contractSize: eu.contractSize })!;
      assert.ok(r.lots * derived * pv <= 100 + 1e-6, `typed ${typed} derived ${derived}`);
    }
  }
  // `narrower` = الحالة الخطرة بالضبط: كل تعارض أوسع لا يُخرج لوتاً أكبر من لوت الوقف المحفوظ
  for (const derived of [5, 12.3, 25, 40.7]) {
    const atDerived = positionSize({ balance: 10_000, riskPct: 1, slPips: derived, pipValuePerLot: pv, contractSize: eu.contractSize })!;
    for (let d = -3; d <= 3; d += 0.01) {
      const typed = Math.round((derived + d) * 100) / 100;
      const mm = typed > 0 ? stopPipsMismatch(typed, derived) : null;
      if (!mm) continue;
      assert.equal(mm.narrower, typed < derived, `typed ${typed} derived ${derived}`);
      if (!mm.narrower) {
        const r = positionSize({ balance: 10_000, riskPct: 1, slPips: typed, pipValuePerLot: pv, contractSize: eu.contractSize })!;
        assert.ok(r.lots <= atDerived.lots, `wider ${typed} derived ${derived}`);
      }
    }
  }
}
console.log('positionSize stopPipsMismatch selftest OK');

// —— marginPrice: الدخول المكتوب أولاً، ثم السوق بجهة الصفقة، ثم الوسطي
{
  const q = { price: 1.085, bid: 1.0849, ask: 1.0851 };
  assert.deepEqual(marginPrice({ entry: 1.09, quote: q, side: 'buy' }), { price: 1.09, live: false });
  assert.deepEqual(marginPrice({ entry: NaN, quote: q, side: 'buy' }), { price: 1.0851, live: true });
  assert.deepEqual(marginPrice({ entry: NaN, quote: q, side: 'sell' }), { price: 1.0849, live: true });
  assert.deepEqual(marginPrice({ entry: NaN, quote: q, side: null }), { price: 1.085, live: true });
  assert.deepEqual(marginPrice({ entry: 0, quote: { price: 2400, bid: null, ask: 0 }, side: 'buy' }), { price: 2400, live: true });
  assert.equal(marginPrice({ entry: NaN, quote: null, side: 'buy' }), null);
  assert.equal(marginPrice({ entry: NaN, quote: { price: NaN }, side: null }), null);
  // السيناريو المقصود: 1% من 500$ على وقف 1 pip بلا دخول مكتوب — السطر يظهر بسعر السوق
  const lots = positionSize({ balance: 500, riskPct: 1, slPips: 1, pipValuePerLot: pipValuePerLot(eu, 1), contractSize: eu.contractSize })!.lots;
  const mp = marginPrice({ entry: NaN, quote: q, side: null })!;
  const m = requiredMargin({ spec: eu, lots, price: mp.price, quoteToAccount: 1, leverage: 30 })!;
  assert.ok(near(m, (0.5 * 100_000 * 1.085) / 30, 1e-6));
  assert.ok(m > 500);
}
console.log('positionSize marginPrice selftest OK');

// —— sizeLooksLikeUnits: وحدات منسوخة من المنصّة بخانة «الحجم لوت»
{
  const gold = instrumentSpec('XAUUSD')!;
  const jpy = instrumentSpec('USDJPY')!;
  // لوتات معقولة: لا شيء
  for (const s of [0.01, 0.1, 1, 2.5, 50, MAX_SANE_LOTS]) assert.equal(sizeLooksLikeUnits(s, eu), null);
  assert.deepEqual(sizeLooksLikeUnits(10_000, eu), { lots: 0.1 });
  assert.deepEqual(sizeLooksLikeUnits(1_000, eu), { lots: 0.01 });
  assert.deepEqual(sizeLooksLikeUnits(150_000, jpy), { lots: 1.5 });
  assert.deepEqual(sizeLooksLikeUnits(1_000, gold), { lots: 10 });
  assert.deepEqual(sizeLooksLikeUnits(250, gold), { lots: 2.5 });
  // مريب بلا تحويل واضح: دون أصغر لوت، أو ليس على خطوة اللوت، أو التحويل نفسه فوق الحدّ
  assert.deepEqual(sizeLooksLikeUnits(500, eu), { lots: null });
  assert.deepEqual(sizeLooksLikeUnits(12_345, eu), { lots: null });
  assert.deepEqual(sizeLooksLikeUnits(50_000, gold), { lots: null });
  // أداة مجهولة (US30): لا حجم عقد فلا حكم
  assert.equal(sizeLooksLikeUnits(10_000, null), null);
  assert.equal(sizeLooksLikeUnits(NaN, eu), null);
  // الاقتراح يُرجِع الوحدات نفسها بالضبط
  for (const units of [1_000, 3_000, 10_000, 25_000, 110_000, 1_000_000]) {
    const r = sizeLooksLikeUnits(units, eu)!;
    assert.ok(r.lots != null && Math.round(r.lots * eu.contractSize) === units, String(units));
  }
}
console.log('positionSize sizeLooksLikeUnits selftest OK');

// —— السبريد: خانته، والمخاطرة شاملة السبريد، واللوت الذي يُبقيها ضمن النسبة
{
  assert.equal(parseSpreadPips(''), 0);
  assert.equal(parseSpreadPips('  '), 0);
  assert.equal(parseSpreadPips('1.5'), 1.5);
  assert.equal(parseSpreadPips('1,5'), 1.5);
  assert.equal(parseSpreadPips('٢٫٥'), 2.5);
  assert.equal(parseSpreadPips('0'), 0);
  assert.equal(parseSpreadPips(String(MAX_SPREAD_PIPS)), MAX_SPREAD_PIPS);
  for (const bad of ['-1', '501', '10851', 'abc', '1.2.3']) assert.equal(parseSpreadPips(bad), null, bad);

  const pv = pipValuePerLot(eu, 1); // 10 USD
  const base = { pipValuePerLot: pv, balance: 10_000, riskPct: 1, contractSize: eu.contractSize };
  // مثال مفتاح الترجمة نفسه: 1% من 10,000 على وقف 20 = 0.50 لوت؛ بسبريد 1.5 يخسر 21.5 pip = 107.50 = 1.075%
  const sized = positionSize({ balance: 10_000, riskPct: 1, slPips: 20, pipValuePerLot: pv, contractSize: eu.contractSize })!;
  assert.equal(sized.lots, 0.5);
  const r = spreadRisk({ ...base, lots: sized.lots, slPips: 20, spreadPips: 1.5 })!;
  assert.ok(near(r.risk, 107.5));
  assert.ok(near(r.pct, 1.075));
  // 100 / (21.5 × 10) = 0.465 → 0.46 للأسفل
  assert.equal(r.lotsWithin, 0.46);
  // وقف ضيّق: السبريد يأكل أكثر — 5 + 2 على 2.00 لوت = 140 = 1.4%
  const tight = spreadRisk({ ...base, lots: 2, slPips: 5, spreadPips: 2 })!;
  assert.ok(near(tight.pct, 1.4));
  assert.equal(tight.lotsWithin, 1.42);
  // بلا سبريد / مدخل غير صالح: لا سطر
  assert.equal(spreadRisk({ ...base, lots: 0.5, slPips: 20, spreadPips: 0 }), null);
  assert.equal(spreadRisk({ ...base, lots: 0.5, slPips: 20, spreadPips: NaN }), null);
  assert.equal(spreadRisk({ ...base, lots: 0, slPips: 20, spreadPips: 1 }), null);
  // دون أصغر لوت بعد السبريد: المخاطرة تُحسب، و`lotsWithin` = null
  const small = spreadRisk({ ...base, balance: 50, lots: 0.01, slPips: 3, spreadPips: 3 })!;
  assert.ok(near(small.risk, 0.6));
  assert.equal(small.lotsWithin, null);
  // البرهان: على شبكة، `lotsWithin` لا يتجاوز المخاطرة المطلوبة شاملة السبريد، وخطوة فوقه تتجاوزها،
  // والمخاطرة شاملة السبريد ≥ المخاطرة بلا سبريد دائماً (لا يُطمئن السطر أكثر من الحساب الأصلي)
  let checked = 0;
  for (const spec of [eu, instrumentSpec('USDJPY')!, instrumentSpec('XAUUSD')!]) {
    const p = pipValuePerLot(spec, spec.quote === 'JPY' ? 1 / 150 : 1);
    for (const sl of [3, 8, 15, 20, 37.5, 120]) {
      for (const sp of [0.1, 0.6, 1.5, 3, 12]) {
        for (const bal of [300, 2_500, 48_000]) {
          const want = bal * 0.01;
          const s0 = positionSize({ balance: bal, riskPct: 1, slPips: sl, pipValuePerLot: p, contractSize: spec.contractSize });
          if (!s0 || s0.belowMinLot) continue;
          const x = spreadRisk({ lots: s0.lots, slPips: sl, spreadPips: sp, pipValuePerLot: p, balance: bal, riskPct: 1, contractSize: spec.contractSize })!;
          assert.ok(x.risk > s0.actualRisk);
          if (x.lotsWithin != null) {
            assert.ok(x.lotsWithin <= s0.lots);
            assert.ok(x.lotsWithin * (sl + sp) * p <= want + 1e-9, `${spec.symbol} ${sl}+${sp} ${bal}`);
            assert.ok((x.lotsWithin + LOT_STEP) * (sl + sp) * p > want - 1e-9, `${spec.symbol} ${sl}+${sp} ${bal} step`);
          }
          checked++;
        }
      }
    }
  }
  assert.ok(checked > 150, String(checked));
}
console.log('positionSize spread selftest OK');

// spreadTooWide — رقمٌ مفهوم فوق الحدّ يُسمّى، وما عداه لا
{
  assert.equal(spreadTooWide('10851'), 10851);
  assert.equal(spreadTooWide('501'), 501);
  assert.equal(spreadTooWide('١٠٨٥١'), 10851); // أرقام عربية
  assert.equal(spreadTooWide('1085,1'), 1085.1); // فاصلة عشرية
  assert.equal(spreadTooWide(String(MAX_SPREAD_PIPS)), null); // الحدّ نفسه مقبول
  for (const v of ['', '  ', '0', '1.5', '-1', '-900', 'abc', '1.2.3']) assert.equal(spreadTooWide(v), null, v);
  // متّسق مع الخانة: كل ما يسمّيه «غير واقعي» ترفضه `parseSpreadPips`، وكل ما تقبله لا يسمّيه
  for (const v of ['0', '0.5', '1.5', '499.9', '500', '500.1', '501', '10851', '-3', 'x', '']) {
    if (spreadTooWide(v) != null) assert.equal(parseSpreadPips(v), null, v);
    if (parseSpreadPips(v) != null) assert.equal(spreadTooWide(v), null, v);
  }
}
console.log('positionSize spreadTooWide selftest OK');

// planJournalNote — ملاحظة الصفقة المسجَّلة من الحاسبة تحمل السبريد الذي خُطّط به
{
  // بلا سبريد: النصّ السابق حرفياً
  assert.equal(planJournalNote({ lots: 0.5, risk: 100, ccy: 'USD', rr: '1:2' }), '0.50 lot · risk 100.00 USD · R:R 1:2');
  assert.equal(planJournalNote({ lots: 0.5, risk: 100, ccy: 'USD', rr: '1:2', spreadPips: 0 }), '0.50 lot · risk 100.00 USD · R:R 1:2');
  assert.equal(planJournalNote({ lots: 0.5, risk: 100, ccy: 'USD', rr: '1:2', spreadPips: null }), '0.50 lot · risk 100.00 USD · R:R 1:2');
  assert.equal(planJournalNote({ lots: 0.5, risk: 100, ccy: 'USD', rr: '1:2', spreadPips: NaN }), '0.50 lot · risk 100.00 USD · R:R 1:2');
  // مع سبريد: بلا أصفار زائدة
  assert.equal(
    planJournalNote({ lots: 0.46, risk: 99.9, ccy: 'USD', rr: '1:2', spreadPips: 1.5 }),
    '0.46 lot · risk 99.90 USD · R:R 1:2 · spread 1.5 pip'
  );
  assert.equal(planJournalNote({ lots: 1, risk: 1500, ccy: 'JPY', rr: '1:1.5', spreadPips: 2 }), '1.00 lot · risk 1,500 JPY · R:R 1:1.5 · spread 2 pip');
  assert.equal(planJournalNote({ lots: 0.1, risk: 12, ccy: 'EUR', rr: '1:3', spreadPips: 0.1 + 0.2 }), '0.10 lot · risk 12.00 EUR · R:R 1:3 · spread 0.3 pip');
  // بلا مبلغ مخاطرة: رمز العملة وحده كما كان
  assert.equal(planJournalNote({ lots: 0.2, risk: null, ccy: 'GBP', rr: '1:2' }), '0.20 lot · risk GBP · R:R 1:2');
  // الحاسبة نفسها: مثال مفتاح الترجمة (10,000 USD، 1%، وقف 20 EURUSD، سبريد 1.5)
  const spec = instrumentSpec('EURUSD')!;
  const pv = pipValuePerLot(spec, 1);
  const r = positionSize({ balance: 10_000, riskPct: 1, slPips: 20, pipValuePerLot: pv, contractSize: spec.contractSize })!;
  assert.equal(
    planJournalNote({ lots: r.lots, risk: r.actualRisk, ccy: 'USD', rr: '1:2', spreadPips: parseSpreadPips('1,5') }),
    '0.50 lot · risk 100.00 USD · R:R 1:2 · spread 1.5 pip'
  );
}
// كلمات الملاحظة بلغة الواجهة؛ «lot»/«R:R»/«pip» ثابتة، وفارغة/مسافات ⇒ الإنجليزية
{
  const ar = { risk: 'المخاطرة', spread: 'سبريد' };
  assert.equal(
    planJournalNote({ lots: 0.5, risk: 100, ccy: 'USD', rr: '1:2', spreadPips: 1.5, commissionPerLot: 7, netRR: '1:1.7', words: ar }),
    '0.50 lot · المخاطرة 100.00 USD · R:R 1:2 · سبريد 1.5 pip · commission 7.00 USD/lot · net R:R 1:1.7'
  );
  assert.equal(
    planJournalNote({ lots: 0.5, risk: 100, ccy: 'USD', rr: '1:2', commissionPerLot: 7, netRR: '1:1.7', words: { risk: 'مەترسی', commission: 'کۆمیسیۆن', netRR: 'R:R ی خاوێن' } }),
    '0.50 lot · مەترسی 100.00 USD · R:R 1:2 · کۆمیسیۆن 7.00 USD/lot · R:R ی خاوێن 1:1.7'
  );
  // المفاتيح الأربعة كما بـlocales (ar/en) — الملاحظة كاملة بلغة الواجهة، و«1.00 lot» أولها ما زالت علامة knownLots
  const arFull = { risk: 'المخاطرة', spread: 'سبريد', commission: 'عمولة', netRR: 'R:R بعد التكاليف' };
  assert.equal(
    planJournalNote({ lots: 0.5, risk: 100, ccy: 'USD', rr: '1:2', spreadPips: 1.5, commissionPerLot: 7, netRR: '1:1.7', words: arFull }),
    '0.50 lot · المخاطرة 100.00 USD · R:R 1:2 · سبريد 1.5 pip · عمولة 7.00 USD/lot · R:R بعد التكاليف 1:1.7'
  );
  assert.equal(
    planJournalNote({ lots: 0.5, risk: 100, ccy: 'USD', rr: '1:2', commissionPerLot: 7, netRR: '1:1.7', words: { commission: 'Commission', netRR: 'Net R:R' } }),
    '0.50 lot · risk 100.00 USD · R:R 1:2 · Commission 7.00 USD/lot · Net R:R 1:1.7'
  );
  for (const words of [{}, { risk: '', spread: '  ' }, { risk: null }, undefined])
    assert.equal(planJournalNote({ lots: 0.5, risk: 100, ccy: 'USD', rr: '1:2', spreadPips: 1.5, words }), '0.50 lot · risk 100.00 USD · R:R 1:2 · spread 1.5 pip');
  // «1.00 lot» أول الملاحظة بكل لغة — علامة `knownLots` بالدفتر
  assert.ok(planJournalNote({ lots: 1, risk: 100, ccy: 'USD', rr: '1:2', words: ar }).startsWith('1.00 lot · '));
}
console.log('positionSize planJournalNote selftest OK');

// العمولة — لكل لوت فتحاً وإغلاقاً بعملة الحساب، تُضاف × اللوت إلى المخاطرة وتُصغّر `lotsWithin`
{
  // الخانة: فارغة = 0، أرقام عربية وفاصلة عشرية، «7.000» مبهمة تُرفض (قاعدة المبلغ)، سالب/نصّ = null
  assert.equal(parseCommission(''), 0);
  assert.equal(parseCommission('  '), 0);
  assert.equal(parseCommission('7'), 7);
  assert.equal(parseCommission('٧'), 7);
  assert.equal(parseCommission('3,5'), 3.5);
  assert.equal(parseCommission('0'), 0);
  // «1,000» مبهمة كالرصيد تماماً (ألف؟ واحد بكسر؟) فتُرفض بدل تخمين
  for (const bad of ['-7', 'abc', '7.000', '1,000', '1.2.3']) assert.equal(parseCommission(bad), null, bad);

  const eu = instrumentSpec('EURUSD')!;
  const pv = pipValuePerLot(eu, 1); // 10 USD
  const base = { pipValuePerLot: pv, balance: 10_000, riskPct: 1, contractSize: eu.contractSize };
  // مثال الملاحظة: 0.50 لوت، وقف 20، سبريد 1.5، عمولة 7 → 107.50 + 3.50 = 111 = 1.11%
  const c = spreadRisk({ ...base, lots: 0.5, slPips: 20, spreadPips: 1.5, commissionPerLot: 7 })!;
  assert.ok(near(c.risk, 111));
  assert.ok(near(c.pct, 1.11));
  // 100 / (21.5 × 10 + 7) = 100 / 222 = 0.4504 → 0.45
  assert.equal(c.lotsWithin, 0.45);
  // عمولة وحدها بلا سبريد تكفي للسطر: 100 + 3.5، و100 / 207 = 0.483 → 0.48
  const only = spreadRisk({ ...base, lots: 0.5, slPips: 20, spreadPips: 0, commissionPerLot: 7 })!;
  assert.ok(near(only.risk, 103.5));
  assert.equal(only.lotsWithin, 0.48);
  // عمولة 0 / NaN / سالبة / غائبة = سلوك السبريد وحده حرفياً
  const s0 = spreadRisk({ ...base, lots: 0.5, slPips: 20, spreadPips: 1.5 })!;
  for (const cm of [0, NaN, -3, undefined]) {
    assert.deepEqual(spreadRisk({ ...base, lots: 0.5, slPips: 20, spreadPips: 1.5, commissionPerLot: cm }), s0, String(cm));
  }
  assert.equal(spreadRisk({ ...base, lots: 0.5, slPips: 20, spreadPips: 0, commissionPerLot: 0 }), null);
  // عمولة تبتلع المخاطرة كلها: الرصيد 100، 1% = 1 USD، عمولة 7 للوت → 0.01 لوت يكلّف 0.07 عمولة
  // + 0.01×20×10 = 2 → لا لوت يتّسع
  const tiny = spreadRisk({ ...base, balance: 100, lots: 0.01, slPips: 20, spreadPips: 0, commissionPerLot: 7 })!;
  assert.equal(tiny.lotsWithin, null);
  // حساب بالين: عمولة 1,000 JPY للوت (7 USD تقريباً) على USDJPY، 1,000,000 JPY، 1%
  const uj = instrumentSpec('USDJPY')!;
  const pvj = pipValuePerLot(uj, 1); // 1,000 JPY
  const j = spreadRisk({ lots: 0.5, slPips: 20, spreadPips: 1, pipValuePerLot: pvj, balance: 1_000_000, riskPct: 1, contractSize: uj.contractSize, commissionPerLot: parseCommission('1000')! })!;
  assert.ok(near(j.risk, 0.5 * 21 * pvj + 500));
  // البرهان على شبكة: `lotsWithin` لا يتجاوز المخاطرة المطلوبة شاملة العمولة، وخطوة فوقه تتجاوزها؛
  // والعمولة لا تُصغّر المخاطرة أبداً ولا تُكبّر `lotsWithin` عن قيمته بالسبريد وحده
  let checked = 0;
  for (const spec of [eu, uj, instrumentSpec('XAUUSD')!, instrumentSpec('GBPJPY')!]) {
    const p = pipValuePerLot(spec, spec.quote === 'JPY' ? 1 / 150 : 1);
    for (const sl of [3, 8, 20, 37.5, 120]) {
      for (const sp of [0, 0.6, 3]) {
        for (const cm of [0.5, 3.5, 7, 12]) {
          for (const bal of [300, 2_500, 48_000]) {
            const want = bal * 0.01;
            const s = positionSize({ balance: bal, riskPct: 1, slPips: sl, pipValuePerLot: p, contractSize: spec.contractSize });
            if (!s || s.belowMinLot) continue;
            const args = { lots: s.lots, slPips: sl, spreadPips: sp, pipValuePerLot: p, balance: bal, riskPct: 1, contractSize: spec.contractSize };
            const x = spreadRisk({ ...args, commissionPerLot: cm })!;
            const noC = spreadRisk(args);
            assert.ok(x.risk > (noC ? noC.risk : s.actualRisk));
            assert.ok(near(x.risk, s.lots * ((sl + sp) * p + cm), 1e-6));
            if (x.lotsWithin != null) {
              assert.ok(x.lotsWithin <= (noC?.lotsWithin ?? s.lots));
              const cost = (sl + sp) * p + cm;
              assert.ok(x.lotsWithin * cost <= want + 1e-9, `${spec.symbol} ${sl}+${sp}+${cm} ${bal}`);
              assert.ok((x.lotsWithin + LOT_STEP) * cost > want - 1e-9, `${spec.symbol} ${sl}+${sp}+${cm} ${bal} step`);
            }
            checked++;
          }
        }
      }
    }
  }
  assert.ok(checked > 300, String(checked));

  // ملاحظة الدفتر: العمولة بعملة الحساب لكل لوت، بعد السبريد، وحين تكون موجبة فقط
  assert.equal(
    planJournalNote({ lots: 0.45, risk: 90, ccy: 'USD', rr: '1:2', spreadPips: 1.5, commissionPerLot: 7 }),
    '0.45 lot · risk 90.00 USD · R:R 1:2 · spread 1.5 pip · commission 7.00 USD/lot'
  );
  assert.equal(
    planJournalNote({ lots: 0.5, risk: 7500, ccy: 'JPY', rr: '1:2', commissionPerLot: 1000 }),
    '0.50 lot · risk 7,500 JPY · R:R 1:2 · commission 1,000 JPY/lot'
  );
  for (const cm of [0, null, NaN, -1, undefined]) {
    assert.equal(
      planJournalNote({ lots: 0.5, risk: 100, ccy: 'USD', rr: '1:2', commissionPerLot: cm }),
      '0.50 lot · risk 100.00 USD · R:R 1:2',
      String(cm)
    );
  }
}
console.log('positionSize commission selftest OK');

// ---- costsLotsAdvice: ما يُقال تحت سطر «شاملة التكاليف» ----
{
  const spec = instrumentSpec('EURUSD')!;
  const pv = pipValuePerLot(spec, 1);
  // الحالة التي كانت تسكت: رصيد 100، 1%، وقف 10، سبريد 1 → 0.01 لوت = 1.10 من 1.00
  const s0 = positionSize({ balance: 100, riskPct: 1, slPips: 10, pipValuePerLot: pv, contractSize: spec.contractSize })!;
  assert.equal(s0.lots, 0.01);
  const w0 = spreadRisk({ lots: s0.lots, slPips: 10, spreadPips: 1, pipValuePerLot: pv, balance: 100, riskPct: 1, contractSize: spec.contractSize })!;
  assert.ok(Math.abs(w0.risk - 1.1) < 1e-9);
  assert.equal(w0.lotsWithin, null);
  assert.deepEqual(costsLotsAdvice(s0.lots, w0), { kind: 'none' });
  // والعمولة وحدها كذلك: 0.01 × (10 × 10 + 7) = 1.07 من 1.00
  const w1 = spreadRisk({ lots: 0.01, slPips: 10, spreadPips: 0, pipValuePerLot: pv, balance: 100, riskPct: 1, contractSize: spec.contractSize, commissionPerLot: 7 })!;
  assert.deepEqual(costsLotsAdvice(0.01, w1), { kind: 'none' });
  // مثال الحاسبة: 10,000 USD، 1%، وقف 20، سبريد 1.5، عمولة 7 → 0.50 لوت، والأصغر 0.45
  const w2 = spreadRisk({ lots: 0.5, slPips: 20, spreadPips: 1.5, pipValuePerLot: pv, balance: 10_000, riskPct: 1, contractSize: spec.contractSize, commissionPerLot: 7 })!;
  assert.deepEqual(costsLotsAdvice(0.5, w2), { kind: 'smaller', lots: 0.45 });
  // اللوت المحسوب يتّسع للتكاليف (التقريب للأسفل ترك هامشاً) → لا سطر
  assert.equal(costsLotsAdvice(0.45, { lotsWithin: 0.45 }), null);
  assert.equal(costsLotsAdvice(0.3, { lotsWithin: 0.30000000000000004 }), null);
  // بلا تكاليف أو بلا لوت → لا شيء
  assert.equal(costsLotsAdvice(0.5, null), null);
  assert.equal(costsLotsAdvice(null, { lotsWithin: null }), null);
  assert.equal(costsLotsAdvice(0, { lotsWithin: null }), null);
  assert.equal(costsLotsAdvice(NaN, { lotsWithin: 0.1 }), null);
  // شبكة: كلّ «smaller» فعلاً ضمن النسبة وأصغر من اللوت، وكلّ «none» أصغر لوت فيه يتجاوزها
  for (const bal of [50, 100, 500, 2_000, 10_000]) {
    for (const sl of [3, 5, 10, 25]) {
      for (const sp of [0, 0.8, 2]) {
        for (const cm of [0, 3.5, 7]) {
          if (sp === 0 && cm === 0) continue;
          const sz = positionSize({ balance: bal, riskPct: 1, slPips: sl, pipValuePerLot: pv, contractSize: spec.contractSize });
          if (!sz || sz.belowMinLot) continue;
          const w = spreadRisk({ lots: sz.lots, slPips: sl, spreadPips: sp, pipValuePerLot: pv, balance: bal, riskPct: 1, contractSize: spec.contractSize, commissionPerLot: cm })!;
          const a = costsLotsAdvice(sz.lots, w);
          const want = bal / 100;
          const costOf = (l: number) => l * ((sl + sp) * pv + cm);
          if (a?.kind === 'smaller') {
            assert.ok(a.lots < sz.lots && costOf(a.lots) <= want + 1e-9, `${bal}/${sl}/${sp}/${cm}`);
          } else if (a?.kind === 'none') {
            assert.ok(costOf(LOT_STEP) > want, `${bal}/${sl}/${sp}/${cm}`);
          } else {
            assert.ok(costOf(sz.lots) <= want + 1e-9, `${bal}/${sl}/${sp}/${cm}`);
          }
        }
      }
    }
  }
}
console.log('positionSize costsLotsAdvice selftest OK');

// ---- profitAfterCosts: الربح وR:R بعد السبريد والعمولة ----
{
  const spec = instrumentSpec('EURUSD')!;
  const pv = pipValuePerLot(spec, 1);
  // 0.50 لوت، وقف 20، هدف 40، سبريد 1.5، عمولة 7: الإجمالي 200، التكاليف 0.5 × (15 + 7) = 11
  const gross = profitAtTarget({ spec, entry: 1.085, target: 1.089, lots: 0.5, quoteToAccount: 1 })!;
  assert.ok(Math.abs(gross - 200) < 1e-6);
  const w = spreadRisk({ lots: 0.5, slPips: 20, spreadPips: 1.5, pipValuePerLot: pv, balance: 10_000, riskPct: 1, contractSize: spec.contractSize, commissionPerLot: 7 })!;
  assert.ok(Math.abs(w.risk - 111) < 1e-9);
  const n = profitAfterCosts({ grossProfit: gross, lots: 0.5, spreadPips: 1.5, pipValuePerLot: pv, commissionPerLot: 7, riskWithCosts: w.risk })!;
  assert.ok(Math.abs(n.costs - 11) < 1e-9);
  assert.ok(Math.abs(n.net - 189) < 1e-6);
  assert.ok(Math.abs(n.rr! - 189 / 111) < 1e-6);
  assert.equal(formatMoney(n.net, 'USD'), '189.00 USD');
  // سكالبينغ 5/5 بلوت واحد، سبريد 1، عمولة 7: إجمالي 50 → صافٍ 33، مخاطرة 67 → 1:0.5 لا 1:1
  const sc = profitAfterCosts({ grossProfit: 50, lots: 1, spreadPips: 1, pipValuePerLot: pv, commissionPerLot: 7, riskWithCosts: 67 })!;
  assert.ok(Math.abs(sc.net - 33) < 1e-9);
  assert.ok(Math.abs(sc.rr! - 33 / 67) < 1e-9);
  // السبريد وحده، والعمولة وحدها
  const sOnly = profitAfterCosts({ grossProfit: 200, lots: 0.5, spreadPips: 1.5, pipValuePerLot: pv, riskWithCosts: 107.5 })!;
  assert.ok(Math.abs(sOnly.net - 192.5) < 1e-9);
  const cOnly = profitAfterCosts({ grossProfit: 200, lots: 0.5, spreadPips: 0, pipValuePerLot: pv, commissionPerLot: 7, riskWithCosts: 103.5 })!;
  assert.ok(Math.abs(cOnly.net - 196.5) < 1e-9);
  // التكاليف تبتلع الهدف: الصافي سالب يُرجَع صادقاً، وR:R null
  const neg = profitAfterCosts({ grossProfit: 10, lots: 1, spreadPips: 1, pipValuePerLot: pv, commissionPerLot: 7, riskWithCosts: 67 })!;
  assert.ok(Math.abs(neg.net - -7) < 1e-9);
  assert.equal(neg.rr, null);
  const zero = profitAfterCosts({ grossProfit: 17, lots: 1, spreadPips: 1, pipValuePerLot: pv, commissionPerLot: 7, riskWithCosts: 67 })!;
  assert.equal(zero.rr, null);
  // بلا تكاليف أو بمدخل غير صالح → null
  for (const sp of [0, NaN, -1]) {
    for (const cm of [0, undefined, NaN, -7]) {
      assert.equal(profitAfterCosts({ grossProfit: 200, lots: 0.5, spreadPips: sp, pipValuePerLot: pv, commissionPerLot: cm, riskWithCosts: 100 }), null);
    }
  }
  for (const bad of [0, -1, NaN, Infinity]) {
    assert.equal(profitAfterCosts({ grossProfit: bad, lots: 0.5, spreadPips: 1, pipValuePerLot: pv, riskWithCosts: 100 }), null);
    assert.equal(profitAfterCosts({ grossProfit: 200, lots: bad, spreadPips: 1, pipValuePerLot: pv, riskWithCosts: 100 }), null);
    assert.equal(profitAfterCosts({ grossProfit: 200, lots: 0.5, spreadPips: 1, pipValuePerLot: bad, riskWithCosts: 100 }), null);
    assert.equal(profitAfterCosts({ grossProfit: 200, lots: 0.5, spreadPips: 1, pipValuePerLot: pv, riskWithCosts: bad }), null);
  }
  // حساب بالين على USDJPY (سعر تحويل 1): وقف 20، هدف 40 على 0.3 لوت، سبريد 1، عمولة 1000 JPY
  const jp = instrumentSpec('USDJPY')!;
  const jpv = pipValuePerLot(jp, 1); // 1000 JPY
  const jg = profitAtTarget({ spec: jp, entry: 150, target: 150.4, lots: 0.3, quoteToAccount: 1 })!;
  const jw = spreadRisk({ lots: 0.3, slPips: 20, spreadPips: 1, pipValuePerLot: jpv, balance: 1_000_000, riskPct: 1, contractSize: jp.contractSize, commissionPerLot: 1000 })!;
  const jn = profitAfterCosts({ grossProfit: jg, lots: 0.3, spreadPips: 1, pipValuePerLot: jpv, commissionPerLot: 1000, riskWithCosts: jw.risk })!;
  assert.equal(formatMoney(jn.net, 'JPY'), '11,400 JPY'); // 12,000 − 0.3 × 2,000
  // اتّساق: الصافي + التكاليف = الإجمالي، وR:R الصافية ≤ الإجمالية دائماً
  for (const sp of [0.5, 1, 3]) {
    for (const cm of [0, 7]) {
      for (const [sl, tp] of [[10, 10], [20, 40], [15, 45]]) {
        const lots = 0.37;
        const g = lots * tp * pv;
        const r = spreadRisk({ lots, slPips: sl, spreadPips: sp, pipValuePerLot: pv, balance: 10_000, riskPct: 1, contractSize: spec.contractSize, commissionPerLot: cm })!;
        const x = profitAfterCosts({ grossProfit: g, lots, spreadPips: sp, pipValuePerLot: pv, commissionPerLot: cm, riskWithCosts: r.risk })!;
        assert.ok(Math.abs(x.net + x.costs - g) < 1e-9);
        if (x.rr != null) assert.ok(x.rr < tp / sl);
      }
    }
  }
}
console.log('positionSize profitAfterCosts selftest OK');

// ---- rewardBelowRisk: تحذير «الربح أقل من المخاطرة» يقرأ R:R بعد التكاليف حين تُكتب ----
{
  const spec = instrumentSpec('EURUSD')!;
  const pv = pipValuePerLot(spec, 1);
  // وقف 20، هدف 21 (1:1.05) على 0.5 لوت، سبريد 1.5، عمولة 7: الإجمالي 105، الصافي 94، المخاطرة 111 → 1:0.8
  const gross = profitAtTarget({ spec, entry: 1.085, target: 1.0871, lots: 0.5, quoteToAccount: 1 })!;
  assert.ok(Math.abs(gross - 105) < 1e-6);
  const w = spreadRisk({ lots: 0.5, slPips: 20, spreadPips: 1.5, pipValuePerLot: pv, balance: 10_000, riskPct: 1, contractSize: spec.contractSize, commissionPerLot: 7 })!;
  const n = profitAfterCosts({ grossProfit: gross, lots: 0.5, spreadPips: 1.5, pipValuePerLot: pv, commissionPerLot: 7, riskWithCosts: w.risk })!;
  assert.ok(Math.abs(n.net - 94) < 1e-6);
  assert.equal(formatRR(n.rr), '1:0.8');
  assert.equal(rewardBelowRisk(1.05, null), false); // الإجمالي وحده كان يسكت
  assert.equal(rewardBelowRisk(1.05, n), true);
  // مثال الحاسبة 1:2 → 1:1.7 صافياً: لا تحذير
  assert.equal(rewardBelowRisk(2, { net: 189, rr: 189 / 111 }), false);
  // الصافي ≤ 0: سطر «التكاليف تأكل الهدف» وحده، لا تحذيران
  assert.equal(rewardBelowRisk(0.5, { net: -7, rr: null }), false);
  assert.equal(rewardBelowRisk(1.2, { net: 0, rr: null }), false);
  // بلا تكاليف: الإجمالية كما كانت
  assert.equal(rewardBelowRisk(0.9, null), true);
  assert.equal(rewardBelowRisk(0, null), true);
  assert.equal(rewardBelowRisk(1, null), false);
  assert.equal(rewardBelowRisk(null, null), false);
  assert.equal(rewardBelowRisk(NaN, null), false);
  // اتّساق مع النصّ: حين يحذّر، R:R المطبوعة (الصافية إن وُجدت) تبدأ «1:0.» أبداً — لا «1:1.0» فوق تحذير
  for (const g of [0.3, 0.9, 0.96, 0.999, 1, 1.04, 1.2, 1.5, 2, 3]) {
    for (const costsFrac of [0, 0.02, 0.1, 0.3, 0.6]) {
      const risk = 100;
      const grossP = g * 100 * (1 - 0.01); // الإجمالي بمخاطرة الوقف وحده
      const netObj = costsFrac === 0 ? null : { net: grossP - costsFrac * 100, rr: grossP - costsFrac * 100 > 0 ? (grossP - costsFrac * 100) / (risk * (1 + costsFrac)) : null };
      const shown = formatRR(netObj ? netObj.rr : g);
      if (rewardBelowRisk(g, netObj)) assert.ok(shown.startsWith('1:0.') || shown === '1:<0.01', `${g} ${costsFrac} ${shown}`);
      else if (!(netObj && netObj.net <= 0)) assert.ok(!shown.startsWith('1:0.') && shown !== '1:<0.01', `${g} ${costsFrac} ${shown}`);
    }
  }
}
console.log('positionSize rewardBelowRisk selftest OK');

// ---- lowRewardWarning: التحذير يسمّي التكاليف حين تكون هي وحدها السبب ----
{
  const spec = instrumentSpec('EURUSD')!;
  const pv = pipValuePerLot(spec, 1);
  // مثال rewardBelowRisk أعلاه: الإجمالي 1:1.05 (يُطبع «1:1.0» فوق التحذير)، الصافي 1:0.8 ⇒ «بعد التكاليف»
  const gross = profitAtTarget({ spec, entry: 1.085, target: 1.0871, lots: 0.5, quoteToAccount: 1 })!;
  const w = spreadRisk({ lots: 0.5, slPips: 20, spreadPips: 1.5, pipValuePerLot: pv, balance: 10_000, riskPct: 1, contractSize: spec.contractSize, commissionPerLot: 7 })!;
  const n = profitAfterCosts({ grossProfit: gross, lots: 0.5, spreadPips: 1.5, pipValuePerLot: pv, commissionPerLot: 7, riskWithCosts: w.risk })!;
  assert.equal(formatRR(1.05), '1:1.0');
  assert.equal(lowRewardWarning(1.05, n), 'net');
  // الإجمالي نفسه دون 1:1 — الجملة العامة تصف السطر فوقها، بتكاليف أو بدونها
  assert.equal(lowRewardWarning(0.9, null), 'gross');
  assert.equal(lowRewardWarning(0.9, { net: 70, rr: 0.6 }), 'gross');
  assert.equal(lowRewardWarning(0, null), 'gross');
  // بالضبط 1:1 إجمالياً والصافي أقل ⇒ السبب التكاليف
  assert.equal(lowRewardWarning(1, { net: 90, rr: 0.8 }), 'net');
  // لا تحذير: كما `rewardBelowRisk`
  assert.equal(lowRewardWarning(1, null), null);
  assert.equal(lowRewardWarning(2, { net: 189, rr: 189 / 111 }), null);
  assert.equal(lowRewardWarning(0.5, { net: -7, rr: null }), null);
  assert.equal(lowRewardWarning(null, null), null);
  assert.equal(lowRewardWarning(NaN, null), null);
  // اتّساق كامل مع القرار: يحذّر ⇔ `rewardBelowRisk`، و`net` فقط حين الإجمالي ≥ 1
  for (const g of [0.3, 0.9, 0.999, 1, 1.04, 1.2, 2]) {
    for (const nr of [null, 0.4, 0.95, 1, 1.5]) {
      const netObj = nr == null ? null : { net: 50, rr: nr };
      const k = lowRewardWarning(g, netObj);
      assert.equal(k != null, rewardBelowRisk(g, netObj));
      if (k === 'net') assert.ok(g >= 1);
      if (k === 'gross') assert.ok(g < 1);
    }
  }
}
console.log('positionSize lowRewardWarning selftest OK');

// ---- planJournalNote: R:R الصافية بملاحظة الصفقة ----
{
  assert.equal(
    planJournalNote({ lots: 0.5, risk: 100, ccy: 'USD', rr: '1:2.0', spreadPips: 1.5, commissionPerLot: 7, netRR: formatRR(189 / 111) }),
    '0.50 lot · risk 100.00 USD · R:R 1:2.0 · spread 1.5 pip · commission 7.00 USD/lot · net R:R 1:1.7',
  );
  assert.equal(
    planJournalNote({ lots: 1, risk: 50, ccy: 'USD', rr: '1:0.2', spreadPips: 1, commissionPerLot: 7, netRR: formatRR(null) }),
    '1.00 lot · risk 50.00 USD · R:R 1:0.2 · spread 1 pip · commission 7.00 USD/lot · net R:R —',
  );
  for (const netRR of [null, undefined, '']) {
    assert.equal(planJournalNote({ lots: 0.5, risk: 100, ccy: 'USD', rr: '1:2.0', netRR }), '0.50 lot · risk 100.00 USD · R:R 1:2.0');
  }
}
console.log('positionSize planJournalNote netRR selftest OK');

// ── parseRiskInput: المخاطرة نسبةً (كما كانت) أو مبلغاً بعلامة عملة الحساب ──
{
  // النسبة بلا تغيير: الرقم وحده نسبة، و«%» تُقبل
  assert.deepEqual(parseRiskInput('1', 10_000, 'USD'), { pct: 1, amount: null });
  assert.deepEqual(parseRiskInput('0.5%', 10_000, 'USD'), { pct: 0.5, amount: null });
  // «50» وحدها تبقى 50% (لا تخمين أنها مال) — تحذير المخاطرة العالية يبقى يعمل
  assert.deepEqual(parseRiskInput('50', 10_000, 'USD'), { pct: 50, amount: null });
  // المبلغ برمز أو كود عملة الحساب، بأيّ طرف وبأيّ حالة أحرف، بمسافة أو بدونها
  for (const raw of ['$50', '50$', '50 USD', 'usd 50', ' $ 50 ', '50usd', '٥٠$']) {
    assert.deepEqual(parseRiskInput(raw, 10_000, 'USD'), { pct: 0.5, amount: 50 }, raw);
  }
  assert.deepEqual(parseRiskInput('€40', 8_000, 'EUR'), { pct: 0.5, amount: 40 });
  // العريضة: «￥5000» بحساب ين، «１％»، «＄50» — كالعلامات العادية تماماً، وبعملة لا تطابق الحساب مرفوضة
  assert.deepEqual(parseRiskInput('￥5000', 1_000_000, 'JPY'), { pct: 0.5, amount: 5000 });
  assert.deepEqual(parseRiskInput('５０００￥', 1_000_000, 'JPY'), { pct: 0.5, amount: 5000 });
  assert.deepEqual(parseRiskInput('＄５０', 10_000, 'USD'), { pct: 0.5, amount: 50 });
  assert.deepEqual(parseRiskInput('￡２５', 5_000, 'GBP'), { pct: 0.5, amount: 25 });
  assert.deepEqual(parseRiskInput('１％', 10_000, 'USD'), { pct: 1, amount: null });
  assert.deepEqual(parseRiskInput('０．５', 10_000, 'USD'), { pct: 0.5, amount: null });
  assert.equal(parseRiskInput('￥5000', 10_000, 'USD'), null);
  assert.equal(parseRiskInput('＄50', 10_000, 'EUR'), null);
  assert.equal(parseRiskInput('＄50￥', 10_000, 'USD'), null);
  assert.deepEqual(parseRiskInput('£25', 5_000, 'GBP'), { pct: 0.5, amount: 25 });
  assert.deepEqual(parseRiskInput('¥15,000', 1_500_000, 'JPY'), null); // «15,000» مبهمة بقاعدة المبلغ
  assert.deepEqual(parseRiskInput('¥15000', 1_500_000, 'JPY'), { pct: 1, amount: 15_000 });
  assert.deepEqual(parseRiskInput('$30', 3_000, 'AUD'), { pct: 1, amount: 30 });
  assert.deepEqual(parseRiskInput('20 chf', 2_000, 'CHF'), { pct: 1, amount: 20 });
  assert.deepEqual(parseRiskInput('$1,250.50', 125_050, 'CAD'), { pct: 1, amount: 1250.5 });
  // علامة عملة ليست عملة الحساب: 40 يورو ليست 40 دولاراً — تُرفض لا تُعدّ دولاراً
  assert.equal(parseRiskInput('€40', 10_000, 'USD'), null);
  assert.equal(parseRiskInput('40 EUR', 10_000, 'USD'), null);
  assert.equal(parseRiskInput('$40', 10_000, 'EUR'), null);
  assert.equal(parseRiskInput('£40', 10_000, 'JPY'), null);
  // علامتان، أو علامة بلا مبلغ، أو مبلغ صفر/سالب/غير مفهوم، أو حرف ملتبس
  for (const raw of ['$50$', '$50 USD', '$', 'USD', '$0', '$-5', '$1.2.3', '5O$', '50 US', 'abc', '']) {
    assert.equal(parseRiskInput(raw, 10_000, 'USD'), null, raw);
  }
  // «1.000$» مبهمة كالرصيد (ألف أم واحد؟) — تُرفض بدل أن تُقرأ 1
  assert.equal(parseRiskInput('1.000$', 10_000, 'USD'), null);
  // بلا رصيد صالح: المبلغ مفهوم لكن لا نسبة منه
  assert.deepEqual(parseRiskInput('$50', NaN, 'USD'), { pct: null, amount: 50 });
  assert.deepEqual(parseRiskInput('$50', 0, 'USD'), { pct: null, amount: 50 });
  // مبلغ فوق الرصيد = فوق 100% فيرفضه positionSize كالنسبة المستحيلة
  assert.equal(parseRiskInput('$200', 100, 'USD')!.pct, 200);
  // من المبلغ إلى اللوت: 50$ من 10,000 على وقف 10 pip EURUSD = 0.50 لوت بالضبط، ومخاطرة 50 لا تزيد سنتاً
  const pv = pipValuePerLot(instrumentSpec('EURUSD')!, 1);
  for (const [amt, bal, sl, want] of [
    [50, 10_000, 10, 0.5],
    [33, 7_777, 13, 0.25],
    [100, 3_333.33, 20, 0.5],
    [7, 1_234.56, 7, 0.1],
  ] as const) {
    const pct = parseRiskInput(`$${amt}`, bal, 'USD')!.pct!;
    const r = positionSize({ balance: bal, riskPct: pct, slPips: sl, pipValuePerLot: pv, contractSize: 100_000 })!;
    assert.equal(r.lots, want, `${amt}/${bal}/${sl}`);
    assert.ok(r.actualRisk <= amt + 1e-9, `${amt}/${bal}/${sl}`);
  }
  // شبكة: أي مبلغ صحيح × رصيد × وقف — اللوت من المبلغ = اللوت من المبلغ مباشرةً (floor(amt/(sl×pv)))
  for (let amt = 1; amt <= 400; amt += 7) {
    for (const bal of [500, 1_000, 2_345.67, 10_000, 99_999]) {
      if (amt > bal) continue;
      for (const sl of [5, 12.5, 20, 37.3]) {
        const pct = parseRiskInput(`${amt} usd`, bal, 'USD')!.pct!;
        const r = positionSize({ balance: bal, riskPct: pct, slPips: sl, pipValuePerLot: pv, contractSize: 100_000 })!;
        const direct = Math.floor(Math.round((amt / (sl * pv)) * 100 * 1e6) / 1e6) / 100;
        assert.equal(r.lots, direct, `${amt}/${bal}/${sl}`);
        assert.ok(r.actualRisk <= amt + 1e-9);
      }
    }
  }
}
console.log('positionSize parseRiskInput selftest OK');

// ── toggleRiskUnit: قلب النسبة ↔ المبلغ بالمخاطرة نفسها، ولا يرفعها أبداً ──
{
  assert.equal(toggleRiskUnit('1', 10_000, 'USD'), 'USD 100');
  assert.equal(toggleRiskUnit('USD 100', 10_000, 'USD'), '1');
  assert.equal(toggleRiskUnit('$50', 10_000, 'USD'), '0.5');
  assert.equal(toggleRiskUnit('0.5%', 10_000, 'EUR'), 'EUR 50');
  // تقريب للأسفل: السنت والنسبة
  assert.equal(toggleRiskUnit('1', 3_333.33, 'USD'), 'USD 33.33');
  assert.equal(toggleRiskUnit('USD 33', 7_777, 'USD'), '0.42');
  // الين بلا كسور
  assert.equal(toggleRiskUnit('1', 1_234_567, 'JPY'), 'JPY 12345');
  // الكتابة بآخر الخانة تبقى مفهومة: «USD 100» + «5» = «USD 1005»
  assert.deepEqual(parseRiskInput('USD 1005', 100_000, 'USD'), { pct: 1.005, amount: 1005 });
  // الناتج يُقرأ ثانيةً بالقاعدة نفسها (لا فاصل آلاف يصير مبهماً)
  assert.deepEqual(parseRiskInput(toggleRiskUnit('2', 250_000, 'USD')!, 250_000, 'USD'), { pct: 2, amount: 5000 });
  // لا قلب بلا رصيد، أو بخانة فارغة/غير مفهومة/صفر، أو بعلامة عملة أخرى
  assert.equal(toggleRiskUnit('1', NaN, 'USD'), null);
  assert.equal(toggleRiskUnit('$50', 0, 'USD'), null);
  assert.equal(toggleRiskUnit('', 10_000, 'USD'), null);
  assert.equal(toggleRiskUnit('abc', 10_000, 'USD'), null);
  assert.equal(toggleRiskUnit('0', 10_000, 'USD'), null);
  assert.equal(toggleRiskUnit('€50', 10_000, 'USD'), null);
  // مبلغ تافه تحت 0.01% من الرصيد لا يُقلب إلى «0»
  assert.equal(toggleRiskUnit('$0.5', 10_000, 'USD'), null);
  // شبكة: القلب بأيّ اتجاه لا يرفع المخاطرة بالمال، ولا يُسقطها بأكثر من سنت (أو 0.01% للنسبة)
  for (const bal of [123.45, 999.99, 3_333.33, 10_000, 54_321.98]) {
    for (let pct = 0.1; pct <= 5; pct += 0.13) {
      const p = Math.round(pct * 100) / 100;
      const money = toggleRiskUnit(String(p), bal, 'USD');
      if (money == null) continue;
      const amt = parseRiskInput(money, bal, 'USD')!.amount!;
      assert.ok(amt <= (bal * p) / 100 + 1e-9 && amt >= (bal * p) / 100 - 0.01 - 1e-9, `${bal}/${p}`);
      const back = toggleRiskUnit(money, bal, 'USD');
      if (back == null) continue;
      const pBack = Number(back);
      assert.ok((bal * pBack) / 100 <= amt + 1e-9, `${bal}/${p} back`);
      assert.ok(pBack >= (amt / bal) * 100 - 0.01 - 1e-9, `${bal}/${p} back`);
    }
  }
}
console.log('positionSize toggleRiskUnit selftest OK');

// —— lotsOverOrderMax: حجمٌ فوق أكبر أمر يقبله الوسيط
{
  // مثال التحذير: رصيد 100,000، 2%، وقف 1 pip، EURUSD بحساب دولار (10 USD للـpip) ⇒ 200 lot
  const big = positionSize({ balance: 100_000, riskPct: 2, slPips: 1, pipValuePerLot: 10, contractSize: 100_000 })!;
  assert.equal(big.lots, 200);
  assert.equal(lotsOverOrderMax(big), 200);
  // الوقف المقصود 10 pip ⇒ 20 lot — لا تحذير
  const ok = positionSize({ balance: 100_000, riskPct: 2, slPips: 10, pipValuePerLot: 10, contractSize: 100_000 })!;
  assert.equal(ok.lots, 20);
  assert.equal(lotsOverOrderMax(ok), null);
  // الحدّ (50، الطرف الأدنى من «50–100 lot» بالنص) بالضبط مقبول، وفوقه بخطوة واحدة يحذّر
  assert.equal(ORDER_WARN_LOTS, 50);
  const at = positionSize({ balance: 50_000, riskPct: 1, slPips: 1, pipValuePerLot: 10, contractSize: 100_000 })!;
  assert.equal(at.lots, ORDER_WARN_LOTS);
  assert.equal(lotsOverOrderMax(at), null);
  const over = positionSize({ balance: 50_010, riskPct: 1, slPips: 1, pipValuePerLot: 10, contractSize: 100_000 })!;
  assert.equal(over.lots, 50.01);
  assert.equal(lotsOverOrderMax(over), 50.01);
  // صفّ QA4: 75 لوت كان بلا تحذير (الحدّ كان 100) ⇒ يحذّر الآن
  const mid = positionSize({ balance: 75_000, riskPct: 1, slPips: 1, pipValuePerLot: 10, contractSize: 100_000 })!;
  assert.equal(mid.lots, 75);
  assert.equal(lotsOverOrderMax(mid), 75);
  // حدّ الدفتر (وحدات لا لوتات) لم يتغيّر: 75 لوتاً حجمٌ حقيقي هناك
  assert.equal(MAX_SANE_LOTS, 100);
  assert.equal(sizeLooksLikeUnits(75, instrumentSpec('EURUSD')), null);
  // دون أصغر لوت / بلا نتيجة ⇒ لا شيء
  const tiny = positionSize({ balance: 50, riskPct: 1, slPips: 100, pipValuePerLot: 10, contractSize: 100_000 })!;
  assert.ok(tiny.belowMinLot);
  assert.equal(lotsOverOrderMax(tiny), null);
  assert.equal(lotsOverOrderMax(null), null);
  // شبكة: يحذّر ⇔ اللوت المقرَّب > الحدّ، ويُرجع اللوت نفسه
  for (const bal of [1_000, 25_000, 100_000, 1_000_000]) {
    for (const sl of [0.5, 1, 3, 10, 50]) {
      const r = positionSize({ balance: bal, riskPct: 1, slPips: sl, pipValuePerLot: 10, contractSize: 100_000 })!;
      const w = lotsOverOrderMax(r);
      assert.equal(w != null, !r.belowMinLot && r.lots > ORDER_WARN_LOTS, `${bal}/${sl}`);
      if (w != null) assert.equal(w, r.lots);
    }
  }
}
console.log('positionSize lotsOverOrderMax selftest OK');

// ---- instrumentSpec: «GOLD»/«SILVER» (أسماء الوسطاء) = XAUUSD/XAGUSD بمواصفاتهما حرفياً ----
{
  const xau = instrumentSpec('XAUUSD')!;
  const xag = instrumentSpec('XAGUSD')!;
  for (const raw of ['GOLD', 'gold', ' Gold ', 'GOLD#', 'GOLD.m', 'GOLD-ECN', 'GOLD_pro', 'GOLD+'])
    assert.deepEqual(instrumentSpec(raw), xau, raw);
  for (const raw of ['SILVER', 'silver', 'SILVER#', 'SILVER.pro'])
    assert.deepEqual(instrumentSpec(raw), xag, raw);
  // M وكلمات نوع الحساب ملاصقةً ⇒ كالشارت (`chartPipSpec('GOLDm')` = XAUUSD) وكـ«XAUUSDm»
  for (const raw of ['GOLDm', 'GOLDM', 'goldm', 'GOLDpro', 'GOLDECN', 'GOLDraw', 'GOLDvip'])
    assert.deepEqual(instrumentSpec(raw), xau, raw);
  for (const raw of ['SILVERm', 'SILVERM', 'SILVERstd'])
    assert.deepEqual(instrumentSpec(raw), xag, raw);
  // «GOLDm» بالحساب نفسه: وقف 5 دولار = 50 pip ⇒ 0.2 lot من 1% على 10,000 (كـXAUUSD)
  {
    const gm = instrumentSpec('GOLDm')!;
    assert.equal(positionSize({ balance: 10_000, riskPct: 1, slPips: slPipsFromPrices(gm, 2350, 2345)!, pipValuePerLot: pipValuePerLot(gm, 1), contractSize: gm.contractSize })!.lots, 0.2);
  }
  // العقد الأصغر يبقى أصغر: «GOLDc»/«GOLDmicro» ليست GOLD + M
  for (const raw of ['GOLDc', 'GOLDC', 'GOLDmicro', 'GOLDMICRO', 'SILVERc']) assert.equal(instrumentSpec(raw), null, raw);
  // حرفٌ آخر ملاصق، أو اسم آخر: مرفوضة كما كانت (لا تخمين)
  for (const raw of ['GOLDMM', 'GOLDX', 'GOLDI', 'GOLDPROS', 'SILVERT', 'GOLDEUR', 'GOLD.TOOLONG', 'SILVERY', 'GOL', 'PLATINUM', 'GOLD SILVER'])
    assert.equal(instrumentSpec(raw), null, raw);
  // الحساب نفسه: وقف 5 دولار على GOLD = 50 pip × 10 USD/pip/lot؛ 1% من 10,000 ⇒ 0.2 lot (كـXAUUSD تماماً)
  const g = instrumentSpec('GOLD#')!;
  assert.equal(slPipsFromPrices(g, 2350, 2345), 50);
  const r = positionSize({ balance: 10_000, riskPct: 1, slPips: 50, pipValuePerLot: pipValuePerLot(g, 1), contractSize: g.contractSize })!;
  assert.equal(r.lots, 0.2);
  assert.equal(r.actualRisk, 100);
  const s = instrumentSpec('SILVER')!;
  // فضة: 0.25 دولار = 25 pip × 50 USD/pip/lot
  assert.equal(slPipsFromPrices(s, 30, 29.75), 25);
  assert.equal(pipValuePerLot(s, 1), 50);
  assert.deepEqual(pnlInQuoteCcy({ symbol: 'GOLD.m', side: 'buy', entry: 2350, exit: 2355.5, lots: 0.2 }), { amount: 110, ccy: 'USD' });
}
console.log('positionSize metal broker names selftest OK');

// ── السبريد داخل المسافة حين يكون الدخول Ask/Bid اللقطة: لا يُضاف مرّتين ──
{
  const eu = instrumentSpec('EURUSD')!;
  const q = { bid: 1.085, ask: 1.08515 }; // سبريد 1.5
  // شراء على Ask ووقف تحته: السبريد كلّه داخل المسافة ⇒ 0
  assert.equal(spreadBeyondLiveEntry({ spreadPips: 1.5, spec: eu, entry: 1.08515, stop: 1.08315, q }), 0);
  // بيع على Bid ووقف فوقه
  assert.equal(spreadBeyondLiveEntry({ spreadPips: 1.5, spec: eu, entry: 1.085, stop: 1.087, q }), 0);
  // وسيط أوسع من اللقطة: الفرق وحده
  assert.equal(spreadBeyondLiveEntry({ spreadPips: 2, spec: eu, entry: 1.08515, stop: 1.08315, q }), 0.5);
  // لقطة أوسع من المكتوب ⇒ 0 لا سالب
  assert.equal(spreadBeyondLiveEntry({ spreadPips: 1, spec: eu, entry: 1.08515, stop: 1.08315, q }), 0);
  // جهة معاكسة (Ask ووقف فوقه ⇒ البيع يُنفَّذ على Bid) ⇒ كاملاً
  assert.equal(spreadBeyondLiveEntry({ spreadPips: 1.5, spec: eu, entry: 1.08515, stop: 1.087, q }), 1.5);
  // دخول بالوسطي/مكتوب يدوياً ⇒ كاملاً
  assert.equal(spreadBeyondLiveEntry({ spreadPips: 1.5, spec: eu, entry: 1.08508, stop: 1.08315, q }), 1.5);
  // بلا لقطة / Bid-Ask غائب أو معكوس ⇒ كاملاً
  assert.equal(spreadBeyondLiveEntry({ spreadPips: 1.5, spec: eu, entry: 1.08515, stop: 1.08315, q: null }), 1.5);
  assert.equal(spreadBeyondLiveEntry({ spreadPips: 1.5, spec: eu, entry: 1.08515, stop: 1.08315, q: { ask: 1.08515 } }), 1.5);
  assert.equal(spreadBeyondLiveEntry({ spreadPips: 1.5, spec: eu, entry: 1.08515, stop: 1.08315, q: { bid: 1.08515, ask: 1.085 } }), 1.5);
  // بلا سبريد مكتوب ⇒ 0؛ مدخلات تالفة ⇒ كاملاً
  assert.equal(spreadBeyondLiveEntry({ spreadPips: 0, spec: eu, entry: 1.08515, stop: 1.08315, q }), 0);
  assert.equal(spreadBeyondLiveEntry({ spreadPips: 1.5, spec: eu, entry: NaN, stop: 1.08315, q }), 1.5);
  // سبريد اللقطة الكسري (المختلَق بالخادم 0.8 نقطة أساس ≈ 0.87 pip) يُقرَّب للأسفل ⇒ 0.8، الباقي 0.7؛
  // والدخول نصٌّ منسَّق (1.08504) من Ask 1.0850434 ما زال «على الـAsk»
  assert.equal(
    spreadBeyondLiveEntry({ spreadPips: 1.5, spec: eu, entry: 1.08504, stop: 1.0830, q: { bid: 1.0849566, ask: 1.0850434 } }),
    0.7,
  );
  // الذهب: سبريد 30 سنتاً = 3 pip، والوسيط 3.5
  const xau = instrumentSpec('XAUUSD')!;
  assert.equal(spreadBeyondLiveEntry({ spreadPips: 3.5, spec: xau, entry: 2350.65, stop: 2345.65, q: { bid: 2350.35, ask: 2350.65 } }), 0.5);
  // مثال التدقيق كاملاً: 10,000 USD، 1%، وقف 20 من Ask ⇒ 0.50 lot بمخاطرة 100.00 بالضبط — لا سطر «شاملة السبريد»
  const pv = pipValuePerLot(eu, 1);
  const sized = positionSize({ balance: 10000, riskPct: 1, slPips: 20, pipValuePerLot: pv, contractSize: eu.contractSize })!;
  assert.equal(sized.lots, 0.5);
  const left = spreadBeyondLiveEntry({ spreadPips: 1.5, spec: eu, entry: 1.08515, stop: 1.08315, q });
  assert.equal(
    spreadRisk({ lots: 0.5, slPips: 20, spreadPips: left, pipValuePerLot: pv, balance: 10000, riskPct: 1, contractSize: eu.contractSize }),
    null,
  );
}
console.log('positionSize spreadBeyondLiveEntry selftest OK');

// ── سعر ذهب بكتابة أوروبية «3.450» مبهم لا 3.45 ──
{
  assert.equal(parsePriceFor('3.450', 'XAUUSD'), null);
  assert.equal(parsePriceFor('2.350', 'GOLD#'), null);
  assert.equal(parsePriceFor('٣٫٤٥٠', 'XAUUSD.m'), null); // أرقام عربية وفاصل عربي
  assert.equal(parsePriceFor(' 3.450 ', 'XAUUSD'), null);
  // ما ليس مبهماً يبقى
  assert.equal(parsePriceFor('3450', 'XAUUSD'), 3450);
  assert.equal(parsePriceFor('3450.50', 'XAUUSD'), 3450.5);
  assert.equal(parsePriceFor('3.450,50', 'XAUUSD'), 3450.5);
  assert.equal(parsePriceFor('3,450.50', 'XAUUSD'), 3450.5);
  assert.equal(parsePriceFor('3.45', 'XAUUSD'), 3.45);
  assert.equal(parsePriceFor('0.450', 'XAUUSD'), 0.45);
  // الأدوات بثلاث منازل فأكثر: بلا تغيير
  assert.equal(parsePriceFor('157.250', 'USDJPY'), 157.25);
  assert.equal(parsePriceFor('31.450', 'XAGUSD'), 31.45);
  assert.equal(parsePriceFor('1.085', 'EURUSD'), 1.085);
  assert.equal(parsePriceFor('1.08500', 'EURUSD'), 1.085);
  // رمز غير معروف/فارغ ⇒ parseDecimal كما هو؛ نصّ غير مفهوم ⇒ null
  assert.equal(parsePriceFor('3.450', 'US30'), 3.45);
  assert.equal(parsePriceFor('3.450', null), 3.45);
  assert.equal(parsePriceFor('abc', 'XAUUSD'), null);
  assert.equal(parsePriceFor('3,450', 'XAUUSD'), null); // الفاصلة المبهمة مرفوضة أصلاً
}
console.log('positionSize parsePriceFor selftest OK');

// ── سبب رفض «3.450» للذهب والقراءتان لرسالة priceAmbiguousThousandsHint ──
{
  assert.deepEqual(ambiguousThousandsPrice('3.450', 'XAUUSD'), { value: '3.450', whole: '3450', small: '3.45' });
  assert.deepEqual(ambiguousThousandsPrice(' 2.351 ', 'GOLD#'), { value: '2.351', whole: '2351', small: '2.351' });
  // أرقام عربية وفاصل عربي: value كما كُتب، والقراءتان لاتينيتان
  assert.deepEqual(ambiguousThousandsPrice('٣٫٤٥٠', 'XAUUSD.m'), { value: '٣٫٤٥٠', whole: '3450', small: '3.45' });
  assert.deepEqual(ambiguousThousandsPrice('3.000', 'XAUUSD'), { value: '3.000', whole: '3000', small: '3' });
  // ليس مبهماً ⇒ null (مقبول أو مرفوض لسبب آخر)
  for (const [raw, sym] of [
    ['3450', 'XAUUSD'], ['3.45', 'XAUUSD'], ['0.450', 'XAUUSD'], ['3.450,50', 'XAUUSD'], ['3,450', 'XAUUSD'],
    ['abc', 'XAUUSD'], ['', 'XAUUSD'], ['157.250', 'USDJPY'], ['1.085', 'EURUSD'], ['3.450', 'US30'], ['3.450', ''],
  ] as const) {
    assert.equal(ambiguousThousandsPrice(raw, sym), null, `${raw} ${sym}`);
  }
  // يتّفق مع parsePriceFor: مبهم ⇔ parseDecimal يقرؤه لكن parsePriceFor يرفضه
  for (const raw of ['3.450', '2.350', '3450', '3.45', '0.450', '3.450,50', 'abc', '12.345', '1234.567']) {
    const amb = ambiguousThousandsPrice(raw, 'XAUUSD') != null;
    assert.equal(amb, parsePriceFor(raw, 'XAUUSD') == null && parseDecimal(raw) != null, raw);
  }
  assert.equal(parsePriceFor('3.450', null), 3.45);

  // الفضة بالين/الليرة فوق الألف بثلاث منازل: «5.123» = 5,123 ين (كانت تُقبل 5.123 ⇒ وقف 10 pip ⇒ 30 لوتاً بدل 0.03)
  assert.deepEqual(ambiguousThousandsPrice('5.123', 'XAGJPY'), { value: '5.123', whole: '5123', small: '5.123' });
  assert.deepEqual(ambiguousThousandsPrice('1.350', 'XAGTRY.m'), { value: '1.350', whole: '1350', small: '1.35' });
  assert.equal(parsePriceFor('5.123', 'XAGJPY'), null);
  assert.equal(parsePriceFor('5.023', 'XAGJPYc'), null);
  assert.equal(parsePriceFor('5123', 'XAGJPY'), 5123);
  assert.equal(parsePriceFor('5123.45', 'XAGJPY'), 5123.45);
  assert.equal(parsePriceFor('5,123.450', 'XAGJPY'), 5123.45);
  // الفضة تحت الألف بثلاث منازل فعلاً: لا تغيير
  for (const [raw, sym] of [['31.450', 'XAGUSD'], ['29.125', 'XAGEUR'], ['550.123', 'XAGMXN'], ['47.250', 'XAGAUD'], ['157.250', 'USDJPY']] as const) {
    assert.equal(ambiguousThousandsPrice(raw, sym), null, `${raw} ${sym}`);
    assert.equal(parsePriceFor(raw, sym), Number(raw), `${raw} ${sym}`);
  }
}
console.log('positionSize ambiguousThousandsPrice selftest OK');

// ── الحاسبة: أسعار الذهب تُقرأ بـparsePriceFor — «3.450»/«3.350» كانت 1 pip ⇒ 10 لوت بدل 0.01 ──
{
  const xau = instrumentSpec('XAUUSD')!;
  const pv = pipValuePerLot(xau, 1); // 10 USD للوت لكل pip
  const lotsFrom = (e: string, s: string) => {
    const sl = slPipsFromPrices(xau, parsePriceFor(e, xau.symbol) ?? NaN, parsePriceFor(s, xau.symbol) ?? NaN);
    return sl == null ? null : positionSize({ balance: 10000, riskPct: 1, slPips: sl, pipValuePerLot: pv, contractSize: xau.contractSize });
  };
  // القراءة القديمة (parseDecimal) للتوثيق: 1 pip ⇒ 10 لوت — هذا ما كان يُعرض
  assert.equal(slPipsFromPrices(xau, parseDecimal('3.450')!, parseDecimal('3.350')!), 1);
  assert.equal(positionSize({ balance: 10000, riskPct: 1, slPips: 1, pipValuePerLot: pv, contractSize: xau.contractSize })!.lots, 10);
  // الآن: لا نتيجة (رسالة «مبهم»)، والكتابة الصريحة تعطي 1000 pip ⇒ 0.01
  assert.equal(lotsFrom('3.450', '3.350'), null);
  assert.equal(lotsFrom('3450', '3.350'), null);
  assert.equal(lotsFrom('3450', '3350')!.lots, 0.01);
  assert.equal(slPipsFromPrices(xau, parsePriceFor('3450.50', 'XAUUSD')!, parsePriceFor('3440.50', 'XAUUSD')!), 100);
  assert.equal(lotsFrom('3450.50', '3440.50')!.lots, 0.1);
  // أزواج الحاسبة الأخرى بلا تغيير: EURUSD «1.085»، USDJPY «157.250»
  assert.equal(slPipsFromPrices(eu, parsePriceFor('1.085', 'EURUSD')!, parsePriceFor('1.0830', 'EURUSD')!), 20);
  const jp = instrumentSpec('USDJPY')!;
  assert.equal(slPipsFromPrices(jp, parsePriceFor('157.250', 'USDJPY')!, parsePriceFor('157.050', 'USDJPY')!), 20);
}
console.log('positionSize calculator price parsing selftest OK');

// stopInsideSpread — وقفٌ ليس أبعد من السبريد يُضرب لحظة الفتح
{
  assert.equal(stopInsideSpread(1, 1.5), true);
  assert.equal(stopInsideSpread(1.5, 1.5), true); // على Bid بالضبط = مضروب
  assert.equal(stopInsideSpread(0.1 + 0.2, 0.3), true); // تقريب الأعداد العشرية لا يقلب المساواة
  assert.equal(stopInsideSpread(parseSpreadPips('١٫٥')!, parseSpreadPips('1.5')), true);
  assert.equal(stopInsideSpread(1.6, 1.5), false);
  assert.equal(stopInsideSpread(20, 1.5), false);
  // سبريد فارغ (0) أو مرفوض أو غير منتهٍ: لا تحذير
  assert.equal(stopInsideSpread(1, parseSpreadPips('')), false);
  assert.equal(stopInsideSpread(1, parseSpreadPips('abc')), false);
  assert.equal(stopInsideSpread(1, parseSpreadPips('10851')), false);
  assert.equal(stopInsideSpread(1, NaN), false);
  // وقفٌ غير صالح: لا تحذير (خطؤه يُقال بمكانه)
  assert.equal(stopInsideSpread(NaN, 1.5), false);
  assert.equal(stopInsideSpread(0, 1.5), false);
  assert.equal(stopInsideSpread(-1, 1.5), false);
  // المثال الذي يبرّره: 10,000 USD، 1%، وقف 1 pip EURUSD ⇒ 10 لوت، ووقفه داخل سبريد 1.5
  const eu = instrumentSpec('EURUSD')!;
  const r = positionSize({ balance: 10_000, riskPct: 1, slPips: 1, pipValuePerLot: 10, contractSize: eu.contractSize })!;
  assert.equal(r.lots, 10);
  assert.equal(stopInsideSpread(1, 1.5), true);
  // الذهب: الوقف من سعرين ⇒ النقاط، وسبريد 30 pip شائع بالأخبار
  const xau = instrumentSpec('XAUUSD')!;
  const sl = slPipsFromPrices(xau, 2650.0, 2647.5)!;
  assert.equal(sl, 25);
  assert.equal(stopInsideSpread(sl, 30), true);
  assert.equal(stopInsideSpread(sl, 20), false);
}
console.log('positionSize stopInsideSpread selftest OK');

// misplacedArabicThousandsSignInRisk — «$0٬5» يصلها التلميح كما «0٬5»
{
  for (const r of ['0٬5', '$0٬5', '0٬5$', 'USD 12٬5', 'usd ١٢٬٥', '٠٬٥', '＄0٬5'])
    assert.equal(misplacedArabicThousandsSignInRisk(r, 10_000, 'USD'), true, r);
  // مقبولة أصلاً (آلاف حقيقية أو فاصلة عشرية صحيحة)، عملة أخرى، أو مرفوضة لسببٍ آخر ⇒ لا تلميح
  for (const r of ['USD 1٬000', '$1٬000', '0٫5', '$0٫5', '0.5', '€0٬5', 'EUR 0٬5', '$$0٬5', '1٬5٬5', '', 'abc'])
    assert.equal(misplacedArabicThousandsSignInRisk(r, 10_000, 'USD'), false, r);
  // بحساب يورو: «€0٬5» تلميح، «$0٬5» لا
  assert.equal(misplacedArabicThousandsSignInRisk('€0٬5', 10_000, 'EUR'), true);
  assert.equal(misplacedArabicThousandsSignInRisk('$0٬5', 10_000, 'EUR'), false);
  // بلا رصيد بعد: المبلغ مفهوم بعد الاستبدال (pct null ليس رفضاً) ⇒ التلميح قائم
  assert.equal(misplacedArabicThousandsSignInRisk('$0٬5', NaN, 'USD'), true);
  // لا تغيّر القراءة: الخانة نفسها ما زالت مرفوضة
  assert.equal(parseRiskInput('$0٬5', 10_000, 'USD'), null);
  assert.deepEqual(parseRiskInput('$0٫5', 10_000, 'USD'), { pct: 0.005, amount: 0.5 });
}
console.log('positionSize misplacedArabicThousandsSignInRisk selftest OK');

// leverageOutOfRange — «1:5000» مفهومة لكنها فوق الحدّ: رسالتها لا «رقم غير مفهوم»
{
  for (const r of ['1:5000', '5000', '١:٥٠٠٠', '1／5000', '1 : 10000', '0.5', '1:0', '0', '3000.5'])
    assert.equal(leverageOutOfRange(r), true, r);
  // مقبولة، فارغة، أو صيغة غير مفهومة (تبقى للرسالة العامة)
  for (const r of ['', '1:1', '1', '500', '1:500', '3000', '1:3000', '100:1', 'abc', '1:1:500', '1,000', '-100', '1.000', '1:1.000'])
    assert.equal(leverageOutOfRange(r), false, r);
  assert.equal(MAX_LEVERAGE, 3000);
  // القراءة لم تتغيّر
  assert.equal(parseLeverage('1:5000'), null);
  assert.equal(parseLeverage('1:3000'), 3000);
  assert.equal(parseLeverage('1:500'), 500);
  assert.equal(parseLeverage('0.5'), null);
  // الكسور غير المبهمة ما زالت مقبولة كما كانت
  assert.equal(parseLeverage('1:33.3'), 33.3);
  assert.equal(parseLeverage('1.5'), 1.5);
  assert.equal(parseLeverage('1:1000'), 1000);
}
console.log('positionSize leverageOutOfRange selftest OK');

// riskOverBalance — مخاطرة أكبر من الرصيد تُسمّى بالمبلغين
{
  assert.deepEqual(riskOverBalance('200', 5_000, 'USD'), { risk: 10_000, balance: 5_000 });
  assert.deepEqual(riskOverBalance('150%', 1_000, 'USD'), { risk: 1_500, balance: 1_000 });
  // مبلغ فوق الرصيد: المبلغ المكتوب كما هو
  assert.deepEqual(riskOverBalance('$600', 500, 'USD'), { risk: 600, balance: 500 });
  assert.deepEqual(riskOverBalance('USD 5000', 500, 'USD'), { risk: 5000, balance: 500 });
  assert.deepEqual(riskOverBalance('١٠١', 100, 'USD'), { risk: 101, balance: 100 });
  // الحدّ: 100% بالضبط يحسبه positionSize ⇒ ليس فوق الرصيد
  assert.equal(riskOverBalance('100', 5_000, 'USD'), null);
  assert.equal(riskOverBalance('$500', 500, 'USD'), null);
  assert.ok(positionSize({ balance: 500, riskPct: 100, slPips: 10, pipValuePerLot: 10, contractSize: 100_000 }) != null);
  assert.equal(positionSize({ balance: 500, riskPct: 100.01, slPips: 10, pipValuePerLot: 10, contractSize: 100_000 }), null);
  // ضمن الرصيد، غير مفهومة، عملة أخرى، بلا رصيد
  for (const [r, b] of [['1', 10_000], ['50', 10_000], ['abc', 10_000], ['', 10_000], ['€600', 500], ['200', NaN], ['200', 0], ['$600', NaN]] as const)
    assert.equal(riskOverBalance(r, b, 'USD'), null, `${r} @ ${b}`);
  // الحاسبة تُخفي «أدخل الرصيد…» حين `riskOverBalance` غير null فقط: نسبة >100% **بلا رصيد** كانت تُخفيه
  // أيضاً فيبقى الصندوق فارغاً. الثابت: لكل نسبة >100% يظهر تحذير الرصيد ⇔ الرصيد صالح (ولا لوت بالحالتين)
  for (const r of ['150', '100.5', '٢٠٠', '1000%'])
    for (const b of [NaN, 0, -5, 1_000, 25]) {
      assert.equal(riskOverBalance(r, b, 'USD') != null, Number.isFinite(b) && b > 0, `${r} @ ${b}`);
      assert.equal(
        positionSize({ balance: b, riskPct: parseRiskInput(r, b, 'USD')!.pct!, slPips: 10, pipValuePerLot: 10, contractSize: 100_000 }),
        null,
        `${r} @ ${b}`
      );
    }
}
console.log('positionSize riskOverBalance selftest OK');

// centAccountSymbol — رمز حساب سنت يُسمّى بدل «استخدم زوجاً من 6 أحرف»
{
  for (const [raw, pair] of [
    ['EURUSDc', 'EURUSD'], ['USDJPYc', 'USDJPY'], ['XAUUSDc', 'XAUUSD'], ['XAGUSDc', 'XAGUSD'],
    ['EURUSDC', 'EURUSD'], ['eurusdc', 'EURUSD'], [' GBPJPYc ', 'GBPJPY'], ['EUR/USDc', 'EURUSD'],
    ['GOLDc', 'XAUUSD'], ['SILVERc', 'XAGUSD'],
  ] as const) {
    assert.equal(centAccountSymbol(raw), pair, raw);
    // ما زالت مرفوضة بالحاسبة: عقد السنت لا يُحسب بعقد الحساب العادي
    assert.equal(instrumentSpec(raw), null, raw);
  }
  // مقبولة أصلاً، أو ليست سنتاً، أو لا تُخمَّن
  for (const raw of ['EURUSD', 'EURUSDm', 'EURUSD.micro', 'XAUUSD.pro', 'EURUSDT', 'EURUSDmc', 'EURUSDcc', 'USDC', 'ABCDEFc', 'XAUXAGc', 'US30c', 'BTCUSDc', 'c', ''])
    assert.equal(centAccountSymbol(raw), null, raw);
}
console.log('positionSize centAccountSymbol selftest OK');

// لاحقة عقدٍ أصغر بمئة مرّة بفاصل («EURUSD.c»، «EURUSD-cent»، «EURUSD.micro») — لا يُحسب لها لوت الحساب العادي
{
  for (const [raw, pair] of [
    ['EURUSD.c', 'EURUSD'], ['EURUSD.C', 'EURUSD'], ['EURUSD-cent', 'EURUSD'], ['XAUUSD_cent', 'XAUUSD'],
    ['USDJPY#c', 'USDJPY'], ['GOLD.c', 'XAUUSD'], ['silver-cent', 'XAGUSD'], ['EUR/USD.cent', 'EURUSD'],
  ] as const) {
    assert.equal(instrumentSpec(raw), null, raw);
    assert.equal(riskInQuoteCcy({ symbol: raw, entry: 1.085, sl: 1.0825, lots: 0.1 }), null, raw);
    assert.equal(centAccountSymbol(raw), pair, raw);
    assert.equal(smallContractPair(raw), pair, raw);
  }
  // micro: مرفوض بالحاسبة، وليس «سنتاً» (رسالة السنت لا تصفه) — لكن زوجه معروف لنقاط الدفتر وسعر السوق
  for (const [raw, pair] of [['EURUSD.micro', 'EURUSD'], ['USDJPY-MICRO', 'USDJPY'], ['GOLD_micro', 'XAUUSD'], ['EURUSDmicro', 'EURUSD'], ['XAUUSDmicro', 'XAUUSD'], ['GOLDmicro', 'XAUUSD'], ['usdjpyMICRO', 'USDJPY']] as const) {
    assert.equal(instrumentSpec(raw), null, raw);
    assert.equal(centAccountSymbol(raw), null, raw);
    assert.equal(smallContractPair(raw), pair, raw);
  }
  // اللواحق العادية كما كانت: العقد عقد الحساب العادي
  for (const raw of ['EURUSD.m', 'EURUSD.pro', 'EURUSD.ecn', 'EURUSD.cfd', 'EURUSD.c1', 'EURUSD#', 'GOLD.m', 'EURUSD.std'])
    assert.ok(instrumentSpec(raw), raw);
  for (const raw of ['EURUSD.m', 'EURUSD', 'US30.c', 'BTCUSD.cent', 'EURUSD.cents', 'EURUSDmicros', 'US30micro', 'BTCUSDmicro'])
    assert.equal(smallContractPair(raw), null, raw);
  // الحاسبة: 1% من 1000 بوقف 25 pip = 0.04 لوت عادي — كان يُعرض هذا لـ«EURUSD.c» (حساب السنت يحتاج 4.00)
  const std = instrumentSpec('EURUSD')!;
  assert.equal(positionSize({ balance: 1000, riskPct: 1, slPips: 25, pipValuePerLot: pipValuePerLot(std, 1), contractSize: std.contractSize })!.lots, 0.04);
}
console.log('positionSize smallContractPair selftest OK');

// «3.450» بخانة ذهب حساب سنت/micro مبهمة كالذهب العادي — كانت تُقرأ 3.45 فيُحفظ الدخول بالدفتر خطأً
{
  for (const sym of ['XAUUSDC', 'XAUUSDc', 'GOLDC', 'GOLD.c', 'XAUUSD-cent', 'GOLDMICRO', 'XAUUSD.micro']) {
    assert.equal(parsePriceFor('3.450', sym), null, sym);
    assert.deepEqual(ambiguousThousandsPrice('3.450', sym), { value: '3.450', whole: '3450', small: '3.45' }, sym);
    assert.equal(parsePriceFor('3450.5', sym), 3450.5, sym);
  }
  // الين والفضة بثلاث منازل فعلاً — كما كانت
  assert.equal(parsePriceFor('157.250', 'USDJPYC'), 157.25);
  assert.equal(parsePriceFor('31.450', 'XAGUSDc'), 31.45);
  assert.equal(parsePriceFor('1.085', 'EURUSDC'), 1.085);
}
console.log('positionSize ambiguousThousandsPrice small-contract selftest OK');

// microAccountSymbol — رسالة micro بالحاسبة (لا «زوج من 6 أحرف»، ولا رسالة السنت)
{
  for (const [raw, pair] of [
    ['EURUSDmicro', 'EURUSD'], ['EURUSD.micro', 'EURUSD'], ['USDJPY-MICRO', 'USDJPY'], ['GOLD_micro', 'XAUUSD'],
    ['GOLDmicro', 'XAUUSD'], ['XAUUSDmicro', 'XAUUSD'], ['eurusdmicro', 'EURUSD'],
  ] as const) {
    assert.equal(microAccountSymbol(raw), pair, raw);
    assert.equal(instrumentSpec(raw), null, raw);
  }
  // السنت له رسالته، والعادي والمجهول ليسا micro
  for (const raw of ['EURUSDc', 'EURUSD.c', 'GOLD-cent', 'EURUSD', 'EURUSD.m', 'US30micro', 'BTCUSDmicro', 'EURUSDmicros', ''])
    assert.equal(microAccountSymbol(raw), null, raw);
}
console.log('positionSize microAccountSymbol selftest OK');

// smallContractSpec — الحاسبة تحسب لوت السنت (رصيد USC) ولوت micro بدل رفضهما
{
  // التعرّف: السنت والـmicro بكتاباتهما، والعقد أصغر بمئة مرّة
  for (const [raw, kind, sym, contract] of [
    ['EURUSDc', 'cent', 'EURUSD', 1000], ['EURUSD.c', 'cent', 'EURUSD', 1000], ['GBPJPY-cent', 'cent', 'GBPJPY', 1000],
    ['XAUUSDc', 'cent', 'XAUUSD', 1], ['GOLDc', 'cent', 'XAUUSD', 1], ['XAGUSDc', 'cent', 'XAGUSD', 50],
    ['EURUSDmicro', 'micro', 'EURUSD', 1000], ['GOLD_micro', 'micro', 'XAUUSD', 1],
  ] as const) {
    const s = smallContractSpec(raw);
    assert.ok(s, raw);
    assert.equal(s!.kind, kind, raw);
    assert.equal(s!.spec.symbol, sym, raw);
    assert.equal(s!.spec.contractSize, contract, raw);
    assert.equal(s!.spec.pipSize, instrumentSpec(sym)!.pipSize, raw);
  }
  for (const raw of ['EURUSD', 'EURUSD.m', 'EURUSDm', 'XAUUSD', 'US30micro', 'BTCUSDc', 'EURUSDT', ''])
    assert.equal(smallContractSpec(raw), null, raw);

  // سنت EURUSD: 10,000 USC (= 100 USD)، 1%، وقف 25 ⇒ 100 USC ÷ (25 × 10 USC) = 0.40 لوت سنت
  // = 0.004 لوت عادي — بالضبط ما يعطيه حساب عادي برصيد 100 USD
  const cent = smallContractSpec('EURUSDc')!.spec;
  const centRate = centQuoteToAccount(1)!;
  assert.equal(centRate, CENTS_PER_USD);
  const centPv = pipValuePerLot(cent, centRate);
  assert.ok(Math.abs(centPv - 10) < 1e-9, 'pip = 10 USC لكل لوت سنت');
  const r = positionSize({ balance: 10_000, riskPct: 1, slPips: 25, pipValuePerLot: centPv, contractSize: cent.contractSize })!;
  assert.equal(r.lots, 0.4);
  assert.equal(r.units, 400);
  assert.ok(Math.abs(r.actualRisk - 100) < 1e-9);
  assert.equal(smallLotsStdEquiv(r.lots), '0.004');
  const std = positionSize({ balance: 100, riskPct: 1, slPips: 25, pipValuePerLot: pipValuePerLot(instrumentSpec('EURUSD')!, 1), contractSize: 100_000 })!;
  assert.ok(Math.abs(std.rawLots * 100 - r.rawLots) < 1e-9, 'لوت السنت = اللوت العادي × 100');
  // الرصيد الذي كان يُكتب بالسنت ويُحسب بالحساب العادي كان سيُعطي لوتاً بمئة ضعف — هنا 0.40 لا 40
  assert.ok(r.lots < 1);

  // هامش السنت بـUSC: 0.40 لوت × 1,000 × 1.08 ÷ 100 = 4.32 USD = 432 USC
  const m = requiredMargin({ spec: cent, lots: 0.4, price: 1.08, quoteToAccount: centRate, leverage: 100 })!;
  assert.ok(Math.abs(m - 432) < 1e-9);
  // الربح عند هدف +50 pip: 0.40 × 1,000 × 0.005 = 2 USD = 200 USC
  const p = profitAtTarget({ spec: cent, entry: 1.08, target: 1.085, lots: 0.4, quoteToAccount: centRate })!;
  assert.ok(Math.abs(p - 200) < 1e-6);

  // سنت USDJPY عند 150: تحويل JPY ⇒ USD = 1/150، والـpip لكل لوت سنت = 0.01 × 1,000 × 100/150 = 6.67 USC
  // (= 6.67 USD للوت العادي ÷ 100 × 100)
  const jpy = smallContractSpec('USDJPYc')!.spec;
  const jpyPv = pipValuePerLot(jpy, centQuoteToAccount(1 / 150)!);
  assert.ok(Math.abs(jpyPv - pipValuePerLot(instrumentSpec('USDJPY')!, 1 / 150)) < 1e-9);

  // ذهب سنت: pip (0.1) لكل لوت سنت = 0.1 × 1 × 100 = 10 USC = 0.10 USD (عُشر دولار = 1/100 من 10 USD العادي)
  const gold = smallContractSpec('XAUUSDc')!.spec;
  assert.ok(Math.abs(pipValuePerLot(gold, centQuoteToAccount(1)!) - 10) < 1e-9);

  // micro EURUSD بحساب دولار: 1,000 USD، 1%، وقف 25 ⇒ 10 ÷ (25 × 0.10) = 4.00 لوت micro = 0.04 عادي
  const micro = smallContractSpec('EURUSDmicro')!.spec;
  const mpv = pipValuePerLot(micro, 1);
  assert.ok(Math.abs(mpv - 0.1) < 1e-12);
  const mr = positionSize({ balance: 1000, riskPct: 1, slPips: 25, pipValuePerLot: mpv, contractSize: micro.contractSize })!;
  assert.equal(mr.lots, 4);
  assert.equal(mr.units, 4000);
  assert.equal(smallLotsStdEquiv(mr.lots), '0.04');

  assert.equal(centQuoteToAccount(null), null);
  assert.equal(centQuoteToAccount(0), null);
  assert.equal(smallLotsStdEquiv(0.01), '0.0001');
  assert.equal(smallLotsStdEquiv(250), '2.5');
  assert.equal(smallLotsStdEquiv(0), '—');
}
console.log('positionSize smallContractSpec selftest OK');

// المخاطرة بالمال بعملة USC (حساب السنت): تُفهم وتُقلب نسبةً، ولا تُقرأ بعملة أخرى — ما يعتمد عليه تبديل EURUSD ⇄ EURUSDc
{
  assert.deepEqual(parseRiskInput('USC 100', 10_000, 'USC'), { pct: 1, amount: 100 });
  assert.deepEqual(parseRiskInput('100 usc', 10_000, 'USC'), { pct: 1, amount: 100 });
  assert.equal(parseRiskInput('USD 100', 10_000, 'USC'), null);
  assert.equal(parseRiskInput('$100', 10_000, 'USC'), null, '$ ليست السنت');
  assert.equal(parseRiskInput('USC 100', 10_000, 'USD'), null);
  // «USD 50» من رصيد 1,000 ⇒ «5» (نسبة) قبل الانتقال للسنت، و«USC 250» من 50,000 ⇒ «0.5» قبل العودة
  assert.equal(toggleRiskUnit('USD 50', 1000, 'USD'), '5');
  assert.equal(toggleRiskUnit('USC 250', 50_000, 'USC'), '0.5');
  // والنسبة تُقلب مالاً بـUSC لشريحة المخاطرة بالمال بوضع السنت
  const flipped = toggleRiskUnit('1', 50_000, 'USC');
  assert.ok(flipped && /USC/.test(flipped), String(flipped));
  assert.equal(parseRiskInput(flipped!, 50_000, 'USC')!.pct, 1);
}
console.log('positionSize USC risk-input selftest OK');

// smallContractSuffix / withSmallSuffix — شرائح الأزواج تبقى بوضع السنت/micro
{
  for (const [raw, suf] of [
    ['EURUSDc', 'c'], ['EURUSDC', 'C'], ['EURUSD.c', '.c'], ['GBPJPY-cent', '-cent'], ['XAUUSD_CENT', '_CENT'],
    ['GOLDc', 'c'], ['EURUSDmicro', 'micro'], ['EURUSD.micro', '.micro'], ['GOLDmicro', 'micro'], [' USDJPYc ', 'c'],
  ] as const)
    assert.equal(smallContractSuffix(raw), suf, raw);
  for (const raw of ['EURUSD', 'EURUSD.m', 'EURUSDm', 'US30micro', 'BTCUSDc', 'EURUSDT', ''])
    assert.equal(smallContractSuffix(raw), null, raw);

  assert.equal(withSmallSuffix('GBPUSD', 'c'), 'GBPUSDc');
  assert.equal(withSmallSuffix('XAUUSD', '.c'), 'XAUUSD.c');
  assert.equal(withSmallSuffix('USDJPY', '-cent'), 'USDJPY-cent');
  assert.equal(withSmallSuffix('EURGBP', 'micro'), 'EURGBPmicro');
  // الناتج أداة سنت/micro للزوج نفسه، بعقدٍ أصغر بمئة مرّة
  for (const pair of ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'GBPJPY', 'EURGBP']) {
    for (const suf of ['c', '.c', '-cent', 'micro', '_MICRO']) {
      const s = withSmallSuffix(pair, suf)!;
      assert.ok(s, pair + suf);
      const sp = smallContractSpec(s)!;
      assert.equal(sp.spec.symbol, pair);
      assert.equal(sp.spec.contractSize, instrumentSpec(pair)!.contractSize / 100);
      assert.equal(sp.kind, /micro/i.test(suf) ? 'micro' : 'cent');
    }
  }
  // لاحقة ليست سنتاً/micro، أو زوج مجهول ⇒ null (لا رمزٌ يُحسب بعقد خطأ)
  assert.equal(withSmallSuffix('EURUSD', 'm'), null);
  assert.equal(withSmallSuffix('EURUSD', '.pro'), null);
  assert.equal(withSmallSuffix('EURUSD', ''), null);
  assert.equal(withSmallSuffix('US30', 'c'), null);
  assert.equal(withSmallSuffix('BTCUSD', 'c'), null);
}
console.log('positionSize smallContractSuffix selftest OK');

// commissionAcrossModes — «7» للوت العادي لا تصير 7 USD لكل لوت micro
{
  const std = { kind: 'std', account: 'USD' } as const;
  const cent = { kind: 'cent', account: 'USD' } as const;
  const micro = { kind: 'micro', account: 'USD' } as const;
  // 7 USD/لوت عادي = 0.07 USD/لوت micro (1,000 وحدة) = 7 USC/لوت سنت (1,000 وحدة، 7 سنتات = 0.07 USD)
  assert.equal(commissionAcrossModes('7', std, micro), '0.07');
  assert.equal(commissionAcrossModes('0.07', micro, std), '7');
  assert.equal(commissionAcrossModes('7', std, cent), '7');
  assert.equal(commissionAcrossModes('7', cent, std), '7');
  assert.equal(commissionAcrossModes('7', cent, micro), '0.07');
  assert.equal(commissionAcrossModes('0.07', micro, cent), '7');
  // المعنى محفوظ: عمولة لوتٍ micro واحد = عمولة 0.01 لوت عادي
  const perMicro = parseCommission(commissionAcrossModes('6.5', std, micro))!;
  assert.ok(Math.abs(perMicro * 1 - 6.5 * 0.01) < 1e-12);
  // ذهاب وعودة بلا انزلاق منزلة
  for (const v of ['7', '6.5', '3.75', '0.5', '0.01', '12'])
    assert.equal(commissionAcrossModes(commissionAcrossModes(v, std, micro), micro, std), v, v);
  // الناتج يُقرأ بخانة العمولة نفسها
  for (const v of ['7', '0.5', '0.01']) assert.ok(parseCommission(commissionAcrossModes(v, std, micro)) != null, v);
  // حساب يورو: micro يبقى باليورو (÷100)، والسنت بالدولار ⇒ تُمسح (7 EUR ليست 7 USC)
  const stdEur = { kind: 'std', account: 'EUR' } as const;
  assert.equal(commissionAcrossModes('7', stdEur, { kind: 'micro', account: 'EUR' }), '0.07');
  assert.equal(commissionAcrossModes('7', stdEur, cent), '');
  assert.equal(commissionAcrossModes('7', cent, stdEur), '');
  assert.equal(commissionAcrossModes('7', std, stdEur), '');
  // السنت بالدولار أياً كانت شريحة الحساب المخفية
  assert.equal(commissionAcrossModes('7', cent, { kind: 'cent', account: 'EUR' }), '7');
  // فارغة / صفر / غير مفهومة / الوضع نفسه ⇒ كما هي
  assert.equal(commissionAcrossModes('', std, micro), '');
  assert.equal(commissionAcrossModes('0', std, micro), '0');
  assert.equal(commissionAcrossModes('abc', std, micro), 'abc');
  assert.equal(commissionAcrossModes('7.000', std, micro), '7.000');
  assert.equal(commissionAcrossModes('7', micro, micro), '7');
  // الكتابة العربية تُقرأ
  assert.equal(commissionAcrossModes('٧', std, micro), '0.07');
}
console.log('positionSize commissionAcrossModes selftest OK');

// SYMBOL_INPUT_MAX_LEN — كل رمز سنت/micro/وسيط تقبله الحاسبة يُكتب كاملاً بخانة الرمز
{
  const accepted = [
    'EURUSDmicro', 'EURUSD.micro', 'XAUUSD_MICRO', 'SILVER.micro', 'EURUSD-cent', 'XAUUSD_cent', 'GBPJPY.cent',
    'EUR/USD.micro', 'EUR/USD-cent', 'SILVERmicro', 'EUR/USD.pro12', 'GBP_JPY.ecn',
  ];
  for (const s of accepted) {
    assert.ok(s.length <= SYMBOL_INPUT_MAX_LEN, s);
    assert.ok(instrumentSpec(s) || smallContractSpec(s), s);
  }
  // كل زوج جاهز بكل لاحقة معروفة يتّسع ويبقى سنتاً/micro للزوج نفسه
  for (const pair of ['EURUSD', 'GBPJPY', 'XAUUSD', 'XAGUSD', 'USDCHF'])
    for (const suf of ['c', '.c', '-cent', '_CENT', '.cent', 'micro', '.micro', '-micro', '_MICRO']) {
      const s = withSmallSuffix(pair, suf);
      assert.ok(s && s.length <= SYMBOL_INPUT_MAX_LEN, pair + suf);
    }
  // الحدّ القديم (10) كان يقطع «EURUSDmicro» إلى رمزٍ مجهول
  assert.equal(smallContractSpec('EURUSDmicro'.slice(0, 10)), null);
  assert.equal(smallContractSpec('EURUSDmicro')?.kind, 'micro');
}
console.log('positionSize SYMBOL_INPUT_MAX_LEN selftest OK');

// lotsOverOrderMax بلوت السنت/micro — حدّه 200 (كالدفتر)، لا 100
{
  // EURUSDc: 500,000 USC · 2% · وقف 8 pip · 10 USC/pip للوت سنت ⇒ 125 لوت سنت = 1.25 لوت عادي
  const pv = pipValuePerLot(smallContractSpec('EURUSDc')!.spec, centQuoteToAccount(1)!);
  assert.equal(pv, 10);
  const r = positionSize({ balance: 500_000, riskPct: 2, slPips: 8, pipValuePerLot: pv, contractSize: 1_000 })!;
  assert.equal(r.lots, 125);
  assert.equal(lotsOverOrderMax(r, true), null);
  assert.equal(lotsOverOrderMax(r), 125); // حدّ العادي كان يحذّر
  // الحدّ بالضبط مقبول، وفوقه يحذّر
  const at = positionSize({ balance: 1_000_000, riskPct: 1, slPips: 5, pipValuePerLot: 10, contractSize: 1_000 })!;
  assert.equal(at.lots, MAX_SMALL_LOTS);
  assert.equal(lotsOverOrderMax(at, true), null);
  const over = positionSize({ balance: 1_000_000, riskPct: 2, slPips: 8, pipValuePerLot: 10, contractSize: 1_000 })!;
  assert.equal(over.lots, 250);
  assert.equal(lotsOverOrderMax(over, true), 250);
  assert.equal(MAX_SMALL_LOTS, 200);
  // حسابٌ عادي كما كان
  const std = positionSize({ balance: 100_000, riskPct: 2, slPips: 1, pipValuePerLot: 10, contractSize: 100_000 })!;
  assert.equal(lotsOverOrderMax(std, false), 200);
}
console.log('positionSize lotsOverOrderMax small selftest OK');

// conversionKey — سعر التحويل المحفوظ لا يُقرأ للاتجاه المعاكس
{
  // GBPUSD بحساب إسترليني: USD ⇒ GBP = 1 / GBPUSD؛ EURGBPc (سنت دولار): GBP ⇒ USD = GBPUSD
  const a = conversionPair('USD', 'GBP')!;
  const b = conversionPair('GBP', 'USD')!;
  assert.equal(a.symbol, b.symbol);
  assert.notEqual(a.invert, b.invert);
  assert.notEqual(conversionKey(a), conversionKey(b));
  // لو قُرئ أحدهما للآخر: 0.787 بدل 1.27 — الفرق الذي كان يظهر إطاراً
  const px = 1.27;
  assert.ok(Math.abs(quoteToAccountRate(a, px)! - 1 / 1.27) < 1e-12);
  assert.equal(quoteToAccountRate(b, px), 1.27);
  // الزوج والاتجاه نفسهما ⇒ المفتاح نفسه (التحديث الصامت كل دقيقة يبقى مقروءاً)
  assert.equal(conversionKey(conversionPair('JPY', 'USD')), conversionKey(conversionPair('JPY', 'USD')));
  assert.equal(conversionKey(null), null);
  assert.equal(conversionKey(conversionPair('USD', 'USD')), null);
}
console.log('positionSize conversionKey selftest OK');

// commissionNoteExample — ملاحظة العمولة بوضع micro/السنت بأرقام الخانة
{
  // لا خانة ⇒ المثال: 7 للعادي = 0.07 للوت micro؛ السنت 7 USC
  assert.deepEqual(commissionNoteExample('', 'micro'), { std: '7', micro: '0.07', usc: '7' });
  assert.deepEqual(commissionNoteExample('', 'cent'), { std: '7', micro: '0.07', usc: '7' });
  // ما كتبه المتداول: 0.05 لكل لوت micro = 5 للوت العادي
  assert.deepEqual(commissionNoteExample('0.05', 'micro'), { std: '5', micro: '0.05', usc: '5' });
  assert.deepEqual(commissionNoteExample('0.035', 'micro'), { std: '3.5', micro: '0.035', usc: '3.5' });
  assert.deepEqual(commissionNoteExample('6', 'cent'), { std: '6', micro: '0.06', usc: '6' });
  assert.deepEqual(commissionNoteExample('٠٫٠٦', 'micro'), { std: '6', micro: '0.06', usc: '6' });
  // المعنى نفسه كـcommissionAcrossModes (الخانة بعد العبور إلى العادي)
  const micro = { kind: 'micro', account: 'USD' } as const;
  const std = { kind: 'std', account: 'USD' } as const;
  for (const v of ['0.07', '0.05', '0.035', '0.01'])
    assert.equal(commissionNoteExample(v, 'micro')!.std, commissionAcrossModes(v, micro, std), v);
  // صفر / غير مفهومة / سالبة ⇒ المثال لا «0 = 0»
  for (const v of ['0', 'abc', '-1', '7.000'])
    assert.deepEqual(commissionNoteExample(v, 'micro'), { std: '7', micro: '0.07', usc: '7' }, v);
  // عادي أو مجهول ⇒ الملاحظة العادية
  assert.equal(commissionNoteExample('7', 'std'), null);
  assert.equal(commissionNoteExample('7', null), null);
}
console.log('positionSize commissionNoteExample selftest OK');

// كلمات نوع الحساب الملاصقة: عقدٌ عادي كالشارت (`chartPipSpec('EURUSDpro')`)
{
  for (const [raw, sym] of [
    ['EURUSDpro', 'EURUSD'],
    ['GBPJPYecn', 'GBPJPY'],
    ['XAUUSDraw', 'XAUUSD'],
    ['USDJPYstd', 'USDJPY'],
    ['EURUSDSTP', 'EURUSD'],
    ['eurusdvip', 'EURUSD'],
    ['EUR/USDpro', 'EURUSD'],
  ] as const) {
    assert.equal(instrumentSpec(raw)?.symbol, sym, raw);
    assert.equal(smallContractPair(raw), null, raw);
  }
  // قيمة pip والحجم كالزوج بلا لاحقة
  assert.equal(pipValuePerLot(instrumentSpec('USDJPYpro')!, 150), pipValuePerLot(instrumentSpec('USDJPY')!, 150));
  // حروفٌ ملاصقة أخرى تبقى مرفوضة (EURUSDT تيثر)، والعقد الأصغر لا يصير عادياً
  for (const raw of ['EURUSDT', 'EURUSDPROS', 'EURUSDPR', 'BTCUSDpro', 'EURUSDmicro', 'EURUSDc', 'EURUSDMICROPRO'])
    assert.equal(instrumentSpec(raw), null, raw);
  assert.equal(smallContractPair('EURUSDmicro'), 'EURUSD');
  assert.equal(centAccountSymbol('EURUSDc'), 'EURUSD');
  // الطول يتّسع بخانة الرمز
  assert.ok('EUR/USDpro'.length <= SYMBOL_INPUT_MAX_LEN);
}
console.log('positionSize glued account-type suffix selftest OK');

// الهامش حين العملة الأساس = عملة الحساب: بلا سعر، حتى لأمرٍ معلّق بعيد عن السوق
{
  const uj = instrumentSpec('USDJPY')!;
  const live = quoteToAccountRate(conversionPair('JPY', 'USD'), 150)!; // 1/150 من السعر الحيّ
  // الخطأ القديم: الدخول 140 × (1/150) ⇒ 933.33 USD
  assert.ok(near(requiredMargin({ spec: uj, lots: 1, price: 140, quoteToAccount: live, leverage: 100 })!, 933.3333333333334));
  const b = marginBaseToAccount(uj, 'USD');
  assert.equal(b, 1);
  assert.ok(near(requiredMargin({ spec: uj, lots: 1, price: 140, quoteToAccount: live, leverage: 100, baseToAccount: b })!, 1000));
  // EURGBP بحساب يورو، دخول 0.84 والسوق 0.86، 1:30 ⇒ 3,333.33 EUR (كان 3,255.81)
  const eg = instrumentSpec('EURGBP')!;
  const gbpEur = quoteToAccountRate(conversionPair('GBP', 'EUR'), 0.86)!;
  const be = marginBaseToAccount(eg, 'EUR');
  assert.equal(formatMoney(requiredMargin({ spec: eg, lots: 1, price: 0.84, quoteToAccount: gbpEur, leverage: 30, baseToAccount: be })!, 'EUR'), '3,333.33 EUR');
  // والدخول = الحيّ ⇒ الرقم نفسه كالطريق القديم (لا تغيير لمن يحسب من سعر السوق)
  assert.ok(near(
    requiredMargin({ spec: uj, lots: 0.3, price: 150, quoteToAccount: live, leverage: 500, baseToAccount: b })!,
    requiredMargin({ spec: uj, lots: 0.3, price: 150, quoteToAccount: live, leverage: 500 })!,
  ));
  // السنت: USDJPYc لوت سنت (1,000 دولار) ÷ 100 = 10 USD = 1,000 USC
  const ujc = smallContractSpec('USDJPYc')!;
  const bc = marginBaseToAccount(ujc.spec, 'USD', true);
  assert.equal(bc, CENTS_PER_USD);
  assert.ok(near(requiredMargin({ spec: ujc.spec, lots: 1, price: 140, quoteToAccount: centQuoteToAccount(live)!, leverage: 100, baseToAccount: bc })!, 1000));
  // micro: EURUSDmicro بحساب يورو — 1 لوت micro (1,000 يورو) ÷ 100 = 10 EUR
  const eum = smallContractSpec('EURUSDmicro')!;
  assert.ok(near(requiredMargin({ spec: eum.spec, lots: 1, price: 1.05, quoteToAccount: 1 / 1.1, leverage: 100, baseToAccount: marginBaseToAccount(eum.spec, 'EUR') })!, 10));
  // maxLotsForMargin يعكسه: 1,000 USD برافعة 100 ⇒ 1.00 لوت USDJPY أياً كان الدخول
  for (const px of [140, 150, 165])
    assert.equal(maxLotsForMargin({ spec: uj, available: 1000, price: px, quoteToAccount: live, leverage: 100, baseToAccount: b }), 1);
  // ليست الأساس ⇒ null (الطريق القديم): EURUSD بحساب دولار، الذهب بأي حساب، EURGBP بحساب دولار
  assert.equal(marginBaseToAccount(instrumentSpec('EURUSD'), 'USD'), null);
  assert.equal(marginBaseToAccount(instrumentSpec('XAUUSD'), 'USD'), null);
  assert.equal(marginBaseToAccount(eg, 'USD'), null);
  assert.equal(marginBaseToAccount(null, 'USD'), null);
  // baseToAccount غير صالح ⇒ الطريق القديم
  assert.ok(near(requiredMargin({ spec: uj, lots: 1, price: 150, quoteToAccount: live, leverage: 100, baseToAccount: NaN })!, 1000));
}
console.log('positionSize margin base-currency account selftest OK');

// riskIsHigh: التحذير فوق السقف 2% (الأكاديمية 1-2%)، لا فوق الموصى به 1%
{
  assert.equal(RISK_HIGH_PCT, 2);
  for (const p of [0.5, 1, 1.5, 2]) assert.equal(riskIsHigh(p), false, String(p));
  for (const p of [2.01, 3, 20, 200]) assert.equal(riskIsHigh(p), true, String(p));
  for (const p of [NaN, Infinity, null, undefined]) assert.equal(riskIsHigh(p as number), false);
  // مبلغ مكتوب مالاً يساوي 2% بالضبط لا يحذّر (لا فتات فاصلة عائمة)
  for (const [bal, amt] of [[1765, '35.30'], [1500, '30'], [10_000, '200'], [3430, '68.60']] as const) {
    const r = parseRiskInput(`$${amt}`, bal, 'USD')!;
    assert.equal(riskIsHigh(r.pct), false, `${bal}/${amt} ⇒ ${r.pct}`);
  }
  assert.equal(riskIsHigh(parseRiskInput('$201', 10_000, 'USD')!.pct), true);
}
console.log('positionSize riskIsHigh selftest OK');

// quoteSpreadPips: سبريد التسعيرة الحيّة بالـpip — رأس الطرفية = لوح العمق (صفّ QA10)
{
  assert.equal(quoteSpreadPips('EURUSD', 1.08501, 1.0851), 0.9); // «0.00009» سابقاً
  assert.equal(quoteSpreadPips('EUR/USD', 1.085, 1.0852), 2);
  assert.equal(quoteSpreadPips('USDJPY', 151.234, 151.249), 1.5); // pip الين 0.01
  assert.equal(quoteSpreadPips('XAUUSD', 2400.1, 2400.45), 3.5); // pip الذهب 0.1
  assert.equal(quoteSpreadPips('XAGUSD', 30.01, 30.035), 2.5); // pip الفضة 0.01
  assert.equal(quoteSpreadPips('GBPJPY', 190.5, 190.5), 0); // سبريد صفر قيمة صادقة
  // لا سبريد سالب ولا من تسعيرة ناقصة أو غير موجبة
  assert.equal(quoteSpreadPips('EURUSD', 1.0852, 1.085), null);
  assert.equal(quoteSpreadPips('EURUSD', null, 1.085), null);
  assert.equal(quoteSpreadPips('EURUSD', 1.085, undefined), null);
  assert.equal(quoteSpreadPips('EURUSD', 0, 1.085), null);
  assert.equal(quoteSpreadPips('EURUSD', NaN, 1.085), null);
  // رمزٌ بلا مواصفات ⇒ null فيعرض المستدعي الفرق سعراً
  assert.equal(quoteSpreadPips('BTCUSD', 60000, 60010), null);
  assert.equal(quoteSpreadPips('US30', 39000, 39002), null);
}
console.log('positionSize quoteSpreadPips selftest OK');

// ---- مخاطرةٌ محفوظة مالاً تعود بوضعٍ آخر: عملتها ورصيدها لتُقلب نسبةً لا «رقم غير مفهوم» ----
{
  // «USC 1000» من EURUSDc (رصيد سنت 100,000) واللوحة تفتح على EURUSD بحساب دولار: الدولار يرفضها
  assert.equal(parseRiskInput('USC 1000', 10000, 'USD'), null);
  const usc = savedRiskMoney({ riskPct: 'USC 1000', riskCcy: 'USC', balance: '10000', centBalance: '100000', account: 'USD' });
  assert.deepEqual(usc, { ccy: 'USC', balance: 100000 });
  // ما يفعله مؤثّر تبدّل العملة بها: 1% — وبرصيد الدولار 10,000 وقف 20 pip EURUSD = 0.50 lot
  assert.equal(toggleRiskUnit('USC 1000', usc!.balance, usc!.ccy), '1');
  // نسخة قديمة بلا riskCcy: تُجرَّب بالسنت ثم بعملة الحساب
  assert.deepEqual(savedRiskMoney({ riskPct: 'USC 1000', centBalance: '100000', account: 'USD' }), { ccy: 'USC', balance: 100000 });
  assert.deepEqual(savedRiskMoney({ riskPct: 'EUR 50', balance: '5000', account: 'EUR' }), { ccy: 'EUR', balance: 5000 });
  assert.deepEqual(savedRiskMoney({ riskPct: '$50', balance: '5000', account: 'USD' }), { ccy: 'USD', balance: 5000 });
  // riskCcy حُفظ قبل القلب (بلا رصيد) بعملة الوضع الجديد: لا يضيع
  assert.deepEqual(savedRiskMoney({ riskPct: 'USC 1000', riskCcy: 'USD', centBalance: '', account: 'USD' })!.ccy, 'USC');
  // «USD 50» من حساب عادي واللوحة تفتح على رمز سنت ⇒ عملتها USD ورصيدها العادي
  const usd = savedRiskMoney({ riskPct: 'USD 50', riskCcy: 'USD', balance: '5000', centBalance: '100000', account: 'USD' });
  assert.deepEqual(usd, { ccy: 'USD', balance: 5000 });
  assert.equal(toggleRiskUnit('USD 50', usd!.balance, usd!.ccy), '1');
  // نسبة (معناها واحد بكل وضع)، فارغة، غير مفهومة، عملة غريبة، أو ليست نصاً ⇒ null (لا قلب)
  for (const riskPct of ['1', '0.5%', '', 'abc', 'GBP 50', 5]) {
    assert.equal(savedRiskMoney({ riskPct, riskCcy: 'USD', balance: '10000', account: 'USD' }), null, String(riskPct));
  }
  // حسابٌ محفوظ غير معروف ⇒ الدولار
  assert.deepEqual(savedRiskMoney({ riskPct: 'USD 50', account: 'XXX', balance: '1000' }), { ccy: 'USD', balance: 1000 });
}
console.log('positionSize savedRiskMoney selftest OK');

// تجديد سعر التحويل وحده يغيّر اللوت — لذا «سُجِّلت» بالحاسبة تُمسح حين يتغيّر اللوت (مؤثّر `setLogMsg` يراقب `lots`)
{
  const jpy = instrumentSpec('USDJPY')!;
  const at = (usdjpy: number) =>
    positionSize({
      balance: 10_000,
      riskPct: 1,
      slPips: 20,
      pipValuePerLot: pipValuePerLot(jpy, quoteToAccountRate(conversionPair('JPY', 'USD'), usdjpy)!),
      contractSize: jpy.contractSize,
    })!.lots;
  assert.equal(conversionPair('JPY', 'USD')!.invert, true);
  assert.equal(at(150), 0.75);
  assert.equal(at(149.99), 0.74);
  // تجديدٌ لا يعبر خطوة اللوت لا يغيّره (فلا يُعاد الزرّ ولا تُتاح نقرة مكرّرة)
  assert.equal(at(150.5), 0.75);
}
console.log('positionSize conversion refresh lots selftest OK');

// ---- liveEntryFillAllowed: السعر الحيّ لا يُكتب فوق دخولٍ كُتب باليد أثناء الطلب ----
{
  // خانة فارغة أو بالرقم نفسه لحظة الوصول ⇒ يُكتب
  assert.equal(liveEntryFillAllowed('', ''), true);
  assert.equal(liveEntryFillAllowed('1.0850', '1.0850'), true);
  assert.equal(liveEntryFillAllowed('1.0850', ' 1.0850 '), true);
  // كُتب 1.0850 أثناء الطلب ⇒ Ask 1.0863 لا يستبدله (وقف 1.0830: 20 pip تبقى 20، لا 33 ⇒ لوتٌ أصغر بصمت)
  assert.equal(liveEntryFillAllowed('', '1.0850'), false);
  assert.equal(liveEntryFillAllowed('1.0850', '1.085'), false);
  assert.equal(liveEntryFillAllowed('1.0850', ''), false);
  assert.equal(slPipsFromPrices(instrumentSpec('EURUSD')!, 1.085, 1.083), 20);
}
console.log('positionSize liveEntryFillAllowed selftest OK');

// ---- convStaleMinutes: سعر تحويل لم يتجدّد يُوسَم بعمره ----
{
  const t0 = 1_700_000_000_000;
  // حديث أو تجديد واحد فاشل ⇒ بلا تحذير
  assert.equal(convStaleMinutes(t0, t0), null);
  assert.equal(convStaleMinutes(t0, t0 + 60_000), null);
  assert.equal(convStaleMinutes(t0, t0 + CONV_STALE_AFTER_MS - 1), null);
  // خمس دقائق بالضبط ⇒ «5»؛ 5:59 ⇒ «5» لا «6»؛ ساعتان ⇒ 120
  assert.equal(convStaleMinutes(t0, t0 + CONV_STALE_AFTER_MS), 5);
  assert.equal(convStaleMinutes(t0, t0 + 5 * 60_000 + 59_000), 5);
  assert.equal(convStaleMinutes(t0, t0 + 2 * 3_600_000), 120);
  // ساعة الجهاز عادت للخلف أو وقت غير صالح ⇒ لا رقم سالب ولا مختلَق
  assert.equal(convStaleMinutes(t0, t0 - 10 * 60_000), null);
  assert.equal(convStaleMinutes(NaN, t0), null);
  assert.equal(convStaleMinutes(t0, NaN), null);
}
{
  // نقاط الوقف «1.500» مبهمة (1,500 أوروبية) ⇒ تُرفض كـ«1,500»؛ كانت 1.5 ⇒ ذهب 6.66 لوت بدل 0.06
  assert.equal(parseSlPips('1.500'), null);
  assert.equal(parseSlPips('1,500'), null);
  assert.equal(parseSlPips('25.000'), null);
  assert.equal(parseSlPips('1500'), 1500);
  assert.equal(parseSlPips('1.5'), 1.5);
  assert.equal(parseSlPips('24.6'), 24.6);
  assert.equal(parseSlPips('0.500'), 0.5);
  assert.equal(parseSlPips('٢٠'), 20);
  assert.equal(parseSlPips(''), null);
  assert.equal(parseSlPips('1.2.3'), null);
  // الحجم من 1500 pip ذهب: 100$ ÷ (1500 × 10$) = 0.0066 ⇒ تحت أدنى لوت، لا 6.66
  const gold = specForSl('XAUUSD')!;
  const r = sizeForSl({ balance: 10_000, riskPct: 1, slPips: parseSlPips('1500')!, pipValuePerLot: pvForSl(gold, 1), contractSize: gold.contractSize })!;
  assert.equal(r.lots, 0);
  assert.equal(r.belowMinLot, true);
}
{
  // القراءتان لرسالة riskCalcSlPipsAmbiguous
  assert.deepEqual(ambiguousSlPips('1.500'), { value: '1.500', whole: '1500', small: '1.5' });
  assert.deepEqual(ambiguousSlPips(' 1,500 '), { value: '1,500', whole: '1500', small: '1.5' });
  assert.deepEqual(ambiguousSlPips('25.000'), { value: '25.000', whole: '25000', small: '25' });
  assert.deepEqual(ambiguousSlPips('١٫٢٥٠'), { value: '١٫٢٥٠', whole: '1250', small: '1.25' });
  // مقبولة أو مرفوضة لسبب آخر ⇒ null
  for (const v of ['1500', '1.5', '0.500', '24.6', '', '1.2.3', '1.5000', 'abc']) assert.equal(ambiguousSlPips(v), null, v);
  // كل ما تقول إنه مبهم ترفضه parseSlPips فعلاً
  for (const v of ['1.500', '1,500', '25.000', '١٫٢٥٠']) assert.equal(parseSlPips(v), null, v);
}
console.log('positionSize parseSlPips selftest OK');

{
  // مركز micro صغير: 0.04 لوت × 0.10$ = 0.004$ للنقطة — كان «0.00 USD» تحت مخاطرة 0.20
  assert.equal(formatPipValue(0.004, 'USD'), '0.004 USD');
  assert.equal(formatPipValue(0.004 * 50, 'USD'), '0.20 USD');
  // حساب ين: 1.5 ين للنقطة كان «2 JPY» (× 20 = 40 بجانب مخاطرة 30)
  assert.equal(formatPipValue(1.5, 'JPY'), '1.5 JPY');
  // ≥ 10 وحدات عرض ⇒ كـformatMoney حرفياً
  assert.equal(formatPipValue(3.5, 'USD'), '3.50 USD');
  assert.equal(formatPipValue(0.1, 'USD'), '0.10 USD');
  assert.equal(formatPipValue(1234.5, 'USD'), '1,234.50 USD');
  assert.equal(formatPipValue(1572.4, 'JPY'), '1,572 JPY');
  assert.equal(formatPipValue(0.35, 'USD'), '0.35 USD');
  assert.equal(formatPipValue(0.099, 'USD'), '0.099 USD');
  assert.equal(formatPipValue(9.99, 'JPY'), '10 JPY');
  // لا يُطبع صفر لقيمة موجبة ضمن 4 منازل إضافية
  assert.equal(formatPipValue(0.0000123, 'USD'), '0.000012 USD');
  assert.equal(formatPipValue(NaN, 'USD'), '—');
}
console.log('positionSize formatPipValue selftest OK');

// سعر التحويل عند الخروج حين الأساس = عملة الحساب: الخسارة الحقيقية عند الوقف لا تتجاوز المخاطرة المختارة
{
  const uj = instrumentSpec('USDJPY')!;
  const live = 1 / 150; // USDJPY بحساب دولار: التحويل 1 ÷ الحيّ
  // أمر معلّق: دخول 140، وقف 138.50 (150 pip)، السوق 150
  const r = exitQuoteToAccount(uj, 'USD', 138.5, live)!;
  assert.equal(r, 1 / 138.5);
  const res = positionSize({ balance: 10000, riskPct: 1, slPips: 150, pipValuePerLot: pipValuePerLot(uj, r), contractSize: uj.contractSize })!;
  const realLossUsd = (res.lots * uj.contractSize * (140 - 138.5)) / 138.5;
  assert.ok(realLossUsd <= 100 + 1e-9, `loss ${realLossUsd}`);
  assert.equal(res.lots, 0.09); // بالحيّ كان 0.10 = 108.30 USD
  // بالسعر الحيّ القديم: 0.10 لوت يخسر 108.30 عند الوقف — هذا ما أُصلح
  const old = positionSize({ balance: 10000, riskPct: 1, slPips: 150, pipValuePerLot: pipValuePerLot(uj, live), contractSize: uj.contractSize })!;
  assert.equal(old.lots, 0.1);
  assert.ok((old.lots * uj.contractSize * 1.5) / 138.5 > 108);
  // أمر سوق: وقف 148.50 والسوق 150
  assert.equal(exitQuoteToAccount(uj, 'USD', 148.5, live), 1 / 148.5);
  // حساب إسترليني GBPUSD: دخول 1.20، وقف 1.19، السوق 1.30 ⇒ 1.30/1.19 = 1.092 ضمن الحارس
  const gu = instrumentSpec('GBPUSD')!;
  const gr = exitQuoteToAccount(gu, 'GBP', 1.19, 1 / 1.3)!;
  const g = positionSize({ balance: 10000, riskPct: 1, slPips: 100, pipValuePerLot: pipValuePerLot(gu, gr), contractSize: gu.contractSize })!;
  assert.ok((g.lots * gu.contractSize * 0.01) / 1.19 <= 100 + 1e-9);
  // تقاطع EURGBP بحساب يورو
  assert.equal(exitQuoteToAccount(instrumentSpec('EURGBP')!, 'EUR', 0.84, 1 / 0.85), 1 / 0.84);
  // الأساس ليس عملة الحساب ⇒ null (الحيّ): EURUSD بحساب دولار، EURJPY بحساب دولار، الذهب
  assert.equal(exitQuoteToAccount(instrumentSpec('EURUSD')!, 'USD', 1.08, 1), null);
  assert.equal(exitQuoteToAccount(instrumentSpec('EURJPY')!, 'USD', 160, 1 / 150), null);
  assert.equal(exitQuoteToAccount(instrumentSpec('XAUUSD')!, 'USD', 2400, 1), null);
  // حارس خطأ الكتابة: «1500» بدل «150.0» (قيمة نقطة ÷ 10 ⇒ لوت ×10) ⇒ null ويبقى الحيّ
  assert.equal(exitQuoteToAccount(uj, 'USD', 1500, live), null);
  assert.equal(exitQuoteToAccount(uj, 'USD', 15, live), null);
  // حدود الحارس (نسبة 0.8..1.25 من الحيّ): 121 و187 مقبولان، 119 و188 لا
  assert.equal(exitQuoteToAccount(uj, 'USD', 187, live), 1 / 187);
  assert.equal(exitQuoteToAccount(uj, 'USD', 188, live), null);
  assert.equal(exitQuoteToAccount(uj, 'USD', 121, live), 1 / 121);
  assert.equal(exitQuoteToAccount(uj, 'USD', 119, live), null);
  // forLoss (الوقف): خارج النطاق ⇒ الأغلى من الاثنين لا null. رصيد 1,000,000 و1%، دخول 150:
  // وقف 119 الحقيقي كان يُحسب بالحيّ ⇒ 0.48 لوت = خسارة 12,504 USD (+25%) وأكبر من وقف 121 الأقرب (0.41)
  assert.equal(exitQuoteToAccount(uj, 'USD', 119, live, true), 1 / 119);
  assert.equal(exitQuoteToAccount(uj, 'USD', 15, live, true), 1 / 15); // «15» بدل «150» ⇒ لوت أصغر لا أكبر
  assert.equal(exitQuoteToAccount(uj, 'USD', 1500, live, true), live); // «1500» ⇒ الحيّ كما كان
  assert.equal(exitQuoteToAccount(uj, 'USD', 188, live, true), live);
  assert.equal(exitQuoteToAccount(uj, 'USD', 138.5, live, true), 1 / 138.5); // داخل النطاق: لا فرق
  assert.equal(exitQuoteToAccount(uj, 'USD', NaN, live, true), null);
  assert.equal(exitQuoteToAccount(instrumentSpec('EURUSD')!, 'USD', 0.5, 1, true), null);
  for (const stop of [125, 121, 119, 110, 100]) {
    const sl = (150 - stop) * 100;
    const q = exitQuoteToAccount(uj, 'USD', stop, live, true)!;
    const z = positionSize({ balance: 1_000_000, riskPct: 1, slPips: sl, pipValuePerLot: pipValuePerLot(uj, q), contractSize: uj.contractSize })!;
    const loss = (z.lots * uj.contractSize * (150 - stop)) / stop;
    assert.ok(loss <= 10_000 + 1e-6, `stop ${stop}: loss ${loss}`);
  }
  // مدخل غير صالح / بلا سعر حيّ
  assert.equal(exitQuoteToAccount(uj, 'USD', NaN, live), null);
  assert.equal(exitQuoteToAccount(uj, 'USD', 0, live), null);
  assert.equal(exitQuoteToAccount(uj, 'USD', 138.5, null), null);
  assert.equal(exitQuoteToAccount(null, 'USD', 138.5, live), null);
  // الربح عند الهدف بسعر الهدف: شراء 140 → 143، 0.09 لوت = 27,000 JPY ÷ 143
  const p = profitAtTarget({ spec: uj, entry: 140, target: 143, lots: 0.09, quoteToAccount: exitQuoteToAccount(uj, 'USD', 143, live)! })!;
  assert.ok(Math.abs(p - 27000 / 143) < 1e-9);
}
console.log('positionSize exitQuoteToAccount selftest OK');

// سطر «قيمة النقطة» للّوت الواحد (الحاسبة) بـformatPipValue: USDJPYmicro بحساب دولار 0.0667 كان «0.07 USD» (+5%)
{
  const uj = smallContractSpec('USDJPYmicro')!.spec;
  const pv = pipValuePerLot(uj, 1 / 150);
  assert.ok(Math.abs(pv - 1000 * 0.01 / 150) < 1e-12);
  assert.equal(formatPipValue(pv, 'USD'), '0.067 USD');
  assert.equal(formatPipValue(pipValuePerLot(smallContractSpec('USDCADmicro')!.spec, 1 / 1.36), 'USD'), '0.074 USD');
}
console.log('positionSize per-lot micro pip value selftest OK');

// بلا سعر وقف (النقاط وحدها): أسوأ خروج تحت الدخول/الحيّ ⇒ الخسارة عند الوقف ≤ المخاطرة لأي اتجاه
{
  const uj = instrumentSpec('USDJPY')!;
  const live = 1 / 150;
  // لا دخول مكتوب: من الحيّ 150 − 150 pip = 148.50
  assert.equal(pipsOnlyExitQuoteToAccount(uj, 'USD', 150, NaN, live), 1 / 148.5);
  // دخول مكتوب 140 (أمر معلّق) ⇒ 138.50
  assert.equal(pipsOnlyExitQuoteToAccount(uj, 'USD', 150, 140, live), 1 / 138.5);
  // رصيد 1,000,000 ومخاطرة 1% (لوت كبير كي لا يخفي التقريب الفرق)
  const size = (rate: number) =>
    positionSize({ balance: 1_000_000, riskPct: 1, slPips: 150, pipValuePerLot: pipValuePerLot(uj, rate), contractSize: uj.contractSize })!;
  const r = size(pipsOnlyExitQuoteToAccount(uj, 'USD', 150, NaN, live)!);
  const buyLoss = (r.lots * uj.contractSize * 1.5) / 148.5; // شراء يخرج عند 148.50
  const sellLoss = (r.lots * uj.contractSize * 1.5) / 151.5; // بيع يخرج عند 151.50
  assert.ok(buyLoss <= 10_000 + 1e-6, `buy ${buyLoss}`);
  assert.ok(sellLoss <= 10_000 + 1e-6, `sell ${sellLoss}`);
  // بالحيّ القديم: الشراء يتجاوز المخاطرة (10.00 لوت ⇒ 10,101 USD)
  const old = size(live);
  assert.equal(old.lots, 10);
  assert.ok((old.lots * uj.contractSize * 1.5) / 148.5 > 10_100);
  assert.equal(r.lots, 9.9);
  // الأساس ليس عملة الحساب ⇒ null (يبقى الحيّ)
  assert.equal(pipsOnlyExitQuoteToAccount(instrumentSpec('EURUSD')!, 'USD', 50, NaN, 1), null);
  assert.equal(pipsOnlyExitQuoteToAccount(instrumentSpec('EURJPY')!, 'USD', 50, NaN, 1 / 150), null);
  // GBPUSD بحساب إسترليني: 1.2500 − 100 pip = 1.2400
  const gr = pipsOnlyExitQuoteToAccount(instrumentSpec('GBPUSD')!, 'GBP', 100, NaN, 1 / 1.25)!;
  assert.ok(Math.abs(gr - 1 / 1.24) < 1e-12);
  // نقاط غير صالحة / بلا سعر حيّ ⇒ null
  assert.equal(pipsOnlyExitQuoteToAccount(uj, 'USD', 0, NaN, live), null);
  assert.equal(pipsOnlyExitQuoteToAccount(uj, 'USD', NaN, NaN, live), null);
  assert.equal(pipsOnlyExitQuoteToAccount(uj, 'USD', 150, NaN, null), null);
  // وقف يبعد > 20% (5000 pip = 50 ين ⇒ خروج 100): سعر الخروج الأغلى (لوت أصغر، كان null ⇒ الحيّ ⇒ خسارة +50%)؛ خروج ≤ 0 ⇒ null
  assert.equal(pipsOnlyExitQuoteToAccount(uj, 'USD', 5000, NaN, live), 1 / 100);
  assert.equal(pipsOnlyExitQuoteToAccount(uj, 'USD', 20000, NaN, live), null);
  assert.equal(pipsOnlyExitQuoteToAccount(null, 'USD', 150, NaN, live), null);
}
console.log('positionSize pipsOnlyExitQuoteToAccount selftest OK');

{
  // الفضة بالبيزو/الراند قرب الألف: «1.050» = 1,050 لا 1.05 (وقف «1.030» كان 2 pip ⇒ لوت ×1000)
  assert.deepEqual(ambiguousThousandsPrice('1.050', 'XAGMXN'), { value: '1.050', whole: '1050', small: '1.05' });
  assert.equal(parsePriceFor('1.050', 'XAGMXN'), null);
  assert.equal(parsePriceFor('1.030', 'XAGZAR'), null);
  assert.equal(parsePriceFor('1.030', 'XAGZAR.m'), null);
  assert.equal(parsePriceFor('4.120', 'XAGSEK'), null);
  assert.equal(parsePriceFor('2.500', 'XAGCNH'), null);
  // أسعار حقيقية بثلاث منازل تبقى مقبولة
  assert.equal(parsePriceFor('950.250', 'XAGMXN'), 950.25);
  assert.equal(parsePriceFor('98.500', 'XAGZAR'), 98.5);
  assert.equal(parsePriceFor('1050', 'XAGMXN'), 1050);
  assert.equal(parsePriceFor('1,050.125', 'XAGMXN'), 1050.125);
  assert.equal(parsePriceFor('1.05', 'XAGMXN'), 1.05); // منزلتان — ليس نمط الآلاف
  // الفضة بالدولار/اليورو/الإسترليني/الأسترالي بلا تغيير (فوق العشرة ودون الألف)
  assert.equal(parsePriceFor('31.450', 'XAGUSD'), 31.45);
  assert.equal(parsePriceFor('9.450', 'XAGUSD'), 9.45);
  assert.equal(parsePriceFor('5.450', 'XAGEUR'), 5.45);
  assert.equal(parsePriceFor('5.450', 'XAGAUD'), 5.45);
  // الين/الليرة كما كانا (كل «NNN.NNN» مبهم)
  assert.equal(parsePriceFor('950.250', 'XAGJPY'), null);
}
console.log('positionSize silver MXN/ZAR thousands selftest OK');

// ---- المخاطرة باسم العملة بالعربية/الكردية: «50 دولار» كانت «رقم غير مفهوم» ----
{
  const risk = (raw: string, acc = 'USD', bal = 10000) => parseRiskInput(raw, bal, acc);
  assert.deepEqual(risk('50 دولار'), { pct: 0.5, amount: 50 });
  assert.deepEqual(risk('٥٠ دولار'), { pct: 0.5, amount: 50 });
  assert.deepEqual(risk('٥٠دولار'), { pct: 0.5, amount: 50 });
  assert.deepEqual(risk('دولار 50'), { pct: 0.5, amount: 50 });
  assert.deepEqual(risk('50 دولارات'), { pct: 0.5, amount: 50 });
  assert.deepEqual(risk('50 دولاراً'), { pct: 0.5, amount: 50 });
  assert.deepEqual(risk('50 دۆلار'), { pct: 0.5, amount: 50 });
  assert.deepEqual(risk('50 دولار أمريكي'), { pct: 0.5, amount: 50 });
  assert.deepEqual(risk('40 يورو', 'EUR'), { pct: 0.4, amount: 40 });
  assert.deepEqual(risk('40 یۆرۆ', 'EUR'), { pct: 0.4, amount: 40 });
  assert.deepEqual(risk('30 جنيه', 'GBP'), { pct: 0.3, amount: 30 });
  assert.deepEqual(risk('30 جنيه إسترليني', 'GBP'), { pct: 0.3, amount: 30 });
  assert.deepEqual(risk('5000 ين', 'JPY', 1_000_000), { pct: 0.5, amount: 5000 });
  assert.deepEqual(risk('20 فرنك', 'CHF'), { pct: 0.2, amount: 20 });
  assert.deepEqual(risk('1000 سنت', 'USC', 100000), { pct: 1, amount: 1000 });
  // «دولار» وحدها كـ«$»: الأسترالي والكندي والنيوزيلندي أيضاً؛ وبصفتها لعملتها فقط
  assert.deepEqual(risk('50 دولار', 'AUD'), { pct: 0.5, amount: 50 });
  assert.deepEqual(risk('50 دولار أسترالي', 'AUD'), { pct: 0.5, amount: 50 });
  assert.equal(risk('50 دولار أسترالي', 'USD'), null);
  assert.equal(risk('50 دولار أمريكي', 'CAD'), null);
  // عملةٌ غير عملة الحساب مرفوضة كما «€40» بحساب دولار
  assert.equal(risk('40 يورو', 'USD'), null);
  assert.equal(risk('50 دولار', 'EUR'), null);
  assert.equal(risk('5000 ين', 'USD'), null);
  // علامتان، أو كلمة داخل كلمة، أو اسمٌ مجهول: مرفوضة
  assert.equal(risk('$50 دولار'), null);
  assert.equal(risk('50 دولار USD'), null);
  assert.equal(risk('50 دينار'), null);
  assert.equal(risk('50 عين'), null);
  assert.equal(risk('دولار'), null);
  // المبهم يبقى مبهماً (قاعدة `amount`)، والنسبة بلا اسم كما كانت
  assert.equal(risk('1.000 دولار'), null);
  assert.deepEqual(risk('1'), { pct: 1, amount: null });
  // القلب بين النسبة والمبلغ يعمل من المكتوب بالعربية
  assert.equal(toggleRiskUnit('50 دولار', 10000, 'USD'), '0.5');
  assert.deepEqual(riskOverBalance('20000 دولار', 10000, 'USD'), { risk: 20000, balance: 10000 });
}
console.log('positionSize arabic money words risk selftest OK');

// «25 pips» منسوخة من توصية بخانة الوقف/السبريد — تُقرأ؛ «250 points» (عُشر pip بـMT) تبقى مرفوضة
{
  assert.equal(parseSlPips('25 pips'), 25);
  assert.equal(parseSlPips('٢٥ بيب'), 25);
  assert.equal(parseSlPips('250 points'), null);
  assert.equal(parseSlPips('1.500 pips'), null); // مبهمة كـ«1.500»
  assert.deepEqual(ambiguousSlPips('1.500 pips'), { value: '1.500 pips', whole: '1500', small: '1.5' });
  assert.equal(parseSpreadPips('1.2 pips'), 1.2);
  assert.equal(parseSpreadPips('0,8 pip'), 0.8);
  assert.equal(parseSpreadPips('12 points'), null);
  assert.equal(spreadTooWide('10851 pips'), 10851);
  assert.equal(spreadTooWide('1.2 pips'), null);
  // الحجم من الوقف المكتوب بوحدته = الحجم من الرقم وحده
  const spec = instrumentSpec('EURUSD')!;
  const a = positionSize({ balance: 10000, riskPct: 1, slPips: parseSlPips('25 pips')!, pipValuePerLot: pipValuePerLot(spec, 1), contractSize: spec.contractSize });
  assert.equal(a?.lots, 0.4);
}
console.log('positionSize pip unit word selftest OK');

// العمولة بعلامة عملة الخانة («$7 per lot» من جدول الوسيط) — تُقبل لعملة الخانة وحدها، والنتيجة = الرقم وحده
{
  assert.equal(parseCommission('$7', 'USD'), 7);
  assert.equal(parseCommission('7 USD', 'USD'), 7);
  assert.equal(parseCommission('7$', 'CAD'), 7);
  assert.equal(parseCommission('٧ دولار', 'USD'), 7);
  assert.equal(parseCommission('€6', 'EUR'), 6);
  assert.equal(parseCommission('7 USC', 'USC'), 7);
  assert.equal(parseCommission('7 سنت', 'USC'), 7);
  // عملة أخرى أو علامتان أو بلا عملة الخانة ⇒ مرفوضة كما كانت
  assert.equal(parseCommission('€7', 'USD'), null);
  assert.equal(parseCommission('$7', 'USC'), null); // سبعة دولارات بحساب سنت = 700؟ لا تخمين
  assert.equal(parseCommission('$7 USD', 'USD'), null);
  assert.equal(parseCommission('$7'), null);
  assert.equal(parseCommission('$-7', 'USD'), null);
  assert.equal(parseCommission('$7.000', 'USD'), null); // مبهمة كـ«7.000»
  assert.equal(parseCommission('7', 'USD'), 7);
  assert.equal(parseCommission('', 'USD'), 0);
  // المخاطرة شاملة التكاليف من «$7» = من «7»
  const base = { lots: 0.4, slPips: 25, spreadPips: 1, pipValuePerLot: 10, balance: 10000, riskPct: 1, contractSize: 100000 };
  assert.deepEqual(
    spreadRisk({ ...base, commissionPerLot: parseCommission('$7', 'USD')! }),
    spreadRisk({ ...base, commissionPerLot: parseCommission('7', 'USD')! })
  );
  // تبدّل الوضع: العلامة تسقط، والرقم يتحوّل كالعادي
  const std = { kind: 'std', account: 'USD' } as const;
  assert.equal(commissionAcrossModes('$7', std, { kind: 'micro', account: 'USD' }), '0.07');
  assert.equal(commissionAcrossModes('$7', std, { kind: 'cent', account: 'USD' }), '7');
  assert.equal(commissionAcrossModes('7', std, { kind: 'cent', account: 'USD' }), '7');
  assert.equal(commissionAcrossModes('7 USC', { kind: 'cent', account: 'USD' }, std), '7');
  assert.equal(commissionAcrossModes('$7', std, { kind: 'std', account: 'EUR' }), '');
  assert.equal(commissionAcrossModes('€7', std, { kind: 'micro', account: 'USD' }), '€7'); // مرفوضة أصلاً: كما هي
  assert.deepEqual(commissionNoteExample('$5', 'micro', 'USD'), commissionNoteExample('5', 'micro', 'USD'));
  // المخاطرة بالمال بعد إعادة البناء: كما كانت
  assert.deepEqual(parseRiskInput('$50', 10000, 'USD'), { pct: 0.5, amount: 50 });
  assert.equal(parseRiskInput('€50', 10000, 'USD'), null);
}
console.log('positionSize commission currency mark selftest OK');

// moneyInOtherCurrency (launch84): «€40» بحساب دولار مرفوضة **لسبب العملة** لا لأنها غير مفهومة
{
  assert.equal(parseRiskInput('€40', 10000, 'USD'), null);
  assert.equal(moneyInOtherCurrency('€40', 'USD'), true);
  assert.equal(moneyInOtherCurrency('40 يورو', 'USD'), true);
  assert.equal(moneyInOtherCurrency('40 EUR', 'USD'), true);
  assert.equal(moneyInOtherCurrency('$40', 'EUR'), true);
  assert.equal(moneyInOtherCurrency('$7', 'USC'), true);
  assert.equal(moneyInOtherCurrency('1000 سنت', 'USD'), true);
  // عملة الخانة نفسها أو نسبة أو نصّ ليس عملة أو رقم غير صالح ⇒ false (لها رسائلها)
  assert.equal(moneyInOtherCurrency('$40', 'USD'), false);
  assert.equal(moneyInOtherCurrency('$40', 'CAD'), false);
  assert.equal(moneyInOtherCurrency('1', 'USD'), false);
  assert.equal(moneyInOtherCurrency('1%', 'USD'), false);
  assert.equal(moneyInOtherCurrency('abc 40', 'USD'), false);
  assert.equal(moneyInOtherCurrency('pip 40', 'USD'), false);
  assert.equal(moneyInOtherCurrency('€', 'USD'), false);
  assert.equal(moneyInOtherCurrency('€0', 'USD'), false);
  assert.equal(moneyInOtherCurrency('€1.000', 'USD'), false); // مبهمة: رسالتها العامة
  assert.equal(moneyInOtherCurrency('€40 USD', 'USD'), false); // علامتان
  assert.equal(moneyInOtherCurrency('', 'USD'), false);
}
console.log('positionSize moneyInOtherCurrency selftest OK');

// slPipsInPoints (مفتاح launch riskCalcSlPointsHint): «250 points» مرفوضة بخانة الوقف **ومعها** الرقم بالـpip (÷10)
{
  assert.deepEqual(slPipsInPoints('250 points'), { value: '250 points', pips: '25' });
  assert.deepEqual(slPipsInPoints(' 250 pts '), { value: '250 pts', pips: '25' });
  assert.deepEqual(slPipsInPoints('250 Point'), { value: '250 Point', pips: '25' });
  assert.deepEqual(slPipsInPoints('٢٥٠ نقطة'), { value: '٢٥٠ نقطة', pips: '25' });
  assert.deepEqual(slPipsInPoints('250 نقاط'), { value: '250 نقاط', pips: '25' });
  assert.deepEqual(slPipsInPoints('250 خاڵ'), { value: '250 خاڵ', pips: '25' });
  assert.deepEqual(slPipsInPoints('255 points'), { value: '255 points', pips: '25.5' });
  assert.deepEqual(slPipsInPoints('7 pts'), { value: '7 pts', pips: '0.7' }); // لا 0.7000000001
  assert.deepEqual(slPipsInPoints('1,500 points'), null); // مبهمة كالرقم وحده
  // الخانة نفسها ما زالت ترفضها: تلميح لا تحويل (بعض الوسطاء يسمّون الـpip «نقطة»)
  assert.equal(parseSlPips('250 points'), null);
  assert.equal(parseSlPips('250 نقاط'), null);
  // بلا كلمة نقاط، أو رقم غير صالح ⇒ null (لها رسائلها)
  assert.equal(slPipsInPoints('250'), null);
  assert.equal(slPipsInPoints('25 pips'), null);
  assert.equal(slPipsInPoints('points'), null);
  assert.equal(slPipsInPoints('0 points'), null);
  assert.equal(slPipsInPoints('abc points'), null);
  assert.equal(slPipsInPoints('1.500 points'), null);
  assert.equal(slPipsInPoints(''), null);
}
console.log('positionSize slPipsInPoints selftest OK');
