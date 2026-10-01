/**
 * Self-test: RVI (Volatility) كنصّ TradingView — stdev(close,10)، ema(14)، `change <= 0` يُنسَب للهابط.
 * Run: npx --yes tsx src/chart/rviVolTv.selftest.ts
 */
import assert from 'node:assert/strict';
import { computeRelativeVolatilityIndex } from './indicators/volatility';

let seed = 11;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const closes: number[] = [];
let p = 1.1;
for (let i = 0; i < 300; i++) {
  // ربع الشموع بإغلاق مساوٍ للسابق — الحالة التي كانت تُحسب صفراً للاثنين
  if (i > 0 && rnd() < 0.25) closes.push(p);
  else closes.push((p += (rnd() - 0.5) * 0.004));
}

// مرجع مستقلّ: stdev سكاني بنافذة 10، ema مبذورة بـsma (اتفاقية ema() بالمستودع) من أول قيمة صالحة
const L = 10;
const S = 14;
const sd: (number | null)[] = closes.map((_, i) => {
  if (i < L - 1) return null;
  const w = closes.slice(i - L + 1, i + 1);
  const m = w.reduce((a, b) => a + b, 0) / L;
  return Math.sqrt(w.reduce((a, b) => a + (b - m) ** 2, 0) / L);
});
const emaRef = (src: (number | null)[]) => {
  const out: (number | null)[] = [];
  let prev: number | null = null;
  const buf: number[] = [];
  for (const v of src) {
    if (v == null) {
      // ta.sma بنافذة فيها na ⇒ na: البذرة تحتاج S قيمة متتالية
      if (prev == null) buf.length = 0;
      out.push(null);
      continue;
    }
    if (prev == null) {
      buf.push(v);
      if (buf.length < S) {
        out.push(null);
        continue;
      }
      prev = buf.reduce((a, b) => a + b, 0) / S;
    } else prev = (v - prev) * (2 / (S + 1)) + prev;
    out.push(prev);
  }
  return out;
};
// Pine حرفياً: `change <= 0 ? 0 : stdev` — الصفر حقيقي حتى قبل اكتمال stdev
const up = emaRef(closes.map((c, i) => (i === 0 ? null : c - closes[i - 1] <= 0 ? 0 : sd[i])));
const dn = emaRef(closes.map((c, i) => (i === 0 ? null : c - closes[i - 1] > 0 ? 0 : sd[i])));

const got = computeRelativeVolatilityIndex(closes);
let checked = 0;
for (let i = 0; i < closes.length; i++) {
  const ref = up[i] == null || dn[i] == null ? null : (100 * up[i]!) / (up[i]! + dn[i]!);
  if (ref == null) {
    assert.equal(got[i], null, `bar ${i} should be warm-up`);
    continue;
  }
  assert.ok(Math.abs(got[i]! - ref) < 1e-9, `bar ${i}: ${got[i]} vs ${ref}`);
  checked++;
}
assert.equal(checked, 300 - (L - 1) - (S - 1));

// سوق مسطّح تماماً: كل شمعة «تعادل» ⇒ هابط كـTradingView، فلا يتجاوز 50 (50 عند تباين صفري حرفياً، 0 مع ضجيج
// التقريب)؛ صاعد بحت: 100؛ مسطّح بعد حركة: ينزل عن 100
assert.ok(computeRelativeVolatilityIndex(new Array(40).fill(1.2)).filter((v) => v != null).every((v) => v! <= 50));
const rising = Array.from({ length: 40 }, (_, i) => 1 + i * 0.001);
assert.ok(computeRelativeVolatilityIndex(rising).filter((v) => v != null).every((v) => v === 100));
const flatAfter = [...rising.slice(0, 20), ...new Array(15).fill(rising[19])];
const tail = computeRelativeVolatilityIndex(flatAfter);
assert.ok(tail[tail.length - 1]! < 100, 'flat closes after a rise must pull RVI below 100');

// سلسلة مسطّحة تماماً من البداية: الانحراف 0 بالضبط ⇒ محايد 50 (كان بقايا 2e-16 «هابطة» ⇒ 0)
const flat = computeRelativeVolatilityIndex(new Array(60).fill(1.08523));
assert.equal(flat[flat.length - 1], 50, 'flat series is neutral, not 0');

// تسع شموع هابطة أولاً: الجانب الصاعد صفر حقيقي منذ الشمعة 1 فمتوسّطه يُبذر قبل اكتمال stdev (كـPine).
// كان الجانبان فارغين حتى الشمعة 9 ⇒ الشمعة 22 ‏63.4 بدل ~51 بـTV.
{
  const c2: number[] = [1.2];
  for (let i = 1; i <= 8; i++) c2.push(1.2 - i * 0.001);
  for (let i = 9; i < 80; i++) c2.push(c2[i - 1] + (rnd() - 0.5) * 0.004);
  const sd2 = c2.map((_, i) => {
    if (i < L - 1) return null;
    const w = c2.slice(i - L + 1, i + 1);
    const m = w.reduce((a, b) => a + b, 0) / L;
    return Math.sqrt(w.reduce((a, b) => a + (b - m) ** 2, 0) / L);
  });
  const u2 = emaRef(c2.map((c, i) => (i === 0 ? null : c - c2[i - 1] <= 0 ? 0 : sd2[i])));
  const d2 = emaRef(c2.map((c, i) => (i === 0 ? null : c - c2[i - 1] > 0 ? 0 : sd2[i])));
  const g2 = computeRelativeVolatilityIndex(c2);
  for (let i = 0; i < c2.length; i++) {
    const ref = u2[i] == null || d2[i] == null ? null : (100 * u2[i]!) / (u2[i]! + d2[i]!);
    if (ref == null) assert.equal(g2[i], null, `falling-start bar ${i} warm-up`);
    else assert.ok(Math.abs(g2[i]! - ref) < 1e-9, `falling-start bar ${i}: ${g2[i]} vs ${ref}`);
  }
}

console.log(`rviVolTv selftest PASS (${checked} bars vs Pine reference)`);
