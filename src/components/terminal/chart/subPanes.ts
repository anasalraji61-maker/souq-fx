import { Candle } from '../../../types/market';
import { calculateRSI, calculateMACD } from '../../../data/indicators';
import { colors } from '../../../theme';

export function drawRsiSubPane(
  ctx: CanvasRenderingContext2D,
  candles: Candle[],
  startIndex: number,
  endIndex: number,
  chartWidth: number,
  paneY: number,
  paneHeight: number,
  getX: (i: number) => number
) {
  ctx.fillStyle = '#08111E';
  ctx.fillRect(0, paneY, chartWidth, paneHeight);

  // Reference Levels: 70, 50, 30
  const getRsiY = (val: number) => paneY + paneHeight - (val / 100) * paneHeight;

  ctx.strokeStyle = '#1E293B';
  ctx.setLineDash([2, 2]);

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
  ctx.fillText('70', chartWidth - 20, getRsiY(70) - 2);
  ctx.fillText('30', chartWidth - 20, getRsiY(30) + 9);
  ctx.fillText('RSI (14)', chartWidth - 65, paneY + 12);

  // RSI Line
  const rsiValues = calculateRSI(candles, 14).slice(startIndex, endIndex);
  ctx.strokeStyle = '#C084FC';
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

export function drawMacdSubPane(
  ctx: CanvasRenderingContext2D,
  candles: Candle[],
  startIndex: number,
  endIndex: number,
  chartWidth: number,
  paneY: number,
  paneHeight: number,
  getX: (i: number) => number
) {
  ctx.fillStyle = '#08111E';
  ctx.fillRect(0, paneY, chartWidth, paneHeight);

  const { macd, signal, histogram } = calculateMACD(candles);
  const macdSlice = macd.slice(startIndex, endIndex);
  const sigSlice = signal.slice(startIndex, endIndex);
  const histSlice = histogram.slice(startIndex, endIndex);

  let maxVal = 0.0001;
  [...macdSlice, ...sigSlice, ...histSlice].forEach((v) => {
    if (v !== null) maxVal = Math.max(maxVal, Math.abs(v));
  });

  const zeroY = paneY + paneHeight / 2;
  const getMacdY = (v: number) => zeroY - (v / (maxVal * 1.3)) * (paneHeight / 2);

  // Zero line
  ctx.strokeStyle = '#243049';
  ctx.beginPath();
  ctx.moveTo(0, zeroY);
  ctx.lineTo(chartWidth, zeroY);
  ctx.stroke();

  ctx.fillStyle = colors.textDim;
  ctx.font = '9px monospace';
  ctx.fillText('MACD (12, 26, 9)', chartWidth - 95, paneY + 12);

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
  ctx.strokeStyle = '#38BDF8';
  ctx.lineWidth = 1.2;
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
