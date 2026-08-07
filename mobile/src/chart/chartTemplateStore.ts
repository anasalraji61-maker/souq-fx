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
  const all = await loadTemplates();
  const idx = all.findIndex((x) => x.id === t.id);
  if (idx >= 0) all[idx] = t;
  else all.unshift(t);
  await AsyncStorage.setItem(KEY, JSON.stringify(all.slice(0, 20)));
}

export async function deleteTemplate(id: string): Promise<void> {
  const all = (await loadTemplates()).filter((x) => x.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
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
