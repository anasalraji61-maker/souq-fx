/** فحص ذاتي لـ`lineStyle.ts` — يُشغَّل بـNode بلا شجرة مكوّنات. */
import type { Drawing } from './types';
import { drawingLineStyle, drawingLineWidth, hasLineStyle, withNextLineStyle, withNextLineWidth } from './lineStyle';

let failures = 0;
function ok(name: string, cond: boolean) {
  if (!cond) {
    failures += 1;
    console.error('FAIL', name);
  }
}

const base = (tool: Drawing['tool']): Drawing => ({ id: 'x', tool, a: { index: 0, price: 1, time: 0 }, b: { index: 5, price: 1.1, time: 300 }, color: '#fff' });

// الافتراضي كما كانت تُرسم — الرسوم المحفوظة القديمة لا تتغيّر.
ok('ترند 2px متّصل', drawingLineWidth(base('trend')) === 2 && drawingLineStyle(base('trend')) === 'solid');
ok('أفقي 1px متقطّع', drawingLineWidth(base('hline')) === 1 && drawingLineStyle(base('hline')) === 'dashed');
ok('شعاع أفقي متّصل', drawingLineStyle(base('hray')) === 'solid');
ok('رأسي متقطّع', drawingLineStyle(base('vline')) === 'dashed');

// الدورة تعود للافتراضي وتحذف المفتاح.
let d = base('trend');
const widths: number[] = [];
for (let i = 0; i < 4; i++) {
  d = withNextLineWidth(d);
  widths.push(drawingLineWidth(d));
}
ok('سُمك الترند 3,4,1,2', widths.join() === '3,4,1,2');
ok('العودة للافتراضي تحذف المفتاح', !('lineWidth' in d));
let h = base('hline');
h = withNextLineStyle(h);
ok('أفقي: متقطّع ⇒ منقّط', drawingLineStyle(h) === 'dotted' && h.lineStyle === 'dotted');
h = withNextLineStyle(h);
ok('أفقي: منقّط ⇒ متّصل (يُكتب — ليس افتراضيه)', h.lineStyle === 'solid');
h = withNextLineStyle(h);
ok('أفقي: ⇒ متقطّع (افتراضيه، يُحذف)', !('lineStyle' in h));

// قيمة محفوظة فاسدة ⇒ الافتراضي لا خطّ بسُمك 40.
ok('سُمك فاسد ⇒ الافتراضي', drawingLineWidth({ ...base('trend'), lineWidth: 40 }) === 2);
ok('نمط فاسد ⇒ الافتراضي', drawingLineStyle({ ...base('hline'), lineStyle: 'wavy' as never }) === 'dashed');

// غير الخطوط لا تتغيّر.
ok('فيبو ليس خطّاً', !hasLineStyle('fib'));
const fib = base('fib');
ok('فيبو لا يُعدَّل', withNextLineWidth(fib) === fib && withNextLineStyle(fib) === fib);

if (failures) {
  console.error(`lineStyle.selftest: ${failures} FAILED`);
  process.exitCode = 1;
} else {
  console.log('lineStyle.selftest: PASS');
}
