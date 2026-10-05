import React, { useState } from 'react';
import {
  Check,
  ShieldCheck,
  Zap,
  Sparkles,
  Award,
  Layers,
  Bot,
  AlertTriangle,
  ArrowRight,
  CreditCard,
  Building2,
  Clock,
} from 'lucide-react';
import { IraqiPaymentModal } from './IraqiPaymentModal';

export const SubscriptionPlansScreen: React.FC = () => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [selectedCheckoutPlan, setSelectedCheckoutPlan] = useState<{ name: string; price: number }>({
    name: 'باقة المحترف (Pro Trader)',
    price: 29,
  });

  const handleOpenCheckout = (name: string, price: number) => {
    setSelectedCheckoutPlan({ name, price });
    setIsPaymentModalOpen(true);
  };

  return (
    <div className="h-full overflow-y-auto bg-[#070E1A] text-[#E2E8F0] p-6 lg:p-10 select-none">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2DD4BF]/10 border border-[#2DD4BF]/30 text-[#2DD4BF] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>باقات خدمة التحليل الفني والأدوات المتقدمة (عرض فقط)</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white">
            باقات الاشتراك والأدوات المتقدمة
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
              className="w-12 h-6 bg-[#16233B] rounded-full p-1 border border-[#243657] transition-all relative cursor-pointer"
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

        {/* Iraqi Payment Solutions Highlight Banner */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#0C1A30] via-[#0E2242] to-[#0A162B] border border-[#243B60] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2DD4BF]/10 border border-[#2DD4BF]/30 flex items-center justify-center text-[#2DD4BF] shrink-0">
              <span className="text-base font-bold">🇮🇶</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">بوابات الدفع المحلية في العراق</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                  قريباً
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] mt-0.5">
                تكامل مستقبلي مع: <strong>زين كاش (ZainCash)</strong>، <strong>كي كارد (Qi Card)</strong>، <strong>مصرف العراق الأول (FIB)</strong>، و<strong>فاست بي (FastPay)</strong>.
              </p>
            </div>
          </div>
          <button
            onClick={() => handleOpenCheckout('باقة المحترف (Pro Trader)', billingCycle === 'annual' ? 29 : 39)}
            className="px-4 py-2 bg-[#172A47] hover:bg-[#20375D] border border-[#2DD4BF]/40 text-[#2DD4BF] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <span>تفاصيل بوابات الدفع</span>
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          </button>
        </div>

        {/* Legal Disclaimer Box */}
        <div className="p-4 rounded-xl bg-[#0F1B2E] border border-amber-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-[#CBD5E1] space-y-1">
            <strong className="text-amber-400 font-bold block">إخلاء مسؤولية قانوني إلزامي:</strong>
            <p className="leading-relaxed">
              جميع الخدمات والبيانات ومؤشرات المنصة هي لأغراض تعليمية وتحليلية بحتة. نحن لا نقدم أي توصيات استثمارية أو نصائح مالية لشراء أو بيع الأصول. التداول في الأسواق المالية ينطوي على مخاطر مرتفعة، والقرارات المتخذة تقع على مسؤولية المتداول وحده. لا يتم تحصيل أي مبالغ أو بطاقات بنكية حالياً.
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
                <p className="text-xs text-[#64748B] mt-1">استكشاف شارتات الأسعار الحية ومكتبة المؤشرات.</p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black text-white">$0</span>
                <span className="text-xs text-[#64748B]">/ مجاناً دائماً</span>
              </div>

              <div className="border-t border-[#1E293B] pt-4 space-y-2.5 text-xs text-[#CBD5E1]">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>شاشة شارت واحدة رئيسية</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>3 مؤشرات فنية لكل شارت</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>قائمة مراقبة أساسية بـ 10 أزواج</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>دروس الأكاديمية الأساسية</span>
                </div>
              </div>
            </div>

            <button
              disabled
              className="w-full mt-6 py-2.5 rounded-xl text-xs font-bold bg-[#131F33] text-[#2DD4BF] border border-[#2DD4BF]/30 opacity-90 cursor-default"
            >
              الباقة المفعلة حالياً
            </button>
          </div>

          {/* 2. Pro Trader */}
          <div className="rounded-2xl bg-gradient-to-b from-[#10243E] to-[#0A162B] border-2 border-[#2DD4BF] p-6 flex flex-col justify-between shadow-2xl relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#2DD4BF] text-[#042F2E] px-3 py-0.5 rounded-full text-[10px] font-extrabold shadow-md">
              الأكثر طلباً
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs text-[#2DD4BF] font-bold">للمتداول النشط اليومي</span>
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

            {/* 4.1 Payment button shows "قريباً" (coming soon) */}
            <button
              onClick={() => handleOpenCheckout('باقة المحترف (Pro Trader)', billingCycle === 'annual' ? 29 : 39)}
              className="w-full mt-6 py-2.5 rounded-xl text-xs font-extrabold bg-[#2DD4BF] hover:bg-[#14B8A6] text-[#042F2E] transition-all shadow-lg active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>ترقية الاشتراك (قريباً)</span>
            </button>
          </div>

          {/* 3. VIP Institutional */}
          <div className="rounded-2xl bg-[#0B1528] border border-[#1E293B] p-6 flex flex-col justify-between hover:border-[#334155] transition-all">
            <div className="space-y-4">
              <div>
                <span className="text-xs text-amber-400 font-bold">صناديق التحوط والمؤسسات</span>
                <h3 className="text-lg font-bold text-white mt-1">باقة النخبة (VIP Swarm)</h3>
                <p className="text-xs text-[#64748B] mt-1">أدوات الربط والمزامنة والتحليل الفني المؤسسي.</p>
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
                  <span className="font-semibold text-white">أدوات التحليل المؤسسي وإدارة المخاطر</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>محاكي استراتيجيات فني غير محدود</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>تصدير تقارير الأداء ومنحنى رأس المال</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>دعم فني استشاري مخصص</span>
                </div>
              </div>
            </div>

            {/* 4.1 Payment button shows "قريباً" (coming soon) */}
            <button
              onClick={() => handleOpenCheckout('باقة النخبة (VIP Swarm)', billingCycle === 'annual' ? 99 : 129)}
              className="w-full mt-6 py-2.5 rounded-xl text-xs font-bold bg-[#132038] hover:bg-[#1E2E4A] border border-amber-500/40 text-amber-400 transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>الانضمام لباقة VIP (قريباً)</span>
            </button>
          </div>
        </div>

        {/* Iraqi Payment Modal */}
        <IraqiPaymentModal
          isOpen={isPaymentModalOpen}
          onClose={() => setIsPaymentModalOpen(false)}
          planName={selectedCheckoutPlan.name}
          planPriceUsd={selectedCheckoutPlan.price}
          billingCycle={billingCycle}
        />
      </div>
    </div>
  );
};
