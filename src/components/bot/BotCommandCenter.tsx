import React, { useState, useEffect } from 'react';
import {
  Play,
  Pause,
  AlertTriangle,
  Bot,
  Activity,
  ShieldCheck,
  TrendingUp,
  Download,
  Copy,
  Check,
  RefreshCw,
  Zap,
  Sliders,
  ExternalLink,
  ChevronRight,
  History,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  XCircle,
  Clock,
  DollarSign,
  Filter,
  Trash2,
  FileDown,
  Search,
  Sparkles,
  Info,
  Camera,
} from 'lucide-react';
import { ScreenshotUploaderModal } from '../ScreenshotUploaderModal';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';
import { BotState, TradePosition, AgentInfo } from '../../server/agentEngine';

export const BotCommandCenter: React.FC = () => {
  const [botState, setBotState] = useState<BotState | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);
  const [isMt5ModalOpen, setIsMt5ModalOpen] = useState(false);
  const [isScreenshotModalOpen, setIsScreenshotModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);

  const handleDownloadMql5 = async () => {
    try {
      const res = await fetch('/api/bot/mql5-ea');
      const text = await res.text();
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'MatrixAgentBridge_5056692955.mq5';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handleCopyMql5Code = async () => {
    try {
      const res = await fetch('/api/bot/mql5-ea');
      const text = await res.text();
      await navigator.clipboard.writeText(text);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2500);
    } catch (err) {
      console.error('Copy error:', err);
    }
  };

  // Trade History Filter State
  const [historyFilter, setHistoryFilter] = useState<'ALL' | 'WIN' | 'LOSS'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [symbolFilter, setSymbolFilter] = useState<string>('ALL');
  const [isExecutingTest, setIsExecutingTest] = useState(false);
  const [isPinging, setIsPinging] = useState(false);

  const handleSimulatePing = async () => {
    setIsPinging(true);
    try {
      await fetch('/api/bot/simulate-mt5-ping', { method: 'POST' });
      await fetchBotState();
    } catch (err) {
      console.error('Error simulating ping:', err);
    } finally {
      setIsPinging(false);
    }
  };

  const fetchBotState = async () => {
    try {
      const res = await fetch('/api/bot/state');
      if (res.ok) {
        const data = await res.json();
        setBotState(data);
      }
    } catch (err) {
      console.error('Error fetching bot state:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBotState();
    const interval = setInterval(fetchBotState, 2500); // Polling every 2.5s for live robot updates
    return () => clearInterval(interval);
  }, []);

  const handleToggleAutoTrading = async () => {
    if (!botState) return;
    const nextVal = !botState.config.autoTrading;
    try {
      await fetch('/api/bot/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autoTrading: nextVal }),
      });
      fetchBotState();
    } catch (err) {
      console.error('Error updating config:', err);
    }
  };

  const handleClosePosition = async (id: string) => {
    try {
      await fetch('/api/bot/close-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      fetchBotState();
    } catch (err) {
      console.error('Error closing position:', err);
    }
  };

  const handlePanicCloseAll = async () => {
    if (!window.confirm('هل أنت متأكد من رغبتك في إغلاق جميع الصفقات المفتوحة فوراً؟')) return;
    try {
      await fetch('/api/bot/close-all', { method: 'POST' });
      fetchBotState();
    } catch (err) {
      console.error('Error closing all positions:', err);
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('هل تريد مسح وتصفير سجل تاريخ الصفقات المنفذة؟')) return;
    try {
      await fetch('/api/bot/clear-history', { method: 'POST' });
      fetchBotState();
    } catch (err) {
      console.error('Error clearing history:', err);
    }
  };

  const handleTriggerTestTrade = async () => {
    setIsExecutingTest(true);
    try {
      await fetch('/api/bot/trigger-trade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: symbolFilter !== 'ALL' ? symbolFilter : 'EURUSD',
        }),
      });
      fetchBotState();
    } catch (err) {
      console.error('Error triggering trade:', err);
    } finally {
      setIsExecutingTest(false);
    }
  };

  const handleExportCsv = () => {
    if (!botState || botState.tradeHistory.length === 0) return;
    const headers = ['ID', 'Symbol', 'Type', 'Lot', 'EntryPrice', 'ExitPrice', 'SL', 'TP', 'PnL_USD', 'PnL_Pips', 'ConsensusScore', 'Reason', 'OpenTime', 'CloseTime'];
    const rows = botState.tradeHistory.map((t) => [
      t.id,
      t.symbol,
      t.type,
      t.lot,
      t.entryPrice,
      t.currentPrice,
      t.sl,
      t.tp,
      t.pnl,
      t.pnlPips,
      `${t.consensusScore}%`,
      `"${t.reason.replace(/"/g, '""')}"`,
      new Date(t.openTime).toISOString(),
      t.closeTime ? new Date(t.closeTime).toISOString() : '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `matrix_trade_logs_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyMt5Webhook = () => {
    const url = `${window.location.origin}/api/bot/signals`;
    navigator.clipboard.writeText(url);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  if (loading || !botState) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-[#08111E] text-[#A3B4D0]">
        <RefreshCw className="w-8 h-8 animate-spin text-[#2DD4BF] mb-3" />
        <span className="text-sm font-medium">جاري ربط غرفة عمليات الوكلاء الـ 10 السحابية...</span>
      </div>
    );
  }

  const { config, agents, openPositions, tradeHistory, recentLogs } = botState;
  const totalPnL = openPositions.reduce((sum, p) => sum + p.pnl, 0);

  // History Metrics
  const realizedPnL = tradeHistory.reduce((sum, t) => sum + t.pnl, 0);
  const wins = tradeHistory.filter((t) => t.pnl > 0);
  const losses = tradeHistory.filter((t) => t.pnl < 0);
  const winCount = wins.length;
  const winRate = tradeHistory.length > 0 ? ((winCount / tradeHistory.length) * 100).toFixed(1) : '0.0';
  const bestTrade = tradeHistory.length > 0 ? Math.max(...tradeHistory.map((t) => t.pnl)) : 0;
  const worstTrade = tradeHistory.length > 0 ? Math.min(...tradeHistory.map((t) => t.pnl)) : 0;

  // Filtered History
  const filteredHistory = tradeHistory.filter((trade) => {
    if (historyFilter === 'WIN' && trade.pnl <= 0) return false;
    if (historyFilter === 'LOSS' && trade.pnl >= 0) return false;
    if (symbolFilter !== 'ALL' && trade.symbol !== symbolFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchSym = trade.symbol.toLowerCase().includes(q);
      const matchReason = trade.reason.toLowerCase().includes(q);
      const matchType = trade.type.toLowerCase().includes(q);
      if (!matchSym && !matchReason && !matchType) return false;
    }
    return true;
  });

  const availableSymbols = Array.from(new Set(tradeHistory.map((t) => t.symbol)));

  // Equity Curve calculations for Recharts
  const initialCapital = config.dailyStartBalance || 10000;
  const sortedTrades = [...tradeHistory].sort(
    (a, b) => (a.closeTime || a.openTime) - (b.closeTime || b.openTime)
  );

  let runningBalance = initialCapital;
  let runningPeak = initialCapital;
  let maxDrawdownValue = 0;

  const equityData: Array<{
    name: string;
    timestamp: number;
    balance: number;
    equity: number;
    tradeDesc?: string;
    pnl?: number;
  }> = [
    {
      name: 'البداية',
      timestamp: sortedTrades.length > 0 ? sortedTrades[0].openTime - 1800000 : Date.now() - 3600000 * 2,
      balance: initialCapital,
      equity: initialCapital,
      tradeDesc: 'رأس المال المبدئي ($10,000.00)',
      pnl: 0,
    },
  ];

  sortedTrades.forEach((trade, idx) => {
    runningBalance += trade.pnl;
    if (runningBalance > runningPeak) {
      runningPeak = runningBalance;
    }
    const currentDd = runningPeak - runningBalance;
    if (currentDd > maxDrawdownValue) {
      maxDrawdownValue = currentDd;
    }

    equityData.push({
      name: `#${idx + 1} ${trade.symbol}`,
      timestamp: trade.closeTime || trade.openTime,
      balance: parseFloat(runningBalance.toFixed(2)),
      equity: parseFloat(runningBalance.toFixed(2)),
      tradeDesc: `${trade.type} ${trade.symbol} (${trade.pnl >= 0 ? '+' : ''}$${trade.pnl.toFixed(2)})`,
      pnl: trade.pnl,
    });
  });

  // Current live point with floating PnL
  const currentLiveEquity = parseFloat((config.accountBalance + totalPnL).toFixed(2));
  equityData.push({
    name: 'الآن (مباشر)',
    timestamp: Date.now(),
    balance: config.accountBalance,
    equity: currentLiveEquity,
    tradeDesc: `حقوق المحفظة الحالية (${openPositions.length} صفقات مفتوحة)`,
  });

  const cumulativeRoi = (((currentLiveEquity - initialCapital) / initialCapital) * 100).toFixed(2);
  const grossProfit = tradeHistory.filter((t) => t.pnl > 0).reduce((s, t) => s + t.pnl, 0);
  const grossLoss = Math.abs(tradeHistory.filter((t) => t.pnl < 0).reduce((s, t) => s + t.pnl, 0));
  const profitFactor = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? '∞' : '1.00';
  const maxDrawdownPercent = runningPeak > 0 ? ((maxDrawdownValue / runningPeak) * 100).toFixed(2) : '0.00';

  return (
    <div className="flex flex-col h-full w-full bg-[#08111E] text-[#E8EEF9] overflow-y-auto select-none p-4 space-y-4">
      {/* 1. TOP MISSION CONTROL HEADER */}
      <div className="bg-[#0C1424] border border-[#1E283D] rounded-xl p-4 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Title & Status Indicator */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#2DD4BF]/10 border border-[#2DD4BF]/30 flex items-center justify-center text-[#2DD4BF]">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-[#E8EEF9] tracking-tight">
                  غرفة قيادة الوكلاء الـ 10 (MATRIX Autonomous Trading Swarm)
                </h1>
                <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                  24/7 سحابي مباشر
                </span>
              </div>
              <p className="text-xs text-[#7B8DA8]">
                10 وكلاء مستقلين يحللون السوق ويصوتون بالتوافق وتُنفذ الصفقات آلياً عبر حساب MT5 التجريبي
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            {/* Auto Trading Master Button */}
            <button
              onClick={handleToggleAutoTrading}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all shadow-md active:scale-95 ${
                config.autoTrading
                  ? 'bg-[#22C55E] hover:bg-[#16A34A] text-[#052E16]'
                  : 'bg-[#EF4444] hover:bg-[#DC2626] text-white'
              }`}
            >
              {config.autoTrading ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
              {config.autoTrading ? 'التداول الآلي: نـشـط (ON)' : 'التداول الآلي: متوقف (OFF)'}
            </button>

            {/* Panic Close All Button */}
            {openPositions.length > 0 && (
              <button
                onClick={handlePanicCloseAll}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-xs bg-[#EF4444]/15 hover:bg-[#EF4444]/25 text-[#EF4444] border border-[#EF4444]/30 transition-colors"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                إغلاق طارئ للكل ({openPositions.length})
              </button>
            )}

            {/* MT5 EA Download & Setup Button */}
            <button
              onClick={() => setIsMt5ModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-xs bg-[#162033] hover:bg-[#1C2740] text-[#2DD4BF] border border-[#243049] transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              ربط ميتاتريدر 5 (MT5 EA)
            </button>

            {/* Direct Screenshot Upload Button */}
            <button
              onClick={() => setIsScreenshotModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg font-semibold text-xs bg-[#2DD4BF]/15 hover:bg-[#2DD4BF]/25 text-[#2DD4BF] border border-[#2DD4BF]/30 transition-colors"
              title="رفع لقطة شاشة للمساعد مباشرة في السيرفر"
            >
              <Camera className="w-3.5 h-3.5" />
              رفع لقطة شاشة للمساعد
            </button>
          </div>
        </div>

        {/* Live Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-4 pt-3 border-t border-[#1E283D]/60 text-xs">
          <div className="bg-[#08111E] p-2.5 rounded-lg border border-[#1E283D]">
            <span className="text-[#7B8DA8] text-[11px] block">رصيد الحساب</span>
            <span className="text-sm font-bold font-mono text-[#E8EEF9]">
              ${config.accountBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
          </div>

          <div className="bg-[#08111E] p-2.5 rounded-lg border border-[#1E283D]">
            <span className="text-[#7B8DA8] text-[11px] block">الأرباح العائمة (Floating)</span>
            <span
              className={`text-sm font-bold font-mono ${
                totalPnL >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
              }`}
            >
              {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
            </span>
          </div>

          <div className="bg-[#08111E] p-2.5 rounded-lg border border-[#1E283D]">
            <span className="text-[#7B8DA8] text-[11px] block">صافي الأرباح المحققة</span>
            <span
              className={`text-sm font-bold font-mono ${
                realizedPnL >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
              }`}
            >
              {realizedPnL >= 0 ? '+' : ''}${realizedPnL.toFixed(2)}
            </span>
          </div>

          <div className="bg-[#08111E] p-2.5 rounded-lg border border-[#1E283D]">
            <span className="text-[#7B8DA8] text-[11px] block">نسبة نجاح الصفقات</span>
            <span className="text-sm font-bold font-mono text-[#2DD4BF]">{winRate}%</span>
          </div>

          <div className="bg-[#08111E] p-2.5 rounded-lg border border-[#1E283D]">
            <span className="text-[#7B8DA8] text-[11px] block">المخاطرة لكل صفقة</span>
            <span className="text-sm font-bold font-mono text-[#F59E0B]">{config.riskPerTrade}% Max</span>
          </div>

          <div className="bg-[#08111E] p-2.5 rounded-lg border border-[#1E283D]">
            <span className="text-[#7B8DA8] text-[11px] block">شرط إجماع المجلس</span>
            <span className="text-sm font-bold font-mono text-[#A78BFA]">{config.minConsensusPercent}% إجماع</span>
          </div>
        </div>
      </div>

      {/* 2. DEDICATED MT5 DEMO ACCOUNT 5056692955 BRIDGE TERMINAL */}
      <div className="bg-gradient-to-r from-[#0C1527] via-[#0E1E36] to-[#0C1527] border-2 border-[#2DD4BF]/40 rounded-xl p-4 shadow-xl space-y-3 relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-[#2DD4BF]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1E283D]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#2DD4BF]/20 to-[#38BDF8]/20 border border-[#2DD4BF]/40 flex items-center justify-center text-[#2DD4BF] shadow-md">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#E8EEF9] tracking-tight">
                  محطة ربط ميتاتريدر 5 (MT5 Bridge) — الحساب التجريبي المخصص: <span className="font-mono text-[#2DD4BF] font-extrabold text-base px-2 py-0.5 rounded bg-[#2DD4BF]/15 border border-[#2DD4BF]/30">5056692955</span>
                </h2>
                <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  botState.mt5Bridge?.connected && botState.mt5Bridge.lastHeartbeat && (Date.now() - botState.mt5Bridge.lastHeartbeat < 30000)
                    ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/40 animate-pulse'
                    : 'bg-[#F59E0B]/15 text-[#F59E0B] border-[#F59E0B]/40'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${
                    botState.mt5Bridge?.connected && botState.mt5Bridge.lastHeartbeat && (Date.now() - botState.mt5Bridge.lastHeartbeat < 30000)
                      ? 'bg-[#22C55E]'
                      : 'bg-[#F59E0B]'
                  }`} />
                  {botState.mt5Bridge?.connected && botState.mt5Bridge.lastHeartbeat && (Date.now() - botState.mt5Bridge.lastHeartbeat < 30000)
                    ? 'متصل ومزامن لحظياً مع MT5'
                    : 'جاهز للاستقبال • في انتظار تشغيل الإكسبيرت'}
                </span>
              </div>
              <p className="text-xs text-[#A3B4D0] mt-0.5">
                تم برمجة إكسبيرت <code className="text-[#2DD4BF] font-mono font-semibold">MatrixAgentBridge.mq5 (v2.10)</code> ليتصل مباشرة بحسابك التجريبي 5056692955 وتمرير صفقات مجلس الوكلاء الـ 10 فورياً.
              </p>
            </div>
          </div>

          {/* Quick Connection Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleDownloadMql5}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#2DD4BF] hover:bg-[#14B8A6] text-[#042F2E] shadow-[0_2px_10px_rgba(45,212,191,0.25)] transition-all active:scale-95 cursor-pointer"
              title="تحميل الإكسبيرت المبرمج لحساب 5056692955"
            >
              <Download className="w-3.5 h-3.5" />
              تحميل الإكسبيرت (5056692955)
            </button>

            <button
              onClick={handleCopyMql5Code}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#162033] hover:bg-[#1C2740] text-[#E8EEF9] border border-[#243049] transition-colors cursor-pointer"
              title="نسخ كود MQL5 بالكامل"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5 text-[#22C55E]" /> : <Copy className="w-3.5 h-3.5 text-[#2DD4BF]" />}
              {copiedCode ? 'تم النسخ!' : 'نسخ كود MQL5'}
            </button>

            <button
              onClick={handleSimulatePing}
              disabled={isPinging}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#38BDF8]/15 hover:bg-[#38BDF8]/25 text-[#38BDF8] border border-[#38BDF8]/40 transition-colors cursor-pointer disabled:opacity-50"
              title="محاكاة فحص نبض الاتصال بالحساب التجريبي"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? 'animate-spin' : ''}`} />
              {isPinging ? 'جاري الفحص...' : 'فحص نبض الاتصال (Test Ping)'}
            </button>

            <button
              onClick={() => setIsMt5ModalOpen(true)}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#7B8DA8] hover:text-[#E8EEF9] bg-[#08111E] border border-[#1E283D] transition-colors"
            >
              <Info className="w-3.5 h-3.5 text-[#2DD4BF]" />
              خطوات الربط
            </button>
          </div>
        </div>

        {/* Bridge Status Data Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-[#08111E]/80 border border-[#1E283D]">
            <span className="text-[#7B8DA8] text-[10px] font-sans block mb-0.5">الحساب التجريبي المخصص</span>
            <span className="text-sm font-bold text-[#2DD4BF] flex items-center gap-1">
              5056692955
              <span className="text-[9px] px-1 py-0.2 rounded bg-[#2DD4BF]/15 font-sans font-normal text-[#2DD4BF]">Demo</span>
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-[#08111E]/80 border border-[#1E283D]">
            <span className="text-[#7B8DA8] text-[10px] font-sans block mb-0.5">الوسيط / السيرفر</span>
            <span className="text-xs font-bold text-[#E8EEF9] truncate block">
              {botState.mt5Bridge?.broker || 'MetaQuotes-Demo'}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-[#08111E]/80 border border-[#1E283D]">
            <span className="text-[#7B8DA8] text-[10px] font-sans block mb-0.5">إشارات الوكلاء الصادرة</span>
            <span className="text-sm font-bold text-[#A78BFA]">
              {botState.mt5Bridge?.totalSignalsSent || 0} أوامر مؤهلة
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-[#08111E]/80 border border-[#1E283D]">
            <span className="text-[#7B8DA8] text-[10px] font-sans block mb-0.5">آخر نبض اتصال (Heartbeat)</span>
            <span className="text-xs font-bold text-[#E8EEF9]">
              {botState.mt5Bridge?.lastHeartbeat
                ? new Date(botState.mt5Bridge.lastHeartbeat).toLocaleTimeString()
                : 'في الانتظار'}
            </span>
          </div>

          <div className="p-2.5 rounded-lg bg-[#08111E]/80 border border-[#1E283D] col-span-2 sm:col-span-4 lg:col-span-1">
            <span className="text-[#7B8DA8] text-[10px] font-sans block mb-0.5">إصدار الإكسبيرت</span>
            <span className="text-xs font-bold text-[#22C55E]">
              MatrixAgentBridge v2.10
            </span>
          </div>
        </div>

        {/* WebRequest URL quick copy row */}
        <div className="flex flex-wrap items-center justify-between gap-2 p-2 rounded-lg bg-[#08111E] border border-[#1E283D] text-xs">
          <div className="flex items-center gap-2 flex-1 min-w-[280px]">
            <span className="text-[11px] text-[#7B8DA8] shrink-0 font-sans">
              رابط WebRequest لإضافته في ميتاتريدر 5:
            </span>
            <input
              readOnly
              value={`${window.location.origin}`}
              className="bg-[#0C1220] border border-[#1E283D] px-2.5 py-1 rounded text-xs text-[#2DD4BF] font-mono flex-1 outline-hidden select-all"
            />
            <button
              onClick={copyMt5Webhook}
              className="px-2.5 py-1 rounded bg-[#162033] hover:bg-[#1C2740] text-[#E8EEF9] border border-[#243049] transition-colors flex items-center gap-1 shrink-0"
              title="نسخ الرابط"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-[#22C55E]" /> : <Copy className="w-3.5 h-3.5 text-[#2DD4BF]" />}
              <span>{copiedUrl ? 'تم النسخ' : 'نسخ'}</span>
            </button>
          </div>

          {/* Screenshot notice and direct button */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setIsScreenshotModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-[#2DD4BF]/10 hover:bg-[#2DD4BF]/20 text-[#2DD4BF] border border-[#2DD4BF]/30 transition-colors cursor-pointer"
              title="رفع أو لصق لقطة الشاشة في السيرفر"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>إرسال أو لصق لقطة الشاشة للمساعد</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. PORTFOLIO EQUITY CURVE (RECHARTS) - أداء الوكلاء الـ 10 مجتمعين */}
      <div className="bg-[#0C1424] border border-[#1E283D] rounded-xl p-4 shadow-xl space-y-3">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-[#1E283D]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2DD4BF]/10 border border-[#2DD4BF]/30 flex items-center justify-center text-[#2DD4BF]">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#E8EEF9]">
                  منحنى نمو المحفظة وحقوق الملكية (Combined Equity Growth Curve)
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#2DD4BF]/10 border border-[#2DD4BF]/30 text-[#2DD4BF]">
                  Recharts Engine
                </span>
              </div>
              <p className="text-[11px] text-[#7B8DA8]">
                مخطط حي لتطور رأس المال بناءً على قرارات وصفقات الوكلاء الـ 10 مجتمعين بدءاً من $10,000
              </p>
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
            <div className="px-2.5 py-1 rounded-lg bg-[#08111E] border border-[#1E283D] flex items-center gap-1.5">
              <span className="text-[#7B8DA8] text-[10px] font-sans">حقوق الملكية الحية:</span>
              <span className={`font-bold ${currentLiveEquity >= initialCapital ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                ${currentLiveEquity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>

            <div className="px-2.5 py-1 rounded-lg bg-[#08111E] border border-[#1E283D] flex items-center gap-1.5">
              <span className="text-[#7B8DA8] text-[10px] font-sans">العائد التراكمي (ROI):</span>
              <span className={`font-bold ${Number(cumulativeRoi) >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                {Number(cumulativeRoi) >= 0 ? '+' : ''}{cumulativeRoi}%
              </span>
            </div>

            <div className="px-2.5 py-1 rounded-lg bg-[#08111E] border border-[#1E283D] flex items-center gap-1.5">
              <span className="text-[#7B8DA8] text-[10px] font-sans">عامل الربح (Profit Factor):</span>
              <span className="font-bold text-[#2DD4BF]">{profitFactor}</span>
            </div>

            <div className="px-2.5 py-1 rounded-lg bg-[#08111E] border border-[#1E283D] flex items-center gap-1.5">
              <span className="text-[#7B8DA8] text-[10px] font-sans">أقصى تراجع (Max DD):</span>
              <span className="font-bold text-[#EF4444]">{maxDrawdownPercent}%</span>
            </div>
          </div>
        </div>

        {/* Recharts Area Chart and Beside Stats Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-3.5 pt-1 items-stretch">
          {/* Main Chart (3 Cols on desktop) */}
          <div className="lg:col-span-3 w-full h-[260px] bg-[#08111E] rounded-lg p-2 border border-[#1E283D]/60 flex flex-col justify-between">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={equityData} margin={{ top: 10, right: 15, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2DD4BF" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#2DD4BF" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1E283D" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#556987"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#1E283D' }}
                />
                <YAxis
                  stroke="#556987"
                  fontSize={10}
                  tickLine={false}
                  axisLine={{ stroke: '#1E283D' }}
                  domain={['auto', 'auto']}
                  tickFormatter={(val: number) => `$${val.toLocaleString()}`}
                  orientation="right"
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const item = payload[0].payload;
                      const isProfit = item.equity >= initialCapital;
                      return (
                        <div className="bg-[#0C1424] border border-[#2DD4BF]/50 rounded-lg p-2.5 shadow-xl text-xs font-mono space-y-1">
                          <div className="flex items-center justify-between gap-4 text-[#7B8DA8] text-[10px]">
                            <span className="font-bold text-[#E8EEF9]">{item.name}</span>
                            <span>{new Date(item.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-[#A3B4D0] font-sans">حقوق المحفظة:</span>
                            <span className={`font-bold ${isProfit ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                              ${item.equity.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-[11px]">
                            <span className="text-[#7B8DA8] font-sans">الرصيد الفعلي:</span>
                            <span className="text-[#E8EEF9]">
                              ${item.balance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          {item.tradeDesc && (
                            <div className="pt-1 border-t border-[#1E283D] text-[10px] text-[#2DD4BF] font-sans">
                              {item.tradeDesc}
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <ReferenceLine
                  y={initialCapital}
                  stroke="#F59E0B"
                  strokeDasharray="4 4"
                  label={{
                    value: 'نقطة البداية $10,000',
                    fill: '#F59E0B',
                    fontSize: 10,
                    position: 'insideBottomLeft',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="equity"
                  name="حقوق الملكية"
                  stroke="#2DD4BF"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#equityGradient)"
                  dot={{ r: 3, fill: '#2DD4BF', strokeWidth: 1, stroke: '#0C1424' }}
                  activeDot={{ r: 5, fill: '#22C55E', stroke: '#E8EEF9', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Beside Summary Statistics Panel (1 Col on desktop) */}
          <div className="lg:col-span-1 bg-[#08111E] border border-[#1E283D] rounded-lg p-3 flex flex-col justify-between space-y-2.5">
            {/* Panel Title */}
            <div className="flex items-center justify-between border-b border-[#1E283D]/60 pb-2">
              <span className="text-xs font-bold text-[#E8EEF9] flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-[#2DD4BF]" />
                إحصائيات أداء الوكلاء
              </span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#2DD4BF]/10 text-[#2DD4BF] font-semibold">
                Live
              </span>
            </div>

            {/* Big Win Rate Display */}
            <div className="p-2.5 rounded-lg bg-[#0C1424] border border-[#1E283D] text-center">
              <span className="text-[10px] text-[#7B8DA8] block mb-0.5">
                نسبة النجاح الإجمالية (Win Rate)
              </span>
              <div className="text-2xl font-bold font-mono text-[#22C55E] tracking-tight">
                {winRate}%
              </div>

              {/* Proportional Ratio Bar */}
              <div className="w-full bg-[#EF4444]/30 h-2 rounded-full mt-2 overflow-hidden flex">
                <div
                  className="bg-[#22C55E] h-full transition-all duration-500 rounded-r-full"
                  style={{ width: `${Math.max(0, Math.min(100, Number(winRate)))}%` }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] text-[#7B8DA8] mt-1 font-mono">
                <span className="text-[#22C55E]">{winCount} رابحة</span>
                <span className="text-[#EF4444]">{losses.length} خاسرة</span>
              </div>
            </div>

            {/* Win & Loss Cards */}
            <div className="grid grid-cols-2 gap-2">
              {/* Winning Trades Card */}
              <div className="p-2 rounded-lg bg-[#0C1424] border border-[#22C55E]/30 text-right">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-[#7B8DA8]">الصفقات الرابحة</span>
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
                </div>
                <div className="text-sm font-bold font-mono text-[#22C55E]">
                  {winCount}
                </div>
                <div className="text-[10px] font-mono text-[#7B8DA8]">
                  +${grossProfit.toFixed(1)}
                </div>
              </div>

              {/* Losing Trades Card */}
              <div className="p-2 rounded-lg bg-[#0C1424] border border-[#EF4444]/30 text-right">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-[#7B8DA8]">الصفقات الخاسرة</span>
                  <XCircle className="w-3.5 h-3.5 text-[#EF4444]" />
                </div>
                <div className="text-sm font-bold font-mono text-[#EF4444]">
                  {losses.length}
                </div>
                <div className="text-[10px] font-mono text-[#7B8DA8]">
                  -${grossLoss.toFixed(1)}
                </div>
              </div>
            </div>

            {/* Bottom Insight Row */}
            <div className="pt-1.5 border-t border-[#1E283D]/60 flex items-center justify-between text-[11px] font-mono">
              <span className="text-[#7B8DA8] text-[10px] font-sans">صافي الربح المحقق:</span>
              <span className={`font-bold ${realizedPnL >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
                {realizedPnL >= 0 ? '+' : ''}${realizedPnL.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. THE 10 AUTONOMOUS AGENTS GRID */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#2DD4BF]" />
            <h2 className="text-sm font-bold text-[#E8EEF9] tracking-wide">
              رادار الوكلاء الـ 10 (Autonomous Swarm Activity)
            </h2>
          </div>
          <span className="text-[11px] text-[#7B8DA8]">
            تحديث نبضي مستمر كل 4 ثوانٍ مع حركة السوق الحية
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2.5">
          {agents.map((agent, idx) => {
            const isConsensus = agent.id === 'consensus_engine';
            const isRisk = agent.id === 'risk_guardian';

            return (
              <div
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                className={`bg-[#0C1220] border rounded-lg p-3 cursor-pointer transition-all hover:border-[#2DD4BF]/60 hover:bg-[#101A2D] flex flex-col justify-between ${
                  isConsensus
                    ? 'border-[#A78BFA]/50 shadow-[0_0_12px_rgba(167,139,250,0.15)] bg-[#12162B]'
                    : isRisk
                    ? 'border-[#F59E0B]/50'
                    : 'border-[#1E283D]'
                }`}
              >
                <div>
                  {/* Top Bar of Agent Card */}
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono text-[#7B8DA8]">#{idx + 1}</span>
                    <span
                      className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        agent.vote === 'BUY'
                          ? 'bg-[#22C55E]/20 text-[#22C55E]'
                          : agent.vote === 'SELL'
                          ? 'bg-[#EF4444]/20 text-[#EF4444]'
                          : 'bg-[#1E293B] text-[#7B8DA8]'
                      }`}
                    >
                      {agent.vote} ({agent.confidence}%)
                    </span>
                  </div>

                  {/* Agent Name & Role */}
                  <h3 className="font-bold text-xs text-[#E8EEF9] mb-0.5 truncate">{agent.name}</h3>
                  <p className="text-[10px] text-[#2DD4BF] font-medium mb-1.5 truncate">{agent.nameAr}</p>

                  {/* Thought / Last Status */}
                  <p className="text-[11px] text-[#A3B4D0] line-clamp-2 leading-relaxed bg-[#08111E] p-1.5 rounded border border-[#1E283D]/40 mb-2">
                    {agent.lastMessage}
                  </p>
                </div>

                {/* Accuracy & Scans Footer */}
                <div className="flex items-center justify-between text-[10px] text-[#7B8DA8] pt-1.5 border-t border-[#1E283D]/40">
                  <span>دقة الرصد: {agent.metrics.accuracyRate}%</span>
                  <span>{agent.metrics.scansCount} مسح</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 3. OPEN POSITIONS & RECENT DECISION STREAM */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left 2 Cols: Active Positions */}
        <div className="lg:col-span-2 bg-[#0C1220] border border-[#1E283D] rounded-xl p-3.5 flex flex-col">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-xs text-[#E8EEF9] flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#2DD4BF]" />
              الصفقات الحية الجارية ({openPositions.length})
            </h3>
            <span className="text-[11px] text-[#7B8DA8]">حماية آلية لـ SL و TP بنسبة 1:2.2</span>
          </div>

          {openPositions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[#7B8DA8] bg-[#08111E] rounded-lg border border-[#1E283D]/40">
              <ShieldCheck className="w-8 h-8 text-[#2DD4BF] opacity-50 mb-2" />
              <p className="text-xs font-semibold text-[#E8EEF9]">لا توجد صفقات مفتوحة حالياً</p>
              <p className="text-[11px] max-w-sm mt-0.5">
                الوكلاء الـ 10 يمسحون السوق الآن؛ سيتم فتح صفقة تلقائياً بمجرد إجماع 70%+ من مجلس الوكلاء
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="border-b border-[#1E283D] text-[#7B8DA8] text-[10px]">
                    <th className="pb-1.5 font-medium">الرمز</th>
                    <th className="pb-1.5 font-medium">النوع</th>
                    <th className="pb-1.5 font-medium">اللوت</th>
                    <th className="pb-1.5 font-medium">سعر الدخول</th>
                    <th className="pb-1.5 font-medium">السعر الحالي</th>
                    <th className="pb-1.5 font-medium">الوقف (SL)</th>
                    <th className="pb-1.5 font-medium">الهدف (TP)</th>
                    <th className="pb-1.5 font-medium">الربح ($)</th>
                    <th className="pb-1.5 font-medium">الإجماع</th>
                    <th className="pb-1.5 font-medium text-left">إجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E283D]/40 font-mono">
                  {openPositions.map((pos) => (
                    <tr key={pos.id} className="hover:bg-[#121A2B] transition-colors">
                      <td className="py-2 font-bold text-[#E8EEF9]">{pos.symbol}</td>
                      <td className="py-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            pos.type === 'BUY'
                              ? 'bg-[#22C55E]/20 text-[#22C55E]'
                              : 'bg-[#EF4444]/20 text-[#EF4444]'
                          }`}
                        >
                          {pos.type}
                        </span>
                      </td>
                      <td className="py-2 text-[#A3B4D0]">{pos.lot}</td>
                      <td className="py-2 text-[#E8EEF9]">{pos.entryPrice}</td>
                      <td className="py-2 font-bold text-[#E8EEF9]">{pos.currentPrice}</td>
                      <td className="py-2 text-[#EF4444]">{pos.sl}</td>
                      <td className="py-2 text-[#22C55E]">{pos.tp}</td>
                      <td
                        className={`py-2 font-bold ${
                          pos.pnl >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                        }`}
                      >
                        {pos.pnl >= 0 ? '+' : ''}${pos.pnl.toFixed(2)}
                      </td>
                      <td className="py-2 text-[#A78BFA] font-bold">{pos.consensusScore}%</td>
                      <td className="py-2 text-left">
                        <button
                          onClick={() => handleClosePosition(pos.id)}
                          className="px-2 py-0.5 rounded text-[10px] bg-[#EF4444]/20 hover:bg-[#EF4444]/30 text-[#EF4444] border border-[#EF4444]/40 transition-colors"
                        >
                          إغلاق
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right 1 Col: Live Decision Stream */}
        <div className="bg-[#0C1220] border border-[#1E283D] rounded-xl p-3.5 flex flex-col h-[320px]">
          <h3 className="font-bold text-xs text-[#E8EEF9] mb-2 flex items-center justify-between">
            <span>سجل قرارات ونقاشات الوكلاء</span>
            <span className="text-[10px] text-[#2DD4BF] font-mono">Live Stream</span>
          </h3>

          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px]">
            {recentLogs.map((log) => (
              <div
                key={log.id}
                className="p-1.5 rounded bg-[#08111E] border border-[#1E283D]/40 text-[#A3B4D0] leading-snug"
              >
                <div className="flex items-center justify-between text-[10px] text-[#7B8DA8] mb-0.5">
                  <span className="font-bold text-[#2DD4BF]">{log.agentName}</span>
                  <span>{new Date(log.time).toLocaleTimeString()}</span>
                </div>
                <p className="text-xs text-[#E8EEF9] font-sans">{log.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. DEDICATED TRADE EXECUTION HISTORY & PNL LOGS SECTION (المطلوب) */}
      <div className="bg-[#0C1424] border border-[#1E283D] rounded-xl p-4 shadow-xl space-y-3">
        {/* Section Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1E283D]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#2DD4BF]/10 border border-[#2DD4BF]/30 flex items-center justify-center text-[#2DD4BF]">
              <History className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-[#E8EEF9]">
                  سجل تنفيذ الصفقات وتاريخ الأرباح والخسائر (Execution Logs & Realized PnL)
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-[#162033] border border-[#243049] text-[#2DD4BF]">
                  {tradeHistory.length} صفقات مسجلة
                </span>
              </div>
              <p className="text-[11px] text-[#7B8DA8]">
                سجل تاريخي كامل ومفصل لجميع الصفقات المنفذة عبر الوكلاء الـ 10 مع نتائج الربح والخسارة وأسباب الإغلاق
              </p>
            </div>
          </div>

          {/* Quick Execution Toolbar */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleTriggerTestTrade}
              disabled={isExecutingTest}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#2DD4BF]/15 hover:bg-[#2DD4BF]/25 text-[#2DD4BF] border border-[#2DD4BF]/40 transition-colors active:scale-95 disabled:opacity-50"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              {isExecutingTest ? 'جاري التنفيذ...' : 'تنفيذ صفقة فورية للتجربة'}
            </button>

            <button
              onClick={handleExportCsv}
              disabled={tradeHistory.length === 0}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#162033] hover:bg-[#1C2740] text-[#A3B4D0] hover:text-[#E8EEF9] border border-[#243049] transition-colors disabled:opacity-40"
              title="تصدير كملف CSV"
            >
              <FileDown className="w-3.5 h-3.5" />
              تصدير CSV
            </button>

            <button
              onClick={handleClearHistory}
              disabled={tradeHistory.length === 0}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium bg-[#EF4444]/10 hover:bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30 transition-colors disabled:opacity-40"
              title="مسح وتصفير السجل"
            >
              <Trash2 className="w-3.5 h-3.5" />
              تصفير
            </button>
          </div>
        </div>

        {/* Stats Summary Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs font-mono">
          <div className="p-2 rounded-lg bg-[#08111E] border border-[#1E283D] flex items-center justify-between">
            <span className="text-[#7B8DA8] text-[11px] font-sans">صافي الأرباح المحققة:</span>
            <span className={`font-bold ${realizedPnL >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'}`}>
              {realizedPnL >= 0 ? '+' : ''}${realizedPnL.toFixed(2)}
            </span>
          </div>

          <div className="p-2 rounded-lg bg-[#08111E] border border-[#1E283D] flex items-center justify-between">
            <span className="text-[#7B8DA8] text-[11px] font-sans">نسبة الصفقات الرابحة:</span>
            <span className="font-bold text-[#2DD4BF]">
              {winRate}% ({winCount}/{tradeHistory.length})
            </span>
          </div>

          <div className="p-2 rounded-lg bg-[#08111E] border border-[#1E283D] flex items-center justify-between">
            <span className="text-[#7B8DA8] text-[11px] font-sans">الصفقات الخاسرة:</span>
            <span className="font-bold text-[#EF4444]">
              {losses.length} صفقة
            </span>
          </div>

          <div className="p-2 rounded-lg bg-[#08111E] border border-[#1E283D] flex items-center justify-between">
            <span className="text-[#7B8DA8] text-[11px] font-sans">أفضل صفقة:</span>
            <span className="font-bold text-[#22C55E]">+${bestTrade.toFixed(2)}</span>
          </div>

          <div className="p-2 rounded-lg bg-[#08111E] border border-[#1E283D] flex items-center justify-between">
            <span className="text-[#7B8DA8] text-[11px] font-sans">أكبر تراجع:</span>
            <span className="font-bold text-[#EF4444]">${worstTrade.toFixed(2)}</span>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          {/* Win / Loss Tabs */}
          <div className="flex items-center gap-1 bg-[#08111E] p-1 rounded-lg border border-[#1E283D] text-xs">
            <button
              onClick={() => setHistoryFilter('ALL')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                historyFilter === 'ALL'
                  ? 'bg-[#1E283D] text-[#E8EEF9] font-bold'
                  : 'text-[#7B8DA8] hover:text-[#E8EEF9]'
              }`}
            >
              الكل ({tradeHistory.length})
            </button>
            <button
              onClick={() => setHistoryFilter('WIN')}
              className={`px-3 py-1 rounded font-medium flex items-center gap-1 transition-colors ${
                historyFilter === 'WIN'
                  ? 'bg-[#22C55E]/20 text-[#22C55E] font-bold'
                  : 'text-[#7B8DA8] hover:text-[#22C55E]'
              }`}
            >
              <CheckCircle2 className="w-3 h-3" />
              الرابحة ({winCount})
            </button>
            <button
              onClick={() => setHistoryFilter('LOSS')}
              className={`px-3 py-1 rounded font-medium flex items-center gap-1 transition-colors ${
                historyFilter === 'LOSS'
                  ? 'bg-[#EF4444]/20 text-[#EF4444] font-bold'
                  : 'text-[#7B8DA8] hover:text-[#EF4444]'
              }`}
            >
              <XCircle className="w-3 h-3" />
              الخاسرة ({losses.length})
            </button>
          </div>

          {/* Symbol Filter & Search */}
          <div className="flex items-center gap-2">
            {availableSymbols.length > 0 && (
              <select
                value={symbolFilter}
                onChange={(e) => setSymbolFilter(e.target.value)}
                className="bg-[#08111E] border border-[#1E283D] text-[#E8EEF9] text-xs rounded-lg px-2.5 py-1.5 outline-hidden"
              >
                <option value="ALL">جميع الأزواج ({availableSymbols.length})</option>
                {availableSymbols.map((sym) => (
                  <option key={sym} value={sym}>
                    {sym}
                  </option>
                ))}
              </select>
            )}

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#7B8DA8] absolute right-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="بحث بالرمز أو السبب..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#08111E] border border-[#1E283D] text-[#E8EEF9] text-xs rounded-lg pr-8 pl-3 py-1.5 w-44 placeholder:text-[#556987] outline-hidden focus:border-[#2DD4BF]/50"
              />
            </div>
          </div>
        </div>

        {/* History Table */}
        {filteredHistory.length === 0 ? (
          <div className="p-8 text-center bg-[#08111E] rounded-xl border border-[#1E283D]/50 text-[#7B8DA8] space-y-2">
            <History className="w-8 h-8 text-[#2DD4BF] opacity-40 mx-auto" />
            <p className="text-xs font-semibold text-[#E8EEF9]">لا توجد صفقات مسجلة تطابق التصفية</p>
            <p className="text-[11px] text-[#7B8DA8] max-w-sm mx-auto">
              بمجرد أن يُنهي الوكلاء الـ 10 أي صفقة بهدف ربح أو وقف خسارة، سيتم قيدها هنا تلقائياً مع تفاصيل الربح ونقاط البيب.
            </p>
            <button
              onClick={handleTriggerTestTrade}
              className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#2DD4BF]/15 text-[#2DD4BF] hover:bg-[#2DD4BF]/25 border border-[#2DD4BF]/40 transition-colors"
            >
              <Zap className="w-3.5 h-3.5" />
              تنفيذ صفقة فورية وتجربة التسجيل الآن
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-[#1E283D]">
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="bg-[#08111E] border-b border-[#1E283D] text-[#7B8DA8] text-[10px]">
                  <th className="py-2 px-3 font-medium">الوقت والتاريخ</th>
                  <th className="py-2 px-3 font-medium">الرمز</th>
                  <th className="py-2 px-3 font-medium">النوع</th>
                  <th className="py-2 px-3 font-medium">اللوت</th>
                  <th className="py-2 px-3 font-medium">سعر الدخول</th>
                  <th className="py-2 px-3 font-medium">سعر الإغلاق</th>
                  <th className="py-2 px-3 font-medium">الوقف (SL)</th>
                  <th className="py-2 px-3 font-medium">الهدف (TP)</th>
                  <th className="py-2 px-3 font-medium">النقاط (Pips)</th>
                  <th className="py-2 px-3 font-medium">الربح / الخسارة ($)</th>
                  <th className="py-2 px-3 font-medium">نسبة الإجماع</th>
                  <th className="py-2 px-3 font-medium">سبب التنفيذ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1E283D]/40 font-mono text-[11px]">
                {filteredHistory.map((trade) => {
                  const isProfit = trade.pnl > 0;
                  const isBreakeven = trade.pnl === 0;

                  return (
                    <tr
                      key={trade.id}
                      className="hover:bg-[#121A2B] transition-colors bg-[#0C1220]/50"
                    >
                      {/* Date & Time */}
                      <td className="py-2.5 px-3 text-[#7B8DA8] whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#556987]" />
                          <span>
                            {new Date(trade.closeTime || trade.openTime).toLocaleDateString()}{' '}
                            {new Date(trade.closeTime || trade.openTime).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                      </td>

                      {/* Symbol */}
                      <td className="py-2.5 px-3 font-bold text-[#E8EEF9] whitespace-nowrap">
                        {trade.symbol}
                      </td>

                      {/* Type */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            trade.type === 'BUY'
                              ? 'bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30'
                              : 'bg-[#EF4444]/15 text-[#EF4444] border border-[#EF4444]/30'
                          }`}
                        >
                          {trade.type === 'BUY' ? (
                            <ArrowUpRight className="w-3 h-3" />
                          ) : (
                            <ArrowDownRight className="w-3 h-3" />
                          )}
                          {trade.type}
                        </span>
                      </td>

                      {/* Lot */}
                      <td className="py-2.5 px-3 text-[#A3B4D0]">{trade.lot}</td>

                      {/* Entry Price */}
                      <td className="py-2.5 px-3 text-[#E8EEF9]">{trade.entryPrice}</td>

                      {/* Exit Price */}
                      <td className="py-2.5 px-3 font-bold text-[#E8EEF9]">{trade.currentPrice}</td>

                      {/* SL / TP */}
                      <td className="py-2.5 px-3 text-[#EF4444]">{trade.sl}</td>
                      <td className="py-2.5 px-3 text-[#22C55E]">{trade.tp}</td>

                      {/* Pips */}
                      <td
                        className={`py-2.5 px-3 font-bold ${
                          isProfit ? 'text-[#22C55E]' : isBreakeven ? 'text-[#7B8DA8]' : 'text-[#EF4444]'
                        }`}
                      >
                        {trade.pnlPips > 0 ? '+' : ''}
                        {trade.pnlPips} pips
                      </td>

                      {/* Realized Profit / Loss (High Visibility) */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-bold ${
                            isProfit
                              ? 'bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40 shadow-[0_0_10px_rgba(34,197,94,0.15)]'
                              : isBreakeven
                              ? 'bg-[#1E283D] text-[#7B8DA8]'
                              : 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40 shadow-[0_0_10px_rgba(239,68,68,0.15)]'
                          }`}
                        >
                          {isProfit ? '+' : ''}${trade.pnl.toFixed(2)}
                          <span className="text-[10px] opacity-75 font-normal">
                            ({trade.pnlPercent > 0 ? '+' : ''}
                            {trade.pnlPercent}%)
                          </span>
                        </span>
                      </td>

                      {/* Consensus */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#A78BFA]/15 text-[#A78BFA] border border-[#A78BFA]/30">
                          {trade.consensusScore}% إجماع
                        </span>
                      </td>

                      {/* Reason & Agents */}
                      <td className="py-2.5 px-3 font-sans text-xs text-[#A3B4D0] max-w-xs truncate" title={trade.reason}>
                        {trade.reason}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. METATRADER 5 SETUP MODAL */}
      {isMt5ModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[#0C1424] border border-[#2DD4BF]/40 rounded-xl max-w-lg w-full p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#1E283D] pb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-[#2DD4BF]" />
                <h3 className="font-bold text-sm text-[#E8EEF9]">
                  ربط الوكلاء الـ 10 مع ميتاتريدر 5 (MT5 EA Bridge)
                </h3>
              </div>
              <button
                onClick={() => setIsMt5ModalOpen(false)}
                className="text-[#7B8DA8] hover:text-[#E8EEF9] text-sm"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#A3B4D0] leading-relaxed">
              لقد قمنا ببرمجة وتجهيز ملف الإكسبيرت <strong>MatrixAgentBridge_5056692955.mq5</strong> ليرتبط مباشرة بحسابك التجريبي <strong>5056692955</strong>. اتبع هذه الخطوات الـ 3 البسيطة للتشغيل في ميتاتريدر 5:
            </p>

            <div className="space-y-2.5 text-xs text-[#E8EEF9]">
              <div className="p-2.5 rounded-lg bg-[#08111E] border border-[#1E283D] flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#2DD4BF] text-[#042F2E] font-bold text-xs flex items-center justify-center shrink-0">
                  1
                </span>
                <div>
                  <span className="font-bold block mb-1.5">حمّل ملف الإكسبيرت أو انسخ الكود:</span>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleDownloadMql5}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#2DD4BF] text-[#042F2E] font-bold hover:bg-[#14B8A6] transition-colors shadow-md active:scale-95 text-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      تحميل MatrixAgentBridge_5056692955.mq5 مباشر
                    </button>

                    <button
                      onClick={handleCopyMql5Code}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#162033] hover:bg-[#1C2740] text-[#E8EEF9] border border-[#243049] transition-colors text-xs"
                    >
                      {copiedCode ? <Check className="w-3.5 h-3.5 text-[#22C55E]" /> : <Copy className="w-3.5 h-3.5 text-[#2DD4BF]" />}
                      {copiedCode ? 'تم نسخ الكود بالكامل!' : 'نسخ كود الإكسبيرت (Copy Code)'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#08111E] border border-[#1E283D] flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#2DD4BF] text-[#042F2E] font-bold text-xs flex items-center justify-center shrink-0">
                  2
                </span>
                <div>
                  <span className="font-bold block mb-0.5">ضعه في ميتاتريدر 5:</span>
                  <p className="text-[11px] text-[#7B8DA8]">
                    في MT5 اضغط <code className="text-[#2DD4BF]">File -&gt; Open Data Folder</code> ثم افتح{' '}
                    <code className="text-[#2DD4BF]">MQL5/Experts</code> والصق الملف هناك، واضغط زر تجميع (Compile) أو أعد تشغيل MT5.
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#08111E] border border-[#1E283D] flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-[#2DD4BF] text-[#042F2E] font-bold text-xs flex items-center justify-center shrink-0">
                  3
                </span>
                <div className="w-full">
                  <span className="font-bold block mb-0.5">تفعيل WebRequest في MT5:</span>
                  <p className="text-[11px] text-[#7B8DA8] mb-1.5">
                    من قائمة <code className="text-[#2DD4BF]">Tools -&gt; Options -&gt; Expert Advisors</code> فعّل خيار{' '}
                    <strong>Allow WebRequest for listed URL</strong> وأضف هذا الرابط:
                  </p>
                  <div className="flex items-center gap-2 bg-[#0C1220] p-1.5 rounded border border-[#1E283D]">
                    <input
                      readOnly
                      value={`${window.location.origin}`}
                      className="bg-transparent text-xs text-[#2DD4BF] font-mono flex-1 outline-hidden"
                    />
                    <button
                      onClick={copyMt5Webhook}
                      className="p-1 rounded hover:bg-[#1E293B] text-[#A3B4D0]"
                    >
                      {copiedUrl ? <Check className="w-3.5 h-3.5 text-[#22C55E]" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setIsMt5ModalOpen(false)}
                className="px-4 py-1.5 rounded-lg font-bold text-xs bg-[#162033] hover:bg-[#1C2740] text-[#E8EEF9] border border-[#243049]"
              >
                فهمت ذلك، تم البدء!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. AGENT DETAILS MODAL */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[#0C1424] border border-[#1E283D] rounded-xl max-w-md w-full p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-[#1E283D] pb-2.5">
              <div>
                <h3 className="font-bold text-sm text-[#E8EEF9]">{selectedAgent.name}</h3>
                <p className="text-xs text-[#2DD4BF]">{selectedAgent.nameAr}</p>
              </div>
              <button
                onClick={() => setSelectedAgent(null)}
                className="text-[#7B8DA8] hover:text-[#E8EEF9] text-sm"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="bg-[#08111E] p-2.5 rounded-lg border border-[#1E283D]">
                <span className="text-[#7B8DA8] text-[11px] block">الدور والاستراتيجية:</span>
                <span className="text-[#E8EEF9] font-medium block">{selectedAgent.role}</span>
                <span className="text-[#2DD4BF] text-[11px] block mt-0.5">{selectedAgent.roleAr}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center font-mono">
                <div className="bg-[#08111E] p-2 rounded-lg border border-[#1E283D]">
                  <span className="text-[#7B8DA8] text-[10px] block font-sans">التصويت</span>
                  <span
                    className={`font-bold ${
                      selectedAgent.vote === 'BUY'
                        ? 'text-[#22C55E]'
                        : selectedAgent.vote === 'SELL'
                        ? 'text-[#EF4444]'
                        : 'text-[#7B8DA8]'
                    }`}
                  >
                    {selectedAgent.vote}
                  </span>
                </div>
                <div className="bg-[#08111E] p-2 rounded-lg border border-[#1E283D]">
                  <span className="text-[#7B8DA8] text-[10px] block font-sans">نسبة الثقة</span>
                  <span className="font-bold text-[#A78BFA]">{selectedAgent.confidence}%</span>
                </div>
                <div className="bg-[#08111E] p-2 rounded-lg border border-[#1E283D]">
                  <span className="text-[#7B8DA8] text-[10px] block font-sans">دقة الإشارات</span>
                  <span className="font-bold text-[#2DD4BF]">{selectedAgent.metrics.accuracyRate}%</span>
                </div>
              </div>

              <div className="bg-[#08111E] p-2.5 rounded-lg border border-[#1E283D]">
                <span className="text-[#7B8DA8] text-[11px] block mb-1">آخر رسالة وفحص:</span>
                <p className="text-[#E8EEF9] text-xs leading-relaxed">{selectedAgent.lastMessage}</p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedAgent(null)}
                className="px-4 py-1.5 rounded-lg font-bold text-xs bg-[#162033] hover:bg-[#1C2740] text-[#E8EEF9] border border-[#243049]"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. DIRECT SCREENSHOT UPLOADER MODAL */}
      <ScreenshotUploaderModal
        isOpen={isScreenshotModalOpen}
        onClose={() => setIsScreenshotModalOpen(false)}
      />
    </div>
  );
};
