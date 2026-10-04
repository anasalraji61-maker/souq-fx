import { DrawingItem, Candle } from '../../../types/market';
import { distanceToSegment } from './chartMath';

/**
 * Calculates perpendicular line slope and projection for parallel channel
 */
function getLineEquation(x1: number, y1: number, x2: number, y2: number): { isVertical: boolean; x: number; m: number; b: number } {
  if (Math.abs(x2 - x1) < 0.0001) {
    return { isVertical: true, x: x1, m: 0, b: 0 };
  }
  const m = (y2 - y1) / (x2 - x1);
  const b = y1 - m * x1;
  return { isVertical: false, x: x1, m, b };
}

export function renderExtendedDrawing(
  ctx: CanvasRenderingContext2D,
  d: DrawingItem,
  chartWidth: number,
  mainChartHeight: number,
  getX: (time: number) => number,
  getY: (price: number) => number,
  isSelected: boolean,
  precision: number,
  pipScale: number = 0.0001
) {
  if (d.hidden || d.points.length === 0) return;

  ctx.save();
  const baseColor = d.color || '#2DD4BF';
  ctx.strokeStyle = baseColor;
  ctx.lineWidth = d.lineWidth || (isSelected ? 2.2 : 1.5);

  if (d.lineStyle === 'dashed') {
    ctx.setLineDash([6, 4]);
  } else if (d.lineStyle === 'dotted') {
    ctx.setLineDash([2, 3]);
  } else {
    ctx.setLineDash([]);
  }

  const p1 = d.points[0];
  const p2 = d.points[1] || p1;
  const p3 = d.points[2] || p2;

  const x1 = getX(p1.time);
  const y1 = getY(p1.price);
  const x2 = getX(p2.time);
  const y2 = getY(p2.price);

  switch (d.type) {
    case 'horizontal': {
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, y1);
      ctx.lineTo(chartWidth, y1);
      ctx.stroke();
      if (isSelected) {
        drawHandle(ctx, p1.time ? x1 : chartWidth / 2, y1);
      }
      break;
    }

    case 'vertical': {
      ctx.beginPath();
      ctx.moveTo(x1, 0);
      ctx.lineTo(x1, mainChartHeight);
      ctx.stroke();
      if (isSelected) {
        drawHandle(ctx, x1, mainChartHeight / 2);
      }
      break;
    }

    case 'trendline': {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      if (isSelected) {
        drawHandle(ctx, x1, y1);
        drawHandle(ctx, x2, y2);
      } else {
        drawDot(ctx, x1, y1, baseColor);
        drawDot(ctx, x2, y2, baseColor);
      }
      break;
    }

    case 'ray': {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      const eq = getLineEquation(x1, y1, x2, y2);
      if (eq.isVertical) {
        ctx.lineTo(x1, y2 > y1 ? mainChartHeight : 0);
      } else {
        const destX = x2 >= x1 ? chartWidth : 0;
        const destY = eq.m * destX + eq.b;
        ctx.lineTo(destX, destY);
      }
      ctx.stroke();
      if (isSelected) {
        drawHandle(ctx, x1, y1);
        drawHandle(ctx, x2, y2);
      }
      break;
    }

    case 'extended': {
      ctx.beginPath();
      const eq = getLineEquation(x1, y1, x2, y2);
      if (eq.isVertical) {
        ctx.moveTo(x1, 0);
        ctx.lineTo(x1, mainChartHeight);
      } else {
        const yAt0 = eq.m * 0 + eq.b;
        const yAtW = eq.m * chartWidth + eq.b;
        ctx.moveTo(0, yAt0);
        ctx.lineTo(chartWidth, yAtW);
      }
      ctx.stroke();
      if (isSelected) {
        drawHandle(ctx, x1, y1);
        drawHandle(ctx, x2, y2);
      }
      break;
    }

    case 'channel': {
      // Base line: (x1, y1) to (x2, y2)
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Parallel line shifted by p3
      const x3 = getX(p3.time);
      const y3 = getY(p3.price);
      const offsetY = y3 - y1;
      const offsetX = x3 - x1;

      const px1 = x1 + offsetX;
      const py1 = y1 + offsetY;
      const px2 = x2 + offsetX;
      const py2 = y2 + offsetY;

      ctx.beginPath();
      ctx.moveTo(px1, py1);
      ctx.lineTo(px2, py2);
      ctx.stroke();

      // Middle dashed line
      ctx.save();
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = baseColor + '99';
      ctx.beginPath();
      ctx.moveTo((x1 + px1) / 2, (y1 + py1) / 2);
      ctx.lineTo((x2 + px2) / 2, (y2 + py2) / 2);
      ctx.stroke();
      ctx.restore();

      // Translucent channel fill
      ctx.save();
      ctx.fillStyle = baseColor + '18';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(px2, py2);
      ctx.lineTo(px1, py1);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      if (isSelected) {
        drawHandle(ctx, x1, y1);
        drawHandle(ctx, x2, y2);
        drawHandle(ctx, px1, py1);
      }
      break;
    }

    case 'arrow': {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Arrowhead at (x2, y2)
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const arrowHeadLen = 10;
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(
        x2 - arrowHeadLen * Math.cos(angle - Math.PI / 6),
        y2 - arrowHeadLen * Math.sin(angle - Math.PI / 6)
      );
      ctx.moveTo(x2, y2);
      ctx.lineTo(
        x2 - arrowHeadLen * Math.cos(angle + Math.PI / 6),
        y2 - arrowHeadLen * Math.sin(angle + Math.PI / 6)
      );
      ctx.stroke();

      if (isSelected) {
        drawHandle(ctx, x1, y1);
        drawHandle(ctx, x2, y2);
      }
      break;
    }

    case 'text': {
      const labelText = d.text || 'نص توضيحي';
      ctx.font = 'bold 12px sans-serif';
      const textMetrics = ctx.measureText(labelText);
      const tw = textMetrics.width + 12;
      const th = 22;

      ctx.fillStyle = '#0F172A';
      ctx.strokeStyle = baseColor;
      ctx.lineWidth = 1;
      ctx.fillRect(x1 - 4, y1 - th + 4, tw, th);
      ctx.strokeRect(x1 - 4, y1 - th + 4, tw, th);

      ctx.fillStyle = '#E2E8F0';
      ctx.fillText(labelText, x1 + 2, y1 - 2);

      if (isSelected) {
        drawHandle(ctx, x1, y1);
      }
      break;
    }

    case 'box': {
      const left = Math.min(x1, x2);
      const top = Math.min(y1, y2);
      const w = Math.abs(x2 - x1);
      const h = Math.abs(y2 - y1);

      ctx.fillStyle = baseColor + '18';
      ctx.fillRect(left, top, w, h);
      ctx.strokeRect(left, top, w, h);

      if (isSelected) {
        drawHandle(ctx, x1, y1);
        drawHandle(ctx, x2, y2);
      }
      break;
    }

    case 'fibonacci': {
      const diff = p2.price - p1.price;
      const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];

      // Base connecting line
      ctx.save();
      ctx.strokeStyle = isSelected ? '#2DD4BF' : 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();

      levels.forEach((lvl) => {
        const lvlPrice = p1.price + diff * lvl;
        const y = getY(lvlPrice);
        const isGolden = lvl === 0.5 || lvl === 0.618;

        ctx.strokeStyle = isGolden ? '#F59E0B' : (isSelected ? '#2DD4BF' : 'rgba(163, 180, 208, 0.6)');
        ctx.lineWidth = isGolden ? 1.8 : 1;
        ctx.setLineDash(isGolden ? [4, 2] : [2, 3]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(chartWidth, y);
        ctx.stroke();

        ctx.fillStyle = isGolden ? '#FBBF24' : '#A3B4D0';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`Fib ${(lvl * 100).toFixed(1)}% (${lvlPrice.toFixed(precision)})`, 10, y - 3);
      });

      if (isSelected) {
        drawHandle(ctx, x1, y1);
        drawHandle(ctx, x2, y2);
      }
      break;
    }

    case 'price_range':
    case 'measure': {
      const left = Math.min(x1, x2);
      const top = Math.min(y1, y2);
      const w = Math.abs(x2 - x1);
      const h = Math.abs(y2 - y1);
      const pips = Math.abs(p2.price - p1.price) / (pipScale || 0.0001);
      const pct = p1.price ? ((p2.price - p1.price) / p1.price) * 100 : 0;

      ctx.fillStyle = pct >= 0 ? 'rgba(34, 197, 94, 0.16)' : 'rgba(239, 68, 68, 0.16)';
      ctx.fillRect(left, top, w, h);
      ctx.strokeStyle = pct >= 0 ? '#22C55E' : '#EF4444';
      ctx.strokeRect(left, top, w, h);

      const tagText = `Δ ${pips.toFixed(1)} Pips | ${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(left + 4, top + 4, 135, 20);
      ctx.strokeStyle = pct >= 0 ? '#22C55E' : '#EF4444';
      ctx.strokeRect(left + 4, top + 4, 135, 20);

      ctx.fillStyle = pct >= 0 ? '#4ADE80' : '#F87171';
      ctx.font = 'bold 9.5px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(tagText, left + 8, top + 17);

      if (isSelected) {
        drawHandle(ctx, x1, y1);
        drawHandle(ctx, x2, y2);
      }
      break;
    }

    case 'date_range': {
      const left = Math.min(x1, x2);
      const top = Math.min(y1, y2);
      const w = Math.abs(x2 - x1);
      const h = Math.abs(y2 - y1);
      const timeDiff = Math.abs(p2.time - p1.time);
      const days = (timeDiff / 86400).toFixed(1);

      ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.fillRect(left, top, w, h);
      ctx.strokeStyle = '#38BDF8';
      ctx.strokeRect(left, top, w, h);

      const tagText = `المدة: ${days} يوم (${timeDiff}s)`;
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(left + 4, top + 4, 120, 20);
      ctx.fillStyle = '#38BDF8';
      ctx.font = 'bold 9.5px sans-serif';
      ctx.fillText(tagText, left + 8, top + 17);

      if (isSelected) {
        drawHandle(ctx, x1, y1);
        drawHandle(ctx, x2, y2);
      }
      break;
    }

    case 'position_long':
    case 'position_short': {
      const isLong = d.type === 'position_long';
      const entryPrice = p1.price;
      const targetPrice = p2.price;
      // Stop loss is calculated or placed symmetrically or stored in extra
      const slPrice = d.extra?.stopLoss ?? (isLong ? entryPrice - (targetPrice - entryPrice) * 0.5 : entryPrice + (entryPrice - targetPrice) * 0.5);

      const entryY = getY(entryPrice);
      const targetY = getY(targetPrice);
      const slY = getY(slPrice);

      const widthPx = Math.max(120, Math.abs(x2 - x1) || 160);
      const left = Math.min(x1, x2);

      const targetPips = Math.abs(targetPrice - entryPrice) / (pipScale || 0.0001);
      const slPips = Math.abs(entryPrice - slPrice) / (pipScale || 0.0001);
      const rrRatio = slPips > 0 ? (targetPips / slPips).toFixed(2) : '1.00';

      // TP Box (Green)
      const tpTop = isLong ? targetY : entryY;
      const tpH = isLong ? Math.abs(entryY - targetY) : Math.abs(targetY - entryY);
      ctx.fillStyle = 'rgba(34, 197, 94, 0.2)';
      ctx.fillRect(left, tpTop, widthPx, tpH);
      ctx.strokeStyle = '#22C55E';
      ctx.strokeRect(left, tpTop, widthPx, tpH);

      // SL Box (Red)
      const slTop = isLong ? entryY : slY;
      const slH = isLong ? Math.abs(slY - entryY) : Math.abs(entryY - slY);
      ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
      ctx.fillRect(left, slTop, widthPx, slH);
      ctx.strokeStyle = '#EF4444';
      ctx.strokeRect(left, slTop, widthPx, slH);

      // Entry Middle Line
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(left, entryY);
      ctx.lineTo(left + widthPx, entryY);
      ctx.stroke();

      // Info Badge
      const badgeText = `${isLong ? 'شراء Long' : 'بيع Short'} | R:R = 1:${rrRatio} | TP: +${targetPips.toFixed(1)}p | SL: -${slPips.toFixed(1)}p`;
      ctx.fillStyle = '#0B1220';
      ctx.fillRect(left, entryY - 11, widthPx, 22);
      ctx.strokeStyle = '#475569';
      ctx.strokeRect(left, entryY - 11, widthPx, 22);
      ctx.fillStyle = '#E2E8F0';
      ctx.font = 'bold 9.5px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(badgeText, left + widthPx / 2, entryY + 4);

      if (isSelected) {
        drawHandle(ctx, left + widthPx / 2, entryY);
        drawHandle(ctx, left + widthPx / 2, targetY);
        drawHandle(ctx, left + widthPx / 2, slY);
      }
      break;
    }
  }

  ctx.restore();
}

function drawHandle(ctx: CanvasRenderingContext2D, x: number, y: number) {
  ctx.save();
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#2DD4BF';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, 4.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawDot(ctx: CanvasRenderingContext2D, x: number, y: number, color: string) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
