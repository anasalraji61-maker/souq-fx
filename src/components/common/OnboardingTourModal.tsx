import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, TrendingUp, BarChart2, GraduationCap, Bell, ArrowRight, ArrowLeft, Check, X } from 'lucide-react';
import { LangId, DICTS } from '../../i18n/locales';

interface TourStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  tag: string;
}

interface OnboardingTourModalProps {
  currentLang?: LangId;
}

export const OnboardingTourModal: React.FC<OnboardingTourModalProps> = ({ currentLang = 'ar' }) => {
  const dict = DICTS[currentLang] || DICTS.ar;
  const isRtl = currentLang === 'ar' || currentLang === 'ku';

  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  const modalRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    try {
      const completed = localStorage.getItem('matrix_onboarding_completed');
      if (!completed) {
        // Show after brief initial delay
        const timer = setTimeout(() => {
          previousFocusRef.current = document.activeElement as HTMLElement;
          setIsOpen(true);
        }, 1200);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  // Keyboard navigation & Focus trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleFinish();
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

  const handleFinish = () => {
    try {
      localStorage.setItem('matrix_onboarding_completed', 'true');
    } catch {}
    setIsOpen(false);
    previousFocusRef.current?.focus();
  };

  const steps: TourStep[] = [
    {
      title: dict.tourTitle1,
      description: dict.tourDesc1,
      icon: <Sparkles className="w-8 h-8 text-[#2DD4BF]" />,
      tag: dict.tourTag1,
    },
    {
      title: dict.tourTitle2,
      description: dict.tourDesc2,
      icon: <TrendingUp className="w-8 h-8 text-[#38BDF8]" />,
      tag: dict.tourTag2,
    },
    {
      title: dict.tourTitle3,
      description: dict.tourDesc3,
      icon: <BarChart2 className="w-8 h-8 text-[#A78BFA]" />,
      tag: dict.tourTag3,
    },
    {
      title: dict.tourTitle4,
      description: dict.tourDesc4,
      icon: <GraduationCap className="w-8 h-8 text-[#E8B86D]" />,
      tag: dict.tourTag4,
    },
    {
      title: dict.tourTitle5,
      description: dict.tourDesc5,
      icon: <Bell className="w-8 h-8 text-[#F59E0B]" />,
      tag: dict.tourTag5,
    },
  ];

  if (!isOpen) return null;

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 select-none animate-in fade-in"
    >
      <div
        ref={modalRef}
        className="w-full max-w-md bg-[#0D1524] border border-[#2DD4BF]/40 rounded-2xl shadow-2xl p-6 flex flex-col text-xs"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Header with step pill and skip */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1E283D] mb-4">
          <button
            onClick={handleFinish}
            aria-label={dict.skipTour}
            className="text-[11px] text-[#7B8DA8] hover:text-white transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden px-2 py-1 rounded"
          >
            {dict.skipTour}
          </button>
          <span className="px-2.5 py-0.5 rounded-full bg-[#1C2E4A] text-[#2DD4BF] font-mono text-[10px] font-bold">
            {dict.tourStepOf.replace('{current}', (currentStep + 1).toString()).replace('{total}', steps.length.toString())}
          </span>
        </div>

        {/* Step Icon & Content */}
        <div className="flex flex-col items-center text-center py-4">
          <div className="w-16 h-16 rounded-2xl bg-[#121E33] border border-[#243049] flex items-center justify-center mb-4 shadow-lg">
            {step.icon}
          </div>
          <span className="text-[10px] font-mono text-[#2DD4BF] uppercase tracking-wider mb-1">
            {step.tag}
          </span>
          <h3 id="tour-modal-title" className="text-base font-bold text-white mb-2">
            {step.title}
          </h3>
          <p className="text-[#A3B4D0] leading-relaxed text-xs max-w-sm">{step.description}</p>
        </div>

        {/* Dots Indicator */}
        <div className="flex items-center justify-center gap-1.5 my-4">
          {steps.map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all ${
                idx === currentStep ? 'w-6 bg-[#2DD4BF]' : 'w-1.5 bg-[#1E283D]'
              }`}
            />
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-3 border-t border-[#1E283D] mt-2">
          {currentStep > 0 ? (
            <button
              onClick={() => setCurrentStep((prev) => prev - 1)}
              aria-label={dict.prevStep}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141E30] hover:bg-[#1E2B44] text-[#A3B4D0] hover:text-white transition-colors text-xs font-semibold cursor-pointer focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden"
            >
              {isRtl ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
              <span>{dict.prevStep}</span>
            </button>
          ) : (
            <div />
          )}

          {isLast ? (
            <button
              onClick={handleFinish}
              aria-label={dict.tourStartTrading}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-[#2DD4BF] to-[#22C55E] text-[#042F2E] font-bold text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-hidden"
            >
              <Check className="w-4 h-4" />
              <span>{dict.tourStartTrading}</span>
            </button>
          ) : (
            <button
              onClick={() => setCurrentStep((prev) => prev + 1)}
              aria-label={dict.nextStep}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#2DD4BF] hover:bg-[#25BFA8] text-[#042F2E] font-bold text-xs transition-colors cursor-pointer focus-visible:ring-2 focus-visible:ring-[#2DD4BF] focus-visible:outline-hidden"
            >
              <span>{dict.nextStep}</span>
              {isRtl ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
