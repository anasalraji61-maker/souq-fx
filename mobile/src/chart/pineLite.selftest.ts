/**
 * Self-test for crossover/crossunder argument splitting in pineLite (pure).
 * Run: npx --yes tsx src/chart/pineLite.selftest.ts
 */
import assert from 'node:assert/strict';
import { evalPineLite, INDICATOR_LIBRARY } from './pineLite';

const candles = Array.from({ length: 80 }, (_, i) => {
  const p = 1.1 + 0.01 * Math.sin(i / 6);
  return { time: i * 60, open: p, high: p + 0.001, low: p - 0.001, close: p };
});
const count = (xs: (number | null)[], v?: number) => xs.filter((x) => (v == null ? x != null : x === v)).length;

// الإعداد الجاهز «Cross SMA»: كان فارغاً كلياً (القسمة عند آخر فاصلة).
{
  const preset = INDICATOR_LIBRARY.find((p) => p.id === 'x_ma')!;
  const r = evalPineLite(preset.formula, candles as never);
  assert.ok(count(r) > 50, 'Cross SMA يرسم قيماً');
  assert.ok(count(r, 1) >= 2, 'وتقاطعات صاعدة على موجة جيبية');
}
// ذرّة بسيطة مع دالة، وcrossunder، والمسافات والأحرف الكبيرة.
{
  assert.ok(count(evalPineLite('crossover(close,sma(close,21))', candles as never)) > 50);
  assert.ok(count(evalPineLite('crossunder( SMA(close, 9), sma(close,21) )', candles as never), 1) >= 1);
}
// قوس الأول لا يُغلق عند النهاية ⇒ ليس تقاطعاً واحداً (لا يُقسم خطأً).
{
  const r = evalPineLite('crossover(close,open)+crossover(open,close)', candles as never);
  assert.equal(r.length, candles.length);
}

// فترة 0 ⇒ فارغة لا ±Infinity (كان يُفسد مقياس السعر).
for (const f of ['ema(close,0)', 'highest(high,0)', 'lowest(low,0)', 'sma(close,0)']) {
  assert.ok(evalPineLite(f, candles).every((v) => v === null), f);
}
console.log('pineLite.selftest: PASS');
