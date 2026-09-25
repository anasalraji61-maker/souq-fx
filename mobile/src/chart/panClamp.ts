/**
 * حدّ الإزاحة الأفقية بالبكسل (`xPan`) أثناء السحب: عند طرفَي التاريخ تتوقّف إزاحة الشموع (`offset` 0 أو
 * «أقدم − 10») فيأخذ `xPan` حركة الإصبع كلّها بلا سقف — سحبة 300px يساراً عند الشمعة الحيّة تُخرج الشموع كلّها
 * من اللوح: شارت فارغ، محور زمن بلا علامات، ولا «»» يعيده (يظهر بـ`offset > 0` فقط). كـTradingView تبقى شموعٌ
 * مرئية دائماً: مركز آخر شمعة لا يعبر يسار `edge` من العرض، ومركز أولها لا يعبر يمين `1 − edge`.
 * `xOf(i) = ((i + 0.5) / n) × W + xPan`.
 */
export const PAN_KEEP_EDGE_FRAC = 0.2;

export function clampXPan(xPan: number, n: number, plotW: number, edge = PAN_KEEP_EDGE_FRAC): number {
  if (!Number.isFinite(xPan) || !(plotW > 0) || !(n > 0)) return Number.isFinite(xPan) ? xPan : 0;
  const min = edge * plotW - ((n - 0.5) / n) * plotW;
  const max = (1 - edge) * plotW - (0.5 / n) * plotW;
  return Math.min(max, Math.max(min, xPan));
}
