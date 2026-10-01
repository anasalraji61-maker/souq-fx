import { Candle, IndicatorSettings } from '../../../types/market';
import { calculateSMA, calculateBollingerBands, calculateRSI } from '../../../data/indicators';

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
