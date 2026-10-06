import React, { useState } from 'react';
import {
  Check,
  X,
  Zap,
  Sparkles,
  AlertTriangle,
  Clock,
  Shield,
  Layers,
  BarChart2,
  TrendingUp,
  HelpCircle,
  Bell,
  ArrowRight,
} from 'lucide-react';
import { LaunchNotifyModal } from './LaunchNotifyModal';
import { IraqiPaymentModal } from './IraqiPaymentModal';

interface PlanFeature {
  name: string;
  free: boolean | string;
  basic: boolean | string;
  pro: boolean | string;
  vip: boolean | string;
  category: string;
}

const COMPARISON_FEATURES: PlanFeature[] = [
  {
    name: 'شاشات شارت متزامنة في وقت واحد',
    free: 'شاشة واحدة',
    basic: 'شاشتان متزامنتان',
    pro: 'حتى 4 شاشات',
    vip: 'حتى 4 شاشات',
    category: 'مساحة العمل والشارتات',
  },
  {
    name: 'عدد المؤشرات الفنية لكل شارت',
    free: '3 مؤشرات',
    basic: 'حتى 10 مؤشرات',
    pro: 'غير محدود',
    vip: 'غير محدود',
    category: 'مساحة العمل والشارتات',
  },
  {
    name: 'أدوات التحليل المتقدم (Ichimoku, Bollinger, SuperTrend)',
    free: 'أساسية فقط',
    basic: 'متقدمة',
    pro: 'كافة المؤشرات الفنية',
    vip: 'كافة المؤشرات الفنية',
    category: 'مساحة العمل والشارتات',
  },
  {
    name: 'أدوات الرسم الفني وموجات إليوت وخطوط الاتجاه',
    free: true,
    basic: true,
    pro: true,
    vip: true,
    category: 'التحليل الفني',
  },
  {
    name: 'تنبيهات الأسعار والمساعد الذكي AI',
    free: '3 تنبيهات (أساسي)',
    basic: '20 تنبيهاً لحظياً',
    pro: 'تنبيهات غير محدودة ومساعد متقدم',
    vip: 'حدود أعلى للتنبيهات والمساعد الذكي AI',
    category: 'التنبيهات والمساعد الذكي',
  },
  {
    name: 'قوائم مراقبة مخصصة وترتيب بالسحب',
    free: 'قائمة واحدة (10 أزواج)',
    basic: '3 قوائم (50 زوجاً)',
    pro: 'غير محدودة',
    vip: 'غير محدودة سحابية',
    category: 'التنبيهات والمراقبة',
  },
  {
    name: 'سجل التداول وتحليل الصفقات والأداء',
    free: 'محدود بـ 10 صفقات',
    basic: 'حتى 100 صفقة',
    pro: 'كامل وسحابي',
    vip: 'كامل وسحابي',
    category: 'الأدوات وسجل التداول',
  },
  {
    name: 'التقويم الاقتصادي وأخبار السوق اللحظية',
    free: true,
    basic: true,
    pro: true,
    vip: true,
    category: 'الأدوات وسجل التداول',
  },
  {
    name: 'الوصول المبكر للميزات والأدوات الجديدة',
    free: false,
    basic: false,
    pro: false,
    vip: true,
    category: 'التطوير والتحديثات',
  },
  {
    name: 'أكاديمية التحليل الفني والمسارات التعليمية',
    free: 'الدروس التأسيسية',
    basic: 'كافة المسارات',
    pro: 'كافة المسارات + دروس متقدمة',
    vip: 'كافة المسارات + دروس متقدمة',
    category: 'الأكاديمية والتعليم',
  },
  {
    name: 'سرعة تدفق الأسعار والبيانات الحية',
    free: 'تحديث قياسي',
    basic: 'تحديث سريع',
    pro: 'فائق السرعة (لحظي)',
    vip: 'فائق السرعة بأولوية قصوى',
    category: 'الأداء والبيانات',
  },
  {
    name: 'الدعم الفني والخدمة',
    free: 'دعم مجتمعي',
    basic: 'دعم قياسي سريع',
    pro: 'أولوية في الدعم',
    vip: 'دعم ذو أولوية عبر البريد الإلكتروني',
    category: 'الدعم والخدمات',
  },
];

// Existing Iraqi Dinar Exchange Rate logic: 1 USD = 1,520 IQD
const USD_TO_IQD_RATE = 1520;
const formatIqdPrice = (usd: number) => {
  if (usd === 0) return '0 د.ع (مجاناً)';
  const iqd = Math.round(usd * USD_TO_IQD_RATE);
  return `≈ ${new Intl.NumberFormat('ar-IQ').format(iqd)} دينار عراقي`;
};

export const SubscriptionPlansScreen: React.FC = () => {
  const [selectedPlanForNotify, setSelectedPlanForNotify] = useState<{
    name: string;
    price: string;
    period: string;
    usd: number;
  } | null>(null);
  const [isIraqiModalOpen, setIsIraqiModalOpen] = useState(false);

  const handleOpenNotify = (name: string, price: string, period: string, usd: number) => {
    setSelectedPlanForNotify({ name, price, period, usd });
  };

  const renderFeatureValue = (val: boolean | string) => {
    if (typeof val === 'boolean') {
      return val ? (
        <Check className="w-4 h-4 text-[#2DD4BF] mx-auto" />
      ) : (
        <X className="w-4 h-4 text-[#64748B] mx-auto" />
      );
    }
    return <span className="font-semibold text-xs text-[#E8EEF9]">{val}</span>;
  };

  return (
    <div className="h-full overflow-y-auto bg-[#070D18] text-[#E8EEF9] p-4 sm:p-6 lg:p-10 select-none pb-28 md:pb-12">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3 pt-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2DD4BF]/10 border border-[#2DD4BF]/30 text-[#2DD4BF] text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>باقات خدمة التحليل الفني والأدوات المتقدمة (عرض شهري فقط)</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
            اختر الباقة المناسبة لرحلتك في التحليل الفني
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] max-w-2xl mx-auto leading-relaxed">
            بيئة احترافية متكاملة لتحليل أزواج العملات والمعادن والسلع، مدعومة بمؤشرات متقدمة وأدوات إدارة المخاطر.
          </p>
        </div>

        {/* Legal Disclaimer Box */}
        <div className="p-4 rounded-xl bg-[#0B1528] border border-amber-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-[#CBD5E1] space-y-1">
            <strong className="text-amber-400 font-bold block">إخلاء مسؤولية قانوني إلزامي:</strong>
            <p className="leading-relaxed text-[#94A3B8]">
              جميع الخدمات والبيانات ومؤشرات المنصة هي لأغراض تعليمية وتحليلية بحتة وليست نصيحة استثمارية أو توصية مالية. التداول في الأسواق المالية ينطوي على مخاطر مرتفعة. لا يتم تحصيل أي مبالغ أو استقطاعات بنكية حالياً، والاشتراكات ستفتح رسمياً قريباً.
            </p>
          </div>
        </div>

        {/* 4 Monthly Plans Grid (Free $0, Basic $10, Pro $15 [Most Popular], VIP $20) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-stretch">
          {/* Plan 1: Free ($0) */}
          <div className="rounded-2xl bg-[#0B1220] border border-[#1E283D] p-5 flex flex-col justify-between hover:border-[#2E3F5F] transition-all">
            <div className="space-y-4">
              <div>
                <span className="text-xs text-[#94A3B8] font-bold block mb-1">للمبتدئين والفضوليين</span>
                <h3 className="text-xl font-bold text-white">الباقة المجانية</h3>
                <p className="text-xs text-[#7B8DA8] mt-1 leading-relaxed">
                  استكشاف شارتات الأسعار الحية ومكتبة المؤشرات الفنية الأساسية.
                </p>
              </div>

              <div className="pt-2 pb-1 border-y border-[#16233B]">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-white">$0</span>
                  <span className="text-xs text-[#7B8DA8]">/ شهرياً</span>
                </div>
                <div className="mt-1 text-xs font-bold text-emerald-400 font-mono">
                  {formatIqdPrice(0)}
                </div>
                <span className="text-[11px] text-[#64748B] block mt-0.5">بدون بطاقة ائتمان</span>
              </div>

              <div className="space-y-2.5 text-xs text-[#CBD5E1]">
                <div className="text-[11px] font-bold text-[#7B8DA8] pb-1 border-b border-[#1A263C]">
                  الميزات الأساسية المتوفرة:
                </div>
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
                  <span>قائمة مراقبة بـ 10 أزواج</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>3 تنبيهات أسعار نشطة</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>التقويم الاقتصادي والدروس التأسيسية</span>
                </div>
              </div>
            </div>

            <button
              disabled
              className="w-full mt-6 py-3 rounded-xl text-xs font-bold bg-[#131F33] text-[#2DD4BF] border border-[#2DD4BF]/30 opacity-90 cursor-default text-center min-h-[44px]"
            >
              باقتك الحالية المفعلة
            </button>
          </div>

          {/* Plan 2: Basic ($10 / Month) */}
          <div className="rounded-2xl bg-[#0B1220] border border-[#1E2E4A] p-5 flex flex-col justify-between hover:border-[#2DD4BF]/50 transition-all">
            <div className="space-y-4">
              <div>
                <span className="text-xs text-[#38BDF8] font-bold block mb-1">للمتداول الصاعد</span>
                <h3 className="text-xl font-bold text-white">الباقة الأساسية</h3>
                <p className="text-xs text-[#7B8DA8] mt-1 leading-relaxed">
                  مساحة عمل موسعة مع شاشتين متزامنتين وتنبيهات أوسع.
                </p>
              </div>

              <div className="pt-2 pb-1 border-y border-[#16233B]">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-white">$10</span>
                  <span className="text-xs text-[#7B8DA8]">/ شهرياً</span>
                </div>
                <div className="mt-1 text-xs font-bold text-emerald-400 font-mono">
                  {formatIqdPrice(10)}
                </div>
                <span className="text-[11px] text-[#64748B] block mt-0.5">تجديد شهري مرن</span>
              </div>

              <div className="space-y-2.5 text-xs text-[#CBD5E1]">
                <div className="p-2 rounded-lg bg-[#111F36] border border-[#1E3355] text-[11px] font-bold text-[#38BDF8] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>تشمل جميع ميزات الباقة المجانية، بالإضافة إلى:</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span className="font-semibold text-white">شاشتان متزامنتان في وقت واحد</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>حتى 10 مؤشرات فنية لكل شارت</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>3 قوائم مراقبة (حتى 50 زوجاً)</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>20 تنبيهاً لحظياً للأسعار</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>وصول كامل لكافة مسارات الأكاديمية</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleOpenNotify('الباقة الأساسية', '$10', 'شهرياً', 10)}
              className="w-full mt-6 py-3 rounded-xl text-xs font-bold bg-[#14233C] hover:bg-[#1C3256] text-[#2DD4BF] border border-[#2DD4BF]/40 transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>أبلغني عند الإطلاق ($10/شهر)</span>
            </button>
          </div>

          {/* Plan 3: Pro ($15 / Month) - Highlighted Most Popular */}
          <div className="rounded-2xl bg-gradient-to-b from-[#0F233D] to-[#0A162B] border-2 border-[#2DD4BF] p-5 flex flex-col justify-between shadow-2xl relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#2DD4BF] text-[#042F2E] px-3.5 py-0.5 rounded-full text-[10px] font-black shadow-md uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 fill-current" />
              <span>الأكثر طلباً</span>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs text-[#2DD4BF] font-bold block mb-1">للمتداول اليومي المحترف</span>
                <h3 className="text-xl font-bold text-white">باقة المحترف (Pro)</h3>
                <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">
                  تحليل فني متقدم وشاشات متعددة مع كامل المؤشرات وسجل التداول.
                </p>
              </div>

              <div className="pt-2 pb-1 border-y border-[#1E3558]">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-white">$15</span>
                  <span className="text-xs text-[#94A3B8]">/ شهرياً</span>
                </div>
                <div className="mt-1 text-xs font-bold text-emerald-400 font-mono">
                  {formatIqdPrice(15)}
                </div>
                <span className="text-[11px] text-[#2DD4BF] font-semibold block mt-0.5">
                  الخيار الأمثل للمتداولين النشطين
                </span>
              </div>

              <div className="space-y-2.5 text-xs text-[#CBD5E1]">
                <div className="p-2 rounded-lg bg-[#142B49] border border-[#2DD4BF]/30 text-[11px] font-bold text-[#2DD4BF] flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 shrink-0" />
                  <span>تشمل جميع ميزات الباقة الأساسية، بالإضافة إلى:</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span className="font-semibold text-white">حتى 4 شاشات شارت متزامنة</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>مؤشرات فنية غير محدودة وأدوات متقدمة</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>تنبيهات صوتية ولحظية غير محدودة</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>سجل التداول السحابي الكامل وتحليل الأداء</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>مزامنة كاملة بين أجهزتك (القوائم والتخطيطات والرسومات)</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleOpenNotify('باقة المحترف (Pro)', '$15', 'شهرياً', 15)}
              className="w-full mt-6 py-3 rounded-xl text-xs font-black bg-[#2DD4BF] hover:bg-[#14B8A6] text-[#042F2E] transition-all shadow-lg active:scale-98 cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              <Bell className="w-4 h-4" />
              <span>أبلغني عند الإطلاق ($15/شهر)</span>
            </button>
          </div>

          {/* Plan 4: VIP ($20 / Month) */}
          <div className="rounded-2xl bg-[#091527] border border-[#264268] p-5 flex flex-col justify-between hover:border-[#38BDF8]/60 transition-all">
            <div className="space-y-4">
              <div>
                <span className="text-xs text-amber-400 font-bold block mb-1">لكبار المتداولين والمؤسسات</span>
                <h3 className="text-xl font-bold text-white">باقة النخبة (VIP)</h3>
                <p className="text-xs text-[#7B8DA8] mt-1 leading-relaxed">
                  كل ما في باقة المحترف مع حدود أعلى للتنبيهات والذكاء الاصطناعي ودعم بريدي ذو أولوية.
                </p>
              </div>

              <div className="pt-2 pb-1 border-y border-[#162947]">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-white">$20</span>
                  <span className="text-xs text-[#7B8DA8]">/ شهرياً</span>
                </div>
                <div className="mt-1 text-xs font-bold text-emerald-400 font-mono">
                  {formatIqdPrice(20)}
                </div>
                <span className="text-[11px] text-[#64748B] block mt-0.5">حدود أعلى وأولوية دعم متقدمة</span>
              </div>

              <div className="space-y-2.5 text-xs text-[#CBD5E1]">
                <div className="p-2 rounded-lg bg-[#112440] border border-[#2C5282] text-[11px] font-bold text-[#38BDF8] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>تشمل جميع ميزات باقة المحترف (Pro)، بالإضافة إلى:</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span className="font-semibold text-white">كل ما في باقة المحترف كاملة</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span className="font-semibold text-white">حدود أعلى للتنبيهات والمساعد الذكي AI</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>دعم ذو أولوية عبر البريد الإلكتروني</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>وصول مبكر للميزات والأدوات الجديدة</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleOpenNotify('باقة النخبة (VIP)', '$20', 'شهرياً', 20)}
              className="w-full mt-6 py-3 rounded-xl text-xs font-bold bg-[#132A4A] hover:bg-[#1B3B66] text-[#38BDF8] border border-[#38BDF8]/40 transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>أبلغني عند الإطلاق ($20/شهر)</span>
            </button>
          </div>
        </div>

        {/* Iraqi & Local Payment Methods Info Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#0C1A30] via-[#0E2242] to-[#0A162B] border border-[#243B60] flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#2DD4BF]/10 border border-[#2DD4BF]/30 flex items-center justify-center text-[#2DD4BF] shrink-0 text-lg">
              🇮🇶
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">بوابات الدفع المحلية في العراق والشرق الأوسط</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                  تكامل مرتقب
                </span>
                <span className="text-[10px] text-[#7B8DA8] font-mono">
                  (سعر الصرف التقديري: 1$ = 1,520 د.ع)
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] mt-0.5 leading-relaxed">
                يجري تجهيز الربط مع وسائل الدفع المحلية: <strong>زين كاش (ZainCash)</strong>، <strong>كي كارد (Qi Card)</strong>، <strong>مصرف العراق الأول (FIB)</strong>، و<strong>فاست بي (FastPay)</strong>.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsIraqiModalOpen(true)}
            className="px-4 py-2.5 bg-[#172A47] hover:bg-[#20375D] border border-[#2DD4BF]/40 text-[#2DD4BF] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer min-h-[44px]"
          >
            <span>استعراض طرق الدفع المحلية</span>
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          </button>
        </div>

        {/* 1.2 Feature Comparison Table */}
        <div className="space-y-4 pt-4">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-white">جدول المقارنة التفصيلي للميزات</h2>
            <p className="text-xs text-[#7B8DA8]">قارن بين الباقات لاختيار المستوى الذي يناسب متطلبات تحليلك الفني</p>
          </div>

          {/* Desktop Table View (Hidden on phones) */}
          <div className="hidden md:block rounded-2xl bg-[#0B1220] border border-[#1E283D] overflow-hidden shadow-xl">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-[#0A101D] border-b border-[#1E283D] text-[#7B8DA8]">
                  <th className="py-4 px-5 font-bold text-white w-2/6">الميزة / الخدمة</th>
                  <th className="py-4 px-3 font-bold text-center w-1/6">
                    <div>المجانية ($0)</div>
                    <div className="text-[10px] font-mono font-normal text-emerald-400 mt-0.5">0 د.ع</div>
                  </th>
                  <th className="py-4 px-3 font-bold text-center w-1/6 text-[#38BDF8]">
                    <div>الأساسية ($10)</div>
                    <div className="text-[10px] font-mono font-normal text-emerald-400 mt-0.5">≈ 15,200 د.ع</div>
                  </th>
                  <th className="py-4 px-3 font-bold text-center w-1/6 text-[#2DD4BF] bg-[#2DD4BF]/5">
                    <div className="inline-flex items-center gap-1">
                      <span>المحترف ($15)</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-[#2DD4BF] text-[#042F2E] font-black">الأكثر طلباً</span>
                    </div>
                    <div className="text-[10px] font-mono font-normal text-emerald-400 mt-0.5">≈ 22,800 د.ع</div>
                  </th>
                  <th className="py-4 px-3 font-bold text-center w-1/6 text-[#38BDF8]">
                    <div>النخبة ($20)</div>
                    <div className="text-[10px] font-mono font-normal text-emerald-400 mt-0.5">≈ 30,400 د.ع</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#162238]">
                {COMPARISON_FEATURES.map((feat, idx) => (
                  <tr key={idx} className="hover:bg-[#0E1728] transition-colors">
                    <td className="py-3.5 px-5 font-medium text-[#CBD5E1]">
                      <span>{feat.name}</span>
                      <span className="text-[10px] text-[#64748B] block">{feat.category}</span>
                    </td>
                    <td className="py-3.5 px-3 text-center">{renderFeatureValue(feat.free)}</td>
                    <td className="py-3.5 px-3 text-center font-medium">{renderFeatureValue(feat.basic)}</td>
                    <td className="py-3.5 px-3 text-center font-medium bg-[#2DD4BF]/5">
                      {renderFeatureValue(feat.pro)}
                    </td>
                    <td className="py-3.5 px-3 text-center font-medium">{renderFeatureValue(feat.vip)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Cards View (Phone < 768px strictly) */}
          <div className="md:hidden space-y-4">
            {/* Free Card */}
            <div className="rounded-xl bg-[#0B1220] border border-[#1E283D] p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#1E283D]">
                <div>
                  <h4 className="font-bold text-white text-sm">الباقة المجانية ($0 / شهرياً)</h4>
                  <span className="text-[10px] text-emerald-400 font-mono block">0 دينار عراقي (مجاناً)</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded bg-[#16233B] text-[#7B8DA8]">الحالية</span>
              </div>
              <div className="space-y-2 text-xs">
                {COMPARISON_FEATURES.map((feat, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1 border-b border-[#121E31]/50">
                    <span className="text-[#94A3B8]">{feat.name}</span>
                    <span className="font-semibold text-white">{renderFeatureValue(feat.free)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Basic Card ($10) */}
            <div className="rounded-xl bg-[#0B1220] border border-[#1E2E4A] p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#1E283D] gap-2">
                <div>
                  <h4 className="font-bold text-[#38BDF8] text-sm">الباقة الأساسية ($10 / شهرياً)</h4>
                  <span className="text-[10px] text-emerald-400 font-mono block">{formatIqdPrice(10)}</span>
                </div>
                <button
                  onClick={() => handleOpenNotify('الباقة الأساسية', '$10', 'شهرياً', 10)}
                  className="text-xs px-3.5 py-2.5 rounded-xl bg-[#14233C] hover:bg-[#1E3256] text-[#2DD4BF] border border-[#2DD4BF]/40 font-bold min-h-[44px] inline-flex items-center justify-center cursor-pointer transition-colors shrink-0"
                >
                  أبلغني عند الإطلاق
                </button>
              </div>
              <div className="text-[11px] font-bold text-[#38BDF8] p-2 bg-[#101C31] rounded-lg">
                تشمل ميزات المجانية + شاشتين و20 تنبيهاً و10 مؤشرات
              </div>
              <div className="space-y-2 text-xs">
                {COMPARISON_FEATURES.map((feat, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1.5 border-b border-[#121E31]/50">
                    <span className="text-[#94A3B8] text-[11px]">{feat.name}</span>
                    <span className="font-semibold text-[#38BDF8] shrink-0 mr-2">{renderFeatureValue(feat.basic)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Pro Card ($15) - Highlighted Most Popular */}
            <div className="rounded-xl bg-[#0E1A2F] border-2 border-[#2DD4BF] p-4 space-y-3 relative">
              <div className="flex items-center justify-between pb-2 border-b border-[#1E283D] gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-black text-white text-sm">باقة المحترف (Pro)</h4>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#2DD4BF] text-[#042F2E] font-black">الأكثر طلباً</span>
                  </div>
                  <span className="text-[11px] text-[#2DD4BF] font-mono font-bold">$15 / شهرياً</span>
                  <span className="text-[10px] text-emerald-400 font-mono block">{formatIqdPrice(15)}</span>
                </div>
                <button
                  onClick={() => handleOpenNotify('باقة المحترف (Pro)', '$15', 'شهرياً', 15)}
                  className="text-xs px-3.5 py-2.5 rounded-xl bg-[#2DD4BF] hover:bg-[#14B8A6] text-[#042F2E] font-black shadow-md min-h-[44px] inline-flex items-center justify-center cursor-pointer transition-colors shrink-0"
                >
                  أبلغني عند الإطلاق
                </button>
              </div>
              <div className="text-[11px] font-bold text-[#2DD4BF] p-2 bg-[#122842] rounded-lg">
                تشمل ميزات الأساسية + 4 شاشات ومؤشرات وسجل غير محدود
              </div>
              <div className="space-y-2 text-xs">
                {COMPARISON_FEATURES.map((feat, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1.5 border-b border-[#1A2840]">
                    <span className="text-[#94A3B8] text-[11px]">{feat.name}</span>
                    <span className="font-semibold text-white shrink-0 mr-2">{renderFeatureValue(feat.pro)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* VIP Card ($20) */}
            <div className="rounded-xl bg-[#091527] border border-[#264268] p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#1E283D] gap-2">
                <div>
                  <h4 className="font-bold text-[#38BDF8] text-sm">باقة النخبة (VIP)</h4>
                  <span className="text-[11px] text-[#38BDF8] font-mono font-bold">$20 / شهرياً</span>
                  <span className="text-[10px] text-emerald-400 font-mono block">{formatIqdPrice(20)}</span>
                </div>
                <button
                  onClick={() => handleOpenNotify('باقة النخبة (VIP)', '$20', 'شهرياً', 20)}
                  className="text-xs px-3.5 py-2.5 rounded-xl bg-[#132A4A] hover:bg-[#1B3B66] text-[#38BDF8] border border-[#38BDF8]/40 font-bold min-h-[44px] inline-flex items-center justify-center cursor-pointer transition-colors shrink-0"
                >
                  أبلغني عند الإطلاق
                </button>
              </div>
              <div className="text-[11px] font-bold text-[#38BDF8] p-2 bg-[#10213A] rounded-lg">
                تشمل كل ما في Pro (حتى 4 شاشات) + حدود أعلى للتنبيهات والـ AI + دعم أولوية عبر البريد الإلكتروني + وصول مبكر
              </div>
              <div className="space-y-2 text-xs">
                {COMPARISON_FEATURES.map((feat, idx) => (
                  <div key={idx} className="flex items-center justify-between py-1.5 border-b border-[#162744]">
                    <span className="text-[#94A3B8] text-[11px]">{feat.name}</span>
                    <span className="font-semibold text-[#38BDF8] shrink-0 mr-2">{renderFeatureValue(feat.vip)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Launch Notify Modal */}
        {selectedPlanForNotify && (
          <LaunchNotifyModal
            isOpen={!!selectedPlanForNotify}
            onClose={() => setSelectedPlanForNotify(null)}
            planName={selectedPlanForNotify.name}
            planPrice={selectedPlanForNotify.price}
            planPeriod={selectedPlanForNotify.period}
            planPriceUsd={selectedPlanForNotify.usd}
          />
        )}

        {/* Iraqi Payment Solutions Modal */}
        <IraqiPaymentModal
          isOpen={isIraqiModalOpen}
          onClose={() => setIsIraqiModalOpen(false)}
          planName="باقة المحترف (Pro)"
          planPriceUsd={15}
          billingCycle="monthly"
        />
      </div>
    </div>
  );
};

export default SubscriptionPlansScreen;
