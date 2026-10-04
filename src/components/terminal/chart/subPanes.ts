import { Candle, IndicatorInstance } from '../../../types/market';
import {
  calculateRSI,
  calculateMACD,
  calculateStochastic,
  calculateATR,
  calculateADX,
  calculateCCI,
  calculateOBV,
} from '../../../data/indicators';
import { colors } from '../../../theme';

export function renderSubPane(
  ctx: CanvasRenderingContext2D,
  ind: IndicatorInstance,
  candles: Candle[],
  startIndex: number,
  endIndex: number,
  chartWidth: number,
  paneY: number,
  paneHeight: number,
  getX: (i: number) => number
) {
  // Background
  ctx.fillStyle = '#08111E';
  ctx.fillRect(0, paneY, chartWidth, paneHeight);

  // Top border divider
  ctx.strokeStyle = '#1E293B';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, paneY);
  ctx.lineTo(chartWidth, paneY);
  ctx.stroke();

  switch (ind.type) {
    case 'rsi':
      drawRsiSubPane(ctx, ind, candles, startIndex, endIndex, chartWidth, paneY, paneHeight, getX);
      break;
    case 'macd':
      drawMacdSubPane(ctx, ind, candles, startIndex, endIndex, chartWidth, paneY, paneHeight, getX);
      break;
    case 'stoch':
      drawStochSubPane(ctx, ind, candles, startIndex, endIndex, chartWidth, paneY, paneHeight, getX);
      break;
    case 'atr':
      drawAtrSubPane(ctx, ind, candles, startIndex, endIndex, chartWidth, paneY, paneHeight, getX);
      break;
    case 'adx':
      drawAdxSubPane(ctx, ind, candles, startIndex, endIndex, chartWidth, paneY, paneHeight, getX);
      break;
    case 'cci':
      drawCciSubPane(ctx, ind, candles, startIndex, endIndex, chartWidth, paneY, paneHeight, getX);
      break;
    case 'obv':
      drawObvSubPane(ctx, ind, candles, startIndex, endIndex, chartWidth, paneY, paneHeight, getX);
      break;
  }
}

/** RSI (30, 70 lines) */
export function drawRsiSubPane(
  ctx: CanvasRenderingContext2D,
  ind: IndicatorInstance,
  candles: Candle[],
  startIndex: number,
  endIndex: number,
  chartWidth: number,
  paneY: number,
  paneHeight: number,
  getX: (i: number) => number
) {
  const period = ind.params.period || 14;
  const color = ind.color || '#A78BFA';
  const getRsiY = (val: number) => paneY + paneHeight - (val / 100) * (paneHeight - 16) - 8;

  // Reference Levels: 70, 30
  ctx.strokeStyle = '#243049';
  ctx.setLineDash([3, 3]);

  // Level 70
  ctx.beginPath();
  ctx.moveTo(0, getRsiY(70));
  ctx.lineTo(chartWidth, getRsiY(70));
  ctx.stroke();

  // Level 30
  ctx.beginPath();
  ctx.moveTo(0, getRsiY(30));
  ctx.lineTo(chartWidth, getRsiY(30));
  ctx.stroke();

  ctx.setLineDash([]);

  // Labels
  ctx.fillStyle = colors.textDim;
  ctx.font = '9px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('70', chartWidth - 10, getRsiY(70) - 2);
  ctx.fillText('30', chartWidth - 10, getRsiY(30) + 9);
  ctx.textAlign = 'left';
  ctx.fillText(`RSI (${period})`, 10, paneY + 13);

  // Line
  const rsiValues = calculateRSI(candles, period).slice(startIndex, endIndex);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.beginPath();

  let started = false;
  rsiValues.forEach((val, i) => {
    if (val !== null) {
      const x = getX(i);
      const y = getRsiY(val);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
  });
  ctx.stroke();
}

/** MACD (zero line, histogram, MACD, Signal) */
export function drawMacdSubPane(
  ctx: CanvasRenderingContext2D,
  ind: IndicatorInstance,
  candles: Candle[],
  startIndex: number,
  endIndex: number,
  chartWidth: number,
  paneY: number,
  paneHeight: number,
  getX: (i: number) => number
) {
  const fast = ind.params.fast || 12;
  const slow = ind.params.slow || 26;
  const signalP = ind.params.signal || 9;

  const { macd, signal, histogram } = calculateMACD(candles, fast, slow, signalP);
  const macdSlice = macd.slice(startIndex, endIndex);
  const sigSlice = signal.slice(startIndex, endIndex);
  const histSlice = histogram.slice(startIndex, endIndex);

  let maxVal = 0.0001;
  [...macdSlice, ...sigSlice, ...histSlice].forEach((v) => {
    if (v !== null) maxVal = Math.max(maxVal, Math.abs(v));
  });

  const zeroY = paneY + paneHeight / 2;
  const getMacdY = (v: number) => zeroY - (v / (maxVal * 1.25)) * (paneHeight / 2 - 10);

  // Zero line
  ctx.strokeStyle = '#243049';
  ctx.beginPath();
  ctx.moveTo(0, zeroY);
  ctx.lineTo(chartWidth, zeroY);
  ctx.stroke();

  ctx.fillStyle = colors.textDim;
  ctx.font = '9px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`MACD (${fast}, ${slow}, ${signalP})`, 10, paneY + 13);

  // Histogram
  histSlice.forEach((h, i) => {
    if (h !== null) {
      const x = getX(i);
      const y = getMacdY(h);
      ctx.fillStyle = h >= 0 ? colors.bullSoft : colors.bearSoft;
      ctx.fillRect(x - 2, Math.min(zeroY, y), 4, Math.abs(y - zeroY));
    }
  });

  // MACD Line
  ctx.strokeStyle = ind.color || '#06B6D4';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  let started = false;
  macdSlice.forEach((v, i) => {
    if (v !== null) {
      const x = getX(i);
      const y = getMacdY(v);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
  });
  ctx.stroke();

  // Signal Line
  ctx.strokeStyle = '#F59E0B';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  started = false;
  sigSlice.forEach((v, i) => {
    if (v !== null) {
      const x = getX(i);
      const y = getMacdY(v);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
  });
  ctx.stroke();
}

/** Stochastic Oscillator (20, 80 lines, %K and %D) */
export function drawStochSubPane(
  ctx: CanvasRenderingContext2D,
  ind: IndicatorInstance,
  candles: Candle[],
  startIndex: number,
  endIndex: number,
  chartWidth: number,
  paneY: number,
  paneHeight: number,
  getX: (i: number) => number
) {
  const kP = ind.params.kPeriod || 14;
  const dP = ind.params.dPeriod || 3;
  const { k, d } = calculateStochastic(candles, kP, dP);
  const kSlice = k.slice(startIndex, endIndex);
  const dSlice = d.slice(startIndex, endIndex);

  const getStochY = (val: number) => paneY + paneHeight - (val / 100) * (paneHeight - 16) - 8;

  // 80 & 20 levels
  ctx.strokeStyle = '#243049';
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(0, getStochY(80));
  ctx.lineTo(chartWidth, getStochY(80));
  ctx.moveTo(0, getStochY(20));
  ctx.lineTo(chartWidth, getStochY(20));
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = colors.textDim;
  ctx.font = '9px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('80', chartWidth - 10, getStochY(80) - 2);
  ctx.fillText('20', chartWidth - 10, getStochY(20) + 9);
  ctx.textAlign = 'left';
  ctx.fillText(`Stoch (${kP}, ${dP})`, 10, paneY + 13);

  // %K Line
  ctx.strokeStyle = ind.color || '#F59E0B';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  let started = false;
  kSlice.forEach((val, i) => {
    if (val !== null) {
      const x = getX(i);
      const y = getStochY(val);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
  });
  ctx.stroke();

  // %D Line
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  started = false;
  dSlice.forEach((val, i) => {
    if (val !== null) {
      const x = getX(i);
      const y = getStochY(val);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
  });
  ctx.stroke();
}

/** ATR (Average True Range) */
export function drawAtrSubPane(
  ctx: CanvasRenderingContext2D,
  ind: IndicatorInstance,
  candles: Candle[],
  startIndex: number,
  endIndex: number,
  chartWidth: number,
  paneY: number,
  paneHeight: number,
  getX: (i: number) => number
) {
  const period = ind.params.period || 14;
  const atr = calculateATR(candles, period).slice(startIndex, endIndex);

  let minVal = Infinity;
  let maxVal = -Infinity;
  atr.forEach((v) => {
    if (v !== null) {
      minVal = Math.min(minVal, v);
      maxVal = Math.max(maxVal, v);
    }
  });

  if (minVal === Infinity) {
    minVal = 0;
    maxVal = 1;
  }
  const range = maxVal - minVal || 1;
  const getY = (v: number) => paneY + paneHeight - ((v - minVal) / range) * (paneHeight - 20) - 10;

  ctx.fillStyle = colors.textDim;
  ctx.font = '9px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`ATR (${period})`, 10, paneY + 13);

  ctx.strokeStyle = ind.color || '#EAB308';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  let started = false;
  atr.forEach((val, i) => {
    if (val !== null) {
      const x = getX(i);
      const y = getY(val);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
  });
  ctx.stroke();
}

/** ADX (+DI / -DI) */
export function drawAdxSubPane(
  ctx: CanvasRenderingContext2D,
  ind: IndicatorInstance,
  candles: Candle[],
  startIndex: number,
  endIndex: number,
  chartWidth: number,
  paneY: number,
  paneHeight: number,
  getX: (i: number) => number
) {
  const period = ind.params.period || 14;
  const { adx, plusDI, minusDI } = calculateADX(candles, period);
  const adxSlice = adx.slice(startIndex, endIndex);
  const plusSlice = plusDI.slice(startIndex, endIndex);
  const minusSlice = minusDI.slice(startIndex, endIndex);

  const getY = (val: number) => paneY + paneHeight - (val / 100) * (paneHeight - 16) - 8;

  // 25 Level line
  ctx.strokeStyle = '#243049';
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(0, getY(25));
  ctx.lineTo(chartWidth, getY(25));
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = colors.textDim;
  ctx.font = '9px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('25', chartWidth - 10, getY(25) - 2);
  ctx.textAlign = 'left';
  ctx.fillText(`ADX (${period})`, 10, paneY + 13);

  // +DI
  ctx.strokeStyle = '#10B981';
  ctx.lineWidth = 1.1;
  ctx.beginPath();
  let started = false;
  plusSlice.forEach((val, i) => {
    if (val !== null) {
      const x = getX(i);
      const y = getY(val);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
  });
  ctx.stroke();

  // -DI
  ctx.strokeStyle = '#EF4444';
  ctx.beginPath();
  started = false;
  minusSlice.forEach((val, i) => {
    if (val !== null) {
      const x = getX(i);
      const y = getY(val);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
  });
  ctx.stroke();

  // ADX Line
  ctx.strokeStyle = ind.color || '#6366F1';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  started = false;
  adxSlice.forEach((val, i) => {
    if (val !== null) {
      const x = getX(i);
      const y = getY(val);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
  });
  ctx.stroke();
}

/** CCI (±100 levels) */
export function drawCciSubPane(
  ctx: CanvasRenderingContext2D,
  ind: IndicatorInstance,
  candles: Candle[],
  startIndex: number,
  endIndex: number,
  chartWidth: number,
  paneY: number,
  paneHeight: number,
  getX: (i: number) => number
) {
  const period = ind.params.period || 20;
  const cci = calculateCCI(candles, period).slice(startIndex, endIndex);

  const zeroY = paneY + paneHeight / 2;
  const scale = (paneHeight / 2 - 12) / 200; // ±200 display bound
  const getY = (v: number) => zeroY - Math.max(-200, Math.min(200, v)) * scale;

  // ±100 & 0 levels
  ctx.strokeStyle = '#243049';
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(0, getY(100));
  ctx.lineTo(chartWidth, getY(100));
  ctx.moveTo(0, getY(-100));
  ctx.lineTo(chartWidth, getY(-100));
  ctx.moveTo(0, zeroY);
  ctx.lineTo(chartWidth, zeroY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = colors.textDim;
  ctx.font = '9px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('+100', chartWidth - 10, getY(100) - 2);
  ctx.fillText('-100', chartWidth - 10, getY(-100) + 9);
  ctx.textAlign = 'left';
  ctx.fillText(`CCI (${period})`, 10, paneY + 13);

  // CCI Line
  ctx.strokeStyle = ind.color || '#14B8A6';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  let started = false;
  cci.forEach((val, i) => {
    if (val !== null) {
      const x = getX(i);
      const y = getY(val);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
  });
  ctx.stroke();
}

/** OBV (On Balance Volume) */
export function drawObvSubPane(
  ctx: CanvasRenderingContext2D,
  ind: IndicatorInstance,
  candles: Candle[],
  startIndex: number,
  endIndex: number,
  chartWidth: number,
  paneY: number,
  paneHeight: number,
  getX: (i: number) => number
) {
  const obv = calculateOBV(candles).slice(startIndex, endIndex);

  let minVal = Infinity;
  let maxVal = -Infinity;
  obv.forEach((v) => {
    if (v !== null) {
      minVal = Math.min(minVal, v);
      maxVal = Math.max(maxVal, v);
    }
  });

  if (minVal === Infinity) {
    minVal = 0;
    maxVal = 1;
  }
  const range = maxVal - minVal || 1;
  const getY = (v: number) => paneY + paneHeight - ((v - minVal) / range) * (paneHeight - 20) - 10;

  ctx.fillStyle = colors.textDim;
  ctx.font = '9px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('OBV', 10, paneY + 13);

  ctx.strokeStyle = ind.color || '#3B82F6';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  let started = false;
  obv.forEach((val, i) => {
    if (val !== null) {
      const x = getX(i);
      const y = getY(val);
      if (!started) {
        ctx.moveTo(x, y);
        started = true;
      } else {
        ctx.lineTo(x, y);
      }
    }
  });
  ctx.stroke();
}
