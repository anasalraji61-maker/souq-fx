import React, { useState } from 'react';
import {
  X,
  CreditCard,
  Smartphone,
  Building2,
  ShieldCheck,
  Clock,
  Info,
} from 'lucide-react';

interface IraqiPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  planPriceUsd: number;
  billingCycle: 'monthly' | 'annual';
}

export const IraqiPaymentModal: React.FC<IraqiPaymentModalProps> = ({
  isOpen,
  onClose,
  planName,
  planPriceUsd,
  billingCycle,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'zaincash' | 'qicard' | 'fib' | 'fastpay'>('zaincash');

  if (!isOpen) return null;

  // Approximate USD to IQD market rate (~1520 IQD/USD)
  const usdToIqdRate = 1520;
  const priceIqd = Math.round(planPriceUsd * usdToIqdRate);
  const formattedIqd = new Intl.NumberFormat('ar-IQ').format(priceIqd);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none text-xs">
      <div className="bg-[#0A1322] border border-[#1E2E4A] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl text-[#E2E8F0] relative">
        {/* Header */}
        <div className="sticky top-0 bg-[#0A1322]/95 backdrop-blur border-b border-[#1E2E4A] p-5 flex items-center justify-between z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#2DD4BF]/10 text-[#2DD4BF] font-semibold border border-[#2DD4BF]/20">
                بوابات الدفع المحلية في العراق 🇮🇶
              </span>
              <span className="text-xs text-amber-400 font-bold">قريباً (عرض فقط)</span>
            </div>
            <h2 className="text-base font-bold text-white mt-1">
              تفاصيل اشتراك {planName} ({billingCycle === 'annual' ? 'سنوي' : 'شهري'})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#94A3B8] hover:text-white rounded-lg hover:bg-[#16233B] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pricing Summary Banner */}
        <div className="p-5 bg-gradient-to-r from-[#0F1E36] to-[#0A162B] border-b border-[#1E2E4A] flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs text-[#94A3B8]">قيمة الباقة المقدرة:</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-white">${planPriceUsd}</span>
              <span className="text-sm font-bold text-[#2DD4BF]">
                ≈ {formattedIqd} دينار عراقي
              </span>
            </div>
            <span className="text-[11px] text-[#64748B]">سعر الصرف التقديري: 1$ = {usdToIqdRate} د.ع</span>
          </div>
          <div className="flex items-center gap-2 bg-[#12223D] px-3.5 py-2 rounded-xl border border-[#1E3358] text-xs text-amber-400">
            <Clock className="w-4 h-4 shrink-0" />
            <span>التفعيل المالي غير متاح حالياً</span>
          </div>
        </div>

        {/* Informational Message (No card form, no crypto, no payment collection) */}
        <div className="p-6 space-y-5">
          <div className="p-4 rounded-xl bg-[#0F1B2E] border border-[#1E2E4A] space-y-2">
            <div className="flex items-center gap-2 text-[#2DD4BF] font-bold text-sm">
              <Info className="w-4 h-4" />
              <span>إشعار للمستخدمين</span>
            </div>
            <p className="text-xs text-[#A3B4D0] leading-relaxed">
              هذه الشاشة مخصصة لعرض معلومات الباقات وخيارات الدفع المحلية في العراق مستقبلاً. لا نقوم حالياً بجمع أي تفاصيل دفع أو بيانات بطاقات بنكية، ولا يوجد أي تعامل بالعملات الرقمية أو المشفرة إطلاقاً وفق سياسة المنصة.
            </p>
          </div>

          <div className="space-y-3">
            <span className="text-xs font-bold text-white block">طرق الدفع المحلية المعتمدة مستقبلاً:</span>
            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setSelectedMethod('zaincash')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  selectedMethod === 'zaincash' ? 'bg-[#14233C] border-[#2DD4BF]' : 'bg-[#0E1829] border-[#1E2E4A]'
                }`}
              >
                <div className="flex items-center gap-2 text-white font-bold">
                  <Smartphone className="w-4 h-4 text-[#2DD4BF]" />
                  <span>زين كاش (ZainCash)</span>
                </div>
                <p className="text-[11px] text-[#64748B] mt-1">محفظة رقمية سريعة</p>
              </div>

              <div
                onClick={() => setSelectedMethod('qicard')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  selectedMethod === 'qicard' ? 'bg-[#14233C] border-[#2DD4BF]' : 'bg-[#0E1829] border-[#1E2E4A]'
                }`}
              >
                <div className="flex items-center gap-2 text-white font-bold">
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <span>كي كارد (Qi Card)</span>
                </div>
                <p className="text-[11px] text-[#64748B] mt-1">ماستركارد والبطاقات المصرفية</p>
              </div>

              <div
                onClick={() => setSelectedMethod('fib')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  selectedMethod === 'fib' ? 'bg-[#14233C] border-[#2DD4BF]' : 'bg-[#0E1829] border-[#1E2E4A]'
                }`}
              >
                <div className="flex items-center gap-2 text-white font-bold">
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  <span>مصرف العراق الأول (FIB)</span>
                </div>
                <p className="text-[11px] text-[#64748B] mt-1">تحويل بنكي فوري</p>
              </div>

              <div
                onClick={() => setSelectedMethod('fastpay')}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  selectedMethod === 'fastpay' ? 'bg-[#14233C] border-[#2DD4BF]' : 'bg-[#0E1829] border-[#1E2E4A]'
                }`}
              >
                <div className="flex items-center gap-2 text-white font-bold">
                  <Smartphone className="w-4 h-4 text-purple-400" />
                  <span>فاست بي (FastPay)</span>
                </div>
                <p className="text-[11px] text-[#64748B] mt-1">كردستان وعموم العراق</p>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-[#09111D] border border-[#1A263B] text-center space-y-2">
            <span className="text-xs text-[#7B8DA8] block">حالة تفعيل الاشتراكات:</span>
            <button
              disabled
              className="px-6 py-2.5 rounded-xl bg-[#16233B] text-amber-400 font-extrabold text-xs border border-amber-500/30 cursor-not-allowed opacity-90 inline-flex items-center gap-2"
            >
              <Clock className="w-4 h-4" />
              <span>بوابات الدفع قيد الإطلاق (قريباً)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IraqiPaymentModal;
