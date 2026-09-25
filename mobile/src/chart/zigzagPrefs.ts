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

export async function saveZigzagDeviation(pct: number): Promise<void> {
  try {
    await AsyncStorage.setItem(ZIGZAG_DEVIATION_KEY, String(clampZigzagDeviation(pct)));
  } catch {
    /* ignore */
  }
}
