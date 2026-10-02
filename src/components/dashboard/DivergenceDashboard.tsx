import React, { useState, useEffect } from 'react';
import { divergenceAPI, MultiIndicatorDivergenceResponse, DivergenceSignal } from '../../api/divergence';

interface DivergenceDashboardProps {
  symbol?: string;
  timeframe?: string;
}

export const DivergenceDashboard: React.FC<DivergenceDashboardProps> = ({
  symbol = 'EURUSD',
  timeframe = '1h'
}) => {
  const [data, setData] = useState<MultiIndicatorDivergenceResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedFilter, setSelectedFilter] = useState<'ALL' | 'RSI' | 'MACD' | 'STOCHASTIC'>('ALL');

  useEffect(() => {
    let mounted = true;
    const fetchDivergences = async () => {
      setLoading(true);
      try {
        const res = await divergenceAPI.detect(symbol, timeframe, 'ALL');
        if (mounted) setData(res);
      } catch (err) {
        console.error('Error fetching divergences:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchDivergences();
    const interval = setInterval(fetchDivergences, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [symbol, timeframe]);

  const getConsensusBadge = (consensus: string) => {
    switch (consensus) {
      case 'BULLISH_REVERSAL':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">انعكاس صعودي مؤكد (Bullish Reversal)</span>;
      case 'BEARISH_REVERSAL':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/40">انعكاس هبوطي مؤكد (Bearish Reversal)</span>;
      case 'BULLISH_CONTINUATION':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-sky-500/20 text-sky-400 border border-sky-500/40">استمرار الصعود (Bullish Continuation)</span>;
      case 'BEARISH_CONTINUATION':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40">استمرار الهبوط (Bearish Continuation)</span>;
      default:
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-700/50 text-slate-300 border border-slate-600">لا يوجد انفراج نشط (Neutral)</span>;
    }
  };

  const filteredSignals = data
    ? data.signals.filter(s => selectedFilter === 'ALL' || s.indicator === selectedFilter)
    : [];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl text-slate-100 flex flex-col gap-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-bold text-lg">
            📐
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white tracking-wide">
                محرك رصد الانفراج السعري المتعدد (Multi-Indicator Divergence)
              </h2>
              <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 font-mono">
                Task 20
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              رصد الانفراجات العادية والخفية عبر RSI و MACD و Stochastic وتحديد الأهداف ونقاط الانعكاس
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {data && getConsensusBadge(data.consensus)}
          <span className="text-xs px-3 py-1 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 font-mono">
            {symbol} • {timeframe}
          </span>
        </div>
      </div>

      {loading && !data && (
        <div className="py-16 text-center text-slate-400 flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm">جاري حساب ميول المؤشرات ورصد الانفراجات...</p>
        </div>
      )}

      {data && (
        <>
          {/* Indicator Overview Matrix */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-semibold">مؤشر القوة النسبية (RSI 14)</span>
                <div className="text-lg font-bold font-mono text-sky-400 mt-0.5">
                  {data.rsi_signals.length} <span className="text-xs font-normal text-slate-400">إشارات مكتشفة</span>
                </div>
              </div>
              <span className="text-2xl opacity-70">📈</span>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-semibold">مؤشر الماكد (MACD 12,26,9)</span>
                <div className="text-lg font-bold font-mono text-purple-400 mt-0.5">
                  {data.macd_signals.length} <span className="text-xs font-normal text-slate-400">إشارات مكتشفة</span>
                </div>
              </div>
              <span className="text-2xl opacity-70">📊</span>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 font-semibold">الستوكاستك (Stochastic 14,3,3)</span>
                <div className="text-lg font-bold font-mono text-amber-400 mt-0.5">
                  {data.stoch_signals.length} <span className="text-xs font-normal text-slate-400">إشارات مكتشفة</span>
                </div>
              </div>
              <span className="text-2xl opacity-70">📉</span>
            </div>
          </div>

          {/* Indicator Selector Tabs */}
          <div className="flex gap-2 border-b border-slate-800 pb-2">
            {[
              { id: 'ALL', label: `كافة الإشارات (${data.signals.length})` },
              { id: 'RSI', label: `مؤشر RSI (${data.rsi_signals.length})` },
              { id: 'MACD', label: `مؤشر MACD (${data.macd_signals.length})` },
              { id: 'STOCHASTIC', label: `مؤشر Stochastic (${data.stoch_signals.length})` },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSelectedFilter(tab.id as any)}
                className={`text-xs px-3 py-1.5 rounded-lg transition font-medium ${
                  selectedFilter === tab.id
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Signals Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredSignals.map((sig, idx) => {
              const isBuy = sig.direction === 'BUY';
              return (
                <div
                  key={idx}
                  className="bg-slate-950/90 rounded-xl border border-slate-800 p-4 flex flex-col gap-3 hover:border-slate-700 transition"
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        isBuy ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {isBuy ? 'شراء (BUY)' : 'بيع (SELL)'}
                      </span>
                      <span className="text-xs font-semibold text-slate-200">
                        {sig.indicator} • {sig.divergence_type.replace('_', ' ')}
                      </span>
                    </div>

                    <span className="font-mono text-xs text-amber-400 font-bold">
                      ثقة: {sig.confidence_score}%
                    </span>
                  </div>

                  {/* Slope Points Comparison */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-900 p-2.5 rounded-lg border border-slate-800/80">
                    <div>
                      <span className="text-slate-400">حركة السعر:</span>
                      <div className="font-mono font-bold text-slate-200 mt-0.5">
                        {sig.price_point1.toFixed(4)} ➔ {sig.price_point2.toFixed(4)}
                      </div>
                    </div>

                    <div>
                      <span className="text-slate-400">حركة المؤشر ({sig.indicator}):</span>
                      <div className="font-mono font-bold text-indigo-400 mt-0.5">
                        {sig.osc_point1.toFixed(2)} ➔ {sig.osc_point2.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Target and Risk Management */}
                  <div className="flex justify-between items-center text-xs font-mono text-slate-300 pt-1">
                    <div>
                      <span className="text-slate-500">دخول: </span>
                      <span className="font-bold">{sig.current_price.toFixed(4)}</span>
                    </div>
                    <div>
                      <span className="text-red-400 font-bold">SL: </span>
                      <span>{sig.stop_loss.toFixed(4)}</span>
                    </div>
                    <div>
                      <span className="text-emerald-400 font-bold">TP: </span>
                      <span>{sig.target_price.toFixed(4)}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredSignals.length === 0 && (
              <div className="col-span-2 py-10 text-center text-xs text-slate-500">
                لا توجد إشارات انفراج نشطة حالياً لهذا المؤشر، تحقق من فريم زمني آخر.
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default DivergenceDashboard;
