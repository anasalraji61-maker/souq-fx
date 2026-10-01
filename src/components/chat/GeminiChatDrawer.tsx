import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Trash2,
  X,
  Bot,
  User,
  Zap,
  BookOpen,
  ShieldCheck,
  TrendingUp,
  RotateCcw,
  Copy,
  Check,
} from 'lucide-react';
import { MarketSymbol } from '../../types/market';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface GeminiChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeSymbol: MarketSymbol;
}

type AnalystRole = 'general' | 'smc' | 'risk' | 'fast';

const ROLE_CONFIGS: Record<
  AnalystRole,
  { name: string; modelName: string; description: string; systemInstruction: string }
> = {
  general: {
    name: 'المحلل الفني الشامل (General Analyst)',
    modelName: 'gemini-3.5-flash',
    description: 'تحليل شامل للشموع، الاتجاه، الدعم والمقاومة، والمؤشرات الفنية',
    systemInstruction: `You are MATRIX AI, a Senior Technical Analyst specialized in Forex, Commodities (Gold/Oil), and Crypto.
Your role: Provide concise, professional, and mathematically sound technical market analysis.
Analyze market structure (Higher Highs / Higher Lows), candlestick patterns, trendlines, and key technical indicators (RSI, Moving Averages, MACD).
Always answer in Arabic if the user asks in Arabic, and in English if the user asks in English.
Structure answers with clear bullet points. Emphasize risk management and state that analysis is educational only, not financial advice.`,
  },
  smc: {
    name: 'خبير كتل الأوامر والسيولة (SMC & ICT)',
    modelName: 'gemini-3.5-flash',
    description: 'تحليل مناطق العرض والطلب، فجوات القيمة العادلة FVG، وتصريف السيولة',
    systemInstruction: `You are the MATRIX SMC / ICT Trading Specialist.
You specialize in Smart Money Concepts, Inner Circle Trader (ICT) methodology, Order Blocks (OB), Fair Value Gaps (FVG), Liquidity Sweeps, Change of Character (CHoCH), and Break of Structure (BOS).
Explain institutional order flow concepts clearly and guide users on how to identify high-probability points of interest (POI). Include risk warnings. Respond in the user's language.`,
  },
  risk: {
    name: 'مستشار إدارة المخاطر ورأس المال (Risk Coach)',
    modelName: 'gemini-3.5-flash',
    description: 'حساب اللوت، نسبة العائد إلى المخاطرة R:R، والتحكم في الخسارة المتتالية',
    systemInstruction: `You are the MATRIX Risk Management and Trading Psychology Coach.
Your mission is to protect the trader's capital above all else.
Help traders calculate exact position sizing, enforce the 1% to 2% max risk per trade rule, calculate optimal Risk-to-Reward (R:R >= 1:2), and manage trading psychology during drawdowns.
Be disciplined, clear, and mathematically accurate. Respond in the user's language.`,
  },
  fast: {
    name: 'المساعد السريع (Fast Flash Lite)',
    modelName: 'gemini-3.1-flash-lite',
    description: 'إجابات خاطفة فائقة السرعة للتعريفات والمصطلحات والحسابات السريعة',
    systemInstruction: `You are MATRIX Fast Assistant powered by gemini-3.1-flash-lite. Provide ultra-fast, direct, and concise answers to financial and technical trading questions. Keep answers compact and focused. Respond in the user's language.`,
  },
};

export const GeminiChatDrawer: React.FC<GeminiChatDrawerProps> = ({
  isOpen,
  onClose,
  activeSymbol,
}) => {
  const [selectedRole, setSelectedRole] = useState<AnalystRole>('general');
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('matrix_ai_chat_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return [
      {
        id: 'msg-welcome',
        role: 'assistant',
        text: `أهلاً بك في **MATRIX AI Assistant**! 📊\n\nأنا مساعدك التحليلي الذكي المتقدم للأسواق المالية. يمكنني مساعدتك في تحليل أزواج العملات، شرح استراتيجيات SMC وICT، قراءة المؤشرات الفنية، أو حساب إدارة المخاطر لحسابك.\n\nالزوج النشط حالياً: **${activeSymbol.symbol}** (سعر العرض: ${activeSymbol.bid} | الفارق: ${activeSymbol.spread} نقطة). بماذا يمكنني مساعدتك اليوم؟`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('matrix_ai_chat_history', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading, isOpen]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputMessage).trim();
    if (!text || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      const config = ROLE_CONFIGS[selectedRole];

      // Prepare conversation history for multi-turn chat
      const apiMessages = updatedMessages.map((m) => ({
        role: m.role,
        text: m.text,
      }));

      // Augment the last user message with live context if relevant
      const contextPrefix = `[Current Terminal Context: Active Symbol=${activeSymbol.symbol}, Price=${activeSymbol.price}, Spread=${activeSymbol.spread} pips, 24h Change=${activeSymbol.change24h}%]\n\n`;
      apiMessages[apiMessages.length - 1].text = contextPrefix + text;

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          systemInstruction: config.systemInstruction,
          role: selectedRole,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        let errMsg = errData.error || `HTTP error ${res.status}`;
        try {
          const parsed = JSON.parse(errMsg);
          if (parsed?.error?.message) {
            errMsg = parsed.error.message;
          }
        } catch {
          // not json string
        }
        throw new Error(errMsg);
      }

      const data = await res.json();
      const replyText = data.reply || 'لم يتم استلام رد من النموذج.';

      const assistantMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        text: `⚠️ عذراً، تعذر الاتصال بمساعد Gemini: ${err.message || 'حدث خطأ في الشبكة'}.\nيرجى التأكد من اتصال الخادم وتكوين مفتاح GEMINI_API_KEY.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearHistory = () => {
    const welcome: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      text: `تم مسح سجل المحادثة. كيف يمكنني مساعدتك في تحليل السوق اليوم؟`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([welcome]);
  };

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const samplePrompts = [
    `حلل لي الزوج الحالي ${activeSymbol.symbol} فنياً الآن`,
    'كيف أحدد مناطق كتل الأوامر (Order Blocks)؟',
    'ما هي أفضل استراتيجية لإدارة المخاطر بحساب $10,000؟',
    'شرح دايفرجنس مؤشر RSI الإيجابي والسلبي',
  ];

  if (!isOpen) return null;

  const currentRoleConfig = ROLE_CONFIGS[selectedRole];

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[480px] bg-[#0A1220] border-l border-[#243049] shadow-2xl flex flex-col text-xs select-none animate-in slide-in-from-right duration-250">
      {/* Top Header */}
      <div className="p-3.5 bg-[#0E1728] border-b border-[#243049] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#2DD4BF] to-[#38BDF8] flex items-center justify-center text-[#042F2E] shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-sm text-[#E8EEF9]">MATRIX AI Analyst</h2>
              <span className="px-1.5 py-0.2 rounded text-[9px] bg-[#2DD4BF]/20 text-[#2DD4BF] font-mono font-bold">
                {currentRoleConfig.modelName}
              </span>
            </div>
            <p className="text-[11px] text-[#7B8DA8] truncate max-w-[240px]">
              {currentRoleConfig.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleClearHistory}
            title="مسح المحادثة"
            className="p-1.5 rounded-lg text-[#7B8DA8] hover:text-[#EF4444] hover:bg-[#162033]"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onClose}
            title="إغلاق"
            className="p-1.5 rounded-lg text-[#7B8DA8] hover:text-[#E8EEF9] hover:bg-[#162033]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Role Selector Tabs */}
      <div className="px-3 py-2 bg-[#0C1524] border-b border-[#243049]/70 flex items-center gap-1 overflow-x-auto">
        <button
          onClick={() => setSelectedRole('general')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 ${
            selectedRole === 'general'
              ? 'bg-[#2DD4BF] text-[#042F2E] font-bold shadow-xs'
              : 'text-[#A3B4D0] hover:text-[#E8EEF9] hover:bg-[#162033]'
          }`}
        >
          <TrendingUp className="w-3 h-3" />
          <span>تحليل عام</span>
        </button>

        <button
          onClick={() => setSelectedRole('smc')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 ${
            selectedRole === 'smc'
              ? 'bg-[#2DD4BF] text-[#042F2E] font-bold shadow-xs'
              : 'text-[#A3B4D0] hover:text-[#E8EEF9] hover:bg-[#162033]'
          }`}
        >
          <BookOpen className="w-3 h-3" />
          <span>SMC / ICT</span>
        </button>

        <button
          onClick={() => setSelectedRole('risk')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 ${
            selectedRole === 'risk'
              ? 'bg-[#2DD4BF] text-[#042F2E] font-bold shadow-xs'
              : 'text-[#A3B4D0] hover:text-[#E8EEF9] hover:bg-[#162033]'
          }`}
        >
          <ShieldCheck className="w-3 h-3" />
          <span>إدارة المخاطر</span>
        </button>

        <button
          onClick={() => setSelectedRole('fast')}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors shrink-0 ${
            selectedRole === 'fast'
              ? 'bg-[#2DD4BF] text-[#042F2E] font-bold shadow-xs'
              : 'text-[#A3B4D0] hover:text-[#E8EEF9] hover:bg-[#162033]'
          }`}
        >
          <Zap className="w-3 h-3" />
          <span>سريع (Lite)</span>
        </button>
      </div>

      {/* Messages Thread (Scrollable) */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#08101E]">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
                  isUser ? 'bg-[#38BDF8] text-[#082F49]' : 'bg-[#2DD4BF]/20 text-[#2DD4BF] border border-[#2DD4BF]/40'
                }`}
              >
                {isUser ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
              </div>

              <div
                className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed group relative ${
                  isUser
                    ? 'bg-[#1C2C48] text-[#E8EEF9] rounded-tr-xs border border-[#2B4066]'
                    : 'bg-[#101A2C] text-[#E8EEF9] rounded-tl-xs border border-[#243049]'
                }`}
              >
                <div className="whitespace-pre-wrap font-sans">{msg.text}</div>

                <div className="flex items-center justify-between mt-2 pt-1 border-t border-white/5 text-[10px] text-[#7B8DA8]">
                  <span>{msg.timestamp}</span>
                  {!isUser && (
                    <button
                      onClick={() => handleCopyText(msg.id, msg.text)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded text-[#7B8DA8] hover:text-[#E8EEF9]"
                      title="نسخ الإجابة"
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3 h-3 text-[#22C55E]" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-[#2DD4BF]/20 text-[#2DD4BF] border border-[#2DD4BF]/40 flex items-center justify-center">
              <Bot className="w-3.5 h-3.5 animate-pulse" />
            </div>
            <div className="p-3 rounded-2xl rounded-tl-xs bg-[#101A2C] border border-[#243049] text-xs text-[#A3B4D0] flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-[#2DD4BF] animate-ping" />
              <span>جاري التحليل واستدعاء نموذج {currentRoleConfig.modelName}...</span>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Quick Prompts */}
      <div className="p-2.5 bg-[#0A1220] border-t border-[#243049]/60 flex items-center gap-1.5 overflow-x-auto">
        {samplePrompts.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(p)}
            className="px-2.5 py-1 rounded-full bg-[#121A2B] hover:bg-[#1C2740] border border-[#243049] text-[11px] text-[#A3B4D0] hover:text-[#E8EEF9] whitespace-nowrap transition-colors"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Message Input Bar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="p-3 bg-[#0E1728] border-t border-[#243049] flex items-center gap-2"
      >
        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder={`اسأل المساعد الذكي عن ${activeSymbol.symbol} أو أي تحليل فني...`}
          disabled={isLoading}
          className="flex-1 bg-[#08101E] border border-[#243049] focus:border-[#2DD4BF] rounded-xl px-3 py-2 text-xs text-[#E8EEF9] placeholder-[#4B5E7D] outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={!inputMessage.trim() || isLoading}
          className="p-2.5 rounded-xl bg-[#2DD4BF] hover:bg-[#26bba8] text-[#042F2E] font-bold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          title="إرسال"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
