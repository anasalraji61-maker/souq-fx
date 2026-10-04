import React, { useEffect, useState } from 'react';

interface EquityPoint {
  trade_num: number;
  symbol?: string;
  pnl: number;
  equity: number;
  drawdown_pct: number;
  time?: string;
}

interface PerformanceBreakdown {
  trades: number;
  wins: number;
  win_rate_pct: number;
  total_pnl: number;
}

interface AnalyticsData {
  initial_balance: number;
  current_equity: number;
  total_net_profit: number;
  net_roi_pct: number;
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  break_even_trades: number;
  win_rate_pct: number;
  gross_profit: number;
  gross_loss: number;
  profit_factor: number;
  sharpe_ratio: number;
  max_drawdown_pct: number;
  max_drawdown_usd: number;
  equity_curve: EquityPoint[];
  distribution_by_pair: Record<string, PerformanceBreakdown>;
  distribution_by_timeframe: Record<string, PerformanceBreakdown>;
}

export const AnalyticsDashboardPanel: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pairs' | 'timeframes'>('pairs');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/analytics/dashboard');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        throw new Error('فشل جلب بيانات سجل الأداء');
      }
    } catch (err: any) {
      setError(err?.message || 'تعذر تحميل تحليلات المحفظة');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 md:p-6 text-slate-100 shadow-2xl space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse" />
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-white">
              لوحة تحليلات الأداء ومنحنى رأس المال (Performance Analytics)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            متابعة منحنى رأس المال (Equity Curve)، نسبة الفوز، معامل الربحية، Sharpe Ratio، وأقصى تراجع
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="p-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
        >
          🔄
        </button>
      </div>

      {loading && (
        <div className="h-48 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400">جاري احتساب منحنى النمو ومقاييس الأداء...</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-950/40 border border-red-800/60 rounded-lg text-xs text-red-300">
          ⚠️ {error}
        </div>
      )}

      {!loading && data && (
        <>
          {/* Main KPI Grid */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            {/* Net ROI */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                العائد الصافي (ROI)
              </span>
              <div
                className={`text-lg md:text-xl font-mono font-extrabold mt-1 ${
                  data.total_net_profit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {data.total_net_profit >= 0 ? '+' : ''}${data.total_net_profit.toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-400">{data.net_roi_pct}% نمو</span>
            </div>

            {/* Win Rate */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                نسبة الفوز (Win Rate)
              </span>
              <div className="text-lg md:text-xl font-mono font-extrabold text-white mt-1">
                {data.win_rate_pct}%
              </div>
              <span className="text-[11px] text-slate-400">
                {data.winning_trades} رابحة / {data.total_trades}
              </span>
            </div>

            {/* Profit Factor */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                معامل الربح (Profit Factor)
              </span>
              <div className="text-lg md:text-xl font-mono font-extrabold text-cyan-300 mt-1">
                {data.profit_factor.toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-400">
                ${data.gross_profit.toFixed(0)} / ${data.gross_loss.toFixed(0)}
              </span>
            </div>

            {/* Sharpe Ratio */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                نسبة شارب (Sharpe)
              </span>
              <div className="text-lg md:text-xl font-mono font-extrabold text-amber-300 mt-1">
                {data.sharpe_ratio.toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-400">
                {data.sharpe_ratio >= 1.5 ? 'ممتاز' : 'معتدل'}
              </span>
            </div>

            {/* Max Drawdown */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                أقصى تراجع (Max Drawdown)
              </span>
              <div className="text-lg md:text-xl font-mono font-extrabold text-rose-400 mt-1">
                {data.max_drawdown_pct}%
              </div>
              <span className="text-[11px] text-slate-400">
                -${data.max_drawdown_usd.toFixed(2)}
              </span>
            </div>

            {/* Current Balance */}
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-lg p-3">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                رأس المال الحالي
              </span>
              <div className="text-lg md:text-xl font-mono font-extrabold text-white mt-1">
                ${data.current_equity.toFixed(2)}
              </div>
              <span className="text-[11px] text-slate-400">
                البداية: ${data.initial_balance.toFixed(0)}
              </span>
            </div>
          </div>

          {/* Equity Curve SVG Chart */}
          <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-800">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span>📈</span> مسار نمو رأس المال (Equity Progression)
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {data.equity_curve.length - 1} صفقات منفذة
              </span>
            </div>

            <div className="h-44 w-full relative">
              {data.equity_curve.length >= 2 ? (
                <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 500 160">
                  {/* Grid Lines */}
                  <line x1="0" y1="40" x2="500" y2="40" stroke="#334155" strokeDasharray="3,3" strokeWidth="0.8" />
                  <line x1="0" y1="80" x2="500" y2="80" stroke="#334155" strokeDasharray="3,3" strokeWidth="0.8" />
                  <line x1="0" y1="120" x2="500" y2="120" stroke="#334155" strokeDasharray="3,3" strokeWidth="0.8" />

                  {/* Polyline Curve */}
                  {(() => {
                    const equities = data.equity_curve.map((p) => p.equity);
                    const minEq = Math.min(...equities) * 0.98;
                    const maxEq = Math.max(...equities) * 1.02;
                    const range = Math.max(1, maxEq - minEq);

                    const points = data.equity_curve
                      .map((p, idx) => {
                        const x = (idx / (data.equity_curve.length - 1)) * 500;
                        const y = 150 - ((p.equity - minEq) / range) * 130;
                        return `${x},${y}`;
                      })
                      .join(' ');

                    return (
                      <>
                        <polygon
                          points={`0,150 ${points} 500,150`}
                          fill="url(#equityGrad)"
                          opacity="0.25"
                        />
                        <polyline
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={points}
                        />
                        <defs>
                          <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                          </linearGradient>
                        </defs>
                      </>
                    );
                  })()}
                </svg>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  لا توجد صفقات مغلقة كافية لرسم المنحنى البياني حتى الآن.
                </div>
              )}
            </div>
          </div>

          {/* Breakdown Tabs: Pairs vs Timeframes */}
          <div className="bg-slate-800/40 rounded-lg p-4 border border-slate-800 space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-700/60 pb-2">
              <button
                onClick={() => setActiveTab('pairs')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  activeTab === 'pairs'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                توزيع الأرباح حسب الزوج (Pairs)
              </button>
              <button
                onClick={() => setActiveTab('timeframes')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                  activeTab === 'timeframes'
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                توزيع الأرباح حسب الفريم (Timeframes)
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-right">
                <thead>
                  <tr className="text-slate-400 border-b border-slate-700/40 pb-1">
                    <th className="py-2 px-2">الفئة</th>
                    <th className="py-2 px-2">عدد الصفقات</th>
                    <th className="py-2 px-2">الصفقات الرابحة</th>
                    <th className="py-2 px-2">نسبة الفوز</th>
                    <th className="py-2 px-2">صافي الربح / الخسارة</th>
                  </tr>
                </thead>
                <tbody>
                  {activeTab === 'pairs' &&
                    Object.entries(data.distribution_by_pair).map(([pair, stats]) => (
                      <tr key={pair} className="border-b border-slate-800/40 hover:bg-slate-800/30">
                        <td className="py-2 px-2 font-mono font-bold text-white">{pair}</td>
                        <td className="py-2 px-2 font-mono">{stats.trades}</td>
                        <td className="py-2 px-2 font-mono">{stats.wins}</td>
                        <td className="py-2 px-2 font-mono">{stats.win_rate_pct}%</td>
                        <td
                          className={`py-2 px-2 font-mono font-bold ${
                            stats.total_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {stats.total_pnl >= 0 ? `+$${stats.total_pnl.toFixed(2)}` : `-$${Math.abs(stats.total_pnl).toFixed(2)}`}
                        </td>
                      </tr>
                    ))}

                  {activeTab === 'timeframes' &&
                    Object.entries(data.distribution_by_timeframe).map(([tf, stats]) => (
                      <tr key={tf} className="border-b border-slate-800/40 hover:bg-slate-800/30">
                        <td className="py-2 px-2 font-mono font-bold text-white">{tf}</td>
                        <td className="py-2 px-2 font-mono">{stats.trades}</td>
                        <td className="py-2 px-2 font-mono">{stats.wins}</td>
                        <td className="py-2 px-2 font-mono">{stats.win_rate_pct}%</td>
                        <td
                          className={`py-2 px-2 font-mono font-bold ${
                            stats.total_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {stats.total_pnl >= 0 ? `+$${stats.total_pnl.toFixed(2)}` : `-$${Math.abs(stats.total_pnl).toFixed(2)}`}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Educational Disclaimer */}
          <div className="pt-2 border-t border-slate-800 text-center">
            <span className="text-[11px] text-slate-500">
              خدمة تحليل فني تعليمية • ليست نصيحة استثمارية • الحسابات مبنية على الشموع المغلقة دون إعادة رسم
            </span>
          </div>
        </>
      )}
    </div>
  );
};
