/**
 * حجم وسطور OHLC التقاطع بالوضع المدمج (خلية الرباعية، الإطارات الصغيرة).
 *
 * كان ثابتاً 9px بعتبات عرض مكتوبة باليد (240/270/360px) — أصغر من علامات المحور (11، DESIGN-PRO §2)
 * وهو الرقم الذي يقرأ به المتداول الشمعة تحت إصبعه. هنا: أكبر خطّ ≤11 يتّسع فيه النصّ فعلاً، بقياس
 * النصوص نفسها (`propTextWidth`) لا عتبات: سطر واحد بـ11 متى اتّسع (مع التغيّر ثم المدى إن اتّسعا)،
 * وإلا سطران بأكبر حجم يتّسع (11 ثم 10 ثم 9)، والتغيّر يسقط قبل أن يُصغِّر الخطّ تحت 9.
 * الأرقام `tabular-nums` فالطول وحده يحدّد العرض ⇒ لا يقفز الحجم أثناء السحب على الزوج نفسه.
 */
import { propTextWidth } from './textWidth';

/** `paddingHorizontal: 4` × 2. */
export const DENSE_OHLC_PAD_W = 8;
const SEP = '  ';

export interface DenseOhlcPlan {
  fontSize: number;
  lineH: number;
  /** سطر واحد (O H L C) أم سطران (O H / L C). */
  wide: boolean;
  showPct: boolean;
  showRange: boolean;
}

export function denseLineH(fontSize: number): number {
  return Math.round(fontSize * 1.28);
}

export function planDenseOhlc(
  line1: string,
  line2: string,
  pct: string | null,
  range: string | null,
  plotW: number,
  max = 11,
  min = 9
): DenseOhlcPlan {
  const avail = Math.max(0, plotW - DENSE_OHLC_PAD_W);
  const fits = (t: string, f: number) => propTextWidth(t, f) <= avail;
  const make = (fontSize: number, wide: boolean, showPct: boolean, showRange: boolean): DenseOhlcPlan => ({
    fontSize,
    lineH: denseLineH(fontSize),
    wide,
    showPct,
    showRange,
  });
  const full = line1 + SEP + line2;
  const withPct = pct ? full + SEP + pct : null;
  if (withPct && range && fits(withPct + SEP + range, max)) return make(max, true, true, true);
  if (withPct && fits(withPct, max)) return make(max, true, true, false);
  if (fits(full, max)) return make(max, true, false, false);
  const second = pct ? line2 + SEP + pct : null;
  for (let f = max; f >= min; f--) {
    if (fits(line1, f) && second && fits(second, f)) return make(f, false, true, false);
    if (fits(line1, f) && fits(line2, f)) return make(f, false, false, false);
  }
  return make(min, false, false, false);
}
