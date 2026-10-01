import { DrawingItem } from '../../../types/market';

export function renderDrawings(
  ctx: CanvasRenderingContext2D,
  drawings: DrawingItem[],
  chartWidth: number,
  getY: (val: number) => number,
  precision: number
) {
  drawings.forEach((d) => {
    ctx.save();
    ctx.strokeStyle = d.color || '#F59E0B';
    ctx.lineWidth = 1.5;

    if (d.type === 'horizontal' && d.points.length > 0) {
      const price = d.points[0].price;
      const y = getY(price);
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      // Price Tag Label
      ctx.fillStyle = d.color || '#F59E0B';
      ctx.fillRect(chartWidth + 1, y - 9, 58, 18);
      ctx.fillStyle = '#050B14';
      ctx.font = 'bold 9px monospace';
      ctx.fillText(price.toFixed(precision), chartWidth + 5, y + 3);
    } else if (d.type === 'fibonacci' && d.points.length >= 2) {
      const p1 = d.points[0];
      const p2 = d.points[1];
      const y1 = getY(p1.price);
      const y2 = getY(p2.price);
      const diff = p2.price - p1.price;
      const fibLevels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

      fibLevels.forEach((lvl) => {
        const lvlPrice = p1.price + diff * lvl;
        const lvlY = getY(lvlPrice);
        ctx.strokeStyle = lvl === 0.618 || lvl === 0.5 ? '#2DD4BF' : 'rgba(255,255,255,0.3)';
        ctx.setLineDash([2, 3]);
        ctx.beginPath();
        ctx.moveTo(0, lvlY);
        ctx.lineTo(chartWidth, lvlY);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '9px monospace';
        ctx.fillText(`Fib ${(lvl * 100).toFixed(1)}% (${lvlPrice.toFixed(precision)})`, 10, lvlY - 3);
      });
    }

    ctx.restore();
  });
}
