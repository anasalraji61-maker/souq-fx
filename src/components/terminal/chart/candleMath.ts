import { Candle } from '../../../types/market';

export interface HeikinAshiCandle extends Candle {
  haOpen: number;
  haHigh: number;
  haLow: number;
  haClose: number;
}

/**
 * Calculates Heikin Ashi candles from standard candles.
 */
export function calculateHeikinAshi(candles: Candle[]): HeikinAshiCandle[] {
  if (candles.length === 0) return [];

  const result: HeikinAshiCandle[] = [];
  let prevHaOpen = candles[0].open;
  let prevHaClose = candles[0].close;

  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    const haClose = (c.open + c.high + c.low + c.close) / 4;
    const haOpen = i === 0 ? (c.open + c.close) / 2 : (prevHaOpen + prevHaClose) / 2;
    const haHigh = Math.max(c.high, haOpen, haClose);
    const haLow = Math.min(c.low, haOpen, haClose);

    result.push({
      ...c,
      haOpen,
      haHigh,
      haLow,
      haClose,
    });

    prevHaOpen = haOpen;
    prevHaClose = haClose;
  }

  return result;
}

/**
 * Calculates remaining seconds until the current candle closes.
 */
export function getCandleCountdown(lastCandleTime: number, timeframeSeconds: number): string {
  const now = Math.floor(Date.now() / 1000);
  const nextClose = lastCandleTime + timeframeSeconds;
  const remaining = Math.max(0, nextClose - now);

  const hours = Math.floor(remaining / 3600);
  const minutes = Math.floor((remaining % 3600) / 60);
  const seconds = remaining % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
