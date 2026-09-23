/**
 * أين تُفتح محاضرة الأكاديمية — منطق خالص بلا React، قابل للاختبار بـ
 * `academyResume.selftest.ts`.
 *
 * الموضع كان يُحفظ بمكانين (`AsyncStorage` وجدول `academy_progress` بالخادم)
 * و**لا يُقرأ من أيٍّ منهما**: كل فتح للمحاضرة يبدأ من المقطع الأول مهما بلغ
 * المتداول — أي أن محاضرة من عشرين مقطعاً تُعاد من أولها في كل جلسة.
 */

/** موضع مخزَّن بتخزين الجهاز (نصّ) → رقم، أو `null` لكل ما لا يصلح. */
export function parseStoredIndex(raw: string | null | undefined): number | null {
  if (raw === null || raw === undefined) return null;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) ? n : null;
}

/**
 * المقطع الذي تُفتح عنده المحاضرة.
 *
 * `stored` هو الموضع من الخادم إن وُجد وإلا من تخزين الجهاز. وموضعٌ عند **آخر**
 * مقطع (أو بعده) يعني محاضرة منتهية فتُفتح من أولها لا من خاتمتها — وهذا الشرط
 * وحده يغطّي الحالتين بلا قراءة عَلَم `completed`، فيصحّ للمجهول أيضاً (لا صفّ
 * خادم له)، ويُبقي استئناف **إعادة** مشاهدة متوقّفة بمنتصفها يعمل كما هو.
 *
 * وكل ما عدا ذلك يُقصّ داخل حدود المحاضرة: صفّ قديم لمحاضرة قُصّرت، أو رقم سالب،
 * أو كسر — لا يُخرج `segments[i]` عن التعريف.
 */
export function resumeSegmentIndex(stored: number | null, total: number): number {
  if (!Number.isFinite(total) || total <= 1) return 0;
  if (stored === null || !Number.isFinite(stored)) return 0;
  const idx = Math.floor(stored);
  if (idx >= total - 1) return 0;
  return Math.min(Math.max(0, idx), total - 1);
}
