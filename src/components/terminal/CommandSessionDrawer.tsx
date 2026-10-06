import React, { useState, useRef, useEffect } from 'react';
import { Terminal, Save, Share2, Trash2, ChevronDown, ChevronUp, Send, Check, FileText } from 'lucide-react';
import { MarketSymbol, Timeframe, IndicatorSettings } from '../../types/market';
import { tl, fmt } from '../../i18n/locales';

export interface CommandLogEntry {
  id: string;
  time: string;
  type: 'cmd' | 'sys' | 'quote' | 'signal' | 'alert';
  text: string;
}

interface CommandSessionDrawerProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  symbol: MarketSymbol;
  timeframe: Timeframe;
  indicators: IndicatorSettings;
  logs: CommandLogEntry[];
  onAddLog: (type: CommandLogEntry['type'], text: string) => void;
  onClearLogs: () => void;
  onExportSession: () => void;
  onShareSession: () => void;
  copiedNotification: boolean;
}

export const CommandSessionDrawer: React.FC<CommandSessionDrawerProps> = ({
  isOpen,
  onToggleOpen,
  symbol,
  timeframe,
  indicators,
  logs,
  onAddLog,
  onClearLogs,
  onExportSession,
  onShareSession,
  copiedNotification,
}) => {
  const [commandInput, setCommandInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of logs
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isOpen]);

  const handleCommandSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cmd = commandInput.trim();
    if (!cmd) return;

    // Log the user command
    onAddLog('cmd', `> ${cmd}`);
    setCommandInput('');

    // Handle command parsing
    const parts = cmd.toLowerCase().split(' ');
    const primary = parts[0];

    switch (primary) {
      case 'help':
        onAddLog(
          'sys',
          tl().tm_38
        );
        break;

      case 'quote':
        onAddLog(
          'quote',
          `${symbol.symbol} QUOTE:\n  Bid: ${symbol.bid.toFixed(symbol.precision)} | Ask: ${symbol.ask.toFixed(symbol.precision)}\n  Spread: ${symbol.spread} pips | 24h Change: ${symbol.change24h}% (${symbol.changePips} pips)\n  High: ${symbol.high24h.toFixed(symbol.precision)} | Low: ${symbol.low24h.toFixed(symbol.precision)}`
        );
        break;

      case 'status':
        onAddLog(
          'sys',
          `MATRIX TERMINAL STATUS:\n  Active Symbol: ${symbol.symbol} (${symbol.name})\n  Timeframe: ${timeframe}\n  Active Overlays: SMA20=${indicators.showSma20}, SMA50=${indicators.showSma50}, BB=${indicators.showBollinger}\n  Active Oscillators: RSI=${indicators.showRsi}, MACD=${indicators.showMacd}, Vol=${indicators.showVolume}`
        );
        break;

      case 'rsi':
        onAddLog(
          'signal',
          `RSI(14) Analysis for ${symbol.symbol}: Current calculated index is 54.2 (Neutral / In-Range). No extreme overbought (>70) or oversold (<30) condition.`
        );
        break;

      case 'alert':
        if (parts[1]) {
          onAddLog('alert', `ALERT ARMED: Trigger level set at ${parts[1]} for ${symbol.symbol}.`);
        } else {
          onAddLog('sys', tl().tm_39);
        }
        break;

      case 'calc':
        const lots = parseFloat(parts[1]) || 1.0;
        const pipVal = lots * (symbol.symbol.endsWith('JPY') ? 6.55 : 10);
        onAddLog('quote', `LOT CALCULATION: ${lots} lot(s) on ${symbol.symbol} ≈ $${pipVal.toFixed(2)} per pip.`);
        break;

      case 'clear':
        onClearLogs();
        break;

      case 'save':
      case 'export':
        onExportSession();
        break;

      default:
        onAddLog('sys', fmt(tl().tm_40, { cmd: cmd }));
        break;
    }
  };

  return (
    <div
      className={`border-t border-[#243049] bg-[#0A1220] transition-all duration-200 flex flex-col select-none text-xs ${
        isOpen ? 'h-56' : 'h-8'
      }`}
    >
      {/* Drawer Header / Bar */}
      <div className="h-8 bg-[#0E1728] px-3 flex items-center justify-between border-b border-[#243049]/60 shrink-0">
        <div
          onClick={onToggleOpen}
          className="flex items-center gap-2 cursor-pointer text-[#A3B4D0] hover:text-[#E8EEF9]"
        >
          <Terminal className="w-3.5 h-3.5 text-[#2DD4BF]" />
          <span className="font-mono font-bold text-xs text-[#E8EEF9]">
            موجه الأوامر وجلسة الطرفية (Command Session)
          </span>
          <span className="text-[10px] text-[#7B8DA8] font-mono bg-[#162033] px-1.5 py-0.2 rounded border border-[#243049]">
            {logs.length} أحداث
          </span>
          {isOpen ? <ChevronDown className="w-3.5 h-3.5 ml-1 text-[#7B8DA8]" /> : <ChevronUp className="w-3.5 h-3.5 ml-1 text-[#7B8DA8]" />}
        </div>

        {/* Action Buttons: Save & Share */}
        <div className="flex items-center gap-2">
          {copiedNotification && (
            <span className="text-[10px] font-mono text-[#22C55E] flex items-center gap-1 animate-pulse">
              <Check className="w-3 h-3" />
              <span>{tl().tm_41}</span>
            </span>
          )}

          {/* Save / Export Button */}
          <button
            onClick={onExportSession}
            title={tl().tm_42}
            className="flex items-center gap-1 px-2.5 py-0.5 rounded bg-[#162033] hover:bg-[#2DD4BF] text-[#2DD4BF] hover:text-[#042F2E] border border-[#243049] font-bold text-[11px] transition-colors"
          >
            <Save className="w-3 h-3" />
            <span>{tl().tm_43}</span>
          </button>

          {/* Share Button */}
          <button
            onClick={onShareSession}
            title={tl().tm_44}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-[#162033] hover:bg-[#1E293B] text-[#A3B4D0] hover:text-[#E8EEF9] border border-[#243049] text-[11px] transition-colors"
          >
            <Share2 className="w-3 h-3 text-[#38BDF8]" />
            <span>{tl().tm_45}</span>
          </button>

          {isOpen && (
            <button
              onClick={onClearLogs}
              title={tl().tm_46}
              className="p-1 rounded text-[#7B8DA8] hover:text-[#EF4444]"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Drawer Body (Logs & Command Input) */}
      {isOpen && (
        <div className="flex-1 flex flex-col overflow-hidden bg-[#070D18]">
          {/* Logs Area */}
          <div ref={scrollRef} className="flex-1 p-3 overflow-y-auto space-y-1 font-mono text-[11px]">
            {logs.map((log) => {
              let tagColor = 'text-[#7B8DA8]';
              let badge = 'SYS';
              if (log.type === 'cmd') {
                tagColor = 'text-[#2DD4BF] font-bold';
                badge = 'CMD';
              } else if (log.type === 'quote') {
                tagColor = 'text-[#38BDF8]';
                badge = 'QUOTE';
              } else if (log.type === 'signal') {
                tagColor = 'text-[#22C55E]';
                badge = 'SIGNAL';
              } else if (log.type === 'alert') {
                tagColor = 'text-[#F59E0B] font-bold';
                badge = 'ALERT';
              }

              return (
                <div key={log.id} className="flex items-start gap-2 leading-relaxed">
                  <span className="text-[#4B5E7D] select-none">[{log.time}]</span>
                  <span className={`px-1 py-0.2 rounded text-[9px] bg-[#121A2B] border border-[#243049] ${tagColor} select-none`}>
                    {badge}
                  </span>
                  <pre className="font-mono text-[#E8EEF9] whitespace-pre-wrap flex-1">{log.text}</pre>
                </div>
              );
            })}
          </div>

          {/* Command Input Bar */}
          <form
            onSubmit={handleCommandSubmit}
            className="h-8 border-t border-[#243049] bg-[#0B1220] px-3 flex items-center gap-2"
          >
            <span className="font-mono text-[#2DD4BF] font-bold text-xs select-none">
              MATRIX:{symbol.symbol}&gt;
            </span>
            <input
              type="text"
              value={commandInput}
              onChange={(e) => setCommandInput(e.target.value)}
              placeholder={tl().tm_47}
              className="flex-1 bg-transparent border-none text-xs font-mono text-[#E8EEF9] focus:outline-none placeholder-[#4B5E7D]"
            />
            <button
              type="submit"
              className="p-1 rounded text-[#7B8DA8] hover:text-[#2DD4BF]"
              title={tl().tm_48}
            >
              <Send className="w-3 h-3" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
