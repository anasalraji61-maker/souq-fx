import React, { useState } from 'react';
import { MessageSquare, Send, Users, TrendingUp, TrendingDown, ShieldAlert, Award, Hash, ThumbsUp, Sparkles, Filter } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: string;
  badge: 'VIP Member' | 'Pro Analyst' | 'Community' | 'AI Sentinel';
  avatarBg: string;
  time: string;
  room: 'forex' | 'gold' | 'indices';
  content: string;
  sentiment?: 'bullish' | 'bearish' | 'neutral';
  likes: number;
  symbolTag?: string;
}

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'طارق الزهراني',
    badge: 'Pro Analyst',
    avatarBg: 'bg-emerald-600',
    time: 'منذ 4 دقائق',
    room: 'forex',
    content: 'زوج EURUSD يحترم منطقة الدعم 1.0845 مع تشبع بيعي على مؤشر RSI فريم 15 دقيقة. إمكانية تصحيح صاعد نحو 1.0890.',
    sentiment: 'bullish',
    likes: 14,
    symbolTag: 'EURUSD',
  },
  {
    id: 'msg-2',
    sender: 'MATRIX AI Sentinel',
    badge: 'AI Sentinel',
    avatarBg: 'bg-cyan-600',
    time: 'منذ 8 دقائق',
    room: 'forex',
    content: 'رصد تذبذب سعري مرتفع قبل افتتاح الجلسة الأمريكية. يرجى مراعاة حجم العقود وعدم الإفراط في الرافعة المالية.',
    sentiment: 'neutral',
    likes: 29,
  },
  {
    id: 'msg-3',
    sender: 'خالد المنصوري',
    badge: 'VIP Member',
    avatarBg: 'bg-amber-600',
    time: 'منذ 12 دقيقة',
    room: 'gold',
    content: 'الذهب XAUUSD اخترق مقاومة 2745 بثبات، والهدف التالي حسب مستويات فيبوناتشي عند 2760.',
    sentiment: 'bullish',
    likes: 22,
    symbolTag: 'XAUUSD',
  },
  {
    id: 'msg-4',
    sender: 'سعد العتيبي',
    badge: 'Community',
    avatarBg: 'bg-blue-600',
    time: 'منذ 18 دقيقة',
    room: 'indices',
    content: 'مؤشر داو جونز US30 يتماسك فوق 42,000 نقطة، في انتظار افتتاح وول ستريت لتأكيد استمرار الزخم الصاعد.',
    sentiment: 'neutral',
    likes: 8,
    symbolTag: 'US30',
  },
];

export const CommunityScreen: React.FC = () => {
  const [activeRoom, setActiveRoom] = useState<'forex' | 'gold' | 'indices'>('forex');
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [userSentiment, setUserSentiment] = useState<'bullish' | 'bearish' | 'neutral'>('bullish');
  const [selectedTag, setSelectedTag] = useState<string>('EURUSD');

  const filteredMessages = messages.filter((m) => m.room === activeRoom);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const newMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      sender: 'أنت (متداول نشط)',
      badge: 'VIP Member',
      avatarBg: 'bg-teal-600',
      time: 'الآن',
      room: activeRoom,
      content: inputText.trim(),
      sentiment: userSentiment,
      likes: 0,
      symbolTag: selectedTag,
    };

    setMessages([newMsg, ...messages]);
    setInputText('');
  };

  const handleLike = (id: string) => {
    setMessages(
      messages.map((m) => (m.id === id ? { ...m, likes: m.likes + 1 } : m))
    );
  };

  return (
    <div className="h-full flex flex-col md:flex-row bg-[#08101E] text-[#E2E8F0] overflow-hidden">
      {/* Side Channels Bar */}
      <div className="w-full md:w-64 bg-[#0B1528] border-r border-[#1E293B] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#1E293B]">
          <div className="flex items-center gap-2 text-sm font-bold text-white">
            <MessageSquare className="w-4 h-4 text-[#2DD4BF]" />
            <h2>غرف نقاش المتداولين</h2>
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">
            تبادل التحليلات الفنية اللحظية مع نخبة المتداولين
          </p>
        </div>

        {/* Room Navigation */}
        <div className="p-3 space-y-1.5 flex-1">
          <button
            onClick={() => {
              setActiveRoom('forex');
              setSelectedTag('EURUSD');
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
              activeRoom === 'forex'
                ? 'bg-[#2DD4BF]/15 text-[#2DD4BF] border border-[#2DD4BF]/40 font-bold'
                : 'text-[#94A3B8] hover:bg-[#132038] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Hash className="w-4 h-4" />
              <span>غرفة العملات والفوركس</span>
            </div>
            <span className="text-[10px] bg-[#1E293B] px-1.5 py-0.5 rounded text-[#94A3B8]">
              128 متصل
            </span>
          </button>

          <button
            onClick={() => {
              setActiveRoom('gold');
              setSelectedTag('XAUUSD');
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
              activeRoom === 'gold'
                ? 'bg-[#2DD4BF]/15 text-[#2DD4BF] border border-[#2DD4BF]/40 font-bold'
                : 'text-[#94A3B8] hover:bg-[#132038] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Hash className="w-4 h-4" />
              <span>غرفة الذهب والمعادن (XAU)</span>
            </div>
            <span className="text-[10px] bg-[#1E293B] px-1.5 py-0.5 rounded text-[#94A3B8]">
              214 متصل
            </span>
          </button>

          <button
            onClick={() => {
              setActiveRoom('indices');
              setSelectedTag('US30');
            }}
            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all ${
              activeRoom === 'indices'
                ? 'bg-[#2DD4BF]/15 text-[#2DD4BF] border border-[#2DD4BF]/40 font-bold'
                : 'text-[#94A3B8] hover:bg-[#132038] hover:text-white'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <Hash className="w-4 h-4" />
              <span>غرفة المؤشرات العالمية والأسهم</span>
            </div>
            <span className="text-[10px] bg-[#1E293B] px-1.5 py-0.5 rounded text-[#94A3B8]">
              95 متصل
            </span>
          </button>
        </div>

        {/* Disclaimer Card */}
        <div className="p-3 m-3 rounded-lg bg-[#0F1D35] border border-[#1E2E4A] text-[10px] text-[#94A3B8] space-y-1.5">
          <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>ميثاق النقاش الفني</span>
          </div>
          <p className="leading-relaxed">
            الآراء المعروضة هي تحليلات شخصية للمتداولين ولا تعد نصائح مالية أو توصيات شراء وبيع.
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
              {activeRoom === 'forex' && 'غرفة الفوركس والعملات الرئيسية (EUR, GBP, JPY)'}
              {activeRoom === 'gold' && 'غرفة تداولات الذهب والنفط (XAUUSD, USOIL)'}
              {activeRoom === 'indices' && 'غرفة المؤشرات العالمية الرئيسية (US30, NAS100, DAX)'}
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
            <Users className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">أعضاء نشطون الآن:</span>
            <span className="font-mono text-white font-bold">437</span>
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {filteredMessages.map((msg) => (
            <div
              key={msg.id}
              className="p-3.5 rounded-xl bg-[#0D182E] border border-[#1E2A44] hover:border-[#2C3E63] transition-all flex flex-col gap-2"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-7 h-7 rounded-lg ${msg.avatarBg} flex items-center justify-center font-bold text-white text-xs`}
                  >
                    {msg.sender.charAt(0)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">{msg.sender}</span>
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
                    </div>
                    <span className="text-[10px] text-[#64748B]">{msg.time}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {msg.symbolTag && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#16233B] text-[#2DD4BF] border border-[#243657]">
                      {msg.symbolTag}
                    </span>
                  )}
                  {msg.sentiment === 'bullish' && (
                    <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                      <TrendingUp className="w-3 h-3" />
                      <span>صاعد</span>
                    </span>
                  )}
                  {msg.sentiment === 'bearish' && (
                    <span className="flex items-center gap-1 text-[10px] text-rose-400 bg-rose-950/60 px-2 py-0.5 rounded border border-rose-800/60">
                      <TrendingDown className="w-3 h-3" />
                      <span>هابط</span>
                    </span>
                  )}
                </div>
              </div>

              <p className="text-xs text-[#CBD5E1] leading-relaxed pr-9">{msg.content}</p>

              <div className="flex items-center justify-between pr-9 pt-1 text-[11px] text-[#64748B]">
                <button
                  onClick={() => handleLike(msg.id)}
                  className="flex items-center gap-1 hover:text-[#2DD4BF] transition-colors"
                >
                  <ThumbsUp className="w-3 h-3" />
                  <span>{msg.likes}</span>
                </button>
                <span className="text-[10px] text-[#475569]">نقاش فني تحليلي</span>
              </div>
            </div>
          ))}
        </div>

        {/* Message Input Box */}
        <form
          onSubmit={handleSendMessage}
          className="p-3 bg-[#0B1528] border-t border-[#1E293B] flex flex-col gap-2 shrink-0"
        >
          <div className="flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <span className="text-[#94A3B8]">النظرة الفنية:</span>
              <button
                type="button"
                onClick={() => setUserSentiment('bullish')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                  userSentiment === 'bullish'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#16233B] text-[#94A3B8]'
                }`}
              >
                صاعد (Bullish)
              </button>
              <button
                type="button"
                onClick={() => setUserSentiment('bearish')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                  userSentiment === 'bearish'
                    ? 'bg-rose-600 text-white'
                    : 'bg-[#16233B] text-[#94A3B8]'
                }`}
              >
                هابط (Bearish)
              </button>
              <button
                type="button"
                onClick={() => setUserSentiment('neutral')}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all ${
                  userSentiment === 'neutral'
                    ? 'bg-blue-600 text-white'
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
                className="bg-[#16233B] border border-[#243657] rounded px-2 py-0.5 text-[10px] text-white focus:outline-none"
              >
                <option value="EURUSD">EURUSD</option>
                <option value="GBPUSD">GBPUSD</option>
                <option value="USDJPY">USDJPY</option>
                <option value="XAUUSD">XAUUSD</option>
                <option value="US30">US30 (Dow Jones)</option>
                <option value="NAS100">NAS100 (Nasdaq)</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="اكتب تحليلك الفني أو ملاحظتك على الشارت..."
              className="flex-1 bg-[#070E1C] border border-[#1E293B] rounded-lg px-3.5 py-2 text-xs text-white placeholder-[#64748B] focus:outline-none focus:border-[#2DD4BF]"
            />
            <button
              type="submit"
              className="px-4 py-2 bg-[#2DD4BF] hover:bg-[#14B8A6] text-[#042F2E] font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-md active:scale-95"
            >
              <span>إرسال</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
