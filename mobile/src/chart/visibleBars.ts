/**
 * الشموع الظاهرة فعلاً على اللوح — لمقياس السعر التلقائي.
 *
 * الشمعة i مرسومة بمركز `((i + 0.5) / len) * plotW + xPan` (`xOf` بـMatrixChart). بهامش اليمين الافتراضي
 * (`RIGHT_MARGIN_FRAC` = 10%) تنزاح السلسلة يساراً فتخرج أوّل ~8 شموع من 80 خلف الحافة، ومع ذلك كان المقياس
 * يحسب قممها وقيعانها ⇒ فراغ فوق الشموع أو تحتها لسعر لا يُرى (TradingView يقيس المرئي وحده).
 *
 * يُعيد فهرسين صحيحين [lo, hi] لكل شمعة يظهر منها جزء. الفهرسان يتغيّران بعبور شمعة كاملة فقط، فمقياس
 * `useMemo` لا يُعاد حسابه بكل بكسل سحب (والإزاحة `offset` تغيّر النافذة بالإيقاع نفسه أصلاً).
 * أقلّ من شمعتين ظاهرتين (سحب لأقصى الطرف) ⇒ السلسلة كلها، كي لا ينهار المقياس على شمعة واحدة.
 */
export function visibleBarRange(len: number, plotW: number, xPan: number): { lo: number; hi: number } {
  const all = { lo: 0, hi: Math.max(0, len - 1) };
  if (len <= 0 || !(plotW > 0) || !Number.isFinite(xPan)) return all;
  const step = plotW / len;
  // حافّتا الشمعة i: i·step + xPan و(i+1)·step + xPan ⇒ ظاهرة إن تقاطعتا مع (0, plotW)
  const lo = Math.max(0, Math.floor(-xPan / step));
  const hi = Math.min(len - 1, Math.ceil((plotW - xPan) / step) - 1);
  return hi - lo + 1 >= 2 ? { lo, hi } : all;
}
