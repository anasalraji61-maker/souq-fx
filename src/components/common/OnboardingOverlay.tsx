import React, { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, BarChart2, ListFilter, Layers, GraduationCap, Bell, Check } from 'lucide-react';
import { LangId, DICTS, tl } from '../../i18n/locales';

interface OnboardingOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang?: LangId;
}

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({
  isOpen,
  onClose,
  currentLang = 'ar',
}) => {
  const dict = DICTS[currentLang] || DICTS.ar;
  const [step, setStep] = useState(0);

  const modalRef = React.useRef<HTMLDivElement>(null);
  const previouslyFocusedElementRef = React.useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (isOpen) {
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement;
      setTimeout(() => {
        if (modalRef.current) {
          const firstFocusable = modalRef.current.querySelector<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          firstFocusable?.focus();
        }
      }, 50);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
        return;
      }

      if (e.key === 'Tab' && modalRef.current) {
        const focusables = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleClose = () => {
    try {
      localStorage.setItem('matrix_onboarding_seen', 'true');
    } catch {}
    onClose();
    previouslyFocusedElementRef.current?.focus();
  };

  const steps = [
    {
      title:
        currentLang === 'en-US'
          ? 'Professional Technical Chart'
          : currentLang === 'ku'
          ? 'چارتی شیکاری تەکنیکی پێشکەوتوو'
          : tl().tm2_328,
      desc:
        currentLang === 'en-US'
          ? 'Ultra-responsive candlestick charts with multi-timeframe analysis from 1m to 1D and high-performance indicators.'
          : currentLang === 'ku'
          ? 'چارتی مۆمی ژاپۆنی خێرا لەگەڵ پشتگیری فریمە کاتییەکان لە 1m تا 1D و ئامرازە تەکنیکییەکان.'
          : tl().tm2_329,
      icon: <BarChart2 className="w-8 h-8 text-[#2DD4BF]" />,
    },
    {
      title:
        currentLang === 'en-US'
          ? 'Live Market Watchlist'
          : currentLang === 'ku'
          ? 'لیستی چاودێری نرخەکان'
          : tl().tm2_330,
      desc:
        currentLang === 'en-US'
          ? 'Track Forex pairs, Gold, Silver, Crude Oil, and Global Indices with real-time spread metrics and sparkline charts.'
          : currentLang === 'ku'
          ? 'چاودێری جووتەکانی فۆرێکس، زێڕ، نەوت و پێوەرە جیهانییەکان لەگەڵ جیاوازی نرخی سپڕێد و هێڵی گۆڕانکاری.'
          : tl().tm2_331,
      icon: <ListFilter className="w-8 h-8 text-[#38BDF8]" />,
    },
    {
      title:
        currentLang === 'en-US'
          ? 'Indicators & Drawing Tools'
          : currentLang === 'ku'
          ? 'ئیندیکەیتەرەکان و ئامرازەکانی وێنەکێشان'
          : tl().tm2_332,
      desc:
        currentLang === 'en-US'
          ? 'Over 15 indicators including EMA, Bollinger Bands, RSI, MACD, and VWAP with extensive Fibonacci and trendline tools.'
          : currentLang === 'ku'
          ? 'زیاتر لە 15 ئیندیکەیتەری تەکنیکی (EMA, Bollinger, RSI, MACD) لەگەڵ کۆمەڵەی تەواوی ئامرازەکانی وێنەکێشان.'
          : tl().tm2_333,
      icon: <Layers className="w-8 h-8 text-[#A78BFA]" />,
    },
    {
      title:
        currentLang === 'en-US'
          ? 'MATRIX Academy & Certification'
          : currentLang === 'ku'
          ? 'ئەکادیمیای MATRIX و بڕوانامەکان'
          : tl().tm2_334,
      desc:
        currentLang === 'en-US'
          ? 'Comprehensive learning paths from basics to Smart Money Concepts (SMC) with quizzes and printable certificates.'
          : currentLang === 'ku'
          ? 'خولە فێرکارییە تەواوەکان لە سەرەتاوە تا پارەی زیرەک (SMC) لەگەڵ تاقیکردنەوە و بڕوانامەی شایستەی چاپکردن.'
          : tl().tm2_335,
      icon: <GraduationCap className="w-8 h-8 text-[#E8B86D]" />,
    },
    {
      title:
        currentLang === 'en-US'
          ? 'Real-Time Price Alerts'
          : currentLang === 'ku'
          ? 'ئاگادارییەکانی نرخی ڕاستەوخۆ'
          : tl().tm2_336,
      desc:
        currentLang === 'en-US'
          ? 'Set instant price threshold alerts with visual and audio chimes to never miss key market opportunities.'
          : currentLang === 'ku'
          ? 'ئاگاداری دەستبەجێ دابنێ کاتێک نرخ دەگاتە ئاستە دیاریکراوەکان لەگەڵ دەنگی تایبەت بە ئاگاداری.'
          : tl().tm2_337,
      icon: <Bell className="w-8 h-8 text-[#EF4444]" />,
    },
  ];

  const current = steps[step];
  const isRtl = currentLang === 'ar' || currentLang === 'ku';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs select-none"
    >
      <div
        ref={modalRef}
        className="w-full max-w-[460px] bg-[#121A2B] border border-[#243049] rounded-2xl shadow-2xl overflow-hidden p-5 sm:p-6 space-y-6 text-xs text-right"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Header with Step Counter & Skip */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#7B8DA8]">
            <span>
              {dict.pageOf.replace('{current}', (step + 1).toString()).replace('{total}', steps.length.toString())}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="text-[11px] text-[#7B8DA8] hover:text-[#2DD4BF] transition-colors px-2 py-1.5 min-h-[44px] flex items-center cursor-pointer font-semibold focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden"
            >
              {dict.skipTour}
            </button>
            <button
              onClick={handleClose}
              aria-label={dict.closeModal}
              className="p-2 rounded-lg text-[#7B8DA8] hover:text-[#E8EEF9] hover:bg-[#1C2740] min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Step Content */}
        <div className="flex flex-col items-center text-center space-y-3 pt-2">
          <div className="p-4 rounded-2xl bg-[#162033] border border-[#243049] shadow-inner">
            {current.icon}
          </div>
          <h2 className="text-lg font-bold text-[#E8EEF9]">{current.title}</h2>
          <p className="text-[#A3B4D0] leading-relaxed text-xs max-w-sm">{current.desc}</p>
        </div>

        {/* Dots progress */}
        <div className="flex items-center justify-center gap-1.5 py-1">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-6 bg-[#2DD4BF]' : 'w-1.5 bg-[#243049]'
              }`}
            />
          ))}
        </div>

        {/* Footer Buttons (Back / Next / Finish) */}
        <div className="flex items-center justify-between pt-2 border-t border-[#243049]/60">
          <button
            disabled={step === 0}
            onClick={() => setStep(step - 1)}
            className="px-3 py-1.5 rounded-lg text-[#A3B4D0] hover:text-[#E8EEF9] disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1 cursor-pointer min-h-[44px] focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden"
          >
            {isRtl ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            <span>{dict.prevStep}</span>
          </button>

          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-5 py-2.5 rounded-xl bg-[#2DD4BF] hover:bg-[#26bba8] text-[#042F2E] font-bold flex items-center gap-1 shadow-md cursor-pointer min-h-[44px] focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden"
            >
              <span>{dict.nextStep}</span>
              {isRtl ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          ) : (
            <button
              onClick={handleClose}
              className="px-5 py-2.5 rounded-xl bg-[#22C55E] hover:bg-[#1eb354] text-[#051329] font-bold flex items-center gap-1 shadow-md cursor-pointer min-h-[44px] focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden"
            >
              <Check className="w-4 h-4" />
              <span>{dict.finishTour}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OnboardingOverlay;
