/**
 * حجم وسطور OHLC التقاطع بالوضع المدمج (خلية الرباعية، الإطارات الصغيرة).
 *
 * كان ثابتاً 9px بعتبات عرض مكتوبة باليد (240/270/360px) — أصغر من علامات المحور (11، DESIGN-PRO §2)
 * وهو الرقم الذي يقرأ به المتداول الشمعة تحت إصبعه. هنا: أكبر خطّ ≤11 يتّسع فيه النصّ فعلاً، بقياس
 * النصوص نفسها (`propTextWidth`) لا عتبات: سطر واحد بـ11 متى اتّسع (مع التغيّر ثم المدى إن اتّسعا)،
 * وإلا سطران (O H / L C). الخطّ **11 دائماً** (QA84a، §7: «لا تصغّر الخطّ» — كان ينزل 10 ثم 9): ما لا
 * يتّسع يُسقَط حقلاً حقلاً — المدى ثم التغيّر ثم O/H/L، ويبقى الإغلاق (الرقم تحت الإصبع) سطراً واحداً.
 * الأرقام `tabular-nums` فالطول وحده يحدّد الخطة ⇒ لا تقفز أثناء السحب على الزوج نفسه.
 */
import { propTextWidth } from './textWidth';

/** `paddingHorizontal: 4` × 2. */
export const DENSE_OHLC_PAD_W = 8;
/** DESIGN-PRO §2: أصغر خطّ بالواجهة. */
export const DENSE_OHLC_FONT = 11;
const SEP = '  ';

export interface DenseOhlcPlan {
  fontSize: number;
  lineH: number;
  /** سطر واحد (O H L C) أم سطران (O H / L C). */
  wide: boolean;
  /** لا O/H/L: الإغلاق وحده (وتغيّره إن اتّسع) — لوح أضيق من «L 1.08501  C 1.08532». */
  closeOnly: boolean;
  /** أسطر الكتلة (1 أو 2) — المفتاح تحتها يُزاح بـ`lines × lineH`. */
  lines: 1 | 2;
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
  /** «C 1.08532» — سطر الإغلاق وحده (الملاذ الأخير). */
  closeLine: string
): DenseOhlcPlan {
  const avail = Math.max(0, plotW - DENSE_OHLC_PAD_W);
  const fits = (t: string) => propTextWidth(t, DENSE_OHLC_FONT) <= avail;
  const make = (
    wide: boolean,
    showPct: boolean,
    showRange: boolean,
    closeOnly = false
  ): DenseOhlcPlan => ({
    fontSize: DENSE_OHLC_FONT,
    lineH: denseLineH(DENSE_OHLC_FONT),
    wide,
    closeOnly,
    lines: wide || closeOnly ? 1 : 2,
    showPct,
    showRange,
  });
  const full = line1 + SEP + line2;
  const withPct = pct ? full + SEP + pct : null;
  if (withPct && range && fits(withPct + SEP + range)) return make(true, true, true);
  if (withPct && fits(withPct)) return make(true, true, false);
  if (fits(full)) return make(true, false, false);
  if (fits(line1) && pct && fits(line2 + SEP + pct)) return make(false, true, false);
  if (fits(line1) && fits(line2)) return make(false, false, false);
  // أضيق من سطري O H / L C بـ11px ⇒ الإغلاق وحده بدل تصغير الخطّ.
  if (pct && fits(closeLine + SEP + pct)) return make(false, true, false, true);
  return make(false, false, false, true);
}
