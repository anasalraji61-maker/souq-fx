import React, { useEffect, useRef, useState } from 'react';
import { MoreHorizontal, Flag, X, Loader2, ShieldAlert, LogIn } from 'lucide-react';
import { getSessionUser, onSessionChange, SessionUser } from '../../api/session';
import { reportContent, ReportKind, ReportReason } from '../../api/ideas';
import { GxDict, fmt, getIntlLocale, LangId } from '../../i18n/locales';

/** Signed-in account (null for guests), kept in sync with sign-in / sign-out. */
export function useSessionUser(): SessionUser | null {
  const [user, setUser] = useState<SessionUser | null>(() => getSessionUser());
  useEffect(() => onSessionChange(setUser), []);
  return user;
}

/** Two-letter initials for the avatar (Arabic and Latin names). */
export function initials(name: string): string {
  const clean = (name || '?').replace(/[_\-.]+/g, ' ').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return Array.from(parts[0]).slice(0, 2).join('').toUpperCase();
  return (Array.from(parts[0])[0] + Array.from(parts[1])[0]).toUpperCase();
}

const AVATAR_COLORS = ['#0F766E', '#1D4ED8', '#7C3AED', '#B45309', '#BE123C', '#047857', '#4338CA', '#0369A1'];

/** Stable colour per name (same author → same colour everywhere). */
export function avatarColor(name: string): string {
  let h = 0;
  for (const ch of name || '') h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

export const Avatar: React.FC<{ name: string; size?: number }> = ({ name, size = 34 }) => (
  <div
    aria-hidden="true"
    className="rounded-full flex items-center justify-center font-bold text-white shrink-0 select-none"
    style={{ width: size, height: size, background: avatarColor(name), fontSize: Math.round(size * 0.36) }}
  >
    {initials(name)}
  </div>
);

export type ToastKind = 'ok' | 'error' | 'info';

export const Toast: React.FC<{ text: string; kind: ToastKind; onClose: () => void }> = ({ text, kind, onClose }) => {
  useEffect(() => {
    const t = setTimeout(onClose, 4500);
    return () => clearTimeout(t);
  }, [text, onClose]);
  const tone =
    kind === 'ok'
      ? 'bg-[#06251F]/95 border-emerald-500/50 text-emerald-200'
      : kind === 'error'
        ? 'bg-[#2A0F14]/95 border-rose-500/50 text-rose-200'
        : 'bg-[#0F1A2E]/95 border-[#2DD4BF]/40 text-[#CFFAFE]';
  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="community-toast"
      className={`fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[90] max-w-[92vw] w-max px-4 py-2.5 rounded-xl border shadow-2xl backdrop-blur text-xs font-semibold flex items-center gap-2 ${tone}`}
    >
      <span>{text}</span>
      <button onClick={onClose} className="p-0.5 opacity-70 hover:opacity-100 cursor-pointer" aria-label="×">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

/** ⋯ menu on a message or idea. Only item: report. */
export const ItemMenu: React.FC<{ x: GxDict; onReport: () => void; label: string }> = ({ x, onReport, label }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('touchstart', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('touchstart', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        className="w-8 h-8 rounded-lg flex items-center justify-center text-[#64748B] hover:text-[#E8EEF9] hover:bg-[#1C2740] cursor-pointer"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute top-9 end-0 z-30 min-w-[140px] rounded-xl bg-[#0F1828] border border-[#24344E] shadow-2xl py-1"
        >
          <button
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onReport();
            }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-rose-300 hover:bg-[#1C2740] cursor-pointer text-start"
          >
            <Flag className="w-3.5 h-3.5" />
            {x.c_report}
          </button>
        </div>
      )}
    </div>
  );
};

const REASONS: ReportReason[] = ['scam', 'abuse', 'spam', 'other'];

/** Report dialog: pick a reason → POST /api/reports → the item disappears for this user. */
export const ReportDialog: React.FC<{
  x: GxDict;
  kind: ReportKind;
  targetId: string;
  preview: string;
  onClose: () => void;
  onReported: (result: 'new' | 'already') => void;
  onLoginRequired: () => void;
}> = ({ x, kind, targetId, preview, onClose, onReported, onLoginRequired }) => {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [onClose]);

  const submit = async () => {
    if (!reason) return;
    setBusy(true);
    setErr(null);
    const r = await reportContent(kind, targetId, reason);
    setBusy(false);
    if (r.ok) {
      onReported(r.alreadyReported ? 'already' : 'new');
      return;
    }
    if (r.error === 'login_required') {
      onLoginRequired();
      return;
    }
    setErr(r.error === 'not_found' ? x.c_reportGone : r.error === 'network' ? x.g_networkError : x.c_reportFailed);
  };

  const label: Record<ReportReason, string> = {
    scam: x.c_reasonScam,
    abuse: x.c_reasonAbuse,
    spam: x.c_reasonSpam,
    other: x.c_reasonOther,
  };

  return (
    <div
      className="fixed inset-0 z-[95] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="report-title"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl bg-[#0B1220] border border-[#24344E] shadow-2xl text-[#E8EEF9]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1E283D]">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-rose-400" />
            <h2 id="report-title" className="font-bold text-sm">
              {x.c_reportTitle}
            </h2>
          </div>
          <button onClick={onClose} aria-label={x.g_close} className="p-1 rounded hover:bg-[#1C2740] text-[#94A3B8] cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <blockquote className="text-[12px] text-[#94A3B8] bg-[#0F1828] border border-[#1E283D] rounded-lg p-3 line-clamp-3 break-words">
            {preview}
          </blockquote>
          <fieldset className="grid grid-cols-2 gap-2">
            <legend className="text-xs text-[#A3B4D0] mb-2">{x.c_reportWhy}</legend>
            {REASONS.map((r) => (
              <label
                key={r}
                className={`flex items-center gap-2 min-h-[44px] px-3 rounded-xl border text-xs cursor-pointer ${
                  reason === r ? 'border-rose-400/70 bg-rose-500/10 text-rose-200' : 'border-[#24344E] bg-[#0F1828] text-[#CBD5E1]'
                }`}
              >
                <input
                  type="radio"
                  name="report-reason"
                  value={r}
                  checked={reason === r}
                  onChange={() => setReason(r)}
                  className="accent-rose-400"
                />
                {label[r]}
              </label>
            ))}
          </fieldset>
          <p className="text-[11px] text-[#64748B] leading-relaxed">{x.c_reportNote}</p>
          {err && (
            <p role="alert" className="text-xs text-rose-300">
              {err}
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => void submit()}
              disabled={!reason || busy}
              className="flex-1 min-h-[44px] rounded-xl bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />}
              {x.c_reportSend}
            </button>
            <button
              onClick={onClose}
              className="min-h-[44px] px-4 rounded-xl bg-[#1C2740] text-[#CBD5E1] text-xs font-semibold cursor-pointer"
            >
              {x.g_cancel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/** Card asking a guest to sign in, with a button that opens the account tab. */
export const LoginRequired: React.FC<{ x: GxDict; text: string; onLogin: () => void; compact?: boolean }> = ({
  x,
  text,
  onLogin,
  compact,
}) => (
  <div
    className={`flex ${compact ? 'flex-row items-center justify-between gap-3 p-3' : 'flex-col items-center text-center gap-3 p-6'} rounded-xl border border-[#2DD4BF]/30 bg-[#0F2027]`}
    data-testid="login-required"
  >
    <p className="text-xs text-[#CBD5E1] leading-relaxed">{text}</p>
    <button
      onClick={onLogin}
      className="min-h-[40px] px-4 rounded-xl bg-[#2DD4BF] text-[#042F2E] text-xs font-bold flex items-center gap-1.5 cursor-pointer shrink-0"
    >
      <LogIn className="w-4 h-4" />
      {x.g_signIn}
    </button>
  </div>
);

/** Relative / absolute time label in the viewer's local time. */
export function timeLabel(iso: string | number | null | undefined, lang: string): string {
  if (iso === null || iso === undefined || iso === '') return '';
  const d = typeof iso === 'number' ? new Date(iso * 1000) : new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  try {
    return new Intl.DateTimeFormat(getIntlLocale(lang as LangId), {
      hour: '2-digit',
      minute: '2-digit',
      numberingSystem: 'latn',
    }).format(d);
  } catch {
    return d.toTimeString().slice(0, 5);
  }
}

export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function dayLabel(d: Date, lang: string, x: GxDict): string {
  const now = new Date();
  const yest = new Date(now);
  yest.setDate(now.getDate() - 1);
  if (dayKey(d) === dayKey(now)) return x.g_today;
  if (dayKey(d) === dayKey(yest)) return x.g_yesterday;
  try {
    return new Intl.DateTimeFormat(getIntlLocale(lang as LangId), {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      numberingSystem: 'latn',
    }).format(d);
  } catch {
    return d.toDateString();
  }
}

export { fmt };
