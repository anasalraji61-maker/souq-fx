/**
 * وسما أعلى قمّة وأدنى قاع **بالنافذة المرئيّة** (كـ«High and low price labels» بـTradingView) —
 * دالة خالصة بلا React.
 *
 * على الهاتف قراءة مدى الحركة الظاهرة كانت تعني سحب التقاطع إلى الذيل الأعلى ثم الأدنى وحفظ
 * الرقمين. الآن سعر القمّة فوق ذيلها وسعر القاع تحته، بخانات الزوج، يتحدّثان مع كل سحب/تكبير.
 *
 * - المرشَّحون الشموع التي **مركزها داخل عرض اللوح** فقط: `plot` قد يمتدّ خارج الشاشة مع
 *   الإزاحة الأفقية (`xPan`)، وقمّة لا يراها المتداول لا توسَم.
 * - التعادل ⇒ الأحدث (الأقرب لليمين) — القمّة المزدوجة يُقرأ سعرها عند آخر لمسة.
 * - الوسم يتّجه نحو داخل الشارت: بالنصف الأيمن يُكتب يسار الذيل، وإلا يمينه — فلا يُقصّ
 *   عند محور السعر ولا عند الحافّة اليسرى.
 * - `null` حين لا معنى للوسم: أقلّ من شمعتين، أو مدى صفر (سوق متوقّف)، أو اللوح أقصر من
 *   `minPlotH` (خلية رباعي صغيرة: الوسمان يغطّيان الشموع).
 */

export type HiLoBar = { high: number; low: number };

export type HiLoLabel = {
  index: number;
  price: number;
  /** الوسم يسار الذيل (true) أو يمينه. */
  leftSide: boolean;
};

export type HiLoPlan = { high: HiLoLabel; low: HiLoLabel } | null;

export function planHiLoLabels(
  plot: readonly HiLoBar[],
  xOf: (i: number) => number,
  plotW: number,
  plotH: number,
  minPlotH = 120
): HiLoPlan {
  if (plot.length < 2 || !(plotW > 0) || !(plotH >= minPlotH)) return null;
  let hi = -1;
  let lo = -1;
  let seen = 0;
  for (let i = 0; i < plot.length; i++) {
    const x = xOf(i);
    if (!(x >= 0 && x <= plotW)) continue;
    const b = plot[i]!;
    if (!Number.isFinite(b.high) || !Number.isFinite(b.low)) continue;
    seen++;
    if (hi < 0 || b.high >= plot[hi]!.high) hi = i;
    if (lo < 0 || b.low <= plot[lo]!.low) lo = i;
  }
  if (seen < 2 || hi < 0 || lo < 0) return null;
  if (!(plot[hi]!.high > plot[lo]!.low)) return null;
  const side = (i: number) => xOf(i) > plotW / 2;
  return {
    high: { index: hi, price: plot[hi]!.high, leftSide: side(hi) },
    low: { index: lo, price: plot[lo]!.low, leftSide: side(lo) },
  };
}
