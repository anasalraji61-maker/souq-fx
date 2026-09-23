/**
 * Self-test for indexOfBarTime (pure).
 * Run: npx --yes tsx src/chart/crossAnchor.selftest.ts
 */
import assert from 'node:assert/strict';
import { indexOfBarTime } from './crossAnchor';

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

console.log('crossAnchor.selftest: PASS');
