import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ChartKind, IndicatorId, LensMode } from './types';

export type ChartTemplate = {
  id: string;
  name: string;
  kind: ChartKind;
  lens: LensMode;
  indicators: IndicatorId[];
  pineFormula: string;
  logScale: boolean;
  magnet: boolean;
};

const KEY = 'matrix.chartTemplates.v1';

/** رمز حالة ثابت لا نص معروض — الترجمة بطبقة العرض عبر `t[code]` (نفس المبدأ الموثَّق
 *  بـchart/dataSource.ts: لا تقارن الواجهة نصاً حرفياً). أسماء الرموز مطابقة لمفاتيح
 *  Dict بـi18n/locales.ts. */
export type TemplatesSaveErrorCode = 'chartTemplateSaveFailed' | 'chartTemplateDeleteFailed';

/** إشارة فشل حفظ/حذف القالب — نفس نمط subscribeWatchlistSaveError بـwatchlistStoreCore.ts */
type ErrorListener = (code: TemplatesSaveErrorCode | null) => void;
let saveError: TemplatesSaveErrorCode | null = null;
const errorListeners = new Set<ErrorListener>();

function notifyError() {
  for (const cb of errorListeners) {
    try {
      cb(saveError);
    } catch {
      /* ignore */
    }
  }
}

function setSaveError(code: TemplatesSaveErrorCode | null) {
  saveError = code;
  notifyError();
}

export function subscribeTemplatesSaveError(cb: ErrorListener): () => void {
  errorListeners.add(cb);
  cb(saveError);
  return () => {
    errorListeners.delete(cb);
  };
}

export function getTemplatesSaveError(): TemplatesSaveErrorCode | null {
  return saveError;
}

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

export async function deleteTemplate(id: string): Promise<void> {
  try {
    const all = (await loadTemplates()).filter((x) => x.id !== id);
    await AsyncStorage.setItem(KEY, JSON.stringify(all));
    setSaveError(null);
  } catch {
    setSaveError('chartTemplateDeleteFailed');
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
