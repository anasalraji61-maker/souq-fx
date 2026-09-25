import type { Candle } from '../api';
import { estimatedVolume } from './types';

export type FootprintBar = {
  buyVol: number;
  sellVol: number;
  delta: number;
  imbalance: number;
  levels?: { price: number; buy: number; sell: number }[];
};

export type DomLevel = {
  price: number;
  bid: number;
  ask: number;
};

/** Synthetic CVD from candle direction × volume. */
export function computeCvd(candles: (Candle & { volume?: number })[]): number[] {
  let cum = 0;
  return candles.map((c) => {
    const vol = c.volume ?? estimatedVolume(c);
    const signed = c.close >= c.open ? vol : -vol;
    cum += signed;
    return cum;
  });
}

/** Footprint with intra-bar price buckets. */
export function computeFootprint(candles: (Candle & { volume?: number })[]): FootprintBar[] {
  return candles.map((c) => {
    const vol = c.volume ?? estimatedVolume(c);
    const range = c.high - c.low || 1e-9;
    const body = Math.abs(c.close - c.open);
    const bodyShare = Math.min(1, body / range);
    const bull = c.close >= c.open;
    const buyVol = bull ? vol * (0.45 + bodyShare * 0.45) : vol * (0.25 + (1 - bodyShare) * 0.2);
    const sellVol = vol - buyVol;
    const delta = buyVol - sellVol;
    const imbalance = delta / vol;
    const buckets = 5;
    const step = range / buckets;
    const levels = Array.from({ length: buckets }, (_, i) => {
      const price = c.low + (i + 0.5) * step;
      const w = 1 - Math.abs(i - (bull ? buckets - 1 : 0)) / buckets;
      return {
        price,
        buy: Math.round((buyVol * w) / buckets),
        sell: Math.round((sellVol * (1 - w * 0.5)) / buckets),
      };
    });
    return { buyVol, sellVol, delta, imbalance, levels };
  });
}

/** DOM ladder — uses live bid/ask when provided. */
export function computeDomLite(
  last: number,
  footprint: FootprintBar | null,
  levels = 12,
  bid?: number | null,
  ask?: number | null
): DomLevel[] {
  if (!last) return [];
  const midPrice = bid != null && ask != null ? (bid + ask) / 2 : last;
  const spread =
    bid != null && ask != null && ask > bid ? ask - bid : Math.max(midPrice * 0.00008, 1e-6);
  const step = Math.max(spread, midPrice * 0.00012);
  const bias = footprint?.imbalance ?? 0;
  const mid = Math.floor(levels / 2);
  const rows: DomLevel[] = [];
  for (let i = levels - 1; i >= 0; i--) {
    const price = midPrice + (i - mid) * step;
    const dist = Math.abs(i - mid) + 1;
    const base = 1800 / dist;
    let bidSz = base * (1 - bias * 0.45) * (0.75 + ((i * 13) % 5) / 10);
    let askSz = base * (1 + bias * 0.45) * (0.75 + ((i * 17) % 5) / 10);
    if (bid != null && Math.abs(price - bid) < step * 0.6) bidSz *= 2.2;
    if (ask != null && Math.abs(price - ask) < step * 0.6) askSz *= 2.2;
    rows.push({ price, bid: Math.round(bidSz), ask: Math.round(askSz) });
  }
  return rows;
}
