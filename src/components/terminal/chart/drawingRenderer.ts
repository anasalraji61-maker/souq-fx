import { DrawingItem } from '../../../types/market';

export interface ChartDrawingTemplate {
  name: string;
  created_at: string;
  drawings: DrawingItem[];
}

export function renderDrawings(
  ctx: CanvasRenderingContext2D,
  drawings: DrawingItem[],
  chartWidth: number,
  getY: (val: number) => number,
  precision: number,
  getX: (time: number) => number,
  selectedDrawingId?: string | null,
  pipScale: number = 0.0001
) {
  drawings.forEach((d) => {
    ctx.save();
    const isSelected = selectedDrawingId === d.id;
    ctx.strokeStyle = d.color || '#2DD4BF';
    ctx.lineWidth = isSelected ? 2.2 : 1.5;

    if (d.type === 'horizontal' && d.points.length > 0) {
      const price = d.points[0].price;
      const y = getY(price);

      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      // Price Tag Label on the right axis
      const tagWidth = Math.max(56, precision * 8 + 24);
      ctx.fillStyle = isSelected ? '#2DD4BF' : (d.color || '#F59E0B');
      ctx.fillRect(chartWidth + 1, y - 9, tagWidth, 18);
      ctx.fillStyle = '#050B14';
      ctx.font = 'bold 9.5px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(price.toFixed(precision), chartWidth + 5, y + 3.5);

      if (isSelected) {
        // Draw handle on horizontal line at center/anchor
        const handleX = d.points[0].time ? getX(d.points[0].time) : chartWidth / 2;
        drawHandle(ctx, handleX, y);
      }
    } else if (d.type === 'fibonacci' && d.points.length >= 2) {
      const p1 = d.points[0];
      const p2 = d.points[1];
      const diff = p2.price - p1.price;
      const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
      const x1 = getX(p1.time);
      const x2 = getX(p2.time);
      const y1 = getY(p1.price);
      const y2 = getY(p2.price);

      // Base anchor line
      ctx.save();
      ctx.strokeStyle = isSelected ? '#2DD4BF' : 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.restore();

      fibLevels.forEach((lvl) => {
        const lvlPrice = p1.price + diff * lvl;
        const lvlY = getY(lvlPrice);
        const isGolden = lvl === 0.5 || lvl === 0.618;

        ctx.strokeStyle = isGolden ? '#F59E0B' : (isSelected ? '#2DD4BF' : 'rgba(163, 180, 208, 0.6)');
        ctx.lineWidth = isGolden ? 1.8 : 1;
        ctx.setLineDash(isGolden ? [4, 2] : [2, 3]);
        ctx.beginPath();
        ctx.moveTo(0, lvlY);
        ctx.lineTo(chartWidth, lvlY);
        ctx.stroke();

        ctx.fillStyle = isGolden ? '#FBBF24' : '#A3B4D0';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`Fib ${(lvl * 100).toFixed(1)}% (${lvlPrice.toFixed(precision)})`, 10, lvlY - 3);
      });

      if (isSelected) {
        drawHandle(ctx, x1, y1);
        drawHandle(ctx, x2, y2);
      }
    } else if (d.type === 'trendline' && d.points.length >= 2) {
      const p1 = d.points[0];
      const p2 = d.points[1];
      const y1 = getY(p1.price);
      const y2 = getY(p2.price);
      const x1 = getX(p1.time);
      const x2 = getX(p2.time);

      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      if (isSelected) {
        drawHandle(ctx, x1, y1);
        drawHandle(ctx, x2, y2);
      } else {
        // Subtle endpoint dots
        ctx.fillStyle = d.color || '#2DD4BF';
        ctx.beginPath();
        ctx.arc(x1, y1, 2.5, 0, Math.PI * 2);
        ctx.arc(x2, y2, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    } else if (d.type === 'box' && d.points.length >= 2) {
      const p1 = d.points[0];
      const p2 = d.points[1];
      const y1 = getY(p1.price);
      const y2 = getY(p2.price);
      const x1 = getX(p1.time);
      const x2 = getX(p2.time);

      const left = Math.min(x1, x2);
      const top = Math.min(y1, y2);
      const w = Math.abs(x2 - x1);
      const h = Math.abs(y2 - y1);

      ctx.fillStyle = isSelected ? 'rgba(45, 212, 191, 0.22)' : 'rgba(45, 212, 191, 0.12)';
      ctx.fillRect(left, top, w, h);
      ctx.strokeStyle = isSelected ? '#2DD4BF' : (d.color || '#2DD4BF');
      ctx.strokeRect(left, top, w, h);

      if (isSelected) {
        drawHandle(ctx, x1, y1);
        drawHandle(ctx, x2, y2);
      }
    } else if (d.type === 'measure' && d.points.length >= 2) {
      const p1 = d.points[0];
      const p2 = d.points[1];
      const pips = Math.abs(p2.price - p1.price) / (pipScale || 0.0001);
      const pct = p1.price ? ((p2.price - p1.price) / p1.price) * 100 : 0;
      const y1 = getY(p1.price);
      const y2 = getY(p2.price);
      const x1 = getX(p1.time);
      const x2 = getX(p2.time);

      const left = Math.min(x1, x2);
      const top = Math.min(y1, y2);
      const w = Math.abs(x2 - x1);
      const h = Math.abs(y2 - y1);

      ctx.fillStyle = pct >= 0 ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)';
      ctx.fillRect(left, top, w, h);
      ctx.strokeStyle = pct >= 0 ? '#22C55E' : '#EF4444';
      ctx.strokeRect(left, top, w, h);

      // Measurement tag
      const tagText = `Δ ${pips.toFixed(1)} Pips | ${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(left + 4, top + 4, 130, 20);
      ctx.strokeStyle = pct >= 0 ? '#22C55E' : '#EF4444';
      ctx.strokeRect(left + 4, top + 4, 130, 20);

      ctx.fillStyle = pct >= 0 ? '#4ADE80' : '#F87171';
      ctx.font = 'bold 9.5px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(tagText, left + 8, top + 17);

      if (isSelected) {
        drawHandle(ctx, x1, y1);
        drawHandle(ctx, x2, y2);
      }
    }

    ctx.restore();
  });
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
