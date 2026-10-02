import React, { useState, useEffect, useCallback } from 'react';
import { cacheAPI, CacheMetrics } from '../../api/cache';

interface CacheStatsPanelProps {
  symbol?: string;
  className?: string;
}

export const CacheStatsPanel: React.FC<CacheStatsPanelProps> = ({ symbol, className = '' }) => {
  const [stats, setStats] = useState<CacheMetrics | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [invalidationSuccess, setInvalidationSuccess] = useState<string | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const data = await cacheAPI.getStats(symbol);
      if (data) {
        setStats(cacheAPI.formatStats(data));
        setError(null);
      }
    } catch {
      setError('تعذر تحميل إحصائيات الكاش');
    }
  }, [symbol]);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 4000);
    return () => clearInterval(interval);
  }, [loadStats]);

  const handleManualRefresh = async () => {
    setRefreshing(true);
    await loadStats();
    setRefreshing(false);
  };

  const handleInvalidate = async () => {
    if (!symbol) return;
    setRefreshing(true);
    const res = await cacheAPI.invalidateCache(symbol, '*', 'manual_flush');
    if (res && res.status === 'invalidated') {
      setInvalidationSuccess(`تم إفراغ كاش ${symbol} بنجاح`);
      setTimeout(() => setInvalidationSuccess(null), 3000);
    }
    await loadStats();
    setRefreshing(false);
  };

  const hitRateNum = stats ? parseFloat(stats.hitRate) : 0;

  return (
    <div className={`rounded-xl border border-slate-800 bg-slate-900 p-4 shadow-lg text-slate-100 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded bg-amber-500/10 text-amber-400 text-xs font-bold border border-amber-500/20">
            ⚡
          </span>
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              أداء الذاكرة المؤقتة (Cache Performance)
            </h4>
            <span className="text-[10px] text-slate-400">
              {symbol ? `الرمز: ${symbol}` : 'الإجمالي لكافة أزواج العملات والمعادن'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {symbol && (
            <button
              onClick={handleInvalidate}
              className="text-[11px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 px-2 py-1 rounded transition-colors"
              title="إفراغ كاش هذا الرمز فوراً"
            >
              إفراغ الكاش
            </button>
          )}
          <button
            onClick={handleManualRefresh}
            disabled={refreshing}
            className="text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded transition-colors disabled:opacity-50"
          >
            {refreshing ? 'جاري التحديث...' : 'تحديث ⟳'}
          </button>
        </div>
      </div>

      {invalidationSuccess && (
        <div className="mb-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-2 text-xs text-emerald-400 text-center font-mono">
          ✓ {invalidationSuccess}
        </div>
      )}

      {error ? (
        <div className="text-xs text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg p-3 text-center">
          {error}
        </div>
      ) : (
        stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-center">
            {/* Hit Rate */}
            <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-2.5">
              <span className="text-[10px] text-slate-400 block mb-0.5">معدل الإصابة (Hit Rate)</span>
              <div
                className={`text-base font-bold font-mono ${
                  hitRateNum >= 75 ? 'text-emerald-400' : hitRateNum >= 50 ? 'text-amber-400' : 'text-slate-300'
                }`}
              >
                {stats.hitRate}
              </div>
            </div>

            {/* Avg Hit Latency */}
            <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-2.5">
              <span className="text-[10px] text-slate-400 block mb-0.5">زمن استجابة الكاش</span>
              <div className="text-base font-bold text-cyan-400 font-mono">
                {stats.avgHitLatency}
              </div>
            </div>

            {/* Avg Miss Latency */}
            <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-2.5">
              <span className="text-[10px] text-slate-400 block mb-0.5">زمن جلب قاعدة البيانات</span>
              <div className="text-base font-bold text-slate-300 font-mono">
                {stats.avgMissLatency}
              </div>
            </div>

            {/* Total Requests */}
            <div className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-2.5">
              <span className="text-[10px] text-slate-400 block mb-0.5">إجمالي الطلبات</span>
              <div className="text-base font-bold text-slate-200 font-mono">
                {(stats.totalHits + stats.totalMisses).toLocaleString()}
              </div>
            </div>
          </div>
        )
      )}
    </div>
  );
};
