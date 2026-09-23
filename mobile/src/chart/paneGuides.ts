/**
 * خطوط المرجع وقراءة القيمة الحالية للوحات المؤشّرات المحصورة المدى — دوال خالصة.
 *
 * السبب: بعد إصلاح محاذاة اللوحات صار الشريط يتحرّك فعلاً بقيمة المؤشّر، لكن المتداول
 * ما زال بلا مرجعَين أساسيَّين:
 * 1) **خطوط العتبات**: RSI بلا 30/70 ليس RSI — «تشبّع شرائي» بلا الخط الذي يُقاس عليه
 *    مجرّد تغيّر لون. وكذلك 20/80 للستوكاستيك وMFI، و25 لـADX، و‎−20/−80‎ لـ%R.
 * 2) **الرقم نفسه**: اللوحة لا تذكر قيمة الشمعة الأخيرة إطلاقاً، فلا يفرّق المتداول
 *    بين RSI عند 62 و68 وكلاهما «بين الخطين».
 *
 * كل اللوحات هنا محصورة بمدى ثابت معلوم (0..100 أو ‎−100..0‎)، وتستعمل جميعها نفس
 * تعيين المواضع الموجود بالرسم: `top = ((max − v) / (max − min)) × innerH`.
 * لوحات المقياس الديناميكي (CCI، ROC، ATR…) خارج هذا الملف عمداً: مقياسها يتغيّر مع
 * النافذة فلا يصحّ لها جدول عتبات ثابت.
 */

export type PaneGuideKind = 'extreme' | 'mid';

export interface PaneGuideLevel {
  v: number;
  kind: PaneGuideKind;
}

export interface PaneGuideSpec {
  min: number;
  max: number;
  levels: readonly PaneGuideLevel[];
}

/** أقلّ ارتفاع مساحة رسم تُرسم عنده خطوط أصلاً (أدنى منه واللوحة شريحة رفيعة). */
export const GUIDES_MIN_INNER_H = 18;
/** أقلّ ارتفاع تظهر عنده الخطوط الوسطى (RSI 50، ADX 25) دون ازدحام. */
export const GUIDES_MID_MIN_INNER_H = 44;
/** أقلّ ارتفاع تُكتب عنده أرقام العتبات بجانب الخطوط. */
export const GUIDES_LABEL_MIN_INNER_H = 34;

/** العتبات القياسية للوحات التي يستعملها المتداول الفردي فعلاً. */
export const PANE_GUIDES: Readonly<Record<string, PaneGuideSpec>> = {
  rsi: {
    min: 0,
    max: 100,
    levels: [
      { v: 70, kind: 'extreme' },
      { v: 50, kind: 'mid' },
      { v: 30, kind: 'extreme' },
    ],
  },
  stoch: {
    min: 0,
    max: 100,
    levels: [
      { v: 80, kind: 'extreme' },
      { v: 20, kind: 'extreme' },
    ],
  },
  mfi: {
    min: 0,
    max: 100,
    levels: [
      { v: 80, kind: 'extreme' },
      { v: 20, kind: 'extreme' },
    ],
  },
  /** ADX: 25 عتبة «سوق ذات اتجاه» — خطّ واحد لا حدّان. */
  adx: { min: 0, max: 100, levels: [{ v: 25, kind: 'mid' }] },
  /** ويليامز %R مدىً سالب: ‎−20‎ تشبّع شرائي و‎−80‎ تشبّع بيعي. */
  willr: {
    min: -100,
    max: 0,
    levels: [
      { v: -20, kind: 'extreme' },
      { v: -80, kind: 'extreme' },
    ],
  },
  /**
   * StochRSI: عتبات الستوكاستيك (20/80) لا عتبات RSI (30/70) — فهي ستوكاستيك **على**
   * RSI لا RSI نفسه، ومداها 0..100 تصل طرفيه في كل موجة تقريباً. بلا الخطّين تبقى
   * اللوحة لوناً متغيّراً بلا مرجع يُقاس عليه.
   */
  stochRsi: {
    min: 0,
    max: 100,
    levels: [
      { v: 80, kind: 'extreme' },
      { v: 20, kind: 'extreme' },
    ],
  },
  /**
   * ‎%B‎: موضع السعر داخل نطاق بولنجر — ‎1‎ الحزام العلوي و‎0‎ السفلي و‎0.5‎ الوسط (المتوسّط
   * المتحرّك نفسه، وهو أهمّ مرجع باللوحة). العتبات بوحدة السلسلة (كسر لا نسبة مئوية)
   * وعند ‎0.8/0.2‎ لا ‎1/0‎: حدّا الحزام ينطبقان على حافتَي اللوحة فلا يُريان، و‎0.8/0.2‎
   * هما بالضبط حدّا ألوان الأعمدة بالرسم فيُقرأ الخط واللون كشيء واحد.
   */
  percentB: {
    min: 0,
    max: 1,
    levels: [
      { v: 0.8, kind: 'extreme' },
      { v: 0.5, kind: 'mid' },
      { v: 0.2, kind: 'extreme' },
    ],
  },
};

export interface PlacedGuide {
  v: number;
  kind: PaneGuideKind;
  /** موضع الخط (y) داخل مساحة الرسم. */
  top: number;
  /** رقم العتبة إن اتّسع الارتفاع لكتابته، وإلا null. */
  label: string | null;
}

const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/**
 * يحوّل عتبات لوحة إلى مواضع بكسل داخل مساحة رسم بارتفاع `innerH`.
 * يعيد [] للوحة بلا عتبات معروفة أو لارتفاع لا يتّسع.
 */
export function placeGuides(paneId: string, innerH: number): PlacedGuide[] {
  const spec = PANE_GUIDES[paneId];
  if (!spec) return [];
  if (!Number.isFinite(innerH) || innerH < GUIDES_MIN_INNER_H) return [];
  const span = spec.max - spec.min;
  if (!(span > 0)) return [];
  const withLabels = innerH >= GUIDES_LABEL_MIN_INNER_H;
  const withMid = innerH >= GUIDES_MID_MIN_INNER_H;
  const out: PlacedGuide[] = [];
  for (const lv of spec.levels) {
    if (lv.kind === 'mid' && !withMid) continue;
    out.push({
      v: lv.v,
      kind: lv.kind,
      top: clamp(((spec.max - lv.v) / span) * innerH, 0, Math.max(0, innerH - 1)),
      label: withLabels ? String(lv.v) : null,
    });
  }
  return out;
}

/** قيمة آخر شمعة صالحة بالسلسلة (وهي ما يقرأه المتداول)، أو null. */
export function latestPaneValue(values: readonly (number | null | undefined)[]): number | null {
  for (let i = values.length - 1; i >= 0; i--) {
    const v = values[i];
    if (typeof v === 'number' && Number.isFinite(v)) return v;
  }
  return null;
}

/**
 * قيمة اللوحة **عند شمعة التقاطع**، أو قيمة آخر شمعة متى لا تقاطع.
 *
 * رأس اللوحة كان يعرض آخر قيمة دائماً: يضع المتداول التقاطع على شمعة أمس ليقرأ RSI
 * عندها فيرى قراءة **اليوم** — والرقم بجانب الشمعة الخطأ أسوأ من لا رقم. هنا الرقم
 * يتبع التقاطع كما يتبعه صندوق السعر.
 *
 * مؤشّر خارج المدى (النافذة تحرّكت والتقاطع ما زال قائماً) ⇐ آخر قيمة، لا فراغ.
 * قيمة غير صالحة عند شمعة صحيحة (المؤشّر لم ينضج بعد) ⇐ null: لا يُزوَّر رقم لشمعة
 * لا رقم لها.
 */
export function paneValueAt(
  values: readonly (number | null | undefined)[],
  index: number | null | undefined
): number | null {
  if (
    index == null ||
    !Number.isInteger(index) ||
    index < 0 ||
    index >= values.length
  ) {
    return latestPaneValue(values);
  }
  const v = values[index];
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/**
 * خانات الكسر المناسبة لمدى لوحة محصورة: مدى واسع (‎0..100‎) ⇐ خانة واحدة تكفي، ومدى
 * ضيّق (‎%B‎ بين ‎0‎ و‎1‎) ⇐ خانتان — وإلا صارت كل قراءات ‎%B‎ «0.4» و«0.8» فحسب ولا
 * يفرّق المتداول بين ملامسة الحزام وابتعاد ربع النطاق عنه.
 */
export function paneBoundedDecimals(paneId: string): number {
  const spec = PANE_GUIDES[paneId];
  if (!spec) return 1;
  return spec.max - spec.min >= 10 ? 1 : 2;
}

/** صياغة مختصرة تتّسع بعرض 36px: خانة عشرية واحدة افتراضاً، وبلا عشرية عند ≥100. */
export function formatPaneValue(v: number | null, decimals = 1): string | null {
  if (v == null || !Number.isFinite(v)) return null;
  const d = Number.isInteger(decimals) && decimals >= 0 && decimals <= 8 ? decimals : 1;
  return Math.abs(v) >= 100 ? String(Math.round(v)) : v.toFixed(d);
}

/* ——— صياغة قيمة لوحة ثنائية الجانب (مقياس ديناميكي) ——— */

/**
 * أقصى قيمة مطلقة صالحة بالسلسلة — **مقياس اللوحة** الذي تُصاغ عليه كل قيمها.
 *
 * الصياغة تُشتقّ من مقياس اللوحة لا من القيمة المعروضة وحدها، لسببين:
 * تبقى خانات الكسر ثابتة فلا يتغيّر شكل الرقم مع كل تيك؛ ويتساوى الجانبان فلا يظهر
 * ‎0.00042‎ صعوداً و‎-4.2e-4‎ هبوطاً بنفس اللوحة.
 */
export function paneSeriesMaxAbs(values: readonly (number | null | undefined)[]): number {
  let m = 0;
  for (const v of values) {
    if (typeof v === 'number' && Number.isFinite(v)) {
      const a = Math.abs(v);
      if (a > m) m = a;
    }
  }
  return m;
}

/**
 * خانات الكسر لثلاث خانات معنوية عند هذا المقياس، محصورة 0..8.
 * ‎0.00042‎ ⇐ 6، و‎56.7‎ ⇐ 1، و‎5678‎ ⇐ 0. مقياس صفر/فاسد ⇐ 2 (افتراض محايد).
 */
export function paneValueDecimals(maxAbs: number): number {
  if (!Number.isFinite(maxAbs) || maxAbs <= 0) return 2;
  return Math.min(8, Math.max(0, 2 - Math.floor(Math.log10(maxAbs))));
}

/** أقصى عدد محارف يتّسع بعمود الرأس (‎36px‎ بـ‎fontSize 8‎ للطويل). */
export const PANE_VALUE_MAX_CHARS = 8;

function trimZeros(s: string): string {
  return s.includes('.') ? s.replace(/0+$/, '').replace(/\.$/, '') : s;
}

/**
 * صياغة قيمة بلوحة مقياسها ديناميكي (MACD والزخم والتدفّق… — 47 لوحة لا عتبات لها).
 * تُختار الصيغة **مرّة لكل لوحة** من مقياسها: عادية، أو بآلاف/ملايين للوحات الحجم
 * الضخمة، أو أسّية متى لم يتّسع أطول نصّ ممكن باللوحة — فالشكل واحد لكل قيمها.
 */
export function formatPaneValueScaled(
  values: readonly (number | null | undefined)[],
  v: number | null | undefined
): string | null {
  if (v == null || !Number.isFinite(v)) return null;
  if (v === 0) return '0';
  // القيمة المعروضة داخل المقياس دائماً — يحمي من سلسلة فارغة أو لا تضمّ `v` نفسها
  const maxAbs = Math.max(paneSeriesMaxAbs(values), Math.abs(v));
  let scale = 1;
  let suffix = '';
  if (maxAbs >= 1e8) {
    scale = 1e6;
    suffix = 'M';
  } else if (maxAbs >= 1e5) {
    scale = 1e3;
    suffix = 'K';
  }
  const base = maxAbs / scale;
  // أطول نصّ ممكن باللوحة: أكبر قيمة، سالبة، **بلا حذف أصفار** — فحذفها يقصّر بعض
  // القيم لا كلّها، والقيمة الوسطى قد تكون أطول من القصوى (‎-0.0001‎ أقصر من ‎-0.000033‎).
  const worstLen = (d: number) => (-base).toFixed(d).length + suffix.length;
  let d = paneValueDecimals(base);
  while (d > 0 && worstLen(d) > PANE_VALUE_MAX_CHARS) d--;
  // لا يتّسع حتى بلا كسور، أو المقياس نفسه يُدوَّر إلى صفر ⇐ أسّي للّوحة كلّها
  if (worstLen(d) > PANE_VALUE_MAX_CHARS || Number(base.toFixed(d)) === 0) {
    return v.toExponential(1);
  }
  const s = trimZeros((v / scale).toFixed(d));
  if (s === '0' || s === '-0') return '0';
  return `${s}${suffix}`;
}

/**
 * حالة القيمة مقابل عتبات اللوحة — لتلوين الرقم وحده (لا لتغيير الرسم):
 * 'high' فوق العتبة العليا، 'low' تحت السفلى، وإلا 'mid'.
 * لوحة بعتبة واحدة (ADX): فوقها 'high'، وإلا 'mid' — لا 'low' لأن ADX منخفض ليس إشارة عكسية.
 */
export function paneValueState(paneId: string, v: number | null): 'high' | 'low' | 'mid' {
  const spec = PANE_GUIDES[paneId];
  if (!spec || v == null || !Number.isFinite(v)) return 'mid';
  const ext = spec.levels.filter((l) => l.kind === 'extreme').map((l) => l.v);
  if (ext.length >= 2) {
    const hi = Math.max(...ext);
    const lo = Math.min(...ext);
    if (v > hi) return 'high';
    if (v < lo) return 'low';
    return 'mid';
  }
  const only = spec.levels[0];
  if (only && v > only.v) return 'high';
  return 'mid';
}

/* ——— لوحة ذات سلسلتين (Gator) ——— */

/**
 * فرق سلسلتَي لوحة ثنائية السلسلة — **اتّساع الفكّ** بلغة التمساح.
 *
 * Gator هي اللوحة الوحيدة التي بقيت بالاسم وحده بعد ربط قيمة الشمعة الأخيرة بالـ47
 * الأخرى: سلسلتان (`upper ≥ 0` فوق الصفر و`lower ≤ 0` تحته) فقيمة واحدة لا تمثّلها،
 * وعمود الرأس ‎36px‎ لا يسع رقمين. وما يقرؤه المتداول من التمساح أصلاً ليس أيّ الشريطين
 * أطول بل **مجموع طولهما**: اتّساع الفكّ = `upper − lower` (وهو `upper + |lower|` لأن
 * السفلى سالبة دائماً). قيمة واحدة صادقة، لا اختزال لإحدى السلسلتين.
 *
 * نقطة صالحة فقط متى صحّت السلسلتان معاً — فطول جانب واحد ليس اتّساعاً.
 *
 * الدالة خالصة الطرح فتصلح لكل لوحة ذات سلسلتين لا لـGator وحدها: تستعملها DMI
 * أيضاً (`+DI − −DI`، وكلتاهما موجبة هناك) حيث **إشارة** الفارق هي كفّة السوق.
 * فمعنى النتيجة من اللوحة لا من الدالة، ولذلك يُختار لون الرأس بـ`tone` عند الاستعمال.
 */
export function paneSpreadSeries(
  upper: readonly (number | null | undefined)[],
  lower: readonly (number | null | undefined)[]
): (number | null)[] {
  const n = Math.min(upper.length, lower.length);
  const out: (number | null)[] = new Array(n).fill(null);
  for (let i = 0; i < n; i++) {
    const u = upper[i];
    const l = lower[i];
    if (typeof u === 'number' && Number.isFinite(u) && typeof l === 'number' && Number.isFinite(l)) {
      out[i] = u - l;
    }
  }
  return out;
}

/**
 * اتّجاه آخر قيمتين صالحتين بالسلسلة — للتلوين حيث لا معنى لإشارة القيمة نفسها.
 *
 * باتّساع الفكّ القيمة موجبة دائماً، فتلوين الجانب (`PaneValueHead`) يجعلها خضراء أبداً
 * ولا يقول شيئاً. الإشارة المعنيّة هنا **اتّساع أم انكماش**: وهي نفس دلالة ألوان أعمدة
 * التمساح أسفل الرأس (`upperGrowing`/`lowerGrowing` ⇐ أخضر عند النمو)، فيُقرأ الرقم
 * ولونُه مع الأعمدة كوحدة واحدة لا كإشارتين متنافستين.
 *
 * يقارن آخر قيمة صالحة بالتي قبلها لا بالخانة السابقة مباشرةً — فجوة null بينهما
 * (بداية السلسلة أو شمعة ناقصة) لا تُسقط المقارنة.
 */
export function paneValueTrend(
  values: readonly (number | null | undefined)[],
  upTo?: number | null
): 'up' | 'down' | 'flat' | null {
  // حدّ أعلى اختياري = شمعة التقاطع: يتبع اللون الشمعة المقروءة لا آخر السلسلة.
  const end =
    upTo != null && Number.isInteger(upTo) && upTo >= 0 && upTo < values.length
      ? upTo
      : values.length - 1;
  let last: number | null = null;
  for (let i = end; i >= 0; i--) {
    const v = values[i];
    if (typeof v !== 'number' || !Number.isFinite(v)) continue;
    if (last == null) {
      last = v;
      continue;
    }
    return v < last ? 'up' : v > last ? 'down' : 'flat';
  }
  return null;
}
