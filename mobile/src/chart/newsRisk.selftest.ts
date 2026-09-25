/**
 * Self-test for newsRisk (pure).
 * Run: npx --yes tsx src/chart/newsRisk.selftest.ts
 */
import assert from 'node:assert/strict';
import {
  bankHolidayToday,
  HOLIDAY_SPAN_MS,
  calendarAfterFetch,
  calendarUnavailable,
  openCalendarUnavailable,
  calendarFetchEvents,
  newsCountdown,
  newsTickDelayMs,
  NEWS_GRACE_MS,
  nextHighImpact,
  openPositionsNewsRisk,
  sameMinuteHighImpact,
  sameMinuteCurrencyLabel,
  newsBannerText,
  symbolCurrencies,
  newsCurrencies,
  knownSingleName,
  isCryptoSymbol,
  NEWS_STALE_MAX_MS,
  type NewsEvent,
} from './newsRisk';
import { instrumentSpec } from '../positionSize';

assert.deepEqual(symbolCurrencies('EURUSD'), ['EUR', 'USD']);
assert.deepEqual(symbolCurrencies('gbpjpy'), ['GBP', 'JPY']);
assert.deepEqual(symbolCurrencies('XAUUSD'), ['USD']);
assert.deepEqual(symbolCurrencies('DXY'), ['USD']);
// USDINDEX/UKBRENT: أسماء يعرفها marketHours (DXY_RE/BRENT_RE) وكانت [] هنا ⇒ بلا تحذير قبل خبر أمريكي
for (const s of ['USDINDEX', 'USDIndex', 'USDINDEX.m', 'UKBRENT', 'UKBRENT.cash']) assert.deepEqual(symbolCurrencies(s), ['USD'], s);
assert.deepEqual(symbolCurrencies('USDCNH'), ['USD', 'CNY']);
assert.deepEqual(symbolCurrencies('EUR/USD'), ['EUR', 'USD']);
assert.deepEqual(symbolCurrencies('BTCUSD'), ['USD']);
// مؤشرات/نفط/معادن بأسماء منصّات الوسطاء: عملة تسعيرها وبنكها المركزي خبرها الأول (كانت [] كلها)
assert.deepEqual(symbolCurrencies('NAS100'), ['USD']);
assert.deepEqual(symbolCurrencies('us30'), ['USD']);
assert.deepEqual(symbolCurrencies('SPX500'), ['USD']);
assert.deepEqual(symbolCurrencies('US500'), ['USD']);
assert.deepEqual(symbolCurrencies('USTEC'), ['USD']);
assert.deepEqual(symbolCurrencies('GER40'), ['EUR']);
assert.deepEqual(symbolCurrencies('DE40'), ['EUR']);
assert.deepEqual(symbolCurrencies('UK100'), ['GBP']);
assert.deepEqual(symbolCurrencies('JP225'), ['JPY']);
assert.deepEqual(symbolCurrencies('AUS200'), ['AUD']);
assert.deepEqual(symbolCurrencies('XTIUSD'), ['USD']);
assert.deepEqual(symbolCurrencies('XBRUSD'), ['USD']);
assert.deepEqual(symbolCurrencies('GOLD'), ['USD']);
// أسماء Exness/IC Markets/XM/Pepperstone/FXCM — بلاحقة الوسيط أيضاً، ومفتاحٌ واحد بالدفتر
for (const [sym, ccy, key] of [
  ['FR40', 'EUR', 'FR40'], ['F40', 'EUR', 'F40'], ['ES35', 'EUR', 'ES35'], ['SPAIN35Cash', 'EUR', 'SPAIN35'],
  ['CN50', 'CNY', 'CN50'], ['CHN50', 'CNY', 'CHN50'], ['China50', 'CNY', 'CHINA50'], ['CHI50Cash', 'CNY', 'CHI50'],
  ['CHINAA50.m', 'CNY', 'CHINAA50'], ['HKG33', 'HKD', 'HKG33'], ['HSI', 'HKD', 'HSI'], ['ASX200', 'AUD', 'ASX200'],
  ['AU200', 'AUD', 'AU200'], ['SpotCrude', 'USD', 'SPOTCRUDE'], ['SPOTBRENT#', 'USD', 'SPOTBRENT'], ['VIX', 'USD', 'VIX'],
  ['fr40.cash', 'EUR', 'FR40'], ['F40-ECN', 'EUR', 'F40'],
] as const) {
  assert.deepEqual(symbolCurrencies(sym), [ccy], sym);
  assert.equal(knownSingleName(sym), key, sym);
}
// الأسماء الجديدة لا تبتلع زوجاً أو اسماً مجهولاً
assert.deepEqual(symbolCurrencies('F40X'), []);
assert.deepEqual(symbolCurrencies('CN500'), []);
assert.equal(knownSingleName('CN50M'), null);
assert.deepEqual(symbolCurrencies('EURCNH'), ['EUR', 'CNY']);
assert.deepEqual(symbolCurrencies('silver'), ['USD']);
assert.deepEqual(symbolCurrencies('USOIL'), ['USD']);
// لاحقة الوسيط بفاصل تسقط؛ الملاصقة بلا فاصل لا تُخمَّن
assert.deepEqual(symbolCurrencies('US30.cash'), ['USD']);
assert.deepEqual(symbolCurrencies('NAS100-ECN'), ['USD']);
assert.deepEqual(symbolCurrencies('USOIL.m'), ['USD']);
assert.deepEqual(symbolCurrencies('GOLD#'), ['USD']);
assert.deepEqual(symbolCurrencies(' ger40.pro '), ['EUR']);
assert.deepEqual(symbolCurrencies('US30M'), ['USD']); // «m» ملاصقة (Exness) — للتحذير فقط
assert.deepEqual(symbolCurrencies('NAS1000'), []);
assert.deepEqual(symbolCurrencies('US'), []);
assert.deepEqual(symbolCurrencies('ETHUSD'), ['USD']);
assert.deepEqual(symbolCurrencies('AAPL'), []);
// بلاتين/بلاديوم/نحاس بأسماء MT5: خبر الدولار أولاً كالذهب (كانت [])، وبعملة غير الدولار الساقان معاً
assert.deepEqual(symbolCurrencies('XPTUSD'), ['USD']);
assert.deepEqual(symbolCurrencies('xpdusd.m'), ['USD']);
assert.deepEqual(symbolCurrencies('XCUUSD'), ['USD']);
assert.deepEqual(symbolCurrencies('XPTEUR'), ['USD', 'EUR']);
assert.deepEqual(symbolCurrencies('USDXPT'), []);
assert.deepEqual(symbolCurrencies('XPTBTC'), []);
for (const c of ['PLATINUM', 'PALLADIUM', 'COPPER', 'NATGAS', 'OIL']) assert.deepEqual(symbolCurrencies(c), ['USD'], c);
// أسماء شائعة كانت غائبة (مؤشرات أوروبا والسويسري وS&P بلا X)
assert.deepEqual(symbolCurrencies('SP500'), ['USD']);
for (const c of ['DAX', 'CAC40', 'IBEX35', 'SPA35', 'EUSTX50', 'ESTX50', 'NETH25']) assert.deepEqual(symbolCurrencies(c), ['EUR'], c);
assert.deepEqual(symbolCurrencies('FTSE'), ['GBP']);
assert.deepEqual(symbolCurrencies('SWI20'), ['CHF']);
// أسماء OANDA: الأداة وعملتها ملاصقتين
assert.deepEqual(symbolCurrencies('SPX500USD'), ['USD']);
assert.deepEqual(symbolCurrencies('NAS100USD'), ['USD']);
assert.deepEqual(symbolCurrencies('WTICOUSD'), ['USD']);
assert.deepEqual(symbolCurrencies('BCOUSD'), ['USD']);
assert.deepEqual(symbolCurrencies('DE30EUR'), ['EUR']);
assert.deepEqual(symbolCurrencies('UK100GBP'), ['GBP']);
// عقود XM الفورية بـ«Cash» ملاصقة (بأيّ حالة أحرف، وبلاحقة فاصلة بعدها أيضاً)
assert.deepEqual(symbolCurrencies('US30Cash'), ['USD']);
assert.deepEqual(symbolCurrencies('US100Cash'), ['USD']);
assert.deepEqual(symbolCurrencies('GER40Cash'), ['EUR']);
assert.deepEqual(symbolCurrencies('UK100CASH'), ['GBP']);
assert.deepEqual(symbolCurrencies('OILCash'), ['USD']);
assert.deepEqual(symbolCurrencies('JP225Cash'), ['JPY']);
// بادئة وسيط «#»/«.»: كانت «#US30» كلّها تُعدّ لاحقة ⇒ `[]` (لا تحذير ولا سطر «التقويم غير متاح») قبل الرواتب
assert.deepEqual(symbolCurrencies('#US30'), ['USD']);
assert.deepEqual(symbolCurrencies('.US30'), ['USD']);
assert.deepEqual(symbolCurrencies('#NAS100.cash'), ['USD']);
assert.deepEqual(symbolCurrencies('#GER40'), ['EUR']);
assert.deepEqual(symbolCurrencies('#GOLD'), ['USD']);
assert.deepEqual(symbolCurrencies('#EURUSD'), ['EUR', 'USD']);
assert.deepEqual(symbolCurrencies('#'), []);
assert.equal(knownSingleName('#US30'), 'US30');
assert.equal(isCryptoSymbol('#BTCUSD'), true);
// «Cash» لا تُسقَط إلا عن اسم معروف؛ وحدها أو عن رمز مجهول تبقى []
assert.deepEqual(symbolCurrencies('CASH'), []);
assert.deepEqual(symbolCurrencies('AAPLCash'), []);
// الأزواج المعروفة لم تتغيّر
assert.deepEqual(symbolCurrencies('XAUEUR'), ['USD', 'EUR']);
assert.deepEqual(symbolCurrencies('EURUSD.m'), ['EUR', 'USD']);
{
  const nfp = { id: 'nfp', title: 'NFP', currency: 'USD', impact: 'high', ts: 1_800_000_600 };
  assert.equal(nextHighImpact([nfp], symbolCurrencies('XPTUSD'), 1_800_000_000_000)?.event.id, 'nfp');
  assert.equal(nextHighImpact([nfp], symbolCurrencies('US30Cash'), 1_800_000_000_000)?.event.id, 'nfp');
}
// الرواتب الأمريكية تصل لنموذج صفقة الناسداك بالدفتر، وخبر المركزي الأوروبي لا يصله
{
  const ev = [
    { id: 'ecb', title: 'ECB', currency: 'EUR', impact: 'high', ts: 1_800_000_300 },
    { id: 'nfp', title: 'NFP', currency: 'USD', impact: 'high', ts: 1_800_000_600 },
  ];
  assert.equal(nextHighImpact(ev, symbolCurrencies('NAS100.cash'), 1_800_000_000_000)?.event.id, 'nfp');
  assert.equal(nextHighImpact(ev, symbolCurrencies('GER40'), 1_800_000_000_000)?.event.id, 'ecb');
}
assert.deepEqual(symbolCurrencies(''), []);
// معدن بعملة غير الدولار: خبر الدولار أولاً ثم عملة التسعير؛ معدن مقابل معدن/رقمي لا
assert.deepEqual(symbolCurrencies('XAUEUR'), ['USD', 'EUR']);
assert.deepEqual(symbolCurrencies('xag/aud'), ['USD', 'AUD']);
assert.deepEqual(symbolCurrencies('XAUJPY'), ['USD', 'JPY']);
assert.deepEqual(symbolCurrencies('XAUXAG'), []);
assert.deepEqual(symbolCurrencies('XAUBTC'), []);
// رمز الدفتر بلاحقة الوسيط كما كُتب: نفس عملات الأداة
assert.deepEqual(symbolCurrencies('XAUUSD.m'), ['USD']);
assert.deepEqual(symbolCurrencies('EURUSDm'), ['EUR', 'USD']);
assert.deepEqual(symbolCurrencies('gbpjpy.pro'), ['GBP', 'JPY']);
assert.deepEqual(symbolCurrencies('XAUEUR-ECN'), ['USD', 'EUR']);
assert.deepEqual(symbolCurrencies('USDCNH.m'), ['USD', 'CNY']);
// كل ما تقبله حاسبة المخاطرة له تحذير أخبار: الخليج وإسرائيل بساق الدولار أو اليورو
assert.deepEqual(symbolCurrencies('USDSAR'), ['USD', 'SAR']);
assert.deepEqual(symbolCurrencies('USDAED'), ['USD', 'AED']);
assert.deepEqual(symbolCurrencies('usd/ils'), ['USD', 'ILS']);
assert.deepEqual(symbolCurrencies('EURSAR'), ['EUR', 'SAR']);
assert.equal(nextHighImpact([{ id: 'fomc', title: 'FOMC', currency: 'USD', impact: 'high', ts: 1_800_000_600 }], symbolCurrencies('USDSAR'), 1_800_000_000_000)?.event.id, 'fomc');
{
  // تطابق القائمتين بالبناء: أي زوج ورقي تقبله الحاسبة (من 21 عملة) له عملتان هنا
  const ccys = ['EUR', 'GBP', 'AUD', 'NZD', 'USD', 'CAD', 'CHF', 'JPY', 'SEK', 'NOK', 'DKK', 'PLN', 'TRY', 'ZAR', 'MXN', 'SGD', 'HKD', 'CNH', 'ILS', 'SAR', 'AED'];
  for (const a of ccys) for (const b of ccys) {
    if (a === b) continue;
    assert.ok(instrumentSpec(a + b), a + b);
    assert.equal(symbolCurrencies(a + b).length, 2, a + b);
  }
}
assert.equal(nextHighImpact([{ id: 'nfp', title: 'NFP', currency: 'USD', impact: 'high', ts: 1_800_000_600 }], symbolCurrencies('XAUEUR'), 1_800_000_000_000)?.event.id, 'nfp');

const now = 1_800_000_000_000;
const ev = (id: string, cur: string, impact: string, minsFromNow: number | null, sample = false): NewsEvent => ({
  id,
  title: id,
  currency: cur,
  impact,
  ts: minsFromNow == null ? null : (now + minsFromNow * 60_000) / 1000,
  sample,
});

const list = [
  ev('usd-low', 'USD', 'low', 10),
  ev('usd-high-90', 'USD', 'high', 90),
  ev('eur-high-45', 'EUR', 'High', 45),
  ev('jpy-high-5', 'JPY', 'high', 5),
  ev('usd-high-sample', 'USD', 'high', 1, true),
  ev('usd-high-notime', 'USD', 'high', null),
  ev('usd-high-past', 'USD', 'high', -30),
  ev('usd-high-far', 'USD', 'high', 200),
];

const r1 = nextHighImpact(list, ['EUR', 'USD'], now);
assert.equal(r1?.event.id, 'eur-high-45');
assert.equal(r1?.deltaMs, 45 * 60_000);
assert.equal(nextHighImpact(list, ['USD'], now)?.event.id, 'usd-high-90');
assert.equal(nextHighImpact(list, ['GBP'], now), null);
assert.equal(nextHighImpact(list, [], now), null);
// جارٍ الآن (قبل 10 دقائق) يبقى ظاهراً ضمن مهلة 15 دقيقة
const r2 = nextHighImpact([ev('now', 'USD', 'high', -10)], ['USD'], now);
assert.equal(r2?.event.id, 'now');
assert.ok(r2!.deltaMs < 0);
// حدود النافذة
assert.equal(nextHighImpact([ev('edge', 'USD', 'high', 180)], ['USD'], now)?.event.id, 'edge');
assert.equal(nextHighImpact([ev('edge2', 'USD', 'high', -15)], ['USD'], now)?.event.id, 'edge2');

console.log('newsRisk selftest OK');

// الأقرب للّحظة بالاتجاهين لا الأقدم: خبر مضى قبل 14 دقيقة كان يحجب خبراً بعد دقيقتين
const r3 = nextHighImpact([ev('eur-past-14', 'EUR', 'high', -14), ev('usd-in-2', 'USD', 'high', 2)], ['EUR', 'USD'], now);
assert.equal(r3?.event.id, 'usd-in-2');
assert.equal(r3?.deltaMs, 2 * 60_000);
// خبر صدر للتوّ (قفزته جارية) يغلب خبراً بعد ساعتين
assert.equal(
  nextHighImpact([ev('usd-past-1', 'USD', 'high', -1), ev('usd-in-120', 'USD', 'high', 120)], ['USD'], now)?.event.id,
  'usd-past-1'
);
// بين حدثين مضيا: الأحدث لا الأقدم
assert.equal(
  nextHighImpact([ev('past-12', 'USD', 'high', -12), ev('past-3', 'USD', 'high', -3)], ['USD'], now)?.event.id,
  'past-3'
);
// تعادل البُعد: القادم أولى (قفزته لم تقع بعد)
assert.equal(
  nextHighImpact([ev('past-5', 'USD', 'high', -5), ev('in-5', 'USD', 'high', 5)], ['USD'], now)?.event.id,
  'in-5'
);
// خبرٌ مضى قبل 5د لا يحجب الرواتب بعد 6د (بالبُعد المجرّد كان «الآن · ECB» على EURUSD)
{
  const r = nextHighImpact([ev('ecb-past-5', 'EUR', 'high', -5), ev('nfp-in-6', 'USD', 'high', 6)], ['EUR', 'USD'], now);
  assert.equal(r?.event.id, 'nfp-in-6');
  assert.equal(r?.deltaMs, 6 * 60_000);
  // كل قادمٍ خلال المهلة يغلب كل ماضٍ ضمنها — بالترتيبين
  for (const past of [-0.5, -1, -5, -14, -15]) {
    for (const ahead of [0.5, 1, 6, 14, 15]) {
      const a = [ev('p', 'USD', 'high', past), ev('a', 'USD', 'high', ahead)];
      assert.equal(nextHighImpact(a, ['USD'], now)?.event.id, 'a', `${past} ${ahead}`);
      assert.equal(nextHighImpact([...a].reverse(), ['USD'], now)?.event.id, 'a', `${past} ${ahead} rev`);
    }
  }
  // صدر للتوّ يغلب قادماً بعد المهلة: قبل 1د (16) مقابل بعد 20د
  assert.equal(nextHighImpact([ev('p1', 'USD', 'high', -1), ev('a20', 'USD', 'high', 20)], ['USD'], now)?.event.id, 'p1');
  // الماضي وحده يبقى ظاهراً كما كان
  assert.equal(nextHighImpact([ev('p14', 'USD', 'high', -14)], ['USD'], now)?.event.id, 'p14');
}
assert.equal(
  nextHighImpact([ev('in-5', 'USD', 'high', 5), ev('past-5', 'USD', 'high', -5)], ['USD'], now)?.event.id,
  'in-5'
);
// الترتيب بالمصفوفة لا يغيّر النتيجة
assert.equal(nextHighImpact([...list].reverse(), ['EUR', 'USD'], now)?.event.id, 'eur-high-45');

console.log('newsRisk nearest selftest OK');

// newsCountdown — العدّ لا يبالغ بالوقت الباقي قبل الخبر، و«0د» لا تُكتب بجانب ساعات
{
  const S = 1000;
  const M = 60 * S;
  assert.deepEqual(newsCountdown(0), { now: true });
  assert.deepEqual(newsCountdown(60 * S), { now: true });
  assert.deepEqual(newsCountdown(-14 * M), { now: true }); // جارٍ ضمن المهلة
  assert.deepEqual(newsCountdown(-15 * M), { now: true });
  assert.deepEqual(newsCountdown(NaN), { now: true }); // لا رقم مختلَق
  assert.deepEqual(newsCountdown(61 * S), { now: false, h: 0, m: 1 });
  assert.deepEqual(newsCountdown(91 * S), { now: false, h: 0, m: 1 }); // كان «2د» بـMath.round
  assert.deepEqual(newsCountdown(119 * S), { now: false, h: 0, m: 1 });
  assert.deepEqual(newsCountdown(2 * M), { now: false, h: 0, m: 2 });
  assert.deepEqual(newsCountdown(59 * M + 50 * S), { now: false, h: 0, m: 59 }); // كان «1س 0د»
  assert.deepEqual(newsCountdown(60 * M), { now: false, h: 1, m: 0 });
  assert.deepEqual(newsCountdown(125 * M + 40 * S), { now: false, h: 2, m: 5 });
  assert.deepEqual(newsCountdown(3 * 60 * M), { now: false, h: 3, m: 0 });
  // لا يعطي أبداً وقتاً أبعد من الحقيقي، ولا يقلّ عنه بدقيقة كاملة
  for (let s = 61; s <= 3 * 3600; s += 7) {
    const c = newsCountdown(s * S);
    assert.equal(c.now, false);
    if (!c.now) {
      const shown = (c.h * 60 + c.m) * 60;
      assert.ok(shown <= s && s - shown < 60, `${s}s → ${c.h}h ${c.m}m`);
      assert.ok(c.m >= 0 && c.m < 60);
    }
  }
}

console.log('newsRisk countdown selftest OK');

// calendarAfterFetch — فشل التحديث لا يمحو خبراً معروفاً قادماً
{
  const H = 60 * 60 * 1000;
  const t0 = 1_800_000_000_000;
  const nfp: NewsEvent = { id: 'nfp', title: 'Non-Farm Payrolls', currency: 'USD', impact: 'High', ts: (t0 + 2 * H) / 1000 };
  const ok = calendarAfterFetch(null, [nfp], t0);
  assert.deepEqual(ok, { events: [nfp], at: t0, ok: true, fetchedAt: t0 });
  // فشل بعد 10د: الحدث يبقى، والتحذير نفسه يظهر (كان المخزن يصير [] فيختفي الشريط)
  const failed = calendarAfterFetch(ok, null, t0 + 10 * 60 * 1000);
  assert.equal(failed.ok, false);
  assert.equal(failed.fetchedAt, t0);
  assert.equal(failed.at, t0 + 10 * 60 * 1000); // مهلة إعادة المحاولة من الفشل لا من آخر نجاح
  assert.deepEqual(failed.events, [nfp]);
  const hit = nextHighImpact(failed.events, symbolCurrencies('EURUSD'), t0 + 10 * 60 * 1000);
  assert.equal(hit?.event.id, 'nfp');
  // فشلان متتاليان: وقت آخر نجاح لا يتقدّم (وإلا بقي التقويم «حديثاً» للأبد)
  const failed2 = calendarAfterFetch(failed, null, t0 + 3 * H);
  assert.equal(failed2.fetchedAt, t0);
  assert.deepEqual(failed2.events, [nfp]);
  // الحدّ: يوم كامل يُحتفظ، وبعده يُسقط
  assert.deepEqual(calendarAfterFetch(ok, null, t0 + NEWS_STALE_MAX_MS).events, [nfp]);
  const tooOld = calendarAfterFetch(ok, null, t0 + NEWS_STALE_MAX_MS + 1);
  assert.deepEqual(tooOld, { events: [], at: t0 + NEWS_STALE_MAX_MS + 1, ok: false, fetchedAt: null });
  // فشل بلا أي نجاح سابق: فارغ، ولا يُختلق وقت جلب
  assert.deepEqual(calendarAfterFetch(null, null, t0), { events: [], at: t0, ok: false, fetchedAt: null });
  // نجاحٌ بقائمة فارغة **يمحو** فعلاً (الخادم قال لا أحداث — لا نحتفظ بقديم) وينسخ القائمة لا يشاركها
  assert.deepEqual(calendarAfterFetch(failed, [], t0 + H).events, []);
  const src = [nfp];
  const c = calendarAfterFetch(null, src, t0);
  src.pop();
  assert.deepEqual(c.events, [nfp]);
}
console.log('newsRisk calendar cache selftest OK');

// calendarFetchEvents — ردّ الأمثلة من الخادم (مصدره متعذّر، HTTP 200) فشلٌ لا يمحو تقويماً محفوظاً
{
  const H = 60 * 60 * 1000;
  const t0 = 1_800_000_000_000;
  const nfp: NewsEvent = { id: 'nfp', title: 'Non-Farm Payrolls', currency: 'USD', impact: 'High', ts: (t0 + 2 * H) / 1000 };
  const sample: NewsEvent = { id: 's1', title: 'Non-Farm Payrolls', currency: 'USD', impact: 'High', ts: null, sample: true };
  // الحالة التي وجدها الفحص: تقويم فيه NFP بعد 40د، ثم تحديث يعيد أمثلة فقط
  const saved = calendarAfterFetch(null, [{ ...nfp, ts: (t0 + 40 * 60 * 1000) / 1000 }], t0 - 10 * 60 * 1000);
  const after = calendarAfterFetch(saved, calendarFetchEvents({ events: [sample, { ...sample, id: 's2' }] }), t0);
  assert.equal(after.ok, false); // سطر «من تقويم محفوظ» يظهر
  assert.equal(nextHighImpact(after.events, symbolCurrencies('EURUSD'), t0)?.event.id, 'nfp');
  // ردود ليست تقويماً: فشل
  for (const bad of [null, undefined, 'x', 42, {}, { events: null }, { events: 'x' }, { events: {} }]) {
    assert.equal(calendarFetchEvents(bad), null, JSON.stringify(bad));
  }
  // تقويم حقيقي: يمرّ كما هو، والفارغ نجاح (أسبوع بلا خبر قوي)
  assert.deepEqual(calendarFetchEvents({ events: [nfp] }), [nfp]);
  assert.deepEqual(calendarFetchEvents({ events: [] }), []);
  assert.deepEqual(calendarAfterFetch(saved, calendarFetchEvents({ events: [] }), t0).ok, true);
  // الخادم يصرّح بالفشل: status "unavailable" مع مصفوفة فارغة ⇒ فشل يُبقي المحفوظ وتحذيره بسطر «محفوظ»
  assert.equal(calendarFetchEvents({ events: [], status: 'unavailable' }), null);
  const down = calendarAfterFetch(saved, calendarFetchEvents({ events: [], status: 'unavailable' }), t0);
  assert.equal(down.ok, false);
  assert.equal(nextHighImpact(down.events, symbolCurrencies('EURUSD'), t0)?.event.id, 'nfp');
  assert.deepEqual(calendarFetchEvents({ events: [nfp], status: 'ok' }), [nfp]);
  assert.deepEqual(calendarFetchEvents({ events: [], status: 'ok' }), []);
  // خليط (لا يُرسله الخادم اليوم): الحقيقي يُؤخذ والأمثلة تُسقط
  assert.deepEqual(calendarFetchEvents({ events: [sample, nfp] }), [nfp]);
  // رجوع الخادم إلى XML الأسبوعي: أحداث حقيقية كلها بلا ts ⇒ فشل، فيبقى تحذير الرواتب المحفوظ بسطر «محفوظ»
  const untimed = { ...nfp, id: 'nfp-xml', ts: null, tz_unknown: true } as unknown as typeof nfp;
  assert.equal(calendarFetchEvents({ events: [untimed, { ...untimed, id: 'cpi-xml' }] }), null);
  const kept = calendarAfterFetch(saved, calendarFetchEvents({ events: [untimed] }), t0);
  assert.equal(kept.ok, false);
  assert.equal(nextHighImpact(kept.events, symbolCurrencies('EURUSD'), t0)?.event.id, 'nfp');
  // ts غير عددي/NaN = بلا وقت
  assert.equal(calendarFetchEvents({ events: [{ ...untimed, ts: Number.NaN }, { ...untimed, ts: '1800' as unknown as number }] }), null);
  // خليط: حدثٌ موقوت واحد يكفي — نجاح كما هو
  assert.deepEqual(calendarFetchEvents({ events: [untimed, nfp] }), [untimed, nfp]);
  assert.deepEqual(calendarFetchEvents({ events: [sample, untimed, nfp] }), [untimed, nfp]);
}
console.log('newsRisk calendarFetchEvents selftest OK');

// عملات خارج الحاسبة تُكتب بالدفتر: ساق الدولار/اليورو تُحذَّر؛ رمزٌ مقلوب/رقميّة مقابل رقميّة تبقى []
{
  assert.deepEqual(symbolCurrencies('USDHUF'), ['USD', 'HUF']);
  assert.deepEqual(symbolCurrencies('USDTHB'), ['USD', 'THB']);
  assert.deepEqual(symbolCurrencies('EURCZK'), ['EUR', 'CZK']);
  assert.deepEqual(symbolCurrencies('usd/krw'), ['USD', 'KRW']);
  const nfp: NewsEvent = { id: 'nfp', title: 'NFP', currency: 'USD', impact: 'High', ts: 1_800_000_000 + 1800 };
  assert.equal(nextHighImpact([nfp], symbolCurrencies('USDHUF'), 1_800_000_000_000)?.event.id, 'nfp');
  for (const c of ['USDTRX', 'USDBTC', 'BTCETH', 'ETHBTC']) assert.deepEqual(symbolCurrencies(c), [], c);
}
console.log('newsRisk exotic-currency selftest OK');

// newsTickDelayMs — الشريط يُجدَّد لحظة يتغيّر العدّ، فلا يبقى «بعد 3د» والخبر بعد 2:50
{
  const M = 60_000;
  // ظهر والخبر بعد 3:30 → التجديد بعد 30 ثانية وجزء، فيصير «بعد 2د» لا بعد دقيقة كاملة
  assert.equal(newsTickDelayMs(3.5 * M), 30_001);
  assert.equal(newsTickDelayMs(2 * M + 5_000), 5_001);
  // على المضاعف تماماً: «بعد 3د» صادقة الآن، وتتغيّر بعد 1ms (لا حلقة: الحدّ الأدنى 250)
  assert.equal(newsTickDelayMs(3 * M), 250);
  // الدقيقة الأخيرة: «بعد 1د» حتى 60,000 بالضبط ثم «الآن»
  assert.equal(newsTickDelayMs(M + 20_000), 20_000);
  assert.ok(newsCountdown(M + 20_000 - 20_000).now);
  // ساعات: لا تتجاوز دقيقة أبداً
  assert.equal(newsTickDelayMs(2 * 60 * M + 45_000), 45_001);
  assert.equal(newsTickDelayMs(3 * 60 * M), 250);
  // «الآن»: حتى خروج الخبر من المهلة، محصوراً بدقيقة
  assert.equal(newsTickDelayMs(30_000), M);
  assert.equal(newsTickDelayMs(-NEWS_GRACE_MS + 10_000), 10_001);
  assert.equal(newsTickDelayMs(-NEWS_GRACE_MS), 250);
  // بلا خبر أو قيمة غير صالحة → الساعة القديمة
  for (const v of [null, NaN, Infinity, -Infinity]) assert.equal(newsTickDelayMs(v as number | null), M, String(v));
  // الخاصية: بين الآن والتجديد لا يتغيّر نصّ العدّ، وبعد التجديد يتغيّر (أو بلغ الحدّ الأقصى)
  const key = (d: number) => JSON.stringify(newsCountdown(d));
  for (let d = -NEWS_GRACE_MS + 1_000; d <= 3 * 60 * M; d += 7_919) {
    const w = newsTickDelayMs(d);
    assert.ok(w >= 250 && w <= M, `${d}`);
    // قبل التجديد بلحظة: النصّ نفسه (لا تغيّر يفوت الشريط)
    if (w > 250) assert.equal(key(d - (w - 1)), key(d), `stale at ${d}`);
    // عند التجديد: تغيّر، إلا حين حُصر بالدقيقة
    if (w < M && w > 250) assert.notEqual(key(d - w), key(d), `no change at ${d}`);
  }
}
console.log('newsRisk tick selftest OK');
// زوج بفاصل داخلي يبقى زوجاً، والمجهول بلاحقة فاصلة يُقرأ بلا لاحقته
assert.deepEqual(symbolCurrencies('USD-HUF'), ['USD', 'HUF']);
assert.deepEqual(symbolCurrencies('USDHUF.pro'), ['USD', 'HUF']);
assert.deepEqual(symbolCurrencies('XPTUSD#'), ['USD']);
assert.deepEqual(symbolCurrencies('BTCUSD.m'), ['USD']);
console.log('newsRisk metals/aliases selftest OK');

// العملات الرقمية مقابل عملة ورقية: خبر الدولار كالذهب (CPI/الفيدرالي/الرواتب)، وساق العملة الأخرى معه
{
  for (const c of ['BTCUSD', 'btc/usd', 'ETHUSD', 'XRPUSD', 'LTCUSD', 'SOLUSD', 'DOGEUSD', 'BTCUSDT', 'ETHUSDC',
    'BTCUSD.m', 'BTCUSD#', 'ETHUSD-ECN', 'BTC-USD', 'BTC_USDT', ' bnbusd ', 'BTCUSDT.pro'])
    assert.deepEqual(symbolCurrencies(c), ['USD'], c);
  assert.deepEqual(symbolCurrencies('BTCEUR'), ['USD', 'EUR']);
  assert.deepEqual(symbolCurrencies('ETHJPY.pro'), ['USD', 'JPY']);
  assert.deepEqual(symbolCurrencies('BTCCNH'), ['USD', 'CNY']);
  // رقميّة مقابل رقميّة، مقلوبة، أو اسم غير مدرج: بلا ربط مخمَّن
  for (const c of ['ETHBTC', 'BTCETH', 'USDBTC', 'USDTRX', 'QQQXUSD', 'ZZZUSD', 'BTCXYZ', 'BTC', 'BTCUSDTT', 'ETHBTCM', 'ZZZUSDM'])
    assert.deepEqual(symbolCurrencies(c), [], c);
  // الحاسبة والدفتر بلا تغيير: لا مواصفات pip، ولا اسمٌ «معروف» يُدمج به مفتاح الأداة
  assert.equal(instrumentSpec('BTCUSD'), null);
  assert.equal(knownSingleName('BTCUSD.m'), null);
  const cpi: NewsEvent = { id: 'cpi', title: 'CPI y/y', currency: 'USD', impact: 'High', ts: 1_800_000_000 + 1200 };
  const ecb: NewsEvent = { id: 'ecb', title: 'ECB rate', currency: 'EUR', impact: 'High', ts: 1_800_000_000 + 600 };
  assert.equal(nextHighImpact([cpi, ecb], symbolCurrencies('BTCUSD'), 1_800_000_000_000)?.event.id, 'cpi');
  assert.equal(nextHighImpact([cpi, ecb], symbolCurrencies('BTCEUR'), 1_800_000_000_000)?.event.id, 'ecb');
  assert.equal(nextHighImpact([cpi, ecb], symbolCurrencies('ETHBTC'), 1_800_000_000_000), null);
}
console.log('newsRisk crypto selftest OK');

// «m» الملاصقة (Exness Standard): تحذّر حين يبقى بعدها اسمٌ/زوج معروف؛ دمج مفتاح الأداة بلا تغيير
{
  for (const [c, want] of [
    ['US30m', ['USD']], ['USTECm', ['USD']], ['US500m', ['USD']], ['USOILm', ['USD']], ['UKOILm', ['USD']],
    ['XNGUSDm', ['USD']], ['DE30m', ['EUR']], ['UK100m', ['GBP']], ['JP225m', ['JPY']], ['HK50m', ['HKD']],
    ['AUS200m', ['AUD']], ['STOXX50m', ['EUR']], ['FR40m', ['EUR']], ['BTCUSDm', ['USD']], ['ETHUSDm', ['USD']],
    ['BTCEURm', ['USD', 'EUR']], ['XAUUSDm', ['USD']], ['EURUSDm', ['EUR', 'USD']], ['us30m', ['USD']],
  ] as [string, string[]][])
    assert.deepEqual(symbolCurrencies(c), want, c);
  // اسمٌ مجهول بـm يبقى صامتاً؛ حرف ملاصق غير m لا يُقبل؛ m وحدها أو اسم قصير لا يُقرأ
  for (const c of ['AAPLm', 'US30x', 'NAS1000m', 'Mm', 'OIm', 'ETHBTCm', 'ZZZUSDm', 'US30mm'])
    assert.deepEqual(symbolCurrencies(c), [], c);
  // مفتاح الأداة بالدفتر كما كان: لا دمج «US30M» مع «US30»
  assert.equal(knownSingleName('US30m'), null);
  assert.equal(knownSingleName('BTCUSDm'), null);
  const nfp: NewsEvent = { id: 'nfp', title: 'Non-Farm Payrolls', currency: 'USD', impact: 'High', ts: 1_800_000_000 + 900 };
  assert.equal(nextHighImpact([nfp], symbolCurrencies('USTECm'), 1_800_000_000_000)?.event.id, 'nfp');
}
console.log('newsRisk glued-m selftest OK');

// «c» الملاصقة (Exness Cent): الأزواج والمعادن والمؤشرات تحذّر؛ BTCUSDC عملة مستقرّة كما كانت
{
  for (const [c, want] of [
    ['EURUSDc', ['EUR', 'USD']], ['XAUUSDc', ['USD']], ['XAGUSDc', ['USD']], ['GOLDc', ['USD']], ['US30c', ['USD']],
    ['USDZARc', ['USD', 'ZAR']], ['GBPJPYc', ['GBP', 'JPY']], ['XAUEURc', ['USD', 'EUR']], ['XPDUSDm', ['USD']],
    ['eurusdc', ['EUR', 'USD']], ['BTCUSDc', ['USD']], ['BTCUSDC', ['USD']], ['BTCEURC', ['USD', 'EUR']],
  ] as [string, string[]][])
    assert.deepEqual(symbolCurrencies(c), want, c);
  // c على اسمٍ مجهول/قصير/مضاعف يبقى صامتاً؛ والحاسبة بلا تغيير. (حرفٌ ملاصق آخر بعد زوجٍ — «EURUSDx» — صار
  // يحذّر لعملتَي الزوج: لواحق Swap-free/Raw بحرفٍ واحد، والتحذير الزائد أهون من الغائب — راجع الكتلة الأخيرة)
  assert.deepEqual(symbolCurrencies('EURUSDx'), ['EUR', 'USD']);
  for (const c of ['AAPLc', 'USDC', 'EURUSDcc', 'ETHBTCc', 'XXXYYYc'])
    assert.deepEqual(symbolCurrencies(c), [], c);
  assert.equal(instrumentSpec('EURUSDc'), null);
  assert.equal(knownSingleName('US30c'), null);
}
console.log('newsRisk glued-c selftest OK');

// calendarUnavailable — فشلٌ بلا محفوظ لا يشبه «لا خبر»
{
  const t0 = Date.UTC(2026, 8, 24, 10, 0);
  const nfp: NewsEvent = { id: 'nfp', currency: 'USD', title: 'NFP', impact: 'high', ts: t0 + 40 * 60_000 };
  // قبل أي ردّ: تحميل، لا شيء
  assert.equal(calendarUnavailable(null, 'EURUSD'), false);
  // أول فتح بلا شبكة ⇒ الرسالة
  const failFirst = calendarAfterFetch(null, null, t0);
  assert.equal(calendarUnavailable(failFirst, 'EURUSD'), true);
  assert.equal(calendarUnavailable(failFirst, 'XAUUSDc'), true);
  // رمزٌ لا يحذّر عنه الشريط أبداً ⇒ صامت
  assert.equal(calendarUnavailable(failFirst, 'AAPL'), false);
  assert.equal(calendarUnavailable(failFirst, ''), false);
  // نجاح (حتى فارغ: أسبوع بلا خبر قوي حقيقة) ⇒ لا رسالة
  const ok = calendarAfterFetch(null, [nfp], t0);
  assert.equal(calendarUnavailable(ok, 'EURUSD'), false);
  assert.equal(calendarUnavailable(calendarAfterFetch(null, [], t0), 'EURUSD'), false);
  // فشل بعد نجاح حديث ⇒ المحفوظ يُستعمل (سطر «بيانات محفوظة»)، لا الرسالة
  const staleOk = calendarAfterFetch(ok, null, t0 + 10 * 60_000);
  assert.equal(staleOk.ok, false);
  assert.equal(calendarUnavailable(staleOk, 'EURUSD'), false);
  // محفوظ أقدم من يوم يُسقط ⇒ الرسالة
  const tooOld = calendarAfterFetch(ok, null, t0 + NEWS_STALE_MAX_MS + 1);
  assert.equal(tooOld.fetchedAt, null);
  assert.equal(calendarUnavailable(tooOld, 'EURUSD'), true);
  // ردّ أمثلة الخادم / تقويم بلا أوقات = فشل ⇒ الرسالة عند أول فتح
  assert.equal(calendarUnavailable(calendarAfterFetch(null, calendarFetchEvents({ events: [{ ...nfp, sample: true }] }), t0), 'EURUSD'), true);
  assert.equal(calendarUnavailable(calendarAfterFetch(null, calendarFetchEvents({ events: [{ ...nfp, ts: null }] }), t0), 'EURUSD'), true);
  // ثم نجاح ⇒ تختفي
  assert.equal(calendarUnavailable(calendarAfterFetch(tooOld, [nfp], t0 + NEWS_STALE_MAX_MS + 5), 'EURUSD'), false);
}
console.log('newsRisk calendarUnavailable selftest OK');

// openCalendarUnavailable — شريط الصفقات المفتوحة يقولها حين لا يقولها شريط النموذج
{
  const t0 = Date.UTC(2026, 8, 25, 10, 0);
  const fail = calendarAfterFetch(null, null, t0);
  // أثناء التعديل (لا شريط نموذج) ⇒ يقولها
  assert.equal(openCalendarUnavailable(fail, ['EURUSD'], undefined), true);
  // شريط النموذج على EURUSD يقولها ⇒ لا تكرار
  assert.equal(openCalendarUnavailable(fail, ['GBPJPY'], 'EURUSD'), false);
  // النموذج على رمزٍ بلا عملات ⇒ لا يقولها هناك ⇒ يقولها المفتوح
  assert.equal(openCalendarUnavailable(fail, ['GBPJPY'], 'AAPL'), true);
  // لا صفقة مغطّاة، أو التقويم سليم، أو قبل أول ردّ ⇒ لا شيء
  assert.equal(openCalendarUnavailable(fail, ['AAPL'], undefined), false);
  assert.equal(openCalendarUnavailable(fail, [], undefined), false);
  assert.equal(openCalendarUnavailable(calendarAfterFetch(null, [], t0), ['EURUSD'], undefined), false);
  assert.equal(openCalendarUnavailable(null, ['EURUSD'], undefined), false);
}
console.log('newsRisk openCalendarUnavailable selftest OK');

// حساب micro بلاحقة ملاصقة (XM) أو سنت بفاصل: عملات الزوج العادي — كانت «EURUSDmicro» `[]` بلا تحذير
{
  assert.deepEqual(symbolCurrencies('EURUSDmicro'), ['EUR', 'USD']);
  assert.deepEqual(symbolCurrencies('EURUSDMICRO'), ['EUR', 'USD']);
  assert.deepEqual(symbolCurrencies('USDJPYmicro'), ['USD', 'JPY']);
  assert.deepEqual(symbolCurrencies('GOLDmicro'), ['USD']);
  assert.deepEqual(symbolCurrencies('XAUUSD.micro'), ['USD']);
  assert.deepEqual(symbolCurrencies('EURUSD-cent'), ['EUR', 'USD']);
  assert.deepEqual(symbolCurrencies('GOLD.c'), ['USD']);
  // كما كانت
  assert.deepEqual(symbolCurrencies('EURUSD'), ['EUR', 'USD']);
  assert.deepEqual(symbolCurrencies('EURUSDc'), ['EUR', 'USD']);
}
console.log('newsRisk micro/cent suffix selftest OK');

// الموعد قبل العنوان (السطر يُقصّ من آخره)، و«+N» لأخبار الدقيقة نفسها
{
  const t0 = 1_800_000_000;
  const ev = (id: string, currency: string, ts: number | null, extra: Partial<NewsEvent> = {}): NewsEvent => ({
    id,
    title: id,
    currency,
    impact: 'High',
    ts,
    ...extra,
  });
  const nfp = ev('Non-Farm Employment Change', 'USD', t0);
  const events = [
    nfp,
    ev('Unemployment Rate', 'USD', t0),
    ev('Average Hourly Earnings m/m', 'USD', t0 + 1),
    ev('Unemployment Rate', 'USD', t0, { id: 'dup' }), // نسخة مكرّرة بالتقويم
    ev('ECB Press Conference', 'EUR', t0 + 30 * 60), // بعد نصف ساعة: ليس بالدقيقة نفسها
    ev('CAD Employment Change', 'CAD', t0), // عملة أخرى
    ev('Sample NFP', 'USD', t0, { sample: true }),
    ev('Retail Sales', 'USD', t0, { impact: 'Medium' }),
    ev('No time', 'USD', null),
  ];
  const cur = symbolCurrencies('EURUSD');
  assert.equal(sameMinuteHighImpact(events, cur, nfp), 2);
  assert.equal(sameMinuteHighImpact(events, symbolCurrencies('USDCAD'), nfp), 3);
  assert.equal(sameMinuteHighImpact(events, symbolCurrencies('EURGBP'), events[4]), 0);
  assert.equal(sameMinuteHighImpact([nfp], cur, nfp), 0);
  assert.equal(sameMinuteHighImpact(events, cur, ev('x', 'USD', null)), 0);
  // الحدث المعروض نفسه من nextHighImpact، والعدّ لا يشمله
  const hit = nextHighImpact(events, cur, t0 * 1000 - 12 * 60_000)!;
  assert.equal(sameMinuteHighImpact(events, cur, hit.event), 2);

  // العملات بالشريط: الـ+2 أمريكيان ⇒ «USD» وحدها؛ CAD بالدقيقة نفسها ⇒ «USD/CAD» لـUSDCAD لا لـEURUSD
  assert.equal(sameMinuteCurrencyLabel(events, cur, nfp), 'USD');
  assert.equal(sameMinuteCurrencyLabel(events, symbolCurrencies('USDCAD'), nfp), 'USD/CAD');
  // الرواتب + خطاب لاغارد بالدقيقة نفسها لـEURUSD ⇒ «USD/EUR» بعملة الحدث أولاً، والـ+1 لم يعد يُقرأ خبراً أمريكياً
  const lag = ev('ECB President Lagarde Speaks', 'EUR', t0 + 20);
  assert.equal(sameMinuteHighImpact([nfp, lag], cur, nfp), 1);
  assert.equal(sameMinuteCurrencyLabel([nfp, lag], cur, nfp), 'USD/EUR');
  assert.equal(sameMinuteCurrencyLabel([nfp, lag], cur, lag), 'EUR/USD');
  // أمثلة/متوسط/بلا وقت/ليست من عملات الزوج لا تُضاف
  assert.equal(sameMinuteCurrencyLabel(events, symbolCurrencies('EURGBP'), events[4]), 'EUR');
  assert.equal(sameMinuteCurrencyLabel(events, cur, ev('x', 'usd', null)), 'USD');

  const line = newsBannerText({ head: 'High-impact news', currency: 'USD', when: 'in 12m', title: nfp.title, more: 2 });
  assert.equal(line, '⚠ High-impact news · USD · in 12m · Non-Farm Employment Change +2');
  // الموعد ضمن أول 40 حرفاً مهما طال العنوان — يبقى بعد القصّ
  assert.ok(line.indexOf('in 12m') + 'in 12m'.length <= 40);
  assert.equal(
    newsBannerText({ head: 'خبر قوي', currency: 'EUR', when: 'الآن', title: 'ECB', more: 0 }),
    '⚠ خبر قوي · EUR · الآن · ECB'
  );
}
console.log('newsRisk banner text selftest OK');

// أسماء OANDA بشرطة سفلية: عملة التسعير بعد «_» لا تُسقط كلاحقة وسيط
{
  assert.deepEqual(symbolCurrencies('JP225_USD'), ['JPY', 'USD']);
  assert.deepEqual(symbolCurrencies('CN50_USD'), ['CNY', 'USD']);
  assert.deepEqual(symbolCurrencies('HK33_HKD'), ['HKD']);
  assert.deepEqual(symbolCurrencies('USB10Y_USD'), ['USD']);
  assert.deepEqual(symbolCurrencies('NAS100_USD'), ['USD']);
  assert.deepEqual(symbolCurrencies('de30_eur'), ['EUR']);
  assert.deepEqual(symbolCurrencies('WTICO_USD'), ['USD']);
  // الأزواج بشرطة سفلية كما كانت
  assert.deepEqual(symbolCurrencies('EUR_USD'), ['EUR', 'USD']);
  assert.deepEqual(symbolCurrencies('XAU_USD'), ['USD']);
  assert.deepEqual(symbolCurrencies('XAU_EUR'), ['USD', 'EUR']);
  assert.deepEqual(symbolCurrencies('BTC_USD'), ['USD']);
  assert.deepEqual(symbolCurrencies('USD_CNH'), ['USD', 'CNY']);
  // لاحقة ليست عملة تبقى لاحقة وسيط
  assert.deepEqual(symbolCurrencies('US30_ECN'), ['USD']);
  assert.deepEqual(symbolCurrencies('GER40_M'), ['EUR']);
}
console.log('newsRisk OANDA underscore selftest OK');

// كتابات وسيط كانت `[]` بلا تحذير (تدقيق 2026-09-25): لاحقتان بفاصل، كلمة نوع حساب ملاصقة، XBT
{
  const cases: [string, string[]][] = [
    ['NAS100.cash.m', ['USD']],
    ['NAS100_USD.m', ['USD']],
    ['EURUSD.m.x', ['EUR', 'USD']],
    ['EURUSDmini', ['EUR', 'USD']],
    ['EURUSD-mini', ['EUR', 'USD']],
    ['XAUUSDpro', ['USD']],
    ['GBPJPYecn', ['GBP', 'JPY']],
    ['US30raw', ['USD']],
    ['XBTUSD', ['USD']],
    ['XBTEUR', ['USD', 'EUR']],
    ['GER40.cash.x', ['EUR']],
  ];
  for (const [sym, want] of cases) assert.deepEqual(symbolCurrencies(sym), want, sym);
  // ما كان يعمل لا يتغيّر
  assert.deepEqual(symbolCurrencies('EURUSD'), ['EUR', 'USD']);
  assert.deepEqual(symbolCurrencies('EURUSDmicro'), ['EUR', 'USD']);
  assert.deepEqual(symbolCurrencies('JP225_USD'), ['JPY', 'USD']);
  // المجهول يبقى مجهولاً — لا تخمين من التقشير
  assert.deepEqual(symbolCurrencies('AAPL.US'), []);
  assert.deepEqual(symbolCurrencies('AAPL.US.m'), []);
  assert.deepEqual(symbolCurrencies('ETHBTC'), []);
  assert.deepEqual(symbolCurrencies('MINI'), []);
  assert.deepEqual(symbolCurrencies('.m'), []);
  assert.deepEqual(symbolCurrencies(''), []);
}
console.log('newsRisk broker spellings selftest OK');

// ---- حرفٌ ملاصق واحد بعد الزوج، وأسماء ناسداك/S&P/داو أخرى ----
{
  assert.deepEqual(symbolCurrencies('EURUSDs'), ['EUR', 'USD']);
  assert.deepEqual(symbolCurrencies('EURUSDb'), ['EUR', 'USD']);
  assert.deepEqual(symbolCurrencies('GBPJPYz'), ['GBP', 'JPY']);
  assert.deepEqual(symbolCurrencies('XAUUSDr'), ['USD']);
  assert.deepEqual(symbolCurrencies('XAUUSDs'), ['USD']);
  assert.deepEqual(symbolCurrencies('XAUEURs'), ['USD', 'EUR']);
  for (const n of ['NQ100', 'USTECH', 'USA500', 'USA30', 'USA100', 'USTECH.cash', 'USTECHm']) {
    assert.deepEqual(symbolCurrencies(n), ['USD'], n);
  }
  // ما لا يكون زوجاً معروفاً بعد إسقاط الحرف يبقى بلا عملة (لا تخمين)
  assert.deepEqual(symbolCurrencies('ABCDEFG'), []);
  assert.deepEqual(symbolCurrencies('BTCETHX'), []);
  // اسم مؤشر بحرف ملاصق غير m/c يبقى مرفوضاً (قد يكون أداة أخرى)
  assert.deepEqual(symbolCurrencies('US30X'), []);
}
console.log('newsRisk glued letter selftest OK');

{
  // WTI باسم «CL-OIL»: «-OIL» ليست لاحقة وسيط
  for (const n of ['CL-OIL', 'CL_OIL', 'CL.OIL', 'CLOIL', 'cl-oil', 'CL-OIL.m', '#CL-OIL']) {
    assert.deepEqual(symbolCurrencies(n), ['USD'], n);
  }
  // «CL» وحده ليس اسماً معروفاً
  assert.deepEqual(symbolCurrencies('CL'), []);
}
console.log('newsRisk CL-OIL selftest OK');

// مؤشرات بأسماء وسطاء أخرى كانت بلا تحذير — بعملة تسعيرها، ومع لواحق الوسيط
{
  const want: Record<string, string> = {
    ITA40: 'EUR', STOXX50E: 'EUR', NL25: 'EUR', AEX: 'EUR',
    SUI20: 'CHF', CH20: 'CHF', SWISS20: 'CHF',
    N225: 'JPY', NI225: 'JPY', NIK225: 'JPY',
    HK33: 'HKD', CAN60: 'CAD', CA60: 'CAD', SA40: 'ZAR', SWE30: 'SEK', NOR25: 'NOK',
  };
  for (const [sym, ccy] of Object.entries(want)) {
    assert.deepEqual(symbolCurrencies(sym), [ccy], sym);
    assert.deepEqual(symbolCurrencies(`${sym}.cash`), [ccy], `${sym}.cash`);
    assert.deepEqual(symbolCurrencies(sym.toLowerCase()), [ccy], sym.toLowerCase());
  }
  // الأسهم المفردة والأسماء المجهولة كما كانت
  assert.deepEqual(symbolCurrencies('TSLA'), []);
  assert.deepEqual(symbolCurrencies('HUN50'), []);
  assert.deepEqual(symbolCurrencies('N22'), []);
}
console.log('newsRisk more index names selftest OK');

// سلّة الدولار (FXCM)، النفط بأسماء أخرى، الغاز، عوائد السندات الأمريكية — كانت `[]`
{
  for (const n of ['USDOLLAR', 'USOUSD', 'UKOUSD', 'NATURALGAS', 'US10Y', 'UST10Y', 'US10YR', 'US02Y', 'US2Y', 'UST02Y', 'US30Y', 'UST30Y']) {
    assert.deepEqual(symbolCurrencies(n), ['USD'], n);
    assert.deepEqual(symbolCurrencies(`${n}.cash`), ['USD'], `${n}.cash`);
    assert.deepEqual(symbolCurrencies(`${n}m`), ['USD'], `${n}m`);
    assert.deepEqual(symbolCurrencies(n.toLowerCase()), ['USD'], n.toLowerCase());
  }
  assert.deepEqual(symbolCurrencies('US10'), []);
  assert.deepEqual(symbolCurrencies('COCOA'), []);
}
console.log('newsRisk dollar basket / treasuries selftest OK');

// ---- عملات رقمية أخرى لدى وسطاء التجزئة: كانت [] بلا تحذير قبل CPI، وتُغلق السبت كأنها فوركس ----
{
  const { isForexMarketOpen } = require('./marketHours') as typeof import('./marketHours');
  for (const s of ['PEPEUSD', 'SHIBUSD', 'TONUSD', 'NEARUSD', 'MATICUSD', 'XMRUSD', 'TRUMPUSD', 'BABYDOGEUSD', 'SHIBUSDm', 'PEPEUSD.c', 'TON/USDT', 'SUIUSDT']) {
    assert.deepEqual(symbolCurrencies(s), ['USD'], s);
    assert.equal(isCryptoSymbol(s), true, s);
  }
  assert.deepEqual(symbolCurrencies('SHIBEUR'), ['USD', 'EUR']);
  // السبت 2026-09-26 12:00Z: الفوركس مغلق، الكريبتو مفتوح
  const sat = new Date(Date.UTC(2026, 8, 26, 12));
  assert.equal(isForexMarketOpen('PEPEUSD', sat), true);
  assert.equal(isForexMarketOpen('EURUSD', sat), false);
  // لا زوج فوركس/معدن ولا اسم مؤشر يُقرأ رقمياً بسبب القائمة الأطول
  const F = 'USD EUR GBP JPY AUD NZD CAD CHF CNH SEK NOK DKK PLN TRY ZAR MXN SGD HKD HUF CZK THB XAU XAG XPT XPD'.split(' ');
  for (const a of F) for (const b of F) if (a !== b) assert.equal(isCryptoSymbol(a + b), false, a + b);
  for (const s of ['US30', 'NAS100', 'SUI20', 'UK100', 'USOIL', 'DXY', 'AAPL', 'COPPER', 'OPEC']) assert.equal(isCryptoSymbol(s), false, s);
  // رقميّة مقابل رقميّة ما زالت []
  assert.deepEqual(symbolCurrencies('PEPEBTC'), []);
}
console.log('newsRisk more coins selftest OK');

// صفقات مفتوحة: الرواتب الأمريكية بعد 20د تُذكر على EURUSD وXAUUSD.m لا على EURGBP (openPositionsNewsRisk)
{
  const now = 1_800_000_000_000;
  const ev = (id: string, currency: string, minutes: number, impact = 'High'): NewsEvent => ({
    id, title: id, currency, impact, ts: (now + minutes * 60_000) / 1000,
  });
  const nfp = ev('NFP', 'USD', 20);
  const open = ['EURUSD', 'eurgbp', 'XAUUSD.m', 'eurusd ', 'NAS100'];
  const r = openPositionsNewsRisk(open, [nfp], now)!;
  assert.equal(r.event.id, 'NFP');
  assert.equal(r.deltaMs, 20 * 60_000);
  // مكرّر بحالة أحرف أخرى يُذكر مرّة؛ الرمز كما كُتب
  assert.deepEqual(r.symbols, ['EURUSD', 'XAUUSD.m', 'NAS100']);
  assert.deepEqual(r.currencies, ['EUR', 'USD', 'GBP']);
  // خبر إسترليني: EURGBP وحدها
  assert.deepEqual(openPositionsNewsRisk(open, [ev('BoE', 'GBP', 30)], now)!.symbols, ['eurgbp']);
  // ما كان: الشريط يُحسب لرمز النموذج وحده — بلا رمز مكتوب لا شيء، وصفقات مفتوحة على الدولار قبل الرواتب بلا سطر
  assert.equal(nextHighImpact([nfp], symbolCurrencies(''), now), null);
  // خبرٌ آخر بالدقيقة نفسها لعملة الساق الأخرى يضمّ رموزه (USD + GBP ⇒ EURGBP أيضاً)
  const both = openPositionsNewsRisk(open, [nfp, ev('GDP', 'GBP', 20)], now)!;
  assert.deepEqual(both.symbols, ['EURUSD', 'eurgbp', 'XAUUSD.m', 'NAS100']);
  // لا صفقات، رموز بلا عملات، حدث متوسّط التأثير، بعيد (>3س)، مثال ⇒ null
  assert.equal(openPositionsNewsRisk([], [nfp], now), null);
  assert.equal(openPositionsNewsRisk(['AAPL', '  '], [nfp], now), null);
  assert.equal(openPositionsNewsRisk(open, [ev('x', 'USD', 20, 'Medium')], now), null);
  assert.equal(openPositionsNewsRisk(open, [ev('far', 'USD', 4 * 60)], now), null);
  assert.equal(openPositionsNewsRisk(open, [{ ...nfp, sample: true }], now), null);
  // الأقرب بقاعدة الشريط نفسها
  assert.equal(openPositionsNewsRisk(open, [ev('ECB', 'EUR', 90), nfp], now)!.event.id, 'NFP');
}
console.log('newsRisk open positions selftest OK');
// QA38: شريط المفتوحة لا يكرّر شريطاً ظاهراً يعلن اللحظة نفسها (shownSymbol)
{
  const now = 1_800_000_000_000;
  const ev = (id: string, currency: string, minutes: number): NewsEvent => ({
    id, title: id, currency, impact: 'High', ts: (now + minutes * 60_000) / 1000,
  });
  const nfp = ev('NFP', 'USD', 20);
  const open = ['EURUSD', 'XAUUSD.m'];
  // نموذج/شارت EURUSD يعلن الرواتب ⇒ لا شريط ثانٍ
  assert.equal(openPositionsNewsRisk(open, [nfp], now, 'EURUSD'), null);
  assert.equal(openPositionsNewsRisk(open, [nfp], now, ' usdjpy '), null);
  // بلا رمز ظاهر، أو رمزه بلا خبر (EURGBP لا دولار)، أو غير معروف ⇒ يبقى
  assert.equal(openPositionsNewsRisk(open, [nfp], now, '')!.event.id, 'NFP');
  assert.equal(openPositionsNewsRisk(open, [nfp], now, 'EURGBP')!.event.id, 'NFP');
  assert.equal(openPositionsNewsRisk(open, [nfp], now, 'AAPL')!.event.id, 'NFP');
  // خبر آخر أقرب لعملات المفتوحة (ين قبل الرواتب) والشارت EURUSD يعلن الرواتب ⇒ يبقى
  const jp = openPositionsNewsRisk(['GBPJPY', 'EURUSD'], [nfp, ev('BoJ', 'JPY', 10)], now, 'EURUSD')!;
  assert.equal(jp.event.id, 'BoJ');
  // GDP إسترليني مع الرواتب يحرّك EURGBP المفتوحة، وشريط EURUSD لا يذكر GBP ⇒ يبقى
  const both = openPositionsNewsRisk(['EURUSD', 'EURGBP'], [nfp, ev('GDP', 'GBP', 20)], now, 'EURUSD')!;
  assert.deepEqual(both.symbols, ['EURUSD', 'EURGBP']);
  // وشريط GBPUSD يذكر العملتين ⇒ لا تكرار
  assert.equal(openPositionsNewsRisk(['EURUSD', 'EURGBP'], [nfp, ev('GDP', 'GBP', 20)], now, 'GBPUSD'), null);
}
console.log('newsRisk open positions shownSymbol selftest OK');

// cryptoPairOf — الزوج الرقمي بلا لاحقة الوسيط (سعر السوق ومفتاح الأداة بالدفتر)
{
  const { cryptoPairOf } = require('./newsRisk') as typeof import('./newsRisk');
  for (const s of ['BTCUSD', 'BTCUSDm', 'BTCUSD.m', 'btc/usd', 'BTCUSD#', 'BTC_USD.m', ' BTCUSD.cash '])
    assert.equal(cryptoPairOf(s), 'BTCUSD', s);
  assert.equal(cryptoPairOf('ETHUSD.m'), 'ETHUSD');
  assert.equal(cryptoPairOf('XRPUSDM'), 'XRPUSD');
  // عملات مستقرّة: USDC/USDT ليست لاحقة
  assert.equal(cryptoPairOf('BTCUSDT'), 'BTCUSDT');
  assert.equal(cryptoPairOf('BTCUSDC'), 'BTCUSDC');
  assert.equal(cryptoPairOf('BTCUSDT.m'), 'BTCUSDT');
  // ليست رقمية
  for (const s of ['EURUSD', 'EURUSDm', 'XAUUSD', 'US30', 'AAPL.US', '', 'BTC'])
    assert.equal(cryptoPairOf(s), null, s);
}
console.log('newsRisk cryptoPairOf selftest OK');

{
  // عطلة بنوك (backend-r3: impact "holiday") — عيد الشكر 2026-11-26 00:00 نيويورك = 05:00 UTC
  const ts = Date.UTC(2026, 10, 26, 5) / 1000;
  const ev = (o: Partial<NewsEvent>): NewsEvent => ({ id: 'h', title: 'Bank Holiday', currency: 'USD', impact: 'holiday', ts, ...o });
  const at = (h: number) => ts * 1000 + h * 3_600_000;
  const usd = [ev({ title: 'Thanksgiving' })];
  assert.deepEqual(bankHolidayToday(usd, ['EUR', 'USD'], at(10)), { currencies: ['USD'], titles: ['Thanksgiving'] });
  // الحدّان: من منتصف الليل حتى ما قبل التالي
  assert.ok(bankHolidayToday(usd, ['USD'], at(0)));
  assert.equal(bankHolidayToday(usd, ['USD'], ts * 1000 + HOLIDAY_SPAN_MS - 1) != null, true);
  assert.equal(bankHolidayToday(usd, ['USD'], ts * 1000 + HOLIDAY_SPAN_MS), null);
  assert.equal(bankHolidayToday(usd, ['USD'], at(-0.01)), null);
  // عملة خارج الزوج، أمثلة، بلا وقت، تأثير آخر (low القديم) ⇒ لا شيء
  assert.equal(bankHolidayToday(usd, ['EUR', 'GBP'], at(3)), null);
  assert.equal(bankHolidayToday([ev({ sample: true })], ['USD'], at(3)), null);
  assert.equal(bankHolidayToday([ev({ ts: null })], ['USD'], at(3)), null);
  assert.equal(bankHolidayToday([ev({ impact: 'low' })], ['USD'], at(3)), null);
  assert.equal(bankHolidayToday([ev({ impact: 'high' })], ['USD'], at(3)), null);
  assert.ok(bankHolidayToday([ev({ impact: 'Holiday', currency: 'usd' })], ['USD'], at(3)));
  // عملتان بترتيب الزوج، وعطلتان لعملة واحدة = سطرٌ واحد
  const both = [ev({ currency: 'JPY', title: 'Culture Day' }), ev({ title: 'Thanksgiving' }), ev({ currency: 'JPY', title: 'Bank Holiday' })];
  assert.deepEqual(bankHolidayToday(both, ['USD', 'JPY'], at(2)), { currencies: ['USD', 'JPY'], titles: ['Thanksgiving', 'Culture Day'] });
  // بلا عنوان: العملة تبقى
  assert.deepEqual(bankHolidayToday([ev({ title: '' })], ['USD'], at(2)), { currencies: ['USD'], titles: [] });
  assert.equal(bankHolidayToday(usd, [], at(2)), null);
}
console.log('newsRisk bankHolidayToday selftest OK');

{
  // يوم العطلة بتوقيت بلد العملة — ForexFactory يؤرّخ كلها بمنتصف ليل نيويورك
  const { holidayDayStartMs, holidayZoneOffsetH } = require('./newsRisk') as typeof import('./newsRisk');
  const U = (m: number, d: number, h = 0, y = 2026) => Date.UTC(y, m, d, h);
  // عيد الثقافة الياباني الثلاثاء 2026-11-03 = 05:00 UTC بالخادم؛ اليوم بطوكيو من 11-02 15:00 UTC
  const culture: NewsEvent = { id: 'c', title: 'Culture Day', currency: 'JPY', impact: 'holiday', ts: U(10, 3, 5) / 1000 };
  assert.equal(holidayDayStartMs('JPY', culture.ts as number), U(10, 2, 15));
  assert.ok(bankHolidayToday([culture], ['USD', 'JPY'], U(10, 3, 1)), 'Tokyo 10:00 on the holiday');
  assert.ok(bankHolidayToday([culture], ['USD', 'JPY'], U(10, 2, 15)), 'Tokyo midnight');
  assert.equal(bankHolidayToday([culture], ['USD', 'JPY'], U(10, 2, 15) - 1), null);
  assert.equal(bankHolidayToday([culture], ['USD', 'JPY'], U(10, 3, 15) - 1) != null, true);
  assert.equal(bankHolidayToday([culture], ['USD', 'JPY'], U(10, 3, 15)), null, 'Tokyo Wednesday open again');
  assert.equal(bankHolidayToday([culture], ['USD', 'JPY'], U(10, 4, 1)), null, 'no false line next morning');
  // صيف نيويورك (4 يوليو يُحتفل 07-03 2026، 04:00 UTC) كما كان
  assert.equal(holidayDayStartMs('USD', U(6, 3, 4) / 1000), U(6, 3, 4));
  // الشكر شتاءً كما كان
  assert.equal(holidayDayStartMs('USD', U(10, 26, 5) / 1000), U(10, 26, 5));
  // سيدني صيفاً (+11): يوم أستراليا 01-26 ⇒ 01-25 13:00 UTC؛ شتاءً (+10): 06-08 ⇒ 06-07 14:00
  assert.equal(holidayDayStartMs('AUD', U(0, 26, 5) / 1000), U(0, 25, 13));
  assert.equal(holidayDayStartMs('AUD', U(5, 8, 4) / 1000), U(5, 7, 14));
  // ويلنغتون صيفاً (+13): Waitangi 02-06 ⇒ 02-05 11:00
  assert.equal(holidayDayStartMs('NZD', U(1, 6, 5) / 1000), U(1, 5, 11));
  // لندن صيفاً (+1): 08-31 ⇒ 08-30 23:00؛ فرانكفورت شتاءً (+1): 12-25 ⇒ 12-24 23:00؛ زيورخ صيفاً (+2)
  assert.equal(holidayDayStartMs('GBP', U(7, 31, 4) / 1000), U(7, 30, 23));
  assert.equal(holidayDayStartMs('EUR', U(11, 25, 5) / 1000), U(11, 24, 23));
  assert.equal(holidayDayStartMs('CHF', U(7, 1, 4) / 1000), U(6, 31, 22));
  // عملة بلا منطقة معروفة ⇒ ts كما هو
  assert.equal(holidayDayStartMs('ZAR', U(2, 21, 4) / 1000), U(2, 21, 4));
  // أيام التحويل (2026): نيويورك 03-08 يبدأ شتوياً، 03-09 صيفياً؛ 11-01 يبدأ صيفياً، 11-02 شتوياً
  assert.equal(holidayZoneOffsetH('USD', U(2, 8)), -5);
  assert.equal(holidayZoneOffsetH('USD', U(2, 9)), -4);
  assert.equal(holidayZoneOffsetH('USD', U(10, 1)), -4);
  assert.equal(holidayZoneOffsetH('USD', U(10, 2)), -5);
  // لندن: 03-29 شتوي، 03-30 صيفي؛ 10-25 صيفي، 10-26 شتوي
  assert.equal(holidayZoneOffsetH('GBP', U(2, 29)), 0);
  assert.equal(holidayZoneOffsetH('GBP', U(2, 30)), 1);
  assert.equal(holidayZoneOffsetH('GBP', U(9, 25)), 1);
  assert.equal(holidayZoneOffsetH('GBP', U(9, 26)), 0);
  // سيدني: 04-05 صيفي (يبدأ قبل التحويل)، 04-06 شتوي؛ 10-04 شتوي، 10-05 صيفي
  assert.equal(holidayZoneOffsetH('AUD', U(3, 5)), 11);
  assert.equal(holidayZoneOffsetH('AUD', U(3, 6)), 10);
  assert.equal(holidayZoneOffsetH('AUD', U(9, 4)), 10);
  assert.equal(holidayZoneOffsetH('AUD', U(9, 5)), 11);
  // ويلنغتون: 09-27 شتوي، 09-28 صيفي
  assert.equal(holidayZoneOffsetH('NZD', U(8, 27)), 12);
  assert.equal(holidayZoneOffsetH('NZD', U(8, 28)), 13);
  assert.equal(holidayZoneOffsetH('SEK', U(0, 1)), null);
}
console.log('newsRisk holiday local day selftest OK');

{
  // لواحق وسطاء كانت `[]` (لا تحذير ولا «التقويم غير متاح»)
  const { symbolCurrencies: sc } = require('./newsRisk') as typeof import('./newsRisk');
  assert.deepEqual(sc('XAUUSDspot'), ['USD']);
  assert.deepEqual(sc('GOLDspot'), ['USD']);
  assert.deepEqual(sc('XAUUSD.spot'), ['USD']);
  assert.deepEqual(sc('EURUSD.proecn'), ['EUR', 'USD']);
  assert.deepEqual(sc('EURUSD.stdacc'), ['EUR', 'USD']);
  assert.deepEqual(sc('GBPJPY-standard'), ['GBP', 'JPY']);
  assert.deepEqual(sc('US30Roll'), ['USD']);
  assert.deepEqual(sc('GER40Roll'), ['EUR']);
  assert.deepEqual(sc('US30.rolling'), ['USD']);
  // ما كان يعمل يبقى، وما ليس معروفاً يبقى []
  assert.deepEqual(sc('EURUSD.pro'), ['EUR', 'USD']);
  assert.deepEqual(sc('NAS100_USD.m'), ['USD']);
  assert.deepEqual(sc('AAPL.US'), []);
  assert.deepEqual(sc('AAPL.nasdaq'), []);
  assert.deepEqual(sc('TSLAspot'), []);
}
console.log('newsRisk long/spot/roll suffix selftest OK');

// أخبار بلا ساعة معلنة (Tentative/طوال اليوم): ForexFactory يضعها عند منتصف ليل نيويورك — لا عدّ تنازلي كاذب
{
  const { newsTimeUnannounced, unannouncedHighImpactToday, UNANNOUNCED_SPAN_MS, NEWS_HORIZON_MS } =
    require('./newsRisk') as typeof import('./newsRisk');
  // 2026-09-25 00:00 نيويورك (EDT) = 04:00 UTC؛ 2026-12-10 00:00 (EST) = 05:00 UTC
  const edt = Date.UTC(2026, 8, 25, 4) / 1000;
  const est = Date.UTC(2026, 11, 10, 5) / 1000;
  const boj: NewsEvent = { id: 'b', title: 'BOJ Policy Rate', currency: 'JPY', impact: 'High', ts: edt };
  assert.equal(newsTimeUnannounced(boj), true);
  assert.equal(newsTimeUnannounced({ ...boj, ts: est }), true);
  // الساعة الصيفية/الشتوية الأخرى ليست منتصف ليل نيويورك (05:00 UTC صيفاً = 01:00 نيويورك)
  assert.equal(newsTimeUnannounced({ ...boj, ts: edt + 3600 }), false);
  assert.equal(newsTimeUnannounced({ ...boj, ts: est - 3600 }), false);
  assert.equal(newsTimeUnannounced({ ...boj, ts: edt + 30 }), false);
  assert.equal(newsTimeUnannounced({ ...boj, ts: Date.UTC(2026, 8, 25, 12, 30) / 1000 }), false);
  assert.equal(newsTimeUnannounced({ ...boj, ts: Date.UTC(2026, 8, 25, 12, 30) / 1000, time_tbd: true }), true);
  assert.equal(newsTimeUnannounced({ ...boj, ts: null }), false);
  // كان: 02:00 UTC «بعد 2س»، 03:05 (بعد القرار) «بعد 55د» — الآن لا عدّ
  for (const h of [2, 3.08, 4.1]) assert.equal(nextHighImpact([boj], ['USD', 'JPY'], Date.UTC(2026, 8, 25, 0) + h * 3_600_000), null);
  // بل سطر «اليوم، الساعة غير معلنة» من ts − الأفق حتى نهاية يوم نيويورك
  const t0 = edt * 1000;
  assert.deepEqual(unannouncedHighImpactToday([boj], ['USD', 'JPY'], t0 - 2 * 3_600_000, NEWS_HORIZON_MS, 0), {
    currencies: ['JPY'],
    titles: ['BOJ Policy Rate'],
    tomorrow: false,
  });
  assert.ok(unannouncedHighImpactToday([boj], ['USD', 'JPY'], t0 - NEWS_HORIZON_MS));
  assert.equal(unannouncedHighImpactToday([boj], ['USD', 'JPY'], t0 - NEWS_HORIZON_MS - 1), null);
  assert.ok(unannouncedHighImpactToday([boj], ['JPY'], t0 + UNANNOUNCED_SPAN_MS - 1));
  assert.equal(unannouncedHighImpactToday([boj], ['JPY'], t0 + UNANNOUNCED_SPAN_MS), null);
  // عملة أخرى، أثر منخفض، أمثلة، حدث موقوت ⇒ لا شيء
  assert.equal(unannouncedHighImpactToday([boj], ['EUR', 'USD'], t0), null);
  assert.equal(unannouncedHighImpactToday([{ ...boj, impact: 'Low' }], ['JPY'], t0), null);
  assert.equal(unannouncedHighImpactToday([{ ...boj, sample: true }], ['JPY'], t0), null);
  assert.equal(unannouncedHighImpactToday([{ ...boj, ts: edt + 9 * 3600 }], ['JPY'], t0 + 3600), null);
  assert.equal(unannouncedHighImpactToday([boj], [], t0), null);
  // عملتان بترتيب الزوج، عنوان مكرّر مرّة واحدة
  const two = [boj, { ...boj, id: 'b2' }, { id: 'u', title: 'Bank Stress Test', currency: 'USD', impact: 'high', ts: edt }];
  assert.deepEqual(unannouncedHighImpactToday(two, ['USD', 'JPY'], t0, NEWS_HORIZON_MS, 0), {
    currencies: ['USD', 'JPY'],
    titles: ['BOJ Policy Rate', 'Bank Stress Test'],
    tomorrow: false,
  });
  // launch113: 3س قبل منتصف ليل نيويورك (01:00–04:00 UTC) — «غداً» بنيويورك (−240د) وسان فرانسيسكو (−420د)،
  // و«اليوم» بطوكيو (+540) ولندن (+60) والقاهرة (+180) حيث التاريخ صار 25 سبتمبر
  const pre = t0 - 2 * 3_600_000; // 02:00 UTC = 22:00 نيويورك 24 سبتمبر
  const tm = (off: number, at = pre) => unannouncedHighImpactToday([boj], ['JPY'], at, NEWS_HORIZON_MS, off)?.tomorrow;
  assert.equal(tm(-240), true);
  assert.equal(tm(-420), true);
  assert.equal(tm(540), false);
  assert.equal(tm(60), false);
  assert.equal(tm(180), false);
  // منتصف ليل نيويورك بالضبط ⇒ اليوم؛ قبله بدقيقة ⇒ غداً
  assert.equal(tm(-240, t0), false);
  assert.equal(tm(-240, t0 - 60_000), true);
  // بعد بدء اليوم الحدث «اليوم» بكل مكان حتى نهاية الشريط (بطوكيو صار 26 سبتمبر — ليس «غداً»)
  assert.equal(tm(540, t0 + UNANNOUNCED_SPAN_MS - 1), false);
  // سان فرانسيسكو عند 01:00 نيويورك ما زالت 22:00 يوم 24 ⇒ غداً؛ عند منتصف ليلها ⇒ اليوم
  assert.equal(tm(-420, t0 + 3_600_000), true);
  assert.equal(tm(-420, t0 + 3 * 3_600_000), false);
  // حدث اليوم وحدث الغد معاً ⇒ «اليوم»
  const nextDay = { ...boj, id: 'b3', title: 'BOJ Outlook', ts: edt + 86_400 };
  assert.equal(
    unannouncedHighImpactToday([boj, nextDay], ['JPY'], t0 + UNANNOUNCED_SPAN_MS - 3_600_000, NEWS_HORIZON_MS, -240)?.tomorrow,
    false
  );
  assert.equal(
    unannouncedHighImpactToday([nextDay], ['JPY'], t0 + UNANNOUNCED_SPAN_MS - 3_600_000, NEWS_HORIZON_MS, -240)?.tomorrow,
    true
  );
  // الخبر الموقوت لا يتأثّر: رواتب 12:30 UTC بجانب حدث بلا ساعة
  const nfp: NewsEvent = { id: 'n', title: 'NFP', currency: 'USD', impact: 'High', ts: Date.UTC(2026, 8, 25, 12, 30) / 1000 };
  assert.equal(nextHighImpact([boj, nfp], ['USD', 'JPY'], Date.UTC(2026, 8, 25, 11))?.event.id, 'n');
}
console.log('newsRisk unannounced time selftest OK');

{
  // المعدن باسمه + عملة التسعير، ومؤشرٌ بفاصل أو بعملة ملاصقة — كانت كلها `[]` (ذهب/داو قبل الرواتب بلا تحذير)
  const { symbolCurrencies: sc } = require('./newsRisk') as typeof import('./newsRisk');
  assert.deepEqual(sc('GOLDUSD'), ['USD']);
  assert.deepEqual(sc('GOLDEUR'), ['USD', 'EUR']);
  assert.deepEqual(sc('SILVERUSD'), ['USD']);
  assert.deepEqual(sc('GOLDUSD.m'), ['USD']);
  assert.deepEqual(sc('US-30'), ['USD']);
  assert.deepEqual(sc('US_30'), ['USD']);
  assert.deepEqual(sc('GER_40'), ['EUR']);
  assert.deepEqual(sc('US500USD'), ['USD']);
  assert.deepEqual(sc('GER40EUR'), ['EUR']);
  assert.deepEqual(sc('JP225USD'), ['JPY', 'USD']);
  // ليست عملة/مؤشراً معروفاً ⇒ تبقى [] (لا تخمين)
  assert.deepEqual(sc('GOLDXYZ'), []);
  assert.deepEqual(sc('AB-12'), []);
  assert.deepEqual(sc('ZZ99USD'), []);
}
console.log('newsRisk metal-name and index spelling selftest OK');

// ——— النفط/الذهب بأسماء أخرى و«fx» الملاصقة: كانت `[]` فلا تحذير قبل الرواتب ———
{
  const { symbolCurrencies: sc, nextHighImpact: nhi } = require('./newsRisk') as typeof import('./newsRisk');
  for (const s of ['WTIUSD', 'BRENTUSD', 'OILUSD', 'CRUDEOIL', 'USCRUDE', 'SPOTGOLD', 'SPOTSILVER', 'XAU', 'XAG', 'wtiusd.m', 'XAU#']) {
    assert.deepEqual(sc(s), ['USD'], s);
  }
  assert.deepEqual(sc('EURUSDfx'), ['EUR', 'USD']);
  assert.deepEqual(sc('GBPJPYfx'), ['GBP', 'JPY']);
  // الرواتب بعد 30 دقيقة ⇒ WTIUSD يُحذَّر (كان null)
  const at = Date.UTC(2026, 8, 4, 12, 30);
  const nfp = { id: 'nfp', title: 'Non-Farm Payrolls', currency: 'USD', impact: 'High', ts: at / 1000 };
  assert.notEqual(nhi([nfp], sc('WTIUSD'), at - 30 * 60_000), null);
  // المجهول يبقى بلا تخمين
  assert.deepEqual(sc('XAUXYZ'), []);
  assert.deepEqual(sc('ABCFX'), []);
}
console.log('newsRisk oil/gold aliases and fx suffix selftest OK');

// مؤشر غير دولاري: خبر الدولار يُحذَّر له كذلك (الرواتب تحرّك الداكس والنيكاي)، والعطلة الأمريكية لا
{
  assert.deepEqual(newsCurrencies('GER40'), ['EUR', 'USD']);
  assert.deepEqual(newsCurrencies('JP225Cash'), ['JPY', 'USD']);
  assert.deepEqual(newsCurrencies('UK100m'), ['GBP', 'USD']);
  assert.deepEqual(newsCurrencies('JP225_USD'), ['JPY', 'USD']);
  assert.deepEqual(newsCurrencies('DE30_EUR'), ['EUR', 'USD']);
  // ما عداها كما كان
  for (const sym of ['EURUSD', 'XAUUSD', 'XAUEUR', 'NAS100', 'USOIL', 'BTCUSD', 'EURGBP', 'AAPL', '']) {
    assert.deepEqual(newsCurrencies(sym), symbolCurrencies(sym), sym);
  }
  const now = 1_800_000_000_000;
  const nfp = { id: 'nfp', title: 'NFP', currency: 'USD', impact: 'high', ts: 1_800_000_600 };
  assert.equal(nextHighImpact([nfp], symbolCurrencies('GER40'), now), null);
  assert.equal(nextHighImpact([nfp], newsCurrencies('GER40'), now)?.event.id, 'nfp');
  // صفقة داكس مفتوحة: الرواتب تُذكر لها، وUSDJPY بجانبها
  assert.deepEqual(openPositionsNewsRisk(['GER40', 'USDJPY'], [nfp], now)!.symbols, ['GER40', 'USDJPY']);
  assert.deepEqual(openPositionsNewsRisk(['GER40'], [nfp], now)!.symbols, ['GER40']);
  // والمركزي الأوروبي لا يذكر USDJPY
  const ecb = { id: 'ecb', title: 'ECB', currency: 'EUR', impact: 'high', ts: 1_800_000_300 };
  assert.deepEqual(openPositionsNewsRisk(['GER40', 'USDJPY'], [ecb], now)!.symbols, ['GER40']);
  // عطلة أمريكية: عملات العطلة للداكس اليورو وحده (الشريط يمرّر `symbolCurrencies`)
  const july4 = Date.UTC(2027, 6, 5, 12);
  const hol = { id: 'h', title: 'Independence Day', currency: 'USD', impact: 'holiday', ts: Date.UTC(2027, 6, 5, 4) / 1000 };
  assert.equal(bankHolidayToday([hol], symbolCurrencies('GER40'), july4), null);
}
console.log('newsRisk newsCurrencies selftest OK');

// «sb» ملاصقة (حساب مراهنة على الفروق): كانت `[]` ⇒ لا تحذير قبل الرواتب، و«EURUSD.sb» تُحذَّر
assert.deepEqual(symbolCurrencies('EURUSDsb'), ['EUR', 'USD']);
assert.deepEqual(symbolCurrencies('EURUSD.sb'), ['EUR', 'USD']);
assert.deepEqual(symbolCurrencies('XAUUSDsb'), ['USD']);
assert.deepEqual(symbolCurrencies('GBPJPYsb'), ['GBP', 'JPY']);
assert.deepEqual(symbolCurrencies('AAPL'), []);
console.log('newsRisk glued sb suffix selftest OK');
