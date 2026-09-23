/** فحص ذاتي لـ`polyline.ts` — يُشغَّل بـNode بلا شجرة مكوّنات. */
import { planLineSegments, planBandStrips, bandStripWidth } from './polyline';

let failures = 0;
function ok(name: string, cond: boolean) {
  if (!cond) {
    failures += 1;
    console.error('FAIL', name);
  }
}

/** لوح بسيط: عمود كل 10px، وسعر يهبط 1px لكل وحدة (كمقياس الشارت: ص تكبر نزولاً). */
const X = (i: number) => i * 10;
const Y = (v: number) => 100 - v;

// ١) سلسلة متّصلة ⇒ قطع = ن − ١، لا نقاط.
{
  const segs = planLineSegments([1, 2, 3, 4], X, Y);
  ok('أربع قيم ⇒ ثلاث قطع', segs.length === 3);
  ok('القطعة الأولى تبدأ عند الطرف الأول', segs[0]!.left === 0 && segs[0]!.top === 99);
  ok('مفتاح القطعة فهرس الطرف الثاني', segs.map((s) => s.at).join(',') === '1,2,3');
}

// ٢) الطول وتر لا فرق أفقي، والزاوية صحيحة الإشارة.
{
  const segs = planLineSegments([0, 10], (i) => i * 10, (v) => 100 - v);
  // من (0,100) إلى (10,90): Δس=10 Δص=−10 ⇒ طول √200، زاوية −45.
  ok('الطول وتر', Math.abs(segs[0]!.len - Math.hypot(10, 10)) < 1e-9);
  ok('صعود ⇒ زاوية سالبة (ص تكبر نزولاً)', Math.abs(segs[0]!.deg + 45) < 1e-9);
}
{
  const segs = planLineSegments([10, 0], (i) => i * 10, (v) => 100 - v);
  ok('هبوط ⇒ زاوية موجبة', Math.abs(segs[0]!.deg - 45) < 1e-9);
}
{
  const segs = planLineSegments([5, 5, 5], X, Y);
  ok('خطّ مسطّح ⇒ زاوية صفر', segs.every((s) => s.deg === 0));
  ok('خطّ مسطّح ⇒ الطول = خطوة العمود', segs.every((s) => Math.abs(s.len - 10) < 1e-9));
}

// ٣) الفجوة تقطع الخطّ ولا تُوصَل بقفزة — وهي حالة كل متوسط متحرك قبل اكتمال فترته.
{
  const segs = planLineSegments([null, null, 3, 4, 5], X, Y);
  ok('فجوة البداية ⇒ لا قطعة من الحافّة', segs.length === 2);
  ok('أول قطعة بعد الفجوة تبدأ عند أول قيمة صالحة', segs[0]!.left === 20);
}
{
  const segs = planLineSegments([1, 2, null, 4, 5], X, Y);
  ok('فجوة وسطى ⇒ مقطعان لا وصلة عابرة', segs.length === 2);
  ok('لا قطعة تعبر الفجوة', !segs.some((s) => s.at === 2 || s.at === 3));
}
{
  const segs = planLineSegments([1, 2, undefined, 4, 5], X, Y);
  ok('undefined فجوة كـnull', segs.length === 2);
  ok('لا وصلة تعبر undefined', !segs.some((s) => s.at === 2 || s.at === 3));
}
{
  // NaN فجوة لا إحداثي: 1 تصير معزولة (بديلة)، والوصلة تبدأ من 3 لا من 1.
  const segs = planLineSegments([1, NaN, 3, 4], X, Y);
  ok('NaN فجوة', segs.length === 2);
  ok('NaN: الأولى معزولة بديلة', segs[0]!.len === 3 && segs[0]!.at === 0);
  ok('NaN: لا وصلة عابرة', segs[1]!.at === 3);
}

// ٤) الصفر قيمة صالحة لا فجوة (الخطأ الكلاسيكي `!v`) — ومؤشرات كثيرة تمرّ بالصفر.
{
  const segs = planLineSegments([0, 0, 1], X, Y);
  ok('الصفر قيمة صالحة', segs.length === 2);
}

// ٥) نقطة معزولة ⇒ قطعة بديلة متمركزة، فلا تختفي السلسلة ذات القيمة الواحدة.
{
  const segs = planLineSegments([null, 5, null], X, Y);
  ok('نقطة معزولة ⇒ قطعة واحدة', segs.length === 1);
  ok('القطعة البديلة متمركزة على النقطة', segs[0]!.left === 10 - 1.5);
  ok('القطعة البديلة أفقية بطول 3', segs[0]!.len === 3 && segs[0]!.deg === 0);
}
{
  const segs = planLineSegments([5], X, Y);
  ok('قيمة وحيدة بالسلسلة كلّها ⇒ تظهر', segs.length === 1 && segs[0]!.len === 3);
}
{
  const segs = planLineSegments([null, 5, null], X, Y, { stubLen: 9 });
  ok('stubLen مخصّص', segs[0]!.len === 9 && segs[0]!.left === 10 - 4.5);
}
{
  const segs = planLineSegments([null, 5, null], X, Y, { stubLen: 0 });
  ok('stubLen صفر/فاسد ⇒ الافتراض لا اختفاء', segs[0]!.len === 3);
}
{
  const segs = planLineSegments([1, 2, null, 7, null, 9, 10], X, Y);
  // مقطع (1,2) ⇒ قطعة، ثم 7 معزولة ⇒ بديلة، ثم (9,10) ⇒ قطعة.
  ok('معزولة بين مقطعين', segs.length === 3 && segs[1]!.len === 3 && segs[1]!.at === 3);
}

// ٦) إحداثي غير محدود ⇒ إسقاط القطعة وحدها لا تعطيل السلسلة.
{
  const segs = planLineSegments([1, 2, 3], X, (v) => (v === 2 ? NaN : 100 - v));
  ok('yOf غير محدودة ⇒ القطعتان الملامستان تُسقطان', segs.length === 0);
}
{
  const segs = planLineSegments([1, 2, 3, 4], (i) => (i === 0 ? Infinity : i * 10), Y);
  ok('xOf غير محدودة عند طرف واحد ⇒ باقي القطع تبقى', segs.length === 2);
}
{
  const segs = planLineSegments([1, 2], X, () => 0);
  ok('yOf صفر إحداثي صالح', segs.length === 1);
}

// ٧) طول صفر ⇒ لا عقدة (لوح بعرض صفر، أو نقطتان متطابقتان تماماً).
{
  const segs = planLineSegments([5, 5], () => 0, Y);
  ok('طول صفر ⇒ تُسقَط', segs.length === 0);
}

// ٨) الحالات الفارغة.
{
  ok('سلسلة فارغة', planLineSegments([], X, Y).length === 0);
  ok('كلّها فجوات', planLineSegments([null, null, null], X, Y).length === 0);
}

// ٩) عرض الشريحة = خطوة العمود (+ الشعرة) لا رقم ثابت.
{
  ok('عشرون شمعة على 320px ⇒ 16.5', Math.abs(bandStripWidth(320, 20) - 16.5) < 1e-9);
  ok('ثمانون شمعة (الافتراض) ⇒ 4.5', Math.abs(bandStripWidth(320, 80) - 4.5) < 1e-9);
  ok('ألف شمعة ⇒ أقلّ عرض 1 لا صفر', bandStripWidth(320, 1000) === 1);
  ok('عدد صفر/فاسد ⇒ لا قسمة على صفر', Number.isFinite(bandStripWidth(320, 0)));
  ok('عرض لوح فاسد ⇒ 1', bandStripWidth(NaN, 20) === 1);
  ok('عرض لوح سالب ⇒ 1', bandStripWidth(-50, 20) === 1);
}

// ١٠) شرائح النطاق.
{
  const strips = planBandStrips([10, 12, 14], [6, 6, 6], X, Y, 10);
  ok('ثلاث شرائح', strips.length === 3);
  ok('الشريحة متمركزة على العمود', strips[0]!.left === -5);
  ok('الأعلى فوق والارتفاع الفرق', strips[0]!.top === 90 && strips[0]!.height === 4);
  ok('مفتاح الشريحة فهرسها', strips.map((s) => s.at).join(',') === '0,1,2');
}
{
  const strips = planBandStrips([10, null, 14], [6, 6, null], X, Y, 10);
  ok('أيّ طرف فجوة ⇒ لا شريحة', strips.length === 1 && strips[0]!.at === 0);
}
{
  // مقياس مقلوب: yOf تكبر مع السعر ⇒ الأعلى تحت. لا ارتفاع سالب.
  const strips = planBandStrips([10], [6], X, (v) => v, 10);
  ok('مقياس مقلوب ⇒ الأصغر أعلى', strips[0]!.top === 6 && strips[0]!.height === 4);
}
{
  const strips = planBandStrips([10], [10], X, Y, 10);
  ok('نطاق منضغط ⇒ أقلّ ارتفاع 2 لا صفر', strips[0]!.height === 2);
}
{
  const strips = planBandStrips([10], [6], X, Y, 0);
  ok('عرض فاسد ⇒ 2 لا صفر', strips[0]!.width === 2);
}
{
  const strips = planBandStrips([10], [6], () => NaN, Y, 10);
  ok('إحداثي غير محدود ⇒ تُسقَط', strips.length === 0);
}
{
  const strips = planBandStrips([0], [0], X, Y, 10);
  ok('نطاق عند الصفر صالح لا فجوة', strips.length === 1);
}
{
  const strips = planBandStrips([10, 12], [6], X, Y, 10);
  ok('طولان مختلفان ⇒ الأقصر يحكم', strips.length === 1);
}
{
  ok('نطاق فارغ', planBandStrips([], [], X, Y, 10).length === 0);
}

if (failures) {
  console.error(`polyline.selftest: ${failures} FAILED`);
  process.exitCode = 1;
} else {
  console.log('polyline.selftest: PASS');
}
