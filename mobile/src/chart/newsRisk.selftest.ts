/**
 * Self-test for newsRisk (pure).
 * Run: npx --yes tsx src/chart/newsRisk.selftest.ts
 */
import assert from 'node:assert/strict';
import { newsCountdown, nextHighImpact, symbolCurrencies, type NewsEvent } from './newsRisk';
import { instrumentSpec } from '../positionSize';

assert.deepEqual(symbolCurrencies('EURUSD'), ['EUR', 'USD']);
assert.deepEqual(symbolCurrencies('gbpjpy'), ['GBP', 'JPY']);
assert.deepEqual(symbolCurrencies('XAUUSD'), ['USD']);
assert.deepEqual(symbolCurrencies('DXY'), ['USD']);
assert.deepEqual(symbolCurrencies('USDCNH'), ['USD', 'CNY']);
assert.deepEqual(symbolCurrencies('EUR/USD'), ['EUR', 'USD']);
assert.deepEqual(symbolCurrencies('BTCUSD'), []);
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
assert.deepEqual(symbolCurrencies('silver'), ['USD']);
assert.deepEqual(symbolCurrencies('USOIL'), ['USD']);
// لاحقة الوسيط بفاصل تسقط؛ الملاصقة بلا فاصل لا تُخمَّن
assert.deepEqual(symbolCurrencies('US30.cash'), ['USD']);
assert.deepEqual(symbolCurrencies('NAS100-ECN'), ['USD']);
assert.deepEqual(symbolCurrencies('USOIL.m'), ['USD']);
assert.deepEqual(symbolCurrencies('GOLD#'), ['USD']);
assert.deepEqual(symbolCurrencies(' ger40.pro '), ['EUR']);
assert.deepEqual(symbolCurrencies('US30M'), []);
assert.deepEqual(symbolCurrencies('NAS1000'), []);
assert.deepEqual(symbolCurrencies('US'), []);
assert.deepEqual(symbolCurrencies('ETHUSD'), []);
assert.deepEqual(symbolCurrencies('AAPL'), []);
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
