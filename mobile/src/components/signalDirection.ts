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

/** `levels_basis` من `/api/signals/*` (backend-r1): حين `levels: null` يقول الخادم لماذا. */
export type LevelsBasis = { unavailable?: string | null } | null | undefined;

/** سبب غياب الدخول/الوقف/الهدف بلغة الواجهة؛ `null` إن لم يُرسل سبب معروف. */
export function levelsUnavailableText(basis: LevelsBasis, t: Dict): string | null {
  switch (basis?.unavailable) {
    case 'no_live_price':
      return t.sigLevelsUnavailableNoPrice;
    case 'not_enough_candles':
      return t.sigLevelsUnavailableFewCandles;
    case 'neutral':
      return t.sigLevelsUnavailableNeutral;
    default:
      return null;
  }
}
