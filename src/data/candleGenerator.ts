import { Candle, Timeframe } from '../types/market';

/** Timeframe duration in seconds */
export const TIMEFRAME_SECONDS: Record<Timeframe, number> = {
  '1m': 60,
  '5m': 300,
  '15m': 900,
  '1h': 3600,
  '4h': 14400,
  '1D': 86400,
};

/** Generate realistic candlestick history for a given base price and timeframe */
export function generateCandles(basePrice: number, timeframe: Timeframe, count = 180): Candle[] {
  const candles: Candle[] = [];
  const interval = TIMEFRAME_SECONDS[timeframe];
  const now = Math.floor(Date.now() / 1000);
  const startTime = now - count * interval;

  // Volatility scale based on price magnitude
  const isJpyOrGold = basePrice > 100;
  const isIndicesOrCrypto = basePrice > 1000;
  
  let volatility = 0.0008; // 0.08% for fx
  if (isJpyOrGold) volatility = 0.0025;
  if (isIndicesOrCrypto) volatility = 0.004;

  let currentPrice = basePrice * (1 - 0.02 + Math.random() * 0.04);
  let trend = (Math.random() - 0.48) * 0.0003;

  for (let i = 0; i < count; i++) {
    const time = startTime + i * interval;
    
    // Wave drift
    if (i % 25 === 0) {
      trend = (Math.random() - 0.49) * volatility * 0.5;
    }

    const drift = currentPrice * trend;
    const randomChange = currentPrice * volatility * (Math.random() - 0.5) * 2;
    const open = currentPrice;
    let close = open + drift + randomChange;

    // High and Low with realistic wicks
    const maxOC = Math.max(open, close);
    const minOC = Math.min(open, close);
    const upperWick = currentPrice * volatility * Math.random() * 1.4;
    const lowerWick = currentPrice * volatility * Math.random() * 1.4;

    const high = maxOC + upperWick;
    const low = Math.max(0.0001, minOC - lowerWick);

    const volume = Math.floor(500 + Math.random() * 4500 + (Math.abs(close - open) / currentPrice) * 50000);

    candles.push({
      time,
      open: parseFloat(open.toFixed(isIndicesOrCrypto ? 1 : isJpyOrGold ? 3 : 5)),
      high: parseFloat(high.toFixed(isIndicesOrCrypto ? 1 : isJpyOrGold ? 3 : 5)),
      low: parseFloat(low.toFixed(isIndicesOrCrypto ? 1 : isJpyOrGold ? 3 : 5)),
      close: parseFloat(close.toFixed(isIndicesOrCrypto ? 1 : isJpyOrGold ? 3 : 5)),
      volume,
    });

    currentPrice = close;
  }

  // Adjust last candle close to match current market basePrice
  const last = candles[candles.length - 1];
  last.close = basePrice;
  last.high = Math.max(last.high, basePrice);
  last.low = Math.min(last.low, basePrice);

  return candles;
}

/** Update the newest candle with a new tick */
export function updateLastCandleWithTick(candles: Candle[], tickPrice: number, timeframe: Timeframe): Candle[] {
  if (candles.length === 0) return candles;
  const updated = [...candles];
  const lastIndex = updated.length - 1;
  const lastCandle = { ...updated[lastIndex] };
  const interval = TIMEFRAME_SECONDS[timeframe];
  const now = Math.floor(Date.now() / 1000);

  // Check if we should form a new candle or update current
  if (now - lastCandle.time >= interval) {
    const newCandle: Candle = {
      time: Math.floor(now / interval) * interval,
      open: lastCandle.close,
      high: Math.max(lastCandle.close, tickPrice),
      low: Math.min(lastCandle.close, tickPrice),
      close: tickPrice,
      volume: 1,
    };
    return [...updated.slice(1), newCandle];
  } else {
    lastCandle.close = tickPrice;
    lastCandle.high = Math.max(lastCandle.high, tickPrice);
    lastCandle.low = Math.min(lastCandle.low, tickPrice);
    lastCandle.volume += 1;
    updated[lastIndex] = lastCandle;
    return updated;
  }
}
