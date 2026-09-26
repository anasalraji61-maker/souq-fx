/**
 * Self-test: LTF shadow candles fall in exactly one primary slot (pure).
 * Run: npx --yes tsx src/chart/shadowOverlay.selftest.ts
 */
import assert from 'node:assert/strict';
import { mapShadowCandles } from './shadowOverlay';

const H = 3600;
const base = 1_790_000_000 - (1_790_000_000 % H);
const mk = (t: number, p: number) => ({ time: t, open: p, high: p + 1, low: p - 1, close: p });
const primary = [0, 1, 2, 3].map((k) => mk(base + k * H, 100 + k));
const sec = Array.from({ length: 16 }, (_, k) => mk(base + k * 900, 200 + k));
const out = mapShadowCandles(primary as never, sec as never, 0) as { time: number }[];

// H1 مع ظلّ 15m: أربع شموع لكل ساعة، ولا شمعة تُرسم مرّتين.
assert.equal(out.length, 16);
assert.equal(new Set(out.map((o) => o.time)).size, 16);

console.log('shadowOverlay.selftest: PASS');
