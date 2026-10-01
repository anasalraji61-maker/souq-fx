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
  Save,
  Share2,
  Terminal,
  Rows,
  Layers,
  Link2,
  Ruler,
  BoxSelect,
  Sparkles,
} from 'lucide-react';

export type TerminalLayoutMode = 'single' | 'split-v' | 'split-h' | 'triple' | 'quad';

interface TimeframeBarProps {
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  chartType: ChartType;
  onChartTypeChange: (type: ChartType) => void;
  activeDrawingTool: DrawingTool;
  onDrawingToolChange: (tool: DrawingTool) => void;
  onClearDrawings: () => void;
  layoutMode: TerminalLayoutMode;
  onLayoutModeChange: (mode: TerminalLayoutMode) => void;
  onOpenIndicatorsModal: () => void;
  indicators: IndicatorSettings;
  syncSymbol?: boolean;
  onToggleSyncSymbol?: () => void;
  onApplyMtfPreset?: (preset: 'mtf-pro' | 'scalp' | 'swing' | 'major') => void;
  onExportSession?: () => void;
  onShareSession?: () => void;
  onToggleConsole?: () => void;
  isConsoleOpen?: boolean;
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
  syncSymbol = true,
  onToggleSyncSymbol,
  onApplyMtfPreset,
  onExportSession,
  onShareSession,
  onToggleConsole,
  isConsoleOpen,
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
    <div className="flex items-center justify-between px-3 py-1.5 bg-[#121A2B] border-b border-[#243049] text-xs select-none gap-2 overflow-x-auto">
      {/* Timeframes & Chart Type */}
      <div className="flex items-center gap-1 shrink-0">
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

        <div className="w-[1px] h-4 bg-[#243049] mx-1" />

        {/* Chart Style Toggle */}
        <div className="flex items-center bg-[#0B1220] p-0.5 rounded border border-[#243049]">
          <button
            onClick={() => onChartTypeChange('candles')}
            title="شموع يابانية (Candlesticks)"
            className={`p-1 rounded ${
              chartType === 'candles' ? 'bg-[#1C2740] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
            }`}
          >
            <CandlestickChart className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onChartTypeChange('line')}
            title="خط سعري (Line Chart)"
            className={`p-1 rounded ${
              chartType === 'line' ? 'bg-[#1C2740] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
            }`}
          >
            <LineChart className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="w-[1px] h-4 bg-[#243049] mx-1" />

        {/* Indicators Trigger */}
        <button
          onClick={onOpenIndicatorsModal}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded border transition-colors ${
            activeIndicatorCount > 0
              ? 'bg-[#1C2740] border-[#2DD4BF]/50 text-[#2DD4BF]'
              : 'bg-[#0B1220] border-[#243049] text-[#A3B4D0] hover:text-[#E8EEF9]'
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>المؤشرات</span>
          {activeIndicatorCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-[#2DD4BF] text-[#042F2E] font-bold text-[10px] flex items-center justify-center">
              {activeIndicatorCount}
            </span>
          )}
        </button>

        <div className="w-[1px] h-4 bg-[#243049] mx-1" />

        {/* Drawing Tools Quick Bar */}
        <div className="flex items-center bg-[#0B1220] p-0.5 rounded border border-[#243049] gap-0.5">
          <button
            onClick={() => onDrawingToolChange('none')}
            title="مؤشر عادي / تقاطع"
            className={`p-1 rounded ${
              activeDrawingTool === 'none' ? 'bg-[#1C2740] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDrawingToolChange('horizontal')}
            title="مستوى أفقي / دعم ومقاومة"
            className={`p-1 rounded ${
              activeDrawingTool === 'horizontal' ? 'bg-[#1C2740] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
            }`}
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDrawingToolChange('trendline')}
            title="خط اتجاه (Trendline)"
            className={`p-1 rounded ${
              activeDrawingTool === 'trendline' ? 'bg-[#1C2740] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDrawingToolChange('fibonacci')}
            title="فيبوناتشي الارتدادي (Fibonacci Retracement)"
            className={`p-1 rounded ${
              activeDrawingTool === 'fibonacci' ? 'bg-[#1C2740] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDrawingToolChange('box')}
            title="منطقة طلب وعرض / بلوك أوامر (Order Block Zone)"
            className={`p-1 rounded ${
              activeDrawingTool === 'box' ? 'bg-[#1C2740] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
            }`}
          >
            <BoxSelect className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onDrawingToolChange('measure')}
            title="مسطرة قياس النقاط والنسبة المئوية (Measure Ruler)"
            className={`p-1 rounded ${
              activeDrawingTool === 'measure' ? 'bg-[#1C2740] text-[#2DD4BF]' : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
            }`}
          >
            <Ruler className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClearDrawings}
            title="مسح كل الرسوم"
            className="p-1 rounded text-[#7B8DA8] hover:text-[#EF4444] transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Middle & Right: MTF Presets, Sync & Layout */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* MTF Presets Pills */}
        {onApplyMtfPreset && (
          <div className="hidden lg:flex items-center gap-1 bg-[#0B1220] p-0.5 rounded border border-[#243049]">
            <span className="text-[10px] text-[#7B8DA8] px-1 font-semibold">قوالب MTF:</span>
            <button
              onClick={() => onApplyMtfPreset('mtf-pro')}
              title="توزيع فريمات احترافي: 5m / 15m / 1h / 4h"
              className="px-1.5 py-0.5 rounded bg-[#162033] hover:bg-[#1E293B] text-[#2DD4BF] text-[10px] font-mono transition-colors"
            >
              MTF Pro
            </button>
            <button
              onClick={() => onApplyMtfPreset('scalp')}
              title="مضاربة سريعة: 1m / 5m / 15m / 1h"
              className="px-1.5 py-0.5 rounded bg-[#162033] hover:bg-[#1E293B] text-[#A3B4D0] hover:text-[#E8EEF9] text-[10px] font-mono transition-colors"
            >
              Scalp
            </button>
            <button
              onClick={() => onApplyMtfPreset('swing')}
              title="سوينغ متوسط وطويل: 1h / 4h / 1D / 1D"
              className="px-1.5 py-0.5 rounded bg-[#162033] hover:bg-[#1E293B] text-[#A3B4D0] hover:text-[#E8EEF9] text-[10px] font-mono transition-colors"
            >
              Swing
            </button>
            <button
              onClick={() => onApplyMtfPreset('major')}
              title="الأزواج الأربعة الكبرى: EURUSD / GBPUSD / USDJPY / XAUUSD"
              className="px-1.5 py-0.5 rounded bg-[#162033] hover:bg-[#1E293B] text-[#F59E0B] text-[10px] font-mono transition-colors"
            >
              Majors
            </button>
          </div>
        )}

        {/* Sync Symbol Toggle */}
        {onToggleSyncSymbol && (
          <button
            onClick={onToggleSyncSymbol}
            title={syncSymbol ? 'مزامنة الرمز عبر كل الفريمات (مفعّل)' : 'مزامنة الرمز (معطّل - كل فريم مستقل)'}
            className={`flex items-center gap-1 px-2 py-1 rounded border text-xs transition-colors ${
              syncSymbol
                ? 'bg-[#042F2E] border-[#2DD4BF] text-[#2DD4BF] font-semibold'
                : 'bg-[#162033] border-[#243049] text-[#7B8DA8] hover:text-[#E8EEF9]'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">مزامنة الرمز</span>
          </button>
        )}

        <div className="w-[1px] h-4 bg-[#243049] mx-0.5" />

        {/* Multi-Chart Layout Switcher (TradingView style) */}
        <div className="flex items-center gap-0.5 bg-[#0B1220] p-0.5 rounded border border-[#243049]">
          <button
            onClick={() => onLayoutModeChange('single')}
            title="شارت فردي كامل (1 Chart)"
            className={`p-1 rounded transition-colors ${
              layoutMode === 'single' ? 'bg-[#2DD4BF] text-[#042F2E] font-bold' : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
            }`}
          >
            <Square className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onLayoutModeChange('split-v')}
            title="فريمين عموديين جنب بعض (2 Charts Side-by-Side)"
            className={`p-1 rounded transition-colors ${
              layoutMode === 'split-v' ? 'bg-[#2DD4BF] text-[#042F2E] font-bold' : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onLayoutModeChange('split-h')}
            title="فريمين أفقيين فوق بعض (2 Charts Stacked)"
            className={`p-1 rounded transition-colors ${
              layoutMode === 'split-h' ? 'bg-[#2DD4BF] text-[#042F2E] font-bold' : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
            }`}
          >
            <Rows className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onLayoutModeChange('triple')}
            title="3 فريمات (فريم رئيسي كبير + فريمين)"
            className={`p-1 rounded transition-colors ${
              layoutMode === 'triple' ? 'bg-[#2DD4BF] text-[#042F2E] font-bold' : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => onLayoutModeChange('quad')}
            title="شبكة 4 فريمات مربعة 2x2 (TradingView Quad 4-Square)"
            className={`p-1 rounded transition-colors ${
              layoutMode === 'quad' ? 'bg-[#2DD4BF] text-[#042F2E] font-bold' : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Command Console Toggle */}
        {onToggleConsole && (
          <button
            onClick={onToggleConsole}
            title="فتح/إغلاق موجه الأوامر (Command Session Console)"
            className={`p-1 px-2 rounded border border-[#243049] flex items-center gap-1 font-mono text-xs transition-colors ${
              isConsoleOpen ? 'bg-[#2DD4BF] text-[#042F2E] font-bold' : 'bg-[#162033] text-[#A3B4D0] hover:text-[#E8EEF9]'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="hidden md:inline">CLI</span>
          </button>
        )}
      </div>
    </div>
  );
};
