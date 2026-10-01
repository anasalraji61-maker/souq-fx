/**
 * Self-test: DeMarker warm-up — the first window is bars 1..period (bar 0 has no previous bar).
 * Run: npx --yes tsx src/chart/demarker.selftest.ts
 */
import assert from 'node:assert/strict';
import { computeDemarker } from './indicators/momentum';

const bar = (i: number, high: number, low: number) => ({ time: i * 60, open: low, high, low, close: high });

// صعود متّصل: كل شمعة تعلو سابقتها ⇒ DeMin=0 ⇒ DeMarker = 1 بالضبط من أوّل قيمة
{
  const bars = Array.from({ length: 20 }, (_, i) => bar(i, 1.1 + i * 0.001, 1.09 + i * 0.001));
  const d = computeDemarker(bars, 14);
  assert.equal(d[13], null, 'الشمعة 13 بلا نافذة كاملة من الفروق');
  assert.equal(d[14], 1);
  assert.equal(d[19], 1);
}

// أوّل قيمة من 14 فرقاً حقيقياً: 7 صعود (+2) و7 هبوط (−1 للقاع) ⇒ ‎14/(14+7)‎
{
  const bars = [bar(0, 1.1, 1.09)];
  let h = 1.1;
  let l = 1.09;
  for (let i = 1; i <= 14; i++) {
    if (i % 2) {
      h += 0.002;
      l += 0.002;
    } else {
      l -= 0.003;
      h -= 0.003;
    }
    bars.push(bar(i, h, l));
  }
  const d = computeDemarker(bars, 14);
  // الصعود: DeMax ‎0.002‎ ×7؛ الهبوط: DeMin ‎0.003‎ ×7
  assert.ok(Math.abs(d[14]! - 0.014 / (0.014 + 0.021)) < 1e-9, String(d[14]));
}

console.log('demarker.selftest: PASS');
