/**
 * سيقان ZigZag للنافذة المعروضة. كانت تُرسم بين الانعطافات الواقعة داخل النافذة فقط ⇒ الساق الداخلة من يسار الشاشة
 * والخارجة من يمينها لا تظهر، فعلى ~80 شمعة وانحراف 5% يبدو المؤشر فارغاً أو خطّاً واحداً معلَّقاً. الآن يُضاف آخر
 * انعطاف قبل النافذة وأول انعطاف بعدها (أو الطرف الجاري غير المؤكَّد) وتُقصّ الساقان عند حافّتي النافذة.
 *
 * الفهارس محلية للنافذة (0 = أول شمعة معروضة)؛ الحافّتان -0.5 و`count - 0.5` (حدّا الخانتين الطرفيتين).
 */
export type ZigZagSeg = { x1: number; y1: number; x2: number; y2: number; tentative: boolean };

export function zigzagWindowSegments(
  pivots: readonly (number | null)[],
  tail: { i: number; v: number } | null,
  from: number,
  count: number
): ZigZagSeg[] {
  const pts: { i: number; v: number; tentative: boolean }[] = [];
  pivots.forEach((v, i) => {
    if (v != null) pts.push({ i: i - from, v, tentative: false });
  });
  if (tail) pts.push({ i: tail.i - from, v: tail.v, tentative: true });
  const lo = -0.5;
  const hi = count - 0.5;
  const out: ZigZagSeg[] = [];
  for (let k = 1; k < pts.length; k++) {
    const a = pts[k - 1];
    const b = pts[k];
    if (b.i <= lo || a.i >= hi || b.i === a.i) continue;
    const at = (x: number) => a.v + ((b.v - a.v) * (x - a.i)) / (b.i - a.i);
    const x1 = Math.max(a.i, lo);
    const x2 = Math.min(b.i, hi);
    out.push({ x1, y1: at(x1), x2, y2: at(x2), tentative: b.tentative });
  }
  return out;
}
