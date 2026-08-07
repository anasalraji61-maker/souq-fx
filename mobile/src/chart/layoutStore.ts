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
  const all = await loadLayouts();
  const idx = all.findIndex((l) => l.id === layout.id);
  if (idx >= 0) all[idx] = layout;
  else all.unshift(layout);
  await AsyncStorage.setItem(KEY, JSON.stringify(all.slice(0, 12)));
}

export async function deleteLayout(id: string): Promise<void> {
  const all = (await loadLayouts()).filter((l) => l.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
}

export const DEFAULT_LAYOUT: TerminalLayout = {
  id: 'default',
  name: 'افتراضي',
  dxyTf: '15m',
  frameSymbols: ['EURUSD', 'GBPUSD', 'XAUUSD'],
  frameTfs: ['15m', '1H', '4H'],
  frameSizes: ['small', 'medium', 'large'],
};
