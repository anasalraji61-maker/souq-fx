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

if (fail) {
  console.log(`pipSpec: ${fail} FAIL`);
  process.exit(1);
}
console.log('pipSpec: all PASS');
