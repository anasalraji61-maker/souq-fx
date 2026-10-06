import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, BarChart2, ListFilter, Layers, GraduationCap, Bell, Check } from 'lucide-react';

interface OnboardingOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const handleClose = () => {
    try {
      localStorage.setItem('matrix_onboarding_seen', 'true');
    } catch {}
    onClose();
  };

  // 1.5: 5 steps highlighting chart, watchlist, indicators, academy, alerts. Skip / next / back.
  const steps = [
    {
      title: 'شارت التحليل الفني الاحترافي (Chart)',
      desc: 'استمتع بشارت شموع يابانية فائق الاستجابة مع دعم 6 أنواع مختلفة من الشارتات (شموع، مفرغة، هيكين آشي، بارات، خط، مساحة) وفريمات متعددة من 1m إلى 1D.',
      icon: <BarChart2 className="w-8 h-8 text-[#2DD4BF]" />,
    },
    {
      title: 'قائمة مراقبة الأسعار (Watchlist)',
      desc: 'تابع أسعار أزواج الفوركس، الذهب، الفضة، النفط والمؤشرات العالمية مع حساب دقيق للفارق السعري (Spread) ومنحنى بياني مصغر وإعادة ترتيب بالسحب.',
      icon: <ListFilter className="w-8 h-8 text-[#38BDF8]" />,
    },
    {
      title: 'المؤشرات الفنية وأدوات الرسم (Indicators)',
      desc: 'أكثر من 15 مؤشراً فنياً من المتوسطات EMA وSMA وبولينجر باندز إلى RSI والماكد وVWAP، بالإضافة إلى حزمة أدوات رسم متكاملة وتصحيحات فيبوناتشي.',
      icon: <Layers className="w-8 h-8 text-[#A78BFA]" />,
    },
    {
      title: 'أكاديمية MATRIX للتداول والشهادات (Academy)',
      desc: 'مسارات تعليمية متكاملة لمدارس التحليل الفني (الكلاسيكي، كتل الأوامر والسيولة SMC، موجات إليوت) مع اختبارات فهم وشهادات إتمام معتمدة قابلة للطباعة.',
      icon: <GraduationCap className="w-8 h-8 text-[#E8B86D]" />,
    },
    {
      title: 'تنبيهات الأسعار اللحظية (Alerts)',
      desc: 'عيّن تنبيهات فورية عند وصول السعر إلى مستويات محددة أو اختراقها للأعلى أو للأسفل مع إشعارات مرئية وصوتية مسموعة لحماية فرصك الاستثمارية.',
      icon: <Bell className="w-8 h-8 text-[#EF4444]" />,
    },
  ];

  const current = steps[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-xs select-none">
      <div className="w-full max-w-[460px] bg-[#121A2B] border border-[#243049] rounded-2xl shadow-2xl overflow-hidden p-5 sm:p-6 space-y-6 text-xs text-right">
        {/* Header with Step Counter & Skip */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#7B8DA8]">
            <span>الخطوة {step + 1}</span>
            <span>/</span>
            <span>{steps.length}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleClose}
              className="text-[11px] text-[#7B8DA8] hover:text-[#2DD4BF] transition-colors px-2 py-1.5 min-h-[44px] flex items-center cursor-pointer font-semibold"
            >
              تخطي الجولة
            </button>
            <button
              onClick={handleClose}
              aria-label="إغلاق"
              className="p-2 rounded-lg text-[#7B8DA8] hover:text-[#E8EEF9] hover:bg-[#1C2740] min-w-[44px] min-h-[44px] flex items-center justify-center cursor-pointer"
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
            className="px-3 py-1.5 rounded-lg text-[#A3B4D0] hover:text-[#E8EEF9] disabled:opacity-30 disabled:pointer-events-none flex items-center gap-1"
          >
            <ChevronRight className="w-4 h-4" />
            <span>السابق</span>
          </button>

          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="px-5 py-2.5 rounded-xl bg-[#2DD4BF] hover:bg-[#26bba8] text-[#042F2E] font-bold flex items-center gap-1 shadow-md cursor-pointer min-h-[44px]"
            >
              <span>التالي</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleClose}
              className="px-5 py-2.5 rounded-xl bg-[#22C55E] hover:bg-[#1eb354] text-[#051329] font-bold flex items-center gap-1 shadow-md cursor-pointer min-h-[44px]"
            >
              <Check className="w-4 h-4" />
              <span>بدء استخدام المنصة</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
