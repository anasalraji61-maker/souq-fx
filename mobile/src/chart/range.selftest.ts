/** Range bars: الشمعة التي تتكوّن تُعرض (كانت تُرمى). */
import type { Candle } from '../api';
import { RANGE_MAX_BARS, rangeBars } from './range';

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

// الصندوق التلقائي من الشموع المغلقة: تيك حيّ يوسّع مدى الشمعة الأخيرة لا يعيد تقسيم الشموع السابقة.
const hist = Array.from({ length: 30 }, (_, i) =>
  c(i, 1 + (i % 5) * 0.1, 1 + (i % 5) * 0.1 + 0.2, 1 + (i % 5) * 0.1 - 0.1, 1 + ((i + 1) % 5) * 0.1)
);
const before = rangeBars([...hist, c(30, 1.2, 1.25, 1.15, 1.2)]);
const after = rangeBars([...hist, c(30, 1.2, 6, 1.15, 1.2)]);
// المقارنة على الشموع التي أُغلقت قبل الحيّة (التالية لها فُتحت قبلها) — الحيّة نفسها تولّد شموعاً الآن.
const closedBefore = (bs: Candle[]) =>
  bs.filter((_, i) => bs[i + 1] != null && (bs[i + 1] as { srcTime?: number }).srcTime! < 30).map((b) => b.close).join();
ok('الحيّة لا تغيّر الشموع المغلقة', closedBefore(before) !== '' && closedBefore(before) === closedBefore(after));

// كل شمعة مغلقة بمدى الصندوق بالضبط: شمعة أصلية من 1 إلى 4.5 (3.5 صندوق) ⇒ ثلاث شموع بطول 1 وتتكوّن بنصف.
const big = rangeBars([c(1, 1, 1.2, 1, 1.1), c(2, 1.1, 4.5, 1.1, 4.5)], 1);
ok('ثلاث مغلقة + تتكوّن', big.length === 4);
ok('المغلقة بطول الصندوق', big.slice(0, 3).every((b) => Math.abs(b.high - b.low - 1) < 1e-9));
ok('تُغلق عند طرفها', big.slice(0, 3).every((b) => b.close === b.high));
ok('التالية تفتح من إغلاق السابقة', big[1]!.open === big[0]!.close && big[3]!.open === big[2]!.close);
ok('الأزمنة متزايدة', big.every((b, i) => i === 0 || b.time > big[i - 1]!.time));
// هابطة: فتح→أعلى→أدنى→إغلاق — الشمعة تُغلق عند أدنى طرفها.
const down = rangeBars([c(1, 3, 3, 2.9, 2.95), c(2, 2.95, 2.95, 0.5, 0.5)], 1);
ok('هابطة: تُغلق عند الأدنى', down[0]!.close === down[0]!.low && Math.abs(down[0]!.high - down[0]!.low - 1) < 1e-9);

// QA36: تاريخ مسطّح (أعلى = أدنى) ثم +1% على BTC — كان 100001 شمعة (تجمّد). الأرضية نسبية والناتج مسقوف.
const flatBtc = Array.from({ length: 50 }, (_, i) => c(i, 60000, 60000, 60000, 60000));
const t0 = Date.now();
const spike = rangeBars([...flatBtc, c(50, 60000, 60600, 60000, 60600)]);
ok('مسطّح ثم قفزة: عدد محدود', spike.length > 1 && spike.length <= RANGE_MAX_BARS && Date.now() - t0 < 500);
ok('مسطّح ثم قفزة: آخر إغلاق = السعر', spike[spike.length - 1]!.close === 60600 || Math.abs(spike[spike.length - 1]!.close - 60600) < 1e-6);
// صندوق صغير جداً صريح: القفزة تُسقف وآخر شمعة ما زالت عند السعر الحقيقي (لا قصّ صامت بالحارس).
const tiny = rangeBars([c(1, 1, 1, 1, 1), c(2, 1, 2, 1, 2)], 1e-6);
ok('صندوق صغير: مسقوف', tiny.length === RANGE_MAX_BARS);
ok('صندوق صغير: يصل للسعر', Math.abs(tiny[tiny.length - 1]!.close - 2) < 1e-6);
ok('صندوق صغير: كل شمعة بطول الصندوق', tiny.every((b) => Math.abs(b.high - b.low - 1e-6) < 1e-9));
ok('صندوق صغير: متّصلة', tiny.every((b, i) => i === 0 || Math.abs(b.open - tiny[i - 1]!.close) < 1e-12));

if (failures) {
  console.error(`range.selftest: ${failures} FAIL`);
  process.exit(1);
}
console.log('range.selftest: PASS');
