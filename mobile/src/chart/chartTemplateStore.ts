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

/** إشارة فشل حفظ/حذف القالب — نفس نمط subscribeWatchlistSaveError بـwatchlistStoreCore.ts */
type ErrorListener = (message: string | null) => void;
let saveError: string | null = null;
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

function setSaveError(msg: string | null) {
  saveError = msg;
  notifyError();
}

export function subscribeTemplatesSaveError(cb: ErrorListener): () => void {
  errorListeners.add(cb);
  cb(saveError);
  return () => {
    errorListeners.delete(cb);
  };
}

export function getTemplatesSaveError(): string | null {
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
    setSaveError('تعذر حفظ قالب الشارت');
  }
}

export async function deleteTemplate(id: string): Promise<void> {
  try {
    const all = (await loadTemplates()).filter((x) => x.id !== id);
    await AsyncStorage.setItem(KEY, JSON.stringify(all));
    setSaveError(null);
  } catch {
    setSaveError('تعذر حذف قالب الشارت');
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
