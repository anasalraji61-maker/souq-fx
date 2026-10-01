import { Candle, ChartType } from '../../../types/market';
import { colors } from '../../../theme';

export function renderCandlesOrStyle(
  ctx: CanvasRenderingContext2D,
  displayedCandles: Candle[],
  chartType: ChartType,
  candleWidth: number,
  getX: (i: number) => number,
  getY: (val: number) => number,
  mainChartHeight: number
) {
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
      const bWidth = Math.max(2, candleWidth * 0.72);
      ctx.fillRect(x - bWidth / 2, topY, bWidth, bodyHeight);
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
    grad.addColorStop(0, 'rgba(45, 212, 191, 0.25)');
    grad.addColorStop(1, 'rgba(45, 212, 191, 0.00)');
    ctx.fillStyle = grad;
    ctx.fill();
  }
}
