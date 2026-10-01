import { magnitudeDecimals } from './indicators/utils';

/**
 * مرساة التقاطع (crosshair): الشمعة المختارة تُحفَظ **بزمنها** لا بموضعها داخل نافذة الرسم.
 *
 * السبب: `source.plot` نافذة متحرّكة من السلسلة، وفهرسها محلّي (0 = أول شمعة مرئيّة).
 * فحفظ الفهرس وحده يعني أن التقاطع يتعلّق **بالخانة** لا بالشمعة: تيك حيّ يفتح شمعة
 * جديدة ⇒ النافذة تزحف خانةً واحدة ⇒ القراءة تصف شمعةً أخرى بلا أي لمسة من المتداول،
 * وكذلك زرّا التكبير/التصغير وتبديل الفريم أو الرمز. والخطّ والأرقام تبقى متّسقة فيما
 * بينها فلا شيء يدلّ المتداول أن ما يقرؤه لم يعد ما اختاره.
 *
 * وبالزمن: الشمعة نفسها تُتابَع ما دامت مرئيّة، وتختفي المرساة متى خرجت من النافذة —
 * وهذا أصدق من عرض شمعة أخرى مكانها.
 */

/** ما يكفي من الشمعة لهذه الوحدة: الزمن وحده. */
export type TimedBar = { time: number };

/**
 * موضع شمعة بزمن `time` داخل النافذة، أو `null` إن لم تعد فيها.
 *
 * مسح خطّي لا بحث ثنائي عن عمد: أنواع الشموع الاصطناعية (Renko وKagi وPoint&Figure
 * وRange) تشتقّ أزمنتها من الشموع المصدر، فتتكرّر الأزمنة بين لبنتين من شمعة واحدة
 * ولا يُضمَن التزايد التامّ — والبحث الثنائي يفترض ما لا يصحّ هنا. والنافذة ≤ 1000
 * شمعة بحدّ `setWindowCount` فالكلفة لا تُذكر. وعند التكرار يُعاد **أول** تطابق،
 * وهو نفس ما يقع عليه الاختيار الأصلي (`hitIndex` تعيد أصغر فهرس مطابق للمسّة).
 */
export function indexOfBarTime(
  plot: readonly TimedBar[],
  time: number | null | undefined
): number | null {
  if (time == null || !Number.isFinite(time)) return null;
  for (let i = 0; i < plot.length; i++) {
    if (plot[i]?.time === time) return i;
  }
  return null;
}

/** ما يلزم من الشمعة لجذب سعر التقاطع. */
export type OhlcBar = { open: number; high: number; low: number; close: number };

/**
 * سعر التقاطع **تحت الإصبع** لا إغلاق الشمعة. كان الخطّ الأفقي ووسم المحور وزرّ ⚑
 * يلتصقون بـ`close` أيّاً كان موضع اللمس، فلا سبيل لقراءة قمّة ذيل أو مستوى بين شمعتين —
 * وهو أوّل ما يفعله متداول يضع تنبيهاً عند مقاومة.
 *
 * - المغناطيس مفعّل ⇒ أقرب O/H/L/C للشمعة الملموسة **إن وقع ضمن `snapTol`** (بوحدة السعر،
 *   المستدعي يحوّلها من بكسلات): لمسة قرب الذيل تعطي القمّة الحقيقية بالضبط، ولمسة بعيدة
 *   عن الشمعة تبقى على مستواها — وإلا صار كل مستوى فوق الشمعة «قمّتها» ولم يبقَ معنى
 *   لقراءة سعر بين شمعتين إلا بإطفاء 🧲 (الذي يطفئه لأدوات الرسم معه).
 * - بدونه ⇒ السعر الخام مقرَّباً لمنازل الأداة، فما يُرسل للتنبيه هو **حرفياً** ما يُقرأ
 *   على الوسم (لا 1.0852371948 خلف «1.08524»).
 *
 * `decimals` من `symbolPriceDecimals`؛ `null` (DXY، رموز الوسيط) ⇒ التقدير بنفس قاعدة `formatPrice`
 * ومن المرجع نفسه (`ref` = سعر الأداة الجاري، كوسوم الشارت): كان من حجم الرقم الملموس، فتقاطع عند
 * 99.8537 على نفط يتداول عند 100.2 يُرسل للتنبيه 99.854 ووسمه «99.85». سعر غير محدود (لوح بارتفاع صفر) ⇒ `null`: لا تقاطع أفقي.
 */
export function crossPriceAt(
  raw: number,
  bar: OhlcBar | null | undefined,
  magnet: boolean,
  decimals: number | null,
  snapTol = Infinity,
  ref?: number | null
): number | null {
  if (!Number.isFinite(raw)) return null;
  let at = raw;
  if (magnet && bar) {
    let best = bar.close;
    let d = Infinity;
    for (const p of [bar.open, bar.high, bar.low, bar.close]) {
      const dd = Math.abs(p - raw);
      if (dd < d) {
        d = dd;
        best = p;
      }
    }
    // الملتقَط يُقرَّب كذلك: Heikin Ashi (متوسّطات) إغلاقها 1.0853475 ووسمها «1.08535» — كان التنبيه يُرسل بالأوّل
    // فتنبيه «تحت» لا ينطلق على تيك 1.08535 الذي رآه المتداول. الشموع الحقيقية على الشبكة أصلاً فلا تتغيّر.
    if (d <= snapTol && Number.isFinite(best)) at = best;
  }
  const a = ref != null && Number.isFinite(ref) && ref > 0 ? ref : Math.abs(at);
  const dp = decimals ?? magnitudeDecimals(a);
  return Number(at.toFixed(dp));
}

/**
 * تقاطع مشترك بين شارتات التخطيط الرباعي: الشارت القائد ينشر **زمن** شمعته (بالثواني)،
 * وكل تابع يضع خطّه العمودي على شمعته **السارية** عند ذلك الزمن — آخر شمعة فتحت عنده
 * أو قبله. التطابق التامّ (`indexOfBarTime`) لا يكفي هنا: رموز مختلفة قد تفتقد شمعة
 * (DXY مقابل الذهب، ساعة بلا تداول)، فيختفي خطّ التابع بلا سبب يراه المتداول.
 *
 * `null` خارج مدى السلسلة: قبل أول شمعة، أو بعد آخر شمعة بأكثر من خطوة واحدة (بيانات
 * التابع متأخّرة — إظهار آخر شمعة كأنها «عند ذلك الزمن» كذب). `toSec` يوحّد
 * الثواني/المللي ثانية كما تفعل بقية المزامنة.
 *
 * `endSec` يستبدل حدّ «آخر شمعة + خطوة» حين يعرفه المستدعي أدقّ: لبنات Renko/Kagi/P&F/Range
 * تعيش ساعات بلا لبنة جديدة والخطوة بين آخر لبنتين قد تكون صفراً (شمعة واحدة صنعت اثنتين)،
 * فقائد على الشمعة الحيّة كان يُرفض ولا خطّ عند التابع حتى تكتمل لبنة. المستدعي يمرّر هنا
 * نهاية شموعه المصدر (آخر شمعة + فريمها) — فاللبنة الأخيرة سارية حتى ذلك الحين لا أبعد.
 */
export function indexAtOrBeforeTime(
  plot: readonly TimedBar[],
  timeSec: number | null | undefined,
  toSec: (t: number) => number = (t) => t,
  endSec?: number
): number | null {
  if (timeSec == null || !Number.isFinite(timeSec) || plot.length === 0) return null;
  const first = toSec(plot[0]!.time);
  if (timeSec < first) return null;
  const n = plot.length;
  const last = toSec(plot[n - 1]!.time);
  const step = n >= 2 ? last - toSec(plot[n - 2]!.time) : 0;
  const end = endSec != null && Number.isFinite(endSec) ? Math.max(last, endSec) : last + Math.max(0, step);
  if (timeSec > end) return null;
  let found: number | null = null;
  for (let i = 0; i < n; i++) {
    if (toSec(plot[i]!.time) <= timeSec) found = i;
    else break;
  }
  return found;
}

/**
 * خطوة شمعة واحدة للتقاطع المثبَّت (←/→ على الويب) **مع إزاحة النافذة** عند حافّتها.
 * كانت الأسهم تقف عند أول/آخر شمعة مرئيّة: قراءة ما بعد الحافّة تعني ترك لوحة المفاتيح
 * لسحب الشارت ثم إعادة تثبيت التقاطع. الآن الخطوة خارج النافذة تزيحها شمعةً واحدة
 * (`offset` بعدد الشموع من يمين السلسلة، كما بـ`source`) فيبقى التقاطع على الحافّة ويتابع.
 *
 * `all` السلسلة كاملة (بنوع الشموع المرسوم)، والنافذة `[all.length − offset − windowCount,
 * all.length − offset)`. `null` ⇒ لا حركة: الزمن ليس بالنافذة، أو لا شمعة بعد طرف السلسلة.
 *
 * `maxOffset` سقف الإزاحة كما يرسمها الشارت (`source`: `plot.length − 10`). السلسلة قد تقصر والإزاحة باقية (عدد
 * خطوط Line Break 3 ⇒ 5، أو حجم لبنة Renko أكبر، بعد السحب للخلف) فالشارت يرسم بالإزاحة المسقوفة، وكانت الأسهم
 * تبحث بالإزاحة الخام (`end` = 0) فلا تجد الشمعة ولا يتحرّك التقاطع المثبَّت.
 */
export function stepCrossBar(
  all: readonly TimedBar[],
  offset: number,
  windowCount: number,
  time: number,
  step: 1 | -1,
  maxOffset: number = Infinity
): { time: number; offset: number } | null {
  offset = Math.max(0, Math.min(offset, maxOffset));
  const end = Math.max(0, all.length - offset);
  const start = Math.max(0, end - windowCount);
  let i = -1;
  for (let k = start; k < end; k++) {
    if (all[k]?.time === time) {
      i = k;
      break;
    }
  }
  if (i < 0) return null;
  const j = i + step;
  if (j < 0 || j >= all.length) return null;
  let nextOffset = offset;
  if (j >= end) nextOffset = all.length - (j + 1);
  else if (j < start) nextOffset = offset + (start - j);
  return { time: all[j].time, offset: nextOffset };
}
