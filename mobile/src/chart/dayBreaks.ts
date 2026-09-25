/**
 * فواصل أيام التداول على الفريمات داخل اليوم (كـ«Session breaks» بـTradingView) — دالة خالصة.
 *
 * على شارت 15m أو 1H لا شيء يقول أين بدأ اليوم: قمّة «أمس» وقاع «اليوم» يُقرآن بعدّ الشموع
 * أو بالتقاطع شمعةً شمعة. الآن خطّ عمودي خافت بين آخر شمعة من يوم وأوّل شمعة من التالي، بحدّ
 * يوم الفوركس الحقيقي (17:00 نيويورك، `tradingDayStartSec`) لا منتصف ليل الهاتف — فعطلة
 * الأسبوع فاصل واحد لا فجوة بلا علامة.
 *
 * يُرجع فهارس الشموع التي **تبدأ** يوماً جديداً (دائماً > 0). فارغة حين لا معنى للفواصل:
 * فريم يومي فأكبر، أو فواصل أقرب من `minGapPx` (4H مصغَّراً: خطوط كل بضعة بكسلات تصير ضجيجاً).
 * الشمعة ليوم معظم ساعاتها (`barTradingDaySec`): على 4H صيفاً الفاصل قبل شمعة 20:00 UTC لا بعدها.
 */
import { barTradingDaySec } from './marketHours';

export function planDayBreaks(
  timesSec: readonly number[],
  stepSec: number,
  symbol: string,
  plotW: number,
  minGapPx = 14
): number[] {
  const n = timesSec.length;
  if (n < 2 || !(stepSec > 0) || stepSec >= 86400 || !(plotW > 0)) return [];
  const barsPerDay = 86400 / stepSec;
  if ((plotW / n) * barsPerDay < minGapPx) return [];
  const out: number[] = [];
  let prev = Number.isFinite(timesSec[0]!) ? barTradingDaySec(symbol, timesSec[0]!, stepSec) : NaN;
  for (let i = 1; i < n; i++) {
    const t = timesSec[i]!;
    if (!Number.isFinite(t)) continue;
    const day = barTradingDaySec(symbol, t, stepSec);
    if (Number.isFinite(prev) && day > prev) out.push(i);
    prev = day;
  }
  return out;
}
