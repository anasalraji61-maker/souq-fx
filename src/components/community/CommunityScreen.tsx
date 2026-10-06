import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  Hash,
  MessageSquare,
  Lightbulb,
  Send,
  Loader2,
  ArrowDown,
  ChevronUp,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldCheck,
  Users,
} from 'lucide-react';
import {
  CommunityChannel,
  CommunityMessage,
  CommunityErrorCode,
  DEFAULT_CHANNELS,
  MESSAGE_MAX_CHARS,
  PAGE_SIZE,
  containsLink,
  fetchChannels,
  fetchChannelMessages,
  postChannelMessage,
} from '../../api/community';
import type { TradeIdea } from '../../api/ideas';
import { LangId, gx, GxDict, fmt } from '../../i18n/locales';
import { LoadingSkeleton, EmptyState, ErrorState } from '../common/ScreenState';
import { IdeasPanel } from './IdeasPanel';
import {
  Avatar,
  ItemMenu,
  LoginRequired,
  ReportDialog,
  Toast,
  ToastKind,
  dayKey,
  dayLabel,
  timeLabel,
  useSessionUser,
} from './communityShared';

type MobileTab = 'channels' | 'messages' | 'ideas';
type Sentiment = 'bullish' | 'bearish' | 'neutral';

interface CommunityScreenProps {
  currentLang?: LangId;
  /** Switch the app tab (used to open the account tab for sign-in). */
  onNavigate?: (tab: 'account') => void;
}

const IDEA_SYMBOLS = ['EURUSD', 'GBPUSD', 'USDJPY', 'USDCHF', 'AUDUSD', 'USDCAD', 'NZDUSD', 'EURJPY', 'GBPJPY', 'XAUUSD', 'XAGUSD', 'US30', 'NAS100', 'SPX500', 'GER40'];
const TAG_SYMBOLS = ['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'XAGUSD', 'US30', 'NAS100', 'GER40', 'USOIL', 'DXY'];
const COLLAPSE_CHARS = 320;
const POLL_MS = 12000;
const CHANNEL_KEY = 'matrix.community.channel.v1';

function channelText(x: GxDict, ch: CommunityChannel): { name: string; desc: string } {
  const map: Record<string, [string, string]> = {
    general: [x.c_chGeneral, x.c_chGeneralDesc],
    forex: [x.c_chForex, x.c_chForexDesc],
    metals: [x.c_chMetals, x.c_chMetalsDesc],
    indices: [x.c_chIndices, x.c_chIndicesDesc],
    energy: [x.c_chEnergy, x.c_chEnergyDesc],
    signals: [x.c_chSignals, x.c_chSignalsDesc],
  };
  const m = map[ch.id];
  return m ? { name: m[0], desc: m[1] } : { name: ch.name, desc: '' };
}

function errorText(x: GxDict, e: CommunityErrorCode | undefined): string {
  switch (e) {
    case 'links_not_allowed':
      return x.c_errLinks;
    case 'rate_limited':
      return x.c_errRate;
    case 'too_long':
      return fmt(x.c_errTooLong, { n: MESSAGE_MAX_CHARS });
    case 'empty':
      return x.c_errEmpty;
    case 'login_required':
      return x.c_loginToChat;
    case 'network':
      return x.g_networkError;
    default:
      return x.g_serverError;
  }
}

function readSavedChannel(): string {
  try {
    return localStorage.getItem(CHANNEL_KEY) || 'general';
  } catch {
    return 'general';
  }
}

const SentimentChip: React.FC<{ s?: Sentiment; x: GxDict }> = ({ s, x }) => {
  if (!s || s === 'neutral') return null;
  return s === 'bullish' ? (
    <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300">
      <TrendingUp className="w-3 h-3" /> {x.c_sentUp}
    </span>
  ) : (
    <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-300">
      <TrendingDown className="w-3 h-3" /> {x.c_sentDown}
    </span>
  );
};

const MessageItem: React.FC<{
  m: CommunityMessage;
  x: GxDict;
  lang: LangId;
  grouped: boolean;
  onReport: () => void;
}> = ({ m, x, lang, grouped, onReport }) => {
  const [expanded, setExpanded] = useState(false);
  const long = m.content.length > COLLAPSE_CHARS || m.content.split('\n').length > 7;
  const text = long && !expanded ? m.content.slice(0, COLLAPSE_CHARS).trimEnd() + '…' : m.content;
  return (
    <div
      className={`group flex gap-2.5 px-3 sm:px-4 ${grouped ? 'pt-0.5' : 'pt-3'} pb-0.5 hover:bg-[#0F1828]/60`}
      data-testid="chat-message"
      data-id={m.id}
    >
      <div className="w-[34px] shrink-0">{!grouped && <Avatar name={m.sender_name} />}</div>
      <div className="flex-1 min-w-0">
        {!grouped && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[13px] font-bold ${m.mine ? 'text-[#2DD4BF]' : 'text-[#E8EEF9]'}`}>{m.sender_name}</span>
            {m.mine && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2DD4BF]/15 text-[#2DD4BF]">{x.c_mine}</span>}
            <time className="text-[10px] text-[#64748B]" dateTime={m.created_at}>
              {timeLabel(m.created_at, lang)}
            </time>
          </div>
        )}
        <div className="flex items-start gap-1">
          <div className="flex-1 min-w-0">
            <p className="text-[13px] leading-[1.75] text-[#CBD5E1] whitespace-pre-line break-words" dir="auto">
              {text}
            </p>
            {long && (
              <button
                onClick={() => setExpanded((v) => !v)}
                className="text-[11px] text-[#2DD4BF] hover:underline cursor-pointer"
                aria-expanded={expanded}
              >
                {expanded ? x.c_showLess : x.c_showMore}
              </button>
            )}
            {(m.symbol_tag || (m.sentiment && m.sentiment !== 'neutral') || m.is_flagged) && (
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                {m.symbol_tag && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#1C2740] text-[#A3B4D0] font-mono" dir="ltr">
                    #{m.symbol_tag}
                  </span>
                )}
                <SentimentChip s={m.sentiment} x={x} />
                {m.is_flagged && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300">
                    <AlertTriangle className="w-3 h-3" /> {x.c_flagged}
                  </span>
                )}
              </div>
            )}
          </div>
          {!m.mine && (
            <div className="opacity-100 lg:opacity-0 lg:group-hover:opacity-100 lg:focus-within:opacity-100 transition-opacity">
              <ItemMenu x={x} onReport={onReport} label={x.c_moreActions} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const Composer: React.FC<{
  x: GxDict;
  channelName: string;
  onSend: (text: string, tag: string, sentiment: Sentiment) => Promise<boolean>;
}> = ({ x, channelName, onSend }) => {
  const [text, setText] = useState('');
  const [tag, setTag] = useState('');
  const [sentiment, setSentiment] = useState<Sentiment>('neutral');
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  const linkWarn = containsLink(text);
  const over = text.length > MESSAGE_MAX_CHARS;
  const empty = text.trim().length === 0;

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 132)}px`;
  }, [text]);

  const send = async () => {
    if (busy || empty || over || linkWarn) return;
    setBusy(true);
    const ok = await onSend(text, tag, sentiment);
    setBusy(false);
    if (ok) {
      setText('');
      setSentiment('neutral');
      ref.current?.focus();
    }
  };

  const sentBtn = (s: Sentiment, icon: React.ReactNode, label: string, tone: string) => (
    <button
      type="button"
      onClick={() => setSentiment(s)}
      aria-pressed={sentiment === s}
      title={label}
      className={`min-h-[30px] px-2 rounded-lg text-[11px] flex items-center gap-1 border cursor-pointer ${
        sentiment === s ? tone : 'border-[#24344E] text-[#7B8DA8] hover:text-[#CBD5E1]'
      }`}
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <div className="border-t border-[#1E283D] bg-[#0B1220] p-2.5 sm:p-3 space-y-2" data-testid="composer">
      <div className="flex items-center gap-1.5 flex-wrap">
        <select
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          aria-label={x.c_tagSymbol}
          className="min-h-[30px] rounded-lg bg-[#0F1828] border border-[#24344E] px-2 text-[11px] text-[#CBD5E1] font-mono"
          dir="ltr"
        >
          <option value="">{x.c_noTag}</option>
          {TAG_SYMBOLS.map((s) => (
            <option key={s} value={s}>
              #{s}
            </option>
          ))}
        </select>
        <span className="text-[11px] text-[#64748B] ms-1">{x.c_myView}</span>
        {sentBtn('bullish', <TrendingUp className="w-3.5 h-3.5" />, x.c_sentUp, 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200')}
        {sentBtn('bearish', <TrendingDown className="w-3.5 h-3.5" />, x.c_sentDown, 'border-rose-400/60 bg-rose-500/15 text-rose-200')}
        {sentBtn('neutral', <Minus className="w-3.5 h-3.5" />, x.c_sentFlat, 'border-[#2DD4BF]/50 bg-[#2DD4BF]/10 text-[#CFFAFE]')}
      </div>
      <div className="flex items-end gap-2">
        <textarea
          ref={ref}
          value={text}
          rows={1}
          dir="auto"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia?.('(pointer: fine)').matches) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder={fmt(x.c_composerPh, { ch: channelName })}
          aria-label={x.c_composerLabel}
          className="flex-1 min-h-[44px] max-h-[132px] resize-none rounded-xl bg-[#0F1828] border border-[#24344E] focus:border-[#2DD4BF] outline-none px-3 py-2.5 text-[13px] leading-6 text-[#E8EEF9]"
        />
        <button
          onClick={() => void send()}
          disabled={busy || empty || over || linkWarn}
          aria-label={x.c_send}
          className="w-11 h-11 rounded-xl bg-[#2DD4BF] text-[#042F2E] flex items-center justify-center disabled:opacity-40 cursor-pointer shrink-0"
          data-testid="send-btn"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 rtl:-scale-x-100" />}
        </button>
      </div>
      <div className="flex items-center justify-between gap-2 text-[11px] min-h-[16px]">
        <span className={linkWarn ? 'text-amber-300' : 'text-[#64748B]'} data-testid="composer-hint">
          {linkWarn ? x.c_errLinks : x.c_composerHint}
        </span>
        <span className={`font-mono shrink-0 ${over ? 'text-rose-300' : text.length > MESSAGE_MAX_CHARS * 0.9 ? 'text-amber-300' : 'text-[#64748B]'}`} dir="ltr" data-testid="char-count">
          {text.length}/{MESSAGE_MAX_CHARS}
        </span>
      </div>
    </div>
  );
};

export const CommunityScreen: React.FC<CommunityScreenProps> = ({ currentLang = 'ar', onNavigate }) => {
  const x = gx(currentLang);
  const user = useSessionUser();
  const [channels, setChannels] = useState<CommunityChannel[]>(DEFAULT_CHANNELS);
  const [channelId, setChannelId] = useState<string>(readSavedChannel);
  const [mobileTab, setMobileTab] = useState<MobileTab>('messages');
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [msgState, setMsgState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [msgError, setMsgError] = useState<CommunityErrorCode | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [report, setReport] = useState<
    { kind: 'channel_message' | 'vote'; id: string; preview: string } | null
  >(null);
  const [toastState, setToastState] = useState<{ text: string; kind: ToastKind } | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const channelRef = useRef(channelId);
  channelRef.current = channelId;

  const toast = useCallback((text: string, kind: ToastKind = 'info') => setToastState({ text, kind }), []);
  const goLogin = useCallback(() => onNavigate?.('account'), [onNavigate]);

  const activeChannel = channels.find((c) => c.id === channelId) || channels[0] || DEFAULT_CHANNELS[0];
  const activeText = channelText(x, activeChannel);

  useEffect(() => {
    try {
      localStorage.setItem(CHANNEL_KEY, channelId);
    } catch {
      // storage blocked
    }
  }, [channelId]);

  // Channels (need an account on the server; the static list is shown meanwhile).
  useEffect(() => {
    if (!user) return;
    let alive = true;
    void fetchChannels().then((r) => {
      if (!alive || !r.ok) return;
      setChannels(r.channels);
      if (!r.channels.some((c) => c.id === channelRef.current)) setChannelId(r.channels[0].id);
    });
    return () => {
      alive = false;
    };
  }, [user?.user_id]);

  const scrollToBottom = useCallback((smooth = false) => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
    atBottomRef.current = true;
    setNewCount(0);
  }, []);

  // Initial page of the channel.
  const loadChannel = useCallback(async () => {
    if (!user) return;
    setMsgState('loading');
    setMessages([]);
    setNewCount(0);
    const ch = channelId;
    const r = await fetchChannelMessages(ch);
    if (channelRef.current !== ch) return;
    if (r.ok) {
      setMessages(r.messages);
      setHasMore(r.hasMore);
      setMsgState('ready');
      requestAnimationFrame(() => scrollToBottom(false));
    } else {
      setMsgError(r.error);
      setMsgState('error');
    }
  }, [channelId, user, scrollToBottom]);

  useEffect(() => {
    void loadChannel();
  }, [loadChannel]);

  // Poll for new messages while the screen is visible.
  useEffect(() => {
    if (!user || msgState !== 'ready') return;
    const ch = channelId;
    const t = setInterval(async () => {
      if (document.hidden) return;
      const r = await fetchChannelMessages(ch);
      if (!r.ok || channelRef.current !== ch) return;
      setMessages((prev) => {
        const known = new Set(prev.map((m) => m.id));
        const fresh = r.messages.filter((m) => !known.has(m.id));
        if (fresh.length === 0) return prev;
        if (!atBottomRef.current) setNewCount((n) => n + fresh.filter((m) => !m.mine).length);
        return [...prev, ...fresh];
      });
    }, POLL_MS);
    return () => clearInterval(t);
  }, [user, msgState, channelId]);

  // Keep the view pinned to the bottom only when the reader is already there.
  useLayoutEffect(() => {
    if (atBottomRef.current) {
      const el = listRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }, [messages.length]);

  const onScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    atBottomRef.current = atBottom;
    if (atBottom && newCount) setNewCount(0);
  };

  const loadOlder = async () => {
    if (loadingOlder || messages.length === 0) return;
    const el = listRef.current;
    const before = el ? el.scrollHeight - el.scrollTop : 0;
    setLoadingOlder(true);
    const ch = channelId;
    const oldest = messages[0].id;
    const r = await fetchChannelMessages(ch, { beforeId: oldest, limit: PAGE_SIZE });
    setLoadingOlder(false);
    if (channelRef.current !== ch) return;
    if (!r.ok) {
      toast(errorText(x, r.error), 'error');
      return;
    }
    atBottomRef.current = false;
    setMessages((prev) => {
      const known = new Set(prev.map((m) => m.id));
      return [...r.messages.filter((m) => !known.has(m.id)), ...prev];
    });
    setHasMore(r.hasMore);
    requestAnimationFrame(() => {
      const el2 = listRef.current;
      if (el2) el2.scrollTop = el2.scrollHeight - before;
    });
  };

  const send = async (text: string, tag: string, sentiment: Sentiment): Promise<boolean> => {
    const r = await postChannelMessage(channelId, {
      content: text,
      symbol_tag: tag || undefined,
      sentiment,
    });
    if (r.ok && r.message) {
      atBottomRef.current = true;
      setMessages((prev) => (prev.some((m) => m.id === r.message!.id) ? prev : [...prev, r.message!]));
      requestAnimationFrame(() => scrollToBottom(true));
      return true;
    }
    if (r.error === 'login_required') {
      toast(x.c_loginToChat, 'info');
      return false;
    }
    toast(errorText(x, r.error), 'error');
    return false;
  };

  const visibleMessages = useMemo(
    () => messages.filter((m) => !hidden.has(`channel_message:${m.id}`)),
    [messages, hidden]
  );
  const hiddenIdeaIds = useMemo(() => {
    const s = new Set<string>();
    hidden.forEach((k) => {
      if (k.startsWith('vote:')) s.add(k.slice(5));
    });
    return s;
  }, [hidden]);

  const openReportIdea = useCallback((i: TradeIdea) => {
    setReport({ kind: 'vote', id: i.id, preview: `${i.symbol} — ${i.note || ''}`.trim() });
  }, []);

  const selectChannel = (id: string) => {
    setChannelId(id);
    setMobileTab('messages');
  };

  // ---------------------------------------------------------------------------------------------
  const channelList = (
    <nav aria-label={x.c_channels} className="p-2 space-y-1">
      <div className="px-2 pt-1 pb-2 text-[11px] font-semibold text-[#64748B] uppercase tracking-wide">{x.c_channels}</div>
      {channels.map((ch) => {
        const t = channelText(x, ch);
        const active = ch.id === channelId;
        return (
          <button
            key={ch.id}
            onClick={() => selectChannel(ch.id)}
            aria-current={active ? 'page' : undefined}
            className={`w-full text-start rounded-xl px-3 py-2.5 min-h-[48px] flex items-start gap-2 cursor-pointer transition-colors ${
              active ? 'bg-[#13283A] text-[#E8EEF9] border border-[#2DD4BF]/40' : 'text-[#A3B4D0] hover:bg-[#121C2E] border border-transparent'
            }`}
            data-testid={`channel-${ch.id}`}
          >
            <Hash className={`w-4 h-4 mt-0.5 shrink-0 ${active ? 'text-[#2DD4BF]' : 'text-[#64748B]'}`} />
            <span className="min-w-0">
              <span className="block text-[13px] font-semibold truncate">{t.name}</span>
              <span className="block text-[11px] text-[#64748B] leading-snug line-clamp-2">{t.desc}</span>
            </span>
          </button>
        );
      })}
      <div className="mx-2 mt-3 p-3 rounded-xl bg-[#0F1828] border border-[#1E283D] text-[11px] text-[#7B8DA8] leading-relaxed flex gap-2">
        <ShieldCheck className="w-4 h-4 text-[#2DD4BF] shrink-0" />
        <span>{x.c_rulesShort}</span>
      </div>
    </nav>
  );

  const groups: { key: string; label: string; items: CommunityMessage[] }[] = [];
  visibleMessages.forEach((m) => {
    const d = new Date(m.created_at);
    const k = Number.isNaN(d.getTime()) ? 'unknown' : dayKey(d);
    const last = groups[groups.length - 1];
    if (last && last.key === k) last.items.push(m);
    else groups.push({ key: k, label: Number.isNaN(d.getTime()) ? '' : dayLabel(d, currentLang, x), items: [m] });
  });

  const messagesPane = (
    <section className="flex flex-col h-full min-h-0 relative" aria-label={x.c_messages}>
      <header className="px-3 sm:px-4 py-2.5 border-b border-[#1E283D] bg-[#0B1220] flex items-center gap-2">
        <Hash className="w-4 h-4 text-[#2DD4BF] shrink-0" />
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-[#E8EEF9] truncate" data-testid="channel-title">
            {activeText.name}
          </h2>
          <p className="text-[11px] text-[#64748B] truncate">{activeText.desc}</p>
        </div>
      </header>

      {!user ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-sm w-full space-y-3">
            <EmptyState
              currentLang={currentLang}
              icon={<Users className="w-6 h-6 text-[#2DD4BF]" />}
              title={x.c_guestTitle}
              message={x.c_guestText}
            />
            <LoginRequired x={x} text={x.c_loginToChat} onLogin={goLogin} />
          </div>
        </div>
      ) : (
        <>
          <div ref={listRef} onScroll={onScroll} className="flex-1 min-h-0 overflow-y-auto pb-2" data-testid="message-list">
            {msgState === 'loading' ? (
              <LoadingSkeleton rows={6} />
            ) : msgState === 'error' ? (
              msgError === 'login_required' ? (
                <div className="p-4">
                  <LoginRequired x={x} text={x.c_sessionExpired} onLogin={goLogin} />
                </div>
              ) : (
                <ErrorState
                  currentLang={currentLang}
                  title={x.c_loadErrorTitle}
                  message={msgError === 'network' ? x.c_serverUnreachable : x.g_serverError}
                  onRetry={() => void loadChannel()}
                />
              )
            ) : visibleMessages.length === 0 ? (
              <EmptyState
                currentLang={currentLang}
                icon={<MessageSquare className="w-6 h-6 text-[#2DD4BF]" />}
                title={x.c_emptyTitle}
                message={fmt(x.c_emptyText, { ch: activeText.name })}
              />
            ) : (
              <>
                {hasMore && (
                  <div className="flex justify-center pt-3">
                    <button
                      onClick={() => void loadOlder()}
                      disabled={loadingOlder}
                      className="min-h-[36px] px-4 rounded-full bg-[#121C2E] border border-[#24344E] text-[11px] text-[#A3B4D0] hover:text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                      data-testid="load-older"
                    >
                      {loadingOlder ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ChevronUp className="w-3.5 h-3.5" />}
                      {x.c_loadOlder}
                    </button>
                  </div>
                )}
                {groups.map((g) => (
                  <div key={g.key} role="group" aria-label={g.label}>
                    {g.label && (
                      <div className="sticky top-0 z-10 flex justify-center py-2 pointer-events-none">
                        <span className="px-3 py-1 rounded-full bg-[#121C2E]/95 border border-[#1E283D] text-[10px] text-[#94A3B8] backdrop-blur">
                          {g.label}
                        </span>
                      </div>
                    )}
                    {g.items.map((m, i) => {
                      const prev = g.items[i - 1];
                      const grouped =
                        !!prev &&
                        prev.sender_name === m.sender_name &&
                        new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 5 * 60 * 1000;
                      return (
                        <MessageItem
                          key={m.id}
                          m={m}
                          x={x}
                          lang={currentLang}
                          grouped={grouped}
                          onReport={() => setReport({ kind: 'channel_message', id: m.id, preview: m.content })}
                        />
                      );
                    })}
                  </div>
                ))}
              </>
            )}
          </div>
          {newCount > 0 && (
            <button
              onClick={() => scrollToBottom(true)}
              className="absolute bottom-[132px] left-1/2 -translate-x-1/2 z-20 px-3.5 min-h-[34px] rounded-full bg-[#2DD4BF] text-[#042F2E] text-[11px] font-bold shadow-xl flex items-center gap-1 cursor-pointer"
              data-testid="new-messages-pill"
            >
              {fmt(x.c_newMessages, { n: newCount })} <ArrowDown className="w-3.5 h-3.5" />
            </button>
          )}
          <Composer x={x} channelName={activeText.name} onSend={send} />
        </>
      )}
    </section>
  );

  const ideasPane = (
    <IdeasPanel
      x={x}
      lang={currentLang}
      user={user}
      onLogin={goLogin}
      onReport={openReportIdea}
      hiddenIds={hiddenIdeaIds}
      toast={toast}
      symbols={IDEA_SYMBOLS}
    />
  );

  const tabBtn = (id: MobileTab, icon: React.ReactNode, label: string) => (
    <button
      role="tab"
      aria-selected={mobileTab === id}
      onClick={() => setMobileTab(id)}
      className={`flex-1 min-h-[44px] flex items-center justify-center gap-1.5 text-xs font-semibold border-b-2 cursor-pointer ${
        mobileTab === id ? 'border-[#2DD4BF] text-[#E8EEF9]' : 'border-transparent text-[#7B8DA8]'
      }`}
      data-testid={`ctab-${id}`}
    >
      {icon}
      {label}
    </button>
  );

  return (
    <div className="h-full flex flex-col bg-[#070D18] text-[#E8EEF9]" data-testid="community-screen">
      <div className="lg:hidden flex bg-[#0B1220] border-b border-[#1E283D]" role="tablist" aria-label={x.c_title}>
        {tabBtn('channels', <Hash className="w-4 h-4" />, x.c_channels)}
        {tabBtn('messages', <MessageSquare className="w-4 h-4" />, x.c_messages)}
        {tabBtn('ideas', <Lightbulb className="w-4 h-4" />, x.c_ideasTab)}
      </div>
      <div className="flex-1 min-h-0 lg:grid lg:grid-cols-[230px_minmax(0,1fr)_330px] xl:grid-cols-[250px_minmax(0,1fr)_370px]">
        <aside
          className={`${mobileTab === 'channels' ? 'block' : 'hidden'} lg:block h-full overflow-y-auto bg-[#0A111E] lg:border-e border-[#1E283D]`}
        >
          {channelList}
        </aside>
        <div className={`${mobileTab === 'messages' ? 'flex' : 'hidden'} lg:flex flex-col h-full min-h-0`}>{messagesPane}</div>
        <aside
          className={`${mobileTab === 'ideas' ? 'flex' : 'hidden'} lg:flex flex-col h-full min-h-0 bg-[#0A111E] lg:border-s border-[#1E283D]`}
        >
          {ideasPane}
        </aside>
      </div>

      {report && (
        <ReportDialog
          x={x}
          kind={report.kind}
          targetId={report.id}
          preview={report.preview}
          onClose={() => setReport(null)}
          onLoginRequired={() => {
            setReport(null);
            toast(x.c_loginToReport, 'info');
          }}
          onReported={(res) => {
            setHidden((prev) => new Set(prev).add(`${report.kind}:${report.id}`));
            setReport(null);
            toast(res === 'already' ? x.c_reportAlready : x.c_reportThanks, 'ok');
          }}
        />
      )}
      {toastState && <Toast text={toastState.text} kind={toastState.kind} onClose={() => setToastState(null)} />}
    </div>
  );
};
