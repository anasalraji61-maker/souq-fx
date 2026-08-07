import AsyncStorage from '@react-native-async-storage/async-storage';
import { WATCHLIST } from './watchlist';
import { api, authHeaders, API_URL } from '../api';

const KEY = 'matrix.watchlist.custom.v1';

export async function loadCustomSymbols(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as string[];
      if (Array.isArray(parsed) && parsed.length) return parsed;
    }
  } catch {
    /* ignore */
  }
  try {
    const res = await api.customWatchlist();
    if (res.symbols.length) {
      await AsyncStorage.setItem(KEY, JSON.stringify(res.symbols));
      return res.symbols;
    }
  } catch {
    /* offline */
  }
  return WATCHLIST.map((w) => w.symbol);
}

export async function addCustomSymbol(symbol: string): Promise<string[]> {
  const sym = symbol.toUpperCase();
  const cur = await loadCustomSymbols();
  if (!cur.includes(sym)) cur.unshift(sym);
  const next = cur.slice(0, 40);
  await AsyncStorage.setItem(KEY, JSON.stringify(next));
  try {
    await fetch(`${API_URL}/api/watchlist/custom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ symbol: sym }),
    });
  } catch {
    /* local ok */
  }
  return next;
}

const LABELS: Record<string, string> = Object.fromEntries(WATCHLIST.map((w) => [w.symbol, w.label]));

export async function loadWatchlistItems(): Promise<
  { symbol: string; label: string; group?: string }[]
> {
  const syms = await loadCustomSymbols();
  return syms.map((s) => ({
    symbol: s,
    label: LABELS[s] ?? s,
    group: WATCHLIST.find((w) => w.symbol === s)?.group ?? 'custom',
  }));
}
