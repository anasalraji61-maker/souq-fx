/**
 * Self-test for marketHours (pure).
 * Run: npx --yes tsx src/chart/marketHours.selftest.ts
 */
import assert from 'node:assert/strict';
import { isForexHolidaySession, isForexMarketOpen } from './marketHours';

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

console.log('marketHours.selftest: PASS');
