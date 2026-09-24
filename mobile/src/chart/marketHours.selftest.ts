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
assert.equal(isForexMarketOpen('XAUUSD', at(2026, 0, 1, 22, 0)), true);
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

console.log('marketHours.selftest: PASS');
