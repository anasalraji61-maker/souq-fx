import { Candle } from '../types/market';

/** Simple Moving Average */
export function calculateSMA(candles: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += candles[i - j].close;
      }
      result.push(sum / period);
    }
  }
  return result;
}

/** Exponential Moving Average */
export function calculateEMA(candles: Candle[], period: number): (number | null)[] {
  const result: (number | null)[] = [];
  const multiplier = 2 / (period + 1);
  let previousEMA: number | null = null;

  for (let i = 0; i < candles.length; i++) {
    if (i < period - 1) {
      result.push(null);
    } else if (i === period - 1) {
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += candles[j].close;
      }
      previousEMA = sum / period;
      result.push(previousEMA);
    } else {
      const currentEMA: number = (candles[i].close - (previousEMA as number)) * multiplier + (previousEMA as number);
      previousEMA = currentEMA;
      result.push(currentEMA);
    }
  }
  return result;
}

/** Relative Strength Index (RSI 14) */
export function calculateRSI(candles: Candle[], period = 14): (number | null)[] {
  const result: (number | null)[] = [];
  if (candles.length < period + 1) return candles.map(() => null);

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // First periods null
  for (let i = 0; i < period; i++) result.push(null);

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push(100 - (100 / (1 + rs)));

  for (let i = period + 1; i < candles.length; i++) {
    const diff = candles[i].close - candles[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push(100 - (100 / (1 + rs)));
  }

  return result;
}

/** Bollinger Bands (Middle, Upper, Lower) */
export function calculateBollingerBands(
  candles: Candle[],
  period = 20,
  stdDevMultiplier = 2
): { middle: (number | null)[]; upper: (number | null)[]; lower: (number | null)[] } {
  const middle = calculateSMA(candles, period);
  const upper: (number | null)[] = [];
  const lower: (number | null)[] = [];

  for (let i = 0; i < candles.length; i++) {
    const smaVal = middle[i];
    if (smaVal === null) {
      upper.push(null);
      lower.push(null);
    } else {
      let varianceSum = 0;
      for (let j = 0; j < period; j++) {
        varianceSum += Math.pow(candles[i - j].close - smaVal, 2);
      }
      const stdDev = Math.sqrt(varianceSum / period);
      upper.push(smaVal + stdDevMultiplier * stdDev);
      lower.push(smaVal - stdDevMultiplier * stdDev);
    }
  }

  return { middle, upper, lower };
}

/** MACD (12, 26, 9) */
export function calculateMACD(
  candles: Candle[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] } {
  const fastEMA = calculateEMA(candles, fastPeriod);
  const slowEMA = calculateEMA(candles, slowPeriod);

  const macdLine: (number | null)[] = [];
  for (let i = 0; i < candles.length; i++) {
    const f = fastEMA[i];
    const s = slowEMA[i];
    if (f === null || s === null) {
      macdLine.push(null);
    } else {
      macdLine.push(f - s);
    }
  }

  // Calculate Signal line (EMA of MACD line)
  const validMacdIndices = macdLine.map((v, i) => (v !== null ? { index: i, val: v } : null)).filter(Boolean) as {
    index: number;
    val: number;
  }[];

  const signalLine: (number | null)[] = new Array(candles.length).fill(null);
  const histogram: (number | null)[] = new Array(candles.length).fill(null);

  if (validMacdIndices.length >= signalPeriod) {
    const mult = 2 / (signalPeriod + 1);
    let prevSig = 0;
    for (let k = 0; k < signalPeriod; k++) {
      prevSig += validMacdIndices[k].val;
    }
    prevSig /= signalPeriod;

    const startIdx = validMacdIndices[signalPeriod - 1].index;
    signalLine[startIdx] = prevSig;
    histogram[startIdx] = (macdLine[startIdx] as number) - prevSig;

    for (let k = signalPeriod; k < validMacdIndices.length; k++) {
      const idx = validMacdIndices[k].index;
      const currMacd = validMacdIndices[k].val;
      const currSig = (currMacd - prevSig) * mult + prevSig;
      prevSig = currSig;
      signalLine[idx] = currSig;
      histogram[idx] = currMacd - currSig;
    }
  }

  return { macd: macdLine, signal: signalLine, histogram };
}

/** Stochastic Oscillator (14, 3, 3) */
export function calculateStochastic(
  candles: Candle[],
  kPeriod = 14,
  dPeriod = 3
): { k: (number | null)[]; d: (number | null)[] } {
  const kLine: (number | null)[] = [];

  for (let i = 0; i < candles.length; i++) {
    if (i < kPeriod - 1) {
      kLine.push(null);
    } else {
      let highestHigh = -Infinity;
      let lowestLow = Infinity;
      for (let j = 0; j < kPeriod; j++) {
        highestHigh = Math.max(highestHigh, candles[i - j].high);
        lowestLow = Math.min(lowestLow, candles[i - j].low);
      }
      const range = highestHigh - lowestLow;
      const currentClose = candles[i].close;
      kLine.push(range === 0 ? 50 : ((currentClose - lowestLow) / range) * 100);
    }
  }

  // D line: SMA of K line
  const dLine: (number | null)[] = [];
  for (let i = 0; i < kLine.length; i++) {
    if (i < kPeriod - 1 + dPeriod - 1) {
      dLine.push(null);
    } else {
      let sum = 0;
      let valid = true;
      for (let j = 0; j < dPeriod; j++) {
        const val = kLine[i - j];
        if (val === null) {
          valid = false;
          break;
        }
        sum += val;
      }
      dLine.push(valid ? sum / dPeriod : null);
    }
  }

  return { k: kLine, d: dLine };
}
