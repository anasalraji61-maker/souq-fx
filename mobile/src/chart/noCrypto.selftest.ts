/**
 * Self-test: crypto symbols removed from default watchlist and mock bases.
 * Run: npx --yes tsx src/chart/noCrypto.selftest.ts
 */
import assert from 'node:assert/strict';
import { WATCHLIST } from './watchlist';
import { mockBase } from './mockBases';

function main() {
  // 1. No WATCHLIST entry has a group of 'Crypto'
  // Use string comparison to avoid TypeScript narrowing issues
  const hasCryptoGroup = WATCHLIST.some((w) => w.group === 'Crypto' as string);
  assert.equal(hasCryptoGroup, false, 'WATCHLIST should not contain any Crypto group entries');

  // 2. No WATCHLIST symbol matches /BTC|ETH|XRP|SOL|DOGE/
  const cryptoRegex = /BTC|ETH|XRP|SOL|DOGE/;
  const hasCryptoSymbol = WATCHLIST.some((w) => cryptoRegex.test(w.symbol));
  assert.equal(hasCryptoSymbol, false, 'WATCHLIST should not contain BTC/ETH/XRP/SOL/DOGE symbols');

  // 3. mockBase('BTCUSD') === 1
  assert.equal(mockBase('BTCUSD'), 1, 'mockBase for unknown symbol BTCUSD should return 1');

  // 4. mockBase('EURUSD') > 1 and mockBase('XAUUSD') > 1000
  const eurUsdBase = mockBase('EURUSD');
  const xauUsdBase = mockBase('XAUUSD');
  assert.ok(eurUsdBase > 1, `mockBase('EURUSD') should be > 1, got ${eurUsdBase}`);
  assert.ok(xauUsdBase > 1000, `mockBase('XAUUSD') should be > 1000, got ${xauUsdBase}`);

  console.log('noCrypto selftest OK');
}

main();