import React, { useState } from 'react';
import { MarketSymbol, Timeframe } from '../../types/market';
import { Sparkles, TrendingUp, TrendingDown, Target, ShieldAlert, Calculator, ChevronRight, X, Layers, Check } from 'lucide-react';

interface AiCopilotPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeSymbol: MarketSymbol;
  timeframe: Timeframe;
}

export const AiCopilotPanel: React.FC<AiCopilotPanelProps> = ({
  isOpen,
  onClose,
  activeSymbol,
  timeframe,
}) => {
  const [accountBalance, setAccountBalance] = useState<number>(10000);
  const [riskPercent, setRiskPercent] = useState<number>(1);
  const [stopLossPips, setStopLossPips] = useState<number>(25);

  if (!isOpen) return null;

  // Real-time calculated levels based on symbol price
  const price = activeSymbol.price;
  const spread = activeSymbol.spread || 1.2;
  const isUp = activeSymbol.change24h >= 0;

  // Support & Resistance Math
  const r1 = +(price * 1.0045).toFixed(activeSymbol.precision);
  const r2 = +(price * 1.0090).toFixed(activeSymbol.precision);
  const s1 = +(price * 0.9955).toFixed(activeSymbol.precision);
  const s2 = +(price * 0.9910).toFixed(activeSymbol.precision);

  // Position Size Formula
  const riskAmount = (accountBalance * (riskPercent / 100));
  const pipValuePerStandardLot = activeSymbol.symbol.includes('JPY') ? 6.5 : 10;
  const calculatedLot = +(riskAmount / (stopLossPips * pipValuePerStandardLot)).toFixed(2);

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
              تحليل كمي فوري لـ {activeSymbol.symbol} ({timeframe})
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-[#64748B] hover:text-white hover:bg-[#16233B] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Market Pulse Card */}
        <div className="p-3.5 rounded-xl bg-[#0F1B2E] border border-[#1E2E4A] space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-extrabold text-white">{activeSymbol.symbol}</span>
              <span className="text-[10px] text-[#64748B]">{activeSymbol.name}</span>
            </div>
            <div className="text-right">
              <span className="font-mono text-sm font-bold text-white block">
                {activeSymbol.price.toFixed(activeSymbol.precision)}
              </span>
              <span className={`text-[10px] font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                {isUp ? '+' : ''}{activeSymbol.change24h.toFixed(2)}%
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#1A2A44] flex items-center justify-between text-[11px] text-[#94A3B8]">
            <span>السبريد: <strong className="text-white font-mono">{spread} نقطة</strong></span>
            <span>السيولة: <strong className="text-emerald-400">مرتفعة (London/NY)</strong></span>
          </div>
        </div>

        {/* Technical Structure & Levels */}
        <div className="p-3.5 rounded-xl bg-[#0F1B2E] border border-[#1E2E4A] space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <Target className="w-4 h-4 text-[#2DD4BF]" />
            <span>مستويات الدعم والمقاومة اللحظية</span>
          </div>

          <div className="space-y-1.5 text-[11px] font-mono">
            <div className="flex items-center justify-between p-1.5 rounded bg-rose-950/30 border border-rose-900/40 text-rose-300">
              <span>مقاومة ثانية (R2)</span>
              <span className="font-bold">{r2}</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-rose-950/20 border border-rose-900/30 text-rose-300">
              <span>مقاومة أولى (R1)</span>
              <span className="font-bold">{r1}</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-[#16253D] border border-[#243B61] text-[#2DD4BF]">
              <span>السعر الحالي</span>
              <span className="font-bold">{price.toFixed(activeSymbol.precision)}</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-emerald-950/20 border border-emerald-900/30 text-emerald-300">
              <span>دعم أول (S1)</span>
              <span className="font-bold">{s1}</span>
            </div>
            <div className="flex items-center justify-between p-1.5 rounded bg-emerald-950/30 border border-emerald-900/40 text-emerald-300">
              <span>دعم ثانٍ (S2)</span>
              <span className="font-bold">{s2}</span>
            </div>
          </div>
        </div>

        {/* AI Scenarios */}
        <div className="p-3.5 rounded-xl bg-[#0F1B2E] border border-[#1E2E4A] space-y-2.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <Layers className="w-4 h-4 text-[#2DD4BF]" />
            <span>السيناريوهات الفنية المقترحة</span>
          </div>

          {/* Bullish */}
          <div className="p-2.5 rounded-lg bg-[#0A1628] border border-emerald-900/40 space-y-1 text-[11px]">
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>السيناريو الإيجابي (الصاعد)</span>
            </div>
            <p className="text-[#94A3B8] leading-relaxed">
              ثبات السعر أعلى الدعم {s1} يؤكد استمرار الزخم نحو المقاومة {r1}.
            </p>
          </div>

          {/* Bearish */}
          <div className="p-2.5 rounded-lg bg-[#0A1628] border border-rose-900/40 space-y-1 text-[11px]">
            <div className="flex items-center gap-1.5 text-rose-400 font-bold">
              <TrendingDown className="w-3.5 h-3.5" />
              <span>السيناريو السلبي (الهابط)</span>
            </div>
            <p className="text-[#94A3B8] leading-relaxed">
              كسر الدعم {s1} بإغلاق شمعة يؤهل السعر لاختبار مستوى {s2}.
            </p>
          </div>
        </div>

        {/* Risk & Lot Size Calculator */}
        <div className="p-3.5 rounded-xl bg-[#0F1B2E] border border-[#1E2E4A] space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-white">
            <Calculator className="w-4 h-4 text-[#2DD4BF]" />
            <span>حاسبة حجم العقد وإدارة المخاطر</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <label className="text-[#94A3B8] block mb-1">رأس المال ($):</label>
              <input
                type="number"
                value={accountBalance}
                onChange={(e) => setAccountBalance(+e.target.value)}
                className="w-full bg-[#070D18] border border-[#1E2E4A] rounded p-1.5 text-white font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="text-[#94A3B8] block mb-1">نسبة المخاطرة (%):</label>
              <input
                type="number"
                value={riskPercent}
                onChange={(e) => setRiskPercent(+e.target.value)}
                step="0.5"
                className="w-full bg-[#070D18] border border-[#1E2E4A] rounded p-1.5 text-white font-mono focus:outline-none"
              />
            </div>
          </div>

          <div className="p-2.5 rounded-lg bg-[#070D18] border border-[#1E2E4A] flex items-center justify-between">
            <span className="text-[#94A3B8] text-[11px]">اللوت الموصى به:</span>
            <span className="text-sm font-extrabold font-mono text-[#2DD4BF]">
              {calculatedLot > 0 ? calculatedLot : 0.01} Lot
            </span>
          </div>
        </div>

        {/* Mandatory Disclaimer */}
        <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-900/40 text-[10px] text-[#A3B4D0] flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            تنبيه: تحليلات المساعد الذكي هي أدوات رياضية مساعدة وليست توصيات بيع أو شراء مالية.
          </p>
        </div>
      </div>
    </div>
  );
};
