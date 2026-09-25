/**
 * قيمة شارة ZigZag بمفتاح الطبقات. انحراف 5% (الافتراضي الشائع) يعني على EURUSD حركة ~540 pip قبل أي انعطاف،
 * فشارت 15د أو 1س يعرض 180 شمعة بلا خطّ واحد ويبدو المؤشر معطّلاً. الشارة تقول الآن العتبة («5%»)، وحين لا
 * ساق إطلاقاً بالسلسلة المحمَّلة تقول كم تساوي بالسعر («5% ≈540.0 pip») — فيعرف المتداول أن المؤشر يعمل وأن
 * الفريم أصغر من العتبة، بدل أن يظنّه عطلاً.
 */
import { signedDistanceText } from './measureReadout';

export const ZIGZAG_DEVIATION_PCT = 5;

/** الخطوات التي تدور عليها شريحة الانحراف بشريط المؤشرات: 1% لفريمات داخل اليوم على الفوركس، 10% للكريبتو. */
export const ZIGZAG_DEVIATION_STEPS = [1, 2, 3, 5, 10] as const;

/** قيمة مخزَّنة غير معروفة ⇒ الافتراضي (لا قيمة حرّة: الشريحة لا تعرض إلا الخطوات). */
export function clampZigzagDeviation(v: unknown): number {
  const n = Number(v);
  return (ZIGZAG_DEVIATION_STEPS as readonly number[]).includes(n) ? n : ZIGZAG_DEVIATION_PCT;
}

/** الخطوة التالية بدوران: 5 ⇒ 10 ⇒ 1. */
export function nextZigzagDeviation(cur: number): number {
  const steps = ZIGZAG_DEVIATION_STEPS as readonly number[];
  const i = steps.indexOf(clampZigzagDeviation(cur));
  return steps[(i + 1) % steps.length]!;
}

export function zigzagLegendText(
  symbol: string,
  lastClose: number | null | undefined,
  hasLegs: boolean,
  lang?: string,
  deviationPct = ZIGZAG_DEVIATION_PCT
): string {
  const pct = `${deviationPct}%`;
  if (hasLegs || lastClose == null || !Number.isFinite(lastClose) || lastClose <= 0) return pct;
  const d = signedDistanceText(symbol, lastClose, lastClose * (1 + deviationPct / 100), lang, lastClose);
  return d ? `${pct} ≈${d.replace(/^[+−]/, '')}` : pct;
}
