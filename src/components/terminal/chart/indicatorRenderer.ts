import { Candle, IndicatorSettings, IndicatorInstance } from '../../../types/market';
import {
  calculateSMA,
  calculateEMA,
  calculateWMA,
  calculateBollingerBands,
  calculateVWAP,
  calculateParabolicSAR,
  calculateIchimoku,
} from '../../../data/indicators';

export function drawIndicatorLine(
  ctx: CanvasRenderingContext2D,
  data: (number | null)[],
  getX: (i: number) => number,
  getY: (val: number) => number,
  color: string,
  lineWidth: number = 1.5,
  dash: number[] = []
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.setLineDash(dash);
  ctx.beginPath();

  let started = false;
  data.forEach((val, i) => {
    if (val !== null && !isNaN(val)) {
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
  ctx.restore();
}

export function renderVolumeBars(
  ctx: CanvasRenderingContext2D,
  displayedCandles: Candle[],
  getX: (i: number) => number,
  candleWidth: number,
  mainChartHeight: number
) {
  let maxVol = 0;
  displayedCandles.forEach((c) => (maxVol = Math.max(maxVol, c.volume)));
  const volAreaHeight = mainChartHeight * 0.16;

  displayedCandles.forEach((c, i) => {
    const x = getX(i);
    const barH = (c.volume / (maxVol || 1)) * volAreaHeight;
    const y = mainChartHeight - barH;
    ctx.fillStyle = c.close >= c.open ? 'rgba(34, 197, 94, 0.22)' : 'rgba(239, 68, 68, 0.22)';
    ctx.fillRect(x - candleWidth * 0.35, y, candleWidth * 0.7, barH);
  });
}

/**
 * Renders all main-pane indicator instances (SMA, EMA, WMA, BB, VWAP, PSAR, Ichimoku).
 */
export function renderMainIndicatorInstances(
  ctx: CanvasRenderingContext2D,
  instances: IndicatorInstance[],
  allCandles: Candle[],
  startIndex: number,
  endIndex: number,
  getX: (i: number) => number,
  getY: (val: number) => number
) {
  instances.forEach((ind) => {
    if (!ind.visible || ind.pane !== 'main') return;

    switch (ind.type) {
      case 'sma': {
        const p = ind.params.period || 20;
        const data = calculateSMA(allCandles, p).slice(startIndex, endIndex);
        drawIndicatorLine(ctx, data, getX, getY, ind.color || '#F59E0B', 1.5);
        break;
      }
      case 'ema': {
        const p = ind.params.period || 20;
        const data = calculateEMA(allCandles, p).slice(startIndex, endIndex);
        drawIndicatorLine(ctx, data, getX, getY, ind.color || '#2DD4BF', 1.5);
        break;
      }
      case 'wma': {
        const p = ind.params.period || 20;
        const data = calculateWMA(allCandles, p).slice(startIndex, endIndex);
        drawIndicatorLine(ctx, data, getX, getY, ind.color || '#38BDF8', 1.5);
        break;
      }
      case 'bb': {
        const p = ind.params.period || 20;
        const mult = ind.params.stdDev || 2;
        const { upper, lower, middle } = calculateBollingerBands(allCandles, p, mult);
        const uSlice = upper.slice(startIndex, endIndex);
        const lSlice = lower.slice(startIndex, endIndex);
        const mSlice = middle.slice(startIndex, endIndex);

        // Middle line
        drawIndicatorLine(ctx, mSlice, getX, getY, ind.color || '#818CF8', 1, [3, 3]);
        // Upper & lower bands
        drawIndicatorLine(ctx, uSlice, getX, getY, ind.color || '#818CF8', 1.3);
        drawIndicatorLine(ctx, lSlice, getX, getY, ind.color || '#818CF8', 1.3);

        // Fill band area with soft gradient / color
        ctx.save();
        ctx.fillStyle = 'rgba(129, 140, 248, 0.08)';
        ctx.beginPath();
        let first = true;
        for (let i = 0; i < uSlice.length; i++) {
          const u = uSlice[i];
          if (u !== null) {
            const x = getX(i);
            const y = getY(u);
            if (first) {
              ctx.moveTo(x, y);
              first = false;
            } else {
              ctx.lineTo(x, y);
            }
          }
        }
        for (let i = lSlice.length - 1; i >= 0; i--) {
          const l = lSlice[i];
          if (l !== null) {
            ctx.lineTo(getX(i), getY(l));
          }
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        break;
      }
      case 'vwap': {
        const data = calculateVWAP(allCandles).slice(startIndex, endIndex);
        drawIndicatorLine(ctx, data, getX, getY, ind.color || '#EC4899', 1.8);
        break;
      }
      case 'psar': {
        const step = ind.params.step || 0.02;
        const maxStep = ind.params.maxStep || 0.2;
        const data = calculateParabolicSAR(allCandles, step, maxStep).slice(startIndex, endIndex);
        ctx.save();
        ctx.fillStyle = ind.color || '#F43F5E';
        data.forEach((val, i) => {
          if (val !== null) {
            const x = getX(i);
            const y = getY(val);
            ctx.beginPath();
            ctx.arc(x, y, 2, 0, Math.PI * 2);
            ctx.fill();
          }
        });
        ctx.restore();
        break;
      }
      case 'ichimoku': {
        const tP = ind.params.tenkan || 9;
        const kP = ind.params.kijun || 26;
        const sBP = ind.params.senkouB || 52;
        const { tenkan, kijun, senkouA, senkouB, chikou } = calculateIchimoku(allCandles, tP, kP, sBP);

        const tSlice = tenkan.slice(startIndex, endIndex);
        const kSlice = kijun.slice(startIndex, endIndex);
        const sASlice = senkouA.slice(startIndex, endIndex);
        const sBSlice = senkouB.slice(startIndex, endIndex);
        const cSlice = chikou.slice(startIndex, endIndex);

        drawIndicatorLine(ctx, tSlice, getX, getY, '#38BDF8', 1.2); // Tenkan (blue)
        drawIndicatorLine(ctx, kSlice, getX, getY, '#F43F5E', 1.2); // Kijun (red)
        drawIndicatorLine(ctx, cSlice, getX, getY, '#A78BFA', 1, [2, 2]); // Chikou (purple)

        // Cloud fill
        ctx.save();
        ctx.fillStyle = 'rgba(16, 185, 129, 0.09)';
        ctx.beginPath();
        let started = false;
        for (let i = 0; i < sASlice.length; i++) {
          const a = sASlice[i];
          if (a !== null) {
            const x = getX(i);
            const y = getY(a);
            if (!started) {
              ctx.moveTo(x, y);
              started = true;
            } else {
              ctx.lineTo(x, y);
            }
          }
        }
        for (let i = sBSlice.length - 1; i >= 0; i--) {
          const b = sBSlice[i];
          if (b !== null) {
            ctx.lineTo(getX(i), getY(b));
          }
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        drawIndicatorLine(ctx, sASlice, getX, getY, '#10B981', 1);
        drawIndicatorLine(ctx, sBSlice, getX, getY, '#EF4444', 1);
        break;
      }
    }
  });
}

/**
 * Legacy indicator overlays fallback
 */
export function renderIndicatorOverlays(
  ctx: CanvasRenderingContext2D,
  allCandles: Candle[],
  startIndex: number,
  endIndex: number,
  indicators: IndicatorSettings,
  getX: (i: number) => number,
  getY: (val: number) => number
) {
  if (indicators.showSma20) {
    const sma20 = calculateSMA(allCandles, 20).slice(startIndex, endIndex);
    drawIndicatorLine(ctx, sma20, getX, getY, '#2DD4BF', 1.5);
  }
  if (indicators.showSma50) {
    const sma50 = calculateSMA(allCandles, 50).slice(startIndex, endIndex);
    drawIndicatorLine(ctx, sma50, getX, getY, '#F59E0B', 1.5);
  }
  if (indicators.showSma200) {
    const sma200 = calculateSMA(allCandles, 200).slice(startIndex, endIndex);
    drawIndicatorLine(ctx, sma200, getX, getY, '#A78BFA', 2);
  }

  if (indicators.showBollinger) {
    const { upper, lower, middle } = calculateBollingerBands(allCandles, 20, 2);
    const uSlice = upper.slice(startIndex, endIndex);
    const lSlice = lower.slice(startIndex, endIndex);
    const mSlice = middle.slice(startIndex, endIndex);

    drawIndicatorLine(ctx, mSlice, getX, getY, '#38BDF8', 1, [3, 3]);
    drawIndicatorLine(ctx, uSlice, getX, getY, 'rgba(56, 189, 248, 0.7)', 1.5);
    drawIndicatorLine(ctx, lSlice, getX, getY, 'rgba(56, 189, 248, 0.7)', 1.5);
  }
}
