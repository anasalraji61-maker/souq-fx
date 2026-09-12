import {
  DEFAULT_WATCH_SYMBOLS,
  WATCHLIST_STORE_VERSION,
  sanitizeWatchSymbols,
} from './watchlistSanitize';

export type WatchlistParseOk = {
  status: 'ok';
  symbols: string[];
  /** true عندما الرموز [] صراحة — ليست تلفاً */
  empty: boolean;
};

export type WatchlistParseResult =
  | WatchlistParseOk
  | { status: 'missing' }
  | { status: 'corrupt'; reason: string };

/** تحليل حمولة v2 فقط — المصفوفة العارية ليست v2 صالحة */
export function parseV2Payload(raw: string | null | undefined): WatchlistParseResult {
  if (raw == null || raw === '') return { status: 'missing' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { status: 'corrupt', reason: 'json' };
  }
  if (Array.isArray(parsed)) {
    return { status: 'corrupt', reason: 'not-v2-object' };
  }
  if (!parsed || typeof parsed !== 'object') {
    return { status: 'corrupt', reason: 'type' };
  }
  const obj = parsed as Record<string, unknown>;
  if (!('v' in obj) || !('symbols' in obj)) {
    return { status: 'corrupt', reason: 'shape' };
  }
  if (typeof obj.v !== 'number' || !Number.isFinite(obj.v) || !Number.isInteger(obj.v)) {
    return { status: 'corrupt', reason: 'version-type' };
  }
  if (obj.v > WATCHLIST_STORE_VERSION) {
    return { status: 'corrupt', reason: 'future-version' };
  }
  if (obj.v !== WATCHLIST_STORE_VERSION) {
    return { status: 'corrupt', reason: 'unsupported-version' };
  }
  if (!Array.isArray(obj.symbols)) {
    return { status: 'corrupt', reason: 'symbols-not-array' };
  }
  const symbols = sanitizeWatchSymbols(obj.symbols);
  return { status: 'ok', symbols, empty: symbols.length === 0 };
}

/** ترحيل v1: مصفوفة رموز فقط */
export function parseV1Payload(raw: string | null | undefined): WatchlistParseResult {
  if (raw == null || raw === '') return { status: 'missing' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    return { status: 'corrupt', reason: 'json' };
  }
  if (!Array.isArray(parsed)) {
    return { status: 'corrupt', reason: 'v1-not-array' };
  }
  const symbols = sanitizeWatchSymbols(parsed);
  return { status: 'ok', symbols, empty: symbols.length === 0 };
}

export function defaultsWatchlist(): string[] {
  return [...DEFAULT_WATCH_SYMBOLS];
}
