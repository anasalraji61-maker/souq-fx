import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  Candle,
  Timeframe,
  ChartType,
  IndicatorSettings,
  DrawingTool,
  DrawingItem,
  IndicatorInstance,
} from '../../types/market';
import { colors } from '../../theme';
import { ZoomIn, ZoomOut, RotateCcw, Eye, EyeOff, Settings, X, ChevronsRight, Magnet, Bell } from 'lucide-react';
import { TIMEFRAME_SECONDS } from '../../data/candleGenerator';
import {
  calculatePriceRange,
  priceToY,
  yToPrice,
  timeToChartX,
  chartXToTime,
  distanceToSegment,
} from './chart/chartMath';
import { renderCandlesOrStyle } from './chart/candleRenderer';
import { renderMainIndicatorInstances, renderIndicatorOverlays, renderVolumeBars } from './chart/indicatorRenderer';
import { renderSubPane } from './chart/subPanes';
import { renderExtendedDrawing } from './chart/extendedDrawingRenderer';
import { DrawingStyleBar } from './chart/DrawingStyleBar';
import { getCandleCountdown } from './chart/candleMath';
import {
  calculateSMA,
  calculateEMA,
  calculateWMA,
  calculateBollingerBands,
  calculateVWAP,
  calculateParabolicSAR,
  calculateRSI,
  calculateMACD,
  calculateStochastic,
  calculateATR,
  calculateADX,
  calculateCCI,
  calculateOBV,
} from '../../data/indicators';

export interface MatrixChartCanvasProps {
  symbol: string;
  candles: Candle[];
  timeframe: Timeframe;
  precision: number;
  pipScale: number;
  chartType: ChartType;
  indicators: IndicatorSettings;
  indicatorInstances?: IndicatorInstance[];
  onUpdateIndicatorInstance?: (ind: IndicatorInstance) => void;
  onRemoveIndicatorInstance?: (id: string) => void;
  onOpenIndicatorSettings?: (ind: IndicatorInstance) => void;
  activeDrawingTool: DrawingTool;
  onDrawingComplete?: (drawing: DrawingItem) => void;
  drawings: DrawingItem[];
  onClearDrawings: () => void;
  onUpdateDrawing?: (drawing: DrawingItem) => void;
  onDeleteDrawing?: (drawingId: string) => void;
  onResetActiveTool?: () => void;
  onFocusCell?: () => void;
  showGrid?: boolean;
  magnetMode?: boolean;
  onOpenAlertModal?: (targetPrice?: number) => void;
  syncedCrosshairTime?: number | null;
  onCrosshairTimeChange?: (time: number | null) => void;
  isDemo?: boolean;
}

interface ChartTransformState {
  adjustedMin: number;
  adjustedMax: number;
  adjustedRange: number;
  mainChartHeight: number;
  chartWidth: number;
  candleWidth: number;
  displayedCandles: Candle[];
  intervalSeconds: number;
  startIndex: number;
}

const MatrixChartCanvasComponent: React.FC<MatrixChartCanvasProps> = ({
  symbol,
  candles,
  timeframe,
  precision,
  pipScale,
  chartType,
  indicators,
  indicatorInstances = [],
  onUpdateIndicatorInstance,
  onRemoveIndicatorInstance,
  onOpenIndicatorSettings,
  activeDrawingTool,
  onDrawingComplete,
  drawings,
  onClearDrawings,
  onUpdateDrawing,
  onDeleteDrawing,
  onResetActiveTool,
  onFocusCell,
  showGrid = true,
  magnetMode = false,
  onOpenAlertModal,
  syncedCrosshairTime,
  onCrosshairTimeChange,
  isDemo = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // View state: visible candles count and pan offset
  const [visibleCount, setVisibleCount] = useState(70);
  const [panOffset, setPanOffset] = useState(0); // 0 = anchored to latest candle
  const [crosshair, setCrosshair] = useState<{
    x: number;
    y: number;
    candle: Candle | null;
    price: number;
  } | null>(null);

  // Price scale stretch factor (drag on price scale to adjust height)
  const [priceScaleStretch, setPriceScaleStretch] = useState(1.0);
  const [isDraggingPriceScale, setIsDraggingPriceScale] = useState(false);
  const priceDragStartYRef = useRef(0);
  const priceDragStartStretchRef = useRef(1.0);

  // Log scale toggle
  const [isLogScale, setIsLogScale] = useState(false);

  // Selection & Edit state
  const [selectedDrawingId, setSelectedDrawingId] = useState<string | null>(null);

  // Undo / Redo history stack for drawings
  const historyStackRef = useRef<DrawingItem[][]>([]);
  const historyIndexRef = useRef<number>(-1);

  // Track drawings changes to history
  useEffect(() => {
    if (historyIndexRef.current === -1 || historyStackRef.current[historyIndexRef.current] !== drawings) {
      historyStackRef.current = historyStackRef.current.slice(0, historyIndexRef.current + 1);
      historyStackRef.current.push(drawings);
      historyIndexRef.current = historyStackRef.current.length - 1;
    }
  }, [drawings]);

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current > 0) {
      historyIndexRef.current -= 1;
      const prev = historyStackRef.current[historyIndexRef.current];
      onClearDrawings();
      prev.forEach((d) => onDrawingComplete?.(d));
    }
  }, [onDrawingComplete, onClearDrawings]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current < historyStackRef.current.length - 1) {
      historyIndexRef.current += 1;
      const next = historyStackRef.current[historyIndexRef.current];
      drawings.forEach((d) => onDeleteDrawing?.(d.id));
      next.forEach((d) => onDrawingComplete?.(d));
    }
  }, [drawings, onDeleteDrawing, onDrawingComplete]);

  // Keyboard shortcuts (Delete, Ctrl+Z, Ctrl+Y, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedDrawingId) {
        e.preventDefault();
        onDeleteDrawing?.(selectedDrawingId);
        setSelectedDrawingId(null);
      } else if (e.key === 'Escape') {
        setSelectedDrawingId(null);
        onResetActiveTool?.();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDrawingId, onDeleteDrawing, onResetActiveTool, handleUndo, handleRedo]);

  // Dragging states
  const isDraggingRef = useRef(false);
  const dragStartXRef = useRef(0);
  const dragStartOffsetRef = useRef(0);

  const dragHandleRef = useRef<{ drawingId: string; handleIndex: number } | null>(null);
  const dragBodyRef = useRef<{
    drawingId: string;
    startX: number;
    startY: number;
    initialPoints: { time: number; price: number }[];
  } | null>(null);

  // Drawing state (in-progress temporary preview)
  const [tempDrawing, setTempDrawing] = useState<{
    startX: number;
    startY: number;
    currX: number;
    currY: number;
    extraPoints?: { x: number; y: number }[];
  } | null>(null);

  // Transform state for pointer event conversions
  const transformRef = useRef<ChartTransformState>({
    adjustedMin: 0,
    adjustedMax: 1,
    adjustedRange: 1,
    mainChartHeight: 400,
    chartWidth: 400,
    candleWidth: 10,
    displayedCandles: [],
    intervalSeconds: 60,
    startIndex: 0,
  });

  // Handle Resize with ResizeObserver
  const [dimensions, setDimensions] = useState({ width: 400, height: 350 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setDimensions({ width, height });
        }
      }
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Compute closed candle indicators values for Legend (1.8 useMemo closed-candle rule)
  const lastClosedCandleTime = candles.length >= 2 ? candles[candles.length - 2].time : 0;
  const legendIndicatorValues = useMemo(() => {
    if (candles.length < 2) return new Map<string, string>();
    const closedCandles = candles.slice(0, candles.length - 1);
    const lastIdx = closedCandles.length - 1;
    const values = new Map<string, string>();

    indicatorInstances.forEach((ind) => {
      try {
        switch (ind.type) {
          case 'sma': {
            const arr = calculateSMA(candles, ind.params.period || 20);
            const val = arr[lastIdx];
            values.set(ind.id, val !== null ? val.toFixed(precision) : '-');
            break;
          }
          case 'ema': {
            const arr = calculateEMA(candles, ind.params.period || 20);
            const val = arr[lastIdx];
            values.set(ind.id, val !== null ? val.toFixed(precision) : '-');
            break;
          }
          case 'wma': {
            const arr = calculateWMA(candles, ind.params.period || 20);
            const val = arr[lastIdx];
            values.set(ind.id, val !== null ? val.toFixed(precision) : '-');
            break;
          }
          case 'bb': {
            const bb = calculateBollingerBands(candles, ind.params.period || 20, ind.params.stdDev || 2);
            const m = bb.middle[lastIdx];
            const u = bb.upper[lastIdx];
            const l = bb.lower[lastIdx];
            values.set(
              ind.id,
              m !== null ? `${m.toFixed(precision)} (${u?.toFixed(precision)} / ${l?.toFixed(precision)})` : '-'
            );
            break;
          }
          case 'vwap': {
            const arr = calculateVWAP(candles);
            const val = arr[lastIdx];
            values.set(ind.id, val !== null ? val.toFixed(precision) : '-');
            break;
          }
          case 'psar': {
            const arr = calculateParabolicSAR(candles, ind.params.step || 0.02, ind.params.maxStep || 0.2);
            const val = arr[lastIdx];
            values.set(ind.id, val !== null ? val.toFixed(precision) : '-');
            break;
          }
          case 'rsi': {
            const arr = calculateRSI(candles, ind.params.period || 14);
            const val = arr[lastIdx];
            values.set(ind.id, val !== null ? val.toFixed(2) : '-');
            break;
          }
          case 'macd': {
            const res = calculateMACD(candles, ind.params.fast || 12, ind.params.slow || 26, ind.params.signal || 9);
            const m = res.macd[lastIdx];
            const s = res.signal[lastIdx];
            values.set(ind.id, m !== null && s !== null ? `${m.toFixed(precision)} / ${s.toFixed(precision)}` : '-');
            break;
          }
          case 'stoch': {
            const res = calculateStochastic(candles, ind.params.kPeriod || 14, ind.params.dPeriod || 3);
            const k = res.k[lastIdx];
            const d = res.d[lastIdx];
            values.set(ind.id, k !== null && d !== null ? `K:${k.toFixed(1)} D:${d.toFixed(1)}` : '-');
            break;
          }
          case 'atr': {
            const arr = calculateATR(candles, ind.params.period || 14);
            const val = arr[lastIdx];
            values.set(ind.id, val !== null ? val.toFixed(precision) : '-');
            break;
          }
          case 'adx': {
            const res = calculateADX(candles, ind.params.period || 14);
            const val = res.adx[lastIdx];
            values.set(ind.id, val !== null ? val.toFixed(2) : '-');
            break;
          }
          case 'cci': {
            const arr = calculateCCI(candles, ind.params.period || 20);
            const val = arr[lastIdx];
            values.set(ind.id, val !== null ? val.toFixed(1) : '-');
            break;
          }
          case 'obv': {
            const arr = calculateOBV(candles);
            const val = arr[lastIdx];
            values.set(ind.id, val !== null ? Math.round(val).toLocaleString() : '-');
            break;
          }
          default:
            values.set(ind.id, '');
        }
      } catch (e) {
        values.set(ind.id, '-');
      }
    });

    return values;
  }, [candles.length, lastClosedCandleTime, indicatorInstances, precision]);

  // Magnet mode snapping helper: snaps (time, price) to closest OHLC of nearest candle if within 10px
  const applyMagnetSnapping = useCallback(
    (
      screenX: number,
      screenY: number,
      displayedCandles: Candle[],
      candleWidth: number,
      adjustedMin: number,
      adjustedRange: number,
      mainChartHeight: number
    ): { time: number; price: number } => {
      const defaultTime = chartXToTime(screenX, displayedCandles, candleWidth, TIMEFRAME_SECONDS[timeframe] || 60);
      const defaultPrice = yToPrice(screenY, adjustedMin, adjustedRange, mainChartHeight);

      if (!magnetMode || displayedCandles.length === 0) {
        return { time: defaultTime, price: defaultPrice };
      }

      // Find candle closest to screenX
      const candleIdx = Math.max(0, Math.min(displayedCandles.length - 1, Math.floor(screenX / candleWidth)));
      const c = displayedCandles[candleIdx];
      if (!c) return { time: defaultTime, price: defaultPrice };

      const ohlc = [c.open, c.high, c.low, c.close];
      let bestPrice = defaultPrice;
      let minDistance = 12; // 12px snap threshold

      ohlc.forEach((p) => {
        const py = priceToY(p, adjustedMin, adjustedRange, mainChartHeight);
        const dist = Math.abs(screenY - py);
        if (dist < minDistance) {
          minDistance = dist;
          bestPrice = p;
        }
      });

      return { time: c.time, price: bestPrice };
    },
    [magnetMode, timeframe]
  );

  // Main Render Loop (Canvas with requestAnimationFrame for 60fps performance)
  useEffect(() => {
    let animId: number | null = null;

    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = dimensions.width;
      const height = dimensions.height;
      if (width <= 0 || height <= 0) return;

      // Handle high DPI displays
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);

    // Layout partitioning
    const priceScaleWidth = 68;
    const timeScaleHeight = 24;
    const chartWidth = Math.max(10, width - priceScaleWidth);

    // Sub-pane allocations: maximum 3 visible sub-panes
    const activeSubPanes = indicatorInstances
      ? indicatorInstances.filter((i) => i.pane === 'sub' && i.visible).slice(0, 3)
      : [];
    const subPaneCount = activeSubPanes.length > 0
      ? activeSubPanes.length
      : ((indicators?.showRsi ? 1 : 0) + (indicators?.showMacd ? 1 : 0));

    const subPaneHeight = subPaneCount > 0 ? Math.min(100, (height - timeScaleHeight) * 0.22) : 0;
    const mainChartHeight = Math.max(50, height - timeScaleHeight - subPaneCount * subPaneHeight);

    // Slice candles to display
    const totalCandles = candles.length;
    const endIndex = Math.min(totalCandles, totalCandles - panOffset);
    const startIndex = Math.max(0, endIndex - visibleCount);
    const displayedCandles = candles.slice(startIndex, endIndex);

    if (displayedCandles.length === 0) return;

    // Determine padded price range using chartMath with 5% padding top and bottom
    const { adjustedMin: rawMin, adjustedMax: rawMax, adjustedRange: rawRange } = calculatePriceRange(
      displayedCandles,
      0.05
    );

    // Apply manual price scale stretch factor
    const centerPrice = (rawMin + rawMax) / 2;
    const stretchedRange = rawRange * priceScaleStretch;
    const adjustedMin = centerPrice - stretchedRange / 2;
    const adjustedMax = centerPrice + stretchedRange / 2;
    const adjustedRange = adjustedMax - adjustedMin || 0.0001;

    const candleWidth = chartWidth / displayedCandles.length;
    const intervalSeconds = TIMEFRAME_SECONDS[timeframe] || 60;

    // Save transform state for pointer event conversions
    transformRef.current = {
      adjustedMin,
      adjustedMax,
      adjustedRange,
      mainChartHeight,
      chartWidth,
      candleWidth,
      displayedCandles,
      intervalSeconds,
      startIndex,
    };

    // Coordinate conversion helpers
    const getCandleX = (index: number) => index * candleWidth + candleWidth / 2;
    const getTimeX = (time: number) => timeToChartX(time, displayedCandles, candleWidth, intervalSeconds);
    const getY = (price: number) => priceToY(price, adjustedMin, adjustedRange, mainChartHeight);

    // Background
    ctx.fillStyle = colors.bg;
    ctx.fillRect(0, 0, width, height);

    // 1. Grid
    if (showGrid) {
      ctx.strokeStyle = colors.borderSoft;
      ctx.lineWidth = 1;

      // Horizontal price grid lines
      const step = adjustedRange / 7;
      for (let i = 1; i <= 6; i++) {
        const price = adjustedMin + step * i;
        const y = getY(price);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(chartWidth, y);
        ctx.stroke();

        // Right price axis label
        ctx.fillStyle = colors.textDim;
        ctx.font = '10px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(price.toFixed(precision), chartWidth + 6, y + 3.5);
      }

      // Vertical time grid lines and day separators
      const timeStep = Math.max(1, Math.floor(displayedCandles.length / 6));
      let lastDay = -1;
      displayedCandles.forEach((c, idx) => {
        const date = new Date(c.time * 1000);
        const day = date.getUTCDate();

        // Day separator line
        if (lastDay !== -1 && day !== lastDay) {
          const x = getCandleX(idx);
          ctx.strokeStyle = '#233554';
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, mainChartHeight);
          ctx.stroke();
        }
        lastDay = day;

        if (idx % timeStep === 0) {
          const x = getCandleX(idx);
          ctx.strokeStyle = colors.borderSoft;
          ctx.beginPath();
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height - timeScaleHeight);
          ctx.stroke();

          // Bottom time axis label
          ctx.fillStyle = colors.textDim;
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          const timeLabel =
            timeframe === '1D'
              ? `${date.getUTCMonth() + 1}/${date.getUTCDate()}`
              : `${date.getUTCHours().toString().padStart(2, '0')}:${date.getUTCMinutes().toString().padStart(2, '0')}`;
          ctx.fillText(timeLabel, x, height - 7);
        }
      });
    }

    // Watermark Symbol & Timeframe in Center
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.038)';
    ctx.font = 'bold 36px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${symbol} ${timeframe}`, chartWidth / 2, mainChartHeight / 2);
    ctx.restore();

    // 2. Drawings clipped strictly to main candle pane
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, chartWidth, mainChartHeight);
    ctx.clip();

    // Render completed drawings with extended renderer
    drawings.forEach((d) => {
      const isSelected = selectedDrawingId === d.id;
      renderExtendedDrawing(
        ctx,
        d,
        chartWidth,
        mainChartHeight,
        getTimeX,
        getY,
        isSelected,
        precision,
        pipScale
      );
    });

    // Render temporary in-progress drawing preview (while pointer is dragging)
    if (tempDrawing && activeDrawingTool !== 'none') {
      const previewP1 = applyMagnetSnapping(
        tempDrawing.startX,
        tempDrawing.startY,
        displayedCandles,
        candleWidth,
        adjustedMin,
        adjustedRange,
        mainChartHeight
      );
      const previewP2 = applyMagnetSnapping(
        tempDrawing.currX,
        tempDrawing.currY,
        displayedCandles,
        candleWidth,
        adjustedMin,
        adjustedRange,
        mainChartHeight
      );

      const previewItem: DrawingItem = {
        id: 'preview',
        type: activeDrawingTool,
        points: [previewP1, previewP2],
        color: '#2DD4BF',
        lineWidth: 1.5,
      };

      renderExtendedDrawing(
        ctx,
        previewItem,
        chartWidth,
        mainChartHeight,
        getTimeX,
        getY,
        true,
        precision,
        pipScale
      );
    }
    ctx.restore();

    // 3. Volume Bars at Bottom of Main Chart
    if (indicators?.showVolume ?? true) {
      renderVolumeBars(ctx, displayedCandles, getCandleX, candleWidth, mainChartHeight);
    }

    // 4. Main-Pane Indicators (overlays)
    if (indicatorInstances && indicatorInstances.length > 0) {
      renderMainIndicatorInstances(
        ctx,
        indicatorInstances,
        candles,
        startIndex,
        endIndex,
        getCandleX,
        getY
      );
    } else if (indicators) {
      renderIndicatorOverlays(ctx, candles, startIndex, endIndex, indicators, getCandleX, getY);
    }

    // 5. Candlesticks / OHLC / Hollow / Heikin Ashi / Line / Area
    renderCandlesOrStyle(
      ctx,
      displayedCandles,
      chartType,
      candleWidth,
      getCandleX,
      getY,
      mainChartHeight
    );

    // 6. Current Price Line, Countdown, and Badge
    const latestCandle = displayedCandles[displayedCandles.length - 1];
    if (latestCandle) {
      const currentY = getY(latestCandle.close);
      const isUp = latestCandle.close >= latestCandle.open;
      const themeColor = isUp ? colors.bull : colors.bear;

      ctx.strokeStyle = themeColor;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.moveTo(0, currentY);
      ctx.lineTo(chartWidth, currentY);
      ctx.stroke();
      ctx.setLineDash([]);

      // Price Tag on Right Axis
      ctx.fillStyle = themeColor;
      ctx.fillRect(chartWidth + 1, currentY - 10, priceScaleWidth - 2, 20);
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(latestCandle.close.toFixed(precision), chartWidth + priceScaleWidth / 2, currentY + 3.5);

      // Countdown to candle close (Part 2.6)
      const countdownStr = getCandleCountdown(latestCandle.time, intervalSeconds);
      ctx.fillStyle = colors.textDim;
      ctx.font = '9px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(countdownStr, chartWidth - 8, currentY - 5);
    }

    // 7. Sub-panes (max 3 visible oscillators)
    let currentPaneY = mainChartHeight;
    if (activeSubPanes.length > 0) {
      activeSubPanes.forEach((subInd) => {
        renderSubPane(
          ctx,
          subInd,
          candles,
          startIndex,
          endIndex,
          chartWidth,
          currentPaneY,
          subPaneHeight,
          getCandleX
        );
        currentPaneY += subPaneHeight;
      });
    }

    // 8. Horizontal Price Tags on Right Axis (De-overlapped: >=16px apart)
    renderHorizontalPriceTags(
      ctx,
      drawings,
      chartWidth,
      mainChartHeight,
      getY,
      precision,
      selectedDrawingId
    );

    // 9. Crosshair & Dynamic Header (2.4)
    const activeCrossTime = crosshair ? crosshair.candle?.time : syncedCrosshairTime;
    let crosshairX = crosshair?.x;
    let crosshairY = crosshair?.y;

    if (!crosshair && activeCrossTime && activeCrossTime > 0) {
      crosshairX = getTimeX(activeCrossTime);
    }

    if (crosshairX !== undefined && crosshairX >= 0 && crosshairX < chartWidth) {
      ctx.strokeStyle = 'rgba(232, 238, 249, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      // Vertical line across main + subpanes
      ctx.beginPath();
      ctx.moveTo(crosshairX, 0);
      ctx.lineTo(crosshairX, height - timeScaleHeight);
      ctx.stroke();

      // Horizontal line on main pane if pointer is inside
      if (crosshairY !== undefined && crosshairY >= 0 && crosshairY < mainChartHeight) {
        ctx.beginPath();
        ctx.moveTo(0, crosshairY);
        ctx.lineTo(chartWidth, crosshairY);
        ctx.stroke();

        // Right axis price badge
        const crosshairPrice = yToPrice(crosshairY, adjustedMin, adjustedRange, mainChartHeight);
        ctx.fillStyle = '#1E283D';
        ctx.fillRect(chartWidth + 1, crosshairY - 9, priceScaleWidth - 2, 18);
        ctx.strokeStyle = '#2DD4BF';
        ctx.strokeRect(chartWidth + 1, crosshairY - 9, priceScaleWidth - 2, 18);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 9.5px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(crosshairPrice.toFixed(precision), chartWidth + priceScaleWidth / 2, crosshairY + 3.5);
      }

      ctx.setLineDash([]);

      // Bottom axis time badge
      const activeCandle = crosshair?.candle || displayedCandles.find((c) => Math.abs(getTimeX(c.time) - (crosshairX || 0)) <= candleWidth);
      if (activeCandle) {
        const cDate = new Date(activeCandle.time * 1000);
        const timeBadge = `${cDate.getUTCHours().toString().padStart(2, '0')}:${cDate.getUTCMinutes().toString().padStart(2, '0')}`;
        ctx.fillStyle = '#1E283D';
        ctx.fillRect(crosshairX - 25, height - timeScaleHeight + 2, 50, 18);
        ctx.strokeStyle = '#2DD4BF';
        ctx.strokeRect(crosshairX - 25, height - timeScaleHeight + 2, 50, 18);
        ctx.fillStyle = '#E8EEF9';
        ctx.font = 'bold 9.5px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(timeBadge, crosshairX, height - 7);
      }
    }
  };

  animId = requestAnimationFrame(render);
  return () => {
    if (animId !== null) cancelAnimationFrame(animId);
  };
}, [
    dimensions,
    candles,
    symbol,
    timeframe,
    precision,
    pipScale,
    chartType,
    indicators,
    indicatorInstances,
    visibleCount,
    panOffset,
    crosshair,
    syncedCrosshairTime,
    selectedDrawingId,
    tempDrawing,
    activeDrawingTool,
    drawings,
    showGrid,
    priceScaleStretch,
    isLogScale,
    magnetMode,
    applyMagnetSnapping,
  ]);

  // Helper: Render De-overlapped Price Tags on Right Axis for Horizontal Lines
  const renderHorizontalPriceTags = (
    ctx: CanvasRenderingContext2D,
    allDrawings: DrawingItem[],
    chartWidth: number,
    mainChartHeight: number,
    getY: (price: number) => number,
    precision: number,
    selectedId: string | null
  ) => {
    const horizDrawings = allDrawings.filter((d) => d.type === 'horizontal' && d.points[0]);
    if (horizDrawings.length === 0) return;

    interface TagItem {
      drawing: DrawingItem;
      originalY: number;
      renderedY: number;
      price: number;
      isSelected: boolean;
    }

    const tags: TagItem[] = horizDrawings.map((d) => {
      const p = d.points[0].price;
      const y = getY(p);
      return {
        drawing: d,
        originalY: y,
        renderedY: y,
        price: p,
        isSelected: d.id === selectedId,
      };
    });

    tags.sort((a, b) => a.originalY - b.originalY);

    // De-overlap: ensure >= 16px vertical distance between adjacent tags
    for (let i = 1; i < tags.length; i++) {
      const prev = tags[i - 1];
      const curr = tags[i];
      if (curr.renderedY - prev.renderedY < 16) {
        curr.renderedY = prev.renderedY + 16;
      }
    }

    // Render tags
    tags.forEach((tag) => {
      if (tag.originalY < 0 || tag.originalY > mainChartHeight) return;

      const tagColor = tag.drawing.color || '#2DD4BF';
      const tagY = tag.renderedY;

      ctx.fillStyle = tagColor;
      ctx.fillRect(chartWidth + 1, tagY - 8, 66, 16);
      ctx.fillStyle = '#060D19';
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(tag.price.toFixed(precision), chartWidth + 34, tagY + 3.5);

      if (tag.isSelected) {
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.strokeRect(chartWidth + 1, tagY - 8, 66, 16);
      }
    });
  };

  // Hit-test on drawings & handles
  const hitTestDrawing = (
    x: number,
    y: number
  ): { drawing: DrawingItem; handleIndex: number | null } | null => {
    const { chartWidth, mainChartHeight } = transformRef.current;
    const getTimeX = (time: number) =>
      timeToChartX(
        time,
        transformRef.current.displayedCandles,
        transformRef.current.candleWidth,
        transformRef.current.intervalSeconds
      );
    const getY = (price: number) =>
      priceToY(
        price,
        transformRef.current.adjustedMin,
        transformRef.current.adjustedRange,
        mainChartHeight
      );

    // 1. Check handles of selected drawing first
    if (selectedDrawingId) {
      const sel = drawings.find((d) => d.id === selectedDrawingId);
      if (sel) {
        for (let i = 0; i < sel.points.length; i++) {
          const pt = sel.points[i];
          const hx = sel.type === 'horizontal' ? (pt.time ? getTimeX(pt.time) : chartWidth / 2) : getTimeX(pt.time);
          const hy = getY(pt.price);
          if (Math.hypot(x - hx, y - hy) <= 9) {
            return { drawing: sel, handleIndex: i };
          }
        }
      }
    }

    // 2. Check hit on drawings in reverse order (topmost first)
    for (let idx = drawings.length - 1; idx >= 0; idx--) {
      const d = drawings[idx];
      if (d.hidden || d.locked) continue;

      if (d.type === 'horizontal' && d.points[0]) {
        const hy = getY(d.points[0].price);
        if (Math.abs(y - hy) <= 6 && x >= 0 && x <= chartWidth + 68) {
          return { drawing: d, handleIndex: null };
        }
      } else if (d.type === 'vertical' && d.points[0]) {
        const vx = getTimeX(d.points[0].time);
        if (Math.abs(x - vx) <= 6 && y >= 0 && y <= mainChartHeight) {
          return { drawing: d, handleIndex: null };
        }
      } else if ((d.type === 'trendline' || d.type === 'arrow' || d.type === 'ray') && d.points.length >= 2) {
        const x1 = getTimeX(d.points[0].time);
        const y1 = getY(d.points[0].price);
        const x2 = getTimeX(d.points[1].time);
        const y2 = getY(d.points[1].price);
        if (distanceToSegment(x, y, x1, y1, x2, y2) <= 6) {
          return { drawing: d, handleIndex: null };
        }
      } else if (
        (d.type === 'box' || d.type === 'measure' || d.type === 'price_range' || d.type === 'date_range') &&
        d.points.length >= 2
      ) {
        const x1 = getTimeX(d.points[0].time);
        const y1 = getY(d.points[0].price);
        const x2 = getTimeX(d.points[1].time);
        const y2 = getY(d.points[1].price);
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);
        if (x >= minX - 6 && x <= maxX + 6 && y >= minY - 6 && y <= maxY + 6) {
          return { drawing: d, handleIndex: null };
        }
      } else if ((d.type === 'position_long' || d.type === 'position_short') && d.points.length >= 2) {
        const x1 = getTimeX(d.points[0].time);
        const y1 = getY(d.points[0].price);
        const x2 = getTimeX(d.points[1].time);
        const y2 = getY(d.points[1].price);
        const widthPx = Math.max(120, Math.abs(x2 - x1) || 160);
        const left = Math.min(x1, x2);
        const minY = Math.min(y1, y2) - 20;
        const maxY = Math.max(y1, y2) + 20;
        if (x >= left && x <= left + widthPx && y >= minY && y <= maxY) {
          return { drawing: d, handleIndex: null };
        }
      } else if (d.type === 'fibonacci' && d.points.length >= 2) {
        const p1 = d.points[0];
        const p2 = d.points[1];
        const diff = p2.price - p1.price;
        const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1.0];
        const x1 = getTimeX(p1.time);
        const y1 = getY(p1.price);
        const x2 = getTimeX(p2.time);
        const y2 = getY(p2.price);

        if (distanceToSegment(x, y, x1, y1, x2, y2) <= 6) {
          return { drawing: d, handleIndex: null };
        }

        for (const lvl of levels) {
          const lvlPrice = p1.price + diff * lvl;
          const ly = getY(lvlPrice);
          if (Math.abs(y - ly) <= 6 && x >= 0 && x <= chartWidth) {
            return { drawing: d, handleIndex: null };
          }
        }
      }
    }

    return null;
  };

  // Pointer Down (Mouse & Touch unified)
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    onFocusCell?.();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const { chartWidth } = transformRef.current;

    // Check if clicking on price scale to stretch
    if (x >= chartWidth) {
      setIsDraggingPriceScale(true);
      priceDragStartYRef.current = y;
      priceDragStartStretchRef.current = priceScaleStretch;
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    // Drawing Tool active -> start creating drawing
    if (activeDrawingTool !== 'none') {
      setTempDrawing({ startX: x, startY: y, currX: x, currY: y });
      setSelectedDrawingId(null);
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    // Normal Cursor Mode -> check hit-test for select or handle drag
    const hit = hitTestDrawing(x, y);
    if (hit) {
      setSelectedDrawingId(hit.drawing.id);
      if (hit.handleIndex !== null) {
        dragHandleRef.current = { drawingId: hit.drawing.id, handleIndex: hit.handleIndex };
      } else {
        dragBodyRef.current = {
          drawingId: hit.drawing.id,
          startX: x,
          startY: y,
          initialPoints: hit.drawing.points.map((pt) => ({ ...pt })),
        };
      }
      e.currentTarget.setPointerCapture(e.pointerId);
      return;
    }

    // No drawing hit -> deselect & start panning chart
    setSelectedDrawingId(null);
    isDraggingRef.current = true;
    dragStartXRef.current = x;
    dragStartOffsetRef.current = panOffset;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  // Pointer Move
  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const {
      chartWidth,
      mainChartHeight,
      displayedCandles,
      candleWidth,
      adjustedMin,
      adjustedRange,
      intervalSeconds,
    } = transformRef.current;

    // Price Scale Stretch Dragging
    if (isDraggingPriceScale) {
      const dy = y - priceDragStartYRef.current;
      const stretchDelta = dy / 150;
      const newStretch = Math.max(0.2, Math.min(5.0, priceDragStartStretchRef.current - stretchDelta));
      setPriceScaleStretch(newStretch);
      return;
    }

    // Drawing in-progress preview
    if (tempDrawing && activeDrawingTool !== 'none') {
      setTempDrawing((prev) => (prev ? { ...prev, currX: x, currY: y } : null));
      return;
    }

    // Dragging drawing handle
    if (dragHandleRef.current && onUpdateDrawing) {
      const { drawingId, handleIndex } = dragHandleRef.current;
      const d = drawings.find((item) => item.id === drawingId);
      if (d) {
        const snapped = applyMagnetSnapping(x, y, displayedCandles, candleWidth, adjustedMin, adjustedRange, mainChartHeight);
        const updatedPoints = [...d.points];
        updatedPoints[handleIndex] = snapped;
        onUpdateDrawing({ ...d, points: updatedPoints });
      }
      return;
    }

    // Dragging drawing body
    if (dragBodyRef.current && onUpdateDrawing) {
      const { drawingId, startX, startY, initialPoints } = dragBodyRef.current;
      const d = drawings.find((item) => item.id === drawingId);
      if (d) {
        const dx = x - startX;
        const dy = y - startY;
        const timeShift = (dx / candleWidth) * intervalSeconds;
        const priceShift = -(dy / mainChartHeight) * adjustedRange;

        const updatedPoints = initialPoints.map((pt) => ({
          time: Math.round(pt.time + timeShift),
          price: pt.price + priceShift,
        }));
        onUpdateDrawing({ ...d, points: updatedPoints });
      }
      return;
    }

    // Panning chart
    if (isDraggingRef.current) {
      const dx = x - dragStartXRef.current;
      const candleShift = Math.round(dx / candleWidth);
      const newOffset = Math.max(0, Math.min(candles.length - visibleCount, dragStartOffsetRef.current + candleShift));
      setPanOffset(newOffset);
      return;
    }

    // Update Crosshair
    if (x < chartWidth && y < dimensions.height - 24) {
      const candleIdx = Math.max(0, Math.min(displayedCandles.length - 1, Math.floor(x / candleWidth)));
      const hoverCandle = displayedCandles[candleIdx] || null;
      const hoverPrice = yToPrice(y, adjustedMin, adjustedRange, mainChartHeight);
      setCrosshair({ x, y, candle: hoverCandle, price: hoverPrice });
      if (hoverCandle && onCrosshairTimeChange) {
        onCrosshairTimeChange(hoverCandle.time);
      }
    } else {
      setCrosshair(null);
      onCrosshairTimeChange?.(null);
    }
  };

  // Pointer Up
  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (isDraggingPriceScale) {
      setIsDraggingPriceScale(false);
      return;
    }

    // Complete drawing if one was in-progress
    if (tempDrawing && activeDrawingTool !== 'none' && onDrawingComplete) {
      const dx = Math.abs(x - tempDrawing.startX);
      const dy = Math.abs(y - tempDrawing.startY);

      // 1. Ignore accidental drawings: must have moved >= 8px
      if (dx >= 8 || dy >= 8) {
        const { displayedCandles, candleWidth, adjustedMin, adjustedRange, mainChartHeight } = transformRef.current;

        const p1 = applyMagnetSnapping(
          tempDrawing.startX,
          tempDrawing.startY,
          displayedCandles,
          candleWidth,
          adjustedMin,
          adjustedRange,
          mainChartHeight
        );
        const p2 = applyMagnetSnapping(
          x,
          y,
          displayedCandles,
          candleWidth,
          adjustedMin,
          adjustedRange,
          mainChartHeight
        );

        const newDrawing: DrawingItem = {
          id: `draw-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          type: activeDrawingTool,
          points: [p1, p2],
          color: activeDrawingTool === 'position_long' ? '#22C55E' : '#2DD4BF',
          lineWidth: 1.5,
          lineStyle: 'solid',
        };

        onDrawingComplete(newDrawing);
        setSelectedDrawingId(newDrawing.id);
      }

      setTempDrawing(null);
      // 2. Reset active tool back to 'none' (TradingView behavior)
      onResetActiveTool?.();
    }

    isDraggingRef.current = false;
    dragHandleRef.current = null;
    dragBodyRef.current = null;
  };

  // Double Click on Price Axis -> Reset price scale stretch (2.2)
  const handleDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x >= transformRef.current.chartWidth) {
      setPriceScaleStretch(1.0);
    }
  };

  // Wheel Zoom (Centered on pointer) (2.5)
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const pointerX = e.clientX - rect.left;
    const { chartWidth } = transformRef.current;

    // Zoom direction
    const delta = e.deltaY < 0 ? -6 : 6;
    const nextCount = Math.max(20, Math.min(candles.length, visibleCount + delta));

    // Keep point under pointer stable
    const pointerRatio = Math.max(0, Math.min(1, pointerX / chartWidth));
    const countDiff = nextCount - visibleCount;
    const offsetAdjustment = Math.round(countDiff * (1 - pointerRatio));

    setVisibleCount(nextCount);
    setPanOffset((prev) => Math.max(0, Math.min(candles.length - nextCount, prev - offsetAdjustment)));
  };

  // Context Menu: create alert at clicked price (5.1)
  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const { adjustedMin, adjustedRange, mainChartHeight } = transformRef.current;
    const clickedPrice = yToPrice(y, adjustedMin, adjustedRange, mainChartHeight);

    if (onOpenAlertModal) {
      onOpenAlertModal(Number(clickedPrice.toFixed(precision)));
    }
  };

  // Active Candle for HUD
  const hudCandle = crosshair?.candle || candles[candles.length - 1];
  const hudPrevCandle = candles[candles.length - 2];
  const priceChange = hudCandle && hudPrevCandle ? hudCandle.close - hudPrevCandle.close : 0;
  const priceChangePct = hudPrevCandle && hudPrevCandle.close ? (priceChange / hudPrevCandle.close) * 100 : 0;

  // Selected drawing object for DrawingStyleBar
  const selectedDrawing = drawings.find((d) => d.id === selectedDrawingId) || null;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex flex-col bg-[#0B1220] select-none overflow-hidden"
      onPointerLeave={() => {
        setCrosshair(null);
        onCrosshairTimeChange?.(null);
      }}
    >
      {/* 1. HUD Header (Symbol, Timeframe, OHLC, Change%) */}
      <div className="absolute top-2 left-3 z-10 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono bg-[#121A2B]/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-[#243049] shadow-md pointer-events-none">
        <span className="font-bold text-[#2DD4BF] tracking-wide text-sm">{symbol}</span>
        <span className="text-[#7B8DA8] uppercase">{timeframe}</span>
        {isDemo && (
          <span className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 text-amber-400 font-bold font-sans text-[11px] flex items-center gap-1 shadow-xs">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
            بيانات تجريبية
          </span>
        )}
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
              {priceChange >= 0 ? '+' : ''}
              {priceChange.toFixed(precision)} ({priceChangePct.toFixed(2)}%)
            </span>
            <span className="text-[#7B8DA8]">V: {hudCandle.volume.toLocaleString()}</span>
          </>
        )}
      </div>

      {/* 2. Interactive Indicator Legend (1.4: top-left, name, params, last closed value, eye, gear, x) */}
      {indicatorInstances && indicatorInstances.length > 0 && (
        <div className="absolute top-11 left-3 z-10 flex flex-wrap items-center gap-1.5 max-w-[80%]">
          {indicatorInstances.map((ind) => {
            const val = legendIndicatorValues.get(ind.id);
            // Build the indicator label cleanly once (Bug 0.3)
            const baseType = ind.type.toUpperCase();
            const paramValues = Object.values(ind.params || {}).filter(
              (v) => v !== undefined && v !== null
            );
            const paramText = paramValues.length > 0 ? `(${paramValues.join(', ')})` : '';
            const label = `${baseType} ${paramText}`.trim();

            return (
              <div
                key={ind.id}
                className="group flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#0F172A]/85 backdrop-blur-sm border border-[#243049] text-[11px] shadow-sm hover:border-[#38BDF8]/40 transition-colors"
              >
                {/* Colored indicator dot */}
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: ind.color }} />

                {/* Name & Params */}
                <span className="font-semibold text-[#E2E8F0]">
                  {label}
                </span>

                {/* Closed-candle value */}
                {val && <span className="font-mono text-[#38BDF8] ml-0.5">{val}</span>}

                {/* Hover action icons: Eye, Gear, X */}
                <div className="hidden group-hover:flex items-center gap-1 ml-1 pl-1 border-l border-[#334155]">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateIndicatorInstance?.({ ...ind, visible: !ind.visible });
                    }}
                    title={ind.visible ? 'إخفاء المؤشر' : 'إظهار المؤشر'}
                    className="text-[#94A3B8] hover:text-white transition-colors"
                  >
                    {ind.visible ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3 text-[#64748B]" />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenIndicatorSettings?.(ind);
                    }}
                    title="إعدادات المؤشر"
                    className="text-[#94A3B8] hover:text-[#38BDF8] transition-colors"
                  >
                    <Settings className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveIndicatorInstance?.(ind.id);
                    }}
                    title="حذف المؤشر"
                    className="text-[#94A3B8] hover:text-rose-400 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. Floating Canvas Top-Right Quick Controls */}
      <div className="absolute top-2 right-20 z-10 flex items-center gap-1 bg-[#121A2B]/80 backdrop-blur border border-[#243049] rounded-md p-1 shadow">
        <button
          onClick={() => setVisibleCount((prev) => Math.max(20, prev - 10))}
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
          onClick={() => {
            setPanOffset(0);
            setVisibleCount(70);
            setPriceScaleStretch(1.0);
          }}
          title="إعادة ضبط العرض والسعر (Reset View)"
          className="p-1 hover:bg-[#1C2740] rounded text-[#A3B4D0] hover:text-[#E8EEF9] transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        <button
          onClick={() => setIsLogScale(!isLogScale)}
          title={isLogScale ? 'الوضع الخطي' : 'الوضع اللوغاريتمي (Log Scale)'}
          className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
            isLogScale ? 'bg-[#1C2E4A] text-[#2DD4BF] font-bold' : 'text-[#7B8DA8] hover:text-white'
          }`}
        >
          LOG
        </button>
      </div>

      {/* 4. Go to Latest Floating Button (2.5) */}
      {panOffset > 0 && (
        <button
          onClick={() => setPanOffset(0)}
          className="absolute bottom-8 right-24 z-20 flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#131E33]/95 hover:bg-[#1E2D4A] border border-[#2DD4BF]/50 text-[#2DD4BF] text-xs font-semibold shadow-2xl backdrop-blur-md transition-all cursor-pointer animate-pulse"
          title="الانتقال إلى الشمعة الأحدث (Go to Latest)"
        >
          <span>الأحدث</span>
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      )}

      {/* 5. Per-Drawing Style Editor Bar (3.2) */}
      {selectedDrawing && onUpdateDrawing && onDeleteDrawing && (
        <DrawingStyleBar
          drawing={selectedDrawing}
          onUpdate={onUpdateDrawing}
          onDelete={onDeleteDrawing}
          onClose={() => setSelectedDrawingId(null)}
        />
      )}

      {/* 6. Main Canvas */}
      <canvas
        ref={canvasRef}
        style={{ width: dimensions.width, height: dimensions.height, touchAction: 'none' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
        onWheel={handleWheel}
        className="w-full h-full block cursor-crosshair"
      />
    </div>
  );
};

export const MatrixChartCanvas = React.memo(MatrixChartCanvasComponent);
