/**
 * Self-test for watchlistSanitize (pure — no AsyncStorage).
 * Run: npx --yes tsx src/chart/watchlistSanitize.selftest.ts
 */
import assert from 'node:assert/strict';
import { sanitizeWatchSymbols, DEFAULT_WATCH_SYMBOLS } from './watchlistSanitize';

let fails = 0;
function check(name: string, cond: boolean) {
  if (!cond) {
    fails += 1;
    console.error('FAIL', name);
  } else console.log('ok', name);
}

check('defaults non-empty', DEFAULT_WATCH_SYMBOLS.length > 5);
check('dedupe', sanitizeWatchSymbols(['EURUSD', 'eurusd', 'EURUSD']).length === 1);
check('drop unknown', sanitizeWatchSymbols(['EURUSD', 'NOTREAL', 1, null]).join() === 'EURUSD');
check('empty array ok', sanitizeWatchSymbols([]).length === 0);
check('corrupt non-array', sanitizeWatchSymbols({ foo: 1 } as unknown).length === 0);
check('order preserved', sanitizeWatchSymbols(['XAUUSD', 'EURUSD', 'DXY']).join() === 'XAUUSD,EURUSD,DXY');

assert.equal(fails, 0);
console.log(JSON.stringify({ ok: true, fails }));
