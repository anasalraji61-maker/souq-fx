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
