import type { Candle } from '../api';

export type VolumeProfileRow = { price: number; volume: number };

export type TpoRow = {
  price: number;
  count: number;
  letters: string;
  volume: number;
};

/** Fixed-range volume profile — distributes volume across candle range. */
export function computeVolumeProfile(
  candles: (Candle & { volume?: number })[],
  bins = 24
): VolumeProfileRow[] {
  if (!candles.length) return [];
  let lo = Infinity;
  let hi = -Infinity;
  for (const c of candles) {
    lo = Math.min(lo, c.low);
    hi = Math.max(hi, c.high);
  }
  const span = hi - lo || 1;
  const step = span / bins;
  const acc = new Array(bins).fill(0);
  for (const c of candles) {
    const vol = c.volume ?? Math.abs(c.close - c.open) * 1e6;
    const i0 = Math.max(0, Math.min(bins - 1, Math.floor((c.low - lo) / step)));
    const i1 = Math.max(0, Math.min(bins - 1, Math.floor((c.high - lo) / step)));
    const n = Math.max(1, i1 - i0 + 1);
    for (let i = i0; i <= i1; i++) acc[i] += vol / n;
  }
  return acc.map((volume, i) => ({ price: lo + (i + 0.5) * step, volume }));
}

export function pocPrice(rows: VolumeProfileRow[]): number | null {
  if (!rows.length) return null;
  return rows.reduce((a, b) => (b.volume > a.volume ? b : a)).price;
}

const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * TPO: each candle paints letters across its full high-low range (session profile lite).
 * Value Area ≈ 70% of TPO count around POC.
 */
export function computeTpo(
  candles: (Candle & { volume?: number })[],
  bins = 28
): { rows: TpoRow[]; poc: number | null; vah: number | null; val: number | null } {
  if (!candles.length) return { rows: [], poc: null, vah: null, val: null };
  let lo = Infinity;
  let hi = -Infinity;
  for (const c of candles) {
    lo = Math.min(lo, c.low);
    hi = Math.max(hi, c.high);
  }
  const span = hi - lo || 1;
  const step = span / bins;
  const letters: string[][] = Array.from({ length: bins }, () => []);
  const vols = new Array(bins).fill(0);

  candles.forEach((c, i) => {
    const letter = LETTERS[i % LETTERS.length];
    const i0 = Math.max(0, Math.min(bins - 1, Math.floor((c.low - lo) / step)));
    const i1 = Math.max(0, Math.min(bins - 1, Math.floor((c.high - lo) / step)));
    const vol = c.volume ?? Math.abs(c.close - c.open) * 1e6;
    const n = Math.max(1, i1 - i0 + 1);
    for (let b = i0; b <= i1; b++) {
      letters[b].push(letter);
      vols[b] += vol / n;
    }
  });

  const rows: TpoRow[] = letters.map((ls, i) => ({
    price: lo + (i + 0.5) * step,
    count: ls.length,
    letters: ls.join('').slice(0, 16),
    volume: vols[i],
  }));

  let pocIdx = 0;
  for (let i = 1; i < rows.length; i++) {
    if (rows[i].count > rows[pocIdx].count) pocIdx = i;
  }
  const total = rows.reduce((s, r) => s + r.count, 0) || 1;
  const target = total * 0.7;
  let covered = rows[pocIdx].count;
  let loI = pocIdx;
  let hiI = pocIdx;
  while (covered < target && (loI > 0 || hiI < bins - 1)) {
    const above = hiI < bins - 1 ? rows[hiI + 1].count : -1;
    const below = loI > 0 ? rows[loI - 1].count : -1;
    if (above >= below) {
      hiI++;
      covered += rows[hiI].count;
    } else {
      loI--;
      covered += rows[loI].count;
    }
  }

  return {
    rows,
    poc: rows[pocIdx]?.price ?? null,
    vah: rows[hiI]?.price ?? null,
    val: rows[loI]?.price ?? null,
  };
}
