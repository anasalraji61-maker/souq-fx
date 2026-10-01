/**
 * Self-test for indexOfBarTime (pure).
 * Run: npx --yes tsx src/chart/crossAnchor.selftest.ts
 */
import assert from 'node:assert/strict';
import { crossPriceAt, indexAtOrBeforeTime, indexOfBarTime, stepCrossBar } from './crossAnchor';
import { barOpen } from './drawingAnchors';

const bar = (time: number) => ({ time });

// نافذة عاديّة: الزمن يجد خانته
{
  const plot = [1000, 1060, 1120, 1180, 1240].map(bar);
  assert.equal(indexOfBarTime(plot, 1000), 0);
  assert.equal(indexOfBarTime(plot, 1120), 2);
  assert.equal(indexOfBarTime(plot, 1240), 4);
  assert.equal(indexOfBarTime(plot, 1150), null);
}

// جوهر البند: تيك حيّ يفتح شمعة جديدة فتزحف النافذة خانةً — الزمن يتبع الشمعة،
// والفهرس المحفوظ كان سيصف شمعة أخرى بلا لمسة.
{
  const before = [1000, 1060, 1120, 1180].map(bar);
  const after = [1060, 1120, 1180, 1240].map(bar); // شمعة جديدة وأقدمها خرج
  const picked = before[1].time; // 1060 عند الخانة 1
  assert.equal(indexOfBarTime(before, picked), 1);
  assert.equal(indexOfBarTime(after, picked), 0); // تبعت الشمعة، لا الخانة
  assert.equal(after[1].time, before[2].time); // ولولا الإصلاح لقرأ 1120 مكانها
}

// الشمعة تخرج من النافذة ⇒ لا مرساة (أصدق من إظهار شمعة أخرى مكانها)
{
  const after = [1180, 1240, 1300].map(bar);
  assert.equal(indexOfBarTime(after, 1000), null);
}

// تبديل الفريم/الرمز: الأزمنة لا تتطابق ⇒ المرساة تسقط من نفسها بلا شيفرة تنظيف
{
  const m1 = [1000, 1060, 1120].map(bar);
  const h1 = [0, 3600, 7200].map(bar);
  assert.equal(indexOfBarTime(h1, m1[1].time), null);
}

// أزمنة مكرَّرة (Renko/Kagi/PF: لبنتان من شمعة واحدة) ⇒ أول تطابق، لا بحث ثنائي
{
  const bricks = [1000, 1000, 1060, 1060, 1060, 1120].map(bar);
  assert.equal(indexOfBarTime(bricks, 1000), 0);
  assert.equal(indexOfBarTime(bricks, 1060), 2);
  assert.equal(indexOfBarTime(bricks, 1120), 5);
}

// أزمنة غير متزايدة تماماً (Kagi قد يعيد ترتيب انعكاساته) ⇒ المسح الخطّي يجدها
// والبحث الثنائي كان سيتخطّاها
{
  const odd = [1000, 1180, 1060, 1240].map(bar);
  assert.equal(indexOfBarTime(odd, 1060), 2);
  assert.equal(indexOfBarTime(odd, 1240), 3);
}

// مدخلات فاسدة: بلا استثناء وبلا فهرس مفتعل
{
  const plot = [1000, 1060].map(bar);
  assert.equal(indexOfBarTime(plot, null), null);
  assert.equal(indexOfBarTime(plot, undefined), null);
  assert.equal(indexOfBarTime(plot, Number.NaN), null);
  assert.equal(indexOfBarTime(plot, Number.POSITIVE_INFINITY), null);
  assert.equal(indexOfBarTime([], 1000), null);
}

// الزمن 0 قيمة صالحة لا "غائبة" — `!time` كان سيسقطها
{
  const plot = [0, 60].map(bar);
  assert.equal(indexOfBarTime(plot, 0), 0);
}

// سعر التقاطع تحت الإصبع: المغناطيس يجذب لأقرب O/H/L/C، وبدونه تقريب لمنازل الأداة
{
  const c = { open: 1.085, high: 1.0872, low: 1.0841, close: 1.0863 };
  assert.equal(crossPriceAt(1.0870, c, true, 5), 1.0872); // قرب الذيل ⇒ القمّة بالضبط
  assert.equal(crossPriceAt(1.0843, c, true, 5), 1.0841);
  assert.equal(crossPriceAt(1.0851, c, true, 5), 1.085);
  assert.equal(crossPriceAt(1.09, c, true, 5), 1.0872); // فوق الشمعة كلّها ⇒ القمّة
  assert.equal(crossPriceAt(1.0852371948, c, false, 5), 1.08524); // ما يُقرأ = ما يُرسل
  assert.equal(crossPriceAt(157.42349, null, true, 3), 157.423); // بلا شمعة ⇒ تقريب
  assert.equal(crossPriceAt(2650.3549, null, false, 2), 2650.35);
  assert.equal(crossPriceAt(104.1234, null, false, null), 104.12); // DXY: من حجم الرقم
  assert.equal(crossPriceAt(0.654321, null, false, null), 0.65432);
  assert.equal(crossPriceAt(NaN, c, true, 5), null);
  assert.equal(crossPriceAt(Infinity, c, false, 5), null);
  // حدّ الجذب: قريب ⇒ القمّة، بعيد ⇒ المستوى الملموس مقرَّباً
  assert.equal(crossPriceAt(1.0874, c, true, 5, 0.0003), 1.0872);
  assert.equal(crossPriceAt(1.09001, c, true, 5, 0.0003), 1.09001);
  assert.equal(crossPriceAt(1.0856, c, true, 5, 0.0003), 1.0856); // بين الفتح والإغلاق
}

// تقاطع الرباعي: التابع على شمعته السارية عند زمن القائد
{
  const plot = [1000, 1060, 1180, 1240].map(bar); // 1120 مفقودة عند هذا الرمز
  assert.equal(indexAtOrBeforeTime(plot, 1060), 1); // تطابق تامّ
  assert.equal(indexAtOrBeforeTime(plot, 1120), 1); // مفقودة ⇒ السارية قبلها لا اختفاء
  assert.equal(indexAtOrBeforeTime(plot, 1090), 1); // داخل الشمعة
  assert.equal(indexAtOrBeforeTime(plot, 999), null); // قبل أول شمعة
  assert.equal(indexAtOrBeforeTime(plot, 1300), 3); // داخل خطوة بعد الأخيرة
  assert.equal(indexAtOrBeforeTime(plot, 1301), null); // بيانات التابع متأخّرة ⇒ لا خطّ
  assert.equal(indexAtOrBeforeTime(plot, null), null);
  assert.equal(indexAtOrBeforeTime([], 1000), null);
  assert.equal(indexAtOrBeforeTime([bar(1000)], 1000), 0);
  assert.equal(indexAtOrBeforeTime([bar(1000)], 1001), null); // شمعة واحدة: لا خطوة معروفة
  // لبنات Renko: آخر اثنتين من شمعة واحدة (خطوة صفر) — الحدّ نهاية الشموع المصدر لا اللبنة
  const bricks = [1000, 1060, 1060].map(bar);
  assert.equal(indexAtOrBeforeTime(bricks, 1061), null); // بلا endSec: الخطوة صفر ⇒ رفض
  assert.equal(indexAtOrBeforeTime(bricks, 5000, undefined, 7260), 2); // الشمعة الحيّة ⇒ آخر لبنة
  assert.equal(indexAtOrBeforeTime(bricks, 7260, undefined, 7260), 2);
  assert.equal(indexAtOrBeforeTime(bricks, 7261, undefined, 7260), null); // بعد نهاية المصدر
  assert.equal(indexAtOrBeforeTime(bricks, 1030, undefined, 7260), 0);
  assert.equal(indexAtOrBeforeTime(bricks, 999, undefined, 7260), null);
  assert.equal(indexAtOrBeforeTime(bricks, 1060, undefined, 500), 2); // endSec قبل آخر لبنة ⇒ لا يقصّها
  // مللي ثانية بالتابع وثوانٍ من القائد
  assert.equal(indexAtOrBeforeTime([bar(1.7e12), bar(1.70006e12)], 1.70003e9, (t) => (t > 1e12 ? t / 1000 : t)), 0);
}

// ←/→ عند حافّة النافذة: تُزاح النافذة شمعةً بدل الوقوف
{
  const all = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(bar); // offset 2، نافذة 4 ⇒ الخانات 4..7
  assert.deepEqual(stepCrossBar(all, 2, 4, 5, 1), { time: 6, offset: 2 }); // داخل النافذة
  assert.deepEqual(stepCrossBar(all, 2, 4, 7, 1), { time: 8, offset: 1 }); // الحافّة اليمنى
  assert.deepEqual(stepCrossBar(all, 2, 4, 4, -1), { time: 3, offset: 3 }); // الحافّة اليسرى
  assert.equal(stepCrossBar(all, 0, 4, 9, 1), null); // آخر شمعة بالسلسلة
  assert.equal(stepCrossBar(all, 6, 4, 0, -1), null); // أول شمعة بالسلسلة
  assert.equal(stepCrossBar(all, 2, 4, 2, 1), null); // الزمن خارج النافذة
  assert.equal(stepCrossBar([0, 1, 2].map(bar), 0, 80, 0, -1), null); // سلسلة أقصر من النافذة
  assert.deepEqual(stepCrossBar([0, 1, 2].map(bar), 0, 80, 0, 1), { time: 1, offset: 0 });
  // السلسلة قصرت والإزاحة باقية (Line Break 3 ⇒ 5 بعد السحب للخلف): الشارت يرسم بالإزاحة المسقوفة ⇒ الأسهم كذلك
  const short = Array.from({ length: 12 }, (_, k) => bar(k)); // سقف الشارت 12 − 10 = 2 ⇒ النافذة 6..9 بنافذة 4
  assert.equal(stepCrossBar(short, 190, 4, 7, 1), null); // بلا سقف: لا شيء يُوجد (الخلل)
  assert.deepEqual(stepCrossBar(short, 190, 4, 7, 1, 2), { time: 8, offset: 2 });
  assert.deepEqual(stepCrossBar(short, 190, 4, 6, -1, 2), { time: 5, offset: 3 });
}

// أداة بلا منازل: من مرجع وسوم الشارت (سعرها الجاري) لا من الرقم الملموس — ما يُرسل = ما يُقرأ.
{
  assert.equal(crossPriceAt(99.8537, null, false, null, Infinity, 100.2), 99.85);
  assert.equal(crossPriceAt(9.98537, null, false, null, Infinity, 10.02), 9.985);
  assert.equal(crossPriceAt(99.8537, null, false, null), 99.854); // بلا مرجع كما كان
  assert.equal(crossPriceAt(1.085237, null, false, 5, Infinity, 150), 1.08524); // منازل الأداة تغلب
}

// Heikin Ashi: الملتقَط (متوسّط) يُقرَّب لشبكة الأداة كما يُقرأ على الوسم — التنبيه يُرسل 1.08535 لا 1.0853475.
{
  const ha = { open: 1.0851, high: 1.0856, low: 1.0849, close: 1.0853475 };
  assert.equal(crossPriceAt(1.08534, ha, true, 5, 0.0002), 1.08535);
  assert.equal(crossPriceAt(1.08561, { open: 1.0851, high: 1.0856, low: 1.0849, close: 1.0853 }, true, 5, 0.0002), 1.0856);
}

// تابع يومي فوركس بافتتاح الشمعة (17:00 نيويورك قبل ختمها): قائد H1 الأربعاء 22:30 UTC = جلسة الخميس
{
  const d = (x: string) => Date.parse(x) / 1000;
  const bars = ['2026-09-22', '2026-09-23', '2026-09-24', '2026-09-25'].map((x) => ({ time: d(`${x}T00:00:00Z`) }));
  const open = (t: number) => barOpen(t, 86400, 'EURUSD');
  const end = open(bars[3]!.time) + 86400;
  assert.equal(indexAtOrBeforeTime(bars, d('2026-09-23T22:30:00Z'), open, end), 2);
  assert.equal(indexAtOrBeforeTime(bars, d('2026-09-23T20:30:00Z'), open, end), 1);
  // الكريبتو: يوم UTC كما هو
  const utc = (t: number) => barOpen(t, 86400, false);
  assert.equal(indexAtOrBeforeTime(bars, d('2026-09-23T22:30:00Z'), utc), 1);
  // أسبوعي: مساء الأحد 22:00 UTC على أسبوع الاثنين التالي
  const wk = [d('2026-09-14T00:00:00Z'), d('2026-09-21T00:00:00Z')].map((time) => ({ time }));
  const wOpen = (t: number) => barOpen(t, 604800, 'EURUSD');
  assert.equal(indexAtOrBeforeTime(wk, d('2026-09-20T22:00:00Z'), wOpen, wOpen(wk[1]!.time) + 604800), 1);
}

console.log('crossAnchor.selftest: PASS');
