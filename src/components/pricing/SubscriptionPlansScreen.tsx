import React, { useState } from 'react';
import { Check, ShieldCheck, Zap, Sparkles, Star, Award, Layers, Bot, AlertTriangle, ArrowRight } from 'lucide-react';

export const SubscriptionPlansScreen: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [currentPlan, setCurrentPlan] = useState<'free' | 'pro' | 'vip'>('pro');

  return (
    <div className="h-full overflow-y-auto bg-[#070E1A] text-[#E2E8F0] p-6 lg:p-10 select-none">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2DD4BF]/10 border border-[#2DD4BF]/30 text-[#2DD4BF] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>باقات خدمة التحليل الفني والأدوات المتقدمة</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            اختر باقة التداول المناسبة لأسلوبك وتحليلاتك
          </h1>
          <p className="text-sm text-[#94A3B8] max-w-2xl mx-auto">
            نوفر لك بيئة تحليل كمية وفنية فائقة السرعة مدعومة بالذكاء الاصطناعي لمساعدتك على اتخاذ قراراتك المستقلة بثقة.
          </p>

          {/* Billing Cycle Toggle */}
          <div className="flex items-center justify-center gap-3 pt-3">
            <span className={`text-xs ${billingCycle === 'monthly' ? 'text-white font-bold' : 'text-[#64748B]'}`}>
              دفع شهري
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
              className="w-12 h-6 bg-[#16233B] rounded-full p-1 border border-[#243657] transition-all relative"
            >
              <div
                className={`w-4 h-4 rounded-full bg-[#2DD4BF] transition-transform ${
                  billingCycle === 'annual' ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
            <span className={`text-xs ${billingCycle === 'annual' ? 'text-white font-bold' : 'text-[#64748B]'}`}>
              دفع سنوي <span className="text-[#2DD4BF] font-semibold text-[11px]">(وفر 25%)</span>
            </span>
          </div>
        </div>

        {/* Legal Disclaimer Box */}
        <div className="p-4 rounded-xl bg-[#0F1B2E] border border-amber-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-[#CBD5E1] space-y-1">
            <strong className="text-amber-400 font-bold block">إخلاء مسؤولية قانوني إلزامي:</strong>
            <p className="leading-relaxed">
              جميع الخدمات والبيانات ومؤشرات الذكاء الاصطناعي المتوفرة في المنصة هي لأغراض تعليمية وتحليلية بحتة. نحن لا نقدم أي توصيات استثمارية أو نصائح مالية لشراء أو بيع الأصول. التداول في الأسواق المالية ينطوي على مخاطر مرتفعة وقد يؤدي إلى فقدان رأس المال، والقرارات المتخذة تقع على مسؤولية المتداول وحده.
            </p>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* 1. Free Starter */}
          <div className="rounded-2xl bg-[#0B1528] border border-[#1E293B] p-6 flex flex-col justify-between hover:border-[#334155] transition-all">
            <div className="space-y-4">
              <div>
                <span className="text-xs text-[#94A3B8] font-bold">للمبتدئين والفضوليين</span>
                <h3 className="text-lg font-bold text-white mt-1">الباقة الأساسية (Free)</h3>
                <p className="text-xs text-[#64748B] mt-1">تجربة المنصة واستكشاف شارتات الأسعار الحية.</p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">$0</span>
                <span className="text-xs text-[#64748B]">/ مدى الحياة</span>
              </div>

              <div className="border-t border-[#1E293B] pt-4 space-y-2.5 text-xs text-[#CBD5E1]">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>شارت تداول حي (شاشة مفردة)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>3 مؤشرات فنية أساسية (RSI, MA, MACD)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>الوصول لغرف المحادثة العامة</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>دروس المستوى التمهيدي بالأكاديمية</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setCurrentPlan('free')}
              className={`w-full mt-6 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                currentPlan === 'free'
                  ? 'bg-[#1E293B] text-[#94A3B8] border-[#334155]'
                  : 'bg-[#132038] hover:bg-[#1E2E4A] text-white border-[#243657]'
              }`}
            >
              {currentPlan === 'free' ? 'باقتك الحالية' : 'البدء مجاناً'}
            </button>
          </div>

          {/* 2. Pro Trader (Featured) */}
          <div className="rounded-2xl bg-gradient-to-b from-[#0F1E38] to-[#0A1426] border-2 border-[#2DD4BF] p-6 flex flex-col justify-between shadow-[0_0_30px_rgba(45,212,191,0.15)] relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#2DD4BF] text-[#042F2E] px-3 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider">
              الأكثر طلباً واحترافاً
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs text-[#2DD4BF] font-bold">للمتداول اليومي والمحترف</span>
                <h3 className="text-lg font-bold text-white mt-1">باقة المحترف (Pro Trader)</h3>
                <p className="text-xs text-[#94A3B8] mt-1">تحليل فني متعدد الأطر الزمنية مع المساعد الذكي.</p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">
                  {billingCycle === 'annual' ? '$29' : '$39'}
                </span>
                <span className="text-xs text-[#64748B]">/ شهرياً</span>
              </div>

              <div className="border-t border-[#1E293B] pt-4 space-y-2.5 text-xs text-[#CBD5E1]">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span className="font-semibold text-white">شاشات شارتات متعددة (2 إلى 4 في وقت واحد)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>مساعد MATRIX الذكي لتحليل الشموع والدعوم</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>مؤشرات غير محدودة (Ichimoku, Bollinger, SuperTrend)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>تنبيهات أسعار صوتية ولحظية بدون سقف</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>الأكاديمية المتقدمة ومسارات السيولة الذكية (SMC)</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setCurrentPlan('pro')}
              className="w-full mt-6 py-2.5 rounded-xl text-xs font-extrabold bg-[#2DD4BF] hover:bg-[#14B8A6] text-[#042F2E] transition-all shadow-lg active:scale-95 cursor-pointer"
            >
              {currentPlan === 'pro' ? 'باقتك النشطة حالياً ✓' : 'ترقية إلى PRO'}
            </button>
          </div>

          {/* 3. VIP Institutional */}
          <div className="rounded-2xl bg-[#0B1528] border border-[#1E293B] p-6 flex flex-col justify-between hover:border-[#334155] transition-all">
            <div className="space-y-4">
              <div>
                <span className="text-xs text-amber-400 font-bold">صناديق التحوط والمؤسسات</span>
                <h3 className="text-lg font-bold text-white mt-1">باقة النخبة (VIP Swarm)</h3>
                <p className="text-xs text-[#64748B] mt-1">شبكة الوكلاء السحابيون الـ 8 المستقلون والاتصال بـ MT5.</p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">
                  {billingCycle === 'annual' ? '$99' : '$129'}
                </span>
                <span className="text-xs text-[#64748B]">/ شهرياً</span>
              </div>

              <div className="border-t border-[#1E293B] pt-4 space-y-2.5 text-xs text-[#CBD5E1]">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span className="font-semibold text-white">تشغيل شبكة الوكلاء السحابية 24/7 في الخادم</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>ربط جسر MetaTrader 5 وتنفيذ الصفقات التجريبية</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>المزامنة التلقائية المباشرة مع GitHub</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>غرف نقاش حصرية لكبار المحللين ومديري المحافظ</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>دعم فني هندسي مخصص وسريع</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setCurrentPlan('vip')}
              className="w-full mt-6 py-2.5 rounded-xl text-xs font-bold bg-[#132038] hover:bg-[#1E2E4A] border border-amber-500/40 text-amber-400 transition-all active:scale-95"
            >
              {currentPlan === 'vip' ? 'باقتك الحالية ✓' : 'الانضمام لباقة النخبة VIP'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
