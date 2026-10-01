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
export function visibleBarRange(
  len: number,
  plotW: number,
  xPan: number,
  drawn: number = len
): { lo: number; hi: number } {
  // `drawn` < `len` = Bar Replay: اللوح مقسوم على خانات النافذة كلّها (`len`) والمكشوف أوّلها فقط —
  // الخانات بعده فارغة فلا تدخل المقياس.
  const n = Math.max(0, Math.min(len, drawn));
  const all = { lo: 0, hi: Math.max(0, n - 1) };
  if (len <= 0 || n <= 0 || !(plotW > 0) || !Number.isFinite(xPan)) return all;
  const step = plotW / len;
  // حافّتا الشمعة i: i·step + xPan و(i+1)·step + xPan ⇒ ظاهرة إن تقاطعتا مع (0, plotW)
  const lo = Math.max(0, Math.floor(-xPan / step));
  const hi = Math.min(n - 1, Math.ceil((plotW - xPan) / step) - 1);
  return hi - lo + 1 >= 2 ? { lo, hi } : all;
}

/**
 * أكبر قيمة (أو قيمة مطلقة، `abs`) للّوحة بين الشموع الظاهرة `vis` — مقياس لوحات الأعمدة كما تقيس
 * MACD/TSI بـ`macdPaneGeom`. كان ~40 لوحة (AO، Bull/Bear Power، ATR، BBW، HV…) تأخذ أقصى التاريخ المحمَّل
 * كلّه: قفزة خبر خارج الشاشة تُسطّح أعمدة المنطقة الهادئة المعروضة، والسحب لا يعيد المقياس كـTV.
 * بلا قيمة صالحة داخل `vis` ⇒ السلسلة كلّها. الأدنى 1e-9 (لا قسمة على صفر).
 */
export function visibleMax(
  values: readonly (number | null | undefined)[],
  vis?: { lo: number; hi: number },
  abs = false
): number {
  const scan = (lo: number, hi: number) => {
    let m = -Infinity;
    for (let i = Math.max(0, lo); i <= hi && i < values.length; i++) {
      const v = values[i];
      if (v == null || !Number.isFinite(v)) continue;
      const x = abs ? Math.abs(v) : v;
      if (x > m) m = x;
    }
    return m;
  };
  let m = vis ? scan(vis.lo, vis.hi) : -Infinity;
  if (m === -Infinity) m = scan(0, values.length - 1);
  return Math.max(m, 1e-9);
}

/**
 * القيم الصالحة بين الشموع الظاهرة `vis` (بلا قيمة صالحة فيها ⇒ السلسلة كلّها) — مقياس اللوحات ذات
 * الخطّين (Vortex، DMI، Klinger، SMI، TDI، WaveTrend، RWI) كـ`visibleMax` للأعمدة.
 */
export function visibleValues(
  values: readonly (number | null | undefined)[],
  vis?: { lo: number; hi: number }
): number[] {
  const pick = (lo: number, hi: number) => {
    const out: number[] = [];
    for (let i = Math.max(0, lo); i <= hi && i < values.length; i++) {
      const v = values[i];
      if (v != null && Number.isFinite(v)) out.push(v);
    }
    return out;
  };
  const seen = vis ? pick(vis.lo, vis.hi) : [];
  return seen.length ? seen : pick(0, values.length - 1);
}
