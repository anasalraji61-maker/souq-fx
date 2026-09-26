/**
 * تثبيت نافذة الشارت المسحوبة للخلف عند وصول شموع جديدة — دالة خالصة.
 *
 * النافذة تُقاس بالإزاحة من **آخر** شمعة (`offset` شموع قبل الطرف الأيمن). شمعة جديدة بالطرف
 * (فتح 15m جديدة بالتيك الحيّ، أو جلب يضيف الشموع الفائتة) تجعل الإزاحة نفسها تشير إلى نافذة
 * أحدث بشمعة: المتداول الذي يدرس نموذجاً قبل مئة شمعة يرى الشارت يزحف تحت إصبعه، والرسم الذي
 * يضعه يقع على شمعة غير التي قصدها. TradingView يثبّت الشموع المعروضة؛ هنا تُزاد الإزاحة بعدد
 * الشموع المضافة.
 *
 * `prevLastSec`: زمن آخر شمعة قبل التحديث (زمن حقيقي — `barTime` بـRenko/Kagi/P&F). `timesSec`:
 * أزمنة السلسلة بعده. يُرجع عدد الشموع التي أُضيفت **بعد** تلك الشمعة، أو 0 إن لم تُوجد بالسلسلة
 * الجديدة (سلسلة أُعيد بناؤها أو رمز آخر — لا تخمين، فالسلوك كما كان).
 *
 * `prevLen`: طول السلسلة قبل التحديث. إن بقيت تلك الشمعة بموضعها (إضافة بالطرف بلا قصّ من
 * الأوّل) فالفرق بالطول هو الجواب — يعدّ لبنات Renko التي صنعتها الشمعة **نفسها** (زمنها
 * الحقيقي واحد فلا يميّزها البحث بالزمن).
 */
export function appendedAfter(
  prevLastSec: number | null,
  timesSec: readonly number[],
  prevLen?: number
): number {
  if (prevLastSec == null || !Number.isFinite(prevLastSec) || timesSec.length === 0) return 0;
  if (
    prevLen != null &&
    Number.isInteger(prevLen) &&
    prevLen >= 1 &&
    prevLen <= timesSec.length &&
    timesSec[prevLen - 1] === prevLastSec
  ) {
    return timesSec.length - prevLen;
  }
  // من الطرف: الشموع المضافة قليلة، فلا حاجة لبحث بالسلسلة كلّها بكل تيك.
  for (let i = timesSec.length - 1; i >= 0; i--) {
    const t = timesSec[i]!;
    if (t === prevLastSec) return timesSec.length - 1 - i;
    if (t < prevLastSec) return 0;
  }
  return 0;
}

/**
 * عكس `appendedAfter`: كم خانة سقطت من الطرف الأيمن. الشمعة الحيّة المحلّية (يفتحها التيك قبل أن يصل جلبها)
 * تسقط حين يتقادم التيك (>20ث) ثم تعود مع التالي؛ العودة تُعدّ إضافةً فتُزاد الإزاحة، والسقوط لم يكن يُنقصها ⇒
 * شارت مُمرَّر للخلف ينجرف شمعةً أقدم بكل انقطاع قصير للتيكات. `prevTimesSec`: أزمنة السلسلة قبل التحديث؛
 * `lastSec`: زمن آخر خانة بعده. يُرجع عدد خانات القديمة بعد آخر ظهور لـ`lastSec`، أو 0 إن لم يُوجد (أو لم يسقط شيء).
 */
export function removedAtTail(
  prevTimesSec: readonly number[],
  lastSec: number | null,
  newLen?: number
): number {
  if (lastSec == null || !Number.isFinite(lastSec) || prevTimesSec.length === 0) return 0;
  // `newLen` (طول السلسلة بعد التحديث) كـ`prevLen` بـ`appendedAfter`: لبنات Renko التي صنعتها الشمعة الحيّة تتشارك
  // زمنها الحقيقي، فالبحث بالزمن يجد آخرها ⇒ سقوط لبنة من [.., 300, 300] كان يُعدّ 0 وعودتها +1 ⇒ الشارت المُمرَّر
  // للخلف ينجرف لبنةً أقدم بكل تذبذب للّبنة الحيّة.
  if (
    newLen != null &&
    Number.isInteger(newLen) &&
    newLen >= 1 &&
    newLen <= prevTimesSec.length &&
    prevTimesSec[newLen - 1] === lastSec
  ) {
    return prevTimesSec.length - newLen;
  }
  for (let i = prevTimesSec.length - 1; i >= 0; i--) {
    const t = prevTimesSec[i]!;
    if (t === lastSec) return prevTimesSec.length - 1 - i;
    if (t < lastSec) return 0;
  }
  return 0;
}

/**
 * الإزاحة التي تُبقي الطرف الأيمن على الزمن نفسه بعد تبديل نوع الشارت (شموع ⇔ Renko/Kagi/P&F/Range).
 *
 * الإزاحة بعدد الخانات، والخانات تتغيّر كلّياً بين الأنواع: 120 شمعة للخلف على الشموع كانت تصير 120
 * لبنة Renko (~أقدم التاريخ كلّه) فيقفز المتداول لأسابيع قبل الموضع الذي كان يدرسه. هنا تُقاس بالزمن:
 * آخر خانة زمنها الحقيقي ≤ `rightSec` تصير الطرف الأيمن. لا خانة قبله ⇒ أقدم ما يُسمح به.
 * مقصوصة كـ`source` (آخر `keep` خانات تبقى مرئيّة).
 */
export function offsetAtTime(timesSec: readonly number[], rightSec: number | null, keep = 10): number {
  const n = timesSec.length;
  const max = Math.max(0, n - keep);
  if (rightSec == null || !Number.isFinite(rightSec) || n === 0) return 0;
  for (let i = n - 1; i >= 0; i--) {
    if (timesSec[i]! <= rightSec) return Math.min(max, n - 1 - i);
  }
  return max;
}

/**
 * تقاطع مثبَّت بالمنطقة المستقبلية (`ahead` خانات بعد آخر شمعة) بعد وصول `added` شموع جديدة.
 *
 * التقاطع محفوظ كـ(زمن آخر شمعة، ahead)، و`ahead` يصحّ لآخر شمعة وحدها ⇒ شمعة جديدة كانت تُسقط
 * `ahead` فيقفز الخطّ من الخانة المستقبلية إلى الشمعة **السابقة** (ماضٍ لم يلمسه المتداول). هنا
 * تبقى الخانة نفسها زمنياً: فهرس الخانة = آخر شمعة قديمة + ahead؛ صارت شمعة حقيقية ⇒ عليها بلا
 * `ahead`، وإلا على الأخيرة الجديدة بما تبقّى. `len` طول السلسلة بعد الإضافة. null ⇒ لا تغيير.
 */
export function reanchorAhead(
  ahead: number,
  added: number,
  len: number
): { index: number; ahead: number } | null {
  if (!(ahead > 0) || !(added > 0) || !Number.isInteger(len) || len < 1 || added >= len) return null;
  const target = len - 1 - added + ahead;
  if (target <= len - 1) return { index: target, ahead: 0 };
  return { index: len - 1, ahead: target - (len - 1) };
}

/**
 * تقاطع مثبَّت بالمنطقة المستقبلية حين يتحرّك «آخر مكشوف» بالإعادة (Bar Replay) خطوةً أو أكثر.
 *
 * بالإعادة `ahead` يُقاس من آخر شمعة **مكشوفة** (`lastIndex`)، والسلسلة كلّها ثابتة؛ خطوة +1 تكشف
 * شمعة فكان التقاطع يسقط `ahead` ويقف على الشمعة التي كانت الأخيرة (ماضٍ). و−1 تُخفي شمعته فيختفي.
 * هنا تبقى الخانة نفسها (الفهرس `lastIndex + ahead`) إلى الأمام والخلف: كُشفت ⇒ عليها بلا `ahead`،
 * وإلا على آخر مكشوفة جديدة بما تبقّى. null ⇒ لا تغيير.
 */
export function shiftAheadSlot(
  ahead: number,
  lastIndex: number,
  newLastIndex: number
): { index: number; ahead: number } | null {
  if (
    !(ahead > 0) ||
    !Number.isInteger(lastIndex) ||
    !Number.isInteger(newLastIndex) ||
    lastIndex < 0 ||
    newLastIndex < 0 ||
    lastIndex === newLastIndex
  ) {
    return null;
  }
  const target = lastIndex + ahead;
  if (target <= newLastIndex) return { index: target, ahead: 0 };
  return { index: newLastIndex, ahead: target - newLastIndex };
}
