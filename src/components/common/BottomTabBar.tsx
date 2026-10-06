import React, { useState, useEffect } from 'react';
import { AppTab } from './Header';
import { LangId, DICTS } from '../../i18n/locales';
import {
  TrendingUp,
  List,
  Wrench,
  GraduationCap,
  MoreHorizontal,
  MessageSquare,
  BookOpen,
  User,
  CreditCard,
  Bell,
  Download,
  X,
  Share,
} from 'lucide-react';

interface BottomTabBarProps {
  currentTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  onOpenNotifications?: () => void;
  onOpenWatchlist?: () => void;
  onOpenJournal?: () => void;
  isWatchlistOpen?: boolean;
  activeAlertsCount?: number;
  deferredPrompt?: any;
  onInstallApp?: () => void;
  currentLang?: LangId;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  currentTab,
  onTabChange,
  onOpenNotifications,
  onOpenWatchlist,
  onOpenJournal,
  isWatchlistOpen = false,
  activeAlertsCount = 0,
  deferredPrompt,
  onInstallApp,
  currentLang = 'ar',
}) => {
  const dict = DICTS[currentLang] || DICTS.ar;
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  const isIos =
    typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as any).MSStream;

  // Handle Esc key to close sheet
  useEffect(() => {
    if (!isMoreMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMoreMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMoreMenuOpen]);

  const handleMoreItemClick = (action: () => void) => {
    action();
    setIsMoreMenuOpen(false);
  };

  return (
    <>
      {/* 1.1 Mobile Bottom Tab Bar (visible strictly on < 768px screens) */}
      <nav
        aria-label="Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0A1222]/95 backdrop-blur-lg border-t border-[#1E293B] flex items-center justify-around px-1 py-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))] select-none shadow-2xl"
      >
        {/* Tab 1: الشارت */}
        <button
          onClick={() => {
            onTabChange('home');
            setIsMoreMenuOpen(false);
          }}
          aria-label={dict.tabHome}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden ${
            currentTab === 'home' && !isWatchlistOpen
              ? 'text-[#2DD4BF] font-bold'
              : 'text-[#8899B5] hover:text-white'
          }`}
        >
          <TrendingUp className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">{dict.tabHome}</span>
        </button>

        {/* Tab 2: قائمة المراقبة */}
        <button
          onClick={() => {
            onTabChange('watchlist');
            setIsMoreMenuOpen(false);
          }}
          aria-label={dict.tabWatchlist}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden ${
            currentTab === 'watchlist' || isWatchlistOpen
              ? 'text-[#2DD4BF] font-bold'
              : 'text-[#8899B5] hover:text-white'
          }`}
        >
          <List className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">{dict.tabWatchlist}</span>
        </button>

        {/* Tab 3: الأدوات */}
        <button
          onClick={() => {
            onTabChange('tools');
            setIsMoreMenuOpen(false);
          }}
          aria-label={dict.tabTools}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden ${
            currentTab === 'tools' && !isWatchlistOpen
              ? 'text-[#2DD4BF] font-bold'
              : 'text-[#8899B5] hover:text-white'
          }`}
        >
          <Wrench className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">{dict.tabTools}</span>
        </button>

        {/* Tab 4: الأكاديمية */}
        <button
          onClick={() => {
            onTabChange('academy');
            setIsMoreMenuOpen(false);
          }}
          aria-label={dict.tabAcademy}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden ${
            currentTab === 'academy' && !isWatchlistOpen
              ? 'text-[#2DD4BF] font-bold'
              : 'text-[#8899B5] hover:text-white'
          }`}
        >
          <GraduationCap className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">{dict.tabAcademy}</span>
        </button>

        {/* Tab 5: المزيد (More menu modal) */}
        <button
          onClick={() => setIsMoreMenuOpen(true)}
          aria-label={dict.moreTabs}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all relative cursor-pointer focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden ${
            ['community', 'account', 'pricing'].includes(currentTab) || isMoreMenuOpen
              ? 'text-[#2DD4BF] font-bold'
              : 'text-[#8899B5] hover:text-white'
          }`}
        >
          <div className="relative">
            <MoreHorizontal className="w-5 h-5 mb-0.5" />
            {activeAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1.5 w-2 h-2 rounded-full bg-rose-500" />
            )}
          </div>
          <span className="text-[10px] leading-tight">{dict.moreTabs}</span>
        </button>
      </nav>

      {/* 1.1 "المزيد" Bottom Sheet / Action Modal */}
      {isMoreMenuOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setIsMoreMenuOpen(false)}
          className="md:hidden fixed inset-0 z-50 bg-black/75 backdrop-blur-xs flex flex-col justify-end animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-[#0C1526] border-t border-[#1E2E4A] rounded-t-3xl p-5 space-y-4 max-h-[85vh] overflow-y-auto shadow-2xl animate-in slide-in-from-bottom duration-200"
          >
            {/* Sheet Handle */}
            <div className="w-12 h-1.5 bg-[#24344E] rounded-full mx-auto" />

            <div className="flex items-center justify-between pb-2 border-b border-[#1A2840]">
              <h3 className="font-bold text-sm text-white">{dict.moreTabs}</h3>
              <button
                onClick={() => setIsMoreMenuOpen(false)}
                aria-label={dict.closeModal}
                className="p-1 rounded-lg text-[#7B8DA8] hover:text-white cursor-pointer min-w-[36px] min-h-[36px] flex items-center justify-center"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Items Grid */}
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              {/* مجتمع المتداولين */}
              <button
                onClick={() =>
                  handleMoreItemClick(() => {
                    onTabChange('community');
                  })
                }
                className="flex items-center gap-3 p-3.5 rounded-xl bg-[#121E33] border border-[#1E2E4A] text-right hover:border-[#2DD4BF]/50 active:scale-98 transition-all cursor-pointer min-h-[48px]"
              >
                <div className="p-2 rounded-lg bg-[#2DD4BF]/10 text-[#2DD4BF]">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#E8EEF9]">{dict.tabCommunity}</div>
                  <div className="text-[10px] text-[#7B8DA8]">{dict.bottomBarCommunityDesc}</div>
                </div>
              </button>

              {/* حسابي والإعدادات */}
              <button
                onClick={() =>
                  handleMoreItemClick(() => {
                    onTabChange('account');
                  })
                }
                className="flex items-center gap-3 p-3.5 rounded-xl bg-[#121E33] border border-[#1E2E4A] text-right hover:border-[#2DD4BF]/50 active:scale-98 transition-all cursor-pointer min-h-[48px] focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden"
              >
                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#E8EEF9]">{dict.tabAccount}</div>
                  <div className="text-[10px] text-[#7B8DA8]">{dict.accountSettings}</div>
                </div>
              </button>

              {/* باقات الاشتراك */}
              <button
                onClick={() =>
                  handleMoreItemClick(() => {
                    onTabChange('pricing');
                  })
                }
                className="flex items-center gap-3 p-3.5 rounded-xl bg-[#121E33] border border-[#1E2E4A] text-right hover:border-[#2DD4BF]/50 active:scale-98 transition-all cursor-pointer min-h-[48px] focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden"
              >
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#E8EEF9]">{dict.tabPricing}</div>
                  <div className="text-[10px] text-[#7B8DA8]">{dict.bottomBarPricingDesc}</div>
                </div>
              </button>

              {/* سجل الصفقات واليوميات */}
              <button
                onClick={() =>
                  handleMoreItemClick(() => {
                    if (onOpenJournal) {
                      onOpenJournal();
                    } else {
                      onTabChange('tools');
                    }
                  })
                }
                className="flex items-center gap-3 p-3.5 rounded-xl bg-[#121E33] border border-[#1E2E4A] text-right hover:border-[#2DD4BF]/50 active:scale-98 transition-all cursor-pointer min-h-[48px] focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden"
              >
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#E8EEF9]">{dict.toolTradeJournal}</div>
                  <div className="text-[10px] text-[#7B8DA8]">{dict.bottomBarJournalDesc}</div>
                </div>
              </button>

              {/* مركز الإشعارات والتنبيهات */}
              <button
                onClick={() =>
                  handleMoreItemClick(() => {
                    if (onOpenNotifications) onOpenNotifications();
                  })
                }
                className="flex items-center gap-3 p-3.5 rounded-xl bg-[#121E33] border border-[#1E2E4A] text-right hover:border-[#2DD4BF]/50 active:scale-98 transition-all cursor-pointer min-h-[48px] relative focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden"
              >
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 relative">
                  <Bell className="w-4 h-4" />
                  {activeAlertsCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500" />
                  )}
                </div>
                <div>
                  <div className="font-bold text-[#E8EEF9]">{dict.notificationsTitle}</div>
                  <div className="text-[10px] text-[#7B8DA8]">{dict.bottomBarAlertsDesc}</div>
                </div>
              </button>
            </div>

            {/* 3.3 PWA Install App Section */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#14233C] to-[#0E1A2C] border border-[#2DD4BF]/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-[#2DD4BF]" />
                  <span className="font-bold text-white text-xs">{dict.pwaTitle}</span>
                </div>
                <span className="text-[10px] bg-[#2DD4BF]/20 text-[#2DD4BF] font-mono font-bold px-1.5 py-0.5 rounded">
                  PWA
                </span>
              </div>
              <p className="text-[11px] text-[#A3B4D0] leading-relaxed">
                {dict.pwaDesc}
              </p>

              {deferredPrompt ? (
                <button
                  onClick={() => {
                    if (onInstallApp) onInstallApp();
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full py-2.5 rounded-lg bg-[#2DD4BF] hover:bg-[#26bba8] text-[#042F2E] font-extrabold text-xs flex items-center justify-center gap-2 shadow-md active:scale-98 cursor-pointer focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
                >
                  <Download className="w-4 h-4" />
                  <span>{dict.pwaInstallBtn}</span>
                </button>
              ) : isIos ? (
                <div className="p-2 rounded-lg bg-[#0A1220] border border-[#1E2E4A] text-[10px] text-amber-300 flex items-center gap-2">
                  <Share className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    {dict.pwaIosHint}
                  </span>
                </div>
              ) : (
                <div className="text-[10px] text-[#7B8DA8] text-center pt-1 font-mono">
                  {dict.pwaInstalled}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BottomTabBar;
