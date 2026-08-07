import type { Candle } from '../api';

/** Align compare closes to primary window — both start at primary[0].close for overlay. */
export function compareOverlayPrices(primary: Candle[], compare: Candle[]): number[] {
  const n = Math.min(primary.length, compare.length);
  if (n < 2) return [];
  const pSlice = primary.slice(-n);
  const cSlice = compare.slice(-n);
  const pBase = pSlice[0].close || 1;
  const cBase = cSlice[0].close || 1;
  return cSlice.map((c) => pBase * (c.close / cBase));
}
