import { WATCHLIST } from './watchlist';
import {
  DEFAULT_WATCH_SYMBOLS,
  WATCHLIST_STORE_VERSION,
  isCatalogSymbol,
  sanitizeWatchSymbols,
} from './watchlistSanitize';
import { defaultsWatchlist, parseV1Payload, parseV2Payload } from './watchlistParse';

export {
  DEFAULT_WATCH_SYMBOLS,
  WATCHLIST_STORE_VERSION,
  sanitizeWatchSymbols,
} from './watchlistSanitize';
export { parseV1Payload, parseV2Payload } from './watchlistParse';

export const WATCHLIST_KEY_V2 = 'matrix.watchlist.personal.v2';
export const WATCHLIST_KEY_V1 = 'matrix.watchlist.custom.v1';

export type WatchlistStorage = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem?: (key: string) => Promise<void>;
};

type StoredV2 = { v: number; symbols: string[] };
type Listener = (symbols: string[]) => void;
type ErrorListener = (message: string | null) => void;

let storage: WatchlistStorage | null = null;
let memory: string[] | null = null;
let lastPersisted: string[] | null = null;
let saveError: string | null = null;
let loadPromise: Promise<string[]> | null = null;
let opChain: Promise<unknown> = Promise.resolve();
const listeners = new Set<Listener>();
const errorListeners = new Set<ErrorListener>();

function requireStorage(): WatchlistStorage {
  if (!storage) throw new Error('watchlist storage not configured');
  return storage;
}

function notify() {
  if (memory == null) return;
  for (const cb of listeners) {
    try {
      cb(memory);
    } catch {
      /* ignore */
    }
  }
}

function notifyError() {
  for (const cb of errorListeners) {
    try {
      cb(saveError);
    } catch {
      /* ignore */
    }
  }
}

function setSaveError(msg: string | null) {
  saveError = msg;
  notifyError();
}

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const run = opChain.then(fn, fn);
  opChain = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

export function setWatchlistStorage(next: WatchlistStorage) {
  storage = next;
}

export function subscribeWatchlist(cb: Listener): () => void {
  listeners.add(cb);
  if (memory != null) cb(memory);
  return () => {
    listeners.delete(cb);
  };
}

export function subscribeWatchlistSaveError(cb: ErrorListener): () => void {
  errorListeners.add(cb);
  cb(saveError);
  return () => {
    errorListeners.delete(cb);
  };
}

export function getWatchlistSnapshot(): string[] | null {
  return memory;
}

export function getWatchlistSaveError(): string | null {
  return saveError;
}

export function resetWatchlistMemory() {
  memory = null;
  lastPersisted = null;
  saveError = null;
  loadPromise = null;
  opChain = Promise.resolve();
}

async function persist(symbols: string[]): Promise<void> {
  const payload: StoredV2 = { v: WATCHLIST_STORE_VERSION, symbols };
  await requireStorage().setItem(WATCHLIST_KEY_V2, JSON.stringify(payload));
}

async function readFromDisk(): Promise<string[]> {
  const store = requireStorage();
  const v2raw = await store.getItem(WATCHLIST_KEY_V2);
  if (v2raw != null) {
    const parsed = parseV2Payload(v2raw);
    if (parsed.status === 'ok') return parsed.symbols;
    return defaultsWatchlist();
  }

  const v1raw = await store.getItem(WATCHLIST_KEY_V1);
  if (v1raw != null) {
    const parsed = parseV1Payload(v1raw);
    if (parsed.status === 'ok') {
      await persist(parsed.symbols);
      try {
        await store.removeItem?.(WATCHLIST_KEY_V1);
      } catch {
        /* optional */
      }
      return parsed.symbols;
    }
    return defaultsWatchlist();
  }

  return defaultsWatchlist();
}

async function ensureLoadedUnlocked(): Promise<string[]> {
  if (memory != null) return memory;
  if (!loadPromise) {
    loadPromise = (async () => {
      const fromDisk = await readFromDisk();
      if (memory == null) {
        memory = fromDisk;
        lastPersisted = [...fromDisk];
        notify();
      }
      return memory ?? fromDisk;
    })().finally(() => {
      loadPromise = null;
    });
  }
  return loadPromise;
}

export async function ensureWatchlistLoaded(): Promise<string[]> {
  return enqueue(() => ensureLoadedUnlocked());
}

async function commitUnlocked(next: string[]): Promise<string[]> {
  const sanitized = sanitizeWatchSymbols(next);
  const previous = memory != null ? [...memory] : lastPersisted != null ? [...lastPersisted] : null;
  memory = sanitized;
  notify();
  try {
    await persist(sanitized);
    lastPersisted = [...sanitized];
    setSaveError(null);
    return memory;
  } catch {
    if (previous != null) {
      memory = previous;
      notify();
    }
    setSaveError('تعذر حفظ قائمة المتابعة');
    return memory ?? previous ?? defaultsWatchlist();
  }
}

export async function loadCustomSymbols(): Promise<string[]> {
  return ensureWatchlistLoaded();
}

export async function saveWatchlistSymbols(symbols: string[]): Promise<string[]> {
  return enqueue(async () => {
    await ensureLoadedUnlocked();
    return commitUnlocked(symbols);
  });
}

export async function addWatchSymbol(symbol: string): Promise<string[]> {
  return enqueue(async () => {
    const cur = await ensureLoadedUnlocked();
    const sym = symbol.trim().toUpperCase();
    if (!isCatalogSymbol(sym)) return cur;
    if (cur.includes(sym)) return cur;
    return commitUnlocked([sym, ...cur]);
  });
}

export async function removeWatchSymbol(symbol: string): Promise<string[]> {
  return enqueue(async () => {
    const cur = await ensureLoadedUnlocked();
    const sym = symbol.trim().toUpperCase();
    return commitUnlocked(cur.filter((s) => s !== sym));
  });
}

export async function moveWatchSymbol(symbol: string, dir: -1 | 1): Promise<string[]> {
  return enqueue(async () => {
    const cur = [...(await ensureLoadedUnlocked())];
    const sym = symbol.trim().toUpperCase();
    const i = cur.indexOf(sym);
    if (i < 0) return cur;
    const j = i + dir;
    if (j < 0 || j >= cur.length) return cur;
    const tmp = cur[i]!;
    cur[i] = cur[j]!;
    cur[j] = tmp;
    return commitUnlocked(cur);
  });
}

export async function resetWatchlistToDefault(): Promise<string[]> {
  return enqueue(async () => {
    await ensureLoadedUnlocked();
    return commitUnlocked([...DEFAULT_WATCH_SYMBOLS]);
  });
}

const LABELS: Record<string, string> = Object.fromEntries(
  WATCHLIST.map((w) => [w.symbol, w.label])
);

export function catalogEntriesNotIn(symbols: string[]): { symbol: string; label: string; group?: string }[] {
  const have = new Set(symbols);
  return WATCHLIST.filter((w) => !have.has(w.symbol)).map((w) => ({
    symbol: w.symbol,
    label: w.label,
    group: w.group,
  }));
}

export async function loadWatchlistItems(): Promise<
  { symbol: string; label: string; group?: string }[]
> {
  const syms = await ensureWatchlistLoaded();
  return syms.map((s) => ({
    symbol: s,
    label: LABELS[s] ?? s,
    group: WATCHLIST.find((w) => w.symbol === s)?.group ?? 'custom',
  }));
}
