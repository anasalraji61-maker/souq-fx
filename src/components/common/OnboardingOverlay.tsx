import React, { useState } from 'react';
import { X, ChevronLeft, ChevronRight, BarChart2, Calculator, GraduationCap, ShieldCheck, Check } from 'lucide-react';

interface OnboardingOverlayProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OnboardingOverlay: React.FC<OnboardingOverlayProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState(0);

  if (!isOpen) return null;

  const steps = [
    {
      title: 'مرحباً بك في منصة MATRIX للتحليل الفني',
      desc: 'المنصة المتقدمة لتحليل أسواق الفوركس والمعادن والمؤشرات عبر شارتات الشموع الحية متعددة الفريمات وبأعلى سرعة استجابة.',
      icon: <BarChart2 className="w-8 h-8 text-[#2DD4BF]" />,
    },
    {
      title: 'شارت احترافي ومؤشرات فنية دقيقة',
      desc: 'تنقل بين الفريمات من الدقيقة إلى اليومي، وطبق مؤشرات RSI و MACD وبولينجر باندز والمتوسطات المتحركة، واستخدم أدوات الرسم وفيبوناتشي بحرية.',
      icon: <BarChart2 className="w-8 h-8 text-[#38BDF8]" />,
    },
    {
      title: 'حاسبة حجم اللوت وإدارة المخاطر',
      desc: 'لا تخاطر برأس مالك عشوائياً؛ حاسبة اللوت تحسب لك الحجم الدقيق للعقد وفق مسافة وقف الخسارة ونسبة المخاطرة التي تختارها لحمايتك.',
      icon: <Calculator className="w-8 h-8 text-[#22C55E]" />,
    },
    {
      title: 'دفتر الصفقات والماسح والتقويم الاقتصادي',
      desc: 'سجل صفقاتك وراقب نسبة نجاحك، وتابع بيانات التقويم الاقتصادي المؤثرة، وافحص فرص التشبع البيعي والشرائي عبر الماسح الفني المتزامن.',
      icon: <ShieldCheck className="w-8 h-8 text-[#F59E0B]" />,
    },
    {
      title: 'أكاديمية MATRIX للتداول الشامل',
      desc: 'دروس تعليمية مرتبة من الصفر وحتى مدارس السيولة المؤسسية وكتل الأوامر وموجات إليوت، مع قاعات شرح صوتية واختبارات فهم فورية.',
      icon: <GraduationCap className="w-8 h-8 text-[#A78BFA]" />,
    },
  ];

  const current = steps[step];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs select-none">
      <div className="w-[460px] bg-[#121A2B] border border-[#243049] rounded-2xl shadow-2xl overflow-hidden p-6 space-y-6 text-xs text-right">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#7B8DA8]">
            <span>الخطوة {step + 1}</span>
            <span>/</span>
            <span>{steps.length}</span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded text-[#7B8DA8] hover:text-[#E8EEF9] hover:bg-[#1C2740]"
          >
            <X className="w-4 h-4" />
          </button>
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

        {/* Footer Buttons */}
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
              className="px-5 py-2 rounded-lg bg-[#2DD4BF] hover:bg-[#26bba8] text-[#042F2E] font-bold flex items-center gap-1 shadow-md"
            >
              <span>التالي</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={onClose}
              className="px-5 py-2 rounded-lg bg-[#22C55E] hover:bg-[#1eb354] text-[#051329] font-bold flex items-center gap-1 shadow-md"
            >
              <Check className="w-4 h-4" />
              <span>بدء استخدام MATRIX</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
