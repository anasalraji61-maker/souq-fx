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
 * الأنواع الاصطناعية (Renko وKagi وP&F وRange، `synthetic = true`) لا تقابل شمعة بخانة، وزمن
 * لبنة Renko/Kagi/P&F مختلَق (أوّل شمعة + 60 ث لكل لبنة): كان خطّ رُسم على Renko يُختم به
 * فيظهر على شموع الساعة **عند بداية السلسلة** لا عند حركته، وخطّ الساعة يبقى على Renko بفهرس
 * شموع لا معنى له بين اللبنات. الآن كل لبنة تحمل `srcTime` (زمن الشمعة الحقيقية التي أكملتها)
 * وهو زمنها هنا بالختم والإرساء (`barTime`). وشمعة واحدة قد تصنع عدّة لبنات بالزمن نفسه، فنقطة
 * رُسمت على لبنة تحفظ ترتيبها بين أخواتها (`sub`) لتعود إليها لا لأولاهنّ؛ ونقطة من فريم الشموع
 * تسقط على آخر لبنة اكتملت عند زمنها أو قبله. لا كسر داخل اللبنة (لا خطوة زمنية ثابتة لها).
 *
 * نقطة **بعد آخر شمعة** (طرف خطّ يمتدّ للمستقبل) لا تُختم بزمن تقويمي `آخر + k×خطوة`:
 * العطلة ليست شموعاً، فطرف على اليومي بعد 10 شموع يوم الجمعة كان يصير +7 يوم الاثنين، وعلى
 * الساعة يسقط زمنه (السبت) على آخر شمعة الجمعة فينهار الخطّ. تُختم بزمن آخر شمعة + `ahead`
 * شموعاً بعدها، وفهرسها = خانة ذلك الزمن + `ahead` — ثابتة بالشموع المتداولة مهما جاءت عطلة.
 * نقاط المستقبل القديمة (زمن تقويمي بلا `ahead`) تُقرأ كما كانت.
 *
 * **آخر لبنة ليست آخر شمعة** (`endTime`): على Renko/Range/Kagi/P&F آخر لبنة اكتملت قد تكون قبل ساعات
 * والشموع بعدها لم تصنع لبنة. كان طرف المستقبل على Renko يُختم بزمن آخر لبنة + `ahead` ⇒ على الشموع
 * يقع **بالماضي** (بعد اللبنة بـ`ahead` شمعة)؛ ونقطة رُسمت على شمعة بعد آخر لبنة تُفتح على Renko
 * بالمنطقة المستقبلية بعدد الشموع لا على اللبنة السارية. الآن `endTime` = زمن آخر شمعة مصدر: اللبنة
 * الأخيرة سارية حتى هو (كتقاطع الرباعي)، والمستقبل يُعدّ بعده.
 *
 * **الرسومات مشتركة بين فريمات الرمز** (`drawingStore.ts`): خطّ رُسم على الساعة يُفتح على
 * اليومي والعكس. فالنقطة داخل شمعة الفريم الأكبر تأخذ **كسراً** من عرضها بحسب زمنها
 * (ساعة 18:00 على اليومي = الخانة + 0.75)، فخطّ ترند بين قمّتين بنفس اليوم لا ينهار عمودياً
 * على شمعة واحدة. و`ahead` يُحوَّل بين الفريمات بخطوة الفريم التي عُدّ بها (`aheadStep`).
 *
 * خالص بلا React: يُفحص بـ`drawingAnchors.selftest.ts`.
 */
import type { ChartPoint, Drawing } from './types';

export type TimeBar = { time: number; srcTime?: number };

/**
 * الزمن الحقيقي للخانة: `srcTime` للّبنة الاصطناعية، وإلا زمن الشمعة. هو ما يُطبع أيضاً بمحور
 * الزمن ووسم التقاطع (`MatrixChart.tsx`).
 */
export function barTime(bar: TimeBar): number {
  return bar.srcTime != null && Number.isFinite(bar.srcTime) ? bar.srcTime : bar.time;
}

/** أوّل خانة بالزمن الحقيقي نفسه حتى `i` (لبنات شمعة مصدر واحدة). */
function runStart(bars: readonly TimeBar[], i: number): number {
  const t = barTime(bars[i]!);
  let j = i;
  while (j > 0 && barTime(bars[j - 1]!) === t) j--;
  return j;
}

/**
 * زمن الخانة `index` — خارج السلسلة يُمدّ بخطوة الفريم (رسم يمتدّ لمستقبل لم يُرسم بعد).
 * كسر الخانة (نقطة من فريم أصغر داخل شمعة هذا الفريم، `withinBar`) يبقى زمناً داخل الشمعة: كان
 * يُقصّ لبدايتها، فسحب خطّ رُسم على الساعة 18:00 على اليومي — ولو رأسياً فقط — يُعيد ختم طرفه
 * عند 00:00، فيقفز الخطّ على اليومي بعد الإفلات ويعود للساعة على شمعة أخرى.
 */
export function timeAtIndex(
  bars: readonly TimeBar[],
  index: number,
  stepSec: number,
  endTime?: number
): number | null {
  const n = bars.length;
  if (!n || !Number.isFinite(index)) return null;
  if (index < 0) return barTime(bars[0]) + index * pastStep(bars, stepSec);
  if (index >= n) return seriesEnd(bars, endTime) + (index - (n - 1)) * stepSec;
  const i = Math.floor(index);
  const bar = bars[i]!;
  const frac = index - i;
  if (frac > 0 && bar.srcTime == null && stepSec > 0) return bar.time + Math.round(frac * stepSec);
  return barTime(bar);
}

/**
 * خطوة الخانة قبل أوّل شمعة: متوسّط زمن الشمعة **المحمَّلة** لا خطوة الفريم. الخانات داخل السلسلة شموع
 * حقيقية تتخطّى العطل، وقبلها كانت ساعات تقويم ⇒ على H1 (180 شمعة) بعد أسبوع وعطلة 48 ساعة كان طرف
 * الترند الأقدم عند −158 بدل −110 فيدور الخطّ ~23% ويخطئ امتداد الشعاع ~7 pip. `timeAtIndex` و`indexAtTime`
 * بالخطوة نفسها فيبقيان متعاكسَين.
 */
function pastStep(bars: readonly TimeBar[], stepSec: number): number {
  const n = bars.length;
  const span = n > 1 ? barTime(bars[n - 1]!) - barTime(bars[0]!) : 0;
  const avg = span / (n - 1);
  return Number.isFinite(avg) && avg > 0 ? avg : stepSec > 0 ? stepSec : 1;
}

/** نهاية السلسلة بالزمن الحقيقي: آخر شمعة مصدر (`endTime`) إن كانت بعد آخر لبنة، وإلا زمن آخر خانة. */
function seriesEnd(bars: readonly TimeBar[], endTime?: number): number {
  const last = barTime(bars[bars.length - 1]!);
  return endTime != null && Number.isFinite(endTime) && endTime > last ? endTime : last;
}

/**
 * خانة الزمن `time`: التطابق التامّ، وإلا آخر شمعة قبله (فجوة عطلة أو فريم لا يتطابق)،
 * وخارج السلسلة بخطوة الفريم — فالرسم قبل أوّل شمعة يبقى بفهرس سالب (خارج الشاشة) لا
 * مُلصقاً على الحافة. بحث ثنائي: السلسلة متزايدة الزمن بالأنواع التي يُعاد فهرستها.
 */
export function indexAtTime(
  bars: readonly TimeBar[],
  time: number,
  stepSec: number,
  endTime?: number
): number | null {
  const n = bars.length;
  if (!n || !Number.isFinite(time)) return null;
  const step = stepSec > 0 ? stepSec : 1;
  const first = barTime(bars[0]);
  const last = seriesEnd(bars, endTime);
  if (time < first) return Math.round((time - first) / pastStep(bars, stepSec));
  // داخل الشمعة الحيّة (نقطة 10:45 من M15 وهي بدأت 10:00 على H1) ليس مستقبلاً: التقريب كان يرميها لخانة
  // المستقبل التالية، وقمّتان 13:00 و15:00 على اليومي تنطبقان ⇒ ترند عمودي. يكمل للبحث ثم `withinBar`.
  if (time > last && time - last >= step) return n - 1 + Math.round((time - last) / step);
  let lo = 0;
  let hi = n - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (barTime(bars[mid]) <= time) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/**
 * خانة الرسم (محلّيّة بالنافذة) تحت `x`: كخانة التقاطع لكن **بلا قصّ عند آخر شمعة** — حتى آخر
 * خانة يبلغها اللوح يميناً حين يُسحب الشارت فتظهر منطقة المستقبل. كان الرسم يقصّ لآخر شمعة:
 * نقطة الترند/القياس/فيبو لا تُسقط للمستقبل، والخطّ العموديّ والملاحظة يقفزان لآخر شمعة.
 * `len` عدد شموع النافذة، `w` عرض اللوح، `pan` إزاحة التمرير الأفقيّ بالبكسل.
 */
export function drawSlotAt(x: number, pan: number, w: number, len: number): number {
  const n = Math.max(1, len);
  const width = w > 0 ? w : 1;
  const p = Number.isFinite(pan) ? pan : 0;
  const i = Math.floor(((x - p) / width) * n);
  // آخر خانة يقع مركزها داخل اللوح (لمسة على الحافّة لا تُسقط نقطة في خانة غير مرئيّة).
  const lastSlot = Math.max(n - 1, Math.ceil(((width - p) / width) * n) - 1);
  if (!Number.isFinite(i)) return n - 1;
  return Math.max(0, Math.min(lastSlot, i));
}

/**
 * ختم نقطة جديدة عند الخانة `index`: داخل السلسلة وقبلها بزمنها (`timeAtIndex`)، وبعد آخر
 * شمعة بزمن آخر شمعة + `ahead` (عدد شموع لا زمن تقويمي — راجع رأس الملف). على لبنة
 * اصطناعية ليست أولى لبنات شمعتها المصدر: `sub` ترتيبها بينهنّ.
 */
export function stampAtIndex(
  bars: readonly TimeBar[],
  index: number,
  stepSec: number,
  endTime?: number
): { time: number; ahead?: number; aheadStep?: number; sub?: number } | null {
  const n = bars.length;
  if (n && Number.isFinite(index) && index > n - 1) {
    return { time: seriesEnd(bars, endTime), ahead: index - (n - 1), aheadStep: stepSec };
  }
  const time = timeAtIndex(bars, index, stepSec, endTime);
  if (time == null) return null;
  if (index >= 0 && bars[Math.floor(index)]?.srcTime != null) {
    const i = Math.floor(index);
    const sub = i - runStart(bars, i);
    if (sub > 0) return { time, sub };
  }
  return { time };
}

function anchorPoint(
  p: ChartPoint,
  bars: readonly TimeBar[],
  stepSec: number,
  synthetic: boolean,
  endTime?: number
): ChartPoint {
  if (p.time == null || !Number.isFinite(p.time)) {
    const stamp = stampAtIndex(bars, p.index, stepSec, endTime);
    return stamp == null ? p : { ...p, ...stamp };
  }
  const base = indexAtTime(bars, p.time, stepSec, endTime);
  const ahead = p.ahead != null && Number.isFinite(p.ahead) ? p.ahead : 0;
  const aheadStep =
    p.aheadStep != null && Number.isFinite(p.aheadStep) && p.aheadStep > 0 ? p.aheadStep : stepSec;
  const inBar = base == null ? 0 : synthetic ? brickOffset(bars, base, p) : withinBar(bars, base, p.time, stepSec);
  const index = base == null ? null : base + inBar + (ahead * aheadStep) / stepSec;
  return index == null || index === p.index ? p : { ...p, index };
}

/**
 * على الأنواع الاصطناعية: `indexAtTime` يعطي **آخر** لبنة بالزمن الحقيقي المطابق؛ نقطة رُسمت
 * على لبنة تعود إلى أولى لبنات شمعتها + `sub` (مقصوراً على عددهنّ — اللبنات تتغيّر مع السلسلة).
 * زمن لا يطابق لبنة (نقطة من فريم الشموع) ⇒ آخر لبنة قبله كما هي.
 */
function brickOffset(bars: readonly TimeBar[], base: number, p: ChartPoint): number {
  const bar = bars[base];
  if (!bar || barTime(bar) !== p.time) return 0;
  const first = runStart(bars, base);
  const sub = p.sub != null && Number.isFinite(p.sub) && p.sub > 0 ? Math.floor(p.sub) : 0;
  return first + Math.min(sub, base - first) - base;
}

/**
 * كسر النقطة داخل شمعتها: زمن من فريم أصغر يقع داخل شمعة الفريم الحالي (لا على بدايتها).
 * صفر على الفريم نفسه (الزمن = زمن الشمعة) وخارج السلسلة. في فجوة (الزمن بعد نهاية الشمعة وقبل تاليتها)
 * ⇒ 1 = الشمعة **التالية**: نقطة H1 عند افتتاح الأحد 22:00 (فجوة الافتتاح) كانت على اليومي بشمعة الجمعة التي
 * لا تحويها، بينما سعرها تداوُل جلسة الاثنين. آخر شمعة بلا تالية ⇒ صفر كما كان.
 */
function withinBar(bars: readonly TimeBar[], i: number, time: number, stepSec: number): number {
  const bar = bars[i];
  if (!bar || !(stepSec > 0)) return 0;
  const frac = (time - bar.time) / stepSec;
  if (frac >= 1 && i >= 0 && i + 1 < bars.length) return 1;
  return frac > 0 && frac < 1 ? frac : 0;
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
  synthetic: boolean,
  endTime?: number
): Drawing[] {
  if (!bars.length || !drawings.length) return drawings;
  let changed = false;
  const out = drawings.map((d) => {
    const a = anchorPoint(d.a, bars, stepSec, synthetic, endTime);
    const b = d.b ? anchorPoint(d.b, bars, stepSec, synthetic, endTime) : d.b;
    if (a === d.a && b === d.b) return d;
    changed = true;
    return b === undefined ? { ...d, a } : { ...d, a, b };
  });
  return changed ? out : drawings;
}
