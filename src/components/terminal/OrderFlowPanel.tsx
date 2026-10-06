import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Candle } from '../../types/market';
import { fetchOrderFlowAnalysis, OrderFlowBar } from '../../api/analysis';
import { OfflineBadge } from '../common/OfflineBadge';
import { LoadingSkeleton, EmptyState, ErrorState } from '../common/ScreenState';
import {
  Activity,
  TrendingUp,
  TrendingDown,
  X,
  Layers,
  ChevronDown,
  ChevronUp,
  BarChart2,
  Sparkles,
} from 'lucide-react';
import { tl, fmt } from '../../i18n/locales';

interface OrderFlowPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  candles: Candle[];
  symbol: string;
  timeframe: string;
  currentTab?: string;
}

export const OrderFlowPanel: React.FC<OrderFlowPanelProps> = ({
  isOpen,
  onToggle,
  candles,
  symbol,
  timeframe,
  currentTab = 'home',
}) => {
  const [data, setData] = useState<OrderFlowBar[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isError, setIsError] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 4.4 Analysis strictly on CLOSED candles only (exclude forming candle)
  const closedCandles = useMemo(() => {
    if (!candles || candles.length <= 1) return [];
    return candles.slice(0, candles.length - 1);
  }, [candles]);

  const loadOrderFlow = async () => {
    if (closedCandles.length < 5) {
      setData([]);
      return;
    }
    setIsLoading(true);
    setIsError(false);
    try {
      const res = await fetchOrderFlowAnalysis(closedCandles, symbol, timeframe);
      if (res.data) {
        setData(res.data);
      }
      setIsOffline(res.isOffline);
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadOrderFlow();
    }
  }, [isOpen, closedCandles.length, symbol, timeframe]);

  // Render CVD Line on Canvas
  useEffect(() => {
    if (!isOpen || data.length === 0) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const values = data.map((d) => d.cumulative_delta);
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const range = maxVal - minVal || 1;

    const padX = 20;
    const padY = 16;
    const chartW = width - padX * 2;
    const chartH = height - padY * 2;

    // Zero line
    const zeroY = padY + chartH - ((0 - minVal) / range) * chartH;
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(padX, zeroY);
    ctx.lineTo(width - padX, zeroY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Line
    const coords = data.map((d, i) => ({
      x: padX + (i / (data.length - 1 || 1)) * chartW,
      y: padY + chartH - ((d.cumulative_delta - minVal) / range) * chartH,
    }));

    ctx.beginPath();
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2;
    coords.forEach((c, i) => {
      if (i === 0) ctx.moveTo(c.x, c.y);
      else ctx.lineTo(c.x, c.y);
    });
    ctx.stroke();
  }, [isOpen, data]);

  if (!isOpen) {
    if (currentTab && currentTab !== 'home') return null;
    return (
      <button
        onClick={onToggle}
        className="fixed bottom-[calc(4.25rem+env(safe-area-inset-bottom,0px))] md:bottom-8 left-3 md:left-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F172A]/90 hover:bg-[#1E293B] border border-[#2DD4BF]/40 text-[#2DD4BF] text-xs font-bold shadow-lg backdrop-blur-sm transition-all"
        title={tl().tm_80}
      >
        <Activity className="w-3.5 h-3.5" />
        <span>{tl().tm_81}</span>
        <ChevronUp className="w-3.5 h-3.5" />
      </button>
    );
  }

  // Summary Metrics (Last bar values)
  const lastBar = data[data.length - 1];
  const totalDelta = data.reduce((acc, b) => acc + b.delta, 0);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 bg-[#0B1322]/95 border-t border-[#243049] shadow-2xl backdrop-blur-md flex flex-col max-h-[45vh] text-xs text-[#E8EEF9] select-none animate-in slide-in-from-bottom-6">
      {/* Header Bar */}
      <div className="px-4 py-2 bg-[#080E1A] border-b border-[#1E283D] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#2DD4BF]" />
          <h3 className="font-bold text-xs text-white">
            لوحة تدفق الأوامر والدلتا التراكمية (Order Flow & CVD) - {symbol} ({timeframe})
          </h3>
          <span className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 font-bold text-[10px]">
            تقديري (Estimated)
          </span>
          {isOffline && <OfflineBadge forceShow />}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className="p-1 rounded text-[#7B8DA8] hover:text-white hover:bg-[#162033]"
            title={tl().tm_82}
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isLoading ? (
          <LoadingSkeleton rows={4} />
        ) : isError ? (
          <ErrorState onRetry={loadOrderFlow} />
        ) : closedCandles.length < 5 ? (
          <EmptyState
            icon={<Activity className="w-8 h-8 text-[#2DD4BF]" />}
            title={tl().tm_83}
            message={tl().tm_84}
          />
        ) : (
          <>
            {/* KPI Cards: Delta, CVD, Imbalance */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Delta Last */}
              <div className="p-3 bg-[#121A2B] rounded-xl border border-[#243049] space-y-1">
                <div className="flex items-center justify-between text-[11px] text-[#7B8DA8]">
                  <span>{tl().tm_85}</span>
                  <span className="text-[9px] text-amber-400">{tl().tm_86}</span>
                </div>
                <div
                  className={`text-lg font-bold font-mono ${
                    (lastBar?.delta ?? 0) >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                  }`}
                >
                  {(lastBar?.delta ?? 0) >= 0 ? '+' : ''}
                  {lastBar?.delta ?? 0}
                </div>
              </div>

              {/* Total Delta */}
              <div className="p-3 bg-[#121A2B] rounded-xl border border-[#243049] space-y-1">
                <div className="flex items-center justify-between text-[11px] text-[#7B8DA8]">
                  <span>{tl().tm_87}</span>
                  <span className="text-[9px] text-amber-400">{tl().tm_86}</span>
                </div>
                <div
                  className={`text-lg font-bold font-mono ${
                    totalDelta >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                  }`}
                >
                  {totalDelta >= 0 ? '+' : ''}
                  {totalDelta}
                </div>
              </div>

              {/* Cumulative CVD */}
              <div className="p-3 bg-[#121A2B] rounded-xl border border-[#243049] space-y-1">
                <div className="flex items-center justify-between text-[11px] text-[#7B8DA8]">
                  <span>{tl().tm_88}</span>
                  <span className="text-[9px] text-amber-400">{tl().tm_86}</span>
                </div>
                <div className="text-lg font-bold font-mono text-[#F59E0B]">
                  {lastBar?.cumulative_delta ?? 0}
                </div>
              </div>

              {/* Buy / Sell Imbalance */}
              <div className="p-3 bg-[#121A2B] rounded-xl border border-[#243049] space-y-1">
                <div className="flex items-center justify-between text-[11px] text-[#7B8DA8]">
                  <span>{tl().tm_89}</span>
                  <span className="text-[9px] text-amber-400">{tl().tm_86}</span>
                </div>
                <div
                  className={`text-lg font-bold font-mono ${
                    (lastBar?.imbalance_pct ?? 0) >= 0 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                  }`}
                >
                  {(lastBar?.imbalance_pct ?? 0) >= 0 ? '+' : ''}
                  {lastBar?.imbalance_pct ?? 0}%
                </div>
              </div>
            </div>

            {/* CVD Canvas Line */}
            <div className="p-3 bg-[#121A2B] rounded-xl border border-[#243049] space-y-2">
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <BarChart2 className="w-3.5 h-3.5 text-[#F59E0B]" />
                  <span>{tl().tm_90}</span>
                </span>
                <span className="text-[10px] text-[#7B8DA8]">
                  {tl().tm_91}
                </span>
              </div>
              <div className="w-full h-24 bg-[#08101E] rounded-lg p-1 border border-[#1E283D]">
                <canvas ref={canvasRef} className="w-full h-full block" />
              </div>
            </div>

            {/* Order Flow Bars Table */}
            <div className="bg-[#121A2B] rounded-xl border border-[#243049] overflow-hidden">
              <div className="overflow-x-auto">
                {/* Desktop Table View */}
                <table className="hidden md:table w-full text-right divide-y divide-[#243049]/60">
                  <thead className="bg-[#0B1220] text-[#7B8DA8] text-[10px] font-semibold">
                    <tr>
                      <th className="py-2 px-3">{tl().tm_92}</th>
                      <th className="py-2 px-3">{tl().tm_93}</th>
                      <th className="py-2 px-3">{tl().tm_94}</th>
                      <th className="py-2 px-3">{tl().tm_95}</th>
                      <th className="py-2 px-3">{tl().tm_96}</th>
                      <th className="py-2 px-3">{tl().tm_97}</th>
                      <th className="py-2 px-3 text-center">{tl().tm_98}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#243049]/40 text-xs font-mono">
                    {data.slice(-10).reverse().map((b, idx) => {
                      const isPositiveDelta = b.delta >= 0;
                      const dateStr = new Date(b.time * 1000).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      return (
                        <tr key={idx} className="hover:bg-[#162033]/60 transition-colors">
                          <td className="py-2 px-3 text-[#7B8DA8]">{dateStr}</td>
                          <td className="py-2 px-3 text-white font-bold">{b.close}</td>
                          <td className="py-2 px-3 text-emerald-400">{b.buy_volume}</td>
                          <td className="py-2 px-3 text-rose-400">{b.sell_volume}</td>
                          <td
                            className={`py-2 px-3 font-bold ${
                              isPositiveDelta ? 'text-[#22C55E]' : 'text-[#EF4444]'
                            }`}
                          >
                            {isPositiveDelta ? '+' : ''}
                            {b.delta}
                          </td>
                          <td className="py-2 px-3 text-amber-400">{b.cumulative_delta}</td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                b.imbalance_pct >= 0
                                  ? 'bg-emerald-500/15 text-emerald-400'
                                  : 'bg-rose-500/15 text-rose-400'
                              }`}
                            >
                              {b.imbalance_pct >= 0 ? '+' : ''}
                              {b.imbalance_pct}%
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Mobile Card View (Part 1.6: no horizontal scroll) */}
                <div className="md:hidden space-y-2 p-2">
                  {data.slice(-8).reverse().map((b, idx) => {
                    const isPositiveDelta = b.delta >= 0;
                    const dateStr = new Date(b.time * 1000).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    });
                    return (
                      <div
                        key={idx}
                        className="p-2.5 rounded-lg bg-[#08101E] border border-[#1E283D] space-y-1.5 text-xs font-mono"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[#7B8DA8] text-[10px]">{dateStr}</span>
                          <span className="text-white font-bold">{b.close}</span>
                          <span
                            className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                              isPositiveDelta ? 'bg-emerald-500/15 text-[#22C55E]' : 'bg-rose-500/15 text-[#EF4444]'
                            }`}
                          >
                            Δ {isPositiveDelta ? '+' : ''}{b.delta}
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1 text-[10px] text-center bg-[#050B14] p-1.5 rounded">
                          <div>
                            <span className="text-emerald-400 block font-bold">{b.buy_volume}</span>
                            <span className="text-[#64748B] text-[8px]">{tl().tm_99}</span>
                          </div>
                          <div>
                            <span className="text-rose-400 block font-bold">{b.sell_volume}</span>
                            <span className="text-[#64748B] text-[8px]">{tl().tm_100}</span>
                          </div>
                          <div>
                            <span className="text-amber-400 block font-bold">{b.cumulative_delta}</span>
                            <span className="text-[#64748B] text-[8px]">CVD</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
