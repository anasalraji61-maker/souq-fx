/**
 * كثافة علامات المحورين وتخطيطها — **من القياس الحقيقي للعلامة لا من عتبات مكتوبة**.
 *
 * المشكلة التي نشأت عنها الوحدة: علامات محور الزمن كانت ثلاثاً دون 320px وأربعاً فوقها،
 * وكلّ علامة تُقصّ داخل عرض الرسم (`Math.min(plotW - labelW, x - labelW/2)`). والقصّ
 * نفسه هو ما يصنع التصادم: العلامة الأولى مركزها ≈ 0 فتُدفَع إلى `[0, labelW]`، بينما
 * تالِيَتها عند `plotW/3`. فبأربع علامات عرضها 88px يلزم `plotW ≥ 4.5×88 + 3×6 = 414px`،
 * وعرض لوح الرسم بهاتف كبير (430px جهازاً) ≈ 338px — **فتتراكب الأولى والثانية ~19px**
 * ويصير التاريخ غير مقروء على أعرض الهواتف شيوعاً. ومثله دون 200px: ثلاث علامات عرضها
 * 56px بلوح 120px.
 *
 * ومحور السعر: سبع علامات ثابتة مهما قصر اللوح. وارتفاع اللوح ينكمش بفتح لوحات المؤشرات
 * (حدّه الأدنى 100px)، فتتباعد السبع 16.6px وعلوّ النصّ 14px ⇒ أرقام متلاصقة.
 */

/** علبة علامة بعد القصّ داخل المحور. */
export type AxisLabelBox = {
  /** موضع الفهرس بالقائمة الواردة. */
  i: number;
  /** بداية العلبة (يسار على محور الزمن، أعلى على محور السعر) بعد القصّ. */
  start: number;
  /** مخفيّة لتلامسها مع علامة مُبقاة. */
  hidden: boolean;
};

/**
 * أكبر عدد علامات يتّسع له محور طوله `extent` بعلامة مقاسها `size` وفجوة `gap`.
 *
 * الشرطان مشتقّان من القصّ لا مقدَّران: الطرفان مثبّتان على الحافتين (`[0, size]` و
 * `[extent - size, extent]`) فيلزم `extent ≥ 2·size + gap`؛ وأوّل علامة داخليّة مركزها
 * `extent/(n−1)` فيلزم `extent/(n−1) ≥ 1.5·size + gap` كي تُفلت من العلبة المثبّتة.
 * والشرط الثاني يشمل تباعد الداخليّات فيما بينها (`size + gap`) لأنه أوسع منه.
 */
export function axisTickCount(
  extent: number,
  size: number,
  gap: number,
  max: number
): number {
  const cap = Math.max(1, Math.floor(max));
  if (!Number.isFinite(extent) || !Number.isFinite(size) || size <= 0) return 1;
  const g = Number.isFinite(gap) ? Math.max(0, gap) : 0;
  if (extent < 2 * size + g) return 1;
  const step = 1.5 * size + g;
  // extent ≥ (n−1)·step  ⇒  n ≤ extent/step + 1
  const fit = Math.floor(extent / step) + 1;
  // `cap` آخر كلمة: سقف الاستدعاء لا يُتجاوَز ولو كان واحدة.
  return Math.min(cap, Math.max(2, Math.min(cap, fit)));
}

/** نِسَب موزَّعة بالتساوي على المحور لعدد `count` (`[0.5]` للعلامة الواحدة). */
export function axisTickRatios(count: number): number[] {
  const n = Math.max(1, Math.floor(count));
  if (n === 1) return [0.5];
  return Array.from({ length: n }, (_, i) => i / (n - 1));
}

/**
 * أسعار علامات المحور بخطوات مستديرة (1/2/5 × 10^k) كما بـTradingView، لا نِسَب متساوية.
 * النِّسَب الثابتة (0، ⅙، ⅓…) تقع على أسعار كيفيّة (1.08437) تتبدّل مع كل تيك يمدّ المدى، فلا
 * يقرأ المتداول مسافة 10 pip من المحور ولا يطابق خطّ الشبكة سعراً. الخطوة أصغر مستديرة
 * ≥ `minStep` (أصغر منزلة معروضة) لا تتجاوز علاماتها `maxCount` داخل `[lo, hi]`.
 * الأسعار مقرَّبة لمنازل الخطوة (بلا 1.0850000000001). مدى فارغ/غير صالح ⇒ `[]`.
 */
export function nicePriceTicks(lo: number, hi: number, maxCount: number, minStep: number): number[] {
  if (!Number.isFinite(lo) || !Number.isFinite(hi) || hi <= lo) return [];
  const cap = Math.max(1, Math.floor(Number.isFinite(maxCount) ? maxCount : 1));
  const floorStep = Number.isFinite(minStep) && minStep > 0 ? minStep : 0;
  const span = hi - lo;
  let exp = Math.floor(Math.log10(span / cap));
  for (let guard = 0; guard < 40; guard++, exp++) {
    for (const m of [1, 2, 5]) {
      const step = m * Math.pow(10, exp);
      if (step < floorStep * (1 - 1e-9)) continue;
      const k0 = Math.ceil(lo / step - 1e-9);
      const k1 = Math.floor(hi / step + 1e-9);
      if (k1 - k0 + 1 > cap) continue;
      const places = Math.max(0, -exp);
      const out: number[] = [];
      for (let k = k0; k <= k1; k++) out.push(Number((k * step).toFixed(Math.min(20, places))));
      return out;
    }
  }
  return [];
}

/**
 * يقصّ العلب داخل `[0, extent]` ثم يُخفي ما بقي متلامساً.
 *
 * `axisTickCount` تكفي حين تكون المراكز موزَّعة بالتساوي، لكن مراكز محور الزمن تأتي من
 * `xOf(index)` وفيها **إزاحة التمرير** (`viewXPan`): الإزاحة تنقل المراكز كلّها بمقدار
 * واحد فلا تمسّ التباعد بينها، لكنها تُقرِّب الطرف المقصوص من جاره بمقدارها. فهذه
 * الدالة شبكة الأمان النهائيّة، وهي المصدر الوحيد لمواضع الرسم فلا يتباعد المفحوص
 * عن المرسوم.
 *
 * الطرفان يُبقَيان: الأول أقدم شمعة مرئيّة والأخير أحدثها، والإسقاط من الوسط. وإن
 * تلامس الطرفان أنفسهما (محور أضيق من علبتين) يُخفى **الأول** — الأحدث أولى بالبقاء.
 */
export function layoutAxisLabels(
  centers: readonly number[],
  size: number,
  gap: number,
  extent: number
): AxisLabelBox[] {
  const n = centers.length;
  if (n === 0) return [];
  const g = Number.isFinite(gap) ? Math.max(0, gap) : 0;
  const s = Number.isFinite(size) && size > 0 ? size : 0;
  const ext = Number.isFinite(extent) ? extent : 0;
  const maxStart = Math.max(0, ext - s);
  const clamp = (c: number) =>
    Number.isFinite(c) ? Math.max(0, Math.min(maxStart, c - s / 2)) : 0;

  const out: AxisLabelBox[] = centers.map((c, i) => ({ i, start: clamp(c), hidden: false }));
  if (n === 1) return out;

  const last = n - 1;
  // الوسط: يُبقى ما يُفلت من آخر علامة مُبقاة
  let keptEnd = out[0].start + s;
  const keptMiddles: number[] = [];
  for (let i = 1; i < last; i++) {
    if (out[i].start < keptEnd + g) {
      out[i].hidden = true;
    } else {
      keptEnd = out[i].start + s;
      keptMiddles.push(i);
    }
  }
  // الأخير مضمون البقاء: تُسقَط الوسطى المُبقاة الأقرب إليه حتى يتّسع
  while (keptMiddles.length && out[last].start < keptEnd + g) {
    const drop = keptMiddles.pop() as number;
    out[drop].hidden = true;
    const prev = keptMiddles.length ? keptMiddles[keptMiddles.length - 1] : 0;
    keptEnd = out[prev].start + s;
  }
  if (out[last].start < out[0].start + s + g) out[0].hidden = true;
  return out;
}

/**
 * هل خرج موضعٌ عن مدى المحور المرئيّ، وإلى أيّ جهة؟
 *
 * وسوم السعر تُقصّ إلى الحافة فتبقى مقروءة، لكنها عندئذٍ **تكذب**: سعرٌ فوق أعلى
 * المدى (بعد تكبير المحور أو تحريكه) يظهر وسمه ملتصقاً بالسقف كأن السوق هناك، بينما
 * أعلى علامة تحته تقول رقماً آخر. والخطّ المتقطّع الذي كان سيدلّ على الموضع مقصوص
 * خارج اللوح فلا يُرى. فتُعلَّم الجهة بدل الإيهام.
 */
export function offAxisSide(pos: number, extent: number): 'above' | 'below' | null {
  if (!Number.isFinite(pos) || !Number.isFinite(extent)) return null;
  if (pos < 0) return 'above';
  if (pos > extent) return 'below';
  return null;
}

/** تلامس علبتين على المحور نفسه (تُستعمل للوسوم فوق العلامات). */
export function boxesTouch(
  aStart: number,
  aSize: number,
  bStart: number,
  bSize: number,
  gap: number
): boolean {
  if (!Number.isFinite(aStart) || !Number.isFinite(bStart)) return false;
  const g = Number.isFinite(gap) ? Math.max(0, gap) : 0;
  return aStart < bStart + bSize + g && bStart < aStart + aSize + g;
}

/**
 * هل تحمل علامات محور الزمن الساعة؟ كان القرار من زمن الساعة بين أوّل وآخر شمعة ظاهرة
 * (`≤ 2 يوم`): 80 شمعة ساعة تمتدّ ≥ 79 ساعة، و15m عبر العطلة (جمعة → اثنين) ≥ 48 ساعة
 * بشموع قليلة — فتُطبع تواريخ فقط، وعلامتان باليوم نفسه تقرآن «22 سبتمبر · 22 سبتمبر».
 * القرار الآن من **أصغر فجوة بين علامتين متجاورتين**: أقلّ من يوم ⇒ الساعة لازمة لتمييزهما.
 * علامة واحدة: من المدى كلّه (كما كان). الشموع اليومية فأكبر: بلا ساعة أبداً.
 */
export function axisShowsHours(
  tickTimes: number[],
  spanSeconds: number,
  dayCandles: boolean
): boolean {
  if (dayCandles) return false;
  const times = tickTimes.filter((t) => Number.isFinite(t));
  if (times.length < 2) return spanSeconds <= 2 * 86400;
  let minGap = Number.POSITIVE_INFINITY;
  for (let i = 1; i < times.length; i++) minGap = Math.min(minGap, Math.abs(times[i] - times[i - 1]));
  return minGap < 86400;
}

/** فواصل علامات محور الزمن المستديرة (ثوانٍ) دون الشهر؛ الشهر فما فوق بالتقويم (`MONTH_STEPS`). */
const TIME_STEPS = [60, 300, 900, 1800, 3600, 7200, 10800, 14400, 21600, 43200, 86400, 604800];
const MONTH_STEPS = [1, 3, 6, 12];

/**
 * فهارس علامات محور الزمن على **حدود مستديرة** (12:00، بداية اليوم، بداية الشهر) كما بـTradingView، لا
 * نِسَب متساوية من النافذة: النِّسَب تقع على أزمنة كيفيّة (13:45، 17:15) تتبدّل مع كل تمرير أو شمعة جديدة
 * فلا يُقرأ المحور. الفاصل أصغر مستدير > خطوة الفريم لا تتجاوز حدوده `maxCount`؛ العلامة أوّل شمعة بعد كل
 * حدّ (الشمعة التي تبدأ عنده أو تعبره — العطلة لا تُسقط حدّ الاثنين). `tzOffsetSec(t)` إزاحة التوقيت الذي
 * تُطبع به العلامة (المحلّي دون اليوم، 0 للشموع اليومية المطبوعة UTC) كي تقع الحدود على ساعات مستديرة
 * بالعرض نفسه.
 *
 * فاصلٌ يزيد عن `maxCount` يليه أخشن منه بأقلّ من حدّين (80 شمعة ساعة على هاتف بحدّ 3: أربعة أيام ثم
 * لا أسبوع كامل؛ اليومي: أربعة أشهر ثم ربع واحد؛ الشهري: سبع سنوات ولا أخشن من السنة) ⇒ تُرقَّق حدود
 * الفاصل الأدقّ بإيقاع تقويمي (كل يومين، كل شهرين، كل سنتين…) بدل التخلّي عنها: كان المستدعي يعود للنِّسَب
 * فتظهر «13:00» و«12 يونيو» بمواضع كيفيّة تقفز مع كل شمعة. الإيقاع من رقم الحدّ نفسه (اليوم/الشهر منذ
 * 1970) لا من ترتيبه بالنافذة، فلا تتبدّل العلامات المختارة مع التمرير. أقلّ من علامتين ⇒ `null`
 * (المستدعي يعود للنِّسَب).
 */
export function niceTimeTickIndexes(
  times: readonly number[],
  stepSec: number,
  maxCount: number,
  tzOffsetSec: (t: number) => number = () => 0
): number[] | null {
  const cap = Math.max(1, Math.floor(Number.isFinite(maxCount) ? maxCount : 1));
  if (times.length < 3 || cap < 2) return null;
  const local = times.map((t) => (Number.isFinite(t) ? t + tzOffsetSec(t) : Number.NaN));
  type Bounds = { idx: number[]; key: number[] };
  const boundaries = (bucket: (t: number) => number): Bounds => {
    const idx: number[] = [];
    const key: number[] = [];
    for (let i = 1; i < local.length; i++) {
      const a = local[i - 1]!;
      const b = local[i]!;
      if (!Number.isFinite(a) || !Number.isFinite(b)) continue;
      const kb = bucket(b);
      if (kb !== bucket(a)) {
        idx.push(i);
        key.push(kb);
      }
    }
    return { idx, key };
  };
  /** حدود فاصلٍ زادت عن الحدّ ⇒ كل n-ـه تقويمياً، أصغر n يلائم. */
  const thin = (b: Bounds): number[] | null => {
    for (let n = 2; n <= b.idx.length; n++) {
      const kept = b.idx.filter((_, k) => ((b.key[k]! % n) + n) % n === 0);
      if (kept.length <= cap) {
        if (kept.length >= 2) return kept;
        break;
      }
    }
    // لا إيقاع تقويمي يعطي علامتين ⇒ تباعد متساوٍ بترتيب الحدود (يبقى على حدود مستديرة)
    const every = Math.ceil(b.idx.length / cap);
    const kept = b.idx.filter((_, k) => k % every === 0);
    return kept.length >= 2 ? kept : null;
  };
  const buckets: ((t: number) => number)[] = [];
  const step = Number.isFinite(stepSec) && stepSec > 0 ? stepSec : 0;
  for (const s of TIME_STEPS) {
    if (s <= step) continue;
    // الأسبوع يبدأ الاثنين (1970-01-01 خميس ⇒ +3 أيام)
    const off = s === 604800 ? 3 * 86400 : 0;
    buckets.push((t) => Math.floor((t + off) / s));
  }
  for (const months of MONTH_STEPS) {
    buckets.push((t) => {
      const d = new Date(t * 1000);
      return Math.floor((d.getUTCFullYear() * 12 + d.getUTCMonth()) / months);
    });
  }
  let finer: Bounds | null = null;
  for (const bucket of buckets) {
    const b = boundaries(bucket);
    if (b.idx.length > cap) {
      finer = b;
      continue;
    }
    if (b.idx.length >= 2) return b.idx;
    return finer ? thin(finer) : null;
  }
  return finer ? thin(finer) : null;
}
