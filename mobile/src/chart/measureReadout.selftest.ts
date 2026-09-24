/** فحص ذاتي لـ`measureReadout.ts` — يُشغَّل بـNode بلا شجرة مكوّنات. */
import { measurePipsText, measureReadoutText, type MeasureStats } from './measureReadout';

let failures = 0;
function ok(name: string, cond: boolean) {
  if (!cond) {
    failures += 1;
    console.error('FAIL', name);
  }
}

// ── النقاط بحجم pip الأداة ─────────────────────────────────────────────────
// يورو: pip = 0.0001 ⇒ 0.00240 = 24 نقطة.
ok('EURUSD صعوداً', measurePipsText('EURUSD', 1.08000, 1.08240) === '+24.0 pip');
ok('EURUSD هبوطاً', measurePipsText('EURUSD', 1.08240, 1.08000) === '−24.0 pip');
// الين: pip = 0.01 ⇒ 0.50 = 50 نقطة. وبحجم pip عام (0.0001) كانت ستخرج 5000.
ok('USDJPY بحجم pip الين', measurePipsText('USDJPY', 157.000, 157.500) === '+50.0 pip');
ok('USDJPY لا تخرج 5000', measurePipsText('USDJPY', 157.0, 157.5) !== '+5000.0 pip');
// الذهب: pip = 0.1 ⇒ 12.5 = 125 نقطة.
ok('XAUUSD بحجم pip الذهب', measurePipsText('XAUUSD', 2650.0, 2662.5) === '+125.0 pip');
// الفضة: pip = 0.01.
ok('XAGUSD بحجم pip الفضة', measurePipsText('XAGUSD', 31.00, 31.25) === '+25.0 pip');
// النقطة الكسرية (pipette) تظهر: 2.4 نقطة لا 2.
ok('عُشر النقطة يظهر', measurePipsText('EURUSD', 1.08000, 1.08024) === '+2.4 pip');
// صفر: قياس صادق بلا إشارة.
ok('طرفان على السعر نفسه ⇒ بلا إشارة', measurePipsText('EURUSD', 1.085, 1.085) === '0.0 pip');
// أداة خارج مواصفات الفوركس ⇒ null (لا pip مختلَق).
ok('DXY ⇒ null', measurePipsText('DXY', 100, 101) === null);
ok('BTCUSD ⇒ null', measurePipsText('BTCUSD', 60000, 61000) === null);
ok('رمز فارغ ⇒ null', measurePipsText('', 1, 2) === null);
// سعر غير صالح ⇒ null لا NaN.
ok('سعر صفري ⇒ null', measurePipsText('EURUSD', 0, 1.085) === null);
ok('سعر NaN ⇒ null', measurePipsText('EURUSD', NaN, 1.085) === null);

// ── السطر كاملاً ───────────────────────────────────────────────────────────
const stats = (bars: number, diff: number, pct: number): MeasureStats => ({ bars, diff, pct });

ok('سطر فوركس كامل',
  measureReadoutText({
    symbol: 'EURUSD', a: { price: 1.08 }, b: { price: 1.0824 },
    stats: stats(12, 0.0024, 0.2222), barsWord: 'شموع',
  }) === '12 شموع · +24.0 pip · +0.22%');

ok('سطر هابط: الإشارتان معاً',
  measureReadoutText({
    symbol: 'EURUSD', a: { price: 1.0824 }, b: { price: 1.08 },
    stats: stats(12, -0.0024, -0.2218), barsWord: 'شموع',
  }) === '12 شموع · −24.0 pip · −0.22%');

// البند الثاني: أداة بلا pip تسقط للفرق السعري — **بمنازل الرمز** لا بحجم الرقم.
const dxy = measureReadoutText({
  symbol: 'DXY', a: { price: 100 }, b: { price: 101.25 },
  stats: stats(8, 1.25, 1.25), barsWord: 'bars',
});
ok('DXY يسقط للفرق السعري', dxy === '8 bars · +1.25000 · +1.25%');

// النسبة كانت تُطبع بلا إشارة: هبوطٌ يُقرأ صعوداً.
ok('النسبة السالبة تحمل إشارتها',
  measureReadoutText({
    symbol: 'EURUSD', a: { price: 1.09 }, b: { price: 1.08 },
    stats: stats(3, -0.01, -0.9174), barsWord: 'b',
  }).includes('−0.92%'));

// pct فاسدة (سعر مرجعي صفر) ⇒ 0.00% لا NaN%، وبلا إشارة.
ok('pct فاسدة ⇒ 0.00%',
  measureReadoutText({
    symbol: 'EURUSD', a: { price: 1.08 }, b: { price: 1.0824 },
    stats: stats(2, 0.0024, NaN), barsWord: 'b',
  }) === '2 b · +24.0 pip · 0.00%');

// حركة دون 0.005%: النسبة تُطبع صفراً فلا تحمل إشارة (كانت «+0.00%»).
ok('نسبة تُقرَّب لصفر بلا إشارة',
  measureReadoutText({
    symbol: 'EURUSD', a: { price: 1.08 }, b: { price: 1.08004 },
    stats: stats(1, 0.00004, 0.0037), barsWord: 'b',
  }) === '1 b · +0.4 pip · 0.00%');
ok('نسبة سالبة تُقرَّب لصفر بلا «−0.00%»',
  measureReadoutText({
    symbol: 'EURUSD', a: { price: 1.08004 }, b: { price: 1.08 },
    stats: stats(1, -0.00004, -0.0037), barsWord: 'b',
  }) === '1 b · −0.4 pip · 0.00%');

// DXY أفقياً: الفرق المطبوع صفر ⇒ بلا إشارة (كان «+0.00000 · +0.00%»).
ok('DXY أفقي بلا إشارة',
  measureReadoutText({
    symbol: 'DXY', a: { price: 101.2 }, b: { price: 101.2 },
    stats: stats(4, 0, 0), barsWord: 'b',
  }) === '4 b · 0.00000 · 0.00%');
// DXY: فرق سالب يُقرَّب لصفر بخمس منازل ⇒ بلا «−».
ok('DXY فرق مجهري سالب بلا إشارة',
  measureReadoutText({
    symbol: 'DXY', a: { price: 101.2 }, b: { price: 101.199999 },
    stats: stats(1, -0.000001, 0), barsWord: 'b',
  }) === '1 b · 0.00000 · 0.00%');

// صفر شموع (قياس داخل شمعة واحدة) قيمة صالحة.
ok('صفر شموع',
  measureReadoutText({
    symbol: 'EURUSD', a: { price: 1.08 }, b: { price: 1.0805 },
    stats: stats(0, 0.0005, 0.046), barsWord: 'شموع',
  }) === '0 شموع · +5.0 pip · +0.05%');

// الكلمة المترجَمة تُمرَّر كما هي (لا مفتاح جديد بهذه الوحدة).
ok('كلمة الشموع تُمرَّر كما هي',
  measureReadoutText({
    symbol: 'EURUSD', a: { price: 1.08 }, b: { price: 1.0824 },
    stats: stats(12, 0.0024, 0.22), barsWord: 'مۆم',
  }).startsWith('12 مۆم · '));

if (failures) {
  console.error(`measureReadout.selftest: ${failures} FAILED`);
  process.exitCode = 1;
} else {
  console.log('measureReadout.selftest: PASS');
}
