import { Candle } from '../../../types/market';
import { PriceRange } from './types';

export function calculatePriceRange(visibleCandles: Candle[], paddingFactor: number = 0.05): PriceRange {
  if (visibleCandles.length === 0) {
    return {
      minPrice: 0,
      maxPrice: 1,
      range: 1,
      padding: 0.05,
      adjustedMin: 0,
      adjustedMax: 1,
      adjustedRange: 1,
    };
  }

  const highPrices = visibleCandles.map((c) => c.high);
  const lowPrices = visibleCandles.map((c) => c.low);

  const minPrice = Math.min(...lowPrices);
  const maxPrice = Math.max(...highPrices);
  const rawRange = maxPrice - minPrice || 0.001;
  const padding = rawRange * paddingFactor;

  const adjustedMin = minPrice - padding;
  const adjustedMax = maxPrice + padding;
  const adjustedRange = adjustedMax - adjustedMin || 0.001;

  return {
    minPrice,
    maxPrice,
    range: rawRange,
    padding,
    adjustedMin,
    adjustedMax,
    adjustedRange,
  };
}

export function priceToY(price: number, adjustedMin: number, adjustedRange: number, chartHeight: number): number {
  return chartHeight - ((price - adjustedMin) / adjustedRange) * chartHeight;
}

export function yToPrice(y: number, adjustedMin: number, adjustedRange: number, chartHeight: number): number {
  return adjustedMin + ((chartHeight - y) / chartHeight) * adjustedRange;
}

export function timeToX(index: number, candleWidth: number): number {
  return index * candleWidth + candleWidth / 2;
}

export function formatPrice(price: number, precision: number): string {
  if (isNaN(price)) return '0.00';
  return price.toFixed(precision);
}

/**
 * Converts a timestamp (in unix seconds) to an X coordinate on the chart canvas.
 * Uses binary search on displayed candles, and extrapolates with candleWidth
 * if the timestamp falls before or after the visible window.
 */
export function timeToChartX(
  targetTime: number,
  displayedCandles: Candle[],
  candleWidth: number,
  intervalSeconds: number = 60
): number {
  if (displayedCandles.length === 0) return 0;

  const firstCandle = displayedCandles[0];
  const lastCandle = displayedCandles[displayedCandles.length - 1];

  // If outside visible slice on the left (earlier than visible range)
  if (targetTime < firstCandle.time) {
    const diffTime = firstCandle.time - targetTime;
    const countBefore = diffTime / (intervalSeconds || 60);
    return (0 - countBefore) * candleWidth + candleWidth / 2;
  }

  // If outside visible slice on the right (later than visible range)
  if (targetTime > lastCandle.time) {
    const diffTime = targetTime - lastCandle.time;
    const countAfter = diffTime / (intervalSeconds || 60);
    return (displayedCandles.length - 1 + countAfter) * candleWidth + candleWidth / 2;
  }

  // Binary search within displayedCandles
  let low = 0;
  let high = displayedCandles.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const midTime = displayedCandles[mid].time;
    if (midTime === targetTime) {
      return mid * candleWidth + candleWidth / 2;
    } else if (midTime < targetTime) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  // Linear interpolation if midTime is between high and low
  const leftIdx = Math.max(0, Math.min(displayedCandles.length - 1, high));
  const rightIdx = Math.max(0, Math.min(displayedCandles.length - 1, low));
  if (leftIdx === rightIdx) {
    return leftIdx * candleWidth + candleWidth / 2;
  }
  const t1 = displayedCandles[leftIdx].time;
  const t2 = displayedCandles[rightIdx].time;
  const fraction = t2 > t1 ? (targetTime - t1) / (t2 - t1) : 0;
  const interpolatedIdx = leftIdx + fraction;
  return interpolatedIdx * candleWidth + candleWidth / 2;
}

/**
 * Converts an X coordinate to a timestamp (in unix seconds) based on displayed candles.
 */
export function chartXToTime(
  x: number,
  displayedCandles: Candle[],
  candleWidth: number,
  intervalSeconds: number = 60
): number {
  if (displayedCandles.length === 0) return Math.floor(Date.now() / 1000);

  const idx = Math.floor(x / candleWidth);
  if (idx < 0) {
    const candlesBefore = Math.abs(idx);
    return displayedCandles[0].time - candlesBefore * (intervalSeconds || 60);
  }
  if (idx >= displayedCandles.length) {
    const candlesAfter = idx - (displayedCandles.length - 1);
    return displayedCandles[displayedCandles.length - 1].time + candlesAfter * (intervalSeconds || 60);
  }
  return displayedCandles[idx].time;
}

/**
 * Calculates perpendicular distance from point (px, py) to line segment (x1, y1)-(x2, y2).
 */
export function distanceToSegment(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const l2 = (x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1);
  if (l2 === 0) return Math.hypot(px - x1, py - y1);
  let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

