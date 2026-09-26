/** فحص ذاتي لـ`tfTyping.ts` — يُشغَّل بـNode بلا شجرة مكوّنات. */
import { dateJump, parseTypedDate, parseTypedTimeframe, tfTypingChar, tfTypingStarts, typedDatePending } from './tfTyping';

let failures = 0;
function ok(name: string, cond: boolean) {
  if (!cond) {
    failures += 1;
    console.error('FAIL', name);
  }
}

ok('«1» ⇒ 1m', parseTypedTimeframe('1') === '1m');
ok('«15» ⇒ 15m', parseTypedTimeframe('15') === '15m');
ok('«60» دقائق ⇒ 1H', parseTypedTimeframe('60') === '1H');
ok('«240» ⇒ 4H', parseTypedTimeframe('240') === '4H');
ok('«4h» ⇒ 4H', parseTypedTimeframe('4h') === '4H');
ok('«1h» ⇒ 1H', parseTypedTimeframe('1h') === '1H');
ok('«30m» ⇒ 30m', parseTypedTimeframe('30m') === '30m');
ok('«d» ⇒ D', parseTypedTimeframe('d') === 'D');
ok('«1d» ⇒ D', parseTypedTimeframe('1d') === 'D');
ok('«1440» ⇒ D', parseTypedTimeframe('1440') === 'D');
ok('«w» ⇒ W', parseTypedTimeframe('w') === 'W');
ok('«3» غير مدعوم ⇒ لا تقريب', parseTypedTimeframe('3') === null);
ok('«2h» غير مدعوم', parseTypedTimeframe('2h') === null);
ok('«0» ⇒ لا شيء', parseTypedTimeframe('0') === null);
ok('فارغ ⇒ لا شيء', parseTypedTimeframe('') === null);
ok('«h» وحدها ⇒ لا شيء', parseTypedTimeframe('h') === null);
ok('«4h5» ⇒ لا شيء', parseTypedTimeframe('4h5') === null);

ok('Digit5 بلوحة عربية ماك («٥») ⇒ 5', tfTypingChar('٥', 'Digit5') === '5');
ok('Numpad1 ⇒ 1', tfTypingChar('1', 'Numpad1') === '1');
ok('KeyH بلوحة عربية («ا») ⇒ h', tfTypingChar('ا', 'KeyH') === 'h');
ok('KeyD ⇒ d', tfTypingChar('d', 'KeyD') === 'd');
ok('KeyQ ⇒ لا شيء', tfTypingChar('q', 'KeyQ') === '');
ok('بلا code: «4» ⇒ 4', tfTypingChar('4', undefined) === '4');
ok('Enter ⇒ لا شيء', tfTypingChar('Enter', 'Enter') === '');

ok('يبدأ برقم', tfTypingStarts('1'));
ok('يبدأ بـd', tfTypingStarts('d'));
ok('لا يبدأ بـ0', !tfTypingStarts('0'));
ok('لا يبدأ بـh', !tfTypingStarts('h'));

ok('Minus ⇒ -', tfTypingChar('-', 'Minus') === '-');
ok('NumpadSubtract ⇒ -', tfTypingChar('-', 'NumpadSubtract') === '-');
ok('لا يبدأ بـ-', !tfTypingStarts('-'));
ok('تاريخ ليس فريماً', parseTypedTimeframe('2026-09-01') === null);

const d = parseTypedDate('2026-09-01');
ok('«2026-09-01»', !!d && d.year === 2026 && d.month === 9 && d.day === 1);
ok('«2026-9-1» بلا أصفار', !!parseTypedDate('2026-9-1'));
ok('30 فبراير مرفوض', parseTypedDate('2026-02-30') === null);
ok('29 فبراير الكبيسة', !!parseTypedDate('2024-02-29'));
ok('شهر 13 مرفوض', parseTypedDate('2026-13-01') === null);
ok('«09-01» بلا سنة مرفوض', parseTypedDate('09-01') === null);
ok('«2026» معلّق', typedDatePending('2026'));
ok('«2026-09-» معلّق', typedDatePending('2026-09-'));
ok('«2026-09-0» معلّق', typedDatePending('2026-09-0'));
ok('«15» ليس تاريخاً معلّقاً', !typedDatePending('15'));
ok('«2026-09-01» مكتمل لا معلّق', !typedDatePending('2026-09-01'));

// ساعات من يوم 0 إلى يوم 10 (240 شمعة، ساعة لكل واحدة).
const H = 3600;
const hours = Array.from({ length: 240 }, (_, k) => k * H);
const j = dateJump(hours, 5 * 86400, 6 * 86400, 1e12, 80);
ok('أول شمعة باليوم', !!j && j.index === 120);
ok('وسط النافذة', !!j && j.offset === 240 - 1 - (120 + 40));
ok('قبل التاريخ المحمَّل ⇒ null', dateJump(hours, -3 * 86400, -2 * 86400, 1e12, 80) === null);
ok('بعد الآن ⇒ null', dateJump(hours, 20 * 86400, 21 * 86400, 12 * 86400, 80) === null);
const early = dateJump(hours, 0, 86400, 1e12, 80);
ok('أول يوم ⇒ وسط النافذة كذلك', !!early && early.index === 0 && early.offset === 199);
ok('نافذة ضيّقة لا تتجاوز n−10', (dateJump(hours, 0, 86400, 1e12, 2)?.offset ?? -1) === 230);
const late = dateJump(hours, 9 * 86400, 10 * 86400, 1e12, 80);
ok('آخر يوم ⇒ الإزاحة 0', !!late && late.offset === 0);
// عطلة: شموع يوم 5 محذوفة ⇒ آخر شمعة قبله.
const gap = hours.filter((t) => t < 5 * 86400 || t >= 7 * 86400);
const w = dateJump(gap, 5 * 86400, 6 * 86400, 1e12, 80);
ok('عطلة ⇒ آخر شمعة قبلها', !!w && gap[w.index] === 5 * 86400 - H);
// أسبوعي: شمعة الاثنين تغطّي الأربعاء.
const weeks = [0, 7, 14].map((k) => k * 86400);
const wk = dateJump(weeks, 9 * 86400, 10 * 86400, 1e12, 80);
ok('أسبوعي ⇒ شمعة أسبوعه', !!wk && wk.index === 1);
ok('حدّ الإعادة الأدنى', (dateJump(hours, 9 * 86400, 10 * 86400, 1e12, 80, 30)?.offset ?? -1) === 30);

if (failures) {
  console.error(`tfTyping.selftest: ${failures} FAIL`);
  process.exit(1);
}
console.log('tfTyping.selftest: PASS');
