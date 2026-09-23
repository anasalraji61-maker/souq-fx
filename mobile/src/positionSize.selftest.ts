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
  priceAtPipOffset,
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
