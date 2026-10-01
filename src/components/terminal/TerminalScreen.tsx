import React, { useState, useEffect, useMemo } from 'react';
import {
  MarketSymbol,
  Candle,
  Timeframe,
  ChartType,
  DrawingTool,
  DrawingItem,
  IndicatorSettings,
} from '../../types/market';
import { MatrixChartCanvas } from './MatrixChartCanvas';
import { WatchlistPanel } from './WatchlistPanel';
import { IndicatorModal } from './IndicatorModal';
import { generateCandles, updateLastCandleWithTick } from '../../data/candleGenerator';
import {
  Maximize2,
  Minimize2,
  ChevronDown,
  Clock,
  Sigma,
  RefreshCw,
  Settings,
  Flag,
  Calendar,
  BookOpen,
  Menu,
  Sliders,
  Sparkles,
  GripVertical,
} from 'lucide-react';

export type FrameShape = 'square' | 'rect' | 'shadow';
export type FrameCount = 1 | 2 | 3 | 4;

interface ChartCellState {
  id: string;
  symbol: string;
  timeframe: Timeframe;
  chartType: ChartType;
  candles: Candle[];
  drawings: DrawingItem[];
  providerStatus: 'Cached' | 'Provider' | 'Unavailable';
  marketStatus: 'Closed' | 'Open';
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
  onTabChange?: (tab: 'home' | 'tools' | 'academy' | 'account' | 'bot') => void;
  currentTab?: 'home' | 'tools' | 'academy' | 'account' | 'bot';
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
  // Layout states matching user's screenshots
  const [layoutShape, setLayoutShape] = useState<FrameShape>('rect');
  const [layoutCount, setLayoutCount] = useState<FrameCount>(4);
  const [timeSync, setTimeSync] = useState(false);
  const [frameShadow, setFrameShadow] = useState(false);

  // Active Drawing Tool & Lens (Left Rail)
  const [activeTool, setActiveTool] = useState<DrawingTool>('none');
  const [activeLens, setActiveLens] = useState<'clean' | 'structure' | 'momentum' | 'liquidity'>('clean');

  // Modals & Panels
  const [isIndicatorsModalOpen, setIsIndicatorsModalOpen] = useState(false);
  const [maximizedCellId, setMaximizedCellId] = useState<string | null>(null);
  const [activeBottomDock, setActiveBottomDock] = useState<string | null>(null);

  // Initialize cells matching Screenshot 1 (Rectangle 4: USDJPY, EURUSD, GBPUSD, XAUUSD)
  // or Screenshot 2 (Square 4: DXY, EURUSD, GBPUSD, XAUUSD)
  const [cells, setCells] = useState<ChartCellState[]>(() => {
    return [
      {
        id: 'cell-1',
        symbol: 'USDJPY',
        timeframe: '4h',
        chartType: 'candles',
        candles: generateCandles(157.295, '4h', 140),
        drawings: [],
        providerStatus: 'Cached',
        marketStatus: 'Closed',
      },
      {
        id: 'cell-2',
        symbol: 'EURUSD',
        timeframe: '15m',
        chartType: 'candles',
        candles: generateCandles(1.13913, '15m', 140),
        drawings: [],
        providerStatus: 'Cached',
        marketStatus: 'Closed',
      },
      {
        id: 'cell-3',
        symbol: 'GBPUSD',
        timeframe: '1h',
        chartType: 'candles',
        candles: generateCandles(1.32466, '1h', 140),
        drawings: [],
        providerStatus: 'Cached',
        marketStatus: 'Closed',
      },
      {
        id: 'cell-4',
        symbol: 'XAUUSD',
        timeframe: '15m',
        chartType: 'candles',
        candles: generateCandles(4286.74, '15m', 140),
        drawings: [],
        providerStatus: 'Cached',
        marketStatus: 'Closed',
      },
    ];
  });

  // Switch to DXY on top-left if in Square mode (like Screenshot 2)
  const handlePickLayout = (shape: FrameShape, count: FrameCount) => {
    setLayoutShape(shape);
    setLayoutCount(count);
    setMaximizedCellId(null);

    if (shape === 'square' && count === 4) {
      setCells((prev) => [
        {
          ...prev[0],
          symbol: 'DXY',
          providerStatus: 'Unavailable',
          marketStatus: 'Closed',
        },
        prev[1],
        prev[2],
        prev[3],
      ]);
    } else if (shape === 'rect' && count === 4) {
      setCells((prev) => [
        {
          ...prev[0],
          symbol: 'USDJPY',
          timeframe: '4h',
          providerStatus: 'Cached',
          marketStatus: 'Closed',
          candles: generateCandles(157.295, '4h', 140),
        },
        prev[1],
        prev[2],
        prev[3],
      ]);
    }
  };

  // Update cell symbol
  const handleCellSymbolChange = (cellId: string, newSym: string) => {
    const symObj = symbols.find((s) => s.symbol === newSym) || symbols[0];
    const isDxy = newSym === 'DXY';

    setCells((prev) =>
      prev.map((c) => {
        if (c.id === cellId) {
          return {
            ...c,
            symbol: newSym,
            providerStatus: isDxy ? 'Unavailable' : 'Cached',
            candles: isDxy ? [] : generateCandles(symObj ? symObj.price : 1.085, c.timeframe, 140),
          };
        }
        return c;
      })
    );
    onSelectSymbol(newSym);
  };

  // Update cell timeframe
  const handleCellTimeframeChange = (cellId: string, newTf: Timeframe) => {
    setCells((prev) =>
      prev.map((c) => {
        if (c.id === cellId) {
          const symObj = symbols.find((s) => s.symbol === c.symbol);
          return {
            ...c,
            timeframe: newTf,
            candles: c.symbol === 'DXY' ? [] : generateCandles(symObj ? symObj.price : 1.085, newTf, 140),
          };
        }
        return c;
      })
    );
  };

  // Add drawing to cell
  const handleAddDrawing = (cellId: string, drawing: DrawingItem) => {
    setCells((prev) =>
      prev.map((c) => (c.id === cellId ? { ...c, drawings: [...c.drawings, drawing] } : c))
    );
  };

  // Determine visible cells based on layout
  const visibleCells = useMemo(() => {
    if (maximizedCellId) {
      return cells.filter((c) => c.id === maximizedCellId);
    }
    return cells.slice(0, layoutCount);
  }, [cells, layoutCount, maximizedCellId]);

  // CSS Grid class for center
  const getGridClass = () => {
    if (maximizedCellId || layoutCount === 1) return 'grid-cols-1 grid-rows-1';
    if (layoutShape === 'rect') {
      if (layoutCount === 2) return 'grid-cols-2 grid-rows-1';
      if (layoutCount === 3) return 'grid-cols-3 grid-rows-1';
      return 'grid-cols-4 grid-rows-1'; // Screenshot 1: 4 vertical tall columns side-by-side
    }
    // Square mode
    if (layoutCount === 2) return 'grid-cols-2 grid-rows-1';
    if (layoutCount === 3) return 'grid-cols-2 grid-rows-2';
    return 'grid-cols-2 grid-rows-2'; // Screenshot 2: 2x2 grid
  };

  const activeSymbolObj = symbols.find((s) => s.symbol === activeSymbol) || symbols[0];

  return (
    <div className="flex flex-col h-full w-full bg-[#08111E] text-[#E8EEF9] select-none overflow-hidden font-sans">
      {/* 1. TOP HEADER BAR matching Screenshot 1 & 2 */}
      <div className="h-11 bg-[#0A101D] border-b border-[#1E283D] px-2.5 flex items-center justify-between text-xs shrink-0 gap-2 z-20">
        {/* Left Side Controls */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {/* Active Symbol Dropdown Button */}
          <div className="relative">
            <select
              value={activeSymbol}
              onChange={(e) => onSelectSymbol(e.target.value)}
              className="bg-[#121A2B] hover:bg-[#162033] text-[#E8EEF9] font-bold text-xs px-2.5 py-1 rounded border border-[#243049] cursor-pointer outline-hidden transition-colors flex items-center gap-1.5"
            >
              {symbols.map((s) => (
                <option key={s.symbol} value={s.symbol} className="bg-[#0B1220] text-[#E8EEF9]">
                  {s.symbol}
                </option>
              ))}
            </select>
          </div>

          <div className="w-[1px] h-4 bg-[#1E283D]" />

          {/* Frame Square Selector */}
          <div className="flex items-center gap-1 bg-[#0D1526] p-0.5 rounded border border-[#1E283D]">
            <span className="text-[11px] text-[#A3B4D0] px-1 font-medium">Frame Square</span>
            {([1, 2, 3, 4] as FrameCount[]).map((cnt) => {
              const isActive = layoutShape === 'square' && layoutCount === cnt;
              return (
                <button
                  key={cnt}
                  onClick={() => handlePickLayout('square', cnt)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors ${
                    isActive
                      ? 'bg-[#1C2740] text-[#2DD4BF] font-bold border border-[#2DD4BF]/40'
                      : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
                  }`}
                >
                  {isActive ? `• ${cnt}` : cnt}
                </button>
              );
            })}
          </div>

          {/* Frame Rectangle Selector */}
          <div className="flex items-center gap-1 bg-[#0D1526] p-0.5 rounded border border-[#1E283D]">
            <span className="text-[11px] text-[#A3B4D0] px-1 font-medium">Frame Rectangle</span>
            {([2, 3, 4] as FrameCount[]).map((cnt) => {
              const isActive = layoutShape === 'rect' && layoutCount === cnt;
              return (
                <button
                  key={cnt}
                  onClick={() => handlePickLayout('rect', cnt)}
                  className={`px-1.5 py-0.5 rounded text-[11px] font-mono transition-colors ${
                    isActive
                      ? 'bg-[#1C2740] text-[#2DD4BF] font-bold border border-[#2DD4BF]/40'
                      : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
                  }`}
                >
                  {cnt}
                </button>
              );
            })}
          </div>

          {/* Frame Shadow Toggle Button */}
          <button
            onClick={() => setFrameShadow(!frameShadow)}
            className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
              frameShadow
                ? 'bg-[#1C2740] text-[#2DD4BF] border-[#2DD4BF]/50'
                : 'bg-[#121A2B] text-[#A3B4D0] border-[#243049] hover:text-[#E8EEF9]'
            }`}
          >
            Frame Shadow
          </button>

          {/* Time Sync Button */}
          <button
            onClick={() => setTimeSync(!timeSync)}
            className={`px-2 py-1 rounded text-[11px] font-medium border transition-colors ${
              timeSync
                ? 'bg-[#1C2740] text-[#2DD4BF] border-[#2DD4BF]/50'
                : 'bg-[#121A2B] text-[#A3B4D0] border-[#243049] hover:text-[#E8EEF9]'
            }`}
          >
            Time sync
          </button>

          <div className="w-[1px] h-4 bg-[#1E283D]" />

          {/* Icon Actions: Clock, Sigma, Refresh, Settings */}
          <div className="flex items-center gap-1 text-[#A3B4D0]">
            <button
              title="Timezone / Clock"
              className="p-1 rounded hover:bg-[#1C2740] hover:text-[#E8EEF9] transition-colors"
            >
              <Clock className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsIndicatorsModalOpen(true)}
              title="Indicators (Sigma)"
              className="p-1 rounded hover:bg-[#1C2740] hover:text-[#2DD4BF] transition-colors font-serif font-bold text-xs"
            >
              Σ
            </button>
            <button
              onClick={() => {
                setCells((prev) =>
                  prev.map((c) => {
                    const symObj = symbols.find((s) => s.symbol === c.symbol);
                    return {
                      ...c,
                      candles: c.symbol === 'DXY' ? [] : generateCandles(symObj ? symObj.price : 1.085, c.timeframe, 140),
                    };
                  })
                );
              }}
              title="Refresh / Replay"
              className="p-1 rounded hover:bg-[#1C2740] hover:text-[#E8EEF9] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsIndicatorsModalOpen(true)}
              title="Settings"
              className="p-1 rounded hover:bg-[#1C2740] hover:text-[#E8EEF9] transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right Header: Watchlist Title + Panels Title */}
        <div className="hidden lg:flex items-center gap-4 text-xs font-semibold text-[#A3B4D0] shrink-0">
          <span className="w-64 text-right pl-2">Watchlist</span>
          <span className="w-10 text-center">Panels</span>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE: Left Rail + Center Grid + Right Watchlist + Rightmost Panels Rail */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Vertical Rail: Lens & Draw Tools (matching screenshots) */}
        <div className="w-10 bg-[#0B1220] border-r border-[#1E283D] flex flex-col items-center py-2 gap-1.5 shrink-0 z-10 text-xs">
          {/* Lens Group */}
          <span className="text-[10px] text-[#7B8DA8] font-semibold scale-90">Lens</span>
          <button
            onClick={() => setActiveLens('clean')}
            title="Clean Lens (◇)"
            className={`w-7 h-7 rounded flex items-center justify-center text-sm transition-colors ${
              activeLens === 'clean' ? 'text-[#2DD4BF] font-bold' : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
            }`}
          >
            ◇
          </button>

          <div className="w-5 h-[1px] bg-[#1E283D] my-0.5" />

          {/* Draw Group */}
          <span className="text-[10px] text-[#7B8DA8] font-semibold scale-90">Draw</span>
          <button
            onClick={() => setActiveTool('none')}
            title="Crosshair (+)"
            className={`w-7 h-7 rounded flex items-center justify-center text-sm transition-colors ${
              activeTool === 'none' ? 'bg-[#1C2740] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
            }`}
          >
            +
          </button>
          <button
            onClick={() => setActiveTool('trendline')}
            title="Trendline (╱)"
            className={`w-7 h-7 rounded flex items-center justify-center text-sm transition-colors ${
              activeTool === 'trendline' ? 'bg-[#1C2740] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
            }`}
          >
            ╱
          </button>
          <button
            onClick={() => setActiveTool('box')}
            title="Box / Rectangle (▭)"
            className={`w-7 h-7 rounded flex items-center justify-center text-sm transition-colors ${
              activeTool === 'box' ? 'bg-[#1C2740] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
            }`}
          >
            ▭
          </button>
          <button
            onClick={() => setActiveTool('horizontal')}
            title="Text Note / Level (T)"
            className={`w-7 h-7 rounded flex items-center justify-center text-sm font-semibold transition-colors ${
              activeTool === 'horizontal' ? 'bg-[#1C2740] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
            }`}
          >
            T
          </button>
          <button
            onClick={() => setActiveTool('position_long')}
            title="Long Position (⤒)"
            className={`w-7 h-7 rounded flex items-center justify-center text-sm transition-colors ${
              activeTool === 'position_long' ? 'bg-[#1C2740] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
            }`}
          >
            ⤒
          </button>
          <button
            onClick={() => handlePickLayout(layoutShape === 'rect' ? 'square' : 'rect', 4)}
            title="Quad Grid Matrix (▦)"
            className="w-7 h-7 rounded flex items-center justify-center text-sm text-[#7B8DA8] hover:text-[#2DD4BF] transition-colors"
          >
            ▦
          </button>
        </div>

        {/* Center: Chart Grid */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#08111E]">
          <div className={`flex-1 grid ${getGridClass()} gap-[3px] p-[2px] h-full w-full overflow-hidden bg-[#050B14]`}>
            {visibleCells.map((cell) => {
              const isDxy = cell.symbol === 'DXY';
              const symObj = symbols.find((s) => s.symbol === cell.symbol) || symbols[0];
              const isMax = maximizedCellId === cell.id;

              return (
                <div
                  key={cell.id}
                  className="flex flex-col h-full w-full overflow-hidden bg-[#0A101D] border border-[#1E283D] rounded-xs relative group"
                >
                  {/* Cell Top Header matching Screenshot 1 & 2 */}
                  <div className="h-7 bg-[#0C1220] border-b border-[#1E283D] px-2 flex items-center justify-between text-xs z-10 shrink-0 select-none">
                    {/* Left: Drag dots + Timeframe Pills */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[#475569] font-mono text-[11px] cursor-grab">⋮⋮</span>
                      <div className="flex items-center gap-0.5">
                        {(['5m', '15m', '30m', '1h', '4h', '1D'] as Timeframe[]).map((tf) => {
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
                      </div>
                    </div>

                    {/* Right: Symbol with dot, Status, Price, Change%, Maximize Icon */}
                    <div className="flex items-center gap-2">
                      {/* Symbol Picker Button */}
                      <div className="flex items-center gap-1 cursor-pointer">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#7B8DA8]" />
                        <select
                          value={cell.symbol}
                          onChange={(e) => handleCellSymbolChange(cell.id, e.target.value)}
                          className="bg-transparent text-[#E8EEF9] font-bold text-xs cursor-pointer outline-hidden border-none pr-1"
                        >
                          {symbols.map((s) => (
                            <option key={s.symbol} value={s.symbol} className="bg-[#0B1220] text-[#E8EEF9]">
                              {s.symbol}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Status Badges */}
                      <span className="text-[10px] text-[#7B8DA8]">{cell.providerStatus}</span>
                      <span className="text-[10px] text-[#F59E0B]">{cell.marketStatus}</span>

                      {/* Live Price & Change */}
                      {!isDxy && symObj && (
                        <div className="flex items-center gap-1.5 font-mono text-[11px]">
                          <span className="text-[#E8EEF9] font-bold">
                            {symObj.price.toFixed(symObj.precision)}
                          </span>
                          <span
                            className={`font-semibold ${
                              symObj.change24h >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                            }`}
                          >
                            {symObj.change24h >= 0 ? '+' : ''}
                            {symObj.change24h}%
                          </span>
                        </div>
                      )}

                      {/* Maximize Icon */}
                      <button
                        onClick={() => setMaximizedCellId(isMax ? null : cell.id)}
                        title={isMax ? 'Restore Grid' : 'Maximize Frame'}
                        className="text-[#7B8DA8] hover:text-[#2DD4BF] text-xs transition-colors pl-1"
                      >
                        {isMax ? <Minimize2 className="w-3 h-3" /> : '⛶'}
                      </button>
                    </div>
                  </div>

                  {/* Chart Content Area */}
                  <div className="flex-1 w-full h-full relative overflow-hidden bg-[#08111E]">
                    {isDxy ? (
                      /* Special Case: DXY Unavailable Notice (Exact from Screenshot 2) */
                      <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#08111E]">
                        <h3 className="text-sm font-bold text-[#E8EEF9] mb-1.5 tracking-wide">
                          DXY isn't offered by our data provider
                        </h3>
                        <p className="text-xs text-[#7B8DA8] max-w-sm leading-relaxed">
                          We draw no candles or price for it, so you never read made-up numbers. Tap the
                          symbol name ▾ above the chart to pick another pair.
                        </p>
                      </div>
                    ) : (
                      <>
                        <MatrixChartCanvas
                          symbol={cell.symbol}
                          candles={cell.candles}
                          timeframe={cell.timeframe}
                          precision={symObj ? symObj.precision : 4}
                          pipScale={symObj ? symObj.pipScale : 0.0001}
                          chartType={cell.chartType}
                          indicators={indicators}
                          activeDrawingTool={activeTool}
                          drawings={cell.drawings}
                          onDrawingComplete={(d) => handleAddDrawing(cell.id, d)}
                          onClearDrawings={() => {}}
                          showGrid={showGrid}
                        />

                        {/* Bottom Right Floating >> Round Button matching Screenshot 1 */}
                        <button
                          title="Scroll to live price"
                          className="absolute bottom-6 right-16 w-6 h-6 rounded-full bg-[#2DD4BF] text-[#042F2E] flex items-center justify-center font-bold text-xs shadow-md hover:bg-[#14B8A6] transition-transform active:scale-95 z-10"
                        >
                          »
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Watchlist Panel (Exact from Screenshot 1 & 2) */}
        <div className="w-64 border-l border-[#1E283D] bg-[#0B1220] shrink-0 h-full overflow-hidden hidden md:block">
          <WatchlistPanel
            symbols={symbols}
            activeSymbol={activeSymbol}
            onSelectSymbol={onSelectSymbol}
            priceFlashMap={priceFlashMap}
          />
        </div>

        {/* Rightmost Panels Rail (Exact from Screenshot 1 & 2) */}
        <div className="w-10 bg-[#0B1220] border-l border-[#1E283D] flex flex-col items-center py-2 gap-3 shrink-0 z-10 text-xs text-[#7B8DA8]">
          <span className="text-[10px] font-semibold scale-90 text-[#7B8DA8]">Panels</span>
          <button
            onClick={() => setActiveBottomDock(activeBottomDock === 'alerts' ? null : 'alerts')}
            title="Alerts (⚑)"
            className="p-1.5 hover:text-[#2DD4BF] transition-colors"
          >
            <Flag className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onTabChange && onTabChange('tools')}
            title="Position Size (P)"
            className="p-1.5 hover:text-[#2DD4BF] font-mono font-bold text-xs transition-colors"
          >
            P
          </button>
          <button
            onClick={() => setActiveBottomDock(activeBottomDock === 'calendar' ? null : 'calendar')}
            title="Economic Calendar (🕒)"
            className="p-1.5 hover:text-[#2DD4BF] transition-colors"
          >
            <Calendar className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setActiveBottomDock(activeBottomDock === 'journal' ? null : 'journal')}
            title="Watchlist Menu (☰)"
            className="p-1.5 hover:text-[#2DD4BF] transition-colors"
          >
            <Menu className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setIsIndicatorsModalOpen(true)}
            title="Settings (⚙)"
            className="p-1.5 hover:text-[#2DD4BF] transition-colors"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setActiveBottomDock(activeBottomDock === 'journal' ? null : 'journal')}
            title="Trade Journal (📖)"
            className="p-1.5 hover:text-[#2DD4BF] transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {}}
            title="Refresh (↺)"
            className="p-1.5 hover:text-[#2DD4BF] transition-colors mt-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3. BOTTOM FLOATING DOCK matching Screenshot 1 & 2 */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-6 px-5 py-1.5 rounded-full bg-[#0D1627]/90 border border-[#243049] shadow-xl backdrop-blur-md text-xs text-[#A3B4D0] z-30">
        <button
          onClick={() => setActiveTool(activeTool === 'trendline' ? 'none' : 'trendline')}
          className="flex items-center gap-1.5 hover:text-[#2DD4BF] transition-colors"
        >
          <span className="text-xs">✏</span>
          <span>Draw</span>
        </button>
        <button
          onClick={() => setActiveBottomDock('alerts')}
          className="flex items-center gap-1.5 hover:text-[#2DD4BF] transition-colors"
        >
          <span className="text-xs">⚑</span>
          <span>Alerts</span>
        </button>
        <button
          onClick={() => setActiveBottomDock('calendar')}
          className="flex items-center gap-1.5 hover:text-[#2DD4BF] transition-colors"
        >
          <span className="text-xs">◷</span>
          <span>Calendar</span>
        </button>
        <button
          onClick={() => setActiveBottomDock('journal')}
          className="flex items-center gap-1.5 hover:text-[#2DD4BF] transition-colors"
        >
          <span className="text-xs">▤</span>
          <span>Journal</span>
        </button>
        <button
          onClick={() => onTabChange && onTabChange('tools')}
          className="flex items-center gap-1.5 hover:text-[#2DD4BF] transition-colors"
        >
          <span className="text-xs">•••</span>
          <span>More</span>
        </button>
      </div>

      {/* 4. BOTTOM MAIN NAVIGATION BAR matching Screenshot 1 & 2 */}
      <div className="h-10 bg-[#0A101D] border-t border-[#1E283D] px-6 flex items-center justify-between text-xs text-[#7B8DA8] z-20 shrink-0">
        <div className="flex items-center gap-12">
          {/* FX Home Tab (Active) */}
          <button
            onClick={() => onTabChange && onTabChange('home')}
            className={`flex items-center gap-2 font-semibold transition-colors relative py-1 ${
              currentTab === 'home' ? 'text-[#2DD4BF]' : 'hover:text-[#E8EEF9]'
            }`}
          >
            <span className="text-[10px] font-mono bg-[#162033] px-1 py-0.2 rounded border border-[#243049] text-[#2DD4BF]">
              FX
            </span>
            <span>Home</span>
            {currentTab === 'home' && (
              <span className="absolute -bottom-2.5 left-0 right-0 h-0.5 bg-[#2DD4BF] rounded-full" />
            )}
          </button>

          {/* TL Tools Tab */}
          <button
            onClick={() => onTabChange && onTabChange('tools')}
            className={`flex items-center gap-2 font-semibold transition-colors relative py-1 ${
              currentTab === 'tools' ? 'text-[#2DD4BF]' : 'hover:text-[#E8EEF9]'
            }`}
          >
            <span className="text-[10px] font-mono bg-[#162033] px-1 py-0.2 rounded border border-[#243049] text-[#A3B4D0]">
              TL
            </span>
            <span>Tools</span>
            {currentTab === 'tools' && (
              <span className="absolute -bottom-2.5 left-0 right-0 h-0.5 bg-[#2DD4BF] rounded-full" />
            )}
          </button>

          {/* BT Bot Tab (10 Autonomous Cloud Agents) */}
          <button
            onClick={() => onTabChange && onTabChange('bot')}
            className={`flex items-center gap-2 font-semibold transition-colors relative py-1 ${
              currentTab === 'bot' ? 'text-[#2DD4BF]' : 'hover:text-[#E8EEF9]'
            }`}
          >
            <span className="text-[10px] font-mono bg-[#162033] px-1.5 py-0.2 rounded border border-[#2DD4BF]/50 text-[#2DD4BF] flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-ping" />
              BT
            </span>
            <span className="text-[#2DD4BF] font-bold">10 Agents (Bot)</span>
            {currentTab === 'bot' && (
              <span className="absolute -bottom-2.5 left-0 right-0 h-0.5 bg-[#2DD4BF] rounded-full" />
            )}
          </button>
        </div>

        <div className="flex items-center gap-12">
          {/* ED Academy Tab */}
          <button
            onClick={() => onTabChange && onTabChange('academy')}
            className={`flex items-center gap-2 font-semibold transition-colors relative py-1 ${
              currentTab === 'academy' ? 'text-[#2DD4BF]' : 'hover:text-[#E8EEF9]'
            }`}
          >
            <span className="text-[10px] font-mono bg-[#162033] px-1 py-0.2 rounded border border-[#243049] text-[#A3B4D0]">
              ED
            </span>
            <span>Academy</span>
            {currentTab === 'academy' && (
              <span className="absolute -bottom-2.5 left-0 right-0 h-0.5 bg-[#2DD4BF] rounded-full" />
            )}
          </button>

          {/* ME Account Tab */}
          <button
            onClick={() => onTabChange && onTabChange('account')}
            className={`flex items-center gap-2 font-semibold transition-colors relative py-1 ${
              currentTab === 'account' ? 'text-[#2DD4BF]' : 'hover:text-[#E8EEF9]'
            }`}
          >
            <span className="text-[10px] font-mono bg-[#162033] px-1 py-0.2 rounded border border-[#243049] text-[#A3B4D0]">
              ME
            </span>
            <span>Account</span>
            {currentTab === 'account' && (
              <span className="absolute -bottom-2.5 left-0 right-0 h-0.5 bg-[#2DD4BF] rounded-full" />
            )}
          </button>
        </div>
      </div>

      {/* Indicators Modal */}
      <IndicatorModal
        isOpen={isIndicatorsModalOpen}
        indicators={indicators}
        onChange={onUpdateIndicators}
        onClose={() => setIsIndicatorsModalOpen(false)}
      />
    </div>
  );
};
