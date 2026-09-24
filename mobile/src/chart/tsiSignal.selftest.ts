/**
 * Self-test: TSI بخطّ إشارته `ema(tsi, 13)` كـTradingView، وأوّل قيمة بلا صفر مختلَق بالشمعة 0.
 * Run: npx --yes tsx src/chart/tsiSignal.selftest.ts
 */
import assert from 'node:assert/strict';
import { computeTsi } from './indicators/momentum';

let seed = 23;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
const closes: number[] = [];
let p = 1.1;
for (let i = 0; i < 200; i++) closes.push((p += (rnd() - 0.5) * 0.004));

// مرجع مستقلّ بأسلوب Pine: ema مبذورة بـsma لأوّل `len` قيمة غير na
const emaRef = (src: (number | null)[], len: number) => {
  const out: (number | null)[] = [];
  const a = 2 / (len + 1);
  let prev: number | null = null;
  const seedBuf: number[] = [];
  for (const v of src) {
    if (v == null) {
      out.push(null);
      continue;
    }
    if (prev == null) {
      seedBuf.push(v);
      if (seedBuf.length < len) {
        out.push(null);
        continue;
      }
      prev = seedBuf.reduce((x, y) => x + y, 0) / len;
    } else prev = a * v + (1 - a) * prev;
    out.push(prev);
  }
  return out;
};
const pc = closes.map((c, i) => (i === 0 ? null : c - closes[i - 1]));
const ds = (src: (number | null)[]) => emaRef(emaRef(src, 25), 13);
const num = ds(pc);
const den = ds(pc.map((v) => (v == null ? null : Math.abs(v))));
const tsiRef = num.map((v, i) => (v == null || den[i] == null ? null : (100 * v) / den[i]!));
const sigRef = emaRef(tsiRef, 13);

const { tsi, signal } = computeTsi(closes);
assert.equal(tsi.length, closes.length);
assert.equal(signal.length, closes.length);
// الزخم يبدأ بالشمعة 1 ⇒ EMA25 أوّلها 25، EMA13 فوقها 37، الإشارة 49
assert.equal(tsi[36], null);
assert.notEqual(tsi[37], null);
assert.equal(signal[48], null);
assert.notEqual(signal[49], null);
for (let i = 0; i < closes.length; i++) {
  if (tsiRef[i] == null) assert.equal(tsi[i], null, `tsi ${i}`);
  else assert.ok(Math.abs((tsi[i] as number) - tsiRef[i]!) < 1e-9, `tsi ${i}`);
  if (sigRef[i] == null) assert.equal(signal[i], null, `sig ${i}`);
  else assert.ok(Math.abs((signal[i] as number) - sigRef[i]!) < 1e-9, `sig ${i}`);
}
// سعر ثابت ⇒ لا قيمة (na كـTradingView)، لا 0 «محايد»
const flat = computeTsi(Array(80).fill(1.2345));
assert.ok(flat.tsi.every((v) => v == null));
assert.ok(flat.signal.every((v) => v == null));

console.log('tsiSignal selftest: PASS');
