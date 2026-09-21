import AsyncStorage from '@react-native-async-storage/async-storage';

export type TerminalLayout = {
  id: string;
  name: string;
  dxyTf: string;
  frameSymbols: [string, string, string];
  frameTfs: [string, string, string];
  frameSizes: ['small' | 'medium' | 'large', 'small' | 'medium' | 'large', 'small' | 'medium' | 'large'];
};

const KEY = 'matrix.layouts.v1';

/** رمز حالة ثابت لا نص معروض — الترجمة بطبقة العرض عبر `t[code]` (نفس المبدأ الموثَّق
 *  بـchart/dataSource.ts: لا تقارن الواجهة نصاً حرفياً). أسماء الرموز مطابقة لمفاتيح
 *  Dict بـi18n/locales.ts. */
export type LayoutsSaveErrorCode = 'layoutSaveFailed' | 'layoutDeleteFailed';

/** إشارة فشل حفظ/حذف التخطيط — نفس نمط subscribeWatchlistSaveError بـwatchlistStoreCore.ts */
type ErrorListener = (code: LayoutsSaveErrorCode | null) => void;
let saveError: LayoutsSaveErrorCode | null = null;
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

function setSaveError(code: LayoutsSaveErrorCode | null) {
  saveError = code;
  notifyError();
}

export function subscribeLayoutsSaveError(cb: ErrorListener): () => void {
  errorListeners.add(cb);
  cb(saveError);
  return () => {
    errorListeners.delete(cb);
  };
}

export function getLayoutsSaveError(): LayoutsSaveErrorCode | null {
  return saveError;
}

export async function loadLayouts(): Promise<TerminalLayout[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TerminalLayout[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveLayout(layout: TerminalLayout): Promise<void> {
  try {
    const all = await loadLayouts();
    const idx = all.findIndex((l) => l.id === layout.id);
    if (idx >= 0) all[idx] = layout;
    else all.unshift(layout);
    await AsyncStorage.setItem(KEY, JSON.stringify(all.slice(0, 12)));
    setSaveError(null);
  } catch {
    setSaveError('layoutSaveFailed');
  }
}

export async function deleteLayout(id: string): Promise<void> {
  try {
    const all = (await loadLayouts()).filter((l) => l.id !== id);
    await AsyncStorage.setItem(KEY, JSON.stringify(all));
    setSaveError(null);
  } catch {
    setSaveError('layoutDeleteFailed');
  }
}

export const DEFAULT_LAYOUT: TerminalLayout = {
  id: 'default',
  name: 'افتراضي',
  dxyTf: '15m',
  frameSymbols: ['EURUSD', 'GBPUSD', 'XAUUSD'],
  frameTfs: ['15m', '1H', '4H'],
  frameSizes: ['small', 'medium', 'large'],
};
