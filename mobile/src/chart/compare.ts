import type { Candle } from '../api';
import { candleTimeSec } from './dataSource';
import { barTime } from './drawingAnchors';
import type { SyntheticBar } from './types';

/** لون خطّ المقارنة وشارته — برتقالي TradingView. كان `colors.infoAccent` وهو لون SMA 50 نفسه (من الطبقات
 *  الافتراضية) ⇒ خطّان بنفسجيان لا يُعرف أيّهما GBPUSD. */
export const COMPARE_COLOR = '#FF9800';

export type CompareOverlay = {
  /** سعر المقارنة مُعاد القياس لمقياس الرمز الأساسي، شمعة بشمعة مع `primary`؛ null = لا شمعة مطابقة. */
  prices: (number | null)[];
  /** إغلاق رمز المقارنة الخام عند كل شمعة أساسية (لقراءة التقاطع). */
  closes: (number | null)[];
};

/**
 * يطابق شموع المقارنة مع النافذة الأساسية **بالزمن** لا بالموضع: كان `slice(-n)` يأخذ آخر n شمعة للمقارنة
 * دائماً، فبعد الرجوع 200 شمعة (أو بالإعادة) يُرسم GBPUSD اليوم فوق EURUSD الأسبوع الماضي — والمستقبل مكشوف
 * بالإعادة؛ وسلسلة مقارنة أقصر من النافذة تُرسم فوق يسارها لا فوق شموعها. لكل شمعة أساسية: آخر شمعة مقارنة
 * بزمن ≤ زمنها وضمن `stepSec` منه (فجوة أطول ⇒ null لا خطّ ممدود من بيانات قديمة). الأساس = أوّل زوج مطابق،
 * فيبدأ الخطّان من النقطة نفسها كما سبق.
 *
 * لبنات Renko/Kagi/P&F زمنها اصطناعي (أوّل شمعة + 60ث لكل لبنة): المطابقة بزمنها الحقيقي (`barTime` ⇐
 * `srcTime`) — كان خطّ المقارنة وإغلاقها بقراءة التقاطع يُطابَقان بأسعار بداية التاريخ أو يُتركان فارغين.
 */
export function compareOverlay(primary: readonly SyntheticBar[], compare: readonly Candle[], stepSec: number): CompareOverlay {
  const closes: (number | null)[] = new Array(primary.length).fill(null);
  const tol = stepSec > 0 ? stepSec : Infinity;
  let j = 0;
  for (let i = 0; i < primary.length; i++) {
    const t = candleTimeSec(barTime(primary[i]!));
    while (j + 1 < compare.length && candleTimeSec(compare[j + 1]!.time) <= t) j++;
    const c = compare[j];
    if (!c) continue;
    const ct = candleTimeSec(c.time);
    if (ct <= t && t - ct < tol && Number.isFinite(c.close) && c.close > 0) closes[i] = c.close;
  }
  return { prices: rebaseCompare(primary, closes, 0), closes };
}

/**
 * يعيد قياس إغلاقات المقارنة على مقياس الرمز الأساسي من أوّل زوج مطابق عند/بعد `from` — أوّل شمعة **ظاهرة**
 * كـTradingView (كان الأساس `plot[0]` خلف الحافة اليسرى، فبعد السحب يبدأ الخطّان متباعدين على الشاشة ولا
 * يُقرأ الأداء النسبي من طرف الرؤية). بلا مطابق بعد `from` ⇒ أوّل مطابق كلّياً.
 */
export function rebaseCompare(
  primary: readonly SyntheticBar[],
  closes: readonly (number | null)[],
  from: number
): (number | null)[] {
  const base = compareBaseIndex(closes, from);
  const pBase = base >= 0 ? primary[base]?.close ?? NaN : NaN;
  const cBase = base >= 0 ? closes[base]! : NaN;
  return base >= 0 && Number.isFinite(pBase) && pBase > 0
    ? closes.map((v) => (v == null ? null : pBase * (v / cBase)))
    : closes.map(() => null);
}

/** فهرس أساس المقارنة: أوّل إغلاق مطابق عند/بعد `from`، وإلا أوّل مطابق كلّياً؛ −1 = لا شيء. */
export function compareBaseIndex(closes: readonly (number | null)[], from: number): number {
  const start = Math.max(0, Math.min(Math.floor(from) || 0, closes.length - 1));
  for (let i = start; i < closes.length; i++) if (closes[i] != null) return i;
  return closes.findIndex((v) => v != null);
}

/**
 * نصّ شارة المقارنة بالمفتاح كـTradingView: إغلاق الرمز **الخام** عند الشمعة (لا المُعاد قياسه على مقياس الأساسي،
 * فذاك رقم لا معنى له) ونسبة تغيّره منذ الأساس (أوّل شمعة ظاهرة) — الخطّ الأزرق بلا اسم كان لا يُعرف رمزه إلا
 * بالتقاطع. `null` = لا إغلاق مطابق عند الشمعة.
 */
export function compareLegendParts(
  closes: readonly (number | null)[],
  at: number,
  base: number
): { close: number; pct: number | null } | null {
  const c = closes[at];
  if (c == null || !Number.isFinite(c)) return null;
  const b = base >= 0 ? closes[base] : null;
  return { close: c, pct: b != null && b > 0 ? (c / b - 1) * 100 : null };
}
