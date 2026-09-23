/**
 * وسوم مستويات فيبوناتشي: **النسبة والسعر معاً**، ولا وسمين متلاصقين.
 *
 * ما كان يُعرض: `lv.toFixed(3)` وحده — «0.618»، «0.500»، «1.000». والمتداول لا يرسم
 * فيبو ليقرأ النسبة (يعرفها، هو من اختار الأداة) بل ليعرف **السعر عند 61.8%**: هناك
 * يضع الدخول أو الوقف. فكان عليه أن يتتبّع الخطّ بعينه حتى محور السعر على اليمين —
 * وهناك بالذات يزدحم المحور بوسم السعر الحيّ ووسم التقاطع، وكلاهما يُرسم فوق العلامات.
 *
 * ثلاثة قرارات:
 *
 * 1) **السعر بمنازل الأداة** عبر `formatPrice(price, symbol)` لا بتقدير من حجم الرقم:
 *    الين ثلاث منازل والذهب اثنتان واليورو خمس. الوسم يقول السعر بالصيغة التي يقرأها
 *    المتداول بسطر الشمعة وبخانة التنبيه — رقم واحد لا رقمان متقاربان.
 *
 * 2) **النسبة كنسبة مئوية مختصرة**: «61.8%» لا «0.618»، و«50%» لا «0.500». المتداول
 *    ينطقها هكذا، والصفر الزائد بـ«0.500» كان يُقرأ كخانة دقّة لا كنسبة.
 *
 * 3) **إسقاط الوسوم المتلاصقة بترتيب أهمية**، لا بترتيب المصفوفة. سبعة مستويات على
 *    ارتداد قصير بهاتف تقع ضمن عشرات البكسلات: بارتفاع 60px يتباعد الوسم ‎10px‎ والنصّ
 *    وحده أطول من ذلك ⇒ سبعة أسطر متراكبة تُقرأ ككتلة واحدة، وإضافة السعر تضاعف العرض
 *    فتزيد الأمر سوءاً. فيُحتفظ بالطرفين (0 و100% = طرفا الموجة، وهما ما رسمه المتداول
 *    بيده) ثم 61.8% و50% و38.2% ثم 78.6% و23.6%. الإسقاط بالأهمية لا بالموضع: وسم
 *    23.6% لا يزيح 61.8% لمجرّد أنه أعلى منه بالشاشة.
 *
 * الوحدة خالصة (تأخذ `yOf` و`format` كدالّتين) فتُفحص بـ`fibLabels.selftest.ts`.
 */

/** ترتيب الأهمية عند الازدحام — الأول يبقى والأخير يُسقَط أولاً. */
const FIB_IMPORTANCE = [0, 1, 0.618, 0.5, 0.382, 0.786, 0.236];

/** مستوى غير مدرج بالترتيب يقع بعد المدرجين، وبينها بقيمتها (ثبات الترتيب). */
function importanceRank(level: number): number {
  const i = FIB_IMPORTANCE.indexOf(level);
  return i === -1 ? FIB_IMPORTANCE.length + level : i;
}

/**
 * «61.8%» و«50%» و«0%» و«100%». خانة عشرية واحدة بحدّ أقصى، والصفر الزائد يُحذف —
 * فالنسب القياسية كلّها تخرج بأقصر صيغة صادقة لها. (`toFixed(1)` ثم تقليم `.0`
 * لا `toPrecision`: الأخيرة تعطي «61.8» و«50.0» بأطوال غير متّسقة.)
 */
export function fibRatioText(level: number): string {
  if (!Number.isFinite(level)) return '';
  const pct = level * 100;
  const s = pct.toFixed(1);
  return `${s.endsWith('.0') ? s.slice(0, -2) : s}%`;
}

export type FibLabelPlan = {
  level: number;
  price: number;
  /** موضع الخط بالبكسل داخل لوح الرسم. */
  y: number;
  /** «61.8% · 1.08432» */
  text: string;
};

/**
 * أسعار مستويات فيبو بين قمّة الموجة وقاعها. `span = 0` (نقطتان بنفس السعر) ⇒ كل
 * المستويات على السعر نفسه — وهو الصادق. كان `hi - lo || 1` ينشر سبعة خطوط على مدى
 * **وحدة سعرية كاملة** عند ارتداد بلا ارتفاع: على اليورو ذلك عرض الشارت كلّه مرّات.
 */
export function fibLevelPrice(hi: number, lo: number, level: number): number {
  const span = hi - lo;
  return hi - (span > 0 ? span : 0) * level;
}

/**
 * خطّة وسوم مستوى فيبو: السعر والموضع والنصّ لكل مستوى يتّسع له اللوح.
 * تُعاد **مرتّبة تنازلياً بالسعر** (أعلى الشاشة أولاً) لا بترتيب القبول، فترتيب
 * عناصر React ثابت بين الإطارات.
 */
export function planFibLabels(input: {
  levels: readonly number[];
  hi: number;
  lo: number;
  /** سعر ⇐ بكسل داخل اللوح. */
  yOf: (price: number) => number;
  /** سعر ⇐ نصّ بمنازل الأداة. */
  format: (price: number) => string;
  /** أقلّ تباعد رأسي مقبول بين وسمين (علوّ سطر الوسم). */
  minGapPx?: number;
}): FibLabelPlan[] {
  const { levels, hi, lo, yOf, format } = input;
  const minGap = Number.isFinite(input.minGapPx) && (input.minGapPx as number) > 0
    ? (input.minGapPx as number)
    : 13;
  if (!Number.isFinite(hi) || !Number.isFinite(lo)) return [];

  const candidates: FibLabelPlan[] = [];
  for (const level of levels) {
    if (!Number.isFinite(level)) continue;
    const price = fibLevelPrice(hi, lo, level);
    if (!Number.isFinite(price)) continue;
    const y = yOf(price);
    // موضع غير محسوب (مقياس لم يُهيّأ بعد) لا يُعرض بموضع مختلَق.
    if (!Number.isFinite(y)) continue;
    candidates.push({ level, price, y, text: `${fibRatioText(level)} · ${format(price)}` });
  }

  const kept: FibLabelPlan[] = [];
  for (const c of [...candidates].sort((a, b) => importanceRank(a.level) - importanceRank(b.level))) {
    if (kept.some((k) => Math.abs(k.y - c.y) < minGap)) continue;
    kept.push(c);
  }
  return kept.sort((a, b) => b.price - a.price || a.level - b.level);
}
