import { chartPipSpec } from './pipSpec';
import { formatPrice } from './indicators/utils';
import { measurePipsText } from './measureReadout';

let fail = 0;
const eq = (name: string, got: unknown, want: unknown) => {
  if (got !== want) {
    fail++;
    console.log(`FAIL ${name}: got ${String(got)} want ${String(want)}`);
  }
};

eq('EURUSD', chartPipSpec('EURUSD')?.pipSize, 0.0001);
eq('EURUSDc', chartPipSpec('EURUSDc')?.symbol, 'EURUSD');
eq('USDJPYc pip', chartPipSpec('USDJPYc')?.pipSize, 0.01);
eq('XAUUSDc', chartPipSpec('XAUUSDc')?.pipSize, 0.1);
eq('GOLDc', chartPipSpec('GOLDc')?.symbol, 'XAUUSD');
eq('upper EURUSDC', chartPipSpec('EURUSDC')?.symbol, 'EURUSD');
eq('BTCUSDC stablecoin', chartPipSpec('BTCUSDC'), null);
eq('US30c', chartPipSpec('US30c'), null);
eq('EURUSDm', chartPipSpec('EURUSDm')?.symbol, 'EURUSD');
eq('XPDUSDc', chartPipSpec('XPDUSDc'), null);
eq('USDJPYc 3 decimals', formatPrice(157.4234, 'USDJPYc'), '157.423');
eq('XAUUSDc 2 decimals', formatPrice(2650.351, 'XAUUSDc'), '2650.35');
eq('EURUSDc pips', measurePipsText('EURUSDc', 1.085, 1.0875), '+25.0 pip');
eq('USDJPYc pips', measurePipsText('USDJPYc', 157.5, 157.3), '−20.0 pip');
// أداة بلا منازل معروفة: المنازل من سعرها الجاري لا من كل رقم (سهم حول 100، غاز حول 10)
eq('NKE 99.8 ref 100.05', formatPrice(99.8, 'NKE', 100.05), '99.80');
eq('NKE 100.2 ref 99.9', formatPrice(100.2, 'NKE', 99.9), '100.200');
eq('XNGUSD 9.985 ref 10.01', formatPrice(9.985, 'XNGUSD', 10.01), '9.985');
eq('XNGUSD 2.5 → 3 decimals like brokers', formatPrice(2.5, 'XNGUSD'), '2.500');
eq('NATGAS 3.1415', formatPrice(3.1415, 'NATGAS'), '3.142');
eq('no ref ⇒ by size', formatPrice(99.8, 'NKE'), '99.800');
eq('ref ignored for known pair', formatPrice(157.4234, 'USDJPY', 1.08), '157.423');
eq('bad ref ⇒ by size', formatPrice(5.5, 'X', NaN), '5.50000');
// لواحق وسطاء صغيرة ملاصقة: منازل الزوج وبُعد بالـpip؛ الكبيرة تبقى مرفوضة
eq('USDJPYmicro', chartPipSpec('USDJPYmicro')?.pipSize, 0.01);
eq('USDJPYmicro 3 decimals', formatPrice(157.4234, 'USDJPYmicro'), '157.423');
eq('EURUSDpro', chartPipSpec('EURUSDpro')?.symbol, 'EURUSD');
eq('EURUSDi', chartPipSpec('EURUSDi')?.symbol, 'EURUSD');
eq('USDJPYm#', chartPipSpec('USDJPYm#')?.symbol, 'USDJPY');
eq('GOLDm', chartPipSpec('GOLDm')?.symbol, 'XAUUSD');
eq('SILVERm', chartPipSpec('SILVERm')?.symbol, 'XAGUSD');
eq('GOLDm pips', measurePipsText('GOLDm', 2650, 2652.5), '+25.0 pip');
eq('EURUSDT tether', chartPipSpec('EURUSDT'), null);
eq('BTCUSDpro', chartPipSpec('BTCUSDpro'), null);
eq('EURUSDmicropro too long', chartPipSpec('EURUSDmicropro'), null);
// لاحقة بعد نقطة
eq('EURUSD.c', chartPipSpec('EURUSD.c')?.symbol, 'EURUSD');
eq('USDJPY.pro pip', chartPipSpec('USDJPY.pro')?.pipSize, 0.01);
eq('GBPJPY.ECN', chartPipSpec('GBPJPY.ECN')?.symbol, 'GBPJPY');
eq('GOLD.m', chartPipSpec('GOLD.m')?.symbol, 'XAUUSD');
eq('EURUSD.c 5 decimals', formatPrice(1.085123, 'EURUSD.c'), '1.08512');
eq('BTCUSD.c', chartPipSpec('BTCUSD.c'), null);
eq('EURUSD.toolong', chartPipSpec('EURUSD.toolong'), null);
// رموز الدفتر بالأحرف الكبيرة (tools48)
eq('USDJPYMICRO', chartPipSpec('USDJPYMICRO')?.pipSize, 0.01);
eq('USDJPY-CENT', chartPipSpec('USDJPY-CENT')?.symbol, 'USDJPY');
eq('GBPJPY_MICRO', chartPipSpec('GBPJPY_MICRO')?.symbol, 'GBPJPY');
eq('USDJPYMICRO 3 decimals', formatPrice(150.1234, 'USDJPYMICRO'), '150.123');
eq('BTCUSDMICRO', chartPipSpec('BTCUSDMICRO'), null);
// حساب mini بكل فاصل (QA44/tools62)
eq('EURUSD-MINI', chartPipSpec('EURUSD-MINI')?.symbol, 'EURUSD');
eq('USDJPY_MINI pip', chartPipSpec('USDJPY_MINI')?.pipSize, 0.01);
eq('GOLD_MINI', chartPipSpec('GOLD_MINI')?.symbol, 'XAUUSD');
eq('EURUSD.mini', chartPipSpec('EURUSD.mini')?.symbol, 'EURUSD');
eq('USDJPY-MINI 3 decimals', formatPrice(150.1234, 'USDJPY-MINI'), '150.123');
eq('BTCUSD-MINI', chartPipSpec('BTCUSD-MINI'), null);
// بادئة منصّة/وسيط منسوخة من TradingView
eq('OANDA:USDJPY 3 decimals', formatPrice(157.4236, 'OANDA:USDJPY'), '157.424');
eq('FX:GBPJPY', chartPipSpec('FX:GBPJPY')?.symbol, 'GBPJPY');
eq('#XAUUSD', chartPipSpec('#XAUUSD')?.symbol, 'XAUUSD');
eq('OANDA:XAUUSD.pro', chartPipSpec('OANDA:XAUUSD.pro')?.symbol, 'XAUUSD');
eq('BINANCE:BTCUSD', chartPipSpec('BINANCE:BTCUSD'), null);
eq('bare prefix', chartPipSpec('FX:'), null);
// النفط: ثلاث منازل ثابتة لا تنقلب عند 100
eq('USOIL 99.953', formatPrice(99.953, 'USOIL', 101.2), '99.953');
eq('USOIL above 100', formatPrice(101.2346, 'USOIL'), '101.235');
eq('UKOIL.m', formatPrice(68.4, 'UKOIL.m'), '68.400');
eq('XTIUSD', formatPrice(68.4567, 'XTIUSD'), '68.457');
eq('TVC:USOIL', formatPrice(99.9, 'TVC:USOIL', 100.5), '99.900');
eq('US30 still by magnitude', formatPrice(42000.123, 'US30'), '42000.12');
if (fail) {
  console.log(`pipSpec: ${fail} FAIL`);
  process.exit(1);
}
console.log('pipSpec: all PASS');
