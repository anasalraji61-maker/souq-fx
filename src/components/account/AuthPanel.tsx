import React, { useEffect, useState } from 'react';
import { LogIn, LogOut, UserPlus, KeyRound, Trash2, ShieldCheck, Loader2, Cloud, Crown, CreditCard } from 'lucide-react';
import { login, register, logout, refreshMe, changePassword, deleteAccount, emailAvailable, forgotPassword } from '../../api/auth';
import { getSessionUser, onSessionChange, SessionUser } from '../../api/session';
import { getCloudSyncStatus, onCloudSyncStatus, syncNow, CloudSyncStatus } from '../../api/cloudSync';
import { getPlan, onPlanChange, refreshPlan, requestUpgrade, PlanInfo } from '../../api/plan';
import { billingConfig, openBillingPortal } from '../../api/billing';
import { tl, fmt, getActiveLang } from '../../i18n/locales';

type Mode = 'login' | 'register';

const inputCls =
  'w-full bg-[#0B1220] border border-[#243049] focus:border-[#2DD4BF] rounded-lg px-3 py-2 text-[#E8EEF9] outline-none text-xs';

/**
 * Sign-in / sign-up / account management.
 * Guests keep working with a per-device id; signing in moves this device's journal, alerts and drawings to the account,
 * so they are available on every device.
 */
export const AuthPanel: React.FC = () => {
  const [user, setUser] = useState<SessionUser | null>(() => getSessionUser());
  const [mode, setMode] = useState<Mode>('login');
  const [identifier, setIdentifier] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [showPw, setShowPw] = useState(false);
  const [curPw, setCurPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmDelete, setConfirmDelete] = useState('');

  useEffect(() => {
    const off = onSessionChange(setUser);
    void refreshMe().then(setUser);
    return off;
  }, []);

  const resetForm = () => {
    setPassword('');
    setPassword2('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (mode === 'register') {
      if (username.trim().length < 3) return setError(tl().tm2_137);
      if (!/^\S+@\S+\.\S+$/.test(email.trim())) return setError(tl().tm2_138);
      if (password.length < 8) return setError(tl().tm2_139);
      if (password !== password2) return setError(tl().tm2_140);
    } else if (!identifier.trim() || !password) {
      return setError(tl().tm2_141);
    }
    setBusy(true);
    const res = mode === 'register' ? await register(username, email, password) : await login(identifier, password);
    setBusy(false);
    if (res.ok) {
      resetForm();
      setNotice(mode === 'register' ? tl().tm2_142 : tl().tm2_143);
    } else {
      setError(res.message);
    }
  };

  const handleLogout = async () => {
    setBusy(true);
    await logout();
    setBusy(false);
    setNotice(tl().tm2_144);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (newPw.length < 8) return setError(tl().tm2_145);
    setBusy(true);
    const r = await changePassword(curPw, newPw);
    setBusy(false);
    if (r.ok) {
      setCurPw('');
      setNewPw('');
      setShowPw(false);
      setNotice(r.message);
    } else {
      setError(r.message);
    }
  };

  const handleDelete = async () => {
    if (!user || confirmDelete.trim() !== user.username) {
      setError(tl().tm2_146);
      return;
    }
    setBusy(true);
    const r = await deleteAccount();
    setBusy(false);
    setConfirmDelete('');
    if (r.ok) setNotice(r.message);
    else setError(r.message);
  };

  const messages = (
    <>
      {error && (
        <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-semibold">{error}</div>
      )}
      {notice && (
        <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
          {notice}
        </div>
      )}
    </>
  );

  if (user) {
    return (
      <section className="p-5 bg-[#121A2B] rounded-xl border border-[#243049] space-y-4 shadow-lg" dir={getActiveLang() === 'en-US' ? 'ltr' : 'rtl'}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#2DD4BF] to-[#38BDF8] flex items-center justify-center text-[#042F2E] font-black">
              {user.username.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#E8EEF9]">{user.username}</span>
                <SyncBadge />
              </div>
              <p className="text-[#7B8DA8] text-xs font-mono mt-0.5" dir="ltr">
                {user.email || '—'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#162033] border border-[#243049] text-[#A3B4D0] hover:text-[#E8EEF9] cursor-pointer"
            >
              <KeyRound className="w-4 h-4" /> {tl().mx_changePw}
            </button>
            <button
              type="button"
              onClick={handleLogout}
              disabled={busy}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#162033] border border-[#243049] text-[#A3B4D0] hover:text-rose-300 cursor-pointer disabled:opacity-50"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />} {tl().mx_logout}
            </button>
          </div>
        </div>
        <p className="text-[11px] text-[#7B8DA8] flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-[#2DD4BF]" />
          {tl().tm2_147}
        </p>

        {showPw && (
          <form onSubmit={handleChangePassword} className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-[#1E283D]">
            <input type="password" autoComplete="current-password" placeholder={tl().tm2_148} value={curPw} onChange={(e) => setCurPw(e.target.value)} className={inputCls} />
            <input type="password" autoComplete="new-password" placeholder={tl().tm2_149} value={newPw} onChange={(e) => setNewPw(e.target.value)} className={inputCls} />
            <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg bg-[#2DD4BF] text-[#042F2E] font-bold text-xs cursor-pointer disabled:opacity-50">
              {tl().tm2_150}
            </button>
          </form>
        )}

        {messages}

        <details className="pt-2 border-t border-[#1E283D]">
          <summary className="text-[11px] text-rose-300/80 cursor-pointer select-none">{tl().tm2_151}</summary>
          <div className="mt-3 flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <input
              placeholder={fmt(tl().tm2_152, { name: user.username })}
              value={confirmDelete}
              onChange={(e) => setConfirmDelete(e.target.value)}
              className={inputCls}
            />
            <button
              type="button"
              onClick={handleDelete}
              disabled={busy}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg bg-rose-500/15 border border-rose-500/40 text-rose-300 font-bold text-xs cursor-pointer disabled:opacity-50 shrink-0"
            >
              <Trash2 className="w-4 h-4" /> {tl().tm2_172}
            </button>
          </div>
          <p className="text-[10px] text-[#64748B] mt-2">{tl().tm2_153}</p>
        </details>
        <PlanCard />
        <LegalLinks />
      </section>
    );
  }

  return (
    <section className="p-5 bg-[#121A2B] rounded-xl border border-[#243049] space-y-4 shadow-lg" dir={getActiveLang() === 'en-US' ? 'ltr' : 'rtl'}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[#E8EEF9]">{tl().tm2_154}</h2>
          <p className="text-[11px] text-[#7B8DA8] mt-1">
            {tl().tm2_155}
          </p>
        </div>
        <div className="flex rounded-lg bg-[#0B1220] border border-[#243049] p-0.5 shrink-0">
          {(['login', 'register'] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => {
                setMode(m);
                setError(null);
                setNotice(null);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-bold cursor-pointer ${
                mode === m ? 'bg-[#2DD4BF] text-[#042F2E]' : 'text-[#A3B4D0]'
              }`}
            >
              {m === 'login' ? tl().tm2_156 : tl().tm2_157}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {mode === 'login' ? (
          <>
            <input autoComplete="username" placeholder={tl().tm2_158} value={identifier} onChange={(e) => setIdentifier(e.target.value)} className={inputCls} dir="ltr" />
            <input type="password" autoComplete="current-password" placeholder={tl().tm2_159} value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} dir="ltr" />
          </>
        ) : (
          <>
            <input autoComplete="username" placeholder={tl().tm2_160} value={username} onChange={(e) => setUsername(e.target.value)} className={inputCls} dir="ltr" />
            <input type="email" autoComplete="email" placeholder={tl().tm2_161} value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} dir="ltr" />
            <input type="password" autoComplete="new-password" placeholder={tl().tm2_162} value={password} onChange={(e) => setPassword(e.target.value)} className={inputCls} dir="ltr" />
            <input type="password" autoComplete="new-password" placeholder={tl().tm2_163} value={password2} onChange={(e) => setPassword2(e.target.value)} className={inputCls} dir="ltr" />
          </>
        )}
        <button
          type="submit"
          disabled={busy}
          className="sm:col-span-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#2DD4BF] hover:bg-[#26bba8] text-[#042F2E] font-bold text-xs cursor-pointer disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : mode === 'login' ? <LogIn className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
          {mode === 'login' ? tl().tm2_164 : tl().tm2_165}
        </button>
      </form>
      {messages}
      {mode === 'login' && <ForgotPassword initialEmail={identifier.includes('@') ? identifier : ''} />}
      <p className="text-[10px] text-[#64748B]">
        {tl().mx_authNote}{' '}
        <a href="/legal/terms.html" target="_blank" rel="noopener" className="text-[#2DD4BF] hover:underline">{tl().tm2_166}</a> {tl().mx_and}{' '}
        <a href="/legal/privacy.html" target="_blank" rel="noopener" className="text-[#2DD4BF] hover:underline">{tl().tm2_167}</a>.
      </p>
      <LegalLinks />
    </section>
  );
};

/** Links to the public legal pages (needed by App Store / Google Play reviewers and users). */
export const LegalLinks: React.FC = () => (
  <nav className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-[#64748B]" aria-label={tl().tm2_168}>
    <a href="/legal/privacy.html" target="_blank" rel="noopener" className="hover:text-[#2DD4BF]">{tl().tm2_169}</a>
    <a href="/legal/terms.html" target="_blank" rel="noopener" className="hover:text-[#2DD4BF]">{tl().tm2_170}</a>
    <a href="/legal/risk.html" target="_blank" rel="noopener" className="hover:text-[#2DD4BF]">{tl().tm2_171}</a>
    <a href="/legal/delete-account.html" target="_blank" rel="noopener" className="hover:text-[#2DD4BF]">{tl().tm2_172}</a>
    <a href="/legal/about.html" target="_blank" rel="noopener" className="hover:text-[#2DD4BF]">{tl().tm2_173}</a>
  </nav>
);

/** Account sync state + "sync now" (watchlists, layouts, indicators, drawings). */
const SyncBadge: React.FC = () => {
  const [st, setSt] = useState<CloudSyncStatus>(getCloudSyncStatus());
  useEffect(() => onCloudSyncStatus(setSt), []);
  const syncing = st.state === 'syncing';
  const failed = st.state === 'error';
  const label = syncing ? tl().tm2_174 : failed ? tl().tm2_175 : tl().tm2_176;
  const time = st.lastSyncAt
    ? new Date(st.lastSyncAt).toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' })
    : null;
  return (
    <button
      type="button"
      onClick={() => void syncNow()}
      disabled={syncing}
      title={`${tl().tm2_177}${time ? ` • ${tl().au_lastSync} ${time}` : ''}${tl().tm2_178}`}
      className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer disabled:cursor-wait ${
        failed
          ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
          : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
      }`}
    >
      {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Cloud className="w-3 h-3" />} {label}
    </button>
  );
};

/** "Forgot password?" — sends a reset link by e-mail (shown only when the server can send e-mail). */
const ForgotPassword: React.FC<{ initialEmail: string }> = ({ initialEmail }) => {
  const [available, setAvailable] = useState(false);
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    let alive = true;
    void emailAvailable().then((v) => alive && setAvailable(v));
    return () => {
      alive = false;
    };
  }, []);

  if (!available) return null;
  if (!open) {
    return (
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setEmail((e) => e || initialEmail);
        }}
        className="text-[11px] text-[#2DD4BF] hover:underline cursor-pointer"
      >
        {tl().tm2_179}
      </button>
    );
  }
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setResult({ ok: false, message: tl().tm2_180 });
      return;
    }
    setBusy(true);
    setResult(await forgotPassword(email));
    setBusy(false);
  };
  return (
    <form onSubmit={submit} className="p-3 rounded-lg bg-[#0B1220] border border-[#243049] space-y-2">
      <p className="text-[11px] text-[#A3B4D0]">{tl().tm2_181}</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="email"
          autoComplete="email"
          dir="ltr"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="flex-1 bg-[#060D19] border border-[#243049] rounded-lg px-3 py-2 text-xs text-[#E8EEF9] focus:outline-none focus:border-[#2DD4BF] min-h-[40px]"
        />
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 rounded-lg bg-[#2DD4BF] text-[#042F2E] font-bold text-xs cursor-pointer disabled:opacity-50 min-h-[40px] flex items-center justify-center gap-1"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null} {tl().mx_sendLink}
        </button>
      </div>
      {result && (
        <p className={`text-[11px] ${result.ok ? 'text-emerald-300' : 'text-rose-300'}`} role="status">
          {result.message}
        </p>
      )}
    </form>
  );
};

/** Current plan, renewal date and the way to upgrade / manage the card subscription. */
const PlanCard: React.FC = () => {
  const [plan, setPlan] = useState<PlanInfo | null>(getPlan());
  const [billing, setBilling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  useEffect(() => {
    const off = onPlanChange(setPlan);
    void refreshPlan();
    void billingConfig().then((c) => setBilling(c.enabled));
    return off;
  }, []);
  if (!plan) return null;
  const paid = plan.plan !== 'free';
  const end = plan.expires_at
    ? new Date(plan.expires_at * 1000).toLocaleDateString('ar-IQ', { year: 'numeric', month: 'long', day: 'numeric', numberingSystem: 'latn' })
    : null;
  return (
    <div className={`rounded-lg border p-3 space-y-2 ${paid ? 'border-amber-500/40 bg-amber-500/5' : 'border-[#243049] bg-[#0B1220]'}`}>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Crown className={`w-4 h-4 ${paid ? 'text-amber-400' : 'text-[#64748B]'}`} />
          <span className="text-xs font-bold text-[#E8EEF9]">{tl().mx_planLbl} {plan.label}</span>
          {paid && end && <span className="text-[11px] text-[#94A3B8]">{tl().mx_until} {end}{plan.days_left !== null ? fmt(tl().tm2_182, { days: plan.days_left }) : ''}</span>}
        </div>
        <div className="flex items-center gap-2">
          {paid && billing && (
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const failure = await openBillingPortal();
                setBusy(false);
                if (failure) setMsg(failure);
              }}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-[#243049] text-[#A3B4D0] hover:text-white text-[11px] cursor-pointer disabled:opacity-50"
            >
              <CreditCard className="w-3.5 h-3.5" /> {tl().mx_manageSub}
            </button>
          )}
          {plan.plan !== 'vip' && (
            <button
              type="button"
              onClick={() => requestUpgrade('charts', plan.limits.charts)}
              className="px-3 py-1.5 rounded-lg bg-[#2DD4BF] text-[#042F2E] font-bold text-[11px] cursor-pointer"
            >
              {paid ? tl().tm2_183 : tl().tm2_184}
            </button>
          )}
        </div>
      </div>
      {!plan.enforcement && (
        <p className="text-[10px] text-[#64748B]">{tl().tm2_185}</p>
      )}
      {msg && <p className="text-[11px] text-rose-300">{msg}</p>}
    </div>
  );
};
