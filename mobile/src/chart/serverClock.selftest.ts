/**
 * Self-test: قرارات التيك بساعة الخادم لا الجهاز (`noteServerTime` / `serverNowSec`).
 * Run: npx --yes tsx src/chart/serverClock.selftest.ts
 */
import assert from 'node:assert/strict';
import { isFreshTick, isValidAsOf, noteServerTime, serverNowSec } from './dataSource';
import { liveBarOpenSec } from './liveSeries';

const server = 1_760_000_000; // ساعة الخادم الآن
const devMs = (server - 30) * 1000; // الجهاز متأخّر 30ث

// قبل أي بثّ: ساعة الجهاز ⇒ تيك الخادم «من المستقبل» فيُرفض (العطل القديم).
assert.equal(serverNowSec(devMs), server - 30);
assert.equal(isValidAsOf(server - 1, serverNowSec(devMs)), false);

noteServerTime(server, devMs);
assert.equal(serverNowSec(devMs), server);
assert.equal(isValidAsOf(server - 1, serverNowSec(devMs)), true, 'تيك قبل ثانية صالح');
assert.equal(isFreshTick(server - 1, serverNowSec(devMs)), true, 'وشارة «حي»');
const open = server - (server % 60);
assert.equal(liveBarOpenSec(open, server - 1, 60, serverNowSec(devMs)), open, 'يُدمج بالشمعة الحيّة');

// قيم معطوبة لا تغيّر التقدير.
noteServerTime('x', devMs);
noteServerTime(NaN, devMs);
noteServerTime(server + 5 * 86400, devMs);
assert.equal(serverNowSec(devMs), server);

// جهاز متقدّم 40ث.
noteServerTime(server, (server + 40) * 1000);
assert.equal(serverNowSec((server + 40) * 1000), server);

console.log('serverClock selftest PASS');
