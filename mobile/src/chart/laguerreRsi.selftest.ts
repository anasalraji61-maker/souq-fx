/**
 * Self-test for Laguerre RSI on a flat market (pure).
 * Run: npx --yes tsx src/chart/laguerreRsi.selftest.ts
 */
import assert from 'node:assert/strict';
import { computeLaguerreRsi } from './indicators/momentum';

// سوق مسطّح من البداية: لا قيمة (كانت 1 = «تشبّع شراء» بلا حركة)
assert.ok(computeLaguerreRsi(Array(40).fill(1.25)).every((v) => v === null));

// هبوط ثم ركود طويل: الخطّ يبقى عند قاعه ولا يقفز إلى 1 حين تتقارب المراحل
{
  const closes = [1.26, 1.258, 1.256, 1.254, 1.252, ...Array(120).fill(1.25)];
  const out = computeLaguerreRsi(closes);
  const low = out[5]!;
  assert.ok(low < 0.15, `oversold after the drop: ${low}`);
  for (let i = 5; i < out.length; i++) {
    assert.ok(out[i] != null && out[i]! <= low + 1e-9, `bar ${i} stays at/below ${low}: ${out[i]}`);
  }
}

// صعود صارم ما زال يقترب من 1، والقيم محصورة [0,1]
{
  const out = computeLaguerreRsi(Array.from({ length: 100 }, (_, i) => 1.1 + i * 0.0005));
  assert.ok(out[99]! > 0.99);
  assert.ok(out.every((v) => v == null || (v >= 0 && v <= 1)));
}

console.log('laguerreRsi.selftest: PASS');
