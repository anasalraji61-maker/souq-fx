/**
 * Self-test for marketHours (pure).
 * Run: npx --yes tsx src/chart/marketHours.selftest.ts
 */
import assert from 'node:assert/strict';
import { isForexHolidaySession, isForexMarketOpen, projectBarTimeSec } from './marketHours';

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
