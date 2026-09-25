/** Range bars: الشمعة التي تتكوّن تُعرض (كانت تُرمى). */
import type { Candle } from '../api';
import { rangeBars } from './range';

let failures = 0;
function ok(name: string, cond: boolean) {
  if (!cond) {
    failures += 1;
    console.error('FAIL', name);
  }
}

const c = (time: number, o: number, h: number, l: number, cl: number): Candle =>
  ({ time, open: o, high: h, low: l, close: cl }) as Candle;

// صندوق 1.0: شمعة تُغلق عند 2، ثم حركة 0.6 لم تبلغ الصندوق.
const bars = rangeBars(
  [c(1, 1, 1.2, 1, 1.1), c(2, 1.1, 2, 1.1, 2), c(3, 2, 2.4, 2, 2.3), c(4, 2.3, 2.6, 2.3, 2.6)],
  1
);
ok('شمعتان: مغلقة + تتكوّن', bars.length === 2);
ok('المغلقة تنتهي عند 2', bars[0]?.close === 2 && bars[0]?.high === 2 && bars[0]?.low === 1);
ok('التي تتكوّن تحمل آخر إغلاق', bars[1]?.close === 2.6 && bars[1]?.open === 2 && bars[1]?.high === 2.6);
ok('زمنها بعد المغلقة', bars[1]!.time > bars[0]!.time);

// آخر شمعة أصلية أغلقت الصندوق ⇒ لا شمعة فارغة بعدها.
const exact = rangeBars([c(1, 1, 1.2, 1, 1.1), c(2, 1.1, 2, 1.1, 2)], 1);
ok('بلا شمعة فارغة', exact.length === 1 && exact[0]!.close === 2);

// لا شيء بلغ الصندوق ⇒ الشموع الأصلية كما كانت.
const flat = [c(1, 1, 1.1, 1, 1.05), c(2, 1.05, 1.1, 1, 1.02)];
ok('بلا صندوق ⇒ الأصل', rangeBars(flat, 1) === flat);

if (failures) {
  console.error(`range.selftest: ${failures} FAIL`);
  process.exit(1);
}
console.log('range.selftest: PASS');
