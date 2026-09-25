import AsyncStorage from '@react-native-async-storage/async-storage';
import { clampLineBreakCount, LINE_BREAK_COUNT } from './lineBreak';

/** عدد خطوط الانعكاس الذي اختاره المتداول — واحد لكل الشارتات كانحراف ZigZag (`zigzagPrefs.ts`). */
export const LINE_BREAK_COUNT_KEY = 'matrix.chart.lineBreakCount.v1';

const listeners = new Set<(n: number) => void>();

export function subscribeLineBreakCount(fn: (n: number) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export async function loadLineBreakCount(): Promise<number> {
  try {
    const raw = await AsyncStorage.getItem(LINE_BREAK_COUNT_KEY);
    if (raw != null) return clampLineBreakCount(raw);
  } catch {
    /* default */
  }
  return LINE_BREAK_COUNT;
}

export async function saveLineBreakCount(n: number): Promise<void> {
  const v = clampLineBreakCount(n);
  listeners.forEach((fn) => fn(v));
  try {
    await AsyncStorage.setItem(LINE_BREAK_COUNT_KEY, String(v));
  } catch {
    /* ignore */
  }
}
