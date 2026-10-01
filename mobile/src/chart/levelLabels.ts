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

/** خطّ أقرب من هذا لأعلى اللوح ⇒ وسمه يُقلب تحته (`levelLabelBelow`) — `LEVEL_LABEL_H` بالشارت. */
export const LEVEL_LABEL_FLIP_Y = 14;

/**
 * موضع **الوسم** لا الخطّ، لتنقية التباعد: الوسم فوق خطّه (‎y−12..y+2‎) إلا قرب أعلى اللوح فتحته (‎y+3..y+17‎).
 * كانت التنقية بموضع الخطّ ⇒ خطّان عند y=4 وy=20 (متباعدان 16px) يمرّان، ووسماهما عند 7 و8 فوق بعضهما
 * تماماً — والسعران لا يُقرآن. الإزاحة 15 = الفرق بين الوضعين.
 */
export function levelLabelKey(y: number): number {
  return y < LEVEL_LABEL_FLIP_Y ? y + 15 : y;
}

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

/**
 * عرض حارة الوسوم على الحافّة اليسرى (`left: 4`) بالبكسل — يتّسع لأعرض وسومها («61.8% 2650.35»
 * بخطّ 10 عريض ≈ 95px) مع هامش.
 */
export const LEFT_LABEL_LANE_W = 120;

/**
 * هل يقع وسمٌ يبدأ عند `labelLeft` (بكسل من يسار اللوح) داخل حارة الحافّة اليسرى؟ وسوم الارتكاز
 * تبدأ عند بداية الجلسة الجارية (وسط اللوح غالباً داخل اليوم)، فتنقيتها رأسياً مع وسوم الخطّ الأفقي
 * وفيبو على الحافّة كانت تُسقط سعر R1 لأن خطّ دعم على ارتفاعه **بعيدٌ أفقياً** 300px. غير محدود ⇒
 * يُعامل كالحافّة (التنقية المحافظة أسلم من وسمين متراكبين).
 */
export function inLeftLabelLane(labelLeft: number, laneW: number = LEFT_LABEL_LANE_W): boolean {
  if (!Number.isFinite(labelLeft)) return true;
  return labelLeft < laneW;
}

/** عرض وسم خطّ بخطّ 11 عريض وحشوة 3+3 — تقدير بالزيادة (0.6em للحرف كـ`axisTagFont`). */
export function levelLabelWidth(text: string, fontSize = 11): number {
  return Math.ceil([...text].length * fontSize * 0.6) + 8;
}

export interface RayLabelFit {
  /** يُطبع البُعد بالـpip بعد السعر؟ لا ⇒ السعر وحده (يُختصر بدل «1.32589 · +12.3 pi…»). */
  showDist: boolean;
  /** الوسم يسار بداية الشعاع (محاذى يميناً) لا داخله. */
  flip: boolean;
  /** عرض صندوق الوسم المقلوب بالبكسل. */
  width: number;
}

/**
 * أين يُطبع وسم الخطّ الأفقي/الشعاع وبأيّ طول (W8، أنس): خلية رباعي ضيّقة كانت تقصّ
 * «1.32589 · +12.3 pip» إلى «…pi» لأن الوسم داخل عرض الشعاع (والقلب بعرض ثابت 150).
 * الترتيب: كاملاً داخل الشعاع ⇒ كاملاً مقلوباً يساره ⇒ السعر وحده بالجهة الأوسع. السعر لا يُحذف أبداً.
 * - `rayX`: بداية الشعاع (بكسل)، `null` للخطّ الأفقي الكامل (يبدأ الوسم عند 4).
 */
export function fitRayLabel(
  priceText: string,
  distText: string | null,
  rayX: number | null,
  plotW: number,
  fontSize = 11
): RayLabelFit {
  const full = distText ? `${priceText} · ${distText}` : priceText;
  const wFull = levelLabelWidth(full, fontSize);
  const wPrice = levelLabelWidth(priceText, fontSize);
  if (rayX == null || !Number.isFinite(rayX)) {
    return { showDist: !!distText && wFull <= plotW - 4, flip: false, width: wFull };
  }
  const inside = plotW - rayX - 10; // `hRayLabel` يبدأ بعد مقبض البداية (left: 10)
  const left = rayX - 8;
  if (distText && wFull <= inside) return { showDist: true, flip: false, width: wFull };
  if (distText && wFull <= left) return { showDist: true, flip: true, width: wFull };
  if (wPrice <= inside) return { showDist: false, flip: false, width: wPrice };
  // لا يتّسع داخل الشعاع: يساره إن كان أوسع (وإلا يبقى داخله كما كان — أفضل من لا شيء).
  return { showDist: false, flip: left > inside, width: wPrice };
}
