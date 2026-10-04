import { DrawingItem } from '../types/market';

/**
 * Loads chart drawings for a given symbol and timeframe.
 * Attempts to fetch from backend first (/api/drawings?symbol=..&timeframe=..),
 * and falls back silently to localStorage (`matrix.drawings.<symbol>.<timeframe>`).
 */
export async function loadDrawings(symbol: string, timeframe: string): Promise<DrawingItem[]> {
  const normSym = (symbol || '').toUpperCase().trim();
  const normTf = (timeframe || '').toLowerCase().trim();
  const storageKey = `matrix.drawings.${normSym}.${normTf}`;

  // 1. Try backend endpoint first
  try {
    const res = await fetch(`/api/drawings?symbol=${encodeURIComponent(normSym)}&timeframe=${encodeURIComponent(normTf)}`);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        // Cache to localStorage
        try {
          localStorage.setItem(storageKey, JSON.stringify(data));
        } catch {}
        return data;
      }
    }
  } catch {
    // Backend endpoint not ready or offline - silently proceed to localStorage
  }

  // 2. Silently fall back to localStorage
  try {
    const raw = localStorage.getItem(storageKey);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn(`[Drawings API] Could not load from localStorage: ${storageKey}`, err);
  }

  return [];
}

/**
 * Saves chart drawings for a given symbol and timeframe.
 * Saves immediately to localStorage (`matrix.drawings.<symbol>.<timeframe>`),
 * and attempts to sync to backend (/api/drawings?symbol=..&timeframe=..).
 */
export async function saveDrawings(symbol: string, timeframe: string, drawings: DrawingItem[]): Promise<void> {
  const normSym = (symbol || '').toUpperCase().trim();
  const normTf = (timeframe || '').toLowerCase().trim();
  const storageKey = `matrix.drawings.${normSym}.${normTf}`;

  // 1. Save to localStorage immediately
  try {
    localStorage.setItem(storageKey, JSON.stringify(drawings));
  } catch (err) {
    console.warn(`[Drawings API] Could not save to localStorage: ${storageKey}`, err);
  }

  // 2. Attempt backend persistence
  try {
    await fetch(`/api/drawings?symbol=${encodeURIComponent(normSym)}&timeframe=${encodeURIComponent(normTf)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(drawings),
    });
  } catch {
    // Backend endpoint is optional / in-progress - silent ignore
  }
}
