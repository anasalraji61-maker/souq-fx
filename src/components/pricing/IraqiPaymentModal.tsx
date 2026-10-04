import React, { useState } from 'react';
import {
  X,
  CreditCard,
  Smartphone,
  Building2,
  Copy,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Send,
  Sparkles,
} from 'lucide-react';

interface IraqiPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  planPriceUsd: number;
  billingCycle: 'monthly' | 'annual';
}

export type PaymentMethodType = 'zaincash' | 'qicard' | 'fib' | 'fastpay' | 'visamaster';

export const IraqiPaymentModal: React.FC<IraqiPaymentModalProps> = ({
  isOpen,
  onClose,
  planName,
  planPriceUsd,
  billingCycle,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodType>('zaincash');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [txId, setTxId] = useState('');
  const [senderPhone, setSenderPhone] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  if (!isOpen) return null;

  // Approximate USD to IQD market rate (~1520 IQD/USD)
  const usdToIqdRate = 1520;
  const priceIqd = Math.round(planPriceUsd * usdToIqdRate);
  const formattedIqd = new Intl.NumberFormat('ar-IQ').format(priceIqd);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txId.trim() && !senderPhone.trim()) return;
    setIsSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0A1322] border border-[#1E2E4A] rounded-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto shadow-2xl text-[#E2E8F0] relative">
        {/* Header */}
        <div className="sticky top-0 bg-[#0A1322]/95 backdrop-blur border-b border-[#1E2E4A] p-5 flex items-center justify-between z-10">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#2DD4BF]/10 text-[#2DD4BF] font-semibold border border-[#2DD4BF]/20">
                بوابات الدفع الرسمية في العراق 🇮🇶
              </span>
              <span className="text-xs text-[#94A3B8]">دعم محلي معتمد</span>
            </div>
            <h2 className="text-lg font-bold text-white mt-1">
              ترقية الاشتراك — {planName} ({billingCycle === 'annual' ? 'سنوي' : 'شهري'})
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#94A3B8] hover:text-white rounded-lg hover:bg-[#16233B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Pricing Summary Banner */}
        <div className="p-5 bg-gradient-to-r from-[#0F1E36] to-[#0A162B] border-b border-[#1E2E4A] flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs text-[#94A3B8]">المبلغ المطلوب للاشتراك:</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-black text-white">${planPriceUsd}</span>
              <span className="text-sm font-bold text-[#2DD4BF]">
                ≈ {formattedIqd} دينار عراقي
              </span>
            </div>
            <span className="text-[11px] text-[#64748B]">سعر الصرف التقديري: 1$ = {usdToIqdRate} د.ع</span>
          </div>
          <div className="flex items-center gap-2 bg-[#12223D] px-3.5 py-2 rounded-xl border border-[#1E3358] text-xs text-[#38BDF8]">
            <ShieldCheck className="w-4 h-4 text-[#38BDF8] shrink-0" />
            <span>تفعيل فوري وآمن وممتثل للضوابط</span>
          </div>
        </div>

        {isSubmitted ? (
          /* Confirmation Success State */
          <div className="p-8 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-white">تم استلام بيانات التحويل بنجاح!</h3>
            <p className="text-sm text-[#94A3B8] max-w-md mx-auto leading-relaxed">
              شكراً لك! يقوم فريق الدعم الفني بالتحقق من إشعار الدفع وتفعيل باقة{' '}
              <strong className="text-white">{planName}</strong> على حسابك فوراً (خلال 5-15 دقيقة).
            </p>
            <div className="bg-[#0F1D33] p-4 rounded-xl max-w-md mx-auto text-xs text-start space-y-1.5 border border-[#1E2E4A]">
              <div className="flex justify-between text-[#94A3B8]">
                <span>رقم العملية / المرجع:</span>
                <span className="text-white font-mono">{txId || 'مرسل عبر الهاتف'}</span>
              </div>
              <div className="flex justify-between text-[#94A3B8]">
                <span>رقم الهاتف المسجل:</span>
                <span className="text-white font-mono">{senderPhone || 'غير مدخل'}</span>
              </div>
              <div className="flex justify-between text-[#94A3B8]">
                <span>وسيلة الدفع:</span>
                <span className="text-[#2DD4BF] font-semibold">
                  {selectedMethod === 'zaincash' && 'زين كاش (ZainCash)'}
                  {selectedMethod === 'qicard' && 'كي كارد (Qi Card)'}
                  {selectedMethod === 'fib' && 'مصرف العراق الأول (FIB)'}
                  {selectedMethod === 'fastpay' && 'فاست بي (FastPay)'}
                  {selectedMethod === 'visamaster' && 'بطاقة مصرفية دولية'}
                </span>
              </div>
            </div>
            <button
              onClick={onClose}
              className="px-6 py-2.5 bg-[#2DD4BF] text-[#042F2E] font-bold rounded-xl text-xs hover:bg-[#14B8A6] transition-all"
            >
              العودة إلى المنصة
            </button>
          </div>
        ) : (
          /* Payment Selection Body */
          <div className="p-5 space-y-6">
            {/* Method Tabs */}
            <div>
              <label className="text-xs font-bold text-[#94A3B8] block mb-2.5">
                اختر وسيلة الدفع المصرفية أو الإلكترونية المعتمدة:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {/* 1. ZainCash */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod('zaincash')}
                  className={`p-3 rounded-xl border text-start transition-all flex flex-col justify-between ${
                    selectedMethod === 'zaincash'
                      ? 'bg-[#14233C] border-[#2DD4BF] shadow-[0_0_15px_rgba(45,212,191,0.15)]'
                      : 'bg-[#0E1829] border-[#1E2E4A] hover:border-[#2C4164]'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <Smartphone className="w-4 h-4 text-[#2DD4BF]" />
                    <span className="text-[10px] bg-[#2DD4BF]/10 text-[#2DD4BF] px-1.5 py-0.5 rounded font-bold">الأسرع</span>
                  </div>
                  <div className="mt-2">
                    <div className="text-xs font-bold text-white">زين كاش</div>
                    <div className="text-[10px] text-[#64748B]">ZainCash (محفظة رقمية)</div>
                  </div>
                </button>

                {/* 2. Qi Card */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod('qicard')}
                  className={`p-3 rounded-xl border text-start transition-all flex flex-col justify-between ${
                    selectedMethod === 'qicard'
                      ? 'bg-[#14233C] border-[#2DD4BF] shadow-[0_0_15px_rgba(45,212,191,0.15)]'
                      : 'bg-[#0E1829] border-[#1E2E4A] hover:border-[#2C4164]'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-amber-400" />
                  <div className="mt-2">
                    <div className="text-xs font-bold text-white">كي كارد / ماستركارد</div>
                    <div className="text-[10px] text-[#64748B]">Qi Card / الرافدين والرشيد</div>
                  </div>
                </button>

                {/* 3. First Iraqi Bank */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod('fib')}
                  className={`p-3 rounded-xl border text-start transition-all flex flex-col justify-between ${
                    selectedMethod === 'fib'
                      ? 'bg-[#14233C] border-[#2DD4BF] shadow-[0_0_15px_rgba(45,212,191,0.15)]'
                      : 'bg-[#0E1829] border-[#1E2E4A] hover:border-[#2C4164]'
                  }`}
                >
                  <Building2 className="w-4 h-4 text-emerald-400" />
                  <div className="mt-2">
                    <div className="text-xs font-bold text-white">مصرف العراق الأول</div>
                    <div className="text-[10px] text-[#64748B]">FIB (First Iraqi Bank)</div>
                  </div>
                </button>

                {/* 4. FastPay */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod('fastpay')}
                  className={`p-3 rounded-xl border text-start transition-all flex flex-col justify-between ${
                    selectedMethod === 'fastpay'
                      ? 'bg-[#14233C] border-[#2DD4BF] shadow-[0_0_15px_rgba(45,212,191,0.15)]'
                      : 'bg-[#0E1829] border-[#1E2E4A] hover:border-[#2C4164]'
                  }`}
                >
                  <Smartphone className="w-4 h-4 text-purple-400" />
                  <div className="mt-2">
                    <div className="text-xs font-bold text-white">فاست بي (FastPay)</div>
                    <div className="text-[10px] text-[#64748B]">كردستان وعموم العراق</div>
                  </div>
                </button>

                {/* 5. Visa / MasterCard */}
                <button
                  type="button"
                  onClick={() => setSelectedMethod('visamaster')}
                  className={`p-3 rounded-xl border text-start transition-all flex flex-col justify-between ${
                    selectedMethod === 'visamaster'
                      ? 'bg-[#14233C] border-[#2DD4BF] shadow-[0_0_15px_rgba(45,212,191,0.15)]'
                      : 'bg-[#0E1829] border-[#1E2E4A] hover:border-[#2C4164]'
                  }`}
                >
                  <CreditCard className="w-4 h-4 text-sky-400" />
                  <div className="mt-2">
                    <div className="text-xs font-bold text-white">فيزا / ماستركارد</div>
                    <div className="text-[10px] text-[#64748B]">بطاقات مصرفية معتمدة</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Instruction Details based on selected method */}
            <div className="p-4 rounded-xl bg-[#0F1B2E] border border-[#1E2F4D] space-y-4">
              {/* ZainCash details */}
              {selectedMethod === 'zaincash' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#2DD4BF]">
                    <Smartphone className="w-4 h-4" />
                    <span>خطوات الدفع عبر محفظة زين كاش (ZainCash)</span>
                  </div>
                  <p className="text-xs text-[#CBD5E1] leading-relaxed">
                    افتح تطبيق زين كاش على هاتفك، اختر <strong>«تحويل أموال»</strong> إلى رقم المحفظة المعتمد التالي:
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#0A1322] p-3 rounded-xl border border-[#1C2C45]">
                    <div className="flex-1 text-xs space-y-1">
                      <span className="text-[#64748B] block text-[11px]">رقم محفظة زين كاش المعتمد:</span>
                      <span className="text-sm font-mono font-bold text-white tracking-wider">
                        0780 123 4567
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy('07801234567', 'zain')}
                      className="px-3 py-1.5 bg-[#162740] hover:bg-[#203657] text-[#2DD4BF] text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      {copiedKey === 'zain' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'zain' ? 'تم النسخ!' : 'نسخ الرقم'}</span>
                    </button>
                  </div>
                  <div className="text-[11px] text-[#94A3B8] bg-[#14233C]/60 p-2.5 rounded-lg border border-[#1D3252]">
                    💡 <strong>المبلغ المطلوب بالدينار:</strong> {formattedIqd} دينار عراقي (يُرجى إرسال المبلغ مع كتابة اسم المستخدم في خانة الملاحظات).
                  </div>
                </div>
              )}

              {/* Qi Card details */}
              {selectedMethod === 'qicard' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                    <CreditCard className="w-4 h-4" />
                    <span>الدفع عبر بطاقات كي كارد / ماستركارد العراق</span>
                  </div>
                  <p className="text-xs text-[#CBD5E1] leading-relaxed">
                    يمكنك الدفع المباشر من خلال تطبيق <strong>خدمات كي (Qi Services)</strong> أو التحويل إلى البطاقة المخصصة:
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#0A1322] p-3 rounded-xl border border-[#1C2C45]">
                    <div className="flex-1 text-xs space-y-1">
                      <span className="text-[#64748B] block text-[11px]">رقم حساب / بطاقة كي كارد:</span>
                      <span className="text-sm font-mono font-bold text-white tracking-wider">
                        5359 4200 9812 3456
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy('5359420098123456', 'qi')}
                      className="px-3 py-1.5 bg-[#162740] hover:bg-[#203657] text-amber-400 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      {copiedKey === 'qi' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'qi' ? 'تم النسخ!' : 'نسخ الرقم'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* FIB details */}
              {selectedMethod === 'fib' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-400">
                    <Building2 className="w-4 h-4" />
                    <span>مصرف العراق الأول (First Iraqi Bank - FIB)</span>
                  </div>
                  <p className="text-xs text-[#CBD5E1] leading-relaxed">
                    إذا كان لديك حساب في تطبيق FIB، يمكنك إجراء تحويل لحظي برقم الآيبان الداخلي أو المعرف التجاري:
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#0A1322] p-3 rounded-xl border border-[#1C2C45]">
                    <div className="flex-1 text-xs space-y-1">
                      <span className="text-[#64748B] block text-[11px]">معرّف حساب FIB التجاري:</span>
                      <span className="text-sm font-mono font-bold text-white tracking-wider">
                        FIB-IQ-9988220
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy('FIB-IQ-9988220', 'fib')}
                      className="px-3 py-1.5 bg-[#162740] hover:bg-[#203657] text-emerald-400 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      {copiedKey === 'fib' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'fib' ? 'تم النسخ!' : 'نسخ المعرف'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* FastPay details */}
              {selectedMethod === 'fastpay' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-400">
                    <Smartphone className="w-4 h-4" />
                    <span>الدفع عبر محفظة فاست بي (FastPay)</span>
                  </div>
                  <p className="text-xs text-[#CBD5E1] leading-relaxed">
                    أرسل المبلغ المطلوب ({formattedIqd} د.ع) إلى رقم حساب FastPay التجاري:
                  </p>
                  <div className="flex flex-col sm:flex-row items-center gap-3 bg-[#0A1322] p-3 rounded-xl border border-[#1C2C45]">
                    <div className="flex-1 text-xs space-y-1">
                      <span className="text-[#64748B] block text-[11px]">رقم حساب FastPay:</span>
                      <span className="text-sm font-mono font-bold text-white tracking-wider">
                        0750 987 6543
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCopy('07509876543', 'fastpay')}
                      className="px-3 py-1.5 bg-[#162740] hover:bg-[#203657] text-purple-400 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      {copiedKey === 'fastpay' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === 'fastpay' ? 'تم النسخ!' : 'نسخ الرقم'}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Visa / Master details */}
              {selectedMethod === 'visamaster' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-sky-400">
                    <CreditCard className="w-4 h-4" />
                    <span>بطاقات الدفع المصرفية المعتمدة</span>
                  </div>
                  <p className="text-xs text-[#CBD5E1] leading-relaxed">
                    يمكنك الدفع المباشر بواسطة أي بطاقة ماستركارد أو فيزا كارد صادرة من المصارف العراقية المعتمدة:
                  </p>
                  <div className="bg-[#0A1322] p-3 rounded-xl border border-[#1C2C45] flex items-center justify-between">
                    <span className="text-xs text-white font-medium">بوابة البطاقات المصرفية المعتمدة</span>
                    <span className="text-[11px] text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded">مفعلة بالكامل</span>
                  </div>
                </div>
              )}
            </div>

            {/* Verification Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5 border-t border-[#1E2E4A] pt-4">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Sparkles className="w-4 h-4 text-[#2DD4BF]" />
                <span>تأكيد الإرسال لتفعيل الباقة فوراً</span>
              </div>
              <p className="text-[11px] text-[#94A3B8]">
                بعد إتمام عملية التحويل، أدخل رقم الإشعار أو رقم هاتفك الذي قمت بالتحويل منه لربط العملية بحسابك:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] text-[#64748B] block mb-1">
                    رقم الهاتف المرسل / المعرف
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: 0780xxxxxxx أو معرف الحساب"
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    className="w-full bg-[#0E1829] border border-[#1E2E4A] rounded-xl px-3 py-2 text-xs text-white placeholder-[#475569] focus:outline-none focus:border-[#2DD4BF]"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] text-[#64748B] block mb-1">
                    رقم الإشعار / معرف المعاملة
                  </label>
                  <input
                    type="text"
                    placeholder="رقم مرجع الحوالة أو الإشعار"
                    value={txId}
                    onChange={(e) => setTxId(e.target.value)}
                    className="w-full bg-[#0E1829] border border-[#1E2E4A] rounded-xl px-3 py-2 text-xs text-white placeholder-[#475569] focus:outline-none focus:border-[#2DD4BF]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1.5 text-[11px] text-[#64748B]">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>دعم فني مخصص 24/7 لمتابعة الحسابات وتفعيلها فورياً</span>
                </div>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#2DD4BF] hover:bg-[#14B8A6] text-[#042F2E] font-extrabold text-xs rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>تأكيد التحويل والتفعيل</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default IraqiPaymentModal;
