import { WATCHLIST } from './watchlist';

export const WATCHLIST_STORE_VERSION = 2;

export const DEFAULT_WATCH_SYMBOLS: string[] = WATCHLIST.map((w) => w.symbol);

const CATALOG = new Set(DEFAULT_WATCH_SYMBOLS);

/** رموز الكتالوج العام فقط، بدون تكرار، بترتيب الإدخال */
export function sanitizeWatchSymbols(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const sym = item.trim().toUpperCase();
    if (!sym || !CATALOG.has(sym) || seen.has(sym)) continue;
    seen.add(sym);
    out.push(sym);
  }
  return out;
}

export function isCatalogSymbol(symbol: string): boolean {
  return CATALOG.has(symbol.trim().toUpperCase());
}
