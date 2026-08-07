import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Drawing } from './types';

const PREFIX = 'matrix.drawings.v1';

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
  } catch {
    /* ignore */
  }
}

export async function clearDrawings(symbol: string, timeframe: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key(symbol, timeframe));
  } catch {
    /* ignore */
  }
}
