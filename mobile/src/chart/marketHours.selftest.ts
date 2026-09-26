/**
 * Self-test for marketHours (pure).
 * Run: npx --yes tsx src/chart/marketHours.selftest.ts
 */
import assert from 'node:assert/strict';
import { forexTimeBeforeTrading, forexTradingSecBetween, isForexHolidaySession, isForexMarketOpen, projectBarTimeSec } from './marketHours';

const at = (y: number, mo: number, d: number, h: number, mi = 0) => new Date(Date.UTC(y, mo, d, h, mi));

// الخميس 2025-12-25 (شتاءً: 17:00 نيويورك = 22:00 UTC): مغلق من 24 ديسمبر 22:00 حتى 25 ديسمبر 22:00.
assert.equal(isForexMarketOpen('EURUSD', at(2025, 11, 24, 21, 59)), true);
assert.equal(isForexMarketOpen('EURUSD', at(2025, 11, 24, 22, 0)), false);
assert.equal(isForexMarketOpen('EURUSD', at(2025, 11, 25, 12)), false);
assert.equal(isForexMarketOpen('EURUSD', at(2025, 11, 25, 22, 0)), true);
// رأس السنة الخميس 2026-01-01
assert.equal(isForexMarketOpen('XAUUSD', at(2025, 11, 31, 23)), false);
assert.equal(isForexMarketOpen('XAUUSD', at(2026, 0, 1, 21, 59)), false);
assert.equal(isForexMarketOpen('XAUUSD', at(2026, 0, 1, 22, 0)), false); // الذهب: بعد العطلة 18:00 نيويورك
assert.equal(isForexMarketOpen('XAUUSD', at(2026, 0, 1, 23, 0)), true);
assert.equal(isForexMarketOpen('EURUSD', at(2026, 0, 1, 22, 0)), true);
// ICE — مؤشر الدولار: كسر 17:00–20:00 نيويورك (صيفاً 21:00–00:00 UTC، شتاءً 22:00–01:00 UTC)
assert.equal(isForexMarketOpen('DXY', at(2026, 6, 15, 20, 59)), true);
assert.equal(isForexMarketOpen('DXY', at(2026, 6, 15, 21, 0)), false);
assert.equal(isForexMarketOpen('DXY', at(2026, 6, 15, 23, 59)), false);
assert.equal(isForexMarketOpen('DXY', at(2026, 6, 16, 0, 0)), true);
assert.equal(isForexMarketOpen('USDX', at(2026, 0, 15, 0, 30)), false); // شتاءً يعبر منتصف ليل UTC
assert.equal(isForexMarketOpen('DXY', at(2026, 0, 15, 1, 0)), true);
assert.equal(isForexMarketOpen('DXY', at(2026, 6, 19, 23)), false); // الأحد: يفتح 20:00 نيويورك
assert.equal(isForexMarketOpen('DXY', at(2026, 6, 20, 0, 0)), true);
assert.equal(isForexMarketOpen('EURUSD', at(2026, 6, 15, 21, 30)), true); // العملات بلا كسر
// ICE — برنت: كسر 23:00–01:00 لندن (صيفاً 22:00–00:00 UTC، شتاءً 23:00–01:00 UTC)
assert.equal(isForexMarketOpen('UKOIL', at(2026, 6, 15, 21, 59)), true);
assert.equal(isForexMarketOpen('UKOIL', at(2026, 6, 15, 22, 0)), false);
assert.equal(isForexMarketOpen('UKOIL', at(2026, 6, 16, 0, 0)), true);
assert.equal(isForexMarketOpen('UKOIL', at(2026, 0, 15, 22, 59)), true);
assert.equal(isForexMarketOpen('UKOIL', at(2026, 0, 16, 0, 30)), false);
assert.equal(isForexMarketOpen('UKOIL', at(2026, 0, 16, 1, 0)), true);
assert.equal(isForexMarketOpen('UKOIL', at(2026, 6, 19, 21, 30)), false); // الأحد قبل 23:00 لندن
assert.equal(isForexMarketOpen('UKOIL', at(2026, 6, 19, 22, 0)), true); // الأحد 23:00 لندن: الافتتاح لا كسر
assert.equal(isForexMarketOpen('UKOIL', at(2026, 6, 19, 23, 30)), true);
assert.equal(isForexMarketOpen('UKOIL', at(2026, 0, 18, 23, 30)), true); // شتاءً الأحد 23:30 لندن
assert.equal(isForexMarketOpen('USOIL', at(2026, 6, 15, 22, 30)), true); // WTI (CME) كسرها 17:00–18:00 NY فقط
// الكريبتو لا تُغلق
assert.equal(isForexMarketOpen('BTCUSD', at(2025, 11, 25, 12)), true);
// يوم عادي
assert.equal(isForexMarketOpen('EURUSD', at(2026, 0, 14, 12)), true);
assert.equal(isForexHolidaySession(Date.UTC(2026, 0, 14, 12) / 1000), false);
// عطلة نهاية الأسبوع كما كانت
assert.equal(isForexMarketOpen('EURUSD', at(2026, 0, 17, 12)), false);
// صيفاً لا يتأثّر شيء (حدّ 21:00 UTC)
assert.equal(isForexMarketOpen('EURUSD', at(2026, 6, 15, 21, 30)), true);

// منطقة المستقبل تتخطّى عطلة نهاية الأسبوع
const s = (d: Date) => d.getTime() / 1000;
const H = 3600;
// الأربعاء: بلا تغيير
assert.equal(projectBarTimeSec('EURUSD', s(at(2026, 0, 14, 10)), H, 3), s(at(2026, 0, 14, 13)));
// الجمعة 2026-01-16 شتاءً (إغلاق 22:00 UTC): 20:00 +1 = 21:00، +2 = شمعة افتتاح الأحد 22:00
assert.equal(projectBarTimeSec('EURUSD', s(at(2026, 0, 16, 20)), H, 1), s(at(2026, 0, 16, 21)));
assert.equal(projectBarTimeSec('EURUSD', s(at(2026, 0, 16, 20)), H, 2), s(at(2026, 0, 18, 22)));
assert.equal(projectBarTimeSec('EURUSD', s(at(2026, 0, 16, 20)), H, 3), s(at(2026, 0, 18, 23)));
// 4 ساعات: شمعة 20:00 الأحد تحتوي الافتتاح 22:00
assert.equal(projectBarTimeSec('EURUSD', s(at(2026, 0, 16, 16)), 4 * H, 2), s(at(2026, 0, 18, 20)));
// صيفاً (إغلاق/افتتاح 21:00 UTC): الجمعة 2026-07-17
assert.equal(projectBarTimeSec('EURUSD', s(at(2026, 6, 17, 20)), H, 1), s(at(2026, 6, 19, 21)));
// اليومي: الجمعة +1 = الاثنين
assert.equal(projectBarTimeSec('EURUSD', s(at(2026, 0, 16, 0)), 86400, 1), s(at(2026, 0, 19, 0)));
assert.equal(projectBarTimeSec('EURUSD', s(at(2026, 0, 15, 0)), 86400, 3), s(at(2026, 0, 20, 0)));
// الكريبتو والأسبوعي كما كانا
assert.equal(projectBarTimeSec('BTCUSD', s(at(2026, 0, 16, 20)), H, 2), s(at(2026, 0, 16, 22)));
assert.equal(projectBarTimeSec('EURUSD', s(at(2026, 0, 12, 0)), 7 * 86400, 1), s(at(2026, 0, 19, 0)));
assert.equal(projectBarTimeSec('EURUSD', s(at(2026, 0, 16, 20)), H, 0), s(at(2026, 0, 16, 20)));

// كسر ICE بمنطقة المستقبل: DXY صيفاً 21:00–00:00 UTC، برنت 22:00–00:00 UTC — لا خانات شموع فيه
assert.equal(projectBarTimeSec('DXY', s(at(2026, 6, 15, 20)), H, 1), s(at(2026, 6, 16, 0)));
assert.equal(projectBarTimeSec('DXY', s(at(2026, 6, 15, 20)), H, 2), s(at(2026, 6, 16, 1)));
assert.equal(projectBarTimeSec('UKOIL', s(at(2026, 6, 15, 21)), H, 1), s(at(2026, 6, 16, 0)));
// عطلة الأسبوع: DXY يفتح الأحد 20:00 نيويورك، برنت الأحد 23:00 لندن
assert.equal(projectBarTimeSec('DXY', s(at(2026, 6, 17, 20)), H, 1), s(at(2026, 6, 20, 0)));
assert.equal(projectBarTimeSec('UKOIL', s(at(2026, 6, 17, 20)), H, 1), s(at(2026, 6, 19, 22)));
// اليورو دولار بالساعة نفسها لا يتأثّر
assert.equal(projectBarTimeSec('EURUSD', s(at(2026, 6, 15, 20)), H, 1), s(at(2026, 6, 15, 21)));

// عطل الفوركس: 25/12/2026 خميس→جمعة ⇒ من مساء الخميس حتى افتتاح الأحد 27؛ 1/1/2026 خميس
assert.equal(projectBarTimeSec('EURUSD', s(at(2026, 11, 24, 21)), H, 1), s(at(2026, 11, 27, 22)));
assert.equal(projectBarTimeSec('EURUSD', s(at(2026, 11, 24, 0)), 86400, 1), s(at(2026, 11, 28, 0)));
assert.equal(projectBarTimeSec('EURUSD', s(at(2025, 11, 31, 21)), H, 1), s(at(2026, 0, 1, 22)));
assert.equal(projectBarTimeSec('EURUSD', s(at(2025, 11, 31, 20)), 4 * H, 1), s(at(2026, 0, 1, 20)));
assert.equal(projectBarTimeSec('EURUSD', s(at(2025, 11, 31, 0)), 86400, 1), s(at(2026, 0, 2, 0)));
assert.equal(projectBarTimeSec('BTCUSD', s(at(2025, 11, 31, 21)), H, 1), s(at(2025, 11, 31, 22)));

// المعادن تفتح الأحد 18:00 نيويورك (QA10): صيفاً 22:00Z لا 21:00Z؛ شتاءً 23:00Z
assert.equal(projectBarTimeSec('XAUUSD', s(at(2026, 6, 17, 20)), H, 1), s(at(2026, 6, 19, 22)));
assert.equal(projectBarTimeSec('XAUUSD', s(at(2026, 0, 16, 20)), H, 2), s(at(2026, 0, 18, 23)));
assert.equal(projectBarTimeSec('XAUUSD', s(at(2026, 0, 16, 20)), H, 3), s(at(2026, 0, 19, 0)));
assert.equal(projectBarTimeSec('GOLDm', s(at(2026, 6, 17, 20)), H, 1), s(at(2026, 6, 19, 22)));
assert.equal(projectBarTimeSec('XAUUSD', s(at(2026, 0, 14, 10)), H, 3), s(at(2026, 0, 14, 13)));


// المعادن: كسر 17:00–18:00 نيويورك يومياً وافتتاح الأحد 18:00 (صيفاً 21:00–22:00 UTC)
assert.equal(isForexMarketOpen('XAUUSD', at(2026, 8, 20, 21, 30)), false); // الأحد 17:30 NY
assert.equal(isForexMarketOpen('XAUUSD', at(2026, 8, 20, 22, 0)), true);
assert.equal(isForexMarketOpen('EURUSD', at(2026, 8, 20, 21, 30)), true);
assert.equal(isForexMarketOpen('XAUUSD.m', at(2026, 8, 22, 21, 15)), false); // الثلاثاء بالكسر
assert.equal(isForexMarketOpen('XAGUSD', at(2026, 8, 22, 20, 59)), true);
assert.equal(isForexMarketOpen('XAUUSD', at(2026, 8, 22, 22, 0)), true);
assert.equal(isForexMarketOpen('XAUUSD', at(2026, 0, 13, 22, 30)), false); // شتاءً 22:00–23:00 UTC
assert.equal(isForexMarketOpen('XAUUSD', at(2026, 0, 13, 23, 0)), true);

// الذهب بعد عطلة رأس السنة يفتح 18:00 نيويورك (23:00 UTC شتاءً) — يطابق حالة السوق
assert.equal(projectBarTimeSec('XAUUSD', s(at(2025, 11, 31, 21)), 3600, 1), s(at(2026, 0, 1, 23)));
assert.equal(projectBarTimeSec('EURUSD', s(at(2025, 11, 31, 21)), 3600, 1), s(at(2026, 0, 1, 22)));
// QA11: مؤشرات أمريكا ونفط WTI بجلسة CME — افتتاح الأحد 18:00 نيويورك وكسر يومي 17:00–18:00.
assert.equal(projectBarTimeSec('US30', s(at(2026, 8, 18, 20)), H, 1), s(at(2026, 8, 20, 22))); // الجمعة ⇒ الأحد 22:00Z
assert.equal(isForexMarketOpen('NAS100', at(2026, 8, 20, 21, 30)), false);
assert.equal(isForexMarketOpen('SPX500', at(2026, 8, 22, 21, 30)), false);
assert.equal(isForexMarketOpen('USOIL', at(2026, 8, 22, 22, 0)), true);
assert.equal(isForexMarketOpen('EURUSD', at(2026, 8, 22, 21, 30)), true);
// الإسقاط يتخطّى الكسر اليومي أيام الأسبوع: الثلاثاء 20:00Z +H1 = 22:00Z (صيفاً)، +2 = 23:00Z
assert.equal(projectBarTimeSec('XAUUSD', s(at(2026, 8, 22, 20)), H, 1), s(at(2026, 8, 22, 22)));
assert.equal(projectBarTimeSec('XAUUSD', s(at(2026, 8, 22, 20)), H, 2), s(at(2026, 8, 22, 23)));
assert.equal(projectBarTimeSec('XAUUSD', s(at(2026, 0, 13, 21)), H, 1), s(at(2026, 0, 13, 23))); // شتاءً
assert.equal(projectBarTimeSec('XAUUSD', s(at(2026, 8, 22, 20, 30)), 1800, 1), s(at(2026, 8, 22, 22)));
assert.equal(projectBarTimeSec('EURUSD', s(at(2026, 8, 22, 20)), H, 1), s(at(2026, 8, 22, 21)));
assert.equal(projectBarTimeSec('XAUUSD', s(at(2026, 8, 22, 16)), 4 * H, 1), s(at(2026, 8, 22, 20))); // 4H يبدأ قبل الكسر
console.log('marketHours.selftest: PASS');

// QA25: الكريبتو بأي كتابة وسيط مفتوح السبت؛ السهم/الفوركس لا.
for (const s of ['SOLUSD', 'XRPUSD', 'BTCUSDT', 'BTCUSDm', 'ETHUSD.c', 'btc/usd']) {
  assert.equal(isForexMarketOpen(s, at(2026, 0, 17, 12)), true, s);
}
for (const s of ['EURUSD', 'EURUSDm', 'XAUUSD', 'US30']) assert.equal(isForexMarketOpen(s, at(2026, 0, 17, 12)), false, s);
// أسماء وسطاء أخرى لمؤشرات CME: مغلقة بكسر 17:00–18:00 نيويورك (الخميس 2026-09-24 21:30 UTC صيفاً) وقبل افتتاح الأحد 18:00.
for (const s of ['USA30', 'USA100', 'USA500', 'NQ100', 'US2000', '#NAS100', 'FX:US30', 'US30']) {
  assert.equal(isForexMarketOpen(s, at(2026, 8, 24, 21, 30)), false, `${s} كسر يومي`);
  assert.equal(isForexMarketOpen(s, at(2026, 8, 27, 21, 30)), false, `${s} قبل افتتاح الأحد`);
  assert.equal(isForexMarketOpen(s, at(2026, 8, 24, 22, 30)), true, `${s} بعد الكسر`);
}
assert.equal(isForexMarketOpen('EURUSD', at(2026, 8, 24, 21, 30)), true);
assert.equal(isForexMarketOpen('USDJPY', at(2026, 8, 27, 21, 30)), true);

// عدّ زمن التداول عبر عطلة بافتتاح جلسة الرمز: الجمعة 2026-09-25 12:00Z → الاثنين 2026-09-28 12:00Z (صيفاً).
// الجمعة 12:00→21:00Z = 9h؛ الأحد من الافتتاح حتى الاثنين 12:00Z: العملات 21:00Z ⇒ 15h، الذهب 22:00Z ⇒ 14h، DXY 00:00Z ⇒ 12h.
{
  const a = s(at(2026, 8, 25, 12));
  const b = s(at(2026, 8, 28, 12));
  assert.equal(forexTradingSecBetween(a, b), 24 * H);
  assert.equal(forexTradingSecBetween(a, b, 'EURUSD'), 24 * H);
  assert.equal(forexTradingSecBetween(a, b, 'XAUUSD'), 23 * H);
  assert.equal(forexTradingSecBetween(a, b, 'DXY'), 21 * H);
  assert.equal(forexTradingSecBetween(a, b, 'UKOIL'), 23 * H); // 23:00 لندن صيفاً = 22:00Z كالذهب
  // ذهاب وإياب بالرمز نفسه
  for (const sym of ['', 'XAUUSD', 'DXY', 'UKOIL']) {
    assert.equal(forexTimeBeforeTrading(b, forexTradingSecBetween(a, b, sym), sym), a, sym);
  }
  // ساعة الأحد قبل افتتاح الذهب ليست تداولاً: 30 دقيقة تداول قبل الاثنين 22:30Z (الأحد) ⇒ 22:00Z، والتالية ⇒ الجمعة
  assert.equal(forexTimeBeforeTrading(s(at(2026, 8, 27, 22, 30)), 1800, 'XAUUSD'), s(at(2026, 8, 27, 22)));
  assert.equal(forexTimeBeforeTrading(s(at(2026, 8, 27, 22, 30)), 3600, 'XAUUSD'), s(at(2026, 8, 25, 20, 30)));
}
console.log('marketHours.selftest (session week open): PASS');

// جلستا 25/12 و1/1 ليستا زمن تداول (كـ`isForexMarketOpen`): 2026-12-23 → 2027-01-05 = 168 ساعة لا 216،
// والخميس 24/12 12:00Z قبل الاثنين 28/12 00:00Z بـ12 ساعة تداول (10 يوم 24 + ساعتا مساء الأحد) لا 36.
{
  const H = 3600;
  const a = Date.UTC(2026, 11, 23) / 1000;
  const b = Date.UTC(2027, 0, 5) / 1000;
  let brute = 0;
  for (let t = a; t < b; t += 60) if (isForexMarketOpen('EURUSD', new Date(t * 1000))) brute += 60;
  assert.equal(forexTradingSecBetween(a, b, 'EURUSD'), brute);
  assert.equal(brute, 168 * H);
  const mon = Date.UTC(2026, 11, 28) / 1000;
  const thu = Date.UTC(2026, 11, 24, 12) / 1000;
  assert.equal(forexTradingSecBetween(thu, mon, 'EURUSD'), 12 * H);
  assert.equal(forexTimeBeforeTrading(mon, 12 * H, 'EURUSD'), thu);
  // لا يرسو داخل جلسة العطلة (2025: الميلاد خميس): 3 ساعات تداول قبل 26/12 00:00Z = ساعتان (25/12 22:00Z→)
  // + ساعة قبل 24/12 22:00Z ⇒ 24/12 21:00Z.
  assert.equal(forexTimeBeforeTrading(Date.UTC(2025, 11, 26) / 1000, 3 * H, 'EURUSD'), Date.UTC(2025, 11, 24, 21) / 1000);
}
console.log('marketHours.selftest (holiday sessions): PASS');

// الكسر اليومي ليس زمن تداول: عدّ دقيقةً بدقيقة بـ`isForexMarketOpen` لكل رمز جلسة عبر أسبوعين (صيف/شتاء)
// وعبر الميلاد ورأس السنة، وذهاب وإياب.
{
  const H = 3600;
  const spans: [number, number][] = [
    [Date.UTC(2026, 8, 16, 9) / 1000, Date.UTC(2026, 8, 30, 15) / 1000],
    [Date.UTC(2026, 10, 25) / 1000, Date.UTC(2026, 11, 9) / 1000],
    [Date.UTC(2026, 11, 22, 6) / 1000, Date.UTC(2027, 0, 6, 6) / 1000],
  ];
  for (const sym of ['XAUUSD', 'US500', 'DXY', 'UKOIL', 'EURUSD']) {
    for (const [a, b] of spans) {
      let brute = 0;
      for (let t = a; t < b; t += 60) if (isForexMarketOpen(sym, new Date(t * 1000))) brute += 60;
      assert.equal(forexTradingSecBetween(a, b, sym), brute, `${sym} ${new Date(a * 1000).toISOString()}`);
      const back = forexTimeBeforeTrading(b, brute, sym);
      assert.equal(forexTradingSecBetween(back, b, sym), brute, `${sym} round trip`);
    }
  }
  // الذهب: الثلاثاء 12:00Z → الأربعاء 12:00Z (صيفاً) = 23 ساعة (كسر 21:00–22:00Z)
  assert.equal(forexTradingSecBetween(Date.UTC(2026, 8, 22, 12) / 1000, Date.UTC(2026, 8, 23, 12) / 1000, 'XAUUSD'), 23 * H);
}
console.log('marketHours.selftest (daily breaks): PASS');
