import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Candle, Timeframe, ChartType, IndicatorSettings, DrawingTool, DrawingItem } from '../../types/market';
import { calculateSMA, calculateBollingerBands, calculateRSI, calculateMACD } from '../../data/indicators';
import { colors } from '../../theme';
import { Maximize2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

interface MatrixChartCanvasProps {
  symbol: string;
  candles: Candle[];
  timeframe: Timeframe;
  precision: number;
  pipScale: number;
  chartType: ChartType;
  indicators: IndicatorSettings;
  activeDrawingTool: DrawingTool;
  onDrawingComplete?: (drawing: DrawingItem) => void;
  drawings: DrawingItem[];
  onClearDrawings: () => void;
  showGrid?: boolean;
}

export const MatrixChartCanvas: React.FC<MatrixChartCanvasProps> = ({
  symbol,
  candles,
  timeframe,
  precision,
  pipScale,
  chartType,
  indicators,
  activeDrawingTool,
  onDrawingComplete,
  drawings,
  showGrid = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // View state: how many candles to display and offset from latest
  const [visibleCount, setVisibleCount] = useState(70);
  const [panOffset, setPanOffset] = useState(0); // 0 = anchored to rightmost (latest)
  const [crosshair, setCrosshair] = useState<{ x: number; y: number; candle: Candle | null; price: number } | null>(null);

  // Dragging for Pan
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartOffsetRef = useRef(0);
  const priceRangeRef = useRef<{ minPrice: number; adjustedRange: number; mainChartHeight: number; maxPrice: number }>({
    minPrice: 0,
    adjustedRange: 1,
    mainChartHeight: 400,
    maxPrice: 1,
  });

  // Drawing state
  const [tempDrawing, setTempDrawing] = useState<{ startX: number; startY: number; currX: number; currY: number } | null>(null);

  // Handle Resize with ResizeObserver for exact container tracking
  const [dimensions, setDimensions] = useState({ width: 400, height: 350 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({
            width: Math.floor(width),
            height: Math.floor(height),
          });
        }
      }
    });

    observer.observe(el);

    // Initial check
    if (el.clientWidth > 0 && el.clientHeight > 0) {
      setDimensions({
        width: Math.floor(el.clientWidth),
        height: Math.floor(el.clientHeight),
      });
    }

    return () => observer.disconnect();
  }, []);

  // Main Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Support Retina displays
    const dpr = window.devicePixelRatio || 1;
    canvas.width = dimensions.width * dpr;
    canvas.height = dimensions.height * dpr;
    ctx.scale(dpr, dpr);

    const width = dimensions.width;
    const height = dimensions.height;

    // Layout partitioning
    const priceScaleWidth = 68;
    const timeScaleHeight = 24;
    const chartWidth = width - priceScaleWidth;
    
    // Sub-pane allocations
    let subPaneCount = 0;
    if (indicators.showRsi) subPaneCount++;
    if (indicators.showMacd) subPaneCount++;

    const subPaneHeight = subPaneCount > 0 ? Math.min(100, (height - timeScaleHeight) * 0.22) : 0;
    const mainChartHeight = height - timeScaleHeight - subPaneCount * subPaneHeight;

    // Slice candles to display
    const totalCandles = candles.length;
    const endIndex = Math.min(totalCandles, totalCandles - panOffset);
    const startIndex = Math.max(0, endIndex - visibleCount);
    const displayedCandles = candles.slice(startIndex, endIndex);

    if (displayedCandles.length === 0) return;

    // Determine price range
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    displayedCandles.forEach((c) => {
      minPrice = Math.min(minPrice, c.low);
      maxPrice = Math.max(maxPrice, c.high);
    });

    // Add padding to price range
    const priceRange = maxPrice - minPrice || 0.001;
    const pricePadding = priceRange * 0.08;
    minPrice -= pricePadding;
    maxPrice += pricePadding;
    const adjustedRange = maxPrice - minPrice;
    priceRangeRef.current = { minPrice, adjustedRange, mainChartHeight, maxPrice };

    // Coordinate conversion helpers
    const candleWidth = chartWidth / displayedCandles.length;
    const getX = (index: number) => index * candleWidth + candleWidth / 2;
    const getY = (price: number) => mainChartHeight - ((price - minPrice) / adjustedRange) * mainChartHeight;
    const getPriceFromY = (y: number) => maxPrice - (y / mainChartHeight) * adjustedRange;

    // Background
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);

    // 1. Grid
    if (showGrid) {
      ctx.strokeStyle = '#182337';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 4]);

      // Horizontal price lines
      const gridSteps = 6;
      for (let i = 0; i <= gridSteps; i++) {
        const y = (mainChartHeight / gridSteps) * i;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(chartWidth, y);
        ctx.stroke();

        // Price label on right
        const p = getPriceFromY(y);
        ctx.fillStyle = colors.textDim;
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(p.toFixed(precision), chartWidth + 6, y + 3);
      }

      // Vertical time lines
      const timeSteps = Math.max(3, Math.floor(chartWidth / 120));
      for (let i = 0; i <= timeSteps; i++) {
        const x = (chartWidth / timeSteps) * i;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height - timeScaleHeight);
        ctx.stroke();

        const candleIdx = Math.floor(x / candleWidth);
        if (displayedCandles[candleIdx]) {
          const d = new Date(displayedCandles[candleIdx].time * 1000);
          const timeStr = timeframe === '1D' 
            ? `${d.getMonth() + 1}/${d.getDate()}`
            : `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
          ctx.fillStyle = colors.textDim;
          ctx.font = '10px monospace';
          ctx.textAlign = 'center';
          ctx.fillText(timeStr, x, height - 6);
        }
      }
      ctx.setLineDash([]);
    }

    // Watermark in center of chart (as in Claude handoff shots: e.g. USDJPY 4H, EURUSD 15m)
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.045)';
    ctx.font = 'bold 40px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${symbol} ${timeframe}`, chartWidth / 2, mainChartHeight / 2);
    ctx.restore();

    // 2. Volume Bars at Bottom of Main Chart
    if (indicators.showVolume) {
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

    // 3. Technical Indicator Overlays
    // Moving Averages
    if (indicators.showSma20) {
      const sma20 = calculateSMA(candles, 20).slice(startIndex, endIndex);
      drawIndicatorLine(ctx, sma20, getX, getY, '#2DD4BF', 1.5);
    }
    if (indicators.showSma50) {
      const sma50 = calculateSMA(candles, 50).slice(startIndex, endIndex);
      drawIndicatorLine(ctx, sma50, getX, getY, '#F59E0B', 1.5);
    }
    if (indicators.showSma200) {
      const sma200 = calculateSMA(candles, 200).slice(startIndex, endIndex);
      drawIndicatorLine(ctx, sma200, getX, getY, '#A78BFA', 2);
    }

    // Bollinger Bands
    if (indicators.showBollinger) {
      const { upper, lower, middle } = calculateBollingerBands(candles, 20, 2);
      const uSlice = upper.slice(startIndex, endIndex);
      const lSlice = lower.slice(startIndex, endIndex);
      const mSlice = middle.slice(startIndex, endIndex);

      drawIndicatorLine(ctx, mSlice, getX, getY, '#38BDF8', 1, [3, 3]);
      drawIndicatorLine(ctx, uSlice, getX, getY, 'rgba(56, 189, 248, 0.7)', 1.5);
      drawIndicatorLine(ctx, lSlice, getX, getY, 'rgba(56, 189, 248, 0.7)', 1.5);
    }

    // 4. Candlesticks / Line / Area
    if (chartType === 'candles') {
      displayedCandles.forEach((candle, i) => {
        const x = getX(i);
        const yOpen = getY(candle.open);
        const yClose = getY(candle.close);
        const yHigh = getY(candle.high);
        const yLow = getY(candle.low);
        const isUp = candle.close >= candle.open;

        ctx.strokeStyle = isUp ? colors.bull : colors.bear;
        ctx.fillStyle = isUp ? colors.bull : colors.bear;
        ctx.lineWidth = 1;

        // Wick
        ctx.beginPath();
        ctx.moveTo(Math.floor(x) + 0.5, Math.floor(yHigh));
        ctx.lineTo(Math.floor(x) + 0.5, Math.floor(yLow));
        ctx.stroke();

        // Body
        const bodyTop = Math.min(yOpen, yClose);
        const bodyHeight = Math.max(1.5, Math.abs(yOpen - yClose));
        const bodyWidth = Math.max(2, candleWidth * 0.72);
        const bodyLeft = x - bodyWidth / 2;

        ctx.fillRect(Math.floor(bodyLeft), Math.floor(bodyTop), Math.floor(bodyWidth), Math.floor(bodyHeight));
      });
    } else if (chartType === 'line' || chartType === 'area') {
      ctx.beginPath();
      displayedCandles.forEach((c, i) => {
        const x = getX(i);
        const y = getY(c.close);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 2;
      ctx.stroke();

      if (chartType === 'area') {
        ctx.lineTo(getX(displayedCandles.length - 1), mainChartHeight);
        ctx.lineTo(getX(0), mainChartHeight);
        ctx.closePath();
        const gradient = ctx.createLinearGradient(0, 0, 0, mainChartHeight);
        gradient.addColorStop(0, 'rgba(45, 212, 191, 0.28)');
        gradient.addColorStop(1, 'rgba(45, 212, 191, 0.0)');
        ctx.fillStyle = gradient;
        ctx.fill();
      }
    }

    // 5. Current Price Line and Badge
    const latestCandle = displayedCandles[displayedCandles.length - 1];
    if (latestCandle) {
      const currentY = getY(latestCandle.close);
      const isUp = latestCandle.close >= latestCandle.open;
      const themeColor = isUp ? colors.bull : colors.bear;

      // Dashed horizontal line across chart
      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(0, currentY);
      ctx.lineTo(chartWidth, currentY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Glowing Badge on price scale
      ctx.fillStyle = themeColor;
      ctx.fillRect(chartWidth + 1, currentY - 10, priceScaleWidth - 2, 20);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(latestCandle.close.toFixed(precision), chartWidth + priceScaleWidth / 2, currentY + 3.5);
    }

    // 6. Sub-pane: RSI (if active)
    let currentPaneY = mainChartHeight;
    if (indicators.showRsi) {
      drawRsiSubPane(ctx, candles, startIndex, endIndex, chartWidth, currentPaneY, subPaneHeight, getX);
      currentPaneY += subPaneHeight;
    }

    // 7. Sub-pane: MACD (if active)
    if (indicators.showMacd) {
      drawMacdSubPane(ctx, candles, startIndex, endIndex, chartWidth, currentPaneY, subPaneHeight, getX);
      currentPaneY += subPaneHeight;
    }

    // 8. Completed Drawings
    drawings.forEach((d) => {
      drawUserAnnotation(ctx, d, getX, getY, displayedCandles, startIndex);
    });

    // 9. Temporary active drawing preview
    if (tempDrawing) {
      ctx.strokeStyle = colors.accent;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.moveTo(tempDrawing.startX, tempDrawing.startY);
      ctx.lineTo(tempDrawing.currX, tempDrawing.currY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // 10. Crosshair
    if (crosshair && crosshair.x < chartWidth && crosshair.y < mainChartHeight) {
      ctx.strokeStyle = 'rgba(232, 238, 249, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(crosshair.x, 0);
      ctx.lineTo(crosshair.x, height - timeScaleHeight);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(0, crosshair.y);
      ctx.lineTo(chartWidth, crosshair.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Badge on price axis
      const hoveredPrice = getPriceFromY(crosshair.y);
      ctx.fillStyle = '#243049';
      ctx.fillRect(chartWidth + 1, crosshair.y - 10, priceScaleWidth - 2, 20);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(hoveredPrice.toFixed(precision), chartWidth + priceScaleWidth / 2, crosshair.y + 3.5);

      // Badge on time axis
      if (crosshair.candle) {
        const d = new Date(crosshair.candle.time * 1000);
        const timeLabel = `${d.toLocaleDateString()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
        ctx.fillStyle = '#243049';
        ctx.fillRect(crosshair.x - 55, height - timeScaleHeight + 1, 110, 20);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(timeLabel, crosshair.x, height - 6);
      }
    }

    // Right and Bottom dividing borders
    ctx.strokeStyle = colors.border;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(chartWidth, 0);
    ctx.lineTo(chartWidth, height);
    ctx.moveTo(0, height - timeScaleHeight);
    ctx.lineTo(width, height - timeScaleHeight);
    ctx.stroke();

  }, [candles, dimensions, visibleCount, panOffset, crosshair, indicators, chartType, drawings, tempDrawing, showGrid, precision, timeframe]);

  // Helper: Draw Indicator Line
  const drawIndicatorLine = (
    ctx: CanvasRenderingContext2D,
    series: (number | null)[],
    getX: (i: number) => number,
    getY: (price: number) => number,
    color: string,
    width = 1.5,
    dash: number[] = []
  ) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.setLineDash(dash);
    ctx.beginPath();
    let started = false;

    series.forEach((val, i) => {
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
    ctx.setLineDash([]);
  };

  // Helper: Draw RSI Sub-Pane
  const drawRsiSubPane = (
    ctx: CanvasRenderingContext2D,
    candles: Candle[],
    startIndex: number,
    endIndex: number,
    chartWidth: number,
    paneY: number,
    paneHeight: number,
    getX: (i: number) => number
  ) => {
    ctx.fillStyle = '#08111E';
    ctx.fillRect(0, paneY, chartWidth, paneHeight);

    // Overbought (70) and Oversold (30) levels
    const y70 = paneY + paneHeight * 0.3;
    const y50 = paneY + paneHeight * 0.5;
    const y30 = paneY + paneHeight * 0.7;

    ctx.strokeStyle = '#1E293B';
    ctx.setLineDash([2, 3]);
    ctx.beginPath();
    ctx.moveTo(0, y70);
    ctx.lineTo(chartWidth, y70);
    ctx.moveTo(0, y50);
    ctx.lineTo(chartWidth, y50);
    ctx.moveTo(0, y30);
    ctx.lineTo(chartWidth, y30);
    ctx.stroke();
    ctx.setLineDash([]);

    // Level text
    ctx.fillStyle = colors.textDim;
    ctx.font = '9px monospace';
    ctx.fillText('70', 4, y70 - 2);
    ctx.fillText('30', 4, y30 - 2);
    ctx.fillText('RSI (14)', chartWidth - 55, paneY + 12);

    // RSI Line
    const rsiValues = calculateRSI(candles, 14).slice(startIndex, endIndex);
    const getRsiY = (rsi: number) => paneY + paneHeight - (rsi / 100) * paneHeight;

    ctx.strokeStyle = '#A78BFA';
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
  };

  // Helper: Draw MACD Sub-Pane
  const drawMacdSubPane = (
    ctx: CanvasRenderingContext2D,
    candles: Candle[],
    startIndex: number,
    endIndex: number,
    chartWidth: number,
    paneY: number,
    paneHeight: number,
    getX: (i: number) => number
  ) => {
    ctx.fillStyle = '#08111E';
    ctx.fillRect(0, paneY, chartWidth, paneHeight);

    const { macd, signal, histogram } = calculateMACD(candles);
    const macdSlice = macd.slice(startIndex, endIndex);
    const sigSlice = signal.slice(startIndex, endIndex);
    const histSlice = histogram.slice(startIndex, endIndex);

    // Range
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

    // MACD & Signal lines
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
  };

  // Helper: Draw User Annotation
  const drawUserAnnotation = (
    ctx: CanvasRenderingContext2D,
    drawing: DrawingItem,
    _getX: (i: number) => number,
    getY: (price: number) => number,
    _displayedCandles: Candle[],
    _startIndex: number
  ) => {
    ctx.strokeStyle = drawing.color || colors.accent;
    ctx.lineWidth = 1.8;

    if (drawing.type === 'horizontal' && drawing.points[0]) {
      const y = getY(drawing.points[0].price);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(dimensions.width - 68, y);
      ctx.stroke();
      ctx.fillStyle = drawing.color || colors.accent;
      ctx.font = '10px monospace';
      ctx.fillText(`L: ${drawing.points[0].price.toFixed(precision)}`, 10, y - 4);
    } else if (drawing.type === 'trendline' && drawing.points.length >= 2) {
      const y1 = getY(drawing.points[0].price);
      const y2 = getY(drawing.points[1].price);
      // approximate X from time
      const chartWidth = dimensions.width - 68;
      const x1 = Math.max(0, Math.min(chartWidth, (drawing.points[0] as any).screenX || 50));
      const x2 = Math.max(0, Math.min(chartWidth, (drawing.points[1] as any).screenX || chartWidth - 50));
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    } else if (drawing.type === 'box' && drawing.points.length >= 2) {
      const y1 = getY(drawing.points[0].price);
      const y2 = getY(drawing.points[1].price);
      const chartWidth = dimensions.width - 68;
      const x1 = Math.min((drawing.points[0] as any).screenX || 50, (drawing.points[1] as any).screenX || chartWidth - 50);
      const x2 = Math.max((drawing.points[0] as any).screenX || 50, (drawing.points[1] as any).screenX || chartWidth - 50);
      const topY = Math.min(y1, y2);
      const boxH = Math.abs(y2 - y1);
      ctx.fillStyle = 'rgba(45, 212, 191, 0.12)';
      ctx.fillRect(x1, topY, x2 - x1, boxH);
      ctx.strokeRect(x1, topY, x2 - x1, boxH);
    } else if (drawing.type === 'fibonacci' && drawing.points.length >= 2) {
      const p1 = drawing.points[0].price;
      const p2 = drawing.points[1].price;
      const diff = p2 - p1;
      const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
      const chartWidth = dimensions.width - 68;

      levels.forEach((lvl) => {
        const lvlPrice = p1 + diff * lvl;
        const y = getY(lvlPrice);
        ctx.strokeStyle = lvl === 0.5 || lvl === 0.618 ? '#F59E0B' : 'rgba(163, 180, 208, 0.6)';
        ctx.setLineDash([3, 2]);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(chartWidth, y);
        ctx.stroke();
        ctx.fillStyle = lvl === 0.5 || lvl === 0.618 ? '#F59E0B' : '#A3B4D0';
        ctx.font = '9px monospace';
        ctx.fillText(`FIB ${(lvl * 100).toFixed(1)}% (${lvlPrice.toFixed(precision)})`, 10, y - 3);
      });
      ctx.setLineDash([]);
    } else if (drawing.type === 'measure' && drawing.points.length >= 2) {
      const p1 = drawing.points[0].price;
      const p2 = drawing.points[1].price;
      const pips = Math.abs(p2 - p1) / (pipScale || 0.0001);
      const pct = p1 ? ((p2 - p1) / p1) * 100 : 0;
      const y1 = getY(p1);
      const y2 = getY(p2);
      const chartWidth = dimensions.width - 68;
      const x1 = (drawing.points[0] as any).screenX || 50;
      const x2 = (drawing.points[1] as any).screenX || chartWidth - 50;

      ctx.fillStyle = 'rgba(56, 189, 248, 0.15)';
      ctx.fillRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      ctx.strokeStyle = '#38BDF8';
      ctx.strokeRect(Math.min(x1, x2), Math.min(y1, y2), Math.abs(x2 - x1), Math.abs(y2 - y1));
      
      ctx.fillStyle = '#38BDF8';
      ctx.font = 'bold 10px monospace';
      ctx.fillText(`Δ ${pips.toFixed(1)} Pips | ${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`, Math.min(x1, x2) + 6, Math.min(y1, y2) + 14);
    }
  };

  // Mouse & Touch Interaction Handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (activeDrawingTool !== 'none') {
      setTempDrawing({ startX: x, startY: y, currX: x, currY: y });
    } else {
      isDraggingRef.current = true;
      dragStartXRef.current = x;
      dragStartOffsetRef.current = panOffset;
    }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const chartWidth = dimensions.width - 68;
    const totalCandles = candles.length;
    const endIndex = Math.min(totalCandles, totalCandles - panOffset);
    const startIndex = Math.max(0, endIndex - visibleCount);
    const displayed = candles.slice(startIndex, endIndex);

    if (displayed.length > 0 && x >= 0 && x <= chartWidth) {
      const candleWidth = chartWidth / displayed.length;
      const idx = Math.min(displayed.length - 1, Math.max(0, Math.floor(x / candleWidth)));
      const c = displayed[idx];
      setCrosshair({ x, y, candle: c, price: c.close });
    } else {
      setCrosshair(null);
    }

    if (isDraggingRef.current) {
      const deltaX = x - dragStartXRef.current;
      const candleWidth = chartWidth / visibleCount;
      const candleDelta = Math.round(deltaX / candleWidth);
      const newOffset = Math.max(0, Math.min(candles.length - visibleCount, dragStartOffsetRef.current + candleDelta));
      setPanOffset(newOffset);
    }

    if (tempDrawing) {
      setTempDrawing((prev) => (prev ? { ...prev, currX: x, currY: y } : null));
    }
  }, [candles, dimensions.width, panOffset, visibleCount, tempDrawing]);

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    if (tempDrawing && activeDrawingTool !== 'none') {
      const { adjustedRange, mainChartHeight, maxPrice } = priceRangeRef.current;
      const getPrice = (y: number) => maxPrice - (y / (mainChartHeight || 1)) * adjustedRange;
      const price1 = getPrice(tempDrawing.startY);
      const price2 = getPrice(tempDrawing.currY);
      const newDrawing: DrawingItem = {
        id: `draw-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        type: activeDrawingTool,
        points: [
          { time: Date.now(), price: price1, screenX: tempDrawing.startX } as any,
          { time: Date.now(), price: price2, screenX: tempDrawing.currX } as any,
        ],
        color: activeDrawingTool === 'box' ? '#2DD4BF' : activeDrawingTool === 'measure' ? '#38BDF8' : colors.accent,
      };
      if (onDrawingComplete) {
        onDrawingComplete(newDrawing);
      }
      setTempDrawing(null);
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      // Zoom in
      setVisibleCount((prev) => Math.max(25, prev - 5));
    } else {
      // Zoom out
      setVisibleCount((prev) => Math.min(candles.length, prev + 5));
    }
  };

  const resetView = () => {
    setVisibleCount(70);
    setPanOffset(0);
  };

  // Active Candle for HUD
  const hudCandle = crosshair?.candle || candles[candles.length - 1];
  const hudPrevCandle = candles[candles.length - 2];
  const priceChange = hudCandle && hudPrevCandle ? hudCandle.close - hudPrevCandle.close : 0;
  const priceChangePct = hudPrevCandle && hudPrevCandle.close ? (priceChange / hudPrevCandle.close) * 100 : 0;

  return (
    <div ref={containerRef} className="relative w-full h-full flex flex-col bg-[#0B1220] select-none overflow-hidden">
      {/* HUD Header */}
      <div className="absolute top-2 left-3 z-10 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono bg-[#121A2B]/85 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#243049] shadow-md pointer-events-none">
        <span className="font-bold text-[#2DD4BF] tracking-wide text-sm">{symbol}</span>
        <span className="text-[#7B8DA8] uppercase">{timeframe}</span>
        {hudCandle && (
          <>
            <span className="text-[#A3B4D0]">
              O: <strong className="text-[#E8EEF9]">{hudCandle.open.toFixed(precision)}</strong>
            </span>
            <span className="text-[#A3B4D0]">
              H: <strong className="text-[#22C55E]">{hudCandle.high.toFixed(precision)}</strong>
            </span>
            <span className="text-[#A3B4D0]">
              L: <strong className="text-[#EF4444]">{hudCandle.low.toFixed(precision)}</strong>
            </span>
            <span className="text-[#A3B4D0]">
              C: <strong className="text-[#E8EEF9]">{hudCandle.close.toFixed(precision)}</strong>
            </span>
            <span className={`font-semibold ${priceChange >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
              {priceChange >= 0 ? '+' : ''}{priceChange.toFixed(precision)} ({priceChangePct.toFixed(2)}%)
            </span>
            <span className="text-[#7B8DA8]">
              Vol: {hudCandle.volume.toLocaleString()}
            </span>
          </>
        )}
      </div>

      {/* Floating Canvas Controls */}
      <div className="absolute top-2 right-20 z-10 flex items-center gap-1 bg-[#121A2B]/80 backdrop-blur border border-[#243049] rounded-md p-1 shadow">
        <button
          onClick={() => setVisibleCount((prev) => Math.max(25, prev - 10))}
          title="تكبير (Zoom In)"
          className="p-1 hover:bg-[#1C2740] rounded text-[#A3B4D0] hover:text-[#E8EEF9] transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setVisibleCount((prev) => Math.min(candles.length, prev + 10))}
          title="تصغير (Zoom Out)"
          className="p-1 hover:bg-[#1C2740] rounded text-[#A3B4D0] hover:text-[#E8EEF9] transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={resetView}
          title="إعادة ضبط العرض"
          className="p-1 hover:bg-[#1C2740] rounded text-[#A3B4D0] hover:text-[#E8EEF9] transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{ width: dimensions.width, height: dimensions.height }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          isDraggingRef.current = false;
          setCrosshair(null);
        }}
        onWheel={handleWheel}
        className="cursor-crosshair w-full h-full block"
      />
    </div>
  );
};
