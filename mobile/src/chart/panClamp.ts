/**
 * حدّ الإزاحة الأفقية بالبكسل (`xPan`) أثناء السحب: عند طرفَي التاريخ تتوقّف إزاحة الشموع (`offset` 0 أو
 * «أقدم − 10») فيأخذ `xPan` حركة الإصبع كلّها بلا سقف — سحبة 300px يساراً عند الشمعة الحيّة تُخرج الشموع كلّها
 * من اللوح: شارت فارغ، محور زمن بلا علامات، ولا «»» يعيده (يظهر بـ`offset > 0` فقط). كـTradingView تبقى شموعٌ
 * مرئية دائماً: مركز آخر شمعة لا يعبر يسار `edge` من العرض، ومركز أولها لا يعبر يمين `1 − edge`.
 * `xOf(i) = ((i + 0.5) / n) × W + xPan`.
 */
export const PAN_KEEP_EDGE_FRAC = 0.2;

/**
 * `drawn`: الخانات المرسومة فعلاً من اليسار (افتراضياً `n`). بالإعادة اللوح `n` خانة والمكشوف أوّلها فقط —
 * الحدّ من آخر **خانة** كان يسمح بسحب شمعة الإعادة (وحدها عند حدّ القطع) خارج اللوح يساراً: لوح فارغ.
 */
export function clampXPan(
  xPan: number,
  n: number,
  plotW: number,
  edge = PAN_KEEP_EDGE_FRAC,
  drawn = n
): number {
  if (!Number.isFinite(xPan) || !(plotW > 0) || !(n > 0)) return Number.isFinite(xPan) ? xPan : 0;
  const last = Math.min(n, Math.max(1, Math.floor(drawn) || n)) - 1;
  const min = edge * plotW - ((last + 0.5) / n) * plotW;
  const max = (1 - edge) * plotW - (0.5 / n) * plotW;
  return Math.min(max, Math.max(min, xPan));
}

/**
 * شارت مُمرَّر للخلف (`offset > 0`) يبقى فيه الهامش الأيمن (`xPan` سالب) فارغاً: آخر ~10% من اللوح
 * (8 خانات من 80) تبدو «منطقة مستقبل» بينما شموعها الحقيقية موجودة — لمسة هناك تعطي تقاطعاً بلا OHLC
 * وزمناً مُسقَطاً لا زمن الشمعة الفعلية. الخانات الكاملة الفارغة تُطوى في الإزاحة: `offset − k` و`xPan + k·barW`
 * يرسمان الشموع نفسها بالمواضع نفسها (`xOf(i) = ((i + 0.5) / n) × W + xPan`) والفراغ يمتلئ بالشموع الأحدث.
 * يبقى فراغ حقيقي فقط حين تبلغ الإزاحة الصفر (الشمعة الحيّة ظاهرة). يُشترط أن تبقى النافذة ممتلئة
 * (`len − offset ≥ window`) وإلا تغيّر عدد الخانات وعرضها.
 */
export function foldRightGap(
  offset: number,
  xPan: number,
  barW: number,
  len: number,
  window: number
): { offset: number; xPan: number } {
  if (!(offset > 0) || !(xPan < 0) || !(barW > 0) || len - offset < window) return { offset, xPan };
  const k = Math.min(offset, Math.floor(-xPan / barW + 1e-6));
  if (k <= 0) return { offset, xPan };
  return { offset: offset - k, xPan: xPan + k * barW };
}
