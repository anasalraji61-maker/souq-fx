/**
 * Self-test for Kagi / Point & Figure default sizing — ATR(14) كـTradingView.
 * Run: npx --yes tsx src/chart/kagiPnfAtr.selftest.ts
 */
import assert from 'node:assert/strict';
import { kagi } from './kagi';
import { pointFigure } from './pointFigure';

// مدى ثابت 0.0020 (20 نقطة) وإغلاق يصعد 0.0010 كل شمعة ⇒ المدى الحقيقي = 0.0020 دائماً ⇒ ATR = 0.0020.
const bar = (i: number, close: number) => ({
  time: i * 60,
  open: close,
  high: close + 0.001,
  low: close - 0.001,
  close,
  volume: 1,
});
const rising = Array.from({ length: 40 }, (_, i) => bar(i, 1.1 + i * 0.001));

// P&F: صندوق = ATR = 0.0020 (كان نصف متوسط المدى = 0.0010).
const pf = pointFigure(rising);
const size = pf[pf.length - 1].box!;
assert.ok(Math.abs(size - 0.002) < 1e-9, `pnf box ${size}`);

// Kagi: انعكاس = ATR (0.0020). تراجع 15 نقطة لا يعكس الخط، و25 نقطة تعكسه.
// (القديم 0.4% من 1.14 ≈ 46 نقطة ⇒ لا انعكاس في الحالتين.)
const last = rising[rising.length - 1].close;
const small = kagi([...rising, bar(40, last - 0.0015)]);
assert.ok(small[small.length - 1].close >= small[small.length - 1].open, 'no reversal under ATR');
const big = kagi([...rising, bar(40, last - 0.0025)]);
assert.ok(big[big.length - 1].close < big[big.length - 1].open, 'reversal past ATR');

// مبلغ صريح ما زال يعمل.
assert.equal(kagi([...rising, bar(40, last - 0.0025)], 0.005).at(-1)!.close, last);

// Kagi: خطّ واحد لكل اتجاه، والسُّمك يتبدّل عند كسر الخصر/تجاوز الكتف لا مع كل خطّ صاعد.
const kpath = [1.1, 1.104, 1.11, 1.105, 1.108, 1.103, 1.112];
const kl = kagi(kpath.map((p, i) => bar(i, p)), 0.002);
assert.equal(kl.length, 5, `kagi lines ${kl.length}`);
assert.ok(Math.abs(kl[0].open - 1.1) < 1e-12 && Math.abs(kl[0].close - 1.11) < 1e-12, 'one up line 1.100→1.110');
assert.deepEqual(kl[0].kagi, { thickAtOpen: true });
assert.deepEqual(kl[1].kagi, { thickAtOpen: true }, 'no waist yet ⇒ stays thick');
assert.deepEqual(kl[2].kagi, { thickAtOpen: true }, '1.108 under shoulder 1.110 ⇒ thick unchanged');
assert.deepEqual(kl[3].kagi, { thickAtOpen: true, flipAt: 1.105 }, 'breaks waist 1.105 ⇒ thin');
assert.deepEqual(kl[4].kagi, { thickAtOpen: false, flipAt: 1.108 }, 'clears shoulder 1.108 ⇒ thick');
assert.equal(kl[3].open, kl[2].close, 'lines join at the reversal price');
console.log('kagiPnfAtr selftest PASS');

// P&F على شبكة مضاعفات الصندوق: الإغلاق الأول 1.10037 وصندوق 0.001 ⇒ أوّل صندوق يبدأ 1.100 لا 1.10037.
const offGrid = Array.from({ length: 20 }, (_, i) => bar(i, 1.10037 + i * 0.0005));
const grid = pointFigure(offGrid, 0.001);
for (const b of grid) {
  for (const v of [b.open, b.close]) {
    const k = v / 0.001;
    assert.ok(Math.abs(k - Math.round(k)) < 1e-6, `pnf off grid ${v}`);
  }
}
assert.ok(Math.abs(grid[0].open - 1.1) < 1e-9, `pnf first box ${grid[0].open}`);
// 300 صندوق صاعد: آخر إغلاق بالضبط على الشبكة (لا انجراف من جمع متكرّر).
const long = Array.from({ length: 301 }, (_, i) => bar(i, 1 + i * 0.001));
const lp = pointFigure(long, 0.001).at(-1)!.close;
assert.ok(Math.abs(lp - 1.3) < 1e-12, `pnf drift ${lp}`);

// عمود واحد لكل اتجاه (لا شمعة لكل صندوق): صعود 10 صناديق، هبوط صندوقين (< انعكاس 3) لا يفتح عموداً،
// ثم هبوط 5 صناديق ⇒ عمود O يبدأ من قمّة X (رموزه تحتها بصندوق) وينتهي عند المستوى.
const path = [1.1, 1.101, 1.102, 1.103, 1.104, 1.105, 1.106, 1.107, 1.108, 1.109, 1.11, 1.108, 1.105, 1.106];
const cols = pointFigure(path.map((p, i) => bar(i, p)), 0.001);
assert.equal(cols.length, 2, `pnf columns ${cols.length}`);
assert.ok(Math.abs(cols[0].open - 1.1) < 1e-9 && Math.abs(cols[0].close - 1.11) < 1e-9, 'X column 1.100→1.110');
assert.ok(Math.abs(cols[1].open - 1.11) < 1e-9 && Math.abs(cols[1].close - 1.105) < 1e-9, 'O column 1.110→1.105');
assert.equal(cols[0].volume, 10);
assert.equal(cols[1].srcTime, 12 * 60, 'O column anchored to the candle that opened it');
assert.ok(cols[1].time > cols[0].time);
console.log('pnf grid selftest PASS');
