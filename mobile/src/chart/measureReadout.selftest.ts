/** فحص ذاتي لـ`measureReadout.ts` — يُشغَّل بـNode بلا شجرة مكوّنات. */
import {
  barsCountText,
  candleRangePipsText,
  measureDurationSec,
  measureDurationText,
  measurePipsText,
  measureReadoutText,
  type MeasureStats,
} from './measureReadout';

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
ok('من 1000 pip بلا منزلة عشرية', measurePipsText('XAUUSD', 4000.0, 2000.0) === '−20000 pip');
ok('999.9 تبقى بمنزلتها', measurePipsText('EURUSD', 1.0, 1.09999) === '+999.9 pip');
ok('مدى شمعة ذهب كبيرة بلا منزلة', candleRangePipsText('XAUUSD', 2750.0, 2600.0) === '↕ 1500 pip');
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
ok('DXY يسقط للفرق السعري بمنازله الثلاث', dxy === '8 bars · +1.250 · +1.25%');
// أداة بلا منازل معروفة: منازل الفرق من السعر لا من حجم الفرق (كان «+5.00000»).
ok('BTCUSD فرق بمنازل السعر',
  measureReadoutText({
    symbol: 'BTCUSD', a: { price: 67420 }, b: { price: 67425 },
    stats: stats(2, 5, 0.0074), barsWord: 'b',
  }) === '2 b · +5.00 · +0.01%');

// منازل الفرق من مرجع المحور (سعر الأداة الجاري) لا من الطرف الأول: نفط من 99.80 وسعره 100.2
// والمحور بمنزلتين — كان «+0.650».
ok('USOIL فرق بمنازل المحور',
  measureReadoutText({
    symbol: 'USOIL', a: { price: 99.8 }, b: { price: 100.45 },
    stats: stats(3, 0.65, 0.65), barsWord: 'b', priceRef: 100.2,
  }) === '3 b · +0.65 · +0.65%');
ok('USOIL بلا مرجع: الطرف الأول كما كان',
  measureReadoutText({
    symbol: 'USOIL', a: { price: 99.8 }, b: { price: 100.45 },
    stats: stats(3, 0.65, 0.65), barsWord: 'b',
  }) === '3 b · +0.650 · +0.65%');

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
  }) === '4 b · 0.000 · 0.00%');
// DXY: فرق سالب يُقرَّب لصفر بمنازله ⇒ بلا «−».
ok('DXY فرق مجهري سالب بلا إشارة',
  measureReadoutText({
    symbol: 'DXY', a: { price: 101.2 }, b: { price: 101.199999 },
    stats: stats(1, -0.000001, 0), barsWord: 'b',
  }) === '1 b · 0.000 · 0.00%');

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

// ── صيغة العدد ─────────────────────────────────────────────────────────────
ok('ar 1 ⇒ شمعة', barsCountText(1, 'شموع', 'ar') === '1 شمعة');
ok('ar 2 ⇒ شمعتان', barsCountText(2, 'شموع', 'ar') === '2 شمعتان');
ok('ar 3 ⇒ الجمع', barsCountText(3, 'شموع', 'ar') === '3 شموع');
ok('ar 10 ⇒ الجمع', barsCountText(10, 'شموع', 'ar') === '10 شموع');
ok('ar 11 ⇒ مفرد', barsCountText(11, 'شموع', 'ar') === '11 شمعة');
ok('ar 100 ⇒ مفرد', barsCountText(100, 'شموع', 'ar') === '100 شمعة');
ok('ar 105 ⇒ الجمع', barsCountText(105, 'شموع', 'ar') === '105 شموع');
ok('ar 0 ⇒ الكلمة كما هي', barsCountText(0, 'شموع', 'ar') === '0 شموع');
ok('en 1 ⇒ bar', barsCountText(1, 'bars', 'en') === '1 bar');
ok('en 2 ⇒ bars', barsCountText(2, 'bars', 'en') === '2 bars');
ok('ku ⇒ الكلمة كما هي', barsCountText(1, 'مۆم', 'ku') === '1 مۆم');
ok('بلا لغة ⇒ الكلمة كما هي', barsCountText(1, 'شموع') === '1 شموع');
ok('السطر يمرّر اللغة',
  measureReadoutText({
    symbol: 'EURUSD', a: { price: 1.08 }, b: { price: 1.0824 },
    stats: stats(1, 0.0024, 0.22), barsWord: 'bars', lang: 'en',
  }).startsWith('1 bar · '));

// ── مدى الشمعة بالنقاط لسطر التقاطع ─────────────────────────────────────────
ok('مدى EURUSD', candleRangePipsText('EURUSD', 1.08612, 1.08450) === '↕ 16.2 pip');
ok('مدى USDJPY بحجم pip الين', candleRangePipsText('USDJPY', 157.423, 157.1) === '↕ 32.3 pip');
ok('مدى الذهب', candleRangePipsText('XAUUSD', 2662.5, 2650.0) === '↕ 125.0 pip');
ok('دوجي بلا مدى', candleRangePipsText('EURUSD', 1.085, 1.085) === '↕ 0.0 pip');
ok('DXY ⇒ null', candleRangePipsText('DXY', 104.3, 104.1) === null);
ok('أعلى دون الأدنى ⇒ null', candleRangePipsText('EURUSD', 1.08, 1.09) === null);

// ── زمن القياس ────────────────────────────────────────────────────────────
const H = 3600;
ok('زمن: ساعة وربع', measureDurationText(4500) === '1h 15m');
ok('زمن: ساعات بلا دقائق', measureDurationText(4 * H) === '4h');
ok('زمن: يومان و4 ساعات', measureDurationText(52 * H) === '2d 4h');
ok('زمن: أيام بلا ساعات', measureDurationText(3 * 24 * H) === '3d');
ok('زمن: دقائق', measureDurationText(45 * 60) === '45m');
ok('زمن: شمعة واحدة ⇒ null', measureDurationText(0) === null);
ok('زمن: غائب ⇒ null', measureDurationText(null) === null);
ok('زمن بالعربية', measureDurationText(52 * H, 'ar') === '2 يوم 4 س');
ok('زمن من الطرفين (الجمعة ⇒ الاثنين، تقويمي)', measureDurationSec({ time: 0 }, { time: 3 * 24 * H }, H) === 3 * 24 * H);
ok('زمن بطرف في المستقبل', measureDurationSec({ time: 0 }, { time: 10 * H, ahead: 2, aheadStep: 4 * H }, H) === 18 * H);
ok('زمن بطرف بلا ختم ⇒ null', measureDurationSec({}, { time: 10 }, H) === null);
ok('سطر بالزمن',
  measureReadoutText({
    symbol: 'EURUSD', a: { price: 1.08 }, b: { price: 1.0824 },
    stats: stats(12, 0.0024, 0.2222), barsWord: 'bars', lang: 'en', durationSec: 12 * H,
  }) === '12 bars · 12h · +24.0 pip · +0.22%');
ok('سطر بلا زمن كما كان',
  measureReadoutText({
    symbol: 'EURUSD', a: { price: 1.08 }, b: { price: 1.0824 },
    stats: stats(12, 0.0024, 0.2222), barsWord: 'شموع', durationSec: null,
  }) === '12 شموع · +24.0 pip · +0.22%');

if (failures) {
  console.error(`measureReadout.selftest: ${failures} FAILED`);
  process.exitCode = 1;
} else {
  console.log('measureReadout.selftest: PASS');
}
