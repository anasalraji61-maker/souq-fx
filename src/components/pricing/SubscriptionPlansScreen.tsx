import React, { useState, useEffect } from 'react';
import { billingConfig, startCheckout } from '../../api/billing';
import { planIdFrom } from '../../api/waitlist';
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
import { tl, fmt, getActiveLang } from '../../i18n/locales';

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
    name: tl().tm2_0,
    free: tl().tm2_1,
    basic: tl().tm2_2,
    pro: tl().tm2_3,
    vip: tl().tm2_3,
    category: tl().tm2_4,
  },
  {
    name: tl().tm2_5,
    free: tl().tm2_6,
    basic: tl().tm2_7,
    pro: tl().tm2_8,
    vip: tl().tm2_8,
    category: tl().tm2_4,
  },
  {
    name: tl().tm2_9,
    free: tl().tm2_10,
    basic: tl().tm2_11,
    pro: tl().tm2_12,
    vip: tl().tm2_12,
    category: tl().tm2_4,
  },
  {
    name: tl().tm2_13,
    free: true,
    basic: true,
    pro: true,
    vip: true,
    category: tl().tm2_14,
  },
  {
    name: tl().tm2_15,
    free: tl().tm2_16,
    basic: tl().tm2_17,
    pro: tl().tm2_18,
    vip: tl().tm2_19,
    category: tl().tm2_20,
  },
  {
    name: tl().tm2_21,
    free: tl().tm2_22,
    basic: tl().tm2_23,
    pro: tl().tm2_24,
    vip: tl().tm2_25,
    category: tl().tm2_26,
  },
  {
    name: tl().tm2_27,
    free: tl().tm2_28,
    basic: tl().tm2_29,
    pro: tl().tm2_30,
    vip: tl().tm2_30,
    category: tl().tm2_31,
  },
  {
    name: tl().tm2_32,
    free: true,
    basic: true,
    pro: true,
    vip: true,
    category: tl().tm2_31,
  },
  {
    name: tl().tm2_33,
    free: false,
    basic: false,
    pro: false,
    vip: true,
    category: tl().tm2_34,
  },
  {
    name: tl().tm2_35,
    free: tl().tm2_36,
    basic: tl().tm2_37,
    pro: tl().tm2_38,
    vip: tl().tm2_38,
    category: tl().tm2_39,
  },
  {
    name: tl().tm2_40,
    free: tl().tm2_41,
    basic: tl().tm2_42,
    pro: tl().tm2_43,
    vip: tl().tm2_44,
    category: tl().tm2_45,
  },
  {
    name: tl().tm2_46,
    free: tl().tm2_47,
    basic: tl().tm2_48,
    pro: tl().tm2_49,
    vip: tl().tm2_50,
    category: tl().tm2_51,
  },
];

// Existing Iraqi Dinar Exchange Rate logic: 1 USD = 1,520 IQD
const USD_TO_IQD_RATE = 1520;
const formatIqdPrice = (usd: number) => {
  if (usd === 0) return tl().tm2_52;
  const iqd = Math.round(usd * USD_TO_IQD_RATE);
  return fmt(tl().tm2_53, { iqd: new Intl.NumberFormat(getActiveLang() === 'ar' ? 'ar-IQ' : 'en-US').format(iqd) });
};

export const SubscriptionPlansScreen: React.FC = () => {
  const [selectedPlanForNotify, setSelectedPlanForNotify] = useState<{
    name: string;
    price: string;
    period: string;
    usd: number;
  } | null>(null);
  const [isIraqiModalOpen, setIsIraqiModalOpen] = useState(false);

  // Card payments (Stripe) when the server has billing on; otherwise the launch waitlist.
  const [billingOn, setBillingOn] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [checkoutBusy, setCheckoutBusy] = useState<number | null>(null);
  useEffect(() => {
    void billingConfig().then((c) => setBillingOn(c.enabled));
  }, []);

  const handleOpenNotify = async (name: string, price: string, period: string, usd: number) => {
    const plan = planIdFrom(name, usd);
    if (billingOn && plan && plan !== 'free') {
      setCheckoutError(null);
      setCheckoutBusy(usd);
      const failure = await startCheckout(plan);
      setCheckoutBusy(null);
      if (failure) setCheckoutError(failure);
      return;
    }
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
            <span>{tl().tm2_54}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white tracking-tight">
            {tl().tm2_55}
          </h1>
          <p className="text-xs sm:text-sm text-[#94A3B8] max-w-2xl mx-auto leading-relaxed">
            {tl().tm2_56}
          </p>
        </div>

        {/* Legal Disclaimer Box */}
        <div className="p-4 rounded-xl bg-[#0B1528] border border-amber-500/30 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-[#CBD5E1] space-y-1">
            <strong className="text-amber-400 font-bold block">{tl().tm2_57}</strong>
            <p className="leading-relaxed text-[#94A3B8]">
              {tl().tm2_58}
            </p>
          </div>
        </div>

        {checkoutError && (
          <div role="alert" className="mx-auto max-w-xl mb-4 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/40 text-rose-200 text-sm text-center">
            {checkoutError}
          </div>
        )}
        {/* 4 Monthly Plans Grid (Free $0, Basic $10, Pro $15 [Most Popular], VIP $20) */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 items-stretch">
          {/* Plan 1: Free ($0) */}
          <div className="rounded-2xl bg-[#0B1220] border border-[#1E283D] p-5 flex flex-col justify-between hover:border-[#2E3F5F] transition-all">
            <div className="space-y-4">
              <div>
                <span className="text-xs text-[#94A3B8] font-bold block mb-1">{tl().tm2_59}</span>
                <h3 className="text-xl font-bold text-white">{tl().tm2_60}</h3>
                <p className="text-xs text-[#7B8DA8] mt-1 leading-relaxed">
                  {tl().tm2_61}
                </p>
              </div>

              <div className="pt-2 pb-1 border-y border-[#16233B]">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-white">$0</span>
                  <span className="text-xs text-[#7B8DA8]">{tl().tm2_62}</span>
                </div>
                <div className="mt-1 text-xs font-bold text-emerald-400 font-mono">
                  {formatIqdPrice(0)}
                </div>
                <span className="text-[11px] text-[#64748B] block mt-0.5">{tl().tm2_63}</span>
              </div>

              <div className="space-y-2.5 text-xs text-[#CBD5E1]">
                <div className="text-[11px] font-bold text-[#7B8DA8] pb-1 border-b border-[#1A263C]">
                  {tl().tm2_64}
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>{tl().tm2_65}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>{tl().tm2_66}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>{tl().tm2_67}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>{tl().tm2_68}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>{tl().tm2_69}</span>
                </div>
              </div>
            </div>

            <button
              disabled
              className="w-full mt-6 py-3 rounded-xl text-xs font-bold bg-[#131F33] text-[#2DD4BF] border border-[#2DD4BF]/30 opacity-90 cursor-default text-center min-h-[44px]"
            >
              {tl().tm2_70}
            </button>
          </div>

          {/* Plan 2: Basic ($10 / Month) */}
          <div className="rounded-2xl bg-[#0B1220] border border-[#1E2E4A] p-5 flex flex-col justify-between hover:border-[#2DD4BF]/50 transition-all">
            <div className="space-y-4">
              <div>
                <span className="text-xs text-[#38BDF8] font-bold block mb-1">{tl().tm2_71}</span>
                <h3 className="text-xl font-bold text-white">{tl().tm2_72}</h3>
                <p className="text-xs text-[#7B8DA8] mt-1 leading-relaxed">
                  {tl().tm2_73}
                </p>
              </div>

              <div className="pt-2 pb-1 border-y border-[#16233B]">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-white">$10</span>
                  <span className="text-xs text-[#7B8DA8]">{tl().tm2_62}</span>
                </div>
                <div className="mt-1 text-xs font-bold text-emerald-400 font-mono">
                  {formatIqdPrice(10)}
                </div>
                <span className="text-[11px] text-[#64748B] block mt-0.5">{tl().tm2_74}</span>
              </div>

              <div className="space-y-2.5 text-xs text-[#CBD5E1]">
                <div className="p-2 rounded-lg bg-[#111F36] border border-[#1E3355] text-[11px] font-bold text-[#38BDF8] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>{tl().tm2_75}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span className="font-semibold text-white">{tl().tm2_76}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>{tl().tm2_77}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>{tl().tm2_78}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>{tl().tm2_79}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>{tl().tm2_80}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleOpenNotify(tl().tm2_72, '$10', tl().tm2_81, 10)}
              className="w-full mt-6 py-3 rounded-xl text-xs font-bold bg-[#14233C] hover:bg-[#1C3256] text-[#2DD4BF] border border-[#2DD4BF]/40 transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{checkoutBusy === 10 ? tl().tm2_82 : billingOn ? tl().tm2_83 : tl().tm2_84}</span>
            </button>
          </div>

          {/* Plan 3: Pro ($15 / Month) - Highlighted Most Popular */}
          <div className="rounded-2xl bg-gradient-to-b from-[#0F233D] to-[#0A162B] border-2 border-[#2DD4BF] p-5 flex flex-col justify-between shadow-2xl relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#2DD4BF] text-[#042F2E] px-3.5 py-0.5 rounded-full text-[10px] font-black shadow-md uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 fill-current" />
              <span>{tl().tm2_85}</span>
            </div>

            <div className="space-y-4">
              <div>
                <span className="text-xs text-[#2DD4BF] font-bold block mb-1">{tl().tm2_86}</span>
                <h3 className="text-xl font-bold text-white">{tl().tm2_87}</h3>
                <p className="text-xs text-[#94A3B8] mt-1 leading-relaxed">
                  {tl().tm2_88}
                </p>
              </div>

              <div className="pt-2 pb-1 border-y border-[#1E3558]">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-white">$15</span>
                  <span className="text-xs text-[#94A3B8]">{tl().tm2_62}</span>
                </div>
                <div className="mt-1 text-xs font-bold text-emerald-400 font-mono">
                  {formatIqdPrice(15)}
                </div>
                <span className="text-[11px] text-[#2DD4BF] font-semibold block mt-0.5">
                  {tl().tm2_89}
                </span>
              </div>

              <div className="space-y-2.5 text-xs text-[#CBD5E1]">
                <div className="p-2 rounded-lg bg-[#142B49] border border-[#2DD4BF]/30 text-[11px] font-bold text-[#2DD4BF] flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 shrink-0" />
                  <span>{tl().tm2_90}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span className="font-semibold text-white">{tl().tm2_91}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>{tl().tm2_92}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>{tl().tm2_93}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>{tl().tm2_94}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>{tl().tm2_95}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleOpenNotify(tl().tm2_87, '$15', tl().tm2_81, 15)}
              className="w-full mt-6 py-3 rounded-xl text-xs font-black bg-[#2DD4BF] hover:bg-[#14B8A6] text-[#042F2E] transition-all shadow-lg active:scale-98 cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              <Bell className="w-4 h-4" />
              <span>{checkoutBusy === 15 ? tl().tm2_82 : billingOn ? tl().tm2_96 : tl().tm2_97}</span>
            </button>
          </div>

          {/* Plan 4: VIP ($20 / Month) */}
          <div className="rounded-2xl bg-[#091527] border border-[#264268] p-5 flex flex-col justify-between hover:border-[#38BDF8]/60 transition-all">
            <div className="space-y-4">
              <div>
                <span className="text-xs text-amber-400 font-bold block mb-1">{tl().tm2_98}</span>
                <h3 className="text-xl font-bold text-white">{tl().tm2_99}</h3>
                <p className="text-xs text-[#7B8DA8] mt-1 leading-relaxed">
                  {tl().tm2_100}
                </p>
              </div>

              <div className="pt-2 pb-1 border-y border-[#162947]">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl font-black text-white">$20</span>
                  <span className="text-xs text-[#7B8DA8]">{tl().tm2_62}</span>
                </div>
                <div className="mt-1 text-xs font-bold text-emerald-400 font-mono">
                  {formatIqdPrice(20)}
                </div>
                <span className="text-[11px] text-[#64748B] block mt-0.5">{tl().tm2_101}</span>
              </div>

              <div className="space-y-2.5 text-xs text-[#CBD5E1]">
                <div className="p-2 rounded-lg bg-[#112440] border border-[#2C5282] text-[11px] font-bold text-[#38BDF8] flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>{tl().tm2_102}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span className="font-semibold text-white">{tl().tm2_103}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span className="font-semibold text-white">{tl().tm2_19}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>{tl().tm2_50}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#2DD4BF] shrink-0" />
                  <span>{tl().tm2_104}</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => handleOpenNotify(tl().tm2_99, '$20', tl().tm2_81, 20)}
              className="w-full mt-6 py-3 rounded-xl text-xs font-bold bg-[#132A4A] hover:bg-[#1B3B66] text-[#38BDF8] border border-[#38BDF8]/40 transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-1.5 min-h-[44px]"
            >
              <Bell className="w-3.5 h-3.5" />
              <span>{checkoutBusy === 20 ? tl().tm2_82 : billingOn ? tl().tm2_105 : tl().tm2_106}</span>
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
                <span className="text-xs font-bold text-white">{tl().tm2_107}</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-bold">
                  {tl().tm2_108}
                </span>
                <span className="text-[10px] text-[#7B8DA8] font-mono">
                  {tl().mx_fxRate}
                </span>
              </div>
              <p className="text-xs text-[#94A3B8] mt-0.5 leading-relaxed">
                {tl().mx_localPrep} <strong>{tl().tm2_109}</strong>{tl().tm2_110} <strong>{tl().tm2_111}</strong>{tl().tm2_110} <strong>{tl().tm2_112}</strong>{tl().tm2_113}<strong>{tl().tm2_114}</strong>.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsIraqiModalOpen(true)}
            className="px-4 py-2.5 bg-[#172A47] hover:bg-[#20375D] border border-[#2DD4BF]/40 text-[#2DD4BF] text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 shrink-0 cursor-pointer min-h-[44px]"
          >
            <span>{tl().tm2_115}</span>
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          </button>
        </div>

        {/* 1.2 Feature Comparison Table */}
        <div className="space-y-4 pt-4">
          <div className="text-center space-y-1">
            <h2 className="text-xl sm:text-2xl font-bold text-white">{tl().tm2_116}</h2>
            <p className="text-xs text-[#7B8DA8]">{tl().tm2_117}</p>
          </div>

          {/* Desktop Table View (Hidden on phones) */}
          <div className="hidden md:block rounded-2xl bg-[#0B1220] border border-[#1E283D] overflow-hidden shadow-xl">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-[#0A101D] border-b border-[#1E283D] text-[#7B8DA8]">
                  <th className="py-4 px-5 font-bold text-white w-2/6">{tl().tm2_118}</th>
                  <th className="py-4 px-3 font-bold text-center w-1/6">
                    <div>{tl().tm2_119}</div>
                    <div className="text-[10px] font-mono font-normal text-emerald-400 mt-0.5">{tl().tm2_120}</div>
                  </th>
                  <th className="py-4 px-3 font-bold text-center w-1/6 text-[#38BDF8]">
                    <div>{tl().tm2_121}</div>
                    <div className="text-[10px] font-mono font-normal text-emerald-400 mt-0.5">{tl().tm2_122}</div>
                  </th>
                  <th className="py-4 px-3 font-bold text-center w-1/6 text-[#2DD4BF] bg-[#2DD4BF]/5">
                    <div className="inline-flex items-center gap-1">
                      <span>{tl().tm2_123}</span>
                      <span className="text-[9px] px-1 py-0.2 rounded bg-[#2DD4BF] text-[#042F2E] font-black">{tl().tm2_85}</span>
                    </div>
                    <div className="text-[10px] font-mono font-normal text-emerald-400 mt-0.5">{tl().tm2_124}</div>
                  </th>
                  <th className="py-4 px-3 font-bold text-center w-1/6 text-[#38BDF8]">
                    <div>{tl().tm2_125}</div>
                    <div className="text-[10px] font-mono font-normal text-emerald-400 mt-0.5">{tl().tm2_126}</div>
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
                  <h4 className="font-bold text-white text-sm">{tl().tm2_127}</h4>
                  <span className="text-[10px] text-emerald-400 font-mono block">{tl().tm2_128}</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded bg-[#16233B] text-[#7B8DA8]">{tl().tm2_129}</span>
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
                  <h4 className="font-bold text-[#38BDF8] text-sm">{tl().tm2_130}</h4>
                  <span className="text-[10px] text-emerald-400 font-mono block">{formatIqdPrice(10)}</span>
                </div>
                <button
                  onClick={() => handleOpenNotify(tl().tm2_72, '$10', tl().tm2_81, 10)}
                  className="text-xs px-3.5 py-2.5 rounded-xl bg-[#14233C] hover:bg-[#1E3256] text-[#2DD4BF] border border-[#2DD4BF]/40 font-bold min-h-[44px] inline-flex items-center justify-center cursor-pointer transition-colors shrink-0"
                >
                  {billingOn ? tl().tm2_131 : tl().tm2_132}
                </button>
              </div>
              <div className="text-[11px] font-bold text-[#38BDF8] p-2 bg-[#101C31] rounded-lg">
                {tl().tm2_133}
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
                    <h4 className="font-black text-white text-sm">{tl().tm2_87}</h4>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#2DD4BF] text-[#042F2E] font-black">{tl().tm2_85}</span>
                  </div>
                  <span className="text-[11px] text-[#2DD4BF] font-mono font-bold">{tl().tm2_134}</span>
                  <span className="text-[10px] text-emerald-400 font-mono block">{formatIqdPrice(15)}</span>
                </div>
                <button
                  onClick={() => handleOpenNotify(tl().tm2_87, '$15', tl().tm2_81, 15)}
                  className="text-xs px-3.5 py-2.5 rounded-xl bg-[#2DD4BF] hover:bg-[#14B8A6] text-[#042F2E] font-black shadow-md min-h-[44px] inline-flex items-center justify-center cursor-pointer transition-colors shrink-0"
                >
                  {billingOn ? tl().tm2_131 : tl().tm2_132}
                </button>
              </div>
              <div className="text-[11px] font-bold text-[#2DD4BF] p-2 bg-[#122842] rounded-lg">
                {tl().tm2_135}
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
                  <h4 className="font-bold text-[#38BDF8] text-sm">{tl().tm2_99}</h4>
                  <span className="text-[11px] text-[#38BDF8] font-mono font-bold">{tl().tm2_136}</span>
                  <span className="text-[10px] text-emerald-400 font-mono block">{formatIqdPrice(20)}</span>
                </div>
                <button
                  onClick={() => handleOpenNotify(tl().tm2_99, '$20', tl().tm2_81, 20)}
                  className="text-xs px-3.5 py-2.5 rounded-xl bg-[#132A4A] hover:bg-[#1B3B66] text-[#38BDF8] border border-[#38BDF8]/40 font-bold min-h-[44px] inline-flex items-center justify-center cursor-pointer transition-colors shrink-0"
                >
                  {billingOn ? tl().tm2_131 : tl().tm2_132}
                </button>
              </div>
              <div className="text-[11px] font-bold text-[#38BDF8] p-2 bg-[#10213A] rounded-lg">
                {tl().mx_vipSum}
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
          planName={tl().tm2_87}
          planPriceUsd={15}
          billingCycle="monthly"
        />
      </div>
    </div>
  );
};

export default SubscriptionPlansScreen;
