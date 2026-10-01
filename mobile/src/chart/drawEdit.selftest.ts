/**
 * فحص ذاتي لـ`drawEdit.ts` — يُشغَّل بـNode بلا شجرة مكوّنات.
 * الغرض: إثبات أن اللمسة التي لا تُغيّر شيئاً لا تدفع لقطة تراجع، وأن التغيّر الحقيقي يدفعها.
 */
import type { ChartPoint, Drawing } from './types';
import { samePoint, drawingEnd, dragChangesDrawing, clipSegmentToBars, rayReach, translateDrawing, sameDrawingPlace, cloneShift, CLONE_SHIFT_PX, raySegment, withDrawingArrow, withDrawingLock, withDrawingFibReverse, withNextExtend, drawingExtend, extendedSegment, drawToolShortcut, drawToolShortcutLabel, nudgeAxes } from './drawEdit';

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

// ── clipSegmentToBars ─────────────────────────────────────────────────────
// خطّ من −30 (y=100) إلى 30 (y=40): عند الفهرس 0 يقع في منتصفه ⇒ y=70 (لا 100 كما كان).
const c1 = clipSegmentToBars(-30, 100, 30, 40, 79);
ok('قصّ اليسار على الخطّ', c1.ai === 0 && c1.ay === 70 && c1.bi === 30 && c1.by === 40);
// الطرفان داخل النافذة ⇒ بلا تغيير.
const c2 = clipSegmentToBars(5, 10, 20, 50, 79);
ok('داخل النافذة كما هو', c2.ai === 5 && c2.ay === 10 && c2.bi === 20 && c2.by === 50);
// طرف أيمن بالمستقبل (100) مقصوص على 79: y عند 79 من خطّ 0→100 (0→200) = 158.
const c3 = clipSegmentToBars(0, 0, 100, 200, 79);
ok('قصّ اليمين على الخطّ', c3.bi === 79 && c3.by === 158);
// طرفان بنفس الفهرس خارج النافذة ⇒ لا قسمة على صفر.
const c4 = clipSegmentToBars(-5, 10, -5, 30, 79);
ok('فهرس واحد ⇒ بلا NaN', c4.ai === 0 && c4.ay === 10 && c4.by === 30);

// تحريك الرسم كلّه: الطرفان بالإزاحة نفسها، وختم جديد، ولا خانة قبل الصفر
const stamp = (i: number) => (i > 9 ? { time: 1000 + 9 * 60, ahead: i - 9, aheadStep: 60 } : { time: 1000 + i * 60 });
const trend: Drawing = {
  id: 't1',
  tool: 'trend',
  a: { index: 2, price: 1.08, time: 1 },
  b: { index: 5, price: 1.09, time: 2 },
  color: '#fff',
};
const up = (p: number) => Math.round((p + 0.001) * 1e6) / 1e6;
let moved = translateDrawing(trend, 3, up, stamp);
ok('translate: a index', moved.a.index === 5 && moved.b!.index === 8);
ok('translate: price shift keeps slope', moved.a.price === 1.081 && moved.b!.price === 1.091);
ok('translate: restamped (old time dropped)', moved.a.time === 1300 && moved.b!.time === 1480);
ok('translate: other fields kept', moved.id === 't1' && moved.tool === 'trend' && moved.color === '#fff');
moved = translateDrawing(trend, -10, (p) => p, stamp);
ok('translate: stops at index 0', moved.a.index === 0 && moved.b!.index === 3);
{
  const old: Drawing = { ...trend, a: { index: -4, price: 1.08, time: 1 }, b: { index: 60, price: 1.09, time: 2 } };
  const left = translateDrawing(old, -3, (p) => p, (i) => ({ time: 1000 + i * 60 }));
  ok('translate: oldest end before history still moves left', left.a.index === -7 && left.b!.index === 57 && left.a.time === 1000 - 7 * 60);
  ok('translate: newest end stops at 0', translateDrawing(old, -100, (p) => p, stamp).b!.index === 0);
}
moved = translateDrawing(trend, 6, (p) => p, stamp);
ok('translate: into the future gets ahead', moved.b!.index === 11 && moved.b!.ahead === 2);
// رأسي بحت (▲▼ أو سحب بلا إزاحة شمعة): الختم الأصلي يبقى — على Renko كان يُستبدل بزمن اللبنة الأقدم
const renkoTrend: Drawing = { ...trend, a: { index: 2, price: 1.08, time: 7200, sub: 0.25 }, b: { index: 5, price: 1.09, time: 9000, ahead: 1, aheadStep: 3600 } };
moved = translateDrawing(renkoTrend, 0, up, stamp);
ok('translate: vertical keeps a stamp', moved.a.time === 7200 && moved.a.sub === 0.25 && moved.a.index === 2);
ok('translate: vertical keeps b stamp', moved.b!.time === 9000 && moved.b!.ahead === 1 && moved.b!.aheadStep === 3600);
ok('translate: vertical moves price', moved.a.price === 1.081 && moved.b!.price === 1.091);
moved = translateDrawing(renkoTrend, 0.4, up, stamp);
ok('translate: sub-bar drag rounds to vertical', moved.a.time === 7200 && moved.b!.time === 9000);
const hl: Drawing = { id: 'h', tool: 'hline', a: { index: 4, price: 1.1 }, color: '#fff' };
moved = translateDrawing(hl, 1, (p) => p, stamp);
ok('translate: single point has no b key', !('b' in moved) && moved.a.index === 5);
ok('sameDrawingPlace: zero move', sameDrawingPlace(trend, translateDrawing(trend, 0, (p) => p, () => null)));
ok('sameDrawingPlace: moved', !sameDrawingPlace(trend, translateDrawing(trend, 1, (p) => p, () => null)));
ok('sameDrawingPlace: null', !sameDrawingPlace(null, trend));

// ── rayReach ─────────────────────────────────────────────────────────────
// شعاع أفقي من 100 إلى 110 بلوح 300 ⇒ يبلغ الحافّة اليمنى (t = 20)
ok('شعاع أفقي يبلغ الحافّة اليمنى', rayReach(100, 50, 110, 50, 300, 200) === 20);
// صاعد بالشاشة: يخرج من الأعلى قبل اليمين
ok('شعاع صاعد يخرج من الأعلى', rayReach(100, 50, 110, 40, 300, 200) === 5);
// متّجه يساراً ⇒ الحافّة اليسرى
ok('شعاع لليسار يبلغ x=0', rayReach(100, 50, 90, 50, 300, 200) === 10);
// الطرف الثاني بعد الحافّة ⇒ القطعة كاملة لا أقصر
ok('لا يقصر عن القطعة', rayReach(100, 50, 400, 50, 300, 200) === 1);
ok('قطعة صفرية ⇒ 1', rayReach(100, 50, 100, 50, 300, 200) === 1);
ok('رأسي لأسفل ⇒ الحافّة السفلى', rayReach(100, 50, 100, 60, 300, 200) === 15);

// نسخة الرسم: لأسفل بالنصف العلوي، لأعلى بالسفلي، والرأسي يميناً بالشموع
ok('نسخة بالنصف العلوي ⇒ لأسفل', cloneShift('trend', false).px === CLONE_SHIFT_PX && cloneShift('trend', false).bars === 0);
ok('نسخة بالنصف السفلي ⇒ لأعلى', cloneShift('hline', true).px === -CLONE_SHIFT_PX);
ok('نسخة خطّ رأسي ⇒ 3 شموع', cloneShift('vline', true).bars === 3 && cloneShift('vline', true).px === 0);

// الشعاع وطرفاه يسار النافذة: يبقى مرئياً على الخطّ نفسه لا قطعةً صفرية
{
  const r = raySegment(-20, 100, -10, 90, 50); // ميل −1px/شمعة
  ok('شعاع خارج اليسار ممتدّ', r.extended && r.ai === 0 && r.bi === 1);
  ok('شعاع خارج اليسار على الخطّ', Math.abs(r.ay - 80) < 1e-9 && Math.abs(r.by - 79) < 1e-9);
  ok('شعاع متّجه يساراً يبقى مقصوصاً', !raySegment(-10, 90, -20, 100, 50).extended);
  const inView = raySegment(-5, 100, 10, 90, 50);
  ok('طرف ظاهر ⇒ القصّ العادي', !inView.extended && inView.ai === 0 && inView.bi === 10);
  // المرآة: متّجه يساراً وطرفاه يمين النافذة (شارت مُمرَّر للخلف) ⇒ ممتدّ من آخر خانة على الخطّ نفسه
  const m = raySegment(130, 50, 100, 80, 79); // ميل −1px/شمعة يساراً
  ok('شعاع يساري خارج اليمين ممتدّ', m.extended && m.ai === 79 && m.bi === 78);
  ok('شعاع يساري خارج اليمين على الخطّ', Math.abs(m.ay - 101) < 1e-9 && Math.abs(m.by - 102) < 1e-9);
  ok('شعاع يميني خارج اليمين يبقى مقصوصاً', !raySegment(100, 80, 130, 50, 79).extended);
}

// القفل: يُكتب true، والفكّ يحذف المفتاح (رسمٌ فُكّ = رسمٌ لم يُقفل بالحفظ)، والإزاحة لا تفكّه
{
  const d = line(pt(5, 1.1), pt(9, 1.2));
  const lk = withDrawingLock(d, true);
  ok('قفل ⇒ locked', lk.locked === true && d.locked === undefined);
  const un = withDrawingLock(lk, false);
  ok('فكّ ⇒ بلا المفتاح', !('locked' in un) && JSON.stringify(un) === JSON.stringify(d));
  ok('الإزاحة تُبقي القفل', translateDrawing(lk, 2, (p) => p, () => null).locked === true);
}

// رأس السهم: للترند وحده، والإزالة تحذف المفتاح، والإزاحة تُبقيه
{
  const d = line(pt(5, 1.1), pt(9, 1.2));
  const ar = withDrawingArrow(d, true);
  ok('سهم ⇒ arrow', ar.arrow === true && d.arrow === undefined);
  const off = withDrawingArrow(ar, false);
  ok('إزالة ⇒ بلا المفتاح', !('arrow' in off) && JSON.stringify(off) === JSON.stringify(d));
  ok('الإزاحة تُبقي السهم', translateDrawing(ar, 2, (p) => p, () => null).arrow === true);
  ok('غير الترند لا يحمل سهماً', !('arrow' in withDrawingArrow({ ...d, tool: 'hline' }, true)));
}

// ── drawToolShortcut ───────────────────────────────────────────────────────
const alt = { alt: true, ctrl: false, meta: false, shift: false };
ok('Alt+H ⇒ خطّ أفقي', drawToolShortcut('h', 'KeyH', alt) === 'hline');
ok('Alt+T بلوحة عربية (الحرف «ف») ⇒ من الموضع', drawToolShortcut('ف', 'KeyT', alt) === 'trend');
ok('Option+F على ماك («ƒ») ⇒ فيبو', drawToolShortcut('ƒ', 'KeyF', alt) === 'fib');
ok('بلا Alt ⇒ لا شيء (الكتابة لا تُسرق)', drawToolShortcut('h', 'KeyH', { ...alt, alt: false }) === null);
ok('Ctrl+Alt ⇒ لا شيء (AltGr بويندوز)', drawToolShortcut('h', 'KeyH', { ...alt, ctrl: true }) === null);
ok('Dvorak: مفتاح KeyF يكتب «u» ⇒ ليس F (Alt+U لا يفتح فيبو)', drawToolShortcut('u', 'KeyF', alt) === null);
ok('Dvorak: F بموضع KeyY ⇒ فيبو', drawToolShortcut('f', 'KeyY', alt) === 'fib');
ok('Alt+Shift ⇒ لا شيء', drawToolShortcut('H', 'KeyH', { ...alt, shift: true }) === null);
ok('حرف بلا أداة ⇒ لا شيء', drawToolShortcut('q', 'KeyQ', alt) === null);
ok('وسم الاختصار', drawToolShortcutLabel('hline') === 'Alt+H');
ok('Alt+B ⇒ مستطيل', drawToolShortcut('b', 'KeyB', alt) === 'rect');
ok('Alt+R محجوز لإعادة العرض ⇒ لا أداة', drawToolShortcut('r', 'KeyR', alt) === null);
ok('أداة بلا اختصار ⇒ فارغ', drawToolShortcutLabel('none') === '');

// ── امتداد الترند وعكس فيبو ─────────────────────────────────────────────────
{
  const tr: Drawing = { id: 't', tool: 'trend', a: { index: 0, price: 1, time: 0 }, b: { index: 5, price: 1.1, time: 300 }, color: '#fff' };
  const modes: string[] = [];
  let x = tr;
  for (let i = 0; i < 4; i++) {
    x = withNextExtend(x);
    modes.push(drawingExtend(x));
  }
  ok('الامتداد يدور past→future→both→none', modes.join() === 'past,future,both,none');
  ok('«بلا» يحذف المفتاح', !('extend' in x));
  ok('غير الترند لا يمتدّ', drawingExtend({ ...tr, tool: 'ray', extend: 'both' }) === 'none');
  const none = extendedSegment(100, 100, 200, 50, 400, 300, 'none');
  ok('بلا امتداد = الطرفان', !!none && none.x1 === 100 && none.x2 === 200);
  const fut = extendedSegment(100, 100, 200, 50, 400, 300, 'future');
  ok('للمستقبل حتى الحافّة العليا', !!fut && fut.x1 === 100 && Math.abs(fut.x2 - 300) < 1e-9 && Math.abs(fut.y2) < 1e-9);
  const past = extendedSegment(100, 100, 200, 50, 400, 300, 'past');
  ok('للماضي حتى الحافّة اليسرى', !!past && Math.abs(past.x1) < 1e-9 && Math.abs(past.y1 - 150) < 1e-9 && past.x2 === 200);
  // B رُسم أولاً يميناً ثم A يساراً: المستقبل ما زال نحو اليمين.
  const rev = extendedSegment(200, 50, 100, 100, 400, 300, 'future');
  ok('المستقبل يميناً أيّاً كان الطرف الأوّل', !!rev && Math.max(rev.x1, rev.x2) > 299);
  ok('طرفاه يسار اللوح بلا امتداد ⇒ لا شيء', extendedSegment(-500, 100, -400, 100, 400, 300, 'none') === null);
  const cross = extendedSegment(-500, 100, -400, 100, 400, 300, 'future');
  ok('طرفاه يسار اللوح وممتدّ للمستقبل ⇒ يعبر اللوح', !!cross && cross.x1 === 0 && cross.x2 === 400);
  ok('رأسي لا يمتدّ', JSON.stringify(extendedSegment(50, 10, 50, 90, 400, 300, 'both')) === JSON.stringify({ x1: 50, y1: 10, x2: 50, y2: 90 }));
  const fib: Drawing = { ...tr, tool: 'fib' };
  ok('عكس فيبو', withDrawingFibReverse(fib, true).reversed === true && !('reversed' in withDrawingFibReverse({ ...fib, reversed: true }, false)));
  ok('العكس لفيبو فقط', !('reversed' in withDrawingFibReverse(tr, true)));
}

// ◀▶ على الأفقي و▲▼ على الرأسي لا تُرى ⇒ لا تُعرض ولا تُزاح.
ok('أفقي: سعر لا زمن', nudgeAxes('hline').price && !nudgeAxes('hline').time);
ok('رأسي: زمن لا سعر', nudgeAxes('vline').time && !nudgeAxes('vline').price);
ok('شعاع أفقي: الاثنان (بدايته تتحرّك)', nudgeAxes('hray').time && nudgeAxes('hray').price);
ok('ترند: الاثنان', nudgeAxes('trend').time && nudgeAxes('trend').price);

// قناة باللوغاريتمي: السحب ×1.25 ينقل العرض بالنسبة نفسها (كان ثابتاً ⇒ تضيق ~20% على الشاشة).
{
  const ch = { id: 'c', tool: 'channel', color: '#fff', a: { index: 10, price: 2000 }, b: { index: 20, price: 2100 }, width: 100 } as any;
  const st = () => null;
  const up = translateDrawing(ch, 0, (p) => p * 1.25, st, true);
  ok('لوغاريتمي: العرض ×1.25', Math.abs((up.width ?? 0) - 125) < 1e-9 && up.a.price === 2500);
  const lin = translateDrawing(ch, 0, (p) => p + 50, st, true);
  ok('إزاحة جمعية: العرض كما هو', Math.abs((lin.width ?? 0) - 100) < 1e-9);
  ok('بلا scaleWidth: العرض كما هو', translateDrawing(ch, 0, (p) => p * 1.25, st).width === 100);
}

if (failures) {
  console.error(`drawEdit.selftest: ${failures} FAILED`);
  process.exitCode = 1;
} else {
  console.log('drawEdit.selftest: PASS');
}
