/**
 * قيمة شارة ZigZag بمفتاح الطبقات. انحراف 5% (الافتراضي الشائع) يعني على EURUSD حركة ~540 pip قبل أي انعطاف،
 * فشارت 15د أو 1س يعرض 180 شمعة بلا خطّ واحد ويبدو المؤشر معطّلاً. الشارة تقول الآن العتبة («5%»)، وحين لا
 * ساق إطلاقاً بالسلسلة المحمَّلة تقول كم تساوي بالسعر («5% ≈540.0 pip») — فيعرف المتداول أن المؤشر يعمل وأن
 * الفريم أصغر من العتبة، بدل أن يظنّه عطلاً.
 */
import { signedDistanceText } from './measureReadout';

export const ZIGZAG_DEVIATION_PCT = 5;

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
