/**
 * Self-test for sessions (pure).
 * Run: npx --yes tsx src/chart/sessions.selftest.ts
 */
import assert from 'node:assert/strict';
import { inSession, planSessionRuns, sessionWindowUtc, ukDst } from './sessions';

const at = (iso: string) => Date.parse(iso) / 1000;
const H = 3600;

// الصيفي البريطاني 2026: 29 آذار → 25 تشرين الأول، 01:00 UTC.
assert.equal(ukDst(at('2026-03-29T00:59:00Z')), false);
assert.equal(ukDst(at('2026-03-29T01:00:00Z')), true);
assert.equal(ukDst(at('2026-10-25T00:59:00Z')), true);
assert.equal(ukDst(at('2026-10-25T01:00:00Z')), false);

// لندن: 07–16 UTC صيفاً، 08–17 شتاءً.
const summer = at('2026-07-15T00:00:00Z');
assert.deepEqual(sessionWindowUtc('london', summer), [summer + 7 * H, summer + 16 * H]);
const winter = at('2026-01-14T00:00:00Z');
assert.deepEqual(sessionWindowUtc('london', winter), [winter + 8 * H, winter + 17 * H]);
// نيويورك: 12–21 UTC صيفاً، 13–22 شتاءً.
assert.deepEqual(sessionWindowUtc('ny', summer), [summer + 12 * H, summer + 21 * H]);
assert.deepEqual(sessionWindowUtc('ny', winter), [winter + 13 * H, winter + 22 * H]);
// طوكيو ثابتة.
assert.deepEqual(sessionWindowUtc('tokyo', summer), [summer, summer + 9 * H]);
// الفجوة بين تبديل أمريكا (8 آذار) وبريطانيا (29 آذار): لندن ما زالت 08 UTC، نيويورك 12 UTC.
const gap = at('2026-03-18T00:00:00Z');
assert.deepEqual(sessionWindowUtc('london', gap), [gap + 8 * H, gap + 17 * H]);
assert.deepEqual(sessionWindowUtc('ny', gap), [gap + 12 * H, gap + 21 * H]);

// الحدود: البداية داخلها، النهاية خارجها.
assert.equal(inSession('london', summer + 7 * H), true);
assert.equal(inSession('london', summer + 7 * H - 1), false);
assert.equal(inSession('london', summer + 16 * H), false);
// عطلة الأسبوع بلا جلسات (السبت 18 تموز 2026، الأحد 19).
assert.equal(inSession('london', at('2026-07-18T10:00:00Z')), false);
assert.equal(inSession('tokyo', at('2026-07-19T02:00:00Z')), false);
assert.equal(inSession('tokyo', NaN), false);

// 1H ليوم صيفي كامل: طوكيو 0–8، لندن 7–15، نيويورك 12–20.
const hours = Array.from({ length: 24 }, (_, i) => summer + i * H);
assert.deepEqual(planSessionRuns(hours, H, 400), [
  { id: 'tokyo', from: 0, to: 8 },
  { id: 'london', from: 7, to: 15 },
  { id: 'ny', from: 12, to: 20 },
]);
// جلسة مفتوحة حتى آخر شمعة تُغلق عند الطرف.
assert.deepEqual(
  planSessionRuns(hours.slice(0, 10), H, 400).find((r) => r.id === 'london'),
  { id: 'london', from: 7, to: 9 }
);
// يومان متتاليان: طوكيو مرّتان منفصلتان.
const twoDays = Array.from({ length: 48 }, (_, i) => summer + i * H);
assert.equal(planSessionRuns(twoDays, H, 800).filter((r) => r.id === 'tokyo').length, 2);
// 4H فأكبر، أو ساعة أضيق من 2px، أو مدخل فارغ ⇒ لا شيء.
assert.deepEqual(planSessionRuns(hours, 4 * H, 400), []);
assert.deepEqual(planSessionRuns(hours, H, 30), []);
assert.deepEqual(planSessionRuns([], H, 400), []);
assert.deepEqual(planSessionRuns(hours, H, 0), []);
// 1m: 1440 شمعة على 360px = 15px للساعة ⇒ تُرسم.
const mins = Array.from({ length: 1440 }, (_, i) => summer + i * 60);
assert.equal(planSessionRuns(mins, 60, 360).length, 3);

console.log('sessions.selftest: PASS');
