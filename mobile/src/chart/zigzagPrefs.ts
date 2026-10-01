import AsyncStorage from '@react-native-async-storage/async-storage';
import { clampZigzagDeviation, ZIGZAG_DEVIATION_PCT } from './zigzagLegend';

/** انحراف ZigZag الذي اختاره المتداول — واحد لكل الشارتات كسرعة السحب (`panSpeed.ts`). */
export const ZIGZAG_DEVIATION_KEY = 'matrix.chart.zigzagDeviation.v1';

export async function loadZigzagDeviation(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(ZIGZAG_DEVIATION_KEY);
    if (raw != null) return clampZigzagDeviation(raw);
  } catch {
    /* default */
  }
  return ZIGZAG_DEVIATION_PCT;
}

/**
 * الشارتات المركَّبة معاً (الرباعي، الطرفية) تسمع التغيير فوراً: كانت تقرأ القيمة عند التركيب فقط، فتغيير
 * الانحراف بأحدها يترك الأخرى على القديم حتى تُفتح من جديد.
 */
const listeners = new Set<(pct: number) => void>();

export function subscribeZigzagDeviation(fn: (pct: number) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export async function saveZigzagDeviation(pct: number): Promise<void> {
  const v = clampZigzagDeviation(pct);
  listeners.forEach((fn) => fn(v));
  try {
    await AsyncStorage.setItem(ZIGZAG_DEVIATION_KEY, String(v));
  } catch {
    /* ignore */
  }
}
