import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { TrendingUp, TrendingDown, ThumbsUp, ThumbsDown, Plus, Loader2, Lightbulb, RefreshCw, Info, X } from 'lucide-react';
import { fetchIdeas, voteIdea, shareIdea, TradeIdea, ideaRiskReward, IdeaErrorCode } from '../../api/ideas';
import { containsLink } from '../../api/community';
import { GxDict, fmt, LangId } from '../../i18n/locales';
import { LoadingSkeleton, EmptyState, ErrorState } from '../common/ScreenState';
import { Avatar, ItemMenu, LoginRequired, timeLabel, dayLabel } from './communityShared';
import type { SessionUser } from '../../api/session';

interface IdeasPanelProps {
  x: GxDict;
  lang: LangId;
  user: SessionUser | null;
  onLogin: () => void;
  onReport: (idea: TradeIdea) => void;
  hiddenIds: Set<string>;
  toast: (text: string, kind?: 'ok' | 'error' | 'info') => void;
  /** Symbols offered in the share form (forex / metals / indices only). */
  symbols: string[];
}

function priceText(v: number | null | undefined): string {
  if (v === null || v === undefined || !Number.isFinite(v)) return '—';
  const abs = Math.abs(v);
  const digits = abs >= 1000 ? 2 : abs >= 20 ? 3 : 5;
  return String(Number(v.toFixed(digits)));
}

export function ideaErrorText(x: GxDict, e: IdeaErrorCode | undefined): string {
  switch (e) {
    case 'links_not_allowed':
      return x.c_errLinks;
    case 'invalid_levels':
      return x.c_ideaErrLevels;
    case 'not_found':
      return x.c_ideaGone;
    case 'network':
      return x.g_networkError;
    case 'login_required':
      return x.c_loginToAct;
    default:
      return x.g_serverError;
  }
}

const IdeaCard: React.FC<{
  idea: TradeIdea;
  x: GxDict;
  lang: LangId;
  onVote: (choice: 'agree' | 'disagree') => void;
  voting: boolean;
  onReport: () => void;
}> = ({ idea, x, lang, onVote, voting, onReport }) => {
  const buy = idea.direction === 'buy';
  const total = idea.agree + idea.disagree;
  const agreePct = total > 0 ? Math.round((idea.agree / total) * 100) : 0;
  const rr = ideaRiskReward(idea);
  const when = idea.created_at ? new Date(idea.created_at * 1000) : null;
  return (
    <article
      className="rounded-xl bg-[#0F1828] border border-[#1E2B44] p-3.5 space-y-3"
      data-testid="idea-card"
      aria-label={`${idea.symbol} ${buy ? x.c_dirBuy : x.c_dirSell}`}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-bold ${
              buy ? 'bg-emerald-500/15 text-emerald-300' : 'bg-rose-500/15 text-rose-300'
            }`}
          >
            {buy ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
            {buy ? x.c_dirBuy : x.c_dirSell}
          </span>
          <span className="font-mono font-bold text-sm text-[#E8EEF9]" dir="ltr">
            {idea.symbol}
          </span>
          {idea.mine && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2DD4BF]/15 text-[#2DD4BF]">{x.c_mine}</span>}
        </div>
        {!idea.mine && <ItemMenu x={x} onReport={onReport} label={x.c_moreActions} />}
      </header>

      <dl className="grid grid-cols-3 gap-1.5 text-center">
        {(
          [
            [x.c_entry, idea.entry, 'text-[#E8EEF9]'],
            [x.c_sl, idea.sl, 'text-rose-300'],
            [x.c_tp, idea.tp, 'text-emerald-300'],
          ] as const
        ).map(([k, v, tone]) => (
          <div key={k} className="rounded-lg bg-[#0B1220] border border-[#1E283D] py-1.5">
            <dt className="text-[10px] text-[#64748B]">{k}</dt>
            <dd className={`font-mono text-[12px] font-semibold ${tone}`} dir="ltr">
              {priceText(v)}
            </dd>
          </div>
        ))}
      </dl>
      {rr !== null && (
        <div className="text-[11px] text-[#94A3B8]">
          {x.c_rr}: <span className="font-mono text-[#E8EEF9]" dir="ltr">1 : {rr.toFixed(2)}</span>
        </div>
      )}

      {idea.note && <p className="text-[12px] text-[#CBD5E1] leading-relaxed break-words whitespace-pre-line">{idea.note}</p>}

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-emerald-300">
            {x.c_agree} {total > 0 ? `${agreePct}%` : ''}
          </span>
          <span className="text-[#64748B]">{fmt(x.c_votesN, { n: total })}</span>
          <span className="text-rose-300">
            {x.c_disagree} {total > 0 ? `${100 - agreePct}%` : ''}
          </span>
        </div>
        <div
          className={`h-1.5 rounded-full overflow-hidden ${total > 0 ? 'bg-rose-500/40' : 'bg-[#1E283D]'}`}
          role="img"
          aria-label={total > 0 ? `${x.c_agree} ${agreePct}%` : x.c_noVotes}
        >
          <div className="h-full bg-emerald-400 transition-all" style={{ width: total > 0 ? `${agreePct}%` : '0%' }} />
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            onClick={() => onVote('agree')}
            disabled={voting}
            aria-pressed={idea.my_choice === 'agree'}
            className={`min-h-[38px] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border cursor-pointer disabled:opacity-60 ${
              idea.my_choice === 'agree'
                ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200'
                : 'bg-[#0B1220] border-[#1E283D] text-[#A3B4D0] hover:text-emerald-200'
            }`}
          >
            <ThumbsUp className="w-3.5 h-3.5" /> {x.c_agree} · {idea.agree}
          </button>
          <button
            onClick={() => onVote('disagree')}
            disabled={voting}
            aria-pressed={idea.my_choice === 'disagree'}
            className={`min-h-[38px] rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border cursor-pointer disabled:opacity-60 ${
              idea.my_choice === 'disagree'
                ? 'bg-rose-500/20 border-rose-400/60 text-rose-200'
                : 'bg-[#0B1220] border-[#1E283D] text-[#A3B4D0] hover:text-rose-200'
            }`}
          >
            <ThumbsDown className="w-3.5 h-3.5" /> {x.c_disagree} · {idea.disagree}
          </button>
        </div>
      </div>

      <footer className="flex items-center justify-between gap-2 pt-2 border-t border-[#1E283D]">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar name={idea.author || '?'} size={22} />
          <span className="text-[11px] text-[#A3B4D0] truncate">{idea.author || x.c_anonymous}</span>
        </div>
        {when && (
          <time className="text-[10px] text-[#64748B] shrink-0" dateTime={when.toISOString()}>
            {dayLabel(when, lang, x)} · {timeLabel(idea.created_at ?? null, lang)}
          </time>
        )}
      </footer>
      <p className="text-[10px] text-amber-300/80 flex items-center gap-1" data-testid="idea-disclaimer">
        <Info className="w-3 h-3 shrink-0" /> {x.c_ideaDisclaimer}
      </p>
    </article>
  );
};

const ShareIdeaForm: React.FC<{
  x: GxDict;
  symbols: string[];
  onDone: (idea: TradeIdea) => void;
  onCancel: () => void;
  onLogin: () => void;
}> = ({ x, symbols, onDone, onCancel, onLogin }) => {
  const [symbol, setSymbol] = useState(symbols[0] || 'EURUSD');
  const [direction, setDirection] = useState<'buy' | 'sell'>('buy');
  const [entry, setEntry] = useState('');
  const [sl, setSl] = useState('');
  const [tp, setTp] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const nums = [entry, sl, tp].map((v) => Number(v.replace(',', '.')));
  const [e, s, t] = nums;
  const allNum = nums.every((v) => Number.isFinite(v) && v > 0) && [entry, sl, tp].every((v) => v.trim() !== '');
  let levelErr: string | null = null;
  if (allNum) {
    if (direction === 'buy' && !(s < e && e < t)) levelErr = x.c_ideaBuyRule;
    if (direction === 'sell' && !(t < e && e < s)) levelErr = x.c_ideaSellRule;
    if (!levelErr && ![s, t].every((v) => v >= e / 10 && v <= e * 10)) levelErr = x.c_ideaErrLevels;
  }
  const linkWarn = containsLink(note);
  const rr = allNum && !levelErr ? ideaRiskReward({ entry: e, sl: s, tp: t }) : null;

  const submit = async () => {
    if (!allNum) {
      setErr(x.c_ideaFillLevels);
      return;
    }
    if (levelErr || linkWarn) return;
    setBusy(true);
    setErr(null);
    const r = await shareIdea({ symbol, direction, entry: e, sl: s, tp: t, note: note.trim() });
    setBusy(false);
    if (r.ok && r.idea) {
      onDone(r.idea);
      return;
    }
    if (r.error === 'login_required') {
      onLogin();
      return;
    }
    setErr(ideaErrorText(x, r.error));
  };

  const input =
    'w-full min-h-[40px] rounded-lg bg-[#0B1220] border border-[#24344E] px-2.5 text-[13px] text-[#E8EEF9] font-mono focus:border-[#2DD4BF] outline-none';
  return (
    <form
      className="rounded-xl bg-[#0F1828] border border-[#2DD4BF]/40 p-3.5 space-y-3"
      onSubmit={(ev) => {
        ev.preventDefault();
        void submit();
      }}
      data-testid="share-idea-form"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-bold text-[#E8EEF9]">{x.c_shareIdea}</h3>
        <button type="button" onClick={onCancel} aria-label={x.g_close} className="p-1 text-[#94A3B8] hover:text-white cursor-pointer">
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-[11px] text-[#94A3B8] space-y-1">
          <span>{x.c_symbol}</span>
          <select value={symbol} onChange={(ev) => setSymbol(ev.target.value)} className={input} dir="ltr">
            {symbols.map((s2) => (
              <option key={s2} value={s2}>
                {s2}
              </option>
            ))}
          </select>
        </label>
        <div className="text-[11px] text-[#94A3B8] space-y-1">
          <span>{x.c_direction}</span>
          <div className="grid grid-cols-2 gap-1">
            {(['buy', 'sell'] as const).map((d) => (
              <button
                type="button"
                key={d}
                onClick={() => setDirection(d)}
                aria-pressed={direction === d}
                className={`min-h-[40px] rounded-lg text-xs font-bold border cursor-pointer ${
                  direction === d
                    ? d === 'buy'
                      ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-200'
                      : 'bg-rose-500/20 border-rose-400/60 text-rose-200'
                    : 'bg-[#0B1220] border-[#24344E] text-[#94A3B8]'
                }`}
              >
                {d === 'buy' ? x.c_dirBuy : x.c_dirSell}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {(
          [
            [x.c_entry, entry, setEntry],
            [x.c_sl, sl, setSl],
            [x.c_tp, tp, setTp],
          ] as const
        ).map(([lbl, val, set]) => (
          <label key={lbl} className="text-[11px] text-[#94A3B8] space-y-1">
            <span>{lbl}</span>
            <input
              inputMode="decimal"
              value={val}
              onChange={(ev) => set(ev.target.value)}
              className={input}
              dir="ltr"
              aria-label={lbl}
            />
          </label>
        ))}
      </div>
      {levelErr && <p className="text-[11px] text-amber-300">{levelErr}</p>}
      {rr !== null && (
        <p className="text-[11px] text-[#94A3B8]">
          {x.c_rr}: <span className="font-mono text-[#E8EEF9]" dir="ltr">1 : {rr.toFixed(2)}</span>
        </p>
      )}
      <label className="block text-[11px] text-[#94A3B8] space-y-1">
        <span>{x.c_ideaNote}</span>
        <textarea
          value={note}
          onChange={(ev) => setNote(ev.target.value.slice(0, 500))}
          rows={3}
          className="w-full rounded-lg bg-[#0B1220] border border-[#24344E] p-2.5 text-[13px] text-[#E8EEF9] focus:border-[#2DD4BF] outline-none resize-none"
          placeholder={x.c_ideaNotePh}
        />
        <span className="flex justify-between">
          <span className={linkWarn ? 'text-amber-300' : ''}>{linkWarn ? x.c_errLinks : ''}</span>
          <span className="font-mono" dir="ltr">
            {note.length}/500
          </span>
        </span>
      </label>
      {err && (
        <p role="alert" className="text-xs text-rose-300">
          {err}
        </p>
      )}
      <p className="text-[10px] text-[#64748B]">{x.c_ideaShareNote}</p>
      <button
        type="submit"
        disabled={busy || !!levelErr || linkWarn}
        className="w-full min-h-[42px] rounded-xl bg-[#2DD4BF] text-[#042F2E] text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        {x.c_publishIdea}
      </button>
    </form>
  );
};

export const IdeasPanel: React.FC<IdeasPanelProps> = ({ x, lang, user, onLogin, onReport, hiddenIds, toast, symbols }) => {
  const [ideas, setIdeas] = useState<TradeIdea[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [filter, setFilter] = useState<string>('all');
  const [voting, setVoting] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  const load = useCallback(async () => {
    setState((s) => (s === 'ready' ? s : 'loading'));
    const r = await fetchIdeas();
    if (r.ok) {
      setIdeas(r.ideas);
      setState('ready');
    } else {
      setState((s) => (s === 'ready' ? s : 'error'));
    }
  }, []);

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 60000);
    return () => clearInterval(t);
  }, [load, user?.user_id]);

  const visible = useMemo(() => ideas.filter((i) => !hiddenIds.has(i.id)), [ideas, hiddenIds]);
  const symbolsInIdeas = useMemo(() => {
    const counts = new Map<string, number>();
    visible.forEach((i) => counts.set(i.symbol, (counts.get(i.symbol) || 0) + 1));
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  }, [visible]);
  const shown = filter === 'all' ? visible : visible.filter((i) => i.symbol === filter);

  useEffect(() => {
    if (filter !== 'all' && !symbolsInIdeas.some(([s]) => s === filter)) setFilter('all');
  }, [filter, symbolsInIdeas]);

  const vote = async (idea: TradeIdea, choice: 'agree' | 'disagree') => {
    if (!user) {
      toast(x.c_loginToVote, 'info');
      return;
    }
    setVoting(idea.id);
    const r = await voteIdea(idea.id, choice);
    setVoting(null);
    if (r.ok && r.idea) {
      setIdeas((prev) => prev.map((i) => (i.id === idea.id ? { ...i, ...r.idea } : i)));
    } else {
      toast(ideaErrorText(x, r.error), 'error');
    }
  };

  return (
    <section className="flex flex-col h-full min-h-0" aria-label={x.c_ideasTitle}>
      <div className="px-3 pt-3 pb-2 space-y-2 border-b border-[#1E283D] bg-[#0B1220]">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-bold text-[#E8EEF9] flex items-center gap-1.5">
            <Lightbulb className="w-4 h-4 text-amber-300" />
            {x.c_ideasTitle}
            <span className="text-[11px] font-normal text-[#64748B]">({visible.length})</span>
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => void load()}
              aria-label={x.g_refresh}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#94A3B8] hover:text-white hover:bg-[#1C2740] cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => (user ? setSharing((v) => !v) : onLogin())}
              className="min-h-[32px] px-2.5 rounded-lg bg-[#2DD4BF]/15 text-[#2DD4BF] text-[11px] font-bold flex items-center gap-1 cursor-pointer hover:bg-[#2DD4BF]/25"
              data-testid="share-idea-btn"
            >
              <Plus className="w-3.5 h-3.5" /> {x.c_shareIdeaShort}
            </button>
          </div>
        </div>
        {symbolsInIdeas.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar pb-0.5" role="tablist" aria-label={x.c_filterSymbol}>
            <button
              role="tab"
              aria-selected={filter === 'all'}
              onClick={() => setFilter('all')}
              className={`shrink-0 px-2.5 min-h-[30px] rounded-full text-[11px] font-semibold border cursor-pointer ${
                filter === 'all' ? 'bg-[#2DD4BF] text-[#042F2E] border-transparent' : 'border-[#24344E] text-[#A3B4D0]'
              }`}
            >
              {x.g_all}
            </button>
            {symbolsInIdeas.map(([s, n]) => (
              <button
                role="tab"
                key={s}
                aria-selected={filter === s}
                onClick={() => setFilter(s)}
                className={`shrink-0 px-2.5 min-h-[30px] rounded-full text-[11px] font-mono border cursor-pointer ${
                  filter === s ? 'bg-[#2DD4BF] text-[#042F2E] border-transparent' : 'border-[#24344E] text-[#A3B4D0]'
                }`}
                dir="ltr"
              >
                {s} · {n}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 md:space-y-0 md:grid md:grid-cols-2 md:gap-3 md:content-start lg:block lg:space-y-3">
        {sharing && user && (
          <div className="md:col-span-2">
          <ShareIdeaForm
            x={x}
            symbols={symbols}
            onCancel={() => setSharing(false)}
            onLogin={onLogin}
            onDone={(idea) => {
              setIdeas((prev) => [idea, ...prev.filter((i) => i.id !== idea.id)]);
              setSharing(false);
              toast(x.c_ideaShared, 'ok');
            }}
          />
          </div>
        )}
        {state === 'loading' ? (
          <div className="md:col-span-2"><LoadingSkeleton rows={3} /></div>
        ) : state === 'error' ? (
          <ErrorState className="md:col-span-2" currentLang={lang} title={x.c_ideasErrorTitle} message={x.c_serverUnreachable} onRetry={() => void load()} />
        ) : shown.length === 0 ? (
          <EmptyState
            className="md:col-span-2"
            currentLang={lang}
            icon={<Lightbulb className="w-6 h-6 text-amber-300" />}
            title={x.c_ideasEmptyTitle}
            message={x.c_ideasEmptyText}
            action={
              !user ? (
                <LoginRequired x={x} text={x.c_loginToShare} onLogin={onLogin} compact />
              ) : undefined
            }
          />
        ) : (
          shown.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              x={x}
              lang={lang}
              voting={voting === idea.id}
              onVote={(c) => void vote(idea, c)}
              onReport={() => (user ? onReport(idea) : toast(x.c_loginToReport, 'info'))}
            />
          ))
        )}
      </div>
    </section>
  );
};
