import React, { useState } from 'react';
import { MarketSymbol, Candle, Timeframe, ChartType, DrawingTool, IndicatorSettings } from '../../types/market';
import { MatrixChartCanvas } from './MatrixChartCanvas';
import { WatchlistPanel } from './WatchlistPanel';
import { TimeframeBar } from './TimeframeBar';
import { IndicatorModal } from './IndicatorModal';
import { PanelRightClose, PanelRightOpen } from 'lucide-react';

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
}

export const TerminalScreen: React.FC<TerminalScreenProps> = ({
  symbols,
  activeSymbol,
  onSelectSymbol,
  candles,
  timeframe,
  onTimeframeChange,
  chartType,
  onChartTypeChange,
  indicators,
  onUpdateIndicators,
  priceFlashMap,
  showGrid,
}) => {
  const [activeDrawingTool, setActiveDrawingTool] = useState<DrawingTool>('none');
  const [drawings, setDrawings] = useState<any[]>([]);
  const [layoutMode, setLayoutMode] = useState<'single' | 'split' | 'quad'>('single');
  const [isIndicatorsModalOpen, setIsIndicatorsModalOpen] = useState(false);
  const [isWatchlistCollapsed, setIsWatchlistCollapsed] = useState(false);

  const activeSymbolObj = symbols.find((s) => s.symbol === activeSymbol) || symbols[0];

  // Secondary symbol for split layout
  const secondarySymbol = symbols.find((s) => s.symbol !== activeSymbol) || symbols[1];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#0B1220] overflow-hidden">
      {/* Top Toolbar */}
      <TimeframeBar
        timeframe={timeframe}
        onTimeframeChange={onTimeframeChange}
        chartType={chartType}
        onChartTypeChange={onChartTypeChange}
        activeDrawingTool={activeDrawingTool}
        onDrawingToolChange={setActiveDrawingTool}
        onClearDrawings={() => setDrawings([])}
        layoutMode={layoutMode}
        onLayoutModeChange={setLayoutMode}
        onOpenIndicatorsModal={() => setIsIndicatorsModalOpen(true)}
        indicators={indicators}
      />

      {/* Center Chart Workspace + Watchlist Sidebar */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Chart Viewport */}
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#08111E]">
          {layoutMode === 'single' && (
            <MatrixChartCanvas
              symbol={activeSymbolObj.symbol}
              candles={candles}
              timeframe={timeframe}
              precision={activeSymbolObj.precision}
              pipScale={activeSymbolObj.pipScale}
              chartType={chartType}
              indicators={indicators}
              activeDrawingTool={activeDrawingTool}
              drawings={drawings}
              onClearDrawings={() => setDrawings([])}
              showGrid={showGrid}
            />
          )}

          {layoutMode === 'split' && (
            <div className="flex-1 grid grid-cols-2 divide-x divide-[#243049] h-full">
              <MatrixChartCanvas
                symbol={activeSymbolObj.symbol}
                candles={candles}
                timeframe={timeframe}
                precision={activeSymbolObj.precision}
                pipScale={activeSymbolObj.pipScale}
                chartType={chartType}
                indicators={indicators}
                activeDrawingTool={activeDrawingTool}
                drawings={drawings}
                onClearDrawings={() => setDrawings([])}
                showGrid={showGrid}
              />
              <MatrixChartCanvas
                symbol={secondarySymbol.symbol}
                candles={candles}
                timeframe={timeframe}
                precision={secondarySymbol.precision}
                pipScale={secondarySymbol.pipScale}
                chartType={chartType}
                indicators={indicators}
                activeDrawingTool="none"
                drawings={[]}
                onClearDrawings={() => {}}
                showGrid={showGrid}
              />
            </div>
          )}

          {layoutMode === 'quad' && (
            <div className="flex-1 grid grid-cols-2 grid-rows-2 gap-[1px] bg-[#243049] h-full">
              {symbols.slice(0, 4).map((sym) => (
                <div key={sym.symbol} className="h-full overflow-hidden bg-[#08111E]">
                  <MatrixChartCanvas
                    symbol={sym.symbol}
                    candles={candles}
                    timeframe={timeframe}
                    precision={sym.precision}
                    pipScale={sym.pipScale}
                    chartType={chartType}
                    indicators={{ ...indicators, showRsi: false, showMacd: false }}
                    activeDrawingTool="none"
                    drawings={[]}
                    onClearDrawings={() => {}}
                    showGrid={showGrid}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Watchlist Sidebar */}
        <div
          className={`transition-all duration-200 border-r border-[#243049] ${
            isWatchlistCollapsed ? 'w-0 overflow-hidden border-r-0' : 'w-72'
          }`}
        >
          <WatchlistPanel
            symbols={symbols}
            activeSymbol={activeSymbol}
            onSelectSymbol={onSelectSymbol}
            priceFlashMap={priceFlashMap}
          />
        </div>

        {/* Watchlist Collapse Toggle Button */}
        <button
          onClick={() => setIsWatchlistCollapsed(!isWatchlistCollapsed)}
          title={isWatchlistCollapsed ? 'فتح قائمة المتابعة' : 'إخفاء قائمة المتابعة'}
          className="absolute bottom-2 left-2 z-20 p-1.5 rounded-lg bg-[#121A2B]/85 hover:bg-[#162033] border border-[#243049] text-[#A3B4D0] hover:text-[#E8EEF9] shadow-md transition-colors"
        >
          {isWatchlistCollapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
        </button>
      </div>

      {/* Indicators Modal */}
      <IndicatorModal
        isOpen={isIndicatorsModalOpen}
        onClose={() => setIsIndicatorsModalOpen(false)}
        indicators={indicators}
        onChange={onUpdateIndicators}
      />
    </div>
  );
};
