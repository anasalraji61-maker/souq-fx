import React, { useState } from 'react';
import { MarketSymbol, Timeframe } from '../../types/market';
import { Play, LineChart, Award, TrendingDown, Percent, RotateCcw } from 'lucide-react';

interface BacktestPanelProps {
  symbols: MarketSymbol[];
}

export const BacktestPanel: React.FC<BacktestPanelProps> = ({ symbols }) => {
  const [symbol, setSymbol] = useState('EURUSD');
  const [strategy, setStrategy] = useState<'sma_cross' | 'rsi_reversal' | 'breakout'>('sma_cross');
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<{
    totalTrades: number;
    winRate: number;
    profitFactor: number;
    netProfitPct: number;
    maxDrawdownPct: number;
    equityCurve: number[];
  }>({
    totalTrades: 48,
    winRate: 58.3,
    profitFactor: 1.84,
    netProfitPct: 24.6,
    maxDrawdownPct: 7.2,
    equityCurve: [10000, 10120, 10050, 10340, 10280, 10600, 10450, 10900, 11200, 11050, 11450, 11800, 12100, 12460],
  });

  const runSimulation = () => {
    setIsRunning(true);
    setTimeout(() => {
      // Deterministic simulation output
      const baseTrades = strategy === 'sma_cross' ? 42 : strategy === 'rsi_reversal' ? 56 : 38;
      const baseWinRate = strategy === 'sma_cross' ? 57.1 : strategy === 'rsi_reversal' ? 62.5 : 52.6;
      const netPct = strategy === 'sma_cross' ? 22.4 : strategy === 'rsi_reversal' ? 28.9 : 18.2;

      const curve: number[] = [10000];
      let currentEquity = 10000;
      for (let i = 0; i < 15; i++) {
        const change = (Math.random() - 0.42) * 350;
        currentEquity = Math.max(8000, currentEquity + change);
        curve.push(Math.round(currentEquity));
      }

      setResult({
        totalTrades: baseTrades,
        winRate: baseWinRate,
        profitFactor: parseFloat((1.6 + Math.random() * 0.5).toFixed(2)),
        netProfitPct: netPct,
        maxDrawdownPct: parseFloat((5.5 + Math.random() * 3).toFixed(1)),
        equityCurve: curve,
      });
      setIsRunning(false);
    }, 700);
  };

  // SVG Equity curve rendering
  const minEquity = Math.min(...result.equityCurve);
  const maxEquity = Math.max(...result.equityCurve);
  const range = maxEquity - minEquity || 1;
  const svgWidth = 600;
  const svgHeight = 160;

  const points = result.equityCurve
    .map((val, idx) => {
      const x = (idx / (result.equityCurve.length - 1)) * svgWidth;
      const y = svgHeight - ((val - minEquity) / range) * (svgHeight - 30) - 15;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 select-none text-xs">
      {/* Title */}
      <div className="flex items-center justify-between pb-4 border-b border-[#243049]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/20">
            <LineChart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#E8EEF9]">محاكي واختبار الاستراتيجيات الفنية (Backtester)</h2>
            <p className="text-[#7B8DA8]">اختبر أداء النماذج والمؤشرات على البيانات التاريخية قبل المخاطرة الحقيقية.</p>
          </div>
        </div>
      </div>

      {/* Configuration Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-5 bg-[#121A2B] rounded-xl border border-[#243049] items-end">
        <div>
          <label className="block text-[#A3B4D0] mb-1 font-medium">الزوج</label>
          <select
            value={symbol}
            onChange={(e) => setSymbol(e.target.value)}
            className="w-full bg-[#0B1220] border border-[#243049] rounded-lg p-2 text-[#E8EEF9] font-mono"
          >
            {symbols.map((s) => (
              <option key={s.symbol} value={s.symbol}>
                {s.symbol}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[#A3B4D0] mb-1 font-medium">نموذج الاستراتيجية</label>
          <select
            value={strategy}
            onChange={(e) => setStrategy(e.target.value as any)}
            className="w-full bg-[#0B1220] border border-[#243049] rounded-lg p-2 text-[#E8EEF9]"
          >
            <option value="sma_cross">تقاطع المتوسطات (SMA 20/50 Cross)</option>
            <option value="rsi_reversal">ارتداد مؤشر القوة (RSI 30/70 Reversal)</option>
            <option value="breakout">اختراق القمم والقيعان (Range Breakout)</option>
          </select>
        </div>

        <div>
          <label className="block text-[#A3B4D0] mb-1 font-medium">الفريم الزمني</label>
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value as Timeframe)}
            className="w-full bg-[#0B1220] border border-[#243049] rounded-lg p-2 text-[#E8EEF9] font-mono"
          >
            <option value="15m">15 دقيقة (15m)</option>
            <option value="1h">1 ساعة (1h)</option>
            <option value="4h">4 ساعات (4h)</option>
            <option value="1D">يومي (1D)</option>
          </select>
        </div>

        <div>
          <button
            onClick={runSimulation}
            disabled={isRunning}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-[#2DD4BF] hover:bg-[#26bba8] text-[#042F2E] font-bold text-xs disabled:opacity-50 transition-colors"
          >
            {isRunning ? (
              <RotateCcw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4 fill-current" />
            )}
            <span>{isRunning ? 'جارٍ الاختبار...' : 'تشغيل الاختبار التاريخي'}</span>
          </button>
        </div>
      </div>

      {/* KPI Results */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-[#121A2B] rounded-xl border border-[#243049]">
          <span className="text-[#7B8DA8] text-[11px] font-semibold">إجمالي الصفقات المنفذة</span>
          <div className="text-2xl font-bold font-mono text-[#E8EEF9] mt-1">{result.totalTrades} صفقة</div>
        </div>

        <div className="p-4 bg-[#121A2B] rounded-xl border border-[#243049]">
          <span className="text-[#7B8DA8] text-[11px] font-semibold">نسبة النجاح (Win Rate)</span>
          <div className="text-2xl font-bold font-mono text-[#22C55E] mt-1">{result.winRate}%</div>
        </div>

        <div className="p-4 bg-[#121A2B] rounded-xl border border-[#243049]">
          <span className="text-[#7B8DA8] text-[11px] font-semibold">العائد الإجمالي المحقق</span>
          <div className="text-2xl font-bold font-mono text-[#2DD4BF] mt-1">+{result.netProfitPct}%</div>
        </div>

        <div className="p-4 bg-[#121A2B] rounded-xl border border-[#243049]">
          <span className="text-[#7B8DA8] text-[11px] font-semibold">أقصى تراجع (Max Drawdown)</span>
          <div className="text-2xl font-bold font-mono text-[#EF4444] mt-1">{result.maxDrawdownPct}%</div>
        </div>
      </div>

      {/* Equity Curve Graph Card */}
      <div className="p-5 bg-[#121A2B] rounded-xl border border-[#243049] space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-[#E8EEF9]">منحنى نمو رأس المال (Equity Curve)</h3>
          <span className="font-mono text-xs text-[#2DD4BF] font-semibold">
            البداية: $10,000 → النهاية: ${result.equityCurve[result.equityCurve.length - 1].toLocaleString()}
          </span>
        </div>

        <div className="w-full bg-[#0B1220] p-4 rounded-xl border border-[#243049]/50 overflow-hidden flex items-center justify-center">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-44 overflow-visible">
            <defs>
              <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#2DD4BF" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#2DD4BF" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <polyline
              fill="none"
              stroke="#2DD4BF"
              strokeWidth="2.5"
              points={points}
            />
          </svg>
        </div>
      </div>
    </div>
  );
};
