import React, { useState, useEffect } from 'react';
import { LangId, DICTS } from '../../i18n/locales';
import { MarketSymbol } from '../../types/market';
import {
  TrendingUp,
  Sliders,
  GraduationCap,
  User,
  Clock,
  Sparkles,
  ChevronDown,
  Globe,
  Bell,
  MessageSquare,
  Award,
  CreditCard,
  Wrench,
} from 'lucide-react';

export type AppTab = 'home' | 'community' | 'academy' | 'pricing' | 'tools' | 'account';

interface HeaderProps {
  currentTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  currentLang: LangId;
  onLanguageChange: (lang: LangId) => void;
  symbols: MarketSymbol[];
  activeSymbol: string;
  onSelectSymbol: (symbol: string) => void;
  activeAlertsCount?: number;
  onOpenAlerts?: () => void;
  onOpenAiChat?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  onTabChange,
  currentLang,
  onLanguageChange,
  symbols,
  activeSymbol,
  onSelectSymbol,
  activeAlertsCount = 0,
  onOpenAlerts,
  onOpenAiChat,
}) => {
  const dict = DICTS[currentLang];
  const [timeStr, setTimeStr] = useState('');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const h = now.getUTCHours().toString().padStart(2, '0');
      const m = now.getUTCMinutes().toString().padStart(2, '0');
      const s = now.getUTCSeconds().toString().padStart(2, '0');
      setTimeStr(`${h}:${m}:${s} GMT`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  const activeSymbolObj = symbols.find((s) => s.symbol === activeSymbol) || symbols[0];

  return (
    <header className="h-12 bg-[#0A1222] border-b border-[#1E293B] px-3 lg:px-4 flex items-center justify-between select-none text-xs z-30 gap-2 shrink-0">
      {/* Brand & Left Navigation */}
      <div className="flex items-center gap-4 lg:gap-6">
        {/* Brand */}
        <div
          onClick={() => onTabChange('home')}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#2DD4BF] to-[#0284C7] flex items-center justify-center text-[#042F2E] font-black text-xs shadow-md group-hover:scale-105 transition-transform">
            M
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-wider text-white">MATRIX</span>
            <span className="text-[10px] text-[#2DD4BF] font-mono mr-1.5 px-1.5 py-0.2 bg-[#2DD4BF]/10 rounded border border-[#2DD4BF]/20">
              PRO
            </span>
          </div>
        </div>

        <div className="w-[1px] h-5 bg-[#1E293B] hidden md:block" />

        {/* Commercial End-User Navigation Tabs */}
        <nav className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => onTabChange('home')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentTab === 'home'
                ? 'bg-[#1E2E4A] text-[#2DD4BF] border border-[#2DD4BF]/40'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#131F33]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>الشارت الفني</span>
          </button>

          <button
            onClick={() => onTabChange('community')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentTab === 'community'
                ? 'bg-[#1E2E4A] text-[#2DD4BF] border border-[#2DD4BF]/40'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#131F33]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>مجتمع المتداولين</span>
          </button>

          <button
            onClick={() => onTabChange('academy')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentTab === 'academy'
                ? 'bg-[#1E2E4A] text-[#2DD4BF] border border-[#2DD4BF]/40'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#131F33]'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5" />
            <span>الأكاديمية والدروس</span>
          </button>

          <button
            onClick={() => onTabChange('tools')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentTab === 'tools'
                ? 'bg-[#1E2E4A] text-[#2DD4BF] border border-[#2DD4BF]/40'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#131F33]'
            }`}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>أدوات التحليل والتقويم</span>
          </button>

          <button
            onClick={() => onTabChange('pricing')}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currentTab === 'pricing'
                ? 'bg-[#1E2E4A] text-[#2DD4BF] border border-[#2DD4BF]/40'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#131F33]'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>الباقات والترقية</span>
          </button>
        </nav>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* GMT Clock */}
        <div className="hidden lg:flex items-center gap-1.5 font-mono text-[11px] text-[#64748B] bg-[#070D18] px-2.5 py-1 rounded border border-[#16233B]">
          <Clock className="w-3 h-3 text-[#2DD4BF]" />
          <span>{timeStr}</span>
        </div>

        {/* Price Alerts Bell */}
        {onOpenAlerts && (
          <button
            onClick={onOpenAlerts}
            title="التنبيهات السعرية"
            className="p-1.5 rounded-lg bg-[#111C2E] hover:bg-[#182842] border border-[#1E2E4A] text-[#94A3B8] hover:text-white relative transition-colors"
          >
            <Bell className="w-4 h-4" />
            {activeAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
                {activeAlertsCount}
              </span>
            )}
          </button>
        )}

        {/* Account / Settings Tab Button */}
        <button
          onClick={() => onTabChange('account')}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            currentTab === 'account'
              ? 'bg-[#1E2E4A] text-[#2DD4BF] border border-[#2DD4BF]/40'
              : 'bg-[#111C2E] hover:bg-[#182842] border border-[#1E2E4A] text-[#94A3B8] hover:text-white'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">حسابي</span>
        </button>
      </div>
    </header>
  );
};
