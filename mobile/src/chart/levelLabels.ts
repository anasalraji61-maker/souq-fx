/**
 * تنقية وسوم المستويات الأفقية: **لا وسمين متلاصقين رأسياً**، والإسقاط بترتيب أهمية
 * يحدّده المستدعي لا بترتيب المصفوفة.
 *
 * نشأت عن `fibLabels.ts` ثم احتاجها الخطّ الأفقي (`hline`) بعدما صار يحمل سعره: ثلاثة
 * مستويات دعم متقاربة بهاتف تضع وسومها فوق بعضها، فتُقرأ الأسعار ككتلة واحدة — وهي
 * بالضبط اللحظة التي رسم فيها المتداول الخطوط ليقرأها.
 *
 * الترتيب بالأهمية لا بالموضع: وسمٌ أقلّ أهمية لا يزيح أهمّ منه لمجرّد أنه أعلى بالشاشة.
 */

/** أقلّ تباعد رأسي مقبول افتراضاً = علوّ سطر الوسم بأنماط الشارت. */
export const LEVEL_LABEL_GAP = 13;

/**
 * يبقي من `items` ما لا يقع أقرب من `minGap` بكسل من وسمٍ قُبِل قبله.
 *
 * - `yOf`: موضع العنصر بالبكسل. غير محدود (مقياس لم يُهيّأ) ⇒ يُسقَط، فلا وسم بموضع مختلَق.
 * - `rank`: الأصغر أهمّ. الفحص بالترتيب المعاد من `sort` مستقرّ: عناصر بنفس الرتبة تبقى
 *   بترتيبها الأصلي.
 * - التباعد **بالمطلق**، فمقياس مقلوب (y يكبر مع السعر) لا يعطّل الفحص.
 * - الناتج بترتيب `items` الأصلي لا بترتيب القبول، فترتيب عناصر React ثابت بين الإطارات.
 * - `taken`: مواضع وسوم أهمّ من مجموعة أخرى على الحافّة نفسها (خطّ المتداول قبل فيبو قبل
 *   الارتكاز) — لا يُقبل وسمٌ بقربها. غير المحدود منها يُتجاهل.
 */
export function thinByGap<T>(
  items: readonly T[],
  yOf: (item: T) => number,
  rank: (item: T) => number,
  minGap: number = LEVEL_LABEL_GAP,
  taken: readonly number[] = []
): T[] {
  const gap = Number.isFinite(minGap) && minGap > 0 ? minGap : LEVEL_LABEL_GAP;
  const withY: { item: T; y: number; at: number }[] = [];
  items.forEach((item, at) => {
    const y = yOf(item);
    if (!Number.isFinite(y)) return;
    withY.push({ item, y, at });
  });
  const blocked = taken.filter((t) => Number.isFinite(t));
  const kept: { item: T; y: number; at: number }[] = [];
  for (const c of [...withY].sort((a, b) => rank(a.item) - rank(b.item) || a.at - b.at)) {
    if (blocked.some((t) => Math.abs(t - c.y) < gap)) continue;
    if (kept.some((k) => Math.abs(k.y - c.y) < gap)) continue;
    kept.push(c);
  }
  return kept.sort((a, b) => a.at - b.at).map((k) => k.item);
}
