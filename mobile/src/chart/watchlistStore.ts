import AsyncStorage from '@react-native-async-storage/async-storage';
import { authHeaders, API_URL } from '../api';
import {
  addWatchSymbol,
  resetWatchlistMemory,
  setWatchlistStorage,
  type WatchlistStorage,
} from './watchlistStoreCore';

setWatchlistStorage(AsyncStorage);

export {
  WATCHLIST_KEY_V1,
  WATCHLIST_KEY_V2,
  DEFAULT_WATCH_SYMBOLS,
  WATCHLIST_STORE_VERSION,
  sanitizeWatchSymbols,
  parseV1Payload,
  parseV2Payload,
  subscribeWatchlist,
  subscribeWatchlistSaveError,
  getWatchlistSnapshot,
  getWatchlistSaveError,
  ensureWatchlistLoaded,
  loadCustomSymbols,
  saveWatchlistSymbols,
  addWatchSymbol,
  removeWatchSymbol,
  moveWatchSymbol,
  resetWatchlistToDefault,
  catalogEntriesNotIn,
  loadWatchlistItems,
  setWatchlistStorage,
  resetWatchlistMemory,
  type WatchlistStorage,
} from './watchlistStoreCore';

/** توافق SymbolSearchBar — يضيف من الكتالوج فقط */
export async function addCustomSymbol(symbol: string): Promise<string[]> {
  const next = await addWatchSymbol(symbol);
  try {
    await fetch(`${API_URL}/api/watchlist/custom`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ symbol: symbol.toUpperCase() }),
    });
  } catch {
    /* local ok */
  }
  return next;
}

/** اختبارات فقط */
export function __setWatchlistStorageForTests(next: WatchlistStorage | null) {
  setWatchlistStorage(next ?? AsyncStorage);
}

export function __resetWatchlistMemoryForTests() {
  resetWatchlistMemory();
}
