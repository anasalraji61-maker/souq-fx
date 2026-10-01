/** فحص ذاتي لبذرة `computeVzo` — يُشغَّل بـNode بلا شجرة مكوّنات. */
import assert from 'node:assert/strict';
import { computeVzo } from './indicators/volume';

// كـTradingView: `100 * ta.ema(math.sign(ta.change(close)) * volume, 14) / ta.ema(volume, 14)` — الشمعة 0 بلا تغيّر (na)
// ⇒ بذرة البسط متوسّط 1..14 وأوّل قيمة عند 14، والمقام بذرته 0..13.
const closes = Array.from({ length: 40 }, (_, i) => 1.1 + ((i * 7) % 5) * 0.001 - i * 0.0002);
const vols = closes.map((_, i) => 100 + ((i * 13) % 17));
const candles = closes.map((c, i) => ({ time: i * 60, open: c, high: c + 0.001, low: c - 0.001, close: c, volume: vols[i] }));
const z = computeVzo(candles, 14);
assert.equal(z[13], null, 'لا قيمة قبل 14 تغيّراً');
let num = 0;
for (let i = 1; i <= 14; i++) num += Math.sign(closes[i] - closes[i - 1]) * vols[i];
num /= 14;
let den = 0;
for (let i = 0; i < 14; i++) den += vols[i];
den /= 14;
den = den + (2 / 15) * (vols[14] - den);
const want = (100 * num) / den;
assert.ok(z[14] != null && Math.abs(z[14] - want) < 1e-9, `أوّل قيمة: ${z[14]} ≈ ${want}`);

console.log('vzoTv.selftest: PASS');
