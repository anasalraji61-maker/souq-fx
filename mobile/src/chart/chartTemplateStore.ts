import AsyncStorage from '@react-native-async-storage/async-storage';
import { createSaveErrorSignal } from './saveErrorSignal';
import type { ChartKind, IndicatorId, LensMode } from './types';

export type ChartTemplate = {
  id: string;
  name: string;
  kind: ChartKind;
  lens: LensMode;
  indicators: IndicatorId[];
  pineFormula: string;
  logScale: boolean;
  /** مقياس النسبة — اختياري: قوالب محفوظة قبله تُقرأ بلا نسبة. */
  percentScale?: boolean;
  magnet: boolean;
};

const KEY = 'matrix.chartTemplates.v1';

/** رمز حالة ثابت لا نص معروض — الترجمة بطبقة العرض عبر `t[code]` (نفس المبدأ الموثَّق
 *  بـchart/dataSource.ts: لا تقارن الواجهة نصاً حرفياً). أسماء الرموز مطابقة لمفاتيح
 *  Dict بـi18n/locales.ts. */
export type TemplatesSaveErrorCode = 'chartTemplateSaveFailed';

const saveError = createSaveErrorSignal<TemplatesSaveErrorCode>();
const setSaveError = saveError.set;

export const getTemplatesSaveError = saveError.get;

export async function loadTemplates(): Promise<ChartTemplate[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ChartTemplate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveTemplate(t: ChartTemplate): Promise<void> {
  try {
    const all = await loadTemplates();
    const idx = all.findIndex((x) => x.id === t.id);
    if (idx >= 0) all[idx] = t;
    else all.unshift(t);
    await AsyncStorage.setItem(KEY, JSON.stringify(all.slice(0, 20)));
    setSaveError(null);
  } catch {
    setSaveError('chartTemplateSaveFailed');
  }
}

export const DEFAULT_TEMPLATE: ChartTemplate = {
  id: 'default',
  name: 'افتراضي نظيف',
  kind: 'candles',
  lens: 'clean',
  indicators: [],
  pineFormula: 'sma(close,9)',
  logScale: false,
  magnet: true,
};
