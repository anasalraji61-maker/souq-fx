/**
 * Self-test for positionSize (pure).
 * Run: npx --yes tsx src/positionSize.selftest.ts
 */
import assert from 'node:assert/strict';
import {
  instrumentSpec,
  conversionPair,
  reversedConversion,
  quoteToAccountRate,
  pipValuePerLot,
  positionSize,
  slPipsFromPrices,
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

console.log('positionSize selftest: OK');
