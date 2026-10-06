import React, { useState, useEffect } from 'react';
import { LangId, DICTS, gx } from '../../i18n/locales';
import { MarketSymbol } from '../../types/market';
import { getMarketStatus, MarketStatus, localizedSessionLabels } from '../../api/market';
import { NotificationsCenterModal, getStoredNotifications } from './NotificationsCenterModal';
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
  Check,
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
  const gxt = gx(currentLang);
  const sessionText = (ms: MarketStatus) =>
    localizedSessionLabels(ms, { tokyo: gxt.g_sesTokyo, london: gxt.g_sesLondon, newYork: gxt.g_sesNewYork, sydney: gxt.g_sesSydney, weekend: gxt.g_sesWeekend, switching: gxt.g_sesSwitching, opens: gxt.g_sesOpens });
  const [timeStr, setTimeStr] = useState('');
  const [marketStatus, setMarketStatus] = useState<MarketStatus | null>(null);
  const [isNotifsOpen, setIsNotifsOpen] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Sync unread notifications count with localStorage
  useEffect(() => {
    const updateUnread = () => {
      const items = getStoredNotifications();
      setUnreadNotifsCount(items.filter((n) => !n.read).length);
    };
    updateUnread();
    window.addEventListener('matrix_notifications_updated', updateUnread);
    return () => window.removeEventListener('matrix_notifications_updated', updateUnread);
  }, []);

  // Close menus on outside click or esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMoreMenuOpen(false);
        setIsLangMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

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
            title={marketStatus?.isOpen ? dict.marketStatusOpen : dict.marketStatusClosed}
            className={`w-2 h-2 rounded-full shrink-0 ${
              marketStatus?.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <OfflineBadge className="text-[9px] px-1.5 py-0.2" />
        </div>

        <div className="w-[1px] h-5 bg-[#1E293B] hidden md:block" />

        {/* 1. Commercial End-User Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-1.5 flex-nowrap shrink-0">
          <button
            onClick={() => onTabChange('home')}
            title={dict.navChart}
            aria-label={dict.navChart}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden ${
              currentTab === 'home'
                ? 'bg-[#1E2E4A] text-[#2DD4BF] border border-[#2DD4BF]/40'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#131F33]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5 shrink-0" />
            <span className="inline min-[1101px]:hidden">{dict.navChartShort}</span>
            <span className="hidden min-[1101px]:inline">{dict.navChart}</span>
          </button>

          <button
            onClick={() => onTabChange('community')}
            title={dict.navCommunity}
            aria-label={dict.navCommunity}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden ${
              currentTab === 'community'
                ? 'bg-[#1E2E4A] text-[#2DD4BF] border border-[#2DD4BF]/40'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#131F33]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span className="inline min-[1101px]:hidden">{dict.navCommunityShort}</span>
            <span className="hidden min-[1101px]:inline">{dict.navCommunity}</span>
          </button>

          <button
            onClick={() => onTabChange('academy')}
            title={dict.navAcademy}
            aria-label={dict.navAcademy}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden ${
              currentTab === 'academy'
                ? 'bg-[#1E2E4A] text-[#2DD4BF] border border-[#2DD4BF]/40'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#131F33]'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 shrink-0" />
            <span className="inline min-[1101px]:hidden">{dict.navAcademyShort}</span>
            <span className="hidden min-[1101px]:inline">{dict.navAcademy}</span>
          </button>

          {/* Desktop Only Tabs (> 1100px) */}
          <button
            onClick={() => onTabChange('tools')}
            title={dict.navTools}
            aria-label={dict.navTools}
            className={`hidden min-[1101px]:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden ${
              currentTab === 'tools'
                ? 'bg-[#1E2E4A] text-[#2DD4BF] border border-[#2DD4BF]/40'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#131F33]'
            }`}
          >
            <Wrench className="w-3.5 h-3.5 shrink-0" />
            <span>{dict.navTools}</span>
          </button>

          <button
            onClick={() => onTabChange('pricing')}
            title={dict.navPricing}
            aria-label={dict.navPricing}
            className={`hidden min-[1101px]:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden ${
              currentTab === 'pricing'
                ? 'bg-[#1E2E4A] text-[#2DD4BF] border border-[#2DD4BF]/40'
                : 'text-[#94A3B8] hover:text-white hover:bg-[#131F33]'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5 shrink-0" />
            <span>{dict.navPricing}</span>
          </button>

          {/* Tablet "المزيد" (More) Menu (768px – 1100px) */}
          <div className="relative min-[1101px]:hidden">
            <button
              onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
              title={dict.moreMenuTitle}
              aria-label={dict.moreMenuTitle}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden ${
                currentTab === 'tools' || currentTab === 'pricing' || currentTab === 'account'
                  ? 'bg-[#1E2E4A] text-[#2DD4BF] border border-[#2DD4BF]/40'
                  : 'text-[#94A3B8] hover:text-white hover:bg-[#131F33]'
              }`}
            >
              <span>
                {currentTab === 'tools'
                  ? dict.navToolsShort
                  : currentTab === 'pricing'
                  ? dict.navPricingShort
                  : currentTab === 'account'
                  ? dict.navAccountShort
                  : dict.moreTabs}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isMoreMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMoreMenuOpen && (
              <div
                className="absolute top-full mt-1.5 right-0 z-50 bg-[#0E1726] border border-[#1E283D] rounded-xl shadow-2xl py-1.5 w-48 text-xs animate-in fade-in"
                onClick={() => setIsMoreMenuOpen(false)}
              >
                <button
                  onClick={() => onTabChange('tools')}
                  className={`w-full px-3 py-2 text-right flex items-center gap-2 hover:bg-[#16233B] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden ${
                    currentTab === 'tools' ? 'text-[#2DD4BF] font-bold bg-[#16233B]/50' : 'text-[#E8EEF9]'
                  }`}
                >
                  <Wrench className="w-3.5 h-3.5 text-[#2DD4BF]" />
                  <span>{dict.navTools}</span>
                </button>
                <button
                  onClick={() => onTabChange('pricing')}
                  className={`w-full px-3 py-2 text-right flex items-center gap-2 hover:bg-[#16233B] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden ${
                    currentTab === 'pricing' ? 'text-[#2DD4BF] font-bold bg-[#16233B]/50' : 'text-[#E8EEF9]'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5 text-[#2DD4BF]" />
                  <span>{dict.navPricing}</span>
                </button>
                <button
                  onClick={() => onTabChange('account')}
                  className={`w-full px-3 py-2 text-right flex items-center gap-2 hover:bg-[#16233B] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden ${
                    currentTab === 'account' ? 'text-[#2DD4BF] font-bold bg-[#16233B]/50' : 'text-[#E8EEF9]'
                  }`}
                >
                  <User className="w-3.5 h-3.5 text-[#2DD4BF]" />
                  <span>{dict.navAccount}</span>
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Offline Status Badge (Desktop & Tablet) */}
        <OfflineBadge className="hidden md:inline-flex" />

        {/* 1.5 Market status badge in header */}
        <div
          title={
            marketStatus
              ? `${dict.currentSessionLabel}: ${sessionText(marketStatus).current} • ${dict.nextSessionLabel}: ${sessionText(marketStatus).next}`
              : dict.checkingMarket
          }
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#070D18] border border-[#16233B] text-[11px] font-mono cursor-default shrink-0 whitespace-nowrap"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              marketStatus?.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
            }`}
          />
          <span className={marketStatus?.isOpen ? 'text-emerald-400 font-semibold' : 'text-[#94A3B8]'}>
            {marketStatus?.isOpen ? dict.marketStatusOpen : dict.marketStatusClosed}
          </span>
          {marketStatus && (
            <span className="text-[#64748B] text-[10px] hidden min-[1101px]:inline">
              ({marketStatus.isOpen ? sessionText(marketStatus).current : sessionText(marketStatus).next})
            </span>
          )}
        </div>

        {/* GMT Clock - Desktop > 1100px only */}
        <div className="hidden min-[1101px]:flex items-center gap-1.5 font-mono text-[11px] text-[#64748B] bg-[#070D18] px-2.5 py-1 rounded border border-[#16233B] shrink-0 whitespace-nowrap">
          <Clock className="w-3 h-3 text-[#2DD4BF]" />
          <span>{timeStr}</span>
        </div>

        {/* 3.2 Language Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
            title={dict.switchLanguage}
            aria-label={dict.switchLanguage}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#111C2E] hover:bg-[#182842] border border-[#1E2E4A] text-[#94A3B8] hover:text-white transition-colors cursor-pointer text-xs shrink-0 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden"
          >
            <Globe className="w-3.5 h-3.5 text-[#2DD4BF]" />
            <span className="hidden sm:inline font-sans font-medium text-[11px]">
              {currentLang === 'ar' ? 'العربية' : currentLang === 'en-US' ? 'EN' : 'کوردی'}
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#64748B]" />
          </button>
          {isLangMenuOpen && (
            <div className="absolute top-full mt-1.5 left-0 z-50 bg-[#0E1726] border border-[#1E283D] rounded-xl shadow-2xl py-1 w-28 text-xs text-right animate-in fade-in">
              <button
                onClick={() => {
                  onLanguageChange('ar');
                  setIsLangMenuOpen(false);
                }}
                className={`w-full px-3 py-1.5 text-right flex items-center justify-between hover:bg-[#16233B] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden ${
                  currentLang === 'ar' ? 'text-[#2DD4BF] font-bold' : 'text-[#E8EEF9]'
                }`}
              >
                <span>العربية</span>
                {currentLang === 'ar' && <Check className="w-3.5 h-3.5 text-[#2DD4BF]" />}
              </button>
              <button
                onClick={() => {
                  onLanguageChange('en-US');
                  setIsLangMenuOpen(false);
                }}
                className={`w-full px-3 py-1.5 text-right flex items-center justify-between hover:bg-[#16233B] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden ${
                  currentLang === 'en-US' ? 'text-[#2DD4BF] font-bold' : 'text-[#E8EEF9]'
                }`}
              >
                <span>English</span>
                {currentLang === 'en-US' && <Check className="w-3.5 h-3.5 text-[#2DD4BF]" />}
              </button>
              <button
                onClick={() => {
                  onLanguageChange('ku');
                  setIsLangMenuOpen(false);
                }}
                className={`w-full px-3 py-1.5 text-right flex items-center justify-between hover:bg-[#16233B] cursor-pointer focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden ${
                  currentLang === 'ku' ? 'text-[#2DD4BF] font-bold' : 'text-[#E8EEF9]'
                }`}
              >
                <span>کوردی</span>
                {currentLang === 'ku' && <Check className="w-3.5 h-3.5 text-[#2DD4BF]" />}
              </button>
            </div>
          )}
        </div>

        {/* 3.4 Badge count in header equals unread count */}
        <button
          onClick={() => setIsNotifsOpen(true)}
          title={dict.notificationsTitle}
          aria-label={dict.notificationsTitle}
          className="p-1.5 rounded-lg bg-[#111C2E] hover:bg-[#182842] border border-[#1E2E4A] text-[#94A3B8] hover:text-white relative transition-colors cursor-pointer shrink-0 focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden"
        >
          <Bell className="w-4 h-4" />
          {unreadNotifsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center font-mono animate-pulse">
              {unreadNotifsCount > 99 ? '99+' : unreadNotifsCount}
            </span>
          )}
        </button>

        {/* Account / Settings Tab Button - Visible on tablet and desktop */}
        <button
          onClick={() => onTabChange('account')}
          title={dict.accountTitle}
          aria-label={dict.accountTitle}
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer shrink-0 whitespace-nowrap focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden ${
            currentTab === 'account'
              ? 'bg-[#1E2E4A] text-[#2DD4BF] border border-[#2DD4BF]/40'
              : 'bg-[#111C2E] hover:bg-[#182842] border border-[#1E2E4A] text-[#94A3B8] hover:text-white'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span className="hidden min-[1101px]:inline">{dict.tabAccount}</span>
        </button>
      </div>

      {/* 3.2 Notifications Center Modal */}
      <NotificationsCenterModal
        isOpen={isNotifsOpen}
        onClose={() => setIsNotifsOpen(false)}
        onSelectSymbol={onSelectSymbol}
        currentLang={currentLang}
      />
    </header>
  );
};
