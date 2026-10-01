import { colors } from '../theme';
import type { Dict } from '../i18n/locales';

/**
 * اتجاه الإشارة ولونه — كانا منسوخين حرفياً بثلاث لوحات (المحلّلون، المجتمع، توقّع المؤشرات).
 */
export function dirColor(d: string) {
  if (d === 'buy') return colors.bull;
  if (d === 'sell') return colors.bear;
  return colors.textMuted;
}

export function dirLabel(d: string, t: Dict) {
  if (d === 'buy') return t.dirBuy;
  if (d === 'sell') return t.dirSell;
  return t.dirNeutral;
}

/**
 * متوسط الدرجات كان `avg >= 0 ? '+' : ''` + `toFixed(2)`: الصفر يُكتب «+0.00» (إجماع محايد يُقرأ
 * ميلاً للشراء)، وسالب صغير يُقرَّب «-0.00»، وحقل غائب من الخادم يرمي عند `toFixed` فيسقط اللوح.
 * الآن بقاعدة النسبة نفسها: الصفر المطبوع بلا علامة، وناقص طباعي، وشَرطة لما ليس رقماً.
 */
export function formatScore(n: number | null | undefined): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '—';
  // تقريب متناظر حول الصفر كـ`round2` بـ`chart/dailyChange.ts`: `Math.round` يرفع النصف نحو +∞
  // فكان ‎−0.125‎ «−0.12» و‎+0.125‎ «+0.13»، و‎1.005‎ بالفاصلة العائمة «+1.00».
  const c = Math.round(Math.abs(n) * 100 * 1e6) / 1e6;
  const r = (n < 0 ? -1 : 1) * (Math.round(c) / 100);
  if (r === 0) return '0.00';
  return `${r > 0 ? '+' : '−'}${Math.abs(r).toFixed(2)}`;
}

/** `levels_basis` من `/api/signals/*` (backend-r1): حين `levels: null` يقول الخادم لماذا. */
export type LevelsBasis = { unavailable?: string | null } | null | undefined;

/** سبب غياب الدخول/الوقف/الهدف بلغة الواجهة؛ `null` إن لم يُرسل سبب معروف. */
export function levelsUnavailableText(basis: LevelsBasis, t: Dict): string | null {
  switch (basis?.unavailable) {
    case 'no_live_price':
      return t.sigLevelsUnavailableNoPrice;
    case 'not_enough_candles':
      return t.sigLevelsUnavailableFewCandles;
    case 'atr_exceeds_price':
      return t.sigLevelsUnavailableAtrWide;
    case 'neutral':
      return t.sigLevelsUnavailableNeutral;
    // backend-r54: سلسلة كاملة بلا حركة (سوق مجمّد/مغلق) — كانت تُقرأ خطأً «شموع قليلة».
    case 'no_range':
      return t.sigLevelsUnavailableNoRange;
    // launch150/QA88a: المدى دون نصف تسعيرة ⇒ الوقف يُقرَّب على الدخول (`signal_hub.py:92`).
    case 'atr_below_tick':
      return t.sigLevelsUnavailableAtrBelowTick;
    default:
      return null;
  }
}
