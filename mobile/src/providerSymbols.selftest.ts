/**
 * Self-test for providerSymbols (pure).
 * Run: npx --yes tsx src/providerSymbols.selftest.ts
 */
import assert from 'node:assert/strict';
import { isNotOfferedSymbol, isSymbolUnavailableError } from './providerSymbols';

assert.equal(isNotOfferedSymbol(' dxy '), true);
assert.equal(isNotOfferedSymbol('EURUSD'), false);
const pyd = { status: 422, detail: [{ msg: 'Value error, symbol unavailable at provider', loc: ['body', 'symbol'] }] };
assert.equal(isSymbolUnavailableError(pyd, 'XYZ'), true);
assert.equal(isSymbolUnavailableError({ status: 422 }, 'DXY'), true);
assert.equal(isSymbolUnavailableError({ status: 422, detail: [{ msg: 'price must be > 0' }] }, 'EURUSD'), false);
assert.equal(isSymbolUnavailableError({ status: 500 }, 'DXY'), false);
assert.equal(isSymbolUnavailableError(new Error('timeout'), 'DXY'), false);
assert.equal(isSymbolUnavailableError(null, 'DXY'), false);
console.log('providerSymbols selftest ok');
