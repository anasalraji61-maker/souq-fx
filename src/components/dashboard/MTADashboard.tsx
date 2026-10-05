import React, { useState, useEffect, useCallback } from 'react';
import { mtaAPI, MTAConsensusData, MTABacktestData } from '../../api/mta';

interface MTADashboardProps {
  currentSymbol?: string;
  onSymbolSelect?: (symbol: string) => void;
  className?: string;
}

const TF_LABELS: Record<string, string> = {
  '1m': '1 دقيقة (سكالبينج سريع)',
  '5m': '5 دقائق (لحظي)',
  '15m': '15 دقيقة (مضاربة يومية)',
  '1h': '1 ساعة (اتجاه تكتيكي)',
  '4h': '4 ساعات (اتجاه استراتيجي)',
  daily: 'يومي (اتجاه الماكرو العام)',
};

export const MTADashboard: React.FC<MTADashboardProps> = ({
  currentSymbol = 'EURUSD',
  onSymbolSelect,
  className = '',
}) => {
  const [symbol, setSymbol] = useState(currentSymbol);
  const [data, setData] = useState<MTAConsensusData | null>(null);
  const [backtest, setBacktest] = useState<MTABacktestData | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoRefresh] = useState(true);

  useEffect(() => {
    setSymbol(currentSymbol);
  }, [currentSymbol]);

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    try {
      const [analysisRes, backtestRes] = await Promise.all([
        mtaAPI.analyze(symbol),
        mtaAPI.getBacktest(symbol),
      ]);
      if (analysisRes) setData(analysisRes);
      if (backtestRes) setBacktest(backtestRes);
    } catch (err) {
      console.error('Error fetching MTA dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [symbol]);

  useEffect(() => {
    fetchAnalysis();
  }, [fetchAnalysis]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(fetchAnalysis, 15000); // 15s polling
    return () => clearInterval(interval);
  }, [autoRefresh, fetchAnalysis]);

  const getDirectionBadge = (dir: string) => {
    if (dir === 'BUY') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          ▲ شراء (BUY)
        </span>
      );
    }
    if (dir === 'SELL') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
          ▼ بيع (SELL)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold bg-slate-700/40 text-slate-300 border border-slate-600/30">
        ◆ محايد (NEUTRAL)
      </span>
    );
  };

  const getDirectionColor = (dir: string) => {
    if (dir === 'BUY') return 'text-emerald-400';
    if (dir === 'SELL') return 'text-rose-400';
    return 'text-slate-400';
  };

  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900/95 p-5 shadow-2xl text-slate-100 ${className}`}>
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-lg font-bold shadow-inner">
            🧭
          </div>
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 flex items-center gap-2">
              محرك إجماع الفريمات المتعددة (MTA Consensus Engine)
              <span className="text-[10px] bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full font-mono font-normal">
                Task 15
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              تحليل متزامن لـ 6 فريمات (1m, 5m, 15m, 1h, 4h, Daily) مع حماية ضد ارتداد الأسعار والتناقض الماكرو
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'USOIL', 'AUDUSD'].map((s) => (
            <button
              key={s}
              onClick={() => {
                setSymbol(s);
                onSymbolSelect?.(s);
              }}
              className={`px-2.5 py-1 text-xs font-mono font-semibold rounded-lg transition-colors border ${
                symbol === s
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm'
                  : 'bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
          <button
            onClick={() => fetchAnalysis()}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors disabled:opacity-50"
          >
            <span>{loading ? 'جاري التحليل...' : 'تحديث'}</span>
            <span className="text-[10px]">⟳</span>
          </button>
        </div>
      </div>

      {/* Warnings & Risk Banner */}
      {data && data.warnings.length > 0 && (
        <div className="mb-5 space-y-2">
          {data.warnings.map((warn, i) => (
            <div
              key={i}
              className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
                warn.includes('Whipsaw')
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-300 font-semibold'
                  : warn.includes('ماكرو')
                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 font-semibold'
                  : 'bg-slate-800/50 border-slate-700 text-slate-300'
              }`}
            >
              <span>{warn}</span>
              <span className="text-[10px] opacity-75 font-mono">حماية تلقائية</span>
            </div>
          ))}
        </div>
      )}

      {/* Main Consensus Result Banner */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Recommendation */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 flex flex-col justify-between">
            <span className="text-xs text-slate-400 font-medium">التوصية التوافقية الشاملة (Consensus)</span>
            <div className="my-2 flex items-center gap-3">
              <span className={`text-2xl font-black ${getDirectionColor(data.consensus_direction)}`}>
                {data.consensus_direction === 'BUY'
                  ? 'شراء قوي'
                  : data.consensus_direction === 'SELL'
                  ? 'بيع قوي'
                  : 'حياد ومراقبة'}
              </span>
              {getDirectionBadge(data.consensus_direction)}
            </div>
            <span className="text-[11px] text-slate-500">
              بناءً على الوزن المرجح للأطر الزمنية الستة
            </span>
          </div>

          {/* Confidence Score */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">درجة ثقة الإجماع (Confidence Score)</span>
              <span className="text-xs font-mono font-bold text-cyan-400">
                {data.confidence_score.toFixed(1)}%
              </span>
            </div>
            <div className="my-2">
              <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    data.confidence_score >= 70
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                      : data.confidence_score >= 40
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                      : 'bg-gradient-to-r from-rose-500 to-orange-400'
                  }`}
                  style={{ width: `${Math.min(100, Math.max(10, data.confidence_score))}%` }}
                />
              </div>
            </div>
            <span className="text-[11px] text-slate-500">
              {data.confidence_score >= 70
                ? 'توافق عالي جداً بين الفريمات'
                : data.confidence_score >= 40
                ? 'توافق معتدل يتطلب إدارة مخاطر'
                : 'تضارب فريمات - لا يُنصح بالدخول'}
            </span>
          </div>

          {/* Backtest Win Rate */}
          {backtest && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">سجل الأداء التاريخي (Backtest)</span>
                <span className="text-[11px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded font-mono">
                  {backtest.total_trades} صفقة
                </span>
              </div>
              <div className="my-1 flex items-baseline gap-2">
                <span className="text-2xl font-bold font-mono text-emerald-400">
                  {backtest.win_rate.toFixed(1)}%
                </span>
                <span className="text-xs text-slate-400">نسبة الفوز</span>
                <span className="text-xs font-mono text-slate-400 mr-auto">
                  PF: {backtest.profit_factor}
                </span>
              </div>
              <span className="text-[11px] text-slate-500">
                أقصى تراجع (Max DD): {backtest.max_drawdown}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* 6 Timeframe Cards Grid */}
      {data && (
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
            <span>تحليل تفصيلي للأطر الزمنية (6 Timeframe Matrix)</span>
            <span className="text-[10px] text-slate-500">تحديث الكاش: 30 ثانية</span>
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {['1m', '5m', '15m', '1h', '4h', 'daily'].map((tf) => {
              const sig = data.timeframes[tf];
              if (!sig) return null;
              const ind = sig.indicators;

              return (
                <div
                  key={tf}
                  className="rounded-xl border border-slate-800/90 bg-slate-950/80 p-3.5 hover:border-slate-700 transition-colors shadow-sm"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-slate-800/60 pb-2.5 mb-2.5">
                    <div>
                      <span className="text-xs font-bold text-slate-200 block font-mono">
                        {tf.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-slate-400">{TF_LABELS[tf] || tf}</span>
                    </div>
                    <div>{getDirectionBadge(sig.direction)}</div>
                  </div>

                  {/* Strength Bar */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="text-slate-400">قوة الإشارة:</span>
                      <span className="font-mono font-bold text-slate-200">{sig.strength}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${
                          sig.direction === 'BUY'
                            ? 'bg-emerald-400'
                            : sig.direction === 'SELL'
                            ? 'bg-rose-400'
                            : 'bg-slate-500'
                        }`}
                        style={{ width: `${sig.strength}%` }}
                      />
                    </div>
                  </div>

                  {/* Indicator Readings */}
                  <div className="grid grid-cols-3 gap-1.5 text-center text-[10px] font-mono">
                    <div className="rounded bg-slate-900/80 p-1.5 border border-slate-800/60">
                      <span className="text-slate-500 block text-[9px]">RSI(14)</span>
                      <span
                        className={`font-bold ${
                          ind.rsi > 60
                            ? 'text-emerald-400'
                            : ind.rsi < 40
                            ? 'text-rose-400'
                            : 'text-slate-300'
                        }`}
                      >
                        {ind.rsi.toFixed(1)}
                      </span>
                    </div>

                    <div className="rounded bg-slate-900/80 p-1.5 border border-slate-800/60">
                      <span className="text-slate-500 block text-[9px]">MACD Hist</span>
                      <span
                        className={`font-bold ${
                          ind.macd_hist > 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {ind.macd_hist > 0 ? `+${ind.macd_hist.toFixed(4)}` : ind.macd_hist.toFixed(4)}
                      </span>
                    </div>

                    <div className="rounded bg-slate-900/80 p-1.5 border border-slate-800/60">
                      <span className="text-slate-500 block text-[9px]">ADX(14)</span>
                      <span
                        className={`font-bold ${
                          ind.adx >= 25 ? 'text-cyan-400' : 'text-slate-400'
                        }`}
                      >
                        {ind.adx.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* EMA Crossover status */}
                  <div className="mt-2 pt-2 border-t border-slate-800/40 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">تقاطع EMA (9/21):</span>
                    <span
                      className={`font-mono font-medium ${
                        ind.ema_fast > ind.ema_slow ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {ind.ema_fast > ind.ema_slow ? 'Fast > Slow (صاعد)' : 'Fast < Slow (هابط)'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
