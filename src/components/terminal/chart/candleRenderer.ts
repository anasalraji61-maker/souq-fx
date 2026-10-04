import { Candle, ChartType } from '../../../types/market';
import { colors } from '../../../theme';
import { calculateHeikinAshi } from './candleMath';

export function renderCandlesOrStyle(
  ctx: CanvasRenderingContext2D,
  displayedCandles: Candle[],
  chartType: ChartType,
  candleWidth: number,
  getX: (i: number) => number,
  getY: (val: number) => number,
  mainChartHeight: number
) {
  if (displayedCandles.length === 0) return;

  const bWidth = Math.max(2, candleWidth * 0.72);

  if (chartType === 'candles') {
    displayedCandles.forEach((c, i) => {
      const x = getX(i);
      const isUp = c.close >= c.open;
      const bodyColor = isUp ? colors.bull : colors.bear;

      // Wick
      ctx.strokeStyle = bodyColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, getY(c.high));
      ctx.lineTo(x, getY(c.low));
      ctx.stroke();

      // Body
      const topY = getY(Math.max(c.open, c.close));
      const bottomY = getY(Math.min(c.open, c.close));
      const bodyHeight = Math.max(1.5, bottomY - topY);

      ctx.fillStyle = bodyColor;
      ctx.fillRect(x - bWidth / 2, topY, bWidth, bodyHeight);
    });
  } else if (chartType === 'hollow') {
    // Hollow Candles: close >= open is hollow with green stroke; close < open is solid red
    displayedCandles.forEach((c, i) => {
      const x = getX(i);
      const isUp = c.close >= c.open;
      const color = isUp ? colors.bull : colors.bear;

      // Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, getY(c.high));
      ctx.lineTo(x, getY(c.low));
      ctx.stroke();

      // Body
      const topY = getY(Math.max(c.open, c.close));
      const bottomY = getY(Math.min(c.open, c.close));
      const bodyHeight = Math.max(1.5, bottomY - topY);

      if (isUp) {
        // Hollow: clear interior then stroke border
        ctx.fillStyle = '#060D19';
        ctx.fillRect(x - bWidth / 2, topY, bWidth, bodyHeight);
        ctx.strokeStyle = colors.bull;
        ctx.lineWidth = 1.2;
        ctx.strokeRect(x - bWidth / 2, topY, bWidth, bodyHeight);
      } else {
        // Solid bear body
        ctx.fillStyle = colors.bear;
        ctx.fillRect(x - bWidth / 2, topY, bWidth, bodyHeight);
      }
    });
  } else if (chartType === 'heikin_ashi') {
    const haCandles = calculateHeikinAshi(displayedCandles);
    haCandles.forEach((c, i) => {
      const x = getX(i);
      const isUp = c.haClose >= c.haOpen;
      const bodyColor = isUp ? colors.bull : colors.bear;

      // Wick
      ctx.strokeStyle = bodyColor;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, getY(c.haHigh));
      ctx.lineTo(x, getY(c.haLow));
      ctx.stroke();

      // Body
      const topY = getY(Math.max(c.haOpen, c.haClose));
      const bottomY = getY(Math.min(c.haOpen, c.haClose));
      const bodyHeight = Math.max(1.5, bottomY - topY);

      ctx.fillStyle = bodyColor;
      ctx.fillRect(x - bWidth / 2, topY, bWidth, bodyHeight);
    });
  } else if (chartType === 'bars') {
    // OHLC Bars: vertical line from low to high, left tick at open, right tick at close
    displayedCandles.forEach((c, i) => {
      const x = getX(i);
      const isUp = c.close >= c.open;
      const barColor = isUp ? colors.bull : colors.bear;
      const tickWidth = Math.max(2, candleWidth * 0.35);

      ctx.strokeStyle = barColor;
      ctx.lineWidth = 1.4;

      // Vertical line (High to Low)
      ctx.beginPath();
      ctx.moveTo(x, getY(c.high));
      ctx.lineTo(x, getY(c.low));
      ctx.stroke();

      // Left tick (Open)
      ctx.beginPath();
      ctx.moveTo(x, getY(c.open));
      ctx.lineTo(x - tickWidth, getY(c.open));
      ctx.stroke();

      // Right tick (Close)
      ctx.beginPath();
      ctx.moveTo(x, getY(c.close));
      ctx.lineTo(x + tickWidth, getY(c.close));
      ctx.stroke();
    });
  } else if (chartType === 'line') {
    ctx.strokeStyle = '#2DD4BF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    displayedCandles.forEach((c, i) => {
      const x = getX(i);
      const y = getY(c.close);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  } else if (chartType === 'area') {
    ctx.strokeStyle = '#2DD4BF';
    ctx.lineWidth = 2;
    ctx.beginPath();
    displayedCandles.forEach((c, i) => {
      const x = getX(i);
      const y = getY(c.close);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Fill gradient
    ctx.lineTo(getX(displayedCandles.length - 1), mainChartHeight);
    ctx.lineTo(getX(0), mainChartHeight);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, mainChartHeight);
    grad.addColorStop(0, 'rgba(45, 212, 191, 0.28)');
    grad.addColorStop(1, 'rgba(45, 212, 191, 0.00)');
    ctx.fillStyle = grad;
    ctx.fill();
  }
}
