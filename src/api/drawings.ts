import { DrawingItem } from '../types/market';
import { apiClient } from './client';
import { getToken } from './session';

/**
 * Chart drawings per symbol + timeframe.
 *  - Always saved on this device (localStorage `matrix.drawings.<SYMBOL>.<tf>`), so the chart works offline
 *    and without an account.
 *  - When signed in, also synced to the account (`/api/drawings`), so the same drawings appear on every device.
 *    Guests never call the server (the route is account-only and would answer 401 on every chart load).
 */

const keyFor = (symbol: string, timeframe: string) =>
  `matrix.drawings.${(symbol || '').toUpperCase().trim()}.${(timeframe || '').toLowerCase().trim()}`;

function readLocal(storageKey: string): DrawingItem[] {
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed as DrawingItem[];
    }
  } catch (err) {
    console.warn(`[Drawings] could not read ${storageKey}`, err);
  }
  return [];
}

function writeLocal(storageKey: string, drawings: DrawingItem[]) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(drawings));
  } catch (err) {
    console.warn(`[Drawings] could not save ${storageKey}`, err);
  }
}

/** The server stores whole-second times and positive finite prices; anything else would reject the whole chart. */
function toServer(drawings: DrawingItem[]): DrawingItem[] {
  return drawings
    .filter((d) => Array.isArray(d.points) && d.points.length > 0)
    .map((d) => ({
      ...d,
      points: d.points.map((p) => ({ ...p, time: Math.round(Number(p.time)), price: Number(p.price) })),
    }))
    .filter((d) => d.points.every((p) => Number.isFinite(p.time) && p.time > 0 && Number.isFinite(p.price) && p.price > 0));
}

async function pushServer(symbol: string, timeframe: string, drawings: DrawingItem[]): Promise<boolean> {
  const sym = (symbol || '').toUpperCase().trim();
  const tf = (timeframe || '').toLowerCase().trim();
  const res = await apiClient.post(
    `/api/drawings?symbol=${encodeURIComponent(sym)}&timeframe=${encodeURIComponent(tf)}`,
    toServer(drawings)
  );
  return res.ok;
}

export async function loadDrawings(symbol: string, timeframe: string): Promise<DrawingItem[]> {
  const sym = (symbol || '').toUpperCase().trim();
  const tf = (timeframe || '').toLowerCase().trim();
  const storageKey = keyFor(sym, tf);
  const local = readLocal(storageKey);

  if (!getToken()) return local;

  const res = await apiClient.get<DrawingItem[]>(
    `/api/drawings?symbol=${encodeURIComponent(sym)}&timeframe=${encodeURIComponent(tf)}`
  );
  if (!res.ok || !Array.isArray(res.data)) return local;

  // Nothing on the account yet but drawings on this device (drawn before signing in): upload them instead of
  // replacing them with an empty list.
  if (res.data.length === 0 && local.length > 0) {
    void pushServer(sym, tf, local);
    return local;
  }

  writeLocal(storageKey, res.data);
  return res.data;
}

export async function saveDrawings(symbol: string, timeframe: string, drawings: DrawingItem[]): Promise<void> {
  writeLocal(keyFor(symbol, timeframe), drawings);
  if (!getToken()) return;
  try {
    await pushServer(symbol, timeframe, drawings);
  } catch {
    // stays on this device; the next save or chart load retries
  }
}
