import React from 'react';
import { Timeframe, ChartType, DrawingTool, IndicatorSettings } from '../../types/market';
import {
  CandlestickChart,
  LineChart,
  Activity,
  SlidersHorizontal,
  Minus,
  TrendingUp,
  Trash2,
  LayoutGrid,
  Columns,
  Square,
  Crosshair,
} from 'lucide-react';

interface TimeframeBarProps {
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  chartType: ChartType;
  onChartTypeChange: (type: ChartType) => void;
  activeDrawingTool: DrawingTool;
  onDrawingToolChange: (tool: DrawingTool) => void;
  onClearDrawings: () => void;
  layoutMode: 'single' | 'split' | 'quad';
  onLayoutModeChange: (mode: 'single' | 'split' | 'quad') => void;
  onOpenIndicatorsModal: () => void;
  indicators: IndicatorSettings;
}

export const TimeframeBar: React.FC<TimeframeBarProps> = ({
  timeframe,
  onTimeframeChange,
  chartType,
  onChartTypeChange,
  activeDrawingTool,
  onDrawingToolChange,
  onClearDrawings,
  layoutMode,
  onLayoutModeChange,
  onOpenIndicatorsModal,
  indicators,
}) => {
  const timeframes: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1D'];

  const activeIndicatorCount = [
    indicators.showSma20,
    indicators.showSma50,
    indicators.showSma200,
    indicators.showBollinger,
    indicators.showRsi,
    indicators.showMacd,
  ].filter(Boolean).length;

  return (
    <div className="flex items-center justify-between px-3 py-1.5 bg-[#121A2B] border-b border-[#243049] text-xs select-none">
      {/* Timeframes */}
      <div className="flex items-center gap-1">
        {timeframes.map((tf) => (
          <button
            key={tf}
            onClick={() => onTimeframeChange(tf)}
            className={`px-2 py-1 rounded text-xs font-mono font-medium transition-colors ${
              timeframe === tf
                ? 'bg-[#2DD4BF] text-[#042F2E] font-bold shadow-xs'
                : 'text-[#A3B4D0] hover:text-[#E8EEF9] hover:bg-[#1C2740]'
            }`}
          >
            {tf}
          </button>
        ))}

        <div className="w-[1px] h-4 bg-[#243049] mx-1.5" />

        {/* Chart Style Toggle */}
        <div className="flex items-center bg-[#0B1220] p-0.5 rounded border border-[#243049]">
          <button
            onClick={() => onChartTypeChange('candles')}
            title="شموع يابانية"
            className={`p-1 rounded ${
              chartType === 'candles' ? 'bg-[#1C2740] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
            }`}
          >
            <CandlestickChart className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onChartTypeChange('line')}
            title="خط سعري"
            className={`p-1 rounded ${
              chartType === 'line' ? 'bg-[#1C2740] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
            }`}
          >
            <LineChart className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onChartTypeChange('area')}
            title="مساحة مظللة"
            className={`p-1 rounded ${
              chartType === 'area' ? 'bg-[#1C2740] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Center Tools: Indicators & Drawings */}
      <div className="flex items-center gap-1.5">
        {/* Indicators Trigger */}
        <button
          onClick={onOpenIndicatorsModal}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#162033] hover:bg-[#1E293B] border border-[#243049] text-[#E8EEF9] font-medium transition-colors"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-[#2DD4BF]" />
          <span>المؤشرات</span>
          {activeIndicatorCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-[#2DD4BF] text-[#042F2E] text-[10px] font-bold flex items-center justify-center">
              {activeIndicatorCount}
            </span>
          )}
        </button>

        <div className="w-[1px] h-4 bg-[#243049] mx-1" />

        {/* Drawings toolbar */}
        <div className="flex items-center bg-[#0B1220] p-0.5 rounded border border-[#243049]">
          <button
            onClick={() => onDrawingToolChange('none')}
            title="مؤشر عادي"
            className={`p-1 rounded ${
              activeDrawingTool === 'none' ? 'bg-[#1C2740] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDrawingToolChange('horizontal')}
            title="خط أفقي / دعم ومقاومة"
            className={`p-1 rounded ${
              activeDrawingTool === 'horizontal' ? 'bg-[#1C2740] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
            }`}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDrawingToolChange('trendline')}
            title="خط ترند مائل"
            className={`p-1 rounded ${
              activeDrawingTool === 'trendline' ? 'bg-[#1C2740] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClearDrawings}
            title="مسح الرسوم"
            className="p-1 rounded text-[#7B8DA8] hover:text-[#EF4444]"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Layout Grid Switcher */}
      <div className="flex items-center gap-1 bg-[#0B1220] p-0.5 rounded border border-[#243049]">
        <button
          onClick={() => onLayoutModeChange('single')}
          title="شارت فردي كامل"
          className={`p-1 rounded ${
            layoutMode === 'single' ? 'bg-[#1C2740] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
          }`}
        >
          <Square className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onLayoutModeChange('split')}
          title="شارتين متوازيين"
          className={`p-1 rounded ${
            layoutMode === 'split' ? 'bg-[#1C2740] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
          }`}
        >
          <Columns className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => onLayoutModeChange('quad')}
          title="شبكة 4 شارتات (Quad)"
          className={`p-1 rounded ${
            layoutMode === 'quad' ? 'bg-[#1C2740] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
