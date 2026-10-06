import React from 'react';
import { BellRing, X, ArrowUpRight, ArrowDownRight, ExternalLink } from 'lucide-react';
import { PriceAlertItem } from '../../types/market';
import { LangId, DICTS } from '../../i18n/locales';

interface PriceAlertNotificationBannerProps {
  alert: PriceAlertItem;
  currentPrice: number;
  onDismiss: () => void;
  onNavigateToChart: (symbol: string) => void;
  currentLang?: LangId;
}

export const PriceAlertNotificationBanner: React.FC<PriceAlertNotificationBannerProps> = ({
  alert,
  currentPrice,
  onDismiss,
  onNavigateToChart,
  currentLang = 'ar',
}) => {
  const dict = DICTS[currentLang] || DICTS.ar;
  const isAbove = alert.condition === 'above';
  const isRtl = currentLang === 'ar' || currentLang === 'ku';

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className="fixed top-14 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg px-4 pointer-events-auto animate-in fade-in slide-in-from-top-4 duration-300"
    >
      <div className="p-4 rounded-xl bg-[#0D1829] border-2 border-[#2DD4BF] shadow-[0_0_30px_rgba(45,212,191,0.35)] flex items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#2DD4BF]/20 border border-[#2DD4BF]/40 text-[#2DD4BF] flex items-center justify-center shrink-0 animate-bounce">
            <BellRing className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-[#2DD4BF] text-[#042F2E] font-extrabold text-[11px]">
                {dict.alertBannerTitle}
              </span>
              <span className="font-extrabold text-sm text-[#E8EEF9] font-mono">{alert.symbol}</span>
              <span className="text-[#A3B4D0] font-mono flex items-center">
                {isAbove ? (
                  <ArrowUpRight className="w-3.5 h-3.5 text-[#22C55E]" />
                ) : (
                  <ArrowDownRight className="w-3.5 h-3.5 text-[#EF4444]" />
                )}
                {isAbove ? '≥' : '≤'} {alert.targetPrice}
              </span>
            </div>
            <p className="text-[#E8EEF9] font-medium mt-1">
              {currentLang === 'en-US'
                ? 'Current price reached '
                : currentLang === 'ku'
                ? 'نرخی ئێستا گەیشتە '
                : 'وصل السعر الحالي إلى '}
              <span className="font-mono font-bold text-[#2DD4BF]">{currentPrice}</span>.
            </p>
            {alert.note && <p className="text-[#7B8DA8] text-[11px] mt-0.5">{alert.note}</p>}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => {
              onNavigateToChart(alert.symbol);
              onDismiss();
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#2DD4BF] hover:bg-[#26bba8] text-[#042F2E] font-bold transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden"
          >
            <span>{dict.goToChart}</span>
            <ExternalLink className="w-3 h-3" />
          </button>
          <button
            onClick={onDismiss}
            aria-label={dict.dismiss}
            title={dict.dismiss}
            className="p-1.5 rounded-lg text-[#7B8DA8] hover:text-[#E8EEF9] hover:bg-[#162033] transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-rose-400 focus-visible:outline-hidden"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
