import React, { useState, useEffect } from 'react';
import { LangId, DICTS } from '../../i18n/locales';
import { MarketSymbol } from '../../types/market';
import { getMarketStatus, MarketStatus } from '../../api/market';
import { NotificationsCenterModal } from './NotificationsCenterModal';
import { OfflineBadge } from './OfflineBadge';
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

export type AppTab = 'home' | 'community' | 'academy' | 'pricing' | 'tools' | 'account' | 'watchlist';

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
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null);
  const [isNotifsOpen, setIsNotifsOpen] = useState(false);

  useEffect(() => {
    getMarketStatus().then(setMarketStatus);
    const statusInterval = setInterval(() => {
      getMarketStatus().then(setMarketStatus);
    }, 30000);
    return () => clearInterval(statusInterval);
  }, []);

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
      {/* Brand & Navigation */}
      <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
        {/* Brand */}
        <div
          onClick={() => onTabChange('home')}
          className="flex items-center gap-2 cursor-pointer group shrink-0"
        >
          <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-[#2DD4BF] to-[#0284C7] flex items-center justify-center text-[#042F2E] font-black text-xs shadow-md group-hover:scale-105 transition-transform">
            M
          </div>
          <div>
            <span className="font-extrabold text-sm tracking-wider text-white">MATRIX</span>
            <span className="text-[10px] text-[#2DD4BF] font-mono mr-1 px-1.5 py-0.2 bg-[#2DD4BF]/10 rounded border border-[#2DD4BF]/20">
              PRO
            </span>
          </div>
        </div>

        {/* 1. Phone Slim Top Bar: current symbol + market status dot + offline badge */}
        <div className="md:hidden flex items-center gap-2">
          <span className="font-mono font-bold text-xs text-[#E8EEF9] bg-[#111C2E] px-2 py-0.5 rounded-md border border-[#1E2E4A]">
            {activeSymbol}
          </span>
          <span
            title={marketStatus?.isOpen ? 'السوق مفتوح' : 'السوق مغلق'}
            className={`w-2 h-2 rounded-full shrink-0 ${
              marketStatus?.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <OfflineBadge className="text-[9px] px-1.5 py-0.2" />
        </div>

        <div className="w-[1px] h-5 bg-[#1E293B] hidden md:block" />

        {/* 1. Commercial End-User Navigation Tabs (collapsed to icons with tooltips on tablet 768-1100px, hidden on phones) */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => onTabChange('home')}
            title="الشارت الفني"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              currentTab === 'home'
                ? 'bg-[#1E2E4A] text-[#2DD4BF] border border-[#2DD4BF]/40'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#131F33]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden min-[1101px]:inline">الشارت الفني</span>
          </button>

          <button
            onClick={() => onTabChange('community')}
            title="مجتمع المتداولين"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              currentTab === 'community'
                ? 'bg-[#1E2E4A] text-[#2DD4BF] border border-[#2DD4BF]/40'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#131F33]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden min-[1101px]:inline">مجتمع المتداولين</span>
          </button>

          <button
            onClick={() => onTabChange('academy')}
            title="الأكاديمية والدروس"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              currentTab === 'academy'
                ? 'bg-[#1E2E4A] text-[#2DD4BF] border border-[#2DD4BF]/40'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#131F33]'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden min-[1101px]:inline">الأكاديمية والدروس</span>
          </button>

          <button
            onClick={() => onTabChange('tools')}
            title="أدوات التحليل والتقويم"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              currentTab === 'tools'
                ? 'bg-[#1E2E4A] text-[#2DD4BF] border border-[#2DD4BF]/40'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#131F33]'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden min-[1101px]:inline">أدوات التحليل والتقويم</span>
          </button>

          <button
            onClick={() => onTabChange('pricing')}
            title="الباقات والترقية"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              currentTab === 'pricing'
                ? 'bg-[#1E2E4A] text-[#2DD4BF] border border-[#2DD4BF]/40'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#131F33]'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden min-[1101px]:inline">الباقات والترقية</span>
          </button>
        </nav>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Offline Status Badge (Desktop & Tablet) */}
        <OfflineBadge className="hidden md:inline-flex" />

        {/* 1.5 Market status badge in header (open/closed + next session) - Visible on tablet and desktop */}
        <div
          title={
            marketStatus
              ? `الجلسة الحالية: ${marketStatus.currentSession} • الجلسة القادمة: ${marketStatus.nextSession}`
              : 'جاري فحص حالة السوق...'
          }
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#070D18] border border-[#16233B] text-[11px] font-mono cursor-default shrink-0"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              marketStatus?.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span className={marketStatus?.isOpen ? 'text-emerald-400 font-semibold' : 'text-[#94A3B8]'}>
            {marketStatus?.isOpen ? 'السوق مفتوح' : 'السوق مغلق'}
          </span>
          {marketStatus && (
            <span className="text-[#64748B] text-[10px] hidden min-[1101px]:inline">
              ({marketStatus.isOpen ? marketStatus.currentSession : marketStatus.nextSession})
            </span>
          )}
        </div>

        {/* GMT Clock - Desktop > 1100px only */}
        <div className="hidden min-[1101px]:flex items-center gap-1.5 font-mono text-[11px] text-[#64748B] bg-[#070D18] px-2.5 py-1 rounded border border-[#16233B] shrink-0">
          <Clock className="w-3 h-3 text-[#2DD4BF]" />
          <span>{timeStr}</span>
        </div>

        {/* 3.2 Notifications center (bell in header) - Visible on phone, tablet and desktop */}
        <button
          onClick={() => setIsNotifsOpen(true)}
          title="مركز الإشعارات والتنبيهات"
          className="p-1.5 rounded-lg bg-[#111C2E] hover:bg-[#182842] border border-[#1E2E4A] text-[#94A3B8] hover:text-white relative transition-colors cursor-pointer shrink-0"
        >
          <Bell className="w-4 h-4" />
          {activeAlertsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
              {activeAlertsCount}
            </span>
          )}
        </button>

        {/* Account / Settings Tab Button - Visible on tablet and desktop */}
        <button
          onClick={() => onTabChange('account')}
          title="حسابي وإعدادات المنصة"
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 ${
            currentTab === 'account'
              ? 'bg-[#1E2E4A] text-[#2DD4BF] border border-[#2DD4BF]/40'
              : 'bg-[#111C2E] hover:bg-[#182842] border border-[#1E2E4A] text-[#94A3B8] hover:text-white'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span className="hidden min-[1101px]:inline">حسابي</span>
        </button>
      </div>

      {/* 3.2 Notifications Center Modal */}
      <NotificationsCenterModal
        isOpen={isNotifsOpen}
        onClose={() => setIsNotifsOpen(false)}
        onSelectSymbol={onSelectSymbol}
      />
    </header>
  );
};
