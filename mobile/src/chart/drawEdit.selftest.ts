/**
 * فحص ذاتي لـ`drawEdit.ts` — يُشغَّل بـNode بلا شجرة مكوّنات.
 * الغرض: إثبات أن اللمسة التي لا تُغيّر شيئاً لا تدفع لقطة تراجع، وأن التغيّر الحقيقي يدفعها.
 */
import type { ChartPoint, Drawing } from './types';
import { samePoint, drawingEnd, dragChangesDrawing } from './drawEdit';

let failures = 0;
function ok(name: string, cond: boolean) {
  if (!cond) {
    failures += 1;
    console.error('FAIL', name);
  }
}

const pt = (index: number, price: number): ChartPoint => ({ index, price });
const line = (a: ChartPoint, b?: ChartPoint): Drawing => ({
  id: 'd1',
  tool: b ? 'trend' : 'hline',
  a,
  ...(b ? { b } : {}),
  color: '#2DD4BF',
});

// ── samePoint ──────────────────────────────────────────────────────────────
ok('نقطتان متطابقتان', samePoint(pt(10, 1.085), pt(10, 1.085)));
ok('فهرس مختلف ⇒ تغيّر', !samePoint(pt(10, 1.085), pt(11, 1.085)));
ok('سعر مختلف ⇒ تغيّر', !samePoint(pt(10, 1.085), pt(10, 1.0851)));
ok('null ⇒ ليس تطابقاً', !samePoint(null, pt(10, 1.085)));
ok('كلاهما null ⇒ ليس تطابقاً', !samePoint(null, null));
// السعر 0 والفهرس 0 قيمتان صالحتان لا غائبتان — الخطأ الكلاسيكي هنا `!a.price`.
ok('الصفر قيمة صالحة', samePoint(pt(0, 0), pt(0, 0)));
ok('الصفر مقابل غيره ⇒ تغيّر', !samePoint(pt(0, 0), pt(0, 1)));

// ── drawingEnd ─────────────────────────────────────────────────────────────
ok('طرف a', drawingEnd(line(pt(3, 2)), 'a')?.index === 3);
ok('طرف b موجود', drawingEnd(line(pt(3, 2), pt(9, 5)), 'b')?.index === 9);
ok('طرف b غائب على رسم بطرف واحد ⇒ null', drawingEnd(line(pt(3, 2)), 'b') === null);
ok('رسم غائب ⇒ null', drawingEnd(null, 'a') === null);

// ── dragChangesDrawing ─────────────────────────────────────────────────────
// الحالة التي نشأ عنها البند: خطّ أفقي محدَّد، لمسة تُعيد النقطة نفسها.
const h = line(pt(40, 1.0862));
ok('لمسة بلا تغيّر على خط أفقي ⇒ لا لقطة', !dragChangesDrawing(h, 'a', pt(40, 1.0862)));
ok('سحب فعلي على خط أفقي ⇒ لقطة', dragChangesDrawing(h, 'a', pt(40, 1.0871)));
// المغناطيس: حركة داخل الشمعة نفسها تُعيد سعر الإغلاق ذاته ⇒ نقطة مطابقة حرفياً.
ok('مغناطيس يعيد النقطة ذاتها ⇒ لا لقطة', !dragChangesDrawing(h, 'a', pt(40, 1.0862)));
// وفهرس مختلف بنفس السعر تغيّر حقيقي (الخط العمودي يتحرّك بالفهرس وحده).
ok('فهرس مختلف بنفس السعر ⇒ لقطة', dragChangesDrawing(h, 'a', pt(41, 1.0862)));

const t = line(pt(10, 1.08), pt(30, 1.09));
ok('سحب طرف b فعلي ⇒ لقطة', dragChangesDrawing(t, 'b', pt(31, 1.09)));
ok('طرف b بلا تغيّر ⇒ لا لقطة', !dragChangesDrawing(t, 'b', pt(30, 1.09)));
// طرف b على رسم بطرف واحد: لا مرجع ⇒ لا لقطة (ولا استثناء).
ok('طرف b غائب ⇒ لا لقطة', !dragChangesDrawing(h, 'b', pt(5, 1.2)));
ok('رسم غائب ⇒ لا لقطة', !dragChangesDrawing(null, 'a', pt(5, 1.2)));
ok('رسم غير معرَّف ⇒ لا لقطة', !dragChangesDrawing(undefined, 'a', pt(5, 1.2)));

if (failures) {
  console.error(`drawEdit.selftest: ${failures} FAILED`);
  process.exitCode = 1;
} else {
  console.log('drawEdit.selftest: PASS');
}
