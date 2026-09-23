/**
 * مفتاح ألوان طبقات السعر (legend) — دوال وجداول خالصة.
 *
 * السبب: طبقات لوحة السعر تُرسم كلّها نقاطاً ملوّنة بلا أيّ اسم — ثلاثة متوسطات متحركة
 * مفعَّلة معاً تعني ثلاثة خطوط منقّطة بثلاثة ألوان، **ولا سبيل للمتداول أن يعرف أيّها
 * SMA 50 وأيّها EMA 21**. وهذا أكثر ما يُستعمل فعلاً بالتحليل الفني عند الأفراد:
 * تقاطع متوسطَين إشارةٌ لا معنى لها إن لم يُعرف أيّ خطّ عبر أيّاً.
 *
 * الجدول هنا **مصدر واحد للحقيقة** للاسم واللون معاً. وألوان الرسم مكتوبة بمواضعها
 * داخل `MatrixChart.tsx` (أربعون موضعاً) — فبدل نقلها كلّها (تعديل واسع الخطر على ملف
 * بـ‎8900‎ سطر) يتكفّل `priceLegend.selftest.ts` بمسح الملف آلياً والتأكّد أن لون كل
 * طبقة بالرسم **يطابق حرفياً** لون شارتها هنا. أيّ تغيير لاحق بلون رسم دون تحديث الجدول
 * يُسقط الاختبار بدل أن يُنتج مفتاحاً يكذب على المتداول — وهو أسوأ من غياب المفتاح.
 *
 * `drawn` موجودة للطبقات التي يختلف فيها لون الرسم عن لون الشارة لسبب مشروع: النطاقات
 * (بولنجر/كلتنر) تُملأ بلون شفّاف جداً (‎0.18‎ ألفا) لأنها مساحة لا خطّ — وشارة بهذه
 * الشفافية غير مقروءة أصلاً، فتُعرض بنفس اللون مصمتاً.
 */

/** تعبير لون كما هو مكتوب بالشيفرة: hex/rgba حرفي، أو رمز من السمة مثل `accent`. */
export type ColorExpr = string;

export interface PriceOverlaySpec {
  /** اسم قصير يُعرض بالشارة — ما يقوله المتداول لا اسم المتغيّر. */
  label: string;
  /** لون/ألوان الشارة (حتى ثلاثة لطبقة متعدّدة الخطوط كإيشيموكو والتمساح). */
  swatch: readonly ColorExpr[];
  /** تعبير لون الرسم بالمصدر إن اختلف عن `swatch` (النطاقات الشفّافة). */
  drawn?: readonly ColorExpr[];
}

/**
 * الترتيب هنا **هو** ترتيب الأولوية بالعرض: الأكثر استعمالاً عند المتداول الفردي أولاً،
 * فإن ضاق العرض ظهرت هذه وانطوى النادر تحت «+ن» بدل أن يُقصّ الشائع عشوائياً.
 */
export const PRICE_OVERLAYS: Readonly<Record<string, PriceOverlaySpec>> = {
  sma20: { label: 'SMA 20', swatch: ['#FBBF24'] },
  sma50: { label: 'SMA 50', swatch: ['colors.infoAccent'] },
  ema21: { label: 'EMA 21', swatch: ['accent'] },
  bb: { label: 'BB', swatch: ['#38BDF8'], drawn: ['rgba(56,189,248,0.18)'] },
  vwap: { label: 'VWAP', swatch: ['colors.white'] },
  ichimoku: {
    label: 'Ichimoku',
    swatch: ['colors.dxy', 'colors.highImpact', '#C084FC'],
  },
  psar: { label: 'PSAR', swatch: ['#A3E635'] },
  keltner: { label: 'Keltner', swatch: ['#A78BFA'], drawn: ['rgba(167,139,250,0.18)'] },
  alligator: { label: 'Alligator', swatch: ['#3B82F6', '#EF4444', '#84CC16'] },
  pivotsHL: { label: 'Pivots', swatch: ['#FB7185', '#4ADE80'] },
  fractals: { label: 'Fractals', swatch: ['colors.bear', 'colors.bull'] },
  wma20: { label: 'WMA 20', swatch: ['#F472B6'] },
  hma20: { label: 'HMA 20', swatch: ['#818CF8'] },
  smma20: { label: 'SMMA 20', swatch: ['#F97316'] },
  dema20: { label: 'DEMA 20', swatch: ['#34D399'] },
  tema20: { label: 'TEMA 20', swatch: ['#FB923C'] },
  vwma: { label: 'VWMA', swatch: ['#FACC15'] },
  twap: { label: 'TWAP', swatch: ['#BAE6FD'] },
  kama: { label: 'KAMA', swatch: ['#A78BFA'] },
  alma: { label: 'ALMA', swatch: ['#E879F9'] },
  t3: { label: 'T3', swatch: ['#0EA5E9'] },
  zlema: { label: 'ZLEMA', swatch: ['#FDBA74'] },
  frama: { label: 'FRAMA', swatch: ['#7DD3FC'] },
  vidya: { label: 'VIDYA', swatch: ['#FDA4AF'] },
  trima: { label: 'TRIMA', swatch: ['#D9F99D'] },
  mcginley: { label: 'McGinley', swatch: ['#5EEAD4'] },
  lsma: { label: 'LSMA', swatch: ['#22D3EE'] },
  tsf: { label: 'TSF', swatch: ['#38BDF8'] },
  dma: { label: 'DMA', swatch: ['#C7D2FE'] },
  gmma: { label: 'GMMA', swatch: ['#6EE7B7', '#93C5FD'] },
  gannHiLo: { label: 'Gann HiLo', swatch: ['#FCD34D'] },
  medianPrice: { label: 'Median', swatch: ['#94A3B8'] },
  typicalPrice: { label: 'Typical', swatch: ['#FDE68A'] },
  weightedClose: { label: 'W. Close', swatch: ['#FCA5A5'] },
  avgPrice: { label: 'Avg', swatch: ['#C4B5FD'] },
};

/** ترتيب الأولوية مشتقّ من ترتيب المفاتيح أعلاه — تعريف واحد لا قائمتان تتباعدان. */
export const PRICE_OVERLAY_ORDER: readonly string[] = Object.keys(PRICE_OVERLAYS);

export interface LegendChip {
  id: string;
  label: string;
  swatch: readonly ColorExpr[];
}

export interface LegendPlan {
  chips: readonly LegendChip[];
  /** عدد الطبقات المفعَّلة التي لم تتّسع — يُعرض «+ن» بدل إخفائها بصمت. */
  more: number;
}

/**
 * يختار شارات المفتاح من المؤشرات المفعَّلة بترتيب الأولوية، بحدّ `maxChips`.
 * - المؤشرات التي لا تُرسم على لوحة السعر (لوحات مستقلّة كـRSI وMACD) غير موجودة
 *   بالجدول فتُتجاهَل تماماً ولا تُحسب ضمن «+ن».
 * - التكرار بقائمة المؤشرات لا يُنتج شارتين.
 * - `maxChips` صفر أو سالب أو غير صالح ← لا شارات، و«+ن» تساوي كل المفعَّل (فلا يختفي
 *   العدد بصمت عند عرض ضيّق جداً).
 */
export function planPriceLegend(
  indicators: readonly string[],
  maxChips: number
): LegendPlan {
  const seen = new Set<string>();
  const active: LegendChip[] = [];
  for (const id of PRICE_OVERLAY_ORDER) {
    if (seen.has(id)) continue;
    if (!indicators.includes(id)) continue;
    seen.add(id);
    const spec = PRICE_OVERLAYS[id]!;
    active.push({ id, label: spec.label, swatch: spec.swatch });
  }
  const cap = Number.isFinite(maxChips) ? Math.max(0, Math.floor(maxChips)) : 0;
  if (cap >= active.length) return { chips: active, more: 0 };
  return { chips: active.slice(0, cap), more: active.length - cap };
}

/** عرض الشارة الواحدة تقريباً (مربّع اللون + النصّ + الفراغ) — لحساب ما يتّسع. */
export const LEGEND_CHIP_W = 58;
/** أقصى عدد شارات مهما اتّسع العرض: أكثر من ذلك يحجب الشموع بدل أن يوضّحها. */
export const LEGEND_MAX_CHIPS = 6;

/** كم شارة تتّسع بعرض متاح (بعد خصم محور السعر والهوامش). */
export function legendCapacity(availableW: number): number {
  if (!Number.isFinite(availableW) || availableW <= 0) return 0;
  return Math.min(LEGEND_MAX_CHIPS, Math.max(0, Math.floor(availableW / LEGEND_CHIP_W)));
}

/** يحلّ تعبير اللون: hex/rgba حرفي كما هو، أو رمز سمة من الجدول المُمرَّر. */
export function resolveColorExpr(
  expr: ColorExpr,
  tokens: Readonly<Record<string, string>>
): string {
  if (expr.startsWith('#') || expr.startsWith('rgb')) return expr;
  return tokens[expr] ?? '#94A3B8';
}
