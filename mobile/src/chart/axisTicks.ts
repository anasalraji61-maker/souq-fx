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
