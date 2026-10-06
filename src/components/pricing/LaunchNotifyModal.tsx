import React, { useState, useEffect } from 'react';
import { X, Bell, Check, Sparkles, AlertCircle, Shield, Clock } from 'lucide-react';
import { joinWaitlist, planIdFrom } from '../../api/waitlist';
import { tl, fmt, getActiveLang } from '../../i18n/locales';

interface LaunchNotifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  planPrice: string;
  planPeriod: string;
  planPriceUsd?: number;
}

export const LaunchNotifyModal: React.FC<LaunchNotifyModalProps> = ({
  isOpen,
  onClose,
  planName,
  planPrice,
  planPeriod,
  planPriceUsd,
}) => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  // Fallback to extract USD number if planPriceUsd not passed explicitly
  const numericUsd =
    typeof planPriceUsd === 'number'
      ? planPriceUsd
      : parseInt(planPrice.replace(/[^0-9]/g, ''), 10) || 0;
  const iqdPrice = Math.round(numericUsd * 1520);
  const formattedIqd = new Intl.NumberFormat(getActiveLang() === 'ar' ? 'ar-IQ' : 'en-US').format(iqdPrice);

  useEffect(() => {
    if (isOpen) {
      try {
        const saved = localStorage.getItem('matrix_launch_notify_email');
        if (saved) setEmail(saved);
      } catch {}
      setIsSubmitted(false);
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = email.trim();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setError(tl().tm2_417);
      return;
    }

    setIsSending(true);
    setError(null);
    // Saved on the server (launch waitlist), so the address actually reaches us.
    const failure = await joinWaitlist(cleanEmail, planIdFrom(planName, numericUsd));
    setIsSending(false);
    if (failure) {
      setError(failure);
      return;
    }

    try {
      localStorage.setItem('matrix_launch_notify_email', cleanEmail);
      localStorage.setItem('matrix_launch_notify_date', new Date().toISOString());
      localStorage.setItem('matrix_launch_notify_plan', planName);
    } catch {}

    setIsSubmitted(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 select-none">
      <div
        className="bg-[#0B1220] border border-[#1E283D] rounded-2xl w-full max-w-md overflow-hidden shadow-2xl text-[#E8EEF9] relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1E283D] bg-[#0A101D] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#2DD4BF]/10 border border-[#2DD4BF]/30 flex items-center justify-center text-[#2DD4BF]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">{tl().tm2_418}</h3>
              <span className="text-[11px] text-[#7B8DA8]">{tl().tm2_419}</span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label={tl().tm2_232}
            className="p-2 rounded-lg text-[#7B8DA8] hover:text-white hover:bg-[#16233B] transition-colors cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 space-y-4 text-xs">
          {/* Plan badge */}
          <div className="p-3.5 rounded-xl bg-[#0F1B2E] border border-[#1E2E4A] flex items-center justify-between">
            <div>
              <span className="text-[11px] text-[#7B8DA8] block">{tl().tm2_420}</span>
              <strong className="text-sm font-extrabold text-white">{planName}</strong>
            </div>
            <div className="text-left font-mono">
              <span className="text-base font-black text-[#2DD4BF]">{planPrice}</span>
              <span className="text-[10px] text-[#7B8DA8] block">/ {planPeriod}</span>
              <span className="text-[10px] font-bold text-emerald-400 block font-sans mt-0.5">
                {numericUsd === 0 ? tl().tm2_422 : fmt(tl().tm2_421, { iqd: formattedIqd })}
              </span>
            </div>
          </div>

          {/* Honest Notice */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-[#CBD5E1] space-y-1">
            <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
              <Clock className="w-4 h-4 shrink-0" />
              <span>{tl().tm2_423}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-[#94A3B8]">
              {tl().tm2_424}
            </p>
          </div>

          {isSubmitted ? (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center space-y-2 animate-in fade-in">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                <Check className="w-5 h-5" />
              </div>
              <h4 className="font-bold text-sm text-white">{tl().tm2_425}</h4>
              <p className="text-[11px] text-[#94A3B8] leading-relaxed">
                {tl().mx_thanksNotify} <strong className="text-white font-mono">{email}</strong> {tl().mx_thanksNotify2}
              </p>
              <button
                onClick={onClose}
                className="mt-3 px-6 py-2.5 rounded-xl bg-[#16233B] hover:bg-[#1E2E4A] text-[#2DD4BF] font-bold text-xs cursor-pointer transition-colors min-h-[44px] inline-flex items-center justify-center"
              >
                {tl().tm2_426}
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-semibold text-white mb-1.5">
                  {tl().tm2_427}
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="name@example.com"
                  dir="ltr"
                  className="w-full bg-[#08111E] border border-[#243049] rounded-xl px-3.5 py-2.5 text-xs text-[#E8EEF9] placeholder-[#556987] focus:outline-hidden focus:border-[#2DD4BF] text-left font-mono min-h-[44px]"
                />
                {error && (
                  <span className="text-[11px] text-rose-400 mt-1 block flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 inline" />
                    {error}
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={isSending}
                className="disabled:opacity-60 disabled:cursor-wait w-full py-3 rounded-xl bg-gradient-to-r from-[#2DD4BF] to-[#0284C7] hover:from-[#14B8A6] hover:to-[#0369A1] text-[#042F2E] font-black text-xs transition-all shadow-lg active:scale-98 cursor-pointer flex items-center justify-center gap-2 min-h-[44px]"
              >
                <Bell className="w-4 h-4" />
                <span>{isSending ? tl().tm2_428 : tl().tm2_132}</span>
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#64748B] pt-1">
                <Shield className="w-3.5 h-3.5 text-[#2DD4BF]" />
                <span>{tl().tm2_429}</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
