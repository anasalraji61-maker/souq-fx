import React, { useState } from 'react';
import { MarketSymbol, Timeframe } from '../../types/market';
import { apiClient } from '../../api/client';
import { Sparkles, Send, Bot, ShieldAlert, X, ChevronRight, RefreshCw } from 'lucide-react';

interface AiCopilotPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeSymbol: MarketSymbol;
  timeframe: Timeframe;
}

interface MessageItem {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  time: string;
}

export const AiCopilotPanel: React.FC<AiCopilotPanelProps> = ({
  isOpen,
  onClose,
  activeSymbol,
  timeframe,
}) => {
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'm1',
      sender: 'assistant',
      text: `مرحباً بك! أنا مساعد MATRIX الفني الذكي. يمكنني شرح النماذج الفنية، حساب مستويات الدعم والمقاومة، أو تحليل سلوك السعر لزوج ${activeSymbol.symbol}. كيف أساعدك اليوم؟`,
      time: 'الآن',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isAsking, setIsAsking] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputText.trim();
    if (!query || isAsking) return;

    const userMsg: MessageItem = {
      id: `u-${Date.now()}`,
      sender: 'user',
      text: query,
      time: new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsAsking(true);

    try {
      // 3.3 Call POST /api/ai/ask
      const res = await apiClient.post<any>('/api/ai/ask', {
        question: query,
        symbol: activeSymbol.symbol,
        timeframe,
        lang: 'ar',
      });

      let replyText = '';
      if (res.ok && res.data && res.data.answer) {
        replyText = res.data.answer;
      } else {
        replyText = `تحليل لزوج ${activeSymbol.symbol} (${timeframe}): السعر الحالي يتحرك بالقرب من ${activeSymbol.price} مع زخم متوازن. تأكد دائماً من الالتزام بإدارة رأس المال وتحديد أوامر وقف الخسارة قبل الدخول.`;
      }

      const botMsg: MessageItem = {
        id: `b-${Date.now()}`,
        sender: 'assistant',
        text: replyText,
        time: new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      const fallbackMsg: MessageItem = {
        id: `err-${Date.now()}`,
        sender: 'assistant',
        text: `السعر اللحظي لـ ${activeSymbol.symbol} هو ${activeSymbol.price}. يرجى مراجعة إشارات المتوسطات المتحركة ومؤشر RSI للتأكد من اتجاه الحركة.`,
        time: new Date().toLocaleTimeString('ar-IQ', { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsAsking(false);
    }
  };

  const quickQuestions = [
    `ما هو الاتجاه الفني الحالي لـ ${activeSymbol.symbol}؟`,
    'كيف أحدد وقف الخسارة المناسب بناءً على ATR؟',
    'ما هي أفضل استراتيجية لتداول كسر الدعم والمقاومة؟',
  ];

  return (
    <div className="fixed inset-y-0 left-0 w-80 md:w-96 bg-[#0B1424] border-r border-[#1E2E4A] shadow-2xl z-50 flex flex-col text-xs text-[#E2E8F0] select-none animate-in slide-in-from-left duration-200">
      {/* Header */}
      <div className="p-4 border-b border-[#1E2E4A] flex items-center justify-between bg-[#08101E]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#2DD4BF] to-[#0284C7] flex items-center justify-center text-[#042F2E] shadow-md">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>المساعد الذكي (AI Copilot)</span>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#2DD4BF]/20 text-[#2DD4BF] border border-[#2DD4BF]/40">
                PRO
              </span>
            </h2>
            <p className="text-[10px] text-[#94A3B8]">
              استشارات تحليلية لـ {activeSymbol.symbol} ({timeframe})
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-[#64748B] hover:text-white hover:bg-[#16233B] transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages Feed */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col space-y-1 ${
              m.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`p-3 rounded-2xl max-w-[88%] leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-[#2DD4BF] text-[#042F2E] font-medium rounded-br-xs'
                  : 'bg-[#121E33] border border-[#1E2E4A] text-[#E8EEF9] rounded-bl-xs'
              }`}
            >
              <p className="whitespace-pre-wrap">{m.text}</p>

              {/* 3.3 Mandatory disclaimer shown under EVERY assistant answer */}
              {m.sender === 'assistant' && (
                <div className="mt-2.5 pt-2 border-t border-[#1C2C47] text-[10px] text-[#7B8DA8] flex items-center gap-1">
                  <ShieldAlert className="w-3 h-3 text-amber-400 shrink-0" />
                  <span>المساعد للتعليم والتحليل فقط وليس نصيحة استثمارية</span>
                </div>
              )}
            </div>
            <span className="text-[9px] text-[#64748B] px-1 font-mono">{m.time}</span>
          </div>
        ))}

        {isAsking && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-[#121E33] border border-[#1E2E4A] text-[#A3B4D0] max-w-[70%]">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#2DD4BF]" />
            <span>جاري تحليل البيانات وصياغة الإجابة...</span>
          </div>
        )}
      </div>

      {/* Quick Prompts */}
      <div className="px-3 py-2 bg-[#08101E] border-t border-[#1E2E4A] space-y-1">
        <div className="text-[10px] text-[#64748B]">أسئلة مقترحة:</div>
        <div className="flex flex-col gap-1">
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInputText(q);
              }}
              className="text-right text-[11px] text-[#A3B4D0] hover:text-[#2DD4BF] hover:bg-[#131F33] p-1 rounded transition-colors truncate cursor-pointer"
            >
              • {q}
            </button>
          ))}
        </div>
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSend} className="p-3 bg-[#08101E] border-t border-[#1E2E4A] flex items-center gap-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={`اسأل المساعد عن ${activeSymbol.symbol}...`}
          disabled={isAsking}
          className="flex-1 bg-[#0F1B2E] border border-[#1E2E4A] rounded-xl px-3 py-2 text-xs text-white placeholder-[#64748B] focus:outline-hidden focus:border-[#2DD4BF]"
        />
        <button
          type="submit"
          disabled={!inputText.trim() || isAsking}
          className="p-2 rounded-xl bg-[#2DD4BF] hover:bg-[#26bba8] text-[#042F2E] font-bold disabled:opacity-40 transition-all cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
};
