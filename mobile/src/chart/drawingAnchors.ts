/**
 * مرساة الرسومات **بالزمن** لا بالفهرس.
 *
 * `ChartPoint.index` فهرس داخل `source.all` — والخادم يعيد **آخر N شمعة**، فالسلسلة نافذة
 * تزحف: خطّ ترند رُسم أمس على فريم الساعة يُفتح اليوم بعد 24 شمعة جديدة **مزاحاً 24 شمعة
 * لليمين** — فوق شموع لم يمسّها المتداول، وخطّ الدعم الأفقي يبدأ من غير موضعه، والخطّ
 * العمودي على خبر الأمس صار على شمعة أخرى. ويتكرّر الزحف حيّاً متى أسقطت السلسلة أقدم
 * شمعة عند فتح شمعة جديدة. والحفظ يكتب الفهرس المزاح فيثبت الخطأ.
 *
 * القاعدة هنا: نقطة **تحمل `time`** زمنُها هو الحقيقة، ويُعاد حساب فهرسها من السلسلة
 * الحاليّة عند كل تغيّر لها. نقطة **بلا `time`** (جديدة من الإصبع، أو محفوظة قبل هذا
 * الإصلاح) تُختم بزمن شمعتها الآن. ولأن الإنشاء والسحب يصنعان نقطة جديدة `{index, price}`
 * دائماً، لا تحمل نقطةٌ عُدّلت زمناً قديماً يعيدها لمكانها السابق.
 *
 * الأنواع الاصطناعية (Renko وKagi وP&F وRange) لا تقابل شمعة بخانة، فلا يُعاد فيها
 * الفهرسة (`reindex = false`) — تُختم النقاط الجديدة بزمن لبنتها فقط، ليجد الرسم مكانه
 * حين يعود المتداول للشموع.
 *
 * نقطة **بعد آخر شمعة** (طرف خطّ يمتدّ للمستقبل) لا تُختم بزمن تقويمي `آخر + k×خطوة`:
 * العطلة ليست شموعاً، فطرف على اليومي بعد 10 شموع يوم الجمعة كان يصير +7 يوم الاثنين، وعلى
 * الساعة يسقط زمنه (السبت) على آخر شمعة الجمعة فينهار الخطّ. تُختم بزمن آخر شمعة + `ahead`
 * شموعاً بعدها، وفهرسها = خانة ذلك الزمن + `ahead` — ثابتة بالشموع المتداولة مهما جاءت عطلة.
 * نقاط المستقبل القديمة (زمن تقويمي بلا `ahead`) تُقرأ كما كانت.
 *
 * خالص بلا React: يُفحص بـ`drawingAnchors.selftest.ts`.
 */
import type { ChartPoint, Drawing } from './types';

export type TimeBar = { time: number };

/** زمن الخانة `index` — خارج السلسلة يُمدّ بخطوة الفريم (رسم يمتدّ لمستقبل لم يُرسم بعد). */
export function timeAtIndex(bars: readonly TimeBar[], index: number, stepSec: number): number | null {
  const n = bars.length;
  if (!n || !Number.isFinite(index)) return null;
  if (index < 0) return bars[0].time + index * stepSec;
  if (index >= n) return bars[n - 1].time + (index - (n - 1)) * stepSec;
  return bars[Math.floor(index)].time;
}

/**
 * خانة الزمن `time`: التطابق التامّ، وإلا آخر شمعة قبله (فجوة عطلة أو فريم لا يتطابق)،
 * وخارج السلسلة بخطوة الفريم — فالرسم قبل أوّل شمعة يبقى بفهرس سالب (خارج الشاشة) لا
 * مُلصقاً على الحافة. بحث ثنائي: السلسلة متزايدة الزمن بالأنواع التي يُعاد فهرستها.
 */
export function indexAtTime(bars: readonly TimeBar[], time: number, stepSec: number): number | null {
  const n = bars.length;
  if (!n || !Number.isFinite(time)) return null;
  const step = stepSec > 0 ? stepSec : 1;
  if (time < bars[0].time) return Math.round((time - bars[0].time) / step);
  if (time > bars[n - 1].time) return n - 1 + Math.round((time - bars[n - 1].time) / step);
  let lo = 0;
  let hi = n - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (bars[mid].time <= time) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/**
 * ختم نقطة جديدة عند الخانة `index`: داخل السلسلة وقبلها بزمنها (`timeAtIndex`)، وبعد آخر
 * شمعة بزمن آخر شمعة + `ahead` (عدد شموع لا زمن تقويمي — راجع رأس الملف).
 */
export function stampAtIndex(
  bars: readonly TimeBar[],
  index: number,
  stepSec: number
): { time: number; ahead?: number } | null {
  const n = bars.length;
  if (n && Number.isFinite(index) && index > n - 1) {
    return { time: bars[n - 1].time, ahead: index - (n - 1) };
  }
  const time = timeAtIndex(bars, index, stepSec);
  return time == null ? null : { time };
}

function anchorPoint(
  p: ChartPoint,
  bars: readonly TimeBar[],
  stepSec: number,
  reindex: boolean
): ChartPoint {
  if (p.time == null || !Number.isFinite(p.time)) {
    const stamp = stampAtIndex(bars, p.index, stepSec);
    return stamp == null ? p : { ...p, ...stamp };
  }
  if (!reindex) return p;
  const base = indexAtTime(bars, p.time, stepSec);
  const ahead = p.ahead != null && Number.isFinite(p.ahead) ? p.ahead : 0;
  const index = base == null ? null : base + ahead;
  return index == null || index === p.index ? p : { ...p, index };
}

/**
 * يختم ويعيد فهرسة كل النقاط. **يعيد المصفوفة نفسها** إن لم يتغيّر شيء — فالتأثير
 * المستدعي عند كل تيك لا يُطلق رسماً ولا كتابة تخزين بلا داعٍ، ولا يدخل حلقة.
 * سلسلة فارغة (لم تُحمَّل بعد) ⇒ لا تغيير: الختم بلا شموع لا معنى له.
 */
export function anchorDrawings(
  drawings: Drawing[],
  bars: readonly TimeBar[],
  stepSec: number,
  reindex: boolean
): Drawing[] {
  if (!bars.length || !drawings.length) return drawings;
  let changed = false;
  const out = drawings.map((d) => {
    const a = anchorPoint(d.a, bars, stepSec, reindex);
    const b = d.b ? anchorPoint(d.b, bars, stepSec, reindex) : d.b;
    if (a === d.a && b === d.b) return d;
    changed = true;
    return b === undefined ? { ...d, a } : { ...d, a, b };
  });
  return changed ? out : drawings;
}
