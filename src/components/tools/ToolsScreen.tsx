import React, { useState } from 'react';
import { MarketSymbol } from '../../types/market';
import { PositionSizeCalculator } from './PositionSizeCalculator';
import { TradeJournal } from './TradeJournal';
import { EconomicCalendar } from './EconomicCalendar';
import { MarketScreener } from './MarketScreener';
import { PriceAlerts } from './PriceAlerts';
import { BacktestPanel } from './BacktestPanel';
import {
  Calculator,
  BookOpen,
  Calendar,
  Compass,
  Bell,
  LineChart,
} from 'lucide-react';

interface ToolsScreenProps {
  symbols: MarketSymbol[];
  activeSymbol: string;
  onSelectSymbolForChart: (sym: string) => void;
}

export const ToolsScreen: React.FC<ToolsScreenProps> = ({
  symbols,
  activeSymbol,
  onSelectSymbolForChart,
}) => {
  const [activeTool, setActiveTool] = useState<
    'calculator' | 'journal' | 'calendar' | 'screener' | 'alerts' | 'backtest'
  >('calculator');

  const tools = [
    { id: 'calculator', name: 'حاسبة اللوت والمخاطرة', icon: <Calculator className="w-4 h-4" /> },
    { id: 'journal', name: 'دفتر الصفقات', icon: <BookOpen className="w-4 h-4" /> },
    { id: 'calendar', name: 'التقويم الاقتصادي', icon: <Calendar className="w-4 h-4" /> },
    { id: 'screener', name: 'ماسح السوق الفني', icon: <Compass className="w-4 h-4" /> },
    { id: 'alerts', name: 'تنبيهات الأسعار', icon: <Bell className="w-4 h-4" /> },
    { id: 'backtest', name: 'محاكي الاستراتيجيات', icon: <LineChart className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col h-full bg-[#0B1220] overflow-y-auto">
      {/* Sub-navigation Ribbon */}
      <div className="bg-[#121A2B] border-b border-[#243049] px-6 py-2 flex items-center gap-2 overflow-x-auto select-none">
        {tools.map((tool) => (
          <button
            key={tool.id}
            onClick={() => setActiveTool(tool.id as any)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTool === tool.id
                ? 'bg-[#2DD4BF] text-[#042F2E] shadow-sm'
                : 'text-[#A3B4D0] hover:text-[#E8EEF9] hover:bg-[#162033]'
            }`}
          >
            {tool.icon}
            <span>{tool.name}</span>
          </button>
        ))}
      </div>

      {/* Main Tool Content Container */}
      <div className="flex-1">
        {activeTool === 'calculator' && (
          <PositionSizeCalculator symbols={symbols} activeSymbol={activeSymbol} />
        )}
        {activeTool === 'journal' && <TradeJournal symbols={symbols} />}
        {activeTool === 'calendar' && <EconomicCalendar />}
        {activeTool === 'screener' && (
          <MarketScreener symbols={symbols} onSelectSymbolForChart={onSelectSymbolForChart} />
        )}
        {activeTool === 'alerts' && <PriceAlerts symbols={symbols} activeSymbol={activeSymbol} />}
        {activeTool === 'backtest' && <BacktestPanel symbols={symbols} />}
      </div>
    </div>
  );
};
