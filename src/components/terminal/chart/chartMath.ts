import { Candle } from '../../../types/market';
import { PriceRange } from './types';

export function calculatePriceRange(visibleCandles: Candle[], paddingFactor: number = 0.08): PriceRange {
  if (visibleCandles.length === 0) {
    return {
      minPrice: 0,
      maxPrice: 1,
      range: 1,
      padding: 0.08,
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
