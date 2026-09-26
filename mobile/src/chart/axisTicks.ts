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
 * علامة واحدة لكل نصّ: من كل تتابع علامات يطبع النصّ نفسه تبقى الوسطى. احتياط النِّسَب المتساوية
 * (مدى أضيق من أصغر منزلة، بأقصى مطّ للمحور) كان يطبع «1.08521» ثلاث مرّات و«1.08520» أربعاً.
 */
export function dedupeTickLabels<T>(ticks: readonly T[], label: (t: T) => string): T[] {
  const out: T[] = [];
  let i = 0;
  while (i < ticks.length) {
    let j = i;
    const text = label(ticks[i]!);
    while (j + 1 < ticks.length && label(ticks[j + 1]!) === text) j++;
    out.push(ticks[Math.floor((i + j) / 2)]!);
    i = j + 1;
  }
  return out;
}

/**
 * أسعار علامات المحور بخطوات مستديرة (1/2/2.5/5 × 10^k) كما بـTradingView، لا نِسَب متساوية.
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
    for (const m of [1, 2, 2.5, 5]) {
      const step = m * Math.pow(10, exp);
      if (step < floorStep * (1 - 1e-9)) continue;
      // 2.5 تحتاج منزلة إضافية: تُقبل فقط إن بقيت مضاعفاً لأصغر منزلة معروضة (0.00025 على EURUSD نعم،
      // 0.000025 لا — كانت تُطبع 1.08003 لـ1.080025).
      if (m === 2.5 && floorStep > 0 && Math.abs(step / floorStep - Math.round(step / floorStep)) > 1e-6) continue;
      const k0 = Math.ceil(lo / step - 1e-9);
      const k1 = Math.floor(hi / step + 1e-9);
      if (k1 - k0 + 1 > cap) continue;
      const places = Math.max(0, -exp + (m === 2.5 ? 1 : 0));
      const out: number[] = [];
      for (let k = k0; k <= k1; k++) out.push(Number((k * step).toFixed(Math.min(20, places))));
      return out;
    }
  }
  return [];
}

/**
 * مانتيسات علامات المقياس اللوغاريتمي بدرجات استدارة: الأعلى استدارةً يُوضع أولاً، والأدقّ يملأ الفراغ بعده.
 */
const LOG_LADDERS: readonly (readonly number[])[] = [
  [1],
  [2, 5],
  [1.5, 2.5, 3, 4, 6, 8],
  [1.2, 1.4, 1.6, 1.8, 2.2, 3.5, 4.5, 7, 9],
];

/**
 * علامات السعر على المقياس **اللوغاريتمي**: `nicePriceTicks` تعطي أسعاراً متساوية الخطوة، وعلى محور لوغاريتمي
 * تتكدّس بأعلاه — الذهب الشهري 250..4000 كان 1000/2000/3000/4000 عند ~50/75/90/100% من الارتفاع، ونصف
 * المحور السفلي بلا سعر. مدى أضيق من ضعفين ⇒ `nicePriceTicks` (اللوغاريتمي شبه خطّي هناك وخطواته أنظف).
 * مدى غير موجب ⇒ `nicePriceTicks` أيضاً.
 *
 * الأسعار من سلّم مانتيسات (`LOG_LADDERS`): الأكثر استدارة أولاً (100، ثم 200/500، ثم 150/300…، ثم 120/140…)،
 * وكل سعر يُقبل إن بعُد عن كل ما قُبل بـ70% من خانة (`(ln hi − ln lo) / maxCount`). كان كل موضع متساوٍ بالسجلّ
 * يُلتقط لأقرب مانتيسا من سلّم واحد خشن فتنطبق خانات متجاورة على السعر نفسه: USDJPY الشهري 75.5..161.9 كان
 * 80/100/150 فقط (نصف المحور بلا سعر) و1.05..2.4 «1.5، 2» — أقلّ من المحور الخطّي على المدى نفسه.
 */
export function niceLogPriceTicks(lo: number, hi: number, maxCount: number, minStep: number): number[] {
  if (!(lo > 0) || !Number.isFinite(hi) || hi / lo < 2) return nicePriceTicks(lo, hi, maxCount, minStep);
  const cap = Math.max(1, Math.floor(Number.isFinite(maxCount) ? maxCount : 1));
  const floorStep = Number.isFinite(minStep) && minStep > 0 ? minStep : 0;
  const places = floorStep > 0 ? Math.max(0, Math.round(-Math.log10(floorStep))) : 10;
  const minGap = (0.7 * (Math.log(hi) - Math.log(lo))) / cap;
  const k0 = Math.floor(Math.log10(lo)) - 1;
  const k1 = Math.ceil(Math.log10(hi));
  const kept: number[] = [];
  // داخل كل درجة: الأبعد (بالسجلّ) عمّا قُبل أولاً. كان التصاعد من أصغر قوة عشرة يملأ الحدّ بالأسعار الدنيا:
  // BTC ‏100..70000 ⇒ 100…10000 وأعلى 30% من المحور (حيث السعر الحالي) بلا وسم.
  // درجة تتّسع لأقلّ من عقد واحد لكل عقد كامل تُترك إن كان المحور مقروءاً أصلاً (3 أسعار فأكثر): 1..1000 بخمس
  // خانات كان «1 3 10 100 1000» — 3 وحدها بالعقد الأوّل تبدو خطأً لا تدرّجاً؛ الآن «1 10 100 1000».
  const decades = Math.floor(Math.log10(hi / lo) + 1e-9);
  const pick = (cand: readonly number[], into: number[], limit: number) => {
    while (into.length < limit) {
      let best = -1;
      let bestD = -1;
      for (const v of cand) {
        const lv = Math.log(v);
        let d = Infinity;
        for (const x of into) d = Math.min(d, Math.abs(Math.log(x) - lv));
        if (d >= minGap && d > bestD) {
          bestD = d;
          best = v;
        }
      }
      if (best < 0) break;
      into.push(best);
    }
  };
  for (const ladder of LOG_LADDERS) {
    const cand: number[] = [];
    for (let k = k0; k <= k1; k++) {
      for (const m of ladder) {
        const v = Number((m * Math.pow(10, k)).toFixed(Math.min(20, places)));
        if (v > 0 && v >= lo && v <= hi) cand.push(v);
      }
    }
    const slots = cap - kept.length;
    if (slots <= 0) break;
    if (kept.length >= 3 && slots < decades) {
      const all = kept.slice();
      pick(cand, all, Infinity);
      if (all.length - kept.length > slots) continue;
    }
    pick(cand, kept, cap);
  }
  return kept.sort((x, y) => x - y);
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
  // مراكز تنازلية (محور السعر: العلامات من الأدنى للأعلى ⇒ y يتناقص): الخوارزمية تفترض التصاعد، فكانت
  // تُخفي كل الوسطى ثم الأولى — المحور يطبع سعراً واحداً (الأعلى) والشبكة بلا أرقام. تُعكس ثم تُعاد بفهارسها.
  const n0 = centers.length;
  if (n0 > 1 && centers[0]! > centers[n0 - 1]!) {
    const rev = layoutAscending([...centers].reverse(), size, gap, extent);
    return rev.map((b) => ({ ...b, i: n0 - 1 - b.i })).reverse();
  }
  return layoutAscending(centers, size, gap, extent);
}

function layoutAscending(
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
  // يوم تقديم الساعة (DST) 23 ساعة: علامتا منتصف ليل متتاليتان كانتا تُقرآن «أقلّ من يوم» فتُطبع الساعة على
  // كل تواريخ المحور ذلك الأسبوع. فاصل علامات دون اليوم ≤ 12 ساعة، فحدّ 23 ساعة لا يُسقط ساعة لازمة.
  return minGap < 86400 - 3600;
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
    // فاصل ليس مضاعفاً للخطوة يقع حدّه داخل شمعة: 4H بفاصل 6س ⇒ علامات 00:00/08:00/12:00/20:00 (تباعد 8/4/8/4
    // ساعات) حين يُقرَّب الشارت. مضاعفاتها وحدها (4H ⇒ 12س ثم اليوم؛ 2H ⇒ 12س) كـTradingView.
    if (s <= step || (step > 0 && s % step !== 0)) continue;
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

/**
 * مقياس النسبة المئوية (كـTradingView «Percent»): المحور يقرأ التغيّر عن إغلاق **أول شمعة ظاهرة** لا السعر،
 * فيُقارَن مدى الحركة بين الأزواج والفريمات بلا حساب. الهندسة خطّية كما هي (النسبة تحويل خطّي للسعر) — ما
 * يتغيّر العلامات ونصّها. الخطوات مستديرة **بالنسبة** (0.05%، 0.1%…) لا بالسعر، والمنازل من الخطوة نفسها
 * (منزلتان على الأقلّ: شارت 5د لليورو يتحرّك 0.02%). أساس غير موجب ⇒ [] (يعود المستدعي لعلامات السعر).
 */
export function percentScaleTicks(
  lo: number,
  hi: number,
  base: number,
  maxCount: number
): { price: number; label: string }[] {
  if (!Number.isFinite(base) || base <= 0) return [];
  const pLo = (lo / base - 1) * 100;
  const pHi = (hi / base - 1) * 100;
  const pcts = nicePriceTicks(pLo, pHi, maxCount, 0.001);
  if (pcts.length === 0) return [];
  const step = pcts.length > 1 ? pcts[1]! - pcts[0]! : 0.01;
  // المنازل تكفي الخطوة كاملةً: خطوة 0.025 (2.5 من `nicePriceTicks`) كانت بمنزلتين ⇒ خطّ +0.025% يُكتب «+0.03%».
  let places = Math.min(3, Math.max(2, Math.ceil(-Math.log10(step) - 1e-9)));
  while (places < 3 && Math.abs(step * 10 ** places - Math.round(step * 10 ** places)) > 1e-6) places++;
  return pcts.map((p) => ({ price: base * (1 + p / 100), label: formatScalePercent(p, places) }));
}

/** «+0.25%» / «−0.10%» / «0.00%» — علامة ناقص حقيقية كرأس الشارت (`formatPct`)، وصفر بلا إشارة. */
export function formatScalePercent(pct: number, places = 2): string {
  if (!Number.isFinite(pct)) return '—';
  // تصحيح خطأ التمثيل الثنائي كـ`formatPct` (رأس الشارت): 1.005 كان «+1.00%» هنا و«+1.01%» بالرأس.
  const k = 10 ** places;
  const r = (Math.sign(pct) * Math.round(Math.round(Math.abs(pct) * k * 1e6) / 1e6)) / k;
  if (r === 0) return `${(0).toFixed(places)}%`;
  return `${r > 0 ? '+' : '−'}${Math.abs(r).toFixed(places)}%`;
}
