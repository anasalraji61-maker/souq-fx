import React, { useState } from 'react';
import { AppTab } from './Header';
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
}) => {
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [showIosPrompt, setShowIosPrompt] = useState(false);

  const isIos =
    typeof navigator !== 'undefined' &&
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as any).MSStream;

  const handleMoreItemClick = (action: () => void) => {
    action();
    setIsMoreMenuOpen(false);
  };

  return (
    <>
      {/* 1.1 Mobile Bottom Tab Bar (visible strictly on < 768px screens) */}
      <nav
        aria-label="التنقل الرئيسي للهاتف"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0A1222]/95 backdrop-blur-lg border-t border-[#1E293B] flex items-center justify-around px-1 py-1.5 pb-[calc(0.375rem+env(safe-area-inset-bottom,0px))] select-none shadow-2xl"
      >
        {/* Tab 1: الشارت */}
        <button
          onClick={() => {
            onTabChange('home');
            setIsMoreMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all cursor-pointer ${
            currentTab === 'home' && !isWatchlistOpen
              ? 'text-[#2DD4BF] font-bold'
              : 'text-[#8899B5] hover:text-white'
          }`}
        >
          <TrendingUp className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">الشارت</span>
        </button>

        {/* Tab 2: قائمة المراقبة */}
        <button
          onClick={() => {
            onTabChange('watchlist');
            setIsMoreMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all cursor-pointer ${
            currentTab === 'watchlist' || isWatchlistOpen
              ? 'text-[#2DD4BF] font-bold'
              : 'text-[#8899B5] hover:text-white'
          }`}
        >
          <List className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">المراقبة</span>
        </button>

        {/* Tab 3: الأدوات */}
        <button
          onClick={() => {
            onTabChange('tools');
            setIsMoreMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all cursor-pointer ${
            currentTab === 'tools' && !isWatchlistOpen
              ? 'text-[#2DD4BF] font-bold'
              : 'text-[#8899B5] hover:text-white'
          }`}
        >
          <Wrench className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">الأدوات</span>
        </button>

        {/* Tab 4: الأكاديمية */}
        <button
          onClick={() => {
            onTabChange('academy');
            setIsMoreMenuOpen(false);
          }}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all cursor-pointer ${
            currentTab === 'academy' && !isWatchlistOpen
              ? 'text-[#2DD4BF] font-bold'
              : 'text-[#8899B5] hover:text-white'
          }`}
        >
          <GraduationCap className="w-5 h-5 mb-0.5" />
          <span className="text-[10px] leading-tight">الأكاديمية</span>
        </button>

        {/* Tab 5: المزيد (More menu modal) */}
        <button
          onClick={() => setIsMoreMenuOpen(true)}
          className={`flex flex-col items-center justify-center min-w-[56px] min-h-[48px] py-1 px-2 rounded-xl transition-all relative cursor-pointer ${
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
          <span className="text-[10px] leading-tight">المزيد</span>
        </button>
      </nav>

      {/* 1.1 "المزيد" Bottom Sheet / Action Modal */}
      {isMoreMenuOpen && (
        <div
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
              <h3 className="font-bold text-sm text-white">المزيد من الخيارات والأقسام</h3>
              <button
                onClick={() => setIsMoreMenuOpen(false)}
                className="p-1 rounded-lg text-[#7B8DA8] hover:text-white cursor-pointer"
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
                  <div className="font-bold text-[#E8EEF9]">المجتمع</div>
                  <div className="text-[10px] text-[#7B8DA8]">نقاشات وتحليلات</div>
                </div>
              </button>

              {/* حسابي والإعدادات */}
              <button
                onClick={() =>
                  handleMoreItemClick(() => {
                    onTabChange('account');
                  })
                }
                className="flex items-center gap-3 p-3.5 rounded-xl bg-[#121E33] border border-[#1E2E4A] text-right hover:border-[#2DD4BF]/50 active:scale-98 transition-all cursor-pointer min-h-[48px]"
              >
                <div className="p-2 rounded-lg bg-sky-500/10 text-sky-400">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#E8EEF9]">حسابي</div>
                  <div className="text-[10px] text-[#7B8DA8]">الملف والتفضيلات</div>
                </div>
              </button>

              {/* باقات الاشتراك */}
              <button
                onClick={() =>
                  handleMoreItemClick(() => {
                    onTabChange('pricing');
                  })
                }
                className="flex items-center gap-3 p-3.5 rounded-xl bg-[#121E33] border border-[#1E2E4A] text-right hover:border-[#2DD4BF]/50 active:scale-98 transition-all cursor-pointer min-h-[48px]"
              >
                <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#E8EEF9]">الباقات</div>
                  <div className="text-[10px] text-[#7B8DA8]">بوابات العراق</div>
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
                className="flex items-center gap-3 p-3.5 rounded-xl bg-[#121E33] border border-[#1E2E4A] text-right hover:border-[#2DD4BF]/50 active:scale-98 transition-all cursor-pointer min-h-[48px]"
              >
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-[#E8EEF9]">سجل الصفقات</div>
                  <div className="text-[10px] text-[#7B8DA8]">اليوميات وتحليل الأداء</div>
                </div>
              </button>

              {/* مركز الإشعارات والتنبيهات */}
              <button
                onClick={() =>
                  handleMoreItemClick(() => {
                    if (onOpenNotifications) onOpenNotifications();
                  })
                }
                className="flex items-center gap-3 p-3.5 rounded-xl bg-[#121E33] border border-[#1E2E4A] text-right hover:border-[#2DD4BF]/50 active:scale-98 transition-all cursor-pointer min-h-[48px] relative"
              >
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400 relative">
                  <Bell className="w-4 h-4" />
                  {activeAlertsCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500" />
                  )}
                </div>
                <div>
                  <div className="font-bold text-[#E8EEF9]">الإشعارات</div>
                  <div className="text-[10px] text-[#7B8DA8]">تنبيهات الأسعار</div>
                </div>
              </button>
            </div>

            {/* 3.3 PWA Install App Section */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#14233C] to-[#0E1A2C] border border-[#2DD4BF]/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-[#2DD4BF]" />
                  <span className="font-bold text-white text-xs">تثبيت تطبيق MATRIX على هاتفك</span>
                </div>
                <span className="text-[10px] bg-[#2DD4BF]/20 text-[#2DD4BF] font-mono font-bold px-1.5 py-0.5 rounded">
                  PWA
                </span>
              </div>
              <p className="text-[11px] text-[#A3B4D0] leading-relaxed">
                تصفح فوري، وصول مباشر من الشاشة الرئيسية، وتشغيل أسرع ومستقر دون متصفح.
              </p>

              {deferredPrompt ? (
                <button
                  onClick={() => {
                    if (onInstallApp) onInstallApp();
                    setIsMoreMenuOpen(false);
                  }}
                  className="w-full py-2.5 rounded-lg bg-[#2DD4BF] hover:bg-[#26bba8] text-[#042F2E] font-extrabold text-xs flex items-center justify-center gap-2 shadow-md active:scale-98 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>تثبيت التطبيق الآن</span>
                </button>
              ) : isIos ? (
                <div className="p-2 rounded-lg bg-[#0A1220] border border-[#1E2E4A] text-[10px] text-amber-300 flex items-center gap-2">
                  <Share className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>
                    للتثبيت على iPhone: اضغط زر المشاركة <strong className="text-white">Share</strong> ثم اختر <strong className="text-white">إضافة إلى الشاشة الرئيسية (Add to Home Screen)</strong>.
                  </span>
                </div>
              ) : (
                <div className="text-[10px] text-[#7B8DA8] text-center pt-1 font-mono">
                  التطبيق مثبت أو مدعوم عبر قائمة المتصفح (⋮ ← تثبيت التطبيق)
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
