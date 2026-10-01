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
import { AiCopilotPanel } from './AiCopilotPanel';
import { generateCandles, updateLastCandleWithTick } from '../../data/candleGenerator';
import {
  Maximize2,
  Minimize2,
  ChevronDown,
  Sparkles,
  Sliders,
  Grid,
  Square,
  Columns,
  LayoutGrid,
  TrendingUp,
  BarChart2,
  MessageSquare,
  GraduationCap,
  Award,
  Layers,
  Activity,
  Zap,
} from 'lucide-react';

export type FrameCount = 1 | 2 | 4;

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
  onTabChange?: (tab: 'home' | 'community' | 'academy' | 'pricing' | 'tools' | 'account') => void;
  currentTab?: string;
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
  // Layout state: Default 1 (Single Full Screen Chart for optimal TradingView clarity)
  const [layoutCount, setLayoutCount] = useState<FrameCount>(1);
  const [activeTool, setActiveTool] = useState<DrawingTool>('none');
  const [isIndicatorsModalOpen, setIsIndicatorsModalOpen] = useState(false);
  const [isAiCopilotOpen, setIsAiCopilotOpen] = useState(false);
  const [maximizedCellId, setMaximizedCellId] = useState<string | null>(null);
  const [isWatchlistCollapsed, setIsWatchlistCollapsed] = useState(false);

  // Initialize cells
  const [cells, setCells] = useState<ChartCellState[]>(() => {
    return [
      {
        id: 'cell-1',
        symbol: 'EURUSD',
        timeframe: '15m',
        chartType: 'candles',
        candles: generateCandles(1.08538, '15m', 150),
        drawings: [],
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
        providerStatus: 'Provider',
        marketStatus: 'Open',
      },
    ];
  });

  // Keep cell-1 synced with activeSymbol and masterCandles
  useEffect(() => {
    setCells((prev) => {
      const next = [...prev];
      next[0] = {
        ...next[0],
        symbol: activeSymbol,
        timeframe: masterTimeframe,
        chartType: masterChartType,
        candles: masterCandles.length > 0 ? masterCandles : next[0].candles,
      };
      return next;
    });
  }, [activeSymbol, masterCandles, masterTimeframe, masterChartType]);

  // Handle cell timeframe change
  const handleCellTimeframeChange = (cellId: string, tf: Timeframe) => {
    if (cellId === 'cell-1') {
      onTimeframeChange(tf);
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

  // Handle cell symbol change
  const handleCellSymbolChange = (cellId: string, sym: string) => {
    if (cellId === 'cell-1') {
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
  };

  const handleAddDrawing = (cellId: string, drawing: DrawingItem) => {
    setCells((prev) =>
      prev.map((c) => (c.id === cellId ? { ...c, drawings: [...c.drawings, drawing] } : c))
    );
  };

  const visibleCells = useMemo(() => {
    if (maximizedCellId) {
      return cells.filter((c) => c.id === maximizedCellId);
    }
    return cells.slice(0, layoutCount);
  }, [cells, layoutCount, maximizedCellId]);

  // CSS Grid class
  const getGridClass = () => {
    if (maximizedCellId || layoutCount === 1) return 'grid-cols-1 grid-rows-1';
    if (layoutCount === 2) return 'grid-cols-1 md:grid-cols-2 grid-rows-1';
    return 'grid-cols-1 md:grid-cols-2 grid-rows-2'; // 2x2 square grid, never squished
  };

  const activeSymbolObj = symbols.find((s) => s.symbol === activeSymbol) || symbols[0];

  return (
    <div className="flex flex-col h-full w-full bg-[#08111E] text-[#E8EEF9] select-none overflow-hidden font-sans">
      {/* 1. TOP HEADER & TIMEFRAME BAR (TradingView Pro Standard) */}
      <div className="h-11 bg-[#0A101D] border-b border-[#1E283D] px-3 flex items-center justify-between text-xs shrink-0 gap-2 z-20">
        {/* Left Side: Symbol selector + Timeframes + Chart Type */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {/* Symbol Quick Select Dropdown */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#131E33] border border-[#233554]">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <select
              value={activeSymbol}
              onChange={(e) => onSelectSymbol(e.target.value)}
              className="bg-transparent text-white font-bold text-xs cursor-pointer outline-none border-none pr-1"
            >
              {symbols.map((s) => (
                <option key={s.symbol} value={s.symbol} className="bg-[#0B1220] text-white">
                  {s.symbol} ({s.name})
                </option>
              ))}
            </select>
          </div>

          <div className="w-[1px] h-4 bg-[#1E283D]" />

          {/* Timeframe Buttons */}
          <div className="flex items-center gap-0.5">
            {(['1m', '5m', '15m', '1h', '4h', '1D'] as Timeframe[]).map((tf) => {
              const isActive = masterTimeframe === tf;
              return (
                <button
                  key={tf}
                  onClick={() => onTimeframeChange(tf)}
                  className={`px-2 py-1 rounded text-xs font-mono font-medium transition-all ${
                    isActive
                      ? 'bg-[#1C2E4A] text-[#2DD4BF] font-bold border border-[#2DD4BF]/40'
                      : 'text-[#7B8DA8] hover:text-[#E8EEF9] hover:bg-[#111A2C]'
                  }`}
                >
                  {tf.replace('1D', 'D').replace('1h', '1H').replace('4h', '4H')}
                </button>
              );
            })}
          </div>

          <div className="w-[1px] h-4 bg-[#1E283D]" />

          {/* Chart Type Selector */}
          <div className="flex items-center gap-0.5">
            <button
              onClick={() => onChartTypeChange('candles')}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                masterChartType === 'candles'
                  ? 'bg-[#1C2E4A] text-[#2DD4BF] font-semibold'
                  : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
              }`}
            >
              شموع
            </button>
            <button
              onClick={() => onChartTypeChange('line')}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                masterChartType === 'line'
                  ? 'bg-[#1C2E4A] text-[#2DD4BF] font-semibold'
                  : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
              }`}
            >
              خطي
            </button>
          </div>

          <div className="w-[1px] h-4 bg-[#1E283D]" />

          {/* Indicators Button */}
          <button
            onClick={() => setIsIndicatorsModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#131E33] hover:bg-[#1A2A44] border border-[#233554] text-[#A3B4D0] hover:text-white transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-[#2DD4BF]" />
            <span>المؤشرات</span>
          </button>
        </div>

        {/* Right Side: AI Copilot Trigger + Layout Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          {/* AI Copilot Button */}
          <button
            onClick={() => setIsAiCopilotOpen(!isAiCopilotOpen)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-gradient-to-r from-teal-950 to-blue-950 border border-teal-500/50 text-[#2DD4BF] hover:border-teal-400 font-bold text-xs shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-teal-400 animate-pulse" />
            <span>المساعد الذكي (AI Copilot)</span>
          </button>

          {/* Multi-Chart Layout Selector */}
          <div className="flex items-center gap-1 bg-[#101827] p-1 rounded-lg border border-[#1E283D]">
            <button
              onClick={() => {
                setLayoutCount(1);
                setMaximizedCellId(null);
              }}
              title="شارت مفرد واسع (1 Single)"
              className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition-colors ${
                layoutCount === 1 ? 'bg-[#2DD4BF] text-[#042F2E]' : 'text-[#7B8DA8] hover:text-white'
              }`}
            >
              1
            </button>
            <button
              onClick={() => {
                setLayoutCount(2);
                setMaximizedCellId(null);
              }}
              title="شاشتان منقسمتان (2 Split)"
              className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition-colors ${
                layoutCount === 2 ? 'bg-[#2DD4BF] text-[#042F2E]' : 'text-[#7B8DA8] hover:text-white'
              }`}
            >
              2
            </button>
            <button
              onClick={() => {
                setLayoutCount(4);
                setMaximizedCellId(null);
              }}
              title="شبكة رباعية 2x2 (4 Quad Grid)"
              className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition-colors ${
                layoutCount === 4 ? 'bg-[#2DD4BF] text-[#042F2E]' : 'text-[#7B8DA8] hover:text-white'
              }`}
            >
              4
            </button>
          </div>

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

      {/* 2. MAIN WORKSPACE: Left Tools Rail + Center Charts Canvas + Right Watchlist */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Left Drawing Rail (TradingView standard) */}
        <div className="w-10 bg-[#0B1220] border-r border-[#1E283D] flex flex-col items-center py-2 gap-2 shrink-0 z-10 text-xs select-none">
          <button
            onClick={() => setActiveTool(activeTool === 'trendline' ? 'none' : 'trendline')}
            title="خط الاتجاه (Trendline)"
            className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
              activeTool === 'trendline' ? 'bg-[#1C2E4A] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-white'
            }`}
          >
            ╱
          </button>
          <button
            onClick={() => setActiveTool(activeTool === 'horizontal' ? 'none' : 'horizontal')}
            title="خط أفقي / دعم ومقاومة (Horizontal Line)"
            className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
              activeTool === 'horizontal' ? 'bg-[#1C2E4A] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-white'
            }`}
          >
            ―
          </button>
          <button
            onClick={() => setActiveTool(activeTool === 'box' ? 'none' : 'box')}
            title="منطقة سعرية / مستطيل (Rectangle Box)"
            className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
              activeTool === 'box' ? 'bg-[#1C2E4A] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-white'
            }`}
          >
            ▭
          </button>
          <button
            onClick={() => setActiveTool(activeTool === 'fibonacci' ? 'none' : 'fibonacci')}
            title="مستويات فيبوناتشي (Fibonacci)"
            className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
              activeTool === 'fibonacci' ? 'bg-[#1C2E4A] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-white'
            }`}
          >
            ≡
          </button>
          <button
            onClick={() => setActiveTool(activeTool === 'position_long' ? 'none' : 'position_long')}
            title="حساب نسبة العائد للمخاطرة (Risk/Reward)"
            className={`w-7 h-7 rounded flex items-center justify-center transition-colors ${
              activeTool === 'position_long' ? 'bg-[#1C2E4A] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-white'
            }`}
          >
            ⤒
          </button>
          <button
            onClick={() => setActiveTool('none')}
            title="مسح التحديد (Clear Selection)"
            className="w-7 h-7 rounded flex items-center justify-center text-[#7B8DA8] hover:text-rose-400 transition-colors mt-auto text-xs"
          >
            ✕
          </button>
        </div>

        {/* Center: Chart Grid */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#050B14]">
          <div className={`flex-1 grid ${getGridClass()} gap-[3px] p-[2px] h-full w-full overflow-hidden bg-[#050B14]`}>
            {visibleCells.map((cell) => {
              const symObj = symbols.find((s) => s.symbol === cell.symbol) || symbols[0];
              const isMax = maximizedCellId === cell.id;

              return (
                <div
                  key={cell.id}
                  className="flex flex-col h-full w-full overflow-hidden bg-[#0A101D] border border-[#1E283D] rounded-xs relative group"
                >
                  {/* Cell Top Header */}
                  <div className="h-7 bg-[#0C1220] border-b border-[#1E283D] px-2.5 flex items-center justify-between text-xs z-10 shrink-0 select-none">
                    {/* Symbol with dot, Status, Price */}
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
                    </div>

                    {/* Timeframe buttons for cell & Maximize */}
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

                      {layoutCount > 1 && (
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
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Watchlist Panel */}
        {!isWatchlistCollapsed && (
          <div className="w-64 border-l border-[#1E283D] bg-[#0B1220] shrink-0 h-full overflow-hidden hidden lg:block">
            <WatchlistPanel
              symbols={symbols}
              activeSymbol={activeSymbol}
              onSelectSymbol={onSelectSymbol}
              priceFlashMap={priceFlashMap}
            />
          </div>
        )}
      </div>

      {/* AI Copilot Side Drawer */}
      <AiCopilotPanel
        isOpen={isAiCopilotOpen}
        onClose={() => setIsAiCopilotOpen(false)}
        activeSymbol={activeSymbolObj}
        timeframe={masterTimeframe}
      />

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
