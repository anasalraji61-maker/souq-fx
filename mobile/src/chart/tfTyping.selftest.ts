/** فحص ذاتي لـ`tfTyping.ts` — يُشغَّل بـNode بلا شجرة مكوّنات. */
import { parseTypedTimeframe, tfTypingChar, tfTypingStarts } from './tfTyping';

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

if (failures) {
  console.error(`tfTyping.selftest: ${failures} FAIL`);
  process.exit(1);
}
console.log('tfTyping.selftest: PASS');
