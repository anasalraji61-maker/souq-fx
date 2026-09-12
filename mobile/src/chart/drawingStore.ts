import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Drawing } from './types';

const PREFIX = 'matrix.drawings.v1';

/** إشارة فشل حفظ/حذف الرسومات — نفس نمط subscribeWatchlistSaveError بـwatchlistStoreCore.ts */
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

export function subscribeDrawingsSaveError(cb: ErrorListener): () => void {
  errorListeners.add(cb);
  cb(saveError);
  return () => {
    errorListeners.delete(cb);
  };
}

export function getDrawingsSaveError(): string | null {
  return saveError;
}

function key(symbol: string, timeframe: string) {
  return `${PREFIX}.${symbol}.${timeframe}`;
}

export async function loadDrawings(symbol: string, timeframe: string): Promise<Drawing[]> {
  try {
    const raw = await AsyncStorage.getItem(key(symbol, timeframe));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Drawing[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveDrawings(
  symbol: string,
  timeframe: string,
  drawings: Drawing[]
): Promise<void> {
  try {
    await AsyncStorage.setItem(key(symbol, timeframe), JSON.stringify(drawings));
    setSaveError(null);
  } catch {
    setSaveError('تعذر حفظ الرسومات');
  }
}

export async function clearDrawings(symbol: string, timeframe: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key(symbol, timeframe));
    setSaveError(null);
  } catch {
    setSaveError('تعذر حذف الرسومات');
  }
}
