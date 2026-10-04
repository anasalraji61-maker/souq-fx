import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare,
  Send,
  Users,
  TrendingUp,
  TrendingDown,
  ShieldAlert,
  Hash,
  ThumbsUp,
  AlertTriangle,
  RotateCcw,
  Clock,
  CheckCircle2,
  AlertCircle,
  Menu,
  X,
} from 'lucide-react';
import {
  CommunityChannel,
  CommunityMessage,
  fetchChannels,
  fetchChannelMessages,
  postChannelMessage,
  DEFAULT_CHANNELS,
} from '../../api/community';
import { OfflineBadge } from '../common/OfflineBadge';
import { LoadingSkeleton, EmptyState, ErrorState } from '../common/ScreenState';

export const CommunityScreen: React.FC = () => {
  const [channels, setChannels] = useState<CommunityChannel[]>(DEFAULT_CHANNELS);
  const [activeChannelId, setActiveChannelId] = useState<string>('forex');
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [userSentiment, setUserSentiment] = useState<'bullish' | 'bearish' | 'neutral'>('bullish');
  const [selectedTag, setSelectedTag] = useState<string>('EURUSD');

  // Screen states
  const [isLoadingChannels, setIsLoadingChannels] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Rate limit toast (2.3)
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Mobile sidebar drawer
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const composerInputRef = useRef<HTMLInputElement>(null);

  // Helper to trigger Arabic toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 4000);
  };

  // Scroll to bottom (newest at bottom) (2.1)
  const scrollToBottom = useCallback((smooth = true) => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
    }
  }, []);

  // Load Channels
  const loadChannels = useCallback(async () => {
    setIsLoadingChannels(true);
    setIsError(false);
    try {
      const res = await fetchChannels();
      setChannels(res.channels);
      setIsOffline(res.isOffline);
    } catch {
      setIsError(true);
    } finally {
      setIsLoadingChannels(false);
    }
  }, []);

  // Load Messages for active channel
  const loadMessages = useCallback(
    async (isBackgroundPoll = false) => {
      if (!isBackgroundPoll) {
        setIsLoadingMessages(true);
      }
      try {
        const res = await fetchChannelMessages(activeChannelId);
        setMessages(res.messages);
        if (res.isOffline) {
          setIsOffline(true);
        }
        if (!isBackgroundPoll) {
          setTimeout(() => scrollToBottom(false), 50);
        }
      } catch {
        if (!isBackgroundPoll) {
          setIsError(true);
        }
      } finally {
        if (!isBackgroundPoll) {
          setIsLoadingMessages(false);
        }
      }
    },
    [activeChannelId, scrollToBottom]
  );

  // Initial load
  useEffect(() => {
    loadChannels();
  }, [loadChannels]);

  // Load messages when channel changes
  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  // 2.4 Poll new messages every 5s ONLY while the screen / document is visible
  useEffect(() => {
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
        loadMessages(true);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [loadMessages]);

  // Handle Send Message (Enter to send, 2.1 & 2.3 429 rate limit handling)
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    try {
      const res = await postChannelMessage(activeChannelId, {
        content: trimmed,
        sentiment: userSentiment,
        symbol_tag: selectedTag,
        sender_name: 'أنت (متداول نشط)',
      });

      // 2.3 Handle 429 rate limit: show toast "تمهّل قليلاً" and keep the draft
      if (res.status === 429 || (!res.ok && res.error?.includes('429'))) {
        showToast('تمهّل قليلاً، تم تجاوز حد إرسال الرسائل. يُرجى الانتظار بضع ثوانٍ.');
        return; // draft preserved in inputText
      }

      if (res.ok && res.message) {
        setMessages((prev) => [...prev, res.message!]);
        setInputText(''); // clear draft on success
        setTimeout(() => scrollToBottom(true), 50);
      } else {
        showToast(res.error || 'تعذر إرسال الرسالة، يرجى المحاولة لاحقاً');
      }
    } catch {
      showToast('حدث خطأ في الاتصال، تم الاحتفاظ بالمسودة');
    } finally {
      setIsSending(false);
      composerInputRef.current?.focus();
    }
  };

  const handleLike = (id: string) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === id ? { ...m, likes: m.likes + 1 } : m))
    );
  };

  // 2.2 Highlight @mentions in message content
  const renderMessageContent = (text: string) => {
    const parts = text.split(/(@[^\s@]+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@')) {
        return (
          <span
            key={i}
            className="font-bold text-[#38BDF8] bg-[#38BDF8]/15 px-1.5 py-0.5 rounded mx-0.5 inline-block text-xs"
          >
            {part}
          </span>
        );
      }
      return <span key={i}>{part}</span>;
    });
  };

  const activeChannel = channels.find((c) => c.id === activeChannelId) || channels[0];

  return (
    <div className="h-full flex flex-col md:flex-row bg-[#08101E] text-[#E2E8F0] overflow-hidden select-none text-xs relative">
      {/* 2.3 Toast for Rate Limit / Alerts */}
      {toastMessage && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500/90 text-[#0F172A] font-bold text-xs shadow-2xl backdrop-blur-md border border-amber-300 animate-in fade-in slide-in-from-top-3">
          <AlertCircle className="w-4 h-4 shrink-0 text-[#0F172A]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Mobile Channel Switcher Top Bar (< 768px) */}
      <div className="md:hidden flex items-center justify-between p-3 bg-[#0A1222] border-b border-[#1E293B] shrink-0">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="p-1.5 rounded-lg bg-[#141F33] text-[#2DD4BF] border border-[#24334E]"
          >
            {isMobileSidebarOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
          </button>
          <div>
            <span className="font-bold text-white text-xs">{activeChannel?.name_ar}</span>
            <span className="text-[10px] text-[#7B8DA8] block">
              {activeChannel?.online_count} متصل
            </span>
          </div>
        </div>
        {isOffline && <OfflineBadge forceShow />}
      </div>

      {/* 2.1 Channels Sidebar */}
      <div
        className={`w-full md:w-64 bg-[#0B1528] border-l md:border-l-0 md:border-r border-[#1E293B] flex flex-col shrink-0 transition-all ${
          isMobileSidebarOpen
            ? 'absolute inset-0 z-40 md:relative'
            : 'hidden md:flex'
        }`}
      >
        <div className="p-4 border-b border-[#1E293B] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <MessageSquare className="w-4 h-4 text-[#2DD4BF]" />
              <h2>غرف نقاش المتداولين</h2>
            </div>
            <p className="text-[11px] text-[#94A3B8] mt-1">
              تبادل التحليلات والفرص الفنية اللحظية
            </p>
          </div>
          {isMobileSidebarOpen && (
            <button
              onClick={() => setIsMobileSidebarOpen(false)}
              className="md:hidden p-1 rounded bg-[#162033] text-[#7B8DA8]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Room Navigation */}
        <div className="p-3 space-y-1.5 flex-1 overflow-y-auto">
          {isLoadingChannels ? (
            <LoadingSkeleton rows={4} />
          ) : (
            channels.map((chan) => {
              const isActive = activeChannelId === chan.id;
              return (
                <button
                  key={chan.id}
                  onClick={() => {
                    setActiveChannelId(chan.id);
                    setIsMobileSidebarOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-medium transition-all text-right ${
                    isActive
                      ? 'bg-[#2DD4BF]/15 text-[#2DD4BF] border border-[#2DD4BF]/40 font-bold shadow-xs'
                      : 'text-[#94A3B8] hover:bg-[#132038] hover:text-white border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Hash className="w-4 h-4 shrink-0 text-[#2DD4BF]" />
                    <div className="truncate">
                      <span className="block truncate">{chan.name_ar}</span>
                      <span className="text-[9px] text-[#64748B] block truncate">
                        {chan.name}
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-[#1E293B] px-1.5 py-0.5 rounded text-[#94A3B8] font-mono shrink-0">
                    {chan.online_count}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Ethics & Risk Disclaimer */}
        <div className="p-3 m-3 rounded-xl bg-[#0F1D35] border border-[#1E2E4A] text-[10px] text-[#94A3B8] space-y-1.5 shrink-0">
          <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>ميثاق النقاش الفني النظيف</span>
          </div>
          <p className="leading-relaxed">
            الآراء المعروضة هي دراسات فنية شخصية. MATRIX لا تقدم نصائح استثمارية وتلتزم بنسبة 0% عملات مشفرة.
          </p>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Chat Header */}
        <div className="h-12 bg-[#0A1222] border-b border-[#1E293B] px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-xs font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{activeChannel?.name_ar}</span>
              <span className="text-[#64748B] font-normal text-[11px] hidden sm:inline">
                ({activeChannel?.description})
              </span>
            </h3>
            {isOffline && <OfflineBadge forceShow />}
          </div>

          <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">المتداولون النشطون:</span>
            <span className="font-mono text-white font-bold">{activeChannel?.online_count || 120}</span>
          </div>
        </div>

        {/* Messages Stream (2.1: Newest at bottom) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {isLoadingMessages ? (
            <LoadingSkeleton rows={5} />
          ) : isError ? (
            <ErrorState
              title="تعذر تحميل رسائل الغرفة"
              message="حدث خطأ في الاتصال بالخادم. يرجى إعادة المحاولة."
              onRetry={() => loadMessages()}
            />
          ) : messages.length === 0 ? (
            <EmptyState
              icon={<MessageSquare className="w-8 h-8 text-[#2DD4BF]" />}
              title="لا توجد رسائل في هذه الغرفة بعد"
              message="كن أول من يشارك تحليله الفني أو يطرح فكرة تداول في هذه الغرفة!"
            />
          ) : (
            messages.map((msg) => {
              // 2.2 Flagged moderation messages shown dimmed with "قيد المراجعة"
              if (msg.is_flagged) {
                return (
                  <div
                    key={msg.id}
                    className="p-3 rounded-xl bg-[#0B1220]/60 border border-dashed border-[#334155] opacity-50 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 text-[#94A3B8]">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      <span className="italic">محتوى هذه الرسالة قيد المراجعة والتدقيق بواسطة الإشراف الآلي</span>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-mono">
                      قيد المراجعة
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={msg.id}
                  className="p-3.5 rounded-xl bg-[#0D182E] border border-[#1E2A44] hover:border-[#2C3E63] transition-all flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-7 h-7 rounded-lg ${
                          msg.avatar_bg || 'bg-teal-600'
                        } flex items-center justify-center font-bold text-white text-xs`}
                      >
                        {msg.sender_name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-white">{msg.sender_name}</span>
                          {msg.badge && (
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                                msg.badge === 'AI Sentinel'
                                  ? 'bg-cyan-950 text-cyan-400 border border-cyan-800'
                                  : msg.badge === 'Pro Analyst'
                                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                  : 'bg-amber-950 text-amber-400 border border-amber-800'
                              }`}
                            >
                              {msg.badge}
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[#64748B] font-mono">{msg.created_at}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {msg.symbol_tag && (
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#16233B] text-[#2DD4BF] border border-[#243657]">
                          {msg.symbol_tag}
                        </span>
                      )}
                      {msg.sentiment === 'bullish' && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60 font-semibold">
                          <TrendingUp className="w-3 h-3" />
                          <span>صاعد</span>
                        </span>
                      )}
                      {msg.sentiment === 'bearish' && (
                        <span className="flex items-center gap-1 text-[10px] text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/60 font-semibold">
                          <TrendingDown className="w-3 h-3" />
                          <span>هابط</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 2.2 Message Content with @mentions highlighting */}
                  <p className="text-xs text-[#CBD5E1] leading-relaxed pr-9">
                    {renderMessageContent(msg.content)}
                  </p>

                  <div className="flex items-center justify-between pr-9 pt-1 text-[11px] text-[#64748B]">
                    <button
                      onClick={() => handleLike(msg.id)}
                      className="flex items-center gap-1 hover:text-[#2DD4BF] transition-colors cursor-pointer"
                    >
                      <ThumbsUp className="w-3 h-3" />
                      <span className="font-mono">{msg.likes}</span>
                    </button>
                    <span className="text-[10px] text-[#475569]">نقاش فني تحليلي</span>
                  </div>
                </div>
              );
            })
          )}
          {/* Scroll anchor for newest at bottom */}
          <div ref={messagesEndRef} />
        </div>

        {/* 2.1 Composer: Enter to send, tags and sentiment */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 bg-[#0B1528] border-t border-[#1E293B] flex flex-col gap-2 shrink-0"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
            <div className="flex items-center gap-2">
              <span className="text-[#94A3B8]">النظرة الفنية:</span>
              <button
                type="button"
                onClick={() => setUserSentiment('bullish')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                  userSentiment === 'bullish'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-[#16233B] text-[#94A3B8]'
                }`}
              >
                صاعد (Bullish)
              </button>
              <button
                type="button"
                onClick={() => setUserSentiment('bearish')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                  userSentiment === 'bearish'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-[#16233B] text-[#94A3B8]'
                }`}
              >
                هابط (Bearish)
              </button>
              <button
                type="button"
                onClick={() => setUserSentiment('neutral')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                  userSentiment === 'neutral'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-[#16233B] text-[#94A3B8]'
                }`}
              >
                محايد (Neutral)
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[#94A3B8]">الرمز:</span>
              <select
                value={selectedTag}
                onChange={(e) => setSelectedTag(e.target.value)}
                className="bg-[#16233B] border border-[#243657] rounded px-2 py-0.5 text-[10px] text-white focus:outline-none cursor-pointer"
              >
                <option value="EURUSD">EURUSD</option>
                <option value="GBPUSD">GBPUSD</option>
                <option value="USDJPY">USDJPY</option>
                <option value="XAUUSD">XAUUSD (الذهب)</option>
                <option value="XAGUSD">XAGUSD (الفضة)</option>
                <option value="USOIL">USOIL (النفط)</option>
                <option value="US30">US30 (داو جونز)</option>
                <option value="NAS100">NAS100 (ناسداك)</option>
                <option value="GER40">GER40 (داكس)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              ref={composerInputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              placeholder="اكتب تحليلك الفني أو وجهة نظرك (اضغط Enter للإرسال، استخدم @ للإشارة للمتداولين)..."
              disabled={isSending}
              className="flex-1 bg-[#070E1C] border border-[#1E293B] rounded-lg px-3.5 py-2 text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#2DD4BF] transition-colors"
            />
            <button
              type="submit"
              disabled={!inputText.trim() || isSending}
              className="px-4 py-2 bg-[#2DD4BF] hover:bg-[#14B8A6] disabled:opacity-40 disabled:pointer-events-none text-[#042F2E] font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <span>{isSending ? 'جارٍ الإرسال...' : 'إرسال'}</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
