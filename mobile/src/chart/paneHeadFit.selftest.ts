/** فحص ذاتي لـ`paneHeadFit.ts` — يُشغَّل بـNode بلا شجرة مكوّنات. */
import { paneInlineFits } from './paneHeadFit';

let failures = 0;
function ok(name: string, cond: boolean) {
  if (!cond) {
    failures += 1;
    console.error('FAIL', name);
  }
}

ok('DI قصيران', paneInlineFits('25.1', '20.8'));
ok('Stoch عددان', paneInlineFits('82.4', '71.0'));
ok('KST بعلامة', paneInlineFits('-12.3', '-8.40'));
ok('عشرة محارف تتّسع', paneInlineFits('12345', '12345'));
ok('أحد عشر محرفاً لا يتّسع بـ9px', !paneInlineFits('12345', '123456'));
ok('MACD دقيق لا يتّسع', !paneInlineFits('0.00041', '0.00037'));
ok('اثنا عشر محرفاً لا يتّسع', !paneInlineFits('123456', '123456'));
ok('فارغ ⇒ لا', !paneInlineFits('', '1'));
ok('null ⇒ لا', !paneInlineFits(null, '1'));

if (failures) {
  console.error(`paneHeadFit selftest: ${failures} failure(s)`);
  process.exit(1);
}
console.log('paneHeadFit selftest: PASS');
