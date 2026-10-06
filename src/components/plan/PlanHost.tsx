import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Crown, X, Check, Loader2, CreditCard, PartyPopper } from 'lucide-react';
import { getPlan, onPlanChange, refreshPlan, PlanInfo, PlanId, LimitKey, PlanLimitEventDetail } from '../../api/plan';
import { billingConfig, startCheckout } from '../../api/billing';
import { tl, fmt, getActiveLang } from '../../i18n/locales';

/**
 * Global plan UI, mounted in its own root (main.tsx):
 *  - the "upgrade" dialog when a plan limit is reached (event `matrix:plan-limit`);
 *  - the result banner after returning from Stripe Checkout (?billing=success|cancel).
 */

const LIMIT_TEXT: Record<LimitKey, (max: number | null) => string> = {
  charts: (m) => fmt(tl().tm2_248, { m: m ?? '—' }),
  indicators_per_chart: (m) => fmt(tl().tm2_249, { m: m ?? '—' }),
  watchlists: (m) => fmt(tl().tm2_250, { m: m ?? '—' }),
  watchlist_symbols: (m) => fmt(tl().tm2_251, { m: m ?? '—' }),
  alerts: (m) => fmt(tl().tm2_252, { m: m ?? '—' }),
  ai_daily: (m) => fmt(tl().tm2_253, { m: m ?? '—' }),
};

const PAID: Exclude<PlanId, 'free'>[] = ['basic', 'pro', 'vip'];

function limitLabel(v: number | null): string {
  return v === null ? tl().tm2_8 : String(v);
}

const UpgradeDialog: React.FC<{ detail: PlanLimitEventDetail; onClose: () => void }> = ({ detail, onClose }) => {
  const [plan, setPlan] = useState<PlanInfo | null>(getPlan());
  const [billing, setBilling] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => onPlanChange(setPlan), []);
  useEffect(() => {
    void billingConfig().then((c) => setBilling(c.enabled));
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const current = plan?.plan ?? 'free';
  const options = PAID.filter((p) => {
    const lim = plan?.plan_limits?.[p]?.[detail.limit];
    const cur = detail.max;
    return lim === null || lim === undefined || cur === null || (typeof lim === 'number' && lim > cur);
  }).filter((p) => PAID.indexOf(p) > PAID.indexOf(current as Exclude<PlanId, 'free'>) || current === 'free');

  const buy = async (p: Exclude<PlanId, 'free'>) => {
    setBusy(p);
    setErr(null);
    const failure = await startCheckout(p);
    if (failure) {
      setErr(failure);
      setBusy(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm"
      dir={getActiveLang() === 'en-US' ? 'ltr' : 'rtl'}
      role="dialog"
      aria-modal="true"
      aria-labelledby="plan-limit-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-[#0B1220] border border-[#24344E] shadow-2xl text-[#E8EEF9] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E283D] bg-gradient-to-l from-[#0F2A2A] to-[#0B1220]">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-400" />
            <h2 id="plan-limit-title" className="font-bold text-sm">
              {tl().tm2_254}
            </h2>
          </div>
          <button onClick={onClose} aria-label={tl().tm2_232} className="p-1 rounded hover:bg-[#1C2740] text-[#94A3B8] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-sm text-[#CBD5E1]">
            {LIMIT_TEXT[detail.limit](detail.max)} {tl().mx_planNow} <strong>{plan?.label ?? tl().tm2_255}</strong>.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {options.map((p) => (
              <div
                key={p}
                className={`rounded-xl border p-3 ${p === 'pro' ? 'border-[#2DD4BF]/70 bg-[#12263A]' : 'border-[#24344E] bg-[#0F1828]'}`}
              >
                <div className="text-xs text-[#94A3B8]">{plan?.labels?.[p] ?? p}</div>
                <div className="text-xl font-black" dir="ltr">
                  ${plan?.prices_usd?.[p] ?? '—'}
                  <span className="text-[11px] font-normal text-[#94A3B8]"> {tl().tm2_256}</span>
                </div>
                <div className="text-[11px] text-[#A3B4D0] mt-1 flex items-center gap-1">
                  <Check className="w-3 h-3 text-emerald-400" />
                  {detail.limit === 'ai_daily' ? tl().tm2_257 : tl().tm2_258}
                  {limitLabel(plan?.plan_limits?.[p]?.[detail.limit] ?? null)}
                </div>
                {billing && (
                  <button
                    onClick={() => void buy(p)}
                    disabled={busy !== null}
                    className="mt-2 w-full min-h-[38px] rounded-lg bg-[#2DD4BF] text-[#042F2E] text-xs font-bold flex items-center justify-center gap-1 cursor-pointer disabled:opacity-60"
                  >
                    {busy === p ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                    {tl().tm2_259}
                  </button>
                )}
              </div>
            ))}
          </div>
          {err && <p className="text-xs text-rose-300" role="alert">{err}</p>}
          {plan?.payment_instructions && (
            <div className="rounded-lg bg-[#0F1828] border border-[#24344E] p-3 text-[12px] text-[#A3B4D0] leading-relaxed">
              <strong className="text-[#E8EEF9]">{billing ? tl().tm2_260 : tl().tm2_261}</strong>
              {plan.payment_instructions}
            </div>
          )}
          <p className="text-[10px] text-[#64748B]">
            {tl().tm2_262}
          </p>
        </div>
      </div>
    </div>
  );
};

const BillingResult: React.FC<{ kind: 'success' | 'cancel'; onClose: () => void }> = ({ kind, onClose }) => {
  const [plan, setPlan] = useState<PlanInfo | null>(getPlan());
  useEffect(() => onPlanChange(setPlan), []);
  useEffect(() => {
    if (kind !== 'success') return;
    // The webhook may land a moment after the redirect: poll the plan for up to ~20 s.
    let n = 0;
    const t = setInterval(() => {
      n += 1;
      void refreshPlan().then((p) => {
        if ((p && p.plan !== 'free') || n >= 10) clearInterval(t);
      });
    }, 2000);
    return () => clearInterval(t);
  }, [kind]);
  const active = plan && plan.plan !== 'free';
  return (
    <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] w-[calc(100%-24px)] max-w-md" dir={getActiveLang() === 'en-US' ? 'ltr' : 'rtl'} role="status">
      <div
        className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-2xl backdrop-blur ${
          kind === 'success' ? 'bg-[#06251F]/95 border-emerald-500/50' : 'bg-[#1F1606]/95 border-amber-500/40'
        }`}
      >
        {kind === 'success' ? <PartyPopper className="w-5 h-5 text-emerald-400 shrink-0" /> : <CreditCard className="w-5 h-5 text-amber-400 shrink-0" />}
        <div className="text-sm flex-1">
          {kind === 'success' ? (
            active ? (
              <>
                <strong className="text-emerald-300">{fmt(tl().mx_planActivated, { label: plan?.label ?? '' })}</strong>
                <div className="text-[12px] text-[#A3B4D0]">{tl().tm2_263}</div>
              </>
            ) : (
              <>
                <strong className="text-emerald-300">{tl().tm2_264}</strong>
                <div className="text-[12px] text-[#A3B4D0]">{tl().tm2_265}</div>
              </>
            )
          ) : (
            <>
              <strong className="text-amber-300">{tl().tm2_266}</strong>
              <div className="text-[12px] text-[#A3B4D0]">{tl().tm2_267}</div>
            </>
          )}
        </div>
        <button onClick={onClose} aria-label={tl().tm2_232} className="p-1 text-[#94A3B8] hover:text-white cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export const PlanHost: React.FC = () => {
  const [limit, setLimit] = useState<PlanLimitEventDetail | null>(null);
  const [result, setResult] = useState<'success' | 'cancel' | null>(null);

  useEffect(() => {
    const onLimit = (e: Event) => setLimit((e as CustomEvent<PlanLimitEventDetail>).detail);
    window.addEventListener('matrix:plan-limit', onLimit);
    try {
      const params = new URLSearchParams(window.location.search);
      const b = params.get('billing');
      if (b === 'success' || b === 'cancel') {
        setResult(b);
        params.delete('billing');
        params.delete('session_id');
        const q = params.toString();
        window.history.replaceState(null, '', window.location.pathname + (q ? `?${q}` : '') + window.location.hash);
      }
    } catch {
      // ignore
    }
    return () => window.removeEventListener('matrix:plan-limit', onLimit);
  }, []);

  useEffect(() => {
    if (result !== 'cancel') return;
    const t = setTimeout(() => setResult(null), 8000);
    return () => clearTimeout(t);
  }, [result]);

  return createPortal(
    <>
      {limit && <UpgradeDialog detail={limit} onClose={() => setLimit(null)} />}
      {result && <BillingResult kind={result} onClose={() => setResult(null)} />}
    </>,
    document.body
  );
};
