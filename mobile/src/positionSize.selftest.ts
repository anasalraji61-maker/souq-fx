/**
 * Self-test for positionSize (pure).
 * Run: npx --yes tsx src/positionSize.selftest.ts
 */
import assert from 'node:assert/strict';
import {
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
  priceAtPipOffset,
  riskForLots,
  riskInQuoteCcy,
  formatRiskPct,
  formatMoney,
  moneyDecimals,
  LOT_STEP,
  type InstrumentSpec,
} from './positionSize';

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
