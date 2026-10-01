/**
 * Self-test: قناة الانحدار الخطي خطّ واحد مستقيم على آخر `period` شمعة (كـTradingView)، لا شريط متدحرج.
 * Run: npx --yes tsx src/chart/linRegChannel.selftest.ts
 */
import assert from 'node:assert/strict';
import { computeLinRegChannel } from './indicators/trend';

// صعود 5 pip/شمعة 150 شمعة ثم هبوط 50
const closes = Array.from({ length: 200 }, (_, i) => (i < 150 ? 1.1 + i * 0.0005 : 1.1 + 149 * 0.0005 - (i - 149) * 0.0005));
const { mid, upper, lower } = computeLinRegChannel(closes, 100, 2);

assert.equal(mid[99], null, 'قبل النافذة فارغ');
assert.equal(typeof mid[100], 'number');
// مستقيم: فرق ثابت بين كل شمعتين متتاليتين
const step = (mid[101] as number) - (mid[100] as number);
for (let i = 101; i < 200; i++) {
  assert.ok(Math.abs((mid[i] as number) - (mid[i - 1] as number) - step) < 1e-12, `mid مستقيم عند ${i}`);
  assert.ok(Math.abs((upper[i] as number) - (mid[i] as number) - ((upper[100] as number) - (mid[100] as number))) < 1e-12, 'عرض ثابت');
  assert.ok(Math.abs((mid[i] as number) - (lower[i] as number) - ((upper[i] as number) - (mid[i] as number))) < 1e-12, 'متناظر');
}
// عند الشمعة 150 (القمّة) العرض ليس صفراً كما كان بالمتدحرج
assert.ok((upper[150] as number) - (lower[150] as number) > 0.005, 'عرض القناة عند القمّة');

// مسار خطي بحت ⇒ upper=mid=lower=السعر
const lin = Array.from({ length: 120 }, (_, i) => 1.2 + i * 0.0001);
const r = computeLinRegChannel(lin, 100, 2);
assert.ok(Math.abs((r.mid[119] as number) - lin[119]) < 1e-12);
assert.ok(Math.abs((r.upper[60] as number) - lin[60]) < 1e-12);

// أقصر من period ⇒ لا شيء
assert.ok(computeLinRegChannel(closes.slice(0, 50), 100).mid.every((v) => v === null));

console.log('linRegChannel selftest PASS');
