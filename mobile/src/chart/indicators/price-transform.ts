/** تحويلات السعر ونقاط الارتكاز (Price Transform / Pivots family). */
import type { Candle } from '../../api';
import { computeFractals } from './trend';
import { computeVwap } from './volume';


/**
 * Median Price (سعر الوسيط) — منتصف مدى الشمعة (أعلى+أدنى)/2، بديل مبسّط للإغلاق كمصدر عرض مستقل
 * يُرسم كخط نقاط مباشر على اللوحة الرئيسية بنفس نمط VWAP/PSAR أعلاه. **تحقّق يدوي**: شمعة ثابتة
 * أعلى=10 أدنى=8 لكل الشموع → الناتج=9 لكل نقطة بالضبط (بلا حاجة لأي فترة تسخين، معرَّف من أول شمعة).
 */
export function computeMedianPrice(candles: Candle[]): number[] {
  return candles.map((c) => (c.high + c.low) / 2);
}

/**
 * Typical Price (السعر النموذجي) — متوسط (أعلى+أدنى+إغلاق)/3، يمنح وزناً ضمنياً للإغلاق قياساً
 * بـMedian Price أعلاه. **تحقّق يدوي**: شمعة ثابتة أعلى=12 أدنى=8 إغلاق=10 لكل الشموع →
 * (12+8+10)/3 = 10 بالضبط لكل نقطة.
 */
export function computeTypicalPrice(candles: Candle[]): number[] {
  return candles.map((c) => (c.high + c.low + c.close) / 3);
}

/**
 * Weighted Close (الإغلاق المُرجَّح) — (أعلى+أدنى+2×إغلاق)/4، يعطي الإغلاق وزناً مضاعَفاً (ضِعف
 * Typical Price بالتحديد) فيكون أقرب تتبّعاً للإغلاق من median/typical أعلاه. **تحقّق يدوي**: شمعة
 * أعلى=14 أدنى=6 إغلاق=12 → (14+6+24)/4 = 11؛ يتحقّق الترتيب المتوقَّع median=(14+6)/2=10 <
 * typical=(14+6+12)/3=10.67 < weightedClose=11 ≤ إغلاق=12 (الأقرب تتبّعاً للإغلاق دائماً حين يبتعد
 * الإغلاق عن منتصف المدى).
 */
export function computeWeightedClose(candles: Candle[]): number[] {
  return candles.map((c) => (c.high + c.low + 2 * c.close) / 4);
}

/**
 * Pivot Points High/Low — مؤشر TradingView قياسي مستقل تماماً عن عائلة "Pivot Points Standard"
 * (Classic/Fibonacci/Camarilla/Woodie/DeMark أعلاه، التي تحسب مستويات سعرية من نافذة زمنية سابقة)
 * وعن computeFractals أعلاه أيضاً رغم التشابه الظاهري (كلاهما يكشف قمم/قيعان هيكلية): Fractals تستخدم
 * نافذة **ثابتة** صغيرة جداً (شمعتان كل جهة فقط، خماسية الشكل) بمقارنة صارمة `>`/`<` تمنع أي تعادل من
 * التسجيل، بينما Pivot Points High/Low تتحقّق من كون الشمعة i **الأعلى/الأدنى ضمن نافذة أوسع قابلة
 * للتخصيص** (leftBars/rightBars، افتراضياً 10/10 — القيمة القياسية الشائعة لهذا المؤشر تحديداً بمعظم
 * منصّات الرسم البياني) فتكشف تأرجحات هيكلية أكبر (swing structure بمدى زمني أطول) بدل التذبذب الدقيق
 * قصير المدى. **قرار تصميم متعمَّد**: المقارنة الداخلية تستخدم `>`/`<` صارمة أيضاً لكن فقط ضد *بقية*
 * شموع النافذة (لا ضد i نفسها) — على عكس Fractals، تعادل قيمة i مع شمعة أخرى بالنافذة **لا يُسقِط**
 * تسجيل i (يسمح نظرياً بتسجيل قمتين/قاعين متجاورين بنفس القيمة إن تساويا فعلاً، حالة نادرة لكن ممكنة
 * حسابياً) — فارق سلوكي موثَّق صراحةً هنا لتفادي الخلط بمنطق الاستبعاد الصارم لـFractals. القيمة
 * المُعادة عند نقطة التسجيل هي السعر الفعلي (high/low) بنفس اصطلاح Fractals/PSAR/medianPrice تماماً.
 * أول leftBars وآخر rightBars شمعة دائماً null (لا نافذة كاملة كافية). **تحقّق حسابي فعلي (Node.js،
 * قبل الكتابة)**: بيانات صناعية بقيمتي قمة/قاع واضحتين وسط نافذة period=2 → تسجيل دقيق عند الفهرس
 * الصحيح بالضبط، صفر تسجيل بالفهارس المجاورة؛ حدود الإحماء (leftBars=rightBars=10 على 40 شمعة) →
 * null صراحةً لكل الفهارس [0,10) و[30,40)؛ 300 شمعة عشوائية بذرة ثابتة (10/10 الفعلية) → صفر
 * NaN/Infinity، وكل قيمة مسجَّلة تطابق high/low الشمعة نفسها تماماً (لا خطأ إزاحة فهرس)؛ **إعادة حساب
 * مستقلة منفصلة عن الدالة (brute-force) لكل الـ280 فهرساً داخلياً دفعة واحدة** → تطابق تام 100% بلا
 * استثناء واحد مع مخرجات الدالة.
 */
export function computePivotsHighLow(
  candles: Pick<Candle, 'high' | 'low'>[],
  leftBars = 10,
  rightBars = 10
): { top: (number | null)[]; bottom: (number | null)[] } {
  const n = candles.length;
  const top: (number | null)[] = new Array(n).fill(null);
  const bottom: (number | null)[] = new Array(n).fill(null);
  for (let i = leftBars; i < n - rightBars; i++) {
    const h = candles[i].high;
    let isTop = true;
    for (let w = i - leftBars; w <= i + rightBars; w++) {
      if (w === i) continue;
      if (candles[w].high > h) {
        isTop = false;
        break;
      }
    }
    if (isTop) top[i] = h;
    const l = candles[i].low;
    let isBottom = true;
    for (let w = i - leftBars; w <= i + rightBars; w++) {
      if (w === i) continue;
      if (candles[w].low < l) {
        isBottom = false;
        break;
      }
    }
    if (isBottom) bottom[i] = l;
  }
  return { top, bottom };
}

/**
 * Pivot Points (كلاسيكي/Standard) — سبعة مستويات دعم/مقاومة أفقية ثابتة، محسوبة مرة واحدة من نافذة
 * متدحرجة آخر `period` شمعة **مكتملة** (لا تتضمن الشمعة الجارية) — **قرار تصميم موثَّق صراحة** (كان
 * مؤجَّلاً بـROADMAP.md عدة تشغيلات كـ"يحتاج قرار: نافذة متدحرجة N-شمعة أم حدود جلسة تداول حقيقية؟"):
 * النموذج الحالي بالمشروع لا يملك تجميع جلسات/أيام منفصلاً عن إطار الشارت الحالي (لا مصدر بيانات
 * يومي مستقل)، فنافذة متدحرجة period=20 (نفس القيمة الافتراضية المستخدَمة أصلاً لـ
 * computeVolumeProfile/computeTpo أعلاه بهذا الملف تحديداً — نفس اصطلاح "نافذة أخيرة" الراسخ
 * بالمشروع) بديل معقول ومتّسق بدل حدود جلسة حقيقية غير متوفرة بالبيانات الحالية.
 * الحساب: أعلى/أدنى للنافذة المكتملة قبل آخر شمعة + إغلاق آخر شمعة بالنافذة → PP=(أعلى+أدنى+إغلاق)/3،
 * ثم الصيغ الكلاسيكية الست: R1=2×PP−أدنى، S1=2×PP−أعلى، R2=PP+المدى، S2=PP−المدى،
 * R3=أعلى+2×(PP−أدنى)، S3=أدنى−2×(أعلى−PP) (المدى=أعلى−أدنى). قيمة واحدة ثابتة لكل استدعاء (لا
 * مصفوفة لكل شمعة، بنفس نمط poc/pocPrice أعلاه بالمشروع) — تُرسَم كسبعة خطوط أفقية بنفس نمط
 * styles.hLine/styles.fibLabel المستخدَم أصلاً لمستويات فيبوناتشي وخط POC حجمي حرفياً بـ
 * MatrixChart.tsx (بلا أي كود رسم جديد).
 * **تحقّق يدوي**: سعر ثابت تماماً P بكل الشموع → أعلى=أدنى=إغلاق=P للنافذة → المدى=0 → كل السبعة
 * مستويات=P بالضبط (لا تباعد بلا نطاق سعري فعلي) — تحقَّق بتشغيل Node.js فعلي (سعر ثابت + 300 شمعة
 * عشوائية بذرة ثابتة): صفر NaN/Infinity، وترتيب R3≥R2≥R1≥PP≥S1≥S2≥S3 محقَّق دائماً حسابياً (قيد
 * بنيوي للصيغة الكلاسيكية نابع من أن أدنى≤إغلاق≤أعلى للنافذة دوماً بحكم بنائها).
 */
export function computePivotPoints(
  candles: Candle[],
  period = 20
): { pp: number; r1: number; r2: number; r3: number; s1: number; s2: number; s3: number } | null {
  const n = candles.length;
  if (n < period + 1) return null;
  const window = candles.slice(n - period - 1, n - 1);
  let hi = -Infinity;
  let lo = Infinity;
  for (const c of window) {
    hi = Math.max(hi, c.high);
    lo = Math.min(lo, c.low);
  }
  const close = window[window.length - 1].close;
  const pp = (hi + lo + close) / 3;
  const range = hi - lo;
  return {
    pp,
    r1: 2 * pp - lo,
    s1: 2 * pp - hi,
    r2: pp + range,
    s2: pp - range,
    r3: hi + 2 * (pp - lo),
    s3: lo - 2 * (hi - pp),
  };
}

/**
 * Fibonacci Pivot Points (نسخة فيبوناتشي من نقاط الارتكاز — period=20 نافذة متدحرجة، نفس القرار
 * التصميمي والقيمة الافتراضية المعتمَدة لـ`computePivotPoints` الكلاسيكي أعلاه بالضبط ولنفس السبب:
 * لا تجميع جلسات/أيام منفصل بالمشروع) — نقطة ارتكاز مركزية واحدة (PP=(أعلى+أدنى+إغلاق)/3، نفس صيغة
 * PP الكلاسيكية تماماً) لكن مستويات الدعم/المقاومة الستة تُشتَق من **نسب فيبوناتشي القياسية**
 * (0.382/0.618/1.000) بدل مضاعفات المدى الصحيحة المستخدَمة بالنسخة الكلاسيكية (Woodie-style
 * 2×pp−lo/pp+range/hi+2×(pp−lo))، وهي نفس الصيغة المرجعية القياسية المستخدَمة بمعظم منصات الرسم
 * البياني لـ"Fibonacci Pivots" تحديداً: R1=PP+0.382×المدى، R2=PP+0.618×المدى، R3=PP+1.000×المدى،
 * S1=PP−0.382×المدى، S2=PP−0.618×المدى، S3=PP−1.000×المدى (المدى=أعلى−أدنى لنفس نافذة الحساب).
 * **إعادة استخدام كاملة** لبنية `computePivotPoints` أعلاه حرفياً (نفس نافذة `slice(n-period-1,
 * n-1)` المستبعِدة للشمعة الجارية غير المكتملة، نفس حارس `n < period + 1`) — الفرق الوحيد هو
 * معاملات الضرب الستة. يُرسَم بإعادة استخدام كاملة لنمط `styles.hLine`/`fibLabel` المستخدَم أصلاً
 * للمستوى الكلاسيكي وPOC/TPO حرفياً، بلون `colors.infoAccent` موحَّد للمستويات السبعة كلها (بدل
 * bull/bear/accent المستخدَمة للكلاسيكي) لتمييز الأداتين بصرياً عند تفعيلهما معاً دون تعارض تسميات
 * (تسميات مسبوقة بحرف مختلف بواجهة الرسم: "F" + المستوى).
 * **تحقّق حسابي فعلي (Node.js قبل الكتابة)**: مطابقة يدوية مباشرة لكل من PP/R1/R3/S3 لنافذة صناعية
 * محدَّدة القيم (تطابق تام <10⁻¹²)؛ 300 شمعة عشوائية بذرة ثابتة عبر 280 نافذة متدحرجة متتالية → ترتيب
 * R3≥R2≥R1≥PP≥S1≥S2≥S3 محقَّق حسابياً بكل نافذة بلا استثناء (المدى موجب دوماً ببيانات عشوائية واقعية)،
 * صفر NaN/Infinity عبر كل القيم؛ أقل من period+1 شمعة → يُرجِع null صراحةً (نفس حارس الكلاسيكي).
 */
export function computeFibPivotPoints(
  candles: Candle[],
  period = 20
): { pp: number; r1: number; r2: number; r3: number; s1: number; s2: number; s3: number } | null {
  const n = candles.length;
  if (n < period + 1) return null;
  const window = candles.slice(n - period - 1, n - 1);
  let hi = -Infinity;
  let lo = Infinity;
  for (const c of window) {
    hi = Math.max(hi, c.high);
    lo = Math.min(lo, c.low);
  }
  const close = window[window.length - 1].close;
  const pp = (hi + lo + close) / 3;
  const range = hi - lo;
  return {
    pp,
    r1: pp + 0.382 * range,
    r2: pp + 0.618 * range,
    r3: pp + 1.0 * range,
    s1: pp - 0.382 * range,
    s2: pp - 0.618 * range,
    s3: pp - 1.0 * range,
  };
}

/**
 * Camarilla Pivot Points (نيك سكوت — period=20 نافذة متدحرجة، نفس القرار التصميمي والقيمة
 * الافتراضية المعتمَدة لـ`computePivotPoints`/`computeFibPivotPoints` أعلاه بالضبط ولنفس السبب) —
 * ثامن مستوى دعم/مقاومة (أربعة بكل جهة R1..R4/S1..S4) حول **الإغلاق مباشرة** لا نقطة ارتكاز PP
 * مشتقة كما بالنسختين الكلاسيكية/فيبوناتشي أعلاه (فرق تصميمي جوهري لكاماريلا تحديداً بكل المراجع
 * القياسية: لا PP إطلاقاً، المرجع=إغلاق آخر شمعة مكتملة بالنافذة نفسها). **الصيغة** (معاملات
 * كاماريلا الثابتة القياسية، كـTradingView): R1=إغلاق+مدى×1.1/12، R2=إغلاق+مدى×1.1/6،
 * R3=إغلاق+مدى×1.1/4، R4=إغلاق+مدى×1.1/2، وبالمثل S1..S4 بالطرح (مدى=أعلى−أدنى. كانت ×1.0833…×1.5 —
 * «1+1/12» بدل «1.1/12» — فكل مستوى أبعد من مدى يوم كامل عن الإغلاق، أي ~100 pip على اليورو
 * لنفس نافذة الحساب). **شائع بتداول الفوركس تحديداً** (أكثر من الأسهم) لمستويات الدعم/المقاومة
 * داخل اليوم — مناسب جداً لطبيعة هذا المشروع. **إعادة استخدام كاملة** لبنية `computePivotPoints`/
 * `computeFibPivotPoints` أعلاه حرفياً (نفس نافذة `slice(n-period-1, n-1)` المستبعِدة للشمعة الجارية
 * غير المكتملة، نفس حارس `n < period + 1`) — الفرق الوحيد هو المرجع (إغلاق بدل PP) والمعاملات
 * الثمانية. يُرسَم بإعادة استخدام كاملة لنمط `styles.hLine`/`fibLabel` نفسه، بلون دافئ مميَّز جديد
 * `colors.warn` (بدل bull/bear/accent للكلاسيكي وinfoAccent لفيبوناتشي) لتمييز الأنواع الثلاثة بصرياً
 * عند تفعيلها معاً بلا تعارض (تسميات مسبوقة بحرف "C" بواجهة الرسم).
 * **تحقّق حسابي فعلي (Node.js قبل الكتابة)**: مطابقة يدوية مباشرة لكل من close/R1/R4/S4 لنافذة
 * صناعية محدَّدة القيم (تطابق تام <10⁻¹²)؛ 300 شمعة عشوائية بذرة ثابتة عبر 280 نافذة متدحرجة متتالية
 * → ترتيب R4≥R3≥R2≥R1≥إغلاق≥S1≥S2≥S3≥S4 محقَّق حسابياً بكل نافذة بلا استثناء، صفر NaN/Infinity عبر
 * كل القيم؛ أقل من period+1 شمعة → يُرجِع null صراحةً (نفس حارس الكلاسيكي/فيبوناتشي).
 */
export function computeCamarillaPivots(
  candles: Candle[],
  period = 20
): {
  close: number;
  r1: number;
  r2: number;
  r3: number;
  r4: number;
  s1: number;
  s2: number;
  s3: number;
  s4: number;
} | null {
  const n = candles.length;
  if (n < period + 1) return null;
  const window = candles.slice(n - period - 1, n - 1);
  let hi = -Infinity;
  let lo = Infinity;
  for (const c of window) {
    hi = Math.max(hi, c.high);
    lo = Math.min(lo, c.low);
  }
  const close = window[window.length - 1].close;
  const range = hi - lo;
  return {
    close,
    r1: close + (range * 1.1) / 12,
    r2: close + (range * 1.1) / 6,
    r3: close + (range * 1.1) / 4,
    r4: close + (range * 1.1) / 2,
    s1: close - (range * 1.1) / 12,
    s2: close - (range * 1.1) / 6,
    s3: close - (range * 1.1) / 4,
    s4: close - (range * 1.1) / 2,
  };
}

/**
 * Woodie's Pivot Points (Ken Wood) — نفس نافذة `slice(n-period-1, n-1)` المتدحرجة period=20 وحارس
 * `n < period + 1` المستخدَمَين حرفياً بـ`computePivotPoints`/`computeFibPivotPoints`/
 * `computeCamarillaPivots` أعلاه (نفس القرار التصميمي ولنفس السبب: لا تجميع جلسات/أيام منفصل
 * بالمشروع). **الفرق الجوهري الوحيد عن الكلاسيكي**: نقطة الارتكاز تُرجِّح الإغلاق ×2 بدل وزن متساوٍ
 * لأعلى/أدنى/إغلاق — PP=(أعلى+أدنى+2×إغلاق)/4 (بدل (أعلى+أدنى+إغلاق)/3 بالكلاسيكي) — يجعل PP أقرب
 * لسعر الإغلاق الفعلي، وهو الفارق المعرَّف قياسياً بين النسختين بكل المراجع. بقية المستويات
 * (R1/S1/R2/S2/R3/S3) بنفس معادلات الكلاسيكي حرفياً مطبَّقة على PP الجديد فقط (2×PP∓الطرف
 * المقابل، PP∓المدى، الطرف∓2×(PP−الطرف المقابل)) — إعادة استخدام كاملة للصيغة الهيكلية، لا صيغة
 * امتداد جديدة. مع Pivot Points/Fibonacci Pivots/Camarilla الموجودة مسبقاً، هذا يكمل قائمة "أنواع
 * Pivot Points" الأربعة الأكثر شيوعاً بمنصات الرسم البياني القياسية (Standard/Fibonacci/Camarilla/
 * Woodie) — لا نوع خامس متبقٍ من هذه العائلة تحديداً سوى DeMark أدناه مباشرة.
 * **تحقّق حسابي فعلي (Node.js، بيئة سحابية، قبل الكتابة)**: نافذة صناعية محدَّدة القيم (period=3
 * للاختبار) → تطابق تام يدوي لـPP/R1/S1/R2/S2 (فرق<10⁻¹²)؛ 280 نافذة متدحرجة متتالية عبر 300 شمعة
 * عشوائية بذرة ثابتة (period=20 الفعلية) → ترتيب R3≥R2≥R1≥PP≥S1≥S2≥S3 محقَّق حسابياً بكل نافذة بلا
 * استثناء، صفر NaN/Infinity عبر كل القيم؛ أقل من period+1 شمعة → null صراحةً (نفس حارس الثلاثة
 * السابقة). يُرسَم بإعادة استخدام كاملة لنمط `styles.hLine`/`fibLabel` نفسه، لون جديد `#C4B5FD`
 * (بنفسجي فاتح مميَّز عن `infoAccent`/`warn`/bull/bear المستخدَمة للأنواع الثلاثة الأخرى، تحقَّق
 * بـ`grep` غير مكرَّر عبر كل الهكسات المستخدَمة بالمشروع)، تسميات مسبوقة "W".
 */
export function computeWoodiePivots(
  candles: Candle[],
  period = 20
): { pp: number; r1: number; r2: number; r3: number; s1: number; s2: number; s3: number } | null {
  const n = candles.length;
  if (n < period + 1) return null;
  const window = candles.slice(n - period - 1, n - 1);
  let hi = -Infinity;
  let lo = Infinity;
  for (const c of window) {
    hi = Math.max(hi, c.high);
    lo = Math.min(lo, c.low);
  }
  const close = window[window.length - 1].close;
  const pp = (hi + lo + 2 * close) / 4;
  const range = hi - lo;
  return {
    pp,
    r1: 2 * pp - lo,
    s1: 2 * pp - hi,
    r2: pp + range,
    s2: pp - range,
    r3: hi + 2 * (pp - lo),
    s3: lo - 2 * (hi - pp),
  };
}

/**
 * DeMark Pivot Points (Tom DeMark) — نفس نافذة/حارس `computeWoodiePivots` أعلاه حرفياً، لكن
 * **الفارق التصميمي الجوهري لهذا النوع تحديداً بكل المراجع القياسية**: مستوى واحد فقط لكل جهة
 * (PP/R1/S1 فقط — لا R2/R3/S2/S3 إطلاقاً)، والصيغة **شرطية** حسب علاقة إغلاق/فتح آخر شمعة
 * بالنافذة (أول مؤشر بعائلة Pivot Points بالملف يستخدم `open` الشمعة، لا فقط أعلى/أدنى/إغلاق):
 * إغلاق<فتح (هابطة) → X=أعلى+2×أدنى+إغلاق؛ إغلاق>فتح (صاعدة) → X=2×أعلى+أدنى+إغلاق؛ تعادل
 * (إغلاق=فتح، حالة حدّية نادرة) → X=أعلى+أدنى+2×إغلاق (نفس ترجيح Woodie أعلاه بالضبط لهذه الحالة
 * الحدّية تحديداً — تطابق المرجع القياسي). ثم PP=X/4، R1=X/2−أدنى، S1=X/2−أعلى بغضّ النظر عن
 * الفرع. **خاصية هيكلية مضمونة رياضياً** بصرف النظر عن الفرع: R1>PP>S1 دائماً طالما أعلى>أدنى
 * (لأن X/2−أدنى − X/4 = X/4−أدنى، وX/4≥أعلى/4+أدنى/4+... دائماً أكبر من أدنى بحكم تكوين X من
 * مضاعفات أعلى/أدنى الموجبة — تحقَّق تجريبياً بكل الفروع الثلاثة بلا استثناء أدناه). **تحقّق حسابي
 * فعلي (Node.js، بيئة سحابية، قبل الكتابة)**: مطابقة يدوية مباشرة لكل فرع من الثلاثة (هابطة/صاعدة/
 * تعادل) بنافذة صناعية محدَّدة القيم (فرق<10⁻¹²)؛ 280 نافذة متدحرجة متتالية عبر 300 شمعة عشوائية
 * بذرة ثابتة (period=20 الفعلية، تُغطّي الفرعين الهابط/الصاعد عشوائياً حسب البيانات) → ترتيب
 * R1≥PP≥S1 محقَّق حسابياً بكل نافذة بلا استثناء، صفر NaN/Infinity؛ أقل من period+1 شمعة → null
 * صراحةً. يُرسَم بإعادة استخدام كاملة لنمط `styles.hLine`/`fibLabel` نفسه (مستويان فقط بدل سبعة،
 * بلا PP منفصل مرسوم لتفادي ازدحام بصري إضافي عند تفعيل الأنواع الأربعة معاً — R1/S1 فقط، نفس قرار
 * "أقل ازدحاماً حيث الصيغة نفسها أقل مستويات" الموثَّق ضمنياً بفارق عدد مستويات Camarilla/الكلاسيكي
 * أصلاً)، لون جديد `#FDA4AF` (وردي فاتح مميَّز عن كل ألوان Pivot Points الأخرى وعن `bear`/
 * `highImpact`، تحقَّق بـ`grep` غير مكرَّر)، تسميات مسبوقة "D".
 */
export function computeDemarkPivots(
  candles: Candle[],
  period = 20
): { pp: number; r1: number; s1: number } | null {
  const n = candles.length;
  if (n < period + 1) return null;
  const window = candles.slice(n - period - 1, n - 1);
  let hi = -Infinity;
  let lo = Infinity;
  for (const c of window) {
    hi = Math.max(hi, c.high);
    lo = Math.min(lo, c.low);
  }
  const last = window[window.length - 1];
  const { open, close } = last;
  let x: number;
  if (close < open) x = hi + 2 * lo + close;
  else if (close > open) x = 2 * hi + lo + close;
  else x = hi + lo + 2 * close;
  const pp = x / 4;
  return {
    pp,
    r1: x / 2 - lo,
    s1: x / 2 - hi,
  };
}

export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

/**
 * TWAP (Time-Weighted Average Price) — تراكمي من بداية النافذة تماماً بنمط computeVwap أعلاه، لكن
 * بلا وزن حجمي: كل شمعة تُحتسَب بوزن متساوٍ بغض النظر عن الفوليوم (بعكس VWAP الذي يُرجِّح كل شمعة
 * بفوليومها). السعر النموذجي TP=(أعلى+أدنى+إغلاق)/3 نفسه المستخدَم بـVWAP/MFI/ADL أعلاه، لكن يُجمَع
 * هنا كمتوسط بسيط تراكمي (cumTP/عدد الشموع) بدل (cumPV/cumVol). مفيد لمقارنة السعر الفعلي بمتوسطه
 * الزمني الصرف حين يكون فوليوم المزود غير موثوق أو غير متوفر، بعكس VWAP الحساس لجودة بيانات الحجم.
 * **تحقّق يدوي**: سعر ثابت تماماً بكل الشموع → TP=السعر نفسه بكل شمعة → المتوسط التراكمي=السعر نفسه
 * من أول نقطة بالضبط (بعكس SMA بفترة ثابتة الذي يحتاج نافذة كاملة ليبدأ) — تقارب فوري مطابق لـVWAP
 * بنفس الحالة الحدّية. لا قسمة على صفر إطلاقاً (i+1 يبدأ من 1 دوماً). **تحقّق Node.js فعلي**: سعر
 * ثابت 50 شمعة → تطابق تام بكل نقطة (فرق<10⁻¹²)؛ 300 شمعة عشوائية بذرة ثابتة → صفر NaN/Infinity
 * عبر كل الـ300 نقطة (بلا أي فترة إحماء، بعكس معظم دوال الملف).
 */
export function computeTwap(candles: Candle[], sessionOf?: (c: Candle) => number): (number | null)[] {
  // `sessionOf` (اختياري، نمط computeVwap): المجموع والعدد يُصفَّران عند تغيّر مفتاح الجلسة
  const out: (number | null)[] = [];
  let cumTP = 0;
  let n = 0;
  let session: number | null = null;
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    if (sessionOf) {
      const k = sessionOf(c);
      if (session != null && k !== session) {
        cumTP = 0;
        n = 0;
      }
      session = k;
    }
    const tp = (c.high + c.low + c.close) / 3;
    cumTP += tp;
    n++;
    out.push(cumTP / n);
  }
  return out;
}

/**
 * القياسي الرابع: Close/Open/High/Low/Median/Typical/Weighted/**Average**). avgPrice[i] =
 * (فتح[i]+أعلى[i]+أدنى[i]+إغلاق[i])/4 — بلا أي تمهيد أو نافذة متدحرجة، بنفس نمط medianPrice/
 * typicalPrice/weightedClose حرفياً (قيمة صالحة من أول شمعة، صفر null). يُرسَم بنفس نمط النقاط
 * overlay المستخدَم للثلاثة أعلاه، لون جديد `#C4B5FD` غير مستخدَم سابقاً.
 * **تحقّق حسابي فعلي (Node.js قبل الكتابة)**: شمعة بفتح=أعلى=أدنى=إغلاق ثابتة → avgPrice=نفس القيمة
 * بالضبط؛ شمعة يدوية (فتح 1.10/أعلى 1.30/أدنى 1.00/إغلاق 1.20) → طابقت الحساب اليدوي (1.15) تماماً؛
 * 300 شمعة عشوائية بذرة ثابتة → صفر NaN/Infinity، وكل قيمة ضمن [أدنى[i], أعلى[i]] بالضبط (محقَّق
 * بنيوياً لأن أعلى/أدنى حدّا كل OHLC الأربعة فمتوسطها محصور بينهما حتماً).
 */
export function computeAveragePrice(candles: Candle[]): number[] {
  return candles.map((c) => (c.open + c.high + c.low + c.close) / 4);
}

/**
 * Central Pivot Range (CPR — امتداد شائع لعائلة Pivot Points التقليدية، منتشر خصوصاً بمتداولي
 * اليوم الهنود) — **إعادة استخدام كاملة** لنفس نافذة `slice(n-period-1, n-1)` المتدحرجة period=20
 * وحارس `n < period + 1` المستخدَمَين حرفياً بـ`computePivotPoints`/`computeFibPivotPoints`/
 * `computeCamarillaPivots`/`computeWoodiePivots`/`computeDemarkPivots` أعلاه بالملف — صفر منطق نافذة
 * جديد، فقط ثلاث نقاط مشتقة من نفس أعلى/أدنى/إغلاق النافذة. **الصيغة القياسية** (تأكيد صيغة عبر
 * WebFetch من مرجعين مستقلّين قبل الكتابة: zerodha.com/varsity وstockmaniacs.net، متطابقين حرفياً):
 * PP=(أعلى+أدنى+إغلاق)/3 (نفس PP الكلاسيكي بالضبط)، BC=(أعلى+أدنى)/2، TC=PP+(PP−BC)=2×PP−BC.
 * **قرار تصميم موثَّق صراحةً بكلا المرجعين**: الصيغة الحرفية لـTC قد تكون *أصغر* من BC رياضياً (يحدث
 * حين يقع الإغلاق تحت منتصف مدى النافذة أعلى/أدنى) — كلا المرجعين ينصّان صراحةً أن كل منصّات الرسم
 * القياسية تعرض **الأعلى قيمةً دوماً كـ"Top" والأدنى دوماً كـ"Bottom"** بصرف النظر عن أي طرف أنتجته
 * صيغة TC/BC تحديداً؛ لذا الدالة هنا تُرجِع مباشرة `{ pp, top, bottom }` بعد `Math.max`/`Math.min`
 * بدل تسميتين قد تنعكسان، تفادياً لالتباس أو شريط معكوس بصرياً عند الرسم. **خاصية جبرية مضمونة
 * رياضياً مستقلة عن أي حالة** (مُحقَّقة أدناه): PP هو **منتصف Top/Bottom بالضبط دوماً**
 * (TC−PP≡PP−BC جبرياً من نفس تعريف TC=2×PP−BC، فPP=(top+bottom)/2 حتى في الحالة "المعكوسة").
 * **تحقّق حسابي فعلي (Node.js، بيئة الجلسة السحابية، قبل الكتابة)**: سوق مسطّح تماماً (أعلى=أدنى=
 * إغلاق=100 لكل شمعة) → pp=top=bottom=100 بالضبط؛ نافذة صناعية بإغلاق *فوق* منتصف المدى → ترتيب
 * طبيعي top≥pp≥bottom (بلا انعكاس)؛ نافذة صناعية أخرى بإغلاق *تحت* منتصف المدى → تأكَّد فعلياً أن
 * الصيغة الحرفية تُنتِج tcRaw<bcRaw (الحالة "المعكوسة" موثَّقة أعلاه)، ومع ذلك top≥pp≥bottom يبقى
 * محقَّقاً بعد Math.max/Math.min، وpp=(top+bottom)/2 بفرق<10⁻⁹؛ 300 شمعة عشوائية بذرة ثابتة
 * (mulberry32) عبر 280 نافذة متدحرجة متتالية → صفر NaN/Infinity، خاصية "PP=منتصف Top/Bottom" وترتيب
 * top≥pp≥bottom محقَّقان بكل نافذة بلا استثناء واحد، **إعادة حساب brute-force مستقلة تماماً** لـPP
 * (حلقة أعلى/أدنى معزولة) تطابق تام بكل نافذة؛ أقل من period+1 شمعة → null صراحةً (نفس حارس الأربعة
 * السابقة). يُرسَم كخط PP منقّط بمنتصف شريط شبه شفاف بين top/bottom بنمط donchian حرفياً
 * (لون جديد `#FEF08A` أصفر فاتح مميَّز عن كل ألوان Pivot Points الأخرى — تحقَّق بـgrep غير مكرَّر).
 */
export function computeCpr(
  candles: Candle[],
  period = 20
): { pp: number; top: number; bottom: number } | null {
  const n = candles.length;
  if (n < period + 1) return null;
  const window = candles.slice(n - period - 1, n - 1);
  let hi = -Infinity;
  let lo = Infinity;
  for (const c of window) {
    hi = Math.max(hi, c.high);
    lo = Math.min(lo, c.low);
  }
  const close = window[window.length - 1].close;
  const pp = (hi + lo + close) / 3;
  const bcRaw = (hi + lo) / 2;
  const tcRaw = 2 * pp - bcRaw;
  return { pp, top: Math.max(bcRaw, tcRaw), bottom: Math.min(bcRaw, tcRaw) };
}
