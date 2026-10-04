import { Candle, IndicatorType } from '../types/market';

/**
 * Helper to get closed candles only.
 * Closed candle rule: the last candle in the array is the still-running active candle.
 * It is excluded from calculations and its returned value is null.
 */
function getClosedCandles(candles: Candle[]): Candle[] {
  if (candles.length <= 1) return [];
  return candles.slice(0, candles.length - 1);
}

/** Simple Moving Average (SMA) */
export function calculateSMA(candles: Candle[], period: number = 20): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  const closed = getClosedCandles(candles);
  if (closed.length < period || period <= 0) return result;

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += closed[i].close;
  }
  result[period - 1] = sum / period;

  for (let i = period; i < closed.length; i++) {
    sum += closed[i].close - closed[i - period].close;
    result[i] = sum / period;
  }

  return result;
}

/** Exponential Moving Average (EMA) */
export function calculateEMA(candles: Candle[], period: number = 20): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  const closed = getClosedCandles(candles);
  if (closed.length < period || period <= 0) return result;

  const multiplier = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += closed[i].close;
  }
  let prevEma = sum / period;
  result[period - 1] = prevEma;

  for (let i = period; i < closed.length; i++) {
    prevEma = (closed[i].close - prevEma) * multiplier + prevEma;
    result[i] = prevEma;
  }

  return result;
}

/** Weighted Moving Average (WMA) */
export function calculateWMA(candles: Candle[], period: number = 20): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  const closed = getClosedCandles(candles);
  if (closed.length < period || period <= 0) return result;

  const weightDenominator = (period * (period + 1)) / 2;

  for (let i = period - 1; i < closed.length; i++) {
    let weightedSum = 0;
    for (let j = 0; j < period; j++) {
      const weight = period - j;
      weightedSum += closed[i - j].close * weight;
    }
    result[i] = weightedSum / weightDenominator;
  }

  return result;
}

/** Bollinger Bands (Middle, Upper, Lower) */
export function calculateBollingerBands(
  candles: Candle[],
  period: number = 20,
  stdDevMultiplier: number = 2
): { middle: (number | null)[]; upper: (number | null)[]; lower: (number | null)[] } {
  const middle: (number | null)[] = new Array(candles.length).fill(null);
  const upper: (number | null)[] = new Array(candles.length).fill(null);
  const lower: (number | null)[] = new Array(candles.length).fill(null);

  const closed = getClosedCandles(candles);
  if (closed.length < period || period <= 0) return { middle, upper, lower };

  for (let i = period - 1; i < closed.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += closed[i - j].close;
    }
    const smaVal = sum / period;
    middle[i] = smaVal;

    let varianceSum = 0;
    for (let j = 0; j < period; j++) {
      varianceSum += Math.pow(closed[i - j].close - smaVal, 2);
    }
    const stdDev = Math.sqrt(varianceSum / period);
    upper[i] = smaVal + stdDevMultiplier * stdDev;
    lower[i] = smaVal - stdDevMultiplier * stdDev;
  }

  return { middle, upper, lower };
}

/** Relative Strength Index (RSI) */
export function calculateRSI(candles: Candle[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  const closed = getClosedCandles(candles);
  if (closed.length < period + 1 || period <= 0) return result;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closed[i].close - closed[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result[period] = 100 - 100 / (1 + rs);

  for (let i = period + 1; i < closed.length; i++) {
    const diff = closed[i].close - closed[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result[i] = 100 - 100 / (1 + rs);
  }

  return result;
}

/** MACD (Moving Average Convergence Divergence) */
export function calculateMACD(
  candles: Candle[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): { macd: (number | null)[]; signal: (number | null)[]; histogram: (number | null)[] } {
  const macd: (number | null)[] = new Array(candles.length).fill(null);
  const signal: (number | null)[] = new Array(candles.length).fill(null);
  const histogram: (number | null)[] = new Array(candles.length).fill(null);

  const closed = getClosedCandles(candles);
  if (closed.length < slowPeriod) return { macd, signal, histogram };

  const fastEMA = calculateEMA(candles, fastPeriod);
  const slowEMA = calculateEMA(candles, slowPeriod);

  for (let i = 0; i < closed.length; i++) {
    const f = fastEMA[i];
    const s = slowEMA[i];
    if (f !== null && s !== null) {
      macd[i] = f - s;
    }
  }

  const validMacd: { index: number; val: number }[] = [];
  for (let i = 0; i < closed.length; i++) {
    if (macd[i] !== null) {
      validMacd.push({ index: i, val: macd[i] as number });
    }
  }

  if (validMacd.length >= signalPeriod) {
    const mult = 2 / (signalPeriod + 1);
    let prevSig = 0;
    for (let k = 0; k < signalPeriod; k++) {
      prevSig += validMacd[k].val;
    }
    prevSig /= signalPeriod;

    const startIdx = validMacd[signalPeriod - 1].index;
    signal[startIdx] = prevSig;
    histogram[startIdx] = (macd[startIdx] as number) - prevSig;

    for (let k = signalPeriod; k < validMacd.length; k++) {
      const idx = validMacd[k].index;
      const currMacd = validMacd[k].val;
      const currSig = (currMacd - prevSig) * mult + prevSig;
      prevSig = currSig;
      signal[idx] = currSig;
      histogram[idx] = currMacd - currSig;
    }
  }

  return { macd, signal, histogram };
}

/** Stochastic Oscillator (%K, %D) */
export function calculateStochastic(
  candles: Candle[],
  kPeriod: number = 14,
  dPeriod: number = 3
): { k: (number | null)[]; d: (number | null)[] } {
  const k: (number | null)[] = new Array(candles.length).fill(null);
  const d: (number | null)[] = new Array(candles.length).fill(null);

  const closed = getClosedCandles(candles);
  if (closed.length < kPeriod) return { k, d };

  for (let i = kPeriod - 1; i < closed.length; i++) {
    let highest = -Infinity;
    let lowest = Infinity;
    for (let j = 0; j < kPeriod; j++) {
      highest = Math.max(highest, closed[i - j].high);
      lowest = Math.min(lowest, closed[i - j].low);
    }
    const range = highest - lowest;
    k[i] = range === 0 ? 50 : ((closed[i].close - lowest) / range) * 100;
  }

  for (let i = kPeriod - 1 + dPeriod - 1; i < closed.length; i++) {
    let sum = 0;
    let valid = true;
    for (let j = 0; j < dPeriod; j++) {
      const val = k[i - j];
      if (val === null) {
        valid = false;
        break;
      }
      sum += val;
    }
    if (valid) {
      d[i] = sum / dPeriod;
    }
  }

  return { k, d };
}

/** Average True Range (ATR) */
export function calculateATR(candles: Candle[], period: number = 14): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  const closed = getClosedCandles(candles);
  if (closed.length <= period) return result;

  const tr: number[] = [closed[0].high - closed[0].low];
  for (let i = 1; i < closed.length; i++) {
    const high = closed[i].high;
    const low = closed[i].low;
    const prevClose = closed[i - 1].close;
    const trueRange = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    tr.push(trueRange);
  }

  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += tr[i];
  }
  let prevAtr = sum / period;
  result[period - 1] = prevAtr;

  for (let i = period; i < closed.length; i++) {
    prevAtr = (prevAtr * (period - 1) + tr[i]) / period;
    result[i] = prevAtr;
  }

  return result;
}

/** Volume-Weighted Average Price (VWAP, session reset 00:00 UTC) */
export function calculateVWAP(candles: Candle[]): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  const closed = getClosedCandles(candles);
  if (closed.length === 0) return result;

  let cumVolume = 0;
  let cumTypicalVol = 0;
  let currentSessionDay = -1;

  for (let i = 0; i < closed.length; i++) {
    const c = closed[i];
    const date = new Date(c.time * 1000);
    const day = date.getUTCDate();

    // Reset when UTC day changes
    if (day !== currentSessionDay) {
      currentSessionDay = day;
      cumVolume = 0;
      cumTypicalVol = 0;
    }

    const typicalPrice = (c.high + c.low + c.close) / 3;
    const vol = Math.max(1, c.volume);
    cumTypicalVol += typicalPrice * vol;
    cumVolume += vol;

    result[i] = cumVolume > 0 ? cumTypicalVol / cumVolume : typicalPrice;
  }

  return result;
}

/** Ichimoku Kinko Hyo */
export function calculateIchimoku(
  candles: Candle[],
  tenkanPeriod: number = 9,
  kijunPeriod: number = 26,
  senkouBPeriod: number = 52
): {
  tenkan: (number | null)[];
  kijun: (number | null)[];
  senkouA: (number | null)[];
  senkouB: (number | null)[];
  chikou: (number | null)[];
} {
  const len = candles.length;
  const tenkan: (number | null)[] = new Array(len).fill(null);
  const kijun: (number | null)[] = new Array(len).fill(null);
  const senkouA: (number | null)[] = new Array(len).fill(null);
  const senkouB: (number | null)[] = new Array(len).fill(null);
  const chikou: (number | null)[] = new Array(len).fill(null);

  const closed = getClosedCandles(candles);
  if (closed.length < kijunPeriod) {
    return { tenkan, kijun, senkouA, senkouB, chikou };
  }

  const getHighLowAvg = (endIdx: number, p: number): number => {
    let h = -Infinity;
    let l = Infinity;
    for (let k = 0; k < p; k++) {
      h = Math.max(h, closed[endIdx - k].high);
      l = Math.min(l, closed[endIdx - k].low);
    }
    return (h + l) / 2;
  };

  for (let i = 0; i < closed.length; i++) {
    if (i >= tenkanPeriod - 1) {
      tenkan[i] = getHighLowAvg(i, tenkanPeriod);
    }
    if (i >= kijunPeriod - 1) {
      kijun[i] = getHighLowAvg(i, kijunPeriod);
    }

    // Senkou A and B are plotted 26 periods ahead
    if (tenkan[i] !== null && kijun[i] !== null) {
      const shiftIdx = i + 26;
      if (shiftIdx < closed.length) {
        senkouA[shiftIdx] = ((tenkan[i] as number) + (kijun[i] as number)) / 2;
      }
    }
    if (i >= senkouBPeriod - 1) {
      const shiftIdx = i + 26;
      if (shiftIdx < closed.length) {
        senkouB[shiftIdx] = getHighLowAvg(i, senkouBPeriod);
      }
    }

    // Chikou is close shifted 26 periods backward
    if (i >= 26) {
      chikou[i - 26] = closed[i].close;
    }
  }

  return { tenkan, kijun, senkouA, senkouB, chikou };
}

/** Parabolic SAR */
export function calculateParabolicSAR(
  candles: Candle[],
  accelerationStep: number = 0.02,
  maxAcceleration: number = 0.2
): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  const closed = getClosedCandles(candles);
  if (closed.length < 3) return result;

  let isUpTrend = closed[1].close >= closed[0].close;
  let sar = isUpTrend ? closed[0].low : closed[0].high;
  let ep = isUpTrend ? closed[1].high : closed[1].low;
  let af = accelerationStep;

  result[0] = sar;

  for (let i = 1; i < closed.length; i++) {
    const prevSar = sar;
    sar = prevSar + af * (ep - prevSar);

    if (isUpTrend) {
      sar = Math.min(sar, closed[i - 1].low, i > 1 ? closed[i - 2].low : closed[i - 1].low);
      if (closed[i].low < sar) {
        // Trend reverses to downtrend
        isUpTrend = false;
        sar = ep;
        ep = closed[i].low;
        af = accelerationStep;
      } else {
        if (closed[i].high > ep) {
          ep = closed[i].high;
          af = Math.min(af + accelerationStep, maxAcceleration);
        }
      }
    } else {
      sar = Math.max(sar, closed[i - 1].high, i > 1 ? closed[i - 2].high : closed[i - 1].high);
      if (closed[i].high > sar) {
        // Trend reverses to uptrend
        isUpTrend = true;
        sar = ep;
        ep = closed[i].high;
        af = accelerationStep;
      } else {
        if (closed[i].low < ep) {
          ep = closed[i].low;
          af = Math.min(af + accelerationStep, maxAcceleration);
        }
      }
    }

    result[i] = sar;
  }

  return result;
}

/** Average Directional Index (ADX, +DI, -DI) */
export function calculateADX(
  candles: Candle[],
  period: number = 14
): { adx: (number | null)[]; plusDI: (number | null)[]; minusDI: (number | null)[] } {
  const len = candles.length;
  const adx: (number | null)[] = new Array(len).fill(null);
  const plusDI: (number | null)[] = new Array(len).fill(null);
  const minusDI: (number | null)[] = new Array(len).fill(null);

  const closed = getClosedCandles(candles);
  if (closed.length < period * 2) return { adx, plusDI, minusDI };

  const tr: number[] = [];
  const plusDM: number[] = [];
  const minusDM: number[] = [];

  for (let i = 1; i < closed.length; i++) {
    const h = closed[i].high;
    const l = closed[i].low;
    const prevH = closed[i - 1].high;
    const prevL = closed[i - 1].low;
    const prevC = closed[i - 1].close;

    tr.push(Math.max(h - l, Math.abs(h - prevC), Math.abs(l - prevC)));

    const upMove = h - prevH;
    const downMove = prevL - l;

    if (upMove > downMove && upMove > 0) {
      plusDM.push(upMove);
    } else {
      plusDM.push(0);
    }

    if (downMove > upMove && downMove > 0) {
      minusDM.push(downMove);
    } else {
      minusDM.push(0);
    }
  }

  let smoothedTR = 0;
  let smoothedPlusDM = 0;
  let smoothedMinusDM = 0;

  for (let i = 0; i < period; i++) {
    smoothedTR += tr[i];
    smoothedPlusDM += plusDM[i];
    smoothedMinusDM += minusDM[i];
  }

  const dxValues: { idx: number; dx: number }[] = [];

  for (let i = period; i < tr.length; i++) {
    smoothedTR = smoothedTR - smoothedTR / period + tr[i];
    smoothedPlusDM = smoothedPlusDM - smoothedPlusDM / period + plusDM[i];
    smoothedMinusDM = smoothedMinusDM - smoothedMinusDM / period + minusDM[i];

    const pDI = smoothedTR === 0 ? 0 : (smoothedPlusDM / smoothedTR) * 100;
    const mDI = smoothedTR === 0 ? 0 : (smoothedMinusDM / smoothedTR) * 100;
    const diSum = pDI + mDI;
    const dx = diSum === 0 ? 0 : (Math.abs(pDI - mDI) / diSum) * 100;

    const candleIdx = i + 1;
    plusDI[candleIdx] = pDI;
    minusDI[candleIdx] = mDI;
    dxValues.push({ idx: candleIdx, dx });
  }

  if (dxValues.length >= period) {
    let adxSum = 0;
    for (let i = 0; i < period; i++) {
      adxSum += dxValues[i].dx;
    }
    let prevAdx = adxSum / period;
    adx[dxValues[period - 1].idx] = prevAdx;

    for (let i = period; i < dxValues.length; i++) {
      prevAdx = (prevAdx * (period - 1) + dxValues[i].dx) / period;
      adx[dxValues[i].idx] = prevAdx;
    }
  }

  return { adx, plusDI, minusDI };
}

/** Commodity Channel Index (CCI) */
export function calculateCCI(candles: Candle[], period: number = 20): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  const closed = getClosedCandles(candles);
  if (closed.length < period || period <= 0) return result;

  const typicalPrices = closed.map((c) => (c.high + c.low + c.close) / 3);

  for (let i = period - 1; i < closed.length; i++) {
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += typicalPrices[i - j];
    }
    const smaTP = sum / period;

    let meanDev = 0;
    for (let j = 0; j < period; j++) {
      meanDev += Math.abs(typicalPrices[i - j] - smaTP);
    }
    meanDev /= period;

    result[i] = meanDev === 0 ? 0 : (typicalPrices[i] - smaTP) / (0.015 * meanDev);
  }

  return result;
}

/** On-Balance Volume (OBV) */
export function calculateOBV(candles: Candle[]): (number | null)[] {
  const result: (number | null)[] = new Array(candles.length).fill(null);
  const closed = getClosedCandles(candles);
  if (closed.length === 0) return result;

  let currentOBV = 0;
  result[0] = currentOBV;

  for (let i = 1; i < closed.length; i++) {
    const diff = closed[i].close - closed[i - 1].close;
    if (diff > 0) {
      currentOBV += closed[i].volume;
    } else if (diff < 0) {
      currentOBV -= closed[i].volume;
    }
    result[i] = currentOBV;
  }

  return result;
}

/** Indicator Metadata Catalog */
export interface IndicatorDefinition {
  type: IndicatorType;
  name: string;
  nameAr: string;
  pane: 'main' | 'sub';
  defaultParams: Record<string, number>;
  defaultColor: string;
  paramLabels: Record<string, { labelEn: string; labelAr: string; min: number; max: number; step?: number }>;
}

export const INDICATOR_CATALOG: IndicatorDefinition[] = [
  {
    type: 'ema',
    name: 'Exponential Moving Average',
    nameAr: 'المتوسط المتحرك الأسي (EMA)',
    pane: 'main',
    defaultParams: { period: 20 },
    defaultColor: '#2DD4BF',
    paramLabels: { period: { labelEn: 'Period', labelAr: 'الفترة', min: 1, max: 500 } },
  },
  {
    type: 'sma',
    name: 'Simple Moving Average',
    nameAr: 'المتوسط المتحرك البسيط (SMA)',
    pane: 'main',
    defaultParams: { period: 50 },
    defaultColor: '#F59E0B',
    paramLabels: { period: { labelEn: 'Period', labelAr: 'الفترة', min: 1, max: 500 } },
  },
  {
    type: 'wma',
    name: 'Weighted Moving Average',
    nameAr: 'المتوسط المتحرك الموزون (WMA)',
    pane: 'main',
    defaultParams: { period: 20 },
    defaultColor: '#38BDF8',
    paramLabels: { period: { labelEn: 'Period', labelAr: 'الفترة', min: 1, max: 500 } },
  },
  {
    type: 'bb',
    name: 'Bollinger Bands',
    nameAr: 'نطاقات بولينجر (Bollinger Bands)',
    pane: 'main',
    defaultParams: { period: 20, stdDev: 2 },
    defaultColor: '#818CF8',
    paramLabels: {
      period: { labelEn: 'Period', labelAr: 'الفترة', min: 1, max: 500 },
      stdDev: { labelEn: 'StdDev Multiplier', labelAr: 'مضاعف الانحراف', min: 0.5, max: 5, step: 0.1 },
    },
  },
  {
    type: 'vwap',
    name: 'Volume Weighted Average Price',
    nameAr: 'متوسط السعر الموزون بحجم التداول (VWAP)',
    pane: 'main',
    defaultParams: {},
    defaultColor: '#EC4899',
    paramLabels: {},
  },
  {
    type: 'psar',
    name: 'Parabolic SAR',
    nameAr: 'مؤشر سار المكافئ (Parabolic SAR)',
    pane: 'main',
    defaultParams: { step: 0.02, maxStep: 0.2 },
    defaultColor: '#F43F5E',
    paramLabels: {
      step: { labelEn: 'Acceleration Step', labelAr: 'خطوة التسارع', min: 0.001, max: 0.1, step: 0.005 },
      maxStep: { labelEn: 'Max Acceleration', labelAr: 'أقصى تسارع', min: 0.01, max: 0.5, step: 0.01 },
    },
  },
  {
    type: 'ichimoku',
    name: 'Ichimoku Cloud',
    nameAr: 'سحابة إيشيموكو (Ichimoku)',
    pane: 'main',
    defaultParams: { tenkan: 9, kijun: 26, senkouB: 52 },
    defaultColor: '#10B981',
    paramLabels: {
      tenkan: { labelEn: 'Tenkan Period', labelAr: 'فترة تينكان', min: 1, max: 100 },
      kijun: { labelEn: 'Kijun Period', labelAr: 'فترة كيجون', min: 1, max: 200 },
      senkouB: { labelEn: 'Senkou B Period', labelAr: 'فترة سينكو B', min: 1, max: 300 },
    },
  },
  {
    type: 'rsi',
    name: 'Relative Strength Index',
    nameAr: 'مؤشر القوة النسبية (RSI)',
    pane: 'sub',
    defaultParams: { period: 14 },
    defaultColor: '#A78BFA',
    paramLabels: { period: { labelEn: 'Period', labelAr: 'الفترة', min: 1, max: 500 } },
  },
  {
    type: 'macd',
    name: 'MACD',
    nameAr: 'مؤشر الماكد (MACD)',
    pane: 'sub',
    defaultParams: { fast: 12, slow: 26, signal: 9 },
    defaultColor: '#06B6D4',
    paramLabels: {
      fast: { labelEn: 'Fast Period', labelAr: 'الفترة السريعة', min: 1, max: 100 },
      slow: { labelEn: 'Slow Period', labelAr: 'الفترة البطيئة', min: 1, max: 200 },
      signal: { labelEn: 'Signal Period', labelAr: 'فترة الإشارة', min: 1, max: 100 },
    },
  },
  {
    type: 'stoch',
    name: 'Stochastic Oscillator',
    nameAr: 'مؤشر الستوكاستيك (Stochastic)',
    pane: 'sub',
    defaultParams: { kPeriod: 14, dPeriod: 3 },
    defaultColor: '#F59E0B',
    paramLabels: {
      kPeriod: { labelEn: '%K Period', labelAr: 'فترة %K', min: 1, max: 200 },
      dPeriod: { labelEn: '%D Period', labelAr: 'فترة %D', min: 1, max: 50 },
    },
  },
  {
    type: 'atr',
    name: 'Average True Range',
    nameAr: 'متوسط المدى الحقيقي (ATR)',
    pane: 'sub',
    defaultParams: { period: 14 },
    defaultColor: '#EAB308',
    paramLabels: { period: { labelEn: 'Period', labelAr: 'الفترة', min: 1, max: 200 } },
  },
  {
    type: 'adx',
    name: 'Average Directional Index',
    nameAr: 'مؤشر متوسط الحركة الاتجاهية (ADX)',
    pane: 'sub',
    defaultParams: { period: 14 },
    defaultColor: '#6366F1',
    paramLabels: { period: { labelEn: 'Period', labelAr: 'الفترة', min: 1, max: 200 } },
  },
  {
    type: 'cci',
    name: 'Commodity Channel Index',
    nameAr: 'مؤشر قناة السلع (CCI)',
    pane: 'sub',
    defaultParams: { period: 20 },
    defaultColor: '#14B8A6',
    paramLabels: { period: { labelEn: 'Period', labelAr: 'الفترة', min: 1, max: 300 } },
  },
  {
    type: 'obv',
    name: 'On-Balance Volume',
    nameAr: 'حجم التداول المتوازن (OBV)',
    pane: 'sub',
    defaultParams: {},
    defaultColor: '#3B82F6',
    paramLabels: {},
  },
];
