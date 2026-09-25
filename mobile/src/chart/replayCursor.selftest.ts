/**
 * Bar Replay مرساة بالزمن (`replayCursor.ts`).
 * تشغيل: npx tsx mobile/src/chart/replayCursor.selftest.ts
 */
import assert from 'node:assert/strict';
import { firstAfter, lastAtOrBefore, lastBefore, replayFollowOffset, replayMinOffset,
  replayRestOffset, replayZoomOffset, replayWindow } from './replayCursor';

const times = [10, 20, 30, 30, 40, 50];
assert.equal(lastAtOrBefore(times, 5), -1);
assert.equal(lastAtOrBefore(times, 30), 3);
assert.equal(lastAtOrBefore(times, 35), 3);
assert.equal(lastAtOrBefore(times, 99), 5);
// لبنتان بزمن 30 تُعبَران معاً
assert.equal(firstAfter(times, 20), 2);
assert.equal(firstAfter(times, 30), 4);
assert.equal(firstAfter(times, 50), 6);
assert.equal(lastBefore(times, 40), 3);
assert.equal(lastBefore(times, 30), 1);
assert.equal(lastBefore(times, 10), -1);

// 1000 شمعة، نافذة 80 عند الحيّ، القطع عند الفهرس 931 (الخطوة 12)
assert.deepEqual(replayWindow(1000, 80, 0, 931), { start: 920, end: 1000, windowLen: 80, revealed: 12 });
// سحب للخلف 30: القطع ثابت ⇒ 42 مكشوفة من النافذة الجديدة
assert.deepEqual(replayWindow(1000, 80, 30, 931), { start: 890, end: 970, windowLen: 80, revealed: 42 });
// سحب بعيد للخلف: كل النافذة قبل القطع
assert.equal(replayWindow(1000, 80, 500, 931).revealed, 80);
// نافذة تتعدّى القطع نحو الحيّ (كانت تكشف ما بعده): أوّلها يقف عند القطع
const past = replayWindow(1000, 80, 0, 700);
assert.equal(past.start, 700);
assert.equal(past.revealed, 1);

// تقدّم داخل النافذة: لا إزاحة
assert.equal(replayFollowOffset(1000, 80, 0, 950), 0);
// تقدّم خلف نهاية نافذة مسحوبة: تنساب لتبقى المقطوعة آخرها
assert.equal(replayFollowOffset(1000, 80, 30, 970), 29);
assert.deepEqual(replayWindow(1000, 80, 29, 970), { start: 891, end: 971, windowLen: 80, revealed: 80 });
// رجوع قبل أوّل النافذة: تعود لتكون أوّلها
assert.equal(replayFollowOffset(1000, 80, 0, 900), 20);
assert.equal(replayWindow(1000, 80, 20, 900).start, 900);
// حدّ السحب نحو الحيّ: أوّل النافذة عند القطع
assert.equal(replayMinOffset(1000, 80, 700), 220);
assert.equal(replayMinOffset(1000, 80, 990), 0);

// التكبير بالإعادة: المقطوعة تبقى بنسبتها (11.5/80 ⇒ 5.5/40)، لا تقفز لأوّل خانة
assert.equal(replayZoomOffset(1000, 80, 0, 931, 40), 34);
assert.deepEqual(replayWindow(1000, 40, 34, 931), { start: 926, end: 966, windowLen: 40, revealed: 6 });
// التصغير لا يتعدّى الحيّ: النافذة تنتهي عنده
assert.equal(replayZoomOffset(1000, 80, 0, 931, 160), 0);
assert.equal(replayWindow(1000, 160, 0, 931).revealed, 92);
// قرب أوّل التاريخ: البداية لا تنزل عن صفر
assert.equal(replayZoomOffset(1000, 80, 990, 5, 20), 980);
assert.equal(replayWindow(1000, 20, 980, 5).start, 0);
// مقطوعة بآخر النافذة (مسحوبة) تبقى آخرها بعد التكبير
assert.equal(replayWindow(1000, 40, replayZoomOffset(1000, 80, 29, 970, 40), 970).revealed, 40);

// موضع الراحة: المقطوعة 700 الخانة 72 من 80 (8 خانات مستقبل)، لا أوّل خانة
assert.equal(replayRestOffset(1000, 80, 700), 291);
assert.deepEqual(replayWindow(1000, 80, 291, 700), { start: 629, end: 709, windowLen: 80, revealed: 72 });
// قرب الحيّ: النافذة تنتهي عند الحيّ
assert.equal(replayRestOffset(1000, 80, 995), 0);
// نافذة صغيرة: هامش خانتان على الأقلّ
assert.equal(replayRestOffset(1000, 10, 500), 497);

console.log('replayCursor selftest: PASS');
