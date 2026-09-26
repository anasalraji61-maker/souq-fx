import type { Candle } from '../api';
import { estimatedVolume } from './types';

export type FootprintBar = {
  buyVol: number;
  sellVol: number;
  delta: number;
  imbalance: number;
  levels?: { price: number; buy: number; sell: number }[];
};

/** Synthetic CVD from candle direction × volume. Doji = 0 (was +vol: a sideways session drifted the line upward). */
export function computeCvd(candles: (Candle & { volume?: number })[]): number[] {
  let cum = 0;
  return candles.map((c) => {
    const vol = c.volume ?? estimatedVolume(c);
    const signed = c.close > c.open ? vol : c.close < c.open ? -vol : 0;
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
    // Symmetric split: marubozu ±0.8·vol, doji 0. The old bear branch was not a mirror (bear marubozu −0.5·vol,
    // green candle with a <11% body read negative, doji −0.1·vol).
    const dir = Math.sign(c.close - c.open);
    const buyVol = vol * (0.5 + dir * 0.4 * bodyShare);
    const sellVol = vol - buyVol;
    const delta = buyVol - sellVol;
    const imbalance = vol > 0 ? delta / vol : 0;
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
