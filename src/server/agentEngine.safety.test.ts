#!/usr/bin/env tsx
/**
 * Safety test for agentEngine - ensures live trading is locked to PAPER mode
 * and MT5 order signals are never queued.
 */

import { globalAgentEngine, LiveTradingForbiddenError } from './agentEngine.js';
import assert from 'node:assert';

console.log('Running safety tests...');

try {
  // Case 1: updateConfig({tradingMode:'MT5_LIVE'} as any) throws LiveTradingForbiddenError
  let threw = false;
  try {
    globalAgentEngine.updateConfig({ tradingMode: 'MT5_LIVE' } as any);
  } catch (e) {
    assert(e instanceof LiveTradingForbiddenError, 'Expected LiveTradingForbiddenError');
    threw = true;
  }
  assert(threw, 'Expected updateConfig with MT5_LIVE to throw');
  console.log('Case 1 passed: MT5_LIVE throws LiveTradingForbiddenError');

  // Case 2: after that call, getState().config.tradingMode === 'PAPER'
  const state1 = globalAgentEngine.getState();
  assert.strictEqual(state1.config.tradingMode, 'PAPER', 'tradingMode should be PAPER');
  console.log('Case 2 passed: tradingMode stays PAPER after rejected change');

  // Case 3: updateConfig({riskPerTrade: 1}) still works and the mode stays PAPER
  const updated = globalAgentEngine.updateConfig({ riskPerTrade: 1 });
  assert.strictEqual(updated.tradingMode, 'PAPER', 'tradingMode should remain PAPER');
  assert.strictEqual(updated.riskPerTrade, 1, 'riskPerTrade should be updated');
  console.log('Case 3 passed: Valid config update works and mode stays PAPER');

  // Case 4: popPendingSignals() returns []
  const signals = globalAgentEngine.popPendingSignals();
  assert(Array.isArray(signals), 'popPendingSignals should return an array');
  assert.strictEqual(signals.length, 0, 'popPendingSignals should return empty array');
  console.log('Case 4 passed: popPendingSignals returns []');

  // Case 5: after the manual-trade method, popPendingSignals() is still []
  // (We skip if the method needs network - it doesn't)
  const trade = globalAgentEngine.triggerManualTrade('EURUSD', 'BUY');
  assert(trade, 'triggerManualTrade should return a position');
  const signals2 = globalAgentEngine.popPendingSignals();
  assert.strictEqual(signals2.length, 0, 'popPendingSignals should still return [] after manual trade');
  console.log('Case 5 passed: popPendingSignals returns [] after manual trade');

  console.log('\n✅ All safety tests passed!');
  console.log('OK');
  process.exit(0);
} catch (err: any) {
  console.error('\n❌ Safety test failed:', err.message);
  console.error(err.stack);
  process.exit(1);
}