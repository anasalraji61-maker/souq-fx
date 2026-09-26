/** فحص ذاتي لـ`symbolListFilter.ts` — يُشغَّل بـNode بلا شجرة مكوّنات. */
import { filterSymbols } from './symbolListFilter';

let failures = 0;
function ok(name: string, cond: boolean) {
  if (!cond) {
    failures += 1;
    console.error('FAIL', name);
  }
}

const L = ['DXY', 'EURUSD', 'GBPUSD', 'USDJPY', 'USDCAD', 'XAUUSD', 'EURJPY'];
ok('فارغ ⇒ الكلّ بترتيبه', filterSymbols(L, '').join() === L.join());
ok('مسافات فقط ⇒ الكلّ', filterSymbols(L, '  ').length === L.length);
ok('«usd»: البادئ أوّلاً ثم الحاوي بترتيبه', filterSymbols(L, 'usd').join() === 'USDJPY,USDCAD,EURUSD,GBPUSD,XAUUSD');
ok('«eur/usd» ⇒ EURUSD', filterSymbols(L, 'eur/usd').join() === 'EURUSD');
ok('«xau» ⇒ XAUUSD', filterSymbols(L, 'xau').join() === 'XAUUSD');
ok('لا تطابق ⇒ فارغة', filterSymbols(L, 'btc').length === 0);
ok('«jpy» ⇒ الحاوي بترتيب القائمة', filterSymbols(L, 'jpy').join() === 'USDJPY,EURJPY');

if (failures) {
  console.error(`symbolListFilter.selftest: ${failures} FAIL`);
  process.exit(1);
}
console.log('symbolListFilter.selftest: PASS');
