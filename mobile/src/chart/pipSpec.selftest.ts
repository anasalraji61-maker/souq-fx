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
// أداة بلا منازل معروفة: المنازل من سعرها الجاري لا من كل رقم (نفط حول 100، غاز حول 10)
eq('USOIL 99.8 ref 100.05', formatPrice(99.8, 'USOIL', 100.05), '99.80');
eq('USOIL 100.2 ref 99.9', formatPrice(100.2, 'USOIL', 99.9), '100.200');
eq('XNGUSD 9.985 ref 10.01', formatPrice(9.985, 'XNGUSD', 10.01), '9.985');
eq('no ref ⇒ by size', formatPrice(99.8, 'USOIL'), '99.800');
eq('ref ignored for known pair', formatPrice(157.4234, 'USDJPY', 1.08), '157.423');
eq('bad ref ⇒ by size', formatPrice(5.5, 'X', NaN), '5.50000');
if (fail) {
  console.log(`pipSpec: ${fail} FAIL`);
  process.exit(1);
}
console.log('pipSpec: all PASS');
