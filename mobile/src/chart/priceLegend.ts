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
  supertrend: { label: 'Supertrend', swatch: ['colors.bull', 'colors.bear'] },
  ichimoku: {
    label: 'Ichimoku',
    swatch: ['#60A5FA', '#F87171', '#C084FC'],
  },
  psar: { label: 'PSAR', swatch: ['#A3E635'] },
  keltner: { label: 'Keltner', swatch: ['#D8B4FE'], drawn: ['rgba(216,180,254,0.18)'] },
  donchian: { label: 'Donchian', swatch: ['#A3B4D0'], drawn: ['rgba(163,180,208,0.14)'] },
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
  kama: { label: 'KAMA', swatch: ['#67E8F9'] },
  alma: { label: 'ALMA', swatch: ['#E879F9'] },
  t3: { label: 'T3', swatch: ['#0EA5E9'] },
  zlema: { label: 'ZLEMA', swatch: ['#FDBA74'] },
  frama: { label: 'FRAMA', swatch: ['#7DD3FC'] },
  vidya: { label: 'VIDYA', swatch: ['#FDA4AF'] },
  trima: { label: 'TRIMA', swatch: ['#D9F99D'] },
  mcginley: { label: 'McGinley', swatch: ['#5EEAD4'] },
  lsma: { label: 'LSMA', swatch: ['#22D3EE'] },
  tsf: { label: 'TSF', swatch: ['#A5B4FC'] },
  dma: { label: 'DMA', swatch: ['#C7D2FE'] },
  gmma: { label: 'GMMA', swatch: ['#6EE7B7', '#93C5FD'] },
  gannHiLo: { label: 'Gann HiLo', swatch: ['#FCD34D'] },
  envelopes: { label: 'Envelopes', swatch: ['#F59E0B'], drawn: ['rgba(245,158,11,0.14)'] },
  zigzag: { label: 'ZigZag', swatch: ['#D946EF'] },
  chandelierExit: { label: 'Chandelier', swatch: ['#BBF7D0', '#FECACA'] },
  linRegChannel: { label: 'LinReg', swatch: ['#BFDBFE'], drawn: ['rgba(191,219,254,0.14)'] },
  starcBands: { label: 'STARC', swatch: ['#F9A8D4'], drawn: ['rgba(249,168,212,0.14)'] },
  accelBands: { label: 'Accel', swatch: ['#FED7AA'], drawn: ['rgba(254,215,170,0.14)'] },
  stdErrorBands: { label: 'Std Err', swatch: ['#BEF264'], drawn: ['rgba(190,242,100,0.14)'] },
  vwapBands: { label: 'VWAP Bnd', swatch: ['#EAB308'], drawn: ['rgba(234,179,8,0.14)'] },
  chandeKroll: { label: 'ChandeKrl', swatch: ['#99F6E4', '#F9A66C'] },
  fractalChaosBands: {
    label: 'FCB',
    swatch: ['#F0ABFC'],
    drawn: ['rgba(240,171,252,0.14)'],
  },
  elderImpulse: {
    label: 'Elder',
    swatch: ['colors.bull', 'colors.bear', 'colors.dxy'],
  },
  medianPrice: { label: 'Median', swatch: ['#94A3B8'] },
  typicalPrice: { label: 'Typical', swatch: ['#FDE68A'] },
  weightedClose: { label: 'W. Close', swatch: ['#FCA5A5'] },
  avgPrice: { label: 'Avg', swatch: ['#C4B5FD'] },
};

/** ترتيب الأولوية مشتقّ من ترتيب المفاتيح أعلاه — تعريف واحد لا قائمتان تتباعدان. */
export const PRICE_OVERLAY_ORDER: readonly string[] = Object.keys(PRICE_OVERLAYS);

/**
 * طبقات لونها **دلالي** لا هويّتي: أخضر = صعود، أحمر = هبوط (وأزرق = حياد عند Elder).
 * هذه وحدها يجوز أن تتشارك اللون — فتشارُكها هو المعنى نفسه، وتمييزها يقع على الشكل
 * والموضع لا على اللون. ما عداها يجب أن ينفرد بلونه، ويفرض ذلك اختبارُ التفرّد.
 */
export const DIRECTIONAL_OVERLAYS: readonly string[] = [
  'supertrend',
  'fractals',
  'elderImpulse',
];

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
 * الطبقات المفعَّلة بترتيب الأولوية، بلا حدّ — مصدر الاختيار والترتيب لـ`planPriceLegendForWidth`.
 * مؤشرات اللوحات المستقلّة (RSI، MACD) ليست بالجدول فتُتجاهَل، والتكرار بالقائمة لا يُنتج شارتين.
 */
export function activePriceOverlays(indicators: readonly string[]): LegendChip[] {
  const out: LegendChip[] = [];
  for (const id of PRICE_OVERLAY_ORDER) {
    if (!indicators.includes(id)) continue;
    const spec = PRICE_OVERLAYS[id]!;
    out.push({ id, label: spec.label, swatch: spec.swatch });
  }
  return out;
}

/* ——— قياس الشارة ——— */
/** هوامش الشارة الأفقية (`paddingHorizontal: 4` جانبين). */
export const LEGEND_CHIP_PAD = 8;
/** الفراغ بين شارتين (`marginRight: 6`). */
export const LEGEND_CHIP_GAP = 6;
/** عرض مربّع لون واحد بفراغه (`width: 6` + `marginRight: 3`). */
export const LEGEND_SWATCH_W = 9;
/** تقدير عرض المحرف بـ`fontSize: 9` ووزن 700 — تقدير متحفّظ (أعلى من المتوسط الفعلي). */
export const LEGEND_CHAR_W = 5.2;
/** ما تحجزه «+ن» من العرض حتى لا تُقصّ هي نفسها فيختفي العدد بصمت. */
export const LEGEND_MORE_W = 24;

/**
 * عرض شارة بعينها — يعتمد طول اسمها وعدد مربّعات لونها، لا رقماً واحداً للجميع.
 * `valueChars` طول قيمة الخطّ المطبوعة بعد الاسم («SMA 20 1.08532») مع فراغها؛ 0 ⇒ بلا قيمة.
 */
export function legendChipWidth(chip: Pick<LegendChip, 'label' | 'swatch'>, valueChars = 0): number {
  const v = Number.isFinite(valueChars) && valueChars > 0 ? valueChars + 1 : 0;
  return (
    LEGEND_CHIP_PAD +
    chip.swatch.length * LEGEND_SWATCH_W +
    (chip.label.length + v) * LEGEND_CHAR_W +
    LEGEND_CHIP_GAP
  );
}

/**
 * قيمة خطّ الطبقة عند شمعة (التقاطع، أو الأخيرة بلا تقاطع) — كمفتاح TradingView: «SMA 20 1.08532»
 * لا الاسم وحده، فيُقرأ أين المتوسط من السعر بلا تتبّع الخطّ بالعين إلى المحور.
 * `null` لخانة الإحماء (أول 19 شمعة لـSMA 20) أو خارج المصفوفة أو قيمة فاسدة — لا يُطبع رقم مُختلَق.
 */
export function legendValueAt(
  line: readonly (number | null | undefined)[] | null | undefined,
  index: number | null | undefined
): number | null {
  if (!line || index == null || !Number.isInteger(index) || index < 0 || index >= line.length) return null;
  const v = line[index];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * حدّا النطاق (أعلى ثم أدنى) عند شمعة — للنطاقات (BB، كلتنر، دونشيان) التي كانت بالاسم وحده:
 * «BB 1.08732 1.08332». الأعلى أولاً كترتيبهما على الشارت. متداول النطاق يقرأ «كم بقي للحدّ»
 * منهما مباشرة بلا تتبّع الخطّ الشفّاف إلى المحور. أحدهما بالإحماء أو فاسد ⇒ `null` (لا نصف نطاق).
 */
export function legendBandAt(
  upper: readonly (number | null | undefined)[] | null | undefined,
  lower: readonly (number | null | undefined)[] | null | undefined,
  index: number | null | undefined
): readonly [number, number] | null {
  const hi = legendValueAt(upper, index);
  const lo = legendValueAt(lower, index);
  return hi == null || lo == null ? null : [Math.max(hi, lo), Math.min(hi, lo)];
}

/**
 * قيم طبقة متعدّدة الخطوط عند شمعة، بترتيب الخطوط المُمرَّر — إيشيموكو (Tenkan ثم Kijun) والتمساح
 * (الفكّ ثم الأسنان ثم الشفاه): «Ichimoku 1.08512 1.08470» كل رقم بلون خطّه. كانت بالاسم وحده، فمتداول
 * التقاطع (Tenkan فوق Kijun؟ الشفاه فوق الفكّ؟) يتتبّع ثلاثة خطوط متلاصقة بالعين إلى المحور.
 * أحد الخطوط بالإحماء أو فاسد ⇒ `null` (لا نصف قراءة يبدو فيها رقم لخطّ غير خطّه).
 */
export function legendMultiAt(
  lines: readonly (readonly (number | null | undefined)[] | null | undefined)[],
  index: number | null | undefined
): number[] | null {
  if (lines.length === 0) return null;
  const out: number[] = [];
  for (const line of lines) {
    const v = legendValueAt(line, index);
    if (v == null) return null;
    out.push(v);
  }
  return out;
}

/**
 * يخطّط المفتاح بعرض متاح فعليّ بدل عدّ شارات بعرض ثابت.
 *
 * السبب: الصفّ `nowrap` + `overflow: hidden`، فما لا يتّسع **يُقصّ** — و«+ن» آخر الصفّ
 * فهي أول ما يُقصّ. بتقدير عرض واحد للجميع (58px) تكفي شارتان طويلتان كـ«Supertrend»
 * و«Chandelier» لتجاوز العرض، فيبتلع القصّ العدّاد ويظنّ المتداول أن ما يراه هو كل
 * الطبقات المفعَّلة. هنا: مجموع العروض الحقيقية، و«+ن» محجوزة مسبقاً متى وُجدت.
 *
 * ثابت دائماً: `chips.length + more === عدد الطبقات المفعَّلة` — لا إخفاء صامت بأيّ عرض.
 */
export function planPriceLegendForWidth(
  indicators: readonly string[],
  availableW: number,
  /** طول قيمة كل طبقة تُطبع قيمتها (المعرّف ⇒ عدد المحارف) — تُحجز بالعرض فلا تُقصّ. */
  valueChars?: Readonly<Record<string, number>>
): LegendPlan {
  const widthOf = (c: LegendChip) => legendChipWidth(c, valueChars?.[c.id] ?? 0);
  const active = activePriceOverlays(indicators);
  if (active.length === 0) return { chips: [], more: 0 };
  const w = Number.isFinite(availableW) ? availableW : 0;
  if (w <= 0) return { chips: [], more: active.length };

  if (active.length <= LEGEND_MAX_CHIPS) {
    let total = 0;
    for (const c of active) total += widthOf(c);
    if (total <= w) return { chips: active, more: 0 };
  }

  const budget = w - LEGEND_MORE_W;
  const chips: LegendChip[] = [];
  let used = 0;
  for (const c of active) {
    if (chips.length >= LEGEND_MAX_CHIPS) break;
    const cw = widthOf(c);
    if (used + cw > budget) break;
    used += cw;
    chips.push(c);
  }
  return { chips, more: active.length - chips.length };
}

/** أقصى عدد شارات مهما اتّسع العرض: أكثر من ذلك يحجب الشموع بدل أن يوضّحها. */
export const LEGEND_MAX_CHIPS = 6;

/** يحلّ تعبير اللون: hex/rgba حرفي كما هو، أو رمز سمة من الجدول المُمرَّر. */
export function resolveColorExpr(
  expr: ColorExpr,
  tokens: Readonly<Record<string, string>>
): string {
  if (expr.startsWith('#') || expr.startsWith('rgb')) return expr;
  return tokens[expr] ?? '#94A3B8';
}
