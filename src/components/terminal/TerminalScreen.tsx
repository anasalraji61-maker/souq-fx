import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  MarketSymbol,
  Candle,
  Timeframe,
  ChartType,
  DrawingTool,
  DrawingItem,
  IndicatorSettings,
  IndicatorInstance,
  PriceAlertItem,
} from '../../types/market';
import { MatrixChartCanvas } from './MatrixChartCanvas';
import { WatchlistPanel } from './WatchlistPanel';
import { IndicatorModal } from './IndicatorModal';
import { IndicatorSettingsModal } from './IndicatorSettingsModal';
import { ObjectTreePanel } from './chart/ObjectTreePanel';
import { AlertsPanel } from './AlertsPanel';
import { SymbolSearchModal } from './SymbolSearchModal';
import { AiCopilotPanel } from './AiCopilotPanel';
import { OrderPanel } from '../trading/OrderPanel';
import { PositionPanel } from '../trading/PositionPanel';
import { OrderFlowPanel } from './OrderFlowPanel';
import { generateCandles, updateLastCandleWithTick, TIMEFRAME_SECONDS } from '../../data/candleGenerator';
import { getCandles, getQuote, getMarketStatus, MarketStatus } from '../../api/market';
import { loadDrawings, saveDrawings } from '../../api/drawings';
import { loadAlerts, saveAlerts } from '../../api/alerts';
import { playAlertChime } from '../../utils/sound';
import { showSystemNotification, alertNotificationText, requestSystemNotifications } from '../../utils/systemNotify';
import {
  Maximize2,
  Minimize2,
  ChevronDown,
  Sparkles,
  Sliders,
  Grid,
  LayoutGrid,
  Layers,
  Trash2,
  Ruler,
  Magnet,
  Bell,
  HelpCircle,
  Save,
  FolderOpen,
  Type,
  Check,
  Search,
  Activity,
  PenTool,
  X,
} from 'lucide-react';

import {
  LayoutGrid as ChartLayoutGrid,
  LayoutPicker,
  effectiveLayout,
  isLayoutType,
  useLayoutSizes,
  type LayoutSizes,
  type LayoutType,
} from './chartLayouts';
export type { LayoutType };

interface ChartCellState {
  id: string;
  symbol: string;
  timeframe: Timeframe;
  chartType: ChartType;
  candles: Candle[];
  drawings: DrawingItem[];
  indicators: IndicatorInstance[];
  providerStatus: 'Cached' | 'Provider' | 'Unavailable' | 'Demo';
  marketStatus: 'Closed' | 'Open';
  isDemo?: boolean;
  isLoading?: boolean;
  changePct?: number | null;
}

interface SavedLayout {
  id: string;
  name: string;
  createdAt: string;
  layoutType: LayoutType;
  sizes?: LayoutSizes;
  cells: {
    id: string;
    symbol: string;
    timeframe: Timeframe;
    chartType: ChartType;
    indicators: IndicatorInstance[];
  }[];
}

interface TerminalScreenProps {
  symbols: MarketSymbol[];
  activeSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  candles: Candle[];
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  chartType: ChartType;
  onChartTypeChange: (type: ChartType) => void;
  indicators: IndicatorSettings;
  onUpdateIndicators: (updated: IndicatorSettings) => void;
  priceFlashMap: Record<string, 'up' | 'down'>;
  showGrid: boolean;
  onTabChange?: (tab: 'home' | 'community' | 'academy' | 'pricing' | 'tools' | 'account') => void;
  currentTab?: string;
}

// 1.7 Default indicators per new cell: EMA 20, EMA 50, RSI 14
function loadCellIndicators(cellId: string): IndicatorInstance[] {
  try {
    const raw = localStorage.getItem(`matrix.indicators.${cellId}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {
    console.warn('Failed to load indicators for cell', cellId, e);
  }

  return [
    {
      id: `${cellId}-ema-20`,
      type: 'ema',
      name: 'EMA (20)',
      nameAr: 'المتوسط الأسي (EMA 20)',
      params: { period: 20 },
      color: '#2DD4BF',
      visible: true,
      pane: 'main',
    },
    {
      id: `${cellId}-ema-50`,
      type: 'ema',
      name: 'EMA (50)',
      nameAr: 'المتوسط الأسي (EMA 50)',
      params: { period: 50 },
      color: '#F59E0B',
      visible: true,
      pane: 'main',
    },
    {
      id: `${cellId}-rsi-14`,
      type: 'rsi',
      name: 'RSI (14)',
      nameAr: 'مؤشر القوة النسبية (RSI 14)',
      params: { period: 14 },
      color: '#A78BFA',
      visible: true,
      pane: 'sub',
    },
  ];
}

export const TerminalScreen: React.FC<TerminalScreenProps> = ({
  symbols,
  activeSymbol,
  onSelectSymbol,
  candles: masterCandles,
  timeframe: masterTimeframe,
  onTimeframeChange,
  chartType: masterChartType,
  onChartTypeChange,
  indicators,
  onUpdateIndicators,
  priceFlashMap,
  showGrid,
  onTabChange,
  currentTab = 'home',
}) => {
  // Multi-Chart Layout State (Part 4)
  const [layoutType, setLayoutType] = useState<LayoutType>('1');
  const pendingSizesRef = useRef<LayoutSizes | null>(null);
  const [activeCellId, setActiveCellId] = useState<string>('cell-1');
  const [maximizedCellId, setMaximizedCellId] = useState<string | null>(null);

  // Mobile-first responsive detection (MEGA BATCH D)
  const [isPhone, setIsPhone] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);
  // Tablet (768–1099px): at most 2 charts side by side
  const [isTablet, setIsTablet] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 && window.innerWidth < 1100 : false
  );
  const [isMobileDrawingSheetOpen, setIsMobileDrawingSheetOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsPhone(window.innerWidth < 768);
      setIsTablet(window.innerWidth >= 768 && window.innerWidth < 1100);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sync Toggles (Part 4.3)
  const [syncSymbol, setSyncSymbol] = useState(false);
  const [syncTimeframe, setSyncTimeframe] = useState(false);
  const [syncCrosshair, setSyncCrosshair] = useState(false);
  const [syncedCrosshairTime, setSyncedCrosshairTime] = useState<number | null>(null);

  // Layout Management (Part 4.4)
  const [savedLayouts, setSavedLayouts] = useState<SavedLayout[]>(() => {
    try {
      const raw = localStorage.getItem('matrix.layouts');
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const [isLayoutMenuOpen, setIsLayoutMenuOpen] = useState(false);

  // Active Drawing Tool & Magnet
  const [activeTool, setActiveTool] = useState<DrawingTool>('none');
  const [isMagnetOn, setIsMagnetOn] = useState(false);

  // Modals & Panels
  const [isIndicatorsModalOpen, setIsIndicatorsModalOpen] = useState(false);
  const [editingIndicator, setEditingIndicator] = useState<IndicatorInstance | null>(null);
  const [isObjectTreeOpen, setIsObjectTreeOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [alertModalInitialPrice, setAlertModalInitialPrice] = useState<number | undefined>(undefined);
  const [isSymbolSearchOpen, setIsSymbolSearchOpen] = useState(false);
  const [isShortcutsModalOpen, setIsShortcutsModalOpen] = useState(false);
  const [isAiCopilotOpen, setIsAiCopilotOpen] = useState(false);
  const [isOrderPanelOpen, setIsOrderPanelOpen] = useState(false);
  const [tradingDrawerTab, setTradingDrawerTab] = useState<'orders' | 'positions'>('orders');
  const [isWatchlistCollapsed, setIsWatchlistCollapsed] = useState(false);
  const [isChartTypeMenuOpen, setIsChartTypeMenuOpen] = useState(false);
  const [isOrderFlowOpen, setIsOrderFlowOpen] = useState(false);

  // Price Alerts State (Part 5)
  const [alerts, setAlerts] = useState<PriceAlertItem[]>([]);
  const [activeNotification, setActiveNotification] = useState<{
    alert: PriceAlertItem;
    price: number;
  } | null>(null);

  // 1.5 Market status badge state
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null);

  useEffect(() => {
    getMarketStatus().then(setMarketStatus);
    const msInterval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      getMarketStatus().then(setMarketStatus);
    }, 30000);
    return () => clearInterval(msInterval);
  }, []);

  // Initialize cells (Part 4.2)
  const [cells, setCells] = useState<ChartCellState[]>(() => [
    {
      id: 'cell-1',
      symbol: 'EURUSD',
      timeframe: '15m',
      chartType: 'candles',
      candles: generateCandles(1.08538, '15m', 150),
      drawings: [],
      indicators: loadCellIndicators('cell-1'),
      providerStatus: 'Provider',
      marketStatus: 'Open',
    },
    {
      id: 'cell-2',
      symbol: 'XAUUSD',
      timeframe: '15m',
      chartType: 'candles',
      candles: generateCandles(2745.5, '15m', 150),
      drawings: [],
      indicators: loadCellIndicators('cell-2'),
      providerStatus: 'Provider',
      marketStatus: 'Open',
    },
    {
      id: 'cell-3',
      symbol: 'GBPUSD',
      timeframe: '1h',
      chartType: 'candles',
      candles: generateCandles(1.3025, '1h', 150),
      drawings: [],
      indicators: loadCellIndicators('cell-3'),
      providerStatus: 'Provider',
      marketStatus: 'Open',
    },
    {
      id: 'cell-4',
      symbol: 'USDJPY',
      timeframe: '4h',
      chartType: 'candles',
      candles: generateCandles(152.4, '4h', 150),
      drawings: [],
      indicators: loadCellIndicators('cell-4'),
      providerStatus: 'Provider',
      marketStatus: 'Open',
    },
  ]);

  // Load alerts on mount
  useEffect(() => {
    loadAlerts().then((loaded) => setAlerts(loaded));
  }, []);

  // Price Alert Trigger Check (Part 5.3) on every price change in frontend
  useEffect(() => {
    if (alerts.length === 0) return;

    let hasTriggered = false;
    let updatedAlerts = false;

    const nextAlerts = alerts.map((alert) => {
      if (!alert.active || alert.triggered) return alert;

      const sym = symbols.find((s) => s.symbol === alert.symbol);
      if (!sym) return alert;

      let isTriggered = false;
      switch (alert.condition) {
        case 'greater_than':
        case 'above':
          isTriggered = sym.price >= alert.targetPrice;
          break;
        case 'less_than':
        case 'below':
          isTriggered = sym.price <= alert.targetPrice;
          break;
        case 'crosses':
          isTriggered = Math.abs(sym.price - alert.targetPrice) <= (sym.spread || 0.0002) * 1.5;
          break;
        case 'crosses_up':
          isTriggered = sym.price >= alert.targetPrice;
          break;
        case 'crosses_down':
          isTriggered = sym.price <= alert.targetPrice;
          break;
      }

      if (isTriggered) {
        hasTriggered = true;
        updatedAlerts = true;
        const triggeredItem: PriceAlertItem = {
          ...alert,
          triggered: true,
          triggeredAt: new Date().toISOString(),
        };

        setActiveNotification({ alert: triggeredItem, price: sym.price });
        playAlertChime();
        const note = alertNotificationText(alert.symbol, String(alert.condition), alert.targetPrice, sym.price);
        void showSystemNotification(note.title, note.body, `alert-${alert.id}`);
        return triggeredItem;
      }

      return alert;
    });

    if (updatedAlerts) {
      setAlerts(nextAlerts);
      saveAlerts(nextAlerts);
    }
  }, [symbols, alerts]);

  // Track loaded drawings per cell (cellId -> symbol:timeframe)
  const loadedMapRef = useRef<Map<string, string>>(new Map());

  // 1.2 Load real candles per cell with fallback and demo flag
  const loadCellCandles = useCallback(
    async (cellId: string, symbol: string, timeframe: Timeframe) => {
      setCells((prev) =>
        prev.map((c) => (c.id === cellId ? { ...c, isLoading: true } : c))
      );

      try {
        const res = await getCandles(symbol, timeframe, 500);
        setCells((prev) =>
          prev.map((c) => {
            if (c.id !== cellId) return c;
            const providerStatus =
              res.dataKind === 'provider'
                ? 'Provider'
                : res.dataKind === 'cache'
                ? 'Cached'
                : res.dataKind === 'demo'
                ? 'Demo'
                : 'Unavailable';

            return {
              ...c,
              candles: res.candles,
              isDemo: res.isDemo,
              changePct: res.isDemo ? null : res.changePct,
              providerStatus,
              isLoading: false,
            };
          })
        );
      } catch {
        const symObj = symbols.find((s) => s.symbol === symbol) || symbols[0];
        const fallback = generateCandles(symObj?.price || 1.085, timeframe, 150);
        setCells((prev) =>
          prev.map((c) =>
            c.id === cellId
              ? {
                  ...c,
                  candles: fallback,
                  isDemo: true,
                  providerStatus: 'Demo',
                  isLoading: false,
                }
              : c
          )
        );
      }
    },
    [symbols]
  );

  // Track loaded candles per cell (cellId -> symbol:timeframe)
  const loadedCandlesMapRef = useRef<Map<string, string>>(new Map());

  useEffect(() => {
    cells.forEach((cell) => {
      const key = `${cell.symbol.toUpperCase()}:${cell.timeframe.toLowerCase()}`;
      if (loadedCandlesMapRef.current.get(cell.id) !== key) {
        loadedCandlesMapRef.current.set(cell.id, key);
        loadCellCandles(cell.id, cell.symbol, cell.timeframe);
      }
    });
  }, [cells, loadCellCandles]);

  // 1.3 Live updates: poll getQuote every 10s while tab is visible (backend caches quotes; provider allows 8 req/min)
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    let isCancelled = false;

    const pollQuotes = async () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        timer = setTimeout(pollQuotes, 10000);
        return;
      }

      // Unique visible symbols
      const uniqueSymbols = Array.from(new Set(cells.map((c) => c.symbol)));

      for (const sym of uniqueSymbols) {
        if (isCancelled) break;
        try {
          const quote = await getQuote(sym);
          if (isCancelled || quote.price === null) continue;

          setCells((prevCells) =>
            prevCells.map((cell) => {
              if (cell.symbol !== sym || cell.candles.length === 0) return cell;

              const recentCandles = cell.candles.slice(-20);
              const lastCandle = recentCandles[recentCandles.length - 1];

              // Outlier check: If quote is far from last close (> 3x average candle range of last 20 candles),
              // do NOT draw it into the candle; refetch candles instead to prevent fake giant candle.
              if (recentCandles.length >= 5) {
                const avgRange =
                  recentCandles.reduce((acc, c) => acc + Math.abs(c.high - c.low), 0) /
                  recentCandles.length;
                const diff = Math.abs(quote.price! - lastCandle.close);

                if (avgRange > 0 && diff > avgRange * 3) {
                  loadCellCandles(cell.id, cell.symbol, cell.timeframe);
                  return cell;
                }
              }

              // Check if candle time has elapsed
              const intervalSec = TIMEFRAME_SECONDS[cell.timeframe] || 900;
              const nowSec = Math.floor(Date.now() / 1000);

              let nextCandles: Candle[];
              if (nowSec >= lastCandle.time + intervalSec) {
                const newCandle: Candle = {
                  time: lastCandle.time + intervalSec,
                  open: quote.price!,
                  high: quote.price!,
                  low: quote.price!,
                  close: quote.price!,
                  volume: 1,
                };
                nextCandles = [...cell.candles, newCandle];
              } else {
                nextCandles = updateLastCandleWithTick(cell.candles, quote.price!, cell.timeframe);
              }

              const providerStatus =
                quote.dataKind === 'provider'
                  ? 'Provider'
                  : quote.dataKind === 'cache'
                  ? 'Cached'
                  : quote.dataKind === 'demo'
                  ? 'Demo'
                  : 'Unavailable';

              return {
                ...cell,
                candles: nextCandles,
                isDemo: quote.isDemo ? true : cell.isDemo,
                providerStatus,
                marketStatus: quote.marketOpen === false ? 'Closed' : 'Open',
              };
            })
          );
        } catch {
          // Ignore quote polling errors silently
        }
      }

      if (!isCancelled) {
        timer = setTimeout(pollQuotes, 10000);
      }
    };

    timer = setTimeout(pollQuotes, 10000);

    return () => {
      isCancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [cells, loadCellCandles]);

  useEffect(() => {
    cells.forEach((cell) => {
      const key = `${cell.symbol.toUpperCase()}:${cell.timeframe.toLowerCase()}`;
      if (loadedMapRef.current.get(cell.id) !== key) {
        loadedMapRef.current.set(cell.id, key);
        loadDrawings(cell.symbol, cell.timeframe).then((loaded) => {
          setCells((prev) =>
            prev.map((c) => (c.id === cell.id ? { ...c, drawings: loaded } : c))
          );
        });
      }
    });
  }, [cells]);

  // Debounced save drawings helper (500 ms)
  const saveTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const debouncedSaveDrawings = useCallback((symbol: string, timeframe: string, drawingsToSave: DrawingItem[]) => {
    const key = `${symbol.toUpperCase()}.${timeframe.toLowerCase()}`;
    const existing = saveTimersRef.current.get(key);
    if (existing) clearTimeout(existing);

    const timer = setTimeout(() => {
      saveDrawings(symbol, timeframe, drawingsToSave);
      saveTimersRef.current.delete(key);
    }, 500);

    saveTimersRef.current.set(key, timer);
  }, []);

  // Update cell candles on tick (kept as subtle fallback)
  useEffect(() => {
    // Only update if no quote polling is actively driving ticks
  }, [symbols]);

  // Keyboard Shortcuts (Part 7.1)
  useEffect(() => {
    const handleShortcuts = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      // Ctrl+K -> Symbol Search
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSymbolSearchOpen(true);
        return;
      }

      // Alt+T -> Trendline
      if (e.altKey && e.key.toLowerCase() === 't') {
        e.preventDefault();
        setActiveTool((prev) => (prev === 'trendline' ? 'none' : 'trendline'));
        return;
      }

      // Alt+H -> Horizontal line
      if (e.altKey && e.key.toLowerCase() === 'h') {
        e.preventDefault();
        setActiveTool((prev) => (prev === 'horizontal' ? 'none' : 'horizontal'));
        return;
      }

      // Alt+F -> Fibonacci
      if (e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setActiveTool((prev) => (prev === 'fibonacci' ? 'none' : 'fibonacci'));
        return;
      }

      // Esc -> Cancel tool
      if (e.key === 'Escape') {
        setActiveTool('none');
        setIsLayoutMenuOpen(false);
        setIsChartTypeMenuOpen(false);
        return;
      }

      // 1-6 -> Timeframes
      const tfMap: Record<string, Timeframe> = {
        '1': '1m',
        '2': '5m',
        '3': '15m',
        '4': '1h',
        '5': '4h',
        '6': '1D',
      };
      if (tfMap[e.key] && !e.ctrlKey && !e.altKey) {
        handleTimeframeChange(tfMap[e.key]);
        return;
      }

      // ? -> Shortcut modal
      if (e.key === '?') {
        setIsShortcutsModalOpen(true);
      }
    };

    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, [syncTimeframe]);

  // Active cell reference
  const activeCell = cells.find((c) => c.id === activeCellId) || cells[0];

  // Handle cell timeframe change
  const handleCellTimeframeChange = (cellId: string, tf: Timeframe) => {
    if (syncTimeframe) {
      setCells((prev) =>
        prev.map((c) => {
          const symObj = symbols.find((s) => s.symbol === c.symbol) || symbols[0];
          return {
            ...c,
            timeframe: tf,
            candles: generateCandles(symObj.price, tf, 150),
          };
        })
      );
      onTimeframeChange(tf);
      return;
    }

    setCells((prev) =>
      prev.map((c) => {
        if (c.id !== cellId) return c;
        const symObj = symbols.find((s) => s.symbol === c.symbol) || symbols[0];
        return {
          ...c,
          timeframe: tf,
          candles: generateCandles(symObj.price, tf, 150),
        };
      })
    );
  };

  const handleTimeframeChange = (tf: Timeframe) => {
    handleCellTimeframeChange(activeCell.id, tf);
  };

  // Handle symbol change
  const handleCellSymbolChange = (cellId: string, sym: string) => {
    if (syncSymbol) {
      setCells((prev) =>
        prev.map((c) => {
          const symObj = symbols.find((s) => s.symbol === sym) || symbols[0];
          return {
            ...c,
            symbol: sym,
            candles: generateCandles(symObj.price, c.timeframe, 150),
          };
        })
      );
      onSelectSymbol(sym);
      return;
    }

    const symObj = symbols.find((s) => s.symbol === sym) || symbols[0];
    setCells((prev) =>
      prev.map((c) => {
        if (c.id !== cellId) return c;
        return {
          ...c,
          symbol: sym,
          candles: generateCandles(symObj.price, c.timeframe, 150),
        };
      })
    );
    if (cellId === activeCellId) {
      onSelectSymbol(sym);
    }
  };

  const handleSelectSymbol = (sym: string) => {
    handleCellSymbolChange(activeCell.id, sym);
  };

  // Handle chart type change
  const handleChartTypeChange = (type: ChartType) => {
    setCells((prev) =>
      prev.map((c) => (c.id === activeCell.id ? { ...c, chartType: type } : c))
    );
    onChartTypeChange(type);
    setIsChartTypeMenuOpen(false);
  };

  // Drawings Handlers
  const handleAddDrawing = (cellId: string, drawing: DrawingItem) => {
    setActiveTool('none');
    setCells((prev) =>
      prev.map((c) => {
        if (c.id !== cellId) return c;
        const nextDrawings = [...c.drawings, drawing];
        debouncedSaveDrawings(c.symbol, c.timeframe, nextDrawings);
        return { ...c, drawings: nextDrawings };
      })
    );
  };

  const handleUpdateDrawing = (cellId: string, updated: DrawingItem) => {
    setCells((prev) =>
      prev.map((c) => {
        if (c.id !== cellId) return c;
        const next = c.drawings.map((d) => (d.id === updated.id ? updated : d));
        debouncedSaveDrawings(c.symbol, c.timeframe, next);
        return { ...c, drawings: next };
      })
    );
  };

  const handleDeleteDrawing = (cellId: string, id: string) => {
    setCells((prev) =>
      prev.map((c) => {
        if (c.id !== cellId) return c;
        const next = c.drawings.filter((d) => d.id !== id);
        debouncedSaveDrawings(c.symbol, c.timeframe, next);
        return { ...c, drawings: next };
      })
    );
  };

  const handleClearDrawings = (cellId: string) => {
    setCells((prev) =>
      prev.map((c) => {
        if (c.id !== cellId) return c;
        debouncedSaveDrawings(c.symbol, c.timeframe, []);
        return { ...c, drawings: [] };
      })
    );
  };

  // Indicator Handlers (Part 1.7)
  const handleAddIndicator = (cellId: string, inst: IndicatorInstance) => {
    setCells((prev) =>
      prev.map((c) => {
        if (c.id !== cellId) return c;
        const next = [...c.indicators, inst];
        localStorage.setItem(`matrix.indicators.${cellId}`, JSON.stringify(next));
        return { ...c, indicators: next };
      })
    );
  };

  const handleUpdateIndicator = (cellId: string, updated: IndicatorInstance) => {
    setCells((prev) =>
      prev.map((c) => {
        if (c.id !== cellId) return c;
        const next = c.indicators.map((i) => (i.id === updated.id ? updated : i));
        localStorage.setItem(`matrix.indicators.${cellId}`, JSON.stringify(next));
        return { ...c, indicators: next };
      })
    );
  };

  const handleRemoveIndicator = (cellId: string, id: string) => {
    setCells((prev) =>
      prev.map((c) => {
        if (c.id !== cellId) return c;
        const next = c.indicators.filter((i) => i.id !== id);
        localStorage.setItem(`matrix.indicators.${cellId}`, JSON.stringify(next));
        return { ...c, indicators: next };
      })
    );
  };

  // Price Alert Handlers (Part 5)
  const handleAddAlert = (item: PriceAlertItem) => {
    // ask for system-notification permission from this user action (first alert only; no-op afterwards)
    void requestSystemNotifications();
    const next = [...alerts, item];
    setAlerts(next);
    saveAlerts(next);
  };

  const handleToggleAlert = (id: string) => {
    const next = alerts.map((a) => (a.id === id ? { ...a, active: !a.active } : a));
    setAlerts(next);
    saveAlerts(next);
  };

  const handleDeleteAlert = (id: string) => {
    const next = alerts.filter((a) => a.id !== id);
    setAlerts(next);
    saveAlerts(next);
  };

  // Layout Management (Part 4.4)
  const handleSaveCurrentLayout = () => {
    const name = prompt('أدخل اسم التخطيط لحفظه (Enter layout name):', `تخطيط ${new Date().toLocaleDateString('ar-EG')}`);
    if (!name?.trim()) return;

    const newLayout: SavedLayout = {
      id: `layout-${Date.now()}`,
      name: name.trim(),
      createdAt: new Date().toISOString(),
      layoutType,
      sizes: layoutSizes,
      cells: cells.map((c) => ({
        id: c.id,
        symbol: c.symbol,
        timeframe: c.timeframe,
        chartType: c.chartType,
        indicators: c.indicators,
      })),
    };

    const next = [...savedLayouts, newLayout];
    setSavedLayouts(next);
    try {
      localStorage.setItem('matrix.layouts', JSON.stringify(next));
    } catch {}
    setIsLayoutMenuOpen(false);
  };

  const handleLoadLayout = (layout: SavedLayout) => {
    const lt = isLayoutType(layout.layoutType) ? layout.layoutType : '1';
    setLayoutType(lt);
    setMaximizedCellId(null);
    if (layout.sizes) pendingSizesRef.current = layout.sizes;
    setCells((prev) =>
      prev.map((c, i) => {
        const savedCell = layout.cells[i];
        if (!savedCell) return c;
        const symObj = symbols.find((s) => s.symbol === savedCell.symbol) || symbols[0];
        return {
          ...c,
          symbol: savedCell.symbol,
          timeframe: savedCell.timeframe,
          chartType: savedCell.chartType,
          candles: generateCandles(symObj.price, savedCell.timeframe, 150),
          indicators: savedCell.indicators || loadCellIndicators(c.id),
        };
      })
    );
    setIsLayoutMenuOpen(false);
  };

  const handleDeleteLayout = (id: string) => {
    const next = savedLayouts.filter((l) => l.id !== id);
    setSavedLayouts(next);
    try {
      localStorage.setItem('matrix.layouts', JSON.stringify(next));
    } catch {}
  };

  // Visible cells calculation based on layout (Part 4.1 & Part 1.5)
  const maxCells = isPhone ? 1 : isTablet ? 2 : 4;
  const layoutSpec = useMemo(() => effectiveLayout(layoutType, maxCells), [layoutType, maxCells]);
  const { sizes: layoutSizes, setSizes: setLayoutSizes, resetSizes: resetLayoutSizes } = useLayoutSizes(layoutSpec);

  useEffect(() => {
    if (pendingSizesRef.current) {
      setLayoutSizes(pendingSizesRef.current);
      pendingSizesRef.current = null;
    }
  }, [layoutSpec, setLayoutSizes]);

  const visibleCells = useMemo(() => {
    // 1.5 Multi-chart layouts: on phone force a single chart
    if (isPhone) {
      const active = cells.find((c) => c.id === activeCellId) || cells[0];
      return [active];
    }
    if (maximizedCellId) {
      return cells.filter((c) => c.id === maximizedCellId);
    }
    return cells.slice(0, layoutSpec.areas.length);
  }, [cells, layoutSpec, maximizedCellId, isPhone, activeCellId]);

  const activeSymbolObj = symbols.find((s) => s.symbol === activeCell.symbol) || symbols[0];
  const activeAlertsCount = alerts.filter((a) => a.active && !a.triggered).length;

  return (
    <div className="flex flex-col h-full w-full bg-[#08111E] text-[#E8EEF9] select-none overflow-hidden font-sans">
      {/* Price Alert Banner Notification (Part 5.3) */}
      {activeNotification && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#0F172A]/95 border border-amber-500/70 text-amber-300 px-4 py-2.5 rounded-xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-4">
          <Bell className="w-5 h-5 text-amber-400 animate-bounce" />
          <div className="flex flex-col text-xs">
            <span className="font-bold text-white text-sm">
              تنبيه سعر! {activeNotification.alert.symbol} وصل إلى {activeNotification.price}
            </span>
            <span className="text-[#94A3B8]">{activeNotification.alert.note}</span>
          </div>
          <button
            onClick={() => setActiveNotification(null)}
            className="p-1 rounded text-[#94A3B8] hover:text-white transition-colors ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* 1. TOP TOOLBAR (TradingView Pro Standard - horizontally scrollable on tablet so nothing is cut) */}
      <div className="h-11 bg-[#0A101D] border-b border-[#1E283D] px-2.5 sm:px-3 flex items-center justify-between text-xs shrink-0 gap-2 z-20 overflow-x-auto no-scrollbar scroll-smooth">
        {/* Left Side: Symbol search, Timeframes, Chart Type, Indicators */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Symbol Search Trigger (Part 6.1) */}
          <button
            onClick={() => setIsSymbolSearchOpen(true)}
            title="بحث عن رمز (Ctrl+K)"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#131E33] hover:bg-[#1A2A44] border border-[#233554] text-[#E8EEF9] font-bold font-mono transition-colors"
          >
            <span className={`w-2 h-2 rounded-full shrink-0 ${activeCell.isDemo ? 'bg-amber-400' : 'bg-emerald-400'}`} />
            <span className="text-sm tracking-wide">{activeCell.symbol}</span>
            <Search className="w-3 h-3 text-[#7B8DA8] ml-1" />
          </button>

          {/* 1.2 Demo/Live label in header */}
          {activeCell.isDemo ? (
            <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[10px] font-bold font-sans">
              بيانات تجريبية
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-[#22C55E] text-[10px] font-bold font-sans">
              سوق مباشر
            </span>
          )}

          {/* 1.5 Market status badge in terminal header */}
          {marketStatus && (
            <span
              title={`الجلسة: ${marketStatus.currentSession} • القادمة: ${marketStatus.nextSession}`}
              className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono border ${
                marketStatus.isOpen
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                  : 'bg-rose-500/10 text-rose-400 border-rose-500/25'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  marketStatus.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                }`}
              />
              <span>{marketStatus.isOpen ? 'السوق مفتوح' : 'مغلق'}</span>
            </span>
          )}

          <div className="w-[1px] h-4 bg-[#1E283D]" />

          {/* 1.2 Timeframe Bar (scrolls horizontally on phones) */}
          <div className="flex items-center gap-0.5 bg-[#101827] p-0.5 rounded-lg border border-[#1E283D] overflow-x-auto no-scrollbar scroll-smooth shrink-0 max-w-[190px] sm:max-w-none">
            {(['1m', '5m', '15m', '1h', '4h', '1D'] as Timeframe[]).map((tf) => {
              const isTfActive = activeCell.timeframe === tf;
              return (
                <button
                  key={tf}
                  onClick={() => handleTimeframeChange(tf)}
                  className={`px-2 py-1 rounded text-xs font-mono shrink-0 transition-colors cursor-pointer ${
                    isTfActive
                      ? 'bg-[#1C2E4A] text-[#2DD4BF] font-bold shadow-xs'
                      : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
                  }`}
                >
                  {tf.replace('1D', 'D').replace('1h', '1H').replace('4h', '4H')}
                </button>
              );
            })}
          </div>

          <div className="w-[1px] h-4 bg-[#1E283D]" />

          {/* Chart Type Selector Dropdown (Part 2.1) */}
          <div className="relative">
            <button
              onClick={() => setIsChartTypeMenuOpen(!isChartTypeMenuOpen)}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#101827] border border-[#1E283D] text-[#A3B4D0] hover:text-white transition-colors"
            >
              <span>
                {activeCell.chartType === 'candles' && 'الشموع اليابانية'}
                {activeCell.chartType === 'hollow' && 'الشموع المفرغة'}
                {activeCell.chartType === 'heikin_ashi' && 'هيكين آشي'}
                {activeCell.chartType === 'bars' && 'أعمدة السعر'}
                {activeCell.chartType === 'line' && 'خطي'}
                {activeCell.chartType === 'area' && 'مساحي'}
              </span>
              <ChevronDown className="w-3 h-3 text-[#7B8DA8]" />
            </button>

            {isChartTypeMenuOpen && (
              <div className="absolute top-8 left-0 z-50 w-44 bg-[#0E1626] border border-[#243049] rounded-lg shadow-2xl py-1 text-xs">
                {(
                  [
                    { id: 'candles', label: 'الشموع اليابانية' },
                    { id: 'hollow', label: 'الشموع المفرغة (Hollow)' },
                    { id: 'heikin_ashi', label: 'هيكين آشي (Heikin Ashi)' },
                    { id: 'bars', label: 'أعمدة السعر (OHLC Bars)' },
                    { id: 'line', label: 'خطي (Line)' },
                    { id: 'area', label: 'مساحي (Area)' },
                  ] as { id: ChartType; label: string }[]
                ).map((ct) => (
                  <button
                    key={ct.id}
                    onClick={() => handleChartTypeChange(ct.id)}
                    className={`w-full text-right px-3 py-1.5 hover:bg-[#1C2740] flex items-center justify-between transition-colors ${
                      activeCell.chartType === ct.id ? 'text-[#2DD4BF] font-bold bg-[#152338]' : 'text-[#E8EEF9]'
                    }`}
                  >
                    <span>{ct.label}</span>
                    {activeCell.chartType === ct.id && <Check className="w-3.5 h-3.5 text-[#2DD4BF]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="w-[1px] h-4 bg-[#1E283D]" />

          {/* Indicators Button */}
          <button
            onClick={() => setIsIndicatorsModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#131E33] hover:bg-[#1A2A44] border border-[#233554] text-[#A3B4D0] hover:text-white transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-[#2DD4BF]" />
            <span>المؤشرات ({activeCell.indicators.length})</span>
          </button>
        </div>

        {/* Right Side: Alerts, Order Flow, Layout selector, Syncs, AI Copilot, Orders */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Order Flow Toggle Button (Part 4.3) */}
          <button
            onClick={() => setIsOrderFlowOpen(!isOrderFlowOpen)}
            title="لوحة تدفق الأوامر التقديرية (Order Flow)"
            className={`flex items-center gap-1 px-2 py-1 rounded-lg border text-xs font-semibold transition-colors cursor-pointer ${
              isOrderFlowOpen
                ? 'bg-[#1C2E4A] text-[#2DD4BF] border-[#2DD4BF]/40'
                : 'bg-[#101827] text-[#A3B4D0] border-[#1E283D] hover:text-white'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-[#2DD4BF]" />
            <span className="hidden sm:inline">تدفق الأوامر</span>
          </button>

          {/* Price Alerts Trigger Button (Part 5) */}
          <button
            onClick={() => {
              setAlertModalInitialPrice(activeSymbolObj.price);
              setIsAlertsOpen(true);
            }}
            title="التنبيهات السعرية"
            className="relative p-1.5 rounded-lg bg-[#101827] border border-[#1E283D] text-[#A3B4D0] hover:text-white transition-colors"
          >
            <Bell className="w-3.5 h-3.5" />
            {activeAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 text-[#0F172A] font-bold text-[9px] flex items-center justify-center">
                {activeAlertsCount}
              </span>
            )}
          </button>

          {/* Sync Controls Dropdown (Part 4.3) */}
          <div className="hidden sm:flex items-center gap-1 bg-[#101827] p-0.5 rounded-lg border border-[#1E283D]">
            <button
              onClick={() => setSyncSymbol(!syncSymbol)}
              title="مزامنة الرمز عبر جميع الشاشات"
              className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                syncSymbol ? 'bg-[#1C2E4A] text-[#2DD4BF] font-bold' : 'text-[#7B8DA8] hover:text-white'
              }`}
            >
              مزامنة الرمز
            </button>
            <button
              onClick={() => setSyncTimeframe(!syncTimeframe)}
              title="مزامنة الفاصل الزمني عبر جميع الشاشات"
              className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                syncTimeframe ? 'bg-[#1C2E4A] text-[#2DD4BF] font-bold' : 'text-[#7B8DA8] hover:text-white'
              }`}
            >
              مزامنة الإطار
            </button>
            <button
              onClick={() => setSyncCrosshair(!syncCrosshair)}
              title="مزامنة مؤشر الفأرة (Crosshair)"
              className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                syncCrosshair ? 'bg-[#1C2E4A] text-[#2DD4BF] font-bold' : 'text-[#7B8DA8] hover:text-white'
              }`}
            >
              مزامنة الفأرة
            </button>
          </div>

          {/* 1.5 Layout Selector (hidden on phone, forced single) */}
          <div className="relative hidden md:block">
            <div className="flex items-center gap-0.5 bg-[#101827] p-0.5 rounded-lg border border-[#1E283D]">
              <LayoutPicker
                value={layoutType}
                maxCells={maxCells}
                onChange={(id) => {
                  setLayoutType(id);
                  setMaximizedCellId(null);
                }}
              />

              {/* Layout Save/Load Dropdown trigger */}
              <button
                onClick={() => setIsLayoutMenuOpen(!isLayoutMenuOpen)}
                title="إدارة التخطيطات المحفوظة (Layouts)"
                className="p-1 rounded text-[#7B8DA8] hover:text-white transition-colors"
              >
                <FolderOpen className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Layout Management Menu (Part 4.4) */}
            {isLayoutMenuOpen && (
              <div className="absolute top-8 right-0 z-50 w-52 bg-[#0E1626] border border-[#243049] rounded-lg shadow-2xl p-2 text-xs">
                <div className="flex items-center justify-between pb-2 border-b border-[#1E283D] mb-2 font-bold text-[#E8EEF9]">
                  <span>التخطيطات (Layouts)</span>
                  <button
                    onClick={handleSaveCurrentLayout}
                    className="flex items-center gap-1 text-[10px] text-[#2DD4BF] hover:underline"
                  >
                    <Save className="w-3 h-3" />
                    <span>حفظ كـ</span>
                  </button>
                </div>
                {savedLayouts.length === 0 ? (
                  <div className="text-[#64748B] text-center py-2 text-[11px]">لا توجد تخطيطات محفوظة</div>
                ) : (
                  <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                    {savedLayouts.map((sl) => (
                      <div
                        key={sl.id}
                        className="flex items-center justify-between p-1.5 rounded hover:bg-[#162238] transition-colors"
                      >
                        <button
                          onClick={() => handleLoadLayout(sl)}
                          className="text-right text-[#E2E8F0] font-semibold hover:text-[#2DD4BF]"
                        >
                          {sl.name} ({sl.layoutType})
                        </button>
                        <button
                          onClick={() => handleDeleteLayout(sl.id)}
                          className="text-[#94A3B8] hover:text-rose-400 p-0.5"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI Copilot Button */}
          <button
            onClick={() => setIsAiCopilotOpen(!isAiCopilotOpen)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-teal-950 to-blue-950 border border-teal-500/50 text-[#2DD4BF] hover:border-teal-400 font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
            <span className="hidden sm:inline">المساعد الذكي (AI Copilot)</span>
          </button>

          {/* Order Panel Button */}
          <button
            onClick={() => setIsOrderPanelOpen(!isOrderPanelOpen)}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
              isOrderPanelOpen
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-950/50'
                : 'bg-[#131E33] border-[#233554] text-emerald-400 hover:border-emerald-500'
            }`}
            title="لوحة الأوامر المتقدمة وإدارة المخاطر"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">أمر تداول</span>
          </button>

          {/* Shortcut Help Button (Part 7.1) */}
          <button
            onClick={() => setIsShortcutsModalOpen(true)}
            title="اختصارات لوحة المفاتيح (?)"
            className="p-1 rounded bg-[#101827] border border-[#1E283D] text-[#7B8DA8] hover:text-white transition-colors"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>

          {/* Toggle Watchlist button */}
          <button
            onClick={() => setIsWatchlistCollapsed(!isWatchlistCollapsed)}
            title="إظهار/إخفاء قائمة المراقبة"
            className="p-1 rounded bg-[#101827] border border-[#1E283D] text-[#7B8DA8] hover:text-white transition-colors"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE: Left Tools Rail + Center Charts Grid + Right Watchlist */}
      <div className="flex-1 flex w-full h-[calc(100%-44px)] overflow-hidden relative">
        {/* Left Drawing Rail (hidden on phones, opened via floating button) */}
        <div className="hidden md:flex w-10 bg-[#0B1220] border-r border-[#1E283D] flex-col items-center py-2 gap-1.5 shrink-0 z-10 text-xs select-none">
          {/* Trendline */}
          <button
            onClick={() => setActiveTool(activeTool === 'trendline' ? 'none' : 'trendline')}
            title="خط اتجاه (Trendline - Alt+T)"
            className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
              activeTool === 'trendline' ? 'bg-[#1C2E4A] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-white'
            }`}
          >
            ╱
          </button>

          {/* Horizontal Line */}
          <button
            onClick={() => setActiveTool(activeTool === 'horizontal' ? 'none' : 'horizontal')}
            title="خط أفقي (Horizontal - Alt+H)"
            className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
              activeTool === 'horizontal' ? 'bg-[#1C2E4A] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-white'
            }`}
          >
            ―
          </button>

          {/* Vertical Line */}
          <button
            onClick={() => setActiveTool(activeTool === 'vertical' ? 'none' : 'vertical')}
            title="خط رأسي (Vertical Line)"
            className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
              activeTool === 'vertical' ? 'bg-[#1C2E4A] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-white'
            }`}
          >
            │
          </button>

          {/* Ray Line */}
          <button
            onClick={() => setActiveTool(activeTool === 'ray' ? 'none' : 'ray')}
            title="شعاع (Ray Line)"
            className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
              activeTool === 'ray' ? 'bg-[#1C2E4A] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-white'
            }`}
          >
            ⟶
          </button>

          {/* Extended Line */}
          <button
            onClick={() => setActiveTool(activeTool === 'extended' ? 'none' : 'extended')}
            title="خط ممتد للطرفين (Extended Line)"
            className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
              activeTool === 'extended' ? 'bg-[#1C2E4A] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-white'
            }`}
          >
            ⟷
          </button>

          {/* Parallel Channel */}
          <button
            onClick={() => setActiveTool(activeTool === 'channel' ? 'none' : 'channel')}
            title="قناة سعرية متوازية (Parallel Channel)"
            className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
              activeTool === 'channel' ? 'bg-[#1C2E4A] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-white'
            }`}
          >
            ∥
          </button>

          {/* Arrow */}
          <button
            onClick={() => setActiveTool(activeTool === 'arrow' ? 'none' : 'arrow')}
            title="سهم إشارة (Arrow)"
            className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
              activeTool === 'arrow' ? 'bg-[#1C2E4A] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-white'
            }`}
          >
            ↗
          </button>

          {/* Box / Rectangle */}
          <button
            onClick={() => setActiveTool(activeTool === 'box' ? 'none' : 'box')}
            title="مستطيل منطقة دعم/مقاومة (Box/Zone)"
            className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
              activeTool === 'box' ? 'bg-[#1C2E4A] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-white'
            }`}
          >
            ▭
          </button>

          {/* Text Annotation */}
          <button
            onClick={() => setActiveTool(activeTool === 'text' ? 'none' : 'text')}
            title="نص توضيحي على الشارت (Text Label)"
            className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
              activeTool === 'text' ? 'bg-[#1C2E4A] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-white'
            }`}
          >
            <Type className="w-3.5 h-3.5" />
          </button>

          {/* Fibonacci */}
          <button
            onClick={() => setActiveTool(activeTool === 'fibonacci' ? 'none' : 'fibonacci')}
            title="مستويات فيبوناتشي (Fibonacci - Alt+F)"
            className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
              activeTool === 'fibonacci' ? 'bg-[#1C2E4A] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-white'
            }`}
          >
            ≡
          </button>

          {/* Measure Tool */}
          <button
            onClick={() => setActiveTool(activeTool === 'measure' ? 'none' : 'measure')}
            title="أداة قياس النقاط والنسبة (Measure Tool)"
            className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
              activeTool === 'measure' ? 'bg-[#1C2E4A] text-[#38BDF8]' : 'text-[#7B8DA8] hover:text-white'
            }`}
          >
            <Ruler className="w-3.5 h-3.5" />
          </button>

          {/* Long Position Tool (3.1) */}
          <button
            onClick={() => setActiveTool(activeTool === 'position_long' ? 'none' : 'position_long')}
            title="صفقة شراء محسوبة العائد للمخاطرة (Long Position)"
            className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
              activeTool === 'position_long' ? 'bg-[#1C2E4A] text-[#22C55E]' : 'text-[#7B8DA8] hover:text-[#22C55E]'
            }`}
          >
            ⤒
          </button>

          {/* Short Position Tool (3.1) */}
          <button
            onClick={() => setActiveTool(activeTool === 'position_short' ? 'none' : 'position_short')}
            title="صفقة بيع محسوبة العائد للمخاطرة (Short Position)"
            className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
              activeTool === 'position_short' ? 'bg-[#1C2E4A] text-[#EF4444]' : 'text-[#7B8DA8] hover:text-[#EF4444]'
            }`}
          >
            ⤓
          </button>

          <div className="w-5 h-[1px] bg-[#1E283D] my-0.5" />

          {/* Magnet Mode Toggle (Part 3.3) */}
          <button
            onClick={() => setIsMagnetOn(!isMagnetOn)}
            title={isMagnetOn ? 'إلغاء وضع المغناطيس (Magnet ON)' : 'تفعيل وضع المغناطيس للمحاذاة التلقائية (Magnet OFF)'}
            className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
              isMagnetOn ? 'bg-[#1C2E4A] text-[#2DD4BF] ring-1 ring-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-white'
            }`}
          >
            <Magnet className="w-3.5 h-3.5" />
          </button>

          {/* Object Tree Panel Trigger (Part 3.5) */}
          <button
            onClick={() => setIsObjectTreeOpen(true)}
            title="شجرة الكائنات والمؤشرات (Object Tree)"
            className="w-7 h-7 rounded flex items-center justify-center text-[#7B8DA8] hover:text-[#38BDF8] hover:bg-[#1C2740] transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
          </button>

          {/* Bottom Actions: Clear all & Deselect */}
          <div className="mt-auto flex flex-col items-center gap-1.5 pt-2 border-t border-[#182338]">
            <button
              onClick={() => handleClearDrawings(activeCell.id)}
              title="مسح جميع رسومات الشارت النشط (Clear Drawings)"
              className="w-7 h-7 rounded flex items-center justify-center text-[#7B8DA8] hover:text-rose-400 hover:bg-[#1C2740] transition-colors cursor-pointer text-xs"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setActiveTool('none')}
              title="إلغاء تفعيل الأداة (Esc)"
              className="w-7 h-7 rounded flex items-center justify-center text-[#7B8DA8] hover:text-white hover:bg-[#1C2740] transition-colors cursor-pointer text-xs"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Center: Chart Grid */}
        <div className={`flex-1 flex-col h-full overflow-hidden bg-[#050B14] ${isPhone && (!isWatchlistCollapsed || currentTab !== 'home') ? 'hidden' : 'flex'}`}>
          <ChartLayoutGrid
            spec={layoutSpec}
            sizes={layoutSizes}
            onSizesChange={setLayoutSizes}
            onResetSizes={resetLayoutSizes}
          >
            {visibleCells.map((cell) => {
              const symObj = symbols.find((s) => s.symbol === cell.symbol) || symbols[0];
              // Header price/change come from the cell's real data; the simulated symbol list is only a fallback.
              const lastCandle = cell.candles[cell.candles.length - 1];
              const headPrice = !cell.isDemo && lastCandle ? lastCandle.close : symObj.price;
              const headChange =
                !cell.isDemo && typeof cell.changePct === 'number'
                  ? Number(cell.changePct.toFixed(2))
                  : cell.isDemo
                  ? symObj.change24h
                  : null;
              const isMax = maximizedCellId === cell.id;
              const isActive = activeCellId === cell.id;

              return (
                <div
                  key={cell.id}
                  onClick={() => setActiveCellId(cell.id)}
                  className={`flex flex-col h-full w-full overflow-hidden bg-[#0A101D] border ${
                    isActive ? 'border-[#2DD4BF]/60 shadow-[0_0_12px_rgba(45,212,191,0.08)]' : 'border-[#1E283D]'
                  } rounded-xs relative group transition-colors`}
                >
                  {/* Cell Top Header */}
                  <div className="h-7 bg-[#0C1220] border-b border-[#1E283D] px-2.5 flex items-center justify-between text-xs z-10 shrink-0 select-none">
                    {/* Symbol with dot, Price, Change */}
                    <div className="flex items-center gap-2">
                      <select
                        value={cell.symbol}
                        onChange={(e) => handleCellSymbolChange(cell.id, e.target.value)}
                        className="bg-transparent text-[#E8EEF9] font-bold text-xs cursor-pointer outline-none border-none pr-1 font-mono"
                      >
                        {symbols.map((s) => (
                          <option key={s.symbol} value={s.symbol} className="bg-[#0B1220] text-[#E8EEF9]">
                            {s.symbol}
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <span className="text-[#E8EEF9] font-bold">{headPrice.toFixed(symObj.precision)}</span>
                        {headChange !== null && (
                          <span className={`font-semibold ${headChange >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                            {headChange >= 0 ? '+' : ''}
                            {headChange}%
                          </span>
                        )}
                        {cell.isDemo ? (
                          <span className="px-1.5 py-0.2 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 text-[9px] font-bold font-sans">
                            بيانات تجريبية
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 border border-emerald-500/30 text-[#22C55E] text-[9px] font-bold font-sans">
                            مباشر
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Cell Timeframes, Clear, Maximize */}
                    <div className="flex items-center gap-1">
                      {(['15m', '1h', '4h', '1D'] as Timeframe[]).map((tf) => {
                        const isTfActive = cell.timeframe === tf;
                        return (
                          <button
                            key={tf}
                            onClick={() => handleCellTimeframeChange(cell.id, tf)}
                            className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-medium transition-colors ${
                              isTfActive
                                ? 'bg-[#16293D] text-[#2DD4BF] font-bold border border-[#2DD4BF]/50'
                                : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
                            }`}
                          >
                            {tf.replace('1D', 'D').replace('1h', '1H').replace('4h', '4H')}
                          </button>
                        );
                      })}

                      {/* Trash button for cell drawings */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleClearDrawings(cell.id);
                        }}
                        title="مسح رسومات هذا الشارت"
                        className="text-[#64748B] hover:text-rose-400 text-xs transition-colors pl-1"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>

                      {/* Maximize / Restore Toggle */}
                      {(layoutSpec.areas.length > 1 || isMax) && (
                        <button
                          onClick={() => setMaximizedCellId(isMax ? null : cell.id)}
                          title={isMax ? 'استعادة الشبكة' : 'تكبير الشارت'}
                          className="text-[#7B8DA8] hover:text-[#2DD4BF] text-xs transition-colors pl-1"
                        >
                          {isMax ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Chart Canvas Area */}
                  <div className="flex-1 w-full h-full relative overflow-hidden bg-[#060D19]">
                    {/* 1.2 Loading skeleton overlay */}
                    {cell.isLoading && (
                      <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-[#060D19]/80 backdrop-blur-xs">
                        <div className="w-8 h-8 rounded-full border-2 border-[#2DD4BF] border-t-transparent animate-spin mb-2" />
                        <span className="text-xs text-[#A3B4D0] font-mono">جاري تحميل بيانات الشارت...</span>
                      </div>
                    )}

                    {/* 1.2 Visible Demo Data Banner on Canvas (so user never confuses demo with real) */}
                    {cell.isDemo && (
                      <div className="absolute top-2.5 left-2.5 z-20 pointer-events-none flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0A101D]/90 border border-amber-500/40 text-amber-400 text-[10px] font-bold backdrop-blur-xs shadow-lg">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        <span>بيانات تجريبية</span>
                      </div>
                    )}
                    <MatrixChartCanvas
                      symbol={cell.symbol}
                      candles={cell.candles}
                      timeframe={cell.timeframe}
                      precision={symObj ? symObj.precision : 4}
                      pipScale={symObj ? symObj.pipScale : 0.0001}
                      chartType={cell.chartType}
                      indicators={indicators}
                      indicatorInstances={cell.indicators}
                      onUpdateIndicatorInstance={(ind) => handleUpdateIndicator(cell.id, ind)}
                      onRemoveIndicatorInstance={(indId) => handleRemoveIndicator(cell.id, indId)}
                      onOpenIndicatorSettings={(ind) => setEditingIndicator(ind)}
                      activeDrawingTool={activeTool}
                      drawings={cell.drawings}
                      onDrawingComplete={(d) => handleAddDrawing(cell.id, d)}
                      onUpdateDrawing={(d) => handleUpdateDrawing(cell.id, d)}
                      onDeleteDrawing={(dId) => handleDeleteDrawing(cell.id, dId)}
                      onClearDrawings={() => handleClearDrawings(cell.id)}
                      onResetActiveTool={() => setActiveTool('none')}
                      onFocusCell={() => setActiveCellId(cell.id)}
                      showGrid={showGrid}
                      magnetMode={isMagnetOn}
                      onOpenAlertModal={(targetPrice) => {
                        setAlertModalInitialPrice(targetPrice);
                        setIsAlertsOpen(true);
                      }}
                      syncedCrosshairTime={syncCrosshair ? syncedCrosshairTime : null}
                      onCrosshairTimeChange={(time) => {
                        if (syncCrosshair) setSyncedCrosshairTime(time);
                      }}
                      isDemo={cell.isDemo}
                    />
                  </div>

                  {/* 1.2 Mobile Quick Trade Strip (< 768px) below the chart (~60% height) */}
                  <div className="md:hidden flex-none bg-[#0B1424] border-t border-[#1E2E4A] px-3 py-2 flex items-center justify-between gap-2 shrink-0">
                    <div className="flex flex-col min-w-0 pr-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-white font-mono text-xs">{symObj.symbol}</span>
                        {headChange !== null && (
                          <span className={`text-[11px] font-mono font-bold ${headChange >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                            {headChange >= 0 ? '+' : ''}
                            {headChange}%
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-[#7B8DA8] font-mono">
                        {headPrice.toFixed(symObj.precision)}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          setTradingDrawerTab('orders');
                          setIsOrderPanelOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-bold text-xs flex items-center gap-1 active:scale-95 cursor-pointer"
                      >
                        <span>شراء</span>
                      </button>
                      <button
                        onClick={() => {
                          setTradingDrawerTab('orders');
                          setIsOrderPanelOpen(true);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-400 font-bold text-xs flex items-center gap-1 active:scale-95 cursor-pointer"
                      >
                        <span>بيع</span>
                      </button>
                      <button
                        onClick={() => setIsAiCopilotOpen(true)}
                        className="p-1.5 rounded-lg bg-[#16233B] border border-[#24344E] text-[#2DD4BF] active:scale-95 cursor-pointer"
                        title="المساعد الذكي"
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </ChartLayoutGrid>
        </div>

        {/* 1.2 Floating Drawing Tools Button for Phone (< 768px) - strictly on chart tab */}
        {(!isPhone || (currentTab === 'home' && isWatchlistCollapsed)) && (
          <button
            onClick={() => setIsMobileDrawingSheetOpen(true)}
            title="أدوات الرسم الفني"
            className="md:hidden fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] right-4 z-30 w-11 h-11 rounded-full bg-[#132034] border border-[#2DD4BF]/60 text-[#2DD4BF] shadow-2xl flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
          >
            <PenTool className="w-5 h-5" />
            {activeTool !== 'none' && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-[#2DD4BF] text-[#042F2E] font-bold text-[9px] flex items-center justify-center shadow-xs">
                ✓
              </span>
            )}
          </button>
        )}

        {/* 1.2 Mobile Drawing Tools Bottom Sheet */}
        {isMobileDrawingSheetOpen && (
          <div
            className="md:hidden fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150"
            onClick={() => setIsMobileDrawingSheetOpen(false)}
          >
            <div
              className="bg-[#0C1526] border-t border-[#1E2E4A] rounded-t-3xl p-4 space-y-3 max-h-[75vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Drag Handle */}
              <div
                className="w-12 h-1.5 bg-[#24344E] rounded-full mx-auto cursor-grab"
                onClick={() => setIsMobileDrawingSheetOpen(false)}
              />

              <div className="flex items-center justify-between pb-2 border-b border-[#1E2E4A]">
                <div className="flex items-center gap-2">
                  <PenTool className="w-4 h-4 text-[#2DD4BF]" />
                  <span className="font-bold text-sm text-white">أدوات الرسم والتحليل</span>
                </div>
                <button
                  onClick={() => setIsMobileDrawingSheetOpen(false)}
                  className="p-1 rounded-lg text-[#7B8DA8] hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawing Tools Grid */}
              <div className="grid grid-cols-3 gap-2 text-xs">
                {[
                  { id: 'trendline', label: 'خط اتجاه', icon: '╱' },
                  { id: 'horizontal', label: 'خط أفقي', icon: '―' },
                  { id: 'vertical', label: 'خط رأسي', icon: '│' },
                  { id: 'ray', label: 'شعاع', icon: '⟶' },
                  { id: 'extended', label: 'خط ممتد', icon: '⟷' },
                  { id: 'channel', label: 'قناة متوازية', icon: '∥' },
                  { id: 'arrow', label: 'سهم إشارة', icon: '↗' },
                  { id: 'box', label: 'مستطيل منطقة', icon: '▭' },
                  { id: 'text', label: 'نص توضيحي', icon: 'T' },
                  { id: 'measure', label: 'مسطرة قياس', icon: '📏' },
                  { id: 'fibonacci', label: 'فيبوناتشي', icon: '0.618' },
                  { id: 'position_long', label: 'صفقة شراء', icon: '▲ Long' },
                  { id: 'position_short', label: 'صفقة بيع', icon: '▼ Short' },
                ].map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => {
                      setActiveTool(tool.id as DrawingTool);
                      setIsMobileDrawingSheetOpen(false);
                    }}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border min-h-[52px] transition-all cursor-pointer ${
                      activeTool === tool.id
                        ? 'bg-[#1C2E4A] border-[#2DD4BF] text-[#2DD4BF] font-bold shadow-md'
                        : 'bg-[#121E33] border-[#1E2E4A] text-[#A3B4D0] hover:text-white'
                    }`}
                  >
                    <span className="text-base mb-0.5 font-mono">{tool.icon}</span>
                    <span className="text-[10px] leading-tight text-center">{tool.label}</span>
                  </button>
                ))}
              </div>

              {/* Clear and Magnet Controls */}
              <div className="flex items-center gap-2 pt-2 border-t border-[#1E2E4A]">
                <button
                  onClick={() => setIsMagnetOn(!isMagnetOn)}
                  className={`flex-1 py-2 rounded-xl border text-xs font-semibold flex items-center justify-center gap-2 transition-colors ${
                    isMagnetOn
                      ? 'bg-[#1C2E4A] text-[#2DD4BF] border-[#2DD4BF]'
                      : 'bg-[#121E33] text-[#7B8DA8] border-[#1E2E4A]'
                  }`}
                >
                  <Magnet className="w-4 h-4" />
                  <span>المغناطيس {isMagnetOn ? 'مفعّل' : 'معطّل'}</span>
                </button>

                <button
                  onClick={() => {
                    handleClearDrawings(activeCell.id);
                    setIsMobileDrawingSheetOpen(false);
                  }}
                  className="py-2 px-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>مسح الكل</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 1.4 Right Trading & Position Panel (Bottom Sheet on Phone) */}
        {isOrderPanelOpen && (
          <>
            <div
              className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-xs animate-in fade-in duration-150"
              onClick={() => setIsOrderPanelOpen(false)}
            />
            <div className="fixed inset-x-0 bottom-0 z-50 md:relative md:inset-auto md:w-96 md:z-20 md:border-l md:border-[#1E283D] bg-[#0B1220] rounded-t-3xl md:rounded-none max-h-[85vh] md:max-h-full h-[80vh] md:h-full overflow-hidden shadow-2xl flex flex-col animate-in slide-in-from-bottom duration-200 md:animate-none">
              {/* Mobile Drag Handle with swipe down to close */}
              <div
                className="md:hidden py-2 shrink-0 cursor-grab flex flex-col items-center select-none"
                onTouchStart={(e) => {
                  (e.currentTarget as any)._touchStartY = e.touches[0].clientY;
                }}
                onTouchMove={(e) => {
                  const startY = (e.currentTarget as any)._touchStartY;
                  if (startY && e.touches[0].clientY - startY > 50) {
                    setIsOrderPanelOpen(false);
                  }
                }}
                onClick={() => setIsOrderPanelOpen(false)}
              >
                <div className="w-12 h-1.5 bg-[#24344E] rounded-full active:bg-[#2DD4BF]" />
              </div>

              <div className="p-2 flex justify-between items-center bg-[#0d1424] border-b border-[#1E283D] shrink-0">
                <div className="flex items-center gap-1.5 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                  <button
                    onClick={() => setTradingDrawerTab('orders')}
                    className={`px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                      tradingDrawerTab === 'orders'
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    أمر جديد
                  </button>
                  <button
                    onClick={() => setTradingDrawerTab('positions')}
                    className={`px-3 py-1 rounded text-xs font-bold transition-colors cursor-pointer ${
                      tradingDrawerTab === 'positions'
                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    المراكز والصفقات
                  </button>
                </div>
                <button
                  onClick={() => setIsOrderPanelOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {tradingDrawerTab === 'orders' ? (
                  <OrderPanel currentSymbol={activeSymbolObj.symbol} currentPrice={activeSymbolObj.price} />
                ) : (
                  <PositionPanel />
                )}
              </div>
            </div>
          </>
        )}

        {/* Right Watchlist Panel (Part 6 & Part 7.2) */}
        {!isWatchlistCollapsed && (
          <>
            <div
              className="md:hidden fixed inset-0 bg-black/50 z-20 backdrop-blur-xs"
              onClick={() => setIsWatchlistCollapsed(true)}
            />
            <div className="fixed md:relative inset-y-0 right-0 z-30 md:z-10 w-full md:w-[300px] min-[1101px]:w-[325px] xl:w-[340px] md:min-w-[300px] border-l border-[#1E283D] bg-[#0B1220] shrink-0 h-full overflow-hidden flex flex-col shadow-2xl md:shadow-none">
              <WatchlistPanel
                symbols={symbols}
                activeSymbol={activeCell.symbol}
                onSelectSymbol={(sym) => {
                  handleSelectSymbol(sym);
                  if (isPhone) setIsWatchlistCollapsed(true);
                }}
                priceFlashMap={priceFlashMap}
                isMobileMode={isPhone}
                onCloseMobile={() => setIsWatchlistCollapsed(true)}
              />
            </div>
          </>
        )}
      </div>

      {/* AI Copilot Side Drawer */}
      <AiCopilotPanel
        isOpen={isAiCopilotOpen}
        onClose={() => setIsAiCopilotOpen(false)}
        activeSymbol={activeSymbolObj}
        timeframe={masterTimeframe}
      />

      {/* Indicators Catalog Modal (Part 1.3) */}
      <IndicatorModal
        isOpen={isIndicatorsModalOpen}
        onClose={() => setIsIndicatorsModalOpen(false)}
        instances={activeCell.indicators}
        onAddInstance={(inst) => handleAddIndicator(activeCell.id, inst)}
        onUpdateInstance={(inst) => handleUpdateIndicator(activeCell.id, inst)}
        onRemoveInstance={(id) => handleRemoveIndicator(activeCell.id, id)}
        indicators={indicators}
        onChange={onUpdateIndicators}
      />

      {/* Indicator Settings Modal (Part 1.5) */}
      <IndicatorSettingsModal
        isOpen={editingIndicator !== null}
        indicator={editingIndicator}
        onClose={() => setEditingIndicator(null)}
        onSave={(updated) => {
          handleUpdateIndicator(activeCell.id, updated);
          setEditingIndicator(null);
        }}
      />

      {/* Object Tree Panel (Part 3.5) */}
      <ObjectTreePanel
        isOpen={isObjectTreeOpen}
        onClose={() => setIsObjectTreeOpen(false)}
        indicators={activeCell.indicators}
        drawings={activeCell.drawings}
        onUpdateIndicator={(ind) => handleUpdateIndicator(activeCell.id, ind)}
        onDeleteIndicator={(id) => handleRemoveIndicator(activeCell.id, id)}
        onUpdateDrawing={(d) => handleUpdateDrawing(activeCell.id, d)}
        onDeleteDrawing={(id) => handleDeleteDrawing(activeCell.id, id)}
        onClearAllDrawings={() => handleClearDrawings(activeCell.id)}
        onOpenIndicatorSettings={(ind) => setEditingIndicator(ind)}
      />

      {/* Price Alerts Panel (Part 5.2) */}
      <AlertsPanel
        isOpen={isAlertsOpen}
        onClose={() => setIsAlertsOpen(false)}
        alerts={alerts}
        symbols={symbols}
        activeSymbol={activeCell.symbol}
        onAddAlert={handleAddAlert}
        onToggleAlert={handleToggleAlert}
        onDeleteAlert={handleDeleteAlert}
        initialPrice={alertModalInitialPrice}
      />

      {/* Symbol Search Modal (Part 6.1) */}
      <SymbolSearchModal
        isOpen={isSymbolSearchOpen}
        onClose={() => setIsSymbolSearchOpen(false)}
        symbols={symbols}
        currentSymbol={activeCell.symbol}
        onSelectSymbol={(sym) => {
          handleSelectSymbol(sym);
          setIsSymbolSearchOpen(false);
        }}
      />

      {/* Keyboard Shortcuts Help Dialog (Part 7.1) */}
      {isShortcutsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs select-none">
          <div className="w-[420px] max-w-[95vw] bg-[#0E1626] border border-[#243049] rounded-xl shadow-2xl overflow-hidden p-4 text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#1E283D] mb-3">
              <div className="flex items-center gap-2 text-sm font-bold text-white">
                <HelpCircle className="w-4 h-4 text-[#2DD4BF]" />
                <span>اختصارات لوحة المفاتيح (Shortcuts)</span>
              </div>
              <button
                onClick={() => setIsShortcutsModalOpen(false)}
                className="text-[#7B8DA8] hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 font-mono">
              <div className="flex items-center justify-between py-1 border-b border-[#1A253A]">
                <span className="text-[#A3B4D0]">خط اتجاه (Trendline)</span>
                <kbd className="px-2 py-0.5 rounded bg-[#1C2740] text-[#2DD4BF]">Alt + T</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#1A253A]">
                <span className="text-[#A3B4D0]">خط أفقي (Horizontal)</span>
                <kbd className="px-2 py-0.5 rounded bg-[#1C2740] text-[#2DD4BF]">Alt + H</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#1A253A]">
                <span className="text-[#A3B4D0]">مستويات فيبوناتشي (Fibonacci)</span>
                <kbd className="px-2 py-0.5 rounded bg-[#1C2740] text-[#2DD4BF]">Alt + F</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#1A253A]">
                <span className="text-[#A3B4D0]">إلغاء تفعيل الأداة</span>
                <kbd className="px-2 py-0.5 rounded bg-[#1C2740] text-[#E8EEF9]">Esc</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#1A253A]">
                <span className="text-[#A3B4D0]">حذف الرسم المحدد</span>
                <kbd className="px-2 py-0.5 rounded bg-[#1C2740] text-rose-400">Delete / Backspace</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#1A253A]">
                <span className="text-[#A3B4D0]">تراجع / إعادة (Undo / Redo)</span>
                <kbd className="px-2 py-0.5 rounded bg-[#1C2740] text-[#38BDF8]">Ctrl + Z / Ctrl + Y</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#1A253A]">
                <span className="text-[#A3B4D0]">تبديل الأطر الزمنية</span>
                <kbd className="px-2 py-0.5 rounded bg-[#1C2740] text-[#E8EEF9]">1 - 6 (1m to 1D)</kbd>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#1A253A]">
                <span className="text-[#A3B4D0]">بحث عن رمز</span>
                <kbd className="px-2 py-0.5 rounded bg-[#1C2740] text-[#2DD4BF]">Ctrl + K</kbd>
              </div>
            </div>

            <button
              onClick={() => setIsShortcutsModalOpen(false)}
              className="mt-4 w-full py-1.5 rounded-lg bg-[#1C2E4A] hover:bg-[#253D63] text-[#2DD4BF] font-bold text-center transition-colors"
            >
              تم
            </button>
          </div>
        </div>
      )}

      {/* 4.3 Order-Flow Panel under the chart (toggle) - strictly on chart tab */}
      {(!isPhone || currentTab === 'home') && (
        <OrderFlowPanel
          isOpen={isOrderFlowOpen}
          onToggle={() => setIsOrderFlowOpen(!isOrderFlowOpen)}
          candles={activeCell.candles}
          symbol={activeCell.symbol}
          timeframe={activeCell.timeframe}
          currentTab={currentTab}
        />
      )}
    </div>
  );
};
