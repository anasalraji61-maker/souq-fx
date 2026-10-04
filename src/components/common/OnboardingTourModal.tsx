import React, { useState, useEffect } from 'react';
import { Sparkles, TrendingUp, BarChart2, GraduationCap, Bell, ArrowRight, ArrowLeft, Check, X } from 'lucide-react';

interface TourStep {
  title: string;
  description: string;
  icon: React.ReactNode;
  tag: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'مرحباً بك في محطة MATRIX الاحترافية',
    description: 'منصة تحليل فني متقدمة مصممة لأسواق الفوركس، الذهب، المعادن، ومؤشرات الأسهم العالمية مع شارت تفاعلي فائق السرعة.',
    icon: <Sparkles className="w-8 h-8 text-[#2DD4BF]" />,
    tag: 'مقدمة المنصة',
  },
  {
    title: 'شارت التداول وأدوات الرسم الفنية',
    description: 'أكثر من 15 أداة رسم (فيبوناتشي، قنوات سعرية، نماذج السيولة)، حساب مباشر لنسبة العائد للمخاطرة R:R، وشاشات متعددة متزامنة.',
    icon: <TrendingUp className="w-8 h-8 text-[#38BDF8]" />,
    tag: 'مساحة الشارت',
  },
  {
    title: '14 مؤشراً فنياً ومذبذبات سفلية',
    description: 'حسابات دقيقة على الشموع المغلقة تشمل إيشيموكو، بولينجر، VWAP، والماكد، مع إمكانية ضبط وتخصيص المعاملات لحظياً.',
    icon: <BarChart2 className="w-8 h-8 text-[#A78BFA]" />,
    tag: 'المؤشرات الفنية',
  },
  {
    title: 'أكاديمية التدريب والشهادات المعتمدة',
    description: 'مسارات تعليمية شاملة من المبتدئ إلى الاحتراف، مع اختبارات تفاعلية وشهادات إتمام قابلة للطباعة عند إكمال 100%.',
    icon: <GraduationCap className="w-8 h-8 text-[#E8B86D]" />,
    tag: 'الأكاديمية',
  },
  {
    title: 'التنبيهات السعرية الحية وقائمة المراقبة',
    description: 'تنبيهات فورية عند وصول السعر لأهدافك مع إشعارات صوتية ونغمات تنبيهية، وقوائم مراقبة مخصصة برسم بياني مصغر Sparkline.',
    icon: <Bell className="w-8 h-8 text-[#F59E0B]" />,
    tag: 'التنبيهات والمراقبة',
  },
];

export const OnboardingTourModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    try {
      const completed = localStorage.getItem('matrix_onboarding_completed');
      if (!completed) {
        // Show after brief initial delay
        const timer = setTimeout(() => setIsOpen(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  const handleFinish = () => {
    try {
      localStorage.setItem('matrix_onboarding_completed', 'true');
    } catch {}
    setIsOpen(false);
  };

  if (!isOpen) return null;

  const step = TOUR_STEPS[currentStep];
  const isLast = currentStep === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 select-none animate-in fade-in">
      <div className="w-full max-w-md bg-[#0D1524] border border-[#2DD4BF]/40 rounded-2xl shadow-2xl p-6 flex flex-col text-right text-xs">
        {/* Header with step pill and skip */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1E283D] mb-4">
          <button
            onClick={handleFinish}
            className="text-[11px] text-[#7B8DA8] hover:text-white transition-colors"
          >
            تخطي الجولة
          </button>
          <span className="px-2.5 py-0.5 rounded-full bg-[#1C2E4A] text-[#2DD4BF] font-mono text-[10px] font-bold">
            خطوة {currentStep + 1} من {TOUR_STEPS.length}
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
          <h3 className="text-base font-bold text-white mb-2">{step.title}</h3>
          <p className="text-[#A3B4D0] leading-relaxed text-xs max-w-sm">{step.description}</p>
        </div>

        {/* Dots Indicator */}
        <div className="flex items-center justify-center gap-1.5 my-4">
          {TOUR_STEPS.map((_, idx) => (
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#141E30] hover:bg-[#1E2B44] text-[#A3B4D0] hover:text-white transition-colors text-xs font-semibold"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>السابق</span>
            </button>
          ) : (
            <div />
          )}

          {isLast ? (
            <button
              onClick={handleFinish}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-[#2DD4BF] to-[#22C55E] text-[#042F2E] font-bold text-xs shadow-lg hover:brightness-110 active:scale-95 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>ابدأ التداول الآن</span>
            </button>
          ) : (
            <button
              onClick={() => setCurrentStep((prev) => prev + 1)}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#2DD4BF] hover:bg-[#25BFA8] text-[#042F2E] font-bold text-xs transition-colors"
            >
              <span>التالي</span>
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
