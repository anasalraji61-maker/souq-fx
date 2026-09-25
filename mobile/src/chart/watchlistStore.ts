import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api';
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
  type WatchlistSaveErrorCode,
} from './watchlistStoreCore';

/**
 * توافق SymbolSearchBar — يضيف من الكتالوج فقط.
 * الحفظ المحلي أولاً (هو مصدر الحقيقة بالواجهة)، ثم مزامنة الخادم عبر `api.addWatchlist`:
 * طلب كتابة قصير محروس بمهلة `WRITE_TIMEOUT_MS`، بخلاف نداء `fetch` الخام السابق الذي كان
 * يتجاوز `api.ts` كلياً فيبقى معلَّقاً بلا سقف على خادم غير قابل للوصول (حال كل مستخدم حتى
 * يُنشَر الباك-إند)، ولا ينتظر `installIdReady` فيذهب أحياناً بلا معرّف التثبيت.
 * الفشل يُبتلع عمداً: النداء `void` من `SymbolSearchBar` والرمز أصلاً محفوظ محلياً.
 */
export async function addCustomSymbol(symbol: string): Promise<string[]> {
  const next = await addWatchSymbol(symbol);
  try {
    await api.addWatchlist(symbol.toUpperCase());
  } catch {
    /* local ok */
  }
  return next;
}
