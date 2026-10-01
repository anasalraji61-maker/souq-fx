/** فحص ذاتي لـ`paneHeadFit.ts` — يُشغَّل بـNode بلا شجرة مكوّنات. */
import { paneInlineFits, paneValueTooWide } from './paneHeadFit';

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
ok('ثمانية أرقام تتّسع', paneInlineFits('1234', '5678'));
ok('عشرة أرقام لا تتّسع بـ11px', !paneInlineFits('12345', '12345'));
ok('MACD دقيق لا يتّسع', !paneInlineFits('0.00041', '0.00037'));
ok('قيمة MACD دقيقة وحدها 11px', !paneValueTooWide('-0.00041'));
ok('تسعة محارف 11px', !paneValueTooWide('-1234.567'));
ok('عشرة أرقام أعرض ⇒ 10px', paneValueTooWide('1234567890'));
ok('فارغة ⇒ 11px', !paneValueTooWide(null));
ok('اثنا عشر محرفاً لا يتّسع', !paneInlineFits('123456', '123456'));
ok('فارغ ⇒ لا', !paneInlineFits('', '1'));
ok('null ⇒ لا', !paneInlineFits(null, '1'));

if (failures) {
  console.error(`paneHeadFit selftest: ${failures} failure(s)`);
  process.exit(1);
}
console.log('paneHeadFit selftest: PASS');
