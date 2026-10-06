import React, { useEffect, useState, useRef } from 'react';
import { fetchJournalEntries, JournalEntry } from '../../api/journal';
import { fetchPerformanceAnalysis, PerformanceResult } from '../../api/analysis';
import { OfflineBadge } from '../common/OfflineBadge';
import { LoadingSkeleton, EmptyState, ErrorState } from '../common/ScreenState';
import { LangId, DICTS, tl, fmt } from '../../i18n/locales';
import {
  TrendingUp,
  BarChart3,
  RotateCcw,
} from 'lucide-react';

export const AnalyticsDashboardPanel: React.FC<{ currentLang?: LangId }> = ({
  currentLang = 'ar',
}) => {
  const dict = DICTS[currentLang] || DICTS.ar;
  const [trades, setTrades] = useState<JournalEntry[]>([]);
  const [data, setData] = useState<PerformanceResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [activeTab, setActiveTab] = useState<'symbol' | 'timeframe'>('symbol');

  const canvasRef = useRef<HTMLCanvasElement>(null);

  const loadData = async () => {
    setIsLoading(true);
    setIsError(false);
    try {
      const { entries, isOffline: offlineEntries } = await fetchJournalEntries();
      setTrades(entries);

      if (entries.length > 0) {
        const perfRes = await fetchPerformanceAnalysis(entries, 10000);
        setData(perfRes.data);
        setIsOffline(offlineEntries || perfRes.isOffline);
      }
    } catch {
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 4.2 Render Canvas Line for Equity Curve
  useEffect(() => {
    if (!data || !data.equity_curve || data.equity_curve.length === 0) return;
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

    const points = data.equity_curve;
    const values = points.map((p) => p.equity);
    const minVal = Math.min(...values) * 0.995;
    const maxVal = Math.max(...values) * 1.005;
    const range = maxVal - minVal || 1;

    const paddingX = 40;
    const paddingY = 24;
    const chartW = width - paddingX * 2;
    const chartH = height - paddingY * 2;

    // Draw grid lines
    ctx.strokeStyle = '#1E283D';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    for (let i = 0; i <= 4; i++) {
      const y = paddingY + (chartH / 4) * i;
      ctx.beginPath();
      ctx.moveTo(paddingX, y);
      ctx.lineTo(width - paddingX, y);
      ctx.stroke();

      // Price label on right
      const priceVal = maxVal - (range / 4) * i;
      ctx.fillStyle = '#64748B';
      ctx.font = '10px monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`$${priceVal.toFixed(0)}`, width - 6, y + 3);
    }
    ctx.setLineDash([]);

    // Compute pixel coordinates
    const coords = points.map((p, i) => {
      const x = paddingX + (i / (points.length - 1 || 1)) * chartW;
      const y = paddingY + chartH - ((p.equity - minVal) / range) * chartH;
      return { x, y, p };
    });

    // Draw gradient fill under curve
    const gradient = ctx.createLinearGradient(0, paddingY, 0, paddingY + chartH);
    gradient.addColorStop(0, 'rgba(45, 212, 191, 0.25)');
    gradient.addColorStop(1, 'rgba(45, 212, 191, 0.0)');

    ctx.beginPath();
    ctx.moveTo(coords[0].x, paddingY + chartH);
    coords.forEach((c) => ctx.lineTo(c.x, c.y));
    ctx.lineTo(coords[coords.length - 1].x, paddingY + chartH);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw main line
    ctx.beginPath();
    ctx.strokeStyle = '#2DD4BF';
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    coords.forEach((c, i) => {
      if (i === 0) ctx.moveTo(c.x, c.y);
      else ctx.lineTo(c.x, c.y);
    });
    ctx.stroke();

    // Draw dots at points
    coords.forEach((c) => {
      ctx.beginPath();
      ctx.arc(c.x, c.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#0B1220';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#2DD4BF';
      ctx.stroke();
    });
  }, [data]);

  // 4.4 If no closed trades, show empty state - never fake numbers
  if (!isLoading && !isError && trades.length === 0) {
    return (
      <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 select-none text-xs text-[#E8EEF9]">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#243049]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/20 shadow-xs">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white">
                  {tl().tm2_355}
                </h1>
                {isOffline && <OfflineBadge forceShow />}
              </div>
              <p className="text-[#7B8DA8]">
                {tl().tm2_356}
              </p>
            </div>
          </div>

          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-[#141E30] hover:bg-[#1E2B44] text-[#A3B4D0] hover:text-white transition-colors border border-[#243049] flex items-center gap-1.5 self-start sm:self-auto cursor-pointer min-h-[44px]"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{tl().tm2_357}</span>
          </button>
        </div>

        <div className="p-6 max-w-2xl mx-auto">
          <EmptyState
            icon={<BarChart3 className="w-10 h-10 text-[#2DD4BF]" />}
            title={tl().tm2_358}
            message={tl().tm2_359}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-6xl mx-auto space-y-6 select-none text-xs text-[#E8EEF9]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#243049]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#2DD4BF]/10 text-[#2DD4BF] border border-[#2DD4BF]/20 shadow-xs">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white">
                {tl().tm2_355}
              </h1>
              {isOffline && <OfflineBadge forceShow />}
            </div>
            <p className="text-[#7B8DA8]">
              {tl().tm2_356}
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          className="p-2.5 rounded-xl bg-[#141E30] hover:bg-[#1E2B44] text-[#A3B4D0] hover:text-white transition-colors border border-[#243049] flex items-center gap-1.5 self-start sm:self-auto cursor-pointer min-h-[44px]"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>{tl().tm2_357}</span>
        </button>
      </div>

      {isLoading ? (
        <LoadingSkeleton rows={5} />
      ) : isError ? (
        <ErrorState onRetry={loadData} />
      ) : data ? (
        <>
          {/* 4.2 KPI Cards: Win Rate, Profit Factor, Sharpe, Max Drawdown */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            {/* Win Rate */}
            <div className="p-4 rounded-xl bg-[#121A2B] border border-[#243049] space-y-1">
              <span className="text-[#7B8DA8] text-[11px] font-semibold">{tl().tm2_360}</span>
              <div
                className={`text-2xl font-bold font-mono ${
                  data.win_rate >= 50 ? 'text-[#22C55E]' : 'text-[#EF4444]'
                }`}
              >
                {data.win_rate}%
              </div>
              <span className="text-[10px] text-[#64748B]">
                {fmt(tl().mx_winOf, { w: data.winning_trades, t: data.total_trades })}
              </span>
            </div>

            {/* Profit Factor */}
            <div className="p-4 rounded-xl bg-[#121A2B] border border-[#243049] space-y-1">
              <span className="text-[#7B8DA8] text-[11px] font-semibold">
                {tl().tm2_361}
              </span>
              <div className="text-2xl font-bold font-mono text-[#38BDF8]">
                {data.profit_factor}
              </div>
              <span className="text-[10px] text-[#64748B]">{tl().tm2_362}</span>
            </div>

            {/* Sharpe Ratio */}
            <div className="p-4 rounded-xl bg-[#121A2B] border border-[#243049] space-y-1">
              <span className="text-[#7B8DA8] text-[11px] font-semibold">{tl().tm2_363}</span>
              <div
                className={`text-2xl font-bold font-mono ${
                  data.sharpe_ratio >= 1.0 ? 'text-[#22C55E]' : 'text-amber-400'
                }`}
              >
                {data.sharpe_ratio}
              </div>
              <span className="text-[10px] text-[#64748B]">
                {data.sharpe_ratio >= 1.5 ? tl().tm2_364 : tl().tm2_365}
              </span>
            </div>

            {/* Max Drawdown */}
            <div className="p-4 rounded-xl bg-[#121A2B] border border-[#243049] space-y-1">
              <span className="text-[#7B8DA8] text-[11px] font-semibold">
                {tl().tm2_366}
              </span>
              <div className="text-2xl font-bold font-mono text-rose-400">
                {data.max_drawdown_pct}%
              </div>
              <span className="text-[10px] text-[#64748B] font-mono">
                -${data.max_drawdown_usd.toFixed(2)} {tl().mx_maxDd}
              </span>
            </div>
          </div>

          {/* 4.2 Equity Curve Canvas Line */}
          <div className="p-5 bg-[#121A2B] rounded-xl border border-[#243049] space-y-3 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-sm text-white">
                  {tl().tm2_367}
                </h3>
                <p className="text-[11px] text-[#7B8DA8]">
                  {tl().tm2_368}
                </p>
              </div>

              <div className="flex items-center gap-3 font-mono text-xs">
                <span className="text-[#A3B4D0]">
                  {tl().mx_initBal} <strong>${data.initial_balance}</strong>
                </span>
                <span className="text-emerald-400 font-bold">
                  {tl().mx_curEq} ${data.current_equity}
                </span>
              </div>
            </div>

            <div className="w-full h-56 bg-[#08111E] rounded-xl p-2 border border-[#1E283D] relative overflow-hidden">
              <canvas ref={canvasRef} className="w-full h-full block" />
            </div>
          </div>

          {/* 4.2 Distribution by Symbol and by Timeframe (Bars) */}
          <div className="p-5 bg-[#121A2B] rounded-xl border border-[#243049] space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-[#1E283D] pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-[#2DD4BF]" />
                <h3 className="font-bold text-sm text-white">{tl().tm2_369}</h3>
              </div>

              <div className="flex items-center gap-1.5 bg-[#0B1220] p-1 rounded-xl border border-[#243049]">
                <button
                  onClick={() => setActiveTab('symbol')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[38px] cursor-pointer ${
                    activeTab === 'symbol'
                      ? 'bg-[#2DD4BF] text-[#042F2E]'
                      : 'text-[#7B8DA8] hover:text-white'
                  }`}
                >
                  {tl().tm2_370}
                </button>
                <button
                  onClick={() => setActiveTab('timeframe')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors min-h-[38px] cursor-pointer ${
                    activeTab === 'timeframe'
                      ? 'bg-[#2DD4BF] text-[#042F2E]'
                      : 'text-[#7B8DA8] hover:text-white'
                  }`}
                >
                  {tl().tm2_371}
                </button>
              </div>
            </div>

            {/* Bars List */}
            <div className="space-y-3">
              {activeTab === 'symbol' ? (
                Object.keys(data.by_symbol).length === 0 ? (
                  <div className="text-center py-6 text-[#64748B]">{tl().tm2_372}</div>
                ) : (
                  Object.entries(data.by_symbol).map(([sym, item]) => {
                    const isProfit = item.pnl >= 0;
                    return (
                      <div key={sym} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="font-bold text-white">{sym}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-[#7B8DA8] font-sans">
                              {fmt(tl().mx_tradesWin, { n: item.trades, w: item.win_rate })}
                            </span>
                            <span
                              className={`font-bold ${
                                isProfit ? 'text-[#22C55E]' : 'text-[#EF4444]'
                              }`}
                            >
                              {isProfit ? '+' : ''}${item.pnl}
                            </span>
                          </div>
                        </div>

                        {/* Bar */}
                        <div className="w-full h-2 bg-[#0B1220] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isProfit ? 'bg-[#22C55E]' : 'bg-[#EF4444]'
                            }`}
                            style={{
                              width: `${Math.min(100, Math.max(10, item.win_rate))}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })
                )
              ) : Object.keys(data.by_timeframe).length === 0 ? (
                <div className="text-center py-6 text-[#64748B]">{tl().tm2_373}</div>
              ) : (
                Object.entries(data.by_timeframe).map(([tf, item]) => {
                  const isProfit = item.pnl >= 0;
                  return (
                    <div key={tf} className="space-y-1">
                      <div className="flex items-center justify-between text-xs font-mono">
                        <span className="font-bold text-white">{tf}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-[#7B8DA8] font-sans">
                            {fmt(tl().mx_tradesWin, { n: item.trades, w: item.win_rate })}
                          </span>
                          <span
                            className={`font-bold ${
                              isProfit ? 'text-[#22C55E]' : 'text-[#EF4444]'
                            }`}
                          >
                            {isProfit ? '+' : ''}${item.pnl}
                          </span>
                        </div>
                      </div>

                      {/* Bar */}
                      <div className="w-full h-2 bg-[#0B1220] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            isProfit ? 'bg-[#38BDF8]' : 'bg-[#EF4444]'
                          }`}
                          style={{
                            width: `${Math.min(100, Math.max(10, item.win_rate))}%`,
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
