import React, { useEffect, useState } from 'react';
import { MarketSymbol, PriceAlertItem } from '../../types/market';
import { LangId, DICTS, gx } from '../../i18n/locales';
import { PositionSizeCalculator } from './PositionSizeCalculator';
import { TradeJournal } from './TradeJournal';
import { EconomicCalendar } from './EconomicCalendar';
import { MarketScreener } from './MarketScreener';
import { PriceAlerts } from './PriceAlerts';
import { BacktestPanel } from './BacktestPanel';
import { PortfolioRiskPanel } from '../dashboard/PortfolioRiskPanel';
import { AnalyticsDashboardPanel } from '../dashboard/AnalyticsDashboardPanel';
import { Calculator, BookOpen, Calendar, Compass, Bell, FlaskConical, ShieldAlert, TrendingUp, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react';

export type ToolId = 'calculator' | 'journal' | 'calendar' | 'screener' | 'alerts' | 'backtest' | 'risk' | 'analytics';
const TOOL_IDS: ToolId[] = ['calculator', 'calendar', 'screener', 'backtest', 'journal', 'alerts', 'risk', 'analytics'];
const LAST_KEY = 'matrix.tools.last.v1';

interface ToolsScreenProps {
  symbols: MarketSymbol[];
  activeSymbol: string;
  onSelectSymbolForChart: (sym: string) => void;
  alerts?: PriceAlertItem[];
  onAddAlert?: (newAlert: Omit<PriceAlertItem, 'id' | 'triggered' | 'active'>) => void;
  onDeleteAlert?: (id: string) => void;
  onToggleAlert?: (id: string) => void;
  /** A request from elsewhere in the app to open a tool (`at` makes repeated requests work). */
  openRequest?: { tool: ToolId; at: number } | null;
  /** @deprecated kept for older callers; prefer `openRequest`. */
  initialTool?: ToolId;
  currentLang?: LangId;
}

function readLast(): ToolId | null {
  try {
    const v = localStorage.getItem(LAST_KEY);
    return v && (TOOL_IDS as string[]).includes(v) ? (v as ToolId) : null;
  } catch {
    return null;
  }
}

export const ToolsScreen: React.FC<ToolsScreenProps> = ({
  symbols,
  activeSymbol,
  onSelectSymbolForChart,
  alerts,
  onAddAlert,
  onDeleteAlert,
  onToggleAlert,
  openRequest,
  currentLang = 'ar',
}) => {
  const dict = DICTS[currentLang] || DICTS.ar;
  const x = gx(currentLang);
  const [active, setActive] = useState<ToolId | null>(() => openRequest?.tool ?? readLast());

  useEffect(() => {
    if (openRequest) setActive(openRequest.tool);
  }, [openRequest?.at]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (active) {
      // keep the selected tab visible in the scrollable tool bar (phones)
      requestAnimationFrame(() =>
        document.querySelector(`[data-testid="tool-tab-${active}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center' })
      );
    }
    try {
      if (active) localStorage.setItem(LAST_KEY, active);
      else localStorage.removeItem(LAST_KEY);
    } catch {
      // storage blocked
    }
  }, [active]);

  const tools: { id: ToolId; name: string; desc: string; icon: React.ReactNode; tone: string }[] = [
    { id: 'calculator', name: dict.toolPositionCalc, desc: x.t_dCalc, icon: <Calculator className="w-5 h-5" />, tone: 'text-[#2DD4BF] bg-[#2DD4BF]/10' },
    { id: 'calendar', name: dict.toolCalendar, desc: x.t_dCal, icon: <Calendar className="w-5 h-5" />, tone: 'text-rose-300 bg-rose-500/10' },
    { id: 'screener', name: dict.toolScreener, desc: x.t_dScr, icon: <Compass className="w-5 h-5" />, tone: 'text-sky-300 bg-sky-500/10' },
    { id: 'backtest', name: dict.toolBacktest, desc: x.t_dBt, icon: <FlaskConical className="w-5 h-5" />, tone: 'text-violet-300 bg-violet-500/10' },
    { id: 'journal', name: dict.toolTradeJournal, desc: x.t_dJournal, icon: <BookOpen className="w-5 h-5" />, tone: 'text-amber-300 bg-amber-500/10' },
    { id: 'alerts', name: dict.toolAlerts, desc: x.t_dAlerts, icon: <Bell className="w-5 h-5" />, tone: 'text-yellow-200 bg-yellow-400/10' },
    { id: 'risk', name: dict.toolRisk, desc: x.t_dRisk, icon: <ShieldAlert className="w-5 h-5" />, tone: 'text-orange-300 bg-orange-500/10' },
    { id: 'analytics', name: dict.toolAnalytics, desc: x.t_dAnalytics, icon: <TrendingUp className="w-5 h-5" />, tone: 'text-emerald-300 bg-emerald-500/10' },
  ];
  const rtl = currentLang !== 'en-US';
  const Chevron = rtl ? ChevronLeft : ChevronRight;

  if (!active) {
    return (
      <div className="h-full overflow-y-auto bg-[#0B1220]" data-testid="tools-grid">
        <div className="p-4 md:p-6 max-w-6xl mx-auto pb-20 md:pb-8">
          <h1 className="text-lg font-bold text-[#E8EEF9]">{dict.toolsTitle}</h1>
          <p className="text-[12px] text-[#7B8DA8] mb-4">{x.t_gridSub}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {tools.map((t) => (
              <button
                key={t.id}
                onClick={() => setActive(t.id)}
                className="group text-start rounded-2xl bg-[#121A2B] border border-[#243049] hover:border-[#2DD4BF]/60 hover:bg-[#13213A] p-4 min-h-[118px] flex flex-col gap-2 cursor-pointer transition-colors"
                data-testid={`tool-card-${t.id}`}
              >
                <div className="flex items-center justify-between">
                  <span className={`w-10 h-10 rounded-xl flex items-center justify-center ${t.tone}`}>{t.icon}</span>
                  <Chevron className="w-4 h-4 text-[#475569] group-hover:text-[#2DD4BF]" />
                </div>
                <span className="text-[14px] font-bold text-[#E8EEF9]">{t.name}</span>
                <span className="text-[12px] text-[#7B8DA8] leading-relaxed">{t.desc}</span>
              </button>
            ))}
          </div>
          <p className="text-[11px] text-[#64748B] mt-4">{x.t_eduNote}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#0B1220] overflow-y-auto" data-testid="tools-screen">
      <div className="sticky top-0 z-20 bg-[#121A2B]/95 backdrop-blur border-b border-[#243049] px-3 md:px-6 py-2 flex items-center gap-2 select-none">
        <button
          onClick={() => setActive(null)}
          className="shrink-0 flex items-center gap-1.5 px-3 min-h-[40px] rounded-xl text-xs font-semibold text-[#A3B4D0] hover:text-white hover:bg-[#162033] cursor-pointer border border-[#24344E]"
          data-testid="tools-home"
        >
          <LayoutGrid className="w-4 h-4" />
          <span className="hidden sm:inline">{x.t_allTools}</span>
        </button>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar" role="tablist" aria-label={dict.toolsTitle}>
          {tools.map((t) => (
            <button
              key={t.id}
              role="tab"
              aria-selected={active === t.id}
              onClick={() => setActive(t.id)}
              className={`flex items-center gap-1.5 px-3 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer min-h-[40px] ${
                active === t.id ? 'bg-[#2DD4BF] text-[#042F2E] font-bold' : 'text-[#A3B4D0] hover:text-[#E8EEF9] hover:bg-[#162033]'
              }`}
              data-testid={`tool-tab-${t.id}`}
            >
              {React.cloneElement(t.icon as React.ReactElement<{ className?: string }>, { className: 'w-4 h-4' })}
              <span>{t.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 pb-20 md:pb-6">
        {active === 'calculator' && <PositionSizeCalculator symbols={symbols} activeSymbol={activeSymbol} currentLang={currentLang} />}
        {active === 'journal' && <TradeJournal symbols={symbols} currentLang={currentLang} />}
        {active === 'calendar' && <EconomicCalendar currentLang={currentLang} />}
        {active === 'screener' && <MarketScreener symbols={symbols} onSelectSymbolForChart={onSelectSymbolForChart} currentLang={currentLang} />}
        {active === 'risk' && <PortfolioRiskPanel currentLang={currentLang} />}
        {active === 'analytics' && <AnalyticsDashboardPanel currentLang={currentLang} />}
        {active === 'alerts' && (
          <PriceAlerts
            symbols={symbols}
            activeSymbol={activeSymbol}
            alerts={alerts}
            onAddAlert={onAddAlert}
            onDeleteAlert={onDeleteAlert}
            onToggleAlert={onToggleAlert}
          />
        )}
        {active === 'backtest' && <BacktestPanel symbols={symbols} currentLang={currentLang} />}
      </div>
    </div>
  );
};
