import { clampZigzagDeviation, nextZigzagDeviation, zigzagLegendText } from './zigzagLegend';

let fail = 0;
function eq(name: string, got: unknown, want: unknown) {
  if (got !== want) {
    fail++;
    console.log(`FAIL ${name}: got ${JSON.stringify(got)} want ${JSON.stringify(want)}`);
  }
}

eq('legs ⇒ threshold only', zigzagLegendText('EURUSD', 1.08, true), '5%');
eq('no legs EURUSD', zigzagLegendText('EURUSD', 1.08, false), '5% ≈540.0 pip');
eq('no legs USDJPY', zigzagLegendText('USDJPY', 150, false), '5% ≈750.0 pip');
eq('no legs XAUUSD', zigzagLegendText('XAUUSD', 2650, false), '5% ≈1325 pip');
eq('no price', zigzagLegendText('EURUSD', null, false), '5%');
eq('bad price', zigzagLegendText('EURUSD', 0, false), '5%');
eq('US30 price diff', zigzagLegendText('US30', 40000, false).startsWith('5% ≈2000'), true);
eq('1% EURUSD', zigzagLegendText('EURUSD', 1.08, false, undefined, 1), '1% ≈108.0 pip');
eq('next 5→10', nextZigzagDeviation(5), 10);
eq('next 10→1', nextZigzagDeviation(10), 1);
eq('next junk→10', nextZigzagDeviation(7), 10);
eq('clamp junk', clampZigzagDeviation('abc'), 5);
eq('clamp null', clampZigzagDeviation(null), 5);
eq('clamp 2', clampZigzagDeviation('2'), 2);
if (fail) {
  console.log(`zigzagLegend: ${fail} FAIL`);
  process.exit(1);
}
console.log('zigzagLegend: all PASS');
